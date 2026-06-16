import type { BoardCategory, PostType } from "../types";

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
