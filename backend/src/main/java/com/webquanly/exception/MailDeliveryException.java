package com.webquanly.exception;

public class MailDeliveryException extends RuntimeException {

    private final int code;

    public MailDeliveryException(String message) {
        super(message);
        this.code = 1001;
    }

    public MailDeliveryException(String message, Throwable cause) {
        super(message, cause);
        this.code = 1001;
    }

    public MailDeliveryException(String message, int code) {
        super(message);
        this.code = code;
    }

    public MailDeliveryException(String message, Throwable cause, int code) {
        super(message, cause);
        this.code = code;
    }

    public int getCode() {
        return code;
    }

    @Override
    public String toString() {
        return "MailDeliveryException{" +
                "code=" + code +
                ", message=" + getMessage() +
                ", cause=" + getCause() +
                '}';
    }
}
