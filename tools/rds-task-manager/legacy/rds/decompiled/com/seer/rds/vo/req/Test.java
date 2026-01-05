/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.fastjson.JSONObject
 *  com.seer.rds.service.wind.taskBp.CSelectAgvBp
 *  com.seer.rds.vo.req.Test
 */
package com.seer.rds.vo.req;

import com.alibaba.fastjson.JSONObject;
import com.seer.rds.service.wind.taskBp.CSelectAgvBp;
import java.lang.reflect.Field;

public class Test {
    private String s = "s";
    private static final String feild = "123";

    public static void main(String[] args) {
        Field[] fields;
        for (Field f : fields = new CSelectAgvBp().getClass().getFields()) {
            System.out.println(f.getName());
        }
        System.out.println(JSONObject.toJSONString((Object)new CSelectAgvBp()));
    }
}

