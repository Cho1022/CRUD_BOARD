import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, toPost } from "../lib/api";
import type { BackendPost } from "../types";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("apiFetch token refresh", () => {
  it("retries the original POST request with the refreshed access token", async () => {
    window.localStorage.setItem("board_access_token", "expired-token");

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);

      if (path === "/api/posts" && init?.headers instanceof Headers) {
        const authorization = init.headers.get("Authorization");
        if (authorization === "Bearer expired-token") {
          return Promise.resolve(jsonResponse({ message: "Unauthorized" }, 401));
        }
        if (authorization === "Bearer fresh-token") {
          return Promise.resolve(jsonResponse({
            success: true,
            data: { id: 1, title: "created" },
            message: null,
            code: null
          }));
        }
      }

      if (path === "/api/auth/refresh") {
        return Promise.resolve(jsonResponse({
          success: true,
          data: { accessToken: "fresh-token" },
          message: null,
          code: null
        }));
      }

      return Promise.resolve(jsonResponse({ message: "Unexpected request" }, 500));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiFetch<{ data: { title: string } }>("/posts", {
      method: "POST",
      body: { title: "created" }
    });

    expect(result.data.title).toBe("created");
    expect(window.localStorage.getItem("board_access_token")).toBe("fresh-token");
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const retryCall = fetchMock.mock.calls[2];
    const retryInit = retryCall[1];
    expect(retryCall[0]).toBe("/api/posts");
    expect(retryInit?.method).toBe("POST");
    expect(retryInit?.body).toBe(JSON.stringify({ title: "created" }));
    expect((retryInit?.headers as Headers).get("Authorization")).toBe("Bearer fresh-token");
  });
});

describe("toPost date display", () => {
  it("shows today's post time as HH:mm", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T12:00:00"));

    expect(toPost(backendPost({ createdAt: "2026-06-14T09:30:00" })).createdAt).toBe("09:30");
  });

  it("shows older post dates as YYYY-MM-DD", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00"));

    expect(toPost(backendPost({ createdAt: "2026-06-14T09:30:00" })).createdAt).toBe("2026-06-14");
  });
});

function backendPost(overrides: Partial<BackendPost> = {}): BackendPost {
  return {
    id: 1,
    postType: "GENERAL",
    title: "title",
    content: "content",
    authorNickname: "tester",
    tags: [],
    commentCount: 0,
    likeCount: 0,
    viewCount: 0,
    imageUrl: null,
    createdAt: "2026-06-14T09:30:00",
    ...overrides
  };
}
