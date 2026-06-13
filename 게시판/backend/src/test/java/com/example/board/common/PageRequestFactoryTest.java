package com.example.board.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PageRequestFactoryTest {
    @Test
    void userPageStartsAtOne() {
        var pageable = PageRequestFactory.create(1, 10);

        assertThat(pageable.getPageNumber()).isZero();
        assertThat(pageable.getPageSize()).isEqualTo(10);
    }
}
