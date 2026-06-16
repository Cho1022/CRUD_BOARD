import os
import secrets

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rag import ask_question, sync_embeddings

load_dotenv()

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("RAG_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
RAG_SYNC_TOKEN = os.getenv("RAG_SYNC_TOKEN")

app = FastAPI(title="Board RAG Assistant", version="0.2.0")
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


class RagSyncResponse(BaseModel):
    posts: int
    chunks: int
    inserted: int
    updated: int
    skipped: int
    deleted: int


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/rag/ask", response_model=RagAskResponse)
async def ask_rag(request: RagAskRequest) -> RagAskResponse:
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required.")

    try:
        return RagAskResponse(**ask_question(question))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"RAG 처리 중 오류가 발생했습니다: {exc}") from exc


@app.post("/rag/sync", response_model=RagSyncResponse)
async def sync_rag(x_rag_sync_token: str | None = Header(default=None)) -> RagSyncResponse:
    verify_sync_token(x_rag_sync_token)
    try:
        return RagSyncResponse(**await sync_embeddings())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"RAG 동기화 중 오류가 발생했습니다: {exc}") from exc


def verify_sync_token(token: str | None) -> None:
    if not RAG_SYNC_TOKEN:
        raise HTTPException(status_code=500, detail="RAG_SYNC_TOKEN is not configured.")
    if not token or not secrets.compare_digest(token, RAG_SYNC_TOKEN):
        raise HTTPException(status_code=403, detail="invalid sync token.")
