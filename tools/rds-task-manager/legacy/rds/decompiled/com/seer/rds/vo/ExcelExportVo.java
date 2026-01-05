/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.ExcelExportVo
 *  com.seer.rds.vo.ExcelExportVo$ExcelExportVoBuilder
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 */
package com.seer.rds.vo;

import com.seer.rds.vo.ExcelExportVo;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import java.util.List;
import java.util.Map;

@ApiModel
public class ExcelExportVo {
    @ApiModelProperty(value="fileName", name="fileName", required=true)
    private String fileName;
    @ApiModelProperty(value="headMap", name="headMap", required=true)
    private Map<String, String> headMap;
    @ApiModelProperty(value="dataList", name="dataList", required=true)
    private List<Map<String, Object>> dataList;

    public static ExcelExportVoBuilder builder() {
        return new ExcelExportVoBuilder();
    }

    public String getFileName() {
        return this.fileName;
    }

    public Map<String, String> getHeadMap() {
        return this.headMap;
    }

    public List<Map<String, Object>> getDataList() {
        return this.dataList;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public void setHeadMap(Map<String, String> headMap) {
        this.headMap = headMap;
    }

    public void setDataList(List<Map<String, Object>> dataList) {
        this.dataList = dataList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ExcelExportVo)) {
            return false;
        }
        ExcelExportVo other = (ExcelExportVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$fileName = this.getFileName();
        String other$fileName = other.getFileName();
        if (this$fileName == null ? other$fileName != null : !this$fileName.equals(other$fileName)) {
            return false;
        }
        Map this$headMap = this.getHeadMap();
        Map other$headMap = other.getHeadMap();
        if (this$headMap == null ? other$headMap != null : !((Object)this$headMap).equals(other$headMap)) {
            return false;
        }
        List this$dataList = this.getDataList();
        List other$dataList = other.getDataList();
        return !(this$dataList == null ? other$dataList != null : !((Object)this$dataList).equals(other$dataList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ExcelExportVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $fileName = this.getFileName();
        result = result * 59 + ($fileName == null ? 43 : $fileName.hashCode());
        Map $headMap = this.getHeadMap();
        result = result * 59 + ($headMap == null ? 43 : ((Object)$headMap).hashCode());
        List $dataList = this.getDataList();
        result = result * 59 + ($dataList == null ? 43 : ((Object)$dataList).hashCode());
        return result;
    }

    public String toString() {
        return "ExcelExportVo(fileName=" + this.getFileName() + ", headMap=" + this.getHeadMap() + ", dataList=" + this.getDataList() + ")";
    }

    public ExcelExportVo() {
    }

    public ExcelExportVo(String fileName, Map<String, String> headMap, List<Map<String, Object>> dataList) {
        this.fileName = fileName;
        this.headMap = headMap;
        this.dataList = dataList;
    }
}

