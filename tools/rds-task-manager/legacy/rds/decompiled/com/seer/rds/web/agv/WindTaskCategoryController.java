/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.SysLog
 *  com.seer.rds.model.wind.WindTaskCategory
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.service.agv.WindService
 *  com.seer.rds.service.agv.WindTaskCategoryService
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.WindTaskCatoryReq
 *  com.seer.rds.vo.response.WindTaskCategoryResp
 *  com.seer.rds.web.agv.WindTaskCategoryController
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
import com.seer.rds.model.wind.WindTaskCategory;
import com.seer.rds.model.wind.WindTaskDef;
import com.seer.rds.service.agv.WindService;
import com.seer.rds.service.agv.WindTaskCategoryService;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.WindTaskCatoryReq;
import com.seer.rds.vo.response.WindTaskCategoryResp;
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
@RequestMapping(value={"api"})
@Api(tags={"\u5929\u98ce\u4efb\u52a1\u5206\u7c7b\u7ba1\u7406"})
public class WindTaskCategoryController {
    private static final Logger log = LoggerFactory.getLogger(WindTaskCategoryController.class);
    @Autowired
    private WindTaskCategoryService windTaskCategoryService;
    @Autowired
    private WindService windService;

    @ApiOperation(value="\u5929\u98ce\u4efb\u52a1\u5206\u7c7b\u5217\u8868\u67e5\u8be2")
    @GetMapping(value={"/windCategory/findAll-windTaskCategory"})
    @ResponseBody
    public ResultVo<Object> findAllWindTaskCategory() throws Exception {
        try {
            WindTaskCategoryResp windTaskCategoryResp = new WindTaskCategoryResp();
            windTaskCategoryResp.setWindTaskCategoryList(this.windTaskCategoryService.findAllWindTaskCategory());
            windTaskCategoryResp.setSurplusWindDefList(this.windService.findWindTaskDefByWindcategoryIdIs0());
            return ResultVo.response((Object)windTaskCategoryResp);
        }
        catch (Exception e) {
            log.error("findAllWindTaskCategory error", (Throwable)e);
            return ResultVo.error();
        }
    }

    @SysLog(operation="deleteWindCategory", message="@{wind.controller.deleteWindTaskCategoryById}")
    @ApiOperation(value="\u5220\u9664\u5355\u4e2a\u5b50\u6587\u4ef6")
    @PostMapping(value={"/windCategory/deleteWindTaskCategoryById"})
    @ResponseBody
    public ResultVo<Object> deleteWindTaskCategoryById(@RequestBody WindTaskCatoryReq windTaskCatoryReq, @ApiIgnore HttpServletResponse response) throws Exception {
        try {
            if (windTaskCatoryReq != null && !"".equals(windTaskCatoryReq.getId())) {
                this.windTaskCategoryService.deleteWindTaskCategoryIdsById(windTaskCatoryReq.getId());
            }
            return ResultVo.success();
        }
        catch (Exception e) {
            log.error("deleteWindTaskCategoryById error", (Throwable)e);
            return ResultVo.error();
        }
    }

    @ApiOperation(value="\u521b\u5efa\u5929\u98ce\u5206\u7c7b\u540d")
    @PostMapping(value={"/windCategory/createWindTaskCategory"})
    @ResponseBody
    public ResultVo<Object> createWindTaskCategory(@RequestBody WindTaskCatoryReq windTaskCatoryReq, @ApiIgnore HttpServletResponse response) throws Exception {
        try {
            WindTaskCategory build;
            Boolean aBoolean;
            if (windTaskCatoryReq != null && !StringUtils.isEmpty((Object)windTaskCatoryReq.getLabel()) && !StringUtils.isEmpty((Object)windTaskCatoryReq.getParentId()) && (aBoolean = this.windTaskCategoryService.addWindTaskCategory(build = WindTaskCategory.builder().label(windTaskCatoryReq.getLabel()).isDel(Integer.valueOf(0)).parentId(Long.valueOf(windTaskCatoryReq.getParentId())).build())).booleanValue()) {
                return ResultVo.success();
            }
            return ResultVo.error();
        }
        catch (Exception e) {
            log.error("createWindTaskCategory error", (Throwable)e);
            return ResultVo.error();
        }
    }

    @ApiOperation(value="\u4fee\u6539\u5929\u98ce\u5206\u7c7b\u540d")
    @PostMapping(value={"/windCategory/updateWindTaskCategoryName"})
    @ResponseBody
    public ResultVo<Object> updateWindTaskCategoryName(@RequestBody WindTaskCatoryReq windTaskCatoryReq, @ApiIgnore HttpServletResponse response) throws Exception {
        try {
            WindTaskCategory build;
            Boolean aBoolean;
            if (windTaskCatoryReq != null && !StringUtils.isEmpty((Object)windTaskCatoryReq.getId()) && !StringUtils.isEmpty((Object)windTaskCatoryReq.getLabel()) && (aBoolean = this.windTaskCategoryService.updateWindTaskCategoryName(build = WindTaskCategory.builder().id(Long.valueOf(windTaskCatoryReq.getId())).label(windTaskCatoryReq.getLabel()).isDel(Integer.valueOf(0)).build())).booleanValue()) {
                return ResultVo.success();
            }
            return ResultVo.error();
        }
        catch (Exception e) {
            log.error("updateWindTaskCategoryName error", (Throwable)e);
            return ResultVo.error();
        }
    }

    @ApiOperation(value="\u5355\u4e2a\u5b50\u5206\u7c7b\u79fb\u52a8\u5230\u7236\u5206\u7c7b")
    @PostMapping(value={"/windCategory/moveWindTaskCategoryToParent"})
    @ResponseBody
    public ResultVo<Object> moveWindTaskCategoryToParent(@RequestBody WindTaskCatoryReq windTaskCatoryReq, @ApiIgnore HttpServletResponse response) throws Exception {
        try {
            WindTaskCategory build;
            Boolean aBoolean;
            if (windTaskCatoryReq != null && !StringUtils.isEmpty((Object)windTaskCatoryReq.getId()) && !StringUtils.isEmpty((Object)windTaskCatoryReq.getLabel()) && !StringUtils.isEmpty((Object)windTaskCatoryReq.getParentId()) && (aBoolean = this.windTaskCategoryService.moveWindTaskCategoryToParent(build = WindTaskCategory.builder().id(Long.valueOf(windTaskCatoryReq.getId())).label(windTaskCatoryReq.getLabel()).isDel(Integer.valueOf(0)).parentId(Long.valueOf(windTaskCatoryReq.getParentId())).build())).booleanValue()) {
                return ResultVo.success();
            }
            return ResultVo.error();
        }
        catch (Exception e) {
            log.error("moveWindTaskCategoryToParent error", (Throwable)e);
            return ResultVo.error();
        }
    }

    @ApiOperation(value="\u62d6\u5165\u5929\u98ce\u4efb\u52a1\u5230\u5206\u7c7b")
    @PostMapping(value={"/windCategory/moveWindTaskToCategory"})
    @ResponseBody
    public ResultVo<Object> moveWindTaskToCategory(@RequestBody WindTaskDef windTaskDef, @ApiIgnore HttpServletResponse response) throws Exception {
        try {
            if (windTaskDef != null && !StringUtils.isEmpty((Object)windTaskDef.getId()) && windTaskDef.getWindcategoryId() != null) {
                this.windService.updateWindcategoryId(windTaskDef);
                return ResultVo.success();
            }
            return ResultVo.error();
        }
        catch (Exception e) {
            log.error("moveWindTaskToCategory error", (Throwable)e);
            return ResultVo.error();
        }
    }
}

