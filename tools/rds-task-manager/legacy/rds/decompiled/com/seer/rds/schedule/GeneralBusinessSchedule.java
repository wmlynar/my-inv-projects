/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.constant.ProtocolsEnum
 *  com.seer.rds.dao.GeneralBusinessMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.modbus.Modbus4jUtils
 *  com.seer.rds.model.general.GeneralBusiness
 *  com.seer.rds.runnable.SerialScheduledExecutorService
 *  com.seer.rds.schedule.GeneralBusinessSchedule
 *  com.seer.rds.script.ScriptService
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.util.CoreLicInfo
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.util.server.DateUtils
 *  com.seer.rds.vo.general.AddrsVo
 *  com.seer.rds.vo.general.ModbusTcpInputParamsVo
 *  com.seer.rds.vo.general.ModbusVo
 *  com.seer.rds.vo.general.ProtocolsVo
 *  com.seer.rds.vo.general.TriggerVo
 *  com.seer.rds.vo.req.SetOrderReq
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.schedule;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.constant.ProtocolsEnum;
import com.seer.rds.dao.GeneralBusinessMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.modbus.Modbus4jUtils;
import com.seer.rds.model.general.GeneralBusiness;
import com.seer.rds.runnable.SerialScheduledExecutorService;
import com.seer.rds.script.ScriptService;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.util.CoreLicInfo;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.util.server.DateUtils;
import com.seer.rds.vo.general.AddrsVo;
import com.seer.rds.vo.general.ModbusTcpInputParamsVo;
import com.seer.rds.vo.general.ModbusVo;
import com.seer.rds.vo.general.ProtocolsVo;
import com.seer.rds.vo.general.TriggerVo;
import com.seer.rds.vo.req.SetOrderReq;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class GeneralBusinessSchedule
implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(GeneralBusinessSchedule.class);
    private static Date time = new Date();
    public static String info = "";
    private static String rds_bizCommonTransfer = "rds_bizCommon";
    private static SerialScheduledExecutorService executorService = null;

    @Override
    public void run() {
        block2: while (true) {
            try {
                while (true) {
                    Thread.sleep(5000L);
                    if (StringUtils.isEmpty((CharSequence)info) || DateUtils.differentDaysByMillisecond((Date)time, (Date)new Date()) >= 1) {
                        time = new Date();
                        info = CoreLicInfo.getCoreLicInfo();
                    }
                    if (!StringUtils.isEmpty((CharSequence)info)) break block2;
                }
            }
            catch (Exception e) {
                log.error("GeneralBusinessSchedule init error {}", (Throwable)e);
                continue;
            }
            break;
        }
        this.taskSchedule();
    }

    public void taskSchedule() {
        GeneralBusinessMapper gbm = (GeneralBusinessMapper)SpringUtil.getBean(GeneralBusinessMapper.class);
        List modbusTcp = gbm.findByTypeAndNetAndEnable(Integer.valueOf(1), ProtocolsEnum.ModbusTcp.name(), Integer.valueOf(1));
        if (!modbusTcp.isEmpty()) {
            GeneralBusinessSchedule.getScheduledExecutorPool();
        } else if (executorService != null) {
            executorService.shutDown();
            executorService = null;
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private static void getScheduledExecutorPool() {
        if (executorService == null) {
            Date date = time;
            synchronized (date) {
                if (executorService == null) {
                    executorService = new SerialScheduledExecutorService(1);
                    executorService.scheduleAtFixedRate((Runnable)new /* Unavailable Anonymous Inner Class!! */, Long.valueOf(1000L), Long.valueOf(1000L), TimeUnit.MILLISECONDS);
                }
            }
        }
    }

    private static void generalBusiness() {
        JSONObject jsonObject = JSONObject.parseObject((String)info);
        if (jsonObject.getInteger("code") != 0) {
            return;
        }
        JSONArray features = jsonObject.getJSONArray("features");
        boolean flag = true;
        for (int i = 0; i < features.size(); ++i) {
            if (!StringUtils.equals((CharSequence)features.getJSONObject(i).getString("name"), (CharSequence)rds_bizCommonTransfer) || !features.getJSONObject(i).getBoolean("active").booleanValue()) continue;
            flag = false;
            break;
        }
        if (flag) {
            return;
        }
        try {
            GeneralBusinessMapper gbm = (GeneralBusinessMapper)SpringUtil.getBean(GeneralBusinessMapper.class);
            List modbusTcp = gbm.findByTypeAndNetAndEnable(Integer.valueOf(1), ProtocolsEnum.ModbusTcp.name(), Integer.valueOf(1));
            modbusTcp.stream().forEach(it -> GeneralBusinessSchedule.scheduledTasks((GeneralBusiness)it));
        }
        catch (Exception e) {
            log.error("error generalBusiness {}", (Throwable)e);
        }
    }

    private static void scheduledTasks(GeneralBusiness generalBusiness) {
        try {
            String trigg = generalBusiness.getTriggers();
            String protocols = generalBusiness.getProtocols();
            Integer taskNum = generalBusiness.getTaskNum();
            List modbusNet = ((ProtocolsVo)JSONObject.parseObject((String)protocols, ProtocolsVo.class)).getModbus();
            TriggerVo triggerVo = (TriggerVo)JSONObject.parseObject((String)trigg, TriggerVo.class);
            WindTaskRecordMapper windTaskRecordMapper = (WindTaskRecordMapper)SpringUtil.getBean(WindTaskRecordMapper.class);
            List byTaskLabel = windTaskRecordMapper.findByTaskLabel(Collections.singletonList(generalBusiness.getLabel()));
            if (byTaskLabel.size() >= taskNum) {
                return;
            }
            if (StringUtils.isNotEmpty((CharSequence)triggerVo.getScriptFun()) && triggerVo.getType() == 2) {
                ScriptService scriptService = (ScriptService)SpringUtil.getBean(ScriptService.class);
                scriptService.execute(triggerVo.getScriptFun(), (Object)"");
                return;
            }
            List modbus = triggerVo.getModbus();
            String name = ((ModbusTcpInputParamsVo)modbus.get(0)).getName();
            int value = (Integer)((ModbusTcpInputParamsVo)modbus.get(0)).getValue();
            Number number = null;
            block2: for (ModbusVo modbusVo : modbusNet) {
                for (AddrsVo addr : modbusVo.getAddrs()) {
                    if (!name.equals(addr.getAddrName())) continue;
                    number = Modbus4jUtils.readSingleValue((String)addr.getAddrType(), (String)modbusVo.getIp(), (int)modbusVo.getPort(), (int)modbusVo.getSlaveId(), (int)addr.getAddrNo(), (String)"scheduledTasks");
                    break block2;
                }
            }
            if (number != null && number.intValue() == value) {
                SetOrderReq orderReq = new SetOrderReq();
                orderReq.setTaskLabel(generalBusiness.getLabel());
                AgvApiService agvApiService = (AgvApiService)SpringUtil.getBean(AgvApiService.class);
                agvApiService.asyncSetOrder(orderReq);
            }
        }
        catch (Exception e) {
            log.error("error scheduledTasks :{} ,error = {}", (Object)generalBusiness, (Object)e);
        }
    }
}

