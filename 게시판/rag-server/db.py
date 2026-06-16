import os
from contextlib import contextmanager
from typing import Any

import psycopg
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from psycopg.rows import dict_row

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://board:board@localhost:5433/board")
KNOWLEDGE_POST_TYPES = ("NOTICE", "FAQ")


@contextmanager
def db_connection():
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        register_vector(conn)
        yield conn


def fetch_existing_hashes(conn: psycopg.Connection) -> dict[tuple[int, int], str]:
    rows = conn.execute(
        """
        select post_id, chunk_index, content_hash
        from post_embeddings
        where post_type = any(%s)
        """,
        (list(KNOWLEDGE_POST_TYPES),),
    ).fetchall()
    return {(int(row["post_id"]), int(row["chunk_index"])): str(row["content_hash"]) for row in rows}


def upsert_embedding(conn: psycopg.Connection, chunk: Any, embedding: list[float]) -> None:
    conn.execute(
        """
        insert into post_embeddings (
            post_id,
            post_type,
            title,
            chunk_content,
            source_url,
            canonical_url,
            chunk_index,
            embedding,
            content_hash,
            post_created_at,
            updated_at
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
        on conflict (post_id, chunk_index)
        do update set
            post_type = excluded.post_type,
            title = excluded.title,
            chunk_content = excluded.chunk_content,
            source_url = excluded.source_url,
            canonical_url = excluded.canonical_url,
            embedding = excluded.embedding,
            content_hash = excluded.content_hash,
            post_created_at = excluded.post_created_at,
            updated_at = now()
        """,
        (
            chunk.post_id,
            chunk.post_type,
            chunk.title,
            chunk.chunk_content,
            chunk.source_url,
            chunk.canonical_url,
            chunk.chunk_index,
            embedding,
            chunk.content_hash,
            chunk.post_created_at,
        ),
    )


def delete_stale_embeddings(conn: psycopg.Connection, valid_keys: set[tuple[int, int]]) -> int:
    rows = conn.execute(
        """
        select post_id, chunk_index
        from post_embeddings
        where post_type = any(%s)
        """,
        (list(KNOWLEDGE_POST_TYPES),),
    ).fetchall()
    stale_keys = [
        (int(row["post_id"]), int(row["chunk_index"]))
        for row in rows
        if (int(row["post_id"]), int(row["chunk_index"])) not in valid_keys
    ]
    for post_id, chunk_index in stale_keys:
        conn.execute(
            "delete from post_embeddings where post_id = %s and chunk_index = %s",
            (post_id, chunk_index),
        )
    return len(stale_keys)


def search_embeddings(conn: psycopg.Connection, question_embedding: list[float], top_k: int) -> list[dict[str, Any]]:
    return conn.execute(
        """
        select
            post_id,
            post_type,
            title,
            chunk_content,
            source_url,
            canonical_url,
            chunk_index,
            1 - (embedding <=> %s::vector) as score
        from post_embeddings
        where post_type = any(%s)
        order by embedding <=> %s::vector
        limit %s
        """,
        (question_embedding, list(KNOWLEDGE_POST_TYPES), question_embedding, top_k),
    ).fetchall()


def latest_embeddings_by_type(conn: psycopg.Connection, post_type: str, limit: int) -> list[dict[str, Any]]:
    return conn.execute(
        """
        select *
        from (
            select distinct on (post_id)
                post_id,
                post_type,
                title,
                chunk_content,
                source_url,
                canonical_url,
                chunk_index,
                post_created_at,
                1.0 as score
            from post_embeddings
            where post_type = %s
            order by post_id, chunk_index
        ) latest_chunks
        order by post_created_at desc
        limit %s
        """,
        (post_type, limit),
    ).fetchall()


def count_embeddings(conn: psycopg.Connection) -> int:
    row = conn.execute(
        "select count(*) as count from post_embeddings where post_type = any(%s)",
        (list(KNOWLEDGE_POST_TYPES),),
    ).fetchone()
    return int(row["count"])
