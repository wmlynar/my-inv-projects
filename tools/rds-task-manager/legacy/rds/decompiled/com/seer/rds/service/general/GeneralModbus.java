/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.constant.BlockNameEnum
 *  com.seer.rds.model.general.GeneralBusiness
 *  com.seer.rds.service.general.GeneralAbstract
 *  com.seer.rds.service.general.GeneralModbus
 *  com.seer.rds.service.general.block.BlockOutParams
 *  com.seer.rds.vo.CAgvOperationVo
 *  com.seer.rds.vo.block.DelayBpInputVo
 *  com.seer.rds.vo.block.ModbusCommonWaitBpInput
 *  com.seer.rds.vo.block.ModbusCommonWriteBpInput
 *  com.seer.rds.vo.block.ScriptVariablesBpInputVo
 *  com.seer.rds.vo.block.SetSiteEmptyBpInputVo
 *  com.seer.rds.vo.block.SetSiteFilledBpInputVo
 *  com.seer.rds.vo.block.SetSiteLockedBpInputVo
 *  com.seer.rds.vo.block.SetSiteUnlockedBpInput
 *  com.seer.rds.vo.general.ActionVo
 *  com.seer.rds.vo.general.LogicVo
 *  com.seer.rds.vo.general.MovementParamsVo
 *  com.seer.rds.vo.general.ProtocolsVo
 *  com.seer.rds.vo.general.SiteVo
 *  com.seer.rds.vo.general.TransportVo
 *  com.seer.rds.vo.general.VehicleVo
 *  com.seer.rds.vo.general.WindDetailBlockVo
 *  org.apache.commons.lang3.StringUtils
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.general;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.constant.BlockNameEnum;
import com.seer.rds.model.general.GeneralBusiness;
import com.seer.rds.service.general.GeneralAbstract;
import com.seer.rds.service.general.block.BlockOutParams;
import com.seer.rds.vo.CAgvOperationVo;
import com.seer.rds.vo.block.DelayBpInputVo;
import com.seer.rds.vo.block.ModbusCommonWaitBpInput;
import com.seer.rds.vo.block.ModbusCommonWriteBpInput;
import com.seer.rds.vo.block.ScriptVariablesBpInputVo;
import com.seer.rds.vo.block.SetSiteEmptyBpInputVo;
import com.seer.rds.vo.block.SetSiteFilledBpInputVo;
import com.seer.rds.vo.block.SetSiteLockedBpInputVo;
import com.seer.rds.vo.block.SetSiteUnlockedBpInput;
import com.seer.rds.vo.general.ActionVo;
import com.seer.rds.vo.general.LogicVo;
import com.seer.rds.vo.general.MovementParamsVo;
import com.seer.rds.vo.general.ProtocolsVo;
import com.seer.rds.vo.general.SiteVo;
import com.seer.rds.vo.general.TransportVo;
import com.seer.rds.vo.general.VehicleVo;
import com.seer.rds.vo.general.WindDetailBlockVo;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.commons.lang3.StringUtils;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component
@Scope(value="prototype")
public class GeneralModbus
extends GeneralAbstract {
    WindDetailBlockVo createWindTaskDefBpJson(GeneralBusiness generalBusiness) throws Exception {
        String protocols = generalBusiness.getProtocols();
        String transport = generalBusiness.getTransport();
        TransportVo transportVo = (TransportVo)JSONObject.parseObject((String)transport, TransportVo.class);
        ProtocolsVo protocolsVo = (ProtocolsVo)JSONObject.parseObject((String)protocols, ProtocolsVo.class);
        List action = transportVo.getModbus().getAction();
        WindDetailBlockVo root = new WindDetailBlockVo();
        HashMap outParams = new HashMap();
        for (int j = 0; j < action.size(); ++j) {
            SiteVo site = ((ActionVo)action.get(j)).getSite();
            if (StringUtils.isEmpty((CharSequence)site.getSiteId()) && StringUtils.isEmpty((CharSequence)site.getGroup()) && StringUtils.isEmpty((CharSequence)site.getScriptFun())) continue;
            if (StringUtils.isEmpty((CharSequence)site.getSiteId()) && StringUtils.isEmpty((CharSequence)site.getGroup()) && StringUtils.isNotEmpty((CharSequence)site.getScriptFun())) {
                ScriptVariablesBpInputVo scriptVariablesBpInputVo = new ScriptVariablesBpInputVo();
                scriptVariablesBpInputVo.setFunctionName(site.getScriptFun());
                this.order = this.order + 1;
                WindDetailBlockVo scriptBlock = this.blockProduceBp.scriptVariablesBp(this.order.intValue(), scriptVariablesBpInputVo);
                HashMap<String, String> out = new HashMap<String, String>();
                out.put(BlockOutParams.siteId, String.format("task.variables.%s", site.getScriptOutParam()));
                outParams.put(j, out);
                super.createWindDetail(root, scriptBlock, (String)blockChildList.get(0), root.getId());
                SetSiteLockedBpInputVo setSiteLockedBp = new SetSiteLockedBpInputVo();
                setSiteLockedBp.setSiteId(String.format("task.variables.%s", site.getScriptOutParam()));
                this.order = this.order + 1;
                WindDetailBlockVo lockSite = this.blockProduceBp.setSiteLockedBp(this.order.intValue(), setSiteLockedBp);
                super.createWindDetail(root, lockSite, (String)blockChildList.get(0), root.getId());
                continue;
            }
            site.setLock(Boolean.valueOf(true));
            site.setLocked(Boolean.valueOf(false));
            this.order = this.order + 1;
            WindDetailBlockVo siteBlock = this.blockProduceBp.getIdleSiteBp(this.order.intValue(), site);
            HashMap<String, String> out = new HashMap<String, String>();
            out.put(BlockOutParams.siteId, String.format("%s.b%s.%s", this.preBlocksOutParams, this.order, BlockOutParams.siteId));
            outParams.put(j, out);
            super.createWindDetail(root, siteBlock, (String)blockChildList.get(0), root.getId());
        }
        VehicleVo vehicle = transportVo.getModbus().getVehicle();
        vehicle.setKeyRoute(((HashMap)outParams.get(0)).get(BlockOutParams.siteId).toString());
        this.order = this.order + 1;
        WindDetailBlockVo cSelectAgvBlock = this.blockProduceBp.cSelectAgvBp(this.order.intValue(), vehicle);
        super.createWindDetail(root, cSelectAgvBlock, (String)blockChildList.get(0), root.getId());
        for (int j = 0; j < action.size(); ++j) {
            MovementParamsVo endLogic;
            SiteVo site = ((ActionVo)action.get(j)).getSite();
            if (StringUtils.isEmpty((CharSequence)site.getSiteId()) && StringUtils.isEmpty((CharSequence)site.getGroup()) && StringUtils.isEmpty((CharSequence)site.getScriptFun())) continue;
            ActionVo actionVo = (ActionVo)action.get(j);
            MovementParamsVo preLogic = actionVo.getPreLogic();
            boolean result = this.logic(preLogic, outParams, j, cSelectAgvBlock, root, protocolsVo);
            if (!result) {
                return null;
            }
            CAgvOperationVo ca = CAgvOperationVo.builder().agvId(this.preBlocksOutParams + this.pointStr + cSelectAgvBlock.getName() + this.pointStr + BlockOutParams.selectedAgvId).scriptName(this.binTask).var_param(((ActionVo)action.get(j)).getBinTask()).targetSiteLabel(((HashMap)outParams.get(j)).get(BlockOutParams.siteId).toString()).build();
            this.order = this.order + 1;
            WindDetailBlockVo cAgvOperationBlock = this.blockProduceBp.cAgvOperationBp(this.order.intValue(), ca);
            super.createWindDetail(root, cAgvOperationBlock, (String)blockChildList.get(0), cSelectAgvBlock.getId());
            this.target = ((HashMap)outParams.get(j)).get(BlockOutParams.siteId).toString();
            if (site.getFilled() != null) {
                if (site.getFilled().booleanValue()) {
                    SetSiteEmptyBpInputVo setSiteEmptyBpInputVo = new SetSiteEmptyBpInputVo();
                    setSiteEmptyBpInputVo.setSiteId(this.target);
                    this.order = this.order + 1;
                    WindDetailBlockVo setSiteEmptyBp = this.blockProduceBp.setSiteEmptyBp(this.order.intValue(), setSiteEmptyBpInputVo);
                    super.createWindDetail(root, setSiteEmptyBp, (String)blockChildList.get(0), cSelectAgvBlock.getId());
                } else {
                    SetSiteFilledBpInputVo setSiteFilledBpInputVo = new SetSiteFilledBpInputVo();
                    setSiteFilledBpInputVo.setSiteId(this.target);
                    this.order = this.order + 1;
                    WindDetailBlockVo setSiteFilledBp = this.blockProduceBp.setSiteFilledBp(this.order.intValue(), setSiteFilledBpInputVo);
                    super.createWindDetail(root, setSiteFilledBp, (String)blockChildList.get(0), cSelectAgvBlock.getId());
                }
            }
            if (!(result = this.logic(endLogic = actionVo.getEndLogic(), outParams, j, cSelectAgvBlock, root, protocolsVo))) {
                return null;
            }
            SetSiteUnlockedBpInput setSiteUnlockedBpInput = new SetSiteUnlockedBpInput();
            setSiteUnlockedBpInput.setSiteId(((HashMap)outParams.get(j)).get(BlockOutParams.siteId).toString());
            this.order = this.order + 1;
            WindDetailBlockVo setSiteUnlockedBp = this.blockProduceBp.setSiteUnlockedBp(this.order.intValue(), setSiteUnlockedBpInput);
            super.createWindDetail(root, setSiteUnlockedBp, (String)blockChildList.get(0), cSelectAgvBlock.getId());
        }
        return root;
    }

    private boolean logic(MovementParamsVo movementParamsVo, Map<Integer, HashMap<String, Object>> outParams, int j, WindDetailBlockVo cSelectAgvBlock, WindDetailBlockVo root, ProtocolsVo protocolsVo) {
        if (movementParamsVo != null) {
            String tmp;
            String string = tmp = movementParamsVo.getPosition() == 0 ? outParams.get(j).get(BlockOutParams.siteId).toString() : this.preWorkSite + outParams.get(j).get(BlockOutParams.siteId).toString();
            if (!this.target.equals(tmp)) {
                this.target = tmp;
                CAgvOperationVo ca = CAgvOperationVo.builder().agvId(this.preBlocksOutParams + this.pointStr + cSelectAgvBlock.getName() + this.pointStr + BlockOutParams.selectedAgvId).scriptName(this.defaultAct).targetSiteLabel(this.target).build();
                this.order = this.order + 1;
                WindDetailBlockVo cAgvOperationBlock = this.blockProduceBp.cAgvOperationBp(this.order.intValue(), ca);
                super.createWindDetail(root, cAgvOperationBlock, (String)blockChildList.get(0), cSelectAgvBlock.getId());
            }
            List logic = movementParamsVo.getLogic();
            for (LogicVo logicVo : logic) {
                Boolean result;
                if (StringUtils.isEmpty((CharSequence)logicVo.getInput().getName())) continue;
                if (BlockNameEnum.ModbusCommonWaitBp.name().equals(logicVo.getBlockName())) {
                    ModbusCommonWaitBpInput modbusCommonWaitBpInput = new ModbusCommonWaitBpInput();
                    result = super.modbusMateWait(protocolsVo, logicVo.getInput().getName(), modbusCommonWaitBpInput);
                    if (!result.booleanValue()) {
                        return false;
                    }
                    modbusCommonWaitBpInput.setIpRegisterData(Integer.valueOf(logicVo.getInput().getValue().toString()));
                    this.order = this.order + 1;
                    WindDetailBlockVo modbusCommonWaitBp = this.blockProduceBp.modbusCommonWaitBp(this.order.intValue(), modbusCommonWaitBpInput);
                    super.createWindDetail(root, modbusCommonWaitBp, (String)blockChildList.get(0), cSelectAgvBlock.getId());
                    continue;
                }
                if (BlockNameEnum.ModbusCommonWriteBp.name().equals(logicVo.getBlockName())) {
                    ModbusCommonWriteBpInput modbusCommonWriteBpInput = new ModbusCommonWriteBpInput();
                    result = super.modbusMateWrite(protocolsVo, logicVo.getInput().getName(), modbusCommonWriteBpInput);
                    if (!result.booleanValue()) {
                        return false;
                    }
                    modbusCommonWriteBpInput.setNewValue(Integer.valueOf(logicVo.getInput().getValue().toString()));
                    this.order = this.order + 1;
                    WindDetailBlockVo modbusCommonWriteBp = this.blockProduceBp.modbusCommonWriteBp(this.order.intValue(), modbusCommonWriteBpInput);
                    super.createWindDetail(root, modbusCommonWriteBp, (String)blockChildList.get(0), cSelectAgvBlock.getId());
                    continue;
                }
                if (BlockNameEnum.DelayBp.name().equals(logicVo.getBlockName())) {
                    DelayBpInputVo delayBpInputVo = new DelayBpInputVo();
                    delayBpInputVo.setTimeMillis(Long.valueOf(logicVo.getInput().getValue().toString()));
                    this.order = this.order + 1;
                    WindDetailBlockVo delayBpBlock = this.blockProduceBp.delayBp(this.order.intValue(), delayBpInputVo);
                    super.createWindDetail(root, delayBpBlock, (String)blockChildList.get(0), cSelectAgvBlock.getId());
                    continue;
                }
                return false;
            }
        }
        return true;
    }
}

