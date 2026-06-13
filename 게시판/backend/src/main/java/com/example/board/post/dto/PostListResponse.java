package com.example.board.post.dto;

import com.example.board.post.Post;
import com.example.board.post.PostType;
import java.time.LocalDateTime;
import java.util.List;

public record PostListResponse(
        Long id,
        PostType postType,
        String title,
        String authorNickname,
        List<String> tags,
        long commentCount,
        long likeCount,
        long viewCount,
        LocalDateTime createdAt
) {
    public static PostListResponse of(Post post, List<String> tags, long commentCount, long likeCount) {
        return new PostListResponse(
                post.getId(),
                post.getPostType(),
                post.getTitle(),
                post.getAuthor().getNickname(),
                tags,
                commentCount,
                likeCount,
                post.getViewCount(),
                post.getCreatedAt()
        );
    }
}
