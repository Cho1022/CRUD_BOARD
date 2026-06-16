# Agent Rules

1. 항상 한국어로 답한다.
2. 현재 목표는 FastAPI 분리형 RAG MVP다.
3. Spring 백엔드는 게시글 원본 API 역할만 한다.
4. FastAPI는 원본 게시글을 Spring API로만 읽는다.
5. FastAPI는 embedding 저장/검색을 위해 PostgreSQL pgvector에 접속한다.
6. 검색 대상은 NOTICE, FAQ 게시글만 사용한다.
7. `/rag/sync`로 NOTICE/FAQ chunk embedding을 수동 동기화한다.
8. `/rag/sync`는 항상 `X-RAG-SYNC-TOKEN`을 요구한다.
9. 질문 처리 시 게시글 embedding을 다시 만들지 않는다.
10. 일반 질문은 `post_embeddings`에서 cosine similarity로 검색한다.
11. 공지/FAQ 목록 질문은 DB에 저장된 최신 embedding 목록으로 요약한다.
12. Vector DB 제품, LangGraph, Agent, Reranker는 구현하지 않는다.
13. LangChain은 OpenAI embedding/chat 및 Document 표현에만 사용한다.
14. React UI는 로그인한 사용자 프로필 아래에 둔다.
15. AI 비서 아이콘은 CSS 기반으로 유지한다.
16. 출처는 sourceUrl 링크로 표시한다.
17. action은 canonicalUrl이 있을 때만 표시한다.
18. 답변은 게시판 데이터 context에 근거해야 한다.
19. 관련 자료가 부족하면 fallback 문장을 반환한다.
20. Spring Java와 React UI는 필요한 경우가 아니면 수정하지 않는다.
21. FastAPI 코드는 `main.py`, `rag.py`, `db.py` 3파일 중심으로 유지한다.
22. 큰 리팩터링은 하지 않는다.
23. 기존 인증/게시글 API 구조를 존중한다.
24. 구현 후 FastAPI, React, Spring, DB 연결을 수동 검증한다.
