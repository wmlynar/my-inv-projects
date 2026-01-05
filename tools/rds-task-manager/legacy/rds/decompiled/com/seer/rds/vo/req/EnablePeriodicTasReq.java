/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.EnablePeriodicTasReq
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo.req;

import io.swagger.annotations.ApiModel;
import java.io.Serializable;

@ApiModel(value="\u8bbe\u7f6e\u5b9a\u65f6\u4efb\u52a1\u662f\u5426\u542f\u7528\u8bf7\u6c42\u53c2\u6570")
public class EnablePeriodicTasReq
implements Serializable {
    private String id;
    private String label;
    private Integer ifEnable;

    public String getId() {
        return this.id;
    }

    public String getLabel() {
        return this.label;
    }

    public Integer getIfEnable() {
        return this.ifEnable;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setIfEnable(Integer ifEnable) {
        this.ifEnable = ifEnable;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof EnablePeriodicTasReq)) {
            return false;
        }
        EnablePeriodicTasReq other = (EnablePeriodicTasReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$ifEnable = this.getIfEnable();
        Integer other$ifEnable = other.getIfEnable();
        if (this$ifEnable == null ? other$ifEnable != null : !((Object)this$ifEnable).equals(other$ifEnable)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        return !(this$label == null ? other$label != null : !this$label.equals(other$label));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EnablePeriodicTasReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $ifEnable = this.getIfEnable();
        result = result * 59 + ($ifEnable == null ? 43 : ((Object)$ifEnable).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        return result;
    }

    public String toString() {
        return "EnablePeriodicTasReq(id=" + this.getId() + ", label=" + this.getLabel() + ", ifEnable=" + this.getIfEnable() + ")";
    }
}

