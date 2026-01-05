/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.constant.TaskBlockStatusEnum
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.threadPool.LinkedBqThreadPool
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.ParallelRepeatNBp
 *  com.seer.rds.vo.wind.ParallelRepeatNField
 *  org.apache.commons.compress.utils.Lists
 *  org.apache.commons.lang3.ObjectUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.constant.TaskBlockStatusEnum;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.threadPool.LinkedBqThreadPool;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.ParallelRepeatNField;
import java.util.ArrayList;
import java.util.concurrent.Callable;
import java.util.concurrent.Future;
import org.apache.commons.compress.utils.Lists;
import org.apache.commons.lang3.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="ParallelRepeatNBp")
@Scope(value="prototype")
public class ParallelRepeatNBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(ParallelRepeatNBp.class);
    @Autowired
    private WindService windService;
    private Object num;

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.blockRecord.setStatus(Integer.valueOf(TaskBlockStatusEnum.running.getStatus()));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
        this.num = rootBp.getInputParamValue(this.taskId, this.inputParams, ParallelRepeatNField.num);
        if (ObjectUtils.anyNull((Object[])new Object[]{this.num})) {
            throw new RuntimeException("@{wind.bp.repeatNum}");
        }
        if (this.childDefaultArray == null) {
            log.error("childDefaultArray is null");
            return;
        }
        int numInt = Integer.parseInt(this.num.toString());
        if (numInt > 100) {
            throw new RuntimeException(String.format("@{wind.bp.repeatLarge}:%s", this.num));
        }
        LinkedBqThreadPool taskPool = LinkedBqThreadPool.getInstance();
        ArrayList futureList = Lists.newArrayList();
        for (int i = 0; i < numInt; ++i) {
            Thread.sleep(50L);
            Future result = taskPool.submit((Callable)new /* Unavailable Anonymous Inner Class!! */);
            futureList.add(result);
        }
        for (Future future : futureList) {
            try {
                Boolean bl = (Boolean)future.get();
            }
            catch (Exception e) {
                this.checkIfInterrupt();
                log.error("executeChild error", (Throwable)e);
                throw e;
            }
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
        ParallelRepeatNBp bpData = new ParallelRepeatNBp();
        bpData.setNum(this.num);
        this.blockRecord.setBlockInputParamsValue(JSONObject.toJSONString((Object)bpData));
        this.windService.saveBlockRecord(this.blockRecord, this.blockVo.getBlockId(), this.blockVo.getBlockType(), this.taskRecord.getProjectId(), this.taskId, this.taskRecord.getId(), this.startOn);
    }

    protected void runChildBlock(AbstratRootBp rootBp) {
    }

    public WindService getWindService() {
        return this.windService;
    }

    public Object getNum() {
        return this.num;
    }

    public void setWindService(WindService windService) {
        this.windService = windService;
    }

    public void setNum(Object num) {
        this.num = num;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ParallelRepeatNBp)) {
            return false;
        }
        ParallelRepeatNBp other = (ParallelRepeatNBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        WindService this$windService = this.getWindService();
        WindService other$windService = other.getWindService();
        if (this$windService == null ? other$windService != null : !this$windService.equals(other$windService)) {
            return false;
        }
        Object this$num = this.getNum();
        Object other$num = other.getNum();
        return !(this$num == null ? other$num != null : !this$num.equals(other$num));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ParallelRepeatNBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        WindService $windService = this.getWindService();
        result = result * 59 + ($windService == null ? 43 : $windService.hashCode());
        Object $num = this.getNum();
        result = result * 59 + ($num == null ? 43 : $num.hashCode());
        return result;
    }

    public String toString() {
        return "ParallelRepeatNBp(windService=" + this.getWindService() + ", num=" + this.getNum() + ")";
    }

    static /* synthetic */ BaseRecord access$000(ParallelRepeatNBp x0) {
        return x0.taskRecord;
    }

    static /* synthetic */ BaseRecord access$100(ParallelRepeatNBp x0) {
        return x0.taskRecord;
    }

    static /* synthetic */ BaseRecord access$200(ParallelRepeatNBp x0) {
        return x0.taskRecord;
    }

    static /* synthetic */ Object access$300(ParallelRepeatNBp x0) {
        return x0.childDefaultArray;
    }

    static /* synthetic */ String access$400(ParallelRepeatNBp x0) {
        return x0.taskId;
    }

    static /* synthetic */ BaseRecord access$500(ParallelRepeatNBp x0) {
        return x0.taskRecord;
    }
}

