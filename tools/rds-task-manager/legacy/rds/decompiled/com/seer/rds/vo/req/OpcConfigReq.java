/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.req.OpcConfigReq
 *  io.swagger.annotations.ApiModel
 *  io.swagger.annotations.ApiModelProperty
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import org.springframework.stereotype.Component;

@ApiModel(value="\u66f4\u6539\u914d\u7f6e\u6587\u4ef6\u4e2dopc\u7684\u76f8\u5173\u53c2\u6570")
@Component
public class OpcConfigReq {
    @ApiModelProperty(value="\u914d\u7f6e\u7c7b\u578b", name="type", required=false)
    private String type;
    @ApiModelProperty(value="\u662f\u5426\u5f00\u542fOPC", name="opcEnable", required=false)
    private boolean opcEnable;
    @ApiModelProperty(value="\u662f\u5426\u533f\u540d", name="anonymousEnable", required=false)
    private boolean anonymousEnable;
    @ApiModelProperty(value="\u7528\u6237\u540d", name="userName", required=false)
    private String userName;
    @ApiModelProperty(value="\u5bc6\u7801", name="passWord", required=false)
    private String passWord;
    @ApiModelProperty(value="opc\u5ba2\u6237\u7aef\u8fde\u63a5\u670d\u52a1\u7684\u5730\u5740", name="opcuaEndpointUrl", required=false)
    private String opcuaEndpointUrl;
    @ApiModelProperty(value="plc\u65f6\u95f4\u95f4\u9694", name=" opcuaEndpointSubInterval", required=false)
    private String opcuaEndpointSubInterval;
    @ApiModelProperty(value="\u8bfb\u5199\u91cd\u8bd5\u6b21\u6570", name="retry", required=false)
    private String retry;
    @ApiModelProperty(value="\u8bfb\u5199\u91cd\u8bd5\u65f6\u95f4\u95f4\u9694", name="plcTimeInterval", required=false)
    private String retryInterval;

    public String getType() {
        return this.type;
    }

    public boolean isOpcEnable() {
        return this.opcEnable;
    }

    public boolean isAnonymousEnable() {
        return this.anonymousEnable;
    }

    public String getUserName() {
        return this.userName;
    }

    public String getPassWord() {
        return this.passWord;
    }

    public String getOpcuaEndpointUrl() {
        return this.opcuaEndpointUrl;
    }

    public String getOpcuaEndpointSubInterval() {
        return this.opcuaEndpointSubInterval;
    }

    public String getRetry() {
        return this.retry;
    }

    public String getRetryInterval() {
        return this.retryInterval;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setOpcEnable(boolean opcEnable) {
        this.opcEnable = opcEnable;
    }

    public void setAnonymousEnable(boolean anonymousEnable) {
        this.anonymousEnable = anonymousEnable;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public void setPassWord(String passWord) {
        this.passWord = passWord;
    }

    public void setOpcuaEndpointUrl(String opcuaEndpointUrl) {
        this.opcuaEndpointUrl = opcuaEndpointUrl;
    }

    public void setOpcuaEndpointSubInterval(String opcuaEndpointSubInterval) {
        this.opcuaEndpointSubInterval = opcuaEndpointSubInterval;
    }

    public void setRetry(String retry) {
        this.retry = retry;
    }

    public void setRetryInterval(String retryInterval) {
        this.retryInterval = retryInterval;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof OpcConfigReq)) {
            return false;
        }
        OpcConfigReq other = (OpcConfigReq)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.isOpcEnable() != other.isOpcEnable()) {
            return false;
        }
        if (this.isAnonymousEnable() != other.isAnonymousEnable()) {
            return false;
        }
        String this$type = this.getType();
        String other$type = other.getType();
        if (this$type == null ? other$type != null : !this$type.equals(other$type)) {
            return false;
        }
        String this$userName = this.getUserName();
        String other$userName = other.getUserName();
        if (this$userName == null ? other$userName != null : !this$userName.equals(other$userName)) {
            return false;
        }
        String this$passWord = this.getPassWord();
        String other$passWord = other.getPassWord();
        if (this$passWord == null ? other$passWord != null : !this$passWord.equals(other$passWord)) {
            return false;
        }
        String this$opcuaEndpointUrl = this.getOpcuaEndpointUrl();
        String other$opcuaEndpointUrl = other.getOpcuaEndpointUrl();
        if (this$opcuaEndpointUrl == null ? other$opcuaEndpointUrl != null : !this$opcuaEndpointUrl.equals(other$opcuaEndpointUrl)) {
            return false;
        }
        String this$opcuaEndpointSubInterval = this.getOpcuaEndpointSubInterval();
        String other$opcuaEndpointSubInterval = other.getOpcuaEndpointSubInterval();
        if (this$opcuaEndpointSubInterval == null ? other$opcuaEndpointSubInterval != null : !this$opcuaEndpointSubInterval.equals(other$opcuaEndpointSubInterval)) {
            return false;
        }
        String this$retry = this.getRetry();
        String other$retry = other.getRetry();
        if (this$retry == null ? other$retry != null : !this$retry.equals(other$retry)) {
            return false;
        }
        String this$retryInterval = this.getRetryInterval();
        String other$retryInterval = other.getRetryInterval();
        return !(this$retryInterval == null ? other$retryInterval != null : !this$retryInterval.equals(other$retryInterval));
    }

    protected boolean canEqual(Object other) {
        return other instanceof OpcConfigReq;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isOpcEnable() ? 79 : 97);
        result = result * 59 + (this.isAnonymousEnable() ? 79 : 97);
        String $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        String $userName = this.getUserName();
        result = result * 59 + ($userName == null ? 43 : $userName.hashCode());
        String $passWord = this.getPassWord();
        result = result * 59 + ($passWord == null ? 43 : $passWord.hashCode());
        String $opcuaEndpointUrl = this.getOpcuaEndpointUrl();
        result = result * 59 + ($opcuaEndpointUrl == null ? 43 : $opcuaEndpointUrl.hashCode());
        String $opcuaEndpointSubInterval = this.getOpcuaEndpointSubInterval();
        result = result * 59 + ($opcuaEndpointSubInterval == null ? 43 : $opcuaEndpointSubInterval.hashCode());
        String $retry = this.getRetry();
        result = result * 59 + ($retry == null ? 43 : $retry.hashCode());
        String $retryInterval = this.getRetryInterval();
        result = result * 59 + ($retryInterval == null ? 43 : $retryInterval.hashCode());
        return result;
    }

    public String toString() {
        return "OpcConfigReq(type=" + this.getType() + ", opcEnable=" + this.isOpcEnable() + ", anonymousEnable=" + this.isAnonymousEnable() + ", userName=" + this.getUserName() + ", passWord=" + this.getPassWord() + ", opcuaEndpointUrl=" + this.getOpcuaEndpointUrl() + ", opcuaEndpointSubInterval=" + this.getOpcuaEndpointSubInterval() + ", retry=" + this.getRetry() + ", retryInterval=" + this.getRetryInterval() + ")";
    }
}

