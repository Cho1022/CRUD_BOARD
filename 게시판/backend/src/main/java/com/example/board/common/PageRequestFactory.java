package com.example.board.common;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class PageRequestFactory {
    private PageRequestFactory() {
    }

    public static Pageable create(int page, int size) {
        var safePage = Math.max(page, 1) - 1;
        var safeSize = Math.min(Math.max(size, 1), 50);
        return PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "id"));
    }
}
