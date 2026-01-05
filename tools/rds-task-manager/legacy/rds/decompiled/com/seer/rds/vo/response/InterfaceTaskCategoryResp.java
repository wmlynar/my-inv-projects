/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.InterfacePreHandle
 *  com.seer.rds.model.wind.InterfaceTaskCategory
 *  com.seer.rds.vo.response.InterfaceTaskCategoryResp
 */
package com.seer.rds.vo.response;

import com.seer.rds.model.wind.InterfacePreHandle;
import com.seer.rds.model.wind.InterfaceTaskCategory;
import java.io.Serializable;
import java.util.List;

public class InterfaceTaskCategoryResp
implements Serializable {
    private List<InterfaceTaskCategory> interfaceTaskCategoryList;
    private List<InterfacePreHandle> surplusInterfaceDefList;

    public List<InterfaceTaskCategory> getInterfaceTaskCategoryList() {
        return this.interfaceTaskCategoryList;
    }

    public List<InterfacePreHandle> getSurplusInterfaceDefList() {
        return this.surplusInterfaceDefList;
    }

    public void setInterfaceTaskCategoryList(List<InterfaceTaskCategory> interfaceTaskCategoryList) {
        this.interfaceTaskCategoryList = interfaceTaskCategoryList;
    }

    public void setSurplusInterfaceDefList(List<InterfacePreHandle> surplusInterfaceDefList) {
        this.surplusInterfaceDefList = surplusInterfaceDefList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof InterfaceTaskCategoryResp)) {
            return false;
        }
        InterfaceTaskCategoryResp other = (InterfaceTaskCategoryResp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$interfaceTaskCategoryList = this.getInterfaceTaskCategoryList();
        List other$interfaceTaskCategoryList = other.getInterfaceTaskCategoryList();
        if (this$interfaceTaskCategoryList == null ? other$interfaceTaskCategoryList != null : !((Object)this$interfaceTaskCategoryList).equals(other$interfaceTaskCategoryList)) {
            return false;
        }
        List this$surplusInterfaceDefList = this.getSurplusInterfaceDefList();
        List other$surplusInterfaceDefList = other.getSurplusInterfaceDefList();
        return !(this$surplusInterfaceDefList == null ? other$surplusInterfaceDefList != null : !((Object)this$surplusInterfaceDefList).equals(other$surplusInterfaceDefList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof InterfaceTaskCategoryResp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $interfaceTaskCategoryList = this.getInterfaceTaskCategoryList();
        result = result * 59 + ($interfaceTaskCategoryList == null ? 43 : ((Object)$interfaceTaskCategoryList).hashCode());
        List $surplusInterfaceDefList = this.getSurplusInterfaceDefList();
        result = result * 59 + ($surplusInterfaceDefList == null ? 43 : ((Object)$surplusInterfaceDefList).hashCode());
        return result;
    }

    public String toString() {
        return "InterfaceTaskCategoryResp(interfaceTaskCategoryList=" + this.getInterfaceTaskCategoryList() + ", surplusInterfaceDefList=" + this.getSurplusInterfaceDefList() + ")";
    }
}

