/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.service.device.ChargeDeviceService
 *  com.seer.rds.vo.req.ChargeModelReq
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.device;

import com.seer.rds.vo.req.ChargeModelReq;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ChargeDeviceService {
    public static List<ChargeModelReq> chargeInfo = new ArrayList();
}

