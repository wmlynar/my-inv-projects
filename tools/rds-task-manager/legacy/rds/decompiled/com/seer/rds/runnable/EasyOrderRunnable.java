/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.config.configview.operator.EasyOrder
 *  com.seer.rds.runnable.EasyOrderRunnable
 *  com.seer.rds.service.operator.OperatorService
 *  com.seer.rds.service.operator.impl.OperatorServiceImpl
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.response.EasyOrderRes
 *  com.seer.rds.web.config.ConfigFileController
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.boot.CommandLineRunner
 *  org.springframework.core.annotation.Order
 *  org.springframework.scheduling.annotation.Async
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.runnable;

import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.config.configview.operator.EasyOrder;
import com.seer.rds.service.operator.OperatorService;
import com.seer.rds.service.operator.impl.OperatorServiceImpl;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.response.EasyOrderRes;
import com.seer.rds.web.config.ConfigFileController;
import java.util.ArrayList;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Order(value=2)
@Component
@Async
public class EasyOrderRunnable
implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(EasyOrderRunnable.class);
    public static ConcurrentHashMap<String, Integer> easyOrderMap = new ConcurrentHashMap();

    public void run(String ... args) throws Exception {
        this.init();
    }

    public void init() {
        CommonConfig commonConfig = ConfigFileController.commonConfig;
        if (commonConfig == null || commonConfig.getOperator() == null || commonConfig.getOperator().getEasyOrders() == null || !commonConfig.getOperator().getEasyOrders().getEnable().booleanValue()) {
            log.info("no easyOrder config");
            return;
        }
        while (true) {
            try {
                if (commonConfig != null && commonConfig.getOperator() != null && commonConfig.getOperator().getEasyOrders() != null && commonConfig.getOperator().getEasyOrders().getEnable().booleanValue()) {
                    ArrayList<EasyOrderRes> taskLabel = new ArrayList<EasyOrderRes>();
                    for (EasyOrder easyOrder : commonConfig.getOperator().getEasyOrders().getEasyOrder()) {
                        String menuId = easyOrder.getMenuId();
                        try {
                            if (StringUtils.isNotEmpty((CharSequence)easyOrder.getTaskLabel()) && easyOrder.getCallBackExecute() == null) {
                                EasyOrderRes eor = new EasyOrderRes();
                                eor.setMenuId(menuId);
                                eor.setTaskLabel(easyOrder.getTaskLabel());
                                taskLabel.add(eor);
                                continue;
                            }
                            OperatorServiceImpl.easyOrderExecuteBack((EasyOrder)easyOrder, (String)"From EasyOrderRunnable");
                        }
                        catch (Exception e) {
                            easyOrderMap.put(menuId, 3);
                            log.error("EasyOrderRunnable error {}", (Throwable)e);
                        }
                    }
                    if (CollectionUtils.isNotEmpty(taskLabel)) {
                        OperatorService operatorService = (OperatorService)SpringUtil.getBean(OperatorService.class);
                        operatorService.easyOrderBatchCallBack(taskLabel);
                        taskLabel.stream().forEach(it -> easyOrderMap.put(it.getMenuId(), it.getFlag() != false ? 0 : 1));
                    }
                } else {
                    log.info("no easyOrder config");
                }
            }
            catch (Exception e) {
                log.error("EasyOrderRunnable Error {}", (Throwable)e);
            }
            try {
                Thread.sleep(5000L);
                continue;
            }
            catch (InterruptedException ex) {
                log.error("EasyOrderRunnable sleep error");
                continue;
            }
            break;
        }
    }
}

