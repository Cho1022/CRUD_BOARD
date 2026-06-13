package com.example.board.post.dto;

import com.example.board.post.PostType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.multipart.MultipartFile;

public record PostUpdateRequest(
        @NotBlank(message = "제목을 입력해주세요.")
        @Size(max = 26, message = "제목은 최대 26자까지 작성 가능합니다.")
        String title,
        @NotBlank(message = "본문을 입력해주세요.")
        String content,
        PostType postType,
        String tags,
        String canonicalUrl,
        Boolean isPublic,
        MultipartFile image
) {
}
