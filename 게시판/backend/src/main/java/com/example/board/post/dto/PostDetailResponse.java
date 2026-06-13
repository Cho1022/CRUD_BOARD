package com.example.board.post.dto;

import com.example.board.post.Post;
import com.example.board.post.PostType;
import java.time.LocalDateTime;
import java.util.List;

public record PostDetailResponse(
        Long id,
        PostType postType,
        String title,
        String content,
        String authorNickname,
        String imageUrl,
        String canonicalUrl,
        boolean isPublic,
        List<String> tags,
        long commentCount,
        long likeCount,
        long viewCount,
        Long acceptedCommentId,
        LocalDateTime createdAt
) {
    public static PostDetailResponse of(Post post, List<String> tags, long commentCount, long likeCount) {
        return new PostDetailResponse(
                post.getId(), post.getPostType(), post.getTitle(), post.getContent(),
                post.getAuthor().getNickname(), post.getImageUrl(), post.getCanonicalUrl(),
                post.isPublic(), tags, commentCount, likeCount, post.getViewCount(),
                post.getAcceptedCommentId(), post.getCreatedAt()
        );
    }
}
