/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.MqttConfig
 *  com.seer.rds.config.configview.MqttConfigView
 */
package com.seer.rds.config.configview;

import com.seer.rds.config.configview.MqttConfig;
import java.util.ArrayList;
import java.util.List;

public class MqttConfigView {
    private Boolean enable = false;
    List<String> subPubTopics = new ArrayList<String>(List.of("Examples/1/123"));
    private MqttConfig subConfig = new MqttConfig("tcp://broker.emqx.io:1883", this.subPubTopics, Integer.valueOf(2), "RDS-Pub", null, null, Boolean.valueOf(false), Integer.valueOf(30), Integer.valueOf(60), Boolean.valueOf(true), Boolean.valueOf(false));
    private MqttConfig pubConfig = new MqttConfig("tcp://broker.emqx.io:1883", this.subPubTopics, Integer.valueOf(2), "RDS-Sub", null, null, Boolean.valueOf(false), Integer.valueOf(30), Integer.valueOf(60), Boolean.valueOf(true), null, "Examples1", Boolean.valueOf(false));

    public Boolean getEnable() {
        return this.enable;
    }

    public List<String> getSubPubTopics() {
        return this.subPubTopics;
    }

    public MqttConfig getSubConfig() {
        return this.subConfig;
    }

    public MqttConfig getPubConfig() {
        return this.pubConfig;
    }

    public void setEnable(Boolean enable) {
        this.enable = enable;
    }

    public void setSubPubTopics(List<String> subPubTopics) {
        this.subPubTopics = subPubTopics;
    }

    public void setSubConfig(MqttConfig subConfig) {
        this.subConfig = subConfig;
    }

    public void setPubConfig(MqttConfig pubConfig) {
        this.pubConfig = pubConfig;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof MqttConfigView)) {
            return false;
        }
        MqttConfigView other = (MqttConfigView)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$enable = this.getEnable();
        Boolean other$enable = other.getEnable();
        if (this$enable == null ? other$enable != null : !((Object)this$enable).equals(other$enable)) {
            return false;
        }
        List this$subPubTopics = this.getSubPubTopics();
        List other$subPubTopics = other.getSubPubTopics();
        if (this$subPubTopics == null ? other$subPubTopics != null : !((Object)this$subPubTopics).equals(other$subPubTopics)) {
            return false;
        }
        MqttConfig this$subConfig = this.getSubConfig();
        MqttConfig other$subConfig = other.getSubConfig();
        if (this$subConfig == null ? other$subConfig != null : !this$subConfig.equals(other$subConfig)) {
            return false;
        }
        MqttConfig this$pubConfig = this.getPubConfig();
        MqttConfig other$pubConfig = other.getPubConfig();
        return !(this$pubConfig == null ? other$pubConfig != null : !this$pubConfig.equals(other$pubConfig));
    }

    protected boolean canEqual(Object other) {
        return other instanceof MqttConfigView;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $enable = this.getEnable();
        result = result * 59 + ($enable == null ? 43 : ((Object)$enable).hashCode());
        List $subPubTopics = this.getSubPubTopics();
        result = result * 59 + ($subPubTopics == null ? 43 : ((Object)$subPubTopics).hashCode());
        MqttConfig $subConfig = this.getSubConfig();
        result = result * 59 + ($subConfig == null ? 43 : $subConfig.hashCode());
        MqttConfig $pubConfig = this.getPubConfig();
        result = result * 59 + ($pubConfig == null ? 43 : $pubConfig.hashCode());
        return result;
    }

    public String toString() {
        return "MqttConfigView(enable=" + this.getEnable() + ", subPubTopics=" + this.getSubPubTopics() + ", subConfig=" + this.getSubConfig() + ", pubConfig=" + this.getPubConfig() + ")";
    }
}

