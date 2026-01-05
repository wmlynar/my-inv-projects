/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.WorkSiteMapper
 *  com.seer.rds.model.worksite.WorkSite
 *  org.springframework.data.jpa.domain.Specification
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.worksite.WorkSite;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface WorkSiteMapper
extends JpaRepository<WorkSite, String>,
JpaSpecificationExecutor<WorkSite> {
    public List<WorkSite> findBySiteId(String var1);

    public List<WorkSite> findBySiteIdAndLockedAndFilled(String var1, Integer var2, Integer var3);

    public List<WorkSite> findByAgvIdAndSiteIdIn(String var1, List<String> var2);

    public List<WorkSite> findBySiteIdIn(List<String> var1);

    @Query(value="select site.siteId from WorkSite site where site.locked = 1")
    public List<String> findAllLockedSiteIds();

    @Query(value="select site.siteId from WorkSite site where site.locked = 0")
    public List<String> findAllUnLockedSiteIds();

    @Query(value="select site.groupName from WorkSite site group by site.groupName")
    public List<String> findWorkSiteGroups();

    public List<WorkSite> findByAgvId(String var1);

    @Query(value="select w from WorkSite w where w.type = 0")
    public List<WorkSite> findAllLogicSites();

    public List<WorkSite> findAll(Specification<WorkSite> var1);

    @Query(value="select w from WorkSite w where w.siteId =:siteId and w.content =:content and w.filled =:filled and w.type =:type and w.groupName =:groupName order by w.siteId desc")
    public List<WorkSite> findByConditionOrderBySiteIdDesc(String var1, String var2, Integer var3, Integer var4, String var5);

    public List<WorkSite> findByAreaInOrderBySiteIdAsc(List<String> var1);

    public List<WorkSite> findByAreaInOrderBySiteIdDesc(List<String> var1);

    public List<WorkSite> findByGroupNameIn(List<String> var1);

    public List<WorkSite> findByGroupNameInAndSyncFailed(List<String> var1, Integer var2);

    public List<WorkSite> findBySyncFailed(Integer var1);

    public List<WorkSite> findByType(Integer var1);

    public List<WorkSite> findByAreaAndSiteId(String var1, String var2);

    @Query(value="select new WorkSite( w.id,w.siteId ,w.working, w.locked,w.preparing , w.filled ,w.disabled ,w.content ,w.area , w.rowNum ,w.colNum , w.level , w.depth , w.no , w.agvId  ,w.tags , w.type) from WorkSite w order by w.type asc")
    public List<WorkSite> findOrderByTypeAsc();

    public List<WorkSite> findBySiteIdLikeOrderBySiteIdAsc(String var1);

    public List<WorkSite> findBySiteIdLikeOrderBySiteIdDesc(String var1);

    public List<WorkSite> findByTagsOrderBySiteIdDesc(String var1);

    public List<WorkSite> findByGroupNameOrderBySiteIdDesc(String var1);

    @Query(value="select site from WorkSite site where site.tags = :tags and site.disabled = 0 and site.syncFailed = 0")
    public List<WorkSite> findSiteListByTags(String var1);

    public List<WorkSite> findByGroupName(String var1);

    @Query(value="select site from WorkSite site where site.tags in (?1) and site.content in (?2) and site.disabled = 0 and site.syncFailed = 0")
    public List<WorkSite> findSiteByTagsAndContents(List<String> var1, List<String> var2);

    @Query(value="select site.siteId from WorkSite site where site.lockedBy = :taskRecordId")
    public List<String> findSiteIdsByLockedBy(String var1);

    @Query(value="select site.siteId from WorkSite site where site.lockedBy in :taskRecordIds")
    public List<String> findSiteIdsInLockedBy(List<String> var1);

    @Query(value="select site from WorkSite site where site.tags in (?1) and site.locked = 0 and site.content = ?2 and site.disabled = 0 and site.syncFailed = 0")
    public List<WorkSite> getUnlockSiteByTagsAndContent(List<String> var1, String var2);

    @Query(value="select new WorkSite(site.id, site.siteId, site.locked, site.filled, site.lockedBy, site.disabled, site.type, site.content) from WorkSite site")
    public List<WorkSite> findBriefSiteList();

    @Transactional
    @Modifying
    @Query(value="update WorkSite set lockedBy = :taskRecordId where siteId = :siteId")
    public void setWorksiteLockedByById(String var1, String var2);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set lockedBy = '', locked = 0 where lockedBy = :taskRecordId")
    public Integer updateSiteUnlockedByLockedBy(String var1);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set lockedBy = '', locked = 0 where lockedBy in :taskRecordIds")
    public Integer updateSiteUnlockedInLockedBy(List<String> var1);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set lockedBy = '', locked = 0 where siteId = :siteId and locked = 1 and lockedBy = :taskRecordId")
    public Integer updateLockedSiteToUnlockByLockedBy(String var1, String var2);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set lockedBy = '', locked = 0 where siteId in :siteIds ")
    public Integer unlockSiteBySiteIdIn(List<String> var1);

    public void deleteByType(Integer var1);

    @Modifying
    @Query(value="delete from WorkSite where siteId = :siteId")
    public void deleteBySiteId(String var1);

    @Modifying
    @Query(value="delete from WorkSite where siteId in :siteIds")
    public void deleteBySiteIds(List<String> var1);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set lockedBy = :lockedBy, locked = 1 where siteId = :siteId and locked = 0 and (disabled <> 1 or disabled is null) and (syncFailed <> 1 or syncFailed is null)")
    public int updateUnlockSiteLockedBySiteId(String var1, String var2);

    @Query(value="select site from WorkSite site where site.groupName in (:groups) and site.locked = :lockStatus and site.filled = :filledStatus and site.disabled = 0 and site.syncFailed = 0")
    public List<WorkSite> getGroupSiteByStatus(List<String> var1, Integer var2, Integer var3);

    @Query(value="select site from WorkSite site where site.groupName = :group")
    public List<WorkSite> getSiteListByGroup(String var1);

    public List<WorkSite> findSiteByGroupName(String var1);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set filled = :filledStatus where siteId = :siteId")
    public int updateSiteFillStatusBySiteId(String var1, Integer var2);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set filled = :filledStatus,syncFailed = :syncFailedStatus where siteId in (:siteIds)")
    public int updateSiteFillStatusBySiteIds(List<String> var1, Integer var2, Integer var3);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set filled = :filledStatus where siteId in (:siteIds)")
    public int setSiteFillStatusBySiteIds(List<String> var1, Integer var2);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set filled = :filledStatus, content = :content where siteId = :siteId")
    public int updateSiteFillStatusAndContentBySiteId(String var1, String var2, Integer var3);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set tags = :tags where siteId in (:siteIds)")
    public int setSiteTagsBySiteId(List<String> var1, String var2);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set tags = :tags where siteId = :siteId ")
    public int updateSiteTagsBySiteId(String var1, String var2);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set no = :no where siteId in (:siteIds)")
    public int setSiteNoBySiteId(List<String> var1, String var2);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set siteName = :siteName where siteId in (:siteIds)")
    public int setSiteNameBySiteId(List<String> var1, String var2);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set filled = :filledStatus, content = :content, syncFailed = :syncFailedStatus where siteId in (:siteIds)")
    public int updateSiteFillStatusAndContentBySiteIds(List<String> var1, String var2, Integer var3, Integer var4);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set filled = :filledStatus, content = :content where siteId in (:siteIds)")
    public int setSiteFillStatusAndContentBySiteIds(List<String> var1, String var2, Integer var3);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set syncFailed = :syncFailedStatus where groupName in (:groupNames)")
    public int updateSiteSyncFailedStatusByGroups(List<String> var1, Integer var2);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set syncFailed = :syncFailedStatus where siteId in (:workSiteIds)")
    public int updateSiteSyncFailedStatusBySiteIds(List<String> var1, Integer var2);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set syncFailed = :syncFailedStatus where siteId = :workSiteId")
    public int updateSiteSyncFailedStatusBySiteId(String var1, Integer var2);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set lockedBy = :lockedBy, locked = 1 where siteId in (:siteIdList)")
    public Integer lockedSitesBySiteIds(String var1, List<String> var2);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set lockedBy = :lockedBy, locked = 1 where siteId = :siteId")
    public Integer lockedSitesBySiteId(String var1, String var2);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set lockedBy = '', locked = 0 where siteId in (:siteIdList)")
    public Integer unLockedSitesBySiteIds(List<String> var1);

    @Transactional
    @Modifying
    @Query(value="update WorkSite set filled = :filled where siteId = :siteId")
    public Integer updateFilledStatus(int var1, String var2);
}

