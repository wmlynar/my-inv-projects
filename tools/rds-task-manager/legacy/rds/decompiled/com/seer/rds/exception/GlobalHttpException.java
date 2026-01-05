/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.exception.GlobalHttpException
 */
package com.seer.rds.exception;

public class GlobalHttpException
extends RuntimeException {
    public int code = 200;
    public String msg = "Success";

    public GlobalHttpException(int code, String msg) {
        super(msg);
        this.code = code;
        this.msg = msg;
    }

    public GlobalHttpException(String msg) {
        this.msg = msg;
    }

    public int getCode() {
        return this.code;
    }

    public String getMsg() {
        return this.msg;
    }
}

