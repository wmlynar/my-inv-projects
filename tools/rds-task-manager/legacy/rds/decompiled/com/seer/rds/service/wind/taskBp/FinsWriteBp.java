/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.taskBp.FinsWriteBp
 *  com.seer.rds.util.omron.fins.FinsUtil
 *  com.seer.rds.vo.wind.FinsWriteBpFieId
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.util.omron.fins.FinsUtil;
import com.seer.rds.vo.wind.FinsWriteBpFieId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="FinsWriteBp")
@Scope(value="prototype")
public class FinsWriteBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(FinsWriteBp.class);

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        Object ip = this.blockInputParamsValue.get(FinsWriteBpFieId.ip);
        Object port = this.blockInputParamsValue.get(FinsWriteBpFieId.port);
        Object area = this.blockInputParamsValue.get(FinsWriteBpFieId.area);
        Object address = this.blockInputParamsValue.get(FinsWriteBpFieId.finsIoAddr);
        Object offset = this.blockInputParamsValue.get(FinsWriteBpFieId.bitOffset);
        Object dataType = this.blockInputParamsValue.get(FinsWriteBpFieId.dataType);
        Object value = this.blockInputParamsValue.get(FinsWriteBpFieId.value);
        if (ip == null) {
            throw new RuntimeException("@{wind.bp.plcIpCantNotBeEmpty}");
        }
        if (port == null) {
            throw new RuntimeException("@{wind.bp.devicePort}");
        }
        if (area == null) {
            throw new RuntimeException("@{wind.bp.areaCantNotBeEmpty}");
        }
        if (address == null) {
            throw new RuntimeException("@{wind.bp.addressCantNotBeEmpty}");
        }
        if (offset == null) {
            throw new RuntimeException("@{wind.bp.offsetCantNotBeEmpty}");
        }
        if (dataType == null) {
            throw new RuntimeException("@{wind.bp.dataTypeCantNotBeEmpty}");
        }
        if (value == null) {
            throw new RuntimeException("@{wind.bp.writeValueCanNotBeEmpty}");
        }
        while (true) {
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            int areaInt = Integer.parseInt(area.toString().substring(2), 16);
            boolean writeSuccess = this.finsWrite(ip.toString(), Integer.valueOf(port.toString()), Integer.valueOf(areaInt), Integer.valueOf(address.toString()), Integer.valueOf(offset.toString()), dataType.toString(), value);
            if (writeSuccess) break;
            Thread.sleep(500L);
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }

    private boolean finsWrite(String ip, Integer port, Integer area, Integer address, Integer offset, String dataType, Object value) throws Exception {
        boolean success;
        switch (dataType) {
            case "Word": {
                success = FinsUtil.writeWord((String)ip, (int)port, (int)area, (int)address, (int)offset, (int)Integer.parseInt(value.toString()));
                break;
            }
            case "Bit": {
                success = FinsUtil.writeBit((String)ip, (int)port, (int)area, (int)address, (int)offset, (boolean)Boolean.parseBoolean(value.toString()));
                break;
            }
            default: {
                throw new RuntimeException("@{wind.bp.unsupportedDataType}");
            }
        }
        return success;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof FinsWriteBp)) {
            return false;
        }
        FinsWriteBp other = (FinsWriteBp)o;
        return other.canEqual((Object)this);
    }

    protected boolean canEqual(Object other) {
        return other instanceof FinsWriteBp;
    }

    public int hashCode() {
        boolean result = true;
        return 1;
    }

    public String toString() {
        return "FinsWriteBp()";
    }
}

