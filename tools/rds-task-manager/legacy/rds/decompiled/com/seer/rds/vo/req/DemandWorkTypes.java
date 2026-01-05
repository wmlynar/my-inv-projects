/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.DemandWorkTypes
 *  io.swagger.annotations.ApiModelProperty
 */
package com.seer.rds.vo.req;

import io.swagger.annotations.ApiModelProperty;

public class DemandWorkTypes {
    @ApiModelProperty(value="\u5c97\u4f4d", name="workTypes", required=false)
    private String workTypes;
    @ApiModelProperty(value="\u5de5\u4f4d", name="workStations", required=false)
    private String workStations;
    @ApiModelProperty(value="\u7528\u6237\u540d", name="userName", required=false)
    private String userName;

    public String getWorkTypes() {
        return this.workTypes;
    }

    public String getWorkStations() {
        return this.workStations;
    }

    public String getUserName() {
        return this.userName;
    }

    public void setWorkTypes(String workTypes) {
        this.workTypes = workTypes;
    }

    public void setWorkStations(String workStations) {
        this.workStations = workStations;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DemandWorkTypes)) {
            return false;
        }
        DemandWorkTypes other = (DemandWorkTypes)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$workTypes = this.getWorkTypes();
        String other$workTypes = other.getWorkTypes();
        if (this$workTypes == null ? other$workTypes != null : !this$workTypes.equals(other$workTypes)) {
            return false;
        }
        String this$workStations = this.getWorkStations();
        String other$workStations = other.getWorkStations();
        if (this$workStations == null ? other$workStations != null : !this$workStations.equals(other$workStations)) {
            return false;
        }
        String this$userName = this.getUserName();
        String other$userName = other.getUserName();
        return !(this$userName == null ? other$userName != null : !this$userName.equals(other$userName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DemandWorkTypes;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : $workTypes.hashCode());
        String $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : $workStations.hashCode());
        String $userName = this.getUserName();
        result = result * 59 + ($userName == null ? 43 : $userName.hashCode());
        return result;
    }

    public String toString() {
        return "DemandWorkTypes(workTypes=" + this.getWorkTypes() + ", workStations=" + this.getWorkStations() + ", userName=" + this.getUserName() + ")";
    }
}

