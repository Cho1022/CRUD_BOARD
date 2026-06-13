# ReconcileFlow

소상공인 정산 CSV와 은행 입금 CSV를 업로드해 자동 대사하고, 운영자가 결과를 확인 처리하는 풀스택 MVP입니다.

## 구성

- `backend`: Spring Boot 3.5, Java 17 target, JPA, MySQL, Flyway, JWT
- `frontend`: Next.js App Router, TypeScript, Tailwind CSS, Recharts, Axios
- `docker-compose.yml`: MySQL 기본 실행, 앱 컨테이너는 `app` profile
- `samples`: 바로 업로드할 수 있는 정산/입금 CSV

## 로컬 실행

MySQL만 Docker로 실행합니다.

```powershell
docker compose up -d mysql
```

백엔드는 Gradle 8.14 이상이 있으면 다음처럼 실행합니다.

```powershell
cd backend
gradle bootRun
```

프론트는 의존성 설치 후 실행합니다.

```powershell
cd frontend
npm install
npm run dev
```

- 프론트: `http://localhost:3000`
- 백엔드: `http://localhost:8080`
- MySQL: `127.0.0.1:3307`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

Docker로 전체 앱을 빌드 실행하려면 다음 명령을 사용합니다.

```powershell
docker compose --profile app up --build
```

## 시연 순서

1. 회원가입 또는 로그인합니다.
2. `samples/settlements.csv`를 정산 CSV로 업로드합니다.
3. `samples/bank_transactions.csv`를 은행 입금 CSV로 업로드합니다.
4. 기간 `2026-06-01`부터 `2026-06-30`, 플랫폼 `BAEMIN`으로 대사를 실행합니다.
5. 대시보드와 대사 결과 목록에서 정상, 금액 불일치, 입금 누락, 중복 후보를 확인합니다.

## 핵심 API

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/uploads/settlements`
- `POST /api/uploads/bank-transactions`
- `POST /api/reconciliations/run`
- `GET /api/reconciliations`
- `GET /api/reconciliations/{id}`
- `PATCH /api/reconciliations/{id}/confirm`
- `GET /api/dashboard/summary`

## 테스트

```powershell
cd backend
gradle test
```
