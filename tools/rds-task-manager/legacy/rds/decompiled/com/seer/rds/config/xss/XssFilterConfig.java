/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.xss.XssFilter
 *  com.seer.rds.config.xss.XssFilterConfig
 *  javax.servlet.Filter
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.boot.web.servlet.FilterRegistrationBean
 *  org.springframework.context.annotation.Bean
 *  org.springframework.context.annotation.Configuration
 */
package com.seer.rds.config.xss;

import com.seer.rds.config.xss.XssFilter;
import javax.servlet.Filter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class XssFilterConfig {
    @Autowired
    private XssFilter xssFilter;

    @Bean
    public FilterRegistrationBean xssAttackFilter() {
        FilterRegistrationBean registration = new FilterRegistrationBean();
        registration.setFilter((Filter)this.xssFilter);
        registration.addUrlPatterns(new String[]{"/*"});
        registration.setName("xssFilter");
        registration.setOrder(1);
        return registration;
    }
}

