package com.example.board.likes;

import com.example.board.common.ApiResponse;
import com.example.board.likes.dto.LikeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/posts/{postId}/likes")
@RequiredArgsConstructor
public class PostLikeController {
    private final PostLikeService postLikeService;

    @PostMapping
    public ApiResponse<LikeResponse> toggle(Authentication auth, @PathVariable Long postId) {
        return ApiResponse.success(postLikeService.toggle(auth.getName(), postId));
    }
}
