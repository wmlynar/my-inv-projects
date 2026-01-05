/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.hutool.core.util.CharsetUtil
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.constant.MediaTypeEnum
 *  com.seer.rds.util.MessageConversionUtils
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.RequestHeaderDO
 *  com.seer.rds.vo.response.HttpResponse
 *  okhttp3.Call
 *  okhttp3.Callback
 *  okhttp3.FormBody
 *  okhttp3.FormBody$Builder
 *  okhttp3.Headers
 *  okhttp3.Headers$Builder
 *  okhttp3.MediaType
 *  okhttp3.OkHttpClient
 *  okhttp3.Request
 *  okhttp3.Request$Builder
 *  okhttp3.RequestBody
 *  okhttp3.Response
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util;

import cn.hutool.core.util.CharsetUtil;
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.constant.MediaTypeEnum;
import com.seer.rds.util.MessageConversionUtils;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.RequestHeaderDO;
import com.seer.rds.vo.response.HttpResponse;
import java.io.IOException;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.FormBody;
import okhttp3.Headers;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class OkHttpUtil {
    public static Set<RequestHeaderDO> requestHeaderDOSet = new HashSet();
    private static final Logger logger = LoggerFactory.getLogger(OkHttpUtil.class);

    public static StringBuffer getQueryString(String url, Map<String, String> queries) {
        StringBuffer sb = new StringBuffer(url);
        if (queries != null && queries.keySet().size() > 0) {
            boolean firstFlag = true;
            for (Map.Entry<String, String> entry : queries.entrySet()) {
                if (firstFlag) {
                    sb.append("?" + entry.getKey() + "=" + entry.getValue());
                    firstFlag = false;
                    continue;
                }
                sb.append("&" + entry.getKey() + "=" + entry.getValue());
            }
        }
        return sb;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private static String execNewCall(Request request) throws IOException {
        try (Response response = null;){
            OkHttpClient okHttpClient = (OkHttpClient)SpringUtil.getBean(OkHttpClient.class);
            response = okHttpClient.newCall(request).execute();
            String string = response.body().string();
            return string;
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private static String execNewCallWithCode(Request request) throws IOException {
        try (Response response = null;){
            OkHttpClient okHttpClient = (OkHttpClient)SpringUtil.getBean(OkHttpClient.class);
            response = okHttpClient.newCall(request).execute();
            if (response.isSuccessful()) {
                String string = response.body().string();
                return string;
            }
        }
        return "";
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private static Map<String, String> execNewCall2(Request request) throws IOException {
        HashMap result = Maps.newHashMap();
        try (Response response = null;){
            OkHttpClient okHttpClient = (OkHttpClient)SpringUtil.getBean(OkHttpClient.class);
            response = okHttpClient.newCall(request).execute();
            result.put("code", String.valueOf(response.code()));
            result.put("body", response.body().string());
            HashMap hashMap = result;
            return hashMap;
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private static Map<String, String> execNewCall2Xml(Request request) throws IOException {
        HashMap result = Maps.newHashMap();
        try (Response response = null;){
            OkHttpClient okHttpClient = (OkHttpClient)SpringUtil.getBean(OkHttpClient.class);
            response = okHttpClient.newCall(request).execute();
            String jsonString = MessageConversionUtils.xmlToJson((String)response.body().string());
            result.put("code", String.valueOf(response.code()));
            result.put("body", jsonString);
            HashMap hashMap = result;
            return hashMap;
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private static Map<String, String> execNewCall3(Request request) throws IOException {
        HashMap result = Maps.newHashMap();
        try (Object response = null;){
            OkHttpClient okHttpClient = (OkHttpClient)SpringUtil.getBean(OkHttpClient.class);
            Call call = okHttpClient.newCall(request);
            call.enqueue((Callback)new /* Unavailable Anonymous Inner Class!! */);
            result.put("code", String.valueOf(response.code()));
            result.put("body", response.body().string());
            HashMap hashMap = result;
            return hashMap;
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private static Map<String, Object> execNewCall4(Request request) throws IOException {
        Response response = null;
        HashMap result = Maps.newHashMap();
        HttpResponse httpResponse = new HttpResponse();
        try {
            OkHttpClient okHttpClient = (OkHttpClient)SpringUtil.getBean(OkHttpClient.class);
            response = okHttpClient.newCall(request).execute();
            Object body = null;
            if (response.body() != null) {
                body = JSONObject.parse((String)response.body().string());
            }
            result.put("code", String.valueOf(response.code()));
            result.put("body", body);
            HashMap hashMap = result;
            return hashMap;
        }
        finally {
            if (response != null) {
                response.close();
            }
        }
    }

    public static String get(String url, Map<String, String> queries) throws IOException {
        StringBuffer sb = OkHttpUtil.getQueryString((String)url, queries);
        Request request = new Request.Builder().addHeader("Accept-Encoding", "identity").get().url(sb.toString()).build();
        return OkHttpUtil.execNewCall((Request)request);
    }

    public static String get(String url) throws IOException {
        OkHttpClient okHttpClient = (OkHttpClient)SpringUtil.getBean(OkHttpClient.class);
        Headers headers = OkHttpUtil.SetHeaders();
        Request.Builder builder = new Request.Builder();
        Request request = builder.addHeader("Accept-Encoding", "identity").headers(headers).get().url(url).build();
        Call call = okHttpClient.newCall(request);
        try (Response res = null;){
            res = call.execute();
            if (res != null && res.isSuccessful()) {
                String string = res.body().string();
                return string;
            }
        }
        return null;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public static Map<String, String> getAllResponse(String url) throws IOException {
        OkHttpClient okHttpClient = (OkHttpClient)SpringUtil.getBean(OkHttpClient.class);
        Headers headers = OkHttpUtil.SetHeaders();
        Request.Builder builder = new Request.Builder();
        Request request = builder.addHeader("Accept-Encoding", "identity").headers(headers).get().url(url).build();
        Call call = okHttpClient.newCall(request);
        try (Response res = null;){
            res = call.execute();
            if (res != null && res.isSuccessful()) {
                HashMap<String, String> resMap = new HashMap<String, String>();
                resMap.put("body", res.body().string());
                resMap.put("UUID", res.header("UUID"));
                HashMap<String, String> hashMap = resMap;
                return hashMap;
            }
        }
        return null;
    }

    public static String getWithHeader(String url, Map<String, String> headerMap) throws IOException {
        OkHttpClient okHttpClient = (OkHttpClient)SpringUtil.getBean(OkHttpClient.class);
        Headers headers = OkHttpUtil.SetHeaders(headerMap);
        Request.Builder builder = new Request.Builder();
        Request request = builder.addHeader("Accept-Encoding", "identity").headers(headers).get().url(url).build();
        Call call = okHttpClient.newCall(request);
        try (Response res = call.execute();){
            if (res.isSuccessful() && res.body() != null) {
                String string = res.body().string();
                return string;
            }
        }
        return null;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public static Map<String, String> getWithHttpCode(String url) throws IOException {
        OkHttpClient okHttpClient = (OkHttpClient)SpringUtil.getBean(OkHttpClient.class);
        Request.Builder builder = new Request.Builder();
        Request request = builder.addHeader("Accept-Encoding", "identity").get().url(url).build();
        Call call = okHttpClient.newCall(request);
        try (Response res = null;){
            res = call.execute();
            HashMap result = Maps.newHashMap();
            result.put("code", String.valueOf(res.code()));
            result.put("body", res.body() != null ? res.body().string() : null);
            HashMap hashMap = result;
            return hashMap;
        }
    }

    public static String postFormParams(String url, Map<String, String> params) throws IOException {
        FormBody.Builder builder = new FormBody.Builder();
        if (params != null && params.keySet().size() > 0) {
            for (String key : params.keySet()) {
                builder.add(key, params.get(key));
            }
        }
        Request request = new Request.Builder().addHeader("Accept-Encoding", "identity").url(url).post((RequestBody)builder.build()).build();
        return OkHttpUtil.execNewCall((Request)request);
    }

    public static String postJsonParams(String url, String jsonParams) throws IOException {
        RequestBody requestBody = RequestBody.create((MediaType)MediaType.parse((String)"application/json; charset=utf-8"), (String)jsonParams);
        Request request = new Request.Builder().url(url).post(requestBody).build();
        return OkHttpUtil.execNewCall((Request)request);
    }

    public static Map<String, String> postJson(String url, String jsonParams) throws IOException {
        RequestBody requestBody = RequestBody.create((MediaType)MediaType.parse((String)"application/json; charset=utf-8"), (String)jsonParams);
        Headers headers = OkHttpUtil.SetHeaders();
        Request request = new Request.Builder().url(url).headers(headers).post(requestBody).build();
        return OkHttpUtil.execNewCall2((Request)request);
    }

    public static Map<String, String> putJson(String url, String jsonParams) throws IOException {
        RequestBody requestBody = RequestBody.create((MediaType)MediaType.parse((String)"application/json; charset=utf-8"), (String)jsonParams);
        Headers headers = OkHttpUtil.SetHeaders();
        Request request = new Request.Builder().url(url).headers(headers).put(requestBody).build();
        return OkHttpUtil.execNewCall2((Request)request);
    }

    public static Headers SetHeaders() {
        Headers headers = null;
        Headers.Builder headersbuilder = new Headers.Builder();
        if (CollectionUtils.isNotEmpty((Collection)requestHeaderDOSet)) {
            requestHeaderDOSet.forEach(requestHeaderDO -> headersbuilder.add(requestHeaderDO.getKey(), requestHeaderDO.getValue()));
        }
        headers = headersbuilder.build();
        return headers;
    }

    public static Headers SetHeaders(Map<String, String> headerMap) {
        Headers headers = null;
        Headers.Builder headersbuilder = new Headers.Builder();
        if (CollectionUtils.isNotEmpty((Collection)requestHeaderDOSet)) {
            requestHeaderDOSet.forEach(requestHeaderDO -> headersbuilder.add(requestHeaderDO.getKey(), requestHeaderDO.getValue()));
        }
        if (!(headerMap == null || headerMap.isEmpty() || headerMap.containsKey(null) || headerMap.containsValue(null))) {
            for (Map.Entry<String, String> entry : headerMap.entrySet()) {
                headersbuilder.add(entry.getKey(), entry.getValue());
            }
        }
        headers = headersbuilder.build();
        return headers;
    }

    public static Map<String, String> postXml(String url, String jsonParams) throws IOException {
        RequestBody requestBody = RequestBody.create((MediaType)MediaType.parse((String)"application/xml; charset=utf-8"), (String)jsonParams);
        Request request = new Request.Builder().url(url).post(requestBody).build();
        return OkHttpUtil.execNewCall2Xml((Request)request);
    }

    public static Map<String, String> postJson2(String url, String jsonParams) throws IOException {
        RequestBody requestBody = RequestBody.create((MediaType)MediaType.parse((String)"application/json; charset=utf-8"), (String)jsonParams);
        Request request = new Request.Builder().url(url).post(requestBody).build();
        return OkHttpUtil.execNewCall3((Request)request);
    }

    public static Map<String, Object> postJson3(String url, String jsonParams, Map<String, String> headerMap) throws IOException {
        RequestBody requestBody = RequestBody.create((MediaType)MediaType.parse((String)"application/json; charset=utf-8"), (String)jsonParams);
        Headers headers = OkHttpUtil.SetHeaders(headerMap);
        Request request = new Request.Builder().url(url).headers(headers).post(requestBody).build();
        return OkHttpUtil.execNewCall4((Request)request);
    }

    public static String postXmlParams(String url, String xml) throws IOException {
        RequestBody requestBody = RequestBody.create((MediaType)MediaType.parse((String)"application/xml; charset=utf-8"), (String)xml);
        Request request = new Request.Builder().url(url).post(requestBody).build();
        return OkHttpUtil.execNewCall((Request)request);
    }

    public static String postAuthorizationJsonParams(String authorizationValue, String url, Map<String, Object> map) throws IOException {
        FormBody.Builder builder = new FormBody.Builder();
        for (String key : map.keySet()) {
            builder.add(key, map.get(key).toString());
        }
        FormBody requestBody = builder.build();
        Request request = new Request.Builder().addHeader("Authorization", "Basic " + authorizationValue).url(url).post((RequestBody)requestBody).build();
        return OkHttpUtil.execNewCallWithCode((Request)request);
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public static String getAuthorizationInfo(String authorizationValue, String url) throws IOException {
        OkHttpClient okHttpClient = (OkHttpClient)SpringUtil.getBean(OkHttpClient.class);
        Request.Builder builder = new Request.Builder();
        Request request = builder.addHeader("Authorization", "Bearer " + authorizationValue).get().url(url).build();
        Call call = okHttpClient.newCall(request);
        try (Response res = null;){
            res = call.execute();
            if (res != null && res.isSuccessful()) {
                String string = res.body().string();
                return string;
            }
        }
        return null;
    }

    public static String postAuthorizationInfo(String authorizationValue, String url, Map<String, Object> map) throws IOException {
        RequestBody requestBody = RequestBody.create((MediaType)MediaType.parse((String)"application/json; charset=utf-8"), (String)JSON.toJSONString(map));
        Request request = new Request.Builder().addHeader("Authorization", "Bearer " + authorizationValue).url(url).post(requestBody).build();
        return OkHttpUtil.execNewCall((Request)request);
    }

    public static Map<String, String> postSoapTwelve(String url, String jsonParams) throws IOException {
        RequestBody requestBody = RequestBody.create((MediaType)MediaType.parse((String)"application/soap+xml;charset=utf-8"), (String)jsonParams);
        Request request = new Request.Builder().addHeader("Content-Type", "text/xml;charset=utf-8").url(url).post(requestBody).build();
        return OkHttpUtil.execNewCall2Xml((Request)request);
    }

    public static Map<String, String> postSoapEleven(String url, String jsonParams) throws IOException {
        RequestBody requestBody = RequestBody.create((MediaType)MediaType.parse((String)"application/xml; charset=utf-8"), (String)jsonParams);
        Request request = new Request.Builder().header("SOAPAction", url).url(url).post(requestBody).build();
        return OkHttpUtil.execNewCall2Xml((Request)request);
    }

    public static Map<String, Object> post(String url, String jsonParams, Map<String, String> headerMap, MediaTypeEnum mediaTypeEnum) throws IOException {
        String type = mediaTypeEnum == null ? MediaTypeEnum.JSON.getMediaType() : mediaTypeEnum.getMediaType();
        MediaType parse = MediaType.parse((String)type);
        parse.charset(CharsetUtil.CHARSET_UTF_8);
        RequestBody requestBody = RequestBody.create((MediaType)parse, (String)OkHttpUtil.postParams((MediaTypeEnum)mediaTypeEnum, (String)jsonParams));
        Headers headers = OkHttpUtil.SetHeaders(headerMap);
        Request request = new Request.Builder().url(url).headers(headers).post(requestBody).build();
        return OkHttpUtil.execNewCall4((Request)request);
    }

    private static String postParams(MediaTypeEnum mediaTypeEnum, String jsonParams) {
        if (MediaTypeEnum.XWWWFORMURLENCODED.name().equals(mediaTypeEnum.name())) {
            try {
                HashMap hashMap = (HashMap)JSONObject.parseObject((String)jsonParams, HashMap.class);
                StringBuilder result = new StringBuilder();
                for (Map.Entry entry : hashMap.entrySet()) {
                    result.append((String)entry.getKey()).append("=").append(entry.getValue()).append("&");
                }
                int length = result.length();
                if (length > 0 && result.charAt(length - 1) == '&') {
                    result.deleteCharAt(length - 1);
                }
                return result.toString();
            }
            catch (Exception exception) {
                // empty catch block
            }
        }
        return jsonParams;
    }

    public static MediaTypeEnum getMediaTypeEnum(String mediaType) {
        MediaTypeEnum type = StringUtils.equals((CharSequence)MediaTypeEnum.XWWWFORMURLENCODED.name().toString(), (CharSequence)mediaType) ? MediaTypeEnum.XWWWFORMURLENCODED : (StringUtils.equals((CharSequence)MediaTypeEnum.XML.name().toString(), (CharSequence)mediaType) ? MediaTypeEnum.XML : (StringUtils.equals((CharSequence)MediaTypeEnum.HTML.name().toString(), (CharSequence)mediaType) ? MediaTypeEnum.HTML : (StringUtils.equals((CharSequence)MediaTypeEnum.JAVASCRIPT.name().toString(), (CharSequence)mediaType) ? MediaTypeEnum.JAVASCRIPT : (StringUtils.equals((CharSequence)MediaTypeEnum.TEXT.name().toString(), (CharSequence)mediaType) ? MediaTypeEnum.TEXT : MediaTypeEnum.JSON))));
        return type;
    }

    public static Map<String, String> putJson(String url, Map head, MediaTypeEnum mediaTypeEnum, String jsonParams) throws IOException {
        String type = mediaTypeEnum == null ? MediaTypeEnum.JSON.getMediaType() : mediaTypeEnum.getMediaType();
        MediaType parse = MediaType.parse((String)type);
        parse.charset(CharsetUtil.CHARSET_UTF_8);
        RequestBody requestBody = RequestBody.create((MediaType)parse, (String)jsonParams);
        Headers headers = OkHttpUtil.SetHeaders((Map)head);
        Request request = new Request.Builder().url(url).headers(headers).put(requestBody).build();
        return OkHttpUtil.execNewCall2((Request)request);
    }

    static {
        OkHttpClient okHttpClient = (OkHttpClient)SpringUtil.getBean(OkHttpClient.class);
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            okHttpClient.dispatcher().executorService().shutdown();
            okHttpClient.connectionPool().evictAll();
            try {
                okHttpClient.cache().close();
            }
            catch (IOException e) {
                logger.error("OkHttpUtil IOException");
            }
        }));
    }
}

