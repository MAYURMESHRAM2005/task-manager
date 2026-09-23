package com.taskflow.exception;

import org.springframework.http.HttpStatus;

public class BadRequestException extends ApiException {

    public BadRequestException(String message) {
        this(message, "BAD_REQUEST");
    }

    public BadRequestException(String message, String code) {
        super(message, HttpStatus.BAD_REQUEST, code);
    }

    public BadRequestException(String message, String code, HttpStatus status) {
        super(message, status, code);
    }
}
