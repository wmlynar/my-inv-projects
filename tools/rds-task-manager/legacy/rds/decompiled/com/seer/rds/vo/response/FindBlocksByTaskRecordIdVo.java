/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.WindBlockRunningVo
 *  com.seer.rds.vo.response.FindBlocksByTaskRecordIdVo
 *  com.seer.rds.vo.response.FindBlocksByTaskRecordIdVo$FindBlocksByTaskRecordIdVoBuilder
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.WindBlockRunningVo;
import com.seer.rds.vo.response.FindBlocksByTaskRecordIdVo;
import java.util.List;

public class FindBlocksByTaskRecordIdVo {
    List<WindBlockRunningVo> blockList;
    Integer taskStatus;

    public static FindBlocksByTaskRecordIdVoBuilder builder() {
        return new FindBlocksByTaskRecordIdVoBuilder();
    }

    public List<WindBlockRunningVo> getBlockList() {
        return this.blockList;
    }

    public Integer getTaskStatus() {
        return this.taskStatus;
    }

    public void setBlockList(List<WindBlockRunningVo> blockList) {
        this.blockList = blockList;
    }

    public void setTaskStatus(Integer taskStatus) {
        this.taskStatus = taskStatus;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof FindBlocksByTaskRecordIdVo)) {
            return false;
        }
        FindBlocksByTaskRecordIdVo other = (FindBlocksByTaskRecordIdVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$taskStatus = this.getTaskStatus();
        Integer other$taskStatus = other.getTaskStatus();
        if (this$taskStatus == null ? other$taskStatus != null : !((Object)this$taskStatus).equals(other$taskStatus)) {
            return false;
        }
        List this$blockList = this.getBlockList();
        List other$blockList = other.getBlockList();
        return !(this$blockList == null ? other$blockList != null : !((Object)this$blockList).equals(other$blockList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof FindBlocksByTaskRecordIdVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $taskStatus = this.getTaskStatus();
        result = result * 59 + ($taskStatus == null ? 43 : ((Object)$taskStatus).hashCode());
        List $blockList = this.getBlockList();
        result = result * 59 + ($blockList == null ? 43 : ((Object)$blockList).hashCode());
        return result;
    }

    public String toString() {
        return "FindBlocksByTaskRecordIdVo(blockList=" + this.getBlockList() + ", taskStatus=" + this.getTaskStatus() + ")";
    }

    public FindBlocksByTaskRecordIdVo(List<WindBlockRunningVo> blockList, Integer taskStatus) {
        this.blockList = blockList;
        this.taskStatus = taskStatus;
    }

    public FindBlocksByTaskRecordIdVo() {
    }
}

