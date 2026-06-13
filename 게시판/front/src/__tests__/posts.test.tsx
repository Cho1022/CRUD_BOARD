import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../App";

function LocationState() {
  const location = useLocation();
  return <output aria-label="현재 주소">{location.pathname + location.search}</output>;
}

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <LocationState />
    </MemoryRouter>
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function backendPost(overrides: Record<string, unknown> = {}) {
  return {
    id: 40,
    postType: "GENERAL",
    title: "React 상태 관리는 어디까지 서버에 맡길까",
    content: "본문",
    authorNickname: "프론트러",
    imageUrl: null,
    tags: ["react"],
    commentCount: 0,
    likeCount: 15,
    viewCount: 880,
    canonicalUrl: "",
    isPublic: true,
    createdAt: "2026-06-13T10:00:00",
    ...overrides
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("게시글", () => {
  it("제목을 26자까지만 입력하고 제한 메시지를 보여준다", async () => {
    const user = userEvent.setup();
    renderRoute("/posts/new");

    const titleInput = screen.getByLabelText("제목");
    await user.type(titleInput, "가나다라마바사아자차카타파하가나다라마바사아자차카타파하");

    expect(titleInput).toHaveValue("가나다라마바사아자차카타파하가나다라마바사아자차카타");
    expect(screen.getByText("제목은 26자까지 입력할 수 있습니다.")).toBeInTheDocument();
  });

  it("이미지 업로드 미리보기를 보여준다", async () => {
    const user = userEvent.setup();
    renderRoute("/posts/new");

    const file = new File(["preview"], "preview.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("이미지 업로드"), file);

    await waitFor(() => {
      expect(screen.getByAltText("이미지 미리보기")).toBeInTheDocument();
    });
  });

  it("목록 페이지 번호를 이동한다", async () => {
    const user = userEvent.setup();
    renderRoute("/posts");

    await user.click(screen.getByRole("button", { name: "2" }));

    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByLabelText("현재 주소")).toHaveTextContent("/posts?page=2");
  });

  it("검색어와 필터를 유지한 채 페이지를 이동한다", async () => {
    const user = userEvent.setup();
    renderRoute("/posts");

    await user.selectOptions(screen.getByLabelText("말머리"), "일반");
    await user.type(screen.getByLabelText("검색어"), "React");
    await user.click(screen.getByRole("button", { name: "검색" }));
    await user.click(screen.getByRole("button", { name: "2" }));

    expect(screen.getByLabelText("말머리")).toHaveValue("일반");
    expect(screen.getByLabelText("검색어")).toHaveValue("React");
    expect(screen.getByLabelText("현재 주소")).toHaveTextContent(
      "/posts?q=React&category=%EC%9D%BC%EB%B0%98&page=2"
    );
  });

  it("추천 버튼을 토글한다", async () => {
    let liked = false;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path.includes("/likes")) {
        liked = !liked;
        return Promise.resolve(jsonResponse({
          success: true,
          data: { liked, likeCount: liked ? 16 : 15 },
          message: null,
          code: null
        }));
      }
      if (path.includes("/comments")) {
        return Promise.resolve(jsonResponse({ success: true, data: [], message: null, code: null }));
      }
      return Promise.resolve(jsonResponse({
        success: true,
        data: backendPost({ likeCount: 15 }),
        message: null,
        code: null
      }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderRoute("/posts/40");

    const likeButton = await screen.findByRole("button", { name: "추천 15" });
    await user.click(likeButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "추천 16" })).toHaveAttribute("aria-pressed", "true");
    });

    await user.click(screen.getByRole("button", { name: "추천 16" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "추천 15" })).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("게시글 수정 후 상세 페이지로 이동한다", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (String(input).includes("/comments")) {
        return Promise.resolve(jsonResponse({ success: true, data: [], message: null, code: null }));
      }
      const title = method === "PUT" ? "수정된 제목" : "기존 제목";
      return Promise.resolve(jsonResponse({
        success: true,
        data: backendPost({ title, postType: "NOTICE", isPublic: false, canonicalUrl: "/notice/40" }),
        message: null,
        code: null
      }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderRoute("/posts/40/edit");

    await waitFor(() => expect(screen.getByLabelText("제목")).toHaveValue("기존 제목"));
    await user.clear(screen.getByLabelText("제목"));
    await user.type(screen.getByLabelText("제목"), "수정된 제목");
    await user.click(screen.getByRole("button", { name: "수정" }));

    await waitFor(() => expect(screen.getByLabelText("현재 주소")).toHaveTextContent("/posts/40"));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/posts/40"), expect.objectContaining({ method: "PUT" }));
    const putCall = fetchMock.mock.calls.find((call) => call[1]?.method === "PUT");
    const body = putCall?.[1]?.body as FormData;
    expect(body.get("postType")).toBe("NOTICE");
    expect(body.get("isPublic")).toBe("false");
    expect(body.get("canonicalUrl")).toBe("/notice/40");
    expect(body.get("tags")).toBe("react");
  });

  it("게시글 삭제 후 목록으로 이동한다", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path.includes("/comments")) {
        return Promise.resolve(jsonResponse({ success: true, data: [], message: null, code: null }));
      }
      if (init?.method === "DELETE") {
        return Promise.resolve(jsonResponse({ success: true, data: null, message: null, code: null }));
      }
      return Promise.resolve(jsonResponse({
        success: true,
        data: backendPost(),
        message: null,
        code: null
      }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderRoute("/posts/40");

    await user.click(await screen.findByRole("button", { name: "삭제" }));

    await waitFor(() => expect(screen.getByLabelText("현재 주소")).toHaveTextContent("/posts"));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/posts/40"), expect.objectContaining({ method: "DELETE" }));
  });
});
