/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.ReturnBp
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="ReturnBp")
@Scope(value="prototype")
public class ReturnBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ReturnBp.class);

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        AbstratRootBp.taskStatus.put(this.taskId + this.taskRecord.getId(), false);
        GlobalCacheConfig.cache((String)(this.taskId + this.taskRecord.getId()), (Object)TaskStatusEnum.end.getStatus());
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ReturnBp)) {
            return false;
        }
        ReturnBp other = (ReturnBp)o;
        return other.canEqual((Object)this);
    }

    protected boolean canEqual(Object other) {
        return other instanceof ReturnBp;
    }

    public int hashCode() {
        boolean result = true;
        return 1;
    }

    public String toString() {
        return "ReturnBp()";
    }
}

