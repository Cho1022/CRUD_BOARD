import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, apiErrorMessage, toPost } from "../lib/api";
import { formatCount } from "../lib/format";
import type { CommentItem, Post } from "../types";

export function PostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | undefined>();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [comment, setComment] = useState("");
  const [likePending, setLikePending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    void loadPost();
  }, [postId]);

  async function loadPost() {
    if (!postId) return;
    try {
      const response = await api.post(postId);
      const nextPost = toPost(response.data);
      setPost(nextPost);
      setLikeCount(nextPost.likes);
    } catch {
      setPost(undefined);
      setLikeCount(0);
    }
    await loadComments(postId);
  }

  async function loadComments(id: string) {
    try {
      const response = await api.comments(id);
      setComments(Array.isArray(response.data) ? response.data : []);
    } catch {
      setComments([]);
    }
  }

  if (!post) {
    return (
      <section className="article-panel">
        <h1>게시글을 찾을 수 없습니다</h1>
        <Link to="/posts">목록으로</Link>
      </section>
    );
  }

  async function handleLike() {
    if (!post || likePending) return;
    setLikePending(true);
    setActionError("");
    try {
      const response = await api.toggleLike(post.id);
      setLiked(response.data.liked);
      setLikeCount(response.data.likeCount);
    } catch (error) {
      setActionError(apiErrorMessage(error, "추천 처리에 실패했습니다."));
    } finally {
      setLikePending(false);
    }
  }

  async function submitComment() {
    if (!post || !comment.trim()) return;
    try {
      const response = await api.createComment(post.id, comment);
      setComments((current) => [...current, response.data]);
      setComment("");
      setCommentError("");
    } catch (error) {
      setCommentError(apiErrorMessage(error, "댓글 등록에 실패했습니다."));
    }
  }

  async function deletePost() {
    if (!post) return;
    setActionError("");
    try {
      await api.deletePost(post.id);
      navigate("/posts");
    } catch (error) {
      setActionError(apiErrorMessage(error, "게시글 삭제에 실패했습니다."));
    }
  }

  return (
    <article className="article-panel">
      <header className="article-header">
        <div className="article-title-row">
          <span className="category-tag">[{post.category}]</span>
          <h1>{post.title}</h1>
        </div>
        <dl className="article-meta">
          <div>
            <dt>글쓴이</dt>
            <dd>{post.author}</dd>
          </div>
          <div>
            <dt>날짜</dt>
            <dd>{post.createdAt}</dd>
          </div>
          <div>
            <dt>조회</dt>
            <dd>{post.views}</dd>
          </div>
        </dl>
      </header>

      <p className="article-body">{post.body}</p>
      {post.imageUrl && <img className="article-image" src={post.imageUrl} alt="게시글 이미지" />}

      <div className="article-actions">
        <button
          type="button"
          className={liked ? "like-button selected" : "like-button"}
          aria-pressed={liked}
          onClick={handleLike}
          disabled={likePending}
        >
          추천 {formatCount(likeCount)}
        </button>
        <Link to={`/posts/${post.id}/edit`} className="secondary-link">
          수정
        </Link>
        <button type="button" className="secondary-link" onClick={deletePost}>
          삭제
        </button>
        <Link to="/posts" className="secondary-link">
          목록
        </Link>
      </div>
      {actionError && <p className="field-error">{actionError}</p>}

      <section className="comment-panel" aria-label="댓글">
        <h2>댓글 {comments.length}</h2>
        <div className="comment-form">
          <textarea
            aria-label="댓글 입력"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
          />
          <button type="button" className="primary-button" onClick={submitComment}>
            등록
          </button>
        </div>
        {commentError && <p className="field-error">{commentError}</p>}
        {comments.map((item) => (
          <div className="comment-item" key={item.id}>
            <strong>{item.authorNickname}</strong>
            <p>{item.content}</p>
          </div>
        ))}
      </section>
    </article>
  );
}
