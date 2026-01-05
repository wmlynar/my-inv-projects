/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.WindDemandAttr
 *  com.seer.rds.model.wind.WindDemandAttr$WindDemandAttrBuilder
 *  javax.persistence.Entity
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.WindDemandAttr;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;

@Entity
@Table(name="t_demand_attr", indexes={@Index(name="attributeNameIndex", columnList="attributeName", unique=true)})
public class WindDemandAttr {
    @Id
    private Long id;
    private String attributeName;
    private String defLabel;

    public WindDemandAttr(Long id, String attributeName) {
        this.id = id;
        this.attributeName = attributeName;
    }

    public static WindDemandAttrBuilder builder() {
        return new WindDemandAttrBuilder();
    }

    public Long getId() {
        return this.id;
    }

    public String getAttributeName() {
        return this.attributeName;
    }

    public String getDefLabel() {
        return this.defLabel;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setAttributeName(String attributeName) {
        this.attributeName = attributeName;
    }

    public void setDefLabel(String defLabel) {
        this.defLabel = defLabel;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindDemandAttr)) {
            return false;
        }
        WindDemandAttr other = (WindDemandAttr)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Long this$id = this.getId();
        Long other$id = other.getId();
        if (this$id == null ? other$id != null : !((Object)this$id).equals(other$id)) {
            return false;
        }
        String this$attributeName = this.getAttributeName();
        String other$attributeName = other.getAttributeName();
        if (this$attributeName == null ? other$attributeName != null : !this$attributeName.equals(other$attributeName)) {
            return false;
        }
        String this$defLabel = this.getDefLabel();
        String other$defLabel = other.getDefLabel();
        return !(this$defLabel == null ? other$defLabel != null : !this$defLabel.equals(other$defLabel));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindDemandAttr;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $id = this.getId();
        result = result * 59 + ($id == null ? 43 : ((Object)$id).hashCode());
        String $attributeName = this.getAttributeName();
        result = result * 59 + ($attributeName == null ? 43 : $attributeName.hashCode());
        String $defLabel = this.getDefLabel();
        result = result * 59 + ($defLabel == null ? 43 : $defLabel.hashCode());
        return result;
    }

    public String toString() {
        return "WindDemandAttr(id=" + this.getId() + ", attributeName=" + this.getAttributeName() + ", defLabel=" + this.getDefLabel() + ")";
    }

    public WindDemandAttr() {
    }

    public WindDemandAttr(Long id, String attributeName, String defLabel) {
        this.id = id;
        this.attributeName = attributeName;
        this.defLabel = defLabel;
    }
}

