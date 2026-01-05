/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.hutool.core.collection.ConcurrentHashSet
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.exception.ServiceException
 *  com.seer.rds.listener.EventSource
 *  com.seer.rds.listener.WindEvent
 *  com.seer.rds.model.replay.SceneRecord
 *  com.seer.rds.runnable.RobotsStatusRunnable
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.replay.SceneService
 *  com.seer.rds.util.DateUtil
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.websocket.RdsServer
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.io.FileUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.runnable;

import cn.hutool.core.collection.ConcurrentHashSet;
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.exception.ServiceException;
import com.seer.rds.listener.EventSource;
import com.seer.rds.listener.WindEvent;
import com.seer.rds.model.replay.SceneRecord;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.service.replay.SceneService;
import com.seer.rds.util.DateUtil;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.websocket.RdsServer;
import java.io.File;
import java.io.IOException;
import java.net.ConnectException;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class RobotsStatusRunnable
implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(RobotsStatusRunnable.class);
    private static final long sleepTime = 400L;
    private static boolean isUpdateSite = false;
    private String coreBaseUrl;
    public static Map<String, List<String>> points = new ConcurrentHashMap();
    public static Set<String> group = new ConcurrentHashSet();
    public static Set<String> label = new ConcurrentHashSet();
    public static Set<String> robotId = new ConcurrentHashSet();
    public static Set<String> binTask = new ConcurrentHashSet();

    public RobotsStatusRunnable(String coreBaseUrl) {
        this.coreBaseUrl = coreBaseUrl;
    }

    @Override
    public void run() {
        long retry = 0L;
        block12: while (true) {
            try {
                while (true) {
                    String res;
                    if ((res = OkHttpUtil.get((String)(this.coreBaseUrl + ApiEnum.robotsStatus.getUri()))) != null && JSONObject.parseObject((String)res).getString("scene_md5") == null) {
                        log.error("agv robots status={}", (Object)res);
                        throw new Exception("scene_md5 is missing.");
                    }
                    if (StringUtils.isNotBlank((CharSequence)res)) {
                        Object cache = GlobalCacheConfig.getCache((String)"robotsStatus");
                        AgvApiService agvApiService = (AgvApiService)SpringUtil.getBean(AgvApiService.class);
                        if (!isUpdateSite) {
                            agvApiService.download(ApiEnum.downloadScene.getUri(), null);
                            this.getSiteFromScene();
                            if (PropConfig.ifEnableReplay().booleanValue()) {
                                this.cpScene2ReplayFile(JSONObject.parseObject((String)res).getString("scene_md5"), new Date());
                            }
                            isUpdateSite = true;
                        }
                        if (cache != null && JSONObject.parseObject((String)cache.toString()).getString("scene_md5") != null) {
                            JSONObject cacheRobotStatus = JSONObject.parseObject((String)cache.toString());
                            String cache_scene_md5 = cacheRobotStatus.getString("scene_md5");
                            JSONObject newRobotStatus = JSONObject.parseObject((String)res);
                            String new_scene_md5 = newRobotStatus.getString("scene_md5");
                            if (StringUtils.isEmpty((CharSequence)new_scene_md5)) {
                                log.error("scene_md5 is null");
                                try {
                                    Thread.sleep(2000L);
                                    continue block12;
                                }
                                catch (InterruptedException ie) {
                                    Thread.currentThread().interrupt();
                                    log.error("sleep error");
                                    continue;
                                }
                            }
                            if (!cache_scene_md5.equals(new_scene_md5)) {
                                agvApiService.download(ApiEnum.downloadScene.getUri(), null);
                                this.getSiteFromScene();
                                ResultVo success = ResultVo.success((CommonCodeEnum)CommonCodeEnum.WS_MSG_SCENE_CHANGE, null);
                                RdsServer websocketServer = (RdsServer)SpringUtil.getBean(RdsServer.class);
                                websocketServer.sendMessage(JSON.toJSONString((Object)success));
                                if (PropConfig.ifEnableReplay().booleanValue()) {
                                    this.cpScene2ReplayFile(new_scene_md5, new Date());
                                }
                            }
                            JSONArray cacheErrors = cacheRobotStatus.getJSONArray("errors");
                            JSONArray newErrors = newRobotStatus.getJSONArray("errors");
                            EventSource eventSource = (EventSource)SpringUtil.getBean(EventSource.class);
                            if (cacheErrors != null && !cacheErrors.toJSONString().equals(newErrors.toJSONString()) || cacheErrors == null && newErrors != null) {
                                WindEvent event = new WindEvent();
                                event.setType(Integer.valueOf(4));
                                event.setData((Object)newErrors);
                                eventSource.notify(event);
                            }
                            JSONArray cacheReportArray = cacheRobotStatus.getJSONArray("report");
                            JSONArray newReportArray = newRobotStatus.getJSONArray("report");
                            for (int i = 0; i < cacheReportArray.size(); ++i) {
                                JSONObject reportJson = cacheReportArray.getJSONObject(i);
                                String vehicleId = reportJson.getString("vehicle_id");
                                Boolean dispatchable = reportJson.getBoolean("dispatchable");
                                for (int j = 0; j < newReportArray.size(); ++j) {
                                    JSONObject newReportJson = newReportArray.getJSONObject(j);
                                    String _vehicleId = newReportJson.getString("vehicle_id");
                                    Boolean _dispatchable = newReportJson.getBoolean("dispatchable");
                                    if (!StringUtils.isNotEmpty((CharSequence)vehicleId) || !StringUtils.isNotEmpty((CharSequence)_vehicleId) || !vehicleId.equals(_vehicleId) || Objects.equals(dispatchable, _dispatchable)) continue;
                                    WindEvent event = new WindEvent();
                                    event.setType(Integer.valueOf(5));
                                    event.setAgvId(vehicleId);
                                    event.setData((Object)_dispatchable);
                                    eventSource.notify(event);
                                }
                            }
                        }
                        GlobalCacheConfig.cache((String)"robotsStatus", (Object)res);
                    }
                    long queryInterval = PropConfig.getRdsCoreQueryInterval();
                    Thread.sleep(queryInterval);
                }
            }
            catch (ServiceException e) {
                log.error("RobotsStatusRunnable mapError:{}", (Object)e.getMsg());
                try {
                    Thread.sleep(10000L);
                }
                catch (InterruptedException ex) {
                    log.error("sleep error");
                }
                continue;
            }
            catch (ConnectException e) {
                GlobalCacheConfig.clearCache((String)"robotsStatus");
                log.error("RobotsStatusRunnable error,connection refused,", (Throwable)e);
                try {
                    Thread.sleep(10000L);
                }
                catch (InterruptedException ex) {
                    log.error("sleep error");
                }
                continue;
            }
            catch (Exception e) {
                GlobalCacheConfig.clearCache((String)"robotsStatus");
                log.error("RobotsStatusRunnable error", (Throwable)e);
                try {
                    Thread.sleep(10000L);
                    continue;
                }
                catch (InterruptedException ex) {
                    log.error("sleep error");
                    continue;
                }
            }
            break;
        }
    }

    private void getSiteFromScene() {
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        String sceneDir = propConfig.getSceneDir();
        List sitesFromScene = WorkSiteService.getSitesFromScene((String)(sceneDir + "rds.scene"));
        log.info("sitesFromScene={}", (Object)sitesFromScene);
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        int result = siteService.saveOrUpdateSceneSite(sitesFromScene);
        if (result == -1) {
            throw new ServiceException("Duplicate siteId exist in the map.");
        }
    }

    private void cpScene2ReplayFile(String sceneMd5, Date date) {
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        String sceneDir = propConfig.getSceneDir();
        String replayScenesDir = propConfig.getReplayScenesDir();
        String yyyyMMdd = DateUtil.fmtDate2String((Date)date, (String)"yyyy-MM-dd_HH-mm-ss");
        SceneService sceneService = (SceneService)SpringUtil.getBean(SceneService.class);
        List md5s = sceneService.findMd5OrderByIdDesc();
        if (CollectionUtils.isNotEmpty((Collection)md5s) && StringUtils.equals((CharSequence)sceneMd5, (CharSequence)((CharSequence)md5s.get(0)))) {
            return;
        }
        SceneRecord record = sceneService.save(new SceneRecord(sceneMd5, date));
        try {
            log.info("copy scene to replay file.");
            FileUtils.copyFile((File)new File(sceneDir + "rds.scene"), (File)new File(replayScenesDir + yyyyMMdd + ".scene"));
        }
        catch (IOException e) {
            sceneService.deleteById(record.getId());
            log.error("copy scene to replay file error : " + e);
        }
    }
}

