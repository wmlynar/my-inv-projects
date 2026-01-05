/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.exception.ServiceException
 */
package com.seer.rds.exception;

public class ServiceException
extends RuntimeException {
    public int code = 200;
    public String msg = "\u64cd\u4f5c\u6210\u529f";

    public ServiceException(int code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    public ServiceException(String msg) {
        this.msg = msg;
    }

    public int getCode() {
        return this.code;
    }

    public String getMsg() {
        return this.msg;
    }
}

