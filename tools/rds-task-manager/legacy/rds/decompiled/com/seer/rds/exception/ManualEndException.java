/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.exception.ManualEndException
 */
package com.seer.rds.exception;

public class ManualEndException
extends RuntimeException {
    public ManualEndException() {
    }

    public ManualEndException(String message) {
        super(message);
    }

    public ManualEndException(String message, Throwable cause) {
        super(message, cause);
    }

    public ManualEndException(Throwable cause) {
        super(cause);
    }
}

