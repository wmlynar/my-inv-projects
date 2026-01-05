/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.dao.SysAlarmMapper
 *  com.seer.rds.model.admin.SysAlarm
 *  com.seer.rds.service.admin.SysAlarmService
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.websocket.RdsServer
 *  javax.websocket.Session
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.service.admin;

import com.alibaba.fastjson.JSON;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.dao.SysAlarmMapper;
import com.seer.rds.model.admin.SysAlarm;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.websocket.RdsServer;
import java.util.List;
import javax.websocket.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SysAlarmService {
    @Autowired
    private SysAlarmMapper sysAlarmMapper;
    @Autowired
    private RdsServer rdsServer;

    public void noticeAlarmInfo(Session toSession) {
        List alarms = this.sysAlarmMapper.findAll();
        ResultVo result = ResultVo.success((CommonCodeEnum)CommonCodeEnum.WS_MSG_ALARM, (Object)alarms);
        this.rdsServer.sendMessage(JSON.toJSONString((Object)result), toSession);
    }

    public void noticeWebWithAlarmInfo() {
        List alarms = this.sysAlarmMapper.findAll();
        ResultVo result = ResultVo.success((CommonCodeEnum)CommonCodeEnum.WS_MSG_ALARM, (Object)alarms);
        this.rdsServer.sendWebMessage(JSON.toJSONString((Object)result));
    }

    public void noticeWebWithTaskAlarmInfo() {
        List alarms = this.sysAlarmMapper.findAll();
        ResultVo result = ResultVo.success((CommonCodeEnum)CommonCodeEnum.WS_MSG_ALARM, (Object)alarms);
        this.rdsServer.sendWebMessage(JSON.toJSONString((Object)result));
    }

    @Transactional(rollbackFor={Exception.class})
    public void deleteAlarmByCode(int code) {
        this.sysAlarmMapper.deleteByCode(Integer.valueOf(code));
    }

    @Transactional(rollbackFor={Exception.class})
    public void deleteAlarmAndNoticeWeb(int code) {
        this.sysAlarmMapper.deleteByCode(Integer.valueOf(code));
        this.noticeWebWithAlarmInfo();
    }

    @Transactional(rollbackFor={Exception.class})
    public void deleteTaskAlarmAndNoticeWeb(String identification) {
        this.sysAlarmMapper.deleteByIdentification(identification);
    }

    @Transactional(rollbackFor={Exception.class})
    public void deleteTaskAlarmLikeAndNoticeWeb(String identification) {
        this.sysAlarmMapper.deleteByIdentificationLike(identification + "%");
    }

    public void deleteScriptNoticeAlarm() {
        this.noticeWebWithAlarmInfo();
    }

    public void addAlarmInfo(int code, int errorLevel, String alarmMessage) {
        SysAlarm sysAlarm = new SysAlarm();
        sysAlarm.setMessage(alarmMessage);
        sysAlarm.setCode(Integer.valueOf(code));
        sysAlarm.setLevel(Integer.valueOf(errorLevel));
        this.sysAlarmMapper.save((Object)sysAlarm);
        this.noticeWebWithAlarmInfo();
    }

    public void addTaskAlarmInfo(String identification, int code, String alarmMessage, int level) {
        this.sysAlarmMapper.deleteByIdentification(identification);
        SysAlarm sysAlarm = new SysAlarm();
        sysAlarm.setMessage(alarmMessage);
        sysAlarm.setCode(Integer.valueOf(code));
        sysAlarm.setLevel(Integer.valueOf(level));
        sysAlarm.setIdentification(identification);
        this.sysAlarmMapper.save((Object)sysAlarm);
    }

    public void updateAlarmInfo(int code, int errorLevel, String alarmMessage) {
        this.sysAlarmMapper.update(code, errorLevel, alarmMessage);
        this.noticeWebWithAlarmInfo();
    }
}

