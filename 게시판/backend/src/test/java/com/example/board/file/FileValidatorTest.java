package com.example.board.file;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.board.common.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class FileValidatorTest {
    private final FileValidator validator = new FileValidator();

    @Test
    void invalidExtensionIsRejected() {
        var file = new MockMultipartFile("file", "bad.exe", "application/octet-stream", "x".getBytes());

        assertThatThrownBy(() -> validator.requiredImage(file)).isInstanceOf(BusinessException.class);
    }

    @Test
    void emptyRequiredImageIsRejected() {
        var file = new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);

        assertThatThrownBy(() -> validator.requiredImage(file))
                .isInstanceOf(BusinessException.class)
                .hasMessage("프로필 사진을 추가해주세요.");
    }
}
