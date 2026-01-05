/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.RestTemplateConfig
 *  org.springframework.context.annotation.Bean
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.http.client.ClientHttpRequestFactory
 *  org.springframework.http.client.SimpleClientHttpRequestFactory
 *  org.springframework.web.client.RestTemplate
 */
package com.seer.rds.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {
    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(6000);
        factory.setReadTimeout(5000);
        return new RestTemplate((ClientHttpRequestFactory)factory);
    }
}

