/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.serverInfo.Sys
 *  com.seer.rds.model.serverInfo.Sys$SysBuilder
 */
package com.seer.rds.model.serverInfo;

import com.seer.rds.model.serverInfo.Sys;

public class Sys {
    private String computerName;
    private String computerIp;
    private String userDir;
    private String osName;
    private String osArch;

    public static SysBuilder builder() {
        return new SysBuilder();
    }

    public Sys(String computerName, String computerIp, String userDir, String osName, String osArch) {
        this.computerName = computerName;
        this.computerIp = computerIp;
        this.userDir = userDir;
        this.osName = osName;
        this.osArch = osArch;
    }

    public Sys() {
    }

    public String getComputerName() {
        return this.computerName;
    }

    public String getComputerIp() {
        return this.computerIp;
    }

    public String getUserDir() {
        return this.userDir;
    }

    public String getOsName() {
        return this.osName;
    }

    public String getOsArch() {
        return this.osArch;
    }

    public void setComputerName(String computerName) {
        this.computerName = computerName;
    }

    public void setComputerIp(String computerIp) {
        this.computerIp = computerIp;
    }

    public void setUserDir(String userDir) {
        this.userDir = userDir;
    }

    public void setOsName(String osName) {
        this.osName = osName;
    }

    public void setOsArch(String osArch) {
        this.osArch = osArch;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof Sys)) {
            return false;
        }
        Sys other = (Sys)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$computerName = this.getComputerName();
        String other$computerName = other.getComputerName();
        if (this$computerName == null ? other$computerName != null : !this$computerName.equals(other$computerName)) {
            return false;
        }
        String this$computerIp = this.getComputerIp();
        String other$computerIp = other.getComputerIp();
        if (this$computerIp == null ? other$computerIp != null : !this$computerIp.equals(other$computerIp)) {
            return false;
        }
        String this$userDir = this.getUserDir();
        String other$userDir = other.getUserDir();
        if (this$userDir == null ? other$userDir != null : !this$userDir.equals(other$userDir)) {
            return false;
        }
        String this$osName = this.getOsName();
        String other$osName = other.getOsName();
        if (this$osName == null ? other$osName != null : !this$osName.equals(other$osName)) {
            return false;
        }
        String this$osArch = this.getOsArch();
        String other$osArch = other.getOsArch();
        return !(this$osArch == null ? other$osArch != null : !this$osArch.equals(other$osArch));
    }

    protected boolean canEqual(Object other) {
        return other instanceof Sys;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $computerName = this.getComputerName();
        result = result * 59 + ($computerName == null ? 43 : $computerName.hashCode());
        String $computerIp = this.getComputerIp();
        result = result * 59 + ($computerIp == null ? 43 : $computerIp.hashCode());
        String $userDir = this.getUserDir();
        result = result * 59 + ($userDir == null ? 43 : $userDir.hashCode());
        String $osName = this.getOsName();
        result = result * 59 + ($osName == null ? 43 : $osName.hashCode());
        String $osArch = this.getOsArch();
        result = result * 59 + ($osArch == null ? 43 : $osArch.hashCode());
        return result;
    }

    public String toString() {
        return "Sys(computerName=" + this.getComputerName() + ", computerIp=" + this.getComputerIp() + ", userDir=" + this.getUserDir() + ", osName=" + this.getOsName() + ", osArch=" + this.getOsArch() + ")";
    }
}

