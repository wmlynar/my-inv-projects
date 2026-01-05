/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.general.GeneralBusiness
 *  com.seer.rds.service.general.GeneralAbstract
 *  com.seer.rds.service.general.block.BlockProduceBp
 *  com.seer.rds.vo.block.ModbusCommonWaitBpInput
 *  com.seer.rds.vo.block.ModbusCommonWriteBpInput
 *  com.seer.rds.vo.general.AddrsVo
 *  com.seer.rds.vo.general.ModbusVo
 *  com.seer.rds.vo.general.ProtocolsVo
 *  com.seer.rds.vo.general.WindDetailBlockVo
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.general;

import com.seer.rds.model.general.GeneralBusiness;
import com.seer.rds.service.general.block.BlockProduceBp;
import com.seer.rds.vo.block.ModbusCommonWaitBpInput;
import com.seer.rds.vo.block.ModbusCommonWriteBpInput;
import com.seer.rds.vo.general.AddrsVo;
import com.seer.rds.vo.general.ModbusVo;
import com.seer.rds.vo.general.ProtocolsVo;
import com.seer.rds.vo.general.WindDetailBlockVo;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component
@Scope(value="prototype")
public abstract class GeneralAbstract {
    private static final Logger log = LoggerFactory.getLogger(GeneralAbstract.class);
    @Autowired
    BlockProduceBp blockProduceBp;
    String defaultAct = "Wait";
    String preBlocksOutParams = "blocks";
    String pointStr = ".";
    String preWorkSite = "\"PRE-\"+";
    String binTask = "binTask";
    Integer order = 0;
    String target = "";
    public static final List<String> blockChildList = Arrays.asList("default");

    abstract WindDetailBlockVo createWindTaskDefBpJson(GeneralBusiness var1) throws Exception;

    protected boolean createWindDetail(WindDetailBlockVo root, WindDetailBlockVo child, String key, Integer id) {
        if (root.getId() == id) {
            if (root.getChildren().get(key) != null) {
                ((List)root.getChildren().get(key)).add(child);
            } else {
                ArrayList<WindDetailBlockVo> tmp = new ArrayList<WindDetailBlockVo>();
                tmp.add(child);
                root.getChildren().put(key, tmp);
            }
            return true;
        }
        Map children = root.getChildren();
        Set keys = children.keySet();
        for (String s : keys) {
            List windDetailBlockVos = (List)children.get(s);
            for (WindDetailBlockVo wb : windDetailBlockVos) {
                if (!this.createWindDetail(wb, child, key, id)) continue;
                return true;
            }
        }
        return false;
    }

    protected Boolean modbusMateWait(ProtocolsVo vo, String name, ModbusCommonWaitBpInput input) {
        List modbus = vo.getModbus();
        for (ModbusVo modbusVo : modbus) {
            for (AddrsVo addr : modbusVo.getAddrs()) {
                if (!name.equals(addr.getAddrName())) continue;
                input.setAddrType(addr.getAddrType());
                input.setIpModbusHost(modbusVo.getIp());
                input.setIpModbusPort(modbusVo.getPort());
                input.setIpSlaveId(modbusVo.getSlaveId());
                input.setIpAddress(addr.getAddrNo());
                return true;
            }
        }
        log.info("modbusMateWait no exits name = {}", (Object)name);
        return false;
    }

    protected Boolean modbusMateWrite(ProtocolsVo vo, String name, ModbusCommonWriteBpInput input) {
        List modbus = vo.getModbus();
        for (ModbusVo modbusVo : modbus) {
            for (AddrsVo addr : modbusVo.getAddrs()) {
                if (!name.equals(addr.getAddrName())) continue;
                input.setAddrType(addr.getAddrType());
                input.setIpModbusHost(modbusVo.getIp());
                input.setIpModbusPort(modbusVo.getPort());
                input.setIpSlaveId(modbusVo.getSlaveId());
                input.setIpAddress(addr.getAddrNo());
                return true;
            }
        }
        log.info("modbusMateWrite no exits name = {}", (Object)name);
        return false;
    }
}

