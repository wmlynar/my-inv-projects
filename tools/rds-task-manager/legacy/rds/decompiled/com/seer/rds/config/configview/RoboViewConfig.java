/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.RoboView
 *  com.seer.rds.config.configview.RoboViewConfig
 */
package com.seer.rds.config.configview;

import com.seer.rds.config.configview.RoboView;
import java.util.List;

public class RoboViewConfig {
    private List<RoboView> roboViewList = null;
    private Boolean enable = false;
    private Integer intervalTime = 2000;

    public List<RoboView> getRoboViewList() {
        return this.roboViewList;
    }

    public Boolean getEnable() {
        return this.enable;
    }

    public Integer getIntervalTime() {
        return this.intervalTime;
    }

    public void setRoboViewList(List<RoboView> roboViewList) {
        this.roboViewList = roboViewList;
    }

    public void setEnable(Boolean enable) {
        this.enable = enable;
    }

    public void setIntervalTime(Integer intervalTime) {
        this.intervalTime = intervalTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RoboViewConfig)) {
            return false;
        }
        RoboViewConfig other = (RoboViewConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$enable = this.getEnable();
        Boolean other$enable = other.getEnable();
        if (this$enable == null ? other$enable != null : !((Object)this$enable).equals(other$enable)) {
            return false;
        }
        Integer this$intervalTime = this.getIntervalTime();
        Integer other$intervalTime = other.getIntervalTime();
        if (this$intervalTime == null ? other$intervalTime != null : !((Object)this$intervalTime).equals(other$intervalTime)) {
            return false;
        }
        List this$roboViewList = this.getRoboViewList();
        List other$roboViewList = other.getRoboViewList();
        return !(this$roboViewList == null ? other$roboViewList != null : !((Object)this$roboViewList).equals(other$roboViewList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RoboViewConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $enable = this.getEnable();
        result = result * 59 + ($enable == null ? 43 : ((Object)$enable).hashCode());
        Integer $intervalTime = this.getIntervalTime();
        result = result * 59 + ($intervalTime == null ? 43 : ((Object)$intervalTime).hashCode());
        List $roboViewList = this.getRoboViewList();
        result = result * 59 + ($roboViewList == null ? 43 : ((Object)$roboViewList).hashCode());
        return result;
    }

    public String toString() {
        return "RoboViewConfig(roboViewList=" + this.getRoboViewList() + ", enable=" + this.getEnable() + ", intervalTime=" + this.getIntervalTime() + ")";
    }
}

