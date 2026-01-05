/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.exception.BpRuntimeException
 */
package com.seer.rds.exception;

public class BpRuntimeException
extends RuntimeException {
    public BpRuntimeException() {
    }

    public BpRuntimeException(String message) {
        super(message);
    }

    public BpRuntimeException(String message, Throwable cause) {
        super(message, cause);
    }

    public BpRuntimeException(Throwable cause) {
        super(cause);
    }
}

