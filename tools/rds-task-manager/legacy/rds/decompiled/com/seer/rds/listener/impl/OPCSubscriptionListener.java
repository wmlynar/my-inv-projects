/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.listener.impl.OPCSubscriptionListener
 *  com.seer.rds.util.opc.OpcUaOperationUtil
 *  org.eclipse.milo.opcua.sdk.client.api.subscriptions.UaSubscription
 *  org.eclipse.milo.opcua.sdk.client.api.subscriptions.UaSubscription$NotificationListener
 *  org.eclipse.milo.opcua.stack.core.types.builtin.StatusCode
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.listener.impl;

import com.seer.rds.util.opc.OpcUaOperationUtil;
import org.eclipse.milo.opcua.sdk.client.api.subscriptions.UaSubscription;
import org.eclipse.milo.opcua.stack.core.types.builtin.StatusCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class OPCSubscriptionListener
implements UaSubscription.NotificationListener {
    private static final Logger log = LoggerFactory.getLogger(OPCSubscriptionListener.class);
    private final Integer namespaceIndex;
    private final Object identifier;

    public OPCSubscriptionListener(Integer namespaceIndex, String identifier) {
        this.namespaceIndex = namespaceIndex;
        this.identifier = identifier;
    }

    public OPCSubscriptionListener(Integer namespaceIndex, int identifier) {
        this.namespaceIndex = namespaceIndex;
        this.identifier = identifier;
    }

    public void onSubscriptionTransferFailed(UaSubscription subscription, StatusCode statusCode) {
        OpcUaOperationUtil.subscriptionList.clear();
        long retryInterval = 1000L;
        long maxRetryInterval = 60000L;
        if (statusCode.isBad()) {
            while (true) {
                log.error("OPC \u8ba2\u9605\u5931\u8d25\uff0c\u91cd\u8fde\u4e2d\uff0cidx:{}, id:{},statusCode:{}", new Object[]{this.namespaceIndex, this.identifier, statusCode.getValue()});
                UaSubscription uaSubscription = this.identifier instanceof String ? OpcUaOperationUtil.createSubscriptionAndCallback((Integer)this.namespaceIndex, (String)((String)this.identifier)) : OpcUaOperationUtil.createSubscriptionAndCallback((Integer)this.namespaceIndex, (int)((Integer)this.identifier));
                if (null != uaSubscription) break;
                try {
                    Thread.sleep(retryInterval);
                }
                catch (InterruptedException e) {
                    log.error("sleep error");
                }
                retryInterval = Math.min(retryInterval * 2L, maxRetryInterval);
            }
        }
    }
}

