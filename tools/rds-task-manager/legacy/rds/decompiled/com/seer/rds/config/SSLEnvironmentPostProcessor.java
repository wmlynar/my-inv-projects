/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.SSLEnvironmentPostProcessor
 *  org.bouncycastle.jce.provider.BouncyCastleProvider
 *  org.springframework.boot.SpringApplication
 *  org.springframework.boot.env.EnvironmentPostProcessor
 *  org.springframework.core.env.ConfigurableEnvironment
 */
package com.seer.rds.config;

import java.security.Provider;
import java.security.Security;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;

public class SSLEnvironmentPostProcessor
implements EnvironmentPostProcessor {
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        boolean httpsEnabled = Boolean.valueOf(environment.getProperty("server.ssl.enabled"));
        if (Security.getProvider("BC") == null && Boolean.TRUE.equals(httpsEnabled)) {
            Security.insertProviderAt((Provider)new BouncyCastleProvider(), 1);
        }
    }
}

