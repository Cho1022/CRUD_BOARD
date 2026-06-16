package com.example.board.auth;

import com.example.board.auth.dto.AuthResponse;
import com.example.board.auth.dto.LoginRequest;
import com.example.board.auth.dto.SignupRequest;
import com.example.board.common.BusinessException;
import com.example.board.common.ErrorCode;
import com.example.board.file.FileStorage;
import com.example.board.file.FileValidator;
import com.example.board.member.Member;
import com.example.board.member.MemberRepository;
import com.example.board.member.MemberRole;
import com.example.board.member.dto.MemberResponse;
import com.example.board.security.JwtService;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import lombok.RequiredArgsConstructor;
import lombok.val;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final String DEFAULT_PROFILE_IMAGE_URL = "";
    private static final String SYSTEM_AUTHOR_EMAIL = "system@board.local";
    private final MemberRepository memberRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TokenHasher tokenHasher;
    private final FileStorage fileStorage;
    private final FileValidator fileValidator;
    private final SecureRandom random = new SecureRandom();
    @Value("${app.jwt.refresh-token-days}")
    private long refreshDays;

    @Transactional
    public AuthTokens signup(SignupRequest request) {
        validateSignup(request);
        fileValidator.optionalImage(request.profileImage());
        val role = memberRepository.countByEmailNot(SYSTEM_AUTHOR_EMAIL) == 0 ? MemberRole.ADMIN : MemberRole.USER;
        val imageUrl = profileImageUrl(request);
        val member = new Member(email(request.email()), hash(request.password()), request.nickname(), imageUrl, role);
        memberRepository.save(member);
        return issue(member);
    }

    @Transactional
    public AuthTokens login(LoginRequest request) {
        val member = memberRepository.findByEmail(email(request.email()))
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS));
        if (!passwordEncoder.matches(request.password(), member.getPasswordHash())) throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        return issue(member);
    }

    @Transactional
    public AuthTokens refresh(String refreshToken) {
        val token = refreshTokenRepository.findByTokenHash(tokenHasher.hash(refreshToken))
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        if (token.expired()) throw new BusinessException(ErrorCode.UNAUTHORIZED);
        return issue(token.getMember());
    }

    @Transactional
    public void logout(String email) {
        refreshTokenRepository.deleteByMember(currentUser(email));
    }

    @Transactional(readOnly = true)
    public Member currentUser(String email) {
        return memberRepository.findByEmail(email).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }

    private void validateSignup(SignupRequest request) {
        if (!request.password().equals(request.passwordConfirm())) throw new BusinessException(ErrorCode.INVALID_INPUT, "비밀번호가 다릅니다.");
        if (request.nickname().contains(" ")) throw new BusinessException(ErrorCode.INVALID_INPUT, "띄어쓰기를 없애주세요");
        if (memberRepository.existsByEmail(email(request.email()))) throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        if (memberRepository.existsByNickname(request.nickname())) throw new BusinessException(ErrorCode.DUPLICATE_NICKNAME);
    }

    private String profileImageUrl(SignupRequest request) {
        val image = request.profileImage();
        if (image == null || image.isEmpty()) return DEFAULT_PROFILE_IMAGE_URL;
        return fileStorage.store(image, "profiles").url();
    }

    private AuthTokens issue(Member member) {
        val refreshToken = randomToken();
        val tokenHash = tokenHasher.hash(refreshToken);
        refreshTokenRepository.findByMember(member).ifPresentOrElse(
                token -> token.rotate(tokenHash, expiresAt()),
                () -> refreshTokenRepository.save(new RefreshToken(member, tokenHash, expiresAt()))
        );
        val response = new AuthResponse(jwtService.create(member), MemberResponse.from(member));
        return new AuthTokens(response, refreshToken);
    }

    private String randomToken() {
        var bytes = new byte[48];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String email(String email) {
        return email.trim().toLowerCase();
    }

    private String hash(String password) {
        return passwordEncoder.encode(password);
    }

    private LocalDateTime expiresAt() {
        return LocalDateTime.now().plusDays(refreshDays);
    }
}
