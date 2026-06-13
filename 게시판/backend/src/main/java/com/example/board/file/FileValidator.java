package com.example.board.file;

import com.example.board.common.BusinessException;
import com.example.board.common.ErrorCode;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class FileValidator {
    private static final long MAX_SIZE = 5 * 1024 * 1024L;
    private static final Set<String> ALLOWED = Set.of("jpg", "jpeg", "png", "webp");

    public void requiredImage(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new BusinessException(ErrorCode.INVALID_FILE, "프로필 사진을 추가해주세요.");
        image(file);
    }

    public void optionalImage(MultipartFile file) {
        if (file != null && !file.isEmpty()) image(file);
    }

    private void image(MultipartFile file) {
        if (file.getSize() > MAX_SIZE) throw new BusinessException(ErrorCode.INVALID_FILE, "파일은 5MB 이하만 가능합니다.");
        if (!ALLOWED.contains(extension(file.getOriginalFilename()))) throw new BusinessException(ErrorCode.INVALID_FILE);
    }

    public String extension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}
