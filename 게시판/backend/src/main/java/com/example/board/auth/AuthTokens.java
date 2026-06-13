package com.example.board.auth;

import com.example.board.auth.dto.AuthResponse;

public record AuthTokens(AuthResponse response, String refreshToken) {
}
