/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.SetSiteAttrBp
 *  com.seer.rds.vo.AttrVo
 *  com.seer.rds.vo.wind.SetSiteAttrBpFieId
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.AttrVo;
import com.seer.rds.vo.wind.SetSiteAttrBpFieId;
import java.util.HashMap;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="SetSiteAttrBp")
@Scope(value="prototype")
public class SetSiteAttrBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(SetSiteAttrBp.class);
    private Object siteId;
    private Object attrName;
    private Object attrValue;
    @Autowired
    private WorkSiteService workSiteService;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.siteId = rootBp.getInputParamValue(this.taskId, this.inputParams, SetSiteAttrBpFieId.siteId);
        this.attrName = rootBp.getInputParamValue(this.taskId, this.inputParams, SetSiteAttrBpFieId.attrName);
        this.attrValue = rootBp.getInputParamValue(this.taskId, this.inputParams, SetSiteAttrBpFieId.attrValue);
        if (Optional.ofNullable(this.siteId).isEmpty()) {
            throw new RuntimeException("@{wind.bp.siteIdEmpty}");
        }
        if (Optional.ofNullable(this.attrName).isEmpty()) {
            throw new RuntimeException("@{wind.bp.siteAttrEmpty}");
        }
        log.info("SetSiteContentBp siteId=" + this.siteId + "\uff0cattrName=" + this.attrName + "\uff0cattrValue=" + this.attrValue);
        String value = Optional.ofNullable(this.attrValue).isEmpty() ? "" : this.attrValue.toString();
        this.workSiteService.saveOrUpdateWorkSiteAttr(this.siteId.toString(), AttrVo.builder().attributeName(this.attrName.toString()).attributeValue(value).build());
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        HashMap<String, Object> map = new HashMap<String, Object>();
        map.put(SetSiteAttrBpFieId.siteId, this.siteId);
        map.put(SetSiteAttrBpFieId.attrName, this.attrName);
        map.put(SetSiteAttrBpFieId.attrValue, this.attrValue);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString(map));
        super.getWindService().saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }
}

