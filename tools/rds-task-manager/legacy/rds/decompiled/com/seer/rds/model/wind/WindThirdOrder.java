/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.WindThirdOrder
 *  com.seer.rds.model.wind.WindThirdOrder$WindThirdOrderBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Lob
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.WindThirdOrder;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Lob;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_windthirdorder")
public class WindThirdOrder {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @Lob
    @Column(nullable=true)
    private String params;
    @Column(nullable=true, columnDefinition="INT default 0")
    private Integer status;
    private String type;
    private Date createDate;

    public static WindThirdOrderBuilder builder() {
        return new WindThirdOrderBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getParams() {
        return this.params;
    }

    public Integer getStatus() {
        return this.status;
    }

    public String getType() {
        return this.type;
    }

    public Date getCreateDate() {
        return this.createDate;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setParams(String params) {
        this.params = params;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setCreateDate(Date createDate) {
        this.createDate = createDate;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindThirdOrder)) {
            return false;
        }
        WindThirdOrder other = (WindThirdOrder)o;
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
        String this$params = this.getParams();
        String other$params = other.getParams();
        if (this$params == null ? other$params != null : !this$params.equals(other$params)) {
            return false;
        }
        String this$type = this.getType();
        String other$type = other.getType();
        if (this$type == null ? other$type != null : !this$type.equals(other$type)) {
            return false;
        }
        Date this$createDate = this.getCreateDate();
        Date other$createDate = other.getCreateDate();
        return !(this$createDate == null ? other$createDate != null : !((Object)this$createDate).equals(other$createDate));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindThirdOrder;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $params = this.getParams();
        result = result * 59 + ($params == null ? 43 : $params.hashCode());
        String $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        Date $createDate = this.getCreateDate();
        result = result * 59 + ($createDate == null ? 43 : ((Object)$createDate).hashCode());
        return result;
    }

    public String toString() {
        return "WindThirdOrder(id=" + this.getId() + ", params=" + this.getParams() + ", status=" + this.getStatus() + ", type=" + this.getType() + ", createDate=" + this.getCreateDate() + ")";
    }

    public WindThirdOrder() {
    }

    public WindThirdOrder(String id, String params, Integer status, String type, Date createDate) {
        this.id = id;
        this.params = params;
        this.status = status;
        this.type = type;
        this.createDate = createDate;
    }
}

