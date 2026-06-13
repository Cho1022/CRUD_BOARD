package com.example.board.common;

import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(BusinessException.class)
    ResponseEntity<ApiResponse<Void>> business(BusinessException ex) {
        var code = ex.getErrorCode();
        return ResponseEntity.status(code.status()).body(ApiResponse.error(code.name(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse<Void>> invalid(MethodArgumentNotValidException ex) {
        var message = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getDefaultMessage())
                .collect(Collectors.joining(" "));
        return ResponseEntity.badRequest().body(ApiResponse.error("INVALID_INPUT", message));
    }
}
