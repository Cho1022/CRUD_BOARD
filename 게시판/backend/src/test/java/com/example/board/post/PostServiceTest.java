package com.example.board.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.board.auth.AuthService;
import com.example.board.auth.dto.SignupRequest;
import com.example.board.common.BusinessException;
import com.example.board.post.dto.PostCreateRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PostServiceTest {
    @Autowired
    AuthService authService;
    @Autowired
    PostService postService;

    @Test
    void userCanCreateAndSearchGeneralPost() {
        var email = signup("user@test.com", "user");
        postService.create(email, request("Spring 게시판", PostType.GENERAL, "spring,java"));

        var page = postService.list("spring", null, null, 1, 10);

        assertThat(page.page()).isEqualTo(1);
        assertThat(page.content()).hasSize(1);
        assertThat(page.content().getFirst().tags()).contains("spring", "java");
    }

    @Test
    void userCannotCreateNoticeButAdminCan() {
        var admin = signup("admin@test.com", "admin");
        var user = signup("user@test.com", "user");

        assertThatThrownBy(() -> postService.create(user, request("공지", PostType.NOTICE, "")))
                .isInstanceOf(BusinessException.class);
        assertThat(postService.create(admin, request("공지", PostType.NOTICE, "")).postType())
                .isEqualTo(PostType.NOTICE);
    }

    @Test
    void tooLongTitleIsRejected() {
        var email = signup("writer@test.com", "writer");
        var title = "123456789012345678901234567";

        assertThatThrownBy(() -> postService.create(email, request(title, PostType.GENERAL, "")))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void deletedPostIsExcludedFromList() {
        var email = signup("delete@test.com", "delete");
        var post = postService.create(email, request("삭제 글", PostType.GENERAL, ""));

        postService.delete(email, post.id());

        assertThat(postService.list("삭제", null, null, 1, 10).content()).isEmpty();
    }

    private String signup(String email, String nickname) {
        authService.signup(new SignupRequest(email, "Password1!", "Password1!", nickname, image()));
        return email;
    }

    private PostCreateRequest request(String title, PostType type, String tags) {
        return new PostCreateRequest(title, "본문", type, tags, null, true, null);
    }

    private MockMultipartFile image() {
        return new MockMultipartFile("profileImage", "profile.png", "image/png", "x".getBytes());
    }
}
