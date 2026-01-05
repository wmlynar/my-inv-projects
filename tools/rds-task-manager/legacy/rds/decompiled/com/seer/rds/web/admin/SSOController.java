/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONArray
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.SSOConfig
 *  com.seer.rds.constant.LoginType
 *  com.seer.rds.constant.UserStatusEnum
 *  com.seer.rds.constant.UserTypeEnum
 *  com.seer.rds.model.admin.Login
 *  com.seer.rds.model.admin.User
 *  com.seer.rds.service.admin.LoginService
 *  com.seer.rds.service.admin.UserService
 *  com.seer.rds.util.MD5Utils
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.web.admin.SSOController
 *  javax.servlet.http.Cookie
 *  javax.servlet.http.HttpServletRequest
 *  javax.servlet.http.HttpServletResponse
 *  javax.servlet.http.HttpSession
 *  okhttp3.CipherSuite
 *  okhttp3.ConnectionSpec
 *  okhttp3.ConnectionSpec$Builder
 *  okhttp3.FormBody
 *  okhttp3.FormBody$Builder
 *  okhttp3.OkHttpClient
 *  okhttp3.Request
 *  okhttp3.Request$Builder
 *  okhttp3.RequestBody
 *  okhttp3.Response
 *  okhttp3.TlsVersion
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.shiro.SecurityUtils
 *  org.apache.shiro.authc.AuthenticationToken
 *  org.apache.shiro.authc.UsernamePasswordToken
 *  org.apache.shiro.subject.Subject
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.stereotype.Controller
 *  org.springframework.util.Base64Utils
 *  org.springframework.util.CollectionUtils
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.RequestParam
 *  org.springframework.web.client.RestTemplate
 *  org.springframework.web.servlet.mvc.support.RedirectAttributes
 *  org.springframework.web.servlet.view.RedirectView
 */
package com.seer.rds.web.admin;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.SSOConfig;
import com.seer.rds.constant.LoginType;
import com.seer.rds.constant.UserStatusEnum;
import com.seer.rds.constant.UserTypeEnum;
import com.seer.rds.model.admin.Login;
import com.seer.rds.model.admin.User;
import com.seer.rds.service.admin.LoginService;
import com.seer.rds.service.admin.UserService;
import com.seer.rds.util.MD5Utils;
import com.seer.rds.util.SpringUtil;
import java.io.IOException;
import java.util.Collection;
import java.util.Date;
import java.util.Objects;
import java.util.Optional;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import okhttp3.CipherSuite;
import okhttp3.ConnectionSpec;
import okhttp3.FormBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.TlsVersion;
import org.apache.commons.lang3.StringUtils;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.authc.UsernamePasswordToken;
import org.apache.shiro.subject.Subject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.util.Base64Utils;
import org.springframework.util.CollectionUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.web.servlet.view.RedirectView;

@Controller
@RequestMapping(value={"oath", "oauth"})
public class SSOController {
    private static final Logger log = LoggerFactory.getLogger(SSOController.class);
    @Autowired
    private RestTemplate restTemplate;
    @Autowired
    private SSOConfig ssoConfig;
    @Autowired
    private LoginService loginService;
    @Autowired
    private UserService userService;
    @Value(value="${shiro.session.timeout}")
    private int sessionTimeout;

    @GetMapping(value={"/authorize"})
    public RedirectView getTokenWithCode(HttpServletRequest request, HttpSession session, HttpServletResponse response, @RequestParam String code, @RequestParam(required=false) String state, RedirectAttributes attributes) throws IOException {
        String username;
        String tokenStr = this.getToken(this.ssoConfig.getTokenUri(), code);
        if (StringUtils.isEmpty((CharSequence)tokenStr)) {
            log.info("Authorize Get Token failed code = {}, state = {}", (Object)code, (Object)state);
            attributes.addAttribute("username", (Object)"null");
            return new RedirectView(this.ssoConfig.getErrorUrl());
        }
        assert (StringUtils.isNotEmpty((CharSequence)tokenStr));
        JSONObject tokenJsonObject = JSONObject.parseObject((String)tokenStr);
        String token = tokenJsonObject.getString("access_token");
        String userInfo = this.getUserInfo(this.ssoConfig.getUserInfoUri(), token);
        JSONObject jsonObject = JSONObject.parseObject((String)userInfo);
        try {
            if (this.ssoConfig.getUserAttributeNameFlag().booleanValue()) {
                String[] userIdKeys = this.ssoConfig.getUserAttributeName().split("\\.");
                for (int i = 0; i < userIdKeys.length - 1; ++i) {
                    Object o = jsonObject.get((Object)userIdKeys[i]);
                    if (o instanceof JSONObject) {
                        jsonObject = (JSONObject)o;
                        continue;
                    }
                    if (!(o instanceof JSONArray)) continue;
                    JSONArray o1 = (JSONArray)o;
                    jsonObject = (JSONObject)o1.get(0);
                }
                username = jsonObject.getString(userIdKeys[userIdKeys.length - 1]).replaceAll(" ", "_");
                if (StringUtils.isEmpty((CharSequence)username) && StringUtils.isNotEmpty((CharSequence)this.ssoConfig.getSecondAttribute())) {
                    username = jsonObject.getString(this.ssoConfig.getSecondAttribute()).replaceAll(" ", "_");
                }
            } else {
                Optional<String> optionalUsername = Optional.ofNullable(jsonObject.getString(this.ssoConfig.getUserAttributeName()));
                if ((optionalUsername.isEmpty() || StringUtils.isEmpty((CharSequence)optionalUsername.get())) && (optionalUsername = Optional.ofNullable(jsonObject.getString(this.ssoConfig.getSecondAttribute()))).isEmpty()) {
                    attributes.addAttribute("username", (Object)"null");
                    return new RedirectView(this.ssoConfig.getErrorUrl());
                }
                username = optionalUsername.get().replaceAll(" ", "_");
            }
        }
        catch (Exception e) {
            log.error("Authorize getUserInfo error: {}", (Object)e.getMessage());
            log.error("Authorize getUserInfo error userInfo = {}", (Object)userInfo);
            attributes.addAttribute("username", (Object)"null");
            return new RedirectView(this.ssoConfig.getErrorUrl());
        }
        if (StringUtils.isEmpty((CharSequence)username)) {
            attributes.addAttribute("username", (Object)"null");
            return new RedirectView(this.ssoConfig.getErrorUrl());
        }
        User user = this.userService.findByUsernameAvailable(username);
        int type = UserTypeEnum.common_user.getStatus();
        log.info("oauth admin users: " + this.ssoConfig.getAdmins());
        int status = UserStatusEnum.ENABLED.getStatus();
        if (!CollectionUtils.isEmpty((Collection)this.ssoConfig.getAdmins()) && this.ssoConfig.getAdmins().contains(username)) {
            type = UserTypeEnum.admin.getStatus();
        } else if (!this.ssoConfig.getLoginWithUserEnable().booleanValue()) {
            status = UserStatusEnum.DISABLED.getStatus();
        }
        if (user == null) {
            User u = User.builder().username(username).password(MD5Utils.MD5Lower((String)"123456")).createTime(new Date()).modifyTime(new Date()).type(Integer.valueOf(type)).status(Integer.valueOf(status)).build();
            this.userService.save(u);
            user = u;
        } else {
            if (status == UserStatusEnum.ENABLED.getStatus() && user.getStatus().intValue() == UserStatusEnum.DISABLED.getStatus()) {
                user.setStatus(Integer.valueOf(status));
            }
            user.setType(Integer.valueOf(type));
            this.userService.save(user);
        }
        if (user.getStatus().intValue() == UserStatusEnum.DISABLED.getStatus()) {
            attributes.addAttribute("username", (Object)username);
            return new RedirectView(this.ssoConfig.getErrorUrl());
        }
        Subject currentUser = SecurityUtils.getSubject();
        currentUser.login((AuthenticationToken)new UsernamePasswordToken(user.getUsername(), user.getPassword()));
        currentUser.isPermitted("test");
        String reqToken = MD5Utils.MD5Lower((String)(username + System.currentTimeMillis()));
        Login login = Login.builder().loginDate(new Date()).uid(user.getId()).sessionId(session.getId()).token(reqToken).username(username).loginType(Integer.valueOf(LoginType.SSO.getType())).exprieTime(Long.valueOf(60000L * (long)this.sessionTimeout)).build();
        this.loginService.saveLogin(login);
        Cookie cookie = new Cookie("login", username);
        cookie.setPath(request.getContextPath());
        cookie.setSecure(true);
        cookie.setHttpOnly(true);
        response.addCookie(cookie);
        log.info("attributes state: " + attributes.getAttribute("state"));
        String redirect = Objects.equals(state, "pda") ? this.ssoConfig.getRedirectBaseUri() + this.ssoConfig.getPdaHomeUrl() : this.ssoConfig.getRedirectBaseUri() + this.ssoConfig.getRdsHomeUrl();
        return new RedirectView(redirect);
    }

    private String getUserInfo(String uri, String token) {
        try {
            Response response;
            OkHttpClient okHttpClient = (OkHttpClient)SpringUtil.getBean(OkHttpClient.class);
            if ("GET".equalsIgnoreCase(this.ssoConfig.getUserInfoUriRequestType())) {
                Request request = new Request.Builder().addHeader("Authorization", "Bearer " + token).url(uri).get().build();
                response = okHttpClient.newCall(request).execute();
            } else {
                RequestBody body = RequestBody.create(null, (byte[])new byte[0]);
                Request request = new Request.Builder().addHeader("Authorization", "Bearer " + token).url(uri).post(body).build();
                response = okHttpClient.newCall(request).execute();
            }
            if (response.isSuccessful()) {
                assert (response.body() != null);
                String reBody = response.body().string();
                log.info("get user info {} from {}", (Object)reBody, (Object)uri);
                return reBody;
            }
            return "";
        }
        catch (Exception e) {
            log.error("request user info failed", (Throwable)e);
            return "";
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    private String getToken(String uri, String code) throws IOException {
        try (Response response = null;){
            String basic = Base64Utils.encodeToString((byte[])(this.ssoConfig.getClientId() + ":" + this.ssoConfig.getClientSecret()).getBytes());
            log.info("basic: " + basic);
            ConnectionSpec spec = new ConnectionSpec.Builder(ConnectionSpec.MODERN_TLS).tlsVersions(new TlsVersion[]{TlsVersion.TLS_1_2}).cipherSuites(new CipherSuite[]{CipherSuite.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256, CipherSuite.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256, CipherSuite.TLS_DHE_RSA_WITH_AES_128_GCM_SHA256}).build();
            OkHttpClient okHttpClient = (OkHttpClient)SpringUtil.getBean(OkHttpClient.class);
            if (this.ssoConfig.getEnableTls().booleanValue()) {
                okHttpClient.connectionSpecs().add(spec);
            }
            log.info("oauth grant_type: " + this.ssoConfig.getGrantType());
            log.info("oauth code: " + code);
            log.info("oauth client_id: " + this.ssoConfig.getClientId());
            log.info("oauth redirect_uri: " + this.ssoConfig.getRedirectBaseUri() + this.ssoConfig.getRedirectEndpoint());
            FormBody formBody = new FormBody.Builder().add("grant_type", this.ssoConfig.getGrantType()).add("code", code).add("client_id", this.ssoConfig.getClientId()).add("redirect_uri", this.ssoConfig.getRedirectBaseUri() + this.ssoConfig.getRedirectEndpoint()).build();
            Request request = new Request.Builder().addHeader("Accept", "*/*").addHeader("Content-Type", "application/x-www-form-urlencoded").addHeader("Authorization", "Basic " + basic).url(uri).post((RequestBody)formBody).build();
            response = okHttpClient.newCall(request).execute();
            if (response.isSuccessful()) {
                assert (response.body() != null);
                String string = response.body().string();
                return string;
            }
        }
        return "";
    }
}

