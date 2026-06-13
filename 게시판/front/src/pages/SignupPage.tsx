import { ChangeEvent, FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/authContext";
import { api, apiErrorMessage } from "../lib/api";

interface SignupErrors {
  nickname?: string;
  email?: string;
  password?: string;
  passwordConfirm?: string;
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/.test(password);
}

export function SignupPage() {
  const navigate = useNavigate();
  const { completeLogin } = useAuth();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [submitError, setSubmitError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: SignupErrors = {};
    if (!nickname.trim()) nextErrors.nickname = "닉네임을 입력해주세요.";
    else if (nickname.includes(" ")) nextErrors.nickname = "띄어쓰기를 없애주세요";
    else if (nickname.length > 10) nextErrors.nickname = "닉네임은 최대 10자까지 작성 가능합니다.";
    if (!email.trim()) {
      nextErrors.email = "이메일을 입력해주세요.";
    } else if (!validateEmail(email)) {
      nextErrors.email = "올바른 이메일 주소 형식을 입력해주세요. (예: example@example.com)";
    }
    if (!password) nextErrors.password = "비밀번호를 입력해주세요";
    else if (!validatePassword(password)) {
      nextErrors.password = "비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.";
    }
    if (!passwordConfirm) {
      nextErrors.passwordConfirm = "비밀번호를 한번더 입력해주세요";
    } else if (password !== passwordConfirm) {
      nextErrors.passwordConfirm = "비밀번호가 다릅니다.";
    }

    setErrors(nextErrors);
    setSubmitError("");
    if (!Object.keys(nextErrors).length) await signup();
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setProfileImage(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function signup() {
    const form = new FormData();
    form.set("email", email);
    form.set("password", password);
    form.set("passwordConfirm", passwordConfirm);
    form.set("nickname", nickname);
    if (profileImage) form.set("profileImage", profileImage);
    try {
      const response = await api.signup(form);
      completeLogin(response.data.accessToken, response.data.member);
      navigate("/posts", { replace: true });
    } catch (error) {
      setSubmitError(apiErrorMessage(error, "회원가입에 실패했습니다."));
    }
  }

  return (
    <section className="auth-panel" aria-labelledby="signup-title">
      <h1 id="signup-title">회원가입</h1>
      <form className="stack-form" onSubmit={handleSubmit} noValidate>
        <label>
          프로필 사진 선택
          <input aria-label="프로필 사진" type="file" accept="image/*" onChange={handleImage} />
        </label>
        {preview && <img className="avatar-preview" src={preview} alt="프로필 미리보기" />}

        <label>
          닉네임
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            aria-invalid={!!errors.nickname}
          />
        </label>
        {errors.nickname && <p className="field-error">{errors.nickname}</p>}

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

        <label>
          비밀번호 확인
          <input
            type="password"
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            aria-invalid={!!errors.passwordConfirm}
          />
        </label>
        {errors.passwordConfirm && (
          <p className="field-error">{errors.passwordConfirm}</p>
        )}

        <button type="submit" className="primary-button">
          회원가입
        </button>
        {submitError && <p className="field-error">{submitError}</p>}
      </form>
    </section>
  );
}
