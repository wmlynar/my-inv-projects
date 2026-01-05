/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.TransLateReq
 */
package com.seer.rds.vo.req;

import java.util.Arrays;

public class TransLateReq {
    private String sourceFilePath;
    private String sourceLanguage;
    private String[] targetLanguageArray;
    private String fileType;

    public String getSourceFilePath() {
        return this.sourceFilePath;
    }

    public String getSourceLanguage() {
        return this.sourceLanguage;
    }

    public String[] getTargetLanguageArray() {
        return this.targetLanguageArray;
    }

    public String getFileType() {
        return this.fileType;
    }

    public void setSourceFilePath(String sourceFilePath) {
        this.sourceFilePath = sourceFilePath;
    }

    public void setSourceLanguage(String sourceLanguage) {
        this.sourceLanguage = sourceLanguage;
    }

    public void setTargetLanguageArray(String[] targetLanguageArray) {
        this.targetLanguageArray = targetLanguageArray;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TransLateReq)) {
            return false;
        }
        TransLateReq other = (TransLateReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$sourceFilePath = this.getSourceFilePath();
        String other$sourceFilePath = other.getSourceFilePath();
        if (this$sourceFilePath == null ? other$sourceFilePath != null : !this$sourceFilePath.equals(other$sourceFilePath)) {
            return false;
        }
        String this$sourceLanguage = this.getSourceLanguage();
        String other$sourceLanguage = other.getSourceLanguage();
        if (this$sourceLanguage == null ? other$sourceLanguage != null : !this$sourceLanguage.equals(other$sourceLanguage)) {
            return false;
        }
        if (!Arrays.deepEquals(this.getTargetLanguageArray(), other.getTargetLanguageArray())) {
            return false;
        }
        String this$fileType = this.getFileType();
        String other$fileType = other.getFileType();
        return !(this$fileType == null ? other$fileType != null : !this$fileType.equals(other$fileType));
    }

    protected boolean canEqual(Object other) {
        return other instanceof TransLateReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $sourceFilePath = this.getSourceFilePath();
        result = result * 59 + ($sourceFilePath == null ? 43 : $sourceFilePath.hashCode());
        String $sourceLanguage = this.getSourceLanguage();
        result = result * 59 + ($sourceLanguage == null ? 43 : $sourceLanguage.hashCode());
        result = result * 59 + Arrays.deepHashCode(this.getTargetLanguageArray());
        String $fileType = this.getFileType();
        result = result * 59 + ($fileType == null ? 43 : $fileType.hashCode());
        return result;
    }

    public String toString() {
        return "TransLateReq(sourceFilePath=" + this.getSourceFilePath() + ", sourceLanguage=" + this.getSourceLanguage() + ", targetLanguageArray=" + Arrays.deepToString(this.getTargetLanguageArray()) + ", fileType=" + this.getFileType() + ")";
    }
}

