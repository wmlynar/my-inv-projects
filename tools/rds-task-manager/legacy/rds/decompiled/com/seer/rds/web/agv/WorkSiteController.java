/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.afterturn.easypoi.excel.entity.ExportParams
 *  com.alibaba.fastjson.JSON
 *  com.fasterxml.jackson.annotation.JsonInclude
 *  com.fasterxml.jackson.annotation.JsonInclude$Include
 *  com.google.common.collect.Maps
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.SiteOperationEnum
 *  com.seer.rds.constant.SiteStatusEnum
 *  com.seer.rds.model.worksite.WorkSite
 *  com.seer.rds.model.worksite.WorkSiteAttr
 *  com.seer.rds.service.admin.WorkSiteLogService
 *  com.seer.rds.service.agv.WorkSiteService
 *  com.seer.rds.util.ExcelUtil
 *  com.seer.rds.util.FileUploadUtil
 *  com.seer.rds.util.WokSiteLogUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.WindTaskRecordIdVo
 *  com.seer.rds.vo.WorkSiteHqlCondition
 *  com.seer.rds.vo.WorkSiteReqAndRespVo
 *  com.seer.rds.vo.WorkSiteUpdateReq
 *  com.seer.rds.vo.req.AttrFieldsDeleteReq
 *  com.seer.rds.vo.req.BatchOperateWorkSiteReq
 *  com.seer.rds.vo.req.FindSitesConditionReq
 *  com.seer.rds.vo.req.FindSitesReq
 *  com.seer.rds.vo.req.LockedSitesReq
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.req.UpdateSiteFilledStatusReq
 *  com.seer.rds.vo.req.WorkSiteDeleteReq
 *  com.seer.rds.vo.req.WorkSiteHolderReq
 *  com.seer.rds.vo.req.WorkSiteLogReq
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.web.agv.WorkSiteController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.servlet.http.HttpServletRequest
 *  javax.servlet.http.HttpServletResponse
 *  javax.validation.Valid
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.data.domain.Page
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.RequestParam
 *  org.springframework.web.bind.annotation.ResponseBody
 *  org.springframework.web.multipart.MultipartFile
 *  springfox.documentation.annotations.ApiIgnore
 */
package com.seer.rds.web.agv;

import cn.afterturn.easypoi.excel.entity.ExportParams;
import com.alibaba.fastjson.JSON;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.google.common.collect.Maps;
import com.seer.rds.annotation.SysLog;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.SiteOperationEnum;
import com.seer.rds.constant.SiteStatusEnum;
import com.seer.rds.model.worksite.WorkSite;
import com.seer.rds.model.worksite.WorkSiteAttr;
import com.seer.rds.service.admin.WorkSiteLogService;
import com.seer.rds.service.agv.WorkSiteService;
import com.seer.rds.util.ExcelUtil;
import com.seer.rds.util.FileUploadUtil;
import com.seer.rds.util.WokSiteLogUtil;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.WindTaskRecordIdVo;
import com.seer.rds.vo.WorkSiteHqlCondition;
import com.seer.rds.vo.WorkSiteReqAndRespVo;
import com.seer.rds.vo.WorkSiteUpdateReq;
import com.seer.rds.vo.req.AttrFieldsDeleteReq;
import com.seer.rds.vo.req.BatchOperateWorkSiteReq;
import com.seer.rds.vo.req.FindSitesConditionReq;
import com.seer.rds.vo.req.FindSitesReq;
import com.seer.rds.vo.req.LockedSitesReq;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.req.UpdateSiteFilledStatusReq;
import com.seer.rds.vo.req.WorkSiteDeleteReq;
import com.seer.rds.vo.req.WorkSiteHolderReq;
import com.seer.rds.vo.req.WorkSiteLogReq;
import com.seer.rds.vo.response.PaginationResponseVo;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.File;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.validation.Valid;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;
import springfox.documentation.annotations.ApiIgnore;

@Controller
@RequestMapping(value={"api"})
@Api(tags={"\u5e93\u4f4d\u7ba1\u7406"})
public class WorkSiteController {
    private static final Logger log = LoggerFactory.getLogger(WorkSiteController.class);
    @Autowired
    private WorkSiteService workSiteService;
    @Autowired
    private WorkSiteLogService workSiteLogService;
    @Autowired
    private PropConfig propConfig;

    @SysLog(operation="export", message="exportWorkSite")
    @ApiOperation(value="\u5bfc\u51fa\u5e93\u4f4d")
    @GetMapping(value={"/work-sites/export"})
    @ResponseBody
    public void export(@ApiIgnore HttpServletResponse response) throws Exception {
        List logicSiteList = this.workSiteService.findAllLogicSites();
        List extFieldList = this.workSiteService.findAllExtFields();
        List extFieldData = this.workSiteService.findAllExtFieldData();
        List excelExportEntityList = this.workSiteService.getExcelExportEntityList(extFieldList);
        if (logicSiteList.size() == 0) {
            ExcelUtil.exportByMap((ExportParams)new ExportParams("worksite", "worksite"), (List)excelExportEntityList, new ArrayList(), (String)"worksite.xls", (HttpServletResponse)response);
        } else {
            List resultDataList = this.workSiteService.getAssembledDataList(logicSiteList, extFieldList, extFieldData);
            ExcelUtil.exportByMap((ExportParams)new ExportParams("worksite", "worksite"), (List)excelExportEntityList, (Collection)resultDataList, (String)"worksite.xls", (HttpServletResponse)response);
        }
    }

    @SysLog(operation="import", message="importWorkSite")
    @ApiOperation(value="\u5bfc\u5165\u5e93\u4f4d")
    @PostMapping(value={"/work-sites/import"})
    @ResponseBody
    public ResultVo importWorkSite(@RequestParam(value="file") MultipartFile file, @ApiIgnore HttpServletResponse response) throws Exception {
        boolean typeMatch = FileUploadUtil.checkUploadType((MultipartFile)file, (String)"xls", (String)"application/vnd.ms-excel");
        if (!typeMatch) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.UPLOAD_FILE_TYPE_ERROR);
        }
        String fileName = file.getOriginalFilename();
        String filePath = this.propConfig.getRdsStaticDir() + fileName;
        File dest = new File(filePath);
        file.transferTo(dest);
        List sites = ExcelUtil.importExcel((String)filePath, (Integer)1, (Integer)1, Map.class);
        if (CollectionUtils.isNotEmpty((Collection)sites)) {
            try {
                this.workSiteService.importSite(sites);
            }
            catch (RuntimeException e) {
                dest.delete();
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.LANGUAGE_MIS_MATCH);
            }
        }
        dest.delete();
        return ResultVo.success();
    }

    @ApiOperation(value="\u67e5\u8be2\u5e93\u4f4d\u5217\u8868\u548c\u5bf9\u5916\u63a5\u53e3\u4f7f\u7528\uff08\u4e0d\u5206\u9875\uff09")
    @PostMapping(value={"/work-sites/sites"})
    @ResponseBody
    public ResultVo getWorkSiteList(@RequestBody(required=false) FindSitesReq req, @ApiIgnore HttpServletResponse response) {
        if (req == null) {
            return ResultVo.response((Object)this.workSiteService.findAllOrderBy("asc", "type"));
        }
        String siteId = req.getSiteId();
        String siteName = req.getSiteName();
        String area = req.getArea();
        Integer locked = req.getLocked();
        String lockedBy = req.getLockedBy();
        Integer filled = req.getFilled();
        Integer disabled = req.getDisabled();
        Integer syncFailed = req.getSyncFailed();
        String content = req.getContent();
        Integer type = req.getType();
        String groupName = req.getGroupName();
        if (filled != null && filled != 1 && filled != 0 || locked != null && locked != 1 && locked != 0) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.REQUIRED_0OR1ORNULL_ERROR);
        }
        List siteList = this.workSiteService.findByConditionForExternalInterfaces(siteId, siteName, area, locked, lockedBy, filled, disabled, syncFailed, content, type, groupName, "asc", "type");
        if (req.getWithExtFields() == null || !req.getWithExtFields().booleanValue()) {
            return ResultVo.response((Object)siteList);
        }
        List extFieldList = this.workSiteService.findAllExtFields();
        List extFieldData = this.workSiteService.findAllExtFieldData();
        List basicResultList = this.workSiteService.getBasicResultList(extFieldList, siteList);
        HashMap attrListMap = this.workSiteService.getAttrListMap(extFieldList, extFieldData);
        HashMap completeAttrListMap = this.workSiteService.getCompleteAttrListJson(attrListMap, extFieldList);
        List resultList = this.workSiteService.replaceAttrListField(basicResultList, completeAttrListMap);
        return ResultVo.response((Object)resultList);
    }

    @ApiOperation(value="\u5e93\u4f4d\u5217\u8868\u7cbe\u7b80\u63a5\u53e3\uff0c\u4f9b\u8fd0\u884c\u76d1\u63a7\u5730\u56fe")
    @PostMapping(value={"/work-sites/monitorSites"})
    @ResponseBody
    @JsonInclude(value=JsonInclude.Include.NON_NULL)
    public String getMonitorSiteList() {
        List siteList = this.workSiteService.findMonitorSiteList();
        return JSON.toJSONString((Object)ResultVo.response((Object)siteList));
    }

    @ApiOperation(value="\u5bf9\u5916\u63a5\u53e3\u4f7f\u7528\uff08\u5e26\u5206\u9875\uff09")
    @PostMapping(value={"/work-sites/sitesPageAble"})
    @ResponseBody
    public ResultVo getWorkSiteListPagination(@RequestBody @Valid PaginationReq<FindSitesReq> request, @ApiIgnore HttpServletResponse response) {
        return this.getSiteList(request, false);
    }

    @ApiOperation(value="\u624b\u6301\u7aef\uff0c\u4e0b\u62c9\u5217\u8868\uff0c\u5e93\u4f4d\u5c55\u793a")
    @PostMapping(value={"/work-sites/findByCondition"})
    @ResponseBody
    public ResultVo findByCondition(@RequestBody FindSitesConditionReq params) throws Exception {
        List extFieldList = this.workSiteService.findAllExtFields();
        List extFieldData = this.workSiteService.findAllExtFieldData();
        List siteList = this.workSiteService.findWorkSiteListByCondition(params.getGroupNames(), params.getSiteIds());
        List basicResultList = this.workSiteService.getBasicResultList(extFieldList, siteList);
        HashMap attrListMap = this.workSiteService.getAttrListMap(extFieldList, extFieldData);
        HashMap completeAttrListMap = this.workSiteService.getCompleteAttrListJson(attrListMap, extFieldList);
        List resultList = this.workSiteService.replaceAttrListField(basicResultList, completeAttrListMap);
        return ResultVo.response((Object)resultList);
    }

    @ApiOperation(value="\u67e5\u8be2\u5e93\u4f4d\u5217\u8868")
    @PostMapping(value={"/work-sites/findSitesByCondition"})
    @ResponseBody
    public ResultVo<Object> findSitesByCondition(@RequestBody WorkSiteHqlCondition params) throws Exception {
        List extFieldList = this.workSiteService.findAllExtFields();
        List extFieldData = this.workSiteService.findAllExtFieldData();
        List siteList = this.workSiteService.findSitesByCondition(params);
        List basicResultList = this.workSiteService.getBasicResultList(extFieldList, siteList);
        HashMap attrListMap = this.workSiteService.getAttrListMap(extFieldList, extFieldData);
        HashMap completeAttrListMap = this.workSiteService.getCompleteAttrListJson(attrListMap, extFieldList);
        List resultList = this.workSiteService.replaceAttrListField(basicResultList, completeAttrListMap);
        return ResultVo.response((Object)resultList);
    }

    @ApiOperation(value="\u83b7\u53d6\u6240\u6709\u6269\u5c55\u5b57\u6bb5")
    @PostMapping(value={"/work-sites/getAllExtFields"})
    @ResponseBody
    public ResultVo<Object> getAllExtFields(@ApiIgnore HttpServletResponse response) {
        List extFieldList = this.workSiteService.findAllExtFields();
        return ResultVo.response((Object)extFieldList);
    }

    @ApiOperation(value="\u66f4\u65b0\u5e93\u4f4d")
    @PostMapping(value={"/work-sites/updateSitesByCondition"})
    @ResponseBody
    public ResultVo<Object> updateSitesByCondition(@RequestBody WorkSiteUpdateReq req) throws Exception {
        int num = this.workSiteService.updateSitesByCondition(req.getConditions(), req.getValues());
        return ResultVo.response((Object)num);
    }

    @ApiOperation(value="\u9501\u5b9a\u5e93\u4f4d")
    @PostMapping(value={"/work-sites/lockedSites"})
    @ResponseBody
    public ResultVo lockedSites(@RequestBody LockedSitesReq req, @ApiIgnore HttpServletRequest request) {
        List siteIdList = req.getSiteIdList();
        String lockedBy = req.getLockedBy();
        List lockedSiteIds = this.workSiteService.findAllLockedSiteIds();
        siteIdList.removeAll(lockedSiteIds);
        this.workSiteService.lockedSitesBySiteIds(siteIdList, lockedBy);
        log.info("lock site list: {}, lockedBy: {}", (Object)siteIdList, (Object)lockedBy);
        WokSiteLogUtil.saveLog((HttpServletRequest)request, (List)siteIdList, (int)SiteOperationEnum.LOCK.getStatus(), (String)"Page WorkSite, Button Lock.");
        return ResultVo.success();
    }

    @ApiOperation(value="\u89e3\u9501\u5e93\u4f4d")
    @PostMapping(value={"/work-sites/unLockedSites"})
    @ResponseBody
    public ResultVo unLockedSitesByIds(@RequestBody List<String> siteIdList, @ApiIgnore HttpServletRequest request) {
        List unLockedSiteIds = this.workSiteService.findAllUnLockedSiteIds();
        siteIdList.removeAll(unLockedSiteIds);
        this.workSiteService.unLockedSitesBySiteIds(siteIdList);
        log.info("Unlock site list:{}", JSON.toJSON(siteIdList));
        WokSiteLogUtil.saveLog((HttpServletRequest)request, siteIdList, (int)SiteOperationEnum.UNLOCK.getStatus(), (String)"Page WorkSite, Button Unlock.");
        return ResultVo.success();
    }

    @ApiOperation(value="\u6839\u636e\u4efb\u52a1\u5b9e\u4f8bId\uff0c\u89e3\u9501\u88ab\u8be5\u4efb\u52a1\u9501\u5b9a\u7684\u5e93\u4f4d")
    @PostMapping(value={"/work-sites/unLockedSitesByTaskRecordId"})
    @ResponseBody
    public ResultVo<Object> unLockedSitesByTaskRecordId(@RequestBody WindTaskRecordIdVo req, @ApiIgnore HttpServletRequest request) {
        List siteIds = this.workSiteService.findSiteIdsByLockedBy(req.getTaskRecordId());
        this.workSiteService.unlockSiteBySiteIdIn(siteIds);
        WokSiteLogUtil.saveLog((HttpServletRequest)request, (List)siteIds, (int)SiteOperationEnum.UNLOCK.getStatus(), (String)"Page Task Records, Button Unlock Site.");
        return ResultVo.success();
    }

    @ApiOperation(value="\u4fee\u6539\u5355\u4e2a\u5e93\u4f4d\u7a7a\u6ee1\u72b6\u6001")
    @PostMapping(value={"/work-sites/updateFilledStatus"})
    @ResponseBody
    public ResultVo<Object> updateFilledStatus(@RequestBody UpdateSiteFilledStatusReq req) throws Exception {
        Integer filled = req.getFilled();
        String siteId = req.getSiteId();
        log.info("updateFilledStatus, filled = {}, siteId = {}", (Object)filled, (Object)siteId);
        if (null == filled || null == siteId) {
            return ResultVo.error((String)"Illegal request parameters");
        }
        if (filled != 1 && filled != 0) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.REQUIRED_0OR1_ERROR);
        }
        WorkSite site = this.workSiteService.findBySiteId(siteId);
        if (null == site) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SITE_ID_NOT_EXIST_ERROR);
        }
        int num = this.workSiteService.updateFilledStatus(filled.intValue(), siteId);
        return ResultVo.success();
    }

    @ApiOperation(value="\u65b0\u589e/\u4fee\u6539\u5e93\u4f4d")
    @PostMapping(value={"/work-sites/saveOrUpdateWorkSite"})
    @ResponseBody
    public ResultVo<Object> saveOrUpdateWorkSite(@RequestBody WorkSiteReqAndRespVo req, @ApiIgnore HttpServletRequest request) {
        WorkSite workSite = this.workSiteService.findBySiteId(req.getSiteId());
        if (workSite != null && !workSite.getId().equals(req.getId())) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SITE_ID_ALREADY_EXIST_ERROR);
        }
        ArrayList<String> siteIdList = new ArrayList<String>(1);
        siteIdList.add(req.getSiteId());
        if (workSite == null) {
            if (req.getLocked() == 1) {
                WokSiteLogUtil.saveLog((HttpServletRequest)request, siteIdList, (int)SiteOperationEnum.LOCK.getStatus(), (String)"Page WorkSite, Button Add.");
            }
        } else if (req.getLocked() != workSite.getLocked()) {
            if (req.getLocked() == 1) {
                WokSiteLogUtil.saveLog((HttpServletRequest)request, siteIdList, (int)SiteOperationEnum.LOCK.getStatus(), (String)"Page WorkSite, Button Edit.");
            } else {
                WokSiteLogUtil.saveLog((HttpServletRequest)request, siteIdList, (int)SiteOperationEnum.UNLOCK.getStatus(), (String)"Page WorkSite, Button Edit.");
            }
        }
        this.workSiteService.saveOrUpdateWorkSite(req);
        return ResultVo.success();
    }

    @ApiOperation(value="\u65b0\u589e/\u4fee\u6539\u6269\u5c55\u5b57\u6bb5")
    @PostMapping(value={"/work-sites/saveOrUpdateExtField"})
    @ResponseBody
    public ResultVo<Object> saveOrUpdateExtField(@RequestBody WorkSiteAttr workSiteAttr) {
        this.workSiteService.saveOrUpdateExtField(workSiteAttr);
        return ResultVo.success();
    }

    @ApiOperation(value="\u5220\u9664\u6269\u5c55\u5b57\u6bb5")
    @PostMapping(value={"/work-sites/deleteExtField"})
    @ResponseBody
    public ResultVo<Object> deleteExtField(@RequestBody AttrFieldsDeleteReq req) throws Exception {
        String attrName = req.getAttributeName();
        String attrId = this.workSiteService.findExtAttrIdByAttrName(attrName);
        this.workSiteService.deleteExtField(attrName, attrId);
        return ResultVo.success();
    }

    @ApiOperation(value="\u5220\u9664\u5e93\u4f4d")
    @PostMapping(value={"/work-sites/deleteWorkSite"})
    @ResponseBody
    public ResultVo<Object> deleteWorkSite(@RequestBody WorkSiteDeleteReq req) throws Exception {
        this.workSiteService.deleteBySiteId(req.getSiteId());
        return ResultVo.success();
    }

    @ApiOperation(value="\u6761\u4ef6\u67e5\u8be2\u5e93\u4f4d\u64cd\u4f5c\u8bb0\u5f55(\u5206\u9875\u67e5\u8be2)")
    @PostMapping(value={"/work-sites/findSiteLogByCondition"})
    @ResponseBody
    public ResultVo<Object> findSiteLogByCondition(@RequestBody PaginationReq<WorkSiteLogReq> req) throws Exception {
        WorkSiteLogReq queryParam = (WorkSiteLogReq)req.getQueryParam();
        PaginationResponseVo paginationResponseVo = this.workSiteLogService.findSiteLog(req.getCurrentPage(), req.getPageSize(), queryParam);
        return ResultVo.response((Object)paginationResponseVo);
    }

    @ApiOperation(value="\u8bbe\u7f6e\u5e93\u4f4d\u4e3acore\u5360\u7528")
    @PostMapping(value={"/work-sites/holdWorksiteByCore"})
    @ResponseBody
    public ResultVo<Object> holdWorksiteByCore(@RequestBody WorkSiteHolderReq req) {
        WorkSite site = this.workSiteService.findBySiteId(req.getSiteId());
        if (site == null) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SITE_ID_NOT_EXIST_ERROR);
        }
        this.workSiteService.changeSiteHolder(req.getSiteId(), SiteStatusEnum.holdByCore);
        return ResultVo.success();
    }

    @ApiOperation(value="\u8bbe\u7f6e\u5e93\u4f4d\u4e3ards\u5360\u7528")
    @PostMapping(value={"/work-sites/releaseWorksiteHolder"})
    @ResponseBody
    public ResultVo<Object> releaseWorksiteHolder(@RequestBody WorkSiteHolderReq req) {
        WorkSite site = this.workSiteService.findBySiteId(req.getSiteId());
        if (site == null) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.SITE_ID_NOT_EXIST_ERROR);
        }
        this.workSiteService.changeSiteHolder(req.getSiteId(), SiteStatusEnum.holdByRds);
        return ResultVo.success();
    }

    @ApiOperation(value="\u542f\u7528\u5e93\u4f4d")
    @PostMapping(value={"/work-sites/enableWorksite"})
    @ResponseBody
    public ResultVo<Object> enableWorksite(@RequestBody BatchOperateWorkSiteReq req) {
        this.workSiteService.enableWorksiteByIds(req.getWorkSiteIds());
        return ResultVo.success();
    }

    @ApiOperation(value="\u7981\u7528\u5e93\u4f4d")
    @PostMapping(value={"/work-sites/disableWorksite"})
    @ResponseBody
    public ResultVo<Object> disableWorksite(@RequestBody BatchOperateWorkSiteReq req) {
        this.workSiteService.disableWorksiteByIds(req.getWorkSiteIds());
        return ResultVo.success();
    }

    @ApiOperation(value="\u6e05\u9664\u5e93\u4f4d\u540c\u6b65\u5931\u8d25")
    @PostMapping(value={"/work-sites/clearSyncFailed"})
    @ResponseBody
    public ResultVo<Object> clearSyncFailed(@RequestBody BatchOperateWorkSiteReq req) {
        this.workSiteService.clearSyncFailedByIds(req.getWorkSiteIds());
        return ResultVo.success();
    }

    @ApiOperation(value="\u8bbe\u7f6e\u5e93\u4f4d\u4e3a\u5360\u7528")
    @PostMapping(value={"/work-sites/worksiteFiled", "/work-sites/worksiteFilled"})
    @ResponseBody
    public ResultVo<Object> worksiteFiled(@RequestBody BatchOperateWorkSiteReq req) {
        List workSiteIds = req.getWorkSiteIds();
        log.info("filled sites: {}", (Object)workSiteIds);
        this.workSiteService.changeWorksiteFiledByIds(workSiteIds);
        return ResultVo.success();
    }

    @ApiOperation(value="\u8bbe\u7f6e\u5e93\u4f4d\u4e3a\u672a\u5360\u7528")
    @PostMapping(value={"/work-sites/worksiteUnFiled", "/work-sites/worksiteUnFilled"})
    @ResponseBody
    public ResultVo<Object> worksiteUnFiled(@RequestBody BatchOperateWorkSiteReq req) {
        List workSiteIds = req.getWorkSiteIds();
        log.info("unFilled sites: {}", (Object)workSiteIds);
        this.workSiteService.changeWorksiteUnFiledByIds(workSiteIds);
        return ResultVo.success();
    }

    @ApiOperation(value="\u8bbe\u7f6e\u5e93\u4f4d\u8d27\u7269")
    @PostMapping(value={"/work-sites/setWorksiteContent"})
    @ResponseBody
    public ResultVo<Object> setWorksiteContent(@RequestBody BatchOperateWorkSiteReq req) {
        this.workSiteService.setWorksiteContentByIds(req.getWorkSiteIds(), req.getContent());
        this.workSiteService.changeWorksiteFiledByIds(req.getWorkSiteIds());
        return ResultVo.success();
    }

    @ApiOperation(value="\u8bbe\u7f6e\u5e93\u4f4d\u6807\u7b7e")
    @PostMapping(value={"/work-sites/setWorksiteLabel"})
    @ResponseBody
    public ResultVo<Object> setWorksiteLabel(@RequestBody BatchOperateWorkSiteReq req) {
        this.workSiteService.setWorksiteLabelByIds(req.getWorkSiteIds(), req.getLabel());
        return ResultVo.success();
    }

    @ApiOperation(value="\u8bbe\u7f6e\u5e93\u4f4d\u7f16\u53f7")
    @PostMapping(value={"/work-sites/setWorksiteNumber"})
    @ResponseBody
    public ResultVo<Object> setWorksiteNumber(@RequestBody BatchOperateWorkSiteReq req) {
        this.workSiteService.setWorksiteNumberByIds(req.getWorkSiteIds(), req.getNumber());
        return ResultVo.success();
    }

    @ApiOperation(value="\u8bbe\u7f6e\u5e93\u4f4d\u540d\u79f0")
    @PostMapping(value={"/work-sites/setWorksiteName"})
    @ResponseBody
    public ResultVo<Object> setWorksiteName(@RequestBody BatchOperateWorkSiteReq req) {
        this.workSiteService.setWorksiteNameByIds(req.getWorkSiteIds(), req.getWorkSiteName());
        return ResultVo.success();
    }

    @ApiOperation(value="\u5355\u8f66app\u83b7\u53d6\u5e93\u4f4d")
    @GetMapping(value={"/work-sites/getAllSiteIds"})
    @ResponseBody
    public ResultVo<Object> getAllSiteIds() {
        List sites = this.workSiteService.findAllOrderBy("asc", "type");
        HashMap hashMap = Maps.newHashMap();
        for (WorkSite site : sites) {
            String key;
            String string = key = StringUtils.isEmpty((CharSequence)site.getGroupName()) ? "rdsWorkSite" : site.getGroupName();
            if (hashMap.containsKey(key)) {
                ((List)hashMap.get(key)).add(site.getSiteId());
                continue;
            }
            ArrayList<String> tmp = new ArrayList<String>();
            tmp.add(site.getSiteId());
            hashMap.put(key, tmp);
        }
        return ResultVo.response((Object)hashMap);
    }

    @ApiOperation(value="\u83b7\u53d6\u533a\u57df\u4e0e\u5e93\u533a\u5217\u8868\uff0ckey\u4e3a\u533a\u57df\u540d\uff0cvalue\u4e3a\u5e93\u533a\u540d\u5217\u8868")
    @GetMapping(value={"/work-sites/getAllSiteAreaAndGroup"})
    @ResponseBody
    public ResultVo<Object> getAllSiteAreaAndGroup() {
        Map allSiteAreaAndGroup = this.workSiteService.findAllSiteAreaAndGroup();
        return ResultVo.response((Object)allSiteAreaAndGroup);
    }

    @ApiOperation(value="\u83b7\u53d6\u5e93\u533a\u540d\u5217\u8868")
    @GetMapping(value={"/work-sites/getAllWorkSiteGroups"})
    @ResponseBody
    public ResultVo<Object> getAllWorkSiteGroups() {
        List workSiteGroups = this.workSiteService.findWorkSiteGroups();
        if (CollectionUtils.isNotEmpty((Collection)workSiteGroups)) {
            return ResultVo.response((Object)workSiteGroups);
        }
        return ResultVo.success();
    }

    @ApiOperation(value="\u67e5\u8be2\u5e93\u4f4d\u5217\u8868\u9875\u9762(\u5185\u90e8)")
    @PostMapping(value={"/work-sites/siteList"})
    @ResponseBody
    public ResultVo getSiteList(@RequestBody @Valid PaginationReq<FindSitesReq> request, @ApiIgnore HttpServletResponse response) {
        return this.getSiteList(request, true);
    }

    private ResultVo getSiteList(PaginationReq<FindSitesReq> request, boolean needShiro) {
        int currPage = request.getCurrentPage();
        int pageSize = request.getPageSize();
        if (pageSize > 500 || pageSize < 1) {
            throw new RuntimeException("The pageSize field takes values in the range of 1-500.");
        }
        FindSitesReq req = (FindSitesReq)request.getQueryParam();
        String siteId = req.getSiteId();
        String siteName = req.getSiteName();
        String area = req.getArea();
        Integer locked = req.getLocked();
        String lockedBy = req.getLockedBy();
        Integer filled = req.getFilled();
        Integer disabled = req.getDisabled();
        Integer syncFailed = req.getSyncFailed();
        String content = req.getContent();
        Integer type = req.getType();
        String groupName = req.getGroupName();
        String tags = req.getTags();
        if (filled != null && filled != 1 && filled != 0 || locked != null && locked != 1 && locked != 0) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.REQUIRED_0OR1ORNULL_ERROR);
        }
        Page pageList = this.workSiteService.findByConditionForExternalInterfacesPaging(siteId, siteName, area, locked, lockedBy, filled, disabled, syncFailed, content, type, groupName, tags, currPage, pageSize, "asc", "type", needShiro);
        List siteList = pageList.getContent();
        if (req.getWithExtFields() == null || !req.getWithExtFields().booleanValue()) {
            PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
            paginationResponseVo.setTotalCount(Long.valueOf(pageList.getTotalElements()));
            paginationResponseVo.setCurrentPage(Integer.valueOf(currPage));
            paginationResponseVo.setPageSize(Integer.valueOf(pageSize));
            paginationResponseVo.setTotalPage(Integer.valueOf(pageList.getTotalPages()));
            paginationResponseVo.setPageList(siteList);
            return ResultVo.response((Object)paginationResponseVo);
        }
        List extFieldList = this.workSiteService.findAllExtFields();
        List extFieldData = this.workSiteService.findAllExtFieldData();
        List basicResultList = this.workSiteService.getBasicResultList(extFieldList, siteList);
        HashMap attrListMap = this.workSiteService.getAttrListMap(extFieldList, extFieldData);
        HashMap completeAttrListMap = this.workSiteService.getCompleteAttrListJson(attrListMap, extFieldList);
        List resultList = this.workSiteService.replaceAttrListField(basicResultList, completeAttrListMap);
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(pageList.getTotalElements()));
        paginationResponseVo.setCurrentPage(Integer.valueOf(currPage));
        paginationResponseVo.setPageSize(Integer.valueOf(pageSize));
        paginationResponseVo.setTotalPage(Integer.valueOf(pageList.getTotalPages()));
        paginationResponseVo.setPageList(resultList);
        return ResultVo.response((Object)paginationResponseVo);
    }
}

