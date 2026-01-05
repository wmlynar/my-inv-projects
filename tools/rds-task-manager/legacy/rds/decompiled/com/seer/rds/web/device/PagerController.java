/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.model.device.Pager
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.device.PagerService
 *  com.seer.rds.util.ExcelUtil
 *  com.seer.rds.util.FileUploadUtil
 *  com.seer.rds.vo.PagerAddressRecordVo
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.PagerAddVo
 *  com.seer.rds.vo.req.PagerEnableOrDisableVo
 *  com.seer.rds.web.device.PagerController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.servlet.http.HttpServletResponse
 *  org.apache.commons.collections.CollectionUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
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
package com.seer.rds.web.device;

import com.seer.rds.annotation.SysLog;
import com.seer.rds.config.PropConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.model.device.Pager;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.device.PagerService;
import com.seer.rds.util.ExcelUtil;
import com.seer.rds.util.FileUploadUtil;
import com.seer.rds.vo.PagerAddressRecordVo;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.PagerAddVo;
import com.seer.rds.vo.req.PagerEnableOrDisableVo;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.File;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;
import java.util.stream.Collectors;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.collections.CollectionUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
@RequestMapping(value={"pager"})
@Api(tags={"\u547c\u53eb\u5668"})
public class PagerController {
    private static final Logger log = LoggerFactory.getLogger(PagerController.class);
    @Autowired
    private PagerService pagerService;
    @Autowired
    private WindService windService;
    @Autowired
    private PropConfig propConfig;

    @ApiOperation(value="\u67e5\u8be2\u547c\u53eb\u5668\u5217\u8868")
    @PostMapping(value={"/findPagerByCondition"})
    @ResponseBody
    public ResultVo<Object> findPagerByCondition(@RequestBody Pager pager) {
        List result = this.pagerService.findPagerByCondition(pager.getDeviceName(), pager.getBrand(), pager.getIp(), pager.getDisabled());
        return ResultVo.response((Object)result);
    }

    @ApiOperation(value="\u67e5\u8be2 userTemplate \u4e0b\u6240\u6709\u4efb\u52a1\u7684id\u548clabel")
    @PostMapping(value={"/findAvailableTaskDef"})
    @ResponseBody
    public ResultVo<Object> findAvailableTaskDef() {
        return ResultVo.response((Object)this.windService.findIdAndLabelFromUserTemplate());
    }

    @ApiOperation(value="\u65b0\u589e/\u4fee\u6539\u547c\u53eb\u5668\u548c\u8be6\u60c5")
    @PostMapping(value={"/saveOrUpdatePagerAndAddress"})
    @ResponseBody
    public ResultVo<Object> saveOrUpdatePagerAndAddress(@RequestBody PagerAddVo pagerAddVo) {
        List records = pagerAddVo.getPagerAddressRecords();
        Pager pager = pagerAddVo.getPager();
        List delIds = pagerAddVo.getDelIds();
        if (null == pager) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.Data_Cannot_Be_Empty);
        }
        Long pagerId = pager.getId();
        List ids = this.pagerService.findIdByIp(pager.getIp());
        if (CollectionUtils.isNotEmpty((Collection)ids) && (null == pagerId || (long)pagerId.intValue() != (Long)ids.get(0))) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.Ip_Already_In_Use);
        }
        this.pagerService.saveOrUpdatePagerAndAddressAndCacheAndDelAddress(pager, records, delIds);
        return ResultVo.success();
    }

    @ApiOperation(value="\u5bfc\u51fa\u547c\u53eb\u5668")
    @GetMapping(value={"/export"})
    @ResponseBody
    public void export(@RequestParam(name="deviceName", required=false) String deviceName, @RequestParam(name="ip", required=false) String ip, @ApiIgnore HttpServletResponse response) throws Exception {
        List pagerData = this.pagerService.findPagerAddressRecordVoByDeviceNameAndIp(deviceName, ip);
        ExcelUtil.exportExcel((List)pagerData, (String)"pager", (String)"pager", PagerAddressRecordVo.class, (String)"pager.xls", (HttpServletResponse)response);
    }

    @SysLog(operation="import", message="importPager")
    @ApiOperation(value="\u5bfc\u5165\u547c\u53eb\u5668")
    @PostMapping(value={"/import"})
    @ResponseBody
    public ResultVo<Object> importPager(@RequestParam(value="file") MultipartFile file, @ApiIgnore HttpServletResponse response) throws Exception {
        boolean typeMatch = FileUploadUtil.checkUploadType((MultipartFile)file, (String)"xls", (String)"application/vnd.ms-excel");
        if (!typeMatch) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.UPLOAD_FILE_TYPE_ERROR);
        }
        String fileName = file.getOriginalFilename();
        String filePath = this.propConfig.getRdsStaticDir() + fileName;
        File dest = new File(filePath);
        file.transferTo(dest);
        List pagerAddressRecordVos = ExcelUtil.importExcel((String)filePath, (Integer)1, (Integer)1, PagerAddressRecordVo.class);
        if (CollectionUtils.isNotEmpty((Collection)pagerAddressRecordVos)) {
            try {
                this.pagerService.importPagerData(pagerAddressRecordVos);
            }
            catch (Exception e) {
                dest.delete();
                log.error("\u547c\u53eb\u5668\u5bfc\u5165\u5931\u8d25\uff1a", (Throwable)e);
                return ResultVo.error((CommonCodeEnum)CommonCodeEnum.WRITE_ERROR);
            }
        }
        dest.delete();
        return ResultVo.success();
    }

    @SysLog(operation="disable", message="disablePager")
    @ApiOperation(value="\u7981\u7528\u547c\u53eb\u5668")
    @PostMapping(value={"/disable"})
    @ResponseBody
    public ResultVo<Object> disable(@RequestBody PagerEnableOrDisableVo vo) {
        List pagerIds = vo.getPagerIds();
        if (pagerIds.isEmpty()) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.Data_Cannot_Be_Empty);
        }
        this.pagerService.disablePager(pagerIds);
        return ResultVo.success();
    }

    @SysLog(operation="enable", message="enablePager")
    @ApiOperation(value="\u542f\u7528\u547c\u53eb\u5668")
    @PostMapping(value={"/enable"})
    @ResponseBody
    public ResultVo<Object> enable(@RequestBody PagerEnableOrDisableVo vo) {
        List pagerIds = vo.getPagerIds();
        if (pagerIds.isEmpty()) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.Data_Cannot_Be_Empty);
        }
        this.pagerService.enablePager(pagerIds);
        return ResultVo.success();
    }

    @ApiOperation(value="\u5220\u9664\u547c\u53eb\u5668")
    @PostMapping(value={"/delPagers"})
    @ResponseBody
    public ResultVo<Object> delPagers(@RequestBody List<Long> ids) {
        this.pagerService.deletePagerAndAddress(ids);
        return ResultVo.success();
    }

    @ApiOperation(value="\u6839\u636e\u547c\u53eb\u5668id\u67e5\u8be2\u6307\u5b9a\u547c\u53eb\u5668\u7684\u5730\u5740\u5217\u8868")
    @PostMapping(value={"/findPagerAddressById"})
    @ResponseBody
    public ResultVo<Object> findPagerAddressById(@RequestBody Pager pager) {
        List result = this.pagerService.findPagerAddressById(pager.getId());
        List collect = result.stream().sorted(Comparator.comparing(PagerAddressRecordVo::getAddress)).collect(Collectors.toList());
        return ResultVo.response(collect);
    }

    @ApiOperation(value="\u65b0\u589e\u547c\u53eb\u5668\u7684\u5730\u5740\u5217\u8868\u7684\u529f\u80fd")
    @PostMapping(value={"/addPagerAddress"})
    @ResponseBody
    public ResultVo<Object> addPagerAddress(@RequestBody List<PagerAddressRecordVo> pagerAddressRecordVos) {
        if (CollectionUtils.isEmpty(pagerAddressRecordVos)) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.Data_Cannot_Be_Empty);
        }
        ArrayList<Integer> repeatAddressList = new ArrayList<Integer>();
        List dbAddressList = this.pagerService.findAddressByPagerId(pagerAddressRecordVos.get(0).getPagerId());
        Iterator<PagerAddressRecordVo> iterator = pagerAddressRecordVos.iterator();
        while (iterator.hasNext()) {
            PagerAddressRecordVo vo = iterator.next();
            if (!dbAddressList.contains(vo.getAddress())) continue;
            repeatAddressList.add(vo.getAddress());
            iterator.remove();
        }
        this.pagerService.addPagerAddressAndCache(pagerAddressRecordVos);
        if (CollectionUtils.isNotEmpty(repeatAddressList)) {
            log.info("Save pager successfully, part of the duplicate data has been filtered, the filtered address number is as follows: " + repeatAddressList);
            return ResultVo.response((Object)("Save successfully, part of the duplicate data has been filtered, the filtered address number is as follows: " + repeatAddressList));
        }
        return ResultVo.success();
    }

    @ApiOperation(value="\u4fee\u6539\u547c\u53eb\u5668\u7684\u5730\u5740\u5217\u8868\u7684\u529f\u80fd")
    @PostMapping(value={"/updatePagerAddress"})
    @ResponseBody
    public ResultVo<Object> updatePagerAddress(@RequestBody PagerAddressRecordVo pagerAddressRecordVo) {
        List list = this.pagerService.findIdByPagerIdAndAddr(pagerAddressRecordVo.getPagerId(), pagerAddressRecordVo.getAddress());
        if (CollectionUtils.isEmpty((Collection)list) || pagerAddressRecordVo.getId().equals(list.get(0))) {
            this.pagerService.updatePagerAddressAndCache(pagerAddressRecordVo);
            return ResultVo.success();
        }
        return ResultVo.error((CommonCodeEnum)CommonCodeEnum.Address_Already_In_Use);
    }

    @ApiOperation(value="\u4fee\u6539\u547c\u53eb\u5668\u4fe1\u53f7\u503c")
    @PostMapping(value={"/updatePagerValue"})
    @ResponseBody
    public ResultVo<Object> updatePagerValue(@RequestBody PagerAddressRecordVo pagerAddressRecordVo) {
        try {
            this.pagerService.updatePagerValue(pagerAddressRecordVo);
        }
        catch (Exception e) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.WRITE_ERROR);
        }
        return ResultVo.success();
    }

    @ApiOperation(value="\u4fee\u6539\u706f\u7684\u4fe1\u53f7\u503c")
    @PostMapping(value={"/updateLightValue"})
    @ResponseBody
    public ResultVo<Object> updateLightValue(@RequestBody PagerAddressRecordVo pagerAddressRecordVo) {
        try {
            this.pagerService.updateLightValue(pagerAddressRecordVo);
        }
        catch (Exception e) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.WRITE_ERROR);
        }
        return ResultVo.success();
    }

    @ApiOperation(value="\u5220\u9664\u547c\u53eb\u5668\u5730\u5740")
    @PostMapping(value={"/deletePagerAddress"})
    @ResponseBody
    public ResultVo<Object> deletePagerAddress(@RequestBody List<Long> ids) {
        this.pagerService.deleteAddress(ids);
        return ResultVo.success();
    }
}

