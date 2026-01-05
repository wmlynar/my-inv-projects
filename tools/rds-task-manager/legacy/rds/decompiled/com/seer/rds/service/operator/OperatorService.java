/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.config.configview.operator.EasyOrder
 *  com.seer.rds.config.configview.operator.OperatorShowSql
 *  com.seer.rds.config.configview.operator.OperatorTableExpandCols
 *  com.seer.rds.model.wind.WindDemandAttr
 *  com.seer.rds.model.wind.WindDemandAttrData
 *  com.seer.rds.model.wind.WindDemandTask
 *  com.seer.rds.service.operator.OperatorService
 *  com.seer.rds.vo.AttrVo
 *  com.seer.rds.vo.ResultVo
 *  com.seer.rds.vo.req.DemandTypeReq
 *  com.seer.rds.vo.req.DemandWorkTypes
 *  com.seer.rds.vo.req.PaginationReq
 *  com.seer.rds.vo.req.ShowTableReq
 *  com.seer.rds.vo.response.DemandContentVo
 *  com.seer.rds.vo.response.DemandListTypeVo
 *  com.seer.rds.vo.response.DemandListVo
 *  com.seer.rds.vo.response.DemandTypeVo
 *  com.seer.rds.vo.response.EasyOrderRes
 *  com.seer.rds.vo.response.PaginationResponseVo
 *  org.springframework.data.domain.Sort
 */
package com.seer.rds.service.operator;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.config.configview.operator.EasyOrder;
import com.seer.rds.config.configview.operator.OperatorShowSql;
import com.seer.rds.config.configview.operator.OperatorTableExpandCols;
import com.seer.rds.model.wind.WindDemandAttr;
import com.seer.rds.model.wind.WindDemandAttrData;
import com.seer.rds.model.wind.WindDemandTask;
import com.seer.rds.vo.AttrVo;
import com.seer.rds.vo.ResultVo;
import com.seer.rds.vo.req.DemandTypeReq;
import com.seer.rds.vo.req.DemandWorkTypes;
import com.seer.rds.vo.req.PaginationReq;
import com.seer.rds.vo.req.ShowTableReq;
import com.seer.rds.vo.response.DemandContentVo;
import com.seer.rds.vo.response.DemandListTypeVo;
import com.seer.rds.vo.response.DemandListVo;
import com.seer.rds.vo.response.DemandTypeVo;
import com.seer.rds.vo.response.EasyOrderRes;
import com.seer.rds.vo.response.PaginationResponseVo;
import java.util.HashMap;
import java.util.List;
import org.springframework.data.domain.Sort;

public interface OperatorService {
    public DemandListVo getDemandList(DemandWorkTypes var1);

    public int lockDemand(String var1, String var2, String var3);

    public DemandContentVo getDemandContent(String var1);

    public int updateStatus(String var1, Integer var2);

    public void saveSupplementDetail(String var1, JSONObject var2) throws Exception;

    public void addDemand(WindDemandTask var1);

    public int updateDemandStatusById(String var1, Integer var2, String var3);

    public int updateDemandFinishedById(String var1, String var2, String var3);

    public int updateDemandFinishedByCreateBy(String var1, String var2, String var3);

    public PaginationResponseVo showTable(OperatorShowSql var1, PaginationReq<ShowTableReq> var2);

    @Deprecated
    public List<EasyOrderRes> easyOrderCallBack(List<String> var1);

    public List<WindDemandTask> getAllUnFinishedDemands();

    public void easyOrderBatchCallBack(List<EasyOrderRes> var1);

    public ResultVo easyOrderSetOrderByMenuId(EasyOrder var1, String var2) throws Exception;

    public void easyOrderPutCache(EasyOrder var1, String var2) throws Exception;

    public PaginationResponseVo queryDemandByCondition(PaginationReq<DemandTypeReq> var1);

    public DemandListTypeVo demandListByType(String var1, Sort var2, DemandTypeReq var3);

    public List<WindDemandAttr> findAllDemandExtFields();

    public List<WindDemandAttr> findDemandExtFieldsByDefLabel(String var1);

    public List<WindDemandAttrData> findAllDemandExtFieldData();

    public Long findAttrIdByAttrName(String var1);

    public void saveOrUpdateDemandExtFields(List<WindDemandAttr> var1);

    public void deleteExtField(Long var1);

    public List<WindDemandTask> getBasicResultList(List<WindDemandAttr> var1, List<WindDemandTask> var2);

    public HashMap<String, List<AttrVo>> getAttrListMap(List<WindDemandAttr> var1, List<WindDemandAttrData> var2);

    public HashMap<String, List<AttrVo>> getCompleteAttrListJson(HashMap<String, List<AttrVo>> var1, List<WindDemandAttr> var2);

    public List<WindDemandTask> replaceAttrListField(List<WindDemandTask> var1, HashMap<String, List<AttrVo>> var2);

    public List<DemandTypeVo> getBasicResultList1(List<WindDemandAttr> var1, List<DemandTypeVo> var2);

    public List<DemandTypeVo> replaceAttrListField1(List<DemandTypeVo> var1, HashMap<String, List<AttrVo>> var2);

    public void showTablePolish(String var1, List<OperatorTableExpandCols> var2, PaginationResponseVo var3);

    public boolean distributePass(String var1);

    public boolean distributePendingAndContinued(String var1, String var2, boolean var3);

    public boolean distributeDel(String var1, String var2);

    public boolean distributeAdd(String var1, List<String> var2);
}

