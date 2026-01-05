/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.constant.UpdateSiteScopeEnum
 *  com.seer.rds.exception.BpRuntimeException
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.service.wind.WindTaskStatus
 *  com.seer.rds.service.wind.commonBp.PhotoElectricSiteVoBp
 *  com.seer.rds.service.wind.vo.BinDetails
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.wind.PhotoElectricSiteVoBpField
 *  com.seer.rds.web.config.ConfigFileController
 *  org.apache.commons.lang3.BooleanUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.commonBp;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.constant.UpdateSiteScopeEnum;
import com.seer.rds.exception.BpRuntimeException;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.service.wind.WindTaskStatus;
import com.seer.rds.service.wind.vo.BinDetails;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.wind.PhotoElectricSiteVoBpField;
import com.seer.rds.web.config.ConfigFileController;
import java.io.IOException;
import java.io.InterruptedIOException;
import org.apache.commons.lang3.BooleanUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="PhotoElectricSiteVoBp")
@Scope(value="prototype")
public class PhotoElectricSiteVoBp
extends AbstractBp {
    private static final Logger log = LoggerFactory.getLogger(PhotoElectricSiteVoBp.class);

    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        int i;
        Object siteIdObj = this.blockInputParamsValue.get(PhotoElectricSiteVoBpField.siteId);
        Object filledObj = this.blockInputParamsValue.get(PhotoElectricSiteVoBpField.filled);
        Object numObj = this.blockInputParamsValue.get(PhotoElectricSiteVoBpField.num);
        if (siteIdObj == null) {
            throw new BpRuntimeException("@{wind.bp.siteIdEmpty}");
        }
        if (filledObj == null) {
            throw new BpRuntimeException("@{wind.bp.filledEmpty}");
        }
        int n = i = numObj == null ? 0 : Integer.parseInt(numObj.toString());
        if (i < 0) {
            throw new BpRuntimeException(String.format("@{response.code.paramsError}:%s", numObj));
        }
        long timeSleep = 1000L;
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig != null && commonConfig.getRdscore().getUpdateSitesBy() != UpdateSiteScopeEnum.NONE) {
            timeSleep = commonConfig.getRdscore().getQueryInterval() + 1000L;
        }
        int timeNum = 0;
        boolean result = false;
        while (i <= 0 || timeNum != i) {
            if (i > 0) {
                ++timeNum;
            }
            Thread.sleep(timeSleep);
            WindTaskStatus.monitorTaskEndErrorAndTaskStop((AbstractBp)this);
            try {
                String str = OkHttpUtil.get((String)(RootBp.getUrl((String)ApiEnum.binDetails.getUri()) + "/" + siteIdObj.toString()));
                if (!StringUtils.isNotEmpty((CharSequence)str)) continue;
                BinDetails binDetails = (BinDetails)JSONObject.parseObject((String)str, BinDetails.class);
                if (binDetails.getCode() == 50002) {
                    JSONObject jsonObject = JSONObject.parseObject((String)str);
                    this.saveLogError(jsonObject.getString("msg"));
                    continue;
                }
                if (binDetails.getStatus() == 1) {
                    this.saveLogSuspend("@{response.code.connectionFailed}");
                    continue;
                }
                if (BooleanUtils.compare((boolean)Boolean.parseBoolean(filledObj.toString()), (boolean)binDetails.getFilled()) == 0) {
                    result = true;
                    break;
                }
                this.saveLogSuspend(String.format("@{wind.bp.deviceExpected}=%s, @{wind.bp.deviceReality}=%s", filledObj, binDetails.getFilled()));
            }
            catch (InterruptedIOException e) {
                Thread.currentThread().interrupt();
                this.checkIfInterrupt();
            }
            catch (IOException e) {
                log.error("PhotoElectricSiteVoBp connection core error {}", (Throwable)e);
                this.saveLogError("@{response.code.robotStatusSycException}");
            }
        }
        this.blockOutParamsValue.put(PhotoElectricSiteVoBpField.ctxValue, result);
        if (i > 0) {
            this.saveLogResult((Object)result);
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }
}

