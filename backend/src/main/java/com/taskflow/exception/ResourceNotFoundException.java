package com.taskflow.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends ApiException {

    public ResourceNotFoundException(String message, String code) {
        super(message, HttpStatus.NOT_FOUND, code);
    }
}
