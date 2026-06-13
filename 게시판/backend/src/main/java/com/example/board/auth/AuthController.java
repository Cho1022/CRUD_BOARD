package com.example.board.auth;

import com.example.board.auth.dto.AuthResponse;
import com.example.board.auth.dto.LoginRequest;
import com.example.board.auth.dto.SignupRequest;
import com.example.board.common.ApiResponse;
import com.example.board.member.dto.MemberResponse;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/signup")
    public ApiResponse<AuthResponse> signup(@Valid @ModelAttribute SignupRequest request, HttpServletResponse response) {
        return ApiResponse.success(writeCookie(authService.signup(request), response).response());
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        return ApiResponse.success(writeCookie(authService.login(request), response).response());
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthResponse> refresh(@CookieValue("refreshToken") String token, HttpServletResponse response) {
        return ApiResponse.success(writeCookie(authService.refresh(token), response).response());
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(Authentication authentication, HttpServletResponse response) {
        authService.logout(authentication.getName());
        response.addHeader(HttpHeaders.SET_COOKIE, expiredCookie().toString());
        return ApiResponse.success(null);
    }

    @GetMapping("/me")
    public ApiResponse<MemberResponse> me(Authentication authentication) {
        return ApiResponse.success(MemberResponse.from(authService.currentUser(authentication.getName())));
    }

    private AuthTokens writeCookie(AuthTokens tokens, HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(tokens.refreshToken()).toString());
        return tokens;
    }

    private ResponseCookie cookie(String token) {
        return ResponseCookie.from("refreshToken", token).httpOnly(true).path("/api/auth").sameSite("Lax").build();
    }

    private ResponseCookie expiredCookie() {
        return ResponseCookie.from("refreshToken", "").httpOnly(true).path("/api/auth").maxAge(0).build();
    }
}
