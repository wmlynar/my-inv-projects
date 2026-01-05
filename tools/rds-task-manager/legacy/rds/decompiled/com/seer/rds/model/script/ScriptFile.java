/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.script.ScriptFile
 *  com.seer.rds.vo.ChildrenFileNameVo
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  javax.persistence.UniqueConstraint
 *  org.hibernate.annotations.CreationTimestamp
 */
package com.seer.rds.model.script;

import com.seer.rds.vo.ChildrenFileNameVo;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import javax.persistence.UniqueConstraint;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name="t_script", uniqueConstraints={@UniqueConstraint(columnNames={"folder_name"})})
public class ScriptFile {
    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private Long id;
    @Column(name="folder_name")
    private String folderName;
    @CreationTimestamp
    @Temporal(value=TemporalType.TIMESTAMP)
    @Column(name="create_time")
    private Date createTime;
    @Column(columnDefinition="INT default 1")
    private Integer enable;
    @Column(name="enable_time")
    private Date enableTime;
    @Column(columnDefinition="INT default 1")
    private Integer debugEnable;
    @Transient
    private List<ChildrenFileNameVo> children;

    public Long getId() {
        return this.id;
    }

    public String getFolderName() {
        return this.folderName;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public Integer getEnable() {
        return this.enable;
    }

    public Date getEnableTime() {
        return this.enableTime;
    }

    public Integer getDebugEnable() {
        return this.debugEnable;
    }

    public List<ChildrenFileNameVo> getChildren() {
        return this.children;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setFolderName(String folderName) {
        this.folderName = folderName;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public void setEnable(Integer enable) {
        this.enable = enable;
    }

    public void setEnableTime(Date enableTime) {
        this.enableTime = enableTime;
    }

    public void setDebugEnable(Integer debugEnable) {
        this.debugEnable = debugEnable;
    }

    public void setChildren(List<ChildrenFileNameVo> children) {
        this.children = children;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ScriptFile)) {
            return false;
        }
        ScriptFile other = (ScriptFile)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Long this$id = this.getId();
        Long other$id = other.getId();
        if (this$id == null ? other$id != null : !((Object)this$id).equals(other$id)) {
            return false;
        }
        Integer this$enable = this.getEnable();
        Integer other$enable = other.getEnable();
        if (this$enable == null ? other$enable != null : !((Object)this$enable).equals(other$enable)) {
            return false;
        }
        Integer this$debugEnable = this.getDebugEnable();
        Integer other$debugEnable = other.getDebugEnable();
        if (this$debugEnable == null ? other$debugEnable != null : !((Object)this$debugEnable).equals(other$debugEnable)) {
            return false;
        }
        String this$folderName = this.getFolderName();
        String other$folderName = other.getFolderName();
        if (this$folderName == null ? other$folderName != null : !this$folderName.equals(other$folderName)) {
            return false;
        }
        Date this$createTime = this.getCreateTime();
        Date other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime)) {
            return false;
        }
        Date this$enableTime = this.getEnableTime();
        Date other$enableTime = other.getEnableTime();
        if (this$enableTime == null ? other$enableTime != null : !((Object)this$enableTime).equals(other$enableTime)) {
            return false;
        }
        List this$children = this.getChildren();
        List other$children = other.getChildren();
        return !(this$children == null ? other$children != null : !((Object)this$children).equals(other$children));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ScriptFile;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $id = this.getId();
        result = result * 59 + ($id == null ? 43 : ((Object)$id).hashCode());
        Integer $enable = this.getEnable();
        result = result * 59 + ($enable == null ? 43 : ((Object)$enable).hashCode());
        Integer $debugEnable = this.getDebugEnable();
        result = result * 59 + ($debugEnable == null ? 43 : ((Object)$debugEnable).hashCode());
        String $folderName = this.getFolderName();
        result = result * 59 + ($folderName == null ? 43 : $folderName.hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        Date $enableTime = this.getEnableTime();
        result = result * 59 + ($enableTime == null ? 43 : ((Object)$enableTime).hashCode());
        List $children = this.getChildren();
        result = result * 59 + ($children == null ? 43 : ((Object)$children).hashCode());
        return result;
    }

    public String toString() {
        return "ScriptFile(id=" + this.getId() + ", folderName=" + this.getFolderName() + ", createTime=" + this.getCreateTime() + ", enable=" + this.getEnable() + ", enableTime=" + this.getEnableTime() + ", debugEnable=" + this.getDebugEnable() + ", children=" + this.getChildren() + ")";
    }
}

