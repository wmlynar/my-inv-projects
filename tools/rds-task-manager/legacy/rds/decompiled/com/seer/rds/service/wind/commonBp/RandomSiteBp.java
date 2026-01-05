/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.RandomSiteBp
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.RandomSiteBpField
 *  org.apache.commons.lang3.RandomUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.ParamPreField;
import com.seer.rds.vo.wind.RandomSiteBpField;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.apache.commons.lang3.RandomUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="RandomSiteBp")
@Scope(value="prototype")
public class RandomSiteBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(RandomSiteBp.class);
    @Autowired
    private WindService windService;
    @Autowired
    private WorkSiteService workSiteService;
    private Object prefix;
    private Object start;
    private Object length;
    private Object width;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.prefix = rootBp.getInputParamValue(this.taskId, this.inputParams, RandomSiteBpField.prefix);
        this.start = rootBp.getInputParamValue(this.taskId, this.inputParams, RandomSiteBpField.start);
        this.length = rootBp.getInputParamValue(this.taskId, this.inputParams, RandomSiteBpField.length);
        this.width = rootBp.getInputParamValue(this.taskId, this.inputParams, RandomSiteBpField.width);
        if (this.prefix == null) {
            throw new RuntimeException("@{wind.bp.prefixEmpty}");
        }
        if (this.start == null) {
            throw new RuntimeException("@{wind.bp.startEmpty}");
        }
        if (this.length == null) {
            throw new RuntimeException("@{wind.bp.lengthEmpty}");
        }
        if (this.width == null) {
            throw new RuntimeException("@{wind.bp.widthEmpty}");
        }
        String randomSiteSuffix = "" + (Integer.parseInt(this.start.toString()) - 1 + RandomUtils.nextInt((int)1, (int)(Integer.parseInt(this.length.toString()) + 1)));
        int widthInt = Integer.parseInt(this.width.toString());
        int suffixLength = randomSiteSuffix.length();
        if (suffixLength < widthInt) {
            for (int i = 0; i < widthInt - suffixLength; ++i) {
                randomSiteSuffix = "0" + randomSiteSuffix;
            }
        }
        String randomSiteName = this.prefix.toString() + randomSiteSuffix;
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put(RandomSiteBpField.randomName, randomSiteName);
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        RandomSiteBp bpData = new RandomSiteBp();
        bpData.setLength(this.length);
        bpData.setPrefix(this.prefix);
        bpData.setStart(this.start);
        bpData.setWidth(this.width);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    public WindService getWindService() {
        return this.windService;
    }

    public WorkSiteService getWorkSiteService() {
        return this.workSiteService;
    }

    public Object getPrefix() {
        return this.prefix;
    }

    public Object getStart() {
        return this.start;
    }

    public Object getLength() {
        return this.length;
    }

    public Object getWidth() {
        return this.width;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setWorkSiteService(WorkSiteService workSiteService) {
        this.workSiteService = workSiteService;
    }

    public void setPrefix(Object prefix) {
        this.prefix = prefix;
    }

    public void setStart(Object start) {
        this.start = start;
    }

    public void setLength(Object length) {
        this.length = length;
    }

    public void setWidth(Object width) {
        this.width = width;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof RandomSiteBp)) {
            return false;
        }
        RandomSiteBp other = (RandomSiteBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        WorkSiteService this$workSiteService = this.getWorkSiteService();
        WorkSiteService other$workSiteService = other.getWorkSiteService();
        if (this$workSiteService == null ? other$workSiteService != null : !this$workSiteService.equals(other$workSiteService)) {
            return false;
        }
        Object this$prefix = this.getPrefix();
        Object other$prefix = other.getPrefix();
        if (this$prefix == null ? other$prefix != null : !this$prefix.equals(other$prefix)) {
            return false;
        }
        Object this$start = this.getStart();
        Object other$start = other.getStart();
        if (this$start == null ? other$start != null : !this$start.equals(other$start)) {
            return false;
        }
        Object this$length = this.getLength();
        Object other$length = other.getLength();
        if (this$length == null ? other$length != null : !this$length.equals(other$length)) {
            return false;
        }
        Object this$width = this.getWidth();
        Object other$width = other.getWidth();
        return !(this$width == null ? other$width != null : !this$width.equals(other$width));
    }

    protected boolean canEqual(Object other) {
        return other instanceof RandomSiteBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        WorkSiteService $workSiteService = this.getWorkSiteService();
        result = result * 59 + ($workSiteService == null ? 43 : $workSiteService.hashCode());
        Object $prefix = this.getPrefix();
        result = result * 59 + ($prefix == null ? 43 : $prefix.hashCode());
        Object $start = this.getStart();
        result = result * 59 + ($start == null ? 43 : $start.hashCode());
        Object $length = this.getLength();
        result = result * 59 + ($length == null ? 43 : $length.hashCode());
        Object $width = this.getWidth();
        result = result * 59 + ($width == null ? 43 : $width.hashCode());
        return result;
    }

    public String toString() {
        return "RandomSiteBp(windService=" + this.getWindService() + ", workSiteService=" + this.getWorkSiteService() + ", prefix=" + this.getPrefix() + ", start=" + this.getStart() + ", length=" + this.getLength() + ", width=" + this.getWidth() + ")";
    }
}

