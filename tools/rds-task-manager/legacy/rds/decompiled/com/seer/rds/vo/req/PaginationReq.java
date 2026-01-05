/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.req.PaginationReq$PaginationReqBuilder
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 */
package com.seer.rds.vo.req;

import com.seer.rds.vo.req.PaginationReq;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import java.io.Serializable;

@ApiModel(value="Pagination request object")
public class PaginationReq<T>
implements Serializable {
    @ApiModelProperty(value="currentPage")
    private int currentPage;
    @ApiModelProperty(value="pageSize")
    private int pageSize;
    @ApiModelProperty(value="queryParam")
    private T queryParam;

    public static <T> PaginationReqBuilder<T> builder() {
        return new PaginationReqBuilder();
    }

    public int getCurrentPage() {
        return this.currentPage;
    }

    public int getPageSize() {
        return this.pageSize;
    }

    public T getQueryParam() {
        return (T)this.queryParam;
    }

    public void setCurrentPage(int currentPage) {
        this.currentPage = currentPage;
    }

    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }

    public void setQueryParam(T queryParam) {
        this.queryParam = queryParam;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof PaginationReq)) {
            return false;
        }
        PaginationReq other = (PaginationReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getCurrentPage() != other.getCurrentPage()) {
            return false;
        }
        if (this.getPageSize() != other.getPageSize()) {
            return false;
        }
        Object this$queryParam = this.getQueryParam();
        Object other$queryParam = other.getQueryParam();
        return !(this$queryParam == null ? other$queryParam != null : !this$queryParam.equals(other$queryParam));
    }

    protected boolean canEqual(Object other) {
        return other instanceof PaginationReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getCurrentPage();
        result = result * 59 + this.getPageSize();
        Object $queryParam = this.getQueryParam();
        result = result * 59 + ($queryParam == null ? 43 : $queryParam.hashCode());
        return result;
    }

    public String toString() {
        return "PaginationReq(currentPage=" + this.getCurrentPage() + ", pageSize=" + this.getPageSize() + ", queryParam=" + this.getQueryParam() + ")";
    }

    public PaginationReq(int currentPage, int pageSize, T queryParam) {
        this.currentPage = currentPage;
        this.pageSize = pageSize;
        this.queryParam = queryParam;
    }

    public PaginationReq() {
    }
}

