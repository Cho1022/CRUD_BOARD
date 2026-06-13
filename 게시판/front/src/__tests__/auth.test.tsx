import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../App";

function LocationState() {
  const location = useLocation();
  return <output aria-label="현재 주소">{location.pathname}</output>;
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

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("인증 폼", () => {
  it("로그인 필수값 유효성 메시지를 보여준다", async () => {
    const user = userEvent.setup();
    renderRoute("/login");

    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(screen.getByText("이메일을 입력해주세요.")).toBeInTheDocument();
    expect(screen.getByText("비밀번호를 입력해주세요")).toBeInTheDocument();
  });

  it("로그인 이메일 형식 오류를 보여준다", async () => {
    const user = userEvent.setup();
    renderRoute("/login");

    await user.type(screen.getByLabelText("이메일"), "wrong-email");
    await user.type(screen.getByLabelText("비밀번호"), "Password1!");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(screen.getByText("올바른 이메일 주소 형식을 입력해주세요. (예: example@adapterz.kr)")).toBeInTheDocument();
  });

  it("회원가입 유효성 메시지를 보여준다", async () => {
    const user = userEvent.setup();
    renderRoute("/signup");

    await user.click(screen.getByRole("button", { name: "회원가입" }));

    expect(screen.getByText("닉네임을 입력해주세요.")).toBeInTheDocument();
    expect(screen.getByText("이메일을 입력해주세요.")).toBeInTheDocument();
    expect(screen.getByText("비밀번호를 입력해주세요")).toBeInTheDocument();
    expect(screen.getByText("비밀번호를 한번더 입력해주세요")).toBeInTheDocument();
  });

  it("프로필 사진 없이 회원가입을 요청한다", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({
      success: true,
      data: { accessToken: "access-token" },
      message: null,
      code: null
    })));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderRoute("/signup");

    await user.type(screen.getByLabelText("닉네임"), "tester");
    await user.type(screen.getByLabelText("이메일"), "tester@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "Password1!");
    await user.type(screen.getByLabelText("비밀번호 확인"), "Password1!");
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    await waitFor(() => expect(screen.getByLabelText("현재 주소")).toHaveTextContent("/posts"));
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.has("profileImage")).toBe(false);
    expect(window.localStorage.getItem("board_access_token")).toBe("access-token");
  });

  it("로그인 토큰이 있으면 프로필과 로그아웃 버튼을 보여준다", async () => {
    window.localStorage.setItem("board_access_token", "access-token");
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path.includes("/auth/me")) {
        return Promise.resolve(jsonResponse({
          success: true,
          data: { id: 1, email: "tester@example.com", nickname: "tester", profileImageUrl: "", role: "USER" },
          message: null,
          code: null
        }));
      }
      if (path.includes("/auth/logout")) {
        return Promise.resolve(jsonResponse({ success: true, data: null, message: null, code: null }));
      }
      return Promise.resolve(jsonResponse({
        success: true,
        data: { content: [], page: 1, size: 10, totalElements: 0, totalPages: 1 },
        message: null,
        code: null
      }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderRoute("/posts");

    expect(await screen.findByText("tester")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "로그아웃" }));

    await waitFor(() => expect(window.localStorage.getItem("board_access_token")).toBeNull());
    expect(screen.getByText("로그인")).toBeInTheDocument();
  });
});
