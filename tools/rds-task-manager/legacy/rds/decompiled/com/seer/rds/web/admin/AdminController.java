/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.alibaba.fastjson.JSONObject
 *  com.fasterxml.jackson.core.JsonParseException
 *  com.fasterxml.jackson.core.JsonProcessingException
 *  com.fasterxml.jackson.databind.JsonMappingException
 *  com.fasterxml.jackson.databind.ObjectMapper
 *  com.google.common.collect.Maps
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.config.LDAPConfig
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.config.SSOConfig
 *  com.seer.rds.config.SecurityConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.LoginType
 *  com.seer.rds.constant.OAuthEnum
 *  com.seer.rds.constant.UserStatusEnum
 *  com.seer.rds.ldap.LdapUtil
 *  com.seer.rds.model.admin.Login
 *  com.seer.rds.model.admin.Permission
 *  com.seer.rds.model.admin.Role
 *  com.seer.rds.model.admin.User
 *  com.seer.rds.service.admin.LoginService
 *  com.seer.rds.service.admin.PermissionService
 *  com.seer.rds.service.admin.RoleService
 *  com.seer.rds.service.admin.UserService
 *  com.seer.rds.service.admin.impl.UserServiceImpl
 *  com.seer.rds.util.FileUploadUtil
 *  com.seer.rds.util.MD5Utils
 *  com.seer.rds.util.OkHttpUtil
 *  com.seer.rds.util.SHA2Utils
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.UserReqVo
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.web.admin.AdminController
 *  com.seer.rds.web.config.ConfigFileController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.servlet.ServletOutputStream
 *  javax.servlet.http.Cookie
 *  javax.servlet.http.HttpServletRequest
 *  javax.servlet.http.HttpServletResponse
 *  javax.servlet.http.HttpSession
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.shiro.SecurityUtils
 *  org.apache.shiro.authc.AuthenticationException
 *  org.apache.shiro.authc.AuthenticationToken
 *  org.apache.shiro.authc.UsernamePasswordToken
 *  org.apache.shiro.subject.Subject
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.http.HttpStatus
 *  org.springframework.stereotype.Controller
 *  org.springframework.util.CollectionUtils
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestHeader
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.RequestParam
 *  org.springframework.web.bind.annotation.ResponseBody
 *  org.springframework.web.multipart.MultipartFile
 *  springfox.documentation.annotations.ApiIgnore
 */
package com.seer.rds.web.admin;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.fasterxml.jackson.core.JsonParseException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.Maps;
import com.seer.rds.annotation.SysLog;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.config.LDAPConfig;
import com.seer.rds.config.PropConfig;
import com.seer.rds.config.SSOConfig;
import com.seer.rds.config.SecurityConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.LoginType;
import com.seer.rds.constant.OAuthEnum;
import com.seer.rds.constant.UserStatusEnum;
import com.seer.rds.ldap.LdapUtil;
import com.seer.rds.model.admin.Login;
import com.seer.rds.model.admin.Permission;
import com.seer.rds.model.admin.Role;
import com.seer.rds.model.admin.User;
import com.seer.rds.service.admin.LoginService;
import com.seer.rds.service.admin.PermissionService;
import com.seer.rds.service.admin.RoleService;
import com.seer.rds.service.admin.UserService;
import com.seer.rds.service.admin.impl.UserServiceImpl;
import com.seer.rds.util.FileUploadUtil;
import com.seer.rds.util.MD5Utils;
import com.seer.rds.util.OkHttpUtil;
import com.seer.rds.util.SHA2Utils;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.UserReqVo;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.response.PaginationResponseVo;
import com.seer.rds.web.config.ConfigFileController;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import org.apache.commons.lang3.StringUtils;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.authc.UsernamePasswordToken;
import org.apache.shiro.subject.Subject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.util.CollectionUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;
import springfox.documentation.annotations.ApiIgnore;

@Controller
@RequestMapping(value={"admin"})
@Api(tags={"\u7528\u6237\u7ba1\u7406\u63a5\u53e3"})
public class AdminController {
    private static final Logger log = LoggerFactory.getLogger(AdminController.class);
    public static final String SESSIONKEY = "user";
    public static final String COOKIEKEY = "login";
    @Value(value="${shiro.session.timeout}")
    private int sessionTimeout;
    @Autowired
    private LoginService loginService;
    @Autowired
    private UserService userService;
    @Autowired
    private RoleService roleService;
    @Autowired
    private PermissionService permissionService;
    @Autowired
    private PropConfig propConfig;
    @Autowired
    private LDAPConfig ldapConfig;
    @Autowired
    private SSOConfig ssoConfig;
    @Autowired
    private SecurityConfig securityConfig;

    /*
     * Enabled aggressive block sorting
     * Enabled unnecessary exception pruning
     * Enabled aggressive exception aggregation
     */
    @SysLog(operation="loginUser", message="@{user.controller.loginUser}")
    @ApiOperation(value="\u767b\u5f55")
    @PostMapping(value={"/login"})
    @ResponseBody
    public ResultVo<JSONObject> loginUser(@RequestBody String requestBody, @ApiIgnore HttpSession session, @ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response, @RequestHeader(value="language", required=false) String language) throws IOException {
        this.setHeader(response);
        ResultVo resp = new ResultVo();
        JSONObject reqBody = JSONObject.parseObject((String)requestBody);
        String password = reqBody.getString("password");
        String username = reqBody.getString("username");
        try {
            User user;
            block24: {
                block25: {
                    user = this.userService.findByUsername(username);
                    if (!this.ldapConfig.getEnable().booleanValue()) break block25;
                    if (!this.ldapConfig.getSkipUsernames().stream().noneMatch(username::equals)) break block25;
                    if (!LdapUtil.ldapCheck((String)username, (String)password).booleanValue()) {
                        response.setStatus(HttpStatus.BAD_REQUEST.value());
                        resp.setCode(CommonCodeEnum.USER_NON.getCode());
                        resp.setMsg(CommonCodeEnum.USER_NON.getMsg());
                        return resp;
                    }
                    if (user == null) {
                        User ldapUser = User.builder().username(username).password(MD5Utils.MD5Lower((String)password)).createTime(new Date()).modifyTime(new Date()).status(Integer.valueOf(UserStatusEnum.ENABLED.getStatus())).build();
                        this.userService.save(ldapUser);
                        user = ldapUser;
                        break block24;
                    } else {
                        if (user.getStatus() != null && user.getStatus().intValue() == UserStatusEnum.DISABLED.getStatus()) {
                            response.setStatus(HttpStatus.BAD_REQUEST.value());
                            resp.setCode(CommonCodeEnum.ACCOUNT_FORBIDDEN.getCode());
                            resp.setMsg(CommonCodeEnum.ACCOUNT_FORBIDDEN.getMsg());
                            return resp;
                        }
                        if (Objects.equals(password, user.getPassword())) {
                            user.setPassword(MD5Utils.MD5Lower((String)password));
                            this.userService.save(user);
                        }
                    }
                    break block24;
                }
                if (this.ssoConfig.getEnable().booleanValue() && "password".equalsIgnoreCase(this.ssoConfig.getGrantType())) {
                    if (StringUtils.isEmpty((CharSequence)this.ssoConfig.getClientId()) || StringUtils.isEmpty((CharSequence)this.ssoConfig.getGrantType()) || StringUtils.isEmpty((CharSequence)this.ssoConfig.getTokenUri()) || StringUtils.isEmpty((CharSequence)this.ssoConfig.getClientSecret())) {
                        response.setStatus(HttpStatus.BAD_REQUEST.value());
                        resp.setCode(CommonCodeEnum.OAUTH_PARAMS.getCode());
                        resp.setMsg(CommonCodeEnum.OAUTH_PARAMS.getMsg());
                        return resp;
                    }
                    HashMap jsonMap = Maps.newHashMap();
                    jsonMap.put(OAuthEnum.client_id.getName(), this.ssoConfig.getClientId());
                    jsonMap.put(OAuthEnum.grant_type.getName(), this.ssoConfig.getGrantType());
                    jsonMap.put(this.ssoConfig.getAccountKey(), username);
                    jsonMap.put(this.ssoConfig.getPasswordKey(), password);
                    try {
                        String basic = this.ssoConfig.getClientId() + ":" + this.ssoConfig.getClientSecret();
                        byte[] encode = Base64.getEncoder().encode(basic.getBytes(Charset.forName("utf-8")));
                        String result = OkHttpUtil.postAuthorizationJsonParams((String)new String(encode), (String)this.ssoConfig.getTokenUri(), (Map)jsonMap);
                        if (StringUtils.isEmpty((CharSequence)result)) {
                            response.setStatus(HttpStatus.BAD_REQUEST.value());
                            resp.setCode(CommonCodeEnum.OAUTH_INVALID.getCode());
                            resp.setMsg(CommonCodeEnum.OAUTH_INVALID.getMsg());
                            return resp;
                        }
                        String token = JSON.parseObject((String)result).getString(OAuthEnum.access_token.getName());
                        if (StringUtils.isEmpty((CharSequence)token)) {
                            response.setStatus(HttpStatus.BAD_REQUEST.value());
                            resp.setCode(CommonCodeEnum.OAUTH_TOKEN.getCode());
                            resp.setMsg(CommonCodeEnum.OAUTH_TOKEN.getMsg());
                            return resp;
                        }
                        if (user == null) {
                            User oauthUser = User.builder().username(username).password(password).createTime(new Date()).modifyTime(new Date()).status(Integer.valueOf(UserStatusEnum.ENABLED.getStatus())).build();
                            this.userService.save(oauthUser);
                            user = oauthUser;
                        }
                        if (user.getStatus().intValue() == UserStatusEnum.DISABLED.getStatus()) {
                            response.setStatus(HttpStatus.BAD_REQUEST.value());
                            resp.setCode(CommonCodeEnum.ACCOUNT_FORBIDDEN.getCode());
                            resp.setMsg(CommonCodeEnum.ACCOUNT_FORBIDDEN.getMsg());
                            return resp;
                        }
                        break block24;
                    }
                    catch (Exception e) {
                        log.error("login error", (Throwable)e);
                        response.setStatus(HttpStatus.BAD_REQUEST.value());
                        String sessionId = this.getSessionId(request);
                        this.loginService.removeLoginInfo(sessionId);
                        resp.setCode(CommonCodeEnum.OAUTH_ERROR.getCode());
                        resp.setMsg(CommonCodeEnum.OAUTH_ERROR.getMsg());
                        return resp;
                    }
                }
                if (this.ldapConfig.getEnable().booleanValue()) {
                    if (!this.ldapConfig.getSkipUsernames().stream().noneMatch(username::equals)) {
                        password = MD5Utils.MD5Lower((String)password);
                    }
                }
                if (user == null) {
                    response.setStatus(HttpStatus.BAD_REQUEST.value());
                    resp.setCode(CommonCodeEnum.USER_NON.getCode());
                    resp.setMsg(CommonCodeEnum.USER_NON.getMsg());
                    return resp;
                }
                if (user.getStatus().intValue() == UserStatusEnum.DISABLED.getStatus()) {
                    response.setStatus(HttpStatus.BAD_REQUEST.value());
                    resp.setCode(CommonCodeEnum.ACCOUNT_FORBIDDEN.getCode());
                    resp.setMsg(CommonCodeEnum.ACCOUNT_FORBIDDEN.getMsg());
                    return resp;
                }
                if (this.securityConfig.getEnableSHA2() != null && this.securityConfig.getEnableSHA2().booleanValue()) {
                    if (reqBody.getString("sha2Password") == null) {
                        throw new AuthenticationException();
                    }
                    if (!Objects.equals(reqBody.getString("sha2Password"), SHA2Utils.SHA256Lower((String)password, (String)"Rds123!"))) {
                        throw new AuthenticationException();
                    }
                }
                if (!Objects.equals(password, user.getPassword())) {
                    throw new AuthenticationException();
                }
            }
            Subject currentUser = SecurityUtils.getSubject();
            currentUser.login((AuthenticationToken)new UsernamePasswordToken(username, password));
            if (currentUser.getPrincipal() == null) {
                throw new AuthenticationException();
            }
            currentUser.isPermitted("test");
            String reqToken = MD5Utils.MD5Lower((String)(username + System.currentTimeMillis()));
            Login login = Login.builder().loginDate(new Date()).uid(user.getId()).sessionId(session.getId()).token(reqToken).username(username).loginType(Integer.valueOf(LoginType.NORMAL.getType())).exprieTime(Long.valueOf(60000L * (long)this.sessionTimeout)).build();
            this.loginService.saveLogin(login);
            Cookie cookie = new Cookie(COOKIEKEY, username);
            cookie.setPath(request.getContextPath());
            cookie.setSecure(true);
            cookie.setHttpOnly(true);
            response.addCookie(cookie);
            resp.setCode(CommonCodeEnum.SUCCESS.getCode());
            resp.setMsg(CommonCodeEnum.SUCCESS.getMsg());
            JSONObject data = new JSONObject();
            data.put("token", (Object)reqToken);
            resp.setData((Object)data);
            return resp;
        }
        catch (Exception e) {
            log.error("login error", (Throwable)e);
            String sessionId = this.getSessionId(request);
            this.loginService.removeLoginInfo(sessionId);
            resp.setCode(CommonCodeEnum.LOGIN_ERROR.getCode());
            resp.setMsg(CommonCodeEnum.LOGIN_ERROR.getMsg());
            return resp;
        }
    }

    @SysLog(operation="logout", message="@{user.controller.logout}")
    @ApiOperation(value="\u767b\u51fa")
    @GetMapping(value={"/logout"})
    @ResponseBody
    public ResultVo<Object> logout(@ApiIgnore HttpSession session, @ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response) {
        String sessionId = this.getSessionId(request);
        Login login = this.loginService.findBySessionId(sessionId);
        int loginType = Objects.isNull(login) ? 1 : login.getLoginType();
        this.loginService.removeLoginInfo(sessionId);
        return ResultVo.success((CommonCodeEnum)CommonCodeEnum.SUCCESS, Map.of("loginType", loginType));
    }

    public static void main(String[] args) {
        System.out.println(System.getProperty("user.dir"));
    }

    @ApiOperation(value="Ping")
    @GetMapping(value={"/ping"})
    @ResponseBody
    public ResultVo<Object> ping(@RequestParam(value="language", required=false) String language, @ApiIgnore HttpSession session, @ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response) {
        ResultVo resp = new ResultVo();
        try {
            Cookie[] cookies = request.getCookies();
            if (cookies == null || cookies.length == 0) {
                log.info("cookie\u4e3a\u7a7a");
                response.setStatus(HttpStatus.BAD_REQUEST.value());
                resp.setCode(CommonCodeEnum.SESSION_NON.getCode());
                resp.setMsg(CommonCodeEnum.SESSION_NON.getMsg());
                return resp;
            }
            String jsessionId = request.getSession().getId();
            if (jsessionId == null) {
                log.info("cookie jsessionId\u4e3a\u7a7a");
                response.setStatus(HttpStatus.BAD_REQUEST.value());
                resp.setCode(CommonCodeEnum.SESSION_NON.getCode());
                resp.setMsg(CommonCodeEnum.SESSION_NON.getMsg());
                return resp;
            }
            if (StringUtils.isEmpty((CharSequence)language)) {
                GlobalCacheConfig.cache((String)jsessionId, (Object)"zh");
            } else {
                GlobalCacheConfig.cache((String)jsessionId, (Object)language);
            }
            Login loginInfo = this.loginService.findBySessionId(jsessionId);
            if (loginInfo == null) {
                log.info("\u767b\u5f55\u4fe1\u606f\u4e3a\u7a7a");
                response.setStatus(HttpStatus.BAD_REQUEST.value());
                resp.setCode(CommonCodeEnum.SESSION_NON.getCode());
                resp.setMsg(CommonCodeEnum.SESSION_NON.getMsg());
                return resp;
            }
            long nowTime = System.currentTimeMillis();
            long exprieTime = loginInfo.getExprieTime();
            if (nowTime - loginInfo.getLoginDate().getTime() > exprieTime) {
                log.info("\u767b\u5f55\u72b6\u6001\u8fc7\u671f");
                response.setStatus(HttpStatus.BAD_REQUEST.value());
                resp.setCode(CommonCodeEnum.SESSION_NON.getCode());
                resp.setMsg(CommonCodeEnum.SESSION_NON.getMsg());
                return resp;
            }
            User user = this.userService.findById(loginInfo.getUid());
            String userPermission = (String)UserServiceImpl.UserPermission.get(user.getUsername());
            if (Objects.equals(user.getStatus(), UserStatusEnum.DELETED.getStatus())) {
                this.loginService.removeLoginInfo(jsessionId);
                session.invalidate();
                log.info("user deleted");
                response.setStatus(HttpStatus.BAD_REQUEST.value());
                resp.setCode(CommonCodeEnum.USER_NON.getCode());
                resp.setMsg(CommonCodeEnum.USER_NON.getMsg());
                return resp;
            }
            boolean ifEnableShiro = PropConfig.ifEnableShiro();
            List roleByUserName = this.userService.findRoleByUserName(user.getUsername());
            ArrayList workStationList = new ArrayList();
            ArrayList workTypeList = new ArrayList();
            roleByUserName.forEach(role -> {
                if (StringUtils.isNotEmpty((CharSequence)role.getWorkStations())) {
                    workStationList.add(role.getWorkStations());
                }
                if (StringUtils.isNotEmpty((CharSequence)role.getWorkTypes())) {
                    workTypeList.add(role.getWorkTypes());
                }
            });
            loginInfo.setProjectVersion(this.propConfig.getProjectVersion());
            loginInfo.setType(user.getType());
            loginInfo.setPermission(userPermission);
            loginInfo.setIfShiro(Boolean.valueOf(ifEnableShiro));
            loginInfo.setWorkTypeList(workTypeList);
            loginInfo.setWorkStationList(workStationList);
            resp.setCode(CommonCodeEnum.SUCCESS.getCode());
            resp.setMsg(CommonCodeEnum.SUCCESS.getMsg());
            resp.setData((Object)loginInfo);
        }
        catch (Exception e) {
            log.error("ping error", (Throwable)e);
        }
        return resp;
    }

    @SysLog(operation="test", message="@{user.controller.test}")
    @PostMapping(value={"/test"})
    @ResponseBody
    public ResultVo<Object> test(@RequestBody String param, @ApiIgnore HttpSession session, @ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response) {
        return ResultVo.success();
    }

    @GetMapping(value={"/version"})
    @ResponseBody
    public ResultVo<Object> projectVersoin(@ApiIgnore HttpSession session, @ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response) {
        ObjectMapper mapper = new ObjectMapper();
        Object frontEndVersion = "";
        try {
            File file = new File(this.propConfig.getRdsStaticDir() + File.separator + "version.json");
            Object obj = mapper.readValue(file, Object.class);
            String json = mapper.writeValueAsString(obj);
            frontEndVersion = "F-" + mapper.readTree(json).get("version").asText();
        }
        catch (FileNotFoundException e) {
            log.error("FileNotFoundException:", (Throwable)e);
        }
        catch (JsonParseException e) {
            log.error("JsonParseException:", (Throwable)e);
        }
        catch (JsonMappingException e) {
            log.error("JsonMappingException:", (Throwable)e);
        }
        catch (JsonProcessingException e) {
            log.error("JsonProcessingException:", (Throwable)e);
        }
        catch (IOException e) {
            log.error("IOException:", (Throwable)e);
        }
        String backEndVersion = this.propConfig.getProjectVersion();
        return ResultVo.response((Object)("RDS " + (String)frontEndVersion + " B-" + backEndVersion));
    }

    @SysLog(operation="language", message="@{user.controller.language}")
    @GetMapping(value={"/language"})
    @ApiOperation(value="\u5207\u6362\u8bed\u8a00")
    @ResponseBody
    public ResultVo<Object> changeLanguage(@RequestParam(value="language") String language, @ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response) {
        if (StringUtils.isEmpty((CharSequence)language)) {
            String sessionId = this.getSessionId(request);
            Object cache = GlobalCacheConfig.getCache((String)sessionId);
            return ResultVo.response((Object)(cache != null ? cache.toString() : "zh"));
        }
        String sessionId = this.getSessionId(request);
        GlobalCacheConfig.cache((String)sessionId, (Object)language);
        return ResultVo.response((Object)language);
    }

    @PostMapping(value={"/uploadLogo"})
    @ResponseBody
    public ResultVo<Object> uploadLogo(@RequestParam(value="file") MultipartFile file) throws Exception {
        return this.uploadImage(file, "customIcon", 0x200000L);
    }

    @PostMapping(value={"/uploadFavIcon"})
    @ResponseBody
    public ResultVo<Object> uploadFavIcon(@RequestParam(value="file") MultipartFile file) throws Exception {
        return this.uploadImage(file, "customFavIcon", 0x200000L);
    }

    @PostMapping(value={"/uploadBackgroundImg"})
    @ResponseBody
    public ResultVo<Object> uploadBackgroundImg(@RequestParam(value="file") MultipartFile file) throws Exception {
        return this.uploadImage(file, "customBackgroundImg", 0x1400000L);
    }

    private ResultVo uploadImage(MultipartFile file, String prefix, long maxSize) throws IOException {
        String fileName;
        String suffixName;
        String newFileName;
        String filePath;
        File dest;
        boolean typeMatch = FileUploadUtil.checkUploadType((MultipartFile)file, (String)"gif,jpg,jpeg,jpg2,png,tif,tiff,bmp,svg,svgz,webp,ico", (String)"image/gif,image/jpeg,image/jp2,image/png,image/tiff,image/bmp,image/svg+xml,image/webp,image/x-icon");
        if (!typeMatch) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.UPLOAD_FILE_TYPE_ERROR);
        }
        if (file.isEmpty()) {
            ResultVo.error();
        }
        if (file.getSize() > maxSize) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.UPLOAD_FILE_SIZE_ERROR);
        }
        String folderPath = this.propConfig.getRdsScriptDir() + "img" + File.separator;
        String oldFileName = FileUploadUtil.getFileNameByPrefix((String)folderPath, (String)prefix);
        if (oldFileName != null) {
            File oldFile = new File(folderPath + oldFileName);
            oldFile.delete();
        }
        if (!(dest = new File(filePath = folderPath + (newFileName = prefix + (suffixName = (fileName = file.getOriginalFilename()).substring(fileName.lastIndexOf(".")))))).getParentFile().exists()) {
            dest.getParentFile().mkdirs();
        }
        dest.createNewFile();
        try {
            file.transferTo(dest);
            log.info("\u4e0a\u4f20\u6210\u529f");
            return ResultVo.success();
        }
        catch (IOException e) {
            log.error(e.toString(), (Throwable)e);
            return ResultVo.error();
        }
    }

    @GetMapping(value={"/logo"})
    public void getLogo(HttpServletResponse response) throws Exception {
        String logoFileName = "seer-logo.png";
        String filePath = this.propConfig.getSceneDir() + logoFileName;
        File file = new File(filePath);
        if (!file.exists()) {
            return;
        }
        response.setCharacterEncoding("UTF-8");
        response.setContentType("image/png");
        int len = 0;
        response.reset();
        byte[] buff = new byte[1024];
        try (BufferedInputStream br = new BufferedInputStream(new FileInputStream(file));
             ServletOutputStream out = response.getOutputStream();){
            while ((len = br.read(buff)) > 0) {
                out.write(buff, 0, len);
            }
        }
    }

    @GetMapping(value={"/getExtUi"})
    @ResponseBody
    public ResultVo<Object> getExtUi(@ApiIgnore HttpServletResponse response) {
        Path folderPath;
        ResultVo resp = new ResultVo();
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        ArrayList fileNames = new ArrayList();
        try {
            folderPath = Paths.get(propConfig.getRdsScriptDir(), new String[0]).resolve("ui_ext");
            if (!Files.isDirectory(folderPath, LinkOption.NOFOLLOW_LINKS)) {
                log.warn("The specified directory is not valid: " + folderPath);
                resp.setData(fileNames);
                return resp;
            }
        }
        catch (InvalidPathException e) {
            log.error("Invalid path for folder: " + propConfig.getRdsStaticDir(), (Throwable)e);
            resp.setData(fileNames);
            return resp;
        }
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(folderPath, entry -> Files.isRegularFile(entry, new LinkOption[0]));){
            stream.forEach(path -> fileNames.add(path.getFileName().toString()));
        }
        catch (IOException e) {
            log.warn("Failed to list files for folder: " + folderPath, (Throwable)e);
        }
        resp.setData(fileNames);
        return resp;
    }

    @ApiOperation(value="jdbc\u67e5\u8be2")
    @PostMapping(value={"/jdbcQuery"})
    @ResponseBody
    public void jdbcQuery(@RequestBody @ApiIgnore HttpServletRequest request, @ApiIgnore HttpServletResponse response) {
    }

    @GetMapping(value={"/oauth"})
    @ResponseBody
    public ResultVo<Object> loginUrl(@RequestParam(required=false) String src) {
        boolean isPda = Objects.equals(src, "pda");
        log.info("oauth2 login: " + (isPda ? "pda" : "rds"));
        if (!this.ssoConfig.getEnable().booleanValue()) {
            return ResultVo.response(null);
        }
        String base = this.ssoConfig.getAuthorizationUri();
        String clientId = this.ssoConfig.getClientId();
        String resType = this.ssoConfig.getResType();
        String grantType = this.ssoConfig.getGrantType();
        String redirect = this.ssoConfig.getRedirectBaseUri() + this.ssoConfig.getRedirectEndpoint();
        String scope = this.ssoConfig.getScope();
        String state = isPda ? "pda" : this.ssoConfig.getState();
        String loginUrl = base + "?client_id=" + clientId + "&redirect_uri=" + redirect + "&scope=" + scope;
        loginUrl = StringUtils.isEmpty((CharSequence)resType) ? loginUrl : loginUrl + "&response_type=" + resType;
        loginUrl = StringUtils.isEmpty((CharSequence)grantType) ? loginUrl : loginUrl + "&grant_type=" + grantType;
        loginUrl = StringUtils.isEmpty((CharSequence)state) ? loginUrl : loginUrl + "&state=" + state;
        Map extraParams = this.ssoConfig.getExtraParams();
        if (Objects.nonNull(this.ssoConfig.getExtraParams()) && !extraParams.isEmpty()) {
            loginUrl = loginUrl + "&" + extraParams.entrySet().stream().map(entry -> (String)entry.getKey() + "=" + (String)entry.getValue()).collect(Collectors.joining("&"));
        }
        Map<String, String> data = Map.of("loginUrl", loginUrl, "logoutUrl", this.ssoConfig.getLogoutUrl(), "enableLoginPage", this.ssoConfig.getEnableLoginPage(), "ssoButtonText", this.ssoConfig.getSsoButtonText());
        return ResultVo.response(data);
    }

    private String getSessionId(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null || cookies.length == 0) {
            return null;
        }
        String jsessionId = request.getSession().getId();
        return jsessionId;
    }

    private void setHeader(HttpServletResponse response) {
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Access-Control-Allow-Credentials", "true");
        response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setContentType("application/json;charset=UTF-8");
    }

    @ApiOperation(value="\u6dfb\u52a0\u7528\u6237")
    @PostMapping(value={"/user/addUser"})
    @ResponseBody
    public ResultVo<Object> addUser(@RequestBody UserReqVo req) throws Exception {
        this.userService.saveUserAndRoles(req);
        return ResultVo.success();
    }

    @ApiOperation(value="\u4fee\u6539,\u7981\u7528\uff0c\u542f\u7528\u7528\u6237")
    @PostMapping(value={"/user/updateUser"})
    @ResponseBody
    public ResultVo<Object> updateUser(@RequestBody UserReqVo req) {
        this.userService.UpdateUser(req);
        return ResultVo.success();
    }

    @SysLog(operation="deleteUser", message="@{user.controller.deleteUser}")
    @ApiOperation(value="\u5220\u9664\u7528\u6237")
    @PostMapping(value={"/user/deleteUsers"})
    @ResponseBody
    public ResultVo<Object> deleteUser(@RequestBody List<String> usernames) {
        log.info("try to delete users: " + usernames);
        if (CollectionUtils.isEmpty(usernames)) {
            return ResultVo.error();
        }
        this.userService.deleteByUsernames(usernames);
        return ResultVo.success();
    }

    @ApiOperation(value="\u67e5\u8be2\u7528\u6237\uff08\u5206\u9875\uff09")
    @PostMapping(value={"/user/queryUser"})
    @ResponseBody
    public ResultVo<Object> queryUser(@RequestBody PaginationReq<User> req) throws Exception {
        PaginationResponseVo paginationResponseVo = this.userService.findAllUser(req);
        return ResultVo.response((Object)paginationResponseVo);
    }

    @ApiOperation(value="\u6dfb\u52a0\u89d2\u8272")
    @PostMapping(value={"/role/addRole"})
    @ResponseBody
    public ResultVo<Object> addRole(@RequestBody Role req) throws Exception {
        this.roleService.save(req);
        return ResultVo.success();
    }

    @ApiOperation(value="\u4fee\u6539\u89d2\u8272")
    @PostMapping(value={"/role/updateRole"})
    @ResponseBody
    public ResultVo<Object> updateRole(@RequestBody Role req) throws Exception {
        this.roleService.UpdateRole(req);
        return ResultVo.success();
    }

    @ApiOperation(value="\u5220\u9664\u89d2\u8272")
    @PostMapping(value={"/role/deleteRole"})
    @ResponseBody
    public ResultVo<Object> deleteRole(@RequestBody Role req) throws Exception {
        String id = req.getId();
        this.roleService.deleteByRoleId(id);
        return ResultVo.success();
    }

    @ApiOperation(value="\u67e5\u8be2\u89d2\u8272\uff08\u5206\u9875\uff09")
    @PostMapping(value={"/role/queryRole"})
    @ResponseBody
    public ResultVo<Object> queryRole(@RequestBody PaginationReq<Role> req) throws Exception {
        PaginationResponseVo paginationResponseVo = this.roleService.findAllRole(req.getCurrentPage(), req.getPageSize());
        return ResultVo.response((Object)paginationResponseVo);
    }

    @ApiOperation(value="\u67e5\u8be2\u6240\u6709\u89d2\u8272")
    @PostMapping(value={"/role/queryAllRole"})
    @ResponseBody
    public ResultVo<Object> queryAllRole(@RequestBody Role req) throws Exception {
        List roleList = this.roleService.findAll();
        return ResultVo.response((Object)roleList);
    }

    @ApiOperation(value="\u67e5\u8be2\u6240\u6709\u6743\u9650")
    @GetMapping(value={"/getAllPermission"})
    @ResponseBody
    public ResultVo<Object> getAllPermission() throws Exception {
        List permissionList = this.permissionService.findAll();
        List webPageList = new ArrayList();
        if (ConfigFileController.commonConfig != null && ConfigFileController.commonConfig.getWebPageList() != null) {
            webPageList = ConfigFileController.commonConfig.getWebPageList();
        }
        if (!CollectionUtils.isEmpty(webPageList)) {
            List<String> pageNameList = webPageList.stream().map(e -> e.getPageName()).collect(Collectors.toList());
            pageNameList.forEach(item -> {
                Permission permission1 = new Permission();
                permission1.setId(String.valueOf(UUID.randomUUID()));
                permission1.setName(item + "Pid");
                permission1.setDescription(item);
                permission1.setType(Integer.valueOf(1));
                permission1.setCreateTime(new Date());
                permissionList.add(permission1);
                Permission permission2 = new Permission();
                permission2.setId(String.valueOf(UUID.randomUUID()));
                permission2.setName(item);
                permission2.setDescription(item);
                permission2.setType(Integer.valueOf(3));
                permission2.setCreateTime(new Date());
                permissionList.add(permission2);
            });
        }
        return ResultVo.response((Object)permissionList);
    }

    @GetMapping(value={"/encrypt"})
    @ResponseBody
    public ResultVo<Object> whetherToEncrypt() {
        if (this.ldapConfig != null && this.ldapConfig.getEnable().booleanValue()) {
            return ResultVo.response((Object)false);
        }
        return ResultVo.response((Object)true);
    }

    @ApiOperation(value="\u6839\u636euuid\u67e5\u8be2\u7528\u6237\u53ca\u6743\u9650")
    @PostMapping(value={"/user/findUserPermissionByUuid"})
    @ResponseBody
    public ResultVo<Object> findUserPermissionsByUuid(@RequestBody UserReqVo req) {
        List userPermissionsByUuid = this.userService.findUserPermissionsByUuid(req.getId());
        return ResultVo.response((Object)userPermissionsByUuid);
    }

    @GetMapping(value={"/user/findAllUser"})
    @ResponseBody
    public ResultVo<Object> findAllUser() {
        List allUser = this.userService.findAll();
        if (this.securityConfig.getDisableShowUserInfo() != null && this.securityConfig.getDisableShowUserInfo().booleanValue() && !allUser.isEmpty()) {
            for (int i = 0; i < allUser.size(); ++i) {
                User user = (User)allUser.get(i);
                user.setPassword("******");
            }
        }
        return ResultVo.response((Object)allUser);
    }
}

