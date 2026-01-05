/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.CommonParametersVo
 */
package com.seer.rds.vo;

import java.util.ArrayList;
import java.util.List;

public class CommonParametersVo {
    private List<String> robotIds = new ArrayList();
    private List<String> robotGroup = new ArrayList();
    private List<String> robotLabels = new ArrayList();
    private List<String> workSiteIds = new ArrayList();
    private List<String> workSiteGroups = new ArrayList();
    private List<String> points = new ArrayList();
    private List<String> binTask = new ArrayList();
    private List<String> workStations = new ArrayList();
    private List<String> workTypes = new ArrayList();
    private List<String> user = new ArrayList();
    private List<String> caches = new ArrayList();

    public List<String> getRobotIds() {
        return this.robotIds;
    }

    public List<String> getRobotGroup() {
        return this.robotGroup;
    }

    public List<String> getRobotLabels() {
        return this.robotLabels;
    }

    public List<String> getWorkSiteIds() {
        return this.workSiteIds;
    }

    public List<String> getWorkSiteGroups() {
        return this.workSiteGroups;
    }

    public List<String> getPoints() {
        return this.points;
    }

    public List<String> getBinTask() {
        return this.binTask;
    }

    public List<String> getWorkStations() {
        return this.workStations;
    }

    public List<String> getWorkTypes() {
        return this.workTypes;
    }

    public List<String> getUser() {
        return this.user;
    }

    public List<String> getCaches() {
        return this.caches;
    }

    public void setRobotIds(List<String> robotIds) {
        this.robotIds = robotIds;
    }

    public void setRobotGroup(List<String> robotGroup) {
        this.robotGroup = robotGroup;
    }

    public void setRobotLabels(List<String> robotLabels) {
        this.robotLabels = robotLabels;
    }

    public void setWorkSiteIds(List<String> workSiteIds) {
        this.workSiteIds = workSiteIds;
    }

    public void setWorkSiteGroups(List<String> workSiteGroups) {
        this.workSiteGroups = workSiteGroups;
    }

    public void setPoints(List<String> points) {
        this.points = points;
    }

    public void setBinTask(List<String> binTask) {
        this.binTask = binTask;
    }

    public void setWorkStations(List<String> workStations) {
        this.workStations = workStations;
    }

    public void setWorkTypes(List<String> workTypes) {
        this.workTypes = workTypes;
    }

    public void setUser(List<String> user) {
        this.user = user;
    }

    public void setCaches(List<String> caches) {
        this.caches = caches;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof CommonParametersVo)) {
            return false;
        }
        CommonParametersVo other = (CommonParametersVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$robotIds = this.getRobotIds();
        List other$robotIds = other.getRobotIds();
        if (this$robotIds == null ? other$robotIds != null : !((Object)this$robotIds).equals(other$robotIds)) {
            return false;
        }
        List this$robotGroup = this.getRobotGroup();
        List other$robotGroup = other.getRobotGroup();
        if (this$robotGroup == null ? other$robotGroup != null : !((Object)this$robotGroup).equals(other$robotGroup)) {
            return false;
        }
        List this$robotLabels = this.getRobotLabels();
        List other$robotLabels = other.getRobotLabels();
        if (this$robotLabels == null ? other$robotLabels != null : !((Object)this$robotLabels).equals(other$robotLabels)) {
            return false;
        }
        List this$workSiteIds = this.getWorkSiteIds();
        List other$workSiteIds = other.getWorkSiteIds();
        if (this$workSiteIds == null ? other$workSiteIds != null : !((Object)this$workSiteIds).equals(other$workSiteIds)) {
            return false;
        }
        List this$workSiteGroups = this.getWorkSiteGroups();
        List other$workSiteGroups = other.getWorkSiteGroups();
        if (this$workSiteGroups == null ? other$workSiteGroups != null : !((Object)this$workSiteGroups).equals(other$workSiteGroups)) {
            return false;
        }
        List this$points = this.getPoints();
        List other$points = other.getPoints();
        if (this$points == null ? other$points != null : !((Object)this$points).equals(other$points)) {
            return false;
        }
        List this$binTask = this.getBinTask();
        List other$binTask = other.getBinTask();
        if (this$binTask == null ? other$binTask != null : !((Object)this$binTask).equals(other$binTask)) {
            return false;
        }
        List this$workStations = this.getWorkStations();
        List other$workStations = other.getWorkStations();
        if (this$workStations == null ? other$workStations != null : !((Object)this$workStations).equals(other$workStations)) {
            return false;
        }
        List this$workTypes = this.getWorkTypes();
        List other$workTypes = other.getWorkTypes();
        if (this$workTypes == null ? other$workTypes != null : !((Object)this$workTypes).equals(other$workTypes)) {
            return false;
        }
        List this$user = this.getUser();
        List other$user = other.getUser();
        if (this$user == null ? other$user != null : !((Object)this$user).equals(other$user)) {
            return false;
        }
        List this$caches = this.getCaches();
        List other$caches = other.getCaches();
        return !(this$caches == null ? other$caches != null : !((Object)this$caches).equals(other$caches));
    }

    protected boolean canEqual(Object other) {
        return other instanceof CommonParametersVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $robotIds = this.getRobotIds();
        result = result * 59 + ($robotIds == null ? 43 : ((Object)$robotIds).hashCode());
        List $robotGroup = this.getRobotGroup();
        result = result * 59 + ($robotGroup == null ? 43 : ((Object)$robotGroup).hashCode());
        List $robotLabels = this.getRobotLabels();
        result = result * 59 + ($robotLabels == null ? 43 : ((Object)$robotLabels).hashCode());
        List $workSiteIds = this.getWorkSiteIds();
        result = result * 59 + ($workSiteIds == null ? 43 : ((Object)$workSiteIds).hashCode());
        List $workSiteGroups = this.getWorkSiteGroups();
        result = result * 59 + ($workSiteGroups == null ? 43 : ((Object)$workSiteGroups).hashCode());
        List $points = this.getPoints();
        result = result * 59 + ($points == null ? 43 : ((Object)$points).hashCode());
        List $binTask = this.getBinTask();
        result = result * 59 + ($binTask == null ? 43 : ((Object)$binTask).hashCode());
        List $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : ((Object)$workStations).hashCode());
        List $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : ((Object)$workTypes).hashCode());
        List $user = this.getUser();
        result = result * 59 + ($user == null ? 43 : ((Object)$user).hashCode());
        List $caches = this.getCaches();
        result = result * 59 + ($caches == null ? 43 : ((Object)$caches).hashCode());
        return result;
    }

    public String toString() {
        return "CommonParametersVo(robotIds=" + this.getRobotIds() + ", robotGroup=" + this.getRobotGroup() + ", robotLabels=" + this.getRobotLabels() + ", workSiteIds=" + this.getWorkSiteIds() + ", workSiteGroups=" + this.getWorkSiteGroups() + ", points=" + this.getPoints() + ", binTask=" + this.getBinTask() + ", workStations=" + this.getWorkStations() + ", workTypes=" + this.getWorkTypes() + ", user=" + this.getUser() + ", caches=" + this.getCaches() + ")";
    }
}

