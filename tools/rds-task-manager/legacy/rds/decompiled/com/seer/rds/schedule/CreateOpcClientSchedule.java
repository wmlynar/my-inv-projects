/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.OpcUaConfig
 *  com.seer.rds.schedule.CreateOpcClientSchedule
 *  com.seer.rds.util.opc.OpcUaClientBuilder
 *  org.eclipse.milo.opcua.sdk.client.OpcUaClient
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.scheduling.annotation.EnableScheduling
 *  org.springframework.scheduling.annotation.Scheduled
 */
package com.seer.rds.schedule;

import com.seer.rds.config.OpcUaConfig;
import com.seer.rds.util.opc.OpcUaClientBuilder;
import org.eclipse.milo.opcua.sdk.client.OpcUaClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
public class CreateOpcClientSchedule {
    private static final Logger log = LoggerFactory.getLogger(CreateOpcClientSchedule.class);
    @Autowired
    private OpcUaClientBuilder opcUaClientBuilder;
    @Autowired
    private OpcUaConfig opcUaConfig;

    @Scheduled(fixedDelay=3000L)
    public void createOpcClient() {
        if (!this.opcUaConfig.getEnable().booleanValue()) {
            return;
        }
        OpcUaClient opcUaClient = OpcUaClientBuilder.opcUaClient;
        if (null != opcUaClient) {
            return;
        }
        this.opcUaClientBuilder.createClient();
    }
}

