/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.gson.Gson
 *  com.seer.rds.Filter.AuthFilter
 *  com.seer.rds.model.AuthToken
 *  javax.servlet.ServletRequest
 *  javax.servlet.ServletResponse
 *  javax.servlet.http.HttpServletRequest
 *  javax.servlet.http.HttpServletResponse
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.shiro.authc.AuthenticationException
 *  org.apache.shiro.authc.AuthenticationToken
 *  org.apache.shiro.web.filter.authc.AuthenticatingFilter
 */
package com.seer.rds.Filter;

import com.google.gson.Gson;
import com.seer.rds.model.AuthToken;
import java.io.IOException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.lang3.StringUtils;
import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.web.filter.authc.AuthenticatingFilter;

public class AuthFilter
extends AuthenticatingFilter {
    Gson gson = new Gson();

    protected AuthenticationToken createToken(ServletRequest request, ServletResponse response) throws Exception {
        HttpServletRequest httpServletRequest = (HttpServletRequest)request;
        String token = httpServletRequest.getHeader("token");
        return new AuthToken(token);
    }

    protected boolean isAccessAllowed(ServletRequest request, ServletResponse response, Object mappedValue) {
        StringBuffer requestURL = ((HttpServletRequest)request).getRequestURL();
        return true;
    }

    protected boolean onAccessDenied(ServletRequest request, ServletResponse response) throws Exception {
        HttpServletRequest httpServletRequest = (HttpServletRequest)request;
        HttpServletResponse httpServletResponse = (HttpServletResponse)response;
        String token = httpServletRequest.getHeader("token");
        if (StringUtils.isBlank((CharSequence)token)) {
            httpServletResponse.setHeader("Access-Control-Allow-Credentials", "true");
            httpServletResponse.setHeader("Access-Control-Allow-Origin", httpServletRequest.getHeader("Origin"));
            httpServletResponse.setCharacterEncoding("UTF-8");
            String msg = "please login";
            httpServletResponse.getWriter().write(this.gson.toJson((Object)msg));
            return false;
        }
        return this.executeLogin(request, response);
    }

    protected boolean onLoginFailure(AuthenticationToken token, AuthenticationException e, ServletRequest request, ServletResponse response) {
        HttpServletRequest httpServletRequest = (HttpServletRequest)request;
        HttpServletResponse httpResponse = (HttpServletResponse)response;
        httpResponse.setContentType("application/json;charset=utf-8");
        httpResponse.setHeader("Access-Control-Allow-Credentials", "true");
        httpResponse.setHeader("Access-Control-Allow-Origin", httpServletRequest.getHeader("Origin"));
        httpResponse.setCharacterEncoding("UTF-8");
        try {
            Object throwable = e.getCause() == null ? e : e.getCause();
            String msg = "Login credentials have expired, please log in again";
            httpResponse.getWriter().write(this.gson.toJson((Object)msg));
        }
        catch (IOException iOException) {
            // empty catch block
        }
        return false;
    }
}

