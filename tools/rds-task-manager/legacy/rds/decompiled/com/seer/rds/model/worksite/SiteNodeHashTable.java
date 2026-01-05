/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.worksite.SiteNode
 *  com.seer.rds.model.worksite.SiteNodeHashTable
 *  com.seer.rds.model.worksite.SiteNodeLinkList
 */
package com.seer.rds.model.worksite;

import com.seer.rds.model.worksite.SiteNode;
import com.seer.rds.model.worksite.SiteNodeLinkList;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class SiteNodeHashTable {
    private ConcurrentHashMap<String, SiteNodeLinkList> siteNodeHashMap = new ConcurrentHashMap();

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void add(SiteNode siteNode, String siteId) {
        Boolean init = false;
        SiteNodeLinkList siteNodeLinkList = this.hashLinkedList(siteId);
        if (siteNodeLinkList == null) {
            init = true;
            siteNodeLinkList = new SiteNodeLinkList();
            siteNodeLinkList.addEmp(siteNode);
        }
        SiteNodeLinkList siteNodeLinkList2 = siteNodeLinkList;
        synchronized (siteNodeLinkList2) {
            if (init.booleanValue()) {
                SiteNodeLinkList siteNodeLinkListIfAbsent = this.siteNodeHashMap.putIfAbsent(siteId, siteNodeLinkList);
                if (siteNodeLinkListIfAbsent != null) {
                    siteNodeLinkListIfAbsent.addEmp(siteNode);
                }
            } else {
                siteNodeLinkList.addEmp(siteNode);
            }
        }
    }

    public void showHashTable() {
        for (Map.Entry next : this.siteNodeHashMap.entrySet()) {
            String key = (String)next.getKey();
            SiteNodeLinkList value = (SiteNodeLinkList)next.getValue();
            value.showList(key);
        }
    }

    public String getNodeByTaskRecordId(String taskRecordId) {
        for (Map.Entry next : this.siteNodeHashMap.entrySet()) {
            String key = (String)next.getKey();
            SiteNodeLinkList value = (SiteNodeLinkList)next.getValue();
            Boolean taskRecordIfInner = value.findTaskRecordIfInner(taskRecordId);
            if (!taskRecordIfInner.booleanValue()) continue;
            return key;
        }
        return "";
    }

    public void deleteAll() {
        for (Map.Entry next : this.siteNodeHashMap.entrySet()) {
            String key = (String)next.getKey();
            SiteNodeLinkList value = (SiteNodeLinkList)next.getValue();
            value.deleteAll();
        }
    }

    public void showSiteLinkedList(String siteId) {
        SiteNodeLinkList siteNodeLinkList = (SiteNodeLinkList)this.siteNodeHashMap.get(siteId);
        if (siteNodeLinkList != null) {
            siteNodeLinkList.showList(siteId);
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public boolean findIfHead(String siteId, String taskRecord) {
        SiteNodeLinkList siteNodeLinkList = this.hashLinkedList(siteId);
        if (siteNodeLinkList != null) {
            SiteNodeLinkList siteNodeLinkList2 = siteNodeLinkList;
            synchronized (siteNodeLinkList2) {
                SiteNode head = siteNodeLinkList.getHead();
                return head.getTaskRecord().equals(taskRecord);
                {
                }
            }
        }
        return true;
    }

    public void delete(String siteId, String taskRecord) {
        SiteNodeLinkList siteNodeLinkList = this.hashLinkedList(siteId);
        if (siteNodeLinkList != null) {
            siteNodeLinkList.deleteById(taskRecord);
        }
    }

    public SiteNodeLinkList hashLinkedList(String siteId) {
        this.siteNodeHashMap.get(siteId);
        return (SiteNodeLinkList)this.siteNodeHashMap.get(siteId);
    }
}

