/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.DemandTaskFunc
 *  com.seer.rds.model.wind.WindDemandAttr
 */
package com.seer.rds.config.configview.operator;

import com.seer.rds.model.wind.WindDemandAttr;
import java.util.ArrayList;
import java.util.List;

public class DemandTaskFunc {
    private String defLabel = "";
    private String funcName = "";
    private String typeLabel = "";
    private List<String> orderBy = new ArrayList();
    private List<String> sort = new ArrayList();
    private List<String> workTypes = new ArrayList();
    private List<String> workStations = new ArrayList();
    private List<WindDemandAttr> extensionFields = new ArrayList();

    public String getDefLabel() {
        return this.defLabel;
    }

    public String getFuncName() {
        return this.funcName;
    }

    public String getTypeLabel() {
        return this.typeLabel;
    }

    public List<String> getOrderBy() {
        return this.orderBy;
    }

    public List<String> getSort() {
        return this.sort;
    }

    public List<String> getWorkTypes() {
        return this.workTypes;
    }

    public List<String> getWorkStations() {
        return this.workStations;
    }

    public List<WindDemandAttr> getExtensionFields() {
        return this.extensionFields;
    }

    public void setDefLabel(String defLabel) {
        this.defLabel = defLabel;
    }

    public void setFuncName(String funcName) {
        this.funcName = funcName;
    }

    public void setTypeLabel(String typeLabel) {
        this.typeLabel = typeLabel;
    }

    public void setOrderBy(List<String> orderBy) {
        this.orderBy = orderBy;
    }

    public void setSort(List<String> sort) {
        this.sort = sort;
    }

    public void setWorkTypes(List<String> workTypes) {
        this.workTypes = workTypes;
    }

    public void setWorkStations(List<String> workStations) {
        this.workStations = workStations;
    }

    public void setExtensionFields(List<WindDemandAttr> extensionFields) {
        this.extensionFields = extensionFields;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DemandTaskFunc)) {
            return false;
        }
        DemandTaskFunc other = (DemandTaskFunc)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$defLabel = this.getDefLabel();
        String other$defLabel = other.getDefLabel();
        if (this$defLabel == null ? other$defLabel != null : !this$defLabel.equals(other$defLabel)) {
            return false;
        }
        String this$funcName = this.getFuncName();
        String other$funcName = other.getFuncName();
        if (this$funcName == null ? other$funcName != null : !this$funcName.equals(other$funcName)) {
            return false;
        }
        String this$typeLabel = this.getTypeLabel();
        String other$typeLabel = other.getTypeLabel();
        if (this$typeLabel == null ? other$typeLabel != null : !this$typeLabel.equals(other$typeLabel)) {
            return false;
        }
        List this$orderBy = this.getOrderBy();
        List other$orderBy = other.getOrderBy();
        if (this$orderBy == null ? other$orderBy != null : !((Object)this$orderBy).equals(other$orderBy)) {
            return false;
        }
        List this$sort = this.getSort();
        List other$sort = other.getSort();
        if (this$sort == null ? other$sort != null : !((Object)this$sort).equals(other$sort)) {
            return false;
        }
        List this$workTypes = this.getWorkTypes();
        List other$workTypes = other.getWorkTypes();
        if (this$workTypes == null ? other$workTypes != null : !((Object)this$workTypes).equals(other$workTypes)) {
            return false;
        }
        List this$workStations = this.getWorkStations();
        List other$workStations = other.getWorkStations();
        if (this$workStations == null ? other$workStations != null : !((Object)this$workStations).equals(other$workStations)) {
            return false;
        }
        List this$extensionFields = this.getExtensionFields();
        List other$extensionFields = other.getExtensionFields();
        return !(this$extensionFields == null ? other$extensionFields != null : !((Object)this$extensionFields).equals(other$extensionFields));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DemandTaskFunc;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $defLabel = this.getDefLabel();
        result = result * 59 + ($defLabel == null ? 43 : $defLabel.hashCode());
        String $funcName = this.getFuncName();
        result = result * 59 + ($funcName == null ? 43 : $funcName.hashCode());
        String $typeLabel = this.getTypeLabel();
        result = result * 59 + ($typeLabel == null ? 43 : $typeLabel.hashCode());
        List $orderBy = this.getOrderBy();
        result = result * 59 + ($orderBy == null ? 43 : ((Object)$orderBy).hashCode());
        List $sort = this.getSort();
        result = result * 59 + ($sort == null ? 43 : ((Object)$sort).hashCode());
        List $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : ((Object)$workTypes).hashCode());
        List $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : ((Object)$workStations).hashCode());
        List $extensionFields = this.getExtensionFields();
        result = result * 59 + ($extensionFields == null ? 43 : ((Object)$extensionFields).hashCode());
        return result;
    }

    public String toString() {
        return "DemandTaskFunc(defLabel=" + this.getDefLabel() + ", funcName=" + this.getFuncName() + ", typeLabel=" + this.getTypeLabel() + ", orderBy=" + this.getOrderBy() + ", sort=" + this.getSort() + ", workTypes=" + this.getWorkTypes() + ", workStations=" + this.getWorkStations() + ", extensionFields=" + this.getExtensionFields() + ")";
    }
}

