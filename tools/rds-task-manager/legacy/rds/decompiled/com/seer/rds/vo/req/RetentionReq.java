/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.RetentionReq
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 *  lombok.NonNull
 */
package com.seer.rds.vo.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import java.io.Serializable;
import lombok.NonNull;

@ApiModel(value="\u4efb\u52a1\u6ede\u7559\u7edf\u8ba1\u8bf7\u6c42\u5bf9\u8c61")
public class RetentionReq
implements Serializable {
    @ApiModelProperty(value="\u6ede\u7559\u65f6\u95f4\uff0cint\u7c7b\u578b\uff0c\u5355\u4f4d\u662f\u5c0f\u65f6\uff0c\u4e0d\u9700\u8981\u4f20\u5355\u4f4d\uff01")
    @NonNull
    private Integer retentionHours;

    @NonNull
    public Integer getRetentionHours() {
        return this.retentionHours;
    }

    public void setRetentionHours(@NonNull Integer retentionHours) {
        if (retentionHours == null) {
            throw new NullPointerException("retentionHours is marked non-null but is null");
        }
        this.retentionHours = retentionHours;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RetentionReq)) {
            return false;
        }
        RetentionReq other = (RetentionReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$retentionHours = this.getRetentionHours();
        Integer other$retentionHours = other.getRetentionHours();
        return !(this$retentionHours == null ? other$retentionHours != null : !((Object)this$retentionHours).equals(other$retentionHours));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RetentionReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $retentionHours = this.getRetentionHours();
        result = result * 59 + ($retentionHours == null ? 43 : ((Object)$retentionHours).hashCode());
        return result;
    }

    public String toString() {
        return "RetentionReq(retentionHours=" + this.getRetentionHours() + ")";
    }

    public RetentionReq(@NonNull Integer retentionHours) {
        if (retentionHours == null) {
            throw new NullPointerException("retentionHours is marked non-null but is null");
        }
        this.retentionHours = retentionHours;
    }

    public RetentionReq() {
    }
}

