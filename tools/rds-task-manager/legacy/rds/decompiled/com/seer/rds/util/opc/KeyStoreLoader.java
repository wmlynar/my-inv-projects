/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.OpcUaConfig
 *  com.seer.rds.util.opc.KeyStoreLoader
 *  org.apache.commons.lang3.StringUtils
 *  org.eclipse.milo.opcua.sdk.server.util.HostnameUtil
 *  org.eclipse.milo.opcua.stack.core.util.SelfSignedCertificateBuilder
 *  org.eclipse.milo.opcua.stack.core.util.SelfSignedCertificateGenerator
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util.opc;

import com.seer.rds.config.OpcUaConfig;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Paths;
import java.security.Key;
import java.security.KeyPair;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.cert.X509Certificate;
import java.util.Enumeration;
import java.util.regex.Pattern;
import org.apache.commons.lang3.StringUtils;
import org.eclipse.milo.opcua.sdk.server.util.HostnameUtil;
import org.eclipse.milo.opcua.stack.core.util.SelfSignedCertificateBuilder;
import org.eclipse.milo.opcua.stack.core.util.SelfSignedCertificateGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class KeyStoreLoader {
    private static final Logger log = LoggerFactory.getLogger(KeyStoreLoader.class);
    private static final Pattern IP_ADDR_PATTERN = Pattern.compile("^(([01]?\\d\\d?|2[0-4]\\d|25[0-5])\\.){3}([01]?\\d\\d?|2[0-4]\\d|25[0-5])$");
    private X509Certificate clientCertificate;
    private KeyPair clientKeyPair;

    KeyStoreLoader load(OpcUaConfig opcUaConfig) throws Exception {
        String ALIAS = "";
        if (StringUtils.isNotEmpty((CharSequence)opcUaConfig.getAlias())) {
            ALIAS = opcUaConfig.getAlias();
        }
        KeyStore keyStore = KeyStore.getInstance(opcUaConfig.getKeyStoreType());
        log.info("Loading KeyStore at {}", (Object)opcUaConfig.getKeyStore());
        if (!Files.exists(Paths.get(opcUaConfig.getKeyStore(), new String[0]), new LinkOption[0])) {
            keyStore.load(null, opcUaConfig.getKeyStorePassword().toCharArray());
            KeyPair keyPair = SelfSignedCertificateGenerator.generateRsaKeyPair((int)2048);
            SelfSignedCertificateBuilder builder = new SelfSignedCertificateBuilder(keyPair).setCommonName("seer rds Client").setOrganization("seer").setOrganizationalUnit("dev").setLocalityName("SH").setStateName("SH").setCountryCode("ZH").setApplicationUri(opcUaConfig.getApplicationUri()).addDnsName("localhost").addIpAddress("127.0.0.1");
            for (String hostname : HostnameUtil.getHostnames((String)"0.0.0.0")) {
                if (IP_ADDR_PATTERN.matcher(hostname).matches()) {
                    builder.addIpAddress(hostname);
                    continue;
                }
                builder.addDnsName(hostname);
            }
            X509Certificate certificate = builder.build();
            keyStore.setKeyEntry(ALIAS, keyPair.getPrivate(), opcUaConfig.getKeyPassword().toCharArray(), new X509Certificate[]{certificate});
            try (FileOutputStream out = new FileOutputStream(opcUaConfig.getKeyStore());){
                keyStore.store(out, opcUaConfig.getKeyStorePassword().toCharArray());
            }
        }
        try (FileInputStream in = new FileInputStream(opcUaConfig.getKeyStore());){
            keyStore.load(in, opcUaConfig.getKeyStorePassword().toCharArray());
        }
        if (StringUtils.isEmpty((CharSequence)ALIAS)) {
            Enumeration<String> aliases = keyStore.aliases();
            while (aliases.hasMoreElements()) {
                String alias = aliases.nextElement();
                Key serverPrivateKey = keyStore.getKey(alias, opcUaConfig.getKeyPassword().toCharArray());
                if (!(serverPrivateKey instanceof PrivateKey)) continue;
                this.clientCertificate = (X509Certificate)keyStore.getCertificate(alias);
                PublicKey serverPublicKey = this.clientCertificate.getPublicKey();
                this.clientKeyPair = new KeyPair(serverPublicKey, (PrivateKey)serverPrivateKey);
                break;
            }
        } else {
            Key serverPrivateKey;
            String keyPasswd = opcUaConfig.getKeyPassword();
            if (StringUtils.isEmpty((CharSequence)keyPasswd)) {
                keyPasswd = opcUaConfig.getKeyStorePassword();
            }
            if ((serverPrivateKey = keyStore.getKey(ALIAS, keyPasswd.toCharArray())) instanceof PrivateKey) {
                this.clientCertificate = (X509Certificate)keyStore.getCertificate(ALIAS);
                PublicKey serverPublicKey = this.clientCertificate.getPublicKey();
                this.clientKeyPair = new KeyPair(serverPublicKey, (PrivateKey)serverPrivateKey);
            }
        }
        return this;
    }

    X509Certificate getClientCertificate() {
        return this.clientCertificate;
    }

    KeyPair getClientKeyPair() {
        return this.clientKeyPair;
    }
}

