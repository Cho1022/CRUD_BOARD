import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, toPost } from "../lib/api";
import { formatCount } from "../lib/format";
import { boardCategories, categoryType } from "../lib/postCategory";
import type { BoardCategory, Post } from "../types";

const PAGE_SIZE = 10;

function normalizePage(value: string | null, maxPage: number) {
  const page = Number(value ?? "1");
  if (!Number.isInteger(page) || page < 1) return 1;
  return Math.min(page, maxPage);
}

export function PostsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const categoryParam = searchParams.get("category") ?? "전체";
  const [query, setQuery] = useState(queryParam);
  const [category, setCategory] = useState(categoryParam);
  const [posts, setPosts] = useState<Post[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setQuery(queryParam);
    setCategory(categoryParam);
  }, [queryParam, categoryParam]);

  useEffect(() => {
    void loadPosts();
  }, [searchParams]);

  async function loadPosts() {
    setLoading(true);
    try {
      const response = await api.posts(apiQuery());
      setPosts(response.data.content.map(toPost));
      setTotalCount(response.data.totalElements);
      setTotalPages(Math.max(1, response.data.totalPages));
      setError("");
    } catch {
      setPosts([]);
      setTotalCount(0);
      setTotalPages(1);
      setError("게시글을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function buildParams(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    if (!next.get("q")?.trim()) next.delete("q");
    if ((next.get("category") ?? "전체") === "전체") next.delete("category");
    next.set("page", String(nextPage));
    return next;
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (category !== "전체") next.set("category", category);
    next.set("page", "1");
    setSearchParams(next);
  }

  function movePage(page: number) {
    setSearchParams(buildParams(page));
  }

  function apiQuery() {
    const params = new URLSearchParams();
    if (queryParam.trim()) params.set("keyword", queryParam.trim());
    if (isBoardCategory(categoryParam)) params.set("type", categoryType[categoryParam]);
    params.set("page", searchParams.get("page") ?? "1");
    params.set("size", String(PAGE_SIZE));
    return `?${params.toString()}`;
  }

  const currentPage = normalizePage(searchParams.get("page"), totalPages);

  return (
    <section className="board-section" aria-labelledby="posts-title">
      <div className="board-head">
        <div>
          <h1 id="posts-title">전체 게시글</h1>
          <p>{totalCount}개의 글</p>
        </div>
        <Link to="/posts/new" className="write-button">글쓰기</Link>
      </div>

      <form className="board-search" onSubmit={handleSearch}>
        <select aria-label="말머리" value={category} onChange={(event) => setCategory(event.target.value)}>
          {boardCategories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input
          aria-label="검색어"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="검색어"
        />
        <button type="submit">검색</button>
      </form>

      {error && <p className="field-error board-message">{error}</p>}
      {loading ? <p className="muted board-message">게시글을 불러오는 중입니다.</p> : <PostTable posts={posts} />}

      <nav className="pagination" aria-label="페이지 이동">
        <button type="button" onClick={() => movePage(Math.max(1, currentPage - 1))}>이전</button>
        {Array.from({ length: totalPages }, (_, index) => pageButton(index + 1, currentPage, movePage))}
        <button type="button" onClick={() => movePage(Math.min(totalPages, currentPage + 1))}>다음</button>
      </nav>
    </section>
  );
}

function PostTable({ posts }: { posts: Post[] }) {
  if (!posts.length) return <p className="muted board-message">게시글이 없습니다.</p>;
  return (
    <div className="board-table-wrap">
      <table className="board-table">
        <thead>
          <tr>
            <th scope="col" className="col-id">번호</th>
            <th scope="col">제목</th>
            <th scope="col" className="col-author">글쓴이</th>
            <th scope="col" className="col-date">날짜</th>
            <th scope="col" className="col-num">조회</th>
            <th scope="col" className="col-num">추천</th>
          </tr>
        </thead>
        <tbody>{posts.map((post) => <PostRow post={post} key={post.id} />)}</tbody>
      </table>
    </div>
  );
}

function PostRow({ post }: { post: Post }) {
  return (
    <tr>
      <td className="muted center">{post.id}</td>
      <td className="title-cell">
        <span className="category-tag">[{post.category}]</span>
        <Link to={`/posts/${post.id}`}>{post.title}</Link>
        {post.comments > 0 && <span className="comment-count">[{post.comments}]</span>}
        {post.hasImage && <span className="image-mark">img</span>}
        {post.tags.map((tag) => <span className="tag-chip" key={tag}>#{tag}</span>)}
      </td>
      <td>{post.author}</td>
      <td className="center">{post.createdAt}</td>
      <td className="center">{formatCount(post.views)}</td>
      <td className="center">{formatCount(post.likes)}</td>
    </tr>
  );
}

function pageButton(page: number, currentPage: number, movePage: (page: number) => void) {
  return (
    <button
      type="button"
      key={page}
      className={page === currentPage ? "active" : ""}
      aria-current={page === currentPage ? "page" : undefined}
      onClick={() => movePage(page)}
    >
      {page}
    </button>
  );
}

function isBoardCategory(value: string): value is BoardCategory {
  return value in categoryType;
}
