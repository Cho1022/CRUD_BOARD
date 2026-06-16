import hashlib
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import httpx
from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from db import (
    count_embeddings,
    db_connection,
    delete_stale_embeddings,
    fetch_existing_hashes,
    latest_embeddings_by_type,
    search_embeddings,
    upsert_embedding,
)

load_dotenv()

FALLBACK_ANSWER = "관련 자료가 부족해서 정확히 답변할 수 없습니다."
SYNC_REQUIRED_ANSWER = "검색 인덱스가 비어 있습니다. 먼저 /rag/sync를 실행해 주세요."
BOARD_API_BASE_URL = os.getenv("BOARD_API_BASE_URL", "http://localhost:8080/api").rstrip("/")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "3"))
RAG_MIN_SCORE = float(os.getenv("RAG_MIN_SCORE", "0.5"))
RAG_LIST_LIMIT = int(os.getenv("RAG_LIST_LIMIT", "5"))
RAG_CHUNK_THRESHOLD = int(os.getenv("RAG_CHUNK_THRESHOLD", "800"))
RAG_CHUNK_TARGET = int(os.getenv("RAG_CHUNK_TARGET", "700"))


@dataclass(frozen=True)
class BoardPost:
    id: int
    post_type: str
    title: str
    content: str
    canonical_url: str | None
    created_at: str


@dataclass(frozen=True)
class RagChunk:
    post_id: int
    post_type: str
    title: str
    chunk_content: str
    source_url: str
    canonical_url: str | None
    chunk_index: int
    content_hash: str
    post_created_at: str


async def fetch_knowledge_posts() -> list[BoardPost]:
    posts: list[BoardPost] = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        for post_type in ("NOTICE", "FAQ"):
            summaries = await fetch_post_summaries(client, post_type)
            for summary in summaries:
                detail = await fetch_post_detail(client, summary["id"])
                posts.append(
                    BoardPost(
                        id=int(detail["id"]),
                        post_type=str(detail["postType"]),
                        title=str(detail["title"]),
                        content=detail.get("content") or "",
                        canonical_url=normalize_path(detail.get("canonicalUrl")),
                        created_at=detail.get("createdAt") or datetime.now().isoformat(timespec="seconds"),
                    )
                )
    return posts


async def fetch_post_summaries(client: httpx.AsyncClient, post_type: str) -> list[dict[str, Any]]:
    response = await client.get(
        f"{BOARD_API_BASE_URL}/posts",
        params={"type": post_type, "page": 1, "size": 100},
    )
    response.raise_for_status()
    payload = response.json()
    return payload.get("data", {}).get("content", [])


async def fetch_post_detail(client: httpx.AsyncClient, post_id: int) -> dict[str, Any]:
    response = await client.get(f"{BOARD_API_BASE_URL}/posts/{post_id}")
    response.raise_for_status()
    payload = response.json()
    data = payload.get("data")
    if not data:
        raise ValueError(f"게시글 상세 응답이 비어 있습니다. post_id={post_id}")
    return data


async def sync_embeddings() -> dict[str, int]:
    posts = await fetch_knowledge_posts()
    chunks = [chunk for post in posts for chunk in split_post_into_chunks(post)]
    valid_keys = {(chunk.post_id, chunk.chunk_index) for chunk in chunks}
    inserted = 0
    updated = 0
    skipped = 0

    with db_connection() as conn:
        existing_hashes = fetch_existing_hashes(conn)
        pending_chunks: list[RagChunk] = []
        for chunk in chunks:
            key = (chunk.post_id, chunk.chunk_index)
            if existing_hashes.get(key) == chunk.content_hash:
                skipped += 1
                continue
            pending_chunks.append(chunk)

        if pending_chunks:
            embeddings = embedding_client().embed_documents([embedding_text(chunk) for chunk in pending_chunks])
            for chunk, embedding in zip(pending_chunks, embeddings, strict=True):
                key = (chunk.post_id, chunk.chunk_index)
                if key in existing_hashes:
                    updated += 1
                else:
                    inserted += 1
                upsert_embedding(conn, chunk, embedding)

        deleted = delete_stale_embeddings(conn, valid_keys)
        conn.commit()

    return {
        "posts": len(posts),
        "chunks": len(chunks),
        "inserted": inserted,
        "updated": updated,
        "skipped": skipped,
        "deleted": deleted,
    }


def ask_question(question: str) -> dict[str, Any]:
    intent = classify_question(question)
    if intent == "NOTICE_LIST":
        return answer_list_request(question, "NOTICE")
    if intent == "FAQ_LIST":
        return answer_list_request(question, "FAQ")

    retrieved = retrieve_documents_from_db(question)
    relevant = [(document, score) for document, score in retrieved if score >= RAG_MIN_SCORE]
    if not relevant:
        return empty_answer()

    return build_response(generate_answer(question, relevant), relevant)


def retrieve_documents_from_db(question: str) -> list[tuple[Document, float]]:
    with db_connection() as conn:
        if count_embeddings(conn) == 0:
            return []
        question_embedding = embedding_client().embed_query(question)
        rows = search_embeddings(conn, question_embedding, RAG_TOP_K)
    return [document_from_row(row) for row in rows]


def answer_list_request(question: str, post_type: str) -> dict[str, Any]:
    with db_connection() as conn:
        rows = latest_embeddings_by_type(conn, post_type, RAG_LIST_LIMIT)
    retrieved = [document_from_row(row) for row in rows]
    if not retrieved:
        return empty_answer(SYNC_REQUIRED_ANSWER)
    return build_response(generate_list_answer(question, post_type, retrieved), retrieved)


def split_post_into_chunks(post: BoardPost) -> list[RagChunk]:
    title = post.title.strip()
    content = post.content.strip()
    if not title or not content:
        return []

    chunks = [content] if len(content) <= RAG_CHUNK_THRESHOLD else split_long_text(content)
    return [
        RagChunk(
            post_id=post.id,
            post_type=post.post_type,
            title=title,
            chunk_content=chunk,
            source_url=f"/posts/{post.id}",
            canonical_url=post.canonical_url,
            chunk_index=index,
            content_hash=content_hash(post, chunk, index),
            post_created_at=post.created_at,
        )
        for index, chunk in enumerate(chunks, start=1)
    ]


def split_long_text(content: str) -> list[str]:
    paragraphs = [paragraph.strip() for paragraph in content.splitlines() if paragraph.strip()]
    if not paragraphs:
        return []

    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        if len(paragraph) > RAG_CHUNK_TARGET:
            if current:
                chunks.append(current)
                current = ""
            chunks.extend(split_by_size(paragraph, RAG_CHUNK_TARGET))
            continue

        next_text = f"{current}\n\n{paragraph}" if current else paragraph
        if len(next_text) > RAG_CHUNK_TARGET and current:
            chunks.append(current)
            current = paragraph
        else:
            current = next_text

    if current:
        chunks.append(current)
    return chunks


def split_by_size(text: str, size: int) -> list[str]:
    chunks: list[str] = []
    for index in range(0, len(text), size):
        chunk = text[index : index + size].strip()
        if chunk:
            chunks.append(chunk)
    return chunks


def content_hash(post: BoardPost, chunk: str, chunk_index: int) -> str:
    raw = "\n".join(
        [
            str(post.id),
            post.post_type,
            post.title.strip(),
            chunk,
            post.canonical_url or "",
            str(chunk_index),
        ]
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def embedding_text(chunk: RagChunk) -> str:
    return f"{chunk.title}\n\n{chunk.chunk_content}"


def document_from_row(row: dict[str, Any]) -> tuple[Document, float]:
    document = Document(
        page_content=f"{row['title']}\n\n{row['chunk_content']}",
        metadata={
            "id": int(row["post_id"]),
            "title": row["title"],
            "sourceUrl": row["source_url"],
            "postType": row["post_type"],
            "canonicalUrl": row["canonical_url"],
            "chunkIndex": int(row["chunk_index"]),
        },
    )
    return document, float(row["score"])


def classify_question(question: str) -> str:
    normalized = question.lower()
    if any(keyword in normalized for keyword in ("공지", "공지사항", "안내")):
        return "NOTICE_LIST"
    if any(keyword in normalized for keyword in ("faq", "자주 묻는 질문", "질문 모음")):
        return "FAQ_LIST"
    return "SEARCH"


def generate_answer(question: str, retrieved: list[tuple[Document, float]]) -> str:
    context = "\n\n".join(
        (
            f"[문서 {index}]\n"
            f"제목: {document.metadata['title']}\n"
            f"출처: {document.metadata['sourceUrl']}\n"
            f"내용:\n{document.page_content}"
        )
        for index, (document, _) in enumerate(retrieved, start=1)
    )
    messages = [
        SystemMessage(
            content=(
                "당신은 게시판 AI 비서입니다. "
                "반드시 제공된 context에 있는 내용만 근거로 한국어로 답하세요. "
                f"context에 근거가 부족하면 '{FALLBACK_ANSWER}'라고 답하세요."
            )
        ),
        HumanMessage(content=f"context:\n{context}\n\nquestion:\n{question}"),
    ]
    response = chat_client().invoke(messages)
    answer = str(response.content).strip()
    return answer or FALLBACK_ANSWER


def generate_list_answer(question: str, post_type: str, retrieved: list[tuple[Document, float]]) -> str:
    context = "\n\n".join(
        (
            f"[{index}] {document.metadata['title']}\n"
            f"경로: {document.metadata['sourceUrl']}\n"
            f"관련 기능: {document.metadata.get('canonicalUrl') or '없음'}\n"
            f"내용: {document.page_content}"
        )
        for index, (document, _) in enumerate(retrieved, start=1)
    )
    label = "공지사항" if post_type == "NOTICE" else "FAQ"
    messages = [
        SystemMessage(
            content=(
                f"당신은 게시판 AI 비서입니다. 제공된 {label} 목록만 근거로 한국어로 답하세요. "
                "각 항목의 핵심을 짧게 요약하고, 관련 기능 경로가 있으면 함께 언급하세요. "
                f"context에 근거가 부족하면 '{FALLBACK_ANSWER}'라고 답하세요."
            )
        ),
        HumanMessage(content=f"context:\n{context}\n\nquestion:\n{question}"),
    ]
    response = chat_client().invoke(messages)
    answer = str(response.content).strip()
    return answer or FALLBACK_ANSWER


def build_response(answer: str, retrieved: list[tuple[Document, float]]) -> dict[str, Any]:
    return {
        "answer": answer,
        "actions": build_actions(retrieved),
        "sources": build_sources(retrieved),
    }


def build_actions(retrieved: list[tuple[Document, float]]) -> list[dict[str, str]]:
    actions: list[dict[str, str]] = []
    seen_urls: set[str] = set()
    for document, _ in retrieved:
        url = normalize_path(document.metadata.get("canonicalUrl"))
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)
        actions.append({"label": document.metadata["title"], "url": url})
    return actions


def build_sources(retrieved: list[tuple[Document, float]]) -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    for document, score in retrieved:
        source_url = document.metadata["sourceUrl"]
        if source_url in seen_urls:
            continue
        seen_urls.add(source_url)
        sources.append(
            {
                "title": document.metadata["title"],
                "sourceUrl": source_url,
                "score": round(float(score), 4),
            }
        )
    return sources


def empty_answer(answer: str = FALLBACK_ANSWER) -> dict[str, Any]:
    return {"answer": answer, "actions": [], "sources": []}


def normalize_path(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    path = value.strip()
    if not path.startswith("/") or path.startswith("//"):
        return None
    return path


def embedding_client() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(model=OPENAI_EMBEDDING_MODEL)


def chat_client() -> ChatOpenAI:
    return ChatOpenAI(model=OPENAI_MODEL, temperature=0)
