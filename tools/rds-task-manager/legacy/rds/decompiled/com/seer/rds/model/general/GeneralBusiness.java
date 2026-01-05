/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.general.GeneralBusiness
 *  com.seer.rds.model.general.GeneralBusiness$GeneralBusinessBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Lob
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.UniqueConstraint
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.general;

import com.seer.rds.model.general.GeneralBusiness;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Lob;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.UniqueConstraint;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_windtask_generalbusiness", uniqueConstraints={@UniqueConstraint(columnNames={"label", "generalLabel"})})
public class GeneralBusiness {
    @Id
    @GenericGenerator(name="session_info_uuid_gen", strategy="assigned")
    @GeneratedValue(generator="session_info_uuid_gen")
    private String id;
    private String generalLabel;
    private String name;
    private String remake;
    private String net;
    private String label;
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date createdOn;
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date modifyOn;
    @Column(nullable=true, columnDefinition="INT default 0")
    private Integer enable;
    @Lob
    @Column(nullable=true)
    private String triggers;
    @Lob
    @Column(nullable=true)
    private String protocols;
    @Lob
    @Column(nullable=true)
    private String transport;
    @Column(nullable=true, columnDefinition="INT default 0")
    private Integer taskNum;
    private Integer type;
    private Integer version;

    public static GeneralBusinessBuilder builder() {
        return new GeneralBusinessBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getGeneralLabel() {
        return this.generalLabel;
    }

    public String getName() {
        return this.name;
    }

    public String getRemake() {
        return this.remake;
    }

    public String getNet() {
        return this.net;
    }

    public String getLabel() {
        return this.label;
    }

    public Date getCreatedOn() {
        return this.createdOn;
    }

    public Date getModifyOn() {
        return this.modifyOn;
    }

    public Integer getEnable() {
        return this.enable;
    }

    public String getTriggers() {
        return this.triggers;
    }

    public String getProtocols() {
        return this.protocols;
    }

    public String getTransport() {
        return this.transport;
    }

    public Integer getTaskNum() {
        return this.taskNum;
    }

    public Integer getType() {
        return this.type;
    }

    public Integer getVersion() {
        return this.version;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setGeneralLabel(String generalLabel) {
        this.generalLabel = generalLabel;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setRemake(String remake) {
        this.remake = remake;
    }

    public void setNet(String net) {
        this.net = net;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setCreatedOn(Date createdOn) {
        this.createdOn = createdOn;
    }

    public void setModifyOn(Date modifyOn) {
        this.modifyOn = modifyOn;
    }

    public void setEnable(Integer enable) {
        this.enable = enable;
    }

    public void setTriggers(String triggers) {
        this.triggers = triggers;
    }

    public void setProtocols(String protocols) {
        this.protocols = protocols;
    }

    public void setTransport(String transport) {
        this.transport = transport;
    }

    public void setTaskNum(Integer taskNum) {
        this.taskNum = taskNum;
    }

    public void setType(Integer type) {
        this.type = type;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof GeneralBusiness)) {
            return false;
        }
        GeneralBusiness other = (GeneralBusiness)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$enable = this.getEnable();
        Integer other$enable = other.getEnable();
        if (this$enable == null ? other$enable != null : !((Object)this$enable).equals(other$enable)) {
            return false;
        }
        Integer this$taskNum = this.getTaskNum();
        Integer other$taskNum = other.getTaskNum();
        if (this$taskNum == null ? other$taskNum != null : !((Object)this$taskNum).equals(other$taskNum)) {
            return false;
        }
        Integer this$type = this.getType();
        Integer other$type = other.getType();
        if (this$type == null ? other$type != null : !((Object)this$type).equals(other$type)) {
            return false;
        }
        Integer this$version = this.getVersion();
        Integer other$version = other.getVersion();
        if (this$version == null ? other$version != null : !((Object)this$version).equals(other$version)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$generalLabel = this.getGeneralLabel();
        String other$generalLabel = other.getGeneralLabel();
        if (this$generalLabel == null ? other$generalLabel != null : !this$generalLabel.equals(other$generalLabel)) {
            return false;
        }
        String this$name = this.getName();
        String other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) {
            return false;
        }
        String this$remake = this.getRemake();
        String other$remake = other.getRemake();
        if (this$remake == null ? other$remake != null : !this$remake.equals(other$remake)) {
            return false;
        }
        String this$net = this.getNet();
        String other$net = other.getNet();
        if (this$net == null ? other$net != null : !this$net.equals(other$net)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        Date this$createdOn = this.getCreatedOn();
        Date other$createdOn = other.getCreatedOn();
        if (this$createdOn == null ? other$createdOn != null : !((Object)this$createdOn).equals(other$createdOn)) {
            return false;
        }
        Date this$modifyOn = this.getModifyOn();
        Date other$modifyOn = other.getModifyOn();
        if (this$modifyOn == null ? other$modifyOn != null : !((Object)this$modifyOn).equals(other$modifyOn)) {
            return false;
        }
        String this$triggers = this.getTriggers();
        String other$triggers = other.getTriggers();
        if (this$triggers == null ? other$triggers != null : !this$triggers.equals(other$triggers)) {
            return false;
        }
        String this$protocols = this.getProtocols();
        String other$protocols = other.getProtocols();
        if (this$protocols == null ? other$protocols != null : !this$protocols.equals(other$protocols)) {
            return false;
        }
        String this$transport = this.getTransport();
        String other$transport = other.getTransport();
        return !(this$transport == null ? other$transport != null : !this$transport.equals(other$transport));
    }

    protected boolean canEqual(Object other) {
        return other instanceof GeneralBusiness;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $enable = this.getEnable();
        result = result * 59 + ($enable == null ? 43 : ((Object)$enable).hashCode());
        Integer $taskNum = this.getTaskNum();
        result = result * 59 + ($taskNum == null ? 43 : ((Object)$taskNum).hashCode());
        Integer $type = this.getType();
        result = result * 59 + ($type == null ? 43 : ((Object)$type).hashCode());
        Integer $version = this.getVersion();
        result = result * 59 + ($version == null ? 43 : ((Object)$version).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $generalLabel = this.getGeneralLabel();
        result = result * 59 + ($generalLabel == null ? 43 : $generalLabel.hashCode());
        String $name = this.getName();
        result = result * 59 + ($name == null ? 43 : $name.hashCode());
        String $remake = this.getRemake();
        result = result * 59 + ($remake == null ? 43 : $remake.hashCode());
        String $net = this.getNet();
        result = result * 59 + ($net == null ? 43 : $net.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        Date $createdOn = this.getCreatedOn();
        result = result * 59 + ($createdOn == null ? 43 : ((Object)$createdOn).hashCode());
        Date $modifyOn = this.getModifyOn();
        result = result * 59 + ($modifyOn == null ? 43 : ((Object)$modifyOn).hashCode());
        String $triggers = this.getTriggers();
        result = result * 59 + ($triggers == null ? 43 : $triggers.hashCode());
        String $protocols = this.getProtocols();
        result = result * 59 + ($protocols == null ? 43 : $protocols.hashCode());
        String $transport = this.getTransport();
        result = result * 59 + ($transport == null ? 43 : $transport.hashCode());
        return result;
    }

    public String toString() {
        return "GeneralBusiness(id=" + this.getId() + ", generalLabel=" + this.getGeneralLabel() + ", name=" + this.getName() + ", remake=" + this.getRemake() + ", net=" + this.getNet() + ", label=" + this.getLabel() + ", createdOn=" + this.getCreatedOn() + ", modifyOn=" + this.getModifyOn() + ", enable=" + this.getEnable() + ", triggers=" + this.getTriggers() + ", protocols=" + this.getProtocols() + ", transport=" + this.getTransport() + ", taskNum=" + this.getTaskNum() + ", type=" + this.getType() + ", version=" + this.getVersion() + ")";
    }

    public GeneralBusiness() {
    }

    public GeneralBusiness(String id, String generalLabel, String name, String remake, String net, String label, Date createdOn, Date modifyOn, Integer enable, String triggers, String protocols, String transport, Integer taskNum, Integer type, Integer version) {
        this.id = id;
        this.generalLabel = generalLabel;
        this.name = name;
        this.remake = remake;
        this.net = net;
        this.label = label;
        this.createdOn = createdOn;
        this.modifyOn = modifyOn;
        this.enable = enable;
        this.triggers = triggers;
        this.protocols = protocols;
        this.transport = transport;
        this.taskNum = taskNum;
        this.type = type;
        this.version = version;
    }
}

