package com.taskflow.service;

import com.taskflow.dto.response.ServiceResults;
import com.taskflow.entity.Notification;
import com.taskflow.entity.User;
import com.taskflow.entity.enums.NotificationType;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.NotificationRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.socket.SocketService;
import com.taskflow.util.Pagination;
import com.taskflow.util.PaginationUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/** Persists notifications and pushes them in real time. */
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SocketService socketService;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository,
                               SocketService socketService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.socketService = socketService;
    }

    /** Convenience overload for callers that only hold a user id. */
    @Transactional
    public Notification createAndPushToUser(Long userId, NotificationType type, String message,
                                            String relatedEntityType, Long relatedEntityId) {
        return createAndPush(userRepository.getReferenceById(userId), type, message, relatedEntityType,
                relatedEntityId);
    }

    @Transactional
    public Notification create(User user, NotificationType type, String message,
                               String relatedEntityType, Long relatedEntityId) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType(type);
        notification.setMessage(message);
        notification.setRelatedEntityType(relatedEntityType);
        notification.setRelatedEntityId(relatedEntityId);
        return notificationRepository.save(notification);
    }

    /** Persists a notification and pushes it to the user's live socket connection. */
    @Transactional
    public Notification createAndPush(User user, NotificationType type, String message,
                                      String relatedEntityType, Long relatedEntityId) {
        Notification notification = create(user, type, message, relatedEntityType, relatedEntityId);
        push(user.getId(), type.name(), message, relatedEntityType, relatedEntityId, notification.getCreatedAt());
        return notification;
    }

    public void push(Long userId, String type, String message, String entityType, Long entityId, LocalDateTime timestamp) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", type);
        payload.put("message", message);
        payload.put("entityType", entityType);
        payload.put("entityId", entityId);
        payload.put("timestamp", timestamp);
        socketService.emitToUser(userId, "notification", payload);
    }

    public boolean existsForUser(Long userId, NotificationType type, Long relatedEntityId) {
        return notificationRepository.existsByUserIdAndTypeAndRelatedEntityId(userId, type, relatedEntityId);
    }

    @Transactional(readOnly = true)
    public ServiceResults.NotificationPage getNotifications(Long userId, PaginationUtils.PageRequest page,
                                                            boolean unreadOnly) {
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        PageRequest pageRequest = PageRequest.of(page.page() - 1, page.limit(), sort);
        Page<Notification> result = unreadOnly
                ? notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId, pageRequest)
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageRequest);
        long unreadCount = notificationRepository.countByUserIdAndReadFalse(userId);
        return new ServiceResults.NotificationPage(result.getContent(), unreadCount,
                Pagination.of(page.page(), page.limit(), result.getTotalElements()));
    }

    @Transactional
    public Notification markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .filter(n -> n.getUser() != null && n.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found.", "NOTIFICATION_NOT_FOUND"));
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    @Transactional
    public int markAllAsRead(Long userId) {
        return notificationRepository.markAllRead(userId);
    }
}
