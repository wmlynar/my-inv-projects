/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.fasterxml.jackson.databind.ObjectMapper
 *  com.seer.rds.util.YmlConfigUtil
 *  com.seer.rds.vo.req.OauthConfigReq
 *  com.seer.rds.vo.req.OpcConfigReq
 *  com.seer.rds.vo.req.RDSConfigReq
 *  com.seer.rds.vo.req.UpdateHttpsConfigReq
 *  com.seer.rds.web.config.ConfigFileController
 *  org.apache.commons.io.FileUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.commons.lang3.math.NumberUtils
 *  org.bouncycastle.asn1.pkcs.PrivateKeyInfo
 *  org.bouncycastle.jce.provider.BouncyCastleProvider
 *  org.bouncycastle.openssl.PEMKeyPair
 *  org.bouncycastle.openssl.PEMParser
 *  org.bouncycastle.openssl.jcajce.JcaPEMKeyConverter
 *  org.bouncycastle.openssl.jcajce.JceOpenSSLPKCS8DecryptorProviderBuilder
 *  org.bouncycastle.operator.InputDecryptorProvider
 *  org.bouncycastle.pkcs.PKCS8EncryptedPrivateKeyInfo
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.util.FileCopyUtils
 *  org.springframework.web.multipart.MultipartFile
 *  org.yaml.snakeyaml.DumperOptions
 *  org.yaml.snakeyaml.DumperOptions$FlowStyle
 *  org.yaml.snakeyaml.Yaml
 *  org.yaml.snakeyaml.constructor.BaseConstructor
 *  org.yaml.snakeyaml.constructor.Constructor
 *  org.yaml.snakeyaml.nodes.Tag
 *  org.yaml.snakeyaml.representer.Representer
 */
package com.seer.rds.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.seer.rds.vo.req.OauthConfigReq;
import com.seer.rds.vo.req.OpcConfigReq;
import com.seer.rds.vo.req.RDSConfigReq;
import com.seer.rds.vo.req.UpdateHttpsConfigReq;
import com.seer.rds.web.config.ConfigFileController;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.KeyPair;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.PrivateKey;
import java.security.Provider;
import java.security.Security;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.math.NumberUtils;
import org.bouncycastle.asn1.pkcs.PrivateKeyInfo;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.openssl.PEMKeyPair;
import org.bouncycastle.openssl.PEMParser;
import org.bouncycastle.openssl.jcajce.JcaPEMKeyConverter;
import org.bouncycastle.openssl.jcajce.JceOpenSSLPKCS8DecryptorProviderBuilder;
import org.bouncycastle.operator.InputDecryptorProvider;
import org.bouncycastle.pkcs.PKCS8EncryptedPrivateKeyInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.multipart.MultipartFile;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.BaseConstructor;
import org.yaml.snakeyaml.constructor.Constructor;
import org.yaml.snakeyaml.nodes.Tag;
import org.yaml.snakeyaml.representer.Representer;

/*
 * Exception performing whole class analysis ignored.
 */
public class YmlConfigUtil {
    private static final Logger log = LoggerFactory.getLogger(YmlConfigUtil.class);
    private static List<String> protocols = Arrays.asList("SSLv3", "TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3");
    private static List<String> keyStoreTypes = Arrays.asList("JKS", "PKCS12", "JCEKS", "PKCS11", "Windows-MY", "Windows-ROOT");
    private static List<String> httpsYmlConfig = Arrays.asList("server.port", "server.ssl.enabled", "server.ssl.key-alias", "server.ssl.key-password", "server.ssl.key-store-password", "server.ssl.key-store", "server.ssl.key-store-type", "server.ssl.enabled-protocols", "server.ssl.ciphers");
    private static final String EMAIL_CONFIG = "emailConfig";
    private static final String OPC_CONFIG = "opc";
    private static final String OAUTH_CONFIG = "oauth";
    private static final String RDS_CONFIG = "rds";

    public static <T> T loadConfig(String configFilePath, Class<T> configClass) throws Exception {
        Representer rp = new Representer();
        rp.getPropertyUtils().setSkipMissingProperties(true);
        Yaml yaml = new Yaml((BaseConstructor)new Constructor(configClass), rp);
        File configFile = new File(configFilePath);
        String configStr = FileUtils.readFileToString((File)configFile, (Charset)StandardCharsets.UTF_8);
        Object config = yaml.load(configStr);
        return (T)config;
    }

    public static String loadConfigString(String configFilePath) throws Exception {
        Representer rp = new Representer();
        rp.getPropertyUtils().setSkipMissingProperties(true);
        File configFile = new File(configFilePath);
        String configStr = FileUtils.readFileToString((File)configFile, (Charset)StandardCharsets.UTF_8);
        return configStr;
    }

    public static void writeToYaml(Object data, String filePath) {
        DumperOptions options = new DumperOptions();
        options.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
        Yaml yaml = new Yaml(options);
        String str = yaml.dump(data);
        try (FileWriter fw = new FileWriter(filePath);){
            fw.write(str);
            fw.flush();
        }
        catch (IOException e) {
            log.error("\u5199\u5165{} \u914d\u7f6e\u6587\u4ef6\u9519\u8bef", (Object)filePath);
        }
    }

    public static synchronized boolean syncWriteToYml(Map<String, Object> updateYamlDataSection, String filePath) {
        boolean bl;
        Map yamlData;
        if (updateYamlDataSection.isEmpty()) {
            log.warn("\u914d\u7f6e\u6587\u4ef6\u5199\u5165\u5931\u8d25\uff0c\u5199\u5165\u7684\u5185\u5bb9\u4e0d\u80fd\u4e3a\u7a7a\u3002");
            return false;
        }
        Yaml yaml = new Yaml();
        try (FileInputStream fis = new FileInputStream(filePath);
             InputStreamReader isr = new InputStreamReader((InputStream)fis, StandardCharsets.UTF_8);
             BufferedReader reader = new BufferedReader(isr);){
            yamlData = (Map)yaml.load((Reader)reader);
        }
        yamlData.putAll(updateYamlDataSection);
        DumperOptions options = new DumperOptions();
        options.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
        Yaml yamlWriter = new Yaml(options);
        String str = yamlWriter.dump((Object)yamlData);
        FileWriter fw = new FileWriter(filePath, StandardCharsets.UTF_8);
        try {
            fw.write(str);
            log.info("\u6210\u529f\u5199\u5165\u914d\u7f6e\u6587\u4ef6: {}", (Object)filePath);
            bl = true;
        }
        catch (Throwable throwable) {
            try {
                try {
                    try {
                        fw.close();
                    }
                    catch (Throwable throwable2) {
                        throwable.addSuppressed(throwable2);
                    }
                    throw throwable;
                }
                catch (IOException e) {
                    log.error("\u5199\u5165\u914d\u7f6e\u6587\u4ef6\u65f6\u53d1\u751f\u9519\u8bef: {}", (Object)filePath, (Object)e);
                    return false;
                }
            }
            catch (IOException e) {
                log.error("\u8bfb\u53d6\u914d\u7f6e\u6587\u4ef6\u65f6\u53d1\u751f\u9519\u8bef: {}", (Object)filePath, (Object)e);
                return false;
            }
        }
        fw.close();
        return bl;
    }

    public static boolean checkYamlRuntimeMenuPropsUpdate() {
        if (ConfigFileController.commonConfig != null && ConfigFileController.commonConfig.getOperator() != null && ConfigFileController.commonConfig.getOperator().getRuntimeMenuPropsUpdate() != null) {
            return ConfigFileController.commonConfig.getOperator().getRuntimeMenuPropsUpdate();
        }
        return false;
    }

    public static String updateHttpsConfig(UpdateHttpsConfigReq updateHttpsConfigReq, String ymlFilePath, String keyStoreFileName) throws IOException {
        String keyStorePassword;
        String keyPassWord;
        String keyAlias;
        String port;
        String keyStoreType;
        Path path = Paths.get(ymlFilePath, new String[0]);
        String yamlContent = Files.readString(path);
        Yaml yaml = new Yaml();
        Map config = (Map)yaml.load(yamlContent);
        Map serverConfig = YmlConfigUtil.ensureAndGetMap((Map)config, (String)"server");
        Map httpsConfig = YmlConfigUtil.ensureAndGetMap((Map)serverConfig, (String)"ssl");
        HashMap<String, Object> checkResultMap = new HashMap<String, Object>();
        Object resultMsg = "check Success";
        String resultKey = "true";
        httpsConfig.put("enabled", updateHttpsConfigReq.isHttpsEnable());
        String keyStorePath = updateHttpsConfigReq.getKeyStorePath();
        if (!keyStorePath.equals("classpath:rds-https.keystore")) {
            httpsConfig.put("key-store", YmlConfigUtil.genKeyStoreFilePath((String)keyStorePath, (String)keyStoreFileName));
        } else {
            httpsConfig.put("key-store", "classpath:rds-https.keystore");
        }
        String enableProtocols = updateHttpsConfigReq.getEnableProtocols();
        if (StringUtils.isNotEmpty((CharSequence)enableProtocols)) {
            if (!protocols.contains(enableProtocols)) {
                resultMsg = "protocols must be in:" + protocols;
                resultKey = "false";
            } else {
                httpsConfig.put("enabled-protocols", enableProtocols);
            }
        }
        if (StringUtils.isNotEmpty((CharSequence)(keyStoreType = updateHttpsConfigReq.getKeyStoreType()))) {
            if (!keyStoreTypes.contains(keyStoreType)) {
                resultMsg = "key store type must be in:" + keyStoreTypes;
                resultKey = "false";
            } else {
                httpsConfig.put("key-store-type", keyStoreType);
            }
        }
        if (StringUtils.isNotEmpty((CharSequence)(port = updateHttpsConfigReq.getPort()))) {
            if (!StringUtils.isNumeric((CharSequence)port)) {
                resultMsg = "port must be number";
                resultKey = "false";
            } else {
                serverConfig.put("port", Integer.valueOf(port));
            }
        }
        if (StringUtils.isNotEmpty((CharSequence)(keyAlias = updateHttpsConfigReq.getKeyAlias()))) {
            if (StringUtils.isNumeric((CharSequence)keyAlias)) {
                resultMsg = "keyalias must contains word";
                resultKey = "false";
            } else {
                httpsConfig.put("key-alias", keyAlias);
            }
        }
        if (StringUtils.isNotEmpty((CharSequence)(keyPassWord = updateHttpsConfigReq.getKeyPassword()))) {
            if (StringUtils.isNumeric((CharSequence)keyPassWord)) {
                resultMsg = "key password must contains word";
                resultKey = "false";
            } else {
                httpsConfig.put("key-password", keyPassWord);
            }
        }
        if (StringUtils.isNotEmpty((CharSequence)(keyStorePassword = updateHttpsConfigReq.getKeyStorePassword()))) {
            if (StringUtils.isNumeric((CharSequence)keyStorePassword)) {
                resultMsg = "key store password must contains word";
                resultKey = "false";
            } else {
                httpsConfig.put("key-store-password", keyStorePassword);
            }
        }
        checkResultMap.put(resultKey, resultMsg);
        if (checkResultMap.containsKey("false")) {
            return (String)checkResultMap.get("false");
        }
        Representer representer = new Representer();
        representer.addClassTag(httpsConfig.getClass(), Tag.MAP);
        DumperOptions options = new DumperOptions();
        options.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
        options.setIndent(2);
        options.setPrettyFlow(true);
        Yaml newYaml = new Yaml(representer, options);
        String newYamlContent = newYaml.dump((Object)config);
        OutputStreamWriter writer = new OutputStreamWriter((OutputStream)new FileOutputStream(ymlFilePath), StandardCharsets.UTF_8);
        writer.write(newYamlContent);
        writer.close();
        return null;
    }

    public static boolean resetHttpsConfig(String newYmlFilePath) throws IOException {
        try {
            Path path = Paths.get(newYmlFilePath, new String[0]);
            String yamlContent = Files.readString(path);
            Yaml yaml = new Yaml();
            Map config = (Map)yaml.load(yamlContent);
            Map serverConfig = YmlConfigUtil.ensureAndGetMap((Map)config, (String)"server");
            Map httpsConfig = YmlConfigUtil.ensureAndGetMap((Map)serverConfig, (String)"ssl");
            serverConfig.put("port", 8090);
            httpsConfig.put("key-alias", "rds_https");
            httpsConfig.put("enabled", false);
            httpsConfig.put("key-password", "rds2021");
            httpsConfig.put("key-store-password", "rds2021");
            httpsConfig.put("key-store", "classpath:rds-https.keystore");
            httpsConfig.put("key-store-type", "JKS");
            httpsConfig.put("enabled-protocols", "TLSv1.2");
            Representer representer = new Representer();
            representer.addClassTag(httpsConfig.getClass(), Tag.MAP);
            DumperOptions options = new DumperOptions();
            options.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
            options.setIndent(2);
            options.setPrettyFlow(true);
            Yaml newYaml = new Yaml(representer, options);
            String newYamlContent = newYaml.dump((Object)config);
            OutputStreamWriter writer = new OutputStreamWriter((OutputStream)new FileOutputStream(newYmlFilePath), StandardCharsets.UTF_8);
            writer.write(newYamlContent);
            writer.close();
            return true;
        }
        catch (Exception e) {
            log.error("Reset failed", (Throwable)e);
            return false;
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public static void transferKeyStore(MultipartFile crtFile, MultipartFile keyFile, File keyStoreFile, String alias, String keyPassWord, String keyStorePassWord, String keyStoreType) throws IOException, KeyStoreException {
        Security.addProvider((Provider)new BouncyCastleProvider());
        KeyStore store = KeyStore.getInstance(keyStoreType);
        InputStream crtInputStream = null;
        ByteArrayOutputStream stream = null;
        try {
            PrivateKey privateKey;
            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            crtInputStream = crtFile.getInputStream();
            Certificate cert = cf.generateCertificate(crtInputStream);
            PEMParser pemParser = new PEMParser((Reader)new InputStreamReader(keyFile.getInputStream()));
            Object object = pemParser.readObject();
            JcaPEMKeyConverter converter = new JcaPEMKeyConverter().setProvider("BC");
            if (object instanceof PEMKeyPair) {
                KeyPair kp = converter.getKeyPair((PEMKeyPair)object);
                privateKey = kp.getPrivate();
            } else if (object instanceof PKCS8EncryptedPrivateKeyInfo) {
                PKCS8EncryptedPrivateKeyInfo encPKInfo = (PKCS8EncryptedPrivateKeyInfo)object;
                JceOpenSSLPKCS8DecryptorProviderBuilder decryptorProviderBuilder = new JceOpenSSLPKCS8DecryptorProviderBuilder().setProvider("BC");
                InputDecryptorProvider decryptorProvider = decryptorProviderBuilder.build("encryptionPassword".toCharArray());
                PrivateKeyInfo pkInfo = encPKInfo.decryptPrivateKeyInfo(decryptorProvider);
                privateKey = converter.getPrivateKey(pkInfo);
            } else if (object instanceof PrivateKeyInfo) {
                privateKey = converter.getPrivateKey((PrivateKeyInfo)object);
            } else {
                throw new IllegalArgumentException("Unsupported object type: " + object.getClass().getName());
            }
            store.load(null, keyStorePassWord.toCharArray());
            store.setCertificateEntry(alias, cert);
            Certificate[] certChain = new Certificate[]{cert};
            store.setKeyEntry(alias, privateKey, keyPassWord.toCharArray(), certChain);
            stream = new ByteArrayOutputStream();
            store.store(stream, keyStorePassWord.toCharArray());
            byte[] keystoreBytes = stream.toByteArray();
            ByteArrayInputStream inputStream = new ByteArrayInputStream(keystoreBytes);
            FileOutputStream outputStream = new FileOutputStream(keyStoreFile);
            FileCopyUtils.copy((InputStream)inputStream, (OutputStream)outputStream);
        }
        catch (Exception e) {
            log.error("Transfer keystorefile failed", (Throwable)e);
        }
        finally {
            if (stream != null) {
                stream.close();
            }
            if (crtInputStream != null) {
                crtInputStream.close();
            }
        }
    }

    public static String genKeyStoreFilePath(String keyStorePath, String keyStoreFileName) {
        Path path = Paths.get(keyStorePath, keyStoreFileName);
        return path.toString();
    }

    public static void updateYmlConfig(String type, String reqStr, String ymlConfigPath) throws IOException {
        ObjectMapper objectMapper = new ObjectMapper();
        if (type.equals("opc")) {
            OpcConfigReq opcConfigReq = null;
            opcConfigReq = (OpcConfigReq)objectMapper.readValue(reqStr, OpcConfigReq.class);
            YmlConfigUtil.updateOpcConfig((OpcConfigReq)opcConfigReq, (String)ymlConfigPath);
        }
        if (type.equals("oauth")) {
            OauthConfigReq oauthConfigReq = null;
            oauthConfigReq = (OauthConfigReq)objectMapper.readValue(reqStr, OauthConfigReq.class);
            YmlConfigUtil.updateOauthConfig((OauthConfigReq)oauthConfigReq, (String)ymlConfigPath);
        }
        if (type.equals("rds")) {
            RDSConfigReq rdsConfigReq = null;
            rdsConfigReq = (RDSConfigReq)objectMapper.readValue(reqStr, RDSConfigReq.class);
            YmlConfigUtil.updateRDSEnableCorsConfig((RDSConfigReq)rdsConfigReq, (String)ymlConfigPath);
        }
    }

    public static List<Map<String, Object>> getYmlConfigMap(String ymlConfigPath, String configType) throws IOException {
        Yaml yaml = new Yaml();
        Path path = Paths.get(ymlConfigPath, new String[0]);
        String yamlContent = Files.readString(path);
        Map config = (Map)yaml.load(yamlContent);
        HashMap ymlConfigMap = (HashMap)config.get(configType);
        if (ymlConfigMap == null) {
            ymlConfigMap = new HashMap();
            config.put(configType, ymlConfigMap);
        } else {
            config.put(configType, ymlConfigMap);
        }
        ArrayList<Map<String, Object>> ymlConfigMapConfigMapList = new ArrayList<Map<String, Object>>();
        ymlConfigMapConfigMapList.add(config);
        ymlConfigMapConfigMapList.add(ymlConfigMap);
        return ymlConfigMapConfigMapList;
    }

    public static void saveYmlConfigFile(String ymlConfigPath, Map<String, Object> targetConfigMap, Map<String, Object> ymlConfigMap) throws IOException {
        Representer representer = new Representer();
        representer.addClassTag(targetConfigMap.getClass(), Tag.MAP);
        DumperOptions options = new DumperOptions();
        options.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
        options.setIndent(2);
        options.setPrettyFlow(true);
        Yaml newYaml = new Yaml(representer, options);
        String newYamlContent = newYaml.dump(ymlConfigMap);
        OutputStreamWriter writer = new OutputStreamWriter((OutputStream)new FileOutputStream(ymlConfigPath), StandardCharsets.UTF_8);
        writer.write(newYamlContent);
        writer.close();
    }

    public static String getKeyStoreFilePath(String ymlConfigPath) throws IOException {
        Path path = Paths.get(ymlConfigPath, new String[0]);
        String yamlContent = Files.readString(path);
        Yaml yaml = new Yaml();
        Map config = (Map)yaml.load(yamlContent);
        Map serverConfig = YmlConfigUtil.ensureAndGetMap((Map)config, (String)"server");
        Map httpsConfig = YmlConfigUtil.ensureAndGetMap((Map)serverConfig, (String)"ssl");
        String keyStoreFilePath = (String)httpsConfig.get("key-store");
        return keyStoreFilePath;
    }

    public static void updateOauthConfig(OauthConfigReq oauthConfigReq, String ymlConfigPath) throws IOException {
        try {
            List ymlConfigMapList = YmlConfigUtil.getYmlConfigMap((String)ymlConfigPath, (String)"oauth");
            Map ymlConfigMap = (Map)ymlConfigMapList.get(0);
            Map oauthConfigMap = (Map)ymlConfigMapList.get(1);
            oauthConfigMap.put("enable", oauthConfigReq.isOauthEnable());
            if (!StringUtils.isBlank((CharSequence)oauthConfigReq.getAuthorizationUri())) {
                oauthConfigMap.put("authorizationUri", oauthConfigReq.getAuthorizationUri());
            }
            if (!StringUtils.isBlank((CharSequence)oauthConfigReq.getTokenUri())) {
                oauthConfigMap.put("tokenUri", oauthConfigReq.getTokenUri());
            }
            if (!StringUtils.isBlank((CharSequence)oauthConfigReq.getUserInfoUri())) {
                oauthConfigMap.put("userInfoUri", oauthConfigReq.getUserInfoUri());
            }
            if (!StringUtils.isBlank((CharSequence)oauthConfigReq.getUserAttributeName())) {
                oauthConfigMap.put("userAttributeName", oauthConfigReq.getUserAttributeName());
            }
            if (!StringUtils.isBlank((CharSequence)oauthConfigReq.getClientId())) {
                oauthConfigMap.put("clientId", oauthConfigReq.getClientId());
            }
            if (!StringUtils.isBlank((CharSequence)oauthConfigReq.getClientSecret())) {
                oauthConfigMap.put("clientSecret", oauthConfigReq.getClientSecret());
            }
            if (!StringUtils.isBlank((CharSequence)oauthConfigReq.getScope())) {
                oauthConfigMap.put("scope", oauthConfigReq.getScope());
            }
            if (!StringUtils.isBlank((CharSequence)oauthConfigReq.getGrantType())) {
                oauthConfigMap.put("grantType", oauthConfigReq.getGrantType());
            }
            if (!StringUtils.isBlank((CharSequence)oauthConfigReq.getRedirectBaseUri())) {
                oauthConfigMap.put("redirectBaseUri", oauthConfigReq.getRedirectBaseUri());
            }
            if (!StringUtils.isBlank((CharSequence)oauthConfigReq.getRedirectEndpoint())) {
                oauthConfigMap.put("redirectEndpoint", oauthConfigReq.getRedirectEndpoint());
            }
            if (!StringUtils.isBlank((CharSequence)oauthConfigReq.getAdmins())) {
                oauthConfigMap.put("admins", oauthConfigReq.getAdmins());
            } else {
                oauthConfigMap.put("admins", "");
            }
            if (!StringUtils.isBlank((CharSequence)oauthConfigReq.getHomeUrl())) {
                oauthConfigMap.put("homeUrl", oauthConfigReq.getHomeUrl());
            }
            if (!StringUtils.isBlank((CharSequence)oauthConfigReq.getPdaHomeUrl())) {
                oauthConfigMap.put("pdaHomeUrl", oauthConfigReq.getPdaHomeUrl());
            }
            if (!StringUtils.isBlank((CharSequence)oauthConfigReq.getLogoutUrl())) {
                oauthConfigMap.put("logoutUrl", oauthConfigReq.getLogoutUrl());
            }
            if (!StringUtils.isBlank((CharSequence)oauthConfigReq.getErrorUrl())) {
                oauthConfigMap.put("errorUrl", oauthConfigReq.getErrorUrl());
            } else {
                oauthConfigMap.put("errorUrl", "");
            }
            oauthConfigMap.put("loginWithUserEnable", oauthConfigReq.getLoginWithUserEnable());
            oauthConfigMap.put("enableLoginPage", oauthConfigReq.getEnableLoginPage());
            if (StringUtils.isNotEmpty((CharSequence)oauthConfigReq.getSsoButtonText())) {
                oauthConfigMap.put("ssoButtonText", oauthConfigReq.getSsoButtonText());
            } else {
                oauthConfigMap.put("ssoButtonText", "SSO login");
            }
            YmlConfigUtil.saveYmlConfigFile((String)ymlConfigPath, (Map)oauthConfigMap, (Map)ymlConfigMap);
        }
        catch (IOException e) {
            log.error("Update oauth config error", (Throwable)e);
            throw new RuntimeException("Update oauth config error");
        }
    }

    public static void updateOpcConfig(OpcConfigReq opcConfigReq, String ymlConfigPath) throws IOException {
        try {
            List ymlConfigMapList = YmlConfigUtil.getYmlConfigMap((String)ymlConfigPath, (String)"opc");
            Map ymlConfigMap = (Map)ymlConfigMapList.get(0);
            Map opcConfigMap = (Map)ymlConfigMapList.get(1);
            opcConfigMap.put("enable", opcConfigReq.isOpcEnable());
            opcConfigMap.put("isAnonymousConnect", opcConfigReq.isAnonymousEnable());
            opcConfigMap.put("serverUsername", opcConfigReq.getUserName());
            opcConfigMap.put("serverPassword", opcConfigReq.getPassWord());
            if (!StringUtils.isBlank((CharSequence)opcConfigReq.getOpcuaEndpointUrl())) {
                opcConfigMap.put("opcuaEndpointUrl", opcConfigReq.getOpcuaEndpointUrl());
            }
            if (!StringUtils.isBlank((CharSequence)opcConfigReq.getOpcuaEndpointSubInterval())) {
                opcConfigMap.put("opcuaEndpointSubInterval", Integer.valueOf(opcConfigReq.getOpcuaEndpointSubInterval()));
            }
            if (!StringUtils.isBlank((CharSequence)opcConfigReq.getRetry()) && NumberUtils.isCreatable((String)opcConfigReq.getRetry()) && (Integer.valueOf(opcConfigReq.getRetry()) >= 0 || Integer.valueOf(opcConfigReq.getRetry()) == -1)) {
                opcConfigMap.put("retry", Integer.valueOf(opcConfigReq.getRetry()));
            }
            if (!StringUtils.isBlank((CharSequence)opcConfigReq.getRetryInterval()) && StringUtils.isNumeric((CharSequence)opcConfigReq.getRetryInterval())) {
                opcConfigMap.put("retryInterval", Integer.valueOf(opcConfigReq.getRetryInterval()));
            }
            YmlConfigUtil.saveYmlConfigFile((String)ymlConfigPath, (Map)opcConfigMap, (Map)ymlConfigMap);
        }
        catch (IOException e) {
            log.error("Update opc config error", (Throwable)e);
            throw new RuntimeException("Update opc config error");
        }
    }

    private static Map<String, Object> ensureAndGetMap(Map<String, Object> parentMap, String key) {
        if (!parentMap.containsKey(key)) {
            parentMap.put(key, new HashMap());
        }
        return (Map)parentMap.get(key);
    }

    public static void updateRDSEnableCorsConfig(RDSConfigReq rdsConfigReq, String ymlConfigPath) throws IOException {
        try {
            List ymlConfigMapList = YmlConfigUtil.getYmlConfigMap((String)ymlConfigPath, (String)"rds");
            Map ymlConfigMap = (Map)ymlConfigMapList.get(0);
            Map rdsConfigMap = (Map)ymlConfigMapList.get(1);
            rdsConfigMap.put("enableCors", rdsConfigReq.isEnableCors());
            YmlConfigUtil.saveYmlConfigFile((String)ymlConfigPath, (Map)rdsConfigMap, (Map)ymlConfigMap);
        }
        catch (IOException e) {
            log.error("Update rds enableCors config error", (Throwable)e);
            throw new RuntimeException("Update rds enableCors error");
        }
    }
}

