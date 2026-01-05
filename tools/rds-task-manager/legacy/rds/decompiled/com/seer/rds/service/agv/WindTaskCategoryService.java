/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WindTaskCategoryMapper
 *  com.seer.rds.dao.WindTaskDefMapper
 *  com.seer.rds.model.wind.WindTaskCategory
 *  com.seer.rds.model.wind.WindTaskDef
 *  com.seer.rds.service.agv.WindTaskCategoryService
 *  org.apache.commons.collections.CollectionUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.service.agv;

import com.seer.rds.dao.WindTaskCategoryMapper;
import com.seer.rds.dao.WindTaskDefMapper;
import com.seer.rds.model.wind.WindTaskCategory;
import com.seer.rds.model.wind.WindTaskDef;
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
public class WindTaskCategoryService {
    private static final Logger log = LoggerFactory.getLogger(WindTaskCategoryService.class);
    @Autowired
    private WindTaskCategoryMapper windTaskCategoryMapper;
    @Autowired
    private WindTaskDefMapper windTaskDefMapper;

    public List<WindTaskCategory> findAllWindTaskCategory() {
        List categoriesall = this.windTaskCategoryMapper.findAllByIsDel(Integer.valueOf(0));
        List defall = this.windTaskDefMapper.findWindTaskDefsByTemplateNameOrderBy();
        List windTaskCategories = this.buildDeptTreeByStream(categoriesall, defall);
        return windTaskCategories;
    }

    @Transactional
    public void deleteWindTaskCategoryIdsById(String id) {
        if (id != null) {
            List windCategorysIdByIds = this.windTaskCategoryMapper.findWindCategorysIdByIds("%" + id + "%");
            windCategorysIdByIds.add(Long.valueOf(id));
            this.windTaskCategoryMapper.updateWindTaskCategoryIsDelByIds(windCategorysIdByIds);
            List labelTaskDefByCategoryIds = this.windTaskDefMapper.findLabelTaskDefByCategoryIds(windCategorysIdByIds);
            this.windTaskDefMapper.deleteWindDefByWindcategoryIds(windCategorysIdByIds);
            log.info("\u5220\u9664\u6587\u4ef6\u5939\u53ca\u5929\u98ce\u4efb\u52a1,CategorysId: {} , WindDefs: {} , ", (Object)windCategorysIdByIds.toString(), (Object)labelTaskDefByCategoryIds.toString());
        }
    }

    @Transactional
    public void deleteWindTaskCategoryByIds(List<Long> ids) {
        if (!ids.isEmpty()) {
            List windCategorysIdByIds = this.windTaskCategoryMapper.findWindCategorysIdByIds("%");
            this.windTaskCategoryMapper.updateWindTaskCategoryIsDelByIds(ids);
        }
    }

    @Transactional
    public Boolean addWindTaskCategory(WindTaskCategory windTaskCategory) {
        List hasWindTaskCategorys = this.windTaskCategoryMapper.findWindTaskCategorysByLabelAndIsDelEquels0(windTaskCategory.getLabel());
        if (CollectionUtils.isEmpty((Collection)hasWindTaskCategorys)) {
            if (windTaskCategory.getParentId() == 0L) {
                windTaskCategory.setParentIds("0");
                this.windTaskCategoryMapper.save((Object)windTaskCategory);
                return true;
            }
            WindTaskCategory windCategorysById = this.windTaskCategoryMapper.findWindCategorysById(windTaskCategory.getParentId());
            if (windCategorysById != null) {
                windTaskCategory.setParentIds(windCategorysById.getParentIds() + "," + windTaskCategory.getParentId().toString());
                this.windTaskCategoryMapper.save((Object)windTaskCategory);
                return true;
            }
        }
        return false;
    }

    @Transactional
    public Boolean updateWindTaskCategoryName(WindTaskCategory windTaskCategory) {
        List hasWindTaskCategorys = this.windTaskCategoryMapper.findWindTaskCategorysByLabelAndIsDelEquels0(windTaskCategory.getLabel());
        if (CollectionUtils.isEmpty((Collection)hasWindTaskCategorys)) {
            this.windTaskCategoryMapper.updateWindTaskCategoryLabelById(windTaskCategory.getLabel(), windTaskCategory.getId());
            return true;
        }
        return false;
    }

    @Transactional
    public Boolean moveWindTaskCategoryToParent(WindTaskCategory windTaskCategory) {
        List categoriesall = this.windTaskCategoryMapper.findAllByIsDel(Integer.valueOf(0));
        if (windTaskCategory.getParentId() == 0L) {
            windTaskCategory.setParentIds("0");
            windTaskCategory.setParentIds(windTaskCategory.getParentId().toString());
            this.movenode(categoriesall, windTaskCategory);
            return true;
        }
        List parentwindCategorysByIds = categoriesall.stream().filter(item -> item.getId() == windTaskCategory.getParentId()).collect(Collectors.toList());
        if (CollectionUtils.isNotEmpty(parentwindCategorysByIds)) {
            windTaskCategory.setParentIds(((WindTaskCategory)parentwindCategorysByIds.get(0)).getParentIds() + "," + windTaskCategory.getParentId().toString());
            this.movenode(categoriesall, windTaskCategory);
            return true;
        }
        return false;
    }

    @Transactional
    public void movenode(List<WindTaskCategory> categoriesall, WindTaskCategory windTaskCategory) {
        List categories = this.moveBuildDeptTreeByStreamCurrentCategory(categoriesall, windTaskCategory);
        List categories1 = this.treeToList(categories);
        this.windTaskCategoryMapper.save((Object)windTaskCategory);
        this.windTaskCategoryMapper.saveAll((Iterable)categories1);
    }

    public List<WindTaskCategory> moveBuildDeptTreeByStreamCurrentCategory(List<WindTaskCategory> trees, WindTaskCategory windTaskCategory) {
        List<WindTaskCategory> list = trees.stream().filter(item -> item.getParentId() == windTaskCategory.getId()).collect(Collectors.toList());
        Map<Long, List<WindTaskCategory>> map = trees.stream().collect(Collectors.groupingBy(WindTaskCategory::getParentId));
        this.moveRecursionFnTree(list, map, windTaskCategory.getParentIds());
        return list;
    }

    public void moveRecursionFnTree(List<WindTaskCategory> list, Map<Long, List<WindTaskCategory>> map, String currentParentIds) {
        for (WindTaskCategory treeSelect : list) {
            List<WindTaskCategory> childList = map.get(treeSelect.getId());
            treeSelect.setParentIds(currentParentIds + "," + treeSelect.getParentId().toString());
            treeSelect.setChildren(childList);
            if (null == childList || 0 >= childList.size()) continue;
            this.moveRecursionFnTree(childList, map, treeSelect.getParentIds());
        }
    }

    public List<WindTaskCategory> buildDeptTreeByStream(List<WindTaskCategory> trees, List<WindTaskDef> defall) {
        List<WindTaskCategory> list = trees.stream().filter(item -> item.getParentId() == 0L).collect(Collectors.toList());
        Map<Long, List<WindTaskCategory>> map = trees.stream().collect(Collectors.groupingBy(WindTaskCategory::getParentId));
        List defcollect = defall.stream().filter(item -> item.getWindcategoryId() != 0L).collect(Collectors.toList());
        Map<Long, List<WindTaskDef>> defmap = defcollect.stream().collect(Collectors.groupingBy(WindTaskDef::getWindcategoryId));
        this.recursionFnTree(list, map, defmap);
        return list;
    }

    public void recursionFnTree(List<WindTaskCategory> list, Map<Long, List<WindTaskCategory>> map, Map<Long, List<WindTaskDef>> defmap) {
        for (WindTaskCategory treeSelect : list) {
            List<WindTaskCategory> childList = map.get(treeSelect.getId());
            List<WindTaskDef> defchildList = defmap.get(treeSelect.getId());
            treeSelect.setDefChildren(defchildList);
            treeSelect.setChildren(childList);
            if (null == childList || 0 >= childList.size()) continue;
            this.recursionFnTree(childList, map, defmap);
        }
    }

    private List<WindTaskCategory> treeToList(List<WindTaskCategory> messageList) {
        ArrayList<WindTaskCategory> result = new ArrayList<WindTaskCategory>();
        for (WindTaskCategory entity : messageList) {
            result.add(entity);
            List childMsg = entity.getChildren();
            if (childMsg == null || childMsg.size() <= 0) continue;
            List entityList = this.treeToList(childMsg);
            result.addAll(entityList);
        }
        if (result.size() > 0) {
            for (WindTaskCategory entity : result) {
                entity.setChildren(null);
            }
        }
        return result;
    }
}

