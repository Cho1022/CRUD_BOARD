package com.example.board.auth;

import com.example.board.common.BaseEntity;
import com.example.board.member.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "refresh_tokens")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshToken extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;
    @Column(nullable = false, unique = true, length = 128)
    private String tokenHash;
    @Column(nullable = false)
    private LocalDateTime expiresAt;

    public RefreshToken(Member member, String tokenHash, LocalDateTime expiresAt) {
        this.member = member;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }

    public void rotate(String tokenHash, LocalDateTime expiresAt) {
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }

    public boolean expired() {
        return expiresAt.isBefore(LocalDateTime.now());
    }
}
