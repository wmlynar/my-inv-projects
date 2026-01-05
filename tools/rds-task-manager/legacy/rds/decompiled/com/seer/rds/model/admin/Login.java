/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.admin.Login
 *  com.seer.rds.model.admin.Login$LoginBuilder
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.EntityListeners
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Table
 *  javax.persistence.Transient
 *  org.hibernate.annotations.GenericGenerator
 *  org.springframework.data.jpa.domain.support.AuditingEntityListener
 */
package com.seer.rds.model.admin;

import com.seer.rds.model.admin.Login;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EntityListeners;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;
import javax.persistence.Transient;
import org.hibernate.annotations.GenericGenerator;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@EntityListeners(value={AuditingEntityListener.class})
@Entity
@Table(name="t_login", indexes={@Index(name="idx_session_login_date", columnList="sessionId,loginDate DESC")})
public class Login {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @Column(name="\"uid\"")
    private String uid;
    private String sessionId;
    private String username;
    private String token;
    private Date loginDate;
    private Long exprieTime;
    private String projectVersion;
    private Integer type;
    @Column(nullable=false, columnDefinition="int default '1'")
    private Integer loginType;
    private String permission;
    private Boolean ifShiro;
    @Transient
    private List workStationList;
    @Transient
    private List workTypeList;

    public static LoginBuilder builder() {
        return new LoginBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getUid() {
        return this.uid;
    }

    public String getSessionId() {
        return this.sessionId;
    }

    public String getUsername() {
        return this.username;
    }

    public String getToken() {
        return this.token;
    }

    public Date getLoginDate() {
        return this.loginDate;
    }

    public Long getExprieTime() {
        return this.exprieTime;
    }

    public String getProjectVersion() {
        return this.projectVersion;
    }

    public Integer getType() {
        return this.type;
    }

    public Integer getLoginType() {
        return this.loginType;
    }

    public String getPermission() {
        return this.permission;
    }

    public Boolean getIfShiro() {
        return this.ifShiro;
    }

    public List getWorkStationList() {
        return this.workStationList;
    }

    public List getWorkTypeList() {
        return this.workTypeList;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setUid(String uid) {
        this.uid = uid;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public void setLoginDate(Date loginDate) {
        this.loginDate = loginDate;
    }

    public void setExprieTime(Long exprieTime) {
        this.exprieTime = exprieTime;
    }

    public void setProjectVersion(String projectVersion) {
        this.projectVersion = projectVersion;
    }

    public void setType(Integer type) {
        this.type = type;
    }

    public void setLoginType(Integer loginType) {
        this.loginType = loginType;
    }

    public void setPermission(String permission) {
        this.permission = permission;
    }

    public void setIfShiro(Boolean ifShiro) {
        this.ifShiro = ifShiro;
    }

    public void setWorkStationList(List workStationList) {
        this.workStationList = workStationList;
    }

    public void setWorkTypeList(List workTypeList) {
        this.workTypeList = workTypeList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof Login)) {
            return false;
        }
        Login other = (Login)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Long this$exprieTime = this.getExprieTime();
        Long other$exprieTime = other.getExprieTime();
        if (this$exprieTime == null ? other$exprieTime != null : !((Object)this$exprieTime).equals(other$exprieTime)) {
            return false;
        }
        Integer this$type = this.getType();
        Integer other$type = other.getType();
        if (this$type == null ? other$type != null : !((Object)this$type).equals(other$type)) {
            return false;
        }
        Integer this$loginType = this.getLoginType();
        Integer other$loginType = other.getLoginType();
        if (this$loginType == null ? other$loginType != null : !((Object)this$loginType).equals(other$loginType)) {
            return false;
        }
        Boolean this$ifShiro = this.getIfShiro();
        Boolean other$ifShiro = other.getIfShiro();
        if (this$ifShiro == null ? other$ifShiro != null : !((Object)this$ifShiro).equals(other$ifShiro)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$uid = this.getUid();
        String other$uid = other.getUid();
        if (this$uid == null ? other$uid != null : !this$uid.equals(other$uid)) {
            return false;
        }
        String this$sessionId = this.getSessionId();
        String other$sessionId = other.getSessionId();
        if (this$sessionId == null ? other$sessionId != null : !this$sessionId.equals(other$sessionId)) {
            return false;
        }
        String this$username = this.getUsername();
        String other$username = other.getUsername();
        if (this$username == null ? other$username != null : !this$username.equals(other$username)) {
            return false;
        }
        String this$token = this.getToken();
        String other$token = other.getToken();
        if (this$token == null ? other$token != null : !this$token.equals(other$token)) {
            return false;
        }
        Date this$loginDate = this.getLoginDate();
        Date other$loginDate = other.getLoginDate();
        if (this$loginDate == null ? other$loginDate != null : !((Object)this$loginDate).equals(other$loginDate)) {
            return false;
        }
        String this$projectVersion = this.getProjectVersion();
        String other$projectVersion = other.getProjectVersion();
        if (this$projectVersion == null ? other$projectVersion != null : !this$projectVersion.equals(other$projectVersion)) {
            return false;
        }
        String this$permission = this.getPermission();
        String other$permission = other.getPermission();
        if (this$permission == null ? other$permission != null : !this$permission.equals(other$permission)) {
            return false;
        }
        List this$workStationList = this.getWorkStationList();
        List other$workStationList = other.getWorkStationList();
        if (this$workStationList == null ? other$workStationList != null : !((Object)this$workStationList).equals(other$workStationList)) {
            return false;
        }
        List this$workTypeList = this.getWorkTypeList();
        List other$workTypeList = other.getWorkTypeList();
        return !(this$workTypeList == null ? other$workTypeList != null : !((Object)this$workTypeList).equals(other$workTypeList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof Login;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Long $exprieTime = this.getExprieTime();
        result = result * 59 + ($exprieTime == null ? 43 : ((Object)$exprieTime).hashCode());
        Integer $type = this.getType();
        result = result * 59 + ($type == null ? 43 : ((Object)$type).hashCode());
        Integer $loginType = this.getLoginType();
        result = result * 59 + ($loginType == null ? 43 : ((Object)$loginType).hashCode());
        Boolean $ifShiro = this.getIfShiro();
        result = result * 59 + ($ifShiro == null ? 43 : ((Object)$ifShiro).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $uid = this.getUid();
        result = result * 59 + ($uid == null ? 43 : $uid.hashCode());
        String $sessionId = this.getSessionId();
        result = result * 59 + ($sessionId == null ? 43 : $sessionId.hashCode());
        String $username = this.getUsername();
        result = result * 59 + ($username == null ? 43 : $username.hashCode());
        String $token = this.getToken();
        result = result * 59 + ($token == null ? 43 : $token.hashCode());
        Date $loginDate = this.getLoginDate();
        result = result * 59 + ($loginDate == null ? 43 : ((Object)$loginDate).hashCode());
        String $projectVersion = this.getProjectVersion();
        result = result * 59 + ($projectVersion == null ? 43 : $projectVersion.hashCode());
        String $permission = this.getPermission();
        result = result * 59 + ($permission == null ? 43 : $permission.hashCode());
        List $workStationList = this.getWorkStationList();
        result = result * 59 + ($workStationList == null ? 43 : ((Object)$workStationList).hashCode());
        List $workTypeList = this.getWorkTypeList();
        result = result * 59 + ($workTypeList == null ? 43 : ((Object)$workTypeList).hashCode());
        return result;
    }

    public String toString() {
        return "Login(id=" + this.getId() + ", uid=" + this.getUid() + ", sessionId=" + this.getSessionId() + ", username=" + this.getUsername() + ", token=" + this.getToken() + ", loginDate=" + this.getLoginDate() + ", exprieTime=" + this.getExprieTime() + ", projectVersion=" + this.getProjectVersion() + ", type=" + this.getType() + ", loginType=" + this.getLoginType() + ", permission=" + this.getPermission() + ", ifShiro=" + this.getIfShiro() + ", workStationList=" + this.getWorkStationList() + ", workTypeList=" + this.getWorkTypeList() + ")";
    }

    public Login(String id, String uid, String sessionId, String username, String token, Date loginDate, Long exprieTime, String projectVersion, Integer type, Integer loginType, String permission, Boolean ifShiro, List workStationList, List workTypeList) {
        this.id = id;
        this.uid = uid;
        this.sessionId = sessionId;
        this.username = username;
        this.token = token;
        this.loginDate = loginDate;
        this.exprieTime = exprieTime;
        this.projectVersion = projectVersion;
        this.type = type;
        this.loginType = loginType;
        this.permission = permission;
        this.ifShiro = ifShiro;
        this.workStationList = workStationList;
        this.workTypeList = workTypeList;
    }

    public Login() {
    }
}

