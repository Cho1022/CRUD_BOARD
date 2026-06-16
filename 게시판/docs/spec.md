# FastAPI RAG + pgvector 게시판 AI 비서 스펙

## 목표

Spring 게시판의 NOTICE/FAQ 게시글을 원본 데이터로 사용하고, FastAPI가 pgvector에 저장된 embedding을 검색해 답변하는 RAG MVP를 만든다. Spring 내부에는 RAG를 통합하지 않는다.

## 확정 범위

- Spring 게시판은 게시글 원본 API 역할만 한다.
- FastAPI RAG 서버는 `게시판/rag-server`에 둔다.
- FastAPI는 원본 게시글을 Spring API로만 조회한다.
- FastAPI는 embedding 저장/검색을 위해 PostgreSQL `post_embeddings`에 직접 접속한다.
- 검색 대상은 `NOTICE`, `FAQ` 게시글만 사용한다.
- `POST /rag/sync`로 NOTICE/FAQ 게시글을 chunking하고 embedding을 저장한다.
- `/rag/sync`는 `X-RAG-SYNC-TOKEN`이 항상 필요하다.
- 사용자 질문 시 게시글 embedding을 다시 만들지 않는다.
- 일반 질문은 pgvector cosine similarity로 Top-K 검색한다.
- 공지/FAQ 목록 질문은 DB에 저장된 최신 게시글 목록으로 요약한다.
- 응답 구조는 `answer`, `actions`, `sources`를 유지한다.
- React UI는 로그인한 사용자에게만 보이고 기존 프로필 카드 아래에 둔다.

## FastAPI API

### `GET /health`

서버 상태 확인용 API다.

```json
{
  "status": "ok"
}
```

### `POST /rag/sync`

Spring API에서 NOTICE/FAQ 게시글을 읽고 chunk embedding을 `post_embeddings`에 동기화한다.

요청 헤더:

```text
X-RAG-SYNC-TOKEN: configured-token
```

응답:

```json
{
  "posts": 4,
  "chunks": 4,
  "inserted": 4,
  "updated": 0,
  "skipped": 0,
  "deleted": 0
}
```

### `POST /rag/ask`

질문을 받고 pgvector 검색 결과를 context로 넣어 답변한다.

요청:

```json
{
  "question": "비밀번호는 어디서 변경해?"
}
```

응답:

```json
{
  "answer": "비밀번호는 로그인 후 프로필 영역의 비밀번호 메뉴에서 변경할 수 있습니다.",
  "actions": [
    {
      "label": "비밀번호 변경",
      "url": "/password/edit"
    }
  ],
  "sources": [
    {
      "title": "비밀번호 변경",
      "sourceUrl": "/posts/23",
      "score": 0.86
    }
  ]
}
```

자료 부족 응답:

```json
{
  "answer": "관련 자료가 부족해서 정확히 답변할 수 없습니다.",
  "actions": [],
  "sources": []
}
```

## 데이터 흐름

```text
관리자 또는 개발자
→ FastAPI POST /rag/sync
→ Spring GET /api/posts?type=NOTICE&page=1&size=100
→ Spring GET /api/posts?type=FAQ&page=1&size=100
→ Spring GET /api/posts/{id}
→ title/content chunking
→ OpenAI embedding
→ PostgreSQL post_embeddings upsert

React AI 비서
→ FastAPI POST /rag/ask
→ 질문 embedding 생성
→ post_embeddings cosine similarity 검색
→ 검색 결과를 context로 구성
→ ChatOpenAI 답변 생성
→ answer + actions + sources 반환
```

## Chunking

- 본문 800자 이하 게시글은 chunk 1개로 저장한다.
- 본문 800자 초과 게시글은 문단 기준으로 약 700자 단위 chunk로 나눈다.
- 모든 chunk는 원본 `post_id`, `title`, `source_url`, `canonical_url`, `post_type`을 metadata처럼 보존한다.
- 같은 게시글의 여러 chunk가 검색되어도 `sources`, `actions`는 게시글 기준으로 중복 제거한다.

## 제외 범위

- Spring 내부 RAG 통합
- Spring 작성/수정 시 자동 embedding 동기화
- React에 sync 버튼 추가
- Vector DB 제품 도입
- LangGraph
- Agent
- Reranker
- 채팅 기록 DB 저장
- 스트리밍 응답
- 이미지형 pet 자산 생성
