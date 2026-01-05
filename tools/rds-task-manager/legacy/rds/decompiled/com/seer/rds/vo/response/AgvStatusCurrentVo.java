/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.stat.RobotStatusRecord
 *  com.seer.rds.vo.response.AgvStatusCurrentVo
 *  com.seer.rds.vo.response.AgvStatusCurrentVo$AgvStatusCurrentVoBuilder
 *  org.apache.commons.compress.utils.Lists
 */
package com.seer.rds.vo.response;

import com.seer.rds.model.stat.RobotStatusRecord;
import com.seer.rds.vo.response.AgvStatusCurrentVo;
import java.util.List;
import org.apache.commons.compress.utils.Lists;

/*
 * Exception performing whole class analysis ignored.
 */
public class AgvStatusCurrentVo {
    private String uuid;
    private Integer newStatus;

    public static AgvStatusCurrentVo toAgvStatusCurrentVo(RobotStatusRecord robotStatusRecord) {
        return AgvStatusCurrentVo.builder().uuid(robotStatusRecord.getUuid()).newStatus(robotStatusRecord.getNewStatus()).build();
    }

    public static List<AgvStatusCurrentVo> toAgvStatusCurrentVoList(List<RobotStatusRecord> robotStatusRecordList) {
        return Lists.newArrayList(robotStatusRecordList.stream().map(AgvStatusCurrentVo::toAgvStatusCurrentVo).iterator());
    }

    public static AgvStatusCurrentVoBuilder builder() {
        return new AgvStatusCurrentVoBuilder();
    }

    public String getUuid() {
        return this.uuid;
    }

    public Integer getNewStatus() {
        return this.newStatus;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public void setNewStatus(Integer newStatus) {
        this.newStatus = newStatus;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AgvStatusCurrentVo)) {
            return false;
        }
        AgvStatusCurrentVo other = (AgvStatusCurrentVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$newStatus = this.getNewStatus();
        Integer other$newStatus = other.getNewStatus();
        if (this$newStatus == null ? other$newStatus != null : !((Object)this$newStatus).equals(other$newStatus)) {
            return false;
        }
        String this$uuid = this.getUuid();
        String other$uuid = other.getUuid();
        return !(this$uuid == null ? other$uuid != null : !this$uuid.equals(other$uuid));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AgvStatusCurrentVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $newStatus = this.getNewStatus();
        result = result * 59 + ($newStatus == null ? 43 : ((Object)$newStatus).hashCode());
        String $uuid = this.getUuid();
        result = result * 59 + ($uuid == null ? 43 : $uuid.hashCode());
        return result;
    }

    public String toString() {
        return "AgvStatusCurrentVo(uuid=" + this.getUuid() + ", newStatus=" + this.getNewStatus() + ")";
    }

    public AgvStatusCurrentVo() {
    }

    public AgvStatusCurrentVo(String uuid, Integer newStatus) {
        this.uuid = uuid;
        this.newStatus = newStatus;
    }
}

