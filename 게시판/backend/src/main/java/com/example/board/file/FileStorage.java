package com.example.board.file;

import org.springframework.web.multipart.MultipartFile;

public interface FileStorage {
    StoredFile store(MultipartFile file, String directory);
}
