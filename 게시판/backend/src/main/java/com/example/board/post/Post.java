package com.example.board.post;

import com.example.board.common.BaseEntity;
import com.example.board.member.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "posts")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Post extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member author;
    @Column(nullable = false, length = 26)
    private String title;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostType postType;
    private String imageUrl;
    private String canonicalUrl;
    @Column(nullable = false)
    private boolean isPublic;
    private LocalDateTime publishedAt;
    @Column(nullable = false)
    private long viewCount;
    private Long acceptedCommentId;

    public Post(Member author, String title, String content, PostType postType, String imageUrl, String canonicalUrl, boolean isPublic) {
        this.author = author;
        this.title = title;
        this.content = content;
        this.postType = postType;
        this.imageUrl = imageUrl;
        this.canonicalUrl = canonicalUrl;
        this.isPublic = isPublic;
        this.publishedAt = LocalDateTime.now();
    }

    public void update(String title, String content, PostType postType, String imageUrl, String canonicalUrl, boolean isPublic) {
        this.title = title;
        this.content = content;
        this.postType = postType;
        this.imageUrl = imageUrl;
        this.canonicalUrl = canonicalUrl;
        this.isPublic = isPublic;
    }

    public void increaseView() {
        viewCount++;
    }

    public void acceptComment(Long commentId) {
        this.acceptedCommentId = commentId;
    }
}
