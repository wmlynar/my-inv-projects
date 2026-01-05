/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.VXRobotAlarms
 */
package com.seer.rds.config.configview;

public class VXRobotAlarms {
    private String webhook = "";

    public String getWebhook() {
        return this.webhook;
    }

    public void setWebhook(String webhook) {
        this.webhook = webhook;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof VXRobotAlarms)) {
            return false;
        }
        VXRobotAlarms other = (VXRobotAlarms)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$webhook = this.getWebhook();
        String other$webhook = other.getWebhook();
        return !(this$webhook == null ? other$webhook != null : !this$webhook.equals(other$webhook));
    }

    protected boolean canEqual(Object other) {
        return other instanceof VXRobotAlarms;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $webhook = this.getWebhook();
        result = result * 59 + ($webhook == null ? 43 : $webhook.hashCode());
        return result;
    }

    public String toString() {
        return "VXRobotAlarms(webhook=" + this.getWebhook() + ")";
    }
}

