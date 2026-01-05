/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.GetSiteAttrBp
 *  com.seer.rds.vo.wind.SetSiteAttrBpFieId
 *  org.apache.commons.collections.CollectionUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.SetSiteAttrBpFieId;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.apache.commons.collections.CollectionUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="GetSiteAttrBp")
@Scope(value="prototype")
public class GetSiteAttrBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(GetSiteAttrBp.class);
    private Object siteId;
    private Object attrName;
    @Autowired
    private WorkSiteService workSiteService;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.siteId = rootBp.getInputParamValue(this.taskId, this.inputParams, SetSiteAttrBpFieId.siteId);
        this.attrName = rootBp.getInputParamValue(this.taskId, this.inputParams, SetSiteAttrBpFieId.attrName);
        if (Optional.ofNullable(this.siteId).isEmpty()) {
            throw new RuntimeException("@{wind.bp.siteIdEmpty}");
        }
        if (Optional.ofNullable(this.attrName).isEmpty()) {
            throw new RuntimeException("@{wind.bp.siteAttrEmpty}");
        }
        String result = null;
        log.info("GetSiteAttrBp siteId=" + this.siteId + "\uff0cattrName=" + this.attrName);
        List valueByNameAndSiteId = this.workSiteService.findValueByNameAndSiteId(this.attrName.toString(), this.siteId.toString());
        if (CollectionUtils.isNotEmpty((Collection)valueByNameAndSiteId)) {
            result = (String)valueByNameAndSiteId.get(0);
        }
        this.saveLogResult(result);
        this.blockOutParamsValue.put("attrValue", result);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }
}

