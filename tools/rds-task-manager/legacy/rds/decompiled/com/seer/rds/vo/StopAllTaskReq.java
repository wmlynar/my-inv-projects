/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.StopAllTaskReq
 *  com.seer.rds.vo.StopAllTaskReq$StopAllTaskReqBuilder
 *  com.seer.rds.vo.StopAllTaskReq$StopTask
 */
package com.seer.rds.vo;

import com.seer.rds.vo.StopAllTaskReq;
import java.io.Serializable;
import java.util.Arrays;

public class StopAllTaskReq
implements Serializable {
    private StopTask[] tasks;

    public static StopAllTaskReqBuilder builder() {
        return new StopAllTaskReqBuilder();
    }

    public StopTask[] getTasks() {
        return this.tasks;
    }

    public void setTasks(StopTask[] tasks) {
        this.tasks = tasks;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StopAllTaskReq)) {
            return false;
        }
        StopAllTaskReq other = (StopAllTaskReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        return Arrays.deepEquals(this.getTasks(), other.getTasks());
    }

    protected boolean canEqual(Object other) {
        return other instanceof StopAllTaskReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + Arrays.deepHashCode(this.getTasks());
        return result;
    }

    public String toString() {
        return "StopAllTaskReq(tasks=" + Arrays.deepToString(this.getTasks()) + ")";
    }

    public StopAllTaskReq(StopTask[] tasks) {
        this.tasks = tasks;
    }

    public StopAllTaskReq() {
    }
}

