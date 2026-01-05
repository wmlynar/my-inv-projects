/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.FinsSlaveException
 */
package com.seer.rds.util.omron.fins.core;

public class FinsSlaveException
extends Exception {
    private static final long serialVersionUID = 2034734624679243932L;

    public FinsSlaveException(String message, Throwable cause, boolean enableSuppression, boolean writableStackTrace) {
        super(message, cause, enableSuppression, writableStackTrace);
    }

    public FinsSlaveException(String message, Throwable cause) {
        super(message, cause);
    }

    public FinsSlaveException(String message) {
        super(message);
    }

    public FinsSlaveException(Throwable cause) {
        super(cause);
    }
}

