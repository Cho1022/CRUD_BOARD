package com.example.board.auth;

import com.example.board.member.Member;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    Optional<RefreshToken> findByMember(Member member);

    void deleteByMember(Member member);
}
