package com.example.board.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PasswordUpdateRequest(
        @NotBlank(message = "비밀번호를 입력해주세요")
        @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,20}$",
                message = "비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.")
        String password,
        @NotBlank(message = "비밀번호를 한번 더 입력해주세요")
        String passwordConfirm
) {
}
