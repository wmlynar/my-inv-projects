/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsMasterException
 */
package com.seer.rds.util.omron.fins.core;

public class FinsMasterException
extends Exception {
    private static final long serialVersionUID = 3029603334484236715L;

    public FinsMasterException(String message, Throwable cause, boolean enableSuppression, boolean writableStackTrace) {
        super(message, cause, enableSuppression, writableStackTrace);
    }

    public FinsMasterException(String message, Throwable cause) {
        super(message, cause);
    }

    public FinsMasterException(String message) {
        super(message);
    }
}

