package com.example.board.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.multipart.MultipartFile;

public record ProfileUpdateRequest(
        @NotBlank(message = "닉네임을 입력해주세요.")
        @Size(max = 10, message = "닉네임은 최대 10자까지 작성 가능합니다.")
        String nickname,
        MultipartFile profileImage
) {
}
