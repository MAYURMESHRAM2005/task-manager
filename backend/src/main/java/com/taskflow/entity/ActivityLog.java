package com.taskflow.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.taskflow.entity.enums.ActivityEntityType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Entity
@Table(name = "activity_logs", indexes = {
        @Index(name = "idx_activity_logs_user", columnList = "user_id"),
        @Index(name = "idx_activity_logs_entity", columnList = "entity,entity_id"),
        @Index(name = "idx_activity_logs_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 100)
    private String action;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ActivityEntityType entity;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(length = 1000)
    private String description = "";

    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "ip_address", length = 100)
    private String ipAddress = "";

    @Column(name = "user_agent", length = 500)
    private String userAgent = "";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Nested {@code metadata: { projectId }} object preserved for API compatibility. */
    @JsonProperty("metadata")
    public Map<String, Object> getMetadata() {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("projectId", projectId);
        return metadata;
    }
}
