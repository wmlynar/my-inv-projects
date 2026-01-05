/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.RDSApplication
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.boot.SpringApplication
 *  org.springframework.boot.autoconfigure.SpringBootApplication
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.data.jpa.repository.config.EnableJpaAuditing
 */
package com.seer.rds;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration
@SpringBootApplication
@EnableJpaAuditing
public class RDSApplication {
    private static final Logger log = LoggerFactory.getLogger(RDSApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(RDSApplication.class, (String[])args);
        System.out.println("RDS Application Started Successfully..");
    }
}

