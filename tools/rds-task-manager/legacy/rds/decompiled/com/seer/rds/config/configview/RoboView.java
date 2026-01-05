/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.CfgFieldInterpreter
 *  com.seer.rds.config.configview.RoboView
 *  com.seer.rds.constant.UpdateSiteScopeEnum
 */
package com.seer.rds.config.configview;

import com.seer.rds.annotation.CfgFieldInterpreter;
import com.seer.rds.constant.UpdateSiteScopeEnum;
import java.util.ArrayList;
import java.util.List;

public class RoboView {
    private String name;
    private String host;
    private Integer port;
    private Boolean autoUpdateSiteContent = true;
    private int connectTimeout = 8000;
    private int rwTimeout = 8000;
    @CfgFieldInterpreter(name="updateSitesBy", remark="\u89c6\u89c9\u5e93\u4f4d\u76d1\u6d4b\u540c\u6b65\u65b9\u5f0f")
    private UpdateSiteScopeEnum updateSitesBy = UpdateSiteScopeEnum.NONE;
    @CfgFieldInterpreter(name="updateSitesGroup", remark="\u89c6\u89c9\u5e93\u4f4d\u76d1\u6d4b\u540c\u6b65\u5e93\u533a")
    private List<String> updateSitesGroup = new ArrayList();
    private int rcvBUF = 2;

    public String getName() {
        return this.name;
    }

    public String getHost() {
        return this.host;
    }

    public Integer getPort() {
        return this.port;
    }

    public Boolean getAutoUpdateSiteContent() {
        return this.autoUpdateSiteContent;
    }

    public int getConnectTimeout() {
        return this.connectTimeout;
    }

    public int getRwTimeout() {
        return this.rwTimeout;
    }

    public UpdateSiteScopeEnum getUpdateSitesBy() {
        return this.updateSitesBy;
    }

    public List<String> getUpdateSitesGroup() {
        return this.updateSitesGroup;
    }

    public int getRcvBUF() {
        return this.rcvBUF;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public void setPort(Integer port) {
        this.port = port;
    }

    public void setAutoUpdateSiteContent(Boolean autoUpdateSiteContent) {
        this.autoUpdateSiteContent = autoUpdateSiteContent;
    }

    public void setConnectTimeout(int connectTimeout) {
        this.connectTimeout = connectTimeout;
    }

    public void setRwTimeout(int rwTimeout) {
        this.rwTimeout = rwTimeout;
    }

    public void setUpdateSitesBy(UpdateSiteScopeEnum updateSitesBy) {
        this.updateSitesBy = updateSitesBy;
    }

    public void setUpdateSitesGroup(List<String> updateSitesGroup) {
        this.updateSitesGroup = updateSitesGroup;
    }

    public void setRcvBUF(int rcvBUF) {
        this.rcvBUF = rcvBUF;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RoboView)) {
            return false;
        }
        RoboView other = (RoboView)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getConnectTimeout() != other.getConnectTimeout()) {
            return false;
        }
        if (this.getRwTimeout() != other.getRwTimeout()) {
            return false;
        }
        if (this.getRcvBUF() != other.getRcvBUF()) {
            return false;
        }
        Integer this$port = this.getPort();
        Integer other$port = other.getPort();
        if (this$port == null ? other$port != null : !((Object)this$port).equals(other$port)) {
            return false;
        }
        Boolean this$autoUpdateSiteContent = this.getAutoUpdateSiteContent();
        Boolean other$autoUpdateSiteContent = other.getAutoUpdateSiteContent();
        if (this$autoUpdateSiteContent == null ? other$autoUpdateSiteContent != null : !((Object)this$autoUpdateSiteContent).equals(other$autoUpdateSiteContent)) {
            return false;
        }
        String this$name = this.getName();
        String other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) {
            return false;
        }
        String this$host = this.getHost();
        String other$host = other.getHost();
        if (this$host == null ? other$host != null : !this$host.equals(other$host)) {
            return false;
        }
        UpdateSiteScopeEnum this$updateSitesBy = this.getUpdateSitesBy();
        UpdateSiteScopeEnum other$updateSitesBy = other.getUpdateSitesBy();
        if (this$updateSitesBy == null ? other$updateSitesBy != null : !this$updateSitesBy.equals(other$updateSitesBy)) {
            return false;
        }
        List this$updateSitesGroup = this.getUpdateSitesGroup();
        List other$updateSitesGroup = other.getUpdateSitesGroup();
        return !(this$updateSitesGroup == null ? other$updateSitesGroup != null : !((Object)this$updateSitesGroup).equals(other$updateSitesGroup));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RoboView;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getConnectTimeout();
        result = result * 59 + this.getRwTimeout();
        result = result * 59 + this.getRcvBUF();
        Integer $port = this.getPort();
        result = result * 59 + ($port == null ? 43 : ((Object)$port).hashCode());
        Boolean $autoUpdateSiteContent = this.getAutoUpdateSiteContent();
        result = result * 59 + ($autoUpdateSiteContent == null ? 43 : ((Object)$autoUpdateSiteContent).hashCode());
        String $name = this.getName();
        result = result * 59 + ($name == null ? 43 : $name.hashCode());
        String $host = this.getHost();
        result = result * 59 + ($host == null ? 43 : $host.hashCode());
        UpdateSiteScopeEnum $updateSitesBy = this.getUpdateSitesBy();
        result = result * 59 + ($updateSitesBy == null ? 43 : $updateSitesBy.hashCode());
        List $updateSitesGroup = this.getUpdateSitesGroup();
        result = result * 59 + ($updateSitesGroup == null ? 43 : ((Object)$updateSitesGroup).hashCode());
        return result;
    }

    public String toString() {
        return "RoboView(name=" + this.getName() + ", host=" + this.getHost() + ", port=" + this.getPort() + ", autoUpdateSiteContent=" + this.getAutoUpdateSiteContent() + ", connectTimeout=" + this.getConnectTimeout() + ", rwTimeout=" + this.getRwTimeout() + ", updateSitesBy=" + this.getUpdateSitesBy() + ", updateSitesGroup=" + this.getUpdateSitesGroup() + ", rcvBUF=" + this.getRcvBUF() + ")";
    }
}

