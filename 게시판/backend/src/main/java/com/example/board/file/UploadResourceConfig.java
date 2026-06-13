package com.example.board.file;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class UploadResourceConfig implements WebMvcConfigurer {
    private final String rootPath;

    public UploadResourceConfig(@Value("${app.upload.root-path}") String rootPath) {
        this.rootPath = rootPath;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**").addResourceLocations("file:" + rootPath + "/");
    }
}
