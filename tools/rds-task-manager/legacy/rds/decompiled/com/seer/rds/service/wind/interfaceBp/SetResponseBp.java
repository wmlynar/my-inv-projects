/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.InterfaceHandleRecord
 *  com.seer.rds.service.factory.RecordUpdaterFactory
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.InterfaceRootBp
 *  com.seer.rds.service.wind.interfaceBp.SetResponseBp
 *  com.seer.rds.vo.wind.SetResponseBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 *  unitauto.JSON
 */
package com.seer.rds.service.wind.interfaceBp;

import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.InterfaceHandleRecord;
import com.seer.rds.service.factory.RecordUpdaterFactory;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.InterfaceRootBp;
import com.seer.rds.vo.wind.SetResponseBpField;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import unitauto.JSON;

@Component(value="SetResponseBp")
@Scope(value="prototype")
public class SetResponseBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(SetResponseBp.class);
    private Object body;
    private Object code;
    private Map outPutParams;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.body = rootBp.getInputParamValue(this.taskId, this.inputParams, SetResponseBpField.body);
        this.code = rootBp.getInputParamValue(this.taskId, this.inputParams, SetResponseBpField.code);
        this.code = this.code == null ? Integer.valueOf(200) : this.code;
        this.body = this.body == null ? "" : this.body;
        log.info("[SetResponseBodyBp]" + String.format("responseBody=%s", this.body.toString()));
        ((InterfaceRootBp)rootBp).body = com.alibaba.fastjson.JSON.toJSON((Object)this.body);
        ((InterfaceRootBp)rootBp).code = Integer.valueOf(this.code.toString());
        ((InterfaceHandleRecord)this.taskRecord).setResponseBody(com.alibaba.fastjson.JSON.toJSONString((Object)this.body));
        ((InterfaceHandleRecord)this.taskRecord).setCode(JSON.format((Object)this.code));
        RecordUpdaterFactory.getUpdater((BaseRecord)this.taskRecord).updateRecord(this.taskRecord);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }

    public Object getBody() {
        return this.body;
    }

    public Object getCode() {
        return this.code;
    }

    public Map getOutPutParams() {
        return this.outPutParams;
    }

    public void setBody(Object body) {
        this.body = body;
    }

    public void setCode(Object code) {
        this.code = code;
    }

    public void setOutPutParams(Map outPutParams) {
        this.outPutParams = outPutParams;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SetResponseBp)) {
            return false;
        }
        SetResponseBp other = (SetResponseBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Object this$body = this.getBody();
        Object other$body = other.getBody();
        if (this$body == null ? other$body != null : !this$body.equals(other$body)) {
            return false;
        }
        Object this$code = this.getCode();
        Object other$code = other.getCode();
        if (this$code == null ? other$code != null : !this$code.equals(other$code)) {
            return false;
        }
        Map this$outPutParams = this.getOutPutParams();
        Map other$outPutParams = other.getOutPutParams();
        return !(this$outPutParams == null ? other$outPutParams != null : !((Object)this$outPutParams).equals(other$outPutParams));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SetResponseBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $body = this.getBody();
        result = result * 59 + ($body == null ? 43 : $body.hashCode());
        Object $code = this.getCode();
        result = result * 59 + ($code == null ? 43 : $code.hashCode());
        Map $outPutParams = this.getOutPutParams();
        result = result * 59 + ($outPutParams == null ? 43 : ((Object)$outPutParams).hashCode());
        return result;
    }

    public String toString() {
        return "SetResponseBp(body=" + this.getBody() + ", code=" + this.getCode() + ", outPutParams=" + this.getOutPutParams() + ")";
    }
}

