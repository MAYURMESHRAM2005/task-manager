package com.taskflow.exception;

import org.springframework.http.HttpStatus;

public class UnauthorizedException extends ApiException {

    public UnauthorizedException(String message, String code) {
        super(message, HttpStatus.UNAUTHORIZED, code);
    }
}
