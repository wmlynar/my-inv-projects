/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.configFileMeta.ClassFieldMeta
 *  com.seer.rds.util.configFileMeta.ClassMeta
 */
package com.seer.rds.util.configFileMeta;

import com.seer.rds.util.configFileMeta.ClassFieldMeta;
import java.util.ArrayList;
import java.util.List;

public class ClassMeta {
    String className = "";
    List<ClassFieldMeta> fields = new ArrayList();
    List<String> enums = new ArrayList();

    public String getClassName() {
        return this.className;
    }

    public List<ClassFieldMeta> getFields() {
        return this.fields;
    }

    public List<String> getEnums() {
        return this.enums;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public void setFields(List<ClassFieldMeta> fields) {
        this.fields = fields;
    }

    public void setEnums(List<String> enums) {
        this.enums = enums;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ClassMeta)) {
            return false;
        }
        ClassMeta other = (ClassMeta)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$className = this.getClassName();
        String other$className = other.getClassName();
        if (this$className == null ? other$className != null : !this$className.equals(other$className)) {
            return false;
        }
        List this$fields = this.getFields();
        List other$fields = other.getFields();
        if (this$fields == null ? other$fields != null : !((Object)this$fields).equals(other$fields)) {
            return false;
        }
        List this$enums = this.getEnums();
        List other$enums = other.getEnums();
        return !(this$enums == null ? other$enums != null : !((Object)this$enums).equals(other$enums));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ClassMeta;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $className = this.getClassName();
        result = result * 59 + ($className == null ? 43 : $className.hashCode());
        List $fields = this.getFields();
        result = result * 59 + ($fields == null ? 43 : ((Object)$fields).hashCode());
        List $enums = this.getEnums();
        result = result * 59 + ($enums == null ? 43 : ((Object)$enums).hashCode());
        return result;
    }

    public String toString() {
        return "ClassMeta(className=" + this.getClassName() + ", fields=" + this.getFields() + ", enums=" + this.getEnums() + ")";
    }
}

