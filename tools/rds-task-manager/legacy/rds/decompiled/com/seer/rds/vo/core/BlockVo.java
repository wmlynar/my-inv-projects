/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.BlockVo
 */
package com.seer.rds.vo.core;

public class BlockVo {
    private String blockId;
    private String location;
    private String state;

    public String getBlockId() {
        return this.blockId;
    }

    public String getLocation() {
        return this.location;
    }

    public String getState() {
        return this.state;
    }

    public void setBlockId(String blockId) {
        this.blockId = blockId;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public void setState(String state) {
        this.state = state;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BlockVo)) {
            return false;
        }
        BlockVo other = (BlockVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$blockId = this.getBlockId();
        String other$blockId = other.getBlockId();
        if (this$blockId == null ? other$blockId != null : !this$blockId.equals(other$blockId)) {
            return false;
        }
        String this$location = this.getLocation();
        String other$location = other.getLocation();
        if (this$location == null ? other$location != null : !this$location.equals(other$location)) {
            return false;
        }
        String this$state = this.getState();
        String other$state = other.getState();
        return !(this$state == null ? other$state != null : !this$state.equals(other$state));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BlockVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $blockId = this.getBlockId();
        result = result * 59 + ($blockId == null ? 43 : $blockId.hashCode());
        String $location = this.getLocation();
        result = result * 59 + ($location == null ? 43 : $location.hashCode());
        String $state = this.getState();
        result = result * 59 + ($state == null ? 43 : $state.hashCode());
        return result;
    }

    public String toString() {
        return "BlockVo(blockId=" + this.getBlockId() + ", location=" + this.getLocation() + ", state=" + this.getState() + ")";
    }

    public BlockVo(String blockId, String location, String state) {
        this.blockId = blockId;
        this.location = location;
        this.state = state;
    }

    public BlockVo() {
    }
}

