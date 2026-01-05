/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.Description
 *  com.seer.rds.vo.response.HttpResponse
 *  com.seer.rds.vo.response.HttpResponse$HttpResponseBuilder
 */
package com.seer.rds.vo.response;

import com.seer.rds.annotation.Description;
import com.seer.rds.vo.response.HttpResponse;

public class HttpResponse {
    @Description(value="@{HttpResponse.code}")
    private String code;
    @Description(value="@{HttpResponse.body}")
    private Object body;

    public static HttpResponseBuilder builder() {
        return new HttpResponseBuilder();
    }

    public String getCode() {
        return this.code;
    }

    public Object getBody() {
        return this.body;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public void setBody(Object body) {
        this.body = body;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof HttpResponse)) {
            return false;
        }
        HttpResponse other = (HttpResponse)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$code = this.getCode();
        String other$code = other.getCode();
        if (this$code == null ? other$code != null : !this$code.equals(other$code)) {
            return false;
        }
        Object this$body = this.getBody();
        Object other$body = other.getBody();
        return !(this$body == null ? other$body != null : !this$body.equals(other$body));
    }

    protected boolean canEqual(Object other) {
        return other instanceof HttpResponse;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $code = this.getCode();
        result = result * 59 + ($code == null ? 43 : $code.hashCode());
        Object $body = this.getBody();
        result = result * 59 + ($body == null ? 43 : $body.hashCode());
        return result;
    }

    public String toString() {
        return "HttpResponse(code=" + this.getCode() + ", body=" + this.getBody() + ")";
    }

    public HttpResponse(String code, Object body) {
        this.code = code;
        this.body = body;
    }

    public HttpResponse() {
    }
}

