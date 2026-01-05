/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.hutool.core.io.FileUtil
 *  cn.hutool.core.util.CharsetUtil
 *  cn.hutool.json.JSONArray
 *  cn.hutool.json.JSONUtil
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.dao.TemplateTaskMapper
 *  com.seer.rds.model.wind.TemplateTask
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.util.TemplateUtil
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util;

import cn.hutool.core.io.FileUtil;
import cn.hutool.core.util.CharsetUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONUtil;
import com.seer.rds.config.PropConfig;
import com.seer.rds.dao.TemplateTaskMapper;
import com.seer.rds.model.wind.TemplateTask;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.util.SpringUtil;
import java.io.File;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.UUID;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class TemplateUtil {
    private static final Logger log = LoggerFactory.getLogger(TemplateUtil.class);
    private static String RDSTask = "taskList.task";

    public static void saveTemplate(String templateName, String templateMsg, TemplateTaskMapper templateTaskMapper, String dir) {
        TemplateTask templateTask = new TemplateTask();
        templateTask.setTemplateName(templateName);
        templateTask.setTemplateDir(dir);
        templateTask.setTemplateIfEnable(Integer.valueOf(0));
        templateTask.setTemplateDescription(templateMsg);
        if ("userTemplate".equals(templateName)) {
            templateTask.setTemplateIfEnable(Integer.valueOf(2));
        }
        templateTaskMapper.saveAndFlush((Object)templateTask);
    }

    public static String getTemplateDirByIfEnable() {
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        TemplateTaskMapper templateTaskMapper = (TemplateTaskMapper)SpringUtil.getBean(TemplateTaskMapper.class);
        TemplateTask templateTask = templateTaskMapper.findEnableTemplateTask().stream().findFirst().orElse(null);
        if (templateTask != null) {
            if ("userTemplate".equals(templateTask.getTemplateName())) {
                return propConfig.getRdsScriptDir();
            }
            return propConfig.getRdsTemplateDir() + templateTask.getTemplateName() + "/";
        }
        return propConfig.getRdsScriptDir();
    }

    public static void saveTemplateTaskDef(String rdsTemplateDir) {
        try {
            ArrayList files = new ArrayList();
            FileUtil.walkFiles((File)new File(rdsTemplateDir), (Consumer)new /* Unavailable Anonymous Inner Class!! */);
            WindService windService = (WindService)SpringUtil.getBean(WindService.class);
            for (File file : files) {
                String absolutePath = file.getAbsolutePath();
                String parentFileName = file.getParentFile().getName();
                String name = file.getName();
                if (parentFileName.equals("Single Fork Scene") || !RDSTask.equals(name)) continue;
                String result = FileUtil.readString((String)absolutePath, (Charset)CharsetUtil.charset((String)"UTF-8"));
                JSONArray taskArray = JSONUtil.parseArray((String)result);
                for (Object task : taskArray) {
                    WindTaskDef windTaskDef = (WindTaskDef)JSONUtil.toBean((String)task.toString(), WindTaskDef.class);
                    windTaskDef.setTemplateName(parentFileName);
                    WindTaskDef isExit = windService.findAllByLabel(windTaskDef.getLabel());
                    windTaskDef.setWindcategoryId(Long.valueOf(0L));
                    if (isExit != null) {
                        isExit.setDetail(windTaskDef.getDetail());
                        isExit.setVersion(windTaskDef.getVersion());
                        windService.saveTask(isExit);
                        continue;
                    }
                    windTaskDef.setId(UUID.randomUUID().toString());
                    windService.saveTask(windTaskDef);
                }
            }
        }
        catch (Exception e) {
            log.error("", (Throwable)e);
        }
    }

    public static void loadTemplate(TemplateTaskMapper templateTaskMapper, PropConfig propConfig) {
        TemplateUtil.saveTemplate((String)"Pulsating production line", (String)"@{task.enum.template1}", (TemplateTaskMapper)templateTaskMapper, (String)"");
        TemplateUtil.saveTemplate((String)"Assemble order", (String)"@{task.enum.template2}", (TemplateTaskMapper)templateTaskMapper, (String)"");
        TemplateUtil.saveTemplate((String)"Dense peak bit", (String)"@{task.enum.template3}", (TemplateTaskMapper)templateTaskMapper, (String)"");
        TemplateUtil.saveTemplate((String)"userTemplate", (String)"@{task.enum.UserTemplate}", (TemplateTaskMapper)templateTaskMapper, (String)"");
    }
}

