/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.GlobalCacheConfig
 *  com.seer.rds.model.wind.WindTaskRecord
 *  com.seer.rds.service.wind.AbstractBp
 *  com.seer.rds.service.wind.AbstratRootBp
 *  com.seer.rds.service.wind.taskBp.StopOtherBranch
 *  com.seer.rds.vo.wind.SweeperBpField
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.context.annotation.Scope
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.service.wind.taskBp;

import com.seer.rds.config.GlobalCacheConfig;
import com.seer.rds.model.wind.WindTaskRecord;
import com.seer.rds.service.wind.AbstractBp;
import com.seer.rds.service.wind.AbstratRootBp;
import com.seer.rds.vo.wind.SweeperBpField;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

@Component(value="StopOtherBranch")
@Scope(value="prototype")
public class StopOtherBranch
extends AbstractBp<WindTaskRecord> {
    private static final Logger log = LoggerFactory.getLogger(StopOtherBranch.class);

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    protected void getInputParamsAndExecute(AbstratRootBp rootBp) throws Exception {
        AbstratRootBp abstratRootBp = rootBp;
        synchronized (abstratRootBp) {
            Object workAreaObj = this.blockInputParamsValue.get(SweeperBpField.workArea);
            Thread.sleep(1000L);
            List cacheThreadSet = GlobalCacheConfig.getCacheThread((String)((WindTaskRecord)this.taskRecord).getId());
            int i = 0;
            for (Thread thread : cacheThreadSet) {
                if (i != 0 && Thread.currentThread() != thread) {
                    log.info("threadId name: {}", (Object)thread.getName());
                    GlobalCacheConfig.cacheInterrupt((String)((WindTaskRecord)this.taskRecord).getId(), (String)"StopBranchKey");
                    thread.interrupt();
                }
                ++i;
            }
        }
    }

    protected void setBlockInputParamsValue(AbstratRootBp rootBp) throws Exception {
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof StopOtherBranch)) {
            return false;
        }
        StopOtherBranch other = (StopOtherBranch)o;
        return other.canEqual((Object)this);
    }

    protected boolean canEqual(Object other) {
        return other instanceof StopOtherBranch;
    }

    public int hashCode() {
        boolean result = true;
        return 1;
    }

    public String toString() {
        return "StopOtherBranch()";
    }
}

