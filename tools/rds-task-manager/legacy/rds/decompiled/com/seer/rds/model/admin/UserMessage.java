/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.admin.UserMessage
 *  com.seer.rds.model.admin.UserMessage$UserMessageBuilder
 *  io.swagger.annotations.ApiModelProperty
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Index
 *  javax.persistence.Lob
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.annotations.CreationTimestamp
 *  org.hibernate.annotations.GenericGenerator
 *  org.springframework.data.annotation.CreatedDate
 */
package com.seer.rds.model.admin;

import com.seer.rds.model.admin.UserMessage;
import io.swagger.annotations.ApiModelProperty;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Lob;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;
import org.springframework.data.annotation.CreatedDate;

@Entity
@Table(name="t_user_message", indexes={@Index(name="user_message_level", columnList="level"), @Index(name="user_message_ifRead", columnList="ifRead"), @Index(name="user_message_isDel", columnList="isDel")})
public class UserMessage {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    @Column(nullable=false, name="\"level\"")
    @ApiModelProperty(value="\u5f02\u5e38\u7b49\u7ea7 1:INFO,2:WARN,3:ERROR")
    private Integer level = 3;
    @CreatedDate
    @Temporal(value=TemporalType.TIMESTAMP)
    @CreationTimestamp
    private Date createTime;
    @Lob
    @Column(nullable=false)
    @ApiModelProperty(value="\u6d88\u606f\u6807\u9898")
    private String messageTitle;
    @Lob
    @Column(nullable=false)
    @ApiModelProperty(value="\u6d88\u606f\u6b63\u6587")
    private String messageBody;
    @Column(nullable=false)
    @ApiModelProperty(value="\u662f\u5426\u5df2\u8bfb 1:\u672a\u8bfb,2:\u5df2\u8bfb")
    private Integer ifRead = 1;
    @Column(nullable=false)
    @ApiModelProperty(value="\u662f\u5426\u5220\u9664 1:\u672a\u5220\u9664,2:\u5df2\u5220\u9664")
    private Integer isDel = 1;

    public static UserMessageBuilder builder() {
        return new UserMessageBuilder();
    }

    public String getId() {
        return this.id;
    }

    public Integer getLevel() {
        return this.level;
    }

    public Date getCreateTime() {
        return this.createTime;
    }

    public String getMessageTitle() {
        return this.messageTitle;
    }

    public String getMessageBody() {
        return this.messageBody;
    }

    public Integer getIfRead() {
        return this.ifRead;
    }

    public Integer getIsDel() {
        return this.isDel;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setLevel(Integer level) {
        this.level = level;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public void setMessageTitle(String messageTitle) {
        this.messageTitle = messageTitle;
    }

    public void setMessageBody(String messageBody) {
        this.messageBody = messageBody;
    }

    public void setIfRead(Integer ifRead) {
        this.ifRead = ifRead;
    }

    public void setIsDel(Integer isDel) {
        this.isDel = isDel;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof UserMessage)) {
            return false;
        }
        UserMessage other = (UserMessage)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$level = this.getLevel();
        Integer other$level = other.getLevel();
        if (this$level == null ? other$level != null : !((Object)this$level).equals(other$level)) {
            return false;
        }
        Integer this$ifRead = this.getIfRead();
        Integer other$ifRead = other.getIfRead();
        if (this$ifRead == null ? other$ifRead != null : !((Object)this$ifRead).equals(other$ifRead)) {
            return false;
        }
        Integer this$isDel = this.getIsDel();
        Integer other$isDel = other.getIsDel();
        if (this$isDel == null ? other$isDel != null : !((Object)this$isDel).equals(other$isDel)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        Date this$createTime = this.getCreateTime();
        Date other$createTime = other.getCreateTime();
        if (this$createTime == null ? other$createTime != null : !((Object)this$createTime).equals(other$createTime)) {
            return false;
        }
        String this$messageTitle = this.getMessageTitle();
        String other$messageTitle = other.getMessageTitle();
        if (this$messageTitle == null ? other$messageTitle != null : !this$messageTitle.equals(other$messageTitle)) {
            return false;
        }
        String this$messageBody = this.getMessageBody();
        String other$messageBody = other.getMessageBody();
        return !(this$messageBody == null ? other$messageBody != null : !this$messageBody.equals(other$messageBody));
    }

    protected boolean canEqual(Object other) {
        return other instanceof UserMessage;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $level = this.getLevel();
        result = result * 59 + ($level == null ? 43 : ((Object)$level).hashCode());
        Integer $ifRead = this.getIfRead();
        result = result * 59 + ($ifRead == null ? 43 : ((Object)$ifRead).hashCode());
        Integer $isDel = this.getIsDel();
        result = result * 59 + ($isDel == null ? 43 : ((Object)$isDel).hashCode());
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Date $createTime = this.getCreateTime();
        result = result * 59 + ($createTime == null ? 43 : ((Object)$createTime).hashCode());
        String $messageTitle = this.getMessageTitle();
        result = result * 59 + ($messageTitle == null ? 43 : $messageTitle.hashCode());
        String $messageBody = this.getMessageBody();
        result = result * 59 + ($messageBody == null ? 43 : $messageBody.hashCode());
        return result;
    }

    public String toString() {
        return "UserMessage(id=" + this.getId() + ", level=" + this.getLevel() + ", createTime=" + this.getCreateTime() + ", messageTitle=" + this.getMessageTitle() + ", messageBody=" + this.getMessageBody() + ", ifRead=" + this.getIfRead() + ", isDel=" + this.getIsDel() + ")";
    }

    public UserMessage(String id, Integer level, Date createTime, String messageTitle, String messageBody, Integer ifRead, Integer isDel) {
        this.id = id;
        this.level = level;
        this.createTime = createTime;
        this.messageTitle = messageTitle;
        this.messageBody = messageBody;
        this.ifRead = ifRead;
        this.isDel = isDel;
    }

    public UserMessage() {
    }
}

