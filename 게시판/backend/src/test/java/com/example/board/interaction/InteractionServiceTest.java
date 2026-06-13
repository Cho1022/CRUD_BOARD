package com.example.board.interaction;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.board.auth.AuthService;
import com.example.board.auth.dto.SignupRequest;
import com.example.board.comment.CommentService;
import com.example.board.comment.dto.CommentCreateRequest;
import com.example.board.likes.PostLikeService;
import com.example.board.post.PostService;
import com.example.board.post.PostType;
import com.example.board.post.dto.PostCreateRequest;
import com.example.board.tag.TagSuggestionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class InteractionServiceTest {
    @Autowired
    AuthService authService;
    @Autowired
    PostService postService;
    @Autowired
    CommentService commentService;
    @Autowired
    PostLikeService postLikeService;
    @Autowired
    TagSuggestionService tagSuggestionService;

    @Test
    void commentLikeAndTagSuggestionWork() {
        var email = signup("writer@test.com", "writer");
        var post = postService.create(email, postRequest());

        var comment = commentService.create(email, post.id(), new CommentCreateRequest("댓글"));
        var liked = postLikeService.toggle(email, post.id());
        var unliked = postLikeService.toggle(email, post.id());
        var suggested = tagSuggestionService.suggest("Spring 게시판", "java spring spring");

        assertThat(commentService.list(post.id())).extracting("id").contains(comment.id());
        assertThat(liked.liked()).isTrue();
        assertThat(unliked.liked()).isFalse();
        assertThat(suggested.tags()).contains("spring");
    }

    private String signup(String email, String nickname) {
        authService.signup(new SignupRequest(email, "Password1!", "Password1!", nickname, image()));
        return email;
    }

    private PostCreateRequest postRequest() {
        return new PostCreateRequest("상호작용", "본문", PostType.GENERAL, "spring,java", null, true, null);
    }

    private MockMultipartFile image() {
        return new MockMultipartFile("profileImage", "profile.png", "image/png", "x".getBytes());
    }
}
