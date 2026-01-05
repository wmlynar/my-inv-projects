/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.ApiEnum
 */
package com.seer.rds.constant;

public enum ApiEnum {
    downloadScene("downloadScene", "\u4e0b\u8f7d\u5f53\u524d\u573a\u666f"),
    uploadScene("uploadScene", "\u4e0a\u4f20\u573a\u666f"),
    syncScene("syncScene", "\u8fd8\u539f\u573a\u666f"),
    orders("orders", "\u5206\u9875\u67e5\u8be2\u8fd0\u5355"),
    getProfiles("getProfiles", "\u83b7\u53d6\u914d\u7f6e\u6587\u4ef6"),
    setOrder("setOrder", "\u53d1\u9001\u8fd0\u5355\uff08\u521b\u5efa\u4efb\u52a1\uff09"),
    orderDetails("orderDetails", "\u67e5\u8be2\u8fd0\u5355\u72b6\u6001 /orderDetails/{id}"),
    tasks("tasks", "\u6279\u91cf\u67e5\u8be2\u8fd0\u5355\u72b6\u6001 tasks?vehicle=AMB-01&state=FINISHED&orderBy=createTime"),
    addBlocks("addBlocks", "\u7ed9\u8fd0\u5355\u4efb\u52a1\u6dfb\u52a0\u5757"),
    getBlocks("blockDetailsById", "\u6839\u636e\u52a8\u4f5c\u5757id\u67e5\u8be2\u52a8\u4f5c\u5757"),
    markComplete("markComplete", "\u901a\u77e5\u8fd0\u5355\u4efb\u52a1\u5c01\u53e3"),
    terminate("terminate", "\u7ec8\u6b62\u4efb\u52a1"),
    robotsStatus("robotsStatus", "\u83b7\u53d6\u673a\u5668\u4eba\u4fe1\u606f"),
    lock("lock", "\u83b7\u53d6\u63a7\u5236\u6743"),
    unlock("unlock", "\u91ca\u653e\u63a7\u5236\u6743"),
    config("config", "\u4fee\u6539\u8c03\u5ea6\u914d\u7f6e"),
    manualFinished("manualFinished", "\u624b\u52a8\u5b8c\u6210\u52a8\u4f5c\u5757"),
    redoFailedOrder("redoFailedOrder", "\u91cd\u505a\u5931\u8d25\u7684\u52a8\u4f5c\u5757"),
    dispatchable("dispatchable", "\u8bbe\u7f6e\u53ef\u63a5\u5355\u6216\u4e0d\u53ef\u63a5\u5355"),
    openLoop("openLoop", "\u5f00\u73af\u8fd0\u52a8"),
    reLocStart("reLocStart", "\u673a\u5668\u4eba\u91cd\u5b9a\u4f4d"),
    reLocConfirm("reLocConfirm", "\u673a\u5668\u4eba\u786e\u8ba4\u5b9a\u4f4d"),
    reLocCancel("reLocCancel", "\u53d6\u6d88\u91cd\u5b9a\u4f4d"),
    blockGroupStatus("blockGroupStatus", "\u67e5\u770b\u9ad8\u7ea7\u7ec4\u72b6\u6001"),
    getBlockGroup("getBlockGroup", "\u5360\u7528\u4e92\u65a5\u7ec4"),
    releaseBlockGroup("releaseBlockGroup", "\u91ca\u653e\u4e92\u65a5\u7ec4"),
    enableSoftEms("enableSoftEms", "\u542f\u7528\u8f6f\u6025\u505c"),
    disableSoftEms("disableSoftEms", "\u53d6\u6d88\u8f6f\u6025\u505c"),
    gotoSiteStart("gotoSiteStart", "\u5f00\u59cb\u5bfc\u822a"),
    gotoSitePause("gotoSitePause", "\u6682\u505c\u5bfc\u822a"),
    gotoSiteResume("gotoSiteResume", "\u7ee7\u7eed\u5bfc\u822a"),
    gotoSiteCancel("gotoSiteCancel", "\u53d6\u6d88\u5bfc\u822a"),
    clearMoveList("clearMoveList", "\u6e05\u9664\u6307\u5b9a\u5bfc\u822a\u8def\u5f84"),
    clearAllErrors("clearAllErrors", "\u6e05\u7a7a\u6240\u6709\u9519\u8bef\u4fe1\u606f"),
    clearRobotAllError("clearRobotAllError", "\u6e05\u7a7a\u6240\u6709\u673a\u5668\u4eba\u9519\u8bef\u4fe1\u606f"),
    energyThreshold("energyThreshold", "\u8bbe\u7f6e\u7535\u91cf\u9608\u503c"),
    setDO("setDO", "\u8bbe\u7f6eDO"),
    setDI("setDI", "\u8bbe\u7f6eDI"),
    removeDynamicObstacle("removeDynamicObstacle", "\u5220\u9664\u52a8\u6001\u969c\u788d\u7269"),
    addDynamicObstacle("addDynamicObstacle", "\u6dfb\u52a0\u52a8\u6001\u969c\u788d\u7269"),
    pauseRobotsInBlock("pauseRobotsInBlock", "\u533a\u57df\u5185\u673a\u5668\u4eba\u6025\u505c"),
    resumeRobotsInBlock("resumeRobotsInBlock", "\u533a\u57df\u5185\u673a\u5668\u4eba\u6025\u505c"),
    updateSiteFillStatus("binDetails", "\u66f4\u65b0\u5e93\u4f4d\u5360\u7528\u72b6\u6001"),
    updateOrderPriority("setPriority", "\u4fee\u6539\u4e0b\u53d1\u8fd0\u5355\u7684\u4f18\u5148\u7ea7"),
    updateOrderLabel("setLabel", "\u4fee\u6539\u4e0b\u53d1\u8fd0\u5355\u7684label"),
    setFull("setFull", "\u5206\u62e8\u76ee\u6807\u70b9\u7a7a\u6ee1"),
    distributeOrderDetails("distributeOrderDetails", "\u67e5\u8be2\u5206\u62e8\u5355\u72b6\u6001"),
    distributeTaskDone("distributeTaskDone", "\u5206\u62e8\u5355\u62a5\u544a\u653e\u8d27\u5b8c\u6210"),
    setRobotIO("setRobotIO", "\u8bbe\u7f6e\u673a\u5668\u4ebaIO\u72b6\u6001"),
    setSoftStop("setSoftIOEMC", "\u8bbe\u7f6e\u673a\u5668\u4eba\u8f6f\u6025\u505c"),
    deleteAllOrders("deleteAllOrders", "\u5220\u9664\u5168\u90e8\u8fd0\u5355"),
    licInfo("licInfo", "\u83b7\u53d6\u6388\u6743"),
    stopFork("stopFork", "\u505c\u6b62\u673a\u5668\u4eba\u8d27\u53c9"),
    setForkHeight("setForkHeight", "\u8bbe\u7f6e\u673a\u5668\u4eba\u8d27\u53c9\u9ad8\u5ea6"),
    controlMotion("controlMotion", "\u8bbe\u7f6e\u673a\u5668\u4eba\u5f00\u73af\u8fd0\u52a8"),
    orderDetailsByExternalId("orderDetailsByExternalId", "\u6839\u636e\u5916\u90e8id\u67e5\u8be2\u8fd0\u5355\u72b6\u6001"),
    generalRobokitAPI("generalRobokitAPI", "\u8bf7\u6c42\u673a\u5668\u4eba TCP API \u7684\u901a\u7528\u63a5\u53e3"),
    modifyChargeParam("modifyChargeParam", "\u4fee\u6539\u591a\u4e2a\u673a\u5668\u4eba\u7684\u81ea\u52a8\u5145\u7535\u9608\u503c"),
    queryChargeParam("getChargeParam", "\u67e5\u8be2\u591a\u4e2a\u673a\u5668\u4eba\u7684\u81ea\u52a8\u5145\u7535\u9608\u503c"),
    appendToLocList("appendToLocList", "\u52a8\u6001\u6dfb\u52a0\u5206\u62e8\u70b9"),
    removeFromToLocList("removeFromToLocList", "\u5220\u9664\u5206\u62e8\u70b9"),
    binDetails("binDetails", "\u67e5\u8be2\u6307\u5b9a\u5e93\u4f4d"),
    distributeSiteStatus("distributeSiteStatus", "\u67e5\u8be2\u5206\u62e8\u5355\u5206\u62e8\u70b9\u7684\u72b6\u6001"),
    sweepOrderDetails("sweepOrderDetails", "\u67e5\u8be2\u6e05\u626b\u8fd0\u5355"),
    fireStatus("isFire", "\u67e5\u8be2\u706b\u8b66\u533a\u57df"),
    dutyStatus("isOnDuty", "\u83b7\u53d6\u4e0a/\u4e0b\u73ed\u72b6\u6001"),
    dutyOperations("dutyOperations", "\u4fee\u6539\u4e0a/\u4e0b\u73ed\u72b6\u6001"),
    devicesDetails("devicesDetails", "\u67e5\u8be2\u63d0\u7535\u68af\u72b6\u6001"),
    callLift("callLift", "\u547c\u53eb\u7535\u68af"),
    enablePath("enablePath", "\u542f\u7528\u7ebf\u8def"),
    disablePath("disablePath", "\u7981\u7528\u7ebf\u8def"),
    enablePoint("enablePoint", "\u542f\u7528\u70b9\u4f4d"),
    disablePoint("disablePoint", "\u7981\u7528\u70b9\u4f4d"),
    blockDetailsById("blockDetailsById", "\u67e5\u8be2\u52a8\u4f5c");

    private String uri;
    private String desc;

    private ApiEnum(String uri, String desc) {
        this.uri = uri;
        this.desc = desc;
    }

    private ApiEnum() {
    }

    public String getUri() {
        return this.uri;
    }

    public String getDesc() {
        return this.desc;
    }
}

