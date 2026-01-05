/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.exception.TaskBreakException
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.BreakBp
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.seer.rds.exception.TaskBreakException;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="BreakBp")
@Scope(value="prototype")
public class BreakBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(BreakBp.class);

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        throw new TaskBreakException("break");
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BreakBp)) {
            return false;
        }
        BreakBp other = (BreakBp)o;
        return other.canEqual((Object)this);
    }

    protected boolean canEqual(Object other) {
        return other instanceof BreakBp;
    }

    public int hashCode() {
        boolean result = true;
        return 1;
    }

    public String toString() {
        return "BreakBp()";
    }
}

