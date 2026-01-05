/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.fasterxml.jackson.databind.JsonNode
 *  com.fasterxml.jackson.databind.ObjectMapper
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.config.SecurityConfig
 *  com.seer.rds.constant.UserStatusEnum
 *  com.seer.rds.constant.UserTypeEnum
 *  com.seer.rds.dao.PermissionMapper
 *  com.seer.rds.dao.RoleMapper
 *  com.seer.rds.dao.UserConfigRecordMapper
 *  com.seer.rds.dao.UserMapper
 *  com.seer.rds.dao.UserRoleMapper
 *  com.seer.rds.model.admin.Permission
 *  com.seer.rds.model.admin.Role
 *  com.seer.rds.model.admin.User
 *  com.seer.rds.model.admin.UserConfigRecord
 *  com.seer.rds.model.admin.UserRole
 *  com.seer.rds.service.admin.UserService
 *  com.seer.rds.service.admin.impl.UserServiceImpl
 *  com.seer.rds.vo.UserReqVo
 *  com.seer.rds.vo.UserResp
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  javax.annotation.PostConstruct
 *  javax.persistence.EntityManager
 *  javax.persistence.PersistenceContext
 *  javax.persistence.criteria.Expression
 *  javax.transaction.Transactional
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.stereotype.Service
 *  org.springframework.util.CollectionUtils
 */
package com.seer.rds.service.admin.impl;

import com.alibaba.fastjson.JSONObject;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seer.rds.config.PropConfig;
import com.seer.rds.config.SecurityConfig;
import com.seer.rds.constant.UserStatusEnum;
import com.seer.rds.constant.UserTypeEnum;
import com.seer.rds.dao.PermissionMapper;
import com.seer.rds.dao.RoleMapper;
import com.seer.rds.dao.UserConfigRecordMapper;
import com.seer.rds.dao.UserMapper;
import com.seer.rds.dao.UserRoleMapper;
import com.seer.rds.model.admin.Permission;
import com.seer.rds.model.admin.Role;
import com.seer.rds.model.admin.User;
import com.seer.rds.model.admin.UserConfigRecord;
import com.seer.rds.model.admin.UserRole;
import com.seer.rds.service.admin.UserService;
import com.seer.rds.vo.UserReqVo;
import com.seer.rds.vo.UserResp;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.response.PaginationResponseVo;
import java.io.File;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import javax.annotation.PostConstruct;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.criteria.Expression;
import javax.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

@Service
public class UserServiceImpl
implements UserService {
    private static final Logger log = LoggerFactory.getLogger(UserServiceImpl.class);
    @PersistenceContext
    private EntityManager entityManager;
    @Autowired
    private UserMapper userMapper;
    @Autowired
    private RoleMapper roleMapper;
    @Autowired
    private UserRoleMapper userRoleMapper;
    @Autowired
    private PermissionMapper permissionMapper;
    @Autowired
    private UserConfigRecordMapper userConfigRecordMapper;
    @Autowired
    private PropConfig propConfig;
    @Autowired
    private SecurityConfig securityConfig;
    public static ConcurrentHashMap<String, String> UserPermission = new ConcurrentHashMap();

    public User findByUsername(String username) {
        List findByUsername = this.userMapper.findByUsernameAndStatus(username, 0);
        return findByUsername != null && !findByUsername.isEmpty() ? (User)findByUsername.get(0) : null;
    }

    public User findByUsernameAvailable(String username) {
        List users = this.userMapper.findAll((Specification & Serializable)(root, query, cb) -> cb.and((Expression)cb.equal((Expression)root.get("username"), (Object)username), (Expression)cb.notEqual((Expression)root.get("status"), (Object)UserStatusEnum.DELETED.getStatus())));
        return users != null && !users.isEmpty() ? (User)users.get(0) : null;
    }

    public User findById(String id) {
        User user = this.userMapper.findById((Object)id).orElse(null);
        return user;
    }

    @Transactional
    public PaginationResponseVo findAllUser(PaginationReq<User> req) {
        int page = req.getCurrentPage();
        int size = req.getPageSize();
        User queryUser = (User)req.getQueryParam();
        PageRequest pageable = PageRequest.of((int)(page - 1), (int)size);
        Page sites = this.userMapper.findAll((Specification)new /* Unavailable Anonymous Inner Class!! */, (Pageable)pageable);
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(sites.getTotalElements()));
        paginationResponseVo.setCurrentPage(Integer.valueOf(page));
        paginationResponseVo.setPageSize(Integer.valueOf(size));
        paginationResponseVo.setTotalPage(Integer.valueOf(sites.getTotalPages()));
        ArrayList<UserResp> userList = new ArrayList<UserResp>();
        for (int i = 0; i < sites.getContent().size(); ++i) {
            UserResp user = new UserResp();
            user.setCreateTime(((User)sites.getContent().get(i)).getCreateTime());
            user.setId(((User)sites.getContent().get(i)).getId());
            user.setModifyTime(((User)sites.getContent().get(i)).getModifyTime());
            String userId = ((User)sites.getContent().get(i)).getId();
            List rolesList = this.roleMapper.findByUid(((User)sites.getContent().get(i)).getId());
            user.setRoles(rolesList);
            user.setStatus(((User)sites.getContent().get(i)).getStatus());
            user.setType(((User)sites.getContent().get(i)).getType());
            user.setUsername(((User)sites.getContent().get(i)).getUsername());
            user.setPassword(((User)sites.getContent().get(i)).getPassword());
            if (this.securityConfig.getDisableShowUserInfo() != null && this.securityConfig.getDisableShowUserInfo().booleanValue()) {
                user.setPassword("******");
            }
            userList.add(user);
        }
        paginationResponseVo.setPageList(userList);
        return paginationResponseVo;
    }

    public List<String> getAllPermName() {
        return this.permissionMapper.findAll().stream().map(Permission::getName).collect(Collectors.toList());
    }

    public List<Role> findRoleByUserName(String username) {
        User user = this.findByUsername(username);
        if (user == null) {
            return null;
        }
        List roles = this.roleMapper.findByUid(user.getId());
        return roles;
    }

    @Transactional
    public void UpdateUser(UserReqVo req) {
        User user = new User();
        user.setId(req.getId());
        user.setPassword(req.getPassword());
        user.setStatus(req.getStatus());
        user.setType(req.getType());
        user.setUsername(req.getUsername());
        user.setCreateTime(req.getCreateTime());
        user.setModifyTime(req.getModifyTime());
        this.userMapper.save((Object)user);
        List userRoles = this.userRoleMapper.findByUid(user.getId());
        if (!CollectionUtils.isEmpty((Collection)userRoles)) {
            this.userRoleMapper.deleteAll((Iterable)userRoles);
        }
        for (int i = 0; i < req.getRoles().size(); ++i) {
            JSONObject roleMesg = (JSONObject)req.getRoles().get(i);
            String rid = roleMesg.getString("id");
            UserRole userRole = new UserRole();
            userRole.setRid(rid);
            userRole.setUid(user.getId());
            this.userRoleMapper.save(userRole);
        }
    }

    public void deleteByUsernames(List<String> usernames) {
        this.userMapper.deleteUsersByUsername(usernames.stream().filter(name -> !Objects.equals(name, "admin")).collect(Collectors.toList()));
        log.info("delete users: " + usernames + " successfully!!");
    }

    public List<User> findAll() {
        return this.userMapper.findAll();
    }

    public void save(User user) {
        this.userMapper.save((Object)user);
    }

    public void saveUserAndRoles(UserReqVo userReqVo) {
        User user = new User();
        user.setId(userReqVo.getId());
        user.setPassword(userReqVo.getPassword());
        user.setStatus(userReqVo.getStatus());
        user.setType(userReqVo.getType());
        user.setUsername(userReqVo.getUsername());
        user.setCreateTime(userReqVo.getCreateTime());
        user.setModifyTime(userReqVo.getModifyTime());
        this.userMapper.save((Object)user);
        for (int i = 0; i < userReqVo.getRoles().size(); ++i) {
            JSONObject roleMesg = (JSONObject)userReqVo.getRoles().get(i);
            String rid = roleMesg.getString("id");
            UserRole userRole = new UserRole();
            userRole.setRid(rid);
            userRole.setUid(user.getId());
            this.userRoleMapper.save(userRole);
        }
    }

    @PostConstruct
    private void init() {
        List exsitAdminUser = this.userMapper.findByUsername("admin");
        String adminUserId = "";
        if (CollectionUtils.isEmpty((Collection)exsitAdminUser)) {
            User adminUser = User.builder().username("admin").password("e10adc3949ba59abbe56e057f20f883e").createTime(new Date()).modifyTime(new Date()).type(Integer.valueOf(UserTypeEnum.admin.getStatus())).status(Integer.valueOf(UserStatusEnum.ENABLED.getStatus())).build();
            this.userMapper.save((Object)adminUser);
            adminUserId = adminUser.getId();
        } else {
            for (User user : exsitAdminUser) {
                if (!user.getUsername().equals("admin")) continue;
                user.setType(Integer.valueOf(UserTypeEnum.admin.getStatus()));
                this.userMapper.save((Object)user);
                adminUserId = user.getId();
                List roles = this.roleMapper.findByCode("admin");
                if (CollectionUtils.isEmpty((Collection)roles)) break;
                Role adminRole = (Role)roles.get(0);
                List userRoles = this.userRoleMapper.findByUidAndRid(user.getId(), adminRole.getId());
                if (!CollectionUtils.isEmpty((Collection)userRoles)) {
                    this.userRoleMapper.deleteById((Object)((UserRole)userRoles.get(0)).getId());
                }
                this.roleMapper.deleteById((Object)adminRole.getId());
                break;
            }
        }
        if (!adminUserId.isEmpty()) {
            UserConfigRecord userConfigRecord;
            List task_static = this.userConfigRecordMapper.findUserConfigRecordByUserKey("TASK_STATIC");
            List agv_static = this.userConfigRecordMapper.findUserConfigRecordByUserKey("AGV_STASTIC");
            List order_static = this.userConfigRecordMapper.findUserConfigRecordByUserKey("ORDER_STATIC");
            ObjectMapper mapper = new ObjectMapper();
            String taskValue = null;
            String agvValue = null;
            String orderValue = null;
            try {
                File file = new File(this.propConfig.getRdsStaticDir() + File.separator + "stats.json");
                JsonNode rootNode = mapper.readTree(file);
                JsonNode taskNode = rootNode.get("TASK_STATIC");
                taskValue = taskNode.toString();
                JsonNode agvNode = rootNode.get("AGV_STASTIC");
                agvValue = agvNode.toString();
                JsonNode orderNode = rootNode.get("ORDER_STATIC");
                orderValue = orderNode.toString();
            }
            catch (Exception e) {
                log.error("Exception:", (Throwable)e);
            }
            if (task_static.isEmpty()) {
                userConfigRecord = UserConfigRecord.builder().userId(adminUserId).userKey("TASK_STATIC").userValue(taskValue).build();
                this.userConfigRecordMapper.save((Object)userConfigRecord);
            }
            if (agv_static.isEmpty()) {
                userConfigRecord = UserConfigRecord.builder().userId(adminUserId).userKey("AGV_STASTIC").userValue(agvValue).build();
                this.userConfigRecordMapper.save((Object)userConfigRecord);
            }
            if (order_static.isEmpty()) {
                userConfigRecord = UserConfigRecord.builder().userId(adminUserId).userKey("ORDER_STATIC").userValue(orderValue).build();
                this.userConfigRecordMapper.save((Object)userConfigRecord);
            }
        }
    }

    public List<Role> findUserPermissionsByUuid(String uid) {
        return this.roleMapper.findUserPermissionsByUuid(uid);
    }
}

