/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.annotation.JSONField
 *  com.seer.rds.vo.AgvPath
 */
package com.seer.rds.vo;

import com.alibaba.fastjson.annotation.JSONField;

public class AgvPath {
    private String load;
    private String endSite;
    @JSONField(name="StartTime")
    private String StartTime;
    private String location;
    private String endTime;
    private String changeAGVTime;
    private String order;

    public String getLoad() {
        return this.load;
    }

    public String getEndSite() {
        return this.endSite;
    }

    public String getStartTime() {
        return this.StartTime;
    }

    public String getLocation() {
        return this.location;
    }

    public String getEndTime() {
        return this.endTime;
    }

    public String getChangeAGVTime() {
        return this.changeAGVTime;
    }

    public String getOrder() {
        return this.order;
    }

    public void setLoad(String load) {
        this.load = load;
    }

    public void setEndSite(String endSite) {
        this.endSite = endSite;
    }

    public void setStartTime(String StartTime) {
        this.StartTime = StartTime;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public void setChangeAGVTime(String changeAGVTime) {
        this.changeAGVTime = changeAGVTime;
    }

    public void setOrder(String order) {
        this.order = order;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AgvPath)) {
            return false;
        }
        AgvPath other = (AgvPath)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$load = this.getLoad();
        String other$load = other.getLoad();
        if (this$load == null ? other$load != null : !this$load.equals(other$load)) {
            return false;
        }
        String this$endSite = this.getEndSite();
        String other$endSite = other.getEndSite();
        if (this$endSite == null ? other$endSite != null : !this$endSite.equals(other$endSite)) {
            return false;
        }
        String this$StartTime = this.getStartTime();
        String other$StartTime = other.getStartTime();
        if (this$StartTime == null ? other$StartTime != null : !this$StartTime.equals(other$StartTime)) {
            return false;
        }
        String this$location = this.getLocation();
        String other$location = other.getLocation();
        if (this$location == null ? other$location != null : !this$location.equals(other$location)) {
            return false;
        }
        String this$endTime = this.getEndTime();
        String other$endTime = other.getEndTime();
        if (this$endTime == null ? other$endTime != null : !this$endTime.equals(other$endTime)) {
            return false;
        }
        String this$changeAGVTime = this.getChangeAGVTime();
        String other$changeAGVTime = other.getChangeAGVTime();
        if (this$changeAGVTime == null ? other$changeAGVTime != null : !this$changeAGVTime.equals(other$changeAGVTime)) {
            return false;
        }
        String this$order = this.getOrder();
        String other$order = other.getOrder();
        return !(this$order == null ? other$order != null : !this$order.equals(other$order));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AgvPath;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $load = this.getLoad();
        result = result * 59 + ($load == null ? 43 : $load.hashCode());
        String $endSite = this.getEndSite();
        result = result * 59 + ($endSite == null ? 43 : $endSite.hashCode());
        String $StartTime = this.getStartTime();
        result = result * 59 + ($StartTime == null ? 43 : $StartTime.hashCode());
        String $location = this.getLocation();
        result = result * 59 + ($location == null ? 43 : $location.hashCode());
        String $endTime = this.getEndTime();
        result = result * 59 + ($endTime == null ? 43 : $endTime.hashCode());
        String $changeAGVTime = this.getChangeAGVTime();
        result = result * 59 + ($changeAGVTime == null ? 43 : $changeAGVTime.hashCode());
        String $order = this.getOrder();
        result = result * 59 + ($order == null ? 43 : $order.hashCode());
        return result;
    }

    public String toString() {
        return "AgvPath(load=" + this.getLoad() + ", endSite=" + this.getEndSite() + ", StartTime=" + this.getStartTime() + ", location=" + this.getLocation() + ", endTime=" + this.getEndTime() + ", changeAGVTime=" + this.getChangeAGVTime() + ", order=" + this.getOrder() + ")";
    }
}

