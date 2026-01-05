/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.InterfaceHandleMapper
 *  com.seer.rds.dao.InterfaceTaskCategoryMapper
 *  com.seer.rds.model.wind.InterfacePreHandle
 *  com.seer.rds.model.wind.InterfaceTaskCategory
 *  com.seer.rds.service.agv.InterfaceTaskCategoryService
 *  org.apache.commons.collections.CollectionUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.service.agv;

import com.seer.rds.dao.InterfaceHandleMapper;
import com.seer.rds.dao.InterfaceTaskCategoryMapper;
import com.seer.rds.model.wind.InterfacePreHandle;
import com.seer.rds.model.wind.InterfaceTaskCategory;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.commons.collections.CollectionUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InterfaceTaskCategoryService {
    private static final Logger log = LoggerFactory.getLogger(InterfaceTaskCategoryService.class);
    @Autowired
    private InterfaceTaskCategoryMapper interfaceTaskCategoryMapper;
    @Autowired
    private InterfaceHandleMapper interfaceHandleMapper;

    public List<InterfaceTaskCategory> findAllInterfaceTaskCategory() {
        List categoriesall = this.interfaceTaskCategoryMapper.findAllByIsDel(Integer.valueOf(0));
        List defall = this.interfaceHandleMapper.findInterfaceTaskDefs();
        List interfaceTaskCategories = this.buildDeptTreeByStream(categoriesall, defall);
        return interfaceTaskCategories;
    }

    @Transactional
    public void deleteInterfaceTaskCategoryIdsById(String id) {
        if (id != null) {
            List interfaceCategorysIdByIds = this.interfaceTaskCategoryMapper.findInterfaceCategorysIdByIds("%" + id + "%");
            interfaceCategorysIdByIds.add(Long.valueOf(id));
            this.interfaceTaskCategoryMapper.updateInterfaceTaskCategoryIsDelByIds(interfaceCategorysIdByIds);
            List urlTaskDefByCategoryIds = this.interfaceHandleMapper.findLabelTaskDefByCategoryIds(interfaceCategorysIdByIds);
            this.interfaceHandleMapper.deleteInterfaceDefByInterfaceCategoryIds(interfaceCategorysIdByIds);
            log.info("\u5220\u9664\u6587\u4ef6\u5939\u53ca\u63a5\u53e3,CategorysId: {} , InterfaceDefs: {} , ", (Object)interfaceCategorysIdByIds.toString(), (Object)urlTaskDefByCategoryIds.toString());
        }
    }

    @Transactional
    public void deleteInterfaceTaskCategoryByIds(List<Long> ids) {
        if (!ids.isEmpty()) {
            List interfaceCategorysIdByIds = this.interfaceTaskCategoryMapper.findInterfaceCategorysIdByIds("%");
            this.interfaceTaskCategoryMapper.updateInterfaceTaskCategoryIsDelByIds(ids);
        }
    }

    @Transactional
    public Boolean addInterfaceTaskCategory(InterfaceTaskCategory interfaceTaskCategory) {
        List hasInterfaceTaskCategorys = this.interfaceTaskCategoryMapper.findInterfaceTaskCategorysByLabelAndIsDelEquels0(interfaceTaskCategory.getLabel());
        if (CollectionUtils.isEmpty((Collection)hasInterfaceTaskCategorys)) {
            if (interfaceTaskCategory.getParentId() == 0L) {
                interfaceTaskCategory.setParentIds("0");
                this.interfaceTaskCategoryMapper.save((Object)interfaceTaskCategory);
                return true;
            }
            InterfaceTaskCategory interfaceCategorysById = this.interfaceTaskCategoryMapper.findInterfaceCategorysById(interfaceTaskCategory.getParentId());
            if (interfaceCategorysById != null) {
                interfaceTaskCategory.setParentIds(interfaceCategorysById.getParentIds() + "," + interfaceTaskCategory.getParentId().toString());
                this.interfaceTaskCategoryMapper.save((Object)interfaceTaskCategory);
                return true;
            }
        }
        return false;
    }

    @Transactional
    public Boolean updateInterfaceTaskCategoryName(InterfaceTaskCategory interfaceTaskCategory) {
        List hasInterfaceTaskCategorys = this.interfaceTaskCategoryMapper.findInterfaceTaskCategorysByLabelAndIsDelEquels0(interfaceTaskCategory.getLabel());
        if (CollectionUtils.isEmpty((Collection)hasInterfaceTaskCategorys)) {
            this.interfaceTaskCategoryMapper.updateInterfaceTaskCategoryLabelById(interfaceTaskCategory.getLabel(), interfaceTaskCategory.getId());
            return true;
        }
        return false;
    }

    @Transactional
    public Boolean moveInterfaceTaskCategoryToParent(InterfaceTaskCategory interfaceTaskCategory) {
        List categoriesall = this.interfaceTaskCategoryMapper.findAllByIsDel(Integer.valueOf(0));
        if (interfaceTaskCategory.getParentId() == 0L) {
            interfaceTaskCategory.setParentIds("0");
            interfaceTaskCategory.setParentIds(interfaceTaskCategory.getParentId().toString());
            this.movenode(categoriesall, interfaceTaskCategory);
            return true;
        }
        List parentinterfaceCategorysByIds = categoriesall.stream().filter(item -> item.getId() == interfaceTaskCategory.getParentId()).collect(Collectors.toList());
        if (CollectionUtils.isNotEmpty(parentinterfaceCategorysByIds)) {
            interfaceTaskCategory.setParentIds(((InterfaceTaskCategory)parentinterfaceCategorysByIds.get(0)).getParentIds() + "," + interfaceTaskCategory.getParentId().toString());
            this.movenode(categoriesall, interfaceTaskCategory);
            return true;
        }
        return false;
    }

    @Transactional
    public void movenode(List<InterfaceTaskCategory> categoriesall, InterfaceTaskCategory interfaceTaskCategory) {
        List categories = this.moveBuildDeptTreeByStreamCurrentCategory(categoriesall, interfaceTaskCategory);
        List categories1 = this.treeToList(categories);
        this.interfaceTaskCategoryMapper.save((Object)interfaceTaskCategory);
        this.interfaceTaskCategoryMapper.saveAll((Iterable)categories1);
    }

    public List<InterfaceTaskCategory> moveBuildDeptTreeByStreamCurrentCategory(List<InterfaceTaskCategory> trees, InterfaceTaskCategory interfaceTaskCategory) {
        List<InterfaceTaskCategory> list = trees.stream().filter(item -> item.getParentId() == interfaceTaskCategory.getId()).collect(Collectors.toList());
        Map<Long, List<InterfaceTaskCategory>> map = trees.stream().collect(Collectors.groupingBy(InterfaceTaskCategory::getParentId));
        this.moveRecursionFnTree(list, map, interfaceTaskCategory.getParentIds());
        return list;
    }

    public void moveRecursionFnTree(List<InterfaceTaskCategory> list, Map<Long, List<InterfaceTaskCategory>> map, String currentParentIds) {
        for (InterfaceTaskCategory treeSelect : list) {
            List<InterfaceTaskCategory> childList = map.get(treeSelect.getId());
            treeSelect.setParentIds(currentParentIds + "," + treeSelect.getParentId().toString());
            treeSelect.setChildren(childList);
            if (null == childList || 0 >= childList.size()) continue;
            this.moveRecursionFnTree(childList, map, treeSelect.getParentIds());
        }
    }

    public List<InterfaceTaskCategory> buildDeptTreeByStream(List<InterfaceTaskCategory> trees, List<InterfacePreHandle> defall) {
        List<InterfaceTaskCategory> list = trees.stream().filter(item -> item.getParentId() == 0L).collect(Collectors.toList());
        Map<Long, List<InterfaceTaskCategory>> map = trees.stream().collect(Collectors.groupingBy(InterfaceTaskCategory::getParentId));
        List defcollect = defall.stream().filter(item -> item.getIntertfaceCategoryId() != 0L).collect(Collectors.toList());
        Map<Long, List<InterfacePreHandle>> defmap = defcollect.stream().collect(Collectors.groupingBy(InterfacePreHandle::getIntertfaceCategoryId));
        this.recursionFnTree(list, map, defmap);
        return list;
    }

    public void recursionFnTree(List<InterfaceTaskCategory> list, Map<Long, List<InterfaceTaskCategory>> map, Map<Long, List<InterfacePreHandle>> defmap) {
        for (InterfaceTaskCategory treeSelect : list) {
            List<InterfaceTaskCategory> childList = map.get(treeSelect.getId());
            List<InterfacePreHandle> defchildList = defmap.get(treeSelect.getId());
            treeSelect.setDefChildren(defchildList);
            treeSelect.setChildren(childList);
            if (null == childList || 0 >= childList.size()) continue;
            this.recursionFnTree(childList, map, defmap);
        }
    }

    private List<InterfaceTaskCategory> treeToList(List<InterfaceTaskCategory> messageList) {
        ArrayList<InterfaceTaskCategory> result = new ArrayList<InterfaceTaskCategory>();
        for (InterfaceTaskCategory entity : messageList) {
            result.add(entity);
            List childMsg = entity.getChildren();
            if (childMsg == null || childMsg.size() <= 0) continue;
            List entityList = this.treeToList(childMsg);
            result.addAll(entityList);
        }
        if (result.size() > 0) {
            for (InterfaceTaskCategory entity : result) {
                entity.setChildren(null);
            }
        }
        return result;
    }
}

