/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.CorsOriginInterceptor
 *  javax.servlet.http.HttpServletRequest
 *  javax.servlet.http.HttpServletResponse
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.http.HttpStatus
 *  org.springframework.web.servlet.HandlerInterceptor
 *  org.springframework.web.servlet.ModelAndView
 */
package com.seer.rds.config;

import java.io.PrintWriter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

public class CorsOriginInterceptor
implements HandlerInterceptor {
    private static final Logger log = LoggerFactory.getLogger(CorsOriginInterceptor.class);

    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String servletPath = request.getServletPath();
        if (servletPath.endsWith("scene")) {
            response.setContentType("text/plain");
        } else {
            response.setHeader("Access-Control-Allow-Origin", "*");
        }
        if ("null".equals(request.getHeader("Origin"))) {
            log.info("request header Origin is null!");
            response.setStatus(HttpStatus.BAD_REQUEST.value());
            response.setCharacterEncoding("utf-8");
            PrintWriter out = response.getWriter();
            out.write("Origin null is not allowed. ");
            out.flush();
            out.close();
            return false;
        }
        return true;
    }

    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, ModelAndView modelAndView) throws Exception {
    }

    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
    }
}

