/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.constant.ProtocolsEnum
 *  com.seer.rds.constant.TemplateNameEnum
 *  com.seer.rds.constant.TemplateTypeEnum
 *  com.seer.rds.dao.GeneralBusinessMapper
 *  com.seer.rds.dao.WindTaskDefHistoryMapper
 *  com.seer.rds.dao.WindTaskDefMapper
 *  com.seer.rds.model.general.GeneralBusiness
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.model.wind.WindTaskDefHistory
 *  com.seer.rds.schedule.GeneralBusinessSchedule
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.general.GeneralAbstract
 *  com.seer.rds.service.general.GeneralBusinessService
 *  com.seer.rds.service.general.GeneralModbus
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.general.WindDetailBlockVo
 *  com.seer.rds.vo.general.WindDetailVo
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.i18n.LocaleContextHolder
 *  org.springframework.stereotype.Service
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.service.general;

import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.constant.ProtocolsEnum;
import com.seer.rds.constant.TemplateNameEnum;
import com.seer.rds.constant.TemplateTypeEnum;
import com.seer.rds.dao.GeneralBusinessMapper;
import com.seer.rds.dao.WindTaskDefHistoryMapper;
import com.seer.rds.dao.WindTaskDefMapper;
import com.seer.rds.model.general.GeneralBusiness;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.model.wind.WindTaskDefHistory;
import com.seer.rds.schedule.GeneralBusinessSchedule;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.general.GeneralAbstract;
import com.seer.rds.service.general.GeneralModbus;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.general.WindDetailBlockVo;
import com.seer.rds.vo.general.WindDetailVo;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GeneralBusinessService {
    private static final Logger log = LoggerFactory.getLogger(GeneralBusinessService.class);
    @Autowired
    private WindService windService;
    @Autowired
    private GeneralBusinessMapper gbm;
    @Autowired
    private WindTaskDefMapper windTaskDefMapper;
    @Autowired
    private LocaleMessageUtil localeMessageUtil;
    @Autowired
    private WindTaskDefHistoryMapper windTaskDefHistoryMapper;
    public static Object lock = new Object();

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @Transactional
    public boolean createWindTaskDef(GeneralBusiness generalBusiness) throws Exception {
        WindDetailBlockVo windTaskDefBpJson = null;
        try {
            if (StringUtils.equals((CharSequence)ProtocolsEnum.ModbusTcp.toString(), (CharSequence)generalBusiness.getNet())) {
                GeneralModbus generalModbus = (GeneralModbus)SpringUtil.getBean(GeneralModbus.class);
                windTaskDefBpJson = generalModbus.createWindTaskDefBpJson(generalBusiness);
            }
        }
        catch (Exception e) {
            log.error("Generate windTaskDefBpJson error {}", (Throwable)e);
            return false;
        }
        String label = generalBusiness.getLabel();
        Object object = lock;
        synchronized (object) {
            List windTaskDefByLabel = this.windService.findWindTaskDefByLabel(label);
            WindTaskDef def = new WindTaskDef();
            if (!windTaskDefByLabel.isEmpty()) {
                def = (WindTaskDef)windTaskDefByLabel.get(0);
            }
            if (StringUtils.isEmpty((CharSequence)def.getId())) {
                def.setId(generalBusiness.getId());
                def.setTemplateName(TemplateNameEnum.generalTemplate.getName());
            }
            WindDetailVo windDetailVo = new WindDetailVo();
            windDetailVo.setRootBlock(windTaskDefBpJson);
            def.setDetail(JSONObject.toJSONString((Object)windDetailVo));
            def.setVersion(generalBusiness.getVersion());
            def.setIfEnable(Integer.valueOf(0));
            def.setStatus(Integer.valueOf(1));
            def.setCreateDate(new Date());
            def.setWindcategoryId(Long.valueOf(0L));
            def.setLabel(label);
            def.setRemark(generalBusiness.getRemake());
            generalBusiness.setModifyOn(new Date());
            generalBusiness.setCreatedOn(new Date());
            List byIds = this.gbm.findAllById(generalBusiness.getId());
            if (!byIds.isEmpty()) {
                GeneralBusiness byId = (GeneralBusiness)byIds.get(0);
                generalBusiness.setCreatedOn(byId.getCreatedOn());
            }
            generalBusiness.setType(Integer.valueOf(generalBusiness.getType() == null ? 1 : generalBusiness.getType()));
            generalBusiness.setName(TemplateTypeEnum.getDescByType((int)generalBusiness.getType()));
            generalBusiness.setEnable(Integer.valueOf(0));
            this.gbm.save((Object)generalBusiness);
            this.windService.saveTask(def);
            WindTaskDefHistory windTaskDefHistory = WindTaskDefHistory.builder().createDate(new Date()).label(def.getLabel()).detail(def.getDetail()).version(def.getVersion()).build();
            try {
                this.windTaskDefHistoryMapper.save((Object)windTaskDefHistory);
            }
            catch (Exception e) {
                log.error(e.getMessage());
            }
            return true;
        }
    }

    public List<GeneralBusiness> getGeneralByType(Integer type) {
        List result = this.gbm.findByTypeOrderByModifyOnDesc(type);
        for (GeneralBusiness generalBusiness : result) {
            generalBusiness.setName(this.localeMessageUtil.getMessageMatch(TemplateNameEnum.generalTemplate.getDesc(), LocaleContextHolder.getLocale()));
        }
        return result;
    }

    @Transactional
    public void setEnableGeneral(String id, Integer enable) {
        List result = this.gbm.findAllById(id);
        this.gbm.setEnableGeneral(id, enable);
        if (!result.isEmpty()) {
            String label = ((GeneralBusiness)result.get(0)).getLabel();
            this.windTaskDefMapper.updateTaskDefEnableByLabel(enable, label);
        }
        new GeneralBusinessSchedule().taskSchedule();
    }

    @Transactional
    public Boolean deleteGeneralById(String id) {
        Optional generalBusiness = this.gbm.findById((Object)id);
        if (!generalBusiness.isEmpty()) {
            if (((GeneralBusiness)generalBusiness.get()).getEnable() == 1) {
                return false;
            }
            String label = ((GeneralBusiness)generalBusiness.get()).getLabel();
            this.windTaskDefMapper.deleteByLabelAndStatus(label, Integer.valueOf(1));
            this.gbm.deleteById((Object)id);
        }
        return true;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    @Transactional
    public void insertGeneralDef(GeneralBusiness generalBusiness) {
        generalBusiness.setType(Integer.valueOf(generalBusiness.getType() == null ? 1 : generalBusiness.getType()));
        String generalLabel = TemplateTypeEnum.getLabelByType((int)generalBusiness.getType());
        Integer version = 1;
        Date createOn = new Date();
        Object object = lock;
        synchronized (object) {
            List windTaskDefByLabel = this.windService.findWindTaskDefByLabel(generalLabel + "%");
            int tmp = 0;
            for (WindTaskDef windTaskDef : windTaskDefByLabel) {
                String[] s = windTaskDef.getLabel().split("_");
                if (s.length != 2 || !StringUtils.isNumeric((CharSequence)s[1]) || Integer.parseInt(s[1]) <= tmp) continue;
                tmp = Integer.parseInt(s[1]);
            }
            WindTaskDef def = new WindTaskDef();
            def.setVersion(version);
            def.setIfEnable(Integer.valueOf(0));
            def.setWindcategoryId(Long.valueOf(0L));
            def.setLabel(generalLabel + "_" + (tmp + 1));
            def.setCreateDate(new Date());
            def.setTemplateName(TemplateNameEnum.generalTemplate.getName());
            def.setPeriodicTask(Integer.valueOf(0));
            def.setId(generalBusiness.getId());
            def.setStatus(Integer.valueOf(1));
            WindDetailVo windDetailVo = new WindDetailVo();
            WindDetailBlockVo root = new WindDetailBlockVo();
            HashMap hashMap = Maps.newHashMap();
            hashMap.put((String)GeneralAbstract.blockChildList.get(0), new ArrayList());
            root.setChildren((Map)hashMap);
            windDetailVo.setRootBlock(root);
            def.setDetail(JSONObject.toJSONString((Object)windDetailVo));
            generalBusiness.setModifyOn(new Date());
            generalBusiness.setCreatedOn(createOn);
            generalBusiness.setName(TemplateTypeEnum.getDescByType((int)generalBusiness.getType()));
            generalBusiness.setLabel(generalLabel + "_" + (tmp + 1));
            generalBusiness.setEnable(Integer.valueOf(0));
            generalBusiness.setVersion(version);
            this.gbm.save((Object)generalBusiness);
            this.windService.saveTask(def);
        }
    }

    public List<GeneralBusiness> findAllByIdIn(List<String> id) {
        return this.gbm.findAllByIdIn(id);
    }
}

