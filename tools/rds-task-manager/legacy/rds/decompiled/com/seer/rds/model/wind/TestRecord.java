/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.TaskRecord
 *  com.seer.rds.model.wind.TestRecord
 *  com.seer.rds.model.wind.TestRecord$TestRecordBuilder
 *  javax.persistence.Entity
 *  javax.persistence.Table
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.TaskRecord;
import com.seer.rds.model.wind.TestRecord;
import javax.persistence.Entity;
import javax.persistence.Table;

@Entity
@Table(name="t_testrecord")
public class TestRecord
extends TaskRecord {
    public static TestRecordBuilder builder() {
        return new TestRecordBuilder();
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof TestRecord)) {
            return false;
        }
        TestRecord other = (TestRecord)o;
        return other.canEqual((Object)this);
    }

    protected boolean canEqual(Object other) {
        return other instanceof TestRecord;
    }

    public int hashCode() {
        boolean result = true;
        return 1;
    }

    public String toString() {
        return "TestRecord()";
    }
}

