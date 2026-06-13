import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/authContext";
import { api } from "../lib/api";

interface LoginErrors {
  email?: string;
  password?: string;
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/.test(password);
}

export function LoginPage() {
  const navigate = useNavigate();
  const { completeLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitError, setSubmitError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: LoginErrors = {};
    if (!email.trim()) {
      nextErrors.email = "이메일을 입력해주세요.";
    } else if (!validateEmail(email)) {
      nextErrors.email = "올바른 이메일 주소 형식을 입력해주세요. (예: example@adapterz.kr)";
    }

    if (!password) {
      nextErrors.password = "비밀번호를 입력해주세요";
    } else if (!validatePassword(password)) {
      nextErrors.password = "비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await login();
  }

  async function login() {
    try {
      const response = await api.login({ email, password });
      completeLogin(response.data.accessToken, response.data.member);
      setSubmitError("");
      navigate("/posts", { replace: true });
    } catch {
      setSubmitError("아이디 또는 비밀번호를 확인해주세요");
    }
  }

  return (
    <section className="auth-panel" aria-labelledby="login-title">
      <h1 id="login-title">로그인</h1>
      <form className="stack-form" onSubmit={handleSubmit} noValidate>
        <label>
          이메일
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={!!errors.email}
          />
        </label>
        {errors.email && <p className="field-error">{errors.email}</p>}

        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={!!errors.password}
          />
        </label>
        {errors.password && <p className="field-error">{errors.password}</p>}
        {submitError && <p className="field-error">{submitError}</p>}

        <button type="submit" className="primary-button">
          로그인
        </button>
      </form>
      <p className="auth-link">
        계정이 없으면 <Link to="/signup">회원가입</Link>
      </p>
    </section>
  );
}
