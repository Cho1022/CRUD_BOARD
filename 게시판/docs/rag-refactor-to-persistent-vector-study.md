# RAG 리팩토링 학습 자료: InMemoryVectorStore에서 PostgreSQL/pgvector 구조로 바꾸기

## 1. 왜 리팩토링하려고 하는가

현재 RAG 코드는 학습용 MVP 구조다.

현재 흐름:

```text
사용자가 질문한다.
-> FastAPI가 Spring API에서 공지/FAQ 게시글을 매번 가져온다.
-> 게시글 title/content를 Document로 바꾼다.
-> 요청마다 OpenAI embedding을 만든다.
-> 요청마다 InMemoryVectorStore에 임시 저장한다.
-> 질문과 유사한 문서를 Top-K 검색한다.
-> 검색 결과를 context로 넣고 LLM 답변을 만든다.
```

이 구조는 이해하기 쉽지만, 게시글이 많아질수록 비효율적이다.

문제점:

```text
질문할 때마다 Spring API 호출
질문할 때마다 게시글 embedding 재생성
질문할 때마다 vector store 재생성
요청이 끝나면 vector 저장 결과가 사라짐
```

그래서 개선 방향은 다음이다.

```text
게시글을 저장하거나 수정할 때 embedding을 미리 만든다.
embedding vector를 DB에 저장한다.
질문이 들어오면 질문만 embedding한다.
DB에 저장된 vector와 유사도 검색을 한다.
Top-K 결과만 context로 넣어 답변한다.
```

## 2. 현재 구조와 개선 구조 비교

```mermaid
flowchart LR
    subgraph BEFORE["현재 구조"]
        A1["질문 요청"] --> A2["Spring에서 게시글 조회"]
        A2 --> A3["Document 변환"]
        A3 --> A4["게시글 embedding 생성"]
        A4 --> A5["InMemoryVectorStore 임시 저장"]
        A5 --> A6["Top-K 검색"]
        A6 --> A7["context prompt"]
        A7 --> A8["LLM 답변"]
    end

    subgraph AFTER["개선 구조"]
        B1["게시글 생성/수정"] --> B2["게시글 chunking"]
        B2 --> B3["chunk embedding 생성"]
        B3 --> B4["post_embeddings 테이블 저장"]
        C1["질문 요청"] --> C2["질문 embedding 생성"]
        C2 --> C3["DB에서 vector 유사도 검색"]
        C3 --> C4["Top-K 결과 조회"]
        C4 --> C5["context prompt"]
        C5 --> C6["LLM 답변"]
    end
```

핵심 차이:

| 구분 | 현재 | 개선 |
|---|---|---|
| 게시글 embedding 생성 | 질문할 때마다 | 게시글 작성/수정 시 |
| vector 저장 | 메모리 임시 저장 | DB 영구 저장 |
| 질문 처리 비용 | 게시글 수가 늘수록 커짐 | 질문 embedding + DB 검색 |
| 검색 구현 | LangChain InMemoryVectorStore | PostgreSQL/pgvector 또는 Python cosine |
| 운영 적합성 | 낮음 | 높음 |

## 3. Document로 변환하는 이유

게시글 원본 데이터는 보통 이런 구조다.

```text
id
postType
title
content
canonicalUrl
```

하지만 RAG 검색에서는 두 종류의 정보가 필요하다.

```text
1. 실제 검색할 텍스트
2. 검색 결과를 원본 게시글로 되돌리기 위한 부가 정보
```

LangChain `Document`는 이 두 가지를 나눠 담는다.

```python
Document(
    page_content="검색 대상 텍스트",
    metadata={
        "id": 1,
        "title": "비밀번호 변경 방법",
        "sourceUrl": "/posts/1",
        "postType": "FAQ",
        "canonicalUrl": "/password/edit"
    }
)
```

역할:

```text
page_content = embedding하고 유사도 검색할 텍스트
metadata = 출처 표시, 필터링, 링크 이동에 필요한 정보
```

그래서 게시글을 Document로 변환하는 것은 "LangChain을 쓰기 위한 포장"이기도 하고, 동시에 "검색 텍스트와 메타데이터를 분리하는 설계"이기도 하다.

개선 후에도 이 개념은 유지하는 것이 좋다.

단, `Document`를 꼭 DB에 그대로 저장할 필요는 없다.

DB에는 다음처럼 나눠 저장하면 된다.

```text
content = page_content에 해당하는 검색 텍스트
metadata 컬럼들 = post_id, title, post_type, source_url, canonical_url, chunk_index
embedding = vector
```

## 4. 저장 위치 선택지

### 4-1. InMemoryVectorStore

현재 방식이다.

장점:

```text
구현이 쉽다.
LangChain으로 빠르게 RAG 흐름을 볼 수 있다.
```

단점:

```text
요청마다 다시 만들어야 한다.
서버 재시작 시 사라진다.
게시글 수가 늘면 비효율적이다.
```

### 4-2. 로컬 파일 저장

예:

```text
embeddings.json
embeddings.pkl
embeddings.npy
```

장점:

```text
학습용으로 이해하기 쉽다.
DB 없이 embedding 캐시를 체험할 수 있다.
```

단점:

```text
동시 요청에 약하다.
여러 서버에서 공유하기 어렵다.
삭제/수정 동기화가 번거롭다.
검색 인덱스가 없다.
운영에서는 관리가 어렵다.
```

### 4-3. PostgreSQL에 JSON/배열로 저장

embedding vector를 `jsonb`나 `float[]`로 저장할 수 있다.

장점:

```text
기존 PostgreSQL만으로 실습 가능하다.
데이터를 영구 저장할 수 있다.
```

단점:

```text
유사도 검색을 직접 구현해야 한다.
데이터가 많으면 느리다.
인덱스 활용이 어렵다.
```

학습용 중간 단계로는 괜찮다.

### 4-4. PostgreSQL + pgvector

현업에서 많이 쓰는 선택지다.

`pgvector`는 PostgreSQL에서 vector 타입과 유사도 검색 연산자를 사용할 수 있게 해주는 확장이다.

장점:

```text
PostgreSQL 안에서 vector 유사도 검색 가능
기존 게시글 DB와 함께 관리 가능
인덱스 생성 가능
운영 구조에 가깝다
```

단점:

```text
pgvector 설치가 필요하다.
embedding 차원 수를 알아야 한다.
SQL과 마이그레이션 작업이 필요하다.
```

### 4-5. 전용 Vector DB

예:

```text
Chroma
Pinecone
Weaviate
Qdrant
Milvus
```

장점:

```text
대량 vector 검색에 특화되어 있다.
필터링, 인덱싱, 확장성이 좋다.
```

단점:

```text
운영할 서비스가 하나 더 늘어난다.
학습 초반에는 개념이 많아진다.
```

현재 프로젝트에서는 PostgreSQL을 이미 쓰고 있으므로, 다음 학습 단계는 `pgvector`가 가장 자연스럽다.

## 5. 추천 목표 구조

처음 리팩토링 목표는 이것으로 잡으면 좋다.

```text
Spring 게시글은 그대로 둔다.
FastAPI가 게시글을 읽어 embedding을 만든다.
embedding 결과를 PostgreSQL post_embeddings 테이블에 저장한다.
질문 시 FastAPI가 질문만 embedding한다.
PostgreSQL에서 Top-K 검색한다.
검색 결과를 기존 generate_answer()에 넣는다.
```

구조:

```mermaid
flowchart TD
    A["Spring posts 테이블"] --> B["FastAPI sync_embeddings()"]
    B --> C["OpenAIEmbeddings"]
    C --> D["PostgreSQL post_embeddings"]
    E["사용자 질문"] --> F["FastAPI /rag/ask"]
    F --> G["질문 embedding"]
    G --> H["post_embeddings 유사도 검색"]
    H --> I["Top-K chunks"]
    I --> J["Document 형태로 복원"]
    J --> K["generate_answer()"]
    K --> L["answer/actions/sources 반환"]
```

## 6. 테이블 설계

pgvector를 쓴다면 PostgreSQL에 확장을 켠다.

```sql
create extension if not exists vector;
```

OpenAI `text-embedding-3-small`의 embedding 차원은 1536이다.

테이블 예시:

```sql
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

각 컬럼의 의미:

```text
post_id = 원본 게시글 id
post_type = NOTICE, FAQ
title = 출처 표시용 제목
content = embedding한 실제 chunk 텍스트
source_url = /posts/{id}
canonical_url = 기능 이동 링크
chunk_index = 한 게시글 안에서 몇 번째 chunk인지
embedding = OpenAI embedding vector
content_hash = 내용 변경 감지용
```

인덱스 예시:

```sql
create index if not exists idx_post_embeddings_post_type
on post_embeddings (post_type);

create index if not exists idx_post_embeddings_embedding
on post_embeddings
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);
```

주의:

```text
ivfflat 인덱스는 데이터가 너무 적을 때는 효과가 작을 수 있다.
처음 학습 단계에서는 인덱스 없이도 동작을 먼저 확인해도 된다.
```

## 7. FastAPI 의존성 추가

PostgreSQL에 직접 연결하려면 Python DB 라이브러리가 필요하다.

예시:

```text
psycopg[binary]
pgvector
```

`requirements.txt`에 추가:

```text
psycopg[binary]
pgvector
```

환경 변수 예시:

```text
DATABASE_URL=postgresql://board:board@localhost:5433/board
```

## 8. 코드 수정 지도

현재 가장 중요한 함수는 이것이다.

```python
retrieve_documents(question, documents)
```

현재 이 함수는 다음 일을 한다.

```text
1. embedding 모델 생성
2. InMemoryVectorStore 생성
3. 문서들을 vector store에 추가
4. 질문으로 similarity search
```

개선 후에는 역할을 나눈다.

```text
sync_embeddings()
    - Spring에서 게시글 가져오기
    - Document/chunk 생성
    - chunk embedding 생성
    - DB에 저장

retrieve_documents_from_db()
    - 질문 embedding 생성
    - DB에서 Top-K 검색
    - 검색 결과를 Document처럼 복원
```

즉 `retrieve_documents()`를 한 번에 고치는 것이 아니라, 두 흐름으로 나눈다.

## 9. sync_embeddings() 설계

목표:

```text
게시글 embedding을 미리 생성해서 DB에 저장한다.
```

흐름:

```text
1. fetch_knowledge_posts()로 NOTICE/FAQ 조회
2. to_documents()로 Document/chunk 생성
3. 각 Document의 page_content를 embedding
4. post_embeddings 테이블에 upsert
5. 삭제되거나 사라진 게시글 embedding 정리
```

의사코드:

```python
async def sync_embeddings():
    posts = await fetch_knowledge_posts()
    documents = to_documents(posts)
    embeddings = OpenAIEmbeddings(model=OPENAI_EMBEDDING_MODEL)

    for document in documents:
        vector = embeddings.embed_query(document.page_content)
        upsert_embedding(document, vector)
```

주의:

```text
실제 구현에서는 embed_query를 반복 호출하기보다 embed_documents로 묶어서 처리하는 것이 좋다.
```

개선된 의사코드:

```python
texts = [document.page_content for document in documents]
vectors = embeddings.embed_documents(texts)

for document, vector in zip(documents, vectors):
    upsert_embedding(document, vector)
```

## 10. upsert_embedding() 설계

같은 게시글/chunk가 이미 있으면 update하고, 없으면 insert한다.

기준:

```text
unique (post_id, chunk_index)
```

의사 SQL:

```sql
insert into post_embeddings (
    post_id,
    post_type,
    title,
    content,
    source_url,
    canonical_url,
    chunk_index,
    embedding,
    content_hash,
    updated_at
) values (
    :post_id,
    :post_type,
    :title,
    :content,
    :source_url,
    :canonical_url,
    :chunk_index,
    :embedding,
    :content_hash,
    now()
)
on conflict (post_id, chunk_index)
do update set
    post_type = excluded.post_type,
    title = excluded.title,
    content = excluded.content,
    source_url = excluded.source_url,
    canonical_url = excluded.canonical_url,
    embedding = excluded.embedding,
    content_hash = excluded.content_hash,
    updated_at = now();
```

## 11. retrieve_documents_from_db() 설계

목표:

```text
질문만 embedding하고, DB에 저장된 vector들과 유사도 검색한다.
```

흐름:

```text
1. 질문 embedding 생성
2. post_embeddings에서 cosine distance 기준으로 정렬
3. Top-K 조회
4. 점수 계산
5. Document 형태로 복원
```

pgvector에서는 cosine distance 연산자를 사용할 수 있다.

```sql
embedding <=> :question_embedding
```

`<=>`는 cosine distance다.

보통 similarity는 다음처럼 바꿔서 쓴다.

```text
similarity = 1 - cosine_distance
```

SQL 예시:

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

Python 의사코드:

```python
def retrieve_documents_from_db(question: str) -> list[tuple[Document, float]]:
    embeddings = OpenAIEmbeddings(model=OPENAI_EMBEDDING_MODEL)
    question_vector = embeddings.embed_query(question)
    rows = search_embeddings(question_vector, RAG_TOP_K)

    return [
        (
            Document(
                page_content=row["content"],
                metadata={
                    "id": row["post_id"],
                    "title": row["title"],
                    "sourceUrl": row["source_url"],
                    "postType": row["post_type"],
                    "canonicalUrl": row["canonical_url"],
                    "chunkIndex": row["chunk_index"],
                },
            ),
            row["score"],
        )
        for row in rows
    ]
```

이렇게 하면 기존 `generate_answer()`, `build_actions()`, `build_sources()`를 크게 바꾸지 않아도 된다.

## 12. ask_rag()는 어떻게 바뀌는가

현재 일반 검색 흐름:

```python
documents = to_documents(posts)
retrieved = retrieve_documents(question, documents)
```

개선 후 일반 검색 흐름:

```python
retrieved = retrieve_documents_from_db(question)
```

나머지는 거의 그대로 둔다.

```python
relevant = [(document, score) for document, score in retrieved if score >= RAG_MIN_SCORE]
if not relevant:
    return RagAskResponse(answer=FALLBACK_ANSWER, actions=[], sources=[])

answer = generate_answer(question, relevant)
actions = build_actions(relevant)
sources = build_sources(relevant)
return RagAskResponse(answer=answer, actions=actions, sources=sources)
```

리팩토링의 핵심은 답변 생성부를 갈아엎는 것이 아니다.

```text
검색하는 부분만 InMemoryVectorStore에서 DB 검색으로 바꾸는 것
```

## 13. sync API를 만들지, 자동으로 할지

선택지는 두 가지다.

### 선택지 A: 수동 sync API

FastAPI에 관리자용 API를 만든다.

```text
POST /rag/sync
```

장점:

```text
구현이 쉽다.
학습하기 좋다.
원할 때 동기화할 수 있다.
```

단점:

```text
게시글 수정 후 sync를 까먹으면 검색 결과가 오래될 수 있다.
```

### 선택지 B: 게시글 작성/수정 시 자동 sync

Spring에서 게시글 작성/수정 후 FastAPI sync API를 호출하거나, 이벤트 큐를 사용한다.

장점:

```text
데이터 최신성이 좋다.
운영 구조에 가깝다.
```

단점:

```text
구현이 복잡하다.
Spring과 FastAPI 사이의 실패 처리도 고려해야 한다.
```

처음 학습할 때는 선택지 A를 추천한다.

```text
먼저 POST /rag/sync를 만들고,
동작을 이해한 뒤 자동화를 고민한다.
```

## 14. filter와 Top-K는 어떻게 같이 쓰는가

필터는 검색 범위를 줄이는 것이다.

Top-K는 필터를 통과한 것 중 가장 비슷한 K개를 가져오는 것이다.

예시:

```text
질문: 비밀번호 어디서 바꿔?

필터:
post_type in ('NOTICE', 'FAQ')

Top-K:
필터를 통과한 embedding 중 질문 vector와 가장 가까운 3개
```

SQL에서는 이렇게 된다.

```sql
select ...
from post_embeddings
where post_type in ('NOTICE', 'FAQ')
order by embedding <=> :question_embedding
limit 3;
```

나중에는 필터를 더 늘릴 수 있다.

```text
is_public = true
deleted_at is null
language = 'ko'
category = 'account'
created_at >= 최근 1년
```

## 15. reranker란 무엇인가

Reranker는 1차 검색 결과를 다시 정밀하게 재정렬하는 단계다.

기본 검색:

```text
질문 vector와 문서 vector의 거리로 빠르게 후보를 찾는다.
```

reranker:

```text
질문과 후보 문서 내용을 다시 비교해서 더 정확한 순서로 재정렬한다.
```

흐름:

```text
질문
-> vector 검색으로 후보 20개
-> reranker가 후보 20개를 다시 평가
-> 상위 3개만 context로 사용
```

왜 쓰는가:

```text
embedding 검색은 빠르지만 가끔 애매한 후보를 뽑는다.
reranker는 느리지만 더 정밀하게 순서를 잡는다.
```

처음에는 reranker를 넣지 않아도 된다.

추천 순서:

```text
1. pgvector Top-K 검색 먼저 구현
2. fallback 정상 동작 확인
3. 검색 품질이 아쉬울 때 reranker 추가
```

## 16. 처음 직접 구현할 때 단계별 체크리스트

### 1단계: DB 준비

```text
pgvector 사용 가능 여부 확인
post_embeddings 테이블 생성
DATABASE_URL 환경 변수 추가
```

### 2단계: Python 의존성 추가

```text
psycopg[binary]
pgvector
```

### 3단계: DB 연결 함수 만들기

예상 함수:

```python
def get_connection():
    ...
```

### 4단계: sync_embeddings() 만들기

예상 흐름:

```text
fetch_knowledge_posts()
-> to_documents()
-> embed_documents()
-> upsert
```

### 5단계: /rag/sync API 만들기

예상 API:

```python
@app.post("/rag/sync")
async def sync_rag() -> dict[str, int]:
    count = await sync_embeddings()
    return {"synced": count}
```

### 6단계: retrieve_documents_from_db() 만들기

예상 흐름:

```text
question embedding
-> SQL Top-K 검색
-> Document로 복원
```

### 7단계: ask_rag() 교체

기존:

```python
documents = to_documents(posts)
retrieved = retrieve_documents(question, documents)
```

변경:

```python
retrieved = retrieve_documents_from_db(question)
```

### 8단계: fallback 확인

확인 질문:

```text
비밀번호 어디서 바꿔?
오늘 날씨 알려줘
공지사항 알려줘
```

기대:

```text
관련 질문은 출처 포함 답변
무관한 질문은 fallback
공지/FAQ 목록 질문은 목록 요약
```

## 17. 실제 코드 수정 예시

아래 코드는 방향을 보여주는 학습용 예시다.

실제 프로젝트에 바로 붙이기 전에는 DB 접속 정보와 pgvector 설정을 맞춰야 한다.

```python
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://board:board@localhost:5433/board")
```

```python
from pgvector.psycopg import register_vector
import psycopg
```

```python
def search_embeddings(question_vector: list[float], top_k: int) -> list[dict[str, Any]]:
    with psycopg.connect(DATABASE_URL) as conn:
        register_vector(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                select
                    post_id,
                    post_type,
                    title,
                    content,
                    source_url,
                    canonical_url,
                    chunk_index,
                    1 - (embedding <=> %s::vector) as score
                from post_embeddings
                where post_type in ('NOTICE', 'FAQ')
                order by embedding <=> %s::vector
                limit %s
                """,
                (question_vector, question_vector, top_k),
            )
            rows = cur.fetchall()
    ...
```

주의:

```text
실제 psycopg + pgvector 파라미터 전달 방식은 환경에 따라 조정이 필요할 수 있다.
처음에는 작은 테스트 데이터로 SQL이 되는지부터 확인한다.
```

## 18. 리팩토링할 때 유지해야 할 것

아래 함수들은 최대한 유지하는 것이 좋다.

```text
generate_answer()
generate_list_answer()
build_actions()
build_sources()
normalize_path()
```

이유:

```text
이 함수들은 검색 저장 방식과 직접 관련이 없다.
검색 결과가 Document + score 형태로만 오면 그대로 재사용할 수 있다.
```

바꿔야 할 핵심은 검색 계층이다.

```text
Before:
retrieve_documents()

After:
sync_embeddings()
retrieve_documents_from_db()
```

## 19. 최종 목표 그림

```text
게시글 저장/수정
-> embedding 생성
-> post_embeddings 저장

사용자 질문
-> 질문 embedding
-> post_embeddings에서 Top-K 검색
-> 검색 결과를 Document로 복원
-> context prompt
-> ChatOpenAI 답변
-> sources/actions와 함께 반환
```

이 구조를 이해하면 이후에 Vector DB, LangChain Retriever, Reranker, Agent를 붙일 때도 기준을 잃지 않는다.

## 20. 지금 바로 공부할 핵심 문장

```text
Document는 검색할 텍스트와 출처 정보를 묶는 형식이다.
Embedding은 텍스트를 vector로 바꾸는 작업이다.
Vector는 DB에 저장할 수 있다.
Top-K Retrieval은 질문 vector와 가까운 문서 vector K개를 찾는 것이다.
pgvector를 쓰면 PostgreSQL 안에서 vector 유사도 검색을 할 수 있다.
Reranker는 1차 검색 후보를 더 정확하게 다시 정렬하는 선택 단계다.
```

