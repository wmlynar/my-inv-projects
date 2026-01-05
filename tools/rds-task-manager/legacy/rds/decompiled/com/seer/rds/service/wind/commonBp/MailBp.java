/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.email.EmailUtil
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.MailBp
 *  com.seer.rds.vo.wind.MailBpField
 *  com.seer.rds.web.config.ConfigFileController
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.mail.SimpleMailMessage
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.email.EmailUtil;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.MailBpField;
import com.seer.rds.web.config.ConfigFileController;
import java.util.Date;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.stereotype.Component;

@Component(value="MailBp")
@Scope(value="prototype")
public class MailBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(MailBp.class);
    @Autowired
    private WindService windService;
    private Object toAddresses;
    private Object subject;
    private Object content;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.toAddresses = rootBp.getInputParamValue(this.taskId, this.inputParams, MailBpField.toAddresses);
        this.subject = rootBp.getInputParamValue(this.taskId, this.inputParams, MailBpField.subject);
        this.content = rootBp.getInputParamValue(this.taskId, this.inputParams, MailBpField.content);
        SimpleMailMessage message = new SimpleMailMessage();
        message.setSubject(this.subject.toString());
        message.setFrom(ConfigFileController.commonConfig.getEmailConfig().getUsername());
        if (this.toAddresses instanceof List) {
            message.setTo(((List)this.toAddresses).toArray(new String[((List)this.toAddresses).size()]));
        } else {
            message.setTo(this.toAddresses.toString());
        }
        message.setSentDate(new Date());
        message.setText(this.content.toString());
        EmailUtil.javaMailSender.send(message);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        MailBp bpData = new MailBp();
        bpData.setSubject((Object)this.subject.toString());
        bpData.setContent((Object)this.content.toString());
        bpData.setToAddresses((Object)this.toAddresses.toString());
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public Object getToAddresses() {
        return this.toAddresses;
    }

    public Object getSubject() {
        return this.subject;
    }

    public Object getContent() {
        return this.content;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setToAddresses(Object toAddresses) {
        this.toAddresses = toAddresses;
    }

    public void setSubject(Object subject) {
        this.subject = subject;
    }

    public void setContent(Object content) {
        this.content = content;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof MailBp)) {
            return false;
        }
        MailBp other = (MailBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        Object this$toAddresses = this.getToAddresses();
        Object other$toAddresses = other.getToAddresses();
        if (this$toAddresses == null ? other$toAddresses != null : !this$toAddresses.equals(other$toAddresses)) {
            return false;
        }
        Object this$subject = this.getSubject();
        Object other$subject = other.getSubject();
        if (this$subject == null ? other$subject != null : !this$subject.equals(other$subject)) {
            return false;
        }
        Object this$content = this.getContent();
        Object other$content = other.getContent();
        return !(this$content == null ? other$content != null : !this$content.equals(other$content));
    }

    protected boolean canEqual(Object other) {
        return other instanceof MailBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        Object $toAddresses = this.getToAddresses();
        result = result * 59 + ($toAddresses == null ? 43 : $toAddresses.hashCode());
        Object $subject = this.getSubject();
        result = result * 59 + ($subject == null ? 43 : $subject.hashCode());
        Object $content = this.getContent();
        result = result * 59 + ($content == null ? 43 : $content.hashCode());
        return result;
    }

    public String toString() {
        return "MailBp(windService=" + this.getWindService() + ", toAddresses=" + this.getToAddresses() + ", subject=" + this.getSubject() + ", content=" + this.getContent() + ")";
    }
}

