package com.taskflow.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.taskflow.entity.enums.TaskPriority;
import com.taskflow.entity.enums.TaskStatus;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Table(name = "tasks", indexes = {
        @Index(name = "idx_tasks_status", columnList = "status"),
        @Index(name = "idx_tasks_priority", columnList = "priority"),
        @Index(name = "idx_tasks_due_date", columnList = "due_date"),
        @Index(name = "idx_tasks_project", columnList = "project_id")
})
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 2000)
    private String description = "";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskStatus status = TaskStatus.TODO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskPriority priority = TaskPriority.MEDIUM;

    @Column(length = 50)
    private String category = "";

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "task_labels", joinColumns = @JoinColumn(name = "task_id"))
    @Column(name = "label", length = 100)
    private List<String> labels = new ArrayList<>();

    @Column(name = "due_date")
    private LocalDate dueDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "reminder_at")
    private LocalDateTime reminderAt;

    @Column(name = "reminder_notified", nullable = false)
    private boolean reminderNotified = false;

    @Column(nullable = false)
    private int position = 0;

    /** Task dependencies (self-referencing many-to-many). */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "task_dependencies",
            joinColumns = @JoinColumn(name = "task_id"),
            inverseJoinColumns = @JoinColumn(name = "depends_on_task_id"))
    @JsonIgnore
    private Set<Task> dependencies = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "task_mentions",
            joinColumns = @JoinColumn(name = "task_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    @JsonIgnore
    private Set<User> mentions = new HashSet<>();

    @Column(name = "recurrence_frequency", length = 20)
    private String recurrenceFrequency = "none";

    @Column(name = "recurrence_interval")
    private Integer recurrenceInterval = 1;

    @Column(name = "recurrence_end_date")
    private LocalDate recurrenceEndDate;

    @Column(name = "next_recurrence_at")
    private LocalDateTime nextRecurrenceAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Dependency summary (id/title/status/priority) exposed as {@code dependsOn}. */
    @JsonProperty("dependsOn")
    public List<Map<String, Object>> getDependsOn() {
        return dependencies.stream().map(dep -> {
            Map<String, Object> ref = new LinkedHashMap<>();
            ref.put("_id", dep.getId());
            ref.put("title", dep.getTitle());
            ref.put("status", dep.getStatus());
            ref.put("priority", dep.getPriority());
            return ref;
        }).collect(Collectors.toList());
    }

    /** Nested recurrence object exposed as {@code recurrence}. */
    @JsonProperty("recurrence")
    public Map<String, Object> getRecurrence() {
        Map<String, Object> recurrence = new LinkedHashMap<>();
        recurrence.put("frequency", recurrenceFrequency == null ? "none" : recurrenceFrequency);
        recurrence.put("interval", recurrenceInterval == null ? 1 : recurrenceInterval);
        recurrence.put("endDate", recurrenceEndDate);
        return recurrence;
    }
}
