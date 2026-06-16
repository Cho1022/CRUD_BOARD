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

function member() {
  return { id: 1, email: "tester@example.com", nickname: "tester", profileImageUrl: "", role: "USER" };
}

function backendPost(overrides: Record<string, unknown> = {}) {
  return {
    id: 40,
    postType: "GENERAL",
    title: "기존 제목",
    content: "본문",
    authorNickname: "tester",
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

function pageResponse(totalPages = 2) {
  return {
    success: true,
    data: {
      content: [backendPost({ id: 1, title: "첫 글" })],
      page: 1,
      size: 10,
      totalElements: 11,
      totalPages
    },
    message: null,
    code: null
  };
}

function setLoggedIn() {
  window.localStorage.setItem("board_access_token", "access-token");
}

function authResponse() {
  return jsonResponse({ success: true, data: member(), message: null, code: null });
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("게시글", () => {
  it("비로그인 상태에서 게시글 작성 화면을 막는다", async () => {
    renderRoute("/posts/new");

    expect(screen.getByText("로그인이 필요합니다.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "로그인" })).toHaveLength(2);
  });

  it("제목을 26자까지만 입력하고 제한 메시지를 보여준다", async () => {
    setLoggedIn();
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes("/auth/me")) return Promise.resolve(authResponse());
      return Promise.resolve(jsonResponse({ success: true, data: backendPost(), message: null, code: null }));
    }));
    const user = userEvent.setup();
    renderRoute("/posts/new");

    const titleInput = await screen.findByLabelText("제목");
    await user.type(titleInput, "가나다라마바사아자차카타파하가나다라마바사아자차카타파하");

    expect(titleInput).toHaveValue("가나다라마바사아자차카타파하가나다라마바사아자차카타");
    expect(screen.getByText("제목은 26자까지 입력할 수 있습니다.")).toBeInTheDocument();
  });

  it("이미지 업로드 미리보기를 보여준다", async () => {
    setLoggedIn();
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes("/auth/me")) return Promise.resolve(authResponse());
      return Promise.resolve(jsonResponse({ success: true, data: backendPost(), message: null, code: null }));
    }));
    const user = userEvent.setup();
    renderRoute("/posts/new");

    const file = new File(["preview"], "preview.png", { type: "image/png" });
    await user.upload(await screen.findByLabelText("이미지 업로드"), file);

    await waitFor(() => {
      expect(screen.getByAltText("이미지 미리보기")).toBeInTheDocument();
    });
  });

  it("목록은 API 결과를 기준으로 페이지 번호를 이동한다", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(pageResponse())));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderRoute("/posts");

    await user.click(await screen.findByRole("button", { name: "2" }));

    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("현재 주소")).toHaveTextContent("/posts?page=2");
  });

  it("검색어와 필터를 유지한 채 페이지를 이동한다", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(pageResponse())));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderRoute("/posts");

    await user.selectOptions(await screen.findByLabelText("말머리"), "일반");
    await user.type(screen.getByLabelText("검색어"), "React");
    await user.click(screen.getByRole("button", { name: "검색" }));
    await user.click(await screen.findByRole("button", { name: "2" }));

    expect(screen.getByLabelText("말머리")).toHaveValue("일반");
    expect(screen.getByLabelText("검색어")).toHaveValue("React");
    expect(screen.getByLabelText("현재 주소")).toHaveTextContent(
      "/posts?q=React&category=%EC%9D%BC%EB%B0%98&page=2"
    );
  });

  it("추천 버튼을 토글한다", async () => {
    setLoggedIn();
    let liked = false;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path.includes("/auth/me")) return Promise.resolve(authResponse());
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
      return Promise.resolve(jsonResponse({ success: true, data: backendPost(), message: null, code: null }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderRoute("/posts/40");

    const likeButton = await screen.findByRole("button", { name: "추천 15" });
    await user.click(likeButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "추천 16" })).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("게시글 수정 후 상세 페이지로 이동한다", async () => {
    setLoggedIn();
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path.includes("/auth/me")) return Promise.resolve(authResponse());
      if (path.includes("/comments")) {
        return Promise.resolve(jsonResponse({ success: true, data: [], message: null, code: null }));
      }
      const title = init?.method === "PUT" ? "수정된 제목" : "기존 제목";
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
    const putCall = fetchMock.mock.calls.find((call) => call[1]?.method === "PUT");
    const body = putCall?.[1]?.body as FormData;
    expect(body.get("postType")).toBe("NOTICE");
    expect(body.get("isPublic")).toBe("false");
    expect(body.get("canonicalUrl")).toBe("/notice/40");
    expect(body.get("tags")).toBe("react");
  });

  it("게시글 삭제 후 목록으로 이동한다", async () => {
    setLoggedIn();
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path.includes("/auth/me")) return Promise.resolve(authResponse());
      if (path.includes("/comments")) {
        return Promise.resolve(jsonResponse({ success: true, data: [], message: null, code: null }));
      }
      if (init?.method === "DELETE") {
        return Promise.resolve(jsonResponse({ success: true, data: null, message: null, code: null }));
      }
      return Promise.resolve(jsonResponse({ success: true, data: backendPost(), message: null, code: null }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderRoute("/posts/40");

    await user.click(await screen.findByRole("button", { name: "삭제" }));

    await waitFor(() => expect(screen.getByLabelText("현재 주소")).toHaveTextContent("/posts"));
  });
});
