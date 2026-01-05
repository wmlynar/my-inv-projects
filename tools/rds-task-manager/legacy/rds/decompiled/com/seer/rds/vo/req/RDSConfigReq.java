/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.RDSConfigReq
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import org.springframework.stereotype.Component;

@ApiModel(value="\u66f4\u6539\u914d\u7f6e\u6587\u4ef6\u4e2drds\u7684\u8de8\u57df\u76f8\u5173\u53c2\u6570")
@Component
public class RDSConfigReq {
    @ApiModelProperty(value="\u914d\u7f6e\u7c7b\u578b", name="type", required=false)
    private String type;
    @ApiModelProperty(value="\u662f\u5426\u5f00\u542f\u5141\u8bb8\u8de8\u57df", name="enableCors", required=true)
    private boolean enableCors;

    public String getType() {
        return this.type;
    }

    public boolean isEnableCors() {
        return this.enableCors;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setEnableCors(boolean enableCors) {
        this.enableCors = enableCors;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RDSConfigReq)) {
            return false;
        }
        RDSConfigReq other = (RDSConfigReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.isEnableCors() != other.isEnableCors()) {
            return false;
        }
        String this$type = this.getType();
        String other$type = other.getType();
        return !(this$type == null ? other$type != null : !this$type.equals(other$type));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RDSConfigReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isEnableCors() ? 79 : 97);
        String $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        return result;
    }

    public String toString() {
        return "RDSConfigReq(type=" + this.getType() + ", enableCors=" + this.isEnableCors() + ")";
    }
}

