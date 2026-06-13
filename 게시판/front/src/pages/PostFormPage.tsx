import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPostById } from "../data/mockPosts";
import { api, apiErrorMessage, toPost } from "../lib/api";
import type { BackendPost, Post, PostType } from "../types";

const TITLE_LIMIT = 26;
type EditablePost = Pick<Post, "title" | "body" | "tags">;

export function PostFormPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [postType, setPostType] = useState<PostType>("GENERAL");
  const [isPublic, setIsPublic] = useState(true);
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (postId) void loadPost(postId);
    else fillPost({ title: "", body: "", tags: [] });
  }, [postId]);

  async function loadPost(id: string) {
    try {
      const response = await api.post(id);
      fillRemotePost(response.data);
    } catch {
      const fallback = getPostById(id);
      if (fallback) fillPost(fallback);
      else setError("게시글을 불러오지 못했습니다.");
    }
  }

  function fillPost(post: EditablePost) {
    setTitle(post.title.slice(0, TITLE_LIMIT));
    setBody(post.body);
    setTags(post.tags.join(", "));
    setPostType("GENERAL");
    setIsPublic(true);
    setCanonicalUrl("");
    setError("");
  }

  function fillRemotePost(post: BackendPost) {
    fillPost(toPost(post));
    setPostType(post.postType);
    setIsPublic(post.isPublic ?? true);
    setCanonicalUrl(post.canonicalUrl ?? "");
  }

  function handleTitleChange(value: string) {
    setTitle(value.slice(0, TITLE_LIMIT));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPreview(null);
      setImage(null);
      return;
    }

    setImage(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const savedPost = await savePost();
      navigate(`/posts/${savedPost.id}`);
    } catch (nextError) {
      setError(apiErrorMessage(nextError, "게시글 저장에 실패했습니다."));
    }
  }

  async function savePost() {
    const form = new FormData();
    form.set("title", title);
    form.set("content", body);
    form.set("postType", postType);
    form.set("tags", tags);
    form.set("isPublic", String(isPublic));
    if (canonicalUrl) form.set("canonicalUrl", canonicalUrl);
    if (image) form.set("image", image);
    const response = postId ? await api.updatePost(postId, form) : await api.createPost(form);
    return toPost(response.data);
  }

  async function suggestTags() {
    try {
      const response = await api.suggestTags(title, body);
      setSuggestions(response.data.tags);
    } catch {
      setSuggestions(localSuggestTags());
    }
  }

  function localSuggestTags() {
    return [title, body]
      .join(" ")
      .split(/[^가-힣a-zA-Z0-9]+/)
      .filter((word) => word.length >= 2)
      .slice(0, 5);
  }

  function addTag(tag: string) {
    const current = tags.split(",").map((item) => item.trim()).filter(Boolean);
    if (!current.includes(tag)) setTags([...current, tag].join(", "));
  }

  const limitReached = title.length >= TITLE_LIMIT;

  return (
    <section className="editor-panel" aria-labelledby="editor-title">
      <h1 id="editor-title">{postId ? "게시글 수정" : "새 글쓰기"}</h1>
      <form className="stack-form" onSubmit={handleSubmit}>
        <label>
          제목
          <input
            aria-label="제목"
            value={title}
            maxLength={TITLE_LIMIT}
            onChange={(event) => handleTitleChange(event.target.value)}
          />
        </label>
        <div className="form-row-note">
          <span>{title.length}/{TITLE_LIMIT}</span>
          {limitReached && (
            <span className="field-error">제목은 26자까지 입력할 수 있습니다.</span>
          )}
        </div>

        <label>
          내용
          <textarea
            aria-label="내용"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={10}
          />
        </label>

        <label>
          태그
          <input
            aria-label="태그"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="spring, react"
          />
        </label>
        <div className="tag-suggestion-row">
          <button type="button" className="secondary-link" onClick={suggestTags}>
            태그 추천
          </button>
          {suggestions.map((tag) => (
            <button type="button" className="tag-button" key={tag} onClick={() => addTag(tag)}>
              #{tag}
            </button>
          ))}
        </div>

        <label>
          이미지
          <input
            aria-label="이미지 업로드"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
        </label>
        {preview && (
          <div className="preview-box">
            <img src={preview} alt="이미지 미리보기" />
          </div>
        )}

        <button type="submit" className="primary-button">
          {postId ? "수정" : "등록"}
        </button>
        {error && <p className="field-error">{error}</p>}
      </form>
    </section>
  );
}
