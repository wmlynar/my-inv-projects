/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.exception.EndErrorException
 */
package com.seer.rds.exception;

public class EndErrorException
extends RuntimeException {
    public EndErrorException() {
    }

    public EndErrorException(String message) {
        super(message);
    }

    public EndErrorException(String message, Throwable cause) {
        super(message, cause);
    }

    public EndErrorException(Throwable cause) {
        super(cause);
    }
}

