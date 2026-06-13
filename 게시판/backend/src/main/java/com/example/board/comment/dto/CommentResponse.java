package com.example.board.comment.dto;

import com.example.board.comment.Comment;
import java.time.LocalDateTime;

public record CommentResponse(Long id, String content, String authorNickname, boolean accepted, LocalDateTime createdAt) {
    public static CommentResponse from(Comment comment) {
        return new CommentResponse(
                comment.getId(),
                comment.getContent(),
                comment.getAuthor().getNickname(),
                comment.isAccepted(),
                comment.getCreatedAt()
        );
    }
}
