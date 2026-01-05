/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.general.WindDetailBlockVo
 *  com.seer.rds.vo.general.WindDetailInputParamsVo
 *  com.seer.rds.vo.general.WindDetailVo
 *  com.seer.rds.vo.general.WindDetailVo$WindDetailVoBuilder
 */
package com.seer.rds.vo.general;

import com.seer.rds.vo.general.WindDetailBlockVo;
import com.seer.rds.vo.general.WindDetailInputParamsVo;
import com.seer.rds.vo.general.WindDetailVo;
import java.util.ArrayList;
import java.util.List;

public class WindDetailVo {
    private List<WindDetailInputParamsVo> inputParams = new ArrayList();
    private List<Object> outputParams = new ArrayList();
    private WindDetailBlockVo rootBlock;

    public static WindDetailVoBuilder builder() {
        return new WindDetailVoBuilder();
    }

    public List<WindDetailInputParamsVo> getInputParams() {
        return this.inputParams;
    }

    public List<Object> getOutputParams() {
        return this.outputParams;
    }

    public WindDetailBlockVo getRootBlock() {
        return this.rootBlock;
    }

    public void setInputParams(List<WindDetailInputParamsVo> inputParams) {
        this.inputParams = inputParams;
    }

    public void setOutputParams(List<Object> outputParams) {
        this.outputParams = outputParams;
    }

    public void setRootBlock(WindDetailBlockVo rootBlock) {
        this.rootBlock = rootBlock;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindDetailVo)) {
            return false;
        }
        WindDetailVo other = (WindDetailVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        List this$inputParams = this.getInputParams();
        List other$inputParams = other.getInputParams();
        if (this$inputParams == null ? other$inputParams != null : !((Object)this$inputParams).equals(other$inputParams)) {
            return false;
        }
        List this$outputParams = this.getOutputParams();
        List other$outputParams = other.getOutputParams();
        if (this$outputParams == null ? other$outputParams != null : !((Object)this$outputParams).equals(other$outputParams)) {
            return false;
        }
        WindDetailBlockVo this$rootBlock = this.getRootBlock();
        WindDetailBlockVo other$rootBlock = other.getRootBlock();
        return !(this$rootBlock == null ? other$rootBlock != null : !this$rootBlock.equals(other$rootBlock));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindDetailVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        List $inputParams = this.getInputParams();
        result = result * 59 + ($inputParams == null ? 43 : ((Object)$inputParams).hashCode());
        List $outputParams = this.getOutputParams();
        result = result * 59 + ($outputParams == null ? 43 : ((Object)$outputParams).hashCode());
        WindDetailBlockVo $rootBlock = this.getRootBlock();
        result = result * 59 + ($rootBlock == null ? 43 : $rootBlock.hashCode());
        return result;
    }

    public String toString() {
        return "WindDetailVo(inputParams=" + this.getInputParams() + ", outputParams=" + this.getOutputParams() + ", rootBlock=" + this.getRootBlock() + ")";
    }

    public WindDetailVo() {
    }

    public WindDetailVo(List<WindDetailInputParamsVo> inputParams, List<Object> outputParams, WindDetailBlockVo rootBlock) {
        this.inputParams = inputParams;
        this.outputParams = outputParams;
        this.rootBlock = rootBlock;
    }
}

