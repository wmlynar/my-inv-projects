/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.xss.XssFilter
 *  com.seer.rds.config.xss.XssHttpServletRequestWrapper
 *  javax.servlet.Filter
 *  javax.servlet.FilterChain
 *  javax.servlet.FilterConfig
 *  javax.servlet.ServletException
 *  javax.servlet.ServletRequest
 *  javax.servlet.ServletResponse
 *  javax.servlet.http.HttpServletRequest
 *  javax.servlet.http.HttpServletResponse
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.config.xss;

import com.seer.rds.config.xss.XssHttpServletRequestWrapper;
import java.io.IOException;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

@Component
public class XssFilter
implements Filter {
    FilterConfig filterConfig = null;

    public void init(FilterConfig filterConfig) throws ServletException {
        this.filterConfig = filterConfig;
    }

    public void destroy() {
        this.filterConfig = null;
    }

    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest)request;
        HttpServletResponse httpResponse = (HttpServletResponse)response;
        String servletPath = httpRequest.getServletPath();
        if (servletPath.endsWith("scene")) {
            httpResponse.setContentType("text/plain");
        }
        httpResponse.addHeader("X-Content-Type-Options", "nosniff");
        if ("TRACE".equalsIgnoreCase(httpRequest.getMethod()) || "DELETE".equalsIgnoreCase(httpRequest.getMethod()) || "OPTIONS".equalsIgnoreCase(httpRequest.getMethod())) {
            httpResponse.addHeader("Content-Type", "");
        }
        chain.doFilter((ServletRequest)new XssHttpServletRequestWrapper((HttpServletRequest)request), response);
    }
}

