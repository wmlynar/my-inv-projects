/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.ChangeAgvProgress
 *  com.seer.rds.model.wind.ChangeAgvProgress$ChangeAgvProgressBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.ChangeAgvProgress;
import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_ChangeAgvProgress")
public class ChangeAgvProgress {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String originalRobot;
    private String replaceRobot;
    private Integer status;
    private Date executorTime;
    private String reason;
    private String errorMsg;
    private String originalOrderId;
    private String orderId;

    public static ChangeAgvProgressBuilder builder() {
        return new ChangeAgvProgressBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getOriginalRobot() {
        return this.originalRobot;
    }

    public String getReplaceRobot() {
        return this.replaceRobot;
    }

    public Integer getStatus() {
        return this.status;
    }

    public Date getExecutorTime() {
        return this.executorTime;
    }

    public String getReason() {
        return this.reason;
    }

    public String getErrorMsg() {
        return this.errorMsg;
    }

    public String getOriginalOrderId() {
        return this.originalOrderId;
    }

    public String getOrderId() {
        return this.orderId;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setOriginalRobot(String originalRobot) {
        this.originalRobot = originalRobot;
    }

    public void setReplaceRobot(String replaceRobot) {
        this.replaceRobot = replaceRobot;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setExecutorTime(Date executorTime) {
        this.executorTime = executorTime;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public void setErrorMsg(String errorMsg) {
        this.errorMsg = errorMsg;
    }

    public void setOriginalOrderId(String originalOrderId) {
        this.originalOrderId = originalOrderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ChangeAgvProgress)) {
            return false;
        }
        ChangeAgvProgress other = (ChangeAgvProgress)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$originalRobot = this.getOriginalRobot();
        String other$originalRobot = other.getOriginalRobot();
        if (this$originalRobot == null ? other$originalRobot != null : !this$originalRobot.equals(other$originalRobot)) {
            return false;
        }
        String this$replaceRobot = this.getReplaceRobot();
        String other$replaceRobot = other.getReplaceRobot();
        if (this$replaceRobot == null ? other$replaceRobot != null : !this$replaceRobot.equals(other$replaceRobot)) {
            return false;
        }
        Date this$executorTime = this.getExecutorTime();
        Date other$executorTime = other.getExecutorTime();
        if (this$executorTime == null ? other$executorTime != null : !((Object)this$executorTime).equals(other$executorTime)) {
            return false;
        }
        String this$reason = this.getReason();
        String other$reason = other.getReason();
        if (this$reason == null ? other$reason != null : !this$reason.equals(other$reason)) {
            return false;
        }
        String this$errorMsg = this.getErrorMsg();
        String other$errorMsg = other.getErrorMsg();
        if (this$errorMsg == null ? other$errorMsg != null : !this$errorMsg.equals(other$errorMsg)) {
            return false;
        }
        String this$originalOrderId = this.getOriginalOrderId();
        String other$originalOrderId = other.getOriginalOrderId();
        if (this$originalOrderId == null ? other$originalOrderId != null : !this$originalOrderId.equals(other$originalOrderId)) {
            return false;
        }
        String this$orderId = this.getOrderId();
        String other$orderId = other.getOrderId();
        return !(this$orderId == null ? other$orderId != null : !this$orderId.equals(other$orderId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ChangeAgvProgress;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $originalRobot = this.getOriginalRobot();
        result = result * 59 + ($originalRobot == null ? 43 : $originalRobot.hashCode());
        String $replaceRobot = this.getReplaceRobot();
        result = result * 59 + ($replaceRobot == null ? 43 : $replaceRobot.hashCode());
        Date $executorTime = this.getExecutorTime();
        result = result * 59 + ($executorTime == null ? 43 : ((Object)$executorTime).hashCode());
        String $reason = this.getReason();
        result = result * 59 + ($reason == null ? 43 : $reason.hashCode());
        String $errorMsg = this.getErrorMsg();
        result = result * 59 + ($errorMsg == null ? 43 : $errorMsg.hashCode());
        String $originalOrderId = this.getOriginalOrderId();
        result = result * 59 + ($originalOrderId == null ? 43 : $originalOrderId.hashCode());
        String $orderId = this.getOrderId();
        result = result * 59 + ($orderId == null ? 43 : $orderId.hashCode());
        return result;
    }

    public String toString() {
        return "ChangeAgvProgress(id=" + this.getId() + ", originalRobot=" + this.getOriginalRobot() + ", replaceRobot=" + this.getReplaceRobot() + ", status=" + this.getStatus() + ", executorTime=" + this.getExecutorTime() + ", reason=" + this.getReason() + ", errorMsg=" + this.getErrorMsg() + ", originalOrderId=" + this.getOriginalOrderId() + ", orderId=" + this.getOrderId() + ")";
    }

    public ChangeAgvProgress() {
    }

    public ChangeAgvProgress(String id, String originalRobot, String replaceRobot, Integer status, Date executorTime, String reason, String errorMsg, String originalOrderId, String orderId) {
        this.id = id;
        this.originalRobot = originalRobot;
        this.replaceRobot = replaceRobot;
        this.status = status;
        this.executorTime = executorTime;
        this.reason = reason;
        this.errorMsg = errorMsg;
        this.originalOrderId = originalOrderId;
        this.orderId = orderId;
    }
}

