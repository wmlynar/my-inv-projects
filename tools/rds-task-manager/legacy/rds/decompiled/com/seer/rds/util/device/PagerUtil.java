/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.modbus.Modbus4jUtils
 *  com.seer.rds.model.device.PagerTaskRecord
 *  com.seer.rds.service.device.PagerService
 *  com.seer.rds.service.threadPool.LinkedBqThreadPool
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.util.device.PagerUtil
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util.device;

import com.seer.rds.modbus.Modbus4jUtils;
import com.seer.rds.model.device.PagerTaskRecord;
import com.seer.rds.service.device.PagerService;
import com.seer.rds.service.threadPool.LinkedBqThreadPool;
import com.seer.rds.util.SpringUtil;
import java.util.Collection;
import java.util.List;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class PagerUtil {
    private static final Logger log = LoggerFactory.getLogger(PagerUtil.class);

    public static void resetPagerValue(String taskLabel, String taskRecordId) {
        PagerService pagerService = (PagerService)SpringUtil.getBean(PagerService.class);
        List pagerTaskRecords = pagerService.findByTaskRecordId(taskRecordId);
        if (CollectionUtils.isEmpty((Collection)pagerTaskRecords) || StringUtils.isEmpty((CharSequence)((PagerTaskRecord)pagerTaskRecords.get(0)).getPagerInfo())) {
            log.info("resetPagerValue failed, \u5f53\u524d\u4efb\u52a1\u5b9e\u4f8b\uff1a{} \u672a\u627e\u5230\u5bf9\u5e94\u7684 modbus \u4fe1\u606f\u3002", (Object)taskRecordId);
            return;
        }
        PagerTaskRecord pagerTaskRecord = (PagerTaskRecord)pagerTaskRecords.get(0);
        String pagerInfo = pagerTaskRecord.getPagerInfo();
        pagerTaskRecord.setIsDel(Boolean.valueOf(true));
        pagerService.saveOrUpdatePagerTaskRecord(pagerTaskRecord);
        String[] split = pagerInfo.split(":");
        String ip = split[0];
        int port = Integer.parseInt(split[1]);
        int salveId = Integer.parseInt(split[2]);
        int address = Integer.parseInt(split[3]);
        int lightAddress = Integer.parseInt(split[4]);
        String remark = split[5];
        PagerUtil.writeModbusValueAsync((String)taskLabel, (String)taskRecordId, (String)ip, (int)port, (int)salveId, (int)address, (int)lightAddress, (String)remark);
    }

    private static void writeModbusValueAsync(String taskLabel, String taskRecordId, String ip, int port, int salveId, int address, int lightAddress, String remark) {
        LinkedBqThreadPool threadPool = LinkedBqThreadPool.getInstance();
        threadPool.execute(() -> {
            int retryTimes = 1;
            long sleepTime = 2000L;
            while (true) {
                try {
                    log.info("{}: {} finished or stopped, reset value start, ip:{},port:{},slaveId:{},address:{},remark:{}", new Object[]{taskLabel, taskRecordId, ip, port, salveId, address, remark});
                    Modbus4jUtils.writeHoldingRegister((String)ip, (int)port, (int)salveId, (int)address, (int)2, (Object)0, (String)remark);
                    Modbus4jUtils.writeHoldingRegister((String)ip, (int)port, (int)salveId, (int)lightAddress, (int)2, (Object)0, null);
                    log.info("{}: {} finished or stopped, reset value end, ip:{},port:{},slaveId:{},address:{},remark:{}", new Object[]{taskLabel, taskRecordId, ip, port, salveId, address, remark});
                }
                catch (Exception e) {
                    log.error("{}: {} finished or stopped, reset value failure, ip:{},port:{},slaveId:{},address:{},remark:{}", new Object[]{taskLabel, taskRecordId, ip, port, salveId, address, remark, e});
                    if (5 < retryTimes) {
                        sleepTime = 30000L;
                    }
                    ++retryTimes;
                    try {
                        Thread.sleep(sleepTime);
                    }
                    catch (InterruptedException ex) {
                        log.error("sleep error, Thread has been interrupted.");
                    }
                    continue;
                }
                break;
            }
        });
    }
}

