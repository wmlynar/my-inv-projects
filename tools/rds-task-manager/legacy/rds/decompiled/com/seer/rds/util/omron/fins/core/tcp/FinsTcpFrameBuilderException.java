/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.omron.fins.core.tcp.FinsTcpFrameBuilderException
 */
package com.seer.rds.util.omron.fins.core.tcp;

public class FinsTcpFrameBuilderException
extends Exception {
    private static final long serialVersionUID = -3183960010991615697L;

    public FinsTcpFrameBuilderException(String message, Throwable cause, boolean enableSuppression, boolean writableStackTrace) {
        super(message, cause, enableSuppression, writableStackTrace);
    }

    public FinsTcpFrameBuilderException(String message, Throwable cause) {
        super(message, cause);
    }

    public FinsTcpFrameBuilderException(String message) {
        super(message);
    }
}

