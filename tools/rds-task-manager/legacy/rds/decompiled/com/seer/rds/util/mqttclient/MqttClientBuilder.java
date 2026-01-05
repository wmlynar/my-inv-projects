/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.config.configview.MqttConfig
 *  com.seer.rds.config.configview.MqttConfigView
 *  com.seer.rds.util.mqttclient.MqttClientBuilder
 *  com.seer.rds.util.mqttclient.MqttUtil
 *  com.seer.rds.web.config.ConfigFileController
 *  javax.annotation.PostConstruct
 *  org.eclipse.paho.client.mqttv3.MqttClient
 *  org.eclipse.paho.client.mqttv3.MqttClientPersistence
 *  org.eclipse.paho.client.mqttv3.MqttConnectOptions
 *  org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.util.mqttclient;

import com.seer.rds.config.PropConfig;
import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.config.configview.MqttConfig;
import com.seer.rds.config.configview.MqttConfigView;
import com.seer.rds.util.mqttclient.MqttUtil;
import com.seer.rds.web.config.ConfigFileController;
import javax.annotation.PostConstruct;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttClientPersistence;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class MqttClientBuilder {
    private static final Logger log = LoggerFactory.getLogger(MqttClientBuilder.class);
    @Autowired
    private ConfigFileController configFileController;
    public static MqttClient mqttPubClient;
    public static MqttClient mqttSubClient;

    public static MqttClient getMqttPubClient() {
        return mqttPubClient;
    }

    public static MqttClient getMqttSubClient() {
        return mqttSubClient;
    }

    @PostConstruct
    public void createMqttClientAndConnect() {
        try {
            if (!PropConfig.ifEnableMqtt().booleanValue()) {
                log.info("MQTT \u5ba2\u6237\u7aef\u672a\u542f\u7528\uff01");
                return;
            }
            CommonConfig commonConfig = ConfigFileController.commonConfig;
            if (null == commonConfig) {
                log.info("MQTT \u5ba2\u6237\u7aef\u542f\u7528\u5931\u8d25\uff1a\u672a\u52a0\u8f7d\u6b63\u786e\u5230 biz \u914d\u7f6e\u6587\u4ef6\u3002");
                return;
            }
            MqttConfigView mqttConfigView = commonConfig.getMqttConfigView();
            MqttConfig pubConfig = mqttConfigView.getPubConfig();
            MqttConfig subConfig = mqttConfigView.getSubConfig();
            MemoryPersistence persistence = new MemoryPersistence();
            mqttPubClient = new MqttClient(pubConfig.getBroker(), pubConfig.getClientId(), (MqttClientPersistence)persistence);
            mqttSubClient = new MqttClient(subConfig.getBroker(), subConfig.getClientId(), (MqttClientPersistence)persistence);
            MqttConnectOptions pubOptions = MqttUtil.getConnOptions((MqttConfig)pubConfig);
            MqttConnectOptions subOptions = MqttUtil.getConnOptions((MqttConfig)subConfig);
            mqttPubClient.connect(pubOptions);
            mqttSubClient.connect(subOptions);
        }
        catch (Exception e) {
            log.error("\u521b\u5efa/\u8fde\u63a5 MQTT \u5ba2\u6237\u7aef\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5 application-biz.yml \u6587\u4ef6\u914d\u7f6e\u662f\u5426\u6b63\u786e\u3002" + e.getMessage());
        }
    }
}

