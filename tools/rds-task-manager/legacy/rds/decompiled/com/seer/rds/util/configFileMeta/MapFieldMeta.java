/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.configFileMeta.MapFieldMeta
 */
package com.seer.rds.util.configFileMeta;

public class MapFieldMeta {
    String key = "";
    String value = "";
    String valuePlus = "";

    public String getKey() {
        return this.key;
    }

    public String getValue() {
        return this.value;
    }

    public String getValuePlus() {
        return this.valuePlus;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public void setValuePlus(String valuePlus) {
        this.valuePlus = valuePlus;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof MapFieldMeta)) {
            return false;
        }
        MapFieldMeta other = (MapFieldMeta)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$key = this.getKey();
        String other$key = other.getKey();
        if (this$key == null ? other$key != null : !this$key.equals(other$key)) {
            return false;
        }
        String this$value = this.getValue();
        String other$value = other.getValue();
        if (this$value == null ? other$value != null : !this$value.equals(other$value)) {
            return false;
        }
        String this$valuePlus = this.getValuePlus();
        String other$valuePlus = other.getValuePlus();
        return !(this$valuePlus == null ? other$valuePlus != null : !this$valuePlus.equals(other$valuePlus));
    }

    protected boolean canEqual(Object other) {
        return other instanceof MapFieldMeta;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $key = this.getKey();
        result = result * 59 + ($key == null ? 43 : $key.hashCode());
        String $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : $value.hashCode());
        String $valuePlus = this.getValuePlus();
        result = result * 59 + ($valuePlus == null ? 43 : $valuePlus.hashCode());
        return result;
    }

    public String toString() {
        return "MapFieldMeta(key=" + this.getKey() + ", value=" + this.getValue() + ", valuePlus=" + this.getValuePlus() + ")";
    }
}

