/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.MqttConfig
 */
package com.seer.rds.config.configview;

import java.util.List;

public class MqttConfig {
    private String broker;
    private List<String> topics;
    private Integer qos;
    private String clientId;
    private String username;
    private String password;
    private Boolean cleanSession;
    private Integer connectionTimeout;
    private Integer keepAliveInterval;
    private Boolean automaticReconnect;
    private String willMsg;
    private String willTopic;
    private Boolean retained;

    public MqttConfig() {
    }

    public MqttConfig(String broker, List<String> topics, Integer qos, String clientId, String username, String password, Boolean cleanSession, Integer connectionTimeout, Integer keepAliveInterval, Boolean automaticReconnect, Boolean retained) {
        this.broker = broker;
        this.topics = topics;
        this.qos = qos;
        this.clientId = clientId;
        this.username = username;
        this.password = password;
        this.cleanSession = cleanSession;
        this.connectionTimeout = connectionTimeout;
        this.keepAliveInterval = keepAliveInterval;
        this.automaticReconnect = automaticReconnect;
        this.retained = retained;
    }

    public MqttConfig(String broker, List<String> topics, Integer qos, String clientId, String username, String password, Boolean cleanSession, Integer connectionTimeout, Integer keepAliveInterval, Boolean automaticReconnect, String willMsg, String willTopic, Boolean retained) {
        this.broker = broker;
        this.topics = topics;
        this.qos = qos;
        this.clientId = clientId;
        this.username = username;
        this.password = password;
        this.cleanSession = cleanSession;
        this.connectionTimeout = connectionTimeout;
        this.keepAliveInterval = keepAliveInterval;
        this.automaticReconnect = automaticReconnect;
        this.willMsg = willMsg;
        this.willTopic = willTopic;
        this.retained = retained;
    }

    public String getBroker() {
        return this.broker;
    }

    public List<String> getTopics() {
        return this.topics;
    }

    public Integer getQos() {
        return this.qos;
    }

    public String getClientId() {
        return this.clientId;
    }

    public String getUsername() {
        return this.username;
    }

    public String getPassword() {
        return this.password;
    }

    public Boolean getCleanSession() {
        return this.cleanSession;
    }

    public Integer getConnectionTimeout() {
        return this.connectionTimeout;
    }

    public Integer getKeepAliveInterval() {
        return this.keepAliveInterval;
    }

    public Boolean getAutomaticReconnect() {
        return this.automaticReconnect;
    }

    public String getWillMsg() {
        return this.willMsg;
    }

    public String getWillTopic() {
        return this.willTopic;
    }

    public Boolean getRetained() {
        return this.retained;
    }

    public void setBroker(String broker) {
        this.broker = broker;
    }

    public void setTopics(List<String> topics) {
        this.topics = topics;
    }

    public void setQos(Integer qos) {
        this.qos = qos;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setCleanSession(Boolean cleanSession) {
        this.cleanSession = cleanSession;
    }

    public void setConnectionTimeout(Integer connectionTimeout) {
        this.connectionTimeout = connectionTimeout;
    }

    public void setKeepAliveInterval(Integer keepAliveInterval) {
        this.keepAliveInterval = keepAliveInterval;
    }

    public void setAutomaticReconnect(Boolean automaticReconnect) {
        this.automaticReconnect = automaticReconnect;
    }

    public void setWillMsg(String willMsg) {
        this.willMsg = willMsg;
    }

    public void setWillTopic(String willTopic) {
        this.willTopic = willTopic;
    }

    public void setRetained(Boolean retained) {
        this.retained = retained;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof MqttConfig)) {
            return false;
        }
        MqttConfig other = (MqttConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$qos = this.getQos();
        Integer other$qos = other.getQos();
        if (this$qos == null ? other$qos != null : !((Object)this$qos).equals(other$qos)) {
            return false;
        }
        Boolean this$cleanSession = this.getCleanSession();
        Boolean other$cleanSession = other.getCleanSession();
        if (this$cleanSession == null ? other$cleanSession != null : !((Object)this$cleanSession).equals(other$cleanSession)) {
            return false;
        }
        Integer this$connectionTimeout = this.getConnectionTimeout();
        Integer other$connectionTimeout = other.getConnectionTimeout();
        if (this$connectionTimeout == null ? other$connectionTimeout != null : !((Object)this$connectionTimeout).equals(other$connectionTimeout)) {
            return false;
        }
        Integer this$keepAliveInterval = this.getKeepAliveInterval();
        Integer other$keepAliveInterval = other.getKeepAliveInterval();
        if (this$keepAliveInterval == null ? other$keepAliveInterval != null : !((Object)this$keepAliveInterval).equals(other$keepAliveInterval)) {
            return false;
        }
        Boolean this$automaticReconnect = this.getAutomaticReconnect();
        Boolean other$automaticReconnect = other.getAutomaticReconnect();
        if (this$automaticReconnect == null ? other$automaticReconnect != null : !((Object)this$automaticReconnect).equals(other$automaticReconnect)) {
            return false;
        }
        Boolean this$retained = this.getRetained();
        Boolean other$retained = other.getRetained();
        if (this$retained == null ? other$retained != null : !((Object)this$retained).equals(other$retained)) {
            return false;
        }
        String this$broker = this.getBroker();
        String other$broker = other.getBroker();
        if (this$broker == null ? other$broker != null : !this$broker.equals(other$broker)) {
            return false;
        }
        List this$topics = this.getTopics();
        List other$topics = other.getTopics();
        if (this$topics == null ? other$topics != null : !((Object)this$topics).equals(other$topics)) {
            return false;
        }
        String this$clientId = this.getClientId();
        String other$clientId = other.getClientId();
        if (this$clientId == null ? other$clientId != null : !this$clientId.equals(other$clientId)) {
            return false;
        }
        String this$username = this.getUsername();
        String other$username = other.getUsername();
        if (this$username == null ? other$username != null : !this$username.equals(other$username)) {
            return false;
        }
        String this$password = this.getPassword();
        String other$password = other.getPassword();
        if (this$password == null ? other$password != null : !this$password.equals(other$password)) {
            return false;
        }
        String this$willMsg = this.getWillMsg();
        String other$willMsg = other.getWillMsg();
        if (this$willMsg == null ? other$willMsg != null : !this$willMsg.equals(other$willMsg)) {
            return false;
        }
        String this$willTopic = this.getWillTopic();
        String other$willTopic = other.getWillTopic();
        return !(this$willTopic == null ? other$willTopic != null : !this$willTopic.equals(other$willTopic));
    }

    protected boolean canEqual(Object other) {
        return other instanceof MqttConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $qos = this.getQos();
        result = result * 59 + ($qos == null ? 43 : ((Object)$qos).hashCode());
        Boolean $cleanSession = this.getCleanSession();
        result = result * 59 + ($cleanSession == null ? 43 : ((Object)$cleanSession).hashCode());
        Integer $connectionTimeout = this.getConnectionTimeout();
        result = result * 59 + ($connectionTimeout == null ? 43 : ((Object)$connectionTimeout).hashCode());
        Integer $keepAliveInterval = this.getKeepAliveInterval();
        result = result * 59 + ($keepAliveInterval == null ? 43 : ((Object)$keepAliveInterval).hashCode());
        Boolean $automaticReconnect = this.getAutomaticReconnect();
        result = result * 59 + ($automaticReconnect == null ? 43 : ((Object)$automaticReconnect).hashCode());
        Boolean $retained = this.getRetained();
        result = result * 59 + ($retained == null ? 43 : ((Object)$retained).hashCode());
        String $broker = this.getBroker();
        result = result * 59 + ($broker == null ? 43 : $broker.hashCode());
        List $topics = this.getTopics();
        result = result * 59 + ($topics == null ? 43 : ((Object)$topics).hashCode());
        String $clientId = this.getClientId();
        result = result * 59 + ($clientId == null ? 43 : $clientId.hashCode());
        String $username = this.getUsername();
        result = result * 59 + ($username == null ? 43 : $username.hashCode());
        String $password = this.getPassword();
        result = result * 59 + ($password == null ? 43 : $password.hashCode());
        String $willMsg = this.getWillMsg();
        result = result * 59 + ($willMsg == null ? 43 : $willMsg.hashCode());
        String $willTopic = this.getWillTopic();
        result = result * 59 + ($willTopic == null ? 43 : $willTopic.hashCode());
        return result;
    }

    public String toString() {
        return "MqttConfig(broker=" + this.getBroker() + ", topics=" + this.getTopics() + ", qos=" + this.getQos() + ", clientId=" + this.getClientId() + ", username=" + this.getUsername() + ", password=" + this.getPassword() + ", cleanSession=" + this.getCleanSession() + ", connectionTimeout=" + this.getConnectionTimeout() + ", keepAliveInterval=" + this.getKeepAliveInterval() + ", automaticReconnect=" + this.getAutomaticReconnect() + ", willMsg=" + this.getWillMsg() + ", willTopic=" + this.getWillTopic() + ", retained=" + this.getRetained() + ")";
    }
}

