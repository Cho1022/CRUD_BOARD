package com.example.board.comment.dto;

import jakarta.validation.constraints.NotBlank;

public record CommentCreateRequest(@NotBlank(message = "댓글을 입력해주세요.") String content) {
}
