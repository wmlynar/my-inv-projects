/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.UserResp
 *  com.seer.rds.vo.UserResponseVo
 *  com.seer.rds.vo.UserResponseVo$UserResponseVoBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.UserResp;
import com.seer.rds.vo.UserResponseVo;
import java.util.List;

public class UserResponseVo {
    private Long totalCount;
    private Integer currentPage;
    private Integer pageSize;
    private Integer totalPage;
    private List<UserResp> pageList;

    public static UserResponseVoBuilder builder() {
        return new UserResponseVoBuilder();
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

    public List<UserResp> getPageList() {
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

    public void setPageList(List<UserResp> pageList) {
        this.pageList = pageList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof UserResponseVo)) {
            return false;
        }
        UserResponseVo other = (UserResponseVo)o;
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
        return other instanceof UserResponseVo;
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
        return "UserResponseVo(totalCount=" + this.getTotalCount() + ", currentPage=" + this.getCurrentPage() + ", pageSize=" + this.getPageSize() + ", totalPage=" + this.getTotalPage() + ", pageList=" + this.getPageList() + ")";
    }

    public UserResponseVo() {
    }

    public UserResponseVo(Long totalCount, Integer currentPage, Integer pageSize, Integer totalPage, List<UserResp> pageList) {
        this.totalCount = totalCount;
        this.currentPage = currentPage;
        this.pageSize = pageSize;
        this.totalPage = totalPage;
        this.pageList = pageList;
    }
}

