/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.MqttSubscribeVo
 */
package com.seer.rds.vo.response;

public class MqttSubscribeVo {
    private String topic;
    private String content;

    public String getTopic() {
        return this.topic;
    }

    public String getContent() {
        return this.content;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof MqttSubscribeVo)) {
            return false;
        }
        MqttSubscribeVo other = (MqttSubscribeVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$topic = this.getTopic();
        String other$topic = other.getTopic();
        if (this$topic == null ? other$topic != null : !this$topic.equals(other$topic)) {
            return false;
        }
        String this$content = this.getContent();
        String other$content = other.getContent();
        return !(this$content == null ? other$content != null : !this$content.equals(other$content));
    }

    protected boolean canEqual(Object other) {
        return other instanceof MqttSubscribeVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $topic = this.getTopic();
        result = result * 59 + ($topic == null ? 43 : $topic.hashCode());
        String $content = this.getContent();
        result = result * 59 + ($content == null ? 43 : $content.hashCode());
        return result;
    }

    public String toString() {
        return "MqttSubscribeVo(topic=" + this.getTopic() + ", content=" + this.getContent() + ")";
    }
}

