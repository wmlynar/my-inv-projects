/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.ExpandColContent
 *  com.seer.rds.config.configview.operator.OperatorOrderParam
 */
package com.seer.rds.config.configview.operator;

import com.seer.rds.config.configview.operator.OperatorOrderParam;
import java.util.ArrayList;
import java.util.List;

public class ExpandColContent {
    private String contentId;
    private String type;
    private String label;
    private String funcName;
    @Deprecated
    private Boolean successfulRefresh = false;
    private List<OperatorOrderParam> params = new ArrayList();

    public String getContentId() {
        return this.contentId;
    }

    public String getType() {
        return this.type;
    }

    public String getLabel() {
        return this.label;
    }

    public String getFuncName() {
        return this.funcName;
    }

    @Deprecated
    public Boolean getSuccessfulRefresh() {
        return this.successfulRefresh;
    }

    public List<OperatorOrderParam> getParams() {
        return this.params;
    }

    public void setContentId(String contentId) {
        this.contentId = contentId;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setFuncName(String funcName) {
        this.funcName = funcName;
    }

    @Deprecated
    public void setSuccessfulRefresh(Boolean successfulRefresh) {
        this.successfulRefresh = successfulRefresh;
    }

    public void setParams(List<OperatorOrderParam> params) {
        this.params = params;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ExpandColContent)) {
            return false;
        }
        ExpandColContent other = (ExpandColContent)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$successfulRefresh = this.getSuccessfulRefresh();
        Boolean other$successfulRefresh = other.getSuccessfulRefresh();
        if (this$successfulRefresh == null ? other$successfulRefresh != null : !((Object)this$successfulRefresh).equals(other$successfulRefresh)) {
            return false;
        }
        String this$contentId = this.getContentId();
        String other$contentId = other.getContentId();
        if (this$contentId == null ? other$contentId != null : !this$contentId.equals(other$contentId)) {
            return false;
        }
        String this$type = this.getType();
        String other$type = other.getType();
        if (this$type == null ? other$type != null : !this$type.equals(other$type)) {
            return false;
        }
        String this$label = this.getLabel();
        String other$label = other.getLabel();
        if (this$label == null ? other$label != null : !this$label.equals(other$label)) {
            return false;
        }
        String this$funcName = this.getFuncName();
        String other$funcName = other.getFuncName();
        if (this$funcName == null ? other$funcName != null : !this$funcName.equals(other$funcName)) {
            return false;
        }
        List this$params = this.getParams();
        List other$params = other.getParams();
        return !(this$params == null ? other$params != null : !((Object)this$params).equals(other$params));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ExpandColContent;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $successfulRefresh = this.getSuccessfulRefresh();
        result = result * 59 + ($successfulRefresh == null ? 43 : ((Object)$successfulRefresh).hashCode());
        String $contentId = this.getContentId();
        result = result * 59 + ($contentId == null ? 43 : $contentId.hashCode());
        String $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        String $label = this.getLabel();
        result = result * 59 + ($label == null ? 43 : $label.hashCode());
        String $funcName = this.getFuncName();
        result = result * 59 + ($funcName == null ? 43 : $funcName.hashCode());
        List $params = this.getParams();
        result = result * 59 + ($params == null ? 43 : ((Object)$params).hashCode());
        return result;
    }

    public String toString() {
        return "ExpandColContent(contentId=" + this.getContentId() + ", type=" + this.getType() + ", label=" + this.getLabel() + ", funcName=" + this.getFuncName() + ", successfulRefresh=" + this.getSuccessfulRefresh() + ", params=" + this.getParams() + ")";
    }
}

