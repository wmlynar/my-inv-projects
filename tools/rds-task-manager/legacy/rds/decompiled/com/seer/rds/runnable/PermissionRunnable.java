/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  cn.hutool.core.io.resource.ClassPathResource
 *  com.seer.rds.constant.PermissionTypeEnum
 *  com.seer.rds.dao.PermissionMapper
 *  com.seer.rds.model.admin.Permission
 *  com.seer.rds.runnable.PermissionRunnable
 *  com.seer.rds.util.SpringUtil
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.yaml.snakeyaml.Yaml
 */
package com.seer.rds.runnable;

import cn.hutool.core.io.resource.ClassPathResource;
import com.seer.rds.constant.PermissionTypeEnum;
import com.seer.rds.dao.PermissionMapper;
import com.seer.rds.model.admin.Permission;
import com.seer.rds.util.SpringUtil;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.yaml.snakeyaml.Yaml;

public class PermissionRunnable
implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(PermissionRunnable.class);

    @Override
    public void run() {
        PermissionMapper permissionMapper = (PermissionMapper)SpringUtil.getBean(PermissionMapper.class);
        permissionMapper.deleteAll();
        ArrayList<Permission> Permissions = new ArrayList<Permission>();
        ClassPathResource resource = new ClassPathResource("permission.yml");
        try (InputStream inputStream = resource.getStream();){
            Yaml yaml = new Yaml();
            Map permissionMap = (Map)yaml.load(inputStream);
            for (Map.Entry next : permissionMap.entrySet()) {
                String key = (String)next.getKey();
                int type = 0;
                if (PermissionTypeEnum.WEB.getDesc().equals(key)) {
                    type = PermissionTypeEnum.WEB.getStatus();
                } else if (PermissionTypeEnum.OPERATOR.getDesc().equals(key)) {
                    type = PermissionTypeEnum.OPERATOR.getStatus();
                } else if (PermissionTypeEnum.INTERFACE.getDesc().equals(key)) {
                    type = PermissionTypeEnum.INTERFACE.getStatus();
                } else if (PermissionTypeEnum.DATA.getDesc().equals(key)) {
                    type = PermissionTypeEnum.DATA.getStatus();
                }
                for (Map.Entry nextInner : ((Map)next.getValue()).entrySet()) {
                    Permissions.add(Permission.builder().name((String)nextInner.getKey()).description((String)nextInner.getValue()).type(Integer.valueOf(type)).build());
                }
            }
        }
        catch (Exception e) {
            log.error("\u8bfb\u53d6permission-biz\u6587\u4ef6\u5931\u8d25", (Throwable)e);
        }
        this.savePermission(Permissions);
    }

    private void savePermission(List<Permission> permissions) {
        PermissionMapper permissionMapper = (PermissionMapper)SpringUtil.getBean(PermissionMapper.class);
        permissionMapper.saveAllAndFlush(permissions);
    }
}

