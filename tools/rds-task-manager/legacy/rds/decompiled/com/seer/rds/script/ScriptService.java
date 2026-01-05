/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Lists
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.config.configview.DebugConfigOfView
 *  com.seer.rds.constant.AlarmExceptionTypeEnum
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.ScriptEnum
 *  com.seer.rds.dao.ScriptFileMapper
 *  com.seer.rds.dao.SysAlarmMapper
 *  com.seer.rds.exception.GlobalHttpException
 *  com.seer.rds.exception.ScriptException
 *  com.seer.rds.exception.ServiceException
 *  com.seer.rds.model.admin.SysAlarm
 *  com.seer.rds.model.script.ScriptFile
 *  com.seer.rds.runnable.SerialScheduledExecutorService
 *  com.seer.rds.script.JavaBridge
 *  com.seer.rds.script.ScriptService
 *  com.seer.rds.service.admin.SysAlarmService
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.tcp.NettyTcpServer
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.util.ResourceUtil
 *  com.seer.rds.util.TemplateUtil
 *  com.seer.rds.util.WebToolUtils
 *  com.seer.rds.vo.ExcelExportVo
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.ScriptApi
 *  com.seer.rds.vo.ScriptButton
 *  com.seer.rds.vo.req.ScriptRunReq
 *  com.seer.rds.web.config.ConfigFileController
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.graalvm.polyglot.Context
 *  org.graalvm.polyglot.Source
 *  org.graalvm.polyglot.Value
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.boot.CommandLineRunner
 *  org.springframework.core.annotation.Order
 *  org.springframework.http.HttpStatus
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.script;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.seer.rds.config.PropConfig;
import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.config.configview.DebugConfigOfView;
import com.seer.rds.constant.AlarmExceptionTypeEnum;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.ScriptEnum;
import com.seer.rds.dao.ScriptFileMapper;
import com.seer.rds.dao.SysAlarmMapper;
import com.seer.rds.exception.GlobalHttpException;
import com.seer.rds.exception.ScriptException;
import com.seer.rds.exception.ServiceException;
import com.seer.rds.model.admin.SysAlarm;
import com.seer.rds.model.script.ScriptFile;
import com.seer.rds.runnable.SerialScheduledExecutorService;
import com.seer.rds.script.JavaBridge;
import com.seer.rds.service.admin.SysAlarmService;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.tcp.NettyTcpServer;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.util.ResourceUtil;
import com.seer.rds.util.TemplateUtil;
import com.seer.rds.util.WebToolUtils;
import com.seer.rds.vo.ExcelExportVo;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.ScriptApi;
import com.seer.rds.vo.ScriptButton;
import com.seer.rds.vo.req.ScriptRunReq;
import com.seer.rds.web.config.ConfigFileController;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Source;
import org.graalvm.polyglot.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/*
 * Exception performing whole class analysis ignored.
 */
@Component
@Order(value=1)
public class ScriptService
implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(ScriptService.class);
    @Autowired
    private PropConfig propConfig;
    private String debugUrl;
    private static List<Source> sources = Lists.newCopyOnWriteArrayList();
    private static HashMap<String, List<Source>> sourcesMap = Maps.newHashMap();
    public static List<ScriptApi> scriptApiList = Lists.newCopyOnWriteArrayList();
    public static HashMap<String, List<ScriptApi>> scriptApiListMap = Maps.newHashMap();
    public static List<ScriptRunReq> scriptFuncList = Lists.newCopyOnWriteArrayList();
    public static HashMap<String, List<ScriptRunReq>> scriptFuncListMap = Maps.newHashMap();
    public static List<ScriptButton> ScriptButtonList = Lists.newCopyOnWriteArrayList();
    public static HashMap<String, List<ScriptButton>> ScriptButtonListMap = Maps.newHashMap();
    public static List<String> taskEventFunctionList = Lists.newCopyOnWriteArrayList();
    public static HashMap<String, List<String>> taskEventFunctionListMap = Maps.newHashMap();
    public static List<String> initDataFunctionList = Lists.newCopyOnWriteArrayList();
    public static HashMap<String, List<String>> initDataFunctionListMap = Maps.newHashMap();
    public static List<Integer> initTcpPort = Lists.newCopyOnWriteArrayList();
    public static HashMap<String, List<Integer>> initTcpPortMap = Maps.newHashMap();
    public static String onIdocReceivedFunction = "onIdocReceivedFunction";
    private static Context debugContext;
    private SerialScheduledExecutorService executorService = null;
    private Object scheduleScriptJsLock = new Object();
    @Autowired
    private SysAlarmMapper sysAlarmMapper;
    @Autowired
    private SysAlarmService sysAlarmService;
    @Autowired
    private NettyTcpServer nettyTcpServer;
    @Autowired
    private ScriptFileMapper scriptFileMapper;
    static final ReentrantLock jsContextLock;
    private static final String jsIdentifier = "jj";
    public static final String jsLangId = "js";
    public static final String jsRootFile = "boot";
    private static HashMap<String, List<ScheduledFuture>> scheduledFuturesMap;
    @Autowired
    LocaleMessageUtil localeMessageUtil;

    public void run(String ... args) throws Exception {
        this.insertDefaultData();
        this.init();
    }

    public void boot() {
        this.init();
        this.resetScriptLog();
    }

    public void init() {
        try {
            this.initSources();
            this.initDebugContext();
            this.initJSBoot();
        }
        catch (Exception e) {
            log.error("script init error {}", (Throwable)e);
        }
    }

    public void fileStart(String folderName) throws Exception {
        this.readSources(folderName, this.absolutePath(folderName));
        this.initDebugContext();
        try {
            if (this.initFolderNameBoot(folderName) > 0) {
                this.sysAlarmService.deleteScriptNoticeAlarm();
            }
        }
        catch (Exception e) {
            throw new ServiceException(CommonCodeEnum.SCRIPT_INIT_ERROR.getCode().intValue(), folderName + " Script Error:" + e.getMessage());
        }
        this.initFolderNameScheduled(folderName);
        this.resetScriptLog();
    }

    public void fileStop(String folderName) {
        List scheduledFutures = (List)scheduledFuturesMap.get(folderName);
        if (CollectionUtils.isNotEmpty((Collection)scheduledFutures)) {
            scheduledFutures.stream().forEach(it -> it.cancel(false));
        }
        sourcesMap.remove(folderName);
        scriptApiListMap.remove(folderName);
        scriptFuncListMap.remove(folderName);
        ScriptButtonListMap.remove(folderName);
        taskEventFunctionListMap.remove(folderName);
        initDataFunctionListMap.remove(folderName);
        initTcpPortMap.remove(folderName);
        scheduledFuturesMap.remove(folderName);
        this.resetScriptLog();
        if (PropConfig.ifDebug()) {
            try {
                debugContext.close(true);
            }
            catch (IllegalStateException e) {
                throw new GlobalHttpException(CommonCodeEnum.ERROR.getCode().intValue(), this.localeMessageUtil.getMessage("script.debug.error"));
            }
        }
    }

    public String getUrl() {
        return this.debugUrl;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public String execute(AbstratRootBp rootBp, String taskRecordId, String functionName, Object args) {
        Context commonContext = null;
        try {
            String result;
            commonContext = this.initContext(ScriptService.getFunFolderName((String)functionName));
            AbstratRootBp abstratRootBp = rootBp;
            synchronized (abstratRootBp) {
                ArrayList<Context> contexts = (ArrayList<Context>)RootBp.contextMap.get(taskRecordId);
                if (contexts == null) {
                    contexts = new ArrayList<Context>();
                }
                contexts.add(commonContext);
                RootBp.contextMap.put(taskRecordId, contexts);
            }
            String string = result = ScriptService.execute((Context)commonContext, (String)functionName, (Object)args);
            return string;
        }
        finally {
            ScriptService.closeContext((String)taskRecordId, (Context)commonContext, (String)"fun execute....");
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public String execute(String functionName, Object args) {
        Context commonContext = null;
        try {
            String result;
            commonContext = this.initContext(ScriptService.getFunFolderName((String)functionName));
            String string = result = ScriptService.execute((Context)commonContext, (String)functionName, (Object)args);
            return string;
        }
        finally {
            ScriptService.closeContext((Context)commonContext, (String)"fun execute....");
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public String execute(String folderName, String functionName, Object args) {
        Context commonContext = null;
        try {
            String result;
            commonContext = this.initContext(folderName);
            String string = result = ScriptService.execute((Context)commonContext, (String)functionName, (Object)args);
            return string;
        }
        finally {
            ScriptService.closeContext((Context)commonContext, (String)"fun execute....");
        }
    }

    public static void closeContext(Context context, String remake) {
        if (context != null && !PropConfig.ifDebug()) {
            try {
                context.close();
            }
            catch (Exception e) {
                log.error("Close Context Error {}, remake {}", (Object)e, (Object)remake);
            }
        }
    }

    private static void closeContext(String taskRecordId, Context context, String remake) {
        if (context != null && !PropConfig.ifDebug()) {
            try {
                context.close();
                List contexts = (List)RootBp.contextMap.get(taskRecordId);
                if (CollectionUtils.isNotEmpty((Collection)contexts) && contexts.contains(context)) {
                    contexts.remove(context);
                }
            }
            catch (Exception e) {
                log.error("Close Context Error {}, remake {}", (Object)e, (Object)remake);
            }
        }
    }

    public static void closeContextForced(Context context, String remake) {
        if (context != null && !PropConfig.ifDebug()) {
            try {
                context.close(true);
            }
            catch (Exception e) {
                log.error("Close Context Forced Error {}, remake {}", (Object)e, (Object)remake);
            }
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public ResultVo dispatcherWildCard(String method, String path, String args, Map<String, String[]> queryParams) throws Exception {
        if (scriptApiListMap.isEmpty()) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SCRIPT_FUNC_NON);
        }
        String[] pathSplit = path.split("/");
        String pattern = "\\{[\\s\\S]+}";
        List<Object> collect = new ArrayList();
        Object folderName = "";
        Set keys = scriptApiListMap.keySet();
        for (Object key : keys) {
            collect = ((List)scriptApiListMap.get(key)).stream().filter(scriptApi -> {
                if (scriptApi.getAuth().booleanValue()) {
                    return false;
                }
                if (!method.toUpperCase().equals(scriptApi.getMethod().toUpperCase())) {
                    return false;
                }
                String[] urlSplit = scriptApi.getPath().split("\\?");
                if (urlSplit.length == 1 && urlSplit.length == 2) {
                    return false;
                }
                String[] apiSplit = urlSplit[0].split("/");
                if (apiSplit.length != pathSplit.length) {
                    return false;
                }
                for (int i = 0; i < pathSplit.length; ++i) {
                    if (apiSplit[i].matches(pattern) || apiSplit[i].equals(pathSplit[i]) || "l2-operator".equals(pathSplit[i]) && "operator".equals(apiSplit[i]) || "operator".equals(pathSplit[i]) && "l2-operator".equals(apiSplit[i])) continue;
                    return false;
                }
                return true;
            }).collect(Collectors.toList());
            if (collect.isEmpty()) continue;
            folderName = key;
            break;
        }
        if (collect.isEmpty()) {
            return null;
        }
        JSONObject scriptApiUrlParameter = new JSONObject();
        for (String key : queryParams.keySet()) {
            scriptApiUrlParameter.put(key, (Object)queryParams.get(key));
        }
        String[] split = ((ScriptApi)collect.get(0)).getPath().split("/");
        for (int i = 0; i < pathSplit.length; ++i) {
            if (!split[i].matches(pattern)) continue;
            scriptApiUrlParameter.put(split[i].substring(1, split[i].length() - 1), (Object)pathSplit[i]);
        }
        Context commonContext = this.initContext((String)folderName);
        Value member = ScriptService.getContextMember((Context)commonContext, (String)((ScriptApi)collect.get(0)).getFunctionName());
        Value result = ScriptService.executeJs((Value)member, (Object[])new Object[]{args, JSON.toJSONString((Object)scriptApiUrlParameter)});
        try {
            if (PropConfig.ifDebug()) {
                jsContextLock.lock();
                commonContext.enter();
            }
            String body = result.hasMember("body") ? result.getMember("body").asString() : null;
            int code = result.hasMember("code") ? result.getMember("code").asInt() : HttpStatus.OK.value();
            ResultVo resultVo = ResultVo.builder().code(Integer.valueOf(code)).data((Object)body).build();
            return resultVo;
        }
        finally {
            ScriptService.closeContext((Context)commonContext, (String)"fun dispatcherWildCard...");
            if (PropConfig.ifDebug()) {
                commonContext.leave();
                jsContextLock.unlock();
            }
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public ExcelExportVo dispatcherExport(String method, String args, String folderName) {
        Context commonContext = null;
        try {
            commonContext = this.initContext(folderName);
            Value js = ScriptService.getContextValue((Context)commonContext);
            Value result = ScriptService.executeMethodJs((Value)js, (String)method, (Object[])new Object[]{args});
            String excelName = "";
            String headMapStr = "";
            String dataListStr = "";
            try {
                if (PropConfig.ifDebug()) {
                    jsContextLock.lock();
                    debugContext.enter();
                }
                excelName = result.getMember("fileName").toString();
                headMapStr = result.getMember("headMap").toString();
                dataListStr = result.getMember("dataList").toString();
            }
            finally {
                if (PropConfig.ifDebug()) {
                    debugContext.leave();
                    jsContextLock.unlock();
                }
            }
            LinkedHashMap headMap = (LinkedHashMap)JSON.parseObject((String)headMapStr, LinkedHashMap.class);
            ArrayList dataList = new ArrayList();
            List originDataList = JSONArray.parseArray((String)dataListStr, String.class);
            for (String originDataObj : originDataList) {
                JSONObject unSortMap = JSON.parseObject((String)originDataObj);
                LinkedHashMap dataMap = new LinkedHashMap();
                Set keySet = headMap.keySet();
                for (String key : keySet) {
                    dataMap.put(key, unSortMap.get(key));
                }
                dataList.add(dataMap);
            }
            ExcelExportVo vo = new ExcelExportVo();
            vo.setFileName(excelName);
            vo.setHeadMap((Map)headMap);
            vo.setDataList(dataList);
            ExcelExportVo excelExportVo = vo;
            return excelExportVo;
        }
        finally {
            ScriptService.closeContext((Context)commonContext, (String)"fun dispatcherExport...");
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public JSONObject executeFunctionGetJsonObject(String folderName, String functionName, Object ... args) {
        Context commonContext = null;
        try {
            JSONObject jsonObject;
            commonContext = this.initContext(folderName);
            Value result = this.executeFunctionGetValue(commonContext, functionName, args);
            Object as = result.as(Object.class);
            JSONObject jSONObject = jsonObject = JSONObject.parseObject((String)JSONObject.toJSONString((Object)as));
            return jSONObject;
        }
        finally {
            ScriptService.closeContext((Context)commonContext, (String)"fun executeFunctionGetJsonObject....");
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public JSONObject executeFunction(String functionName, Object ... args) {
        Context commonContext = null;
        try {
            JSONObject jsonObject;
            commonContext = this.initContext(ScriptService.getFunFolderName((String)functionName));
            Value result = this.executeFunctionGetValue(commonContext, functionName, args);
            Object as = result.as(Object.class);
            JSONObject jSONObject = jsonObject = JSONObject.parseObject((String)JSONObject.toJSONString((Object)as));
            return jSONObject;
        }
        finally {
            ScriptService.closeContext((Context)commonContext, (String)"fun executeFunctionGetJsonObject....");
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public String executeFunctionGetString(String functionName, Object ... args) {
        Context commonContext = null;
        try {
            String as;
            commonContext = this.initContext(ScriptService.getFunFolderName((String)functionName));
            Value result = this.executeFunctionGetValue(commonContext, functionName, args);
            String string = as = (String)result.as(String.class);
            return string;
        }
        finally {
            ScriptService.closeContext((Context)commonContext, (String)"fun executeFunctionGetString....");
        }
    }

    private Value executeFunctionGetValue(Context context, String functionName, Object ... args) {
        Value js = ScriptService.getContextMember((Context)context, (String)functionName);
        return ScriptService.executeJs((Value)js, (Object[])args);
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private static Value executeMethodJs(Value value, String method, Object ... args) {
        if (PropConfig.ifDebug()) {
            jsContextLock.lock();
            try {
                Value result;
                debugContext.enter();
                Value member = value.getMember(ScriptService.getfunName((String)method));
                Value value2 = result = member.execute(args);
                return value2;
            }
            finally {
                debugContext.leave();
                jsContextLock.unlock();
            }
        }
        Value member = value.getMember(ScriptService.getfunName((String)method));
        Value result = member.execute(args);
        return result;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private static String execute(Context context, String functionName, Object args) {
        Value js = ScriptService.getContextMember((Context)context, (String)functionName);
        Value result = ScriptService.executeJs((Value)js, (Object[])new Object[]{args});
        try {
            if (PropConfig.ifDebug()) {
                context.enter();
                jsContextLock.lock();
            }
            if (result != null && result.hasMember("result")) {
                String string = result.getMember("result").asString();
                return string;
            }
            String string = null;
            return string;
        }
        finally {
            if (PropConfig.ifDebug()) {
                context.leave();
                jsContextLock.unlock();
            }
        }
    }

    private void insertDefaultData() {
        try {
            this.sysAlarmMapper.deleteByCode(CommonCodeEnum.SCRIPT_INIT_ERROR.getCode());
            ScriptFile scriptFileByFileName = this.scriptFileMapper.findScriptFileByFolderName("boot");
            if (scriptFileByFileName != null) {
                List ss = this.scriptFileMapper.findAll();
                List enable = ss.stream().filter(it -> it.getEnable().intValue() == ScriptEnum.ENABLED.getStatus()).collect(Collectors.toList());
                List debugEnables = ss.stream().filter(it -> it.getDebugEnable().intValue() == ScriptEnum.ENABLED.getStatus()).collect(Collectors.toList());
                if (CollectionUtils.isEmpty(debugEnables)) {
                    scriptFileByFileName.setDebugEnable(Integer.valueOf(ScriptEnum.ENABLED.getStatus()));
                }
                if (CollectionUtils.isEmpty(enable)) {
                    scriptFileByFileName.setEnable(Integer.valueOf(ScriptEnum.ENABLED.getStatus()));
                }
                if (CollectionUtils.isEmpty(enable) || CollectionUtils.isEmpty(debugEnables)) {
                    this.scriptFileMapper.save((Object)scriptFileByFileName);
                }
                return;
            }
            ScriptFile scriptFile = new ScriptFile();
            scriptFile.setFolderName("boot");
            scriptFile.setCreateTime(new Date());
            scriptFile.setDebugEnable(Integer.valueOf(ScriptEnum.ENABLED.getStatus()));
            scriptFile.setEnable(Integer.valueOf(ScriptEnum.ENABLED.getStatus()));
            this.scriptFileMapper.save((Object)scriptFile);
        }
        catch (Exception e) {
            log.error("script fileName insertDefaultData error {}", (Throwable)e);
        }
    }

    private void initSources() {
        String dir = TemplateUtil.getTemplateDirByIfEnable();
        List allByEnable = new ArrayList();
        log.info("script dir:" + dir);
        String folderName = "boot";
        if (PropConfig.ifDebug()) {
            if (StringUtils.equals((CharSequence)this.propConfig.getRdsScriptDir(), (CharSequence)dir) && !(allByEnable = this.scriptFileMapper.findAllByDebugEnable(ScriptEnum.ENABLED.getStatus())).isEmpty()) {
                dir = this.absolutePath(((ScriptFile)allByEnable.get(0)).getFolderName());
                folderName = ((ScriptFile)allByEnable.get(0)).getFolderName();
            }
        } else if (StringUtils.equals((CharSequence)this.propConfig.getRdsScriptDir(), (CharSequence)dir)) {
            allByEnable = this.scriptFileMapper.findAllByEnable(ScriptEnum.ENABLED.getStatus());
            for (ScriptFile scriptFile : allByEnable) {
                String tmpFileStr = StringUtils.equals((CharSequence)scriptFile.getFolderName(), (CharSequence)"boot") ? dir : this.absolutePath(scriptFile.getFolderName());
                this.readSources(scriptFile.getFolderName(), tmpFileStr);
            }
            return;
        }
        this.readSources(folderName, dir);
    }

    private void readSources(String fileName, String dir) {
        sourcesMap.remove(fileName);
        List scriptStrings = ResourceUtil.readFileToString((String)dir, (String)".js");
        List scriptNames = ResourceUtil.readFileNames((String)dir, (String)".js");
        try {
            CopyOnWriteArrayList sources = Lists.newCopyOnWriteArrayList();
            for (int i = 0; i < scriptStrings.size(); ++i) {
                Source source = Source.newBuilder((String)"js", (CharSequence)((CharSequence)scriptStrings.get(i)), (String)((String)scriptNames.get(i))).build();
                sources.add(source);
            }
            sourcesMap.put(fileName, sources);
        }
        catch (IOException e) {
            log.error("Script load filePath {} error {}.", (Object)dir, (Object)e);
        }
    }

    private void initJSBoot() {
        Set fileNameKeys = sourcesMap.keySet();
        for (String fileNameKey : fileNameKeys) {
            try {
                this.initFolderNameBoot(fileNameKey);
            }
            catch (Exception exception) {
                // empty catch block
            }
            this.initFolderNameScheduled(fileNameKey);
        }
    }

    private int initFolderNameBoot(String folderName) throws Exception {
        int deleteAlarm = 0;
        Context commonContext = null;
        try {
            commonContext = this.initContext(folderName);
            Value js = ScriptService.getContextValue((Context)commonContext);
            if (!js.hasMember("jj")) {
                log.error("JavaBridge is not binded folderName = {}", (Object)folderName);
                int n = deleteAlarm = this.sysAlarmMapper.deleteSysAlarmsByCodeAndMessageIsLike(CommonCodeEnum.SCRIPT_INIT_ERROR.getCode().intValue(), folderName + "%");
                return n;
            }
            scriptApiList.clear();
            scriptFuncList.clear();
            ScriptButtonList.clear();
            taskEventFunctionList.clear();
            initDataFunctionList.clear();
            initTcpPort.clear();
            if (!js.hasMember("boot")) {
                log.error("no boot function defined folderName = {}", (Object)folderName);
                int n = deleteAlarm = this.sysAlarmMapper.deleteSysAlarmsByCodeAndMessageIsLike(CommonCodeEnum.SCRIPT_INIT_ERROR.getCode().intValue(), folderName + "%");
                return n;
            }
            js.getMember("boot").execute(new Object[0]);
            scriptApiListMap.put(folderName, JSONObject.parseArray((String)JSON.toJSONString((Object)scriptApiList), ScriptApi.class));
            scriptFuncListMap.put(folderName, JSONObject.parseArray((String)JSON.toJSONString((Object)scriptFuncList), ScriptRunReq.class));
            ScriptButtonListMap.put(folderName, JSONObject.parseArray((String)JSON.toJSONString((Object)ScriptButtonList), ScriptButton.class));
            taskEventFunctionListMap.put(folderName, JSONObject.parseArray((String)JSON.toJSONString((Object)taskEventFunctionList), String.class));
            initDataFunctionListMap.put(folderName, JSONObject.parseArray((String)JSON.toJSONString((Object)initDataFunctionList), String.class));
            initTcpPortMap.put(folderName, JSONObject.parseArray((String)JSON.toJSONString((Object)initTcpPort), Integer.class));
            for (String functionName : initDataFunctionList) {
                Value initDataValue = ScriptService.getContextMember((Context)commonContext, (String)functionName);
                ScriptService.executeJs((Value)initDataValue);
            }
            for (Integer port : initTcpPort) {
                this.nettyTcpServer.start(port);
            }
            int n = deleteAlarm = this.sysAlarmMapper.deleteSysAlarmsByCodeAndMessageIsLike(CommonCodeEnum.SCRIPT_INIT_ERROR.getCode().intValue(), folderName + "%");
            return n;
        }
        catch (Exception e) {
            log.error("\u811a\u672c\u4ee3\u7801\u6821\u9a8c\u9519\u8bef\uff1a{}", (Object)e.getMessage());
            List alarms = this.sysAlarmMapper.findByCode(CommonCodeEnum.SCRIPT_INIT_ERROR.getCode());
            String msg = String.format("%s Script Error: %s", folderName, e.getMessage()).trim();
            SysAlarm tmp = null;
            for (SysAlarm alarm : alarms) {
                if (!alarm.getMessage().startsWith(folderName)) continue;
                tmp = alarm;
                break;
            }
            if (tmp == null) {
                this.sysAlarmService.addAlarmInfo(CommonCodeEnum.SCRIPT_INIT_ERROR.getCode().intValue(), AlarmExceptionTypeEnum.ERROR.getStatus(), msg);
            } else {
                tmp.setMessage(msg);
                this.sysAlarmMapper.save(tmp);
            }
            throw e;
        }
        finally {
            ScriptService.closeContext((Context)commonContext, (String)(folderName + " fun initJSData..."));
        }
    }

    private void initFolderNameScheduled(String folderName) {
        if (this.executorService == null && !scriptFuncList.isEmpty()) {
            SerialScheduledExecutorService scheduledExecutorService;
            this.executorService = scheduledExecutorService = new SerialScheduledExecutorService(50);
        }
        ArrayList<ScheduledFuture> tmp = new ArrayList<ScheduledFuture>();
        for (ScriptRunReq scriptRunner : scriptFuncList) {
            ScheduledFuture scheduledFuture;
            Object args;
            String functionName;
            if (scriptRunner.getIsParallel().booleanValue()) {
                functionName = scriptRunner.getFunctionName();
                args = scriptRunner.getArgs();
                scheduledFuture = this.executorService.scheduleAtFixedRate((Runnable)new /* Unavailable Anonymous Inner Class!! */, scriptRunner.getDelay(), scriptRunner.getPeriod(), TimeUnit.MILLISECONDS);
            } else {
                functionName = scriptRunner.getFunctionName();
                args = scriptRunner.getArgs();
                scheduledFuture = this.executorService.scheduleAtFixedRateSerially(functionName, (Runnable)new /* Unavailable Anonymous Inner Class!! */, scriptRunner.getDelay(), scriptRunner.getPeriod(), TimeUnit.MILLISECONDS);
            }
            if (scheduledFuture == null) continue;
            tmp.add(scheduledFuture);
        }
        scheduledFuturesMap.put(folderName, tmp);
    }

    private Context initContext(String folderName) {
        if (PropConfig.ifDebug()) {
            return debugContext;
        }
        Context context = Context.newBuilder((String[])new String[]{"js"}).allowAllAccess(true).allowCreateThread(true).allowCreateProcess(true).allowIO(true).build();
        this.bindJavaBridge(context, folderName);
        return context;
    }

    private static Value getContextValue(Context context) {
        if (PropConfig.ifDebug()) {
            jsContextLock.lock();
            try {
                Value value;
                context.enter();
                Value value2 = value = context.getBindings("js");
                return value2;
            }
            catch (Exception e) {
                log.error("getContextValue error.", (Throwable)e);
            }
            finally {
                context.leave();
                jsContextLock.unlock();
            }
        } else {
            return context.getBindings("js");
        }
        return null;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private static Value getContextMember(Context context, String function) {
        if (PropConfig.ifDebug()) {
            jsContextLock.lock();
            try {
                Value value;
                context.enter();
                Value value2 = value = context.getBindings("js").getMember(ScriptService.getfunName((String)function));
                return value2;
            }
            catch (Exception e) {
                log.error("getContextMember error.", (Throwable)e);
            }
            finally {
                context.leave();
                jsContextLock.unlock();
            }
        } else {
            return context.getBindings("js").getMember(ScriptService.getfunName((String)function));
        }
        return null;
    }

    private static Value executeJs(Value value) {
        if (PropConfig.ifDebug()) {
            jsContextLock.lock();
            try {
                debugContext.enter();
                Value value2 = value.execute(new Object[0]);
                return value2;
            }
            catch (Exception e) {
                log.error("executeJs error.", (Throwable)e);
            }
            finally {
                debugContext.leave();
                jsContextLock.unlock();
            }
        } else {
            return value.execute(new Object[0]);
        }
        return null;
    }

    private static Value executeJs(Value value, Object ... args) {
        if (PropConfig.ifDebug()) {
            jsContextLock.lock();
            try {
                debugContext.enter();
                if (args == null) {
                    Value value2 = value.execute(new Object[0]);
                    return value2;
                }
                Value value3 = value.execute(args);
                return value3;
            }
            finally {
                debugContext.leave();
                jsContextLock.unlock();
            }
        }
        if (args == null) {
            return value.execute(new Object[0]);
        }
        return value.execute(args);
    }

    private void initDebugContext() {
        String url;
        if (!PropConfig.ifDebug()) {
            return;
        }
        if (debugContext != null) {
            debugContext.close(true);
            debugContext = null;
        }
        String localIP = null;
        String port = "9292";
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        DebugConfigOfView debug = commonConfig.getDebug();
        try {
            localIP = WebToolUtils.getLocalIP();
        }
        catch (Exception e) {
            log.error("Get local ip failed.", (Throwable)e);
        }
        if (StringUtils.isNotEmpty((CharSequence)debug.getFixedIp())) {
            localIP = debug.getFixedIp();
        }
        if (debug.getPort() != null) {
            port = debug.getPort();
        }
        String path = "debug";
        debugContext = Context.newBuilder((String[])new String[]{"js"}).allowAllAccess(true).allowCreateThread(true).allowCreateProcess(true).allowIO(true).option("inspect.Suspend", "false").option("inspect", localIP + ":" + port).option("inspect.Path", path).option("inspect.Secure", "false").build();
        String domainName = debug.getDomainName();
        if (StringUtils.isNotEmpty((CharSequence)domainName)) {
            localIP = domainName;
        }
        this.debugUrl = url = String.format("devtools://devtools/bundled/js_app.html?ws=%s:%s/%s", localIP, port, path);
        log.info("Script debug url: {}", (Object)this.debugUrl);
        String dir = TemplateUtil.getTemplateDirByIfEnable();
        String fileName = "boot";
        if (StringUtils.equals((CharSequence)this.propConfig.getRdsScriptDir(), (CharSequence)dir)) {
            List debugs = this.scriptFileMapper.findAllByDebugEnable(0);
            fileName = debugs.isEmpty() ? "boot" : ((ScriptFile)debugs.get(0)).getFolderName();
        }
        this.bindJavaBridge(debugContext, fileName);
    }

    private void bindJavaBridge(Context context, String folderName) {
        ScriptService.jsPutMember((Context)context, (String)"jj", (Object)new JavaBridge());
        List tmp = (List)sourcesMap.get(folderName);
        if (CollectionUtils.isEmpty((Collection)tmp)) {
            log.error("Project [{}] not started", (Object)folderName);
            throw new ScriptException(CommonCodeEnum.SCRIPT_BOOT_DISENABLE.getCode().intValue(), String.format("Project [%s] not started", folderName));
        }
        for (Source source : tmp) {
            ScriptService.evalJsSource((Context)context, (Source)source);
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private static void jsPutMember(Context context, String id, Object obj) {
        if (PropConfig.ifDebug()) {
            jsContextLock.lock();
            try {
                context.enter();
                Value value = context.getBindings("js");
                value.putMember(id, obj);
            }
            catch (Exception e) {
                log.error("jsPutMember error.", (Throwable)e);
            }
            finally {
                context.leave();
                jsContextLock.unlock();
            }
        } else {
            Value value = context.getBindings("js");
            value.putMember(id, obj);
        }
    }

    private static void evalJsSource(Context context, Source jsSource) {
        if (PropConfig.ifDebug()) {
            jsContextLock.lock();
            try {
                context.enter();
                context.eval(jsSource);
            }
            finally {
                context.leave();
                jsContextLock.unlock();
            }
        } else {
            context.eval(jsSource);
        }
    }

    private String absolutePath(String folderName) {
        return StringUtils.equals((CharSequence)"boot", (CharSequence)folderName) ? this.propConfig.getRdsScriptDir() : this.propConfig.getRdsScriptDir() + folderName + "/";
    }

    private static String getFunFolderName(String functionName) {
        String[] split;
        if (StringUtils.isEmpty((CharSequence)functionName)) {
            return "boot";
        }
        if (functionName.trim().startsWith("boot") && (split = functionName.split("\\.")).length >= 2) {
            return split[1];
        }
        return "boot";
    }

    private static String getfunName(String functionName) {
        String[] split;
        if (StringUtils.isEmpty((CharSequence)functionName)) {
            return functionName;
        }
        if (functionName.trim().startsWith("boot") && (split = functionName.split("\\.")).length >= 2) {
            return String.join((CharSequence)".", Arrays.copyOfRange(split, 2, split.length));
        }
        return functionName;
    }

    public void resetScriptLog() {
        JavaBridge.sendScriptLog = true;
        JavaBridge.lastMinute = -1;
        JavaBridge.lastCount = 0;
    }

    static {
        jsContextLock = new ReentrantLock();
        scheduledFuturesMap = Maps.newHashMap();
    }
}

