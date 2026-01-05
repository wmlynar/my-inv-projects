/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.ExpandColContent
 *  com.seer.rds.config.configview.operator.OperatorShowSql
 *  com.seer.rds.config.configview.operator.OperatorTableExpandCols
 *  com.seer.rds.config.configview.operator.OperatorTableHead
 */
package com.seer.rds.config.configview.operator;

import com.seer.rds.config.configview.operator.ExpandColContent;
import com.seer.rds.config.configview.operator.OperatorTableExpandCols;
import com.seer.rds.config.configview.operator.OperatorTableHead;
import java.util.Collections;
import java.util.List;

public class OperatorShowSql {
    private String id = "";
    private String sql = "";
    private String label = "";
    private List<String> workTypes = null;
    private List<String> workStations = null;
    private List<String> params = Collections.emptyList();
    private List<String> paramsType = Collections.emptyList();
    private List<String> paramsTipName = Collections.emptyList();
    private List<String> inputs = Collections.emptyList();
    private List<OperatorTableHead> tableHead = Collections.emptyList();
    private List<OperatorTableExpandCols> expandCols = Collections.emptyList();
    private Integer height = 5;
    private Integer fontSize = 14;
    private String polishFunc = "";
    private List<ExpandColContent> pageExtras = Collections.emptyList();

    public String getId() {
        return this.id;
    }

    public String getSql() {
        return this.sql;
    }

    public String getLabel() {
        return this.label;
    }

    public List<String> getWorkTypes() {
        return this.workTypes;
    }

    public List<String> getWorkStations() {
        return this.workStations;
    }

    public List<String> getParams() {
        return this.params;
    }

    public List<String> getParamsType() {
        return this.paramsType;
    }

    public List<String> getParamsTipName() {
        return this.paramsTipName;
    }

    public List<String> getInputs() {
        return this.inputs;
    }

    public List<OperatorTableHead> getTableHead() {
        return this.tableHead;
    }

    public List<OperatorTableExpandCols> getExpandCols() {
        return this.expandCols;
    }

    public Integer getHeight() {
        return this.height;
    }

    public Integer getFontSize() {
        return this.fontSize;
    }

    public String getPolishFunc() {
        return this.polishFunc;
    }

    public List<ExpandColContent> getPageExtras() {
        return this.pageExtras;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setSql(String sql) {
        this.sql = sql;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setWorkTypes(List<String> workTypes) {
        this.workTypes = workTypes;
    }

    public void setWorkStations(List<String> workStations) {
        this.workStations = workStations;
    }

    public void setParams(List<String> params) {
        this.params = params;
    }

    public void setParamsType(List<String> paramsType) {
        this.paramsType = paramsType;
    }

    public void setParamsTipName(List<String> paramsTipName) {
        this.paramsTipName = paramsTipName;
    }

    public void setInputs(List<String> inputs) {
        this.inputs = inputs;
    }

    public void setTableHead(List<OperatorTableHead> tableHead) {
        this.tableHead = tableHead;
    }

    public void setExpandCols(List<OperatorTableExpandCols> expandCols) {
        this.expandCols = expandCols;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    public void setFontSize(Integer fontSize) {
        this.fontSize = fontSize;
    }

    public void setPolishFunc(String polishFunc) {
        this.polishFunc = polishFunc;
    }

    public void setPageExtras(List<ExpandColContent> pageExtras) {
        this.pageExtras = pageExtras;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OperatorShowSql)) {
            return false;
        }
        OperatorShowSql other = (OperatorShowSql)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$height = this.getHeight();
        Integer other$height = other.getHeight();
        if (this$height == null ? other$height != null : !((Object)this$height).equals(other$height)) {
            return false;
        }
        Integer this$fontSize = this.getFontSize();
        Integer other$fontSize = other.getFontSize();
        if (this$fontSize == null ? other$fontSize != null : !((Object)this$fontSize).equals(other$fontSize)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$sql = this.getSql();
        String other$sql = other.getSql();
        if (this$sql == null ? other$sql != null : !this$sql.equals(other$sql)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
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
        List this$params = this.getParams();
        List other$params = other.getParams();
        if (this$params == null ? other$params != null : !((Object)this$params).equals(other$params)) {
            return false;
        }
        List this$paramsType = this.getParamsType();
        List other$paramsType = other.getParamsType();
        if (this$paramsType == null ? other$paramsType != null : !((Object)this$paramsType).equals(other$paramsType)) {
            return false;
        }
        List this$paramsTipName = this.getParamsTipName();
        List other$paramsTipName = other.getParamsTipName();
        if (this$paramsTipName == null ? other$paramsTipName != null : !((Object)this$paramsTipName).equals(other$paramsTipName)) {
            return false;
        }
        List this$inputs = this.getInputs();
        List other$inputs = other.getInputs();
        if (this$inputs == null ? other$inputs != null : !((Object)this$inputs).equals(other$inputs)) {
            return false;
        }
        List this$tableHead = this.getTableHead();
        List other$tableHead = other.getTableHead();
        if (this$tableHead == null ? other$tableHead != null : !((Object)this$tableHead).equals(other$tableHead)) {
            return false;
        }
        List this$expandCols = this.getExpandCols();
        List other$expandCols = other.getExpandCols();
        if (this$expandCols == null ? other$expandCols != null : !((Object)this$expandCols).equals(other$expandCols)) {
            return false;
        }
        String this$polishFunc = this.getPolishFunc();
        String other$polishFunc = other.getPolishFunc();
        if (this$polishFunc == null ? other$polishFunc != null : !this$polishFunc.equals(other$polishFunc)) {
            return false;
        }
        List this$pageExtras = this.getPageExtras();
        List other$pageExtras = other.getPageExtras();
        return !(this$pageExtras == null ? other$pageExtras != null : !((Object)this$pageExtras).equals(other$pageExtras));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OperatorShowSql;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $height = this.getHeight();
        result = result * 59 + ($height == null ? 43 : ((Object)$height).hashCode());
        Integer $fontSize = this.getFontSize();
        result = result * 59 + ($fontSize == null ? 43 : ((Object)$fontSize).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $sql = this.getSql();
        result = result * 59 + ($sql == null ? 43 : $sql.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        List $workTypes = this.getWorkTypes();
        result = result * 59 + ($workTypes == null ? 43 : ((Object)$workTypes).hashCode());
        List $workStations = this.getWorkStations();
        result = result * 59 + ($workStations == null ? 43 : ((Object)$workStations).hashCode());
        List $params = this.getParams();
        result = result * 59 + ($params == null ? 43 : ((Object)$params).hashCode());
        List $paramsType = this.getParamsType();
        result = result * 59 + ($paramsType == null ? 43 : ((Object)$paramsType).hashCode());
        List $paramsTipName = this.getParamsTipName();
        result = result * 59 + ($paramsTipName == null ? 43 : ((Object)$paramsTipName).hashCode());
        List $inputs = this.getInputs();
        result = result * 59 + ($inputs == null ? 43 : ((Object)$inputs).hashCode());
        List $tableHead = this.getTableHead();
        result = result * 59 + ($tableHead == null ? 43 : ((Object)$tableHead).hashCode());
        List $expandCols = this.getExpandCols();
        result = result * 59 + ($expandCols == null ? 43 : ((Object)$expandCols).hashCode());
        String $polishFunc = this.getPolishFunc();
        result = result * 59 + ($polishFunc == null ? 43 : $polishFunc.hashCode());
        List $pageExtras = this.getPageExtras();
        result = result * 59 + ($pageExtras == null ? 43 : ((Object)$pageExtras).hashCode());
        return result;
    }

    public String toString() {
        return "OperatorShowSql(id=" + this.getId() + ", sql=" + this.getSql() + ", label=" + this.getLabel() + ", workTypes=" + this.getWorkTypes() + ", workStations=" + this.getWorkStations() + ", params=" + this.getParams() + ", paramsType=" + this.getParamsType() + ", paramsTipName=" + this.getParamsTipName() + ", inputs=" + this.getInputs() + ", tableHead=" + this.getTableHead() + ", expandCols=" + this.getExpandCols() + ", height=" + this.getHeight() + ", fontSize=" + this.getFontSize() + ", polishFunc=" + this.getPolishFunc() + ", pageExtras=" + this.getPageExtras() + ")";
    }
}

