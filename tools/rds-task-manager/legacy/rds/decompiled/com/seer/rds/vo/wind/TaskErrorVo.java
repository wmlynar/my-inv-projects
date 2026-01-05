/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.TaskErrorVo
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo.wind;

import io.swagger.annotations.ApiModel;
import java.util.Date;

@ApiModel(value="\u4efb\u52a1\u9519\u8bef\u5bf9\u8c61")
public class TaskErrorVo {
    private String mislabeling;
    private String errorMsg;
    private String recordId;
    private String agvId;
    private String outOrderId;
    private Date createTime;
    private String label;
    private Integer version;

    public String getMislabeling() {
        return this.mislabeling;
    }

    public String getErrorMsg() {
        return this.errorMsg;
    }

    public String getRecordId() {
        return this.recordId;
    }

    public String getAgvId() {
        return this.agvId;
    }

    public String getOutOrderId() {
        return this.outOrderId;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public String getLabel() {
        return this.label;
    }

    public Integer getVersion() {
        return this.version;
    }

    public void setMislabeling(String mislabeling) {
        this.mislabeling = mislabeling;
    }

    public void setErrorMsg(String errorMsg) {
        this.errorMsg = errorMsg;
    }

    public void setRecordId(String recordId) {
        this.recordId = recordId;
    }

    public void setAgvId(String agvId) {
        this.agvId = agvId;
    }

    public void setOutOrderId(String outOrderId) {
        this.outOrderId = outOrderId;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TaskErrorVo)) {
            return false;
        }
        TaskErrorVo other = (TaskErrorVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$version = this.getVersion();
        Integer other$version = other.getVersion();
        if (this$version == null ? other$version != null : !((Object)this$version).equals(other$version)) {
            return false;
        }
        String this$mislabeling = this.getMislabeling();
        String other$mislabeling = other.getMislabeling();
        if (this$mislabeling == null ? other$mislabeling != null : !this$mislabeling.equals(other$mislabeling)) {
            return false;
        }
        String this$errorMsg = this.getErrorMsg();
        String other$errorMsg = other.getErrorMsg();
        if (this$errorMsg == null ? other$errorMsg != null : !this$errorMsg.equals(other$errorMsg)) {
            return false;
        }
        String this$recordId = this.getRecordId();
        String other$recordId = other.getRecordId();
        if (this$recordId == null ? other$recordId != null : !this$recordId.equals(other$recordId)) {
            return false;
        }
        String this$agvId = this.getAgvId();
        String other$agvId = other.getAgvId();
        if (this$agvId == null ? other$agvId != null : !this$agvId.equals(other$agvId)) {
            return false;
        }
        String this$outOrderId = this.getOutOrderId();
        String other$outOrderId = other.getOutOrderId();
        if (this$outOrderId == null ? other$outOrderId != null : !this$outOrderId.equals(other$outOrderId)) {
            return false;
        }
        Date this$createTime = this.getCreateTime();
        Date other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        return !(this$label == null ? other$label != null : !this$label.equals(other$label));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TaskErrorVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $version = this.getVersion();
        result = result * 59 + ($version == null ? 43 : ((Object)$version).hashCode());
        String $mislabeling = this.getMislabeling();
        result = result * 59 + ($mislabeling == null ? 43 : $mislabeling.hashCode());
        String $errorMsg = this.getErrorMsg();
        result = result * 59 + ($errorMsg == null ? 43 : $errorMsg.hashCode());
        String $recordId = this.getRecordId();
        result = result * 59 + ($recordId == null ? 43 : $recordId.hashCode());
        String $agvId = this.getAgvId();
        result = result * 59 + ($agvId == null ? 43 : $agvId.hashCode());
        String $outOrderId = this.getOutOrderId();
        result = result * 59 + ($outOrderId == null ? 43 : $outOrderId.hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        return result;
    }

    public String toString() {
        return "TaskErrorVo(mislabeling=" + this.getMislabeling() + ", errorMsg=" + this.getErrorMsg() + ", recordId=" + this.getRecordId() + ", agvId=" + this.getAgvId() + ", outOrderId=" + this.getOutOrderId() + ", createTime=" + this.getCreateTime() + ", label=" + this.getLabel() + ", version=" + this.getVersion() + ")";
    }

    public TaskErrorVo(String mislabeling, String errorMsg, String recordId, String agvId, String outOrderId, Date createTime, String label, Integer version) {
        this.mislabeling = mislabeling;
        this.errorMsg = errorMsg;
        this.recordId = recordId;
        this.agvId = agvId;
        this.outOrderId = outOrderId;
        this.createTime = createTime;
        this.label = label;
        this.version = version;
    }

    public TaskErrorVo() {
    }
}

