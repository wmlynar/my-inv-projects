/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.constant.CommonCodeEnum
 */
package com.seer.rds.constant;

import java.util.Locale;

/*
 * Exception performing whole class analysis ignored.
 */
public enum CommonCodeEnum {
    SUCCESS(Integer.valueOf(200), "Success"),
    ERROR(Integer.valueOf(9000), "response.code.error"),
    PARAM_ERROR(Integer.valueOf(9001), "response.code.paramError"),
    LOGIN_ERROR(Integer.valueOf(9002), "response.code.loginError"),
    USER_NON(Integer.valueOf(9003), "response.code.userNon"),
    TOKEN_NON(Integer.valueOf(9004), "response.code.tokenNon"),
    SESSION_NON(Integer.valueOf(9005), "response.code.sessionNon"),
    ACCOUNT_FORBIDDEN(Integer.valueOf(9039), "response.code.accountForbidden"),
    METHOD_NOT_SUPPORTED(Integer.valueOf(9006), "response.code.methodNotSupported"),
    DATA_NON(Integer.valueOf(9007), "response.code.dataNon"),
    SCRIPT_FUNC_NON(Integer.valueOf(9008), "response.code.scriptFuncNon"),
    AUTH_FILE_ERROR(Integer.valueOf(9009), "response.code.authFileError"),
    ROBOT_STATUS_SYC_EXCEPTION(Integer.valueOf(9010), "response.code.robotStatusSycException"),
    SCRIPT_API_AUTH_ERROR(Integer.valueOf(9011), "response.code.scriptApiAuthError"),
    TASK_RUNNING(Integer.valueOf(9012), "response.code.taskRunning"),
    TASK_RUN_SUCCESS(Integer.valueOf(6013), "response.code.taskRunSuccess"),
    TASK_RUN_FAILED(Integer.valueOf(9013), "response.code.taskRunFailed"),
    TASK_RUN_FAILED_DUPLICATE(Integer.valueOf(9014), "response.code.taskRunFailedDuplicate"),
    FILE_NAME_EMPTY(Integer.valueOf(9015), "response.code.fileNameEmpty"),
    FILE_NAME_NOT_EXIST(Integer.valueOf(9016), "response.code.fileNameNotExist"),
    WS_MSG_SCENE_CHANGE(Integer.valueOf(6000), "response.code.wsMsgSceneChange"),
    WS_MSG_PDA_ALERT(Integer.valueOf(6001), "response.code.wsMsgPdaAlert"),
    WS_MSG_PDA_USER_ALERT(Integer.valueOf(6002), "response.code.wsMsgPdaUserAlert"),
    WS_MSG_SCRIPT_LOG(Integer.valueOf(6004), "response.code.wsMsgScriptLog"),
    WS_MSG_ALARM(Integer.valueOf(6005), "response.code.wsMsgAlarm"),
    WS_SITE_CHANGED(Integer.valueOf(6006), "response.code.wsSiteChanged"),
    WS_MSG_USER_ERROR_POP(Integer.valueOf(6007), "response.code.wsMsgUserErrorPop"),
    WS_MSG_USER_POP(Integer.valueOf(6008), "response.code.wsMsgUserPop"),
    WS_MSG_LOCAL_REPLAY_SCENE_CHANGE(Integer.valueOf(6009), "response.code.wsMsgLocalReplaySceneChange"),
    WS_MSG_OTHERS_REPLAY_SCENE_CHANGE(Integer.valueOf(6010), "response.code.wsMsgOthersReplaySceneChange"),
    WS_MSG_IN_REPLAYING_NOT_ALLOWED_UPLOAD(Integer.valueOf(6011), "response.code.inRelayingNotAllowedUpload"),
    WS_MSG_UPDATE_REPLAY_DATE(Integer.valueOf(6012), "response.code.updateReplayDate"),
    DEMAND_TASK_DISPATCHED(Integer.valueOf(6102), "response.code.demandTaskDispatched"),
    DEMAND_TASK_UPDATE_ERROR(Integer.valueOf(6103), "response.code.demandTaskUpdateError"),
    WS_MSG_USER_TIMING(Integer.valueOf(6104), "response.code.wsMsgUserTiming"),
    SYSTEM_LANGUAGE_ERROR(Integer.valueOf(9017), "response.code.languageError"),
    WIND_RESUME_ERROR(Integer.valueOf(9018), "response.code.windResumeError"),
    WIND_LABEL_ERROR(Integer.valueOf(9019), "response.code.windLabelError"),
    WIND_QUERY_ERROR(Integer.valueOf(9020), "response.code.windQueryError"),
    SCRIPT_CREATE_ERROR(Integer.valueOf(9021), "response.code.scriptCreateError"),
    REQUIRED_0OR1_ERROR(Integer.valueOf(9022), "response.code.required0Or1Error"),
    REQUIRED_0OR1ORNULL_ERROR(Integer.valueOf(9023), "response.code.required0Or1OrNullError"),
    SITE_ID_NOT_EXIST_ERROR(Integer.valueOf(9024), "response.code.siteIdNotExistError"),
    SITE_ID_ALREADY_EXIST_ERROR(Integer.valueOf(9025), "response.code.siteIdAlreadyExistError"),
    OAUTH_PARAMS(Integer.valueOf(9028), "response.code.oauthParams"),
    OAUTH_TOKEN(Integer.valueOf(9029), "response.code.oauthToken"),
    OAUTH_ERROR(Integer.valueOf(9031), "response.code.oauthError"),
    OAUTH_INVALID(Integer.valueOf(9032), "response.code.oauthInvalId"),
    UPLOAD_FILE_TYPE_ERROR(Integer.valueOf(9033), "response.code.uploadFileTypeError"),
    ROBOT_DISPATCH_IS_NULL(Integer.valueOf(9034), "response.code.RobotDispatchIsNull"),
    STAT_LEVEL_REQUIRED(Integer.valueOf(9035), "response.code.StatLevelNull"),
    STAT_TYPE_REQUIRED(Integer.valueOf(9036), "response.code.StatTypeNull"),
    STAT_TIME_REQUIRED(Integer.valueOf(9037), "response.code.StatTimeNull"),
    STAT_TIME_FORMAT_ERROR(Integer.valueOf(9038), "response.code.StatTimeFormatInvalid"),
    WIND_SETPRIORITY_ERROR(Integer.valueOf(9040), "response.code.SetPriorityError"),
    WIND_SETPRIORITY_TASKRECORDNO(Integer.valueOf(9041), "response.code.TaskRecordNo"),
    WIND_SETPRIORITY_TASKRECORDEND(Integer.valueOf(9042), "response.code.TaskRecordEnd"),
    REQUEST_PARMAS_ERROR(Integer.valueOf(9043), "response.code.paramsError"),
    OPERATOR_SHOWSQL_EXPANDCOLS(Integer.valueOf(9044), "response.code.expandCols"),
    OPERATOR_EXECUTE_SCRIPTERROR(Integer.valueOf(9045), "response.code.scriptError"),
    Interface_NOT_EXIST(Integer.valueOf(9046), "response.code.InterfaceNotExist"),
    Interface_IS_EXIST(Integer.valueOf(9047), "response.code.InterfaceIsExist"),
    Data_Cannot_Be_Empty(Integer.valueOf(9048), "response.code.DataCannotBeEmpty"),
    Ip_Already_In_Use(Integer.valueOf(9049), "response.code.IpAlreadyInUse"),
    Address_Already_In_Use(Integer.valueOf(9050), "response.code.AddressAlreadyInUse"),
    BasicAuth_Error(Integer.valueOf(9051), "response.code.BasicAuthFail"),
    General_Error_Disable(Integer.valueOf(9052), "response.code.GeneralDisable"),
    General_Delete_Msg(Integer.valueOf(9053), "response.code.GeneralDelete"),
    General_label_Repeat(Integer.valueOf(9054), "response.code.GeneralLabelRepeat"),
    Modbus_AddrName_Repeat(Integer.valueOf(9055), "response.code.AddrNameRepeat"),
    Data_Length_Error(Integer.valueOf(9056), "response.code.LengthError"),
    General_LabelLength_Error(Integer.valueOf(9057), "response.code.LabelLengthError"),
    UPLOAD_FILE_SIZE_ERROR(Integer.valueOf(9058), "response.code.uploadFileSizeError"),
    WRITE_ERROR(Integer.valueOf(9059), "response.code.writeError"),
    AGV_Operation_ERROR(Integer.valueOf(9060), "response.code.agvOperationError"),
    CONNECTION_SUCCESSFUL(Integer.valueOf(6014), "response.code.connectionSuccessful"),
    CONNECTION_FAILED(Integer.valueOf(9062), "response.code.connectionFailed"),
    QUERY_CHARGE_THRESHOLD_ERROR(Integer.valueOf(9063), "response.code.queryChargeThresholdError"),
    MODIFY_CHARGE_THRESHOLD_ERROR(Integer.valueOf(9064), "response.code.modifyChargeThresholdError"),
    ID_MISSING(Integer.valueOf(9065), "response.code.missId"),
    NAME_MISSING(Integer.valueOf(9066), "response.code.missName"),
    ID_DUPLICATED(Integer.valueOf(9067), "response.code.duplicateId"),
    NAME_DUPLICATED(Integer.valueOf(9068), "response.code.duplicateName"),
    STAT_PROPORTION_TYPE_SIZE_ERROR(Integer.valueOf(9069), "response.code.StatProportionTypeSizeError"),
    SCRIPT_INIT_ERROR(Integer.valueOf(10000), "response.code.scriptInitError"),
    CONFIG_INIT_ERROR(Integer.valueOf(10001), "response.code.configInitError"),
    MAP_DUPLICATE_SITE_ERROR(Integer.valueOf(10002), "response.code.mapDuplicateSiteError"),
    LANGUAGE_MIS_MATCH(Integer.valueOf(10007), "response.code.LanguageMismatch"),
    OPERATOR_DISTRIBUTE_NOENABLE(Integer.valueOf(10005), "response.code.distributeError"),
    UNAUTHORIZED(Integer.valueOf(10003), "response.code.UnAuthorized"),
    Event_IS_EXIST(Integer.valueOf(10004), "response.code.EventIsExist"),
    DISTRIBUTE_DEL_ERROR(Integer.valueOf(10006), "response.code.distributeDel"),
    SCRIPT_FILE_FILL(Integer.valueOf(10007), "response.code.fileFill"),
    SCRIPT_FILE_STOP(Integer.valueOf(10008), "response.code.scriptStop"),
    SCRIPT_DEBUG_STOP(Integer.valueOf(10009), "response.code.debugStop"),
    SCRIPT_BOOT_DIR(Integer.valueOf(10010), "response.code.scriptBoot"),
    SCRIPT_BOOT_DISENABLE(Integer.valueOf(10011), "response.code.scriptBootDisenable"),
    SCRIPT_FILE_MOVE(Integer.valueOf(10012), "response.code.scriptMove"),
    SCRIPT_FILE_MAXVALUE(Integer.valueOf(10013), "response.code.scriptMax"),
    SCRIPT_FILE_EXIST(Integer.valueOf(10014), "response.code.fileExist"),
    TASK_RESTRICTIONS_ERROR(Integer.valueOf(10015), "response.code.restrictions"),
    TASK_REPAIR_ERROR(Integer.valueOf(10016), "response.code.repair"),
    TASK_RESTRICTIONSREPAIR_ERROR(Integer.valueOf(10017), "response.code.restrictionsRepair"),
    WS_MSG_TASK_ERROR(Integer.valueOf(10018), "response.code.taskError");

    private Integer code;
    private String msg;

    public static String getMsgByLanguage(Integer code, Locale language) {
        CommonCodeEnum[] values;
        for (CommonCodeEnum e : values = CommonCodeEnum.values()) {
            if (!e.getCode().equals(code)) continue;
            return e.getMsg();
        }
        return null;
    }

    public static String getMsgByCode(Integer code) {
        CommonCodeEnum[] values;
        for (CommonCodeEnum e : values = CommonCodeEnum.values()) {
            if (!e.getCode().equals(code)) continue;
            return e.getMsg();
        }
        return null;
    }

    private CommonCodeEnum(Integer code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    private CommonCodeEnum() {
    }

    public Integer getCode() {
        return this.code;
    }

    public String getMsg() {
        return this.msg;
    }
}

