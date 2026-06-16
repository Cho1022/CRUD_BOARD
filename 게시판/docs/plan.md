# FastAPI RAG + 게시판 AI 비서 구현 계획

## Milestone 1: FastAPI 기본 서버

우선순위: P0

작업:
- `게시판/rag-server` 생성
- `requirements.txt` 작성
- `.env.example` 작성
- `main.py` 생성
- `GET /health` 구현

검증:
- `uvicorn main:app --reload --port 8000`
- `GET http://localhost:8000/health`

## Milestone 2: Spring 게시글 API 연결

우선순위: P0

작업:
- `BOARD_API_BASE_URL=http://localhost:8080/api` 사용
- `GET /posts?type=NOTICE&page=1&size=100` 호출
- `GET /posts?type=FAQ&page=1&size=100` 호출
- 목록 응답의 `data.content`에는 본문이 없으므로 각 ID로 `GET /posts/{id}`를 추가 호출
- 상세 응답의 `data.content`를 파싱
- 게시글을 RAG용 문서 객체로 변환

검증:
- Spring 서버가 켜진 상태에서 FastAPI가 공지/FAQ 글을 읽을 수 있어야 한다.

## Milestone 3: LangChain Retrieval 구현

우선순위: P0

작업:
- 게시글을 LangChain `Document`로 변환
- `page_content = title + "\n\n" + content`
- metadata에 `id`, `title`, `sourceUrl`, `postType` 저장
- OpenAI embedding 연결
- 초기 MVP에서는 질문마다 임시 vector store 생성
- Milestone 9 이후에는 pgvector DB 검색으로 대체

검증:
- 질문을 넣으면 관련 문서 1~3개가 선택되어야 한다.
- 최종 구조에서는 `post_embeddings`에서 관련 chunk가 선택되어야 한다.

## Milestone 4: RAG 답변 생성

우선순위: P0

작업:
- `POST /rag/ask` 구현
- request 형식은 `{ "question": "..." }`
- context prompt 구성
- ChatOpenAI 호출
- fallback 처리
- response 형식은 `{ "answer": "...", "sources": [...] }`

검증:
- 관련 질문은 출처 포함 답변을 반환한다.
- 무관한 질문은 fallback을 반환한다.

## Milestone 5: React API 연결

우선순위: P1

작업:
- `front/src/types.ts`에 RAG 타입 추가
- `front/src/lib/api.ts`에 `askRag(question)` 추가
- `VITE_RAG_API_BASE_URL=http://localhost:8000` 사용

검증:
- 브라우저에서 질문을 보내면 FastAPI 응답을 받아야 한다.

## Milestone 6: 프로필 아래 AI 비서 UI

우선순위: P1

작업:
- `ProfileAside` 아래 AI 비서 버튼 추가
- CSS 기반 원형 AI 아이콘 추가
- "AI 비서", "무엇이든 물어보세요" 표시
- 클릭 시 채팅 패널 열고 닫기
- 질문 입력창, 전송 버튼, 로딩 상태, 에러 상태 추가
- 답변과 출처 링크 표시

검증:
- 로그인 상태에서만 보인다.
- 모바일에서 프로필 카드 아래 자연스럽게 배치된다.
- 긴 답변이 UI를 깨지 않아야 한다.

## Milestone 7: 최종 검증

우선순위: P1

작업:
- Spring 서버 실행
- FastAPI 서버 실행
- React 서버 실행
- 공지/FAQ 게시글 생성
- AI 비서 질문 테스트
- 출처 링크 이동 확인

검증:
- `npm run build`
- `python -m py_compile main.py`
- 수동 브라우저 테스트

## Milestone 8: 공지/FAQ 목록 요약과 긴 글 chunking

우선순위: P1

작업:
- `main.py`에 질문 의도 분기를 추가한다.
- "공지", "공지사항", "안내" 질문은 NOTICE 최신 목록 요약으로 처리한다.
- "FAQ", "자주 묻는 질문", "질문 모음" 질문은 FAQ 최신 목록 요약으로 처리한다.
- 목록 요약 응답에서도 `answer`, `actions`, `sources` 구조를 유지한다.
- 본문 800자 이하 게시글은 기존 Document 변환을 유지한다.
- 본문 800자 초과 게시글만 문단 기준 chunking을 적용한다.
- 검색 결과의 `sources`, `actions`는 게시글 기준으로 중복 제거한다.

검증:
- `공지사항 말해줘봐` 질문이 NOTICE 목록을 요약해야 한다.
- `FAQ 알려줘` 질문이 FAQ 목록을 요약해야 한다.
- `비밀번호는 어디서 바꿔?` 질문은 기존 유사도 검색으로 동작해야 한다.
- `오늘 날씨 알려줘` 질문은 fallback을 반환해야 한다.
- `python -m py_compile main.py`
- `npm run build`
- `npm run test:run`

## Milestone 9: pgvector 기반 persistent retrieval 전환

우선순위: P0

작업:
- Docker PostgreSQL 이미지를 `pgvector/pgvector:pg16`으로 변경한다.
- Flyway migration으로 `vector` extension과 `post_embeddings` 테이블을 생성한다.
- FastAPI를 `main.py`, `rag.py`, `db.py` 3파일로 분리한다.
- `/rag/sync`를 추가하고 `X-RAG-SYNC-TOKEN`을 필수로 검증한다.
- `/rag/sync`는 Spring API에서 NOTICE/FAQ를 조회해 chunk embedding을 저장한다.
- `content_hash`가 같은 chunk는 embedding을 다시 만들지 않는다.
- Spring API에 없는 기존 embedding은 삭제한다.
- `/rag/ask` 일반 검색은 `post_embeddings` cosine similarity 검색만 사용한다.
- 기존 `InMemoryVectorStore`, 요청 단위 vector store 흐름, 명시적 `numpy` 의존성을 제거한다.

검증:
- `python -m py_compile main.py rag.py db.py`
- pgvector 이미지로 DB 실행 후 Spring Flyway migration 성공
- 토큰 없이 `/rag/sync` 호출 시 거부
- 올바른 토큰으로 `/rag/sync` 호출 시 inserted/updated/skipped/deleted count 반환
- 같은 데이터로 두 번째 sync 시 대부분 skipped
- `비밀번호는 어디서 바꿔?` 질문이 DB 검색으로 답변해야 한다.
- `공지사항 말해줘봐`, `FAQ 알려줘` 질문이 목록 요약을 반환해야 한다.
- `npm run build`
- `npm run test:run`
