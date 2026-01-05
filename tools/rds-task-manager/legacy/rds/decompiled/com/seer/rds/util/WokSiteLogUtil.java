/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.admin.Login
 *  com.seer.rds.model.worksite.WorkSiteLog
 *  com.seer.rds.service.admin.LoginService
 *  com.seer.rds.service.admin.WorkSiteLogService
 *  com.seer.rds.service.admin.impl.LoginServiceImpl
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.util.WokSiteLogUtil
 *  javax.servlet.http.Cookie
 *  javax.servlet.http.HttpServletRequest
 *  org.apache.shiro.util.CollectionUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util;

import com.seer.rds.model.admin.Login;
import com.seer.rds.model.worksite.WorkSiteLog;
import com.seer.rds.service.admin.LoginService;
import com.seer.rds.service.admin.WorkSiteLogService;
import com.seer.rds.service.admin.impl.LoginServiceImpl;
import com.seer.rds.util.SpringUtil;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import org.apache.shiro.util.CollectionUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class WokSiteLogUtil {
    private static final Logger log = LoggerFactory.getLogger(WokSiteLogUtil.class);

    public static void saveLog(HttpServletRequest request, List<String> siteIdList, int oprType, String remark) {
        Login loginInfo;
        LoginService loginService = (LoginService)SpringUtil.getBean(LoginServiceImpl.class);
        Cookie[] cookies = request.getCookies();
        String jsessionId = "";
        if (null != cookies) {
            for (Cookie c : cookies) {
                if (!"JSESSIONID".equals(c.getName())) continue;
                jsessionId = c.getValue();
                break;
            }
        }
        WokSiteLogUtil.save(siteIdList, (int)oprType, (String)((loginInfo = loginService.findBySessionId(jsessionId)) != null ? loginInfo.getUsername() : ""), (String)remark);
    }

    public static void save(List<String> siteIdList, int oprType, String oprUser, String remark) {
        WorkSiteLogService workSiteLogService = (WorkSiteLogService)SpringUtil.getBean(WorkSiteLogService.class);
        ArrayList<WorkSiteLog> list = new ArrayList<WorkSiteLog>();
        for (String siteId : siteIdList) {
            WorkSiteLog workSiteLog = WorkSiteLog.builder().createDate(new Date()).oprType(oprType).oprUser(oprUser).workSiteId(siteId).remark(remark).build();
            list.add(workSiteLog);
        }
        if (CollectionUtils.isEmpty(list)) {
            return;
        }
        workSiteLogService.addBatch(list);
    }
}

