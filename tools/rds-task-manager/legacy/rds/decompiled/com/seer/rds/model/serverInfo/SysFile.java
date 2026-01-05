/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.serverInfo.SysFile
 *  com.seer.rds.model.serverInfo.SysFile$SysFileBuilder
 */
package com.seer.rds.model.serverInfo;

import com.seer.rds.model.serverInfo.SysFile;

public class SysFile {
    private String dirName;
    private String sysTypeName;
    private String typeName;
    private String total;
    private String free;
    private String used;
    private double usage;

    public static SysFileBuilder builder() {
        return new SysFileBuilder();
    }

    public SysFile(String dirName, String sysTypeName, String typeName, String total, String free, String used, double usage) {
        this.dirName = dirName;
        this.sysTypeName = sysTypeName;
        this.typeName = typeName;
        this.total = total;
        this.free = free;
        this.used = used;
        this.usage = usage;
    }

    public SysFile() {
    }

    public String getDirName() {
        return this.dirName;
    }

    public String getSysTypeName() {
        return this.sysTypeName;
    }

    public String getTypeName() {
        return this.typeName;
    }

    public String getTotal() {
        return this.total;
    }

    public String getFree() {
        return this.free;
    }

    public String getUsed() {
        return this.used;
    }

    public double getUsage() {
        return this.usage;
    }

    public void setDirName(String dirName) {
        this.dirName = dirName;
    }

    public void setSysTypeName(String sysTypeName) {
        this.sysTypeName = sysTypeName;
    }

    public void setTypeName(String typeName) {
        this.typeName = typeName;
    }

    public void setTotal(String total) {
        this.total = total;
    }

    public void setFree(String free) {
        this.free = free;
    }

    public void setUsed(String used) {
        this.used = used;
    }

    public void setUsage(double usage) {
        this.usage = usage;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SysFile)) {
            return false;
        }
        SysFile other = (SysFile)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (Double.compare(this.getUsage(), other.getUsage()) != 0) {
            return false;
        }
        String this$dirName = this.getDirName();
        String other$dirName = other.getDirName();
        if (this$dirName == null ? other$dirName != null : !this$dirName.equals(other$dirName)) {
            return false;
        }
        String this$sysTypeName = this.getSysTypeName();
        String other$sysTypeName = other.getSysTypeName();
        if (this$sysTypeName == null ? other$sysTypeName != null : !this$sysTypeName.equals(other$sysTypeName)) {
            return false;
        }
        String this$typeName = this.getTypeName();
        String other$typeName = other.getTypeName();
        if (this$typeName == null ? other$typeName != null : !this$typeName.equals(other$typeName)) {
            return false;
        }
        String this$total = this.getTotal();
        String other$total = other.getTotal();
        if (this$total == null ? other$total != null : !this$total.equals(other$total)) {
            return false;
        }
        String this$free = this.getFree();
        String other$free = other.getFree();
        if (this$free == null ? other$free != null : !this$free.equals(other$free)) {
            return false;
        }
        String this$used = this.getUsed();
        String other$used = other.getUsed();
        return !(this$used == null ? other$used != null : !this$used.equals(other$used));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SysFile;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        long $usage = Double.doubleToLongBits(this.getUsage());
        result = result * 59 + (int)($usage >>> 32 ^ $usage);
        String $dirName = this.getDirName();
        result = result * 59 + ($dirName == null ? 43 : $dirName.hashCode());
        String $sysTypeName = this.getSysTypeName();
        result = result * 59 + ($sysTypeName == null ? 43 : $sysTypeName.hashCode());
        String $typeName = this.getTypeName();
        result = result * 59 + ($typeName == null ? 43 : $typeName.hashCode());
        String $total = this.getTotal();
        result = result * 59 + ($total == null ? 43 : $total.hashCode());
        String $free = this.getFree();
        result = result * 59 + ($free == null ? 43 : $free.hashCode());
        String $used = this.getUsed();
        result = result * 59 + ($used == null ? 43 : $used.hashCode());
        return result;
    }

    public String toString() {
        return "SysFile(dirName=" + this.getDirName() + ", sysTypeName=" + this.getSysTypeName() + ", typeName=" + this.getTypeName() + ", total=" + this.getTotal() + ", free=" + this.getFree() + ", used=" + this.getUsed() + ", usage=" + this.getUsage() + ")";
    }
}

