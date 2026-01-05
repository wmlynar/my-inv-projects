/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.SiteVo
 *  com.seer.rds.vo.general.SiteVo$SiteVoBuilder
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.SiteVo;

public class SiteVo {
    private String siteId;
    private String group;
    private Boolean filled;
    private Boolean locked;
    private Boolean lock;
    private String scriptFun;
    private String scriptOutParam;

    public static SiteVoBuilder builder() {
        return new SiteVoBuilder();
    }

    public String getSiteId() {
        return this.siteId;
    }

    public String getGroup() {
        return this.group;
    }

    public Boolean getFilled() {
        return this.filled;
    }

    public Boolean getLocked() {
        return this.locked;
    }

    public Boolean getLock() {
        return this.lock;
    }

    public String getScriptFun() {
        return this.scriptFun;
    }

    public String getScriptOutParam() {
        return this.scriptOutParam;
    }

    public void setSiteId(String siteId) {
        this.siteId = siteId;
    }

    public void setGroup(String group) {
        this.group = group;
    }

    public void setFilled(Boolean filled) {
        this.filled = filled;
    }

    public void setLocked(Boolean locked) {
        this.locked = locked;
    }

    public void setLock(Boolean lock) {
        this.lock = lock;
    }

    public void setScriptFun(String scriptFun) {
        this.scriptFun = scriptFun;
    }

    public void setScriptOutParam(String scriptOutParam) {
        this.scriptOutParam = scriptOutParam;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SiteVo)) {
            return false;
        }
        SiteVo other = (SiteVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$filled = this.getFilled();
        Boolean other$filled = other.getFilled();
        if (this$filled == null ? other$filled != null : !((Object)this$filled).equals(other$filled)) {
            return false;
        }
        Boolean this$locked = this.getLocked();
        Boolean other$locked = other.getLocked();
        if (this$locked == null ? other$locked != null : !((Object)this$locked).equals(other$locked)) {
            return false;
        }
        Boolean this$lock = this.getLock();
        Boolean other$lock = other.getLock();
        if (this$lock == null ? other$lock != null : !((Object)this$lock).equals(other$lock)) {
            return false;
        }
        String this$siteId = this.getSiteId();
        String other$siteId = other.getSiteId();
        if (this$siteId == null ? other$siteId != null : !this$siteId.equals(other$siteId)) {
            return false;
        }
        String this$group = this.getGroup();
        String other$group = other.getGroup();
        if (this$group == null ? other$group != null : !this$group.equals(other$group)) {
            return false;
        }
        String this$scriptFun = this.getScriptFun();
        String other$scriptFun = other.getScriptFun();
        if (this$scriptFun == null ? other$scriptFun != null : !this$scriptFun.equals(other$scriptFun)) {
            return false;
        }
        String this$scriptOutParam = this.getScriptOutParam();
        String other$scriptOutParam = other.getScriptOutParam();
        return !(this$scriptOutParam == null ? other$scriptOutParam != null : !this$scriptOutParam.equals(other$scriptOutParam));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SiteVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $filled = this.getFilled();
        result = result * 59 + ($filled == null ? 43 : ((Object)$filled).hashCode());
        Boolean $locked = this.getLocked();
        result = result * 59 + ($locked == null ? 43 : ((Object)$locked).hashCode());
        Boolean $lock = this.getLock();
        result = result * 59 + ($lock == null ? 43 : ((Object)$lock).hashCode());
        String $siteId = this.getSiteId();
        result = result * 59 + ($siteId == null ? 43 : $siteId.hashCode());
        String $group = this.getGroup();
        result = result * 59 + ($group == null ? 43 : $group.hashCode());
        String $scriptFun = this.getScriptFun();
        result = result * 59 + ($scriptFun == null ? 43 : $scriptFun.hashCode());
        String $scriptOutParam = this.getScriptOutParam();
        result = result * 59 + ($scriptOutParam == null ? 43 : $scriptOutParam.hashCode());
        return result;
    }

    public String toString() {
        return "SiteVo(siteId=" + this.getSiteId() + ", group=" + this.getGroup() + ", filled=" + this.getFilled() + ", locked=" + this.getLocked() + ", lock=" + this.getLock() + ", scriptFun=" + this.getScriptFun() + ", scriptOutParam=" + this.getScriptOutParam() + ")";
    }

    public SiteVo() {
    }

    public SiteVo(String siteId, String group, Boolean filled, Boolean locked, Boolean lock, String scriptFun, String scriptOutParam) {
        this.siteId = siteId;
        this.group = group;
        this.filled = filled;
        this.locked = locked;
        this.lock = lock;
        this.scriptFun = scriptFun;
        this.scriptOutParam = scriptOutParam;
    }
}

