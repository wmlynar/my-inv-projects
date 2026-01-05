/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.wind.BlockDefine
 *  com.seer.rds.vo.wind.ModifyOperatorLabelBpField
 *  com.seer.rds.vo.wind.Parent
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.vo.wind;

import com.seer.rds.vo.wind.BlockDefine;
import com.seer.rds.vo.wind.Parent;
import org.springframework.stereotype.Component;

@Component
@BlockDefine(name="\u8bbe\u7f6e\u624b\u6301\u7aef\u6309\u94ae\u7684label", parentName="\u57fa\u7840")
public class ModifyOperatorLabelBpField
implements Parent {
    public static String menuId = "menuId";
    public static String label = "label";
}

