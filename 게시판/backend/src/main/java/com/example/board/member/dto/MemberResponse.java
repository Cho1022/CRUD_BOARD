package com.example.board.member.dto;

import com.example.board.member.Member;
import com.example.board.member.MemberRole;

public record MemberResponse(Long id, String email, String nickname, String profileImageUrl, MemberRole role) {
    public static MemberResponse from(Member member) {
        return new MemberResponse(
                member.getId(),
                member.getEmail(),
                member.getNickname(),
                member.getProfileImageUrl(),
                member.getRole()
        );
    }
}
