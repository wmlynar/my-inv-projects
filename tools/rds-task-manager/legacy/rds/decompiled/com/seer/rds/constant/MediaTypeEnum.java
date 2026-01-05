/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.MediaTypeEnum
 */
package com.seer.rds.constant;

public enum MediaTypeEnum {
    JSON("application/json"),
    JAVASCRIPT("application/javascript"),
    HTML("text/html"),
    TEXT("text/plain"),
    XML("application/xml"),
    XWWWFORMURLENCODED("application/x-www-form-urlencoded");

    private String mediaType;

    private MediaTypeEnum(String mediaType) {
        this.mediaType = mediaType;
    }

    private MediaTypeEnum() {
    }

    public String getMediaType() {
        return this.mediaType;
    }
}

