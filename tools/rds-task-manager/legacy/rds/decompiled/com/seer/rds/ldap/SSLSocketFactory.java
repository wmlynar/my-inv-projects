/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.ldap.SSLSocketFactory
 *  com.seer.rds.ldap.TrustManager
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.ldap;

import com.seer.rds.ldap.TrustManager;
import java.io.IOException;
import java.net.InetAddress;
import java.net.Socket;
import java.security.SecureRandom;
import javax.net.SocketFactory;
import javax.net.ssl.SSLContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SSLSocketFactory
extends javax.net.ssl.SSLSocketFactory {
    private static final Logger log = LoggerFactory.getLogger(SSLSocketFactory.class);
    private javax.net.ssl.SSLSocketFactory factory;

    public SSLSocketFactory() {
        try {
            SSLContext sslcontext = SSLContext.getInstance("TLS");
            sslcontext.init(null, new javax.net.ssl.TrustManager[]{new TrustManager()}, new SecureRandom());
            this.factory = sslcontext.getSocketFactory();
        }
        catch (Exception ex) {
            log.error("SSLSocketFactory error", (Throwable)ex);
        }
    }

    public static SocketFactory getDefault() {
        return new SSLSocketFactory();
    }

    @Override
    public Socket createSocket(Socket socket, String s, int i, boolean flag) throws IOException {
        return this.factory.createSocket(socket, s, i, flag);
    }

    @Override
    public Socket createSocket(InetAddress inaddr, int i, InetAddress inaddr1, int j) throws IOException {
        return this.factory.createSocket(inaddr, i, inaddr1, j);
    }

    @Override
    public Socket createSocket(InetAddress inaddr, int i) throws IOException {
        return this.factory.createSocket(inaddr, i);
    }

    @Override
    public Socket createSocket(String s, int i, InetAddress inaddr, int j) throws IOException {
        return this.factory.createSocket(s, i, inaddr, j);
    }

    @Override
    public Socket createSocket(String s, int i) throws IOException {
        return this.factory.createSocket(s, i);
    }

    @Override
    public String[] getDefaultCipherSuites() {
        return this.factory.getSupportedCipherSuites();
    }

    @Override
    public String[] getSupportedCipherSuites() {
        return this.factory.getSupportedCipherSuites();
    }
}

