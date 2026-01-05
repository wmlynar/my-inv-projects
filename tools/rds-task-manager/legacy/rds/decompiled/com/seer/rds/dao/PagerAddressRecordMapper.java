/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.PagerAddressRecordMapper
 *  com.seer.rds.model.device.PagerAddressRecord
 *  com.seer.rds.vo.PagerAddressRecordVo
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.device.PagerAddressRecord;
import com.seer.rds.vo.PagerAddressRecordVo;
import java.util.Date;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface PagerAddressRecordMapper
extends JpaRepository<PagerAddressRecord, Long> {
    @Query(value="select 1 from PagerAddressRecord")
    public List<Integer> find1FromPagerAddress();

    @Query(value="select p.address from PagerAddressRecord p where p.id in (:ids)")
    public List<Integer> findAddressByIdIn(List<Long> var1);

    @Query(value="select new PagerAddressRecord (p.pagerId, p.address) from PagerAddressRecord p where p.id = :id")
    public PagerAddressRecord findAddressById(Long var1);

    @Query(value="select p.id from PagerAddressRecord p where p.pagerId = :pagerId and p.address = :address")
    public List<Long> findIdByPagerIdAndAddr(Long var1, Integer var2);

    @Query(value="select p.id from PagerAddressRecord p where p.pagerId in (:pagerIds)")
    public List<Long> findIdByPagerIdIn(List<Long> var1);

    @Query(value="select p.address from PagerAddressRecord p where p.pagerId = :pagerId")
    public List<Integer> findAddressByPagerId(Long var1);

    @Query(value="select p.address from PagerAddressRecord p where p.pagerId in (:pagerIds)")
    public List<Integer> findAddressByPagerIdIn(List<Long> var1);

    @Query(value="select p.pagerId from PagerAddressRecord p where p.id = :id")
    public List<Long> findPagerIdById(Long var1);

    @Query(value="select new com.seer.rds.vo.PagerAddressRecordVo(p.ip, p.port, p.slaveId, p.functionCode, a.address, a.remark, a.lightAddress) from Pager p inner join PagerAddressRecord a on p.id = a.pagerId where a.orderTask = :orderTask")
    public List<PagerAddressRecordVo> findPagerByOrderTask(String var1);

    @Query(value="select orderTask from PagerAddressRecord")
    public List<String> findAllOrderTask();

    @Transactional
    @Modifying
    @Query(value="update PagerAddressRecord set address = :address, remark = :remark, lightAddress = :lightAddress, lightRemark = :lightRemark, orderTask = :orderTask, cancelTask = :cancelTask, modifyTime = :modifyTime where id = :id")
    public int updateRecordById(Integer var1, String var2, Integer var3, String var4, String var5, String var6, Date var7, Long var8);

    @Transactional
    @Modifying
    @Query(value="update PagerAddressRecord set value = :value, lightValue = :lightValue where id = :id")
    public int updateValuedById(Integer var1, Integer var2, Long var3);

    @Transactional
    @Modifying
    @Query(value="update PagerAddressRecord set value = :value where id = :id")
    public int updatePagerValuedById(Integer var1, Long var2);

    @Transactional
    @Modifying
    @Query(value="update PagerAddressRecord set lightValue = :lightValue where id = :id")
    public int updateLightValuedById(Integer var1, Long var2);
}

