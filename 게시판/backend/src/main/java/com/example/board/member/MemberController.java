package com.example.board.member;

import com.example.board.common.ApiResponse;
import com.example.board.member.dto.MemberResponse;
import com.example.board.member.dto.PasswordUpdateRequest;
import com.example.board.member.dto.ProfileUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/members/me")
@RequiredArgsConstructor
public class MemberController {
    private final MemberService memberService;

    @PatchMapping("/profile")
    public ApiResponse<MemberResponse> profile(Authentication auth, @Valid @ModelAttribute ProfileUpdateRequest request) {
        return ApiResponse.success(memberService.updateProfile(auth.getName(), request));
    }

    @PatchMapping("/password")
    public ApiResponse<Void> password(Authentication auth, @Valid @RequestBody PasswordUpdateRequest request) {
        memberService.updatePassword(auth.getName(), request);
        return ApiResponse.success(null);
    }
}
