/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.UpdateYmlConfigDetailReq
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import org.springframework.stereotype.Component;

@ApiModel(value="\u66f4\u6539yml\u7684\u76f8\u5173\u53c2\u6570")
@Component
public class UpdateYmlConfigDetailReq {
    @ApiModelProperty(value="\u914d\u7f6e\u7c7b\u578b")
    private String type;

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof UpdateYmlConfigDetailReq)) {
            return false;
        }
        UpdateYmlConfigDetailReq other = (UpdateYmlConfigDetailReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$type = this.getType();
        String other$type = other.getType();
        return !(this$type == null ? other$type != null : !this$type.equals(other$type));
    }

    protected boolean canEqual(Object other) {
        return other instanceof UpdateYmlConfigDetailReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        return result;
    }

    public String toString() {
        return "UpdateYmlConfigDetailReq(type=" + this.getType() + ")";
    }
}

