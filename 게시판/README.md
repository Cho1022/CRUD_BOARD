# AI 확장 대비 게시판

`front`와 `backend`를 분리한 게시판 프로젝트입니다. 기존 루트 `backend`, `frontend`, `docker-compose.yml`은 사용하지 않습니다.

## 구성

- `backend`: Java 21, Spring Boot, JPA, Security, PostgreSQL, Flyway, Swagger
- `front`: Vite, React, TypeScript, Vitest
- `docker-compose.yml`: 게시판 전용 PostgreSQL

## 실행

PostgreSQL:

```powershell
cd "C:\Users\whqja\OneDrive\문서\agent sdk\게시판"
docker compose up -d postgres
```

백엔드:

```powershell
cd "C:\Users\whqja\OneDrive\문서\agent sdk\게시판\backend"
.\gradlew.bat bootRun
```

프론트:

```powershell
cd "C:\Users\whqja\OneDrive\문서\agent sdk\게시판\front"
npm run dev
```

- 프론트: `http://localhost:5173`
- 백엔드: `http://localhost:8080`
- Swagger: `http://localhost:8080/swagger-ui/index.html`
- PostgreSQL: `localhost:5433`

## 테스트

백엔드 빌드 산출물은 한글/공백 경로 이슈를 피하기 위해 기본적으로 시스템 임시 폴더의 `board-backend-build`에 생성된다.

```powershell
cd "C:\Users\whqja\OneDrive\문서\agent sdk\게시판\backend"
.\gradlew.bat test
```

프론트:

```powershell
cd "C:\Users\whqja\OneDrive\문서\agent sdk\게시판\front"
npm run test:run
npm run build
```

## 1차 범위

- 회원가입, 로그인, Refresh Token
- 게시글 CRUD, 검색, 페이지 번호
- 댓글, 좋아요, 태그 수동 입력, 로컬 태그 후보 추천
- 로컬 이미지 업로드
- 관리자 공지/FAQ
- RAG/GraphRAG/MCP 확장을 위한 데이터 구조
