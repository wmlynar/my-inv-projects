/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.dao.GeneralBusinessMapper
 *  com.seer.rds.dao.WindTaskDefHistoryMapper
 *  com.seer.rds.model.general.GeneralBusiness
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.model.wind.WindTaskDefHistory
 *  com.seer.rds.service.Archiving.ArchivingService
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WindTaskDefService
 *  com.seer.rds.service.general.GeneralBusinessService
 *  com.seer.rds.util.ResourceUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.general.AddrsVo
 *  com.seer.rds.vo.general.ModbusVo
 *  com.seer.rds.vo.general.ProtocolsVo
 *  com.seer.rds.web.general.GeneralBusinessController
 *  javax.servlet.http.HttpServletResponse
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PathVariable
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.ResponseBody
 *  springfox.documentation.annotations.ApiIgnore
 *  unitauto.JSON
 */
package com.seer.rds.web.general;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.annotation.SysLog;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.dao.GeneralBusinessMapper;
import com.seer.rds.dao.WindTaskDefHistoryMapper;
import com.seer.rds.model.general.GeneralBusiness;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.model.wind.WindTaskDefHistory;
import com.seer.rds.service.Archiving.ArchivingService;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WindTaskDefService;
import com.seer.rds.service.general.GeneralBusinessService;
import com.seer.rds.util.ResourceUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.general.AddrsVo;
import com.seer.rds.vo.general.ModbusVo;
import com.seer.rds.vo.general.ProtocolsVo;
import java.io.IOException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import springfox.documentation.annotations.ApiIgnore;
import unitauto.JSON;

@Controller
@RequestMapping(value={"general"})
public class GeneralBusinessController {
    private static final Logger log = LoggerFactory.getLogger(GeneralBusinessController.class);
    @Autowired
    private GeneralBusinessService generalBusinessService;
    @Autowired
    private WindService windService;
    @Autowired
    private GeneralBusinessMapper gbm;
    @Autowired
    private WindTaskDefService windTaskDefService;
    @Autowired
    private WindTaskDefHistoryMapper windTaskDefHistoryMapper;
    public static final String Config_BIZ_SingleForkScene = "biz/SingleForkScene";

    @PostMapping(value={"updateGeneralDef"})
    @ResponseBody
    public ResultVo<Object> updateGeneralDef(@RequestBody GeneralBusiness generalBusiness, @ApiIgnore HttpServletResponse response) throws IOException {
        String protocols;
        ProtocolsVo protocolsVo;
        List modbus;
        if (StringUtils.isEmpty((CharSequence)generalBusiness.getId())) {
            generalBusiness.setId(UUID.randomUUID().toString());
        }
        if (CollectionUtils.isNotEmpty((Collection)(modbus = (protocolsVo = (ProtocolsVo)JSONObject.parseObject((String)(protocols = generalBusiness.getProtocols()), ProtocolsVo.class)).getModbus()))) {
            ArrayList list = new ArrayList();
            HashSet<String> addrNames = new HashSet<String>();
            for (ModbusVo modbusVo : modbus) {
                list.addAll(modbusVo.getAddrs());
            }
            HashMap<String, Integer> map = new HashMap<String, Integer>();
            for (AddrsVo addrsVo : list) {
                if (map.containsKey(addrsVo.getAddrName())) {
                    addrNames.add(addrsVo.getAddrName());
                    continue;
                }
                map.put(addrsVo.getAddrName(), 1);
            }
            if (!addrNames.isEmpty()) {
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.Modbus_AddrName_Repeat, addrNames);
            }
        }
        ArrayList<String> ids = new ArrayList<String>();
        ids.add(generalBusiness.getId());
        List allByIdIn = this.generalBusinessService.findAllByIdIn(ids);
        if (!allByIdIn.isEmpty() && ((GeneralBusiness)allByIdIn.get(0)).getEnable() == 1) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.General_Error_Disable);
        }
        if (generalBusiness.getRemake().length() > 81) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.Data_Length_Error);
        }
        try {
            if (this.generalBusinessService.createWindTaskDef(generalBusiness)) {
                return ResultVo.success();
            }
            return ResultVo.error();
        }
        catch (Exception e) {
            log.error("error createWindTaskDef : {}", (Throwable)e);
            return ResultVo.error();
        }
    }

    @PostMapping(value={"insertGeneralDef"})
    @ResponseBody
    public ResultVo<Object> insertGeneralDef(@RequestBody GeneralBusiness generalBusiness, @ApiIgnore HttpServletResponse response) throws IOException {
        String generalLabel;
        if (StringUtils.isEmpty((CharSequence)generalBusiness.getId())) {
            generalBusiness.setId(UUID.randomUUID().toString());
        }
        if (!this.gbm.findAllByGeneralLabel(generalLabel = generalBusiness.getGeneralLabel()).isEmpty()) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.General_label_Repeat);
        }
        if (generalLabel.length() > 51) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.General_LabelLength_Error);
        }
        try {
            this.generalBusinessService.insertGeneralDef(generalBusiness);
            return ResultVo.success();
        }
        catch (Exception e) {
            log.error("error createWindTaskDef : {}", (Throwable)e);
            return ResultVo.error();
        }
    }

    @GetMapping(value={"getGeneralByType/{type}"})
    @ResponseBody
    public ResultVo<Object> getGeneralByType(@PathVariable Integer type, @ApiIgnore HttpServletResponse response) {
        if (type == null) {
            return ResultVo.response(new ArrayList());
        }
        return ResultVo.response((Object)this.generalBusinessService.getGeneralByType(type));
    }

    @SysLog(operation="setEnableGeneral", message="@{user.controller.setEnableGeneral}")
    @GetMapping(value={"setEnable/{id}/{enable}"})
    @ResponseBody
    public ResultVo<Object> setEnableGeneral(@PathVariable String id, @PathVariable Integer enable, @ApiIgnore HttpServletResponse response) {
        log.info("setEnableGeneral id = {}, enable = {}", (Object)id, (Object)enable);
        if (id == null || enable == null) {
            return ResultVo.error();
        }
        this.generalBusinessService.setEnableGeneral(id, enable);
        return ResultVo.success();
    }

    @SysLog(operation="deleteGeneralById", message="@{user.controller.deleteGeneralById}")
    @GetMapping(value={"deleteGeneralById/{id}"})
    @ResponseBody
    public ResultVo<Object> deleteGeneralById(@PathVariable String id, @ApiIgnore HttpServletResponse response) {
        log.info("deleteGeneralById id = {}", (Object)id);
        if (id == null) {
            return ResultVo.error();
        }
        if (this.generalBusinessService.deleteGeneralById(id).booleanValue()) {
            return ResultVo.success();
        }
        return ResultVo.error((CommonCodeEnum)CommonCodeEnum.General_Error_Disable);
    }

    @PostMapping(value={"findGeneralByIds"})
    @ResponseBody
    public ResultVo<Object> findGeneralByIds(@RequestBody List<String> id, @ApiIgnore HttpServletResponse response) {
        return ResultVo.response((Object)this.generalBusinessService.findAllByIdIn(id));
    }

    @PostMapping(value={"import"})
    @ResponseBody
    public ResultVo<Object> importGeneral(@RequestBody List<GeneralBusiness> generalBusiness, @ApiIgnore HttpServletResponse response) {
        if (generalBusiness.isEmpty()) {
            return ResultVo.success();
        }
        ArrayList<String> generalLabel = new ArrayList<String>();
        ArrayList ids = new ArrayList();
        generalBusiness.stream().forEach(it -> ids.add(it.getId()));
        List allByIdIn = this.generalBusinessService.findAllByIdIn(ids);
        ids.clear();
        allByIdIn.stream().forEach(it -> ids.add(it.getGeneralLabel()));
        if (!ids.isEmpty()) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.General_label_Repeat, (Object)allByIdIn);
        }
        for (GeneralBusiness vo : generalBusiness) {
            try {
                List list = this.gbm.findAllByLabel(vo.getLabel()).stream().filter(it -> !StringUtils.equals((CharSequence)it.getGeneralLabel(), (CharSequence)vo.getGeneralLabel())).collect(Collectors.toList());
                if (!list.isEmpty()) {
                    return ResultVo.error((String)(vo.getLabel() + " repeat!"));
                }
                if (this.generalBusinessService.createWindTaskDef(vo)) continue;
                return ResultVo.error((String)(vo.getGeneralLabel() + " must be edited!"));
            }
            catch (Exception e) {
                log.error("error import e = {} , vo = {}", (Object)e, (Object)vo);
                generalLabel.add(vo.getGeneralLabel());
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.ERROR, generalLabel);
            }
        }
        return ResultVo.success();
    }

    @PostMapping(value={"startSingleForkScene"})
    @ResponseBody
    public ResultVo<Object> startSingleForkScene() {
        Object singleForkResource;
        List taskIds = this.windService.findDefIdsByLabel("SingleForkScene");
        if (!taskIds.isEmpty()) {
            this.windTaskDefService.deleteWindTaskByIds(taskIds);
        }
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        ArchivingService archivingService = (ArchivingService)SpringUtil.getBean(ArchivingService.class);
        Boolean ifJar = archivingService.ifJar();
        if (ifJar.booleanValue()) {
            singleForkResource = propConfig.getConfigDir() + Config_BIZ_SingleForkScene;
        } else {
            ClassLoader classLoader = this.getClass().getClassLoader();
            URL resourceSingleForkUrl = classLoader.getResource(Config_BIZ_SingleForkScene);
            singleForkResource = resourceSingleForkUrl.getPath();
        }
        log.info("resourceSingleForkUrl" + (String)singleForkResource);
        List SingleForkSceneTask = ResourceUtil.readFileToString((String)singleForkResource, (String)".task");
        List windTaskDefs = JSON.parseArray((String)((String)SingleForkSceneTask.get(0)), WindTaskDef.class);
        for (WindTaskDef windTaskDef : windTaskDefs) {
            windTaskDef.setId(String.valueOf(UUID.randomUUID()));
            windTaskDef.setWindcategoryId(Long.valueOf(0L));
            windTaskDef.setTemplateName("generalTemplate");
            windTaskDef.setStatus(Integer.valueOf(1));
            windTaskDef.setVersion(Integer.valueOf(1));
            windTaskDef.setCreateDate(new Date());
            if (windTaskDef.getIfEnable() == null) {
                windTaskDef.setIfEnable(Integer.valueOf(0));
            }
            if (windTaskDef.getPeriodicTask() == null) {
                windTaskDef.setPeriodicTask(Integer.valueOf(0));
            }
            this.windService.saveTask(windTaskDef);
            WindTaskDefHistory windTaskDefHistory = WindTaskDefHistory.builder().createDate(new Date()).label(windTaskDef.getLabel()).detail(windTaskDef.getDetail()).version(windTaskDef.getVersion()).build();
            try {
                this.windTaskDefHistoryMapper.save((Object)windTaskDefHistory);
            }
            catch (Exception e) {
                log.error(e.getMessage());
            }
        }
        return ResultVo.success();
    }

    @PostMapping(value={"delSingleForkScene"})
    @ResponseBody
    public ResultVo<Object> delSingleForkScene() {
        List taskIds = this.windService.findDefIdsByLabel("SingleForkScene");
        if (!taskIds.isEmpty()) {
            int num = 0;
            try {
                num = this.windTaskDefService.deleteWindTaskByIds(taskIds);
            }
            catch (Exception e) {
                log.info("delSingleForkScene error {}", (Throwable)e);
                return ResultVo.error();
            }
            return ResultVo.response((Object)num);
        }
        return ResultVo.success();
    }
}

