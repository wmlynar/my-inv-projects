/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.dao.WindBlockRecordMapper
 *  com.seer.rds.model.wind.WindBlockRecord
 *  com.seer.rds.service.agv.WindBlockRecordService
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.util.ResourceUtil
 *  com.seer.rds.vo.WindBlockRunningVo
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.agv;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.dao.WindBlockRecordMapper;
import com.seer.rds.model.wind.WindBlockRecord;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.util.ResourceUtil;
import com.seer.rds.vo.WindBlockRunningVo;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class WindBlockRecordService {
    @Autowired
    private WindBlockRecordMapper windBlockRecordMapper;
    @Autowired
    private LocaleMessageUtil localeMessageUtil;

    public List<WindBlockRunningVo> findByTaskRecordId(String taskRecordId, Locale locale) {
        ArrayList<WindBlockRunningVo> blockList = new ArrayList<WindBlockRunningVo>();
        List blockRecordList = this.windBlockRecordMapper.findByTaskRecordId(taskRecordId);
        for (WindBlockRecord windBlockRecord : blockRecordList) {
            WindBlockRunningVo windBlockRunningVo = new WindBlockRunningVo();
            windBlockRunningVo.setBlockConfigId(windBlockRecord.getBlockConfigId());
            windBlockRunningVo.setRemark(windBlockRecord.getRemark());
            windBlockRunningVo.setBlockName(windBlockRecord.getBlockName());
            windBlockRunningVo.setStatus(windBlockRecord.getStatus());
            windBlockRunningVo.setStartedOn(windBlockRecord.getStartedOn());
            windBlockRunningVo.setEndedOn(windBlockRecord.getEndedOn());
            windBlockRunningVo.setEndedReason(this.localeMessageUtil.getMessageMatch(windBlockRecord.getEndedReason(), locale));
            String blockName = windBlockRecord.getBlockName();
            if ("RootBp".equals(blockName)) {
                windBlockRunningVo.setBlockLabel("start block");
            } else {
                String suffix = locale.toString().split("_")[0] + ".json";
                String bpDefStr = ResourceUtil.getResourcesByStream((String)("/bpdef/" + blockName + "_" + suffix));
                JSONObject bpDefJson = JSONObject.parseObject((String)bpDefStr);
                String bplabel = bpDefJson == null ? "" : bpDefJson.getString("label");
                windBlockRunningVo.setBlockLabel(bplabel);
            }
            blockList.add(windBlockRunningVo);
        }
        return blockList;
    }

    public List<WindBlockRecord> findBlocksByTaskRecordId(String taskRecordId) {
        return this.windBlockRecordMapper.findWindBlockRecordByTaskRecordIdOrderByEndedOnDesc(taskRecordId);
    }

    public Page<WindBlockRecord> findBlocksByTaskRecordIdPageAble(int currentPage, int pageSize, String taskRecordId) {
        PageRequest pageable = PageRequest.of((int)(currentPage - 1), (int)pageSize);
        return this.windBlockRecordMapper.findWindBlockRecordByTaskRecordIdOrderByEndedOnDesc(taskRecordId, (Pageable)pageable);
    }
}

