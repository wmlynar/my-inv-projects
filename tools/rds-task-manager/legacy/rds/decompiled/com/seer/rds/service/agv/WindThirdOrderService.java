/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.dao.WindThirdOrderMapper
 *  com.seer.rds.model.wind.WindThirdOrder
 *  com.seer.rds.service.agv.WindThirdOrderService
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.service.agv;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.dao.WindThirdOrderMapper;
import com.seer.rds.model.wind.WindThirdOrder;
import java.util.Date;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WindThirdOrderService {
    @Autowired
    private WindThirdOrderMapper orderMapper;

    public List<WindThirdOrder> findByStatusOrderByCreateDateDesc(Integer status) {
        return this.orderMapper.findByStatusOrderByCreateDateDesc(status);
    }

    public List<WindThirdOrder> findByStatusOrderByCreateDateAsc(Integer status) {
        return this.orderMapper.findByStatusOrderByCreateDateAsc(status);
    }

    @Transactional
    public void saveOrder(String params) {
        JSONObject paramsJson = JSONObject.parseObject((String)params);
        WindThirdOrder order = WindThirdOrder.builder().createDate(new Date()).params(params).status(Integer.valueOf(0)).type(paramsJson.get((Object)"type").toString()).build();
        this.orderMapper.save((Object)order);
    }

    @Transactional
    public void updateOrder(WindThirdOrder order) {
        this.orderMapper.save((Object)order);
    }
}

