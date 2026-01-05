/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.ModbusInstanceMapper
 *  com.seer.rds.dao.WindTaskRecordMapper
 *  com.seer.rds.modbus.Modbus4jUtils
 *  com.seer.rds.schedule.ModbusTaskSchedule
 *  com.seer.rds.service.agv.AgvApiService
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.SetOrderReq
 *  com.serotonin.modbus4j.code.DataType
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.scheduling.annotation.EnableScheduling
 *  org.springframework.scheduling.annotation.Scheduled
 */
package com.seer.rds.schedule;

import com.seer.rds.dao.ModbusInstanceMapper;
import com.seer.rds.dao.WindTaskRecordMapper;
import com.seer.rds.modbus.Modbus4jUtils;
import com.seer.rds.service.agv.AgvApiService;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.SetOrderReq;
import com.serotonin.modbus4j.code.DataType;
import java.math.BigInteger;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
public class ModbusTaskSchedule {
    private static final Logger log = LoggerFactory.getLogger(ModbusTaskSchedule.class);
    @Autowired
    private AgvApiService agvApiService;
    @Autowired
    private WindTaskRecordMapper windTaskRecordMapper;
    @Autowired
    private ModbusInstanceMapper modbusInstanceMapper;

    @Scheduled(fixedDelay=5000L)
    void scheduleModbusTask() {
        Map modbusInstanceMap = Modbus4jUtils.listModbusInstances();
        modbusInstanceMap.values().parallelStream().forEach(instance -> {
            String taskDefLabel = instance.getTaskDefLabel() == null ? null : instance.getTaskDefLabel().strip();
            String targetValueStr = instance.getTargetValue();
            Number currentValue = null;
            if (StringUtils.isNotEmpty((CharSequence)taskDefLabel) && StringUtils.isNotEmpty((CharSequence)targetValueStr)) {
                List counts;
                try {
                    currentValue = Modbus4jUtils.readSingleValueByInstanceName((String)instance.getName(), (Integer)instance.getTargetAddr(), (String)("create task [" + instance.getTaskDefLabel() + "] by " + instance.getName()));
                }
                catch (Exception e) {
                    log.error("scheduleModbusTask: try to conn modbus instance [{}] {}", (Object)instance.getName(), (Object)e.getMessage());
                }
                if (currentValue != null && Objects.equals(targetValueStr, String.valueOf(currentValue)) && CollectionUtils.isEmpty((Collection)(counts = this.windTaskRecordMapper.find1ByLabelAndStatusIn(taskDefLabel)))) {
                    String prefix;
                    SetOrderReq orderReq = new SetOrderReq();
                    StringBuilder taskRecordId = new StringBuilder();
                    String string = prefix = instance.getPrefix() == null ? "" : instance.getPrefix().strip();
                    if (!prefix.isEmpty()) {
                        taskRecordId.append(prefix).append("-");
                    }
                    taskRecordId.append(UUID.randomUUID());
                    orderReq.setTaskLabel(taskDefLabel);
                    orderReq.setTaskRecordId(taskRecordId.toString());
                    ResultVo vo = this.agvApiService.asyncSetOrder(orderReq);
                    log.info("scheduleModbusTask: create task id=[{}], label=[{}] for instance [{}]", new Object[]{orderReq.getTaskRecordId(), orderReq.getTaskLabel(), instance.getName()});
                    if (vo.getCode() == 200) {
                        if (Objects.equals(instance.getReset(), 1) && instance.getResetAddr() != null && instance.getResetValue() != null) {
                            try {
                                Class clazz = DataType.getJavaType((int)(instance.getResetType() == null ? 2 : instance.getResetType()));
                                Number resetValue = this.convertCurrentValue(instance.getResetValue(), clazz);
                                Modbus4jUtils.writeSingleValueByInstanceName((String)instance.getName(), (Integer)instance.getResetAddr(), (Number)resetValue, (String)("modbus instance " + instance.getName() + " reset"));
                                log.info("scheduleModbusTask: reset task id=[{}], label=[{}] for instance [{}]", new Object[]{orderReq.getTaskRecordId(), orderReq.getTaskLabel(), instance.getName()});
                            }
                            catch (Exception e) {
                                log.error("scheduleModbusTask: reset modbus instance {} error {}", (Object)instance.getName(), (Object)e.getMessage());
                            }
                        }
                    } else {
                        log.error("scheduleModbusTask: create task failed, label = {}, modbus instance name = {}", (Object)taskDefLabel, (Object)instance.getName());
                    }
                }
            }
        });
    }

    private Number convertCurrentValue(String targetValueStr, Class<?> clazz) {
        if (clazz == Boolean.class) {
            return Boolean.parseBoolean(targetValueStr) ? 1 : 0;
        }
        if (clazz == Short.class) {
            return Short.valueOf(targetValueStr);
        }
        if (clazz == Integer.class) {
            return Integer.valueOf(targetValueStr);
        }
        if (clazz == Long.class) {
            return Long.valueOf(targetValueStr);
        }
        if (clazz == Float.class) {
            return Float.valueOf(targetValueStr);
        }
        if (clazz == Double.class) {
            return Double.valueOf(targetValueStr);
        }
        if (clazz == BigInteger.class) {
            return BigInteger.valueOf(Long.parseLong(targetValueStr));
        }
        return null;
    }
}

