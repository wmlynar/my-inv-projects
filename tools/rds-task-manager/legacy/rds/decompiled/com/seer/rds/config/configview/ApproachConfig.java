/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.ApproachConfig
 *  com.seer.rds.config.configview.FeiShuRobotAlarms
 *  com.seer.rds.config.configview.MailAlarms
 *  com.seer.rds.config.configview.UpLink
 *  com.seer.rds.config.configview.VXRobotAlarms
 */
package com.seer.rds.config.configview;

import com.seer.rds.config.configview.FeiShuRobotAlarms;
import com.seer.rds.config.configview.MailAlarms;
import com.seer.rds.config.configview.UpLink;
import com.seer.rds.config.configview.VXRobotAlarms;

public class ApproachConfig {
    private MailAlarms mail = new MailAlarms();
    private UpLink upLink = new UpLink();
    private VXRobotAlarms vxRobot = new VXRobotAlarms();
    private FeiShuRobotAlarms fsRobot = new FeiShuRobotAlarms();

    public MailAlarms getMail() {
        return this.mail;
    }

    public UpLink getUpLink() {
        return this.upLink;
    }

    public VXRobotAlarms getVxRobot() {
        return this.vxRobot;
    }

    public FeiShuRobotAlarms getFsRobot() {
        return this.fsRobot;
    }

    public void setMail(MailAlarms mail) {
        this.mail = mail;
    }

    public void setUpLink(UpLink upLink) {
        this.upLink = upLink;
    }

    public void setVxRobot(VXRobotAlarms vxRobot) {
        this.vxRobot = vxRobot;
    }

    public void setFsRobot(FeiShuRobotAlarms fsRobot) {
        this.fsRobot = fsRobot;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ApproachConfig)) {
            return false;
        }
        ApproachConfig other = (ApproachConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        MailAlarms this$mail = this.getMail();
        MailAlarms other$mail = other.getMail();
        if (this$mail == null ? other$mail != null : !this$mail.equals(other$mail)) {
            return false;
        }
        UpLink this$upLink = this.getUpLink();
        UpLink other$upLink = other.getUpLink();
        if (this$upLink == null ? other$upLink != null : !this$upLink.equals(other$upLink)) {
            return false;
        }
        VXRobotAlarms this$vxRobot = this.getVxRobot();
        VXRobotAlarms other$vxRobot = other.getVxRobot();
        if (this$vxRobot == null ? other$vxRobot != null : !this$vxRobot.equals(other$vxRobot)) {
            return false;
        }
        FeiShuRobotAlarms this$fsRobot = this.getFsRobot();
        FeiShuRobotAlarms other$fsRobot = other.getFsRobot();
        return !(this$fsRobot == null ? other$fsRobot != null : !this$fsRobot.equals(other$fsRobot));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ApproachConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        MailAlarms $mail = this.getMail();
        result = result * 59 + ($mail == null ? 43 : $mail.hashCode());
        UpLink $upLink = this.getUpLink();
        result = result * 59 + ($upLink == null ? 43 : $upLink.hashCode());
        VXRobotAlarms $vxRobot = this.getVxRobot();
        result = result * 59 + ($vxRobot == null ? 43 : $vxRobot.hashCode());
        FeiShuRobotAlarms $fsRobot = this.getFsRobot();
        result = result * 59 + ($fsRobot == null ? 43 : $fsRobot.hashCode());
        return result;
    }

    public String toString() {
        return "ApproachConfig(mail=" + this.getMail() + ", upLink=" + this.getUpLink() + ", vxRobot=" + this.getVxRobot() + ", fsRobot=" + this.getFsRobot() + ")";
    }
}

