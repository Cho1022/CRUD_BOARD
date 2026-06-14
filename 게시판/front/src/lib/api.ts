import type { ApiResponse, AuthData, BackendPost, CommentItem, LikeResult, Member, PageResponse, Post } from "../types";
import { typeCategory } from "../data/mockPosts";

type JsonObject = Record<string, unknown>;

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const API_BASE = import.meta.env.DEV
  ? "/api"
  : import.meta.env.VITE_API_BASE_URL || "/api";

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | JsonObject | null;
};

function isJsonBody(body: ApiOptions["body"]): body is JsonObject {
  return (
    !!body &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob)
  );
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  let body: BodyInit | null | undefined = options.body as BodyInit | null | undefined;
  const token = window.localStorage.getItem("board_access_token");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  if (isJsonBody(options.body)) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  let response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body,
    credentials: "include"
  });

  if (response.status === 401 && path !== "/auth/refresh") {
    response = await retryAfterRefresh(path, { ...options, headers, body });
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : `API 요청에 실패했습니다. (${response.status})`;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

async function retryAfterRefresh(path: string, options: RequestInit) {
  const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include"
  });

  if (!refreshed.ok) {
    window.localStorage.removeItem("board_access_token");
    return refreshed;
  }

  const payload = await refreshed.json() as ApiResponse<{ accessToken: string }>;
  const accessToken = payload.data?.accessToken;
  if (!accessToken) {
    window.localStorage.removeItem("board_access_token");
    return new Response(JSON.stringify(payload), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  window.localStorage.setItem("board_access_token", accessToken);
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
}

export function toPost(post: BackendPost): Post {
  return {
    id: post.id,
    title: post.title,
    author: post.authorNickname,
    category: typeCategory[post.postType],
    createdAt: post.createdAt.replace("T", " ").slice(0, 19),
    views: post.viewCount,
    likes: post.likeCount,
    comments: post.commentCount,
    hasImage: !!post.imageUrl,
    body: post.content ?? "",
    tags: post.tags,
    imageUrl: post.imageUrl
  };
}

export const api = {
  login: (body: JsonObject) => apiFetch<ApiResponse<AuthData>>("/auth/login", { method: "POST", body }),
  signup: (body: BodyInit) => apiFetch<ApiResponse<AuthData>>("/auth/signup", { method: "POST", body }),
  me: () => apiFetch<ApiResponse<Member>>("/auth/me", { method: "GET" }),
  logout: () => apiFetch<ApiResponse<void>>("/auth/logout", { method: "POST" }),
  posts: (query = "") => apiFetch<ApiResponse<PageResponse<BackendPost>>>(`/posts${query}`, { method: "GET" }),
  post: (postId: string | number) => apiFetch<ApiResponse<BackendPost>>(`/posts/${postId}`, { method: "GET" }),
  createPost: (body: BodyInit | JsonObject) =>
    apiFetch<ApiResponse<BackendPost>>("/posts", { method: "POST", body }),
  updatePost: (postId: string | number, body: BodyInit | JsonObject) =>
    apiFetch<ApiResponse<BackendPost>>(`/posts/${postId}`, { method: "PUT", body }),
  deletePost: (postId: string | number) =>
    apiFetch<ApiResponse<void>>(`/posts/${postId}`, { method: "DELETE" }),
  toggleLike: (postId: string | number) =>
    apiFetch<ApiResponse<LikeResult>>(`/posts/${postId}/likes`, { method: "POST" }),
  comments: (postId: string | number) =>
    apiFetch<ApiResponse<CommentItem[]>>(`/posts/${postId}/comments`, { method: "GET" }),
  createComment: (postId: string | number, content: string) =>
    apiFetch<ApiResponse<CommentItem>>(`/posts/${postId}/comments`, { method: "POST", body: { content } }),
  suggestTags: (title: string, content: string) =>
    apiFetch<ApiResponse<{ tags: string[] }>>("/tags/suggest", { method: "POST", body: { title, content } }),
  updateProfile: (body: BodyInit) => apiFetch<ApiResponse<Member>>("/members/me/profile", { method: "PATCH", body }),
  updatePassword: (body: JsonObject) => apiFetch("/members/me/password", { method: "PATCH", body })
};

export function apiErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}
