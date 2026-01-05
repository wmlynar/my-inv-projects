/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.RelocStartBody
 *  com.seer.rds.vo.req.RelocStartReq
 */
package com.seer.rds.vo.req;

import com.seer.rds.vo.req.RelocStartBody;
import java.io.Serializable;

public class RelocStartReq
implements Serializable {
    private static final long serialVersionUID = 1L;
    private String vehicle;
    private RelocStartBody body;

    public String getVehicle() {
        return this.vehicle;
    }

    public RelocStartBody getBody() {
        return this.body;
    }

    public void setVehicle(String vehicle) {
        this.vehicle = vehicle;
    }

    public void setBody(RelocStartBody body) {
        this.body = body;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RelocStartReq)) {
            return false;
        }
        RelocStartReq other = (RelocStartReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$vehicle = this.getVehicle();
        String other$vehicle = other.getVehicle();
        if (this$vehicle == null ? other$vehicle != null : !this$vehicle.equals(other$vehicle)) {
            return false;
        }
        RelocStartBody this$body = this.getBody();
        RelocStartBody other$body = other.getBody();
        return !(this$body == null ? other$body != null : !this$body.equals(other$body));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RelocStartReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $vehicle = this.getVehicle();
        result = result * 59 + ($vehicle == null ? 43 : $vehicle.hashCode());
        RelocStartBody $body = this.getBody();
        result = result * 59 + ($body == null ? 43 : $body.hashCode());
        return result;
    }

    public String toString() {
        return "RelocStartReq(vehicle=" + this.getVehicle() + ", body=" + this.getBody() + ")";
    }
}

