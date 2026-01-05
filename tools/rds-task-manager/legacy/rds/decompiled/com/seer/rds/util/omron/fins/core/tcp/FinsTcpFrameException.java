/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.tcp.FinsTcpFrameException
 */
package com.seer.rds.util.omron.fins.core.tcp;

public class FinsTcpFrameException
extends Exception {
    private static final long serialVersionUID = 2938015920094636644L;

    public FinsTcpFrameException() {
    }

    public FinsTcpFrameException(String message, Throwable cause, boolean enableSuppression, boolean writableStackTrace) {
        super(message, cause, enableSuppression, writableStackTrace);
    }

    public FinsTcpFrameException(String message, Throwable cause) {
        super(message, cause);
    }

    public FinsTcpFrameException(String message) {
        super(message);
    }

    public FinsTcpFrameException(Throwable cause) {
        super(cause);
    }
}

