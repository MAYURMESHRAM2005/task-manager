package com.taskflow.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

import java.util.List;

/** Error envelope: { success: false, message, error: { code, details? } } */
@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiErrorResponse {

    private final boolean success = false;
    private final String message;
    private final ErrorDetail error;

    public ApiErrorResponse(String message, String code, List<String> details) {
        this.message = message;
        this.error = new ErrorDetail(code, details);
    }

    public ApiErrorResponse(String message, String code) {
        this(message, code, null);
    }

    @Getter
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ErrorDetail {
        private final String code;
        private final List<String> details;

        public ErrorDetail(String code, List<String> details) {
            this.code = code;
            this.details = details;
        }
    }
}
