/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.CredentialMatcher
 *  org.apache.shiro.authc.AuthenticationInfo
 *  org.apache.shiro.authc.AuthenticationToken
 *  org.apache.shiro.authc.UsernamePasswordToken
 *  org.apache.shiro.authc.credential.SimpleCredentialsMatcher
 */
package com.seer.rds.config;

import org.apache.shiro.authc.AuthenticationInfo;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.authc.UsernamePasswordToken;
import org.apache.shiro.authc.credential.SimpleCredentialsMatcher;

public class CredentialMatcher
extends SimpleCredentialsMatcher {
    public boolean doCredentialsMatch(AuthenticationToken token, AuthenticationInfo info) {
        UsernamePasswordToken token1 = (UsernamePasswordToken)token;
        String passsword = new String(token1.getPassword());
        String dbPassword = (String)info.getCredentials();
        return this.equals((Object)passsword, (Object)dbPassword);
    }
}

