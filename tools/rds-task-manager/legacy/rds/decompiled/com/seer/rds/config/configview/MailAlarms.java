/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.MailAlarms
 */
package com.seer.rds.config.configview;

public class MailAlarms {
    private String toAddresses = "";

    public String getToAddresses() {
        return this.toAddresses;
    }

    public void setToAddresses(String toAddresses) {
        this.toAddresses = toAddresses;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof MailAlarms)) {
            return false;
        }
        MailAlarms other = (MailAlarms)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$toAddresses = this.getToAddresses();
        String other$toAddresses = other.getToAddresses();
        return !(this$toAddresses == null ? other$toAddresses != null : !this$toAddresses.equals(other$toAddresses));
    }

    protected boolean canEqual(Object other) {
        return other instanceof MailAlarms;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $toAddresses = this.getToAddresses();
        result = result * 59 + ($toAddresses == null ? 43 : $toAddresses.hashCode());
        return result;
    }

    public String toString() {
        return "MailAlarms(toAddresses=" + this.getToAddresses() + ")";
    }
}

