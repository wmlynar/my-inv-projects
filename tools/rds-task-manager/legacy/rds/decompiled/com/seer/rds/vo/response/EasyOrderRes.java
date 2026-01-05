/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.EasyOrderRes
 */
package com.seer.rds.vo.response;

public class EasyOrderRes {
    private String menuId;
    private String taskLabel;
    private Boolean flag = true;

    public String getMenuId() {
        return this.menuId;
    }

    public String getTaskLabel() {
        return this.taskLabel;
    }

    public Boolean getFlag() {
        return this.flag;
    }

    public void setMenuId(String menuId) {
        this.menuId = menuId;
    }

    public void setTaskLabel(String taskLabel) {
        this.taskLabel = taskLabel;
    }

    public void setFlag(Boolean flag) {
        this.flag = flag;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof EasyOrderRes)) {
            return false;
        }
        EasyOrderRes other = (EasyOrderRes)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$flag = this.getFlag();
        Boolean other$flag = other.getFlag();
        if (this$flag == null ? other$flag != null : !((Object)this$flag).equals(other$flag)) {
            return false;
        }
        String this$menuId = this.getMenuId();
        String other$menuId = other.getMenuId();
        if (this$menuId == null ? other$menuId != null : !this$menuId.equals(other$menuId)) {
            return false;
        }
        String this$taskLabel = this.getTaskLabel();
        String other$taskLabel = other.getTaskLabel();
        return !(this$taskLabel == null ? other$taskLabel != null : !this$taskLabel.equals(other$taskLabel));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EasyOrderRes;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $flag = this.getFlag();
        result = result * 59 + ($flag == null ? 43 : ((Object)$flag).hashCode());
        String $menuId = this.getMenuId();
        result = result * 59 + ($menuId == null ? 43 : $menuId.hashCode());
        String $taskLabel = this.getTaskLabel();
        result = result * 59 + ($taskLabel == null ? 43 : $taskLabel.hashCode());
        return result;
    }

    public String toString() {
        return "EasyOrderRes(menuId=" + this.getMenuId() + ", taskLabel=" + this.getTaskLabel() + ", flag=" + this.getFlag() + ")";
    }
}

