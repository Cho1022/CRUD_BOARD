import os
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pydantic import BaseModel, Field

load_dotenv()

FALLBACK_ANSWER = "관련 자료가 부족해서 정확히 답변할 수 없습니다."
BOARD_API_BASE_URL = os.getenv("BOARD_API_BASE_URL", "http://localhost:8080/api").rstrip("/")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "3"))
RAG_MIN_SCORE = float(os.getenv("RAG_MIN_SCORE", "0.5"))
RAG_LIST_LIMIT = int(os.getenv("RAG_LIST_LIMIT", "5"))
RAG_CHUNK_THRESHOLD = int(os.getenv("RAG_CHUNK_THRESHOLD", "800"))
RAG_CHUNK_TARGET = int(os.getenv("RAG_CHUNK_TARGET", "700"))
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("RAG_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app = FastAPI(title="Board RAG Assistant", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RagAskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)


class SourceResponse(BaseModel):
    title: str
    sourceUrl: str
    score: float


class ActionResponse(BaseModel):
    label: str
    url: str


class RagAskResponse(BaseModel):
    answer: str
    actions: list[ActionResponse]
    sources: list[SourceResponse]


class BoardPost(BaseModel):
    id: int
    postType: str
    title: str
    content: str
    canonicalUrl: str | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/rag/ask", response_model=RagAskResponse)
async def ask_rag(request: RagAskRequest) -> RagAskResponse:
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required.")

    posts = await fetch_knowledge_posts()
    if not posts:
        return RagAskResponse(answer=FALLBACK_ANSWER, actions=[], sources=[])

    try:
        intent = classify_question(question)
        if intent == "NOTICE_LIST":
            return answer_list_request(question, posts, "NOTICE")
        if intent == "FAQ_LIST":
            return answer_list_request(question, posts, "FAQ")

        documents = to_documents(posts)
        if not documents:
            return RagAskResponse(answer=FALLBACK_ANSWER, actions=[], sources=[])

        retrieved = retrieve_documents(question, documents)
        relevant = [(document, score) for document, score in retrieved if score >= RAG_MIN_SCORE]
        if not relevant:
            return RagAskResponse(answer=FALLBACK_ANSWER, actions=[], sources=[])

        answer = generate_answer(question, relevant)
        actions = build_actions(relevant)
        sources = build_sources(relevant)
        return RagAskResponse(answer=answer, actions=actions, sources=sources)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"RAG 처리 중 오류가 발생했습니다: {exc}") from exc


async def fetch_knowledge_posts() -> list[BoardPost]:     #게시판에서 가져오는 부분 
    posts: list[BoardPost] = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        for post_type in ("NOTICE", "FAQ"):
            summaries = await fetch_post_summaries(client, post_type)
            for summary in summaries:
                detail = await fetch_post_detail(client, summary["id"])
                posts.append(
                    BoardPost(
                        id=detail["id"],
                        postType=detail["postType"],
                        title=detail["title"],
                        content=detail.get("content") or "",
                        canonicalUrl=normalize_path(detail.get("canonicalUrl")),
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


def to_documents(posts: list[BoardPost]) -> list[Document]:
    documents: list[Document] = []
    for post in posts:
        documents.extend(split_post_into_documents(post))
    return documents


def split_post_into_documents(post: BoardPost) -> list[Document]:
    title = post.title.strip()
    content = post.content.strip()
    if not title or not content:
        return []

    metadata = {
        "id": post.id,
        "title": title,
        "sourceUrl": f"/posts/{post.id}",
        "postType": post.postType,
        "canonicalUrl": post.canonicalUrl,
    }
    if len(content) <= RAG_CHUNK_THRESHOLD:
        return [Document(page_content=f"{title}\n\n{content}", metadata=metadata)]

    return [
        Document(page_content=f"{title}\n\n{chunk}", metadata={**metadata, "chunkIndex": index})
        for index, chunk in enumerate(split_long_text(content), start=1)
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


def classify_question(question: str) -> str:
    normalized = question.lower()
    if any(keyword in normalized for keyword in ("공지", "공지사항", "안내")):
        return "NOTICE_LIST"
    if any(keyword in normalized for keyword in ("faq", "자주 묻는 질문", "질문 모음")):
        return "FAQ_LIST"
    return "SEARCH"


def answer_list_request(question: str, posts: list[BoardPost], post_type: str) -> RagAskResponse:
    selected_posts = latest_posts(posts, post_type, RAG_LIST_LIMIT)
    documents = []
    for post in selected_posts:
        documents.extend(split_post_into_documents(post)[:1])

    if not documents:
        return RagAskResponse(answer=FALLBACK_ANSWER, actions=[], sources=[])

    retrieved = [(document, 1.0) for document in documents]
    answer = generate_list_answer(question, post_type, selected_posts)
    return RagAskResponse(
        answer=answer,
        actions=build_actions(retrieved),
        sources=build_sources(retrieved),
    )


def latest_posts(posts: list[BoardPost], post_type: str, limit: int = 5) -> list[BoardPost]:
    return [post for post in posts if post.postType == post_type][:limit]


def retrieve_documents(question: str, documents: list[Document]) -> list[tuple[Document, float]]:
    embeddings = OpenAIEmbeddings(model=OPENAI_EMBEDDING_MODEL)
    vector_store = InMemoryVectorStore(embeddings)
    vector_store.add_documents(documents)
    return vector_store.similarity_search_with_score(question, k=min(RAG_TOP_K, len(documents)))
# LangChain이 각 문서의 내용을 embedding해서 vector store

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
    llm = ChatOpenAI(model=OPENAI_MODEL, temperature=0)
    response = llm.invoke(messages)
    answer = str(response.content).strip()
    return answer or FALLBACK_ANSWER


def generate_list_answer(question: str, post_type: str, posts: list[BoardPost]) -> str:
    context = "\n\n".join(
        (
            f"[{index}] {post.title}\n"
            f"경로: /posts/{post.id}\n"
            f"관련 기능: {post.canonicalUrl or '없음'}\n"
            f"내용: {post.content}"
        )
        for index, post in enumerate(posts, start=1)
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
    llm = ChatOpenAI(model=OPENAI_MODEL, temperature=0)
    response = llm.invoke(messages)
    answer = str(response.content).strip()
    return answer or FALLBACK_ANSWER


def build_actions(retrieved: list[tuple[Document, float]]) -> list[ActionResponse]:
    actions: list[ActionResponse] = []
    seen_urls: set[str] = set()
    for document, _ in retrieved:
        url = normalize_path(document.metadata.get("canonicalUrl"))
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)
        actions.append(ActionResponse(label=document.metadata["title"], url=url))
    return actions


def build_sources(retrieved: list[tuple[Document, float]]) -> list[SourceResponse]:
    sources: list[SourceResponse] = []
    seen_urls: set[str] = set()
    for document, score in retrieved:
        source_url = document.metadata["sourceUrl"]
        if source_url in seen_urls:
            continue
        seen_urls.add(source_url)
        sources.append(
            SourceResponse(
                title=document.metadata["title"],
                sourceUrl=source_url,
                score=round(float(score), 4),
            )
        )
    return sources


def normalize_path(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    path = value.strip()
    if not path.startswith("/") or path.startswith("//"):
        return None
    return path
