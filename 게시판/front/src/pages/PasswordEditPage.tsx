import { FormEvent, useState } from "react";
import { api, apiErrorMessage } from "../lib/api";

function validatePassword(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/.test(password);
}

export function PasswordEditPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) return fail(validationError);
    try {
      await api.updatePassword({ password: newPassword, passwordConfirm: confirmPassword });
      setError("");
      setMessage("비밀번호가 변경되었습니다.");
    } catch (nextError) {
      fail(apiErrorMessage(nextError, "비밀번호 변경에 실패했습니다."));
    }
  }

  function validate() {
    if (!newPassword) return "비밀번호를 입력해주세요";
    if (!validatePassword(newPassword)) return "비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.";
    if (!confirmPassword) return "비밀번호를 한번 더 입력해주세요";
    if (newPassword !== confirmPassword) return "비밀번호와 다릅니다.";
    return "";
  }

  function fail(nextError: string) {
    setMessage("");
    setError(nextError);
  }

  return (
    <section className="editor-panel" aria-labelledby="password-title">
      <h1 id="password-title">비밀번호 변경</h1>
      <form className="stack-form" onSubmit={handleSubmit}>
        <label>
          새 비밀번호
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>
        <label>
          새 비밀번호 확인
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>
        <button type="submit" className="primary-button">
          변경
        </button>
        {message && <p className="success-message">{message}</p>}
        {error && <p className="field-error">{error}</p>}
      </form>
    </section>
  );
}
