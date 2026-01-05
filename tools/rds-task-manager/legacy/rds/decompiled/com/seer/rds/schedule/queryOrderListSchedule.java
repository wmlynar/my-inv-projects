/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.config.configview.RequestPeriod
 *  com.seer.rds.constant.ApiEnum
 *  com.seer.rds.schedule.WorkSiteStatusSchedule
 *  com.seer.rds.schedule.queryOrderListSchedule
 *  com.seer.rds.service.wind.RootBp
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.vo.req.OrderReq
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.scheduling.Trigger
 *  org.springframework.scheduling.annotation.EnableScheduling
 *  org.springframework.scheduling.annotation.SchedulingConfigurer
 *  org.springframework.scheduling.config.ScheduledTaskRegistrar
 *  org.springframework.scheduling.support.CronTrigger
 */
package com.seer.rds.schedule;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.PropConfig;
import com.seer.rds.config.configview.RequestPeriod;
import com.seer.rds.constant.ApiEnum;
import com.seer.rds.schedule.WorkSiteStatusSchedule;
import com.seer.rds.service.wind.RootBp;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.vo.req.OrderReq;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadFactory;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.Trigger;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.scheduling.support.CronTrigger;

/*
 * Exception performing whole class analysis ignored.
 */
@Configuration
@EnableScheduling
public class queryOrderListSchedule
implements SchedulingConfigurer {
    private static final Logger log = LoggerFactory.getLogger(queryOrderListSchedule.class);
    public static String taskCron = "0/2 * * * * ?";
    private static HashMap<String, Object> orderHash = new HashMap();
    public volatile int loop = 0;

    public static String getTaskCron() {
        return taskCron;
    }

    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        RequestPeriod requestPeriod = PropConfig.getRequestPeriod();
        if (requestPeriod.getIfEnableQueryOrdersCache().booleanValue()) {
            int queryOrdersCachePeriod = requestPeriod.getQueryOrdersCachePeriod();
            taskCron = "0/" + queryOrdersCachePeriod + " * * * * ?";
            String scheduleName = WorkSiteStatusSchedule.class.getName();
            ScheduledExecutorService scheduledExecutorService = Executors.newScheduledThreadPool(3, (ThreadFactory)new /* Unavailable Anonymous Inner Class!! */);
            taskRegistrar.setScheduler((Object)scheduledExecutorService);
            taskRegistrar.addTriggerTask(() -> this.run(), (Trigger)new CronTrigger(queryOrderListSchedule.getTaskCron()));
        }
    }

    private void run() {
        int size = 300;
        try {
            Map res = OkHttpUtil.getAllResponse((String)(RootBp.getUrl((String)ApiEnum.orders.getUri()) + "?page=1&size=" + size + "&orderBy=createTime"));
            if (res != null) {
                List list;
                String body = (String)res.get("body");
                String UUID2 = (String)res.get("UUID");
                OrderReq orderReq = (OrderReq)JSONObject.parseObject((String)body, OrderReq.class);
                List list2 = list = orderReq != null ? orderReq.getList() : null;
                if (list != null) {
                    orderHash.clear();
                    list.parallelStream().forEach(e -> orderHash.put(e.getString("id"), e.toJSONString()));
                    orderHash.put("UUID", UUID2);
                    orderHash.put("time", Instant.now());
                } else {
                    log.info("core order null");
                }
            } else {
                log.info("orders res is null");
            }
        }
        catch (IOException e2) {
            log.error("query core error", (Throwable)e2);
            try {
                Thread.sleep(2000L);
            }
            catch (InterruptedException ex) {
                log.error("Query Order List InterruptedException", (Throwable)ex);
            }
        }
    }

    public static String queryOrder(String orderId, Instant time) {
        try {
            String order = orderHash.get(orderId) != null ? orderHash.get(orderId) : "";
            Object timeObj = orderHash.get("time");
            if (StringUtils.isNotEmpty((CharSequence)order) && timeObj != null) {
                Instant instantTime = (Instant)timeObj;
                Duration duration = Duration.between(instantTime, time);
                if (duration.getSeconds() > 5L) {
                    return null;
                }
                return order;
            }
            return null;
        }
        catch (Exception e) {
            log.error("info", (Throwable)e);
            return null;
        }
    }

    public static String queryUUID() {
        return (String)orderHash.get("UUID");
    }
}

