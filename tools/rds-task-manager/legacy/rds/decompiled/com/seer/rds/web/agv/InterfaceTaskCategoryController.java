/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.model.wind.InterfacePreHandle
 *  com.seer.rds.model.wind.InterfaceTaskCategory
 *  com.seer.rds.service.agv.InterfaceTaskCategoryService
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.WindTaskCatoryReq
 *  com.seer.rds.vo.response.InterfaceTaskCategoryResp
 *  com.seer.rds.web.agv.InterfaceHandleController
 *  com.seer.rds.web.agv.InterfaceTaskCategoryController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  javax.servlet.http.HttpServletResponse
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Controller
 *  org.springframework.util.StringUtils
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.ResponseBody
 *  springfox.documentation.annotations.ApiIgnore
 */
package com.seer.rds.web.agv;

import com.seer.rds.annotation.SysLog;
import com.seer.rds.model.wind.InterfacePreHandle;
import com.seer.rds.model.wind.InterfaceTaskCategory;
import com.seer.rds.service.agv.InterfaceTaskCategoryService;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.WindTaskCatoryReq;
import com.seer.rds.vo.response.InterfaceTaskCategoryResp;
import com.seer.rds.web.agv.InterfaceHandleController;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import javax.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import springfox.documentation.annotations.ApiIgnore;

@Controller
@RequestMapping(value={"interfaceCategory"})
@Api(tags={"\u63a5\u53e3\u5206\u7c7b\u7ba1\u7406"})
public class InterfaceTaskCategoryController {
    private static final Logger log = LoggerFactory.getLogger(InterfaceTaskCategoryController.class);
    @Autowired
    private InterfaceTaskCategoryService interfaceTaskCategoryService;
    @Autowired
    private InterfaceHandleController interfaceHandleController;

    @ApiOperation(value="\u63a5\u53e3\u5206\u7c7b\u5217\u8868\u67e5\u8be2")
    @GetMapping(value={"/findAll-interfaceTaskCategory"})
    @ResponseBody
    public ResultVo<Object> findAllWindTaskCategory() throws Exception {
        try {
            InterfaceTaskCategoryResp interfaceTaskCategoryResp = new InterfaceTaskCategoryResp();
            interfaceTaskCategoryResp.setInterfaceTaskCategoryList(this.interfaceTaskCategoryService.findAllInterfaceTaskCategory());
            interfaceTaskCategoryResp.setSurplusInterfaceDefList(this.interfaceHandleController.findInterfaceTaskDefByInterfaceCategoryIdIs());
            return ResultVo.response((Object)interfaceTaskCategoryResp);
        }
        catch (Exception e) {
            log.error("findAllInterfaceTaskCategory error", (Throwable)e);
            return ResultVo.error();
        }
    }

    @SysLog(operation="deleteInterfaceCategory", message="@{wind.controller.deleteInterfaceTaskCategoryById}")
    @ApiOperation(value="\u5220\u9664\u5355\u4e2a\u5b50\u6587\u4ef6")
    @PostMapping(value={"/deleteInterfaceTaskCategoryById"})
    @ResponseBody
    public ResultVo<Object> deleteInterfaceTaskCategoryById(@RequestBody WindTaskCatoryReq windTaskCatoryReq, @ApiIgnore HttpServletResponse response) throws Exception {
        try {
            if (windTaskCatoryReq != null && !"".equals(windTaskCatoryReq.getId())) {
                this.interfaceTaskCategoryService.deleteInterfaceTaskCategoryIdsById(windTaskCatoryReq.getId());
            }
            return ResultVo.success();
        }
        catch (Exception e) {
            log.error("deleteWindTaskCategoryById error", (Throwable)e);
            return ResultVo.error();
        }
    }

    @ApiOperation(value="\u521b\u5efa\u63a5\u53e3\u5206\u7c7b\u540d")
    @PostMapping(value={"/createInterfaceTaskCategory"})
    @ResponseBody
    public ResultVo<Object> createWindTaskCategory(@RequestBody WindTaskCatoryReq windTaskCatoryReq, @ApiIgnore HttpServletResponse response) throws Exception {
        try {
            InterfaceTaskCategory build;
            Boolean aBoolean;
            if (windTaskCatoryReq != null && !StringUtils.isEmpty((Object)windTaskCatoryReq.getLabel()) && !StringUtils.isEmpty((Object)windTaskCatoryReq.getParentId()) && (aBoolean = this.interfaceTaskCategoryService.addInterfaceTaskCategory(build = InterfaceTaskCategory.builder().label(windTaskCatoryReq.getLabel()).isDel(Integer.valueOf(0)).parentId(Long.valueOf(windTaskCatoryReq.getParentId())).build())).booleanValue()) {
                return ResultVo.success();
            }
            return ResultVo.error();
        }
        catch (Exception e) {
            log.error("createInterfaceTaskCategory error", (Throwable)e);
            return ResultVo.error();
        }
    }

    @ApiOperation(value="\u4fee\u6539\u5929\u98ce\u5206\u7c7b\u540d")
    @PostMapping(value={"/updateInterfaceTaskCategoryName"})
    @ResponseBody
    public ResultVo<Object> updateInterfaceTaskCategoryName(@RequestBody WindTaskCatoryReq windTaskCatoryReq, @ApiIgnore HttpServletResponse response) throws Exception {
        try {
            InterfaceTaskCategory build;
            Boolean aBoolean;
            if (windTaskCatoryReq != null && !StringUtils.isEmpty((Object)windTaskCatoryReq.getId()) && !StringUtils.isEmpty((Object)windTaskCatoryReq.getLabel()) && (aBoolean = this.interfaceTaskCategoryService.updateInterfaceTaskCategoryName(build = InterfaceTaskCategory.builder().id(Long.valueOf(windTaskCatoryReq.getId())).label(windTaskCatoryReq.getLabel()).isDel(Integer.valueOf(0)).build())).booleanValue()) {
                return ResultVo.success();
            }
            return ResultVo.error();
        }
        catch (Exception e) {
            log.error("updateInterfaceTaskCategoryName error", (Throwable)e);
            return ResultVo.error();
        }
    }

    @ApiOperation(value="\u5355\u4e2a\u5b50\u5206\u7c7b\u79fb\u52a8\u5230\u7236\u5206\u7c7b")
    @PostMapping(value={"/moveInterfaceTaskCategoryToParent"})
    @ResponseBody
    public ResultVo<Object> moveInterfaceTaskCategoryToParent(@RequestBody WindTaskCatoryReq windTaskCatoryReq, @ApiIgnore HttpServletResponse response) throws Exception {
        try {
            InterfaceTaskCategory build;
            Boolean aBoolean;
            if (windTaskCatoryReq != null && !StringUtils.isEmpty((Object)windTaskCatoryReq.getId()) && !StringUtils.isEmpty((Object)windTaskCatoryReq.getLabel()) && !StringUtils.isEmpty((Object)windTaskCatoryReq.getParentId()) && (aBoolean = this.interfaceTaskCategoryService.moveInterfaceTaskCategoryToParent(build = InterfaceTaskCategory.builder().id(Long.valueOf(windTaskCatoryReq.getId())).label(windTaskCatoryReq.getLabel()).isDel(Integer.valueOf(0)).parentId(Long.valueOf(windTaskCatoryReq.getParentId())).build())).booleanValue()) {
                return ResultVo.success();
            }
            return ResultVo.error();
        }
        catch (Exception e) {
            log.error("moveInterfaceTaskCategoryToParent error", (Throwable)e);
            return ResultVo.error();
        }
    }

    @ApiOperation(value="\u62d6\u5165\u63a5\u53e3\u4efb\u52a1\u5230\u5206\u7c7b")
    @PostMapping(value={"/moveInterfaceTaskToCategory"})
    @ResponseBody
    public ResultVo<Object> moveWindTaskToCategory(@RequestBody InterfacePreHandle interfacePreHandle, @ApiIgnore HttpServletResponse response) throws Exception {
        try {
            if (interfacePreHandle != null && !StringUtils.isEmpty((Object)interfacePreHandle.getId()) && interfacePreHandle.getIntertfaceCategoryId() != null) {
                this.interfaceHandleController.updateInterfaceCategoryId(interfacePreHandle);
                return ResultVo.success();
            }
            return ResultVo.error();
        }
        catch (Exception e) {
            log.error("moveInterfaceTaskToCategory error", (Throwable)e);
            return ResultVo.error();
        }
    }
}

