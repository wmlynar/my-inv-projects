/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.AttrFieldsDeleteReq
 */
package com.seer.rds.vo.req;

import java.io.Serializable;

public class AttrFieldsDeleteReq
implements Serializable {
    private String attributeName;

    public String getAttributeName() {
        return this.attributeName;
    }

    public void setAttributeName(String attributeName) {
        this.attributeName = attributeName;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AttrFieldsDeleteReq)) {
            return false;
        }
        AttrFieldsDeleteReq other = (AttrFieldsDeleteReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$attributeName = this.getAttributeName();
        String other$attributeName = other.getAttributeName();
        return !(this$attributeName == null ? other$attributeName != null : !this$attributeName.equals(other$attributeName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AttrFieldsDeleteReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $attributeName = this.getAttributeName();
        result = result * 59 + ($attributeName == null ? 43 : $attributeName.hashCode());
        return result;
    }

    public String toString() {
        return "AttrFieldsDeleteReq(attributeName=" + this.getAttributeName() + ")";
    }
}

