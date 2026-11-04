package com.company.hr.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class UnauthorizedWorkflowActionException extends RuntimeException {
    public UnauthorizedWorkflowActionException(String message) {
        super(message);
    }
}
