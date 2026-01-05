/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.wind.vo.BlockInfo
 */
package com.seer.rds.service.wind.vo;

public class BlockInfo {
    private String binArea;
    private String binTask;
    private String blockId;
    private String containerName;
    private String goodsId;
    private String location;
    private String operation;
    private Object operation_args;
    private Object postAction;
    private Object script_args;
    private String script_name;
    private String state;

    public String getBinArea() {
        return this.binArea;
    }

    public String getBinTask() {
        return this.binTask;
    }

    public String getBlockId() {
        return this.blockId;
    }

    public String getContainerName() {
        return this.containerName;
    }

    public String getGoodsId() {
        return this.goodsId;
    }

    public String getLocation() {
        return this.location;
    }

    public String getOperation() {
        return this.operation;
    }

    public Object getOperation_args() {
        return this.operation_args;
    }

    public Object getPostAction() {
        return this.postAction;
    }

    public Object getScript_args() {
        return this.script_args;
    }

    public String getScript_name() {
        return this.script_name;
    }

    public String getState() {
        return this.state;
    }

    public void setBinArea(String binArea) {
        this.binArea = binArea;
    }

    public void setBinTask(String binTask) {
        this.binTask = binTask;
    }

    public void setBlockId(String blockId) {
        this.blockId = blockId;
    }

    public void setContainerName(String containerName) {
        this.containerName = containerName;
    }

    public void setGoodsId(String goodsId) {
        this.goodsId = goodsId;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }

    public void setOperation_args(Object operation_args) {
        this.operation_args = operation_args;
    }

    public void setPostAction(Object postAction) {
        this.postAction = postAction;
    }

    public void setScript_args(Object script_args) {
        this.script_args = script_args;
    }

    public void setScript_name(String script_name) {
        this.script_name = script_name;
    }

    public void setState(String state) {
        this.state = state;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BlockInfo)) {
            return false;
        }
        BlockInfo other = (BlockInfo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$binArea = this.getBinArea();
        String other$binArea = other.getBinArea();
        if (this$binArea == null ? other$binArea != null : !this$binArea.equals(other$binArea)) {
            return false;
        }
        String this$binTask = this.getBinTask();
        String other$binTask = other.getBinTask();
        if (this$binTask == null ? other$binTask != null : !this$binTask.equals(other$binTask)) {
            return false;
        }
        String this$blockId = this.getBlockId();
        String other$blockId = other.getBlockId();
        if (this$blockId == null ? other$blockId != null : !this$blockId.equals(other$blockId)) {
            return false;
        }
        String this$containerName = this.getContainerName();
        String other$containerName = other.getContainerName();
        if (this$containerName == null ? other$containerName != null : !this$containerName.equals(other$containerName)) {
            return false;
        }
        String this$goodsId = this.getGoodsId();
        String other$goodsId = other.getGoodsId();
        if (this$goodsId == null ? other$goodsId != null : !this$goodsId.equals(other$goodsId)) {
            return false;
        }
        String this$location = this.getLocation();
        String other$location = other.getLocation();
        if (this$location == null ? other$location != null : !this$location.equals(other$location)) {
            return false;
        }
        String this$operation = this.getOperation();
        String other$operation = other.getOperation();
        if (this$operation == null ? other$operation != null : !this$operation.equals(other$operation)) {
            return false;
        }
        Object this$operation_args = this.getOperation_args();
        Object other$operation_args = other.getOperation_args();
        if (this$operation_args == null ? other$operation_args != null : !this$operation_args.equals(other$operation_args)) {
            return false;
        }
        Object this$postAction = this.getPostAction();
        Object other$postAction = other.getPostAction();
        if (this$postAction == null ? other$postAction != null : !this$postAction.equals(other$postAction)) {
            return false;
        }
        Object this$script_args = this.getScript_args();
        Object other$script_args = other.getScript_args();
        if (this$script_args == null ? other$script_args != null : !this$script_args.equals(other$script_args)) {
            return false;
        }
        String this$script_name = this.getScript_name();
        String other$script_name = other.getScript_name();
        if (this$script_name == null ? other$script_name != null : !this$script_name.equals(other$script_name)) {
            return false;
        }
        String this$state = this.getState();
        String other$state = other.getState();
        return !(this$state == null ? other$state != null : !this$state.equals(other$state));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BlockInfo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $binArea = this.getBinArea();
        result = result * 59 + ($binArea == null ? 43 : $binArea.hashCode());
        String $binTask = this.getBinTask();
        result = result * 59 + ($binTask == null ? 43 : $binTask.hashCode());
        String $blockId = this.getBlockId();
        result = result * 59 + ($blockId == null ? 43 : $blockId.hashCode());
        String $containerName = this.getContainerName();
        result = result * 59 + ($containerName == null ? 43 : $containerName.hashCode());
        String $goodsId = this.getGoodsId();
        result = result * 59 + ($goodsId == null ? 43 : $goodsId.hashCode());
        String $location = this.getLocation();
        result = result * 59 + ($location == null ? 43 : $location.hashCode());
        String $operation = this.getOperation();
        result = result * 59 + ($operation == null ? 43 : $operation.hashCode());
        Object $operation_args = this.getOperation_args();
        result = result * 59 + ($operation_args == null ? 43 : $operation_args.hashCode());
        Object $postAction = this.getPostAction();
        result = result * 59 + ($postAction == null ? 43 : $postAction.hashCode());
        Object $script_args = this.getScript_args();
        result = result * 59 + ($script_args == null ? 43 : $script_args.hashCode());
        String $script_name = this.getScript_name();
        result = result * 59 + ($script_name == null ? 43 : $script_name.hashCode());
        String $state = this.getState();
        result = result * 59 + ($state == null ? 43 : $state.hashCode());
        return result;
    }

    public String toString() {
        return "BlockInfo(binArea=" + this.getBinArea() + ", binTask=" + this.getBinTask() + ", blockId=" + this.getBlockId() + ", containerName=" + this.getContainerName() + ", goodsId=" + this.getGoodsId() + ", location=" + this.getLocation() + ", operation=" + this.getOperation() + ", operation_args=" + this.getOperation_args() + ", postAction=" + this.getPostAction() + ", script_args=" + this.getScript_args() + ", script_name=" + this.getScript_name() + ", state=" + this.getState() + ")";
    }
}

