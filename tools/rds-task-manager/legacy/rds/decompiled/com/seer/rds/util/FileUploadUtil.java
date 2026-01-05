/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.FileUploadUtil
 *  org.apache.commons.io.FileUtils
 *  org.apache.commons.io.FilenameUtils
 *  org.springframework.web.multipart.MultipartFile
 */
package com.seer.rds.util;

import java.io.File;
import java.util.Collection;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.FilenameUtils;
import org.springframework.web.multipart.MultipartFile;

public class FileUploadUtil {
    public static boolean checkUploadType(MultipartFile file, String expectSuffix, String MIMEType) {
        boolean suffixOk = false;
        boolean mimeTypeOk = false;
        String fileName = file.getOriginalFilename();
        if ("".equals(fileName)) {
            return false;
        }
        String suffix = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
        String type = file.getContentType();
        String[] expectSuffixes = expectSuffix.split(",");
        String[] mimeTypes = MIMEType.split(",");
        for (String s : expectSuffixes) {
            if (!s.equals(suffix)) continue;
            suffixOk = true;
            break;
        }
        for (String mimeType : mimeTypes) {
            if (!mimeType.equals(type)) continue;
            mimeTypeOk = true;
            break;
        }
        return suffixOk && mimeTypeOk;
    }

    public static String getFileNameByPrefix(String folderPath, String prefix) {
        File parentFile = new File(folderPath);
        if (!parentFile.exists()) {
            return null;
        }
        Collection files = FileUtils.listFiles((File)parentFile, null, (boolean)false);
        for (File file : files) {
            if (!FilenameUtils.getBaseName((String)file.getName()).startsWith(prefix)) continue;
            return file.getName();
        }
        return null;
    }
}

