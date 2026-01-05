/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.OperatorShowSql
 *  com.seer.rds.config.configview.operator.OperatorTableShow
 */
package com.seer.rds.config.configview.operator;

import com.seer.rds.config.configview.operator.OperatorShowSql;
import java.util.List;

public class OperatorTableShow {
    private Boolean enable = false;
    private String tabName = "";
    private List<OperatorShowSql> showSql = null;

    public Boolean getEnable() {
        return this.enable;
    }

    public String getTabName() {
        return this.tabName;
    }

    public List<OperatorShowSql> getShowSql() {
        return this.showSql;
    }

    public void setEnable(Boolean enable) {
        this.enable = enable;
    }

    public void setTabName(String tabName) {
        this.tabName = tabName;
    }

    public void setShowSql(List<OperatorShowSql> showSql) {
        this.showSql = showSql;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OperatorTableShow)) {
            return false;
        }
        OperatorTableShow other = (OperatorTableShow)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$enable = this.getEnable();
        Boolean other$enable = other.getEnable();
        if (this$enable == null ? other$enable != null : !((Object)this$enable).equals(other$enable)) {
            return false;
        }
        String this$tabName = this.getTabName();
        String other$tabName = other.getTabName();
        if (this$tabName == null ? other$tabName != null : !this$tabName.equals(other$tabName)) {
            return false;
        }
        List this$showSql = this.getShowSql();
        List other$showSql = other.getShowSql();
        return !(this$showSql == null ? other$showSql != null : !((Object)this$showSql).equals(other$showSql));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OperatorTableShow;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $enable = this.getEnable();
        result = result * 59 + ($enable == null ? 43 : ((Object)$enable).hashCode());
        String $tabName = this.getTabName();
        result = result * 59 + ($tabName == null ? 43 : $tabName.hashCode());
        List $showSql = this.getShowSql();
        result = result * 59 + ($showSql == null ? 43 : ((Object)$showSql).hashCode());
        return result;
    }

    public String toString() {
        return "OperatorTableShow(enable=" + this.getEnable() + ", tabName=" + this.getTabName() + ", showSql=" + this.getShowSql() + ")";
    }
}

