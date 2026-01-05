/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.ResultVo$ResultVoBuilder
 */
package com.seer.rds.vo;

import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.vo.ResultVo;

public class ResultVo<T> {
    private Integer code = CommonCodeEnum.SUCCESS.getCode();
    private String msg = CommonCodeEnum.SUCCESS.getMsg();
    private T data;

    public ResultVo(Integer code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    public static ResultVo<Object> success() {
        return new ResultVo(CommonCodeEnum.SUCCESS.getCode(), CommonCodeEnum.SUCCESS.getMsg());
    }

    public static ResultVo<Object> success(CommonCodeEnum codeEnum, Object data) {
        return new ResultVo(codeEnum.getCode(), codeEnum.getMsg(), data);
    }

    public static ResultVo<Object> success(CommonCodeEnum codeEnum) {
        return new ResultVo(codeEnum.getCode(), codeEnum.getMsg());
    }

    public static ResultVo<Object> error() {
        return new ResultVo(CommonCodeEnum.ERROR.getCode(), CommonCodeEnum.ERROR.getMsg());
    }

    public static ResultVo<Object> error(String msg) {
        return new ResultVo(CommonCodeEnum.ERROR.getCode(), msg);
    }

    public static ResultVo<Object> error(int code, String msg, Object data) {
        return new ResultVo(Integer.valueOf(code), msg, data);
    }

    public static ResultVo<Object> error(CommonCodeEnum codeEnum, Object data) {
        return new ResultVo(codeEnum.getCode(), codeEnum.getMsg(), data);
    }

    public static ResultVo<Object> error(CommonCodeEnum codeEnum) {
        return new ResultVo(codeEnum.getCode(), codeEnum.getMsg());
    }

    public static ResultVo<Object> response(Object data) {
        return new ResultVo(CommonCodeEnum.SUCCESS.getCode(), CommonCodeEnum.SUCCESS.getMsg(), data);
    }

    public static <T> ResultVoBuilder<T> builder() {
        return new ResultVoBuilder();
    }

    public Integer getCode() {
        return this.code;
    }

    public String getMsg() {
        return this.msg;
    }

    public T getData() {
        return (T)this.data;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }

    public void setData(T data) {
        this.data = data;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ResultVo)) {
            return false;
        }
        ResultVo other = (ResultVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$code = this.getCode();
        Integer other$code = other.getCode();
        if (this$code == null ? other$code != null : !((Object)this$code).equals(other$code)) {
            return false;
        }
        String this$msg = this.getMsg();
        String other$msg = other.getMsg();
        if (this$msg == null ? other$msg != null : !this$msg.equals(other$msg)) {
            return false;
        }
        Object this$data = this.getData();
        Object other$data = other.getData();
        return !(this$data == null ? other$data != null : !this$data.equals(other$data));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ResultVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $code = this.getCode();
        result = result * 59 + ($code == null ? 43 : ((Object)$code).hashCode());
        String $msg = this.getMsg();
        result = result * 59 + ($msg == null ? 43 : $msg.hashCode());
        Object $data = this.getData();
        result = result * 59 + ($data == null ? 43 : $data.hashCode());
        return result;
    }

    public String toString() {
        return "ResultVo(code=" + this.getCode() + ", msg=" + this.getMsg() + ", data=" + this.getData() + ")";
    }

    public ResultVo() {
    }

    public ResultVo(Integer code, String msg, T data) {
        this.code = code;
        this.msg = msg;
        this.data = data;
    }
}

