## 학습 폴더 구조

이 페이지는 아래 네 가지 주제로 나눠서 공부하면 됩니다.

### spring

Spring은 게시판의 원본 데이터를 관리하는 영역입니다.

RAG 관점에서 Spring의 역할은 다음입니다.

- 게시글을 PostgreSQL에 저장한다.
- 공지/FAQ 게시글을 API로 제공한다.
- FastAPI RAG 서버가 사용할 `title`, `content`, `postType`, `canonicalUrl`을 제공한다.
- 주요 API는 `/api/posts?type=NOTICE`, `/api/posts?type=FAQ`, `/api/posts/{id}`입니다.

### rag

RAG는 게시글을 먼저 검색하고, 검색된 내용을 context로 넣어 AI가 답변하게 하는 구조입니다.

현재 구현 흐름:

```text
React 질문
-> FastAPI /rag/ask
-> Spring에서 NOTICE/FAQ 게시글 조회
-> 게시글 title/content를 Document로 변환
-> OpenAIEmbeddings로 vector 생성
-> InMemoryVectorStore에 요청 중 임시 저장
-> similarity_search_with_score로 Top-K 검색
-> 점수가 낮으면 fallback
-> 검색 결과를 context로 넣고 ChatOpenAI 답변 생성
-> answer/actions/sources 반환
```

현재 코드의 핵심은 `retrieve_documents()`입니다.

```python
def retrieve_documents(question: str, documents: list[Document]) -> list[tuple[Document, float]]:
    embeddings = OpenAIEmbeddings(model=OPENAI_EMBEDDING_MODEL)
    vector_store = InMemoryVectorStore(embeddings)
    vector_store.add_documents(documents)
    return vector_store.similarity_search_with_score(question, k=min(RAG_TOP_K, len(documents)))
```

이 코드에서 중요한 점:

- `Document.page_content`가 embedding 대상입니다.
- `metadata`는 출처, 링크, 필터링에 쓰입니다.
- 현재 vector는 DB에 저장되지 않고 메모리에 임시 저장됩니다.
- 질문이 들어올 때마다 게시글 embedding을 다시 만듭니다.

### rag 리팩토링 방향

현업에 가까운 구조로 바꾸려면 다음 흐름으로 바꾸는 것이 좋습니다.

```text
게시글 작성/수정
-> title/content chunking
-> chunk embedding 생성
-> PostgreSQL post_embeddings 테이블에 vector 저장

사용자 질문
-> 질문 embedding 생성
-> post_embeddings에서 cosine similarity로 Top-K 검색
-> 검색 결과를 Document처럼 복원
-> context prompt 생성
-> ChatOpenAI 답변 생성
```

PostgreSQL에 저장할 테이블 예시:

```sql
create extension if not exists vector;

create table if not exists post_embeddings (
    id bigserial primary key,
    post_id bigint not null,
    post_type varchar(30) not null,
    title varchar(255) not null,
    content text not null,
    source_url varchar(255) not null,
    canonical_url varchar(255),
    chunk_index integer not null,
    embedding vector(1536) not null,
    content_hash varchar(64) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique (post_id, chunk_index)
);
```

검색 SQL 예시:

```sql
select
    post_id,
    post_type,
    title,
    content,
    source_url,
    canonical_url,
    chunk_index,
    1 - (embedding <=> :question_embedding) as score
from post_embeddings
where post_type in ('NOTICE', 'FAQ')
order by embedding <=> :question_embedding
limit :top_k;
```

이때 `<=>`는 pgvector의 cosine distance 연산자입니다.

코드 수정 지도:

```text
1. post_embeddings 테이블 생성
2. requirements.txt에 psycopg[binary], pgvector 추가
3. DATABASE_URL 환경 변수 추가
4. sync_embeddings() 함수 작성
5. /rag/sync API 작성
6. retrieve_documents_from_db() 작성
7. ask_rag()에서 기존 retrieve_documents() 대신 retrieve_documents_from_db() 호출
8. generate_answer(), build_actions(), build_sources()는 최대한 재사용
```

기존 구조:

```python
documents = to_documents(posts)
retrieved = retrieve_documents(question, documents)
```

개선 구조:

```python
retrieved = retrieve_documents_from_db(question)
```

### mcp

MCP는 Model Context Protocol입니다.

현재 게시판 RAG 구현에는 직접 들어가 있지 않습니다. 나중에 AI가 외부 도구, DB, 문서, 파일 시스템 등을 표준 방식으로 호출하게 만들 때 공부하면 됩니다.

공부 순서:

- MCP가 왜 필요한지
- Tool calling과 MCP의 차이
- MCP 서버/클라이언트 구조
- 게시판 프로젝트에 MCP를 붙이면 어떤 기능이 가능한지

### agentAI

Agent AI는 단순히 답변만 하는 챗봇이 아니라, 목표를 세우고 도구를 호출하면서 여러 단계를 수행하는 AI 구조입니다.

현재 RAG 구조:

```text
질문 -> 검색 -> context -> 답변
```

Agent 구조:

```text
목표 이해 -> 필요한 도구 선택 -> 도구 호출 -> 결과 해석 -> 다음 행동 결정 -> 최종 답변
```

현재 프로젝트는 아직 Agent가 아니라 RAG입니다. Agent는 RAG 흐름을 이해한 뒤 다음 단계로 공부하면 됩니다.

