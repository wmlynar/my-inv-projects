/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.exception.BpRuntimeException
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.SkipToComponent
 *  com.seer.rds.vo.wind.SkipToComponentField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.exception.BpRuntimeException;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.SkipToComponentField;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="SkipToComponent")
@Scope(value="prototype")
public class SkipToComponent
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(SkipToComponent.class);
    private Object skipComponentId;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.skipComponentId = this.blockInputParamsValue.get(SkipToComponentField.skipComponentId);
        if (this.skipComponentId == null) {
            throw new BpRuntimeException("@{wind.bp.SkipComponentIdEmpty}");
        }
        GlobalCacheConfig.cacheSkip((String)(this.taskId + this.taskRecord.getId()), (Object)this.skipComponentId);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }

    public Object getSkipComponentId() {
        return this.skipComponentId;
    }

    public void setSkipComponentId(Object skipComponentId) {
        this.skipComponentId = skipComponentId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SkipToComponent)) {
            return false;
        }
        SkipToComponent other = (SkipToComponent)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Object this$skipComponentId = this.getSkipComponentId();
        Object other$skipComponentId = other.getSkipComponentId();
        return !(this$skipComponentId == null ? other$skipComponentId != null : !this$skipComponentId.equals(other$skipComponentId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SkipToComponent;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $skipComponentId = this.getSkipComponentId();
        result = result * 59 + ($skipComponentId == null ? 43 : $skipComponentId.hashCode());
        return result;
    }

    public String toString() {
        return "SkipToComponent(skipComponentId=" + this.getSkipComponentId() + ")";
    }
}

