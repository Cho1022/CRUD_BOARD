package com.example.board.file;

import com.example.board.common.BusinessException;
import com.example.board.common.ErrorCode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class LocalFileStorage implements FileStorage {
    private final Path root;
    private final String publicPath;
    private final FileValidator validator;

    public LocalFileStorage(@Value("${app.upload.root-path}") String root,
                            @Value("${app.upload.public-path}") String publicPath,
                            FileValidator validator) {
        this.root = Path.of(root);
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
            throw new BusinessException(ErrorCode.INVALID_FILE);
        }
    }
}
