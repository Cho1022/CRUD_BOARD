import { FormEvent, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/authContext";
import { api, apiErrorMessage } from "./lib/api";
import { LoginPage } from "./pages/LoginPage";
import { PasswordEditPage } from "./pages/PasswordEditPage";
import { PostDetailPage } from "./pages/PostDetailPage";
import { PostFormPage } from "./pages/PostFormPage";
import { PostsPage } from "./pages/PostsPage";
import { ProfileEditPage } from "./pages/ProfileEditPage";
import { SignupPage } from "./pages/SignupPage";
import type { RagAskResponse } from "./types";

function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/posts", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-title">개발 게시판</div>
        <nav className="site-nav" aria-label="주요 메뉴">
          <NavLink to="/posts">게시글</NavLink>
          <NavLink to="/posts/new">글쓰기</NavLink>
          {user && <NavLink to="/profile/edit">프로필</NavLink>}
          {user && <NavLink to="/password/edit">비밀번호</NavLink>}
          {user ? (
            <button type="button" className="nav-button" onClick={handleLogout}>
              로그아웃
            </button>
          ) : (
            <NavLink to="/login">로그인</NavLink>
          )}
        </nav>
      </header>
      <div className={user ? "content-layout with-profile" : "content-layout"}>
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/posts" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/posts" element={<PostsPage />} />
            <Route path="/posts/new" element={<RequireLogin><PostFormPage /></RequireLogin>} />
            <Route path="/posts/:postId" element={<RequireLogin><PostDetailPage /></RequireLogin>} />
            <Route path="/posts/:postId/edit" element={<RequireLogin><PostFormPage /></RequireLogin>} />
            <Route path="/profile/edit" element={<RequireLogin><ProfileEditPage /></RequireLogin>} />
            <Route path="/password/edit" element={<RequireLogin><PasswordEditPage /></RequireLogin>} />
            <Route path="*" element={<Navigate to="/posts" replace />} />
          </Routes>
        </main>
        {user && <ProfileAside />}
      </div>
    </div>
  );
}

function RequireLogin({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <section className="auth-panel">확인 중입니다.</section>;
  if (user) return children;
  return (
    <section className="auth-panel" aria-labelledby="login-required-title">
      <h1 id="login-required-title">로그인이 필요합니다.</h1>
      <p className="auth-link">게시글을 확인하거나 작성하려면 먼저 로그인해주세요.</p>
      <Link to="/login" className="primary-button">로그인</Link>
    </section>
  );
}

function ProfileAside() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <aside className="profile-aside" aria-label="내 프로필">
      <Avatar nickname={user.nickname} imageUrl={user.profileImageUrl} />
      <strong>{user.nickname}</strong>
      <span>{user.email}</span>
      <NavLink to="/profile/edit">프로필 수정</NavLink>
      <AiAssistant />
    </aside>
  );
}

function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<RagAskResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuestion = question.trim();
    if (!nextQuestion) return;

    setLoading(true);
    setError("");
    try {
      setResult(await api.askRag(nextQuestion));
      setQuestion("");
    } catch (nextError) {
      setError(apiErrorMessage(nextError, "AI 비서 답변을 가져오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ai-assistant" aria-label="AI 비서">
      <button
        type="button"
        className="ai-assistant-button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="ai-assistant-icon" aria-hidden="true">AI</span>
        <span>
          <strong>AI 비서</strong>
          <small>무엇이든 물어보세요</small>
        </span>
      </button>

      {open && (
        <div className="ai-chat-panel">
          <form className="ai-chat-form" onSubmit={handleSubmit}>
            <label htmlFor="ai-question">질문</label>
            <textarea
              id="ai-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="공지나 FAQ에 대해 질문하세요."
              rows={3}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !question.trim()}>
              {loading ? "검색 중" : "전송"}
            </button>
          </form>

          {error && <p className="ai-chat-error">{error}</p>}
          {result && (
            <div className="ai-chat-answer">
              <p>{result.answer}</p>
              {result.actions.length > 0 && (
                <div className="ai-chat-actions">
                  {result.actions.map((action) => (
                    <Link to={action.url} key={`${action.label}-${action.url}`}>
                      {action.label}
                    </Link>
                  ))}
                </div>
              )}
              {result.sources.length > 0 && (
                <div className="ai-chat-sources">
                  <strong>출처</strong>
                  {result.sources.map((source) => (
                    <Link to={source.sourceUrl} key={`${source.sourceUrl}-${source.score}`}>
                      {source.title}
                      <span>{Math.round(source.score * 100)}%</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Avatar({ nickname, imageUrl }: { nickname: string; imageUrl?: string | null }) {
  if (imageUrl) return <img className="profile-avatar" src={imageUrl} alt="프로필 사진" />;
  return <span className="profile-avatar placeholder">{nickname.slice(0, 1).toUpperCase()}</span>;
}

export function AppRoutes() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
