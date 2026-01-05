/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.fasterxml.jackson.annotation.JsonIgnoreProperties
 *  com.seer.rds.vo.response.AlarmsDetailVo
 *  com.seer.rds.vo.response.AlarmsVo
 *  com.seer.rds.vo.response.AlarmsVo$AlarmsVoBuilder
 */
package com.seer.rds.vo.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.seer.rds.vo.response.AlarmsDetailVo;
import com.seer.rds.vo.response.AlarmsVo;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown=true)
public class AlarmsVo {
    private String uuid;
    private List<AlarmsDetailVo> warnings;
    private List<AlarmsDetailVo> errors;
    private List<AlarmsDetailVo> fatals;

    public static AlarmsVoBuilder builder() {
        return new AlarmsVoBuilder();
    }

    public String getUuid() {
        return this.uuid;
    }

    public List<AlarmsDetailVo> getWarnings() {
        return this.warnings;
    }

    public List<AlarmsDetailVo> getErrors() {
        return this.errors;
    }

    public List<AlarmsDetailVo> getFatals() {
        return this.fatals;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public void setWarnings(List<AlarmsDetailVo> warnings) {
        this.warnings = warnings;
    }

    public void setErrors(List<AlarmsDetailVo> errors) {
        this.errors = errors;
    }

    public void setFatals(List<AlarmsDetailVo> fatals) {
        this.fatals = fatals;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AlarmsVo)) {
            return false;
        }
        AlarmsVo other = (AlarmsVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$uuid = this.getUuid();
        String other$uuid = other.getUuid();
        if (this$uuid == null ? other$uuid != null : !this$uuid.equals(other$uuid)) {
            return false;
        }
        List this$warnings = this.getWarnings();
        List other$warnings = other.getWarnings();
        if (this$warnings == null ? other$warnings != null : !((Object)this$warnings).equals(other$warnings)) {
            return false;
        }
        List this$errors = this.getErrors();
        List other$errors = other.getErrors();
        if (this$errors == null ? other$errors != null : !((Object)this$errors).equals(other$errors)) {
            return false;
        }
        List this$fatals = this.getFatals();
        List other$fatals = other.getFatals();
        return !(this$fatals == null ? other$fatals != null : !((Object)this$fatals).equals(other$fatals));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AlarmsVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $uuid = this.getUuid();
        result = result * 59 + ($uuid == null ? 43 : $uuid.hashCode());
        List $warnings = this.getWarnings();
        result = result * 59 + ($warnings == null ? 43 : ((Object)$warnings).hashCode());
        List $errors = this.getErrors();
        result = result * 59 + ($errors == null ? 43 : ((Object)$errors).hashCode());
        List $fatals = this.getFatals();
        result = result * 59 + ($fatals == null ? 43 : ((Object)$fatals).hashCode());
        return result;
    }

    public String toString() {
        return "AlarmsVo(uuid=" + this.getUuid() + ", warnings=" + this.getWarnings() + ", errors=" + this.getErrors() + ", fatals=" + this.getFatals() + ")";
    }

    public AlarmsVo() {
    }

    public AlarmsVo(String uuid, List<AlarmsDetailVo> warnings, List<AlarmsDetailVo> errors, List<AlarmsDetailVo> fatals) {
        this.uuid = uuid;
        this.warnings = warnings;
        this.errors = errors;
        this.fatals = fatals;
    }
}

