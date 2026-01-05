/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.dao.ScriptFileMapper
 *  com.seer.rds.dao.WindTaskDefHistoryMapper
 *  com.seer.rds.model.script.ScriptFile
 *  com.seer.rds.model.wind.WindTaskDefHistory
 *  com.seer.rds.service.agv.InterfaceService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.util.ZipUtils
 *  com.seer.rds.web.config.ConfigFileController
 *  com.seer.rds.web.config.ExportZipController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.servlet.ServletOutputStream
 *  javax.servlet.http.HttpServletResponse
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.context.i18n.LocaleContextHolder
 *  org.springframework.jdbc.core.JdbcOperations
 *  org.springframework.jdbc.core.JdbcTemplate
 *  org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PathVariable
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 */
package com.seer.rds.web.config;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.PropConfig;
import com.seer.rds.dao.ScriptFileMapper;
import com.seer.rds.dao.WindTaskDefHistoryMapper;
import com.seer.rds.model.script.ScriptFile;
import com.seer.rds.model.wind.WindTaskDefHistory;
import com.seer.rds.service.agv.InterfaceService;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.util.ZipUtils;
import com.seer.rds.web.config.ConfigFileController;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping(value={"/api"})
@Api(tags={"\u5bfc\u51fazip"})
public class ExportZipController {
    private static final Logger log = LoggerFactory.getLogger(ExportZipController.class);
    private static final String CFG_FILENAME = "application-biz.yml";
    private static final String BOOT_FILENAME = "boot.js";
    private static final String WT_FILENAME = "\u5929\u98ce\u4efb\u52a1.task";
    private static final String APP_FILENAME = "application.yml";
    private static final String WINDTASKRECORD_SQL = "t_windtaskrecord.sql";
    private static final String WINDTASKLOG_SQL = "t_windtasklog.sql";
    private static final String WINDBLOCKRECORD_SQL = "t_windblockrecord.sql";
    private static final String WINDTASKDEF_SQL = "t_windtaskdef.sql";
    private static final String INTERFACE_FILENAME = "\u63a5\u53e3\u5217\u8868.api";
    @Autowired
    private WorkSiteService workSiteService;
    @Value(value="${spring.datasource.databaseType}")
    private String dataBaseType;
    @Autowired
    private WindService windService;
    @Autowired
    private PropConfig propConfig;
    @Autowired
    private InterfaceService interfaceService;
    @Autowired
    private WindTaskService windTaskService;
    @Autowired
    private LocaleMessageUtil localeMessageUtil;
    @Autowired
    private WindTaskDefHistoryMapper windTaskDefHistoryMapper;
    @Autowired
    private ScriptFileMapper scriptFileMapper;

    @GetMapping(value={"/downloadZip/{windTask}/{script}/{configurationFiles}/{appFiles}/{interfaceFile}"})
    public void download(HttpServletResponse response, @PathVariable Boolean windTask, @PathVariable Boolean script, @PathVariable Boolean configurationFiles, @PathVariable Boolean appFiles, @PathVariable Boolean interfaceFile) {
        Object bizYml;
        long start = System.currentTimeMillis();
        ArrayList<Object> fileList = new ArrayList<Object>();
        ArrayList<Object> bootList = new ArrayList<Object>();
        List scriptDirs = this.scriptFileMapper.findAll();
        for (ScriptFile scriptDir : scriptDirs) {
            Object jsFiles;
            if (StringUtils.equals((CharSequence)scriptDir.getFolderName(), (CharSequence)"boot")) {
                jsFiles = new File(this.propConfig.getRdsScriptDir()).listFiles((dir, name) -> name.endsWith(".js"));
                if (jsFiles == null || ((File[])jsFiles).length <= 0 || !script.booleanValue()) continue;
                bootList.addAll(Arrays.asList(jsFiles));
                continue;
            }
            jsFiles = new File(this.propConfig.getRdsScriptDir() + scriptDir.getFolderName());
            if (jsFiles == null || !script.booleanValue()) continue;
            bootList.add(jsFiles);
        }
        ConfigFileController bean = (ConfigFileController)SpringUtil.getBean(ConfigFileController.class);
        String appFilePath = bean.getAppFilePath();
        File appYml = new File(appFilePath);
        String s = JSONObject.toJSONString((Object)this.windService.findWindTaskDefUserTemplate());
        File taskFile = new File(this.propConfig.getRdsStaticDir() + WT_FILENAME);
        ZipUtils.taskDefWritetofile((File)taskFile, (String)s);
        File interfaceList = new File(this.propConfig.getRdsScriptDir() + INTERFACE_FILENAME);
        String allInterface = JSONObject.toJSONString((Object)this.interfaceService.findAll());
        ZipUtils.taskDefWritetofile((File)interfaceList, (String)allInterface);
        String configFilePath = bean.genConfigFilePath();
        if (configFilePath != null && ((File)(bizYml = new File(configFilePath))).exists() && configurationFiles.booleanValue()) {
            fileList.add(bizYml);
        }
        if (taskFile.exists() && windTask.booleanValue()) {
            fileList.add(taskFile);
        }
        if (!bootList.isEmpty() && script.booleanValue()) {
            for (File file : bootList) {
                fileList.add(file);
            }
        }
        if (appYml.exists() && appFiles.booleanValue()) {
            fileList.add(appYml);
        }
        if (interfaceList.exists() && interfaceFile.booleanValue()) {
            fileList.add(interfaceList);
        }
        try (ServletOutputStream out = response.getOutputStream();){
            response.reset();
            response.setHeader("Content-Disposition", "attachment;filename=" + URLEncoder.encode("script.zip", StandardCharsets.UTF_8));
            response.setContentType("application/zip;charset=UTF-8");
            ZipUtils.toZipAll(fileList, (OutputStream)out);
            out.flush();
            long l = System.currentTimeMillis();
            log.info("\u538b\u7f29\u5b8c\u6210\uff0c\u8017\u65f6\uff1a" + (l - start) + " ms");
        }
        catch (Exception e) {
            log.error("\u5bfc\u51fazip\u5931\u8d25", (Throwable)e);
        }
    }

    @ApiOperation(value="\u5bfc\u51fa\u4efb\u52a1\u76d1\u63a7\u4e09\u79cdsql\u6587\u4ef6")
    @PostMapping(value={"/exportWindTaskRecordByIds"})
    public void exportWindTaskRecordByIds(@RequestBody List<String> ids, HttpServletResponse response) {
        if (ids.size() > 10) {
            Locale locale = LocaleContextHolder.getLocale();
            throw new RuntimeException(this.localeMessageUtil.getMessageMatch("@{response.code.ExportWindTaskLimit10Error}", locale));
        }
        long start = System.currentTimeMillis();
        ArrayList<File> fileList = new ArrayList<File>();
        List taskRecordById = this.windTaskService.getTaskRecordById(ids);
        List defIds = taskRecordById.stream().map(e -> e.getDefId()).distinct().collect(Collectors.toList());
        try {
            File defFile = new File(this.propConfig.getRdsHistoryDir() + WINDTASKDEF_SQL);
            defFile = this.creatInsertSQLFileByIds(defFile, defIds, "t_windtaskdef");
            File taskFile = new File(this.propConfig.getRdsHistoryDir() + WINDTASKRECORD_SQL);
            taskFile = this.creatInsertSQLFileByIds(taskFile, ids, "t_windtaskrecord");
            File taskLogFile = new File(this.propConfig.getRdsHistoryDir() + WINDTASKLOG_SQL);
            taskLogFile = this.creatInsertSQLFileByTaskRecordIds(taskLogFile, ids, "t_windtasklog");
            File taskBlocksFile = new File(this.propConfig.getRdsHistoryDir() + WINDBLOCKRECORD_SQL);
            taskBlocksFile = this.creatInsertSQLFileByTaskRecordIds(taskBlocksFile, ids, "t_windblockrecord");
            if (!(defFile.exists() && taskFile.exists() && taskLogFile.exists() && taskBlocksFile.exists())) {
                throw new RuntimeException("exportWindTaskRecord is not exists ");
            }
            fileList.add(defFile);
            fileList.add(taskFile);
            fileList.add(taskLogFile);
            fileList.add(taskBlocksFile);
        }
        catch (IOException e2) {
            log.error("ExportWindTaskRecordByIds IOException", (Throwable)e2);
            throw new RuntimeException("ExportWindTaskRecordByIds IOException ");
        }
        try (ServletOutputStream out = response.getOutputStream();){
            response.reset();
            response.setCharacterEncoding("UTF-8");
            response.setHeader("Content-Disposition", "attachment;filename=" + URLEncoder.encode("taskRecord.zip", StandardCharsets.UTF_8));
            response.setContentType("application/zip;charset=UTF-8");
            ZipUtils.toZip(fileList, (OutputStream)out);
            out.flush();
            long end = System.currentTimeMillis();
            log.info("\u538b\u7f29\u5b8c\u6210\uff0c\u8017\u65f6\uff1a" + (end - start) + " ms");
        }
        catch (Exception e3) {
            log.error("\u5bfc\u51fazip\u5931\u8d25", (Throwable)e3);
        }
    }

    public File creatInsertSQLFileByIds(File file, List<String> ids, String tableName) throws IOException {
        File file2;
        int i;
        ArrayList<String> fields;
        if (!file.exists()) {
            file.createNewFile();
        }
        StringBuilder join = new StringBuilder("");
        for (int i2 = 0; i2 < ids.size(); ++i2) {
            join.append("'").append(ids.get(i2)).append("'");
            if (i2 == ids.size() - 1) continue;
            join.append(", ");
        }
        StringBuilder fieldString = new StringBuilder("");
        if (tableName.equals("t_windtaskdef")) {
            fields = new ArrayList<String>(List.of("id", "create_date", "delay", "detail", "if_enable", "label", "period", "periodic_task", "project_id", "remark", "status", "template_name", "version", "windcategory_id"));
            for (i = 0; i < fields.size(); ++i) {
                fieldString.append((String)fields.get(i));
                if (i == fields.size() - 1) continue;
                fieldString.append(", ");
            }
        }
        if (tableName.equals("t_windtaskrecord")) {
            fields = new ArrayList<String>(List.of("id", "agv_id", "call_work_station", "call_work_type", "created_on", "def_id", "def_label", "def_version", "discontinued", "dispensable", "ended_on", "ended_reason", "executor_time", "first_executor_time", "if_have_child_task", "input_params", "is_del", "out_order_no", "parent_task_record_id", "path", "periodic_task", "priority", "project_id", "root_block_state_id", "root_task_record_id", "state_description", "status", "task_def_detail", "variables", "work_stations", "work_types"));
            for (i = 0; i < fields.size(); ++i) {
                fieldString.append((String)fields.get(i));
                if (i == fields.size() - 1) continue;
                fieldString.append(", ");
            }
        }
        StringBuilder sql = new StringBuilder("SELECT ").append((CharSequence)fieldString).append(" FROM ").append(tableName).append(" WHERE id IN (:ids)");
        JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
        NamedParameterJdbcTemplate namedParameterJdbcTemplate = new NamedParameterJdbcTemplate((JdbcOperations)jdbcTemplate);
        HashMap<String, List<String>> params = new HashMap<String, List<String>>();
        params.put("ids", ids);
        List results = namedParameterJdbcTemplate.queryForList(sql.toString(), params);
        OutputStreamWriter writer = new OutputStreamWriter((OutputStream)new FileOutputStream(file), "UTF-8");
        try {
            String defLabel = "";
            Integer defVersion = null;
            for (Map row : results) {
                StringBuilder insertStatement = new StringBuilder("INSERT INTO " + tableName + " (" + fieldString + " ) VALUES (");
                for (Map.Entry entry : row.entrySet()) {
                    String key = (String)entry.getKey();
                    Object value = entry.getValue();
                    if (key.equals("def_label")) {
                        defLabel = String.valueOf(value);
                    } else if (key.equals("def_version")) {
                        defVersion = Integer.valueOf(String.valueOf(value));
                    }
                    if (value != null && key.equals("ended_reason") || value != null && key.equals("message")) {
                        String valueString = String.valueOf(value).replaceAll("[\r\n]", "");
                        insertStatement.append("'").append(valueString).append("'");
                        insertStatement.append(", ");
                        continue;
                    }
                    if (value instanceof Boolean) {
                        insertStatement.append(Boolean.valueOf(value.toString()) != false);
                        insertStatement.append(", ");
                        continue;
                    }
                    if (value != null || key.equals("task_def_detail")) {
                        String jsonString;
                        if (tableName.equals("t_windtaskdef") && key.equals("detail")) {
                            jsonString = JSONObject.toJSONString(value);
                            if (jsonString.startsWith("\"") && jsonString.endsWith("\"")) {
                                jsonString = jsonString.substring(1, jsonString.length() - 1);
                            }
                            insertStatement.append("'").append(jsonString).append("'");
                        } else if (tableName.equals("t_windtaskrecord") && key.equals("task_def_detail")) {
                            if (value != null) {
                                jsonString = JSONObject.toJSONString(value);
                                if (jsonString.startsWith("\"") && jsonString.endsWith("\"")) {
                                    jsonString = jsonString.substring(1, jsonString.length() - 1);
                                }
                                insertStatement.append("'").append(jsonString).append("'");
                            } else {
                                WindTaskDefHistory byLabelAndVersion = this.windTaskDefHistoryMapper.findByLabelAndVersion(defLabel, defVersion);
                                if (byLabelAndVersion != null) {
                                    String detail = byLabelAndVersion.getDetail();
                                    if (detail.startsWith("\"") && detail.endsWith("\"")) {
                                        detail = detail.substring(1, detail.length() - 1);
                                    }
                                    insertStatement.append("'").append(detail).append("'");
                                }
                            }
                        } else {
                            insertStatement.append("'").append(value).append("'");
                        }
                    } else {
                        insertStatement.append("NULL");
                    }
                    insertStatement.append(", ");
                }
                insertStatement.setLength(insertStatement.length() - 2);
                insertStatement.append(");");
                writer.write(insertStatement + "\n");
            }
            log.info("\u751f\u6210" + tableName + ".sql\u6587\u4ef6\u6210\u529f");
            file2 = file;
        }
        catch (Throwable throwable) {
            try {
                try {
                    ((Writer)writer).close();
                }
                catch (Throwable throwable2) {
                    throwable.addSuppressed(throwable2);
                }
                throw throwable;
            }
            catch (Exception e) {
                log.error("creatInsertSQLFileByIds Exception", (Throwable)e);
                return file;
            }
        }
        ((Writer)writer).close();
        return file2;
    }

    public File creatInsertSQLFileByTaskRecordIds(File file, List<String> ids, String tableName) throws IOException {
        File file2;
        int i;
        ArrayList<String> fields;
        if (!file.exists()) {
            file.createNewFile();
        }
        StringBuilder fieldString = new StringBuilder("");
        if (tableName.equals("t_windtasklog")) {
            fields = null;
            fields = this.dataBaseType.equals("MYSQL") ? new ArrayList<String>(List.of("id", "create_time", "level", "message", "project_id", "task_block_id", "task_id", "task_record_id")) : new ArrayList<String>(List.of("id", "create_time", "\"level\"", "message", "project_id", "task_block_id", "task_id", "task_record_id"));
            for (i = 0; i < fields.size(); ++i) {
                fieldString.append((String)fields.get(i));
                if (i == fields.size() - 1) continue;
                fieldString.append(", ");
            }
        }
        if (tableName.equals("t_windblockrecord")) {
            fields = new ArrayList<String>(List.of("id", "block_config_id", "block_id", "block_input_params", "block_input_params_value", "block_name", "ctrl_status", "ended_on", "ended_reason", "input_params", "internal_variables", "order_id", "output_params", "project_id", "started_on", "status", "task_id", "task_record_id", "version", "remark", "block_internal_variables", "block_out_params_value"));
            for (i = 0; i < fields.size(); ++i) {
                fieldString.append((String)fields.get(i));
                if (i == fields.size() - 1) continue;
                fieldString.append(", ");
            }
        }
        ArrayList<String> parseStringfields = new ArrayList<String>(List.of("block_input_params", "block_input_params_value", "input_params", "internal_variables", "output_params", "block_internal_variables", "block_out_params_value"));
        StringBuilder defSql = new StringBuilder("SELECT ").append((CharSequence)fieldString).append(" FROM ").append(tableName).append(" WHERE task_record_id IN (:ids)");
        JdbcTemplate jdbcTemplate = (JdbcTemplate)SpringUtil.getBean(JdbcTemplate.class);
        NamedParameterJdbcTemplate namedParameterJdbcTemplate = new NamedParameterJdbcTemplate((JdbcOperations)jdbcTemplate);
        HashMap<String, List<String>> params = new HashMap<String, List<String>>();
        params.put("ids", ids);
        List results = namedParameterJdbcTemplate.queryForList(defSql.toString(), params);
        OutputStreamWriter writer = new OutputStreamWriter((OutputStream)new FileOutputStream(file), "UTF-8");
        try {
            for (Map row : results) {
                StringBuilder insertStatement = new StringBuilder("INSERT INTO " + tableName + " (" + fieldString + " ) VALUES (");
                for (Map.Entry entry : row.entrySet()) {
                    String key = (String)entry.getKey();
                    Object value = entry.getValue();
                    if (value != null && key.equals("ended_reason") || value != null && key.equals("message")) {
                        String valueString = String.valueOf(value).replaceAll("[\r\n]", "");
                        insertStatement.append("'").append(valueString).append("'");
                        insertStatement.append(", ");
                        continue;
                    }
                    if (value instanceof Boolean) {
                        insertStatement.append(Boolean.valueOf(value.toString()) != false);
                        insertStatement.append(", ");
                        continue;
                    }
                    if (value != null) {
                        if (tableName.equals("t_windblockrecord") && parseStringfields.contains(key)) {
                            String jsonString = JSONObject.toJSONString(value);
                            if (jsonString.startsWith("\"") && jsonString.endsWith("\"")) {
                                jsonString = jsonString.substring(1, jsonString.length() - 1);
                            }
                            insertStatement.append("'").append(jsonString).append("'");
                        } else {
                            insertStatement.append("'").append(value).append("'");
                        }
                    } else {
                        insertStatement.append("NULL");
                    }
                    insertStatement.append(", ");
                }
                insertStatement.setLength(insertStatement.length() - 2);
                insertStatement.append(");");
                writer.write(insertStatement.toString() + "\n");
            }
            log.info("\u751f\u6210" + tableName + ".sql\u6587\u4ef6\u6210\u529f");
            file2 = file;
        }
        catch (Throwable throwable) {
            try {
                try {
                    ((Writer)writer).close();
                }
                catch (Throwable throwable2) {
                    throwable.addSuppressed(throwable2);
                }
                throw throwable;
            }
            catch (Exception e) {
                log.error("creatInsertSQLFileByTaskRecordIds Exception", (Throwable)e);
                return file;
            }
        }
        ((Writer)writer).close();
        return file2;
    }
}

