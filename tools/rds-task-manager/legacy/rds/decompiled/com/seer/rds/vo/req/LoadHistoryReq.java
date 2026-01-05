/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.LoadHistoryReq
 */
package com.seer.rds.vo.req;

public class LoadHistoryReq {
    String name;
    String folderName = "boot";

    public String getName() {
        return this.name;
    }

    public String getFolderName() {
        return this.folderName;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setFolderName(String folderName) {
        this.folderName = folderName;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof LoadHistoryReq)) {
            return false;
        }
        LoadHistoryReq other = (LoadHistoryReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$name = this.getName();
        String other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) {
            return false;
        }
        String this$folderName = this.getFolderName();
        String other$folderName = other.getFolderName();
        return !(this$folderName == null ? other$folderName != null : !this$folderName.equals(other$folderName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof LoadHistoryReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $name = this.getName();
        result = result * 59 + ($name == null ? 43 : $name.hashCode());
        String $folderName = this.getFolderName();
        result = result * 59 + ($folderName == null ? 43 : $folderName.hashCode());
        return result;
    }

    public String toString() {
        return "LoadHistoryReq(name=" + this.getName() + ", folderName=" + this.getFolderName() + ")";
    }

    public LoadHistoryReq withName(String name) {
        return this.name == name ? this : new LoadHistoryReq(name, this.folderName);
    }

    public LoadHistoryReq withFolderName(String folderName) {
        return this.folderName == folderName ? this : new LoadHistoryReq(this.name, folderName);
    }

    public LoadHistoryReq(String name, String folderName) {
        this.name = name;
        this.folderName = folderName;
    }

    public LoadHistoryReq() {
    }
}

