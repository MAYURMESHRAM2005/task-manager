package com.taskflow.util;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;

/**
 * Standard success envelope used by every endpoint:
 * <pre>{ success: true, message, data, pagination?, unreadCount?, total?, completed?, percentage? }</pre>
 * Optional members are omitted from JSON when null, matching the original API.
 */
@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private boolean success = true;
    private String message;

    /** Always serialized (even when null) to match the original API contract. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    private T data;
    private Pagination pagination;
    private Long unreadCount;
    private Integer total;
    private Integer completed;
    private Integer percentage;

    public static <T> ApiResponse<T> ok(String message, T data) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setMessage(message);
        response.setData(data);
        return response;
    }

    public static <T> ApiResponse<T> ok(String message, T data, Pagination pagination) {
        ApiResponse<T> response = ok(message, data);
        response.setPagination(pagination);
        return response;
    }

    public ApiResponse<T> unread(long count) {
        this.unreadCount = count;
        return this;
    }

    public ApiResponse<T> subtaskProgress(int total, int completed, int percentage) {
        this.total = total;
        this.completed = completed;
        this.percentage = percentage;
        return this;
    }
}
