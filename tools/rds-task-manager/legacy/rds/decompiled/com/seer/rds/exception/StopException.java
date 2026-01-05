/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.exception.StopException
 */
package com.seer.rds.exception;

public class StopException
extends RuntimeException {
    public StopException() {
    }

    public StopException(String message) {
        super(message);
    }

    public StopException(String message, Throwable cause) {
        super(message, cause);
    }

    public StopException(Throwable cause) {
        super(cause);
    }
}

