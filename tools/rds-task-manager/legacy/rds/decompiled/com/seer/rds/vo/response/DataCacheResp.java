/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.DataCacheResp
 */
package com.seer.rds.vo.response;

public class DataCacheResp {
    private String id;
    private String key;
    private Object value;

    public String getId() {
        return this.id;
    }

    public String getKey() {
        return this.key;
    }

    public Object getValue() {
        return this.value;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public void setValue(Object value) {
        this.value = value;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DataCacheResp)) {
            return false;
        }
        DataCacheResp other = (DataCacheResp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$key = this.getKey();
        String other$key = other.getKey();
        if (this$key == null ? other$key != null : !this$key.equals(other$key)) {
            return false;
        }
        Object this$value = this.getValue();
        Object other$value = other.getValue();
        return !(this$value == null ? other$value != null : !this$value.equals(other$value));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DataCacheResp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $key = this.getKey();
        result = result * 59 + ($key == null ? 43 : $key.hashCode());
        Object $value = this.getValue();
        result = result * 59 + ($value == null ? 43 : $value.hashCode());
        return result;
    }

    public String toString() {
        return "DataCacheResp(id=" + this.getId() + ", key=" + this.getKey() + ", value=" + this.getValue() + ")";
    }
}

