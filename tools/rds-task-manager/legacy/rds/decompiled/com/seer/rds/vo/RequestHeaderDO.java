/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.RequestHeaderDO
 */
package com.seer.rds.vo;

public class RequestHeaderDO {
    private String key;
    private String value;

    public RequestHeaderDO(String key, String value) {
        this.key = key;
        this.value = value;
    }

    public String getKey() {
        return this.key;
    }

    public String getValue() {
        return this.value;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RequestHeaderDO)) {
            return false;
        }
        RequestHeaderDO other = (RequestHeaderDO)o;
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
        return !(this$value == null ? other$value != null : !this$value.equals(other$value));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RequestHeaderDO;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $key = this.getKey();
        result = result * 59 + ($key == null ? 43 : $key.hashCode());
        String $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : $value.hashCode());
        return result;
    }

    public String toString() {
        return "RequestHeaderDO(key=" + this.getKey() + ", value=" + this.getValue() + ")";
    }
}

