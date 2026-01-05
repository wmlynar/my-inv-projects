/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.vo.response.DemandContentVo
 */
package com.seer.rds.vo.response;

import com.alibaba.fastjson.JSONObject;

public class DemandContentVo {
    private String menuId;
    private JSONObject content;

    public String getMenuId() {
        return this.menuId;
    }

    public JSONObject getContent() {
        return this.content;
    }

    public void setMenuId(String menuId) {
        this.menuId = menuId;
    }

    public void setContent(JSONObject content) {
        this.content = content;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof DemandContentVo)) {
            return false;
        }
        DemandContentVo other = (DemandContentVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$menuId = this.getMenuId();
        String other$menuId = other.getMenuId();
        if (this$menuId == null ? other$menuId != null : !this$menuId.equals(other$menuId)) {
            return false;
        }
        JSONObject this$content = this.getContent();
        JSONObject other$content = other.getContent();
        return !(this$content == null ? other$content != null : !this$content.equals(other$content));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DemandContentVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $menuId = this.getMenuId();
        result = result * 59 + ($menuId == null ? 43 : $menuId.hashCode());
        JSONObject $content = this.getContent();
        result = result * 59 + ($content == null ? 43 : $content.hashCode());
        return result;
    }

    public String toString() {
        return "DemandContentVo(menuId=" + this.getMenuId() + ", content=" + this.getContent() + ")";
    }
}

