/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.AddrsVo
 *  com.seer.rds.vo.general.AddrsVo$AddrsVoBuilder
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.AddrsVo;

public class AddrsVo {
    private String addrName = "";
    private String addrType = "";
    private Integer addrNo;
    private String desc = "";

    public static AddrsVoBuilder builder() {
        return new AddrsVoBuilder();
    }

    public String getAddrName() {
        return this.addrName;
    }

    public String getAddrType() {
        return this.addrType;
    }

    public Integer getAddrNo() {
        return this.addrNo;
    }

    public String getDesc() {
        return this.desc;
    }

    public void setAddrName(String addrName) {
        this.addrName = addrName;
    }

    public void setAddrType(String addrType) {
        this.addrType = addrType;
    }

    public void setAddrNo(Integer addrNo) {
        this.addrNo = addrNo;
    }

    public void setDesc(String desc) {
        this.desc = desc;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AddrsVo)) {
            return false;
        }
        AddrsVo other = (AddrsVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$addrNo = this.getAddrNo();
        Integer other$addrNo = other.getAddrNo();
        if (this$addrNo == null ? other$addrNo != null : !((Object)this$addrNo).equals(other$addrNo)) {
            return false;
        }
        String this$addrName = this.getAddrName();
        String other$addrName = other.getAddrName();
        if (this$addrName == null ? other$addrName != null : !this$addrName.equals(other$addrName)) {
            return false;
        }
        String this$addrType = this.getAddrType();
        String other$addrType = other.getAddrType();
        if (this$addrType == null ? other$addrType != null : !this$addrType.equals(other$addrType)) {
            return false;
        }
        String this$desc = this.getDesc();
        String other$desc = other.getDesc();
        return !(this$desc == null ? other$desc != null : !this$desc.equals(other$desc));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AddrsVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $addrNo = this.getAddrNo();
        result = result * 59 + ($addrNo == null ? 43 : ((Object)$addrNo).hashCode());
        String $addrName = this.getAddrName();
        result = result * 59 + ($addrName == null ? 43 : $addrName.hashCode());
        String $addrType = this.getAddrType();
        result = result * 59 + ($addrType == null ? 43 : $addrType.hashCode());
        String $desc = this.getDesc();
        result = result * 59 + ($desc == null ? 43 : $desc.hashCode());
        return result;
    }

    public String toString() {
        return "AddrsVo(addrName=" + this.getAddrName() + ", addrType=" + this.getAddrType() + ", addrNo=" + this.getAddrNo() + ", desc=" + this.getDesc() + ")";
    }

    public AddrsVo() {
    }

    public AddrsVo(String addrName, String addrType, Integer addrNo, String desc) {
        this.addrName = addrName;
        this.addrType = addrType;
        this.addrNo = addrNo;
        this.desc = desc;
    }
}

