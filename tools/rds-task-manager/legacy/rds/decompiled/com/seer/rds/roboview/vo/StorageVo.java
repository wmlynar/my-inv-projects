/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.roboview.vo.SiteInfo
 *  com.seer.rds.roboview.vo.StorageVo
 */
package com.seer.rds.roboview.vo;

import com.seer.rds.roboview.vo.SiteInfo;
import java.util.List;

public class StorageVo {
    private String name;
    private Integer freqs;
    private List<SiteInfo> status;

    public String getName() {
        return this.name;
    }

    public Integer getFreqs() {
        return this.freqs;
    }

    public List<SiteInfo> getStatus() {
        return this.status;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setFreqs(Integer freqs) {
        this.freqs = freqs;
    }

    public void setStatus(List<SiteInfo> status) {
        this.status = status;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StorageVo)) {
            return false;
        }
        StorageVo other = (StorageVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$freqs = this.getFreqs();
        Integer other$freqs = other.getFreqs();
        if (this$freqs == null ? other$freqs != null : !((Object)this$freqs).equals(other$freqs)) {
            return false;
        }
        String this$name = this.getName();
        String other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) {
            return false;
        }
        List this$status = this.getStatus();
        List other$status = other.getStatus();
        return !(this$status == null ? other$status != null : !((Object)this$status).equals(other$status));
    }

    protected boolean canEqual(Object other) {
        return other instanceof StorageVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $freqs = this.getFreqs();
        result = result * 59 + ($freqs == null ? 43 : ((Object)$freqs).hashCode());
        String $name = this.getName();
        result = result * 59 + ($name == null ? 43 : $name.hashCode());
        List $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        return result;
    }

    public String toString() {
        return "StorageVo(name=" + this.getName() + ", freqs=" + this.getFreqs() + ", status=" + this.getStatus() + ")";
    }
}

