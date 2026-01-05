/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.afterturn.easypoi.excel.ExcelExportUtil
 *  cn.afterturn.easypoi.excel.ExcelImportUtil
 *  cn.afterturn.easypoi.excel.entity.ExportParams
 *  cn.afterturn.easypoi.excel.entity.ImportParams
 *  cn.afterturn.easypoi.excel.entity.enmus.ExcelType
 *  cn.afterturn.easypoi.excel.entity.params.ExcelExportEntity
 *  cn.afterturn.easypoi.handler.inter.IExcelExportServer
 *  com.seer.rds.util.ExcelUtil
 *  javax.servlet.http.HttpServletResponse
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.poi.hssf.usermodel.HSSFWorkbook
 *  org.apache.poi.ss.usermodel.Cell
 *  org.apache.poi.ss.usermodel.Row
 *  org.apache.poi.ss.usermodel.Sheet
 *  org.apache.poi.ss.usermodel.Workbook
 *  org.apache.poi.xssf.usermodel.XSSFWorkbook
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.web.multipart.MultipartFile
 */
package com.seer.rds.util;

import cn.afterturn.easypoi.excel.ExcelExportUtil;
import cn.afterturn.easypoi.excel.ExcelImportUtil;
import cn.afterturn.easypoi.excel.entity.ExportParams;
import cn.afterturn.easypoi.excel.entity.ImportParams;
import cn.afterturn.easypoi.excel.entity.enmus.ExcelType;
import cn.afterturn.easypoi.excel.entity.params.ExcelExportEntity;
import cn.afterturn.easypoi.handler.inter.IExcelExportServer;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.multipart.MultipartFile;

/*
 * Exception performing whole class analysis ignored.
 */
public class ExcelUtil {
    private static final Logger log = LoggerFactory.getLogger(ExcelUtil.class);
    public static final int pageSize = 1000;

    public static void exportExcel(List<?> list, String title, String sheetName, Class<?> pojoClass, String fileName, boolean isCreateHeader, HttpServletResponse response) throws Exception {
        ExportParams exportParams = new ExportParams(title, sheetName);
        exportParams.setCreateHeadRows(isCreateHeader);
        ExcelUtil.defaultExport(list, pojoClass, (String)fileName, (HttpServletResponse)response, (ExportParams)exportParams);
    }

    public static void exportExcel(List<?> list, String title, String sheetName, Class<?> pojoClass, String fileName, HttpServletResponse response) throws Exception {
        ExcelUtil.defaultExport(list, pojoClass, (String)fileName, (HttpServletResponse)response, (ExportParams)new ExportParams(title, sheetName));
    }

    public static void exportExcel(List<Map<String, Object>> list, String fileName, HttpServletResponse response) throws Exception {
        ExcelUtil.defaultExport(list, (String)fileName, (HttpServletResponse)response);
    }

    public static void exportBigExcel(List<?> list, String title, String sheetName, Class<?> pojoClass, String fileName, HttpServletResponse response) throws Exception {
        int totalPage = list.size() / 1000 + 1;
        ExcelUtil.bigExport(list, pojoClass, (String)fileName, (HttpServletResponse)response, (ExportParams)new ExportParams(title, sheetName), (int)totalPage);
    }

    public static void exportBigExcel(List<?> list, String title, String sheetName, List<ExcelExportEntity> excelExportEntityList, String fileName, HttpServletResponse response) throws Exception {
        int totalPage = list.size() / 1000 + 1;
        ExcelUtil.bigExport(list, excelExportEntityList, (String)fileName, (HttpServletResponse)response, (ExportParams)new ExportParams(title, sheetName), (int)totalPage);
    }

    private static void defaultExport(List<?> list, Class<?> pojoClass, String fileName, HttpServletResponse response, ExportParams exportParams) throws Exception {
        Workbook workbook = ExcelExportUtil.exportExcel((ExportParams)exportParams, pojoClass, list);
        if (workbook != null) {
            // empty if block
        }
        ExcelUtil.downLoadExcel((String)fileName, (HttpServletResponse)response, (Workbook)workbook);
    }

    private static void bigExport(List<?> list, Class<?> pojoClass, String fileName, HttpServletResponse response, ExportParams exportParams, int totalPage) throws Exception {
        Workbook workbook = ExcelExportUtil.exportBigExcel((ExportParams)exportParams, pojoClass, (IExcelExportServer)new /* Unavailable Anonymous Inner Class!! */, (Object)totalPage);
        if (workbook != null) {
            // empty if block
        }
        ExcelUtil.downLoadExcel((String)fileName, (HttpServletResponse)response, (Workbook)workbook);
    }

    private static void bigExport(List<?> list, List<ExcelExportEntity> excelExportEntityList, String fileName, HttpServletResponse response, ExportParams exportParams, int totalPage) throws Exception {
        Workbook workbook = ExcelExportUtil.exportBigExcel((ExportParams)exportParams, excelExportEntityList, (IExcelExportServer)new /* Unavailable Anonymous Inner Class!! */, (Object)totalPage);
        if (workbook != null) {
            // empty if block
        }
        ExcelUtil.downLoadExcel((String)fileName, (HttpServletResponse)response, (Workbook)workbook);
    }

    public static void exportMultipleSheets(List<Map<String, Object>> sheets, ExcelType type, String fileName, HttpServletResponse response) throws Exception {
        Workbook workbook = ExcelExportUtil.exportExcel(sheets, (ExcelType)type);
        if (workbook != null) {
            // empty if block
        }
        ExcelUtil.downLoadExcel((String)fileName, (HttpServletResponse)response, (Workbook)workbook);
    }

    private static void downLoadExcel(String fileName, HttpServletResponse response, Workbook workbook) throws Exception {
        try {
            response.setCharacterEncoding("UTF-8");
            response.setHeader("content-Type", "application/vnd.ms-excel");
            response.setHeader("Content-Disposition", "attachment;filename=" + URLEncoder.encode(fileName, "UTF-8"));
            workbook.write((OutputStream)response.getOutputStream());
        }
        catch (IOException e) {
            throw new Exception(e.getMessage());
        }
    }

    private static void defaultExport(List<Map<String, Object>> list, String fileName, HttpServletResponse response) throws Exception {
        Workbook workbook = ExcelExportUtil.exportExcel(list, (ExcelType)ExcelType.HSSF);
        if (workbook != null) {
            // empty if block
        }
        ExcelUtil.downLoadExcel((String)fileName, (HttpServletResponse)response, (Workbook)workbook);
    }

    public static <T> List<T> importExcel(String filePath, Integer titleRows, Integer headerRows, Class<T> pojoClass) throws Exception {
        if (StringUtils.isBlank((CharSequence)filePath)) {
            return null;
        }
        ImportParams params = new ImportParams();
        params.setTitleRows(titleRows.intValue());
        params.setHeadRows(headerRows.intValue());
        List list = null;
        try {
            list = ExcelImportUtil.importExcel((File)new File(filePath), pojoClass, (ImportParams)params);
        }
        catch (NoSuchElementException e) {
            throw new Exception("\u6a21\u677f\u4e0d\u80fd\u4e3a\u7a7a");
        }
        catch (Exception e) {
            log.error("ImportExcel Exception", (Throwable)e);
            throw new Exception(e.getMessage());
        }
        return list;
    }

    public static <T> List<T> importExcel(MultipartFile file, Integer titleRows, Integer headerRows, Class<T> pojoClass) throws Exception {
        if (file == null) {
            return null;
        }
        ImportParams params = new ImportParams();
        params.setTitleRows(titleRows.intValue());
        params.setHeadRows(headerRows.intValue());
        List list = null;
        try {
            list = ExcelImportUtil.importExcel((InputStream)file.getInputStream(), pojoClass, (ImportParams)params);
        }
        catch (NoSuchElementException e) {
            throw new Exception("excel\u6587\u4ef6\u4e0d\u80fd\u4e3a\u7a7a");
        }
        catch (Exception e) {
            throw new Exception(e.getMessage());
        }
        return list;
    }

    public static void exportByMap(ExportParams entity, List<ExcelExportEntity> entityList, Collection<?> dataSet, String fileName, HttpServletResponse response) throws Exception {
        Workbook workbook = ExcelExportUtil.exportExcel((ExportParams)entity, entityList, dataSet);
        ExcelUtil.downLoadExcel((String)fileName, (HttpServletResponse)response, (Workbook)workbook);
    }

    public static void exportXlsx(HttpServletResponse response, String fileName, Map<String, String> headMap, List<Map<String, Object>> dataList) throws Exception {
        Workbook workbook = ExcelUtil.writeWorkbook((Workbook)new XSSFWorkbook(), (String)fileName, headMap, dataList);
        ExcelUtil.downLoadExcel((String)(fileName + ".xls"), (HttpServletResponse)response, (Workbook)workbook);
    }

    public static void exportBigXlsx(HttpServletResponse response, String fileName, Map<String, String> headMap, List<Map<String, Object>> dataList) throws Exception {
        Workbook workbook = ExcelUtil.writeWorkbook((Workbook)new HSSFWorkbook(), (String)fileName, headMap, dataList);
        ExcelUtil.downLoadExcel((String)(fileName + ".xls"), (HttpServletResponse)response, (Workbook)workbook);
    }

    private static Workbook writeWorkbook(Workbook workbook, String sheetName, Map<String, String> headNameMap, List<Map<String, Object>> dataList) {
        Sheet sheet = workbook.createSheet(sheetName);
        Set<String> keys = headNameMap.keySet();
        int i = 0;
        int j = 0;
        Row row = sheet.createRow(i++);
        for (String string : keys) {
            Cell cell = row.createCell(j++);
            cell.setCellValue(headNameMap.get(string));
        }
        if (dataList != null && !dataList.isEmpty()) {
            for (Map map : dataList) {
                row = sheet.createRow(i++);
                j = 0;
                for (String key : keys) {
                    Cell cell = row.createCell(j++);
                    ExcelUtil.setCellValue((Cell)cell, map.get(key));
                }
            }
        }
        return workbook;
    }

    private static void setCellValue(Cell cell, Object obj) {
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        if (obj == null) {
            return;
        }
        if (obj instanceof String) {
            cell.setCellValue((String)obj);
        } else if (obj instanceof Date) {
            Date date = (Date)obj;
            if (date != null) {
                cell.setCellValue(dateFormat.format(date));
            }
        } else if (obj instanceof Calendar) {
            Calendar calendar = (Calendar)obj;
            if (calendar != null) {
                cell.setCellValue(dateFormat.format(calendar.getTime()));
            }
        } else if (obj instanceof Timestamp) {
            Timestamp timestamp = (Timestamp)obj;
            if (timestamp != null) {
                cell.setCellValue(dateFormat.format(new Date(timestamp.getTime())));
            }
        } else if (obj instanceof Double) {
            cell.setCellValue(((Double)obj).doubleValue());
        } else if (obj instanceof Integer) {
            cell.setCellValue((double)((Integer)obj).intValue());
        } else {
            cell.setCellValue(obj.toString());
        }
    }
}

