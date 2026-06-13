package com.example.board.post;

import com.example.board.common.ApiResponse;
import com.example.board.common.PageResponse;
import com.example.board.post.dto.PostCreateRequest;
import com.example.board.post.dto.PostDetailResponse;
import com.example.board.post.dto.PostListResponse;
import com.example.board.post.dto.PostUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {
    private final PostService postService;

    @PostMapping
    public ApiResponse<PostDetailResponse> create(Authentication auth, @Valid @ModelAttribute PostCreateRequest request) {
        return ApiResponse.success(postService.create(auth.getName(), request));
    }

    @GetMapping("/{id}")
    public ApiResponse<PostDetailResponse> detail(@PathVariable Long id) {
        return ApiResponse.success(postService.find(id));
    }

    @GetMapping
    public ApiResponse<PageResponse<PostListResponse>> list(@RequestParam(required = false) String keyword,
                                                            @RequestParam(required = false) PostType type,
                                                            @RequestParam(required = false) String tag,
                                                            @RequestParam(defaultValue = "1") int page,
                                                            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.success(postService.list(keyword, type, tag, page, size));
    }

    @PutMapping("/{id}")
    public ApiResponse<PostDetailResponse> update(Authentication auth, @PathVariable Long id, @Valid @ModelAttribute PostUpdateRequest request) {
        return ApiResponse.success(postService.update(auth.getName(), id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(Authentication auth, @PathVariable Long id) {
        postService.delete(auth.getName(), id);
        return ApiResponse.success(null);
    }
}
