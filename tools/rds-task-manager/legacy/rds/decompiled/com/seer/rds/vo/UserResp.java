/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.UserResp
 *  com.seer.rds.vo.UserResp$UserRespBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.vo.UserResp;
import java.util.Date;
import java.util.List;

public class UserResp {
    private String id;
    private String username;
    private String password;
    private Integer status;
    private Integer type;
    private List roles;
    private Date createTime;
    private Date modifyTime;

    public static UserRespBuilder builder() {
        return new UserRespBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getUsername() {
        return this.username;
    }

    public String getPassword() {
        return this.password;
    }

    public Integer getStatus() {
        return this.status;
    }

    public Integer getType() {
        return this.type;
    }

    public List getRoles() {
        return this.roles;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public Date getModifyTime() {
        return this.modifyTime;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public void setType(Integer type) {
        this.type = type;
    }

    public void setRoles(List roles) {
        this.roles = roles;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public void setModifyTime(Date modifyTime) {
        this.modifyTime = modifyTime;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof UserResp)) {
            return false;
        }
        UserResp other = (UserResp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$status = this.getStatus();
        Integer other$status = other.getStatus();
        if (this$status == null ? other$status != null : !((Object)this$status).equals(other$status)) {
            return false;
        }
        Integer this$type = this.getType();
        Integer other$type = other.getType();
        if (this$type == null ? other$type != null : !((Object)this$type).equals(other$type)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$username = this.getUsername();
        String other$username = other.getUsername();
        if (this$username == null ? other$username != null : !this$username.equals(other$username)) {
            return false;
        }
        String this$password = this.getPassword();
        String other$password = other.getPassword();
        if (this$password == null ? other$password != null : !this$password.equals(other$password)) {
            return false;
        }
        List this$roles = this.getRoles();
        List other$roles = other.getRoles();
        if (this$roles == null ? other$roles != null : !((Object)this$roles).equals(other$roles)) {
            return false;
        }
        Date this$createTime = this.getCreateTime();
        Date other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime)) {
            return false;
        }
        Date this$modifyTime = this.getModifyTime();
        Date other$modifyTime = other.getModifyTime();
        return !(this$modifyTime == null ? other$modifyTime != null : !((Object)this$modifyTime).equals(other$modifyTime));
    }

    protected boolean canEqual(Object other) {
        return other instanceof UserResp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : ((Object)$status).hashCode());
        Integer $type = this.getType();
        result = result * 59 + ($type == null ? 43 : ((Object)$type).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $username = this.getUsername();
        result = result * 59 + ($username == null ? 43 : $username.hashCode());
        String $password = this.getPassword();
        result = result * 59 + ($password == null ? 43 : $password.hashCode());
        List $roles = this.getRoles();
        result = result * 59 + ($roles == null ? 43 : ((Object)$roles).hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        Date $modifyTime = this.getModifyTime();
        result = result * 59 + ($modifyTime == null ? 43 : ((Object)$modifyTime).hashCode());
        return result;
    }

    public String toString() {
        return "UserResp(id=" + this.getId() + ", username=" + this.getUsername() + ", password=" + this.getPassword() + ", status=" + this.getStatus() + ", type=" + this.getType() + ", roles=" + this.getRoles() + ", createTime=" + this.getCreateTime() + ", modifyTime=" + this.getModifyTime() + ")";
    }

    public UserResp() {
    }

    public UserResp(String id, String username, String password, Integer status, Integer type, List roles, Date createTime, Date modifyTime) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.status = status;
        this.type = type;
        this.roles = roles;
        this.createTime = createTime;
        this.modifyTime = modifyTime;
    }
}

