package com.example.board.member;

import com.example.board.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "members")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String email;
    @Column(nullable = false)
    private String passwordHash;
    @Column(nullable = false, unique = true, length = 10)
    private String nickname;
    @Column(nullable = false)
    private String profileImageUrl;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MemberRole role;

    public Member(String email, String passwordHash, String nickname, String profileImageUrl, MemberRole role) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.nickname = nickname;
        this.profileImageUrl = profileImageUrl;
        this.role = role;
    }

    public boolean isAdmin() {
        return role == MemberRole.ADMIN;
    }

    public void updateProfile(String nickname, String profileImageUrl) {
        this.nickname = nickname;
        this.profileImageUrl = profileImageUrl;
    }

    public void changePassword(String passwordHash) {
        this.passwordHash = passwordHash;
    }
}
