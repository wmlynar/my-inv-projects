/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.GlobalCRUDRequest
 *  com.seer.rds.vo.GlobalCRUDRequest$GlobalCRUDRequestBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.GlobalCRUDRequest;
import java.util.Map;

public class GlobalCRUDRequest {
    private String tableName;
    private String columns;
    private String columnOrderBy;
    private String columnsValues;
    private int operate;
    private String id;
    private String queryWhere;
    private Map<String, Object> updateParam;
    private int pageNo;
    private int pageSize;

    public static GlobalCRUDRequestBuilder builder() {
        return new GlobalCRUDRequestBuilder();
    }

    public String getTableName() {
        return this.tableName;
    }

    public String getColumns() {
        return this.columns;
    }

    public String getColumnOrderBy() {
        return this.columnOrderBy;
    }

    public String getColumnsValues() {
        return this.columnsValues;
    }

    public int getOperate() {
        return this.operate;
    }

    public String getId() {
        return this.id;
    }

    public String getQueryWhere() {
        return this.queryWhere;
    }

    public Map<String, Object> getUpdateParam() {
        return this.updateParam;
    }

    public int getPageNo() {
        return this.pageNo;
    }

    public int getPageSize() {
        return this.pageSize;
    }

    public void setTableName(String tableName) {
        this.tableName = tableName;
    }

    public void setColumns(String columns) {
        this.columns = columns;
    }

    public void setColumnOrderBy(String columnOrderBy) {
        this.columnOrderBy = columnOrderBy;
    }

    public void setColumnsValues(String columnsValues) {
        this.columnsValues = columnsValues;
    }

    public void setOperate(int operate) {
        this.operate = operate;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setQueryWhere(String queryWhere) {
        this.queryWhere = queryWhere;
    }

    public void setUpdateParam(Map<String, Object> updateParam) {
        this.updateParam = updateParam;
    }

    public void setPageNo(int pageNo) {
        this.pageNo = pageNo;
    }

    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof GlobalCRUDRequest)) {
            return false;
        }
        GlobalCRUDRequest other = (GlobalCRUDRequest)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getOperate() != other.getOperate()) {
            return false;
        }
        if (this.getPageNo() != other.getPageNo()) {
            return false;
        }
        if (this.getPageSize() != other.getPageSize()) {
            return false;
        }
        String this$tableName = this.getTableName();
        String other$tableName = other.getTableName();
        if (this$tableName == null ? other$tableName != null : !this$tableName.equals(other$tableName)) {
            return false;
        }
        String this$columns = this.getColumns();
        String other$columns = other.getColumns();
        if (this$columns == null ? other$columns != null : !this$columns.equals(other$columns)) {
            return false;
        }
        String this$columnOrderBy = this.getColumnOrderBy();
        String other$columnOrderBy = other.getColumnOrderBy();
        if (this$columnOrderBy == null ? other$columnOrderBy != null : !this$columnOrderBy.equals(other$columnOrderBy)) {
            return false;
        }
        String this$columnsValues = this.getColumnsValues();
        String other$columnsValues = other.getColumnsValues();
        if (this$columnsValues == null ? other$columnsValues != null : !this$columnsValues.equals(other$columnsValues)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$queryWhere = this.getQueryWhere();
        String other$queryWhere = other.getQueryWhere();
        if (this$queryWhere == null ? other$queryWhere != null : !this$queryWhere.equals(other$queryWhere)) {
            return false;
        }
        Map this$updateParam = this.getUpdateParam();
        Map other$updateParam = other.getUpdateParam();
        return !(this$updateParam == null ? other$updateParam != null : !((Object)this$updateParam).equals(other$updateParam));
    }

    protected boolean canEqual(Object other) {
        return other instanceof GlobalCRUDRequest;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getOperate();
        result = result * 59 + this.getPageNo();
        result = result * 59 + this.getPageSize();
        String $tableName = this.getTableName();
        result = result * 59 + ($tableName == null ? 43 : $tableName.hashCode());
        String $columns = this.getColumns();
        result = result * 59 + ($columns == null ? 43 : $columns.hashCode());
        String $columnOrderBy = this.getColumnOrderBy();
        result = result * 59 + ($columnOrderBy == null ? 43 : $columnOrderBy.hashCode());
        String $columnsValues = this.getColumnsValues();
        result = result * 59 + ($columnsValues == null ? 43 : $columnsValues.hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $queryWhere = this.getQueryWhere();
        result = result * 59 + ($queryWhere == null ? 43 : $queryWhere.hashCode());
        Map $updateParam = this.getUpdateParam();
        result = result * 59 + ($updateParam == null ? 43 : ((Object)$updateParam).hashCode());
        return result;
    }

    public String toString() {
        return "GlobalCRUDRequest(tableName=" + this.getTableName() + ", columns=" + this.getColumns() + ", columnOrderBy=" + this.getColumnOrderBy() + ", columnsValues=" + this.getColumnsValues() + ", operate=" + this.getOperate() + ", id=" + this.getId() + ", queryWhere=" + this.getQueryWhere() + ", updateParam=" + this.getUpdateParam() + ", pageNo=" + this.getPageNo() + ", pageSize=" + this.getPageSize() + ")";
    }

    public GlobalCRUDRequest(String tableName, String columns, String columnOrderBy, String columnsValues, int operate, String id, String queryWhere, Map<String, Object> updateParam, int pageNo, int pageSize) {
        this.tableName = tableName;
        this.columns = columns;
        this.columnOrderBy = columnOrderBy;
        this.columnsValues = columnsValues;
        this.operate = operate;
        this.id = id;
        this.queryWhere = queryWhere;
        this.updateParam = updateParam;
        this.pageNo = pageNo;
        this.pageSize = pageSize;
    }

    public GlobalCRUDRequest() {
    }
}

