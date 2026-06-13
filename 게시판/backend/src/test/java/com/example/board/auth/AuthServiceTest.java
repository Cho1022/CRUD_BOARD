package com.example.board.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.board.auth.dto.LoginRequest;
import com.example.board.auth.dto.SignupRequest;
import com.example.board.common.BusinessException;
import com.example.board.member.MemberRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class AuthServiceTest {
    @Autowired
    AuthService authService;

    @Test
    void firstMemberIsAdminAndNextMemberIsUser() {
        var admin = authService.signup(signup("admin@test.com", "admin"));
        var user = authService.signup(signup("user@test.com", "user"));

        assertThat(admin.response().member().role()).isEqualTo(MemberRole.ADMIN);
        assertThat(user.response().member().role()).isEqualTo(MemberRole.USER);
    }

    @Test
    void duplicateEmailIsRejected() {
        authService.signup(signup("same@test.com", "same1"));

        assertThatThrownBy(() -> authService.signup(signup("same@test.com", "same2")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("중복된 이메일 입니다.");
    }

    @Test
    void loginFailureUsesRequiredMessage() {
        authService.signup(signup("login@test.com", "login"));

        assertThatThrownBy(() -> authService.login(new LoginRequest("login@test.com", "Wrong123!")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("아이디 또는 비밀번호를 확인해주세요");
    }

    @Test
    void signupAllowsEmptyProfileImage() {
        var issued = authService.signup(new SignupRequest("empty@test.com", "Password1!", "Password1!", "empty", null));

        assertThat(issued.response().member().profileImageUrl()).isEmpty();
    }

    @Test
    void refreshTokenCanBeRotated() {
        var issued = authService.signup(signup("refresh@test.com", "refresh"));
        var rotated = authService.refresh(issued.refreshToken());

        assertThat(rotated.response().accessToken()).isNotBlank();
        assertThat(rotated.refreshToken()).isNotEqualTo(issued.refreshToken());
    }

    private SignupRequest signup(String email, String nickname) {
        return new SignupRequest(email, "Password1!", "Password1!", nickname, image());
    }

    private MockMultipartFile image() {
        return new MockMultipartFile("profileImage", "profile.png", "image/png", "x".getBytes());
    }
}
