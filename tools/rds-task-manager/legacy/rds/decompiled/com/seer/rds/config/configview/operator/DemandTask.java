/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.DemandTask
 *  com.seer.rds.config.configview.operator.DemandTaskFunc
 */
package com.seer.rds.config.configview.operator;

import com.seer.rds.config.configview.operator.DemandTaskFunc;
import java.util.List;

public class DemandTask {
    private Boolean enable = false;
    private String tabName = "";
    private Boolean showDeleteButton = false;
    private List<DemandTaskFunc> processFuncList = null;

    public Boolean getEnable() {
        return this.enable;
    }

    public String getTabName() {
        return this.tabName;
    }

    public Boolean getShowDeleteButton() {
        return this.showDeleteButton;
    }

    public List<DemandTaskFunc> getProcessFuncList() {
        return this.processFuncList;
    }

    public void setEnable(Boolean enable) {
        this.enable = enable;
    }

    public void setTabName(String tabName) {
        this.tabName = tabName;
    }

    public void setShowDeleteButton(Boolean showDeleteButton) {
        this.showDeleteButton = showDeleteButton;
    }

    public void setProcessFuncList(List<DemandTaskFunc> processFuncList) {
        this.processFuncList = processFuncList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DemandTask)) {
            return false;
        }
        DemandTask other = (DemandTask)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$enable = this.getEnable();
        Boolean other$enable = other.getEnable();
        if (this$enable == null ? other$enable != null : !((Object)this$enable).equals(other$enable)) {
            return false;
        }
        Boolean this$showDeleteButton = this.getShowDeleteButton();
        Boolean other$showDeleteButton = other.getShowDeleteButton();
        if (this$showDeleteButton == null ? other$showDeleteButton != null : !((Object)this$showDeleteButton).equals(other$showDeleteButton)) {
            return false;
        }
        String this$tabName = this.getTabName();
        String other$tabName = other.getTabName();
        if (this$tabName == null ? other$tabName != null : !this$tabName.equals(other$tabName)) {
            return false;
        }
        List this$processFuncList = this.getProcessFuncList();
        List other$processFuncList = other.getProcessFuncList();
        return !(this$processFuncList == null ? other$processFuncList != null : !((Object)this$processFuncList).equals(other$processFuncList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DemandTask;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $enable = this.getEnable();
        result = result * 59 + ($enable == null ? 43 : ((Object)$enable).hashCode());
        Boolean $showDeleteButton = this.getShowDeleteButton();
        result = result * 59 + ($showDeleteButton == null ? 43 : ((Object)$showDeleteButton).hashCode());
        String $tabName = this.getTabName();
        result = result * 59 + ($tabName == null ? 43 : $tabName.hashCode());
        List $processFuncList = this.getProcessFuncList();
        result = result * 59 + ($processFuncList == null ? 43 : ((Object)$processFuncList).hashCode());
        return result;
    }

    public String toString() {
        return "DemandTask(enable=" + this.getEnable() + ", tabName=" + this.getTabName() + ", showDeleteButton=" + this.getShowDeleteButton() + ", processFuncList=" + this.getProcessFuncList() + ")";
    }
}

