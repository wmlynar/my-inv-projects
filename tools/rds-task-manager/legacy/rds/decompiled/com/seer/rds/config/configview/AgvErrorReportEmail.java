/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.AgvErrorReportEmail
 */
package com.seer.rds.config.configview;

public class AgvErrorReportEmail {
    private Boolean ifEnabled = false;
    private String toAddresses;
    private String Sender;

    public Boolean getIfEnabled() {
        return this.ifEnabled;
    }

    public String getToAddresses() {
        return this.toAddresses;
    }

    public String getSender() {
        return this.Sender;
    }

    public void setIfEnabled(Boolean ifEnabled) {
        this.ifEnabled = ifEnabled;
    }

    public void setToAddresses(String toAddresses) {
        this.toAddresses = toAddresses;
    }

    public void setSender(String Sender) {
        this.Sender = Sender;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AgvErrorReportEmail)) {
            return false;
        }
        AgvErrorReportEmail other = (AgvErrorReportEmail)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$ifEnabled = this.getIfEnabled();
        Boolean other$ifEnabled = other.getIfEnabled();
        if (this$ifEnabled == null ? other$ifEnabled != null : !((Object)this$ifEnabled).equals(other$ifEnabled)) {
            return false;
        }
        String this$toAddresses = this.getToAddresses();
        String other$toAddresses = other.getToAddresses();
        if (this$toAddresses == null ? other$toAddresses != null : !this$toAddresses.equals(other$toAddresses)) {
            return false;
        }
        String this$Sender = this.getSender();
        String other$Sender = other.getSender();
        return !(this$Sender == null ? other$Sender != null : !this$Sender.equals(other$Sender));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AgvErrorReportEmail;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $ifEnabled = this.getIfEnabled();
        result = result * 59 + ($ifEnabled == null ? 43 : ((Object)$ifEnabled).hashCode());
        String $toAddresses = this.getToAddresses();
        result = result * 59 + ($toAddresses == null ? 43 : $toAddresses.hashCode());
        String $Sender = this.getSender();
        result = result * 59 + ($Sender == null ? 43 : $Sender.hashCode());
        return result;
    }

    public String toString() {
        return "AgvErrorReportEmail(ifEnabled=" + this.getIfEnabled() + ", toAddresses=" + this.getToAddresses() + ", Sender=" + this.getSender() + ")";
    }
}

