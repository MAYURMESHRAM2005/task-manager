package com.taskflow.service;

import com.taskflow.entity.Comment;
import com.taskflow.entity.Task;
import com.taskflow.entity.User;
import com.taskflow.entity.enums.NotificationType;
import com.taskflow.exception.ForbiddenException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.CommentRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.socket.SocketService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final MentionService mentionService;
    private final NotificationService notificationService;
    private final SocketService socketService;

    public CommentService(CommentRepository commentRepository, TaskRepository taskRepository,
                          MentionService mentionService, NotificationService notificationService,
                          SocketService socketService) {
        this.commentRepository = commentRepository;
        this.taskRepository = taskRepository;
        this.mentionService = mentionService;
        this.notificationService = notificationService;
        this.socketService = socketService;
    }

    @Transactional(readOnly = true)
    public List<Comment> getComments(Long taskId) {
        requireTask(taskId);
        return commentRepository.findByTaskIdOrderByCreatedAtDesc(taskId);
    }

    @Transactional
    public Comment createComment(Long taskId, String content, User current) {
        Task task = requireTask(taskId);

        List<User> mentioned = mentionService.resolveMentions(mentionService.parseMentions(content));

        Comment comment = new Comment();
        comment.setTask(task);
        comment.setUser(current);
        comment.setContent(content == null ? "" : content);
        comment.setMentions(new HashSet<>(mentioned));
        commentRepository.save(comment);

        Set<Long> notifyIds = new LinkedHashSet<>();
        if (task.getCreatedBy() != null && !task.getCreatedBy().getId().equals(current.getId())) {
            notifyIds.add(task.getCreatedBy().getId());
        }
        if (task.getAssignedTo() != null && !task.getAssignedTo().getId().equals(current.getId())) {
            notifyIds.add(task.getAssignedTo().getId());
        }
        for (Long userId : notifyIds) {
            notificationService.createAndPushToUser(userId, NotificationType.COMMENT_ADDED,
                    "New comment on task \"" + task.getTitle() + "\" by " + current.getName(),
                    "Task", task.getId());
        }

        if (!mentioned.isEmpty()) {
            mentionService.notifyMentions(mentioned, current.getId(), current.getName(), "Task",
                    task.getId(), task.getTitle());
        }

        socketService.emitToTask(taskId, "task:comment", Map.of("taskId", taskId, "comment", comment));
        return comment;
    }

    @Transactional
    public Comment updateComment(Long commentId, String content, User current) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found.", "COMMENT_NOT_FOUND"));

        if (!comment.getUser().getId().equals(current.getId())) {
            throw new ForbiddenException("You can only edit your own comments.", "NOT_AUTHORIZED");
        }

        List<User> mentioned = mentionService.resolveMentions(mentionService.parseMentions(content));
        comment.setContent(content == null ? "" : content);
        comment.setMentions(new HashSet<>(mentioned));
        commentRepository.save(comment);

        Task task = comment.getTask();
        if (!mentioned.isEmpty() && task != null) {
            mentionService.notifyMentions(mentioned, current.getId(), current.getName(), "Task",
                    task.getId(), task.getTitle());
        }

        if (task != null) {
            socketService.emitToTask(task.getId(), "task:comment:updated",
                    Map.of("taskId", task.getId(), "commentId", comment.getId()));
        }
        return comment;
    }

    @Transactional
    public void deleteComment(Long commentId, User current) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found.", "COMMENT_NOT_FOUND"));

        if (!comment.getUser().getId().equals(current.getId())) {
            throw new ForbiddenException("You can only delete your own comments.", "NOT_AUTHORIZED");
        }

        Long taskId = comment.getTask() == null ? null : comment.getTask().getId();
        commentRepository.delete(comment);
        if (taskId != null) {
            socketService.emitToTask(taskId, "task:comment:deleted",
                    Map.of("taskId", taskId, "commentId", commentId));
        }
    }

    private Task requireTask(Long taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found.", "TASK_NOT_FOUND"));
    }
}
