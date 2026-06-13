package com.example.board.auth.dto;

import com.example.board.member.dto.MemberResponse;

public record AuthResponse(String accessToken, MemberResponse member) {
}
