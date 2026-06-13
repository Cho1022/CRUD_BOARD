package com.example.board.comment;

import com.example.board.comment.dto.CommentCreateRequest;
import com.example.board.comment.dto.CommentResponse;
import com.example.board.common.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentController {
    private final CommentService commentService;

    @PostMapping("/posts/{postId}/comments")
    public ApiResponse<CommentResponse> create(Authentication auth, @PathVariable Long postId, @Valid @RequestBody CommentCreateRequest request) {
        return ApiResponse.success(commentService.create(auth.getName(), postId, request));
    }

    @GetMapping("/posts/{postId}/comments")
    public ApiResponse<List<CommentResponse>> list(@PathVariable Long postId) {
        return ApiResponse.success(commentService.list(postId));
    }

    @DeleteMapping("/comments/{id}")
    public ApiResponse<Void> delete(Authentication auth, @PathVariable Long id) {
        commentService.delete(auth.getName(), id);
        return ApiResponse.success(null);
    }

    @PatchMapping("/comments/{id}/accept")
    public ApiResponse<CommentResponse> accept(Authentication auth, @PathVariable Long id) {
        return ApiResponse.success(commentService.accept(auth.getName(), id));
    }
}
