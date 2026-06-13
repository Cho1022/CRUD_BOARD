package com.example.board.comment;

import com.example.board.common.BaseEntity;
import com.example.board.member.Member;
import com.example.board.post.Post;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "comments")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Comment extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member author;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    @Column(nullable = false)
    private boolean accepted;

    public Comment(Post post, Member author, String content) {
        this.post = post;
        this.author = author;
        this.content = content;
    }

    public void accept() {
        accepted = true;
    }
}
