/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.BlockNameEnum
 *  com.seer.rds.service.general.block.BlockProduceBp
 *  com.seer.rds.vo.CAgvOperationVo
 *  com.seer.rds.vo.block.DelayBpInputVo
 *  com.seer.rds.vo.block.ModbusCommonWaitBpInput
 *  com.seer.rds.vo.block.ModbusCommonWriteBpInput
 *  com.seer.rds.vo.block.ScriptVariablesBpInputVo
 *  com.seer.rds.vo.block.SetSiteEmptyBpInputVo
 *  com.seer.rds.vo.block.SetSiteFilledBpInputVo
 *  com.seer.rds.vo.block.SetSiteLockedBpInputVo
 *  com.seer.rds.vo.block.SetSiteUnlockedBpInput
 *  com.seer.rds.vo.general.ChildrenInputParamsVo
 *  com.seer.rds.vo.general.SiteVo
 *  com.seer.rds.vo.general.VehicleVo
 *  com.seer.rds.vo.general.WindDetailBlockVo
 *  com.seer.rds.vo.wind.CAgvOperationBpField
 *  com.seer.rds.vo.wind.CSelectAgvBpField
 *  com.seer.rds.vo.wind.DelayBpField
 *  com.seer.rds.vo.wind.FieldTypeValueField
 *  com.seer.rds.vo.wind.GetIdleSiteBpField
 *  com.seer.rds.vo.wind.ModbusCommonWaitBpField
 *  com.seer.rds.vo.wind.ModbusCommonWriteBpField
 *  com.seer.rds.vo.wind.ScriptBpField
 *  com.seer.rds.vo.wind.SetSiteEmptyBpField
 *  com.seer.rds.vo.wind.SetSiteFilledBpField
 *  com.seer.rds.vo.wind.SetSiteLockedBpField
 *  com.seer.rds.vo.wind.SetSiteUnlockedBpField
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.general.block;

import com.seer.rds.constant.BlockNameEnum;
import com.seer.rds.vo.CAgvOperationVo;
import com.seer.rds.vo.block.DelayBpInputVo;
import com.seer.rds.vo.block.ModbusCommonWaitBpInput;
import com.seer.rds.vo.block.ModbusCommonWriteBpInput;
import com.seer.rds.vo.block.ScriptVariablesBpInputVo;
import com.seer.rds.vo.block.SetSiteEmptyBpInputVo;
import com.seer.rds.vo.block.SetSiteFilledBpInputVo;
import com.seer.rds.vo.block.SetSiteLockedBpInputVo;
import com.seer.rds.vo.block.SetSiteUnlockedBpInput;
import com.seer.rds.vo.general.ChildrenInputParamsVo;
import com.seer.rds.vo.general.SiteVo;
import com.seer.rds.vo.general.VehicleVo;
import com.seer.rds.vo.general.WindDetailBlockVo;
import com.seer.rds.vo.wind.CAgvOperationBpField;
import com.seer.rds.vo.wind.CSelectAgvBpField;
import com.seer.rds.vo.wind.DelayBpField;
import com.seer.rds.vo.wind.FieldTypeValueField;
import com.seer.rds.vo.wind.GetIdleSiteBpField;
import com.seer.rds.vo.wind.ModbusCommonWaitBpField;
import com.seer.rds.vo.wind.ModbusCommonWriteBpField;
import com.seer.rds.vo.wind.ScriptBpField;
import com.seer.rds.vo.wind.SetSiteEmptyBpField;
import com.seer.rds.vo.wind.SetSiteFilledBpField;
import com.seer.rds.vo.wind.SetSiteLockedBpField;
import com.seer.rds.vo.wind.SetSiteUnlockedBpField;
import java.util.HashMap;
import org.springframework.stereotype.Component;

@Component
public class BlockProduceBp {
    public static String preBlockName = "b";

    public WindDetailBlockVo getIdleSiteBp(int id, SiteVo site) {
        ChildrenInputParamsVo paramsVo;
        WindDetailBlockVo siteBlock = new WindDetailBlockVo();
        siteBlock.setId(Integer.valueOf(id));
        siteBlock.setName(preBlockName + id);
        siteBlock.setBlockType(BlockNameEnum.GetIdleSiteBp.name());
        HashMap<String, ChildrenInputParamsVo> inputParams = new HashMap<String, ChildrenInputParamsVo>();
        ChildrenInputParamsVo lockVo = new ChildrenInputParamsVo();
        lockVo.setType(FieldTypeValueField.Simple);
        lockVo.setValue((Object)site.getLocked());
        inputParams.put(GetIdleSiteBpField.locked, lockVo);
        if (site.getFilled() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)site.getFilled());
            inputParams.put(GetIdleSiteBpField.filled, paramsVo);
        }
        if (site.getSiteId() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)site.getSiteId());
            inputParams.put(GetIdleSiteBpField.siteId, paramsVo);
        }
        ChildrenInputParamsVo lock = new ChildrenInputParamsVo();
        lock.setType(FieldTypeValueField.Simple);
        lock.setValue((Object)true);
        if (site.getLocked() != null) {
            lock.setValue((Object)site.getLock());
        }
        inputParams.put(GetIdleSiteBpField.lock, lock);
        if (site.getGroup() != null) {
            ChildrenInputParamsVo paramsVo2 = new ChildrenInputParamsVo();
            paramsVo2.setType(FieldTypeValueField.Simple);
            paramsVo2.setValue((Object)site.getGroup());
            inputParams.put(GetIdleSiteBpField.groupName, paramsVo2);
        }
        siteBlock.setInputParams(inputParams);
        return siteBlock;
    }

    public WindDetailBlockVo cSelectAgvBp(int id, VehicleVo vehicleVo) {
        ChildrenInputParamsVo paramsVo;
        WindDetailBlockVo cSelectAgvBlock = new WindDetailBlockVo();
        HashMap<String, ChildrenInputParamsVo> inputParams = new HashMap<String, ChildrenInputParamsVo>();
        cSelectAgvBlock.setId(Integer.valueOf(id));
        cSelectAgvBlock.setName(preBlockName + id);
        cSelectAgvBlock.setBlockType(BlockNameEnum.CSelectAgvBp.name());
        ChildrenInputParamsVo keyRouteVo = new ChildrenInputParamsVo();
        keyRouteVo.setType(FieldTypeValueField.Expression);
        keyRouteVo.setValue((Object)vehicleVo.getKeyRoute());
        inputParams.put(CSelectAgvBpField.keyRoute, keyRouteVo);
        if (vehicleVo.getTag() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)vehicleVo.getTag());
            inputParams.put(CSelectAgvBpField.tag, paramsVo);
        }
        if (vehicleVo.getName() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)vehicleVo.getName());
            inputParams.put(CSelectAgvBpField.vehicle, paramsVo);
        }
        if (vehicleVo.getGroup() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)vehicleVo.getGroup());
            inputParams.put(CSelectAgvBpField.group, paramsVo);
        }
        cSelectAgvBlock.setInputParams(inputParams);
        return cSelectAgvBlock;
    }

    public WindDetailBlockVo cAgvOperationBp(int id, CAgvOperationVo cAgvOperationVo) {
        ChildrenInputParamsVo paramsVo;
        WindDetailBlockVo cAgvOperationBlock = new WindDetailBlockVo();
        HashMap<String, ChildrenInputParamsVo> inputParams = new HashMap<String, ChildrenInputParamsVo>();
        cAgvOperationBlock.setId(Integer.valueOf(id));
        cAgvOperationBlock.setName(preBlockName + id);
        cAgvOperationBlock.setBlockType(BlockNameEnum.CAgvOperationBp.name());
        if (cAgvOperationVo.getAgvId() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Expression);
            paramsVo.setValue((Object)cAgvOperationVo.getAgvId());
            inputParams.put(CAgvOperationBpField.agvId, paramsVo);
        }
        if (cAgvOperationVo.getTargetSiteLabel() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Expression);
            paramsVo.setValue((Object)cAgvOperationVo.getTargetSiteLabel());
            inputParams.put(CAgvOperationBpField.targetSiteLabel, paramsVo);
        }
        if (cAgvOperationVo.getScriptName() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)cAgvOperationVo.getScriptName());
            inputParams.put(CAgvOperationBpField.scriptName, paramsVo);
        }
        if (cAgvOperationVo.getVar_param() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)cAgvOperationVo.getVar_param());
            inputParams.put("var_param", paramsVo);
        }
        cAgvOperationBlock.setInputParams(inputParams);
        return cAgvOperationBlock;
    }

    public WindDetailBlockVo modbusCommonWaitBp(int id, ModbusCommonWaitBpInput modbusCommonWaitBpInput) {
        ChildrenInputParamsVo paramsVo;
        WindDetailBlockVo modbusCommonWaitBlock = new WindDetailBlockVo();
        HashMap<String, ChildrenInputParamsVo> inputParams = new HashMap<String, ChildrenInputParamsVo>();
        modbusCommonWaitBlock.setId(Integer.valueOf(id));
        modbusCommonWaitBlock.setName(preBlockName + id);
        modbusCommonWaitBlock.setBlockType(BlockNameEnum.ModbusCommonWaitBp.name());
        if (modbusCommonWaitBpInput.getIpModbusHost() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)modbusCommonWaitBpInput.ipModbusHost);
            inputParams.put(ModbusCommonWaitBpField.ipModbusHost, paramsVo);
        }
        if (modbusCommonWaitBpInput.getIpModbusPort() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)modbusCommonWaitBpInput.getIpModbusPort());
            inputParams.put(ModbusCommonWaitBpField.ipModbusPort, paramsVo);
        }
        if (modbusCommonWaitBpInput.getIpSlaveId() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)modbusCommonWaitBpInput.getIpSlaveId());
            inputParams.put(ModbusCommonWaitBpField.ipSlaveId, paramsVo);
        }
        if (modbusCommonWaitBpInput.getAddrType() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)modbusCommonWaitBpInput.getAddrType());
            inputParams.put(ModbusCommonWaitBpField.addrType, paramsVo);
        }
        if (modbusCommonWaitBpInput.getIpAddress() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)modbusCommonWaitBpInput.getIpAddress());
            inputParams.put(ModbusCommonWaitBpField.ipAddress, paramsVo);
        }
        if (modbusCommonWaitBpInput.getIpRegisterData() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)modbusCommonWaitBpInput.getIpRegisterData());
            inputParams.put(ModbusCommonWaitBpField.ipRegisterData, paramsVo);
        }
        modbusCommonWaitBlock.setInputParams(inputParams);
        return modbusCommonWaitBlock;
    }

    public WindDetailBlockVo modbusCommonWriteBp(int id, ModbusCommonWriteBpInput modbusCommonWriteBpInput) {
        ChildrenInputParamsVo paramsVo;
        WindDetailBlockVo modbusCommonWriteBlock = new WindDetailBlockVo();
        HashMap<String, ChildrenInputParamsVo> inputParams = new HashMap<String, ChildrenInputParamsVo>();
        modbusCommonWriteBlock.setId(Integer.valueOf(id));
        modbusCommonWriteBlock.setName(preBlockName + id);
        modbusCommonWriteBlock.setBlockType(BlockNameEnum.ModbusCommonWriteBp.name());
        if (modbusCommonWriteBpInput.getIpModbusHost() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)modbusCommonWriteBpInput.ipModbusHost);
            inputParams.put(ModbusCommonWriteBpField.ipModbusHost, paramsVo);
        }
        if (modbusCommonWriteBpInput.getIpModbusPort() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)modbusCommonWriteBpInput.getIpModbusPort());
            inputParams.put(ModbusCommonWriteBpField.ipModbusPort, paramsVo);
        }
        if (modbusCommonWriteBpInput.getIpSlaveId() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)modbusCommonWriteBpInput.getIpSlaveId());
            inputParams.put(ModbusCommonWriteBpField.ipSlaveId, paramsVo);
        }
        if (modbusCommonWriteBpInput.getAddrType() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)modbusCommonWriteBpInput.getAddrType());
            inputParams.put(ModbusCommonWriteBpField.addrType, paramsVo);
        }
        if (modbusCommonWriteBpInput.getIpAddress() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)modbusCommonWriteBpInput.getIpAddress());
            inputParams.put(ModbusCommonWriteBpField.ipAddress, paramsVo);
        }
        if (modbusCommonWriteBpInput.getNewValue() != null) {
            paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)modbusCommonWriteBpInput.getNewValue());
            inputParams.put(ModbusCommonWriteBpField.newValue, paramsVo);
        }
        modbusCommonWriteBlock.setInputParams(inputParams);
        return modbusCommonWriteBlock;
    }

    public WindDetailBlockVo setSiteUnlockedBp(int id, SetSiteUnlockedBpInput setSiteUnlockedBpInput) {
        WindDetailBlockVo setSiteUnlockedBlock = new WindDetailBlockVo();
        HashMap<String, ChildrenInputParamsVo> inputParams = new HashMap<String, ChildrenInputParamsVo>();
        setSiteUnlockedBlock.setId(Integer.valueOf(id));
        setSiteUnlockedBlock.setName(preBlockName + id);
        setSiteUnlockedBlock.setBlockType(BlockNameEnum.SetSiteUnlockedBp.name());
        if (setSiteUnlockedBpInput.getSiteId() != null) {
            ChildrenInputParamsVo paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Expression);
            paramsVo.setValue((Object)setSiteUnlockedBpInput.getSiteId());
            inputParams.put(SetSiteUnlockedBpField.siteId, paramsVo);
        }
        setSiteUnlockedBlock.setInputParams(inputParams);
        return setSiteUnlockedBlock;
    }

    public WindDetailBlockVo delayBp(int id, DelayBpInputVo delayBpInputVo) {
        WindDetailBlockVo delayBlock = new WindDetailBlockVo();
        HashMap<String, ChildrenInputParamsVo> inputParams = new HashMap<String, ChildrenInputParamsVo>();
        delayBlock.setId(Integer.valueOf(id));
        delayBlock.setName(preBlockName + id);
        delayBlock.setBlockType(BlockNameEnum.DelayBp.name());
        if (delayBpInputVo.getTimeMillis() != null) {
            ChildrenInputParamsVo paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)delayBpInputVo.getTimeMillis());
            inputParams.put(DelayBpField.timeMillis, paramsVo);
        }
        delayBlock.setInputParams(inputParams);
        return delayBlock;
    }

    public WindDetailBlockVo setSiteEmptyBp(int id, SetSiteEmptyBpInputVo siteVo) {
        WindDetailBlockVo siteEmptyBlock = new WindDetailBlockVo();
        HashMap<String, ChildrenInputParamsVo> inputParams = new HashMap<String, ChildrenInputParamsVo>();
        siteEmptyBlock.setId(Integer.valueOf(id));
        siteEmptyBlock.setName(preBlockName + id);
        siteEmptyBlock.setBlockType(BlockNameEnum.SetSiteEmptyBp.name());
        if (siteVo.getSiteId() != null) {
            ChildrenInputParamsVo paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Expression);
            paramsVo.setValue((Object)siteVo.getSiteId());
            inputParams.put(SetSiteEmptyBpField.siteId, paramsVo);
        }
        siteEmptyBlock.setInputParams(inputParams);
        return siteEmptyBlock;
    }

    public WindDetailBlockVo setSiteFilledBp(int id, SetSiteFilledBpInputVo siteVo) {
        WindDetailBlockVo siteFillBlock = new WindDetailBlockVo();
        HashMap<String, ChildrenInputParamsVo> inputParams = new HashMap<String, ChildrenInputParamsVo>();
        siteFillBlock.setId(Integer.valueOf(id));
        siteFillBlock.setName(preBlockName + id);
        siteFillBlock.setBlockType(BlockNameEnum.SetSiteFilledBp.name());
        if (siteVo.getSiteId() != null) {
            ChildrenInputParamsVo paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Expression);
            paramsVo.setValue((Object)siteVo.getSiteId());
            inputParams.put(SetSiteFilledBpField.siteId, paramsVo);
        }
        siteFillBlock.setInputParams(inputParams);
        return siteFillBlock;
    }

    public WindDetailBlockVo scriptVariablesBp(int id, ScriptVariablesBpInputVo scriptVo) {
        WindDetailBlockVo scriptVariablesBlock = new WindDetailBlockVo();
        HashMap<String, ChildrenInputParamsVo> inputParams = new HashMap<String, ChildrenInputParamsVo>();
        scriptVariablesBlock.setId(Integer.valueOf(id));
        scriptVariablesBlock.setName(preBlockName + id);
        scriptVariablesBlock.setBlockType(BlockNameEnum.ScriptVariablesBp.name());
        if (scriptVo.getFunctionName() != null) {
            ChildrenInputParamsVo paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Simple);
            paramsVo.setValue((Object)scriptVo.getFunctionName());
            inputParams.put(ScriptBpField.functionName, paramsVo);
        }
        scriptVariablesBlock.setInputParams(inputParams);
        return scriptVariablesBlock;
    }

    public WindDetailBlockVo setSiteLockedBp(int id, SetSiteLockedBpInputVo site) {
        WindDetailBlockVo setSiteLockedBlock = new WindDetailBlockVo();
        HashMap<String, ChildrenInputParamsVo> inputParams = new HashMap<String, ChildrenInputParamsVo>();
        setSiteLockedBlock.setId(Integer.valueOf(id));
        setSiteLockedBlock.setName(preBlockName + id);
        setSiteLockedBlock.setBlockType(BlockNameEnum.SetSiteLockedBp.name());
        if (site.getSiteId() != null) {
            ChildrenInputParamsVo paramsVo = new ChildrenInputParamsVo();
            paramsVo.setType(FieldTypeValueField.Expression);
            paramsVo.setValue((Object)site.getSiteId());
            inputParams.put(SetSiteLockedBpField.siteId, paramsVo);
        }
        setSiteLockedBlock.setInputParams(inputParams);
        return setSiteLockedBlock;
    }
}

