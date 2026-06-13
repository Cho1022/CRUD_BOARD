package com.example.board.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.web.multipart.MultipartFile;

public record SignupRequest(
        @NotBlank(message = "이메일을 입력해주세요.")
        @Email(message = "올바른 이메일 주소 형식을 입력해주세요. (예: example@example.com)")
        String email,
        @NotBlank(message = "비밀번호를 입력해주세요")
        @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,20}$",
                message = "비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.")
        String password,
        @NotBlank(message = "비밀번호를 한번더 입력해주세요")
        String passwordConfirm,
        @NotBlank(message = "닉네임을 입력해주세요.")
        @Size(max = 10, message = "닉네임은 최대 10자까지 작성 가능합니다.")
        String nickname,
        MultipartFile profileImage
) {
}
