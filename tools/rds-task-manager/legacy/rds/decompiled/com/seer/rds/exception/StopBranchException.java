/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.exception.StopBranchException
 */
package com.seer.rds.exception;

public class StopBranchException
extends RuntimeException {
    private static final long serialVersionUID = 8247610319171014183L;

    public StopBranchException(Throwable e) {
        super(e.getMessage(), e);
    }

    public StopBranchException(String message) {
        super(message);
    }

    public StopBranchException(String message, Throwable throwable) {
        super(message, throwable);
    }
}

