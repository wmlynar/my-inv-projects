/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.S7WriteBp
 *  com.seer.rds.util.siemens.S7Util
 *  com.seer.rds.vo.wind.S7ReadBpFieId
 *  com.seer.rds.vo.wind.S7WriteBpFieId
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.util.siemens.S7Util;
import com.seer.rds.vo.wind.S7ReadBpFieId;
import com.seer.rds.vo.wind.S7WriteBpFieId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="S7WriteBp")
@Scope(value="prototype")
public class S7WriteBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(S7WriteBp.class);

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object type = this.blockInputParamsValue.get(S7WriteBpFieId.type);
        Object ip = this.blockInputParamsValue.get(S7WriteBpFieId.ip);
        Object blockAndOffset = this.blockInputParamsValue.get(S7WriteBpFieId.blockAndOffset);
        Object dataType = this.blockInputParamsValue.get(S7WriteBpFieId.dataType);
        Object value = this.blockInputParamsValue.get(S7WriteBpFieId.value);
        Object slot = this.blockInputParamsValue.get(S7ReadBpFieId.slot);
        Object rack = this.blockInputParamsValue.get(S7ReadBpFieId.rack);
        if (type == null) {
            throw new RuntimeException("@{wind.bp.plcTypeCantNotBeEmpty}");
        }
        if (ip == null) {
            throw new RuntimeException("@{wind.bp.plcIpCantNotBeEmpty}");
        }
        if (blockAndOffset == null) {
            throw new RuntimeException("@{wind.bp.addressCantNotBeEmpty}");
        }
        if (dataType == null) {
            throw new RuntimeException("@{wind.bp.dataTypeCantNotBeEmpty}");
        }
        if (value == null) {
            throw new RuntimeException("@{wind.bp.writeValueCanNotBeEmpty}");
        }
        while (true) {
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            boolean writeSuccess = S7Util.S7write((String)type.toString(), (String)ip.toString(), (String)blockAndOffset.toString(), (String)dataType.toString(), value, (String)(slot == null ? null : slot.toString()), (String)(rack == null ? null : rack.toString()));
            if (writeSuccess) break;
            Thread.sleep(5000L);
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof S7WriteBp)) {
            return false;
        }
        S7WriteBp other = (S7WriteBp)o;
        return other.canEqual((Object)this);
    }

    protected boolean canEqual(Object other) {
        return other instanceof S7WriteBp;
    }

    public int hashCode() {
        boolean result = true;
        return 1;
    }

    public String toString() {
        return "S7WriteBp()";
    }
}

