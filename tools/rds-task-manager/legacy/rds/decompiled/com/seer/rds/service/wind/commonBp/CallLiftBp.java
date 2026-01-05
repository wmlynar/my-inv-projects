/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.common.collect.Maps
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.model.device.LiftRecord
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.device.LiftService
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.commonBp.CallLiftBp
 *  com.seer.rds.vo.wind.CallLiftBpFiled
 *  com.seer.rds.vo.wind.ParamPreField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.google.common.collect.Maps;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.model.device.LiftRecord;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.service.device.LiftService;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.CallLiftBpFiled;
import com.seer.rds.vo.wind.ParamPreField;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="CallLiftBp")
@Scope(value="prototype")
@Deprecated
public class CallLiftBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(CallLiftBp.class);
    @Autowired
    private WorkSiteService workSiteService;
    @Autowired
    private WorkSiteMapper workSiteMapper;
    @Autowired
    private LiftService liftService;
    private String oprType;
    private String pickFloorArea;
    private String putFloorArea;
    private String liftName;
    private String liftGroupNameForPut;
    private String liftGroupNameForPick;
    private String liftGroupNameForPre;
    private int liftRow;
    private int liftLine;
    public static ConcurrentHashMap<String, String> siteMap = new ConcurrentHashMap();

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        this.oprType = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CallLiftBpFiled.oprType);
        this.pickFloorArea = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CallLiftBpFiled.pickFloorArea);
        this.putFloorArea = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CallLiftBpFiled.putFloorArea);
        this.liftName = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CallLiftBpFiled.liftName);
        this.liftGroupNameForPut = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CallLiftBpFiled.liftGroupNameForPut);
        this.liftGroupNameForPick = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CallLiftBpFiled.liftGroupNameForPick);
        this.liftGroupNameForPre = (String)rootBp.getInputParamValue(this.taskId, this.inputParams, CallLiftBpFiled.liftGroupNameForPre);
        this.liftRow = Integer.parseInt((String)rootBp.getInputParamValue(this.taskId, this.inputParams, CallLiftBpFiled.liftRow));
        this.liftLine = Integer.parseInt((String)rootBp.getInputParamValue(this.taskId, this.inputParams, CallLiftBpFiled.liftLine));
        int isPutFlag = this.oprType.equals("true") ? 1 : 0;
        log.info("CallLiftBp taskRecordId = {},isPick={}, pickFloorArea={},putFloorArea={},liftName={},liftGroupNameForPut={},liftGroupNameForPick={}", new Object[]{this.taskRecord.getId(), isPutFlag, this.pickFloorArea, this.putFloorArea, this.liftName, this.liftGroupNameForPut, this.liftGroupNameForPick});
        int isCrowed = 0;
        String taskRecordId = this.taskRecord.getId();
        ArrayList<String> siteIdListFromArea = new ArrayList<String>();
        siteIdListFromArea.add(this.pickFloorArea);
        siteIdListFromArea.add(this.putFloorArea);
        if (this.workSiteService.findByAreaOrderBySiteIdAsc(siteIdListFromArea).size() <= 1) {
            throw new Exception(String.format("@{response.code.paramsError}:%s %s", this.pickFloorArea, this.putFloorArea));
        }
        if (!this.liftService.checkGroupIsExist(this.liftGroupNameForPut)) {
            throw new Exception(String.format("@{response.code.paramsError}:%s", this.liftGroupNameForPut));
        }
        if (!this.liftService.checkGroupIsExist(this.liftGroupNameForPick)) {
            throw new Exception(String.format("@{response.code.paramsError}:%s", this.liftGroupNameForPick));
        }
        if (this.liftRow != 1 && this.liftRow != 2) {
            throw new Exception(String.format("@{response.code.paramsError}:%s", this.liftRow));
        }
        if (this.liftLine != 1 && this.liftLine != 2) {
            throw new Exception(String.format("@{response.code.paramsError}:%s", this.liftLine));
        }
        int liftSiteCount = this.liftRow * this.liftLine;
        if (this.liftRow == 2) {
            isCrowed = 1;
        }
        LiftRecord liftRecord = null;
        List siteList = null;
        String targetFloorArea = "";
        String targetSiteId = "";
        String matchSiteId = "";
        if (isPutFlag == 0) {
            if (!this.liftService.isBlockLiftTaskForPut(this.putFloorArea, this.liftGroupNameForPre, liftSiteCount, this.liftName, this.pickFloorArea)) {
                this.liftService.addLiftRecord(this.liftName, this.pickFloorArea, this.putFloorArea, taskRecordId, 0, isCrowed);
                liftRecord = this.liftService.waitAndGetLiftRecord(taskRecordId, 0, this.liftGroupNameForPre, liftSiteCount, this.liftGroupNameForPick);
            } else {
                liftRecord = this.liftService.getLiftRecord(this.liftName, this.pickFloorArea, this.putFloorArea, taskRecordId, 0, isCrowed);
            }
            siteList = this.liftService.getSiteListForPut(this.pickFloorArea, this.putFloorArea, this.liftName, this.liftGroupNameForPre, this.liftGroupNameForPut, this.liftGroupNameForPick);
            targetFloorArea = this.putFloorArea;
            targetSiteId = (String)siteList.get(0);
            matchSiteId = (String)siteList.get(1);
            if (liftSiteCount == 4) {
                this.liftService.waitForSiteFinshedInInner(this.liftGroupNameForPre, taskRecordId);
            }
            siteMap.put(matchSiteId + "putTaskRecordId", taskRecordId);
        } else {
            if (!this.liftService.isExistFilledSiteForPick(this.liftGroupNameForPick, liftSiteCount)) {
                throw new Exception(String.format("@{response.code.paramsError}:%s", this.oprType));
            }
            if (!this.liftService.isBlockLiftTaskForPick(taskRecordId, this.pickFloorArea, this.liftGroupNameForPre, this.liftGroupNameForPick, liftSiteCount, isCrowed, this.liftName)) {
                log.info(taskRecordId + "\u963b\u585e");
                this.liftService.addLiftRecord(this.liftName, this.pickFloorArea, this.putFloorArea, taskRecordId, 1, isCrowed);
                liftRecord = this.liftService.waitAndGetLiftRecord(taskRecordId, 1, this.liftGroupNameForPre, liftSiteCount, this.liftGroupNameForPick);
            } else {
                liftRecord = this.liftService.getLiftRecord(this.liftName, this.pickFloorArea, this.putFloorArea, taskRecordId, 1, isCrowed);
                log.info(taskRecordId + "\u672a\u963b\u585e");
            }
            siteList = this.liftService.getSiteListForPick(this.pickFloorArea, this.liftName, this.liftGroupNameForPre);
            targetFloorArea = this.pickFloorArea;
            targetSiteId = (String)siteList.get(1);
            matchSiteId = (String)siteList.get(0);
            if (liftSiteCount == 4) {
                this.liftService.waitForSiteFinshedInInner(this.liftGroupNameForPre, taskRecordId);
                while (!this.liftService.checkOtherCrowedSiteForPick(liftRecord, this.liftName, this.pickFloorArea, this.liftGroupNameForPick, liftSiteCount)) {
                    Thread.sleep(5000L);
                }
            }
        }
        if (!siteList.contains(null)) {
            for (int i = 0; i < siteList.size(); ++i) {
                int isLocked = this.workSiteMapper.lockedSitesBySiteId(taskRecordId, (String)siteList.get(i));
                while (isLocked != 1) {
                    isLocked = this.workSiteMapper.lockedSitesBySiteId(taskRecordId, (String)siteList.get(i));
                    Thread.sleep(3000L);
                }
            }
        } else {
            throw new RuntimeException("targetLiftSite is null");
        }
        this.liftService.insertLiftRecord(siteList, liftRecord, liftSiteCount, this.liftGroupNameForPut);
        this.liftService.callLift(this.liftName, targetFloorArea);
        this.liftService.waitingLift(this.liftName, targetFloorArea);
        siteMap.put(targetSiteId, matchSiteId);
        String result = null;
        log.info("CallLiftBp siteId=" + targetSiteId);
        result = siteList.toString();
        Map paramMap = (Map)((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).get(ParamPreField.blocks);
        ConcurrentMap childParamMap = Maps.newConcurrentMap();
        childParamMap.put("liftSite", targetSiteId);
        childParamMap.put("preSite", siteList.get(2));
        paramMap.put(this.blockVo.getBlockName(), childParamMap);
        ((ConcurrentHashMap)AbstratRootBp.outputParamsMap.get()).put(ParamPreField.blocks, paramMap);
        this.saveLogResult((Object)result);
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }

    public WorkSiteService getWorkSiteService() {
        return this.workSiteService;
    }

    public WorkSiteMapper getWorkSiteMapper() {
        return this.workSiteMapper;
    }

    public LiftService getLiftService() {
        return this.liftService;
    }

    public String getOprType() {
        return this.oprType;
    }

    public String getPickFloorArea() {
        return this.pickFloorArea;
    }

    public String getPutFloorArea() {
        return this.putFloorArea;
    }

    public String getLiftName() {
        return this.liftName;
    }

    public String getLiftGroupNameForPut() {
        return this.liftGroupNameForPut;
    }

    public String getLiftGroupNameForPick() {
        return this.liftGroupNameForPick;
    }

    public String getLiftGroupNameForPre() {
        return this.liftGroupNameForPre;
    }

    public int getLiftRow() {
        return this.liftRow;
    }

    public int getLiftLine() {
        return this.liftLine;
    }

    public void setWorkSiteService(WorkSiteService workSiteService) {
        this.workSiteService = workSiteService;
    }

    public void setWorkSiteMapper(WorkSiteMapper workSiteMapper) {
        this.workSiteMapper = workSiteMapper;
    }

    public void setLiftService(LiftService liftService) {
        this.liftService = liftService;
    }

    public void setOprType(String oprType) {
        this.oprType = oprType;
    }

    public void setPickFloorArea(String pickFloorArea) {
        this.pickFloorArea = pickFloorArea;
    }

    public void setPutFloorArea(String putFloorArea) {
        this.putFloorArea = putFloorArea;
    }

    public void setLiftName(String liftName) {
        this.liftName = liftName;
    }

    public void setLiftGroupNameForPut(String liftGroupNameForPut) {
        this.liftGroupNameForPut = liftGroupNameForPut;
    }

    public void setLiftGroupNameForPick(String liftGroupNameForPick) {
        this.liftGroupNameForPick = liftGroupNameForPick;
    }

    public void setLiftGroupNameForPre(String liftGroupNameForPre) {
        this.liftGroupNameForPre = liftGroupNameForPre;
    }

    public void setLiftRow(int liftRow) {
        this.liftRow = liftRow;
    }

    public void setLiftLine(int liftLine) {
        this.liftLine = liftLine;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof CallLiftBp)) {
            return false;
        }
        CallLiftBp other = (CallLiftBp)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getLiftRow() != other.getLiftRow()) {
            return false;
        }
        if (this.getLiftLine() != other.getLiftLine()) {
            return false;
        }
        WorkSiteService this$workSiteService = this.getWorkSiteService();
        WorkSiteService other$workSiteService = other.getWorkSiteService();
        if (this$workSiteService == null ? other$workSiteService != null : !this$workSiteService.equals(other$workSiteService)) {
            return false;
        }
        WorkSiteMapper this$workSiteMapper = this.getWorkSiteMapper();
        WorkSiteMapper other$workSiteMapper = other.getWorkSiteMapper();
        if (this$workSiteMapper == null ? other$workSiteMapper != null : !this$workSiteMapper.equals(other$workSiteMapper)) {
            return false;
        }
        LiftService this$liftService = this.getLiftService();
        LiftService other$liftService = other.getLiftService();
        if (this$liftService == null ? other$liftService != null : !this$liftService.equals(other$liftService)) {
            return false;
        }
        String this$oprType = this.getOprType();
        String other$oprType = other.getOprType();
        if (this$oprType == null ? other$oprType != null : !this$oprType.equals(other$oprType)) {
            return false;
        }
        String this$pickFloorArea = this.getPickFloorArea();
        String other$pickFloorArea = other.getPickFloorArea();
        if (this$pickFloorArea == null ? other$pickFloorArea != null : !this$pickFloorArea.equals(other$pickFloorArea)) {
            return false;
        }
        String this$putFloorArea = this.getPutFloorArea();
        String other$putFloorArea = other.getPutFloorArea();
        if (this$putFloorArea == null ? other$putFloorArea != null : !this$putFloorArea.equals(other$putFloorArea)) {
            return false;
        }
        String this$liftName = this.getLiftName();
        String other$liftName = other.getLiftName();
        if (this$liftName == null ? other$liftName != null : !this$liftName.equals(other$liftName)) {
            return false;
        }
        String this$liftGroupNameForPut = this.getLiftGroupNameForPut();
        String other$liftGroupNameForPut = other.getLiftGroupNameForPut();
        if (this$liftGroupNameForPut == null ? other$liftGroupNameForPut != null : !this$liftGroupNameForPut.equals(other$liftGroupNameForPut)) {
            return false;
        }
        String this$liftGroupNameForPick = this.getLiftGroupNameForPick();
        String other$liftGroupNameForPick = other.getLiftGroupNameForPick();
        if (this$liftGroupNameForPick == null ? other$liftGroupNameForPick != null : !this$liftGroupNameForPick.equals(other$liftGroupNameForPick)) {
            return false;
        }
        String this$liftGroupNameForPre = this.getLiftGroupNameForPre();
        String other$liftGroupNameForPre = other.getLiftGroupNameForPre();
        return !(this$liftGroupNameForPre == null ? other$liftGroupNameForPre != null : !this$liftGroupNameForPre.equals(other$liftGroupNameForPre));
    }

    protected boolean canEqual(Object other) {
        return other instanceof CallLiftBp;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getLiftRow();
        result = result * 59 + this.getLiftLine();
        WorkSiteService $workSiteService = this.getWorkSiteService();
        result = result * 59 + ($workSiteService == null ? 43 : $workSiteService.hashCode());
        WorkSiteMapper $workSiteMapper = this.getWorkSiteMapper();
        result = result * 59 + ($workSiteMapper == null ? 43 : $workSiteMapper.hashCode());
        LiftService $liftService = this.getLiftService();
        result = result * 59 + ($liftService == null ? 43 : $liftService.hashCode());
        String $oprType = this.getOprType();
        result = result * 59 + ($oprType == null ? 43 : $oprType.hashCode());
        String $pickFloorArea = this.getPickFloorArea();
        result = result * 59 + ($pickFloorArea == null ? 43 : $pickFloorArea.hashCode());
        String $putFloorArea = this.getPutFloorArea();
        result = result * 59 + ($putFloorArea == null ? 43 : $putFloorArea.hashCode());
        String $liftName = this.getLiftName();
        result = result * 59 + ($liftName == null ? 43 : $liftName.hashCode());
        String $liftGroupNameForPut = this.getLiftGroupNameForPut();
        result = result * 59 + ($liftGroupNameForPut == null ? 43 : $liftGroupNameForPut.hashCode());
        String $liftGroupNameForPick = this.getLiftGroupNameForPick();
        result = result * 59 + ($liftGroupNameForPick == null ? 43 : $liftGroupNameForPick.hashCode());
        String $liftGroupNameForPre = this.getLiftGroupNameForPre();
        result = result * 59 + ($liftGroupNameForPre == null ? 43 : $liftGroupNameForPre.hashCode());
        return result;
    }

    public String toString() {
        return "CallLiftBp(workSiteService=" + this.getWorkSiteService() + ", workSiteMapper=" + this.getWorkSiteMapper() + ", liftService=" + this.getLiftService() + ", oprType=" + this.getOprType() + ", pickFloorArea=" + this.getPickFloorArea() + ", putFloorArea=" + this.getPutFloorArea() + ", liftName=" + this.getLiftName() + ", liftGroupNameForPut=" + this.getLiftGroupNameForPut() + ", liftGroupNameForPick=" + this.getLiftGroupNameForPick() + ", liftGroupNameForPre=" + this.getLiftGroupNameForPre() + ", liftRow=" + this.getLiftRow() + ", liftLine=" + this.getLiftLine() + ")";
    }
}

