/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.OkHttpConfig
 *  com.seer.rds.config.OkHttpConfig$TrustAllHostnameVerifier
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.config.configview.operator.RequestTimeOutConfig
 *  okhttp3.ConnectionPool
 *  okhttp3.OkHttpClient
 *  okhttp3.OkHttpClient$Builder
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.context.annotation.Bean
 *  org.springframework.context.annotation.Configuration
 */
package com.seer.rds.config;

import com.seer.rds.config.OkHttpConfig;
import com.seer.rds.config.PropConfig;
import com.seer.rds.config.configview.operator.RequestTimeOutConfig;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.concurrent.TimeUnit;
import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import okhttp3.ConnectionPool;
import okhttp3.OkHttpClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OkHttpConfig {
    private static final Logger log = LoggerFactory.getLogger(OkHttpConfig.class);
    @Value(value="${rds.okHttpMaxPoolIdleSize:100}")
    private int okHttpMaxPoolIdleSize;
    @Value(value="${rds.okHttpKeepAliveSeconds:30}")
    private long okHttpKeepAliveSeconds;

    @Bean
    public X509TrustManager x509TrustManager() {
        return new /* Unavailable Anonymous Inner Class!! */;
    }

    @Bean
    public SSLSocketFactory sslSocketFactory() {
        try {
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, new TrustManager[]{this.x509TrustManager()}, new SecureRandom());
            return sslContext.getSocketFactory();
        }
        catch (NoSuchAlgorithmException e) {
            log.error("No such algorithmException", (Throwable)e);
        }
        catch (KeyManagementException e) {
            log.error("Key management exception", (Throwable)e);
        }
        return null;
    }

    @Bean
    public ConnectionPool pool() {
        return new ConnectionPool(this.okHttpMaxPoolIdleSize, this.okHttpKeepAliveSeconds, TimeUnit.SECONDS);
    }

    @Bean
    public OkHttpClient okHttpClient() {
        RequestTimeOutConfig timeOut = PropConfig.getTimeOut();
        return new OkHttpClient.Builder().sslSocketFactory(this.sslSocketFactory(), this.x509TrustManager()).hostnameVerifier((HostnameVerifier)new TrustAllHostnameVerifier()).retryOnConnectionFailure(true).connectionPool(this.pool()).connectTimeout((long)timeOut.getHttpConnectTimeout(), TimeUnit.MILLISECONDS).readTimeout((long)timeOut.getHttpReadTimeout(), TimeUnit.MILLISECONDS).writeTimeout((long)timeOut.getHttpWriteTimeout(), TimeUnit.MILLISECONDS).build();
    }
}

