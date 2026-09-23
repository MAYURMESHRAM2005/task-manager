package com.taskflow.service;

import com.taskflow.entity.Notification;
import com.taskflow.entity.User;
import com.taskflow.entity.enums.NotificationType;
import com.taskflow.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Parses and resolves {@code @name} mentions and notifies mentioned users. */
@Service
public class MentionService {

    private static final Pattern MENTION_PATTERN = Pattern.compile("@(\\w+(?:\\.\\w+)*)");

    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public MentionService(UserRepository userRepository, NotificationService notificationService) {
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public List<String> parseMentions(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        LinkedHashSet<String> mentions = new LinkedHashSet<>();
        Matcher matcher = MENTION_PATTERN.matcher(text);
        while (matcher.find()) {
            mentions.add(matcher.group(1));
        }
        return new ArrayList<>(mentions);
    }

    public List<User> resolveMentions(List<String> usernames) {
        if (usernames == null || usernames.isEmpty()) {
            return List.of();
        }
        List<String> lowered = usernames.stream()
                .filter(name -> name != null && !name.isBlank())
                .map(name -> name.toLowerCase())
                .distinct()
                .toList();
        if (lowered.isEmpty()) {
            return List.of();
        }
        return userRepository.findByLowerNameOrLowerEmailIn(lowered);
    }

    public void notifyMentions(List<User> mentionedUsers, Long actorId, String actorName,
                               String entityType, Long entityId, String entityTitle) {
        for (User user : mentionedUsers) {
            if (user.getId().equals(actorId)) {
                continue;
            }
            String message = actorName + " mentioned you in \"" + entityTitle + "\"";
            Notification notification = notificationService.create(user, NotificationType.COMMENT_ADDED,
                    message, entityType, entityId);
            notificationService.push(user.getId(), "MENTION", message, entityType, entityId,
                    notification.getCreatedAt());
        }
    }
}
