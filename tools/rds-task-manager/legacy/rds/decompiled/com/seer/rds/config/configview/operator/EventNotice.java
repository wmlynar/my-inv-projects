/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.EventNotice
 */
package com.seer.rds.config.configview.operator;

import java.util.ArrayList;
import java.util.List;

public class EventNotice {
    private String scope = "";
    private String noticeType = "";
    private List<String> when = new ArrayList();

    public String getScope() {
        return this.scope;
    }

    public String getNoticeType() {
        return this.noticeType;
    }

    public List<String> getWhen() {
        return this.when;
    }

    public void setScope(String scope) {
        this.scope = scope;
    }

    public void setNoticeType(String noticeType) {
        this.noticeType = noticeType;
    }

    public void setWhen(List<String> when) {
        this.when = when;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof EventNotice)) {
            return false;
        }
        EventNotice other = (EventNotice)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$scope = this.getScope();
        String other$scope = other.getScope();
        if (this$scope == null ? other$scope != null : !this$scope.equals(other$scope)) {
            return false;
        }
        String this$noticeType = this.getNoticeType();
        String other$noticeType = other.getNoticeType();
        if (this$noticeType == null ? other$noticeType != null : !this$noticeType.equals(other$noticeType)) {
            return false;
        }
        List this$when = this.getWhen();
        List other$when = other.getWhen();
        return !(this$when == null ? other$when != null : !((Object)this$when).equals(other$when));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EventNotice;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $scope = this.getScope();
        result = result * 59 + ($scope == null ? 43 : $scope.hashCode());
        String $noticeType = this.getNoticeType();
        result = result * 59 + ($noticeType == null ? 43 : $noticeType.hashCode());
        List $when = this.getWhen();
        result = result * 59 + ($when == null ? 43 : ((Object)$when).hashCode());
        return result;
    }

    public String toString() {
        return "EventNotice(scope=" + this.getScope() + ", noticeType=" + this.getNoticeType() + ", when=" + this.getWhen() + ")";
    }
}

