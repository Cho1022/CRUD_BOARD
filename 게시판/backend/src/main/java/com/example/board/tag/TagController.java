package com.example.board.tag;

import com.example.board.common.ApiResponse;
import com.example.board.tag.dto.TagSuggestionRequest;
import com.example.board.tag.dto.TagSuggestionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {
    private final TagSuggestionService tagSuggestionService;

    @PostMapping("/suggest")
    public ApiResponse<TagSuggestionResponse> suggest(@RequestBody TagSuggestionRequest request) {
        return ApiResponse.success(tagSuggestionService.suggest(request.title(), request.content()));
    }
}
