/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.LogicVo
 *  com.seer.rds.vo.general.MovementParamsVo
 *  com.seer.rds.vo.general.MovementParamsVo$MovementParamsVoBuilder
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.LogicVo;
import com.seer.rds.vo.general.MovementParamsVo;
import java.util.ArrayList;
import java.util.List;

public class MovementParamsVo {
    private int position = 0;
    private List<LogicVo> logic = new ArrayList();

    public static MovementParamsVoBuilder builder() {
        return new MovementParamsVoBuilder();
    }

    public int getPosition() {
        return this.position;
    }

    public List<LogicVo> getLogic() {
        return this.logic;
    }

    public void setPosition(int position) {
        this.position = position;
    }

    public void setLogic(List<LogicVo> logic) {
        this.logic = logic;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof MovementParamsVo)) {
            return false;
        }
        MovementParamsVo other = (MovementParamsVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        if (this.getPosition() != other.getPosition()) {
            return false;
        }
        List this$logic = this.getLogic();
        List other$logic = other.getLogic();
        return !(this$logic == null ? other$logic != null : !((Object)this$logic).equals(other$logic));
    }

    protected boolean canEqual(Object other) {
        return other instanceof MovementParamsVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getPosition();
        List $logic = this.getLogic();
        result = result * 59 + ($logic == null ? 43 : ((Object)$logic).hashCode());
        return result;
    }

    public String toString() {
        return "MovementParamsVo(position=" + this.getPosition() + ", logic=" + this.getLogic() + ")";
    }

    public MovementParamsVo() {
    }

    public MovementParamsVo(int position, List<LogicVo> logic) {
        this.position = position;
        this.logic = logic;
    }
}

