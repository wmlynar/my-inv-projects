/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.exception.ScriptException
 */
package com.seer.rds.exception;

public class ScriptException
extends RuntimeException {
    public int code = 200;
    public String msg = "Success";

    public ScriptException(int code, String msg) {
        super(msg);
        this.code = code;
        this.msg = msg;
    }

    public ScriptException(String msg) {
        this.msg = msg;
    }

    public int getCode() {
        return this.code;
    }

    public String getMsg() {
        return this.msg;
    }
}

