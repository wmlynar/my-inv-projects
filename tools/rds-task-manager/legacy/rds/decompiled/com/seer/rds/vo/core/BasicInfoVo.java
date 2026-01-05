/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.BasicInfoVo
 *  io.swagger.annotations.ApiModel
 */
package com.seer.rds.vo.core;

import io.swagger.annotations.ApiModel;
import java.util.List;

@ApiModel(value="\u7981\u7528\u7684\u7ebf\u8def\u5bf9\u8c61")
public class BasicInfoVo {
    private String current_map;
    private String dsp_version;
    private String ip;
    private String model;
    private String robot_note;
    private String version;
    private List<String> current_area;

    public String getCurrent_map() {
        return this.current_map;
    }

    public String getDsp_version() {
        return this.dsp_version;
    }

    public String getIp() {
        return this.ip;
    }

    public String getModel() {
        return this.model;
    }

    public String getRobot_note() {
        return this.robot_note;
    }

    public String getVersion() {
        return this.version;
    }

    public List<String> getCurrent_area() {
        return this.current_area;
    }

    public void setCurrent_map(String current_map) {
        this.current_map = current_map;
    }

    public void setDsp_version(String dsp_version) {
        this.dsp_version = dsp_version;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public void setRobot_note(String robot_note) {
        this.robot_note = robot_note;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public void setCurrent_area(List<String> current_area) {
        this.current_area = current_area;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BasicInfoVo)) {
            return false;
        }
        BasicInfoVo other = (BasicInfoVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$current_map = this.getCurrent_map();
        String other$current_map = other.getCurrent_map();
        if (this$current_map == null ? other$current_map != null : !this$current_map.equals(other$current_map)) {
            return false;
        }
        String this$dsp_version = this.getDsp_version();
        String other$dsp_version = other.getDsp_version();
        if (this$dsp_version == null ? other$dsp_version != null : !this$dsp_version.equals(other$dsp_version)) {
            return false;
        }
        String this$ip = this.getIp();
        String other$ip = other.getIp();
        if (this$ip == null ? other$ip != null : !this$ip.equals(other$ip)) {
            return false;
        }
        String this$model = this.getModel();
        String other$model = other.getModel();
        if (this$model == null ? other$model != null : !this$model.equals(other$model)) {
            return false;
        }
        String this$robot_note = this.getRobot_note();
        String other$robot_note = other.getRobot_note();
        if (this$robot_note == null ? other$robot_note != null : !this$robot_note.equals(other$robot_note)) {
            return false;
        }
        String this$version = this.getVersion();
        String other$version = other.getVersion();
        if (this$version == null ? other$version != null : !this$version.equals(other$version)) {
            return false;
        }
        List this$current_area = this.getCurrent_area();
        List other$current_area = other.getCurrent_area();
        return !(this$current_area == null ? other$current_area != null : !((Object)this$current_area).equals(other$current_area));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BasicInfoVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $current_map = this.getCurrent_map();
        result = result * 59 + ($current_map == null ? 43 : $current_map.hashCode());
        String $dsp_version = this.getDsp_version();
        result = result * 59 + ($dsp_version == null ? 43 : $dsp_version.hashCode());
        String $ip = this.getIp();
        result = result * 59 + ($ip == null ? 43 : $ip.hashCode());
        String $model = this.getModel();
        result = result * 59 + ($model == null ? 43 : $model.hashCode());
        String $robot_note = this.getRobot_note();
        result = result * 59 + ($robot_note == null ? 43 : $robot_note.hashCode());
        String $version = this.getVersion();
        result = result * 59 + ($version == null ? 43 : $version.hashCode());
        List $current_area = this.getCurrent_area();
        result = result * 59 + ($current_area == null ? 43 : ((Object)$current_area).hashCode());
        return result;
    }

    public String toString() {
        return "BasicInfoVo(current_map=" + this.getCurrent_map() + ", dsp_version=" + this.getDsp_version() + ", ip=" + this.getIp() + ", model=" + this.getModel() + ", robot_note=" + this.getRobot_note() + ", version=" + this.getVersion() + ", current_area=" + this.getCurrent_area() + ")";
    }

    public BasicInfoVo(String current_map, String dsp_version, String ip, String model, String robot_note, String version, List<String> current_area) {
        this.current_map = current_map;
        this.dsp_version = dsp_version;
        this.ip = ip;
        this.model = model;
        this.robot_note = robot_note;
        this.version = version;
        this.current_area = current_area;
    }

    public BasicInfoVo() {
    }
}

