/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.admin.SysAlarm
 *  com.seer.rds.model.admin.SysAlarm$SysAlarmBuilder
 *  io.swagger.annotations.ApiModelProperty
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Lob
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.annotations.CreationTimestamp
 *  org.hibernate.annotations.GenericGenerator
 *  org.springframework.data.annotation.CreatedDate
 */
package com.seer.rds.model.admin;

import com.seer.rds.model.admin.SysAlarm;
import io.swagger.annotations.ApiModelProperty;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Lob;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;
import org.springframework.data.annotation.CreatedDate;

@Entity
@Table(name="t_sys_alarm")
public class SysAlarm {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @Column(nullable=false, columnDefinition="int default '1'", name="\"level\"")
    @ApiModelProperty(value="\u5f02\u5e38\u7b49\u7ea7 1:ERROR,2:WARN")
    private Integer level;
    @Column(nullable=false, columnDefinition="varchar(255) default ''")
    @ApiModelProperty(value="\u6807\u8bc6")
    private String identification = "";
    @Column(nullable=false, columnDefinition="varchar(50) default ''")
    @ApiModelProperty(value="\u9519\u8bef\u7801")
    private Integer code;
    @Lob
    @Column(nullable=false)
    @ApiModelProperty(value="\u9519\u8bef\u5185\u5bb9")
    private String message;
    @CreatedDate
    @Temporal(value=TemporalType.TIMESTAMP)
    @CreationTimestamp
    private Date createTime;

    public static SysAlarmBuilder builder() {
        return new SysAlarmBuilder();
    }

    public String getId() {
        return this.id;
    }

    public Integer getLevel() {
        return this.level;
    }

    public String getIdentification() {
        return this.identification;
    }

    public Integer getCode() {
        return this.code;
    }

    public String getMessage() {
        return this.message;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setLevel(Integer level) {
        this.level = level;
    }

    public void setIdentification(String identification) {
        this.identification = identification;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SysAlarm)) {
            return false;
        }
        SysAlarm other = (SysAlarm)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$level = this.getLevel();
        Integer other$level = other.getLevel();
        if (this$level == null ? other$level != null : !((Object)this$level).equals(other$level)) {
            return false;
        }
        Integer this$code = this.getCode();
        Integer other$code = other.getCode();
        if (this$code == null ? other$code != null : !((Object)this$code).equals(other$code)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$identification = this.getIdentification();
        String other$identification = other.getIdentification();
        if (this$identification == null ? other$identification != null : !this$identification.equals(other$identification)) {
            return false;
        }
        String this$message = this.getMessage();
        String other$message = other.getMessage();
        if (this$message == null ? other$message != null : !this$message.equals(other$message)) {
            return false;
        }
        Date this$createTime = this.getCreateTime();
        Date other$createTime = other.getCreateTime();
        return !(this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SysAlarm;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : ((Object)$level).hashCode());
        Integer $code = this.getCode();
        result = result * 59 + ($code == null ? 43 : ((Object)$code).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $identification = this.getIdentification();
        result = result * 59 + ($identification == null ? 43 : $identification.hashCode());
        String $message = this.getMessage();
        result = result * 59 + ($message == null ? 43 : $message.hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        return result;
    }

    public String toString() {
        return "SysAlarm(id=" + this.getId() + ", level=" + this.getLevel() + ", identification=" + this.getIdentification() + ", code=" + this.getCode() + ", message=" + this.getMessage() + ", createTime=" + this.getCreateTime() + ")";
    }

    public SysAlarm(String id, Integer level, String identification, Integer code, String message, Date createTime) {
        this.id = id;
        this.level = level;
        this.identification = identification;
        this.code = code;
        this.message = message;
        this.createTime = createTime;
    }

    public SysAlarm() {
    }
}

