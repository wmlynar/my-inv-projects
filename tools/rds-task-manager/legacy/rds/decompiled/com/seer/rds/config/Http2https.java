/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.Http2https
 *  com.seer.rds.config.Http2https$1
 *  org.apache.catalina.connector.Connector
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.tomcat.util.descriptor.web.SecurityCollection
 *  org.apache.tomcat.util.descriptor.web.SecurityConstraint
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.boot.web.embedded.tomcat.TomcatConnectorCustomizer
 *  org.springframework.boot.web.embedded.tomcat.TomcatContextCustomizer
 *  org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory
 *  org.springframework.context.annotation.Bean
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.http.HttpMethod
 */
package com.seer.rds.config;

import com.seer.rds.config.Http2https;
import org.apache.catalina.connector.Connector;
import org.apache.commons.lang3.StringUtils;
import org.apache.tomcat.util.descriptor.web.SecurityCollection;
import org.apache.tomcat.util.descriptor.web.SecurityConstraint;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.embedded.tomcat.TomcatConnectorCustomizer;
import org.springframework.boot.web.embedded.tomcat.TomcatContextCustomizer;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;

@Configuration
public class Http2https {
    @Value(value="${server.port: 8090}")
    private int sslPort;
    @Value(value="${server.http-port: 8080}")
    private int httpPort;
    @Value(value="${server.ssl.enabled: false}")
    private boolean httpsEnabled;
    @Value(value="${rds.enableCors: false}")
    private Boolean enableCors;
    @Value(value="${server.address:}")
    private String address;

    @Bean
    TomcatServletWebServerFactory tomcatServletWebServerFactory() {
        1 factory = new /* Unavailable Anonymous Inner Class!! */;
        factory.addConnectorCustomizers(new TomcatConnectorCustomizer[]{connector -> connector.setAllowTrace(true)});
        factory.addContextCustomizers(new TomcatContextCustomizer[]{context -> {
            SecurityConstraint constraint = new SecurityConstraint();
            SecurityCollection securityCollection = new SecurityCollection();
            securityCollection.setName("restricted_methods");
            securityCollection.addPattern("/*");
            securityCollection.addMethod(HttpMethod.TRACE.toString());
            if (!this.enableCors.booleanValue()) {
                securityCollection.addMethod(HttpMethod.OPTIONS.toString());
            }
            securityCollection.addMethod(HttpMethod.DELETE.toString());
            constraint.addCollection(securityCollection);
            constraint.setAuthConstraint(true);
            context.addConstraint(constraint);
        }});
        factory.addAdditionalTomcatConnectors(new Connector[]{this.createTomcatConnector()});
        return factory;
    }

    private Connector createTomcatConnector() {
        Connector connector = new Connector("org.apache.coyote.http11.Http11NioProtocol");
        connector.setScheme("http");
        if (StringUtils.isNotEmpty((CharSequence)this.address)) {
            connector.setProperty("address", this.address);
        }
        connector.setPort(this.httpPort);
        connector.setSecure(false);
        connector.setRedirectPort(this.sslPort);
        connector.setAllowTrace(true);
        return connector;
    }

    @Bean
    public TomcatContextCustomizer tomcatContextCustomizer() {
        return new /* Unavailable Anonymous Inner Class!! */;
    }
}

