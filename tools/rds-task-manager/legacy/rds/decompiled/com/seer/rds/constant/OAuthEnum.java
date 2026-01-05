/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.OAuthEnum
 */
package com.seer.rds.constant;

public enum OAuthEnum {
    grant_type("grant_type"),
    code("code"),
    client_id("client_id"),
    redirect_uri("redirect_uri"),
    access_token("access_token"),
    scope("scope");

    private String name;

    private OAuthEnum(String name) {
        this.name = name;
    }

    private OAuthEnum() {
    }

    public String getName() {
        return this.name;
    }
}

