package com.taskflow.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/** Base class for all operational API errors. */
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApiException(String message, HttpStatus status, String code) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
