/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.RequestInterceptor
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.model.admin.Login
 *  com.seer.rds.service.admin.LoginService
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.ResultVo
 *  javax.servlet.http.Cookie
 *  javax.servlet.http.HttpServletRequest
 *  javax.servlet.http.HttpServletResponse
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.i18n.LocaleContextHolder
 *  org.springframework.http.HttpStatus
 *  org.springframework.web.servlet.HandlerInterceptor
 *  org.springframework.web.servlet.ModelAndView
 */
package com.seer.rds.config;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.model.admin.Login;
import com.seer.rds.service.admin.LoginService;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.ResultVo;
import java.io.PrintWriter;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

public class RequestInterceptor
implements HandlerInterceptor {
    private static final Logger log = LoggerFactory.getLogger(RequestInterceptor.class);
    private LoginService loginService;

    public RequestInterceptor(LoginService loginService) {
        this.loginService = loginService;
    }

    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        response.setHeader("X-Content-Type-Options", "nosniff");
        if ("TRACE".equalsIgnoreCase(request.getMethod()) || "DELETE".equalsIgnoreCase(request.getMethod()) || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.addHeader("Content-Type", "");
            return true;
        }
        LocaleMessageUtil bean = (LocaleMessageUtil)SpringUtil.getBean(LocaleMessageUtil.class);
        String servletPath = request.getServletPath();
        if (servletPath.endsWith("scene")) {
            response.setContentType("text/plain");
        } else {
            this.setHeader(response);
        }
        ResultVo resp = new ResultVo();
        Cookie[] cookies = request.getCookies();
        if (cookies == null || cookies.length == 0) {
            log.info("cookie\u4e3a\u7a7a");
            resp.setCode(CommonCodeEnum.SESSION_NON.getCode());
            resp.setMsg(bean.getMessage(CommonCodeEnum.SESSION_NON.getMsg(), LocaleContextHolder.getLocale()));
            response.setStatus(HttpStatus.BAD_REQUEST.value());
            PrintWriter out = response.getWriter();
            out.write(JSONObject.toJSONString((Object)resp));
            out.flush();
            out.close();
            return false;
        }
        String jsessionId = request.getSession().getId();
        if (jsessionId == null) {
            log.info("cookie jsessionId\u4e3a\u7a7a");
            resp.setCode(CommonCodeEnum.SESSION_NON.getCode());
            resp.setMsg(bean.getMessage(CommonCodeEnum.SESSION_NON.getMsg(), LocaleContextHolder.getLocale()));
            response.setStatus(HttpStatus.BAD_REQUEST.value());
            response.setCharacterEncoding("utf-8");
            PrintWriter out = response.getWriter();
            out.write(JSONObject.toJSONString((Object)resp));
            out.flush();
            out.close();
            return false;
        }
        Login loginInfo = this.loginService.findBySessionId(jsessionId);
        if (loginInfo == null) {
            resp.setCode(CommonCodeEnum.SESSION_NON.getCode());
            resp.setMsg(bean.getMessage(CommonCodeEnum.SESSION_NON.getMsg(), LocaleContextHolder.getLocale()));
            response.setStatus(HttpStatus.BAD_REQUEST.value());
            response.setCharacterEncoding("utf-8");
            PrintWriter out = response.getWriter();
            out.write(JSONObject.toJSONString((Object)resp));
            out.flush();
            out.close();
            return false;
        }
        long nowTime = System.currentTimeMillis();
        long exprieTime = loginInfo.getExprieTime();
        if (nowTime - loginInfo.getLoginDate().getTime() > exprieTime) {
            response.setStatus(HttpStatus.BAD_REQUEST.value());
            resp.setCode(CommonCodeEnum.SESSION_NON.getCode());
            resp.setMsg(bean.getMessage(CommonCodeEnum.SESSION_NON.getMsg(), LocaleContextHolder.getLocale()));
            response.setStatus(HttpStatus.BAD_REQUEST.value());
            response.setCharacterEncoding("utf-8");
            PrintWriter out = response.getWriter();
            out.write(JSONObject.toJSONString((Object)resp));
            out.flush();
            out.close();
            return false;
        }
        return true;
    }

    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, ModelAndView modelAndView) throws Exception {
    }

    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
    }

    private void setHeader(HttpServletResponse response) {
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Access-Control-Allow-Credentials", "true");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST ,PUT");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setContentType("application/json;charset=UTF-8");
        response.setDateHeader("Expires", 0L);
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        response.addHeader("Cache-Control", "post-check=0, pre-check=0");
        response.setHeader("Pragma", "no-cache");
    }
}

