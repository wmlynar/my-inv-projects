/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.worksite.SiteNode
 *  com.seer.rds.model.worksite.SiteNodeLinkList
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.model.worksite;

import com.seer.rds.model.worksite.SiteNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SiteNodeLinkList {
    private static final Logger log = LoggerFactory.getLogger(SiteNodeLinkList.class);
    private SiteNode head;

    public void addEmp(SiteNode siteNode) {
        if (this.head == null) {
            this.head = siteNode;
            return;
        }
        SiteNode temp = this.head;
        while (true) {
            if (temp.getTaskRecord().equals(siteNode.getTaskRecord())) {
                log.info("\u8be5id\u5df2\u7ecf\u5b58\u5728");
                return;
            }
            if (this.head.getPriority() < siteNode.getPriority()) {
                siteNode.setNext(this.head);
                this.head = siteNode;
                return;
            }
            if (temp.getNext() == null) {
                temp.setNext(siteNode);
                return;
            }
            if (temp.getNext().getPriority() < siteNode.getPriority()) {
                siteNode.setNext(temp.getNext());
                temp.setNext(siteNode);
                return;
            }
            temp = temp.getNext();
        }
    }

    public void reconstructionList(String taskRecord, int priority) {
        SiteNode siteNode = null;
        if (this.head == null) {
            log.info("\u94fe\u8868\u4e3a\u7a7a");
            return;
        }
        SiteNode temp = this.head;
        while (true) {
            if (this.head.getTaskRecord().equals(taskRecord)) {
                SiteNode siteNodeNew = new SiteNode();
                siteNodeNew.setPriority(priority);
                siteNodeNew.setTaskRecord(this.head.getTaskRecord());
                siteNodeNew.setNext(null);
                this.head = this.head.getNext();
                this.addEmp(siteNodeNew);
                break;
            }
            if (temp.getNext() != null && temp.getNext().getTaskRecord().equals(taskRecord)) {
                siteNode = temp.getNext();
                temp.setNext(temp.getNext().getNext());
                siteNode.setPriority(priority);
                siteNode.setNext(null);
                this.addEmp(siteNode);
                break;
            }
            if (temp.getNext() == null) break;
            temp = temp.getNext();
        }
    }

    public void showList(String siteId) {
        if (this.head == null) {
            log.info("\u5e93\u4f4d\uff1a" + siteId + "\u7684\u94fe\u8868\u4e3a\u7a7a");
            return;
        }
        SiteNode temp = this.head;
        String msg = "\u5e93\u4f4d" + siteId + "\u7684\u7b49\u5f85\u4efb\u52a1\u5b9e\u4f8b\u4e3a: ";
        while (true) {
            msg = msg + "=> taskRecord = " + temp.getTaskRecord() + "\n";
            if (temp.getNext() == null) break;
            temp = temp.getNext();
        }
        log.info(msg);
    }

    public Boolean findTaskRecordIfInner(String taskRecord) {
        if (this.head == null) {
            log.info("\u94fe\u8868\u4e3a\u7a7a");
            return false;
        }
        SiteNode temp = this.head;
        while (true) {
            if (taskRecord.equals(temp.getTaskRecord())) {
                return true;
            }
            if (temp.getNext() == null) break;
            temp = temp.getNext();
        }
        return false;
    }

    public SiteNode queryById(String taskRecord) {
        if (this.head == null) {
            log.info("taskRecord");
            return null;
        }
        SiteNode temp = this.head;
        while (!temp.getTaskRecord().equals(taskRecord)) {
            if (temp.getNext() == null) {
                return null;
            }
            temp = temp.getNext();
        }
        return temp;
    }

    public void deleteById(String taskRecord) {
        try {
            if (this.head == null) {
                log.info("taskRecord");
                return;
            }
            SiteNode temp = this.head;
            do {
                if (this.head.getTaskRecord().equals(taskRecord)) {
                    this.head = temp.getNext();
                    log.info("\u5220\u9664\u6210\u529f");
                    return;
                }
                if (!temp.getNext().getTaskRecord().equals(taskRecord)) continue;
                temp.setNext(temp.getNext().getNext());
                log.info("\u5220\u9664\u6210\u529f");
                return;
            } while ((temp = temp.getNext()).getNext() != null);
            log.info("taskRecord\u4e0d\u5b58\u5728");
        }
        catch (Exception e) {
            log.info("\u8282\u70b9\u4e0d\u5b58\u5728");
        }
    }

    public void deleteAll() {
        this.head = null;
    }

    public SiteNode getHead() {
        return this.head;
    }

    public void setHead(SiteNode head) {
        this.head = head;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SiteNodeLinkList)) {
            return false;
        }
        SiteNodeLinkList other = (SiteNodeLinkList)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        SiteNode this$head = this.getHead();
        SiteNode other$head = other.getHead();
        return !(this$head == null ? other$head != null : !this$head.equals(other$head));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SiteNodeLinkList;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        SiteNode $head = this.getHead();
        result = result * 59 + ($head == null ? 43 : $head.hashCode());
        return result;
    }

    public String toString() {
        return "SiteNodeLinkList(head=" + this.getHead() + ")";
    }
}

