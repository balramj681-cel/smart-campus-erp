package com.smartcampus.erp.infrastructure.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Local-disk file storage for uploads (assignment submissions, and
 * anything else that later needs a "save this file, give me back a
 * reference to it" primitive).
 *
 * Files are namespaced under sub-directories (e.g. "assignments") beneath
 * a single configurable root — app.upload.dir, defaulting to ./uploads
 * relative to the working directory the app was started from.
 */
@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx",
            "zip", "rar", "jpg", "jpeg", "png", "txt", "csv");

    private static final long MAX_FILE_SIZE_BYTES = 20L * 1024 * 1024; // 20 MB

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    public String store(MultipartFile file, String subDir) {
        validate(file);

        String extension = extractExtension(file.getOriginalFilename());
        String storedFileName = UUID.randomUUID() + (extension.isEmpty() ? "" : "." + extension);

        try {
            Path targetDir = resolveDir(subDir);
            Files.createDirectories(targetDir);
            Path targetPath = targetDir.resolve(storedFileName).normalize();

            if (!targetPath.getParent().equals(targetDir)) {
                throw new IllegalArgumentException("Invalid file path");
            }

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            return storedFileName;
        } catch (IOException e) {
            throw new IllegalStateException("Failed to store file: " + file.getOriginalFilename(), e);
        }
    }

    public Resource loadAsResource(String subDir, String storedFileName) {
        try {
            Path filePath = resolveDir(subDir).resolve(storedFileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new IllegalArgumentException("File not found: " + storedFileName);
            }
            return resource;
        } catch (Exception e) {
            throw new IllegalArgumentException("Could not read file: " + storedFileName, e);
        }
    }

    public void delete(String subDir, String storedFileName) {
        try {
            Files.deleteIfExists(resolveDir(subDir).resolve(storedFileName).normalize());
        } catch (IOException e) {
            // Non-fatal — an orphaned file on disk is a minor cleanup issue.
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File exceeds the 20 MB size limit");
        }
        String extension = extractExtension(file.getOriginalFilename()).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException(
                "File type ." + extension + " is not allowed. Allowed types: " + String.join(", ", ALLOWED_EXTENSIONS));
        }
    }

    private String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.') + 1);
    }

    private Path resolveDir(String subDir) {
        return Paths.get(uploadDir, subDir).toAbsolutePath().normalize();
    }
}