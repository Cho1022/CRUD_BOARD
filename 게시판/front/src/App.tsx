import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/authContext";
import { LoginPage } from "./pages/LoginPage";
import { PasswordEditPage } from "./pages/PasswordEditPage";
import { PostDetailPage } from "./pages/PostDetailPage";
import { PostFormPage } from "./pages/PostFormPage";
import { PostsPage } from "./pages/PostsPage";
import { ProfileEditPage } from "./pages/ProfileEditPage";
import { SignupPage } from "./pages/SignupPage";

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
      <div className="content-layout">
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/posts" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/posts" element={<PostsPage />} />
            <Route path="/posts/new" element={<PostFormPage />} />
            <Route path="/posts/:postId" element={<PostDetailPage />} />
            <Route path="/posts/:postId/edit" element={<PostFormPage />} />
            <Route path="/profile/edit" element={<ProfileEditPage />} />
            <Route path="/password/edit" element={<PasswordEditPage />} />
            <Route path="*" element={<Navigate to="/posts" replace />} />
          </Routes>
        </main>
        {user && <ProfileAside />}
      </div>
    </div>
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
    </aside>
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
