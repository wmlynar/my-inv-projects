/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.StopAllTaskReq$StopTask
 *  com.seer.rds.vo.req.BatchStopTaskReq
 *  com.seer.rds.vo.req.BatchStopTaskReq$BatchStopTaskReqBuilder
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 */
package com.seer.rds.vo.req;

import com.seer.rds.vo.StopAllTaskReq;
import com.seer.rds.vo.req.BatchStopTaskReq;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import java.io.Serializable;
import java.util.List;

@ApiModel(value="model to batch stop tasks")
public class BatchStopTaskReq
implements Serializable {
    @ApiModelProperty(value="releaseSite", name="releaseSite", required=true)
    private int releaseSite;
    @ApiModelProperty(value="stopTaskList", name="stopTaskList")
    private List<StopAllTaskReq.StopTask> stopTaskList;

    public static BatchStopTaskReqBuilder builder() {
        return new BatchStopTaskReqBuilder();
    }

    public int getReleaseSite() {
        return this.releaseSite;
    }

    public List<StopAllTaskReq.StopTask> getStopTaskList() {
        return this.stopTaskList;
    }

    public void setReleaseSite(int releaseSite) {
        this.releaseSite = releaseSite;
    }

    public void setStopTaskList(List<StopAllTaskReq.StopTask> stopTaskList) {
        this.stopTaskList = stopTaskList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BatchStopTaskReq)) {
            return false;
        }
        BatchStopTaskReq other = (BatchStopTaskReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getReleaseSite() != other.getReleaseSite()) {
            return false;
        }
        List this$stopTaskList = this.getStopTaskList();
        List other$stopTaskList = other.getStopTaskList();
        return !(this$stopTaskList == null ? other$stopTaskList != null : !((Object)this$stopTaskList).equals(other$stopTaskList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BatchStopTaskReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getReleaseSite();
        List $stopTaskList = this.getStopTaskList();
        result = result * 59 + ($stopTaskList == null ? 43 : ((Object)$stopTaskList).hashCode());
        return result;
    }

    public String toString() {
        return "BatchStopTaskReq(releaseSite=" + this.getReleaseSite() + ", stopTaskList=" + this.getStopTaskList() + ")";
    }

    public BatchStopTaskReq(int releaseSite, List<StopAllTaskReq.StopTask> stopTaskList) {
        this.releaseSite = releaseSite;
        this.stopTaskList = stopTaskList;
    }

    public BatchStopTaskReq() {
    }
}

