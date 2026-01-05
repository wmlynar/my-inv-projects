/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.common.collect.Lists
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.TemplateNameEnum
 *  com.seer.rds.dao.TemplateTaskMapper
 *  com.seer.rds.dao.WindTaskDefMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.model.wind.TemplateTask
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.runnable.RDSTemplateRunnable
 *  com.seer.rds.runnable.SerialScheduledExecutorService
 *  com.seer.rds.service.agv.WindTaskDefService
 *  com.seer.rds.service.agv.WindTaskDefService$1
 *  com.seer.rds.service.agv.WindTaskService
 *  com.seer.rds.service.system.DataPermissionManager
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.EnablePeriodicTasReq
 *  com.seer.rds.vo.req.SetOrderReq
 *  com.seer.rds.vo.req.WindTaskDefReq
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.vo.response.WindTaskDefResp
 *  javax.transaction.Transactional
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.i18n.LocaleContextHolder
 *  org.springframework.dao.DataIntegrityViolationException
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.stereotype.Service
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.service.agv;

import com.google.common.collect.Lists;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.TemplateNameEnum;
import com.seer.rds.dao.TemplateTaskMapper;
import com.seer.rds.dao.WindTaskDefMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.model.wind.TemplateTask;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.runnable.RDSTemplateRunnable;
import com.seer.rds.runnable.SerialScheduledExecutorService;
import com.seer.rds.service.agv.WindTaskDefService;
import com.seer.rds.service.agv.WindTaskService;
import com.seer.rds.service.system.DataPermissionManager;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.EnablePeriodicTasReq;
import com.seer.rds.vo.req.SetOrderReq;
import com.seer.rds.vo.req.WindTaskDefReq;
import com.seer.rds.vo.response.PaginationResponseVo;
import com.seer.rds.vo.response.WindTaskDefResp;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import javax.transaction.Transactional;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class WindTaskDefService {
    private static final Logger log = LoggerFactory.getLogger(WindTaskDefService.class);
    public static List<WindTaskDef> PeriodicEnableTaskList = Lists.newCopyOnWriteArrayList();
    public static List<WindTaskDef> PeriodicTaskList = Lists.newCopyOnWriteArrayList();
    @Autowired
    private WindTaskDefMapper windTaskDefMapper;
    @Autowired
    private LocaleMessageUtil localeMessageUtil;
    @Autowired
    private TemplateTaskMapper templateTaskMapper;
    @Autowired
    private DataPermissionManager dataPermissionManager;

    public List<WindTaskDef> findAllWindTaskDef() {
        return this.windTaskDefMapper.findAll();
    }

    @org.springframework.transaction.annotation.Transactional
    public void saveTask(WindTaskDef record) throws DataIntegrityViolationException {
        this.windTaskDefMapper.save((Object)record);
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteTaskDef(String id) {
        this.windTaskDefMapper.deleteById((Object)id);
    }

    @org.springframework.transaction.annotation.Transactional
    public Integer deleteWindTaskByIds(List<String> ids) {
        return this.windTaskDefMapper.deleteByIdIsIn(ids);
    }

    public WindTaskDef findTaskById(String id) {
        Optional task = this.windTaskDefMapper.findById((Object)id);
        if (!task.isEmpty()) {
            return (WindTaskDef)task.get();
        }
        return null;
    }

    public WindTaskDef findTaskByLabel(String label) {
        WindTaskDef task = this.windTaskDefMapper.findAllByLabel(label);
        if (task != null) {
            return task;
        }
        return null;
    }

    @Transactional
    public PaginationResponseVo findTaskDef(int page, int size, WindTaskDefReq windTaskDef) throws ParseException {
        PageRequest pageable = PageRequest.of((int)(page - 1), (int)size);
        String id = windTaskDef.getId();
        String label = windTaskDef.getLabel();
        String projectId = windTaskDef.getProjectId();
        String createDate = windTaskDef.getCreateDate();
        Integer status = windTaskDef.getStatus();
        Integer version = windTaskDef.getVersion();
        Boolean ifShowHistory = windTaskDef.getIfShowHistory();
        String remark = windTaskDef.getRemark();
        SimpleDateFormat ft = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        Date createDate1 = null;
        if (StringUtils.isNotEmpty((CharSequence)createDate)) {
            createDate1 = ft.parse(createDate);
        }
        Date finalCreateDate = createDate1;
        List authorizedTasks = this.dataPermissionManager.getAuthorizedGetTasks();
        1 spec = new /* Unavailable Anonymous Inner Class!! */;
        Page windTaskDefs = this.windTaskDefMapper.findAll((Specification)spec, (Pageable)pageable);
        TemplateTask templateTask = this.templateTaskMapper.findEnableTemplateTask().stream().findFirst().orElse(null);
        List templateTasks = this.templateTaskMapper.findAll();
        ArrayList<WindTaskDefResp> windTaskDefRespList = new ArrayList<WindTaskDefResp>();
        for (int i = 0; i < windTaskDefs.getContent().size(); ++i) {
            if (!RDSTemplateRunnable.ifShowTemplateTask.booleanValue() && !"userTemplate".equals(((WindTaskDef)windTaskDefs.getContent().get(i)).getTemplateName()) && !StringUtils.equals((CharSequence)((WindTaskDef)windTaskDefs.getContent().get(i)).getTemplateName(), (CharSequence)TemplateNameEnum.generalTemplate.getName()) && !StringUtils.isEmpty((CharSequence)((WindTaskDef)windTaskDefs.getContent().get(i)).getTemplateName()) && !templateTask.getTemplateName().equals(((WindTaskDef)windTaskDefs.getContent().get(i)).getTemplateName())) continue;
            WindTaskDefResp windTaskDefResp = new WindTaskDefResp();
            windTaskDefResp.setId(((WindTaskDef)windTaskDefs.getContent().get(i)).getId());
            windTaskDefResp.setLabel(((WindTaskDef)windTaskDefs.getContent().get(i)).getLabel());
            windTaskDefResp.setDetail(((WindTaskDef)windTaskDefs.getContent().get(i)).getDetail());
            windTaskDefResp.setRemark(((WindTaskDef)windTaskDefs.getContent().get(i)).getRemark());
            windTaskDefResp.setProjectId(((WindTaskDef)windTaskDefs.getContent().get(i)).getProjectId());
            windTaskDefResp.setStatus(((WindTaskDef)windTaskDefs.getContent().get(i)).getStatus());
            windTaskDefResp.setVersion(((WindTaskDef)windTaskDefs.getContent().get(i)).getVersion());
            windTaskDefResp.setWindcategoryId(((WindTaskDef)windTaskDefs.getContent().get(i)).getWindcategoryId());
            windTaskDefResp.setReleaseSites(((WindTaskDef)windTaskDefs.getContent().get(i)).getReleaseSites());
            if ("userTemplate".equals(((WindTaskDef)windTaskDefs.getContent().get(i)).getTemplateName()) || StringUtils.isEmpty((CharSequence)((WindTaskDef)windTaskDefs.getContent().get(i)).getTemplateName())) {
                windTaskDefResp.setTemplateDescription(this.localeMessageUtil.getMessageMatch("@{task.enum.UserTemplate}", LocaleContextHolder.getLocale()));
                windTaskDefResp.setTemplateName("userTemplate");
            } else if (TemplateNameEnum.generalTemplate.getName().equals(((WindTaskDef)windTaskDefs.getContent().get(i)).getTemplateName())) {
                windTaskDefResp.setTemplateDescription(this.localeMessageUtil.getMessageMatch(TemplateNameEnum.generalTemplate.getDesc(), LocaleContextHolder.getLocale()));
            } else {
                String templateName = ((WindTaskDef)windTaskDefs.getContent().get(i)).getTemplateName();
                TemplateTask task = templateTasks.stream().filter(s -> s.getTemplateName().equals(templateName)).findFirst().orElse(null);
                windTaskDefResp.setTemplateDescription(task == null ? "" : task.getTemplateDescription());
                windTaskDefResp.setTemplateName(task == null ? "" : task.getTemplateName());
            }
            if (((WindTaskDef)windTaskDefs.getContent().get(i)).getCreateDate() != null) {
                windTaskDefResp.setCreateDate(ft.format(((WindTaskDef)windTaskDefs.getContent().get(i)).getCreateDate()));
            }
            windTaskDefResp.setPeriodicTask(((WindTaskDef)windTaskDefs.getContent().get(i)).getPeriodicTask());
            windTaskDefResp.setIfEnable(((WindTaskDef)windTaskDefs.getContent().get(i)).getIfEnable());
            windTaskDefResp.setPeriod(((WindTaskDef)windTaskDefs.getContent().get(i)).getPeriod().longValue());
            windTaskDefResp.setDelay(((WindTaskDef)windTaskDefs.getContent().get(i)).getDelay().longValue());
            windTaskDefRespList.add(windTaskDefResp);
        }
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(windTaskDefs.getTotalElements()));
        paginationResponseVo.setCurrentPage(Integer.valueOf(page));
        paginationResponseVo.setPageSize(Integer.valueOf(size));
        paginationResponseVo.setTotalPage(Integer.valueOf(windTaskDefs.getTotalPages()));
        paginationResponseVo.setPageList(windTaskDefRespList);
        return paginationResponseVo;
    }

    public void enablePeriodicTask(EnablePeriodicTasReq req) {
        this.windTaskDefMapper.updateTaskDefEnable(req.getIfEnable(), req.getId());
        Boolean ifNewAdd = false;
        for (WindTaskDef windTaskDef : PeriodicTaskList) {
            if (windTaskDef.getId().equals(req.getId())) {
                ifNewAdd = false;
                break;
            }
            ifNewAdd = true;
        }
        if (PeriodicTaskList.size() == 0) {
            ifNewAdd = true;
        }
        PeriodicEnableTaskList.clear();
        PeriodicEnableTaskList.addAll(this.windTaskDefMapper.findPeriodicTaskAndEnable());
        if (ifNewAdd.booleanValue()) {
            Optional byId = this.windTaskDefMapper.findById((Object)req.getId());
            if (byId.isPresent()) {
                PeriodicTaskList.add((WindTaskDef)byId.get());
            }
            if (req.getIfEnable() == 1) {
                SerialScheduledExecutorService scheduledExecutorService = new SerialScheduledExecutorService(1);
                WindTaskDef windTaskDefByDB = this.windTaskDefMapper.findtaskDefById(req.getId());
                scheduledExecutorService.scheduleAtFixedRate(() -> {
                    try {
                        ResultVo objectResultVo = WindTaskService.checkWindTask();
                        if (objectResultVo.getCode().intValue() != CommonCodeEnum.SUCCESS.getCode().intValue()) {
                            return;
                        }
                        Boolean flag = false;
                        WindTaskDef def = null;
                        List periodicEnableTaskList = PeriodicEnableTaskList;
                        for (WindTaskDef taskDef : periodicEnableTaskList) {
                            if (!taskDef.getId().equals(windTaskDefByDB.getId())) continue;
                            def = taskDef;
                            flag = true;
                        }
                        if (flag.booleanValue()) {
                            WindTaskRecordMapper windTaskRecordMapper = (WindTaskRecordMapper)SpringUtil.getBean(WindTaskRecordMapper.class);
                            RootBp rootBp = (RootBp)SpringUtil.getBean(RootBp.class);
                            SetOrderReq setOrderReq = new SetOrderReq();
                            setOrderReq.setTaskLabel(def.getLabel());
                            setOrderReq.setTaskId(def.getId());
                            setOrderReq.setWindTaskDef(def);
                            Object object = rootBp.execute(setOrderReq);
                        } else {
                            Thread.sleep(2000L);
                        }
                    }
                    catch (Exception e) {
                        log.error("Schedule Time Error", (Throwable)e);
                    }
                }, windTaskDefByDB.getDelay(), windTaskDefByDB.getPeriod(), TimeUnit.MILLISECONDS);
            }
        }
    }

    public List<WindTaskDef> findOneTaskDefByIdList(List<String> idLists) {
        return this.windTaskDefMapper.findOneTaskDefByIdList(idLists);
    }
}

