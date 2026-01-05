/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.GlobalExceptionHandler
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.exception.BasicAuthFailException
 *  com.seer.rds.exception.GlobalHttpException
 *  com.seer.rds.exception.ServiceException
 *  com.seer.rds.vo.ResultVo
 *  javax.servlet.http.HttpServletResponse
 *  org.apache.shiro.authz.AuthorizationException
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.http.HttpStatus
 *  org.springframework.web.HttpRequestMethodNotSupportedException
 *  org.springframework.web.bind.MissingServletRequestParameterException
 *  org.springframework.web.bind.annotation.ControllerAdvice
 *  org.springframework.web.bind.annotation.ExceptionHandler
 *  org.springframework.web.bind.annotation.ResponseBody
 */
package com.seer.rds.config;

import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.exception.BasicAuthFailException;
import com.seer.rds.exception.GlobalHttpException;
import com.seer.rds.exception.ServiceException;
import com.seer.rds.vo.ResultVo;
import java.sql.SQLIntegrityConstraintViolationException;
import javax.servlet.http.HttpServletResponse;
import org.apache.shiro.authz.AuthorizationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;

@ControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(value={ServiceException.class})
    @ResponseBody
    public ResultVo<String> serviceExceptionHandler(ServiceException e, HttpServletResponse resp) {
        resp.setStatus(HttpStatus.BAD_REQUEST.value());
        ResultVo result = new ResultVo();
        log.error("ServiceException error:", (Throwable)e);
        result.setCode(Integer.valueOf(e.getCode()));
        result.setMsg(e.getMsg());
        return result;
    }

    @ExceptionHandler(value={AuthorizationException.class})
    @ResponseBody
    public ResultVo<String> handlerAuthorizationException(AuthorizationException e, HttpServletResponse resp) {
        resp.setStatus(HttpStatus.BAD_REQUEST.value());
        ResultVo result = new ResultVo();
        log.error("\u672a\u6388\u6743:", (Throwable)e);
        result.setCode(CommonCodeEnum.UNAUTHORIZED.getCode());
        result.setMsg(CommonCodeEnum.UNAUTHORIZED.getMsg() + ":" + e.getMessage());
        return result;
    }

    @ExceptionHandler(value={BasicAuthFailException.class})
    @ResponseBody
    public ResultVo<String> basicAuthExceptionHandler(BasicAuthFailException e, HttpServletResponse resp) {
        resp.setStatus(HttpStatus.BAD_REQUEST.value());
        ResultVo result = new ResultVo();
        log.error("BasicAuth error:", (Throwable)e);
        result.setCode(CommonCodeEnum.BasicAuth_Error.getCode());
        result.setMsg(CommonCodeEnum.BasicAuth_Error.getMsg());
        return result;
    }

    @ExceptionHandler(value={Exception.class, SQLIntegrityConstraintViolationException.class})
    @ResponseBody
    public ResultVo<String> exceptionHandler(Exception e, HttpServletResponse resp) {
        resp.setStatus(HttpStatus.BAD_REQUEST.value());
        ResultVo result = new ResultVo();
        log.error("global error:", (Throwable)e);
        result.setCode(CommonCodeEnum.ERROR.getCode());
        result.setMsg(CommonCodeEnum.ERROR.getMsg() + ":" + e.getMessage());
        return result;
    }

    @ExceptionHandler(value={MissingServletRequestParameterException.class})
    @ResponseBody
    public ResultVo<String> loginExceptionHandler(MissingServletRequestParameterException e, HttpServletResponse resp) {
        resp.setStatus(HttpStatus.BAD_REQUEST.value());
        ResultVo result = new ResultVo();
        log.error("global error:", (Throwable)e);
        result.setCode(CommonCodeEnum.PARAM_ERROR.getCode());
        result.setMsg(CommonCodeEnum.PARAM_ERROR.getMsg());
        return result;
    }

    @ExceptionHandler(value={HttpRequestMethodNotSupportedException.class})
    @ResponseBody
    public ResultVo<String> authExceptionHandler(HttpRequestMethodNotSupportedException e, HttpServletResponse resp) {
        resp.setStatus(HttpStatus.BAD_REQUEST.value());
        ResultVo result = new ResultVo();
        log.error("global error:", (Throwable)e);
        result.setCode(CommonCodeEnum.METHOD_NOT_SUPPORTED.getCode());
        result.setMsg(e.getMessage());
        return result;
    }

    @ExceptionHandler(value={GlobalHttpException.class})
    @ResponseBody
    public ResultVo<String> exceptionHttpHandler(Exception e) {
        ResultVo result = new ResultVo();
        log.error("global error:", (Throwable)e);
        result.setCode(CommonCodeEnum.ERROR.getCode());
        result.setMsg(CommonCodeEnum.ERROR.getMsg() + ":" + e.getMessage());
        return result;
    }
}

