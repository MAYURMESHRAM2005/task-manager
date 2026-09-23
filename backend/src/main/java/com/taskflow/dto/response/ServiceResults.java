package com.taskflow.dto.response;

import com.taskflow.entity.Notification;
import com.taskflow.entity.Subtask;
import com.taskflow.entity.User;
import com.taskflow.util.Pagination;

import java.util.List;
import java.util.Map;

/** Small internal result carriers used between services and controllers. */
public final class ServiceResults {

    private ServiceResults() {
    }

    public record AuthResult(User user, String accessToken, String refreshToken) {
    }

    public record TokenPair(String accessToken, String refreshToken) {
    }

    public record PageResult<T>(List<T> data, Pagination pagination) {
    }

    public record NotificationPage(List<Notification> data, long unreadCount, Pagination pagination) {
    }

    public record SubtaskProgress(List<Subtask> data, int total, int completed, int percentage) {
    }

    public record TaskStats(long total, long completed, long overdue, int completionPercentage,
                            Map<String, Long> breakdown) {
    }

    public record Health(int score, String label, String color) {
    }
}
