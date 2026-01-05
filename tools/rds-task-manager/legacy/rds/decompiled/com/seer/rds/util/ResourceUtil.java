/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.ResourceUtil
 *  javax.annotation.Resource
 *  org.apache.commons.compress.utils.Lists
 *  org.apache.commons.io.FileUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.core.io.ClassPathResource
 *  org.springframework.core.io.FileSystemResource
 *  org.springframework.core.io.Resource
 *  org.springframework.core.io.support.PathMatchingResourcePatternResolver
 */
package com.seer.rds.util;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import org.apache.commons.compress.utils.Lists;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

/*
 * Exception performing whole class analysis ignored.
 */
public class ResourceUtil {
    private static final Logger log = LoggerFactory.getLogger(ResourceUtil.class);

    public static void copyResourcesFileToTemp(String fileRoot, String regExpStr, String tempParent) throws Exception {
        try {
            org.springframework.core.io.Resource[] resources;
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            for (org.springframework.core.io.Resource resource : resources = resolver.getResources(fileRoot + regExpStr)) {
                File newFile = new File(tempParent, resource.getFilename());
                if (newFile.exists()) {
                    newFile.delete();
                }
                InputStream stream = null;
                try {
                    stream = resource.getInputStream();
                }
                catch (Exception e1) {
                    log.debug(resource.getFilename() + "\u662f\u6587\u4ef6\u5939");
                }
                if (stream == null) {
                    Resource[] children;
                    log.debug("\u521b\u5efa\u6587\u4ef6\u5939" + resource.getFilename());
                    newFile.mkdirs();
                    for (Resource child : children = (Resource[])resolver.getResources(fileRoot + resource.getFilename() + "/" + regExpStr)) {
                        ResourceUtil.copyResourcesFileToTemp((String)(fileRoot + resource.getFilename() + "/"), (String)regExpStr, (String)(tempParent + "\\" + resource.getFilename()));
                    }
                    continue;
                }
                if (!newFile.getParentFile().exists()) {
                    newFile.getParentFile().mkdir();
                }
                FileUtils.copyInputStreamToFile((InputStream)stream, (File)newFile);
            }
        }
        catch (Exception e) {
            log.error("Copy File Exception", (Throwable)e);
            throw e;
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public static String getResourcesByStream(String fileName) {
        Object str = "";
        ClassPathResource resource = new ClassPathResource(fileName);
        InputStream inputStream = null;
        InputStreamReader inputStreamReader = null;
        BufferedReader bufferedReader = null;
        try {
            inputStream = resource.getInputStream();
            inputStreamReader = new InputStreamReader(inputStream, StandardCharsets.UTF_8);
            bufferedReader = new BufferedReader(inputStreamReader);
            String data = null;
            while ((data = bufferedReader.readLine()) != null) {
                str = (String)str + data;
            }
        }
        catch (IOException e) {
            log.error("getResourcesByStream IOException", (Throwable)e);
        }
        finally {
            try {
                if (inputStream != null) {
                    inputStream.close();
                }
                if (inputStreamReader != null) {
                    inputStreamReader.close();
                }
                if (bufferedReader != null) {
                    bufferedReader.close();
                }
            }
            catch (IOException e) {
                log.error("getResourcesByStream IOException", (Throwable)e);
            }
        }
        return str;
    }

    public static List<String> readFileNames(String dirPath, String suffix) {
        ArrayList fileNames = Lists.newArrayList();
        try {
            File file = new File(dirPath);
            if (file.isDirectory()) {
                File[] fileList;
                for (File curFile : fileList = file.listFiles()) {
                    if (!curFile.getName().endsWith(suffix)) continue;
                    fileNames.add(curFile.getName());
                }
                return fileNames;
            }
            return fileNames;
        }
        catch (Exception e) {
            log.error("Read file names from {} with suffix {} error.", (Object)dirPath, (Object)suffix);
            return fileNames;
        }
    }

    public static List<String> readFileToString(String path, String suffix) {
        ArrayList list = Lists.newArrayList();
        try {
            File[] tempList;
            File file = new File(path);
            if (file.isFile() && file.getName().endsWith(suffix)) {
                String s = FileUtils.readFileToString((File)file, (String)"utf-8");
                list.add(s);
            } else if (file.isDirectory() && (tempList = file.listFiles()) != null && tempList.length > 0) {
                for (int i = 0; i < tempList.length; ++i) {
                    if (!tempList[i].isFile() || !tempList[i].getName().endsWith(suffix)) continue;
                    String s = FileUtils.readFileToString((File)tempList[i], (String)"utf-8");
                    list.add(s);
                }
            }
        }
        catch (Exception e) {
            log.error("Read {} File with suffix {} error.", (Object)path, (Object)suffix);
        }
        return list;
    }

    public static List<String> getResourcesBySystemPath(String fileDir, String suffix) {
        if (StringUtils.isEmpty((CharSequence)fileDir)) {
            return null;
        }
        ArrayList<String> files = new ArrayList<String>();
        File file = new File(fileDir);
        if (file.isFile() && file.getName().endsWith(suffix)) {
            return ResourceUtil.readFile((File)file);
        }
        File[] tempList = file.listFiles();
        if (tempList != null && tempList.length > 0) {
            for (int i = 0; i < tempList.length; ++i) {
                if (!tempList[i].isFile() || !tempList[i].getName().endsWith(suffix)) continue;
                List strings = ResourceUtil.readFile((File)tempList[i]);
                files.addAll(strings);
            }
        }
        return files;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public static List<String> readFile(File file) {
        ArrayList files = Lists.newArrayList();
        FileSystemResource resource = new FileSystemResource(file);
        InputStream inputStream = null;
        InputStreamReader inputStreamReader = null;
        BufferedReader bufferedReader = null;
        try {
            inputStream = resource.getInputStream();
            inputStreamReader = new InputStreamReader(inputStream);
            bufferedReader = new BufferedReader(inputStreamReader);
            String data = null;
            while ((data = bufferedReader.readLine()) != null) {
                String str = data;
                if (!StringUtils.isNotEmpty((CharSequence)str)) continue;
                files.add(str);
            }
        }
        catch (Exception e) {
            log.error("readFile Exception", (Throwable)e);
        }
        finally {
            try {
                if (inputStream != null) {
                    inputStream.close();
                }
                if (inputStreamReader != null) {
                    inputStreamReader.close();
                }
                if (bufferedReader != null) {
                    bufferedReader.close();
                }
            }
            catch (IOException e) {
                log.error("readFile IOException", (Throwable)e);
            }
        }
        return files;
    }

    public static List<String> readPathFilesNames(String path, String suffix) {
        ArrayList list = Lists.newArrayList();
        try {
            File file = new File(path);
            if (file.isDirectory()) {
                list.addAll(Arrays.stream(file.listFiles(it -> it.isFile() && it.getName().endsWith(suffix))).map(File::getName).sorted().collect(Collectors.toList()));
            }
        }
        catch (Exception e) {
            log.error("Read {} File with suffix {} error.", (Object)path, (Object)suffix);
        }
        return list;
    }

    public static String readFileToString(String path) {
        try {
            File file = new File(path);
            if (file.isFile()) {
                return FileUtils.readFileToString((File)file, (String)"utf-8");
            }
        }
        catch (Exception e) {
            log.error("Read {} File with suffix {} error.", (Object)path);
        }
        return "";
    }
}

