/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSON
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.constant.CommonCodeEnum
 *  com.seer.rds.constant.UserMessageIfReadEnum
 *  com.seer.rds.constant.UserMessageTypeEnum
 *  com.seer.rds.dao.UserMessageMapper
 *  com.seer.rds.model.admin.UserMessage
 *  com.seer.rds.service.admin.UserMessageService
 *  com.seer.rds.util.LocaleMessageUtil
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.UserMessageHqlCondition
 *  com.seer.rds.vo.popWindowsVo
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  com.seer.rds.websocket.RdsServer
 *  javax.persistence.criteria.Expression
 *  javax.persistence.criteria.Order
 *  javax.persistence.criteria.Predicate
 *  javax.websocket.Session
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.commons.lang3.time.DateUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.i18n.LocaleContextHolder
 *  org.springframework.data.domain.Page
 *  org.springframework.data.domain.PageRequest
 *  org.springframework.data.domain.Pageable
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.admin;

import com.alibaba.fastjson.JSON;
import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.constant.CommonCodeEnum;
import com.seer.rds.constant.UserMessageIfReadEnum;
import com.seer.rds.constant.UserMessageTypeEnum;
import com.seer.rds.dao.UserMessageMapper;
import com.seer.rds.model.admin.UserMessage;
import com.seer.rds.util.LocaleMessageUtil;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.UserMessageHqlCondition;
import com.seer.rds.vo.popWindowsVo;
import com.seer.rds.vo.response.PaginationResponseVo;
import com.seer.rds.websocket.RdsServer;
import java.io.Serializable;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;
import javax.persistence.criteria.Expression;
import javax.persistence.criteria.Order;
import javax.persistence.criteria.Predicate;
import javax.websocket.Session;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.time.DateUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class UserMessageService {
    private static final Logger log = LoggerFactory.getLogger(UserMessageService.class);
    private static Logger logger = LoggerFactory.getLogger((String)"UserMessageService");
    private final UserMessageMapper userMessageMapper;
    private final RdsServer rdsServer;
    @Autowired
    private LocaleMessageUtil localeMessageUtil;

    public UserMessageService(UserMessageMapper userMessageMapper, RdsServer rdsServer) {
        this.userMessageMapper = userMessageMapper;
        this.rdsServer = rdsServer;
    }

    public void findAll() {
        List alarms = this.userMessageMapper.findAll();
    }

    public void addMessageInfo(String messageTitle, String messageBody, int level) {
        UserMessage userMseeage = new UserMessage();
        userMseeage.setLevel(Integer.valueOf(level));
        userMseeage.setMessageBody(messageBody);
        userMseeage.setMessageTitle(messageTitle);
        userMseeage.setIfRead(Integer.valueOf(UserMessageIfReadEnum.UNREAD.getStatus()));
        userMseeage.setIsDel(Integer.valueOf(1));
        this.userMessageMapper.save((Object)userMseeage);
    }

    public PaginationResponseVo findUserMessageByCondition(UserMessageHqlCondition condition, Integer page, Integer pageSize) {
        Specification & Serializable spec = (Specification & Serializable)(root, query, cb) -> {
            ArrayList<Predicate> predicates = new ArrayList<Predicate>();
            if (condition.getLevel() != null) {
                predicates.add(cb.equal((Expression)root.get("level"), (Object)condition.getLevel()));
            }
            if (condition.getIfRead() != null) {
                predicates.add(cb.equal((Expression)root.get("ifRead"), (Object)condition.getIfRead()));
            }
            if (StringUtils.isNotEmpty((CharSequence)condition.getStartDate()) && StringUtils.isNotEmpty((CharSequence)condition.getEndDate())) {
                try {
                    predicates.add(cb.between((Expression)root.get("createTime"), (Comparable)DateUtils.parseDate((String)condition.getStartDate(), (String[])new String[]{"yyyy-MM-dd HH:mm:ss"}), (Comparable)DateUtils.parseDate((String)condition.getEndDate(), (String[])new String[]{"yyyy-MM-dd HH:mm:ss"})));
                }
                catch (ParseException e) {
                    logger.error("findUserMessageByCondition ParseException", (Throwable)e);
                }
            }
            if (StringUtils.isNotEmpty((CharSequence)condition.getStartDate()) && StringUtils.isEmpty((CharSequence)condition.getEndDate())) {
                try {
                    predicates.add(cb.greaterThanOrEqualTo((Expression)root.get("createTime"), (Comparable)DateUtils.parseDate((String)condition.getStartDate(), (String[])new String[]{"yyyy-MM-dd HH:mm:ss"})));
                }
                catch (ParseException e) {
                    logger.error("findUserMessageByCondition ParseException", (Throwable)e);
                }
            }
            if (StringUtils.isEmpty((CharSequence)condition.getStartDate()) && StringUtils.isNotEmpty((CharSequence)condition.getEndDate())) {
                try {
                    predicates.add(cb.lessThan((Expression)root.get("createTime"), (Comparable)DateUtils.parseDate((String)condition.getEndDate(), (String[])new String[]{"yyyy-MM-dd HH:mm:ss"})));
                }
                catch (ParseException e) {
                    logger.error("findUserMessageByCondition ParseException", (Throwable)e);
                }
            }
            predicates.add(cb.equal((Expression)root.get("isDel"), (Object)1));
            if (condition.getIsOrderDesc() != null && condition.getIsOrderDesc().booleanValue()) {
                query.orderBy(new Order[]{cb.asc((Expression)root.get("createTime"))});
            } else {
                query.orderBy(new Order[]{cb.desc((Expression)root.get("createTime"))});
            }
            return cb.and(predicates.toArray(new Predicate[predicates.size()]));
        };
        if (pageSize != null && page != 0) {
            PageRequest pageRequest = page != null ? PageRequest.of((int)(page - 1), (int)pageSize) : PageRequest.ofSize((int)pageSize);
            Page taskAll = this.userMessageMapper.findAll((Specification)spec, (Pageable)pageRequest);
            PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
            paginationResponseVo.setTotalCount(Long.valueOf(taskAll.getTotalElements()));
            paginationResponseVo.setCurrentPage(page);
            paginationResponseVo.setPageSize(pageSize);
            this.userMseeageInter(taskAll.getContent());
            paginationResponseVo.setTotalPage(Integer.valueOf(taskAll.getTotalPages()));
            paginationResponseVo.setPageList(taskAll.getContent());
            return paginationResponseVo;
        }
        List taskAll = this.userMessageMapper.findAll((Specification)spec);
        this.userMseeageInter(taskAll);
        PaginationResponseVo paginationResponseVo = new PaginationResponseVo();
        paginationResponseVo.setTotalCount(Long.valueOf(taskAll.size()));
        paginationResponseVo.setCurrentPage(page);
        paginationResponseVo.setPageSize(pageSize);
        paginationResponseVo.setTotalPage(null);
        paginationResponseVo.setPageList(taskAll);
        return paginationResponseVo;
    }

    private void userMseeageInter(List<UserMessage> taskAll) {
        Locale locale = LocaleContextHolder.getLocale();
        taskAll.stream().forEach(userMseeage -> {
            userMseeage.setMessageTitle(this.localeMessageUtil.getMessageMatch(userMseeage.getMessageTitle(), locale));
            userMseeage.setMessageBody(this.localeMessageUtil.getMessageMatch(userMseeage.getMessageBody(), locale));
        });
    }

    public void noticeWebWithUserMessageInfo(Session session) {
        List popUserMessageList;
        PageRequest pageable = PageRequest.of((int)0, (int)10);
        List errorUserMessageList = this.userMessageMapper.findByLevel(Integer.valueOf(UserMessageTypeEnum.ERROR.getStatus()), (Pageable)pageable);
        ResultVo result = ResultVo.success((CommonCodeEnum)CommonCodeEnum.WS_MSG_USER_ERROR_POP, (Object)errorUserMessageList);
        if (!errorUserMessageList.isEmpty()) {
            if (session == null) {
                this.rdsServer.sendWebMessage(JSON.toJSONString((Object)result));
            } else {
                this.rdsServer.sendMessage(JSON.toJSONString((Object)result), session);
            }
        }
        if ((popUserMessageList = Arrays.stream(UserMessageTypeEnum.values()).map(arg_0 -> this.findByLevel(arg_0)).filter(Optional::isPresent).map(Optional::get).filter(list -> !list.isEmpty()).flatMap(Collection::stream).collect(Collectors.toList())).isEmpty()) {
            List defaultPopUserMessageList = this.userMessageMapper.findByLevel(Integer.valueOf(UserMessageTypeEnum.ERROR.getStatus()), Integer.valueOf(UserMessageTypeEnum.WARN.getStatus()), (Pageable)PageRequest.of((int)0, (int)10));
            popUserMessageList.addAll(defaultPopUserMessageList);
        }
        ResultVo result2 = ResultVo.success((CommonCodeEnum)CommonCodeEnum.WS_MSG_USER_POP, popUserMessageList);
        if (!popUserMessageList.isEmpty()) {
            if (session == null) {
                this.rdsServer.sendWebMessage(JSON.toJSONString((Object)result2));
            } else {
                this.rdsServer.sendMessage(JSON.toJSONString((Object)result2), session);
            }
        }
    }

    private Optional<List<UserMessage>> findByLevel(UserMessageTypeEnum type) {
        Boolean ifPop = GlobalCacheConfig.getcacheIfPop((Integer)type.getStatus());
        if (ifPop == null || !ifPop.booleanValue()) {
            return Optional.empty();
        }
        List userMessageList = this.userMessageMapper.findByLevel(Integer.valueOf(type.getStatus()), (Pageable)PageRequest.of((int)0, (int)10));
        return Optional.of(userMessageList);
    }

    public void setPopWindowsLevel(popWindowsVo params) {
        Boolean info = params.getInfo();
        Boolean warn = params.getWarn();
        Boolean error = params.getError();
        if (info != null) {
            this.cacheIfPop(UserMessageTypeEnum.INFO.getStatus(), info.booleanValue());
        } else if (warn != null) {
            this.cacheIfPop(UserMessageTypeEnum.WARN.getStatus(), warn.booleanValue());
        } else if (error != null) {
            this.cacheIfPop(UserMessageTypeEnum.ERROR.getStatus(), error.booleanValue());
        }
    }

    private void cacheIfPop(int status, boolean value) {
        GlobalCacheConfig.cacheIfPop((Integer)status, (Boolean)value);
    }
}

