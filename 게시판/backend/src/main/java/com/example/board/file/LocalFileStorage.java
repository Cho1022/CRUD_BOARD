package com.example.board.file;

import com.example.board.common.BusinessException;
import com.example.board.common.ErrorCode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class LocalFileStorage implements FileStorage {
    private static final Logger log = LoggerFactory.getLogger(LocalFileStorage.class);
    private final Path root;
    private final String publicPath;
    private final FileValidator validator;

    public LocalFileStorage(@Value("${app.upload.root-path}") String root,
                            @Value("${app.upload.public-path}") String publicPath,
                            FileValidator validator) {
        this.root = Path.of(root).toAbsolutePath().normalize();
        this.publicPath = publicPath;
        this.validator = validator;
    }

    @Override
    public StoredFile store(MultipartFile file, String directory) {
        try {
            Files.createDirectories(root.resolve(directory));
            var name = UUID.randomUUID() + "." + validator.extension(file.getOriginalFilename());
            var path = root.resolve(directory).resolve(name);
            file.transferTo(path);
            return new StoredFile(publicPath + "/" + directory + "/" + name, path.toString());
        } catch (Exception ex) {
            log.warn("Failed to store uploaded file", ex);
            throw new BusinessException(ErrorCode.INVALID_FILE);
        }
    }
}
