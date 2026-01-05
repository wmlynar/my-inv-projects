/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.TemplateConfig
 */
package com.seer.rds.config.configview;

public class TemplateConfig {
    private Boolean ifShowTask = false;

    public Boolean getIfShowTask() {
        return this.ifShowTask;
    }

    public void setIfShowTask(Boolean ifShowTask) {
        this.ifShowTask = ifShowTask;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TemplateConfig)) {
            return false;
        }
        TemplateConfig other = (TemplateConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$ifShowTask = this.getIfShowTask();
        Boolean other$ifShowTask = other.getIfShowTask();
        return !(this$ifShowTask == null ? other$ifShowTask != null : !((Object)this$ifShowTask).equals(other$ifShowTask));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TemplateConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $ifShowTask = this.getIfShowTask();
        result = result * 59 + ($ifShowTask == null ? 43 : ((Object)$ifShowTask).hashCode());
        return result;
    }

    public String toString() {
        return "TemplateConfig(ifShowTask=" + this.getIfShowTask() + ")";
    }
}

