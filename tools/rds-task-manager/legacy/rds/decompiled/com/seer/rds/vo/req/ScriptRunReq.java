/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.ScriptRunReq
 *  com.seer.rds.vo.req.ScriptRunReq$ScriptRunReqBuilder
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo.req;

import com.seer.rds.vo.req.ScriptRunReq;
import io.swagger.annotations.ApiModel;
import java.io.Serializable;

@ApiModel
public class ScriptRunReq
implements Serializable {
    private Boolean isParallel;
    private Long delay;
    private Long period;
    private String functionName;
    private Object args;

    public static ScriptRunReqBuilder builder() {
        return new ScriptRunReqBuilder();
    }

    public Boolean getIsParallel() {
        return this.isParallel;
    }

    public Long getDelay() {
        return this.delay;
    }

    public Long getPeriod() {
        return this.period;
    }

    public String getFunctionName() {
        return this.functionName;
    }

    public Object getArgs() {
        return this.args;
    }

    public void setIsParallel(Boolean isParallel) {
        this.isParallel = isParallel;
    }

    public void setDelay(Long delay) {
        this.delay = delay;
    }

    public void setPeriod(Long period) {
        this.period = period;
    }

    public void setFunctionName(String functionName) {
        this.functionName = functionName;
    }

    public void setArgs(Object args) {
        this.args = args;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ScriptRunReq)) {
            return false;
        }
        ScriptRunReq other = (ScriptRunReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$isParallel = this.getIsParallel();
        Boolean other$isParallel = other.getIsParallel();
        if (this$isParallel == null ? other$isParallel != null : !((Object)this$isParallel).equals(other$isParallel)) {
            return false;
        }
        Long this$delay = this.getDelay();
        Long other$delay = other.getDelay();
        if (this$delay == null ? other$delay != null : !((Object)this$delay).equals(other$delay)) {
            return false;
        }
        Long this$period = this.getPeriod();
        Long other$period = other.getPeriod();
        if (this$period == null ? other$period != null : !((Object)this$period).equals(other$period)) {
            return false;
        }
        String this$functionName = this.getFunctionName();
        String other$functionName = other.getFunctionName();
        if (this$functionName == null ? other$functionName != null : !this$functionName.equals(other$functionName)) {
            return false;
        }
        Object this$args = this.getArgs();
        Object other$args = other.getArgs();
        return !(this$args == null ? other$args != null : !this$args.equals(other$args));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ScriptRunReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $isParallel = this.getIsParallel();
        result = result * 59 + ($isParallel == null ? 43 : ((Object)$isParallel).hashCode());
        Long $delay = this.getDelay();
        result = result * 59 + ($delay == null ? 43 : ((Object)$delay).hashCode());
        Long $period = this.getPeriod();
        result = result * 59 + ($period == null ? 43 : ((Object)$period).hashCode());
        String $functionName = this.getFunctionName();
        result = result * 59 + ($functionName == null ? 43 : $functionName.hashCode());
        Object $args = this.getArgs();
        result = result * 59 + ($args == null ? 43 : $args.hashCode());
        return result;
    }

    public String toString() {
        return "ScriptRunReq(isParallel=" + this.getIsParallel() + ", delay=" + this.getDelay() + ", period=" + this.getPeriod() + ", functionName=" + this.getFunctionName() + ", args=" + this.getArgs() + ")";
    }

    public ScriptRunReq(Boolean isParallel, Long delay, Long period, String functionName, Object args) {
        this.isParallel = isParallel;
        this.delay = delay;
        this.period = period;
        this.functionName = functionName;
        this.args = args;
    }

    public ScriptRunReq() {
    }
}

