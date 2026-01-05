/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.CfgFieldInterpreter
 *  com.seer.rds.config.configview.RdsCoreConfigOfView
 *  com.seer.rds.constant.UpdateSiteScopeEnum
 */
package com.seer.rds.config.configview;

import com.seer.rds.annotation.CfgFieldInterpreter;
import com.seer.rds.constant.UpdateSiteScopeEnum;
import java.util.ArrayList;
import java.util.List;

public class RdsCoreConfigOfView {
    @CfgFieldInterpreter(name="baseUrl", remark="Core\u8fde\u63a5\u5730\u5740")
    private String baseUrl = "http://127.0.0.1:8088";
    @CfgFieldInterpreter(name="queryInterval", remark="Core\u540c\u6b65\u95f4\u9694(\u6beb\u79d2)")
    private long queryInterval = 700L;
    @CfgFieldInterpreter(name="downloadSceneReadTimeout", remark="\u4e0b\u8f7d\u573a\u666f\u8bfb\u53d6\u8d85\u65f6\u65f6\u95f4(\u6beb\u79d2)")
    private int downloadSceneReadTimeout = 20000;
    @CfgFieldInterpreter(name="updateSitesBy", remark="\u5e93\u4f4d\u76d1\u6d4b\u540c\u6b65\u65b9\u5f0f")
    private UpdateSiteScopeEnum updateSitesBy = UpdateSiteScopeEnum.NONE;
    @CfgFieldInterpreter(name="siteStatusSyncInterval", remark="\u5e93\u4f4d\u76d1\u6d4b\u540c\u6b65\u95f4\u9694(\u6beb\u79d2)")
    private Long siteStatusSyncInterval = 3000L;
    @CfgFieldInterpreter(name="updateSitesGroup", remark="\u5e93\u4f4d\u76d1\u6d4b\u540c\u6b65\u5e93\u533a")
    private List<String> updateSitesGroup = new ArrayList();

    public String getBaseUrl() {
        return this.baseUrl;
    }

    public long getQueryInterval() {
        return this.queryInterval;
    }

    public int getDownloadSceneReadTimeout() {
        return this.downloadSceneReadTimeout;
    }

    public UpdateSiteScopeEnum getUpdateSitesBy() {
        return this.updateSitesBy;
    }

    public Long getSiteStatusSyncInterval() {
        return this.siteStatusSyncInterval;
    }

    public List<String> getUpdateSitesGroup() {
        return this.updateSitesGroup;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public void setQueryInterval(long queryInterval) {
        this.queryInterval = queryInterval;
    }

    public void setDownloadSceneReadTimeout(int downloadSceneReadTimeout) {
        this.downloadSceneReadTimeout = downloadSceneReadTimeout;
    }

    public void setUpdateSitesBy(UpdateSiteScopeEnum updateSitesBy) {
        this.updateSitesBy = updateSitesBy;
    }

    public void setSiteStatusSyncInterval(Long siteStatusSyncInterval) {
        this.siteStatusSyncInterval = siteStatusSyncInterval;
    }

    public void setUpdateSitesGroup(List<String> updateSitesGroup) {
        this.updateSitesGroup = updateSitesGroup;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RdsCoreConfigOfView)) {
            return false;
        }
        RdsCoreConfigOfView other = (RdsCoreConfigOfView)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getQueryInterval() != other.getQueryInterval()) {
            return false;
        }
        if (this.getDownloadSceneReadTimeout() != other.getDownloadSceneReadTimeout()) {
            return false;
        }
        Long this$siteStatusSyncInterval = this.getSiteStatusSyncInterval();
        Long other$siteStatusSyncInterval = other.getSiteStatusSyncInterval();
        if (this$siteStatusSyncInterval == null ? other$siteStatusSyncInterval != null : !((Object)this$siteStatusSyncInterval).equals(other$siteStatusSyncInterval)) {
            return false;
        }
        String this$baseUrl = this.getBaseUrl();
        String other$baseUrl = other.getBaseUrl();
        if (this$baseUrl == null ? other$baseUrl != null : !this$baseUrl.equals(other$baseUrl)) {
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
        return other instanceof RdsCoreConfigOfView;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        long $queryInterval = this.getQueryInterval();
        result = result * 59 + (int)($queryInterval >>> 32 ^ $queryInterval);
        result = result * 59 + this.getDownloadSceneReadTimeout();
        Long $siteStatusSyncInterval = this.getSiteStatusSyncInterval();
        result = result * 59 + ($siteStatusSyncInterval == null ? 43 : ((Object)$siteStatusSyncInterval).hashCode());
        String $baseUrl = this.getBaseUrl();
        result = result * 59 + ($baseUrl == null ? 43 : $baseUrl.hashCode());
        UpdateSiteScopeEnum $updateSitesBy = this.getUpdateSitesBy();
        result = result * 59 + ($updateSitesBy == null ? 43 : $updateSitesBy.hashCode());
        List $updateSitesGroup = this.getUpdateSitesGroup();
        result = result * 59 + ($updateSitesGroup == null ? 43 : ((Object)$updateSitesGroup).hashCode());
        return result;
    }

    public String toString() {
        return "RdsCoreConfigOfView(baseUrl=" + this.getBaseUrl() + ", queryInterval=" + this.getQueryInterval() + ", downloadSceneReadTimeout=" + this.getDownloadSceneReadTimeout() + ", updateSitesBy=" + this.getUpdateSitesBy() + ", siteStatusSyncInterval=" + this.getSiteStatusSyncInterval() + ", updateSitesGroup=" + this.getUpdateSitesGroup() + ")";
    }
}

