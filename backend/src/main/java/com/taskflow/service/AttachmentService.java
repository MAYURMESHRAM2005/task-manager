package com.taskflow.service;

import com.taskflow.entity.Attachment;
import com.taskflow.entity.User;
import com.taskflow.entity.enums.ActivityEntityType;
import com.taskflow.entity.enums.AttachmentEntityType;
import com.taskflow.exception.BadRequestException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.AttachmentRepository;
import com.taskflow.repository.ProjectRepository;
import com.taskflow.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/** Stores uploaded files on disk and their metadata in MySQL. */
@Service
public class AttachmentService {

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain", "text/csv",
            "application/zip");

    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;

    private final AttachmentRepository attachmentRepository;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final ActivityService activityService;

    @Value("${app.upload.dir}")
    private String uploadDir;

    public AttachmentService(AttachmentRepository attachmentRepository, TaskRepository taskRepository,
                             ProjectRepository projectRepository, ActivityService activityService) {
        this.attachmentRepository = attachmentRepository;
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.activityService = activityService;
    }

    @Transactional
    public Attachment upload(MultipartFile file, String entityTypeValue, Long entityId, User current,
                             String ip, String userAgent) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("No file uploaded", "NO_FILE");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("File too large. Maximum size is 10MB.", "UPLOAD_ERROR");
        }
        AttachmentEntityType entityType = parseEntityType(entityTypeValue);
        if (!ALLOWED_MIME_TYPES.contains(file.getContentType())) {
            throw new BadRequestException("File type not allowed", "INVALID_FILE_TYPE");
        }
        verifyEntityExists(entityType, entityId);

        String originalName = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
        String extension = "";
        int dot = originalName.lastIndexOf('.');
        if (dot >= 0) {
            extension = originalName.substring(dot);
        }
        String storedName = "file-" + System.currentTimeMillis() + "-" + UUID.randomUUID() + extension;

        try {
            Path directory = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(directory);
            Path target = directory.resolve(storedName);
            file.transferTo(target.toFile());

            Attachment attachment = new Attachment();
            attachment.setFilename(storedName);
            attachment.setOriginalName(originalName);
            attachment.setMimeType(file.getContentType());
            attachment.setSize(file.getSize());
            attachment.setPath(target.toString());
            attachment.setEntityType(entityType);
            attachment.setEntityId(entityId);
            attachment.setUploadedBy(current);
            attachmentRepository.save(attachment);

            activityService.logActivity(current, "FILE_UPLOADED",
                    entityType == AttachmentEntityType.Task
                            ? ActivityEntityType.Task : ActivityEntityType.Project,
                    entityId, "Uploaded file: " + originalName,
                    entityType == AttachmentEntityType.Project ? entityId : null, ip, userAgent);
            return attachment;
        } catch (IOException ex) {
            throw new BadRequestException("Failed to store file: " + ex.getMessage(), "UPLOAD_ERROR");
        }
    }

    @Transactional(readOnly = true)
    public List<Attachment> getAttachments(String entityTypeValue, Long entityId) {
        return attachmentRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(
                parseEntityType(entityTypeValue), entityId);
    }

    @Transactional
    public void deleteAttachment(Long id) {
        Attachment attachment = attachmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found.", "ATTACHMENT_NOT_FOUND"));

        try {
            Files.deleteIfExists(Paths.get(attachment.getPath()));
        } catch (IOException ignored) {
            // The metadata row is removed regardless of the on-disk state.
        }
        attachmentRepository.delete(attachment);
    }

    private AttachmentEntityType parseEntityType(String value) {
        if (value == null) {
            throw new BadRequestException("Invalid entity type", "VALIDATION_ERROR");
        }
        switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "task":
                return AttachmentEntityType.Task;
            case "project":
                return AttachmentEntityType.Project;
            default:
                throw new BadRequestException("Invalid entity type", "VALIDATION_ERROR");
        }
    }

    private void verifyEntityExists(AttachmentEntityType entityType, Long entityId) {
        boolean exists = entityType == AttachmentEntityType.Task
                ? taskRepository.existsById(entityId)
                : projectRepository.existsById(entityId);
        if (!exists) {
            throw new ResourceNotFoundException(
                    entityType == AttachmentEntityType.Task ? "Task not found." : "Project not found.",
                    entityType == AttachmentEntityType.Task ? "TASK_NOT_FOUND" : "PROJECT_NOT_FOUND");
        }
    }
}
