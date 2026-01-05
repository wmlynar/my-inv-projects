/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.WorkSiteHqlCondition
 *  com.seer.rds.vo.WorkSiteUpdateReq
 *  com.seer.rds.vo.WorkSiteUpdateReq$WorkSiteUpdateReqBuilder
 *  com.seer.rds.vo.WorkSiteVo
 */
package com.seer.rds.vo;

import com.seer.rds.vo.WorkSiteHqlCondition;
import com.seer.rds.vo.WorkSiteUpdateReq;
import com.seer.rds.vo.WorkSiteVo;

public class WorkSiteUpdateReq {
    private WorkSiteHqlCondition conditions;
    private WorkSiteVo values;

    public static WorkSiteUpdateReqBuilder builder() {
        return new WorkSiteUpdateReqBuilder();
    }

    public WorkSiteHqlCondition getConditions() {
        return this.conditions;
    }

    public WorkSiteVo getValues() {
        return this.values;
    }

    public void setConditions(WorkSiteHqlCondition conditions) {
        this.conditions = conditions;
    }

    public void setValues(WorkSiteVo values) {
        this.values = values;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WorkSiteUpdateReq)) {
            return false;
        }
        WorkSiteUpdateReq other = (WorkSiteUpdateReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WorkSiteHqlCondition this$conditions = this.getConditions();
        WorkSiteHqlCondition other$conditions = other.getConditions();
        if (this$conditions == null ? other$conditions != null : !this$conditions.equals(other$conditions)) {
            return false;
        }
        WorkSiteVo this$values = this.getValues();
        WorkSiteVo other$values = other.getValues();
        return !(this$values == null ? other$values != null : !this$values.equals(other$values));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WorkSiteUpdateReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WorkSiteHqlCondition $conditions = this.getConditions();
        result = result * 59 + ($conditions == null ? 43 : $conditions.hashCode());
        WorkSiteVo $values = this.getValues();
        result = result * 59 + ($values == null ? 43 : $values.hashCode());
        return result;
    }

    public String toString() {
        return "WorkSiteUpdateReq(conditions=" + this.getConditions() + ", values=" + this.getValues() + ")";
    }

    public WorkSiteUpdateReq() {
    }

    public WorkSiteUpdateReq(WorkSiteHqlCondition conditions, WorkSiteVo values) {
        this.conditions = conditions;
        this.values = values;
    }
}

