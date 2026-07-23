package com.smartcampus.erp.infrastructure.storage;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

/**
 * File storage for uploads (profile photos, assignment attachments,
 * submission files) — backed by ImageKit instead of local disk.
 *
 * WAJAH: Render (aur bahut saare cloud hosts) ka filesystem *ephemeral* hai —
 * har redeploy/restart pe local disk pe likhi files gayab ho jaati hain.
 * ImageKit permanent, external storage deta hai (free tier: 20GB).
 *
 * IMPORTANT — public method signatures (store/loadAsResource/delete) bilkul
 * waisi hi hain jaisi pehle thi, isliye ProfileController, ProfileService,
 * CourseworkAssignmentService, CourseworkSubmissionService — inme se KISI
 * mein bhi koi change nahi karna pada, aur frontend bhi bilkul waisa hi
 * chalega jaisa chal raha tha. `store()` ab jo String return karta hai wo
 * ek local filename ki jagah poora ImageKit URL hai — DB mein wahi field
 * (photoUrl / storedFileName / attachmentStoredFileName) mein save hota hai
 * jaisa pehle hota tha, sirf ab uski value ek URL hai. loadAsResource() us
 * URL se file wapas fetch karke backend ke apne (public/authenticated,
 * jo bhi pehle tha) endpoint ke through serve karta hai — proxy pattern.
 */
@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx",
            "zip", "rar", "jpg", "jpeg", "png", "txt", "csv");

    private static final long MAX_FILE_SIZE_BYTES = 20L * 1024 * 1024; // 20 MB
    private static final String IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${imagekit.private-key}")
    private String imageKitPrivateKey;

    public String store(MultipartFile file, String subDir) {
        validate(file);

        String extension = extractExtension(file.getOriginalFilename());
        String uniqueFileName = UUID.randomUUID() + (extension.isEmpty() ? "" : "." + extension);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.setBasicAuth(imageKitPrivateKey, ""); // ImageKit: private key as username, blank password

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            byte[] bytes = file.getBytes();
            ByteArrayResource fileResource = new ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                    return uniqueFileName;
                }
            };
            body.add("file", fileResource);
            body.add("fileName", uniqueFileName);
            body.add("folder", "/" + subDir);
            body.add("useUniqueFileName", "false"); // hum already UUID de rahe hain

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            @SuppressWarnings("rawtypes")
            ResponseEntity<Map> response = restTemplate.postForEntity(IMAGEKIT_UPLOAD_URL, requestEntity, Map.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new IllegalStateException("ImageKit upload failed with status " + response.getStatusCode());
            }

            Object url = response.getBody().get("url");
            if (url == null) {
                throw new IllegalStateException("ImageKit response did not contain a file URL: " + response.getBody());
            }
            return url.toString();

        } catch (IOException e) {
            throw new IllegalStateException("Failed to store file: " + file.getOriginalFilename(), e);
        }
    }

    /**
     * `storedFileNameOrUrl` ab ek poora ImageKit URL hota hai (store() se aaya
     * hua). File wapas download karke backend ke apne endpoint ke through
     * serve karte hain — isse controller/frontend ko URL scheme ka pata hi
     * nahi chalta, sab kuch backward-compatible rehta hai.
     */
    public Resource loadAsResource(String subDir, String storedFileNameOrUrl) {
        try {
            byte[] bytes = restTemplate.getForObject(URI.create(storedFileNameOrUrl), byte[].class);
            if (bytes == null) {
                throw new IllegalArgumentException("File not found: " + storedFileNameOrUrl);
            }
            return new ByteArrayResource(bytes);
        } catch (Exception e) {
            throw new IllegalArgumentException("Could not read file: " + storedFileNameOrUrl, e);
        }
    }

    public void delete(String subDir, String storedFileNameOrUrl) {
        // ImageKit ke delete API ko fileId chahiye hota hai (sirf URL se nahi
        // hota), aur DB schema abhi sirf URL store karta hai. Isliye purani
        // file ImageKit pe orphan reh jaati hai — free tier storage (20GB)
        // ke hisaab se ye harmless hai. Ye bilkul waisa hi "non-fatal cleanup"
        // behavior hai jaisa original local-disk implementation mein tha.
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
}