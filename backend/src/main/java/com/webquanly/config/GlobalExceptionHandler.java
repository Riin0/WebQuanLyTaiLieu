package com.webquanly.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(java.util.Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(com.webquanly.exception.ResourceNotFoundException.class)
    public ResponseEntity<?> handleNotFound(com.webquanly.exception.ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(java.util.Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(com.webquanly.exception.MailDeliveryException.class)
    public ResponseEntity<?> handleMailDelivery(com.webquanly.exception.MailDeliveryException ex) {
        // Mail delivery issues are usually external (SMTP auth, connectivity, timeouts).
        // Return a 502 Bad Gateway with a helpful message containing the underlying cause message.
        String detail = ex.getMessage() != null ? ex.getMessage() : "Lỗi khi gửi email";
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(java.util.Map.of(
                "error", "Không thể gửi email",
                "details", detail
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneric(Exception ex) {
        ex.printStackTrace();
        // DEV ONLY: Return exception message to help debugging. Remove or restrict in production.
        String msg = ex.getMessage() != null ? ex.getMessage() : "Internal server error";
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(java.util.Map.of(
                "error", "Internal server error",
                "exception", ex.getClass().getSimpleName(),
                "message", msg
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {
        java.util.Map<String,String> errors = new java.util.HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            errors.put(fe.getField(), fe.getDefaultMessage());
        }
        return ResponseEntity.badRequest().body(java.util.Map.of("error", "Validation failed", "fields", errors));
    }
}
