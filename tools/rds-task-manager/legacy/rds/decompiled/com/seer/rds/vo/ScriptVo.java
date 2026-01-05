/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.ScriptVo
 */
package com.seer.rds.vo;

public class ScriptVo {
    private String fileName;
    private String script;
    private String folderName = "boot";

    public String getFileName() {
        return this.fileName;
    }

    public String getScript() {
        return this.script;
    }

    public String getFolderName() {
        return this.folderName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public void setScript(String script) {
        this.script = script;
    }

    public void setFolderName(String folderName) {
        this.folderName = folderName;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ScriptVo)) {
            return false;
        }
        ScriptVo other = (ScriptVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$fileName = this.getFileName();
        String other$fileName = other.getFileName();
        if (this$fileName == null ? other$fileName != null : !this$fileName.equals(other$fileName)) {
            return false;
        }
        String this$script = this.getScript();
        String other$script = other.getScript();
        if (this$script == null ? other$script != null : !this$script.equals(other$script)) {
            return false;
        }
        String this$folderName = this.getFolderName();
        String other$folderName = other.getFolderName();
        return !(this$folderName == null ? other$folderName != null : !this$folderName.equals(other$folderName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ScriptVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $fileName = this.getFileName();
        result = result * 59 + ($fileName == null ? 43 : $fileName.hashCode());
        String $script = this.getScript();
        result = result * 59 + ($script == null ? 43 : $script.hashCode());
        String $folderName = this.getFolderName();
        result = result * 59 + ($folderName == null ? 43 : $folderName.hashCode());
        return result;
    }

    public String toString() {
        return "ScriptVo(fileName=" + this.getFileName() + ", script=" + this.getScript() + ", folderName=" + this.getFolderName() + ")";
    }
}

