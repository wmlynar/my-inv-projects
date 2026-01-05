/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.BlockGroupReq
 */
package com.seer.rds.vo.req;

import java.io.Serializable;
import java.util.List;

public class BlockGroupReq
implements Serializable {
    private String id;
    private List<String> blockGroup;

    public String getId() {
        return this.id;
    }

    public List<String> getBlockGroup() {
        return this.blockGroup;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setBlockGroup(List<String> blockGroup) {
        this.blockGroup = blockGroup;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BlockGroupReq)) {
            return false;
        }
        BlockGroupReq other = (BlockGroupReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        List this$blockGroup = this.getBlockGroup();
        List other$blockGroup = other.getBlockGroup();
        return !(this$blockGroup == null ? other$blockGroup != null : !((Object)this$blockGroup).equals(other$blockGroup));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BlockGroupReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        List $blockGroup = this.getBlockGroup();
        result = result * 59 + ($blockGroup == null ? 43 : ((Object)$blockGroup).hashCode());
        return result;
    }

    public String toString() {
        return "BlockGroupReq(id=" + this.getId() + ", blockGroup=" + this.getBlockGroup() + ")";
    }
}

