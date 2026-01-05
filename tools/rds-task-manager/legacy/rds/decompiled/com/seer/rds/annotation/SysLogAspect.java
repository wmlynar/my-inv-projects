/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.annotation.SysLogAspect
 *  com.seer.rds.util.SysLogUtil
 *  javax.servlet.http.HttpServletRequest
 *  org.aspectj.lang.JoinPoint
 *  org.aspectj.lang.annotation.AfterThrowing
 *  org.aspectj.lang.annotation.Aspect
 *  org.aspectj.lang.annotation.Before
 *  org.aspectj.lang.reflect.MethodSignature
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.stereotype.Component
 *  org.springframework.web.context.request.RequestContextHolder
 *  org.springframework.web.context.request.ServletRequestAttributes
 */
package com.seer.rds.annotation;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.annotation.SysLog;
import com.seer.rds.util.SysLogUtil;
import java.lang.reflect.Method;
import javax.servlet.http.HttpServletRequest;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
public class SysLogAspect {
    private static final Logger log = LoggerFactory.getLogger(SysLogAspect.class);

    @Before(value="@annotation(com.seer.rds.annotation.SysLog)")
    public void doBefore(JoinPoint joinPoint) {
        ServletRequestAttributes attributes = (ServletRequestAttributes)RequestContextHolder.getRequestAttributes();
        HttpServletRequest request = attributes.getRequest();
        MethodSignature signature = (MethodSignature)joinPoint.getSignature();
        Method method = signature.getMethod();
        SysLog annotation = method.getAnnotation(SysLog.class);
        String operation = annotation.operation();
        String message = annotation.message();
        if ("loginUser".equals(operation)) {
            Object[] args = joinPoint.getArgs();
            String loginParam = (String)args[0];
            JSONObject jsonObject = JSONObject.parseObject((String)loginParam);
            String username = jsonObject.getString("username");
            SysLogUtil.saveLog((HttpServletRequest)request, (String)operation, (String)"INFO", (String)message, (String)username);
            return;
        }
        SysLogUtil.saveLog((HttpServletRequest)request, (String)operation, (String)"INFO", (String)message, null);
    }

    @AfterThrowing(value="@annotation(com.seer.rds.annotation.SysLog)")
    public void throwss(JoinPoint joinPoint) {
        ServletRequestAttributes attributes = (ServletRequestAttributes)RequestContextHolder.getRequestAttributes();
        HttpServletRequest request = attributes.getRequest();
        MethodSignature signature = (MethodSignature)joinPoint.getSignature();
        Method method = signature.getMethod();
        SysLog annotation = method.getAnnotation(SysLog.class);
        String operation = annotation.operation();
        String message = annotation.message();
        SysLogUtil.saveLog((HttpServletRequest)request, (String)operation, (String)"ERROR", (String)message, null);
    }
}

