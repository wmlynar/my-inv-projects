/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.lark.oapi.Client
 *  com.lark.oapi.service.translation.v1.model.Term
 *  com.lark.oapi.service.translation.v1.model.TranslateTextReq
 *  com.lark.oapi.service.translation.v1.model.TranslateTextReqBody
 *  com.lark.oapi.service.translation.v1.model.TranslateTextResp
 *  com.lark.oapi.service.translation.v1.model.TranslateTextRespBody
 *  com.seer.rds.util.feiShuApi.FeiShuClient
 *  com.seer.rds.util.feiShuApi.TranslationUtils
 *  org.json.JSONException
 *  org.json.JSONObject
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util.feiShuApi;

import com.lark.oapi.Client;
import com.lark.oapi.service.translation.v1.model.Term;
import com.lark.oapi.service.translation.v1.model.TranslateTextReq;
import com.lark.oapi.service.translation.v1.model.TranslateTextReqBody;
import com.lark.oapi.service.translation.v1.model.TranslateTextResp;
import com.lark.oapi.service.translation.v1.model.TranslateTextRespBody;
import com.seer.rds.util.feiShuApi.FeiShuClient;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class TranslationUtils {
    private static final Logger log = LoggerFactory.getLogger(TranslationUtils.class);

    public static int[] translateFileBySourceFile(String sourceFilePath, String[] glossaryFileNameArray, String sourceLanguage, String[] targetLanguageArray, String fileType) {
        File sourceFile = new File(sourceFilePath);
        String translateDirectory = sourceFile.getParent();
        String sourceFileName = sourceFile.getName();
        int sufIndex = sourceFileName.lastIndexOf(".");
        String suffix = sourceFileName.substring(sufIndex);
        int firstUnderlineIndex = sourceFileName.indexOf("_");
        String beforeZh = sourceFileName.substring(0, firstUnderlineIndex + 1);
        int length = targetLanguageArray.length;
        String[] targetFilePathArray = new String[length];
        String[] glossaryFilePathArray = new String[length];
        for (int i = 0; i < length; ++i) {
            String targetFileName = "";
            if (fileType.equals("properties")) {
                targetFileName = TranslationUtils.getTargetFileName((String[])targetLanguageArray, (int)i, (String)beforeZh);
                targetFilePathArray[i] = translateDirectory + "\\" + targetFileName + suffix;
            } else if (fileType.equals("rdsFrontTs")) {
                targetFileName = targetLanguageArray[i].equals("ja") ? "jp" : (targetLanguageArray[i].equals("zh-Hant") ? "tw" : targetLanguageArray[i]);
                targetFilePathArray[i] = translateDirectory + "\\" + targetFileName + suffix;
            } else if (fileType.equals("json")) {
                targetFileName = TranslationUtils.getJsonTargetFileName((String[])targetLanguageArray, (int)i, (String)beforeZh);
                targetFilePathArray[i] = translateDirectory + "\\" + targetFileName + suffix;
            }
            if (glossaryFileNameArray[i] == null) continue;
            glossaryFilePathArray[i] = translateDirectory + "\\" + glossaryFileNameArray[i];
        }
        int[] countArray = TranslationUtils.translateFileBatches((String)sourceFilePath, (String[])targetFilePathArray, (String[])glossaryFilePathArray, (String)sourceLanguage, (String[])targetLanguageArray, (String)fileType);
        return countArray;
    }

    private static String getTargetFileName(String[] targetLanguageArray, int i, String beforeZh) {
        Object targetFileName = "";
        targetFileName = targetLanguageArray[i].equals("zh") ? "messages_zh_CN" : (targetLanguageArray[i].equals("zh-Hant") ? "messages_zh_TW" : (targetLanguageArray[i].equals("en") ? "messages_en_US" : (targetLanguageArray[i].equals("ja") ? "messages_ja_JP" : beforeZh + targetLanguageArray[i])));
        return targetFileName;
    }

    private static String getJsonTargetFileName(String[] targetLanguageArray, int i, String beforeZh) {
        Object targetFileName = "";
        targetFileName = targetLanguageArray[i].equals("zh-Hant") ? beforeZh + "zh_TW" : beforeZh + targetLanguageArray[i];
        return targetFileName;
    }

    public static int[] translateFileBatches(String sourceFilePath, String[] targetFilePathArray, String[] glossaryFilePathArray, String sourceLanguage, String[] targetLanguageArray, String fileType) {
        int[] countArray = new int[targetLanguageArray.length];
        for (int i = 0; i < targetLanguageArray.length; ++i) {
            int i1;
            countArray[i] = i1 = TranslationUtils.translateFile((String)sourceFilePath, (String)targetFilePathArray[i], (String)glossaryFilePathArray[i], (String)sourceLanguage, (String)targetLanguageArray[i], (String)fileType);
        }
        return countArray;
    }

    public static int translateFile(String sourceFilePath, String targetFilePath, String glossaryFilePath, String sourceLanguage, String targetLanguage, String fileType) {
        LinkedHashMap glossaryProperties;
        LinkedHashMap sourceHashMap = null;
        int count = 0;
        sourceHashMap = fileType.equals("properties") ? TranslationUtils.readPropertiesFile((String)sourceFilePath) : TranslationUtils.readFrontFile((String)sourceFilePath);
        if (sourceHashMap == null) {
            log.error("\u4e2d\u6587\u5c5e\u6027\u6587\u4ef6\u4e0d\u5b58\u5728\uff01");
            return count;
        }
        LinkedHashMap targetHashMap = null;
        Path tFilePath = Paths.get(targetFilePath, new String[0]);
        if (Files.exists(tFilePath, new LinkOption[0])) {
            targetHashMap = fileType.equals("properties") ? TranslationUtils.readPropertiesFile((String)targetFilePath) : TranslationUtils.readFrontFile((String)targetFilePath);
        }
        if (targetHashMap == null) {
            targetHashMap = new LinkedHashMap();
        }
        ArrayList<Term> termsList = new ArrayList<Term>();
        if (glossaryFilePath != null && !glossaryFilePath.isEmpty() && (glossaryProperties = TranslationUtils.readPropertiesFile((String)glossaryFilePath)) != null) {
            for (Map.Entry entry : glossaryProperties.entrySet()) {
                termsList.add(Term.newBuilder().from((String)entry.getKey()).to((String)entry.getValue()).build());
            }
        }
        Term[] terms = termsList.toArray(new Term[termsList.size()]);
        Client client = FeiShuClient.getClient();
        for (Map.Entry entry : sourceHashMap.entrySet()) {
            if (targetHashMap.containsKey(entry.getKey())) continue;
            if (((String)entry.getKey()).equals("@@locale")) {
                String valueEN = "";
                valueEN = targetLanguage.equals("zh-Hant") ? "zh-TW" : targetLanguage;
                targetHashMap.put((String)entry.getKey(), valueEN);
                ++count;
                continue;
            }
            String valueCN = (String)entry.getValue();
            TranslateTextReq req = TranslateTextReq.newBuilder().translateTextReqBody(TranslateTextReqBody.newBuilder().sourceLanguage(sourceLanguage).text(valueCN).targetLanguage(targetLanguage).glossary(terms).build()).build();
            try {
                TranslateTextResp resp = client.translation().text().translate(req);
                if (!resp.success()) {
                    log.info(String.format("code:%s,msg:%s,reqId:%s", resp.getCode(), resp.getMsg(), resp.getRequestId()));
                    return count;
                }
                String valueEN = ((TranslateTextRespBody)resp.getData()).getText();
                targetHashMap.put((String)entry.getKey(), valueEN);
                ++count;
            }
            catch (Exception e) {
                log.error("translateFile error", (Throwable)e);
                client = FeiShuClient.getClient();
            }
        }
        if (fileType.equals("properties")) {
            TranslationUtils.writePropertiesFile((LinkedHashMap)targetHashMap, (String)targetFilePath);
        } else if (fileType.equals("rdsFrontTs")) {
            TranslationUtils.writeFrontFile((LinkedHashMap)targetHashMap, (String)targetFilePath);
        } else if (fileType.equals("json")) {
            TranslationUtils.writeJsonFile((LinkedHashMap)targetHashMap, (String)targetFilePath);
        }
        log.info(targetLanguage + "\u7ffb\u8bd1\u5b8c\u6210\uff01\u7ffb\u8bd1\u6570\u91cf\u662f" + count);
        return count;
    }

    private static LinkedHashMap<String, String> readPropertiesFile(String filePath) {
        LinkedHashMap<String, String> properties = new LinkedHashMap<String, String>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader((InputStream)new FileInputStream(filePath), "UTF-8"));){
            String line;
            while ((line = reader.readLine()) != null) {
                int index;
                if (line.trim().startsWith("#") || line.trim().isEmpty() || (index = line.indexOf(61)) == -1) continue;
                String key = line.substring(0, index).trim();
                String value = line.substring(index + 1).trim();
                properties.put(key, value);
            }
        }
        catch (IOException e) {
            log.error("readPropertiesFile error", (Throwable)e);
        }
        return properties;
    }

    private static void writePropertiesFile(LinkedHashMap<String, String> properties, String filePath) {
        try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter((OutputStream)new FileOutputStream(filePath, false), "UTF-8"));){
            for (Map.Entry<String, String> entry : properties.entrySet()) {
                writer.write(entry.getKey() + "=" + entry.getValue());
                writer.newLine();
            }
        }
        catch (IOException e) {
            log.error("writePropertiesFile error", (Throwable)e);
        }
    }

    public static LinkedHashMap<String, String> readJsonFile(String filePath) {
        LinkedHashMap<String, String> jsonMap = new LinkedHashMap<String, String>();
        StringBuilder jsonContent = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new FileReader(filePath));){
            String line;
            while ((line = reader.readLine()) != null) {
                jsonContent.append(line);
            }
        }
        catch (IOException e) {
            e.printStackTrace();
        }
        try {
            JSONObject jsonObject = new JSONObject(jsonContent.toString());
            for (String key : jsonObject.keySet()) {
                if (jsonMap.containsKey(key)) continue;
                jsonMap.put(key, jsonObject.getString(key));
            }
        }
        catch (JSONException e) {
            e.printStackTrace();
        }
        return jsonMap;
    }

    private static LinkedHashMap<String, String> readFrontFile(String filePath) {
        LinkedHashMap<String, String> frontFileMap = new LinkedHashMap<String, String>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader((InputStream)new FileInputStream(filePath), "UTF-8"));){
            String line;
            Pattern pattern = Pattern.compile("(?:\"?)([^\":]+)(?:\"?)\\s*:\\s*(?:\"?)([^\"\\,]+(?:,[^\"\\,]+)*)");
            while ((line = reader.readLine()) != null) {
                if (line.trim().startsWith("export") || line.trim().startsWith("import") || line.trim().startsWith("//") || line.trim().isEmpty()) continue;
                Matcher matcher = pattern.matcher(line);
                while (matcher.find()) {
                    frontFileMap.put(matcher.group(1).trim(), matcher.group(2));
                }
            }
        }
        catch (IOException e) {
            log.error("readPropertiesFile error", (Object)e.getMessage());
        }
        return frontFileMap;
    }

    private static void writeJsonFile(LinkedHashMap<String, String> properties, String filePath) {
        try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter((OutputStream)new FileOutputStream(filePath, false), "UTF-8"));){
            writer.write("{");
            writer.newLine();
            for (Map.Entry<String, String> entry : properties.entrySet()) {
                writer.write("    \"" + entry.getKey() + "\": \"" + entry.getValue() + "\"");
                if (!entry.equals(properties.entrySet().toArray()[properties.size() - 1])) {
                    writer.write(",");
                }
                writer.newLine();
            }
            writer.write("}");
        }
        catch (IOException e) {
            log.error("writeFrontFile error", (Throwable)e);
        }
    }

    private static void writeFrontFile(LinkedHashMap<String, String> properties, String filePath) {
        try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter((OutputStream)new FileOutputStream(filePath, false), "UTF-8"));){
            writer.write("import { DictData } from \"../dict\";");
            writer.newLine();
            writer.newLine();
            writer.write("export const dict: DictData = {");
            writer.newLine();
            for (Map.Entry<String, String> entry : properties.entrySet()) {
                writer.write("    \"" + entry.getKey() + "\": \"" + entry.getValue() + "\",");
                writer.newLine();
            }
            writer.write("}");
        }
        catch (IOException e) {
            log.error("writeFrontFile error", (Throwable)e);
        }
    }
}

