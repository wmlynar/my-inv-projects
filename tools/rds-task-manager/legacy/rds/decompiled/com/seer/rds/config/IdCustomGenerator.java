/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.IdCustomGenerator
 *  com.seer.rds.model.wind.WindTaskRecord
 *  org.apache.commons.lang3.StringUtils
 *  org.hibernate.HibernateException
 *  org.hibernate.engine.spi.SharedSessionContractImplementor
 *  org.hibernate.id.IdentityGenerator
 */
package com.seer.rds.config;

import com.seer.rds.model.wind.WindTaskRecord;
import java.io.Serializable;
import org.apache.commons.lang3.StringUtils;
import org.hibernate.HibernateException;
import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.id.IdentityGenerator;

public class IdCustomGenerator
extends IdentityGenerator {
    public Serializable generate(SharedSessionContractImplementor sharedSessionContractImplementor, Object o) throws HibernateException {
        if (o == null) {
            throw new HibernateException((Throwable)new NullPointerException());
        }
        WindTaskRecord windTaskRecord = (WindTaskRecord)o;
        if (StringUtils.isEmpty((CharSequence)windTaskRecord.getId())) {
            return super.generate(sharedSessionContractImplementor, o);
        }
        return windTaskRecord.getId();
    }
}

