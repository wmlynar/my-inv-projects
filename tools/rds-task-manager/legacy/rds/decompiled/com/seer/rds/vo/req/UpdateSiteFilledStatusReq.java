/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.UpdateSiteFilledStatusReq
 *  com.seer.rds.vo.req.UpdateSiteFilledStatusReq$UpdateSiteFilledStatusReqBuilder
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 */
package com.seer.rds.vo.req;

import com.seer.rds.vo.req.UpdateSiteFilledStatusReq;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import java.io.Serializable;

@ApiModel(value="model to update filled status of worksite")
public class UpdateSiteFilledStatusReq
implements Serializable {
    @ApiModelProperty(value="filled")
    private Integer filled;
    @ApiModelProperty(value="siteId")
    private String siteId;

    public static UpdateSiteFilledStatusReqBuilder builder() {
        return new UpdateSiteFilledStatusReqBuilder();
    }

    public Integer getFilled() {
        return this.filled;
    }

    public String getSiteId() {
        return this.siteId;
    }

    public void setFilled(Integer filled) {
        this.filled = filled;
    }

    public void setSiteId(String siteId) {
        this.siteId = siteId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof UpdateSiteFilledStatusReq)) {
            return false;
        }
        UpdateSiteFilledStatusReq other = (UpdateSiteFilledStatusReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$filled = this.getFilled();
        Integer other$filled = other.getFilled();
        if (this$filled == null ? other$filled != null : !((Object)this$filled).equals(other$filled)) {
            return false;
        }
        String this$siteId = this.getSiteId();
        String other$siteId = other.getSiteId();
        return !(this$siteId == null ? other$siteId != null : !this$siteId.equals(other$siteId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof UpdateSiteFilledStatusReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $filled = this.getFilled();
        result = result * 59 + ($filled == null ? 43 : ((Object)$filled).hashCode());
        String $siteId = this.getSiteId();
        result = result * 59 + ($siteId == null ? 43 : $siteId.hashCode());
        return result;
    }

    public String toString() {
        return "UpdateSiteFilledStatusReq(filled=" + this.getFilled() + ", siteId=" + this.getSiteId() + ")";
    }

    public UpdateSiteFilledStatusReq(Integer filled, String siteId) {
        this.filled = filled;
        this.siteId = siteId;
    }

    public UpdateSiteFilledStatusReq() {
    }
}

