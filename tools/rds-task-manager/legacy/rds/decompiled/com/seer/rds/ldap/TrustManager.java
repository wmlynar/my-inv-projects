/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.ldap.TrustManager
 */
package com.seer.rds.ldap;

import java.security.cert.X509Certificate;
import javax.net.ssl.X509TrustManager;

public class TrustManager
implements X509TrustManager {
    @Override
    public void checkClientTrusted(X509Certificate[] cert, String authType) {
    }

    @Override
    public void checkServerTrusted(X509Certificate[] cert, String authType) {
    }

    @Override
    public X509Certificate[] getAcceptedIssuers() {
        return new X509Certificate[0];
    }
}

