/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.ZipUtils
 *  org.apache.commons.compress.archivers.zip.ParallelScatterZipCreator
 *  org.apache.commons.compress.archivers.zip.ZipArchiveEntry
 *  org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream
 *  org.apache.commons.compress.parallel.InputStreamSupplier
 *  org.apache.commons.io.input.NullInputStream
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.apache.commons.compress.archivers.zip.ParallelScatterZipCreator;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream;
import org.apache.commons.compress.parallel.InputStreamSupplier;
import org.apache.commons.io.input.NullInputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class ZipUtils {
    private static final Logger log = LoggerFactory.getLogger(ZipUtils.class);
    private static final int BUFFER_SIZE = 2048;

    public static void toZip(List<File> srcFiles, OutputStream out) throws RuntimeException {
        try (ZipOutputStream zos = new ZipOutputStream(out);){
            for (File srcFile : srcFiles) {
                byte[] buf = new byte[2048];
                zos.putNextEntry(new ZipEntry(srcFile.getName()));
                try (FileInputStream in = new FileInputStream(srcFile);){
                    int len;
                    while ((len = in.read(buf)) != -1) {
                        zos.write(buf, 0, len);
                    }
                    zos.closeEntry();
                }
            }
        }
        catch (Exception e) {
            log.error("zip error from ZipUtils", (Throwable)e);
        }
    }

    public static void taskDefWritetofile(File file, String task) {
        if (file == null) {
            log.error("Taskwritetofile file is null error", (Throwable)new Exception());
        }
        try (OutputStreamWriter fw = new OutputStreamWriter((OutputStream)new FileOutputStream(file), "UTF-8");
             BufferedWriter bw = new BufferedWriter(fw);){
            bw.write(task);
        }
        catch (Exception e) {
            log.error("Taskwritetofile error", (Throwable)e);
        }
    }

    public static void toZipWithFileStructure(String path, List<String> filesToZip, OutputStream outputStream) {
        try (ZipArchiveOutputStream zos = new ZipArchiveOutputStream(outputStream);){
            zos.setMethod(8);
            ParallelScatterZipCreator scatterZipCreator = new ParallelScatterZipCreator();
            for (String fileName : filesToZip) {
                File inFile = new File(path + fileName);
                InputStreamSupplier inputStreamSupplier = () -> {
                    try {
                        return new FileInputStream(inFile);
                    }
                    catch (FileNotFoundException e) {
                        log.error("Zip with File Exception", (Throwable)e);
                        return new NullInputStream(0L);
                    }
                };
                ZipArchiveEntry entry = new ZipArchiveEntry(fileName);
                entry.setMethod(8);
                scatterZipCreator.addArchiveEntry(entry, inputStreamSupplier);
            }
            scatterZipCreator.writeTo(zos);
        }
        catch (Exception e) {
            log.error("toZipWithFileStructure failed.", (Throwable)e);
        }
    }

    public static void toZipAll(List<File> srcFiles, OutputStream out) throws RuntimeException {
        HashSet addedEntries = new HashSet();
        try (ZipOutputStream zos = new ZipOutputStream(out);){
            for (File srcFile : srcFiles) {
                ZipUtils.compressFileOrDirectory((File)srcFile, (ZipOutputStream)zos, (String)"", addedEntries);
            }
        }
        catch (Exception e) {
            throw new RuntimeException("zip error from ZipUtils", e);
        }
    }

    private static void compressFileOrDirectory(File file, ZipOutputStream zos, String parentPath, Set<String> addedEntries) throws IOException {
        if (file.isDirectory()) {
            ZipUtils.compressDirectory((File)file, (ZipOutputStream)zos, (String)parentPath, addedEntries);
        } else {
            ZipUtils.compressFile((File)file, (ZipOutputStream)zos, (String)parentPath, addedEntries);
        }
    }

    private static void compressDirectory(File directory, ZipOutputStream zos, String parentPath, Set<String> addedEntries) throws IOException {
        String dirPath = parentPath + directory.getName() + "/";
        if (!addedEntries.contains(dirPath)) {
            zos.putNextEntry(new ZipEntry(dirPath));
            addedEntries.add(dirPath);
            File[] files = directory.listFiles();
            if (files != null) {
                for (File file : files) {
                    if (!file.getName().endsWith(".js")) continue;
                    ZipUtils.compressFileOrDirectory((File)file, (ZipOutputStream)zos, (String)dirPath, addedEntries);
                }
            }
        }
    }

    private static void compressFile(File file, ZipOutputStream zos, String parentPath, Set<String> addedEntries) throws IOException {
        String relativePath = parentPath + file.getName();
        if (!addedEntries.contains(relativePath)) {
            try (FileInputStream fis = new FileInputStream(file);){
                int len;
                zos.putNextEntry(new ZipEntry(relativePath));
                byte[] buffer = new byte[2048];
                while ((len = fis.read(buffer)) != -1) {
                    zos.write(buffer, 0, len);
                }
                zos.closeEntry();
                addedEntries.add(relativePath);
            }
        }
    }
}

