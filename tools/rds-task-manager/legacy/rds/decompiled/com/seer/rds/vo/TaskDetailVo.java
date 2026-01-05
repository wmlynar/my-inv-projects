/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.TaskDetailVo
 *  com.seer.rds.vo.TaskDetailVo$TaskDetailVoBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.TaskDetailVo;

public class TaskDetailVo
implements Comparable<TaskDetailVo> {
    private Integer blockId;
    private String blockType;
    private Integer pid;
    private Object childBlock;
    private boolean childBlockIsTryCatch;

    @Override
    public int compareTo(TaskDetailVo o) {
        if (this.blockId > o.getBlockId()) {
            return 1;
        }
        return -1;
    }

    public static TaskDetailVoBuilder builder() {
        return new TaskDetailVoBuilder();
    }

    public Integer getBlockId() {
        return this.blockId;
    }

    public String getBlockType() {
        return this.blockType;
    }

    public Integer getPid() {
        return this.pid;
    }

    public Object getChildBlock() {
        return this.childBlock;
    }

    public boolean isChildBlockIsTryCatch() {
        return this.childBlockIsTryCatch;
    }

    public void setBlockId(Integer blockId) {
        this.blockId = blockId;
    }

    public void setBlockType(String blockType) {
        this.blockType = blockType;
    }

    public void setPid(Integer pid) {
        this.pid = pid;
    }

    public void setChildBlock(Object childBlock) {
        this.childBlock = childBlock;
    }

    public void setChildBlockIsTryCatch(boolean childBlockIsTryCatch) {
        this.childBlockIsTryCatch = childBlockIsTryCatch;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TaskDetailVo)) {
            return false;
        }
        TaskDetailVo other = (TaskDetailVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.isChildBlockIsTryCatch() != other.isChildBlockIsTryCatch()) {
            return false;
        }
        Integer this$blockId = this.getBlockId();
        Integer other$blockId = other.getBlockId();
        if (this$blockId == null ? other$blockId != null : !((Object)this$blockId).equals(other$blockId)) {
            return false;
        }
        Integer this$pid = this.getPid();
        Integer other$pid = other.getPid();
        if (this$pid == null ? other$pid != null : !((Object)this$pid).equals(other$pid)) {
            return false;
        }
        String this$blockType = this.getBlockType();
        String other$blockType = other.getBlockType();
        if (this$blockType == null ? other$blockType != null : !this$blockType.equals(other$blockType)) {
            return false;
        }
        Object this$childBlock = this.getChildBlock();
        Object other$childBlock = other.getChildBlock();
        return !(this$childBlock == null ? other$childBlock != null : !this$childBlock.equals(other$childBlock));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TaskDetailVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isChildBlockIsTryCatch() ? 79 : 97);
        Integer $blockId = this.getBlockId();
        result = result * 59 + ($blockId == null ? 43 : ((Object)$blockId).hashCode());
        Integer $pid = this.getPid();
        result = result * 59 + ($pid == null ? 43 : ((Object)$pid).hashCode());
        String $blockType = this.getBlockType();
        result = result * 59 + ($blockType == null ? 43 : $blockType.hashCode());
        Object $childBlock = this.getChildBlock();
        result = result * 59 + ($childBlock == null ? 43 : $childBlock.hashCode());
        return result;
    }

    public String toString() {
        return "TaskDetailVo(blockId=" + this.getBlockId() + ", blockType=" + this.getBlockType() + ", pid=" + this.getPid() + ", childBlock=" + this.getChildBlock() + ", childBlockIsTryCatch=" + this.isChildBlockIsTryCatch() + ")";
    }

    public TaskDetailVo(Integer blockId, String blockType, Integer pid, Object childBlock, boolean childBlockIsTryCatch) {
        this.blockId = blockId;
        this.blockType = blockType;
        this.pid = pid;
        this.childBlock = childBlock;
        this.childBlockIsTryCatch = childBlockIsTryCatch;
    }

    public TaskDetailVo() {
    }
}

