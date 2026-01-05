/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.response.AlarmDescResponseVo
 *  com.seer.rds.vo.response.AlarmDescResponseVo$AlarmDescResponseVoBuilder
 *  com.seer.rds.vo.response.AlarmDescResponseVo$CoreAlarmSolutionVo
 *  com.seer.rds.vo.response.AlarmDescResponseVo$RBKAlarmDescVO
 *  com.seer.rds.vo.response.AlarmDescResponseVo$RBKAlarmSolutionVo
 */
package com.seer.rds.vo.response;

import com.seer.rds.vo.response.AlarmDescResponseVo;

public class AlarmDescResponseVo {
    private CoreAlarmSolutionVo coreAlarmSolutionDesc;
    private RBKAlarmSolutionVo rbkAlarmSolutionDesc;
    private RBKAlarmDescVO rbkAlarmDesc;

    public static AlarmDescResponseVoBuilder builder() {
        return new AlarmDescResponseVoBuilder();
    }

    public CoreAlarmSolutionVo getCoreAlarmSolutionDesc() {
        return this.coreAlarmSolutionDesc;
    }

    public RBKAlarmSolutionVo getRbkAlarmSolutionDesc() {
        return this.rbkAlarmSolutionDesc;
    }

    public RBKAlarmDescVO getRbkAlarmDesc() {
        return this.rbkAlarmDesc;
    }

    public void setCoreAlarmSolutionDesc(CoreAlarmSolutionVo coreAlarmSolutionDesc) {
        this.coreAlarmSolutionDesc = coreAlarmSolutionDesc;
    }

    public void setRbkAlarmSolutionDesc(RBKAlarmSolutionVo rbkAlarmSolutionDesc) {
        this.rbkAlarmSolutionDesc = rbkAlarmSolutionDesc;
    }

    public void setRbkAlarmDesc(RBKAlarmDescVO rbkAlarmDesc) {
        this.rbkAlarmDesc = rbkAlarmDesc;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof AlarmDescResponseVo)) {
            return false;
        }
        AlarmDescResponseVo other = (AlarmDescResponseVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        CoreAlarmSolutionVo this$coreAlarmSolutionDesc = this.getCoreAlarmSolutionDesc();
        CoreAlarmSolutionVo other$coreAlarmSolutionDesc = other.getCoreAlarmSolutionDesc();
        if (this$coreAlarmSolutionDesc == null ? other$coreAlarmSolutionDesc != null : !this$coreAlarmSolutionDesc.equals(other$coreAlarmSolutionDesc)) {
            return false;
        }
        RBKAlarmSolutionVo this$rbkAlarmSolutionDesc = this.getRbkAlarmSolutionDesc();
        RBKAlarmSolutionVo other$rbkAlarmSolutionDesc = other.getRbkAlarmSolutionDesc();
        if (this$rbkAlarmSolutionDesc == null ? other$rbkAlarmSolutionDesc != null : !this$rbkAlarmSolutionDesc.equals(other$rbkAlarmSolutionDesc)) {
            return false;
        }
        RBKAlarmDescVO this$rbkAlarmDesc = this.getRbkAlarmDesc();
        RBKAlarmDescVO other$rbkAlarmDesc = other.getRbkAlarmDesc();
        return !(this$rbkAlarmDesc == null ? other$rbkAlarmDesc != null : !this$rbkAlarmDesc.equals(other$rbkAlarmDesc));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AlarmDescResponseVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        CoreAlarmSolutionVo $coreAlarmSolutionDesc = this.getCoreAlarmSolutionDesc();
        result = result * 59 + ($coreAlarmSolutionDesc == null ? 43 : $coreAlarmSolutionDesc.hashCode());
        RBKAlarmSolutionVo $rbkAlarmSolutionDesc = this.getRbkAlarmSolutionDesc();
        result = result * 59 + ($rbkAlarmSolutionDesc == null ? 43 : $rbkAlarmSolutionDesc.hashCode());
        RBKAlarmDescVO $rbkAlarmDesc = this.getRbkAlarmDesc();
        result = result * 59 + ($rbkAlarmDesc == null ? 43 : $rbkAlarmDesc.hashCode());
        return result;
    }

    public String toString() {
        return "AlarmDescResponseVo(coreAlarmSolutionDesc=" + this.getCoreAlarmSolutionDesc() + ", rbkAlarmSolutionDesc=" + this.getRbkAlarmSolutionDesc() + ", rbkAlarmDesc=" + this.getRbkAlarmDesc() + ")";
    }

    public AlarmDescResponseVo() {
    }

    public AlarmDescResponseVo(CoreAlarmSolutionVo coreAlarmSolutionDesc, RBKAlarmSolutionVo rbkAlarmSolutionDesc, RBKAlarmDescVO rbkAlarmDesc) {
        this.coreAlarmSolutionDesc = coreAlarmSolutionDesc;
        this.rbkAlarmSolutionDesc = rbkAlarmSolutionDesc;
        this.rbkAlarmDesc = rbkAlarmDesc;
    }
}

