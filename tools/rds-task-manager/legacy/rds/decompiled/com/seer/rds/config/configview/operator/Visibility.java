/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.Visibility
 */
package com.seer.rds.config.configview.operator;

import java.util.ArrayList;
import java.util.List;

public class Visibility {
    private List<String> workStations = new ArrayList();
    private List<String> workTypes = new ArrayList();
    private String windTask;

    public List<String> getWorkStations() {
        return this.workStations;
    }

    public List<String> getWorkTypes() {
        return this.workTypes;
    }

    public String getWindTask() {
        return this.windTask;
    }

    public void setWorkStations(List<String> workStations) {
        this.workStations = workStations;
    }

    public void setWorkTypes(List<String> workTypes) {
        this.workTypes = workTypes;
    }

    public void setWindTask(String windTask) {
        this.windTask = windTask;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof Visibility)) {
            return false;
        }
        Visibility other = (Visibility)o;
        if (!other.canEqual((Object)this)) {
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
        String this$windTask = this.getWindTask();
        String other$windTask = other.getWindTask();
        return !(this$windTask == null ? other$windTask != null : !this$windTask.equals(other$windTask));
    }

    protected boolean canEqual(Object other) {
        return other instanceof Visibility;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : ((Object)$workStations).hashCode());
        List $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : ((Object)$workTypes).hashCode());
        String $windTask = this.getWindTask();
        result = result * 59 + ($windTask == null ? 43 : $windTask.hashCode());
        return result;
    }

    public String toString() {
        return "Visibility(workStations=" + this.getWorkStations() + ", workTypes=" + this.getWorkTypes() + ", windTask=" + this.getWindTask() + ")";
    }
}

