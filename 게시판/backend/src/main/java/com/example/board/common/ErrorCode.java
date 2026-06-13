package com.example.board.common;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "입력값을 확인해주세요."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "권한이 없습니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "대상을 찾을 수 없습니다."),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "중복된 이메일 입니다."),
    DUPLICATE_NICKNAME(HttpStatus.CONFLICT, "중복된 닉네임 입니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호를 확인해주세요"),
    INVALID_FILE(HttpStatus.BAD_REQUEST, "파일을 확인해주세요.");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    public HttpStatus status() {
        return status;
    }

    public String message() {
        return message;
    }
}
