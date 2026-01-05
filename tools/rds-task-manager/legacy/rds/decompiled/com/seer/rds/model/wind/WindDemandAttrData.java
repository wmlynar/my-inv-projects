/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.WindDemandAttrData
 *  com.seer.rds.model.wind.WindDemandAttrData$WindDemandAttrDataBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.WindDemandAttrData;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;

@Entity
@Table(name="t_demand_attr_data", indexes={@Index(name="demandIdIndex", columnList="demandId"), @Index(name="attributeIdIndex", columnList="attributeId")})
public class WindDemandAttrData {
    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private Long id;
    private String demandId;
    private Long attributeId;
    private String attributeValue;

    public static WindDemandAttrDataBuilder builder() {
        return new WindDemandAttrDataBuilder();
    }

    public Long getId() {
        return this.id;
    }

    public String getDemandId() {
        return this.demandId;
    }

    public Long getAttributeId() {
        return this.attributeId;
    }

    public String getAttributeValue() {
        return this.attributeValue;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setDemandId(String demandId) {
        this.demandId = demandId;
    }

    public void setAttributeId(Long attributeId) {
        this.attributeId = attributeId;
    }

    public void setAttributeValue(String attributeValue) {
        this.attributeValue = attributeValue;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindDemandAttrData)) {
            return false;
        }
        WindDemandAttrData other = (WindDemandAttrData)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Long this$id = this.getId();
        Long other$id = other.getId();
        if (this$id == null ? other$id != null : !((Object)this$id).equals(other$id)) {
            return false;
        }
        Long this$attributeId = this.getAttributeId();
        Long other$attributeId = other.getAttributeId();
        if (this$attributeId == null ? other$attributeId != null : !((Object)this$attributeId).equals(other$attributeId)) {
            return false;
        }
        String this$demandId = this.getDemandId();
        String other$demandId = other.getDemandId();
        if (this$demandId == null ? other$demandId != null : !this$demandId.equals(other$demandId)) {
            return false;
        }
        String this$attributeValue = this.getAttributeValue();
        String other$attributeValue = other.getAttributeValue();
        return !(this$attributeValue == null ? other$attributeValue != null : !this$attributeValue.equals(other$attributeValue));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindDemandAttrData;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $id = this.getId();
        result = result * 59 + ($id == null ? 43 : ((Object)$id).hashCode());
        Long $attributeId = this.getAttributeId();
        result = result * 59 + ($attributeId == null ? 43 : ((Object)$attributeId).hashCode());
        String $demandId = this.getDemandId();
        result = result * 59 + ($demandId == null ? 43 : $demandId.hashCode());
        String $attributeValue = this.getAttributeValue();
        result = result * 59 + ($attributeValue == null ? 43 : $attributeValue.hashCode());
        return result;
    }

    public String toString() {
        return "WindDemandAttrData(id=" + this.getId() + ", demandId=" + this.getDemandId() + ", attributeId=" + this.getAttributeId() + ", attributeValue=" + this.getAttributeValue() + ")";
    }

    public WindDemandAttrData() {
    }

    public WindDemandAttrData(Long id, String demandId, Long attributeId, String attributeValue) {
        this.id = id;
        this.demandId = demandId;
        this.attributeId = attributeId;
        this.attributeValue = attributeValue;
    }
}

