/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.OpcUaConfig
 *  com.seer.rds.util.opc.KeyStoreLoader
 *  com.seer.rds.util.opc.OpcUaClientBuilder
 *  javax.annotation.PostConstruct
 *  org.apache.commons.lang3.StringUtils
 *  org.bouncycastle.jce.provider.BouncyCastleProvider
 *  org.eclipse.milo.opcua.sdk.client.OpcUaClient
 *  org.eclipse.milo.opcua.sdk.client.api.config.OpcUaClientConfig
 *  org.eclipse.milo.opcua.sdk.client.api.config.OpcUaClientConfigBuilder
 *  org.eclipse.milo.opcua.sdk.client.api.identity.AnonymousProvider
 *  org.eclipse.milo.opcua.sdk.client.api.identity.IdentityProvider
 *  org.eclipse.milo.opcua.sdk.client.api.identity.UsernameProvider
 *  org.eclipse.milo.opcua.stack.client.DiscoveryClient
 *  org.eclipse.milo.opcua.stack.core.security.SecurityPolicy
 *  org.eclipse.milo.opcua.stack.core.types.builtin.LocalizedText
 *  org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.Unsigned
 *  org.eclipse.milo.opcua.stack.core.types.structured.EndpointDescription
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.util.opc;

import com.seer.rds.config.OpcUaConfig;
import com.seer.rds.util.opc.KeyStoreLoader;
import java.security.Provider;
import java.security.Security;
import java.util.List;
import javax.annotation.PostConstruct;
import org.apache.commons.lang3.StringUtils;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.eclipse.milo.opcua.sdk.client.OpcUaClient;
import org.eclipse.milo.opcua.sdk.client.api.config.OpcUaClientConfig;
import org.eclipse.milo.opcua.sdk.client.api.config.OpcUaClientConfigBuilder;
import org.eclipse.milo.opcua.sdk.client.api.identity.AnonymousProvider;
import org.eclipse.milo.opcua.sdk.client.api.identity.IdentityProvider;
import org.eclipse.milo.opcua.sdk.client.api.identity.UsernameProvider;
import org.eclipse.milo.opcua.stack.client.DiscoveryClient;
import org.eclipse.milo.opcua.stack.core.security.SecurityPolicy;
import org.eclipse.milo.opcua.stack.core.types.builtin.LocalizedText;
import org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.Unsigned;
import org.eclipse.milo.opcua.stack.core.types.structured.EndpointDescription;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class OpcUaClientBuilder {
    private static final Logger log = LoggerFactory.getLogger(OpcUaClientBuilder.class);
    public static OpcUaClient opcUaClient;
    @Autowired
    private OpcUaConfig opcUaConfig;

    @PostConstruct
    public void createClient() {
        try {
            List endpoints;
            if (!this.opcUaConfig.getEnable().booleanValue()) {
                log.info("Opc\u5ba2\u6237\u7aef\u672a\u542f\u7528\uff01");
                return;
            }
            KeyStoreLoader loader = null;
            SecurityPolicy securityPolicy = SecurityPolicy.None;
            if (this.opcUaConfig.getUseSecurityPolicy().booleanValue()) {
                String securityPolicyValue = this.opcUaConfig.getSecurityPolicy();
                if (StringUtils.isEmpty((CharSequence)securityPolicyValue)) {
                    log.error("\u7cfb\u7edf\u672a\u6307\u5b9a\u5b89\u5168\u7b56\u7565\uff0copc\u5ba2\u6237\u7aef\u521d\u59cb\u5316\u5931\u8d25\uff01");
                    return;
                }
                String keyStorePath = this.opcUaConfig.getKeyStore();
                if (StringUtils.isEmpty((CharSequence)keyStorePath)) {
                    log.error("\u7cfb\u7edf\u672a\u6307\u5b9a\u8bc1\u4e66\u8def\u5f84\uff0copc\u5ba2\u6237\u7aef\u521d\u59cb\u5316\u5931\u8d25\uff01");
                    return;
                }
                securityPolicy = SecurityPolicy.valueOf((String)securityPolicyValue);
                loader = new KeyStoreLoader().load(this.opcUaConfig);
            }
            try {
                endpoints = (List)DiscoveryClient.getEndpoints((String)this.opcUaConfig.getOpcuaEndpointUrl()).get();
            }
            catch (Throwable ex) {
                Object discoveryUrl = this.opcUaConfig.getOpcuaEndpointUrl();
                if (!((String)discoveryUrl).endsWith("/")) {
                    discoveryUrl = (String)discoveryUrl + "/";
                }
                discoveryUrl = (String)discoveryUrl + "discovery";
                log.info("\u5f00\u59cb\u8fde\u63a5 URL: {}", discoveryUrl);
                endpoints = (List)DiscoveryClient.getEndpoints((String)discoveryUrl).get();
            }
            SecurityPolicy finalSecurityPolicy = securityPolicy;
            EndpointDescription endpoint = endpoints.stream().filter(e -> e.getSecurityPolicyUri().equals(finalSecurityPolicy.getUri())).findFirst().orElseThrow(() -> new Exception("\u6ca1\u6709\u8fde\u63a5\u4e0a\u7aef\u70b9"));
            log.info("\u4f7f\u7528\u7aef\u70b9: {} [{}/{}]", new Object[]{endpoint.getEndpointUrl(), securityPolicy, endpoint.getSecurityMode()});
            OpcUaClientConfigBuilder configBuilder = OpcUaClientConfig.builder().setApplicationName(LocalizedText.english((String)"seer rds opc-ua client")).setApplicationUri(this.opcUaConfig.getApplicationUri()).setEndpoint(endpoint).setRequestTimeout(Unsigned.uint((int)5000));
            if (this.opcUaConfig.getUseSecurityPolicy().booleanValue()) {
                configBuilder = configBuilder.setCertificate(loader.getClientCertificate()).setKeyPair(loader.getClientKeyPair());
            }
            configBuilder = this.opcUaConfig.getIsAnonymousConnect() != false ? configBuilder.setIdentityProvider((IdentityProvider)new AnonymousProvider()) : configBuilder.setIdentityProvider((IdentityProvider)new UsernameProvider(this.opcUaConfig.getServerUsername(), this.opcUaConfig.getServerPassword()));
            opcUaClient = OpcUaClient.create((OpcUaClientConfig)configBuilder.build());
        }
        catch (Exception e2) {
            log.error("\u521b\u5efaopc ua\u5ba2\u6237\u7aef\u5931\u8d25" + e2.getMessage());
        }
    }

    static {
        Security.addProvider((Provider)new BouncyCastleProvider());
    }
}

