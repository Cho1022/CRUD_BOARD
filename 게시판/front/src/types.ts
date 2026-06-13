export type BoardCategory = "일반" | "공지" | "FAQ" | "질문";
export type PostType = "GENERAL" | "NOTICE" | "FAQ" | "QUESTION";

export interface Post {
  id: number;
  title: string;
  author: string;
  category: BoardCategory;
  createdAt: string;
  views: number;
  likes: number;
  comments: number;
  hasImage: boolean;
  body: string;
  tags: string[];
  imageUrl?: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload extends LoginPayload {
  nickname: string;
}

export interface Member {
  id: number;
  email: string;
  nickname: string;
  profileImageUrl?: string | null;
  role: "ADMIN" | "USER";
}

export interface AuthData {
  accessToken: string;
  member?: Member;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  code: string | null;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface BackendPost {
  id: number;
  postType: PostType;
  title: string;
  content?: string;
  authorNickname: string;
  tags: string[];
  commentCount: number;
  likeCount: number;
  viewCount: number;
  imageUrl?: string | null;
  canonicalUrl?: string | null;
  isPublic?: boolean;
  createdAt: string;
}

export interface CommentItem {
  id: number;
  content: string;
  authorNickname: string;
  accepted: boolean;
  createdAt: string;
}

export interface LikeResult {
  liked: boolean;
  likeCount: number;
}
