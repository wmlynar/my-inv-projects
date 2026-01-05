/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.lark.oapi.Client
 *  com.seer.rds.util.feiShuApi.FeiShuClient
 */
package com.seer.rds.util.feiShuApi;

import com.lark.oapi.Client;

public class FeiShuClient {
    private static volatile Client clientInstance = null;

    private FeiShuClient() {
    }

    public static Client getClient() {
        clientInstance = Client.newBuilder((String)"cli_a6ab76c54fbe500c", (String)"OS3AfsODz2aKn1mubiAhWcnBHEHV0yRP").build();
        return clientInstance;
    }
}

