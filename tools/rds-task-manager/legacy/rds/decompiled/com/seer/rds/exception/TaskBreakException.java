/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.exception.TaskBreakException
 */
package com.seer.rds.exception;

public class TaskBreakException
extends RuntimeException {
    private static final long serialVersionUID = 8247610319171014183L;

    public TaskBreakException(Throwable e) {
        super(e.getMessage(), e);
    }

    public TaskBreakException(String message) {
        super(message);
    }

    public TaskBreakException(String message, Throwable throwable) {
        super(message, throwable);
    }
}

