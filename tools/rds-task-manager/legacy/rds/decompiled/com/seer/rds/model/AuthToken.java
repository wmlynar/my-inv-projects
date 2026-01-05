/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.AuthToken
 *  org.apache.shiro.authc.UsernamePasswordToken
 */
package com.seer.rds.model;

import org.apache.shiro.authc.UsernamePasswordToken;

public class AuthToken
extends UsernamePasswordToken {
    String token;

    public AuthToken(String token) {
        this.token = token;
    }

    public Object getPrincipal() {
        return this.token;
    }

    public Object getCredentials() {
        return this.token;
    }
}

