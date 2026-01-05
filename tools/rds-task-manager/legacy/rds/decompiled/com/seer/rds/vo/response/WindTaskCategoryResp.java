/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.WindTaskCategory
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.vo.response.WindTaskCategoryResp
 */
package com.seer.rds.vo.response;

import com.seer.rds.model.wind.WindTaskCategory;
import com.seer.rds.model.wind.WindTaskDef;
import java.io.Serializable;
import java.util.List;

public class WindTaskCategoryResp
implements Serializable {
    private List<WindTaskCategory> windTaskCategoryList;
    private List<WindTaskDef> surplusWindDefList;

    public List<WindTaskCategory> getWindTaskCategoryList() {
        return this.windTaskCategoryList;
    }

    public List<WindTaskDef> getSurplusWindDefList() {
        return this.surplusWindDefList;
    }

    public void setWindTaskCategoryList(List<WindTaskCategory> windTaskCategoryList) {
        this.windTaskCategoryList = windTaskCategoryList;
    }

    public void setSurplusWindDefList(List<WindTaskDef> surplusWindDefList) {
        this.surplusWindDefList = surplusWindDefList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskCategoryResp)) {
            return false;
        }
        WindTaskCategoryResp other = (WindTaskCategoryResp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$windTaskCategoryList = this.getWindTaskCategoryList();
        List other$windTaskCategoryList = other.getWindTaskCategoryList();
        if (this$windTaskCategoryList == null ? other$windTaskCategoryList != null : !((Object)this$windTaskCategoryList).equals(other$windTaskCategoryList)) {
            return false;
        }
        List this$surplusWindDefList = this.getSurplusWindDefList();
        List other$surplusWindDefList = other.getSurplusWindDefList();
        return !(this$surplusWindDefList == null ? other$surplusWindDefList != null : !((Object)this$surplusWindDefList).equals(other$surplusWindDefList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskCategoryResp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $windTaskCategoryList = this.getWindTaskCategoryList();
        result = result * 59 + ($windTaskCategoryList == null ? 43 : ((Object)$windTaskCategoryList).hashCode());
        List $surplusWindDefList = this.getSurplusWindDefList();
        result = result * 59 + ($surplusWindDefList == null ? 43 : ((Object)$surplusWindDefList).hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskCategoryResp(windTaskCategoryList=" + this.getWindTaskCategoryList() + ", surplusWindDefList=" + this.getSurplusWindDefList() + ")";
    }
}

