/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.ScriptButton
 *  com.seer.rds.vo.ScriptButton$ScriptButtonBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.ScriptButton;

public class ScriptButton {
    private String label;
    private String remark;
    private String scriptFunction;
    private String level;
    private Integer type = 0;

    public static ScriptButtonBuilder builder() {
        return new ScriptButtonBuilder();
    }

    public String getLabel() {
        return this.label;
    }

    public String getRemark() {
        return this.remark;
    }

    public String getScriptFunction() {
        return this.scriptFunction;
    }

    public String getLevel() {
        return this.level;
    }

    public Integer getType() {
        return this.type;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public void setScriptFunction(String scriptFunction) {
        this.scriptFunction = scriptFunction;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public void setType(Integer type) {
        this.type = type;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ScriptButton)) {
            return false;
        }
        ScriptButton other = (ScriptButton)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$type = this.getType();
        Integer other$type = other.getType();
        if (this$type == null ? other$type != null : !((Object)this$type).equals(other$type)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$remark = this.getRemark();
        String other$remark = other.getRemark();
        if (this$remark == null ? other$remark != null : !this$remark.equals(other$remark)) {
            return false;
        }
        String this$scriptFunction = this.getScriptFunction();
        String other$scriptFunction = other.getScriptFunction();
        if (this$scriptFunction == null ? other$scriptFunction != null : !this$scriptFunction.equals(other$scriptFunction)) {
            return false;
        }
        String this$level = this.getLevel();
        String other$level = other.getLevel();
        return !(this$level == null ? other$level != null : !this$level.equals(other$level));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ScriptButton;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $type = this.getType();
        result = result * 59 + ($type == null ? 43 : ((Object)$type).hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $remark = this.getRemark();
        result = result * 59 + ($remark == null ? 43 : $remark.hashCode());
        String $scriptFunction = this.getScriptFunction();
        result = result * 59 + ($scriptFunction == null ? 43 : $scriptFunction.hashCode());
        String $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : $level.hashCode());
        return result;
    }

    public String toString() {
        return "ScriptButton(label=" + this.getLabel() + ", remark=" + this.getRemark() + ", scriptFunction=" + this.getScriptFunction() + ", level=" + this.getLevel() + ", type=" + this.getType() + ")";
    }

    public ScriptButton(String label, String remark, String scriptFunction, String level, Integer type) {
        this.label = label;
        this.remark = remark;
        this.scriptFunction = scriptFunction;
        this.level = level;
        this.type = type;
    }

    public ScriptButton() {
    }
}

