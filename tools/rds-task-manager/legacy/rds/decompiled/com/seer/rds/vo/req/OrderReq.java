/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.vo.req.OrderReq
 */
package com.seer.rds.vo.req;

import com.alibaba.fastjson.JSONObject;
import java.io.Serializable;
import java.util.List;

public class OrderReq
implements Serializable {
    private Integer total;
    private Integer size;
    private Integer page;
    private List<JSONObject> list;

    public Integer getTotal() {
        return this.total;
    }

    public Integer getSize() {
        return this.size;
    }

    public Integer getPage() {
        return this.page;
    }

    public List<JSONObject> getList() {
        return this.list;
    }

    public void setTotal(Integer total) {
        this.total = total;
    }

    public void setSize(Integer size) {
        this.size = size;
    }

    public void setPage(Integer page) {
        this.page = page;
    }

    public void setList(List<JSONObject> list) {
        this.list = list;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OrderReq)) {
            return false;
        }
        OrderReq other = (OrderReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$total = this.getTotal();
        Integer other$total = other.getTotal();
        if (this$total == null ? other$total != null : !((Object)this$total).equals(other$total)) {
            return false;
        }
        Integer this$size = this.getSize();
        Integer other$size = other.getSize();
        if (this$size == null ? other$size != null : !((Object)this$size).equals(other$size)) {
            return false;
        }
        Integer this$page = this.getPage();
        Integer other$page = other.getPage();
        if (this$page == null ? other$page != null : !((Object)this$page).equals(other$page)) {
            return false;
        }
        List this$list = this.getList();
        List other$list = other.getList();
        return !(this$list == null ? other$list != null : !((Object)this$list).equals(other$list));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OrderReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $total = this.getTotal();
        result = result * 59 + ($total == null ? 43 : ((Object)$total).hashCode());
        Integer $size = this.getSize();
        result = result * 59 + ($size == null ? 43 : ((Object)$size).hashCode());
        Integer $page = this.getPage();
        result = result * 59 + ($page == null ? 43 : ((Object)$page).hashCode());
        List $list = this.getList();
        result = result * 59 + ($list == null ? 43 : ((Object)$list).hashCode());
        return result;
    }

    public String toString() {
        return "OrderReq(total=" + this.getTotal() + ", size=" + this.getSize() + ", page=" + this.getPage() + ", list=" + this.getList() + ")";
    }

    public OrderReq(Integer total, Integer size, Integer page, List<JSONObject> list) {
        this.total = total;
        this.size = size;
        this.page = page;
        this.list = list;
    }

    public OrderReq() {
    }
}

