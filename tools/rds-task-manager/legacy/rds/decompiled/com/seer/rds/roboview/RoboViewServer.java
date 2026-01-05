/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.google.common.collect.Maps
 *  com.seer.rds.config.configview.RoboView
 *  com.seer.rds.constant.SiteStatusEnum
 *  com.seer.rds.constant.UpdateSiteScopeEnum
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.roboview.NettyClient
 *  com.seer.rds.roboview.RoboChannel
 *  com.seer.rds.roboview.RoboViewEnum
 *  com.seer.rds.roboview.RoboViewServer
 *  com.seer.rds.roboview.RoboViewServer$RoboViewProtocol
 *  com.seer.rds.roboview.vo.SiteInfo
 *  com.seer.rds.roboview.vo.StorageVo
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.web.config.ConfigFileController
 *  io.netty.buffer.ByteBuf
 *  io.netty.buffer.ByteBufAllocator
 *  io.netty.buffer.CompositeByteBuf
 *  io.netty.channel.EventLoopGroup
 *  io.netty.channel.nio.NioEventLoopGroup
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.roboview;

import com.alibaba.fastjson.JSONObject;
import com.google.common.collect.Maps;
import com.seer.rds.config.configview.RoboView;
import com.seer.rds.constant.SiteStatusEnum;
import com.seer.rds.constant.UpdateSiteScopeEnum;
import com.seer.rds.dao.WorkSiteMapper;
import com.seer.rds.roboview.NettyClient;
import com.seer.rds.roboview.RoboChannel;
import com.seer.rds.roboview.RoboViewEnum;
import com.seer.rds.roboview.RoboViewServer;
import com.seer.rds.roboview.vo.SiteInfo;
import com.seer.rds.roboview.vo.StorageVo;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.web.config.ConfigFileController;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.ByteBufAllocator;
import io.netty.buffer.CompositeByteBuf;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class RoboViewServer
implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(RoboViewServer.class);

    @Override
    public void run() {
        if (ConfigFileController.commonConfig != null && ConfigFileController.commonConfig.getRoboViews() != null && ConfigFileController.commonConfig.getRoboViews().getEnable().booleanValue() && ConfigFileController.commonConfig.getRoboViews().getRoboViewList() != null) {
            this.init();
        }
    }

    public void init() {
        int sleepTime = 2000;
        while (true) {
            if (ConfigFileController.commonConfig == null || ConfigFileController.commonConfig.getRoboViews() == null || !ConfigFileController.commonConfig.getRoboViews().getEnable().booleanValue() || ConfigFileController.commonConfig.getRoboViews().getRoboViewList() == null) {
                continue;
            }
            sleepTime = ConfigFileController.commonConfig.getRoboViews().getIntervalTime();
            for (int i = 0; i < ConfigFileController.commonConfig.getRoboViews().getRoboViewList().size(); ++i) {
                RoboView roboViewConfig = (RoboView)ConfigFileController.commonConfig.getRoboViews().getRoboViewList().get(i);
                if (UpdateSiteScopeEnum.NONE.equals((Object)roboViewConfig.getUpdateSitesBy()) || !roboViewConfig.getAutoUpdateSiteContent().booleanValue()) continue;
                String msg = RoboViewServer.getRoboViewInfo((RoboView)roboViewConfig);
                log.info("roboView msg = {}", (Object)msg);
                if (StringUtils.isEmpty((CharSequence)msg)) {
                    this.updateSite("", roboViewConfig.getUpdateSitesBy(), roboViewConfig.getUpdateSitesGroup());
                    continue;
                }
                this.updateSite(msg, roboViewConfig.getUpdateSitesBy(), roboViewConfig.getUpdateSitesGroup());
            }
            try {
                Thread.sleep(sleepTime);
                continue;
            }
            catch (InterruptedException e) {
                log.error("Roboview InterruptedException", (Throwable)e);
                continue;
            }
            break;
        }
    }

    private static ByteBuf getSendRoboViewProtocol(String msg) {
        int reqLength = msg.getBytes(StandardCharsets.UTF_8).length + 16;
        CompositeByteBuf reqBuffer = ByteBufAllocator.DEFAULT.compositeHeapBuffer(reqLength);
        reqBuffer.writeBytes(RoboViewProtocol.rbkPkgStart);
        reqBuffer.writeByte(1);
        reqBuffer.writeShort(Integer.valueOf(1).intValue());
        reqBuffer.writeInt(msg.getBytes(StandardCharsets.UTF_8).length);
        reqBuffer.writeShort((int)Integer.valueOf(0).shortValue());
        reqBuffer.writeBytes(RoboViewProtocol.rbkHeaderReserved);
        reqBuffer.writeBytes(msg.getBytes(StandardCharsets.UTF_8));
        return reqBuffer;
    }

    private void updateSite(String responseMsg, UpdateSiteScopeEnum updateSitesBy, List<String> updateSitesGroup) {
        log.info("Roboview getUpdateInfo message = {}", (Object)responseMsg);
        WorkSiteMapper workSiteMapper = (WorkSiteMapper)SpringUtil.getBean(WorkSiteMapper.class);
        List storedSiteList = new ArrayList();
        storedSiteList = UpdateSiteScopeEnum.GROUP.equals((Object)updateSitesBy) ? workSiteMapper.findByGroupNameIn(updateSitesGroup) : workSiteMapper.findAll();
        ArrayList workSiteIds = new ArrayList();
        storedSiteList.stream().forEach(it -> workSiteIds.add(it.getSiteId()));
        if (StringUtils.isEmpty((CharSequence)responseMsg)) {
            workSiteMapper.updateSiteSyncFailedStatusBySiteIds(workSiteIds, Integer.valueOf(SiteStatusEnum.syncFailed.getStatus()));
            return;
        }
        StorageVo storageVo = (StorageVo)JSONObject.parseObject((String)responseMsg, StorageVo.class);
        if (StringUtils.equals((CharSequence)RoboViewEnum.rv_get_storage_status.getFunName(), (CharSequence)storageVo.getName()) && storageVo.getStatus() != null) {
            ArrayList<String> fillList = new ArrayList<String>();
            ArrayList<String> emptyList = new ArrayList<String>();
            ArrayList<String> failedList = new ArrayList<String>();
            for (int i = 0; i < storageVo.getStatus().size(); ++i) {
                SiteInfo it2 = (SiteInfo)storageVo.getStatus().get(i);
                if (!workSiteIds.contains(it2.getStorage_id())) continue;
                if (it2.getStorage_shelter() != null && it2.getStorage_shelter().booleanValue()) {
                    failedList.add(it2.getStorage_id());
                    continue;
                }
                if (it2.getStorage_occupied().booleanValue()) {
                    fillList.add(it2.getStorage_id());
                    continue;
                }
                emptyList.add(it2.getStorage_id());
            }
            if (!fillList.isEmpty()) {
                workSiteMapper.updateSiteFillStatusBySiteIds(fillList, Integer.valueOf(SiteStatusEnum.filled.getStatus()), Integer.valueOf(SiteStatusEnum.synnofailed.getStatus()));
                workSiteIds.removeAll(fillList);
            }
            if (!emptyList.isEmpty()) {
                workSiteMapper.updateSiteFillStatusAndContentBySiteIds(emptyList, "", Integer.valueOf(SiteStatusEnum.unfilled.getStatus()), Integer.valueOf(SiteStatusEnum.synnofailed.getStatus()));
                workSiteIds.removeAll(emptyList);
            }
            if (!failedList.isEmpty()) {
                workSiteMapper.updateSiteSyncFailedStatusBySiteIds(failedList, Integer.valueOf(SiteStatusEnum.syncFailed.getStatus()));
                workSiteIds.removeAll(failedList);
            }
            if (!workSiteIds.isEmpty()) {
                workSiteMapper.updateSiteSyncFailedStatusBySiteIds(workSiteIds, Integer.valueOf(SiteStatusEnum.syncFailed.getStatus()));
            }
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public static String getRoboViewInfo(RoboView roboViewConfig) {
        NioEventLoopGroup workerGroup = new NioEventLoopGroup();
        RoboChannel roboChannel = null;
        try {
            roboChannel = NettyClient.getTcpClients((String)roboViewConfig.getHost(), (int)roboViewConfig.getPort(), (int)roboViewConfig.getConnectTimeout(), (int)roboViewConfig.getRwTimeout(), (EventLoopGroup)workerGroup, (int)roboViewConfig.getRcvBUF());
            if (roboChannel == null) {
                String string = null;
                return string;
            }
            HashMap hashMap = Maps.newHashMap();
            hashMap.put("name", RoboViewEnum.rv_get_storage_status.getFunName());
            String msg = JSONObject.toJSONString((Object)hashMap);
            ByteBuf sendRoboViewProtocol = RoboViewServer.getSendRoboViewProtocol((String)msg);
            roboChannel.sendRequest(sendRoboViewProtocol);
            String string = roboChannel.getResponseMsg();
            return string;
        }
        catch (InterruptedException e) {
            log.error("sendRequest RoboView error = {}", (Throwable)e);
        }
        catch (Exception e) {
            log.error("RoboViewUpdate Unknown  error = {}", (Throwable)e);
        }
        finally {
            workerGroup.shutdownGracefully();
            if (roboChannel != null) {
                roboChannel.getChannel().close();
            }
        }
        return null;
    }
}

