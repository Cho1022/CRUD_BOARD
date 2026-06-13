import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useAuth } from "../lib/authContext";
import { api, apiErrorMessage } from "../lib/api";

export function ProfileEditPage() {
  const { user, refreshMe } = useAuth();
  const [nickname, setNickname] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNickname(user?.nickname ?? "");
    setPreview(user?.profileImageUrl ?? null);
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateNickname()) return;
    try {
      await api.updateProfile(formData());
      await refreshMe();
      setError("");
      setSaved(true);
    } catch (nextError) {
      setSaved(false);
      setError(apiErrorMessage(nextError, "프로필 저장에 실패했습니다."));
    }
  }

  function formData() {
    const form = new FormData();
    form.set("nickname", nickname);
    if (profileImage) form.set("profileImage", profileImage);
    return form;
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setProfileImage(file);
    setPreview(file ? URL.createObjectURL(file) : user?.profileImageUrl ?? null);
  }

  function validateNickname() {
    if (!nickname.trim()) return fail("닉네임을 입력해주세요.");
    if (nickname.length > 10) return fail("닉네임은 최대 10자까지 작성 가능합니다.");
    setError("");
    return true;
  }

  function fail(message: string) {
    setSaved(false);
    setError(message);
    return false;
  }

  return (
    <section className="editor-panel" aria-labelledby="profile-title">
      <h1 id="profile-title">프로필 수정</h1>
      <form className="stack-form" onSubmit={handleSubmit}>
        {preview && <img className="avatar-preview" src={preview} alt="프로필 사진" />}
        <label>
          닉네임
          <input value={nickname} onChange={(event) => setNickname(event.target.value)} />
        </label>
        {error && <p className="field-error">{error}</p>}
        <label>
          프로필 사진
          <input type="file" accept="image/*" onChange={handleImage} />
        </label>
        <button type="submit" className="primary-button">
          저장
        </button>
        {saved && <p className="success-message">프로필이 저장되었습니다.</p>}
      </form>
    </section>
  );
}
