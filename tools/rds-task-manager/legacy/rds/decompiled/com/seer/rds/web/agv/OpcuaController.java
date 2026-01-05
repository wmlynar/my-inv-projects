/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.util.opc.OpcUaClientBuilder
 *  com.seer.rds.util.opc.OpcUaOperationUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.OpcReq
 *  com.seer.rds.web.agv.OpcuaController
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  org.eclipse.milo.opcua.sdk.client.OpcUaClient
 *  org.eclipse.milo.opcua.sdk.client.api.subscriptions.UaSubscription
 *  org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.UInteger
 *  org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.UShort
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Controller
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.ResponseBody
 */
package com.seer.rds.web.agv;

import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.util.opc.OpcUaClientBuilder;
import com.seer.rds.util.opc.OpcUaOperationUtil;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.OpcReq;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.eclipse.milo.opcua.sdk.client.OpcUaClient;
import org.eclipse.milo.opcua.sdk.client.api.subscriptions.UaSubscription;
import org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.UInteger;
import org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.UShort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping(value={"opc"})
@Api(tags={"OPC ua"})
public class OpcuaController {
    private static final Logger log = LoggerFactory.getLogger(OpcuaController.class);
    @Autowired
    private OpcUaClientBuilder opcUaClientBuilder;

    @ApiOperation(value="opc\u8bfb")
    @PostMapping(value={"/read"})
    @ResponseBody
    public ResultVo<Object> read(@RequestBody OpcReq req) throws Exception {
        Object result = OpcUaOperationUtil.readDeviceValue((Integer)req.getNamespaceIndex(), (String)req.getIdentifier());
        return ResultVo.response((Object)result);
    }

    @ApiOperation(value="\u68c0\u6d4bOPC\u8fde\u63a5\u72b6\u6001")
    @GetMapping(value={"/ping"})
    @ResponseBody
    public ResultVo<Object> ping() {
        try {
            OpcUaOperationUtil.ping();
        }
        catch (Exception e) {
            return ResultVo.error((CommonCodeEnum)CommonCodeEnum.CONNECTION_FAILED);
        }
        return ResultVo.success();
    }

    @ApiOperation(value="\u8fde\u63a5OPC\u670d\u52a1\u5668")
    @GetMapping(value={"/connect"})
    @ResponseBody
    public ResultVo<Object> connect() {
        this.opcUaClientBuilder.createClient();
        OpcUaClient client = OpcUaClientBuilder.opcUaClient;
        if (null == client) {
            return ResultVo.error();
        }
        return ResultVo.success();
    }

    @ApiOperation(value="opc\u5199")
    @PostMapping(value={"/write"})
    @ResponseBody
    public ResultVo<Object> write(@RequestBody OpcReq req) {
        OpcUaOperationUtil.writeDeviceValue((Integer)req.getNamespaceIndex(), (String)req.getIdentifier(), (Object)UShort.valueOf((int)req.getValue()));
        return ResultVo.success();
    }

    @ApiOperation(value="opc\u8ba2\u9605")
    @PostMapping(value={"/subscription"})
    @ResponseBody
    public ResultVo<Object> subscription(@RequestBody OpcReq req) {
        UaSubscription subscription = OpcUaOperationUtil.createSubscription((Integer)req.getNamespaceIndex(), (String)req.getIdentifier(), (subscriptionItem, id) -> subscriptionItem.setValueConsumer((item, value) -> log.info("subscription value received: item={}, value={}", (Object)item.getReadValueId().getNodeId(), (Object)value.getValue())));
        return ResultVo.success();
    }

    @ApiOperation(value="\u5220\u9664opc\u8ba2\u9605")
    @PostMapping(value={"/deleteSubscription"})
    @ResponseBody
    public ResultVo<Object> deleteSubscription(@RequestBody OpcReq req) {
        OpcUaOperationUtil.deleteSubscription((UInteger)UInteger.valueOf((int)req.getSubscriptionId()));
        return ResultVo.success();
    }
}

