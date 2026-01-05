/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.dao.LiftRecordMapper
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.model.device.LiftRecord
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.device.LiftService
 *  com.seer.rds.service.device.LiftService$1
 *  com.seer.rds.service.device.LiftService$2
 *  com.seer.rds.service.device.LiftService$3
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.WorkSiteHqlCondition
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.device;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.dao.LiftRecordMapper;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.model.device.LiftRecord;
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.service.device.LiftService;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.WorkSiteHqlCondition;
import java.io.IOException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class LiftService {
    private static final Logger log = LoggerFactory.getLogger(LiftService.class);
    @Autowired
    private WorkSiteMapper workSiteMapper;
    @Autowired
    private LiftRecordMapper liftRecordMapper;
    @Autowired
    private WorkSiteService workSiteService;
    @Autowired
    private WindTaskService windTaskService;
    ArrayDeque<LiftRecord> liftQueue = new ArrayDeque();

    public boolean checkGroupIsExist(String groupName) {
        List workSiteGroups = this.workSiteService.findWorkSiteGroups();
        return !workSiteGroups.isEmpty() && workSiteGroups.contains(groupName);
    }

    public boolean isExistFilledSiteForPick(String liftGroupNameForPick, int liftSiteCount) {
        WorkSiteHqlCondition workSiteHqlCondition = new WorkSiteHqlCondition();
        String[] groupList = new String[]{liftGroupNameForPick};
        workSiteHqlCondition.setGroupNames(groupList);
        workSiteHqlCondition.setFilled(Boolean.valueOf(false));
        List sitesByCondition = this.workSiteService.findSitesByCondition(workSiteHqlCondition);
        return sitesByCondition.size() < liftSiteCount;
    }

    public String getDeviceDetails() {
        try {
            String res = OkHttpUtil.get((String)(AbstratRootBp.getUrl((String)ApiEnum.devicesDetails.getUri()) + "?devices=lifts"));
            return res;
        }
        catch (IOException e) {
            log.error("getDeviceDetails error,{}", (Throwable)e);
            return null;
        }
    }

    public String getLiftInfo(String targetLiftName, String param) {
        JSONObject jsonObject;
        JSONArray liftsArray;
        String res = this.getDeviceDetails();
        if (res != null && (liftsArray = (jsonObject = JSON.parseObject((String)res)).getJSONArray("lifts")).size() > 0 && !liftsArray.isEmpty()) {
            for (int i = 0; i < liftsArray.size(); ++i) {
                JSONObject liftObject = liftsArray.getJSONObject(i);
                String liftName = liftObject.getString("name");
                if (!targetLiftName.equals(liftName)) continue;
                String liftParam = liftObject.getString(param);
                return liftParam;
            }
        }
        return null;
    }

    public void waitingLift(String liftName, String targetFloorArea) throws InterruptedException {
        String curFloor = this.getLiftInfo(liftName, "lift_current_area");
        String liftStatus = this.getLiftInfo(liftName, "running_status");
        while (curFloor == null || liftStatus == null) {
            curFloor = this.getLiftInfo(liftName, "lift_current_area");
            liftStatus = this.getLiftInfo(liftName, "running_status");
            Thread.sleep(3000L);
        }
        while (!curFloor.equals(targetFloorArea) && !liftStatus.equals("2")) {
            curFloor = this.getLiftInfo(liftName, "lift_current_area");
            liftStatus = this.getLiftInfo(liftName, "running_status");
            Thread.sleep(5000L);
        }
    }

    public String callLift(String liftName, String floorArea) throws IOException {
        JSONArray jsonArray = new JSONArray();
        JSONObject param = new JSONObject();
        param.put("name", (Object)liftName);
        param.put("target_area", (Object)floorArea);
        jsonArray.add((Object)param);
        return JSON.toJSONString((Object)OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.callLift.getUri()), (String)jsonArray.toJSONString()));
    }

    public boolean isBlockLiftTaskForPut(String putFloorArea, String preSiteGroup, int liftSiteCount, String liftName, String pickFloorArea) {
        List allLiftRecordListByPick = this.liftRecordMapper.findLiftRecordByOprTypeAndLiftName(Integer.valueOf(1), liftName);
        List allLiftRecordListByPut = this.liftRecordMapper.findLiftRecordByOprTypeAndLiftName(Integer.valueOf(0), liftName);
        HashMap<String, Long> siteIdCacheForPickAndPre = new HashMap<String, Long>();
        HashMap<String, Long> siteIdCacheForPut = new HashMap<String, Long>();
        if (allLiftRecordListByPick.isEmpty() && allLiftRecordListByPut.isEmpty()) {
            return true;
        }
        if (liftSiteCount == 4) {
            List liftRecordByOprTypeAndLiftNameAndIsFinshed = this.liftRecordMapper.findLiftRecordByOprTypeAndLiftNameAndIsFinshed(Integer.valueOf(0), liftName, Integer.valueOf(0));
            int runningTaskCount = 0;
            for (int i = 0; i < liftRecordByOprTypeAndLiftNameAndIsFinshed.size(); ++i) {
                LiftRecord liftRecord = (LiftRecord)allLiftRecordListByPut.get(i);
                String taskRecordId = liftRecord.getTaskRecordId();
                Integer statusByTaskRecordId = this.windTaskService.findStatusByTaskRecordId(taskRecordId);
                if (statusByTaskRecordId != 1000) continue;
                ++runningTaskCount;
            }
            if (runningTaskCount >= 2) {
                return false;
            }
        }
        if (!allLiftRecordListByPick.isEmpty()) {
            for (int i = 0; i < allLiftRecordListByPick.size(); ++i) {
                LiftRecord liftRecord = (LiftRecord)allLiftRecordListByPick.get(i);
                String preSiteId = liftRecord.getPreSiteId();
                String matchPutSiteArea = liftRecord.getPutFloorArea();
                String matchPickSiteArea = liftRecord.getPickFloorArea();
                if (matchPutSiteArea.equals(putFloorArea) || matchPickSiteArea.equals(pickFloorArea) || matchPutSiteArea.equals(pickFloorArea) || matchPickSiteArea.equals(putFloorArea) || siteIdCacheForPickAndPre.containsKey(preSiteId)) continue;
                long countByPreSiteIdAndLockedAndFilled = this.workSiteService.findCountBySiteIdAndLockedAndFilled(preSiteId, Integer.valueOf(1), Integer.valueOf(0));
                log.info("\u5b58\u5728\u672a\u89e3\u9501\u7684\u524d\u7f6e\u70b9 \u4ee3\u8868\u6709\u53d6\u8d27\u4efb\u52a1\u672a\u5b8c\u6210");
                if (countByPreSiteIdAndLockedAndFilled > 0L) {
                    return false;
                }
                siteIdCacheForPickAndPre.put(preSiteId, countByPreSiteIdAndLockedAndFilled);
            }
        }
        if (!allLiftRecordListByPut.isEmpty()) {
            for (int i = 0; i < allLiftRecordListByPut.size(); ++i) {
                LiftRecord liftRecord = (LiftRecord)allLiftRecordListByPut.get(i);
                String preSiteId = liftRecord.getPreSiteId();
                String putSiteId = liftRecord.getPutSiteId();
                if (!siteIdCacheForPickAndPre.containsKey(preSiteId)) {
                    long countByPreSiteIdAndLockedAndFilled = this.workSiteService.findCountBySiteIdAndLockedAndFilled(preSiteId, Integer.valueOf(1), Integer.valueOf(0));
                    if (countByPreSiteIdAndLockedAndFilled > 0L && !putFloorArea.equals(liftRecord.getPutFloorArea())) {
                        log.info("\u5b58\u5728\u672a\u89e3\u9501\u7684\u524d\u7f6e\u70b9 \u4e14\u653e\u8d27\u697c\u5c42\u548c\u5f53\u524d\u8f93\u5165\u7684\u653e\u8d27\u697c\u5c42\u4e0d\u540c \u4ee3\u8868\u6709\u5176\u4ed6\u697c\u5c42\u653e\u8d27\u672a\u5b8c\u6210");
                        return false;
                    }
                    if (putFloorArea.equals(liftRecord.getPutFloorArea()) && !this.isAllLockedByGroupName(preSiteGroup)) {
                        log.info("\u653e\u8d27\u697c\u5c42\u548c\u5f53\u524d\u8f93\u5165\u7684\u653e\u8d27\u697c\u5c42\u76f8\u540c \u4f46\u8be5\u697c\u5c42\u524d\u7f6e\u70b9\u90fd\u88ab\u9501\u5b9a \u4ee3\u8868\u5df2\u6709\u4e00\u4e2a\u4ee5\u4e0a\u7684\u653e\u8d27\u4efb\u52a1\u5728\u6267\u884c");
                        return false;
                    }
                    siteIdCacheForPickAndPre.put(preSiteId, countByPreSiteIdAndLockedAndFilled);
                }
                if (siteIdCacheForPut.containsKey(putSiteId)) continue;
                long countByPickSiteIdAndUnLockedAndFilled = this.workSiteService.findCountBySiteIdAndLockedAndFilled(putSiteId, Integer.valueOf(0), Integer.valueOf(1));
                if (countByPickSiteIdAndUnLockedAndFilled >= (long)liftSiteCount) {
                    log.info("\u7535\u68af\u5e93\u4f4d\u90fd\u653e\u6ee1\u4e86");
                    return false;
                }
                siteIdCacheForPut.put(preSiteId, countByPickSiteIdAndUnLockedAndFilled);
            }
        }
        return true;
    }

    public boolean isBlockLiftTaskForPick(String taskRecordId, String pickFloorArea, String preSiteGroup, String liftGroupNameForPick, int liftSiteCount, int isCrowed, String liftName) {
        List allLiftRecordListByPick = this.liftRecordMapper.findLiftRecordByOprTypeAndLiftName(Integer.valueOf(1), liftName);
        List allLiftRecordListByPut = this.liftRecordMapper.findLiftRecordByOprTypeAndLiftName(Integer.valueOf(0), liftName);
        HashMap<String, Long> siteIdCacheForPickAndPre = new HashMap<String, Long>();
        if (allLiftRecordListByPick.isEmpty() && allLiftRecordListByPut.isEmpty()) {
            return true;
        }
        if (!allLiftRecordListByPick.isEmpty()) {
            for (int i = 0; i < allLiftRecordListByPick.size(); ++i) {
                LiftRecord liftRecord = (LiftRecord)allLiftRecordListByPick.get(i);
                String preSiteId = liftRecord.getPreSiteId();
                if (siteIdCacheForPickAndPre.containsKey(preSiteId)) continue;
                long countByPreSiteIdAndLockedAndFilled = this.workSiteService.findCountBySiteIdAndLockedAndFilled(preSiteId, Integer.valueOf(1), Integer.valueOf(0));
                if (countByPreSiteIdAndLockedAndFilled > 0L && !pickFloorArea.equals(liftRecord.getPickFloorArea())) {
                    log.info("\u5b58\u5728\u5176\u4ed6\u697c\u5c42\u672a\u89e3\u9501\u7684\u524d\u7f6e\u70b9 \u4ee3\u8868\u6709\u5176\u4ed6\u697c\u5c42\u53d6\u8d27\u4efb\u52a1\u672a\u5b8c\u6210");
                    return false;
                }
                if (!this.isAllLockedByGroupName(preSiteGroup) && pickFloorArea.equals(liftRecord.getPickFloorArea())) {
                    log.info("\u5b58\u5728\u540c\u697c\u5c42\u672a\u89e3\u9501\u7684\u524d\u7f6e\u70b9 \u4e14\u8be5\u697c\u5c42\u524d\u7f6e\u70b9\u5747\u672a\u89e3\u9501 \u4ee3\u8868\u8be5\u697c\u5c42\u6709\u4e00\u4e2a\u4ee5\u4e0a\u7684\u53d6\u8d27\u4efb\u52a1\u672a\u5b8c\u6210");
                    return false;
                }
                siteIdCacheForPickAndPre.put(preSiteId, countByPreSiteIdAndLockedAndFilled);
            }
        }
        return isCrowed != 1 || this.checkCrowedSiteForPick(taskRecordId, liftName, pickFloorArea, liftGroupNameForPick, liftSiteCount);
    }

    public boolean checkCrowedSiteForPick(String taskRecordId, String liftName, String pickFloorArea, String liftGroupNameForPick, int liftSiteCount) {
        int i;
        List liftRecordByOprTypeAndPickFloorAreaAndIsInnerSite = this.getDistinctRecords(this.liftRecordMapper.findLiftRecordByOprTypeAndPickFloorAreaAndIsInnerSiteAndLiftName(Integer.valueOf(1), pickFloorArea, Integer.valueOf(0), liftName));
        WorkSiteHqlCondition workSiteHqlCondition = new WorkSiteHqlCondition();
        String[] groupList = new String[]{liftGroupNameForPick};
        workSiteHqlCondition.setGroupNames(groupList);
        workSiteHqlCondition.setLocked(Boolean.valueOf(true));
        List sitesByCondition = this.workSiteService.findSitesByCondition(workSiteHqlCondition);
        if (!liftRecordByOprTypeAndPickFloorAreaAndIsInnerSite.isEmpty() && liftSiteCount == 2 && (i = 0) < sitesByCondition.size()) {
            return false;
        }
        if (liftSiteCount == 4) {
            for (i = 0; i < sitesByCondition.size(); ++i) {
                if (liftRecordByOprTypeAndPickFloorAreaAndIsInnerSite.size() <= 1 || !((LiftRecord)liftRecordByOprTypeAndPickFloorAreaAndIsInnerSite.get(1)).getPickSiteId().equals(((WorkSite)sitesByCondition.get(i)).getSiteId()) || !((LiftRecord)liftRecordByOprTypeAndPickFloorAreaAndIsInnerSite.get(0)).getPickSiteId().equals(((WorkSite)sitesByCondition.get(i)).getSiteId())) continue;
                return this.workSiteService.findBySiteId(((WorkSite)sitesByCondition.get(i)).getSiteId()).getLockedBy().equals(taskRecordId);
            }
        }
        return true;
    }

    public boolean checkOtherCrowedSiteForPick(LiftRecord record, String liftName, String pickFloorArea, String liftGroupNameForPick, int liftSiteCount) {
        List liftRecordByOprTypeAndLiftNameAndIsFinshed = this.liftRecordMapper.findLiftRecordByOprTypeAndLiftNameAndIsFinshed(Integer.valueOf(0), liftName, Integer.valueOf(0));
        if (liftRecordByOprTypeAndLiftNameAndIsFinshed.isEmpty()) {
            return true;
        }
        if (this.judgeIsInnerSite(liftName, record, liftSiteCount, liftGroupNameForPick) == 0) {
            return true;
        }
        for (int i = 0; i < liftRecordByOprTypeAndLiftNameAndIsFinshed.size(); ++i) {
            LiftRecord liftRecord = (LiftRecord)liftRecordByOprTypeAndLiftNameAndIsFinshed.get(i);
            String taskRecordId = liftRecord.getTaskRecordId();
            if (liftRecord.getPickFloorArea().equals(pickFloorArea) || this.windTaskService.findStatusByTaskRecordId(taskRecordId) != 1003) continue;
            String pickSiteId = liftRecord.getPickSiteId();
            long countBySiteIdAndUnLockedAndFilled = this.workSiteService.findCountBySiteIdAndLockedAndFilled(pickSiteId, Integer.valueOf(0), Integer.valueOf(1));
            long countBySiteIdAndLockedAndFilled = this.workSiteService.findCountBySiteIdAndLockedAndFilled(pickSiteId, Integer.valueOf(1), Integer.valueOf(1));
            if (countBySiteIdAndUnLockedAndFilled <= 0L && countBySiteIdAndLockedAndFilled <= 0L || liftRecord.getIsInnerSite() != 0) continue;
            return false;
        }
        return true;
    }

    public boolean isAllLockedByGroupName(String groupName) {
        WorkSite byCondition = this.workSiteService.findByCondition(null, null, null, null, groupName, false, false);
        return byCondition != null;
    }

    public void addLiftRecord(String liftName, String pickFloorArea, String putFloorArea, String taskRecordId, int oprType, int crowed) {
        LiftRecord liftRecord = new LiftRecord();
        liftRecord.setLiftName(liftName);
        liftRecord.setPickFloorArea(pickFloorArea);
        liftRecord.setPutFloorArea(putFloorArea);
        liftRecord.setTaskRecordId(taskRecordId);
        liftRecord.setOprType(Integer.valueOf(oprType));
        liftRecord.setIsCrowed(Integer.valueOf(crowed));
        this.liftQueue.offer(liftRecord);
    }

    public LiftRecord waitAndGetLiftRecord(String taskRecordId, int oprType, String preSiteGroup, int liftSiteCount, String liftGroupNameForPick) throws InterruptedException {
        LiftRecord firstLiftRecord = (LiftRecord)this.liftQueue.peek();
        while (!firstLiftRecord.getTaskRecordId().equals(taskRecordId)) {
            firstLiftRecord = (LiftRecord)this.liftQueue.peek();
            Thread.sleep(5000L);
        }
        boolean isRelease = false;
        while (!isRelease) {
            isRelease = oprType == 0 ? this.isBlockLiftTaskForPut(firstLiftRecord.getPutFloorArea(), preSiteGroup, liftSiteCount, firstLiftRecord.getLiftName(), firstLiftRecord.getPickFloorArea()) : this.isBlockLiftTaskForPick(taskRecordId, firstLiftRecord.getPickFloorArea(), preSiteGroup, liftGroupNameForPick, liftSiteCount, firstLiftRecord.getIsCrowed().intValue(), firstLiftRecord.getLiftName());
            Thread.sleep(5000L);
        }
        return (LiftRecord)this.liftQueue.pop();
    }

    public LiftRecord getLiftRecord(String liftName, String pickFloorArea, String putFloorArea, String taskRecordId, int oprType, int crowed) {
        LiftRecord liftRecord = new LiftRecord();
        liftRecord.setLiftName(liftName);
        liftRecord.setPickFloorArea(pickFloorArea);
        liftRecord.setPutFloorArea(putFloorArea);
        liftRecord.setTaskRecordId(taskRecordId);
        liftRecord.setOprType(Integer.valueOf(oprType));
        liftRecord.setIsCrowed(Integer.valueOf(crowed));
        return liftRecord;
    }

    public List<String> getSiteListForPut(String pickFloorArea, String putFloorArea, String liftName, String liftGroupNameForPre, String liftGroupNameForPut, String liftGroupNameForPick) {
        1 siteIdComparator = new /* Unavailable Anonymous Inner Class!! */;
        ArrayList<String> siteListForPut = new ArrayList<String>();
        WorkSiteHqlCondition workSiteHqlConditionForPutSite = new WorkSiteHqlCondition();
        String[] putGroupList = new String[]{liftGroupNameForPut};
        workSiteHqlConditionForPutSite.setGroupNames(putGroupList);
        workSiteHqlConditionForPutSite.setFilled(Boolean.valueOf(false));
        workSiteHqlConditionForPutSite.setLocked(Boolean.valueOf(false));
        List putSiteListByCondition = this.workSiteService.findSitesByCondition(workSiteHqlConditionForPutSite);
        Collections.sort(putSiteListByCondition, siteIdComparator);
        log.info("putSiteListByCondition  " + putSiteListByCondition);
        int existPutSiteCount = this.getExistSiteCount(0, liftName, pickFloorArea, putFloorArea);
        log.info("existPutSiteCount: " + existPutSiteCount);
        if (!putSiteListByCondition.isEmpty() && putSiteListByCondition.size() > existPutSiteCount) {
            siteListForPut.add(((WorkSite)putSiteListByCondition.get(existPutSiteCount)).getSiteId());
        } else {
            siteListForPut.add(((WorkSite)putSiteListByCondition.get(0)).getSiteId());
        }
        String[] pickGroupList = new String[]{liftGroupNameForPick};
        workSiteHqlConditionForPutSite.setGroupNames(pickGroupList);
        List pickSiteListByCondition = this.workSiteService.findSitesByCondition(workSiteHqlConditionForPutSite);
        Collections.sort(pickSiteListByCondition, siteIdComparator);
        log.info("pickSiteListByCondition  " + pickSiteListByCondition);
        if (!pickSiteListByCondition.isEmpty() && pickSiteListByCondition.size() > existPutSiteCount) {
            siteListForPut.add(((WorkSite)pickSiteListByCondition.get(existPutSiteCount)).getSiteId());
        } else {
            siteListForPut.add(((WorkSite)pickSiteListByCondition.get(0)).getSiteId());
        }
        String[] preGroupList = new String[]{liftGroupNameForPre};
        workSiteHqlConditionForPutSite.setGroupNames(preGroupList);
        List preSiteListByCondition = this.workSiteService.findSitesByCondition(workSiteHqlConditionForPutSite);
        Collections.sort(preSiteListByCondition, siteIdComparator);
        if (!preSiteListByCondition.isEmpty()) {
            siteListForPut.add(((WorkSite)preSiteListByCondition.get(0)).getSiteId());
        } else {
            siteListForPut.add(null);
        }
        log.info("siteListForPut:" + siteListForPut);
        return siteListForPut;
    }

    public List<String> getSiteListForPick(String pickFloorArea, String liftName, String liftGroupNameForPre) {
        2 pickSiteIdComparator = new /* Unavailable Anonymous Inner Class!! */;
        ArrayList<String> siteListForPick = new ArrayList<String>();
        siteListForPick.add(null);
        siteListForPick.add(null);
        List liftRecordByOprTypeAndFloorAreaAndLiftName = this.getDistinctRecords(this.liftRecordMapper.findLiftRecordByOprTypeAndPickFloorAreaAndLiftName(Integer.valueOf(0), pickFloorArea, liftName));
        Collections.sort(liftRecordByOprTypeAndFloorAreaAndLiftName, pickSiteIdComparator);
        if (!liftRecordByOprTypeAndFloorAreaAndLiftName.isEmpty()) {
            for (int i = 0; i < liftRecordByOprTypeAndFloorAreaAndLiftName.size(); ++i) {
                String pickSiteId = ((LiftRecord)liftRecordByOprTypeAndFloorAreaAndLiftName.get(i)).getPickSiteId();
                String putSiteId = ((LiftRecord)liftRecordByOprTypeAndFloorAreaAndLiftName.get(i)).getPutSiteId();
                long countByPickSiteIdAndUnLockedAndFilled = this.workSiteService.findCountBySiteIdAndLockedAndFilled(pickSiteId, Integer.valueOf(0), Integer.valueOf(1));
                if (countByPickSiteIdAndUnLockedAndFilled <= 0L) continue;
                siteListForPick.set(0, putSiteId);
                siteListForPick.set(1, pickSiteId);
                break;
            }
        }
        String[] preGroupList = new String[]{liftGroupNameForPre};
        WorkSiteHqlCondition workSiteHqlConditionForPutSite = new WorkSiteHqlCondition();
        workSiteHqlConditionForPutSite.setGroupNames(preGroupList);
        workSiteHqlConditionForPutSite.setFilled(Boolean.valueOf(false));
        workSiteHqlConditionForPutSite.setLocked(Boolean.valueOf(false));
        List preSiteListByCondition = this.workSiteService.findSitesByCondition(workSiteHqlConditionForPutSite);
        if (!preSiteListByCondition.isEmpty()) {
            siteListForPick.add(((WorkSite)preSiteListByCondition.get(0)).getSiteId());
        } else {
            siteListForPick.add(null);
        }
        return siteListForPick;
    }

    public int getExistSiteCount(int oprType, String liftName, String pickFloorArea, String putFloorArea) {
        int putSiteCount = 0;
        List allLiftRecordListByPut = this.liftRecordMapper.findLiftRecordByOprTypeAndLiftNameAndIsFinshed(Integer.valueOf(oprType), liftName, Integer.valueOf(0));
        HashMap<String, Long> siteIdCacheForPut = new HashMap<String, Long>();
        if (allLiftRecordListByPut.isEmpty()) {
            return putSiteCount;
        }
        for (int i = 0; i < allLiftRecordListByPut.size(); ++i) {
            String putSiteId;
            List bySiteId;
            LiftRecord liftRecord = (LiftRecord)allLiftRecordListByPut.get(i);
            String taskRecordId = liftRecord.getTaskRecordId();
            Integer statusByTaskRecordId = this.windTaskService.findStatusByTaskRecordId(taskRecordId);
            if (statusByTaskRecordId != 1003 || ((WorkSite)(bySiteId = this.workSiteMapper.findBySiteId(putSiteId = liftRecord.getPutSiteId())).get(0)).getArea().equals(pickFloorArea) || ((WorkSite)bySiteId.get(0)).getArea().equals(putFloorArea) || siteIdCacheForPut.containsKey(putSiteId)) continue;
            long countByPreSiteIdAndLockedAndFilled = this.workSiteService.findCountBySiteIdAndLockedAndFilled(putSiteId, Integer.valueOf(0), Integer.valueOf(1));
            if (countByPreSiteIdAndLockedAndFilled > 0L) {
                ++putSiteCount;
                siteIdCacheForPut.put(putSiteId, countByPreSiteIdAndLockedAndFilled);
                continue;
            }
            countByPreSiteIdAndLockedAndFilled = this.workSiteService.findCountBySiteIdAndLockedAndFilled(putSiteId, Integer.valueOf(1), Integer.valueOf(0));
            if (countByPreSiteIdAndLockedAndFilled <= 0L) continue;
            ++putSiteCount;
            siteIdCacheForPut.put(putSiteId, countByPreSiteIdAndLockedAndFilled);
        }
        return putSiteCount;
    }

    public LiftRecord insertLiftRecord(List<String> siteList, LiftRecord liftRecord, int liftCount, String liftGroupNameForPut) {
        liftRecord.setPutSiteId(siteList.get(0));
        liftRecord.setPickSiteId(siteList.get(1));
        liftRecord.setPreSiteId(siteList.get(2));
        liftRecord.setIsInnerSite(Integer.valueOf(this.judgeIsInnerSite(liftRecord.getLiftName(), liftRecord, liftCount, liftGroupNameForPut)));
        liftRecord.setCreateTime(new Date());
        liftRecord.setIsFinshed(Integer.valueOf(0));
        this.liftRecordMapper.save((Object)liftRecord);
        return liftRecord;
    }

    public int judgeIsInnerSite(String liftName, LiftRecord liftRecord, int liftCount, String liftGroupNameForPut) {
        List targetPutLiftRecord;
        int isInner = 0;
        3 siteIdComparator = new /* Unavailable Anonymous Inner Class!! */;
        WorkSiteHqlCondition workSiteHqlConditionForPutSite = new WorkSiteHqlCondition();
        String[] putGroupList = new String[]{liftGroupNameForPut};
        workSiteHqlConditionForPutSite.setGroupNames(putGroupList);
        List sitesByCondition = this.workSiteService.findSitesByCondition(workSiteHqlConditionForPutSite);
        ArrayList<String> innerSiteList = new ArrayList<String>();
        Collections.sort(sitesByCondition, siteIdComparator);
        innerSiteList.add(((WorkSite)sitesByCondition.get(0)).getSiteId());
        innerSiteList.add(((WorkSite)sitesByCondition.get(1)).getSiteId());
        if (liftRecord.getIsCrowed() == 1 && liftRecord.getOprType() == 1 && !(targetPutLiftRecord = this.getDistinctRecords(this.liftRecordMapper.findDistinctLiftRecordsByLiftNameAndPickFloorAreaAndPutFloorAreaAndPickSiteIdAndPutSiteIdAndOprType(liftRecord.getLiftName(), liftRecord.getPickFloorArea(), liftRecord.getPutFloorArea(), liftRecord.getPickSiteId(), liftRecord.getPutSiteId(), 0))).isEmpty()) {
            return ((LiftRecord)targetPutLiftRecord.get(0)).getIsInnerSite();
        }
        if (liftRecord.getIsCrowed() == 1 && liftRecord.getOprType() == 0) {
            if (liftCount == 2 && liftRecord.getPutSiteId().equals(innerSiteList.get(0))) {
                isInner = 1;
            }
            if (liftCount == 4 && innerSiteList.contains(liftRecord.getPutSiteId())) {
                isInner = 1;
            }
        }
        return isInner;
    }

    public void waitForSiteFinshedInInner(String liftGroupNameForPick, String taskRecordId) throws InterruptedException {
        WorkSiteHqlCondition workSiteHqlConditionForInnerByLock = new WorkSiteHqlCondition();
        String[] putGroupList = new String[]{liftGroupNameForPick};
        workSiteHqlConditionForInnerByLock.setGroupNames(putGroupList);
        workSiteHqlConditionForInnerByLock.setLocked(Boolean.valueOf(true));
        List pickSiteListBylock = this.workSiteService.findSitesByCondition(workSiteHqlConditionForInnerByLock);
        WorkSiteHqlCondition workSiteHqlConditionForInnerByFilled = new WorkSiteHqlCondition();
        workSiteHqlConditionForInnerByFilled.setFilled(Boolean.valueOf(false));
        workSiteHqlConditionForInnerByFilled.setGroupNames(putGroupList);
        List preSiteListByfilled = this.workSiteService.findSitesByCondition(workSiteHqlConditionForInnerByFilled);
        while (pickSiteListBylock.size() == 1 && preSiteListByfilled.size() == 3) {
            System.out.println(taskRecordId);
            preSiteListByfilled = this.workSiteService.findSitesByCondition(workSiteHqlConditionForInnerByFilled);
            pickSiteListBylock = this.workSiteService.findSitesByCondition(workSiteHqlConditionForInnerByLock);
            Thread.sleep(5000L);
        }
    }

    public List<LiftRecord> getDistinctRecords(List<LiftRecord> records) {
        HashSet seen = new HashSet();
        List<LiftRecord> distinctRecords = records.stream().filter(r -> seen.add(r.getPickSiteId())).collect(Collectors.toList());
        return distinctRecords;
    }
}

