package com.example.board.common;

public record ApiResponse<T>(boolean success, T data, String message, String code) {
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, null, null);
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, data, message, null);
    }

    public static ApiResponse<Void> error(String code, String message) {
        return new ApiResponse<>(false, null, message, code);
    }
}
