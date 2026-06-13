import type { BoardCategory, Post, PostType } from "../types";

export const boardCategories: Array<"전체" | BoardCategory> = [
  "전체",
  "일반",
  "공지",
  "FAQ",
  "질문",
];

export const categoryType: Record<Exclude<(typeof boardCategories)[number], "전체">, PostType> = {
  일반: "GENERAL",
  공지: "NOTICE",
  FAQ: "FAQ",
  질문: "QUESTION"
};

export const typeCategory: Record<PostType, BoardCategory> = {
  GENERAL: "일반",
  NOTICE: "공지",
  FAQ: "FAQ",
  QUESTION: "질문"
};

const reactTalkPosts: Post[] = Array.from({ length: 14 }, (_, index) => ({
  id: 40 - index,
  title: `React 상태 유지 테스트 글 ${index + 1}`,
  author: index % 2 === 0 ? "ㅇㅇ" : "프론트러",
  category: "일반",
  createdAt: `06.${String(13 - Math.floor(index / 4)).padStart(2, "0")}`,
  views: 1400 - index * 31,
  likes: 15 + index,
  comments: index % 4,
  hasImage: index % 3 === 0,
  body: "검색어와 필터를 유지하면서 페이지를 이동하는 상황을 확인하기 위한 더미 글입니다.",
  tags: ["react", "vite"]
}));

const mixedPosts: Post[] = Array.from({ length: 18 }, (_, index) => {
  const categories: BoardCategory[] = ["공지", "질문", "FAQ", "일반"];
  const category = categories[index % categories.length];
  return {
    id: 26 - index,
    title:
      category === "공지"
        ? `Vite 설정 정리 ${index + 1}`
        : category === "질문"
          ? `로그인 API 연결 질문 ${index + 1}`
          : category === "FAQ"
            ? `게시판 UI 작업 후기 ${index + 1}`
            : `일반 잡담 글 ${index + 1}`,
    author: index % 3 === 0 ? "관리자" : "익명",
    category,
    createdAt: `06.${String(9 - Math.floor(index / 5)).padStart(2, "0")}`,
    views: 900 - index * 17,
    likes: 4 + index,
    comments: index % 6,
    hasImage: index % 5 === 0,
    body: "표 기반 게시판 화면을 채우기 위한 예시 데이터입니다.",
    tags: [category.toLowerCase(), "board"]
  };
});

export const mockPosts: Post[] = [...reactTalkPosts, ...mixedPosts];

export function getPostById(postId: string | undefined) {
  return mockPosts.find((post) => String(post.id) === postId);
}
