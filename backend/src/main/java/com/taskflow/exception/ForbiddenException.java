package com.taskflow.exception;

import org.springframework.http.HttpStatus;

public class ForbiddenException extends ApiException {

    public ForbiddenException(String message, String code) {
        super(message, HttpStatus.FORBIDDEN, code);
    }
}
