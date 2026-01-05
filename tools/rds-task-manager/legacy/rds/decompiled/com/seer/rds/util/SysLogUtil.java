/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.admin.Login
 *  com.seer.rds.model.admin.SysLog
 *  com.seer.rds.service.admin.LoginService
 *  com.seer.rds.service.admin.SysLogService
 *  com.seer.rds.service.admin.impl.LoginServiceImpl
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.util.SysLogUtil
 *  javax.servlet.http.Cookie
 *  javax.servlet.http.HttpServletRequest
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util;

import com.seer.rds.model.admin.Login;
import com.seer.rds.model.admin.SysLog;
import com.seer.rds.service.admin.LoginService;
import com.seer.rds.service.admin.SysLogService;
import com.seer.rds.service.admin.impl.LoginServiceImpl;
import com.seer.rds.util.SpringUtil;
import java.util.Date;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SysLogUtil {
    private static final Logger log = LoggerFactory.getLogger(SysLogUtil.class);

    public static void saveLog(HttpServletRequest request, String opr, String level, String message, String username) {
        SysLogService sysLogService = (SysLogService)SpringUtil.getBean(SysLogService.class);
        LoginService loginService = (LoginService)SpringUtil.getBean(LoginServiceImpl.class);
        Cookie[] cookies = request.getCookies();
        if (cookies == null || cookies.length == 0) {
            log.info("cookie\u4e3a\u7a7a");
            SysLog sysLog = SysLog.builder().createDate(new Date()).enMessage(opr).message(message).level(level).operation(opr).oprUser("unknown").build();
            sysLogService.saveSysLog(sysLog);
            return;
        }
        String jsessionId = null;
        for (Cookie c : cookies) {
            if (!"JSESSIONID".equals(c.getName())) continue;
            jsessionId = c.getValue();
            break;
        }
        if (jsessionId == null) {
            log.info("cookie jsessionId\u4e3a\u7a7a");
            SysLog sysLog = SysLog.builder().createDate(new Date()).enMessage(opr).message(message).level(level).operation(opr).oprUser("unknown").build();
            sysLogService.saveSysLog(sysLog);
            return;
        }
        Login loginInfo = loginService.findBySessionId(jsessionId);
        SysLog sysLog = SysLog.builder().createDate(new Date()).enMessage(opr).message(message).level(level).operation(opr).oprUser(username != null ? username : (loginInfo == null ? "unknown" : loginInfo.getUsername())).build();
        sysLogService.saveSysLog(sysLog);
    }
}

