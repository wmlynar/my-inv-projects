/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.vo.response.PaginationResponseVo$PaginationResponseVoBuilder
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.PaginationResponseVo;
import java.util.List;

public class PaginationResponseVo<T> {
    private Long totalCount;
    private Integer currentPage;
    private Integer pageSize;
    private Integer totalPage;
    private List<T> pageList;

    public static <T> PaginationResponseVoBuilder<T> builder() {
        return new PaginationResponseVoBuilder();
    }

    public Long getTotalCount() {
        return this.totalCount;
    }

    public Integer getCurrentPage() {
        return this.currentPage;
    }

    public Integer getPageSize() {
        return this.pageSize;
    }

    public Integer getTotalPage() {
        return this.totalPage;
    }

    public List<T> getPageList() {
        return this.pageList;
    }

    public void setTotalCount(Long totalCount) {
        this.totalCount = totalCount;
    }

    public void setCurrentPage(Integer currentPage) {
        this.currentPage = currentPage;
    }

    public void setPageSize(Integer pageSize) {
        this.pageSize = pageSize;
    }

    public void setTotalPage(Integer totalPage) {
        this.totalPage = totalPage;
    }

    public void setPageList(List<T> pageList) {
        this.pageList = pageList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof PaginationResponseVo)) {
            return false;
        }
        PaginationResponseVo other = (PaginationResponseVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Long this$totalCount = this.getTotalCount();
        Long other$totalCount = other.getTotalCount();
        if (this$totalCount == null ? other$totalCount != null : !((Object)this$totalCount).equals(other$totalCount)) {
            return false;
        }
        Integer this$currentPage = this.getCurrentPage();
        Integer other$currentPage = other.getCurrentPage();
        if (this$currentPage == null ? other$currentPage != null : !((Object)this$currentPage).equals(other$currentPage)) {
            return false;
        }
        Integer this$pageSize = this.getPageSize();
        Integer other$pageSize = other.getPageSize();
        if (this$pageSize == null ? other$pageSize != null : !((Object)this$pageSize).equals(other$pageSize)) {
            return false;
        }
        Integer this$totalPage = this.getTotalPage();
        Integer other$totalPage = other.getTotalPage();
        if (this$totalPage == null ? other$totalPage != null : !((Object)this$totalPage).equals(other$totalPage)) {
            return false;
        }
        List this$pageList = this.getPageList();
        List other$pageList = other.getPageList();
        return !(this$pageList == null ? other$pageList != null : !((Object)this$pageList).equals(other$pageList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof PaginationResponseVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $totalCount = this.getTotalCount();
        result = result * 59 + ($totalCount == null ? 43 : ((Object)$totalCount).hashCode());
        Integer $currentPage = this.getCurrentPage();
        result = result * 59 + ($currentPage == null ? 43 : ((Object)$currentPage).hashCode());
        Integer $pageSize = this.getPageSize();
        result = result * 59 + ($pageSize == null ? 43 : ((Object)$pageSize).hashCode());
        Integer $totalPage = this.getTotalPage();
        result = result * 59 + ($totalPage == null ? 43 : ((Object)$totalPage).hashCode());
        List $pageList = this.getPageList();
        result = result * 59 + ($pageList == null ? 43 : ((Object)$pageList).hashCode());
        return result;
    }

    public String toString() {
        return "PaginationResponseVo(totalCount=" + this.getTotalCount() + ", currentPage=" + this.getCurrentPage() + ", pageSize=" + this.getPageSize() + ", totalPage=" + this.getTotalPage() + ", pageList=" + this.getPageList() + ")";
    }

    public PaginationResponseVo() {
    }

    public PaginationResponseVo(Long totalCount, Integer currentPage, Integer pageSize, Integer totalPage, List<T> pageList) {
        this.totalCount = totalCount;
        this.currentPage = currentPage;
        this.pageSize = pageSize;
        this.totalPage = totalPage;
        this.pageList = pageList;
    }
}

