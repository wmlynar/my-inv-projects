/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.alibaba.fastjson.serializer.SerializerFeature
 *  com.fasterxml.jackson.core.JsonProcessingException
 *  com.fasterxml.jackson.databind.ObjectMapper
 *  com.google.common.collect.Lists
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.config.OpcUaConfig
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.config.configview.RoboView
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.DemandStatusEnum
 *  com.seer.rds.constant.MediaTypeEnum
 *  com.seer.rds.constant.OpcTypeEnum
 *  com.seer.rds.constant.SiteOperationEnum
 *  com.seer.rds.constant.SiteStatusEnum
 *  com.seer.rds.constant.TaskStatusEnum
 *  com.seer.rds.constant.UpdateSiteScopeEnum
 *  com.seer.rds.dao.WindBlockRecordMapper
 *  com.seer.rds.dao.WindTaskDefMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.email.EmailUtil
 *  com.seer.rds.modbus.Modbus4jUtils
 *  com.seer.rds.model.modbus.ModbusInstance
 *  com.seer.rds.model.wind.BaseRecord
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.model.wind.WindDataCacheSplit
 *  com.seer.rds.model.wind.WindDemandTask
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.roboview.RoboViewServer
 *  com.seer.rds.roboview.vo.StorageVo
 *  com.seer.rds.runnable.RobotsStatusRunnable
 *  com.seer.rds.script.JavaBridge
 *  com.seer.rds.script.ScriptLock
 *  com.seer.rds.script.ScriptService
 *  com.seer.rds.service.admin.UserMessageService
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.agv.WindThirdOrderService
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.service.operator.OperatorService
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.commonBp.CacheDataBp
 *  com.seer.rds.tcp.NettyTcpClient
 *  com.seer.rds.util.DateUtil
 *  com.seer.rds.util.MD5Utils
 *  com.seer.rds.util.MessageConversionUtils
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.util.WokSiteLogUtil
 *  com.seer.rds.util.YmlConfigUtil
 *  com.seer.rds.util.melsec.MelsecUtils
 *  com.seer.rds.util.mqttclient.MqttUtil
 *  com.seer.rds.util.omron.fins.FinsUtil
 *  com.seer.rds.util.omron.fins.core.Bit
 *  com.seer.rds.util.opc.OpcUaOperationUtil
 *  com.seer.rds.util.siemens.S7Util
 *  com.seer.rds.vo.AttrVo
 *  com.seer.rds.vo.DistributeVo
 *  com.seer.rds.vo.RequestHeaderDO
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.ScriptApi
 *  com.seer.rds.vo.ScriptButton
 *  com.seer.rds.vo.ScriptTaskRecord
 *  com.seer.rds.vo.StopAllTaskReq$StopTask
 *  com.seer.rds.vo.TaskLogVo
 *  com.seer.rds.vo.WorkSiteAttrDataUpdateVo
 *  com.seer.rds.vo.WorkSiteHqlCondition
 *  com.seer.rds.vo.WorkSiteVo
 *  com.seer.rds.vo.req.ChargeAGVReq
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.req.QueryTaskRecordReq
 *  com.seer.rds.vo.req.ScriptRunReq
 *  com.seer.rds.vo.req.SetOrderReq
 *  com.seer.rds.vo.req.WindTaskPriorityReq
 *  com.seer.rds.vo.response.AlarmsDetailVo
 *  com.seer.rds.vo.response.AlarmsVo
 *  com.seer.rds.vo.response.ChargeAgvVo
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.vo.response.RobotInfoVo
 *  com.seer.rds.vo.response.WindTaskRecordVo
 *  com.seer.rds.vo.wind.ParamPreField
 *  com.seer.rds.vo.wind.TaskField
 *  com.seer.rds.web.config.ConfigFileController
 *  com.seer.rds.websocket.PDAMsgSender
 *  com.seer.rds.websocket.ScriptMsgSender
 *  com.seer.rds.websocket.ScriptMsgSender$ScriptLog
 *  com.seer.rds.websocket.WebSocketServer
 *  javax.websocket.Session
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.compress.utils.Lists
 *  org.apache.commons.io.FileUtils
 *  org.apache.commons.io.FilenameUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.commons.lang3.time.DateFormatUtils
 *  org.graalvm.polyglot.HostAccess$Export
 *  org.mvel2.MVEL
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.i18n.LocaleContextHolder
 *  org.springframework.jdbc.core.JdbcTemplate
 *  org.springframework.mail.SimpleMailMessage
 */
package com.seer.rds.script;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.alibaba.fastjson.serializer.SerializerFeature;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.Maps;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.config.OpcUaConfig;
import com.seer.rds.config.PropConfig;
import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.config.configview.RoboView;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.DemandStatusEnum;
import com.seer.rds.constant.MediaTypeEnum;
import com.seer.rds.constant.OpcTypeEnum;
import com.seer.rds.constant.SiteOperationEnum;
import com.seer.rds.constant.SiteStatusEnum;
import com.seer.rds.constant.TaskStatusEnum;
import com.seer.rds.constant.UpdateSiteScopeEnum;
import com.seer.rds.dao.WindBlockRecordMapper;
import com.seer.rds.dao.WindTaskDefMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.email.EmailUtil;
import com.seer.rds.modbus.Modbus4jUtils;
import com.seer.rds.model.modbus.ModbusInstance;
import com.seer.rds.model.wind.BaseRecord;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.model.wind.WindDataCacheSplit;
import com.seer.rds.model.wind.WindDemandTask;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.roboview.RoboViewServer;
import com.seer.rds.roboview.vo.StorageVo;
import com.seer.rds.runnable.RobotsStatusRunnable;
import com.seer.rds.script.ScriptLock;
import com.seer.rds.script.ScriptService;
import com.seer.rds.service.admin.UserMessageService;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.agv.WindThirdOrderService;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.service.operator.OperatorService;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.commonBp.CacheDataBp;
import com.seer.rds.tcp.NettyTcpClient;
import com.seer.rds.util.DateUtil;
import com.seer.rds.util.MD5Utils;
import com.seer.rds.util.MessageConversionUtils;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.util.WokSiteLogUtil;
import com.seer.rds.util.YmlConfigUtil;
import com.seer.rds.util.melsec.MelsecUtils;
import com.seer.rds.util.mqttclient.MqttUtil;
import com.seer.rds.util.omron.fins.FinsUtil;
import com.seer.rds.util.omron.fins.core.Bit;
import com.seer.rds.util.opc.OpcUaOperationUtil;
import com.seer.rds.util.siemens.S7Util;
import com.seer.rds.vo.AttrVo;
import com.seer.rds.vo.DistributeVo;
import com.seer.rds.vo.RequestHeaderDO;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.ScriptApi;
import com.seer.rds.vo.ScriptButton;
import com.seer.rds.vo.ScriptTaskRecord;
import com.seer.rds.vo.StopAllTaskReq;
import com.seer.rds.vo.TaskLogVo;
import com.seer.rds.vo.WorkSiteAttrDataUpdateVo;
import com.seer.rds.vo.WorkSiteHqlCondition;
import com.seer.rds.vo.WorkSiteVo;
import com.seer.rds.vo.req.ChargeAGVReq;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.req.QueryTaskRecordReq;
import com.seer.rds.vo.req.ScriptRunReq;
import com.seer.rds.vo.req.SetOrderReq;
import com.seer.rds.vo.req.WindTaskPriorityReq;
import com.seer.rds.vo.response.AlarmsDetailVo;
import com.seer.rds.vo.response.AlarmsVo;
import com.seer.rds.vo.response.ChargeAgvVo;
import com.seer.rds.vo.response.PaginationResponseVo;
import com.seer.rds.vo.response.RobotInfoVo;
import com.seer.rds.vo.response.WindTaskRecordVo;
import com.seer.rds.vo.wind.ParamPreField;
import com.seer.rds.vo.wind.TaskField;
import com.seer.rds.web.config.ConfigFileController;
import com.seer.rds.websocket.PDAMsgSender;
import com.seer.rds.websocket.ScriptMsgSender;
import com.seer.rds.websocket.WebSocketServer;
import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Calendar;
import java.util.Collection;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;
import javax.websocket.Session;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.compress.utils.Lists;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.time.DateFormatUtils;
import org.graalvm.polyglot.HostAccess;
import org.mvel2.MVEL;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;

/*
 * Exception performing whole class analysis ignored.
 */
public class JavaBridge {
    private static final Logger log = LoggerFactory.getLogger(JavaBridge.class);
    private static final int maxRetry = 1000;
    private static final int retrySleep = 1000;
    private static final int modbusDataType = 2;
    private static final int maxCount = 120;
    public static int lastMinute = -1;
    public static int lastCount = 0;
    public static boolean sendScriptLog = true;
    private static final ConcurrentHashMap<String, ReentrantLock> lockMap = new ConcurrentHashMap();
    private static Object lock = new Object();

    @HostAccess.Export
    public void abortTasks(String req) {
        log.info("abort tasks");
        List taskJsons = (List)JSONObject.parseObject((String)req, List.class);
        ArrayList tasks = com.google.common.collect.Lists.newArrayList();
        for (JSONObject o : taskJsons) {
            tasks.add(new StopAllTaskReq.StopTask(o.get((Object)"taskId").toString(), o.get((Object)"taskRecordId").toString()));
        }
        if (tasks.size() > 0) {
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.stopAllTask((List)tasks);
        }
    }

    @Deprecated
    @HostAccess.Export
    public String newThreadToSetOrder(String param) {
        try {
            log.info("newThreadToSetOrder param = {}", (Object)param);
            AgvApiService agvApiService = (AgvApiService)SpringUtil.getBean(AgvApiService.class);
            SetOrderReq req = (SetOrderReq)JSONObject.parseObject((String)param, SetOrderReq.class);
            ResultVo resultVo = agvApiService.asyncSetOrder(req);
            return resultVo.toString();
        }
        catch (Exception e) {
            ResultVo resultVo = new ResultVo();
            resultVo.setMsg("" + e);
            resultVo.setCode(Integer.valueOf(-1));
            log.error("newThreadToSetOrder error {}", (Object)e.getMessage());
            return resultVo.toString();
        }
    }

    @Deprecated
    @HostAccess.Export
    public String setOrder(String taskParam) {
        try {
            log.info("setOrder param = {}", (Object)taskParam);
            AgvApiService agvApiService = (AgvApiService)SpringUtil.getBean(AgvApiService.class);
            SetOrderReq req = (SetOrderReq)JSONObject.parseObject((String)taskParam, SetOrderReq.class);
            ResultVo resultVo = agvApiService.setOrder(req);
            return resultVo.toString();
        }
        catch (Exception e) {
            ResultVo resultVo = new ResultVo();
            resultVo.setMsg("" + e);
            resultVo.setCode(Integer.valueOf(-1));
            log.error("setOrder error {}", (Object)e.getMessage());
            return resultVo.toString();
        }
    }

    @Deprecated
    @HostAccess.Export
    public boolean receiveOrder(String orderParam) {
        try {
            WindThirdOrderService orderService = (WindThirdOrderService)SpringUtil.getBean(WindThirdOrderService.class);
            orderService.saveOrder(orderParam);
            return true;
        }
        catch (Exception e) {
            log.error("receiveOrder error {}", (Object)e.getMessage());
            return false;
        }
    }

    @HostAccess.Export
    public void saveTaskLog(String logParam) {
        try {
            TaskLogVo taskLogVo = (TaskLogVo)JSONObject.parseObject((String)logParam, TaskLogVo.class);
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.saveLog(taskLogVo.getLevel(), taskLogVo.getMessage(), taskLogVo.getProjectId(), taskLogVo.getTaskId(), taskLogVo.getTaskRecordId(), taskLogVo.getBlockId());
        }
        catch (Exception e) {
            log.error("saveTaskLog error {}", (Object)e.getMessage());
        }
    }

    @Deprecated
    @HostAccess.Export
    public String getExtParam(String key, boolean retry) {
        String extParam = "";
        if (retry) {
            int times = 0;
            block4: while (true) {
                try {
                    while (true) {
                        extParam = (String)CacheDataBp.cacheMap.get(key);
                        if (++times == 1 || times % 10 == 0) {
                            log.info("getExtParam result={}", (Object)extParam);
                        }
                        if (extParam != null && !"".equals(extParam)) {
                            return extParam;
                        }
                        try {
                            Thread.sleep(1000L);
                            continue block4;
                        }
                        catch (InterruptedException interruptedException) {
                            continue;
                        }
                        break;
                    }
                }
                catch (Exception e) {
                    log.error("getExtParam error,try again,will be stoped after " + (1000 - times) + "\n" + e);
                    continue;
                }
                break;
            }
        }
        extParam = (String)CacheDataBp.cacheMap.get(key);
        return extParam;
    }

    @Deprecated
    @HostAccess.Export
    public void putExtParam(String key, String value) {
        try {
            CacheDataBp.cacheMap.put(key, value);
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache(key, value);
        }
        catch (Exception e) {
            log.error("putExtParam error {}", (Object)e.getMessage());
        }
    }

    @Deprecated
    @HostAccess.Export
    public void clearExtParam(String key) {
        try {
            CacheDataBp.cacheMap.remove(key);
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            int removed = windService.removeDataCache(key);
            log.info("clearExtParam count: {}", (Object)removed);
        }
        catch (Exception e) {
            log.error("clearExtParam error {}", (Object)e.getMessage());
        }
    }

    @Deprecated
    @HostAccess.Export
    public String getCacheDataBpCache() {
        return JSONObject.toJSONString((Object)CacheDataBp.cacheMap);
    }

    @Deprecated
    @HostAccess.Export
    public boolean checkAreaSiteIsFull(String[] area) {
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        List sites = siteService.getSitesBySiteIdOrderBySiteIdAsc(Arrays.asList(area));
        if (CollectionUtils.isEmpty((Collection)sites)) {
            return false;
        }
        for (WorkSite site : sites) {
            if (site.getFilled() == null || site.getFilled().intValue() != SiteStatusEnum.unfilled.getStatus()) continue;
            return false;
        }
        return true;
    }

    @Deprecated
    @HostAccess.Export
    public boolean checkGroupSiteIsFull(String[] groupName) {
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        for (String group : groupName) {
            List sites = siteService.getSiteListByGroup(group);
            if (CollectionUtils.isEmpty((Collection)sites)) {
                return false;
            }
            for (WorkSite site : sites) {
                if (site.getDisabled() != null && site.getDisabled().intValue() == SiteStatusEnum.disabled.getStatus() || site.getSyncFailed() != null && site.getSyncFailed().intValue() == SiteStatusEnum.syncFailed.getStatus()) {
                    log.error("site is disabled or syn failed");
                    return false;
                }
                if (site.getFilled() != null && site.getFilled().intValue() != SiteStatusEnum.unfilled.getStatus()) continue;
                return false;
            }
        }
        return true;
    }

    @Deprecated
    @HostAccess.Export
    public String chooseAndUpdateIdleSite(String[] siteIdLike) {
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        try {
            List sites = siteService.getSitesBySiteIdOrderBySiteIdAsc(Arrays.asList(siteIdLike));
            log.info("chooseAndUpdateIdleSite,sites={}", (Object)sites);
            if (CollectionUtils.isNotEmpty((Collection)sites)) {
                for (WorkSite site : sites) {
                    boolean state = siteService.checkAvailableAndUnfilledSite(site);
                    if (!state) continue;
                    site.setFilled(Integer.valueOf(SiteStatusEnum.filled.getStatus()));
                    siteService.updateSite(site);
                    return JSONObject.toJSONString((Object)site);
                }
            }
        }
        catch (Exception e) {
            log.error("chooseAndUpdateIdleSite error {}", (Object)e.getMessage());
            return null;
        }
        return null;
    }

    @Deprecated
    @HostAccess.Export
    public String chooseIdleSite(String likeSiteId, boolean retry) {
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        if (retry) {
            while (true) {
                String siteId = this.chooseIdleSite(likeSiteId);
                log.info("chooseIdleSite,site={}", (Object)siteId);
                if (siteId != null) {
                    return siteId;
                }
                try {
                    Thread.sleep(1000L);
                }
                catch (InterruptedException interruptedException) {}
            }
        }
        String siteId = this.chooseIdleSite(likeSiteId);
        log.info("chooseIdleSite,site={}", (Object)siteId);
        return siteId;
    }

    @Deprecated
    private String chooseIdleSite(String likeSiteId) {
        try {
            WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
            List sites = siteService.getSiteByLikeSiteIdAsc(likeSiteId);
            if (CollectionUtils.isNotEmpty((Collection)sites)) {
                for (WorkSite site : sites) {
                    boolean state = siteService.checkAvailableAndUnfilledSite(site);
                    if (!state) continue;
                    log.info("chooseIdleSite,site={}", (Object)site.getSiteId());
                    return site.getSiteId();
                }
            }
            return null;
        }
        catch (Exception e) {
            log.error("chooseIdleSite error {}", (Object)e.getMessage());
            return null;
        }
    }

    @Deprecated
    @HostAccess.Export
    public String getAreaFilledSite(String[] area, Integer filledStatus) {
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        List sites = siteService.getSiteByGroupNameOrderBySiteIdDesc(Arrays.asList(area));
        if (CollectionUtils.isEmpty((Collection)sites)) {
            return null;
        }
        List collect = sites.stream().filter(s -> s.getFilled().intValue() == filledStatus.intValue()).map(s -> s).collect(Collectors.toList());
        return JSONObject.toJSONString(collect);
    }

    @Deprecated
    @HostAccess.Export
    public String getGroupSiteByStatus(String[] groupNames, Integer filledStatus, Integer lockStatus) {
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        List sites = siteService.getGroupSiteByStatus(Arrays.asList(groupNames), filledStatus, lockStatus);
        if (CollectionUtils.isEmpty((Collection)sites)) {
            return null;
        }
        return JSONObject.toJSONString((Object)sites);
    }

    @Deprecated
    @HostAccess.Export
    public String getSiteById(String siteId) {
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        WorkSite site = siteService.getWorkSite(siteId);
        return JSONObject.toJSONString((Object)site);
    }

    @Deprecated
    @HostAccess.Export
    public String getSiteByLikeSiteIdAsc(String siteIdLike) {
        WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        while (true) {
            List sites = workSiteService.getSiteByLikeSiteIdAsc(siteIdLike);
            log.info("getSiteByLikeSiteIdAsc sites.size={}", (Object)sites.size());
            if (CollectionUtils.isNotEmpty((Collection)sites)) {
                for (WorkSite site : sites) {
                    if (site.getDisabled() != null && site.getDisabled().intValue() != SiteStatusEnum.undisabled.getStatus() || site.getSyncFailed() != null && site.getSyncFailed().intValue() != SiteStatusEnum.synnofailed.getStatus() || site.getLocked() != null && site.getLocked().intValue() != SiteStatusEnum.unlock.getStatus()) continue;
                    log.error("site is disabled or syn failed");
                    return site.getSiteId();
                }
            }
            try {
                Thread.sleep(1000L);
            }
            catch (InterruptedException interruptedException) {
            }
        }
    }

    @Deprecated
    @HostAccess.Export
    public String getSitesByTagsAndContents(List<String> tags, List<String> contents) {
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        List sites = siteService.getSitesByTagsAndContents(tags, contents);
        if (sites.isEmpty()) {
            return null;
        }
        return JSONObject.toJSONString((Object)sites);
    }

    @Deprecated
    @HostAccess.Export
    public String getSiteListByArea(String area) {
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        List sites = siteService.getSiteByGroupNameOrderBySiteIdDesc(Arrays.asList(area));
        return JSONObject.toJSONString((Object)sites);
    }

    @Deprecated
    @HostAccess.Export
    public String getSiteListByGroup(String group) {
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        List sites = siteService.getSiteListByGroup(group);
        return JSONObject.toJSONString((Object)sites);
    }

    @Deprecated
    @HostAccess.Export
    public String getSiteListByTags(String[] tags, Integer filledStatus) {
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        List sites = siteService.getSiteByTags(Arrays.asList(tags));
        List collect = sites.stream().filter(s -> s.getFilled().intValue() == filledStatus.intValue()).collect(Collectors.toList());
        if (CollectionUtils.isEmpty(collect)) {
            return null;
        }
        return JSONObject.toJSONString(collect);
    }

    @Deprecated
    @HostAccess.Export
    public String getSiteByCondition(String siteId, String content, Integer filled, Integer type, String groupName, Boolean doLock, Long retryPeriod, String lockedBy, Boolean orderDesc) {
        boolean retryTimes = false;
        WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        WindService windService = (WindService)SpringUtil.getBean(WindService.class);
        String selectedSiteId = "";
        try {
            WorkSite site = workSiteService.findByCondition(siteId, content, filled, type, groupName, false, orderDesc.booleanValue());
            if (site != null) {
                if (site.getDisabled() != null && site.getDisabled().intValue() == SiteStatusEnum.disabled.getStatus() || site.getSyncFailed() != null && site.getSyncFailed().intValue() == SiteStatusEnum.syncFailed.getStatus()) {
                    log.error("site is disabled or syn failed");
                    return null;
                }
                if (doLock != null && doLock.booleanValue()) {
                    if (StringUtils.isEmpty((CharSequence)site.getLockedBy()) || site.getLockedBy().equals(lockedBy)) {
                        site.setLocked(Integer.valueOf(SiteStatusEnum.lock.getStatus()));
                        site.setLockedBy(lockedBy);
                        workSiteService.updateSite(site);
                        selectedSiteId = site.getSiteId();
                    } else {
                        log.info("\u5e93\u4f4d\u5df2\u88ab" + site.getLockedBy() + "\u9501\u5b9a\uff0c\u6682\u65e0\u6cd5\u9501\u5b9a");
                    }
                } else if (StringUtils.isEmpty((CharSequence)site.getLockedBy()) || site.getLockedBy().equals(lockedBy)) {
                    selectedSiteId = site.getSiteId();
                }
            }
        }
        catch (Exception e) {
            log.error("getSiteByCondition error {}", (Object)e.getMessage());
        }
        return selectedSiteId;
    }

    @Deprecated
    @HostAccess.Export
    public String getSiteByCondition(String siteId, String content, Integer filled, Integer type, String groupName, Boolean doLock, Long retryPeriod, String lockedBy) {
        boolean retryTimes = false;
        WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        WindService windService = (WindService)SpringUtil.getBean(WindService.class);
        String selectedSiteId = "";
        try {
            WorkSite site = workSiteService.findByCondition(siteId, content, filled, type, groupName, false, false);
            if (site != null) {
                if (site.getDisabled() != null && site.getDisabled().intValue() == SiteStatusEnum.disabled.getStatus() || site.getSyncFailed() != null && site.getSyncFailed().intValue() == SiteStatusEnum.syncFailed.getStatus()) {
                    log.error("site is disabled or syn failed");
                    return null;
                }
                if (doLock != null && doLock.booleanValue()) {
                    if (StringUtils.isEmpty((CharSequence)site.getLockedBy()) || site.getLockedBy().equals(lockedBy)) {
                        site.setLocked(Integer.valueOf(SiteStatusEnum.lock.getStatus()));
                        site.setLockedBy(lockedBy);
                        workSiteService.updateSite(site);
                        selectedSiteId = site.getSiteId();
                    } else {
                        log.info("\u5e93\u4f4d\u5df2\u88ab" + site.getLockedBy() + "\u9501\u5b9a\uff0c\u6682\u65e0\u6cd5\u9501\u5b9a");
                    }
                } else if (StringUtils.isEmpty((CharSequence)site.getLockedBy()) || site.getLockedBy().equals(lockedBy)) {
                    selectedSiteId = site.getSiteId();
                }
            }
        }
        catch (Exception e) {
            log.error("getSiteByCondition error {}", (Object)e.getMessage());
        }
        return selectedSiteId;
    }

    @Deprecated
    @HostAccess.Export
    public String getUnlockAreaFilledSite(String[] area, Integer filledStatus, Integer lockStatus) {
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        List sites = siteService.getSitesByGroups(Arrays.asList(area));
        List collect = sites.stream().filter(s -> s.getFilled().intValue() == filledStatus.intValue()).filter(s -> s.getLocked().intValue() == lockStatus.intValue()).collect(Collectors.toList());
        if (CollectionUtils.isEmpty(collect)) {
            return null;
        }
        return JSONObject.toJSONString(collect);
    }

    @Deprecated
    @HostAccess.Export
    public String getUnlockSiteListByTags(String[] tags, Integer filledStatus, Integer lockStatus) {
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        List sites = siteService.getSiteByTags(Arrays.asList(tags));
        List collect = sites.stream().filter(s -> s.getFilled().intValue() == filledStatus.intValue()).filter(s -> s.getLocked().intValue() == lockStatus.intValue()).collect(Collectors.toList());
        if (CollectionUtils.isEmpty(collect)) {
            return null;
        }
        return JSONObject.toJSONString(collect);
    }

    @Deprecated
    @HostAccess.Export
    public String getUnlockTagsSiteByContent(String[] tags, String content) {
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        List sites = siteService.getUnlockSiteByTagsAndContent(Arrays.asList(tags), content);
        if (sites.isEmpty()) {
            return null;
        }
        return JSONObject.toJSONString((Object)sites);
    }

    @Deprecated
    @HostAccess.Export
    public String getWorkSiteStatus(String[] workSiteArr) {
        try {
            WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
            List workSites = workSiteService.findBySiteLabelIn(Arrays.asList(workSiteArr));
            ArrayList workSiteVos = Lists.newArrayList();
            if (CollectionUtils.isNotEmpty((Collection)workSites)) {
                for (WorkSite site : workSites) {
                    if (site.getDisabled() != null && site.getDisabled().intValue() == SiteStatusEnum.disabled.getStatus() || site.getSyncFailed() != null && site.getSyncFailed().intValue() == SiteStatusEnum.syncFailed.getStatus()) {
                        log.error("site is disabled or syn failed");
                        continue;
                    }
                    WorkSiteVo vo = WorkSiteVo.builder().siteLabel(site.getSiteId()).lockSuccess(Boolean.valueOf(site.getLocked().intValue() == SiteStatusEnum.lock.getStatus())).agvId(site.getAgvId()).build();
                    workSiteVos.add(vo);
                }
                return JSONObject.toJSONString((Object)workSiteVos);
            }
        }
        catch (Exception e) {
            log.error("getWorkSiteStatus error {}", (Object)e.getMessage());
        }
        return null;
    }

    @Deprecated
    @HostAccess.Export
    public String getSiteByGroupNameRetry(String groupName, boolean isRetry) {
        WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        if (isRetry) {
            while (true) {
                try {
                    while (true) {
                        List sites;
                        if (CollectionUtils.isNotEmpty((Collection)(sites = workSiteService.findByGroupName(groupName)))) {
                            for (WorkSite site : sites) {
                                if (site.getLocked() != null && site.getLocked().intValue() != SiteStatusEnum.unlock.getStatus() || site.getFilled() != null && (site.getFilled().intValue() != SiteStatusEnum.unfilled.getStatus() || site.getDisabled() != null && site.getDisabled().intValue() != SiteStatusEnum.undisabled.getStatus() || site.getSyncFailed() != null && site.getSyncFailed().intValue() != SiteStatusEnum.synnofailed.getStatus())) continue;
                                return site.getSiteId();
                            }
                        }
                        Thread.sleep(1000L);
                    }
                }
                catch (InterruptedException e) {
                    log.error("getSiteByGroupNameRetry error {}", (Object)e.getMessage());
                    continue;
                }
                break;
            }
        }
        List sites = workSiteService.findByGroupName(groupName);
        if (CollectionUtils.isNotEmpty((Collection)sites)) {
            for (WorkSite site : sites) {
                if (site.getLocked() != null && site.getLocked().intValue() != SiteStatusEnum.unlock.getStatus() || site.getFilled() != null && (site.getFilled().intValue() != SiteStatusEnum.unfilled.getStatus() || site.getDisabled() != null && site.getDisabled().intValue() != SiteStatusEnum.undisabled.getStatus() || site.getSyncFailed() != null && site.getSyncFailed().intValue() != SiteStatusEnum.synnofailed.getStatus())) continue;
                return site.getSiteId();
            }
        }
        return null;
    }

    @Deprecated
    @HostAccess.Export
    public String lockWorkSite(String[] workSiteArr, String agvId) {
        try {
            WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
            List workSiteVos = workSiteService.lockWorkSite(Arrays.asList(workSiteArr), agvId);
            return JSONObject.toJSONString((Object)workSiteVos);
        }
        catch (Exception e) {
            log.error("lockWorkSite error {}", (Object)e.getMessage());
            return null;
        }
    }

    @Deprecated
    @HostAccess.Export
    public int updateUnlockSiteLockedBySiteId(String siteId, String lockedBy) {
        WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        int result = workSiteService.updateUnlockSiteLockedBySiteId(siteId, lockedBy);
        if (result > 0) {
            log.info("{} locked successfully by {}", (Object)siteId, (Object)lockedBy);
        }
        return result;
    }

    @Deprecated
    @HostAccess.Export
    public String setFilledWithContentBySiteId(String siteId, String content) {
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        WorkSite site = siteService.getWorkSite(siteId);
        if (site == null) {
            log.error("site is not exist");
            return "";
        }
        site.setFilled(Integer.valueOf(SiteStatusEnum.filled.getStatus()));
        site.setContent(content);
        siteService.updateSite(site);
        return "asdfasd";
    }

    @Deprecated
    @HostAccess.Export
    public void setUnfilledBySiteId(String siteId) {
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        WorkSite site = siteService.getWorkSite(siteId);
        if (site == null) {
            log.error("site is not exist");
            return;
        }
        site.setFilled(Integer.valueOf(SiteStatusEnum.unfilled.getStatus()));
        site.setContent("");
        siteService.updateSite(site);
    }

    @Deprecated
    @HostAccess.Export
    public void setWorksiteLockedByById(String siteId, String taskRecordId) {
        WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        workSiteService.setWorksiteLockedByById(siteId, taskRecordId);
    }

    @Deprecated
    @HostAccess.Export
    public void updateFilledSite(String area, String siteId, Integer filledStatus) {
        log.info("updateFilledSite: area={},siteId={},filledStatus={}", new Object[]{area, siteId, filledStatus});
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        WorkSite site = siteService.getSiteByAreaAndSiteId(area, siteId);
        if (site == null) {
            log.error("site is not exist");
            return;
        }
        site.setFilled(filledStatus);
        if (filledStatus != null && filledStatus == 0) {
            site.setContent(null);
        }
        siteService.updateSite(site);
    }

    @Deprecated
    @HostAccess.Export
    public void updateFilledStatusBySiteId(String siteId, Integer filledStatus) {
        log.info("updateFilledSite: siteId={},filledStatus={}", (Object)siteId, (Object)filledStatus);
        WorkSiteService siteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        WorkSite site = siteService.getWorkSite(siteId);
        if (site == null) {
            log.error("site is not exist");
            return;
        }
        site.setFilled(filledStatus);
        if (0 == filledStatus) {
            site.setContent("");
        }
        siteService.updateSite(site);
    }

    @Deprecated
    @HostAccess.Export
    public int updateSiteUnlockedByLockedBy(String taskRecordId) {
        WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        int result = workSiteService.updateSiteUnlockedByLockedBy(taskRecordId);
        if (result > 0) {
            log.info("The sites locked by {} has been unlocked successfully.", (Object)taskRecordId);
        }
        return result;
    }

    @Deprecated
    @HostAccess.Export
    public String unlockWorkSite(String[] workSiteArr, String agvId) {
        try {
            WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
            List workSiteVos = workSiteService.unlockWorkSite(Arrays.asList(workSiteArr), agvId);
            return JSONObject.toJSONString((Object)workSiteVos);
        }
        catch (Exception e) {
            log.error("unlockWorkSite error {}", (Object)e.getMessage());
            return null;
        }
    }

    @Deprecated
    @HostAccess.Export
    public void sleepThread(long ms) {
        try {
            Thread.sleep(ms);
        }
        catch (InterruptedException e) {
            log.error("\u4f11\u7720\u7ec8\u7aef");
        }
    }

    @Deprecated
    @HostAccess.Export
    public String requestPostJson(String url, String param) {
        try {
            Map result = OkHttpUtil.postJson((String)url, (String)param);
            return JSONObject.toJSONString((Object)result);
        }
        catch (Exception e) {
            log.error("requestPost error {}", (Object)e.getMessage());
            return null;
        }
    }

    @Deprecated
    @HostAccess.Export
    public String requestPutJson(String url, String param) {
        try {
            Map result = OkHttpUtil.putJson((String)url, (String)param);
            return JSONObject.toJSONString((Object)result);
        }
        catch (Exception e) {
            log.error("requestPt error {}", (Object)e.getMessage());
            return null;
        }
    }

    @Deprecated
    @HostAccess.Export
    public String jdbcCreateTable(String sql) {
        try {
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            jdbcTemplate.execute(sql);
        }
        catch (Exception e) {
            log.error("createTable error {}", (Object)e.getMessage());
            return JSONObject.toJSONString((Object)ResultVo.error((int)-1, (String)e.getMessage(), null));
        }
        return JSONObject.toJSONString((Object)ResultVo.success());
    }

    @Deprecated
    @HostAccess.Export
    public Boolean jdbcSaveSql(String sql) {
        try {
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            jdbcTemplate.execute(sql);
        }
        catch (Exception e) {
            log.error("save sql error {}", (Object)e.getMessage());
            return false;
        }
        return true;
    }

    @Deprecated
    @HostAccess.Export
    public String jdbcQueryRetry(String sql, long interval) {
        try {
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            while (true) {
                List maps;
                if (CollectionUtils.isNotEmpty((Collection)(maps = jdbcTemplate.queryForList(sql)))) {
                    return JSONObject.toJSONString((Object)maps);
                }
                Thread.sleep(interval);
            }
        }
        catch (Exception e) {
            log.error("jdbcQuery error {}", (Object)e.getMessage());
            return null;
        }
    }

    @Deprecated
    @HostAccess.Export
    public int jdbcSave(String sql, Object ... sqlParam) {
        try {
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            int result = jdbcTemplate.update(sql, sqlParam);
            return result;
        }
        catch (Exception e) {
            log.error("jdbcSave error {}", (Object)e.getMessage());
            return 0;
        }
    }

    @Deprecated
    @HostAccess.Export
    public int jdbcUpdate(String sql, Object ... sqlParam) {
        try {
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            int result = jdbcTemplate.update(sql, sqlParam);
            return result;
        }
        catch (Exception e) {
            log.error("jdbcUpdate error {}", (Object)e.getMessage());
            return 0;
        }
    }

    @Deprecated
    @HostAccess.Export
    public Boolean readCoilStatusByRetry(String ip, int port, int slaveId, int offset, Boolean expectValue) {
        while (true) {
            try {
                while (true) {
                    Boolean resultValue;
                    if ((resultValue = Modbus4jUtils.readCoilStatus((String)ip, (int)port, (int)slaveId, (int)offset, (String)"script read.")) != null && resultValue.equals(expectValue)) {
                        return resultValue;
                    }
                    this.sleepThread(1000L);
                }
            }
            catch (Exception e) {
                log.error("readCoilStatusByRetry error {}", (Object)e.getMessage());
                continue;
            }
            break;
        }
    }

    @Deprecated
    @HostAccess.Export
    public Number readHoldingRegisterByRetry(String ip, int port, int slaveId, int offset, int dataType, Number expectValue) {
        try {
            int retry = 0;
            boolean over = false;
            Number number = null;
            block6: while (true) {
                try {
                    while (true) {
                        number = Modbus4jUtils.readHoldingRegister((String)ip, (int)port, (int)slaveId, (int)offset, (int)dataType, (String)"script read.");
                        if (++retry == 1 || retry % 10 == 0) {
                            log.info("readHoldingRegisterByRetry res={}", (Object)number);
                        }
                        if (number != null && expectValue != null && number.doubleValue() == expectValue.doubleValue()) {
                            over = true;
                            break block6;
                        }
                        try {
                            Thread.sleep(1000L);
                            continue block6;
                        }
                        catch (InterruptedException interruptedException) {
                            continue;
                        }
                        break;
                    }
                }
                catch (Exception e) {
                    log.error("readHoldingRegisterByRetry error,try again,will be stoped after " + (1000 - retry));
                    continue;
                }
                break;
            }
            if (!over) {
                throw new RuntimeException("readHoldingRegisterByRetry timeout,can't read any value");
            }
            return number;
        }
        catch (Exception e) {
            log.error("readHoldingRegisterByRetry error {}", (Object)e.getMessage());
            return null;
        }
    }

    @Deprecated
    @HostAccess.Export
    public Number readHoldingRegisterArrayByRetry(String ip, int port, int slaveId, int[] offsets, int dataType, Number expectValue) {
        try {
            int retry = 0;
            boolean over = false;
            Number number = null;
            block6: do {
                try {
                    ++retry;
                    for (int offset : offsets) {
                        number = Modbus4jUtils.readHoldingRegister((String)ip, (int)port, (int)slaveId, (int)offset, (int)dataType, (String)"script read.");
                        if (retry == 1 || retry % 10 == 0) {
                            log.info("readHoldingRegisterByRetry offset={} res={}", (Object)offset, (Object)number);
                        }
                        if (number != null && expectValue != null && number.doubleValue() == expectValue.doubleValue()) {
                            over = true;
                            continue block6;
                        }
                        try {
                            Thread.sleep(1000L);
                        }
                        catch (InterruptedException interruptedException) {
                            // empty catch block
                        }
                    }
                }
                catch (Exception e) {
                    log.error("readHoldingRegisterByRetry error,try again,will be stoped after " + (1000 - retry));
                }
            } while (!over);
            return number;
        }
        catch (Exception e) {
            log.error("readHoldingRegisterByRetry error {}", (Object)e.getMessage());
            return null;
        }
    }

    @Deprecated
    @HostAccess.Export
    public String readMultiHoldingRegisters(String ip, int port, int slaveId, int offset, int addrCount, int dataType) {
        try {
            int retry = 0;
            Object res = "";
            block6: while (true) {
                try {
                    while (true) {
                        ++retry;
                        for (int i = offset; i < offset + addrCount; ++i) {
                            Number number = Modbus4jUtils.readHoldingRegister((String)ip, (int)port, (int)slaveId, (int)i, (int)dataType, (String)"script read.");
                            if (number == null) continue;
                            res = (String)res + number.toString();
                        }
                        if (retry == 1 || retry % 10 == 0) {
                            log.info("readMultiHoldingRegisters res={}", res);
                        }
                        if (!"".equals(res)) break block6;
                        try {
                            Thread.sleep(1000L);
                            continue block6;
                        }
                        catch (InterruptedException i) {
                            continue;
                        }
                        break;
                    }
                }
                catch (Exception e) {
                    log.error("readMultiHoldingRegisters error,try again,will be stoped after " + (1000 - retry));
                    continue;
                }
                break;
            }
            if ("".equals(res)) {
                throw new RuntimeException("readMultiHoldingRegisters timeout,can't read any value");
            }
            return res;
        }
        catch (Exception e) {
            log.error("readMultiHoldingRegisters error {}", (Object)e.getMessage());
            return null;
        }
    }

    @Deprecated
    @HostAccess.Export
    public Boolean writeHoldingRegisterRetry(String ip, int port, int slaveId, int offset, int dataType, Number value) {
        int retry = 0;
        boolean over = false;
        while (retry < 1000) {
            try {
                if (++retry == 1 || retry % 10 == 0) {
                    log.info("modbus writeHoldingRegister:ip={},port={},slaveId={},offest={},dataType={},value={}", new Object[]{ip, port, slaveId, offset, dataType, value});
                }
                try {
                    Modbus4jUtils.writeHoldingRegister((String)ip, (int)port, (int)slaveId, (int)offset, (int)dataType, (Object)value, (String)"script write.");
                    over = true;
                    break;
                }
                catch (Exception e) {
                    log.error("writeHoldingRegister error {}", (Object)e.getMessage());
                    try {
                        Thread.sleep(1000L);
                    }
                    catch (InterruptedException interruptedException) {
                    }
                }
            }
            catch (Exception e) {
                log.error("writeHoldingRegister error,try again,will be stoped after " + (1000 - retry));
            }
        }
        return over;
    }

    @Deprecated
    @HostAccess.Export
    public Object readOpcValueByRetry(String address, Object expectValue, boolean retry) {
        OpcUaConfig uaConfig = (OpcUaConfig)SpringUtil.getBean(OpcUaConfig.class);
        if (retry) {
            int times = 0;
            if (uaConfig.getRetry() <= 0L) {
                block10: while (true) {
                    try {
                        while (true) {
                            if (++times == 1 || times % 10 == 0) {
                                log.info("readOpcValue,param:{},{},{}", new Object[]{address, expectValue, retry});
                            }
                            Object result = OpcUaOperationUtil.readDeviceValue(null, (String)address);
                            if (times == 1 || times % 10 == 0) {
                                log.info("readOpcValue,result:{}", result);
                            }
                            if (result != null && result.equals(expectValue)) {
                                return result;
                            }
                            try {
                                Thread.sleep(uaConfig.getRetryInterval());
                                continue block10;
                            }
                            catch (InterruptedException interruptedException) {
                                continue;
                            }
                            break;
                        }
                    }
                    catch (Exception e) {
                        log.error("readOpcValueByRetry error,try again,will be stoped after " + (1000 - times));
                        continue;
                    }
                    break;
                }
            }
            while ((long)times < uaConfig.getRetry()) {
                try {
                    if (++times == 1 || times % 10 == 0) {
                        log.info("readOpcValue,param:{},{},{}", new Object[]{address, expectValue, retry});
                    }
                    Object result = OpcUaOperationUtil.readDeviceValue(null, (String)address);
                    if (times == 1 || times % 10 == 0) {
                        log.info("readOpcValue,result:{}", result);
                    }
                    if (result != null && result.equals(expectValue)) {
                        return result;
                    }
                    try {
                        Thread.sleep(uaConfig.getRetryInterval());
                    }
                    catch (InterruptedException interruptedException) {
                    }
                }
                catch (Exception e) {
                    log.error("readOpcValueByRetry error,try again,will be stoped after " + (1000 - times));
                }
            }
            throw new RuntimeException("readOpcValueByRetry time out");
        }
        log.info("readOpcValue,param:{},{},{}", new Object[]{address, expectValue, retry});
        try {
            Object result = OpcUaOperationUtil.readDeviceValue(null, (String)address);
            log.info("readOpcValue,result:{}", result);
            return result;
        }
        catch (Exception e) {
            throw new RuntimeException("readOpcValueByRetry error");
        }
    }

    @Deprecated
    @HostAccess.Export
    public void readOpcEsValueToCore(String address) {
        block7: {
            int times = 0;
            try {
                TreeMap addressMap = (TreeMap)JSONObject.parseObject((String)address, TreeMap.class);
                AgvApiService agvApiService = (AgvApiService)SpringUtil.getBean(AgvApiService.class);
                String cacheKey = "esAreaKey";
                Iterator iterator = addressMap.entrySet().iterator();
                while (iterator.hasNext()) {
                    ++times;
                    Map.Entry next = iterator.next();
                    String area = (String)next.getKey();
                    String opcAddr = (String)next.getValue();
                    try {
                        Object result = OpcUaOperationUtil.readDeviceValue(null, (String)opcAddr);
                        if (result != null) {
                            Boolean es = Boolean.parseBoolean(result.toString());
                            if (es.booleanValue()) {
                                agvApiService.pauseRobotsInBlock(area);
                                GlobalCacheConfig.cache((String)("esAreaKey" + area), (Object)true);
                                continue;
                            }
                            Object cache = GlobalCacheConfig.getCache((String)("esAreaKey" + area));
                            if (cache == null || !Boolean.parseBoolean(cache.toString())) continue;
                            agvApiService.resumeRobotsInBlock(area);
                            GlobalCacheConfig.clearCache((String)("esAreaKey" + area));
                            continue;
                        }
                        if (times != 1 && times % 50 != 0) continue;
                        log.error("readOpcEsValueToCore error", result);
                    }
                    catch (Exception e) {
                        if (times != 1 && times % 50 != 0) continue;
                        log.error("readOpcEsValueToCore error {}", (Object)e.getMessage());
                    }
                }
            }
            catch (Exception e) {
                if (times != 0) break block7;
                log.error("readOpcEsValueToCore error, opc client not yet init ");
            }
        }
    }

    @Deprecated
    @HostAccess.Export
    public Object getCache(String key) {
        return CacheDataBp.cacheMap.get(key);
    }

    @Deprecated
    @HostAccess.Export
    public void cache(String key, String value) {
        CacheDataBp.cacheMap.put(key, value);
    }

    @Deprecated
    @HostAccess.Export
    public void clearCache(String key) {
        CacheDataBp.cacheMap.remove(key);
    }

    @Deprecated
    @HostAccess.Export
    public Object getYmlValue(String key) {
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        Map map = null;
        try {
            map = (Map)YmlConfigUtil.loadConfig((String)(propConfig.getRdsScriptDir() + "application-biz.yml"), Map.class);
        }
        catch (Exception e) {
            log.error("Config Error {}", (Object)e.getMessage());
        }
        Object eval = MVEL.eval((String)key, (Map)map);
        return JSONObject.toJSONString((Object)eval);
    }

    @Deprecated
    @HostAccess.Export
    public void registerBtn(String label, String remark, String scriptFunction, String level) {
        ScriptButton btn = ScriptButton.builder().label(label).remark(remark).scriptFunction(scriptFunction).level(level).build();
        ScriptService.ScriptButtonList.add(btn);
    }

    @HostAccess.Export
    public Boolean checkTaskParam(String param) {
        SetOrderReq req = (SetOrderReq)JSONObject.parseObject((String)param, SetOrderReq.class);
        if (StringUtils.isEmpty((CharSequence)req.getTaskId()) && StringUtils.isEmpty((CharSequence)req.getTaskLabel())) {
            return false;
        }
        return true;
    }

    @HostAccess.Export
    public String createWindTask(String param) {
        try {
            log.info("createWindTask param = {}", (Object)param);
            ResultVo objectResultVo = WindTaskService.checkWindTask();
            if (objectResultVo.getCode().intValue() != CommonCodeEnum.SUCCESS.getCode().intValue()) {
                objectResultVo.setCode(Integer.valueOf(-1));
                objectResultVo.setMsg("During maintenance or when the system is not in working hours");
                return JSON.toJSONString((Object)objectResultVo);
            }
            AgvApiService agvApiService = (AgvApiService)SpringUtil.getBean(AgvApiService.class);
            SetOrderReq req = (SetOrderReq)JSONObject.parseObject((String)param, SetOrderReq.class);
            ResultVo resultVo = agvApiService.asyncSetOrder(req);
            return JSON.toJSONString((Object)resultVo);
        }
        catch (Exception e) {
            ResultVo resultVo = new ResultVo();
            resultVo.setMsg("" + e);
            resultVo.setCode(Integer.valueOf(-1));
            log.error("setOrder error {}", (Object)e.getMessage());
            return JSON.toJSONString((Object)resultVo);
        }
    }

    @HostAccess.Export
    public String getTaskRecordById(String taskRecordId) {
        WindTaskService windTaskService = (WindTaskService)SpringUtil.getBean(WindTaskService.class);
        WindTaskRecordVo taskRecord = windTaskService.getRecordById(taskRecordId);
        return JSONObject.toJSONString((Object)taskRecord);
    }

    @HostAccess.Export
    public String getTaskRecordListByOutOrderNo(String outOrderNo) {
        WindTaskService windTaskService = (WindTaskService)SpringUtil.getBean(WindTaskService.class);
        List taskRecords = windTaskService.getTaskRecordListByOutOrderNo(outOrderNo);
        return JSONObject.toJSONString((Object)taskRecords);
    }

    @HostAccess.Export
    public String getTaskRecordByAgvId(String agvId) {
        WindTaskService windTaskService = (WindTaskService)SpringUtil.getBean(WindTaskService.class);
        List taskRecords = windTaskService.getTaskRecordListByAgvId(agvId);
        return JSONObject.toJSONString((Object)taskRecords);
    }

    @HostAccess.Export
    public void markComplete(String orderId) throws IOException {
        log.info("complete task, orderId=" + orderId);
        JSONObject param = new JSONObject();
        param.put("id", (Object)orderId);
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        OkHttpUtil.postJsonParams((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.markComplete.getUri()), (String)param.toJSONString());
    }

    @HostAccess.Export
    public String updateOrderPriority(String orderId, int priority) throws IOException {
        log.info("updateOrderPriority task, orderId = {}, priority = {}", (Object)orderId, (Object)priority);
        JSONObject param = new JSONObject();
        param.put("id", (Object)orderId);
        param.put("priority", (Object)priority);
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        return JSON.toJSONString((Object)OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.updateOrderPriority.getUri()), (String)param.toJSONString()));
    }

    @HostAccess.Export
    public String updateOrderLabel(String orderId, String label) throws IOException {
        log.info("updateOrderLabel task, orderId = {} , label = {}", (Object)orderId, (Object)label);
        JSONObject param = new JSONObject();
        param.put("id", (Object)orderId);
        param.put("label", (Object)label);
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        return JSON.toJSONString((Object)OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.updateOrderLabel.getUri()), (String)param.toJSONString()));
    }

    @HostAccess.Export
    public boolean isTaskRecordIdExist(String taskRecordId) {
        if (StringUtils.isEmpty((CharSequence)taskRecordId)) {
            return false;
        }
        WindTaskRecordMapper taskRecordMapper = (WindTaskRecordMapper)SpringUtil.getBean(WindTaskRecordMapper.class);
        WindTaskRecord taskRecord = taskRecordMapper.findById((Object)taskRecordId).orElse(null);
        return taskRecord != null;
    }

    @HostAccess.Export
    public boolean isTaskLabelExist(String taskName) {
        if (StringUtils.isEmpty((CharSequence)taskName)) {
            return false;
        }
        WindTaskDefMapper taskRecordMapper = (WindTaskDefMapper)SpringUtil.getBean(WindTaskDefMapper.class);
        WindTaskDef allByLabel = taskRecordMapper.findAllByLabel(taskName);
        return allByLabel != null;
    }

    @HostAccess.Export
    public String queryTaskRecord(String param) {
        WindTaskService windTaskService = (WindTaskService)SpringUtil.getBean(WindTaskService.class);
        QueryTaskRecordReq queryTaskRecordReq = (QueryTaskRecordReq)JSONObject.parseObject((String)param, QueryTaskRecordReq.class);
        List res = windTaskService.findByCondition(queryTaskRecordReq, false);
        List collect = res.stream().map(it -> ScriptTaskRecord.builder().agvId(it.getAgvId()).endedOn(it.getEndedOn() == null ? null : DateUtil.fmtDate2String((Date)it.getEndedOn(), (String)JSON.DEFFAULT_DATE_FORMAT)).rootTaskRecordId(it.getRootTaskRecordId()).defVersion(it.getDefVersion()).outOrderNo(it.getOutOrderNo()).parentTaskRecordId(it.getParentTaskRecordId()).ifHaveChildTask(it.getIfHaveChildTask()).priority(it.getPriority()).executorTime(it.getExecutorTime()).path(it.getPath()).defLabel(it.getDefLabel()).stateDescription(it.getStateDescription()).createdOn(it.getCreatedOn() == null ? null : DateUtil.fmtDate2String((Date)it.getCreatedOn(), (String)JSON.DEFFAULT_DATE_FORMAT)).defId(it.getDefId()).firstExecutorTime(it.getFirstExecutorTime() == null ? null : DateUtil.fmtDate2String((Date)it.getFirstExecutorTime(), (String)JSON.DEFFAULT_DATE_FORMAT)).id(it.getId()).status(it.getStatus()).workTypes(it.getWorkTypes()).workStations(it.getWorkStations()).build()).collect(Collectors.toList());
        return JSONObject.toJSONStringWithDateFormat(collect, (String)JSON.DEFFAULT_DATE_FORMAT, (SerializerFeature[])new SerializerFeature[0]);
    }

    public String queryTaskRecordPagination(int pageSize, int currentPage, String param) {
        try {
            WindTaskService windTaskService = (WindTaskService)SpringUtil.getBean(WindTaskService.class);
            PaginationReq paginationReq = new PaginationReq();
            paginationReq.setPageSize(pageSize);
            paginationReq.setCurrentPage(currentPage);
            QueryTaskRecordReq queryParam = (QueryTaskRecordReq)JSONObject.parseObject((String)param, QueryTaskRecordReq.class);
            paginationReq.setQueryParam((Object)queryParam);
            Locale locale = LocaleContextHolder.getLocale();
            PaginationResponseVo taskRecordByConditionPage = windTaskService.findByConditionPage((QueryTaskRecordReq)paginationReq.getQueryParam(), Integer.valueOf(paginationReq.getCurrentPage()), Integer.valueOf(paginationReq.getPageSize()), locale, false);
            return JSONObject.toJSONString((Object)ResultVo.response((Object)taskRecordByConditionPage));
        }
        catch (Exception e) {
            log.error("queryTaskRecordPagination error {}", (Object)e.getMessage());
            return "";
        }
    }

    @HostAccess.Export
    public boolean receiveThirdOrder(String orderParam) {
        try {
            WindThirdOrderService orderService = (WindThirdOrderService)SpringUtil.getBean(WindThirdOrderService.class);
            orderService.saveOrder(orderParam);
            return true;
        }
        catch (Exception e) {
            log.error("receiveOrder error {}", (Object)e.getMessage());
            return false;
        }
    }

    @HostAccess.Export
    public String syncCreateWindTask(String param) {
        try {
            AgvApiService agvApiService = (AgvApiService)SpringUtil.getBean(AgvApiService.class);
            SetOrderReq req = (SetOrderReq)JSONObject.parseObject((String)param, SetOrderReq.class);
            ResultVo resultVo = agvApiService.setOrder(req);
            return JSON.toJSONString((Object)resultVo);
        }
        catch (Exception e) {
            ResultVo resultVo = new ResultVo();
            resultVo.setMsg("" + e);
            resultVo.setCode(Integer.valueOf(-1));
            log.error("setOrder error {}", (Object)e.getMessage());
            return JSON.toJSONString((Object)resultVo);
        }
    }

    @HostAccess.Export
    public void setTaskPriority(String taskRecordId, int priority) {
        try {
            WindTaskPriorityReq req = new WindTaskPriorityReq();
            req.setTaskRecordIds(Arrays.asList(taskRecordId));
            req.setPriority(Integer.valueOf(priority));
            log.info("setTaskPriority info {}", (Object)req);
            WindTaskService windTaskService = (WindTaskService)SpringUtil.getBean(WindTaskService.class);
            WindTaskRecordMapper windTaskRecordMapper = (WindTaskRecordMapper)SpringUtil.getBean(WindTaskRecordMapper.class);
            WindBlockRecordMapper windBlockRecordMapper = (WindBlockRecordMapper)SpringUtil.getBean(WindBlockRecordMapper.class);
            if (CollectionUtils.isEmpty((Collection)req.getTaskRecordIds()) || req.getPriority() == null) {
                return;
            }
            List collect = windTaskService.getTaskRecordById(req.getTaskRecordIds()).stream().filter(it -> it.getStatus().intValue() != TaskStatusEnum.end.getStatus() && it.getStatus().intValue() != TaskStatusEnum.end_error.getStatus() && it.getStatus().intValue() != TaskStatusEnum.stop.getStatus() && it.getStatus().intValue() != TaskStatusEnum.manual_end.getStatus()).collect(Collectors.toList());
            if (collect == null || CollectionUtils.isEmpty(collect)) {
                return;
            }
            ArrayList<String> ids = new ArrayList<String>();
            for (WindTaskRecord windTaskRecord : collect) {
                if (RootBp.windTaskRecordMap.get(windTaskRecord.getId()) != null) {
                    ((WindTaskRecord)RootBp.windTaskRecordMap.get(windTaskRecord.getId())).setPriority(req.getPriority());
                }
                RootBp.taskPriority.put(windTaskRecord.getId(), req.getPriority());
                windTaskRecord.setPriority(req.getPriority());
                ids.add(windTaskRecord.getId());
                String siteId = WindTaskService.siteNodeHashTable.getNodeByTaskRecordId(windTaskRecord.getId());
                if (!StringUtils.isNotEmpty((CharSequence)siteId)) continue;
                WindTaskService.siteNodeHashTable.hashLinkedList(siteId).reconstructionList(windTaskRecord.getId(), req.getPriority().intValue());
            }
            windTaskRecordMapper.saveAll(collect);
            List blockRecord = windBlockRecordMapper.findByTaskIdsAndTaskRecordIds(ids).stream().filter(it -> StringUtils.isNotEmpty((CharSequence)it.getOrderId())).collect(Collectors.toList());
            for (WindBlockRecord windBlockRecord : blockRecord) {
                JSONObject param = new JSONObject();
                param.put("id", (Object)windBlockRecord.getOrderId());
                param.put("priority", (Object)req.getPriority());
                Map stringStringMap = OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.updateOrderPriority.getUri()), (String)param.toJSONString());
                log.info("setTaskPriority core info {}", (Object)stringStringMap);
            }
        }
        catch (Exception e) {
            log.error("setTaskPriority error", (Throwable)e);
        }
    }

    @HostAccess.Export
    public void terminateTasks(String req) {
        log.info("abort tasks");
        List taskJsons = (List)JSONObject.parseObject((String)req, List.class);
        ArrayList tasks = com.google.common.collect.Lists.newArrayList();
        ArrayList<String> releaseSiteList = new ArrayList<String>();
        for (JSONObject o : taskJsons) {
            if (o.get((Object)"taskRecordId") == null) continue;
            WindTaskService windTaskService = (WindTaskService)SpringUtil.getBean(WindTaskService.class);
            WindTaskRecord taskRecord = windTaskService.getTaskRecordById(o.get((Object)"taskRecordId").toString());
            tasks.add(new StopAllTaskReq.StopTask(taskRecord.getDefId(), o.get((Object)"taskRecordId").toString()));
            if (o.get((Object)"releaseSite") == null || !o.getBoolean("releaseSite").booleanValue()) continue;
            releaseSiteList.add(o.get((Object)"taskRecordId").toString());
        }
        if (tasks.size() > 0) {
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.stopAllTask((List)tasks);
        }
        for (String taskRecordId : releaseSiteList) {
            WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
            List siteIds = workSiteService.findSiteIdsByLockedBy(taskRecordId);
            workSiteService.updateSiteUnlockedByLockedBy(taskRecordId);
            WokSiteLogUtil.save((List)siteIds, (int)SiteOperationEnum.UNLOCK.getStatus(), (String)"jj", (String)"script unlock");
        }
    }

    public void terminateTasksByReason(String req, String stopReason) {
        log.info("abort task , stopReason: {}", (Object)stopReason);
        List taskJsons = (List)JSONObject.parseObject((String)req, List.class);
        ArrayList tasks = com.google.common.collect.Lists.newArrayList();
        for (JSONObject o : taskJsons) {
            if (o.get((Object)"taskRecordId") == null) continue;
            WindTaskService windTaskService = (WindTaskService)SpringUtil.getBean(WindTaskService.class);
            WindTaskRecord taskRecord = windTaskService.getTaskRecordById(o.get((Object)"taskRecordId").toString());
            tasks.add(new StopAllTaskReq.StopTask(taskRecord.getDefId(), o.get((Object)"taskRecordId").toString()));
        }
        if (tasks.size() > 0) {
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.stopAllTask((List)tasks);
            for (StopAllTaskReq.StopTask task : tasks) {
                windService.updateTaskRecordEndedReason(task.getTaskRecordId(), stopReason);
            }
        }
    }

    public void suspendTask(String taskId, String taskRecordId) {
        WindService windService = (WindService)SpringUtil.getBean(WindService.class);
        log.info("\u6682\u505c\u4efb\u52a1 taskId = {}, taskRecordId = {}", (Object)taskId, (Object)taskRecordId);
        ResultVo resultVo = windService.suspendTask(taskId, taskRecordId);
    }

    public void startSuspendTask(String taskId, String taskRecordId) {
        WindService windService = (WindService)SpringUtil.getBean(WindService.class);
        log.info("\u5f00\u542f\u6682\u505c\u4efb\u52a1 taskId = {}, taskRecordId = {}", (Object)taskId, (Object)taskRecordId);
        ResultVo resultVo = windService.startSuspendTask(taskId, taskRecordId);
    }

    @HostAccess.Export
    public boolean isRobotExist(String robotName) {
        try {
            String res = OkHttpUtil.get((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.robotsStatus.getUri()));
            if (StringUtils.isEmpty((CharSequence)res)) {
                return false;
            }
            JSONObject robotStatus = JSONObject.parseObject((String)res);
            JSONArray reportArray = robotStatus.getJSONArray("report");
            for (int j = 0; j < reportArray.size(); ++j) {
                JSONObject newReportJson = reportArray.getJSONObject(j);
                String vehicleId = newReportJson.getString("vehicle_id");
                Boolean dispatchable = newReportJson.getBoolean("dispatchable");
                if (!robotName.equals(vehicleId)) continue;
                return true;
            }
            return false;
        }
        catch (Exception e) {
            log.error("isRobotExist error {}", (Throwable)e);
            return false;
        }
    }

    @HostAccess.Export
    public String getRobotsStatus() {
        Object cache = GlobalCacheConfig.getCache((String)"robotsStatus");
        if (cache == null) {
            log.error("robotsStatus info is null");
            return null;
        }
        return cache.toString();
    }

    @HostAccess.Export
    public String queryChargeParam() {
        return this.queryChargeParam("");
    }

    @HostAccess.Export
    public String queryChargeParam(String vehicles) {
        try {
            String res;
            Map resMap;
            Object[] vehicleNames = new Object[]{};
            if (StringUtils.isNotEmpty((CharSequence)vehicles)) {
                vehicleNames = JSONObject.parseArray((String)vehicles).toArray();
            }
            if ((resMap = (Map)JSONObject.parseObject((String)(res = OkHttpUtil.get((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.queryChargeParam.getUri()))), Map.class)) != null) {
                Set resKeySet = resMap.keySet();
                Iterator iterator = resKeySet.iterator();
                LinkedList<ChargeAgvVo> chargeList = new LinkedList<ChargeAgvVo>();
                while (iterator.hasNext()) {
                    String name = (String)iterator.next();
                    Map thresholdMap = (Map)resMap.get(name);
                    HashMap<String, BigDecimal> newThresholdMap = new HashMap<String, BigDecimal>();
                    for (Map.Entry entry : thresholdMap.entrySet()) {
                        String key = (String)entry.getKey();
                        String value = (String)entry.getValue();
                        BigDecimal newValue = BigDecimal.valueOf(Double.parseDouble(value)).multiply(new BigDecimal("100"));
                        newThresholdMap.put(key, newValue);
                    }
                    if (vehicleNames.length == 0) {
                        chargeList.add(ChargeAgvVo.buildChargeVo((String)name, newThresholdMap));
                        continue;
                    }
                    if (!Arrays.asList(vehicleNames).contains(name)) continue;
                    chargeList.add(ChargeAgvVo.buildChargeVo((String)name, newThresholdMap));
                }
                return JSONObject.toJSONString(chargeList);
            }
            return "[]";
        }
        catch (IOException e) {
            log.error("queryChargeParam error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Boolean modifyChargeParam(String param) {
        try {
            log.info("try to modify charge param: {}", (Object)param);
            ChargeAGVReq chargeAGVReq = (ChargeAGVReq)JSONObject.parseObject((String)param, ChargeAGVReq.class);
            String res = OkHttpUtil.postJsonParams((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.modifyChargeParam.getUri()), (String)new ObjectMapper().writeValueAsString((Object)chargeAGVReq));
            log.info("modify charge param success: {}", (Object)res);
            return true;
        }
        catch (IOException e) {
            log.error("modifyChargeParam error {}", (Object)e.getMessage());
            return false;
        }
    }

    @HostAccess.Export
    public String getCoreAlarms(Integer code) {
        Object cache = GlobalCacheConfig.getCache((String)"robotsStatus");
        JSONObject obj = JSONObject.parseObject((String)((String)cache));
        JSONObject coreAlarms = obj.getJSONObject("alarms");
        if (cache == null) {
            log.error("robotsStatus info is null");
            return null;
        }
        ObjectMapper objectMapper = new ObjectMapper();
        AlarmsVo alarmsVo = new AlarmsVo();
        try {
            AlarmsVo coreAlarmsVo = (AlarmsVo)objectMapper.readValue(coreAlarms.toJSONString(), AlarmsVo.class);
            List filteredWarnings = coreAlarmsVo.getWarnings().stream().filter(warning -> {
                if (warning instanceof AlarmsDetailVo) {
                    return warning.getCode().equals(code);
                }
                return false;
            }).collect(Collectors.toList());
            List filteredErrors = coreAlarmsVo.getErrors().stream().filter(error -> {
                if (error instanceof AlarmsDetailVo) {
                    return error.getCode().equals(code);
                }
                return false;
            }).collect(Collectors.toList());
            List filteredFatals = coreAlarmsVo.getFatals().stream().filter(fatal -> {
                if (fatal instanceof AlarmsDetailVo) {
                    return fatal.getCode().equals(code);
                }
                return false;
            }).collect(Collectors.toList());
            if (!filteredWarnings.isEmpty()) {
                alarmsVo.setWarnings(filteredWarnings);
            }
            if (!filteredErrors.isEmpty()) {
                alarmsVo.setErrors(filteredErrors);
            }
            if (!filteredFatals.isEmpty()) {
                alarmsVo.setFatals(filteredFatals);
            }
        }
        catch (JsonProcessingException e) {
            log.error("getCoreAlarms is error {}", (Throwable)e);
            return null;
        }
        return JSON.toJSONString((Object)alarmsVo);
    }

    @HostAccess.Export
    public String getCoreAlarms() {
        Object cache = GlobalCacheConfig.getCache((String)"robotsStatus");
        JSONObject obj = JSONObject.parseObject((String)((String)cache));
        JSONObject coreAlarms = obj.getJSONObject("alarms");
        if (cache == null) {
            log.error("robotsStatus info is null");
            return null;
        }
        ObjectMapper objectMapper = new ObjectMapper();
        AlarmsVo alarmsVo = new AlarmsVo();
        ArrayList warnings = new ArrayList();
        ArrayList errors = new ArrayList();
        ArrayList fatals = new ArrayList();
        try {
            AlarmsVo coreAlarmsVo = (AlarmsVo)objectMapper.readValue(coreAlarms.toJSONString(), AlarmsVo.class);
            if (!coreAlarmsVo.getWarnings().isEmpty()) {
                warnings.addAll(coreAlarmsVo.getWarnings());
            }
            if (!coreAlarmsVo.getErrors().isEmpty()) {
                errors.addAll(coreAlarmsVo.getErrors());
            }
            if (!coreAlarmsVo.getFatals().isEmpty()) {
                fatals.addAll(coreAlarmsVo.getFatals());
            }
        }
        catch (JsonProcessingException e) {
            log.error("getCoreAlarms is error {}", (Throwable)e);
            return null;
        }
        if (!warnings.isEmpty()) {
            alarmsVo.setWarnings(warnings);
        }
        if (!errors.isEmpty()) {
            alarmsVo.setErrors(errors);
        }
        if (!fatals.isEmpty()) {
            alarmsVo.setFatals(fatals);
        }
        return JSON.toJSONString((Object)alarmsVo);
    }

    @Deprecated
    @HostAccess.Export
    public String getRbkAlarms(Integer code) {
        JSONArray reports = this.getReportsFromCache();
        if (CollectionUtils.isEmpty((Collection)reports)) {
            return null;
        }
        ObjectMapper objectMapper = new ObjectMapper();
        AlarmsVo alarmsVo = new AlarmsVo();
        ArrayList warnings = new ArrayList();
        ArrayList errors = new ArrayList();
        ArrayList fatals = new ArrayList();
        try {
            for (int i = 0; i < reports.size(); ++i) {
                JSONObject report = reports.getJSONObject(i);
                String vehicleId = report.getString("uuid");
                JSONObject rbkReport = report.getJSONObject("rbk_report");
                JSONObject rbkAlarms = rbkReport.getJSONObject("alarms");
                AlarmsVo rbkAlarmsVo = (AlarmsVo)objectMapper.readValue(rbkAlarms.toJSONString(), AlarmsVo.class);
                if (!rbkAlarmsVo.getWarnings().isEmpty()) {
                    warnings.addAll(rbkAlarmsVo.getWarnings());
                }
                if (!rbkAlarmsVo.getErrors().isEmpty()) {
                    errors.addAll(rbkAlarmsVo.getErrors());
                }
                if (rbkAlarmsVo.getFatals().isEmpty()) continue;
                fatals.addAll(rbkAlarmsVo.getFatals());
            }
        }
        catch (JsonProcessingException e) {
            log.error("getRbkAlarms is error {}", (Throwable)e);
            return null;
        }
        List filteredWarnings = warnings.stream().filter(warning -> {
            if (warning instanceof AlarmsDetailVo) {
                return warning.getCode().equals(code);
            }
            return false;
        }).collect(Collectors.toList());
        List filteredErrors = errors.stream().filter(error -> {
            if (error instanceof AlarmsDetailVo) {
                return error.getCode().equals(code);
            }
            return false;
        }).collect(Collectors.toList());
        List filteredFatals = fatals.stream().filter(fatal -> {
            if (fatal instanceof AlarmsDetailVo) {
                return fatal.getCode().equals(code);
            }
            return false;
        }).collect(Collectors.toList());
        this.processAlarms(alarmsVo, filteredWarnings, filteredErrors, filteredFatals);
        return JSON.toJSONString((Object)alarmsVo);
    }

    @Deprecated
    @HostAccess.Export
    public String getRbkAlarms() {
        JSONArray reports = this.getReportsFromCache();
        if (CollectionUtils.isEmpty((Collection)reports)) {
            return null;
        }
        ObjectMapper objectMapper = new ObjectMapper();
        AlarmsVo alarmsVo = new AlarmsVo();
        ArrayList warnings = new ArrayList();
        ArrayList errors = new ArrayList();
        ArrayList fatals = new ArrayList();
        try {
            for (int i = 0; i < reports.size(); ++i) {
                JSONObject report = reports.getJSONObject(i);
                String vehicleId = report.getString("uuid");
                JSONObject rbkReport = report.getJSONObject("rbk_report");
                JSONObject rbkAlarms = rbkReport.getJSONObject("alarms");
                AlarmsVo rbkAlarmsVo = (AlarmsVo)objectMapper.readValue(rbkAlarms.toJSONString(), AlarmsVo.class);
                if (!rbkAlarmsVo.getWarnings().isEmpty()) {
                    warnings.addAll(rbkAlarmsVo.getWarnings());
                }
                if (!rbkAlarmsVo.getErrors().isEmpty()) {
                    errors.addAll(rbkAlarmsVo.getErrors());
                }
                if (rbkAlarmsVo.getFatals().isEmpty()) continue;
                fatals.addAll(rbkAlarmsVo.getFatals());
            }
        }
        catch (JsonProcessingException e) {
            log.error("getRbkAlarms is error {}", (Throwable)e);
            return null;
        }
        this.processAlarms(alarmsVo, warnings, errors, fatals);
        return JSON.toJSONString((Object)alarmsVo);
    }

    @HostAccess.Export
    public String getUpdatedRbkAlarms(Integer code) {
        JSONArray reports = this.getReportsFromCache();
        if (CollectionUtils.isEmpty((Collection)reports)) {
            return null;
        }
        ArrayList<AlarmsVo> alarmsVoList = new ArrayList<AlarmsVo>();
        try {
            for (int i = 0; i < reports.size(); ++i) {
                ObjectMapper objectMapper = new ObjectMapper();
                AlarmsVo alarmsVo = new AlarmsVo();
                ArrayList warnings = new ArrayList();
                ArrayList errors = new ArrayList();
                ArrayList fatals = new ArrayList();
                JSONObject report = reports.getJSONObject(i);
                String vehicleId = report.getString("uuid");
                JSONObject rbkReport = report.getJSONObject("rbk_report");
                JSONObject rbkAlarms = rbkReport.getJSONObject("alarms");
                AlarmsVo rbkAlarmsVo = (AlarmsVo)objectMapper.readValue(rbkAlarms.toJSONString(), AlarmsVo.class);
                if (!rbkAlarmsVo.getWarnings().isEmpty()) {
                    warnings.addAll(rbkAlarmsVo.getWarnings());
                }
                if (!rbkAlarmsVo.getErrors().isEmpty()) {
                    errors.addAll(rbkAlarmsVo.getErrors());
                }
                if (!rbkAlarmsVo.getFatals().isEmpty()) {
                    fatals.addAll(rbkAlarmsVo.getFatals());
                }
                List filteredWarnings = warnings.stream().filter(warning -> {
                    if (warning instanceof AlarmsDetailVo) {
                        return warning.getCode().equals(code);
                    }
                    return false;
                }).collect(Collectors.toList());
                List filteredErrors = errors.stream().filter(error -> {
                    if (error instanceof AlarmsDetailVo) {
                        return error.getCode().equals(code);
                    }
                    return false;
                }).collect(Collectors.toList());
                List filteredFatals = fatals.stream().filter(fatal -> {
                    if (fatal instanceof AlarmsDetailVo) {
                        return fatal.getCode().equals(code);
                    }
                    return false;
                }).collect(Collectors.toList());
                if (rbkAlarmsVo.getWarnings().isEmpty() && rbkAlarmsVo.getErrors().isEmpty() && rbkAlarmsVo.getFatals().isEmpty()) continue;
                this.processAlarms(alarmsVo, filteredWarnings, filteredErrors, filteredFatals);
                alarmsVo.setUuid(vehicleId);
                alarmsVoList.add(alarmsVo);
            }
        }
        catch (JsonProcessingException e) {
            log.error("getRbkAlarms is error", (Throwable)e);
        }
        return JSON.toJSONString(alarmsVoList);
    }

    @HostAccess.Export
    public String getUpdatedRbkAlarms() {
        JSONArray reports = this.getReportsFromCache();
        if (CollectionUtils.isEmpty((Collection)reports)) {
            return null;
        }
        ArrayList<AlarmsVo> alarmsVoList = new ArrayList<AlarmsVo>();
        try {
            for (int i = 0; i < reports.size(); ++i) {
                ObjectMapper objectMapper = new ObjectMapper();
                AlarmsVo alarmsVo = new AlarmsVo();
                ArrayList warnings = new ArrayList();
                ArrayList errors = new ArrayList();
                ArrayList fatals = new ArrayList();
                JSONObject report = reports.getJSONObject(i);
                String vehicleId = report.getString("uuid");
                JSONObject rbkReport = report.getJSONObject("rbk_report");
                JSONObject rbkAlarms = rbkReport.getJSONObject("alarms");
                AlarmsVo rbkAlarmsVo = (AlarmsVo)objectMapper.readValue(rbkAlarms.toJSONString(), AlarmsVo.class);
                if (!rbkAlarmsVo.getWarnings().isEmpty()) {
                    warnings.addAll(rbkAlarmsVo.getWarnings());
                }
                if (!rbkAlarmsVo.getErrors().isEmpty()) {
                    errors.addAll(rbkAlarmsVo.getErrors());
                }
                if (!rbkAlarmsVo.getFatals().isEmpty()) {
                    fatals.addAll(rbkAlarmsVo.getFatals());
                }
                if (rbkAlarmsVo.getWarnings().isEmpty() && rbkAlarmsVo.getErrors().isEmpty() && rbkAlarmsVo.getFatals().isEmpty()) continue;
                this.processAlarms(alarmsVo, warnings, errors, fatals);
                alarmsVo.setUuid(vehicleId);
                alarmsVoList.add(alarmsVo);
            }
        }
        catch (JsonProcessingException e) {
            log.error("getRbkAlarms is error", (Throwable)e);
        }
        return JSON.toJSONString(alarmsVoList);
    }

    private JSONArray getReportsFromCache() {
        Object cache = GlobalCacheConfig.getCache((String)"robotsStatus");
        if (cache == null) {
            log.error("robotsStatus info is null");
            return null;
        }
        JSONObject obj = JSONObject.parseObject((String)((String)cache));
        return obj.getJSONArray("report");
    }

    private void processAlarms(AlarmsVo alarmsVo, List<AlarmsDetailVo> warnings, List<AlarmsDetailVo> errors, List<AlarmsDetailVo> fatals) {
        if (!warnings.isEmpty()) {
            alarmsVo.setWarnings(warnings);
        }
        if (!errors.isEmpty()) {
            alarmsVo.setErrors(errors);
        }
        if (!fatals.isEmpty()) {
            alarmsVo.setFatals(fatals);
        }
    }

    @HostAccess.Export
    public String getLiteRobotsStatus() {
        AgvApiService agvApiService = (AgvApiService)SpringUtil.getBean(AgvApiService.class);
        List resList = agvApiService.getLiteRobotsStatus();
        return JSONObject.toJSONString((Object)resList);
    }

    @HostAccess.Export
    public String getLiteRobotsStatuById(String agvId) {
        AgvApiService agvApiService = (AgvApiService)SpringUtil.getBean(AgvApiService.class);
        RobotInfoVo liteRobotsStatuById = agvApiService.getLiteRobotsStatuById(agvId);
        return JSONObject.toJSONString((Object)liteRobotsStatuById);
    }

    @HostAccess.Export
    public String getVehicleStation(String agvId) {
        String params = "?vehicles=" + agvId + "&paths=report.rbk_report.current_station,report.rbk_report.last_station";
        HashMap<String, String> resultMap = new HashMap<String, String>();
        try {
            String s = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.robotsStatus.getUri()) + params));
            JSONArray jsonArray = JSONObject.parseObject((String)s).getJSONArray("report");
            if (jsonArray != null) {
                String location = jsonArray.getJSONObject(0).getJSONObject("rbk_report").getString("current_station");
                String last_station = jsonArray.getJSONObject(0).getJSONObject("rbk_report").getString("last_station");
                resultMap.put("station", StringUtils.isEmpty((CharSequence)location) ? "" : location);
                resultMap.put("lastStation", StringUtils.isEmpty((CharSequence)last_station) ? "" : last_station);
            }
        }
        catch (Exception e) {
            log.error("getVehicleStation agvId = {}, error {}", (Object)agvId, (Object)e);
        }
        return JSONObject.toJSONString(resultMap);
    }

    @HostAccess.Export
    public boolean isPointExist(String pointName) {
        if (StringUtils.isEmpty((CharSequence)pointName)) {
            return false;
        }
        Collection values = RobotsStatusRunnable.points.values();
        for (List value : values) {
            if (!value.contains(pointName)) continue;
            return true;
        }
        return false;
    }

    @HostAccess.Export
    public boolean checkSiteExistedBySiteId(String siteId) {
        WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        WorkSite site = workSiteService.getWorkSite(siteId);
        return site != null;
    }

    @HostAccess.Export
    public boolean checkSiteGroupExistedByGroupName(String groupName) {
        WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        List sites = workSiteService.findByGroupName(groupName);
        return CollectionUtils.isNotEmpty((Collection)sites);
    }

    @HostAccess.Export
    public String findSitesByCondition(String conditions, String sort) {
        WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        WorkSiteHqlCondition workSiteQuery = (WorkSiteHqlCondition)JSONObject.parseObject((String)conditions, WorkSiteHqlCondition.class);
        workSiteQuery.setSort(sort);
        List result = workSiteService.findSitesByCondition(workSiteQuery);
        return JSONObject.toJSONString((Object)(CollectionUtils.isNotEmpty((Collection)result) ? result : null));
    }

    @HostAccess.Export
    public String findAvailableSitesByCondition(String conditions, String sort) {
        WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        WorkSiteHqlCondition workSiteHqlCondition = (WorkSiteHqlCondition)JSONObject.parseObject((String)conditions, WorkSiteHqlCondition.class);
        workSiteHqlCondition.setSort(sort);
        workSiteHqlCondition.setDisabled(Boolean.valueOf(false));
        workSiteHqlCondition.setSyncFailed(Boolean.valueOf(false));
        List result = workSiteService.findSitesByCondition(workSiteHqlCondition);
        return JSONObject.toJSONString((Object)(CollectionUtils.isNotEmpty((Collection)result) ? result : null));
    }

    @HostAccess.Export
    public String findAvailableSitesByExtFields(String conditions) {
        List vos;
        WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        List result = workSiteService.findAvailableSitesByExtFields(vos = JSON.parseArray((String)conditions, AttrVo.class));
        return JSONObject.toJSONString((Object)(CollectionUtils.isNotEmpty((Collection)result) ? result : null), (SerializerFeature[])new SerializerFeature[]{SerializerFeature.WriteMapNullValue});
    }

    @HostAccess.Export
    public void updateSiteExtFieldByIdAndExtFieldName(String conditions) {
        WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        List vos = JSONObject.parseArray((String)conditions, WorkSiteAttrDataUpdateVo.class);
        workSiteService.updateSiteExtFieldValueByIdAndExtFieldName(vos);
    }

    public int updateSitesByCondition(String conditions, String values) {
        WorkSiteVo workSiteVo;
        WorkSiteHqlCondition workSiteHqlCondition;
        WorkSiteService workSiteService = (WorkSiteService)SpringUtil.getBean(WorkSiteService.class);
        int res = workSiteService.updateSitesByCondition(workSiteHqlCondition = (WorkSiteHqlCondition)JSONObject.parseObject((String)conditions, WorkSiteHqlCondition.class), workSiteVo = (WorkSiteVo)JSONObject.parseObject((String)values, WorkSiteVo.class));
        if (res > 0) {
            log.info("conditions:{}, values:{}, sites has been modified.", (Object)conditions, (Object)values);
        }
        return res;
    }

    @HostAccess.Export
    public String getCacheParam(String key) {
        String extParam = (String)CacheDataBp.cacheMap.get(key);
        return extParam;
    }

    @HostAccess.Export
    public void putCacheParam(String key, String value) {
        try {
            WindService windService;
            if (CacheDataBp.cacheMap == null || CacheDataBp.cacheMap.size() == 0) {
                ConcurrentHashMap dataCache;
                windService = (WindService)SpringUtil.getBean(WindService.class);
                CacheDataBp.cacheMap = dataCache = windService.getDataCache();
            }
            CacheDataBp.cacheMap.put(key, value);
            windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCache(key, value);
        }
        catch (Exception e) {
            log.error("putCacheParam error {}", (Object)e.getMessage());
        }
    }

    @HostAccess.Export
    public void clearCacheParam(String key) {
        try {
            CacheDataBp.cacheMap.remove(key);
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            int removed = windService.removeDataCache(key);
            log.info("clearCacheParam count: {}", (Object)removed);
        }
        catch (Exception e) {
            log.error("clearCacheParam error {}", (Object)e.getMessage());
        }
    }

    @HostAccess.Export
    public String getAllCacheParams() {
        return JSONObject.toJSONString((Object)CacheDataBp.cacheMap);
    }

    @HostAccess.Export
    public void noticeOperator(String workTypes, String workStations, String content, Boolean needConfirm, Integer keepTime) {
        PDAMsgSender pdaMsgSender = (PDAMsgSender)SpringUtil.getBean(PDAMsgSender.class);
        pdaMsgSender.sendPadMsg(workTypes, workStations, content, needConfirm, keepTime, Integer.valueOf(0));
    }

    @HostAccess.Export
    public void noticeOperator(String workTypes, String workStations, String content, Boolean needConfirm, Integer keepTime, Integer retryTimes) {
        PDAMsgSender pdaMsgSender = (PDAMsgSender)SpringUtil.getBean(PDAMsgSender.class);
        pdaMsgSender.sendPadMsg(workTypes, workStations, content, needConfirm, keepTime, retryTimes);
    }

    @HostAccess.Export
    public void noticeOperatorByUser(String userNames, String content, Boolean needConfirm, Integer keepTime) {
        PDAMsgSender pdaMsgSender = (PDAMsgSender)SpringUtil.getBean(PDAMsgSender.class);
        pdaMsgSender.sendPadMsgByUser(userNames, content, needConfirm, keepTime, Integer.valueOf(0));
    }

    @HostAccess.Export
    public void noticeOperatorByUser(String userNames, String content, Boolean needConfirm, Integer keepTime, Integer retryTimes) {
        PDAMsgSender pdaMsgSender = (PDAMsgSender)SpringUtil.getBean(PDAMsgSender.class);
        pdaMsgSender.sendPadMsgByUser(userNames, content, needConfirm, keepTime, retryTimes);
    }

    @HostAccess.Export
    public void sleep(long ms) {
        try {
            Thread.sleep(ms);
        }
        catch (InterruptedException e) {
            log.error("\u4f11\u7720\u7ec8\u7aef");
        }
    }

    @HostAccess.Export
    public long currentTimeMillis() {
        return System.currentTimeMillis();
    }

    @HostAccess.Export
    public String nowDate() {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        return format.format(new Date());
    }

    @HostAccess.Export
    public String timeMillisFormat(Long mm) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        return format.format(new Date(mm));
    }

    @HostAccess.Export
    public String requestPost(String url, String param) {
        try {
            log.info("requestPost url=" + url + ",param = " + param);
            Map result = OkHttpUtil.postJson((String)url, (String)param);
            return JSONObject.toJSONString((Object)result);
        }
        catch (Exception e) {
            log.error("requestPost error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public void setHeader(String key, String value) {
        OkHttpUtil.requestHeaderDOSet.add(new RequestHeaderDO(key, value));
    }

    @HostAccess.Export
    public String requestGet(String url) {
        try {
            return OkHttpUtil.get((String)url);
        }
        catch (Exception e) {
            log.error("requestGet error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public String requestPostXml(String url, String param) {
        try {
            Map result = OkHttpUtil.postXml((String)url, (String)MessageConversionUtils.jsonToXml((String)param));
            return JSONObject.toJSONString((Object)result);
        }
        catch (Exception e) {
            log.error("requestPostXml error {}", (Object)e.getMessage());
            return null;
        }
    }

    public String requestHttpPost(String url, String param, String head, String type) {
        try {
            HashMap map = StringUtils.isEmpty((CharSequence)head) ? Maps.newHashMap() : (Map)JSONObject.parseObject((String)head, Map.class);
            Map result = OkHttpUtil.post((String)url, (String)param, (Map)map, (MediaTypeEnum)OkHttpUtil.getMediaTypeEnum((String)type));
            return JSONObject.toJSONString((Object)result);
        }
        catch (Exception e) {
            log.error("requestHttpPost error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public String requestHttpGet(String url, String head) {
        try {
            HashMap map = StringUtils.isEmpty((CharSequence)head) ? Maps.newHashMap() : (Map)JSONObject.parseObject((String)head, Map.class);
            return OkHttpUtil.getWithHeader((String)url, (Map)map);
        }
        catch (Exception e) {
            log.error("requestHttpGet error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public String requestHttpPut(String url, String head, String type, String param) {
        try {
            HashMap map = StringUtils.isEmpty((CharSequence)head) ? Maps.newHashMap() : (Map)JSONObject.parseObject((String)head, Map.class);
            Map result = OkHttpUtil.putJson((String)url, (Map)map, (MediaTypeEnum)OkHttpUtil.getMediaTypeEnum((String)type), (String)param);
            return JSONObject.toJSONString((Object)result);
        }
        catch (Exception e) {
            log.error("requestHttpPut error {}", (Object)e.getMessage());
            return null;
        }
    }

    public String jsonToXml(String param) throws Exception {
        try {
            String xml = MessageConversionUtils.jsonToXml((String)param);
            return xml;
        }
        catch (Exception e) {
            log.error("send mail error {}", (Object)e.getMessage());
            throw new Exception(e);
        }
    }

    @HostAccess.Export
    public String requestPostSoap12(String url, String param) {
        try {
            Map result = OkHttpUtil.postSoapTwelve((String)url, (String)MessageConversionUtils.jsonToXml((String)param));
            return JSONObject.toJSONString((Object)result);
        }
        catch (Exception e) {
            log.error("requestPostSoapTwelve error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public String requestPostSoap11(String url, String param) {
        try {
            Map result = OkHttpUtil.postSoapEleven((String)url, (String)MessageConversionUtils.jsonToXml((String)param));
            return JSONObject.toJSONString((Object)result);
        }
        catch (Exception e) {
            log.error("requestPostSoap11 error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Logger getLogger() {
        return LoggerFactory.getLogger(this.getClass());
    }

    @HostAccess.Export
    public void scriptLog(String level, String functionName, Object content) {
        if (content == null) {
            content = "null";
        }
        if ("INFO".equals(level.toUpperCase())) {
            log.info("[" + level + "] " + functionName + " - " + content.toString());
        }
        if ("ERROR".equals(level.toUpperCase())) {
            log.error("[" + level + "] " + functionName + " - " + content.toString());
        }
        if (sendScriptLog) {
            int currMinute = Calendar.getInstance().get(12);
            if (lastMinute == -1) {
                lastMinute = currMinute;
                ++lastCount;
                this.sendScriptMsg(level, functionName, content.toString());
            } else if (lastMinute == currMinute) {
                if (lastCount < 120) {
                    ++lastCount;
                    this.sendScriptMsg(level, functionName, content.toString());
                } else if (lastCount == 120) {
                    ++lastCount;
                    sendScriptLog = false;
                    this.sendScriptMsg(level, functionName, "Only a maximum of 120 prints are allowed in a minute, extra requests will not be printed!");
                }
            } else {
                lastMinute = currMinute;
                lastCount = 1;
                this.sendScriptMsg(level, functionName, content.toString());
            }
        }
    }

    private void sendScriptMsg(String level, String functionName, String content) {
        ScriptMsgSender.ScriptLog log = new ScriptMsgSender.ScriptLog();
        log.setLogDate(DateFormatUtils.format((Date)new Date(), (String)"yyyy-MM-dd HH:mm:ss.SSS"));
        log.setFunctionName(functionName);
        log.setContent(content);
        log.setLevel(level);
        ScriptMsgSender scriptMsgSender = (ScriptMsgSender)SpringUtil.getBean(ScriptMsgSender.class);
        ArrayList logs = Lists.newArrayList();
        logs.add(log);
        scriptMsgSender.sendScriptLog((List)logs);
    }

    @HostAccess.Export
    public void defineScheduledFunctions(Boolean isParallel, Long delay, Long period, String functionName, Object[] args) {
        ScriptRunReq runner = ScriptRunReq.builder().delay(delay).functionName(functionName).isParallel(isParallel).args((Object)args).period(period).build();
        ScriptService.scriptFuncList.add(runner);
    }

    @HostAccess.Export
    public void defineInitDataFunctions(String functionName) {
        ScriptService.initDataFunctionList.add(functionName);
    }

    @HostAccess.Export
    public void defineOnIdocReceivedFunction(String functionName) {
        ScriptService.onIdocReceivedFunction = functionName;
    }

    @HostAccess.Export
    public void registerButton(String label, String remark, String scriptFunction, String level) {
        ScriptButton btn = ScriptButton.builder().label(label).remark(remark).scriptFunction(scriptFunction).level(level).build();
        ScriptService.ScriptButtonList.add(btn);
    }

    @HostAccess.Export
    public void registerButton(String label, String remark, String scriptFunction, String level, Integer type) {
        ScriptButton btn = ScriptButton.builder().label(label).remark(remark).scriptFunction(scriptFunction).level(level).type(type).build();
        ScriptService.ScriptButtonList.add(btn);
    }

    @HostAccess.Export
    public void registerHandler(String method, String path, String functionName, Boolean auth) {
        ScriptApi scriptApi = ScriptApi.builder().method(method).path(path).functionName(functionName).auth(auth).build();
        ScriptService.scriptApiList.add(scriptApi);
    }

    @HostAccess.Export
    public void registerTaskEventFunction(String functionName) {
        ScriptService.taskEventFunctionList.add(functionName);
    }

    @HostAccess.Export
    public void registerTcpPort(Integer port) {
        ScriptService.initTcpPort.add(port);
    }

    @HostAccess.Export
    public Object getApplicationBusinessConfigValue(String key) {
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        Map map = null;
        try {
            map = (Map)YmlConfigUtil.loadConfig((String)(propConfig.getRdsScriptDir() + "application-biz.yml"), Map.class);
        }
        catch (Exception e) {
            log.error("Config Error {}", (Object)e.getMessage());
        }
        Object eval = MVEL.eval((String)key, (Map)map);
        return JSONObject.toJSONString((Object)eval);
    }

    @HostAccess.Export
    public Boolean jdbcExecuteSql(String sql) {
        try {
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            jdbcTemplate.execute(sql);
        }
        catch (Exception e) {
            log.error("save sql error {}", (Object)e.getMessage());
            return false;
        }
        return true;
    }

    @HostAccess.Export
    public String jdbcQuery(String sql) {
        try {
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            List maps = jdbcTemplate.queryForList(sql);
            return JSONObject.toJSONString((Object)maps);
        }
        catch (Exception e) {
            log.error("jdbcQuery error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Integer jdbcInsertOrUpdate(String sql, Object ... sqlParam) {
        try {
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            int result = jdbcTemplate.update(sql, sqlParam);
            return result;
        }
        catch (Exception e) {
            log.error("jdbcInsertOrUpdate error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Integer jdbcQueryCount(String sql) {
        try {
            JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
            Integer count = (Integer)jdbcTemplate.queryForObject(sql, Integer.class);
            return count;
        }
        catch (Exception e) {
            log.error("jdbcQuery error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Boolean readCoilStatus(String ip, int port, int slaveId, int offset) {
        try {
            return Modbus4jUtils.readCoilStatus((String)ip, (int)port, (int)slaveId, (int)offset, (String)"script read.");
        }
        catch (Exception e) {
            log.error("readCoilStatus error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Boolean readInputStatus(String ip, int port, int slaveId, int offset) {
        try {
            return Modbus4jUtils.readInputStatus((String)ip, (int)port, (int)slaveId, (int)offset, (String)"script read.");
        }
        catch (Exception e) {
            log.error("readInputStatus error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Number readHoldingRegister(String ip, int port, int slaveId, int offset, int dataType) {
        try {
            Number number = Modbus4jUtils.readHoldingRegister((String)ip, (int)port, (int)slaveId, (int)offset, (int)dataType, (String)"script read.");
            return number.intValue();
        }
        catch (Exception e) {
            log.error("readHoldingRegister error " + e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Number readInputRegister(String ip, int port, int slaveId, int offset, int dataType) {
        try {
            return Modbus4jUtils.readInputRegister((String)ip, (int)port, (int)slaveId, (int)offset, (int)dataType, (String)"script read.");
        }
        catch (Exception e) {
            log.error("readInputRegister error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public boolean[] batchReadCoilStatus(String ip, int port, int slaveId, int offset, int len) {
        try {
            return Modbus4jUtils.batchReadCoils((String)ip, (int)port, (int)slaveId, (int)offset, (int)len, (String)"script read.");
        }
        catch (Exception e) {
            log.error("batchReadCoilStatus error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public boolean[] batchReadInputStatus(String ip, int port, int slaveId, int offset, int len) {
        try {
            return Modbus4jUtils.batchReadInput((String)ip, (int)port, (int)slaveId, (int)offset, (int)len, (String)"script read.");
        }
        catch (Exception e) {
            log.error("batchReadInputStatus error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public short[] batchReadHoldingRegisters(String ip, int port, int slaveId, int offset, int len) {
        try {
            return Modbus4jUtils.batchReadHoldingRegisters((String)ip, (int)port, (int)slaveId, (int)offset, (int)len, (String)"script read.");
        }
        catch (Exception e) {
            log.error("batchReadHoldingRegisters error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public short[] batchReadInputRegisters(String ip, int port, int slaveId, int offset, int len) {
        try {
            return Modbus4jUtils.batchReadInputRegisters((String)ip, (int)port, (int)slaveId, (int)offset, (int)len, (String)"script read.");
        }
        catch (Exception e) {
            log.error("batchReadInputRegisters error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Boolean writeCoilStatus(String ip, int port, int slaveId, int offset, boolean value) {
        try {
            Modbus4jUtils.writeCoilStatus((String)ip, (int)port, (int)slaveId, (int)offset, (Boolean)value, (String)"script write.");
            return true;
        }
        catch (Exception e) {
            log.error("writeCoilStatus error {}", (Object)e.getMessage());
            return false;
        }
    }

    @HostAccess.Export
    public Boolean writeHoldingRegister(String ip, int port, int slaveId, int offset, int dataType, Number value) {
        try {
            Modbus4jUtils.writeHoldingRegister((String)ip, (int)port, (int)slaveId, (int)offset, (int)dataType, (Object)value, (String)"script write.");
            return true;
        }
        catch (Exception e) {
            log.error("writeHoldingRegister error {}", (Object)e.getMessage());
            return false;
        }
    }

    @HostAccess.Export
    public Boolean batchWriteCoilStatus(String ip, int port, int slaveId, int offset, boolean[] value) {
        try {
            Modbus4jUtils.batchWriteCoils((String)ip, (int)port, (int)slaveId, (int)offset, (boolean[])value, (String)"script write.");
            return true;
        }
        catch (Exception e) {
            log.error("batchWriteCoilStatus error {}", (Object)e.getMessage());
            return false;
        }
    }

    @HostAccess.Export
    public Boolean batchWriteHoldingRegister(String ip, int port, int slaveId, int offset, short[] value) {
        try {
            Modbus4jUtils.batchWriteRegisters((String)ip, (int)port, (int)slaveId, (int)offset, (short[])value, (String)"script write.");
            return true;
        }
        catch (Exception e) {
            log.error("batchWriteHoldingRegister error {}", (Object)e.getMessage());
            return false;
        }
    }

    @HostAccess.Export
    public Boolean writeSingleModbusValue(String ip, int port, int slaveId, String type, int offset, Number value) throws Exception {
        try {
            switch (type) {
                case "0x": {
                    Boolean writeValue = null;
                    if (value.intValue() == 0) {
                        writeValue = false;
                    } else if (value.intValue() == 1) {
                        writeValue = true;
                    } else {
                        throw new Exception("\u975e\u6cd5\u6570\u636e\uff0c\u5199\u5165\u30100x\u3011\u7684\u503c\u53ea\u80fd\u662f 0 \u6216 1\uff01");
                    }
                    Modbus4jUtils.writeCoilStatus((String)ip, (int)port, (int)slaveId, (int)offset, (Boolean)writeValue, (String)"script write.");
                    break;
                }
                case "4x": {
                    Modbus4jUtils.writeHoldingRegister((String)ip, (int)port, (int)slaveId, (int)offset, (int)2, (Object)value, (String)"script write.");
                    break;
                }
                case "1x": 
                case "3x": {
                    throw new Exception("\u7c7b\u578b\u4e3a\u3010" + type + "\u3011\u7684\u5730\u5740\u53ea\u652f\u6301\u8bfb\u64cd\u4f5c");
                }
                default: {
                    throw new Exception("\u65e0\u6cd5\u8bc6\u522b\u7684\u5730\u5740\u7c7b\u578b" + type);
                }
            }
        }
        catch (Exception e) {
            log.error("writeSingleModbusValue ip {}, port {}, error {}", new Object[]{ip, port, e.getMessage()});
            return false;
        }
        return true;
    }

    @HostAccess.Export
    public Boolean writeSingleModbusValueByInstanceName(String instanceName, Integer offset, Number value) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)instanceName);
        try {
            Modbus4jUtils.writeSingleValueByInstanceName((String)instanceName, (Integer)offset, (Number)value, (String)("script " + instanceName + " write"));
            return true;
        }
        catch (Exception e) {
            log.error("write single modbus value error {}, {}", (Object)instanceName, (Object)value);
            return false;
        }
    }

    @HostAccess.Export
    public Boolean writeBatchModbusValue(String ip, int port, int slaveId, String type, int offset, short[] values) {
        try {
            switch (type) {
                case "0x": {
                    boolean[] newValues = new boolean[values.length];
                    for (int i = 0; i < values.length; ++i) {
                        short value = values[i];
                        if (value == 0) {
                            newValues[i] = false;
                            continue;
                        }
                        if (value == 1) {
                            newValues[i] = true;
                            continue;
                        }
                        throw new Exception("\u975e\u6cd5\u6570\u636e\uff0c\u5199\u5165\u30100x\u3011\u7684\u503c\u53ea\u80fd\u662f 0 \u6216 1\uff01");
                    }
                    Modbus4jUtils.batchWriteCoils((String)ip, (int)port, (int)slaveId, (int)offset, (boolean[])newValues, (String)"script write.");
                    break;
                }
                case "4x": {
                    Modbus4jUtils.batchWriteRegisters((String)ip, (int)port, (int)slaveId, (int)offset, (short[])values, (String)"script write.");
                    break;
                }
                case "1x": 
                case "3x": {
                    throw new Exception("\u7c7b\u578b\u4e3a\u3010" + type + "\u3011\u7684\u5730\u5740\u53ea\u652f\u6301\u8bfb\u64cd\u4f5c");
                }
                default: {
                    throw new Exception("\u65e0\u6cd5\u8bc6\u522b\u7684\u5730\u5740\u7c7b\u578b" + type);
                }
            }
        }
        catch (Exception e) {
            log.error("writeBatchModbusValue ip {}, port {}, error {}", new Object[]{ip, port, e.getMessage()});
            return false;
        }
        return true;
    }

    @HostAccess.Export
    public Boolean writeBatchModbusValueByInstanceName(String instanceName, Integer offset, short[] values) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)instanceName);
        return this.writeBatchModbusValue(instance.getHost(), instance.getPort().intValue(), instance.getSlaveId().intValue(), instance.getType(), (offset == null ? instance.getTargetAddr() : offset).intValue(), values);
    }

    @HostAccess.Export
    public Number readSingleModbusValue(String ip, int port, int slaveId, String type, int offset) {
        try {
            Number modbusValue = null;
            switch (type) {
                case "0x": {
                    modbusValue = Modbus4jUtils.readCoilStatus((String)ip, (int)port, (int)slaveId, (int)offset, (String)"") != false ? Integer.valueOf(1) : Integer.valueOf(0);
                    break;
                }
                case "1x": {
                    modbusValue = Modbus4jUtils.readInputStatus((String)ip, (int)port, (int)slaveId, (int)offset, (String)"script read.") != false ? Integer.valueOf(1) : Integer.valueOf(0);
                    break;
                }
                case "3x": {
                    modbusValue = Modbus4jUtils.readInputRegister((String)ip, (int)port, (int)slaveId, (int)offset, (int)2, (String)"script read.");
                    break;
                }
                case "4x": {
                    modbusValue = Modbus4jUtils.readHoldingRegister((String)ip, (int)port, (int)slaveId, (int)offset, (int)2, (String)"script read.");
                    break;
                }
                default: {
                    throw new Exception("\u65e0\u6cd5\u8bc6\u522b\u7684\u5730\u5740\u7c7b\u578b:" + type);
                }
            }
            return modbusValue;
        }
        catch (Exception e) {
            log.error("readSingleModbusValue ip {} port {} error {}", new Object[]{ip, port, e.getMessage()});
            return null;
        }
    }

    @HostAccess.Export
    public Number readSingleModbusValueByInstanceName(String instanceName, Integer offset) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)instanceName);
        try {
            return Modbus4jUtils.readSingleValueByInstanceName((String)instanceName, (Integer)offset, (String)("script " + instanceName + " read"));
        }
        catch (Exception e) {
            log.error("read single modbus value error {}", (Object)instanceName);
            return null;
        }
    }

    @HostAccess.Export
    public short[] readBatchModbusValue(String ip, int port, int slaveId, String type, int offset, int length) {
        try {
            short[] modbusValues = new short[length];
            switch (type) {
                case "0x": {
                    boolean[] newValues = Modbus4jUtils.batchReadCoils((String)ip, (int)port, (int)slaveId, (int)offset, (int)length, (String)"script read.");
                    for (int i = 0; i < length; ++i) {
                        modbusValues[i] = newValues[i] ? (short)1 : 0;
                    }
                    break;
                }
                case "1x": {
                    boolean[] newValues = Modbus4jUtils.batchReadInput((String)ip, (int)port, (int)slaveId, (int)offset, (int)length, (String)"script read.");
                    for (int i = 0; i < length; ++i) {
                        modbusValues[i] = newValues[i] ? (short)1 : 0;
                    }
                    break;
                }
                case "3x": {
                    modbusValues = Modbus4jUtils.batchReadInputRegisters((String)ip, (int)port, (int)slaveId, (int)offset, (int)length, (String)"script read.");
                    break;
                }
                case "4x": {
                    modbusValues = Modbus4jUtils.batchReadHoldingRegisters((String)ip, (int)port, (int)slaveId, (int)offset, (int)length, (String)"script read.");
                    break;
                }
                default: {
                    throw new Exception("\u65e0\u6cd5\u8bc6\u522b\u7684\u5730\u5740\u7c7b\u578b:" + type);
                }
            }
            return modbusValues;
        }
        catch (Exception e) {
            log.error("readBatchModbusValue ip {} port {} error {}", new Object[]{ip, port, e.getMessage()});
            return null;
        }
    }

    @HostAccess.Export
    public short[] readBatchModbusValueByInstanceName(String instanceName, Integer offset, int length) throws Exception {
        ModbusInstance instance = Modbus4jUtils.getInstance((String)instanceName);
        return this.readBatchModbusValue(instance.getHost(), instance.getPort().intValue(), instance.getSlaveId().intValue(), instance.getType(), (offset == null ? instance.getTargetAddr() : offset).intValue(), length);
    }

    @HostAccess.Export
    public Object readOpcValue(String address) throws Exception {
        log.info("readOpcValue, param:{}", (Object)address);
        Object resultValue = OpcUaOperationUtil.readDeviceValue(null, (String)address);
        log.info("readOpcValue, result: {}", resultValue);
        return resultValue;
    }

    @HostAccess.Export
    public Object readOpcValue(int address) throws Exception {
        log.info("readOpcValue, param:{}", (Object)address);
        Object resultValue = OpcUaOperationUtil.readDeviceValue(null, (int)address);
        log.info("readOpcValue, result: {}", resultValue);
        return resultValue;
    }

    @HostAccess.Export
    public Object readOpcValue(Integer namespaceIndex, String address) throws Exception {
        log.info("readOpcValue, namespaceIndex:{}, address:{}", (Object)namespaceIndex, (Object)address);
        Object resultValue = OpcUaOperationUtil.readDeviceValue((Integer)namespaceIndex, (String)address);
        log.info("readOpcValue, result: {}", resultValue);
        return resultValue;
    }

    @HostAccess.Export
    public Object readOpcValue(Integer namespaceIndex, int address) throws Exception {
        log.info("readOpcValue, namespaceIndex:{}, address:{}", (Object)namespaceIndex, (Object)address);
        Object resultValue = OpcUaOperationUtil.readDeviceValue((Integer)namespaceIndex, (int)address);
        log.info("readOpcValue, result: {}", resultValue);
        return resultValue;
    }

    @HostAccess.Export
    public Object readOpcValueBySubscription(Integer namespaceIndex, String address) throws Exception {
        log.info("readOpcValueBySubscription, namespaceIndex:{}, address:{}", (Object)namespaceIndex, (Object)address);
        Object resultValue = OpcUaOperationUtil.readDeviceValueBySubscription((Integer)namespaceIndex, (String)address);
        log.info("readOpcValueBySubscription, result: {}", resultValue);
        return resultValue;
    }

    @HostAccess.Export
    public Object readOpcValueBySubscription(Integer namespaceIndex, int address) throws Exception {
        log.info("readOpcValueBySubscription, namespaceIndex:{}, address:{}", (Object)namespaceIndex, (Object)address);
        Object resultValue = OpcUaOperationUtil.readDeviceValueBySubscription((Integer)namespaceIndex, (int)address);
        log.info("readOpcValueBySubscription, result: {}", resultValue);
        return resultValue;
    }

    @HostAccess.Export
    public boolean writeOpcValue(String address, Object value) {
        log.info("writeOpcValue, address={},value={}", (Object)address, value);
        boolean result = OpcUaOperationUtil.writeDeviceValue(null, (String)address, (Object)value);
        return result;
    }

    @HostAccess.Export
    public boolean writeOpcValue(int address, Object value) {
        log.info("writeOpcValue, address={},value={}", (Object)address, value);
        boolean result = OpcUaOperationUtil.writeDeviceValue(null, (int)address, (Object)value);
        return result;
    }

    @HostAccess.Export
    public boolean writeOpcValue(Integer namespaceIndex, String address, Object value) {
        log.info("writeOpcValue, namespaceIndex={}, address={}, value={}", new Object[]{namespaceIndex, address, value});
        boolean result = OpcUaOperationUtil.writeDeviceValue((Integer)namespaceIndex, (String)address, (Object)value);
        return result;
    }

    @HostAccess.Export
    public boolean writeOpcValue(Integer namespaceIndex, int address, Object value) {
        log.info("writeOpcValue, namespaceIndex={}, address={}, value={}", new Object[]{namespaceIndex, address, value});
        boolean result = OpcUaOperationUtil.writeDeviceValue((Integer)namespaceIndex, (int)address, (Object)value);
        return result;
    }

    @HostAccess.Export
    public boolean writeOpcValueByType(String address, String value, Integer type) {
        log.info("writeOpcValueByType, address={},value={},type={}", new Object[]{address, value, type});
        try {
            Object writeValue = OpcTypeEnum.matchValue((String)value, (Integer)type);
            boolean result = OpcUaOperationUtil.writeDeviceValue(null, (String)address, (Object)writeValue);
            return result;
        }
        catch (Exception e) {
            log.error("Opc IllegalArgumentException error, errorValue = {} , message = {}", (Object)value, (Object)e.getMessage());
            return false;
        }
    }

    @HostAccess.Export
    public boolean writeOpcValueByType(int address, String value, Integer type) {
        log.info("writeOpcValueByType, address={},value={},type={}", new Object[]{address, value, type});
        try {
            Object writeValue = OpcTypeEnum.matchValue((String)value, (Integer)type);
            boolean result = OpcUaOperationUtil.writeDeviceValue(null, (int)address, (Object)writeValue);
            return result;
        }
        catch (Exception e) {
            log.error("Opc IllegalArgumentException error, errorValue = {} , message = {}", (Object)value, (Object)e.getMessage());
            return false;
        }
    }

    @HostAccess.Export
    public boolean writeOpcValueByType(Integer namespaceIndex, String address, String value, Integer type) {
        log.info("writeOpcValueByType, namespaceIndex={}, address={},value={},type={}", new Object[]{namespaceIndex, address, value, type});
        try {
            Object writeValue = OpcTypeEnum.matchValue((String)value, (Integer)type);
            boolean result = OpcUaOperationUtil.writeDeviceValue((Integer)namespaceIndex, (String)address, (Object)writeValue);
            return result;
        }
        catch (Exception e) {
            log.error("Opc IllegalArgumentException error, errorValue = {} , message = {}", (Object)value, (Object)e.getMessage());
            return false;
        }
    }

    @HostAccess.Export
    public boolean writeOpcValueByType(Integer namespaceIndex, int address, String value, Integer type) {
        log.info("writeOpcValueByType, namespaceIndex={}, address={},value={},type={}", new Object[]{namespaceIndex, address, value, type});
        try {
            Object writeValue = OpcTypeEnum.matchValue((String)value, (Integer)type);
            boolean result = OpcUaOperationUtil.writeDeviceValue((Integer)namespaceIndex, (int)address, (Object)writeValue);
            return result;
        }
        catch (Exception e) {
            log.error("Opc IllegalArgumentException error, errorValue = {} , message = {}", (Object)value, (Object)e.getMessage());
            return false;
        }
    }

    @HostAccess.Export
    public Boolean readMelsecBoolean(String ip, int port, String address) {
        try {
            return MelsecUtils.readBoolean((String)ip, (int)port, (String)address);
        }
        catch (Exception e) {
            log.error("read MelsecBoolean error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Number readMelsecNumber(String ip, int port, String address) {
        try {
            return MelsecUtils.readNumber((String)ip, (int)port, (String)address);
        }
        catch (Exception e) {
            log.error("readMelsecNumber error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public String readMelsecString(String ip, int port, String address, short length) {
        try {
            return MelsecUtils.readString((String)ip, (int)port, (String)address, (short)length);
        }
        catch (Exception e) {
            log.error("readMelsecString error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public boolean writeMelsecBoolean(String ip, int port, String address, boolean value) {
        try {
            return MelsecUtils.writeBoolean((String)ip, (int)port, (String)address, (boolean)value);
        }
        catch (Exception e) {
            log.error("writeMelsecBoolean error {}", (Object)e.getMessage());
            return false;
        }
    }

    @HostAccess.Export
    public boolean writeMelsecNumber(String ip, int port, String address, int value) {
        try {
            return MelsecUtils.writeNumber((String)ip, (int)port, (String)address, (int)value);
        }
        catch (Exception e) {
            log.error("writeMelsecNumber error {}", (Object)e.getMessage());
            return false;
        }
    }

    @HostAccess.Export
    public boolean writeMelsecString(String ip, int port, String address, String value) {
        try {
            return MelsecUtils.writeString((String)ip, (int)port, (String)address, (String)value);
        }
        catch (Exception e) {
            log.error("writeMelsecString error {}", (Object)e.getMessage());
            return false;
        }
    }

    @HostAccess.Export
    public String readFinsString(String ip, int port, int area, int finsIoAddr, int bitOffset, int wordLength) {
        try {
            return FinsUtil.readString((String)ip, (int)port, (int)area, (int)finsIoAddr, (int)bitOffset, (int)wordLength);
        }
        catch (Exception e) {
            log.error("readFinsString error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Short readFinsWord(String ip, int port, int area, int finsIoAddr, int bitOffset) {
        try {
            return FinsUtil.readWord((String)ip, (int)port, (int)area, (int)finsIoAddr, (int)bitOffset);
        }
        catch (Exception e) {
            log.error("readFinsWord error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Bit readFinsBit(String ip, int port, int area, int finsIoAddr, int bitOffset) {
        try {
            return FinsUtil.readBit((String)ip, (int)port, (int)area, (int)finsIoAddr, (int)bitOffset);
        }
        catch (Exception e) {
            log.error("readFinsBit error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public void writeFinsWord(String ip, int port, int area, int finsIoAddr, int bitOffset, int value) {
        try {
            FinsUtil.writeWord((String)ip, (int)port, (int)area, (int)finsIoAddr, (int)bitOffset, (int)value);
        }
        catch (Exception e) {
            log.error("writeFinsWord error {}", (Object)e.getMessage());
        }
    }

    @HostAccess.Export
    public void writeFinsBit(String ip, int port, int area, int finsIoAddr, int bitOffset, boolean value) {
        try {
            FinsUtil.writeBit((String)ip, (int)port, (int)area, (int)finsIoAddr, (int)bitOffset, (boolean)value);
        }
        catch (Exception e) {
            log.error("writeFinsBit error {}", (Object)e.getMessage());
        }
    }

    @HostAccess.Export
    public Short readS7Int(String type, String ip, String blockAndOffset) {
        try {
            return S7Util.readInt((String)type, (String)ip, (String)blockAndOffset, null, null);
        }
        catch (Exception e) {
            log.error("readS7Int error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Integer readS7DInt(String type, String ip, String blockAndOffset) {
        try {
            return S7Util.readDInt((String)type, (String)ip, (String)blockAndOffset, null, null);
        }
        catch (Exception e) {
            log.error("readS7DInt error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Integer readS7Word(String type, String ip, String blockAndOffset) {
        try {
            return S7Util.readWord((String)type, (String)ip, (String)blockAndOffset, null, null);
        }
        catch (Exception e) {
            log.error("readS7Word error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Long readS7DWord(String type, String ip, String blockAndOffset) {
        try {
            return S7Util.readDWord((String)type, (String)ip, (String)blockAndOffset, null, null);
        }
        catch (Exception e) {
            log.error("readS7DWord error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public String readS7String(String type, String ip, String blockAndOffset) {
        try {
            return S7Util.readString((String)type, (String)ip, (String)blockAndOffset, null, null);
        }
        catch (Exception e) {
            log.error("readS7String error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Boolean readS7Boolean(String type, String ip, String blockAndOffset) {
        try {
            return S7Util.readBoolean((String)type, (String)ip, (String)blockAndOffset, null, null);
        }
        catch (Exception e) {
            log.error("readS7Boolean error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Boolean writeS7Int(String type, String ip, String blockAndOffset, int value) {
        try {
            Boolean success = S7Util.writeInt((String)type, (String)ip, (String)blockAndOffset, (int)value, null, null);
            return success;
        }
        catch (Exception e) {
            log.error("writeS7Int error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Boolean writeS7DInt(String type, String ip, String blockAndOffset, int value) {
        try {
            Boolean success = S7Util.writeDInt((String)type, (String)ip, (String)blockAndOffset, (int)value, null, null);
            return success;
        }
        catch (Exception e) {
            log.error("writeS7DInt error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Boolean writeS7Word(String type, String ip, String blockAndOffset, int value) {
        try {
            Boolean success = S7Util.writeWord((String)type, (String)ip, (String)blockAndOffset, (int)value, null, null);
            return success;
        }
        catch (Exception e) {
            log.error("writeS7Word error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Boolean writeS7DWord(String type, String ip, String blockAndOffset, Long value) {
        try {
            Boolean success = S7Util.writeDWord((String)type, (String)ip, (String)blockAndOffset, (Long)value, null, null);
            return success;
        }
        catch (Exception e) {
            log.error("writeS7DWord error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Boolean writeS7String(String type, String ip, String blockAndOffset, String value) {
        try {
            Boolean success = S7Util.writeString((String)type, (String)ip, (String)blockAndOffset, (String)value, null, null);
            return success;
        }
        catch (Exception e) {
            log.error("writeS7String error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Boolean writeS7Boolean(String type, String ip, String blockAndOffset, Boolean value) {
        try {
            Boolean success = S7Util.writeBoolean((String)type, (String)ip, (String)blockAndOffset, (boolean)value, null, null);
            return success;
        }
        catch (Exception e) {
            log.error("writeS7Boolean error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Boolean writeS7(String type, String ip, int slot, int rack, String dataType, String blockAndOffset, Object value) {
        try {
            Boolean success = S7Util.S7write((String)type, (String)ip, (String)blockAndOffset, (String)dataType, (Object)value, (String)String.valueOf(slot), (String)String.valueOf(rack));
            return success;
        }
        catch (Exception e) {
            log.error("writeS7 error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public Object readS7(String type, String ip, int slot, int rack, String dataType, String blockAndOffset) {
        try {
            return S7Util.S7Read((String)type, (String)ip, (String)blockAndOffset, (String)dataType, (String)String.valueOf(slot), (String)String.valueOf(rack));
        }
        catch (Exception e) {
            log.error("readS7 error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public void MQTTPublish(String topic, String message) {
        try {
            MqttUtil.syncPublish((String)topic, (String)message);
        }
        catch (Exception e) {
            log.error("MQTT Publish error {}", (Object)e.getMessage());
        }
    }

    @HostAccess.Export
    public void MQTTPublish(String message) {
        try {
            MqttUtil.syncPublish((String)message);
        }
        catch (Exception e) {
            log.error("MQTT Publish error {}", (Object)e.getMessage());
        }
    }

    @HostAccess.Export
    public String MQTTSubscribe(String topic) {
        try {
            return JSON.toJSONString((Object)MqttUtil.syncSubscribe((String)topic), (SerializerFeature[])new SerializerFeature[]{SerializerFeature.WriteMapNullValue});
        }
        catch (Exception e) {
            log.error("MQTT Subscribe error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public String MQTTSubscribe() {
        try {
            return JSON.toJSONString((Object)MqttUtil.syncSubscribe(), (SerializerFeature[])new SerializerFeature[]{SerializerFeature.WriteMapNullValue});
        }
        catch (Exception e) {
            log.error("MQTT Subscribe error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public String addDemand(String demandJson) {
        WindDemandTask taskParam = (WindDemandTask)JSONObject.parseObject((String)demandJson, WindDemandTask.class);
        OperatorService operatorService = (OperatorService)SpringUtil.getBean(OperatorService.class);
        WindDemandTask task = new WindDemandTask();
        task.setDefLabel(taskParam.getDefLabel());
        task.setContent(taskParam.getContent());
        task.setCreatedBy(taskParam.getCreatedBy());
        task.setStatus(Integer.valueOf(DemandStatusEnum.created.getStatus()));
        task.setDescription(taskParam.getDescription());
        task.setMenuId(taskParam.getMenuId());
        task.setWorkTypes(taskParam.getWorkTypes());
        task.setWorkStations(taskParam.getWorkStations());
        task.setCreatedOn(new Date());
        task.setAttrList(taskParam.getAttrList());
        operatorService.addDemand(task);
        return task.getId();
    }

    @HostAccess.Export
    public int updateDemandFinishedById(String demandId, String supplementContent, String handler) {
        OperatorService operatorService = (OperatorService)SpringUtil.getBean(OperatorService.class);
        return operatorService.updateDemandFinishedById(demandId, supplementContent, handler);
    }

    @HostAccess.Export
    public int updateDemandFinishedByCreateBy(String createBy, String supplementContent, String handler) {
        OperatorService operatorService = (OperatorService)SpringUtil.getBean(OperatorService.class);
        return operatorService.updateDemandFinishedByCreateBy(createBy, supplementContent, handler);
    }

    @HostAccess.Export
    public String readFileToString(String fileName) {
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        try {
            return FileUtils.readFileToString((File)new File(FilenameUtils.concat((String)propConfig.getRdsScriptDir(), (String)fileName)), (Charset)StandardCharsets.UTF_8);
        }
        catch (Exception e) {
            log.error("read file error {}", (Object)e.getMessage());
            return null;
        }
    }

    @HostAccess.Export
    public String createUuid() {
        return UUID.randomUUID().toString();
    }

    @HostAccess.Export
    public void sendMail(String message) throws Exception {
        try {
            JSONObject msg = JSONObject.parseObject((String)message);
            String to = msg.get((Object)"to").toString();
            String subject = msg.get((Object)"subject").toString();
            String text = msg.get((Object)"text").toString();
            String cc = msg.get((Object)"cc") == null ? "" : msg.get((Object)"cc").toString();
            String bcc = msg.get((Object)"bcc") == null ? "" : msg.get((Object)"bcc").toString();
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setFrom(ConfigFileController.commonConfig.getEmailConfig().getUsername());
            mailMessage.setTo(to);
            mailMessage.setSubject(subject);
            mailMessage.setText(text);
            if (!cc.isBlank()) {
                mailMessage.setCc(cc);
            }
            if (!bcc.isBlank()) {
                mailMessage.setCc(bcc);
            }
            EmailUtil.javaMailSender.send(mailMessage);
        }
        catch (Exception e) {
            log.error("send mail error {}", (Object)e.getMessage());
            throw new Exception(e);
        }
    }

    @HostAccess.Export
    public void sendUserMessage(String level, String messageTitle, String messageBody) {
        try {
            Integer levelInteger = null;
            if ("ERROR".equals(level)) {
                levelInteger = 3;
            }
            if ("WARN".equals(level)) {
                levelInteger = 2;
            }
            if ("INFO".equals(level)) {
                levelInteger = 1;
            }
            UserMessageService UserMessageServiceBean = (UserMessageService)SpringUtil.getBean(UserMessageService.class);
            UserMessageServiceBean.addMessageInfo(messageTitle, messageBody, levelInteger.intValue());
            UserMessageServiceBean.noticeWebWithUserMessageInfo(null);
        }
        catch (Exception e) {
            log.error("write user message error {}", (Throwable)e);
        }
    }

    @HostAccess.Export
    public Boolean sendTcpMessage(String ip, int port, String message) {
        NettyTcpClient bean = (NettyTcpClient)SpringUtil.getBean(NettyTcpClient.class);
        try {
            bean.sendMessage(ip, Integer.valueOf(port), (Object)message);
            return true;
        }
        catch (InterruptedException e) {
            log.error("tcp\u53d1\u9001\u6d88\u606f\u5931\u8d25");
            return null;
        }
    }

    @HostAccess.Export
    public Boolean lock(String key) {
        return ScriptLock.lock((String)key);
    }

    @HostAccess.Export
    public Boolean unLock(String key) {
        return ScriptLock.unLock((String)key);
    }

    @HostAccess.Export
    public boolean setPadLabelByMenuId(String menuId, String label) {
        if (YmlConfigUtil.checkYamlRuntimeMenuPropsUpdate()) {
            CommonConfig commonConfig = ConfigFileController.commonConfig;
            commonConfig.getOperator().getOrders().stream().filter(s1 -> s1.getMenuId().equals(menuId)).forEach(s1 -> s1.setLabel(label));
            return true;
        }
        return false;
    }

    @HostAccess.Export
    public boolean setPadBackgroundByMenuId(String menuId, String background) {
        if (YmlConfigUtil.checkYamlRuntimeMenuPropsUpdate()) {
            CommonConfig commonConfig = ConfigFileController.commonConfig;
            commonConfig.getOperator().getOrders().stream().filter(s1 -> s1.getMenuId().equals(menuId)).forEach(s1 -> s1.setMenuItemBackground(background));
            return true;
        }
        return false;
    }

    @HostAccess.Export
    public boolean setPadDisableByMenuId(String menuId, Boolean disabled) {
        if (YmlConfigUtil.checkYamlRuntimeMenuPropsUpdate()) {
            CommonConfig commonConfig = ConfigFileController.commonConfig;
            commonConfig.getOperator().getOrders().stream().filter(s1 -> s1.getMenuId().equals(menuId)).forEach(s1 -> s1.setDisabled(disabled));
            return true;
        }
        return false;
    }

    @HostAccess.Export
    public String md5Encode(String str) {
        return MD5Utils.MD5((String)str);
    }

    @HostAccess.Export
    public String base64Encode(String str) {
        String result = new String(Base64.getEncoder().encode(str.getBytes()));
        return result;
    }

    @HostAccess.Export
    public String UrBase64Encode(String str) {
        String base64Str = new String(Base64.getEncoder().encode(str.getBytes()));
        String result = URLEncoder.encode(base64Str, StandardCharsets.UTF_8);
        return result;
    }

    @HostAccess.Export
    public String transToPageObj(Long totalCount, Integer currentPage, Integer pageSize, Integer totalPage, String pageList) {
        PaginationResponseVo responseVo = new PaginationResponseVo();
        responseVo.setTotalCount(totalCount);
        responseVo.setCurrentPage(currentPage);
        responseVo.setPageSize(pageSize);
        responseVo.setTotalPage(totalPage);
        responseVo.setPageList((List)JSONArray.parseArray((String)pageList));
        return JSON.toJSONString((Object)responseVo);
    }

    @Deprecated
    public Boolean distributeMarkFull(String loc) {
        log.info("distributeMarkFull location = {}", (Object)loc);
        try {
            HashMap params = Maps.newHashMap();
            params.put("loc", loc);
            params.put("full", true);
            Map result = OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.setFull.getUri()), (String)JSONObject.toJSONString((Object)params));
            if ("200".equals(result.get("code"))) {
                return true;
            }
            return false;
        }
        catch (Exception e) {
            log.error("distributeMarkFull error {}", (Throwable)e);
            return false;
        }
    }

    @HostAccess.Export
    public Boolean distributeMarkFull(String loc, String taskRecordId) {
        log.info("distributeMarkFull location = {}, taskRecordId = {}", (Object)loc, (Object)taskRecordId);
        try {
            HashMap params = Maps.newHashMap();
            params.put("loc", loc);
            params.put("full", true);
            params.put("externalId", taskRecordId);
            Map result = OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.setFull.getUri()), (String)JSONObject.toJSONString((Object)params));
            if ("200".equals(result.get("code"))) {
                return true;
            }
            return false;
        }
        catch (Exception e) {
            log.error("distributeMarkFull error", (Throwable)e);
            return false;
        }
    }

    @Deprecated
    public Boolean distributeMarkNotFull(String loc) {
        log.info("distributeMarkNotFull location = {}", (Object)loc);
        try {
            HashMap params = Maps.newHashMap();
            params.put("loc", loc);
            params.put("full", false);
            Map result = OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.setFull.getUri()), (String)JSONObject.toJSONString((Object)params));
            if ("200".equals(result.get("code"))) {
                return true;
            }
            return false;
        }
        catch (Exception e) {
            log.error("distributeMarkNotFull error {}", (Throwable)e);
            return false;
        }
    }

    @HostAccess.Export
    public Boolean distributeMarkNotFull(String loc, String taskRecordId) {
        log.info("distributeMarkNotFull location = {}, taskRecordId = {}", (Object)loc, (Object)taskRecordId);
        try {
            HashMap params = Maps.newHashMap();
            params.put("loc", loc);
            params.put("full", false);
            params.put("externalId", taskRecordId);
            Map result = OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.setFull.getUri()), (String)JSONObject.toJSONString((Object)params));
            if ("200".equals(result.get("code"))) {
                return true;
            }
            return false;
        }
        catch (Exception e) {
            log.error("distributeMarkNotFull error", (Throwable)e);
            return false;
        }
    }

    @HostAccess.Export
    public Boolean distributeTaskDone(String vehicleId) {
        log.info("distributeTaskDone vehicleId = {}", (Object)vehicleId);
        try {
            Map result = OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.distributeTaskDone.getUri() + "/" + vehicleId), (String)JSONObject.toJSONString((Object)Maps.newHashMap()));
            if ("200".equals(result.get("code"))) {
                return true;
            }
            return false;
        }
        catch (Exception e) {
            log.error("distributeTaskDone error {}", (Throwable)e);
            return false;
        }
    }

    @HostAccess.Export
    public boolean appendToLocList(String taskRecordId, String toLocList, String blockNo) {
        if (StringUtils.isEmpty((CharSequence)taskRecordId) || StringUtils.isEmpty((CharSequence)toLocList)) {
            return false;
        }
        try {
            List distributeBp = this.findDistributeBpOrderId(taskRecordId, blockNo);
            List distributeVos = JSONArray.parseArray((String)toLocList, DistributeVo.class);
            HashMap param = Maps.newHashMap();
            param.put("id", ((WindBlockRecord)distributeBp.get(0)).getOrderId());
            ArrayList<String> additionalToLocList = new ArrayList<String>();
            param.put("additionalToLocList", additionalToLocList);
            ArrayList<HashMap> additionalUnloadPostActionList = new ArrayList<HashMap>();
            param.put("additionalUnloadPostActionList", additionalUnloadPostActionList);
            for (DistributeVo vo : distributeVos) {
                additionalToLocList.add(vo.getToLoc());
                HashMap toLoc = Maps.newHashMap();
                HashMap post = Maps.newHashMap();
                toLoc.put("toLoc", vo.getToLoc());
                post.put("configId", vo.getPostAction());
                toLoc.put("postAction", post);
                additionalUnloadPostActionList.add(toLoc);
            }
            Map map = OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.appendToLocList.getUri()), (String)JSONObject.toJSONString((Object)param));
            String code = (String)map.get("code");
            int reponseCode = Integer.parseInt(code);
            if (reponseCode >= 200 && reponseCode < 300) {
                return true;
            }
        }
        catch (Exception e) {
            log.error("appendToLocList error {}", (Object)e.getMessage());
        }
        return false;
    }

    @HostAccess.Export
    public boolean deleteToLocList(String taskRecordId, String toLocList, String blockNo) {
        if (StringUtils.isEmpty((CharSequence)taskRecordId) || StringUtils.isEmpty((CharSequence)toLocList)) {
            return false;
        }
        try {
            WindBlockRecordMapper windBlockRecordMapper = (WindBlockRecordMapper)SpringUtil.getBean(WindBlockRecordMapper.class);
            List distributeBp = this.findDistributeBpOrderId(taskRecordId, blockNo);
            List distributeVos = JSONArray.parseArray((String)toLocList, String.class);
            HashMap param = Maps.newHashMap();
            param.put("id", ((WindBlockRecord)distributeBp.get(0)).getOrderId());
            param.put("unwantedToLocList", distributeVos);
            Map map = OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.removeFromToLocList.getUri()), (String)JSONObject.toJSONString((Object)param));
            String code = (String)map.get("code");
            int reponseCode = Integer.parseInt(code);
            if (reponseCode >= 200 && reponseCode < 300) {
                return true;
            }
        }
        catch (IOException e) {
            log.error("deleteToLocList error {}", (Object)e.getMessage());
        }
        return false;
    }

    private List<WindBlockRecord> findDistributeBpOrderId(String taskRecordId, String blockNo) {
        WindBlockRecordMapper windBlockRecordMapper = (WindBlockRecordMapper)SpringUtil.getBean(WindBlockRecordMapper.class);
        List blocks = windBlockRecordMapper.findWindBlockRecordByTaskRecordId(taskRecordId);
        return blocks.stream().filter(it -> {
            if (!StringUtils.equals((CharSequence)it.getBlockName(), (CharSequence)"DistributeBp")) {
                return false;
            }
            return !StringUtils.isNotEmpty((CharSequence)blockNo) || StringUtils.equals((CharSequence)("b" + it.getBlockConfigId()), (CharSequence)blockNo);
        }).sorted(Comparator.comparing(WindBlockRecord::getStartedOn).reversed()).collect(Collectors.toList());
    }

    public Boolean setSoftStop(String vehicleId, boolean status) {
        HashMap codeReq = Maps.newHashMap();
        codeReq.put("vehicle", vehicleId);
        codeReq.put("status", status);
        log.info("setSoftStop vehicleId = {}", (Object)codeReq);
        try {
            Map result = OkHttpUtil.postJson((String)(PropConfig.getRdsCoreBaseUrl() + ApiEnum.setSoftStop.getUri()), (String)JSONObject.toJSONString((Object)codeReq));
            if ("200".equals(result.get("code"))) {
                return true;
            }
            return false;
        }
        catch (Exception e) {
            log.error("setSoftStop error", (Throwable)e);
            return false;
        }
    }

    @HostAccess.Export
    public void sendMsgToWscByClientIp(String msg, String ip) throws IOException {
        Map sessionswithIp = WebSocketServer.getSessionsWithIp();
        Session session = (Session)sessionswithIp.get(ip);
        try {
            session.getBasicRemote().sendText(msg);
        }
        catch (IOException e) {
            log.error("Send msg to wsc exception", (Throwable)e);
        }
    }

    @HostAccess.Export
    public void sendMsgToWscByClientName(String msg, String clientName) throws IOException {
        Map sessionsWithClientName = WebSocketServer.getSessionsWithClientName();
        Session session = (Session)sessionsWithClientName.get(clientName);
        try {
            session.getBasicRemote().sendText(msg);
        }
        catch (IOException e) {
            log.error("Send msg to wsc exception", (Throwable)e);
        }
    }

    @HostAccess.Export
    public String getWebsocketClientIp() throws IOException {
        Map sessions = WebSocketServer.getSessionsWithIp();
        ArrayList keys = new ArrayList(sessions.keySet());
        return ((Object)keys).toString();
    }

    @HostAccess.Export
    public String getWebsocketClientName() throws IOException {
        Map sessions = WebSocketServer.getSessionsWithClientName();
        ArrayList keys = new ArrayList(sessions.keySet());
        return ((Object)keys).toString();
    }

    @HostAccess.Export
    public String getChildrenTaskRecordId(String recordId) throws IOException {
        WindService windService = (WindService)SpringUtil.getBean(WindService.class);
        List subTaskRecords = windService.findByParentId(recordId);
        List subTaskIds = subTaskRecords.stream().map(BaseRecord::getId).collect(Collectors.toList());
        return JSONObject.toJSONString(subTaskIds);
    }

    @HostAccess.Export
    public String getScriptValue(String value) {
        WindTaskDefMapper windTaskDefMapper = (WindTaskDefMapper)SpringUtil.getBean(WindTaskDefMapper.class);
        Object ret = null;
        try {
            ConcurrentHashMap concurrentVariablesMap;
            String taskRecordId = (String)((ConcurrentHashMap)RootBp.taskVariablesMap.get()).get(TaskField.taskRecordId);
            String taskId = (String)((ConcurrentHashMap)RootBp.taskVariablesMap.get()).get(TaskField.id);
            HashMap vars = new HashMap();
            if (value.contains(ParamPreField.taskInputs) && ((ConcurrentHashMap)RootBp.inputParamsMap.get()).size() > 0) {
                vars.putAll((Map)RootBp.inputParamsMap.get());
            }
            if (value.contains(ParamPreField.blocks) && ((ConcurrentHashMap)RootBp.outputParamsMap.get()).size() > 0) {
                vars.putAll((Map)RootBp.outputParamsMap.get());
            }
            if (value.contains(ParamPreField.task) && !value.contains(ParamPreField.variables)) {
                WindTaskDef task = windTaskDefMapper.findById((Object)taskId).orElse(null);
                HashMap taskParamsMap = Maps.newHashMap();
                if (task != null) {
                    HashMap paramsMap = Maps.newHashMap();
                    paramsMap.put(TaskField.id, task.getId());
                    paramsMap.put(TaskField.defLabel, task.getLabel());
                    paramsMap.put(TaskField.createdOn, task.getCreateDate());
                    paramsMap.put(TaskField.status, task.getStatus());
                    paramsMap.put(TaskField.taskRecordId, taskRecordId);
                    paramsMap.put(TaskField.priority, RootBp.taskPriority.get(taskRecordId) != null ? (Integer)RootBp.taskPriority.get(taskRecordId) : 1);
                    taskParamsMap.put(ParamPreField.task, paramsMap);
                }
                vars.putAll(taskParamsMap);
            }
            if (value.contains(ParamPreField.task) && value.contains(ParamPreField.variables) && (concurrentVariablesMap = (ConcurrentHashMap)RootBp.taskVariablesMap.get()) != null && concurrentVariablesMap.size() > 0) {
                vars.putAll((Map)RootBp.taskVariablesMap.get());
            }
            ret = MVEL.eval((String)value, vars);
        }
        catch (Exception e) {
            ret = null;
            log.error("getScriptValue error", (Throwable)e);
        }
        return ret.toString();
    }

    @HostAccess.Export
    public String getRoboViewInfo(String name) {
        if (ConfigFileController.commonConfig != null && ConfigFileController.commonConfig.getRoboViews() != null && ConfigFileController.commonConfig.getRoboViews().getEnable().booleanValue() && ConfigFileController.commonConfig.getRoboViews().getRoboViewList() != null) {
            List roboViewList = ConfigFileController.commonConfig.getRoboViews().getRoboViewList();
            RoboView roboViewConfig = null;
            for (RoboView roboView : roboViewList) {
                if (!UpdateSiteScopeEnum.NONE.equals((Object)roboView.getUpdateSitesBy()) && roboView.getAutoUpdateSiteContent().booleanValue() || !StringUtils.equals((CharSequence)roboView.getName(), (CharSequence)name)) continue;
                roboViewConfig = roboView;
                break;
            }
            if (roboViewConfig == null) {
                log.info("no roboview config name is {}", (Object)name);
                return null;
            }
            String res = RoboViewServer.getRoboViewInfo(roboViewConfig);
            if (StringUtils.isEmpty((CharSequence)res)) {
                return null;
            }
            StorageVo storageVo = (StorageVo)JSONObject.parseObject((String)res, StorageVo.class);
            return CollectionUtils.isNotEmpty((Collection)storageVo.getStatus()) ? JSONObject.toJSONString((Object)storageVo.getStatus()) : JSONObject.toJSONString((Object)CollectionUtils.EMPTY_COLLECTION);
        }
        log.info("no roboview config");
        return null;
    }

    @HostAccess.Export
    public boolean releaseWaitPass(List<String> agvIds) throws IOException {
        log.info("releaseWaitPass params = {}", agvIds);
        ArrayList<WindDataCacheSplit> caches = new ArrayList<WindDataCacheSplit>();
        try {
            Object windService;
            if (CacheDataBp.cacheMap == null || CacheDataBp.cacheMap.size() == 0) {
                ConcurrentHashMap dataCache;
                windService = (WindService)SpringUtil.getBean(WindService.class);
                CacheDataBp.cacheMap = dataCache = windService.getDataCache();
            }
            for (String agvId : agvIds) {
                CacheDataBp.cacheMap.put("waitPass_" + agvId, "true");
                caches.add(new WindDataCacheSplit("waitPass_" + agvId, "true", new Date(), Integer.valueOf(1)));
            }
            windService = (WindService)SpringUtil.getBean(WindService.class);
            windService.dataCacheAll(caches);
            return true;
        }
        catch (Exception e) {
            log.error("releaseWaitPass error {}", (Object)e.getMessage());
            return false;
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @HostAccess.Export
    public void withFairnessLock(String lockName, boolean fair, Runnable action) {
        ReentrantLock lock = JavaBridge.getWithLock((String)lockName, (boolean)fair);
        lock.lock();
        try {
            action.run();
        }
        finally {
            lock.unlock();
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private static ReentrantLock getWithLock(String lockName, boolean fair) {
        Object object = lock;
        synchronized (object) {
            ReentrantLock lock = (ReentrantLock)lockMap.get(lockName);
            if (lock == null || lock.isFair() != fair) {
                lock = new ReentrantLock(fair);
                lockMap.put(lockName, lock);
            }
            return lock;
        }
    }
}

