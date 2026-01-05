/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.exception.TaskErrorException
 */
package com.seer.rds.exception;

public class TaskErrorException
extends RuntimeException {
    private static final long serialVersionUID = 8247610319171014183L;

    public TaskErrorException(Throwable e) {
        super(e.getMessage(), e);
    }

    public TaskErrorException(String message) {
        super(message);
    }

    public TaskErrorException(String message, Throwable throwable) {
        super(message, throwable);
    }
}

