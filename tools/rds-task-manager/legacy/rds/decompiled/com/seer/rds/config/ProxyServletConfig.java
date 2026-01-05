/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.ProxyServletConfig
 *  javax.servlet.Servlet
 *  org.mitre.dsmiley.httpproxy.ProxyServlet
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.boot.web.servlet.ServletRegistrationBean
 *  org.springframework.context.annotation.Bean
 *  org.springframework.context.annotation.Configuration
 */
package com.seer.rds.config;

import javax.servlet.Servlet;
import org.mitre.dsmiley.httpproxy.ProxyServlet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ProxyServletConfig {
    private static final Logger log = LoggerFactory.getLogger(ProxyServletConfig.class);
    @Value(value="${proxy.webpage.servlet_url:/webpage/*}")
    private String servletUrl;
    @Value(value="${proxy.webpage.target_url:http://127.0.0.1:3000/}")
    private String targetUrl;

    @Bean
    public ServletRegistrationBean proxyServletRegistrationWabpage() {
        ServletRegistrationBean registrationBean = new ServletRegistrationBean((Servlet)new ProxyServlet(), new String[]{this.servletUrl});
        registrationBean.setName("webpage");
        registrationBean.addInitParameter("targetUri", this.targetUrl);
        registrationBean.addInitParameter("log", "false");
        log.info("ProxyServletConfig created successfully...");
        return registrationBean;
    }
}

