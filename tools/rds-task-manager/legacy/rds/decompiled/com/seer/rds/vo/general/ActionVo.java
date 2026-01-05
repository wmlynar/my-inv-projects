/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.ActionVo
 *  com.seer.rds.vo.general.ActionVo$ActionVoBuilder
 *  com.seer.rds.vo.general.MovementParamsVo
 *  com.seer.rds.vo.general.SiteVo
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.ActionVo;
import com.seer.rds.vo.general.MovementParamsVo;
import com.seer.rds.vo.general.SiteVo;

public class ActionVo {
    private SiteVo site;
    private MovementParamsVo preLogic;
    private String binTask;
    private MovementParamsVo endLogic;

    public static ActionVoBuilder builder() {
        return new ActionVoBuilder();
    }

    public SiteVo getSite() {
        return this.site;
    }

    public MovementParamsVo getPreLogic() {
        return this.preLogic;
    }

    public String getBinTask() {
        return this.binTask;
    }

    public MovementParamsVo getEndLogic() {
        return this.endLogic;
    }

    public void setSite(SiteVo site) {
        this.site = site;
    }

    public void setPreLogic(MovementParamsVo preLogic) {
        this.preLogic = preLogic;
    }

    public void setBinTask(String binTask) {
        this.binTask = binTask;
    }

    public void setEndLogic(MovementParamsVo endLogic) {
        this.endLogic = endLogic;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ActionVo)) {
            return false;
        }
        ActionVo other = (ActionVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        SiteVo this$site = this.getSite();
        SiteVo other$site = other.getSite();
        if (this$site == null ? other$site != null : !this$site.equals(other$site)) {
            return false;
        }
        MovementParamsVo this$preLogic = this.getPreLogic();
        MovementParamsVo other$preLogic = other.getPreLogic();
        if (this$preLogic == null ? other$preLogic != null : !this$preLogic.equals(other$preLogic)) {
            return false;
        }
        String this$binTask = this.getBinTask();
        String other$binTask = other.getBinTask();
        if (this$binTask == null ? other$binTask != null : !this$binTask.equals(other$binTask)) {
            return false;
        }
        MovementParamsVo this$endLogic = this.getEndLogic();
        MovementParamsVo other$endLogic = other.getEndLogic();
        return !(this$endLogic == null ? other$endLogic != null : !this$endLogic.equals(other$endLogic));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ActionVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        SiteVo $site = this.getSite();
        result = result * 59 + ($site == null ? 43 : $site.hashCode());
        MovementParamsVo $preLogic = this.getPreLogic();
        result = result * 59 + ($preLogic == null ? 43 : $preLogic.hashCode());
        String $binTask = this.getBinTask();
        result = result * 59 + ($binTask == null ? 43 : $binTask.hashCode());
        MovementParamsVo $endLogic = this.getEndLogic();
        result = result * 59 + ($endLogic == null ? 43 : $endLogic.hashCode());
        return result;
    }

    public String toString() {
        return "ActionVo(site=" + this.getSite() + ", preLogic=" + this.getPreLogic() + ", binTask=" + this.getBinTask() + ", endLogic=" + this.getEndLogic() + ")";
    }

    public ActionVo() {
    }

    public ActionVo(SiteVo site, MovementParamsVo preLogic, String binTask, MovementParamsVo endLogic) {
        this.site = site;
        this.preLogic = preLogic;
        this.binTask = binTask;
        this.endLogic = endLogic;
    }
}

