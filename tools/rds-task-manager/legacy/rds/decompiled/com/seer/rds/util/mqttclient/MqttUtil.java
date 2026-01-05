/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.config.configview.MqttConfig
 *  com.seer.rds.config.configview.MqttConfigView
 *  com.seer.rds.util.mqttclient.MqttClientBuilder
 *  com.seer.rds.util.mqttclient.MqttUtil
 *  com.seer.rds.vo.response.MqttSubscribeVo
 *  com.seer.rds.web.config.ConfigFileController
 *  org.apache.commons.lang3.StringUtils
 *  org.eclipse.paho.client.mqttv3.MqttCallback
 *  org.eclipse.paho.client.mqttv3.MqttClient
 *  org.eclipse.paho.client.mqttv3.MqttConnectOptions
 *  org.eclipse.paho.client.mqttv3.MqttException
 *  org.eclipse.paho.client.mqttv3.MqttMessage
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util.mqttclient;

import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.config.configview.MqttConfig;
import com.seer.rds.config.configview.MqttConfigView;
import com.seer.rds.util.mqttclient.MqttClientBuilder;
import com.seer.rds.vo.response.MqttSubscribeVo;
import com.seer.rds.web.config.ConfigFileController;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.lang3.StringUtils;
import org.eclipse.paho.client.mqttv3.MqttCallback;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class MqttUtil {
    private static final Logger log = LoggerFactory.getLogger(MqttUtil.class);
    private static final CommonConfig commonConfig = ConfigFileController.commonConfig;
    private static final MqttConfigView mqttConfigView = commonConfig.getMqttConfigView();
    private static ConcurrentHashMap<String, String> subscribeMap = new ConcurrentHashMap();

    public static void syncPublish(String content) throws MqttException {
        MqttConfig pubConfig = mqttConfigView.getPubConfig();
        List topics = pubConfig.getTopics();
        MqttUtil.doPublish((List)topics, (String)content, (MqttConfig)pubConfig);
    }

    public static void syncPublish(String topic, String content) throws MqttException {
        MqttConfig pubConfig = mqttConfigView.getPubConfig();
        MqttUtil.doPublish(Collections.singletonList(topic), (String)content, (MqttConfig)pubConfig);
    }

    public static MqttSubscribeVo syncSubscribe() throws MqttException {
        MqttConfig subConfig = mqttConfigView.getSubConfig();
        String topic = (String)subConfig.getTopics().get(0);
        return MqttUtil.doSubscribe((String)topic, (MqttConfig)subConfig);
    }

    public static MqttSubscribeVo syncSubscribe(String topic) throws MqttException {
        MqttConfig subConfig = mqttConfigView.getSubConfig();
        return MqttUtil.doSubscribe((String)topic, (MqttConfig)subConfig);
    }

    public static MqttConnectOptions getConnOptions(MqttConfig config) {
        MqttConnectOptions options = new MqttConnectOptions();
        String userName = config.getUsername();
        String password = config.getPassword();
        String willMsg = config.getWillMsg();
        String willTopic = config.getWillTopic();
        if (!StringUtils.isEmpty((CharSequence)userName)) {
            options.setUserName(userName);
            options.setPassword(password.toCharArray());
        }
        options.setCleanSession(config.getCleanSession().booleanValue());
        options.setConnectionTimeout(config.getConnectionTimeout().intValue());
        options.setKeepAliveInterval(config.getKeepAliveInterval().intValue());
        options.setAutomaticReconnect(config.getAutomaticReconnect().booleanValue());
        if (!StringUtils.isEmpty((CharSequence)willMsg)) {
            options.setWill(willTopic, willMsg.getBytes(), config.getQos().intValue(), config.getRetained().booleanValue());
        }
        return options;
    }

    private static void doPublish(List<String> topics, String content, MqttConfig pubConfig) throws MqttException {
        MqttClient mqttClient = MqttClientBuilder.getMqttPubClient();
        if (!mqttClient.isConnected()) {
            MqttConnectOptions pubOptions = MqttUtil.getConnOptions((MqttConfig)pubConfig);
            mqttClient.connect(pubOptions);
        }
        MqttMessage message = new MqttMessage(content.getBytes(StandardCharsets.UTF_8));
        message.setQos(pubConfig.getQos().intValue());
        message.setRetained(pubConfig.getRetained().booleanValue());
        for (String topic : topics) {
            mqttClient.publish(topic, message);
        }
    }

    private static MqttSubscribeVo doSubscribe(String topic, MqttConfig subConfig) throws MqttException {
        MqttClient mqttClient = MqttClientBuilder.getMqttSubClient();
        if (!mqttClient.isConnected()) {
            MqttConnectOptions subOptions = MqttUtil.getConnOptions((MqttConfig)subConfig);
            mqttClient.connect(subOptions);
        }
        if (null == subscribeMap.get(topic)) {
            mqttClient.setCallback((MqttCallback)new /* Unavailable Anonymous Inner Class!! */);
            mqttClient.subscribe(topic);
        }
        MqttSubscribeVo retVo = new MqttSubscribeVo();
        retVo.setTopic(topic);
        retVo.setContent(StringUtils.isEmpty((CharSequence)((CharSequence)subscribeMap.get(topic))) ? null : (String)subscribeMap.get(topic));
        subscribeMap.put(topic, "");
        return retVo;
    }
}

