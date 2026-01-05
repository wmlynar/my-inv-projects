
STATUS = {
    1000: 'robot_status_info_req',  # 查询机器人信息
    1002: 'robot_status_run_req',  # 查询机器人的运行状态信息
    1003: 'robot_status_mode_req',  # 查询机器人运行模式
    1004: 'robot_status_loc_req',  # 查询机器人位置
    1005: 'robot_status_speed_req',  # 查询机器人速度
    1006: 'robot_status_block_req',  # 查询机器人是否被阻挡
    1007: 'robot_status_battery_req',  # 查询机器人电池状态
    1008: 'robot_status_brake_req',  # 查询机器人是否抱闸
    1009: 'robot_status_laser_req',  # 查询机器人的当前激光雷达数据
    1010: 'robot_status_path_req',  # 查询机器人的当前路径数据
    1011: 'robot_status_area_req',  # 查询机器人当前所在的区域
    1012: 'robot_status_emergency_req',  # 查询机器人急停是否处于激活状态
    1020: 'robot_status_task_req',  # 查询机器人当前任务状态
    1021: 'robot_status_reloc_req',  # 查询机器人当前的重定位状态
    1022: 'robot_status_loadmap_req',  # 查询机器人当前的载入地图状态
    1024: 'robot_status_tracking_req',  # 查询机器人当前的跟随状态
    1025: 'robot_status_slam_req',  # 查询机器人当前的扫图状态
    1050: 'robot_status_alarm_req',  # 查询机器人的错误告警状态
    1100: 'robot_status_all1_req',  # 查询1000-1012, 1020-1025, 1050的所有信息
    # 查询 1003,1004,1005,1006,1008,1009,1010,1011,1012,1020,1050 的信息
    1101: 'robot_status_all2_req',
    1102: 'robot_status_all3_req',  # 查询1002,1007,1021,1022,1023,1024,1025的信息
    1111: 'robot_status_init_req',  # 查询机器人的初始化状态
    1300: 'robot_status_map_req',  # 查询机器人载入的地图以及储存的地图
    1400: 'robot_status_params_req',  # 查询机器人的参数
    # 1500: 'robot_status_model_req',  # 查询机器人模型
    1013: 'robot_status_io_req',  # 查询机器人IO数据
    1103: 'robot_status_all4_req',  # 查询批量数据4
    1301: 'robot_status_station',  # 查询机器人当前载入地图中的站点信息
    1016: 'robot_status_ultrasonlc_req',  # 查询机器人的超声传感器数据
    # 1510: 'robot_status_calib_req',  # 查询机器人当前的标定参数
    1018: 'robot_status_polygon_req',  # 查询机器人各种多边形数据
    1019: 'robot_status_obstacle_req',  # 查询机器人的动态障碍物信息
    1026: 'robot_status_tasklist_req',  # 查询任务链状态
    1023: 'robot_status_calibration_req',  # 查询机器人的标定状态
}

R_STATUS = {
    'robot_status_info_req': 1000,  # 查询机器人信息
    'robot_status_run_req': 1002,  # 查询机器人的运行状态信息
    'robot_status_mode_req': 1003,  # 查询机器人运行模式
    'robot_status_loc_req': 1004,  # 查询机器人位置
    'robot_status_speed_req': 1005,  # 查询机器人速度
    'robot_status_block_req': 1006,  # 查询机器人是否被阻挡
    'robot_status_battery_req': 1007,  # 查询机器人电池状态
    'robot_status_brake_req': 1008,  # 查询机器人是否抱闸
    'robot_status_laser_req': 1009,  # 查询机器人的当前激光雷达数据
    'robot_status_path_req': 1010,  # 查询机器人的当前路径数据
    'robot_status_area_req': 1011,  # 查询机器人当前所在的区域
    'robot_status_emergency_req': 1012,  # 查询机器人急停是否处于激活状态
    'robot_status_task_req': 1020,  # 查询机器人当前任务状态
    'robot_status_reloc_req': 1021,  # 查询机器人当前的重定位状态
    'robot_status_loadmap_req': 1022,  # 查询机器人当前的载入地图状态
    'robot_status_tracking_req': 1024,  # 查询机器人当前的跟随状态
    'robot_status_slam_req': 1025,  # 查询机器人当前的扫图状态
    'robot_status_alarm_req': 1050,  # 查询机器人的错误告警状态
    'robot_status_all1_req': 1100,  # 查询1000-1012, 1020-1025, 1050的所有信息
    # 查询 1003,1004,1005,1006,1008,1009,1010,1011,1012,1020,1050 的信息
    'robot_status_all2_req': 1101,
    'robot_status_all3_req': 1102,  # 查询1002,1007,1021,1022,1023,1024,1025的信息
    'robot_status_init_req': 1111,  # 查询机器人的初始化状态
    'robot_status_map_req': 1300,  # 查询机器人载入的地图以及储存的地图
    'robot_status_params_req': 1400,  # 查询机器人的参数
    # 'robot_status_model_req': 1500,  # 查询机器人模型
    'robot_status_io_req': 1013,  # 查询机器人IO数据
    'robot_status_all4_req': 1103,  # 查询批量数据4
    'robot_status_imu_req': 1014,
    'robot_status_station': 1301,  # 查询机器人当前载入地图中的站点信息
    'robot_status_ultrasonlc_req': 1016,  # 查询机器人的超声传感器数据
    # 'robot_status_calib_req': 1510,  # 查询机器人当前的标定参数
    'robot_status_polygon_req': 1018,  # 查询机器人各种多边形数据
    'robot_status_obstacle_req': 1019,  # 查询机器人的动态障碍物信息
    'robot_status_tasklist_req': 1026,  # 查询任务链状态
    'robot_status_calibration_req': 1023,  # 查询机器人的标定状态
}

CONTROL = {
    2000: 'robot_control_stop_req',  # 机器人停止运动
    2001: 'robot_control_gyrocal_req',  # 标定陀螺仪
    2002: 'robot_control_reloc_req',  # 机器人重定位
    2003: 'robot_control_comfirmloc_req',  # 确认重定位正确
    2010: 'robot_control_motion_req',  # 手动控制(开环运动)
    2022: 'robot_control_loadmap_req',  # 切换机器人载入的地图，只有在手动模式下才能操作
    2004: 'robot_control_cancelreloc_req',  # 取消重定位
    2005: 'robot_control_clearencoder_req',  # 用于叉车上拉线编码器的标零
}
R_CONTROL = {
    'robot_control_stop_req': 2000,  # 机器人停止运动
    'robot_control_gyrocal_req': 2001,  # 标定陀螺仪
    'robot_control_reloc_req': 2002,  # 机器人重定位
    'robot_control_comfirmloc_req': 2003,  # 确认重定位正确
    'robot_control_motion_req': 2010,  # 手动控制(开环运动)
    'robot_control_loadmap_req': 2022,  # 切换机器人载入的地图，只有在手动模式下才能操作
    'robot_control_cancelreloc_req': 2004,  # 取消重定位
    'robot_control_clearencoder_req': 2005,  # 用于叉车上拉线编码器的标零
}

TASK = {
    3001: 'robot_task_pause_req',  # 机器人暂停当前任务
    3002: 'robot_task_resume_req',  # 机器人继续当前任务
    3003: 'robot_task_cancel_req',  # 机器人取消当前任务
    3050: 'robot_task_gopoint_req',  # 自由导航(根据地图上的坐标值或站点自由规划路径导航)
    3051: 'robot_task_gotarget_req',  # 路径导航(根据地图上站点及路径进行导航)
    3055: 'robot_task_translate_req',  # 平动，以固定速度直线运动固定距离
    3056: 'robot_task_turn_req',  # 转动，以固定角速度旋转固定角度
    3100: 'robot_tasklist_req',  # 执行任务链
    3101: 'robot_tasklist_status_req',  # 任务链状态
    3102: 'robot_tasklist_pause_req',  # 任务链暂停
    3103: 'robot_tasklist_resume_req',  # 任务链继续
    3104: 'robot_tasklist_cancel_req',  # 任务链取消
    3105: 'robot_tasklist_next_req',  # 任务链Next
    3110: 'robot_tasklist_result_req',  # 任务链结果
    3111: 'robot_tasklist_result_list_req',  # 任务链结果清单
    3112: 'robot_tasklist_upload_req',  # 任务链上传
    3113: 'robot_tasklist_download_req',  # 任务链下载
    3114: 'robot_tasklist_delete_req',  # 任务链删除
    3115: 'robot_tasklist_list_req',  # 任务链清单
    3106: 'robot_tasklist_name_req',  # 执行预存的任务链
    3057: 'robot_task_gostart_req',  # 去起始点
    3058: 'robot_task_goend_req',  # 去终止点
    3059: 'robot_task_gowait_req',  # 去待命
    3060: 'robot_task_charge_req',  # 去充电
    3080: 'robot_task_calibwheel_req',  # 标定轮子
    3081: 'robot_task_caliblaser_req',  # 标定激光
    3089: 'robot_task_calibcancel_req',  # 取消标定任务
    3063: 'robot_task_goshelf_req',  # 钻货架
    3090: 'robot_task_calibclear_req',  # 标定参数清零（只在非标定状态下有效）
    3082: 'robot_task_calibminspeed_req',  # 标定最小速度
    3061: 'robot_task_test_req',  # 跑测试 Skill
    3070: 'robot_task_uwb_follow_req',  # UWB 跟随
    3053: 'robot_task_target_path_req',  # 获取路径导航的路径
}

R_TASK = {
    'robot_task_pause_req': 3001,  # 机器人暂停当前任务
    'robot_task_resume_req': 3002,  # 机器人继续当前任务
    'robot_task_cancel_req': 3003,  # 机器人取消当前任务
    'robot_task_gopoint_req': 3050,  # 自由导航(根据地图上的坐标值或站点自由规划路径导航)
    'robot_task_gotarget_req': 3051,  # 路径导航(根据地图上站点及路径进行导航)
    'robot_task_translate_req': 3055,  # 平动，以固定速度直线运动固定距离
    'robot_task_turn_req': 3056,  # 转动，以固定角速度旋转固定角度
    'robot_tasklist_req': 3100,  # 执行任务链
    'robot_tasklist_status_req': 3101,  # 任务链状态
    'robot_tasklist_pause_req': 3102,  # 任务链暂停
    'robot_tasklist_resume_req': 3103,  # 任务链继续
    'robot_tasklist_cancel_req': 3104,  # 任务链取消
    'robot_tasklist_next_req': 3105,  # 任务链Next
    'robot_tasklist_result_req': 3110,  # 任务链结果
    'robot_tasklist_result_list_req': 3111,  # 任务链结果清单
    'robot_tasklist_upload_req': 3112,  # 任务链上传
    'robot_tasklist_download_req': 3113,  # 任务链下载
    'robot_tasklist_delete_req': 3114,  # 任务链删除
    'robot_tasklist_list_req': 3115,  # 任务链清单
    'robot_tasklist_name_req': 3106,  # 执行预存的任务链
    'robot_task_gostart_req': 3057,  # 去起始点
    'robot_task_goend_req': 3058,  # 去终止点
    'robot_task_gowait_req': 3059,  # 去待命
    'robot_task_charge_req': 3060,  # 去充电
    'robot_task_calibwheel_req': 3080,  # 标定轮子
    'robot_task_caliblaser_req': 3081,  # 标定激光
    'robot_task_calibcancel_req': 3089,  # 取消标定任务
    'robot_task_goshelf_req': 3063,  # 钻货架
    'robot_task_calibclear_req': 3090,  # 标定参数清零（只在非标定状态下有效）
    'robot_task_calibminspeed_req': 3082,  # 标定最小速度
    'robot_task_test_req': 3061,  # 跑测试 Skill
    'robot_task_uwb_follow_req': 3070,  # UWB 跟随
    'robot_task_target_path_req': 3053,  # 获取路径导航的路径
}

ERROR = {
    19204: 'E_StatusTcp',
    19205: 'E_ControlTcp',
    19206: 'E_TaskTcp',
    19207: 'E_ConfigTcp',
    19208: 'E_CoreTcp',
    10000: 'E_ErrorCommand',
    19210: 'E_OtherTcp',
    19200: 'E_UpdateTcp',
}

CONFIG = {
    4000: 'robot_config_mode_req',  # 切换机器人运行状态(手动,自动)
    4010: 'robot_config_uploadmap_req',  # 上传地图到 机器人见地图格式
    4011: 'robot_config_downloadmap_req',  # 从机器器⼈人上下载地图[map_name]string{地 图名称}
    4012: 'robot_config_removemap_req',  # 从机器人上删除地图[map_name]string
    4020: 'robot_config_download2d_req',  # 下载2d文件
    4100: 'robot_config_setparams_req',  # 配置机器人参数
    4101: 'robot_config_saveparams_req',  # 配置并保存机器人参数
    4102: 'robot_config_reloadparams_req',  # 重载机器人参数
    4300: 'robot_config_clearfatal_req',  # 清除机器人所有的Fatal错误码
    4204: 'robot_config_calib_req',  # 设置机器人的标定参数
    4200: 'robot_config_model_req',  # 更新机器人模型
    4999: 'robot_config_debug_gui_req',  # 启动QtDebugGui
    4016: 'robot_config_uploadmap2_req',  # 从机器人上传地图(二进制)
    4017: 'robot_config_downloadmap2_req',  # 从机器人下载地图(二进制)
    4130: 'robot_config_ultrasonic_req',  # 激活或禁用超声
    4140: 'robot_config_di_req',  # 激活或禁用 DI
    4350: 'robot_config_addobstacle_req',  # 插入动态障碍物(机器人坐标系)
    4351: 'robot_config_addgobstacle_req',  # 插入动态障碍物(世界坐标系)
    4352: 'robot_config_removeobstacle_req',  # 移除动态障碍物
    4002: 'robot_config_releasecontrol_req',  # 将控制权限交给调度服务器
    4001: 'robot_config_recyclingcontrol_req',  # 将控制权限从调度服务器回收过来
    4030: 'robot_config_downloadcalib_req',  # 获取calib
    4205: 'robot_config_calib_clear_laser_req',  # 清除激光标定数据
    4206: 'robot_config_calib_clear_chasis_req',  # 清除底盘标定数据
    4207: 'robot_config_calib_clear_capability_req',  # 清楚能力标定数据
    4208: 'robot_config_calib_clear_all_req',  # 清除所有标定数据
}

R_CONFIG = {
    'robot_config_mode_req' : 4000, # 切换机器人运行状态(手动,自动)
'robot_config_uploadmap_req' : 4010, # 上传地图到 机器人见地图格式
'robot_config_downloadmap_req' : 4011, # 从机器器⼈人上下载地图[map_name]string{地 图名称}
'robot_config_removemap_req' : 4012, # 从机器人上删除地图[map_name]string
'robot_config_download2d_req' : 4020, # 下载2d文件
'robot_config_setparams_req' : 4100, # 配置机器人参数
'robot_config_saveparams_req' : 4101, # 配置并保存机器人参数
'robot_config_reloadparams_req' : 4102, # 重载机器人参数
'robot_config_clearfatal_req' : 4300, # 清除机器人所有的Fatal错误码
'robot_config_calib_req' : 4204, # 设置机器人的标定参数
'robot_config_model_req' : 4200, # 更新机器人模型
'robot_config_debug_gui_req' : 4999, # 启动QtDebugGui
'robot_config_uploadmap2_req' : 4016, # 从机器人上传地图(二进制)
'robot_config_downloadmap2_req' : 4017, # 从机器人下载地图(二进制)
'robot_config_ultrasonic_req' : 4130, # 激活或禁用超声
'robot_config_di_req' : 4140, # 激活或禁用 DI
'robot_config_addobstacle_req' : 4350, # 插入动态障碍物(机器人坐标系)
'robot_config_addgobstacle_req' : 4351, # 插入动态障碍物(世界坐标系)
'robot_config_removeobstacle_req' : 4352, # 移除动态障碍物
'robot_config_releasecontrol_req' : 4002, # 将控制权限交给调度服务器
'robot_config_recyclingcontrol_req' : 4001, # 将控制权限从调度服务器回收过来
'robot_config_downloadcalib_req' : 4030, # 获取calib
'robot_config_calib_clear_laser_req' : 4205, # 清除激光标定数据
'robot_config_calib_clear_chasis_req' : 4206, # 清除底盘标定数据
'robot_config_calib_clear_capability_req' : 4207, # 清楚能力标定数据
'robot_config_calib_clear_all_req' : 4208, # 清除所有标定数据
}

OTHER = {
    5000: 'robot_core_shutdown_req',  # 关闭机器人，机器人将断电并失去控制
    5001: 'robot_core_end_req',  # 停止机器人程序, 机器人将停止工作, 但不会断电
    5002: 'robot_core_start_req',  # 启动机器人程序
    5003: 'robot_core_reboot_req',  # 重启机器人, 重启期间连接将断开
    5004: 'robot_core_restart_req',  # 重启机器人程序
    5010: 'robot_core_config_req',  # 配置robod
    5011: 'robot_core_status_req',  # 查询状态
    5012: 'robot_core_uscript_req',  # 上传脚本到机器人
    5104: 'robot_updateself_req',  # 更新roboupdater自己
    5105: 'robot_updaterobod_req',  # 更新robod
    5106: 'robot_updaterobokit_cover_req',  # 更新RoboKit覆盖
    5005: 'robot_core_resetdsp_req',  # 重置机器人固件
    5020: 'robot_core_wifi_req',  # 连接无线网络
    5021: 'robot_core_setip_req',  # 配置机器人无线网络的IP
    5022: 'robot_core_net_req',  # 查询机器人当前的无线网络信息
    5023: 'robot_core_wifilist_req',  # 查询机器人扫描到的无线网络列表
    5100: 'robot_core_filelist_req',  # 查询某路径下的文件列表
    5101: 'robot_core_getfile_req',  # 获取某路径下的文件
    5102: 'robot_core_removefile_req',  # 删除某路径下的文件
    5031: 'robot_core_hotspot_config_req',  # 配置机器人的热点参数
    5032: 'robot_core_hotspot_start_req',  # 启动机器人热点
    5033: 'robot_core_hotspot_stop_req',  # 停止机器人热点
    5034: 'robot_core_hotspot_fix_req',  # 修复机器人热点
    5041: 'robot_core_robod_version_req',  # 查询robod版本
    5035: 'robot_core_hotspot_status_req',  # 查询热点状态
    5103: 'robot_core_copyabledirs_req',  # 查询机器人上可以下载的所有文件夹名称
    5042: 'robot_core_robod_all1_req',  # 压缩所有相关调试信息文件，传输给客户端
    5043: 'robot_core_robod_id_req',  # 查询固件唯一id，等同Robokit的id
    5107: 'robot_updaterobokit_renew_req',  # 更新Robokit替换
    5108: 'robot_core_robod_export_req',  # 导出
    5109: 'robot_core_robod_import_req',  # 导入
    5110: 'robot_core_uploadfile_req',  # 上传配置文件
}

R_OTHER = {
    'robot_core_shutdown_req' : 5000, # 关闭机器人，机器人将断电并失去控制
'robot_core_end_req' : 5001, # 停止机器人程序, 机器人将停止工作, 但不会断电
'robot_core_start_req' : 5002, # 启动机器人程序
'robot_core_reboot_req' : 5003, # 重启机器人, 重启期间连接将断开
'robot_core_restart_req' : 5004, # 重启机器人程序
'robot_core_config_req' : 5010, # 配置robod
'robot_core_status_req' : 5011, # 查询状态
'robot_core_uscript_req' : 5012, # 上传脚本到机器人
'robot_updateself_req' : 5104, # 更新roboupdater自己
'robot_updaterobod_req' : 5105, # 更新robod
'robot_updaterobokit_cover_req' : 5106, # 更新RoboKit覆盖
'robot_core_resetdsp_req' : 5005, # 重置机器人固件
'robot_core_wifi_req' : 5020, # 连接无线网络
'robot_core_setip_req' : 5021, # 配置机器人无线网络的IP
'robot_core_net_req' : 5022, # 查询机器人当前的无线网络信息
'robot_core_wifilist_req' : 5023, # 查询机器人扫描到的无线网络列表
'robot_core_filelist_req' : 5100, # 查询某路径下的文件列表
'robot_core_getfile_req' : 5101, # 获取某路径下的文件
'robot_core_removefile_req' : 5102, # 删除某路径下的文件
'robot_core_hotspot_config_req' : 5031, # 配置机器人的热点参数
'robot_core_hotspot_start_req' : 5032, # 启动机器人热点
'robot_core_hotspot_stop_req' : 5033, # 停止机器人热点
'robot_core_hotspot_fix_req' : 5034, # 修复机器人热点
'robot_core_robod_version_req' : 5041, # 查询robod版本
'robot_core_hotspot_status_req' : 5035, # 查询热点状态
'robot_core_copyabledirs_req' : 5103, # 查询机器人上可以下载的所有文件夹名称
'robot_core_robod_all1_req' : 5042, # 压缩所有相关调试信息文件，传输给客户端
'robot_core_robod_id_req' : 5043, # 查询固件唯一id，等同Robokit的id
'robot_updaterobokit_renew_req' : 5107, # 更新Robokit替换
'robot_core_robod_export_req' : 5108, # 导出
'robot_core_robod_import_req' : 5109, # 导入
'robot_core_uploadfile_req' : 5110, # 上传配置文件
}