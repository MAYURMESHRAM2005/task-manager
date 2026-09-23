package com.taskflow.repository;

import com.taskflow.entity.Attachment;
import com.taskflow.entity.enums.AttachmentEntityType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {

    List<Attachment> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(AttachmentEntityType entityType, Long entityId);
}
