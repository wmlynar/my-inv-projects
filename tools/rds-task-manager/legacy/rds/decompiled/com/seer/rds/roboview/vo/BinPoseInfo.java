/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.roboview.vo.BinPoseInfo
 */
package com.seer.rds.roboview.vo;

public class BinPoseInfo {
    private String bin_type;
    private Integer layer;
    private Double x;
    private Double y;
    private Double z;
    private Double roll;
    private Double pitch;
    private Double yaw;
    private Double width;
    private Double height;
    private Double depth;
    private Boolean board;

    public String getBin_type() {
        return this.bin_type;
    }

    public Integer getLayer() {
        return this.layer;
    }

    public Double getX() {
        return this.x;
    }

    public Double getY() {
        return this.y;
    }

    public Double getZ() {
        return this.z;
    }

    public Double getRoll() {
        return this.roll;
    }

    public Double getPitch() {
        return this.pitch;
    }

    public Double getYaw() {
        return this.yaw;
    }

    public Double getWidth() {
        return this.width;
    }

    public Double getHeight() {
        return this.height;
    }

    public Double getDepth() {
        return this.depth;
    }

    public Boolean getBoard() {
        return this.board;
    }

    public void setBin_type(String bin_type) {
        this.bin_type = bin_type;
    }

    public void setLayer(Integer layer) {
        this.layer = layer;
    }

    public void setX(Double x) {
        this.x = x;
    }

    public void setY(Double y) {
        this.y = y;
    }

    public void setZ(Double z) {
        this.z = z;
    }

    public void setRoll(Double roll) {
        this.roll = roll;
    }

    public void setPitch(Double pitch) {
        this.pitch = pitch;
    }

    public void setYaw(Double yaw) {
        this.yaw = yaw;
    }

    public void setWidth(Double width) {
        this.width = width;
    }

    public void setHeight(Double height) {
        this.height = height;
    }

    public void setDepth(Double depth) {
        this.depth = depth;
    }

    public void setBoard(Boolean board) {
        this.board = board;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof BinPoseInfo)) {
            return false;
        }
        BinPoseInfo other = (BinPoseInfo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Integer this$layer = this.getLayer();
        Integer other$layer = other.getLayer();
        if (this$layer == null ? other$layer != null : !((Object)this$layer).equals(other$layer)) {
            return false;
        }
        Double this$x = this.getX();
        Double other$x = other.getX();
        if (this$x == null ? other$x != null : !((Object)this$x).equals(other$x)) {
            return false;
        }
        Double this$y = this.getY();
        Double other$y = other.getY();
        if (this$y == null ? other$y != null : !((Object)this$y).equals(other$y)) {
            return false;
        }
        Double this$z = this.getZ();
        Double other$z = other.getZ();
        if (this$z == null ? other$z != null : !((Object)this$z).equals(other$z)) {
            return false;
        }
        Double this$roll = this.getRoll();
        Double other$roll = other.getRoll();
        if (this$roll == null ? other$roll != null : !((Object)this$roll).equals(other$roll)) {
            return false;
        }
        Double this$pitch = this.getPitch();
        Double other$pitch = other.getPitch();
        if (this$pitch == null ? other$pitch != null : !((Object)this$pitch).equals(other$pitch)) {
            return false;
        }
        Double this$yaw = this.getYaw();
        Double other$yaw = other.getYaw();
        if (this$yaw == null ? other$yaw != null : !((Object)this$yaw).equals(other$yaw)) {
            return false;
        }
        Double this$width = this.getWidth();
        Double other$width = other.getWidth();
        if (this$width == null ? other$width != null : !((Object)this$width).equals(other$width)) {
            return false;
        }
        Double this$height = this.getHeight();
        Double other$height = other.getHeight();
        if (this$height == null ? other$height != null : !((Object)this$height).equals(other$height)) {
            return false;
        }
        Double this$depth = this.getDepth();
        Double other$depth = other.getDepth();
        if (this$depth == null ? other$depth != null : !((Object)this$depth).equals(other$depth)) {
            return false;
        }
        Boolean this$board = this.getBoard();
        Boolean other$board = other.getBoard();
        if (this$board == null ? other$board != null : !((Object)this$board).equals(other$board)) {
            return false;
        }
        String this$bin_type = this.getBin_type();
        String other$bin_type = other.getBin_type();
        return !(this$bin_type == null ? other$bin_type != null : !this$bin_type.equals(other$bin_type));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BinPoseInfo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Integer $layer = this.getLayer();
        result = result * 59 + ($layer == null ? 43 : ((Object)$layer).hashCode());
        Double $x = this.getX();
        result = result * 59 + ($x == null ? 43 : ((Object)$x).hashCode());
        Double $y = this.getY();
        result = result * 59 + ($y == null ? 43 : ((Object)$y).hashCode());
        Double $z = this.getZ();
        result = result * 59 + ($z == null ? 43 : ((Object)$z).hashCode());
        Double $roll = this.getRoll();
        result = result * 59 + ($roll == null ? 43 : ((Object)$roll).hashCode());
        Double $pitch = this.getPitch();
        result = result * 59 + ($pitch == null ? 43 : ((Object)$pitch).hashCode());
        Double $yaw = this.getYaw();
        result = result * 59 + ($yaw == null ? 43 : ((Object)$yaw).hashCode());
        Double $width = this.getWidth();
        result = result * 59 + ($width == null ? 43 : ((Object)$width).hashCode());
        Double $height = this.getHeight();
        result = result * 59 + ($height == null ? 43 : ((Object)$height).hashCode());
        Double $depth = this.getDepth();
        result = result * 59 + ($depth == null ? 43 : ((Object)$depth).hashCode());
        Boolean $board = this.getBoard();
        result = result * 59 + ($board == null ? 43 : ((Object)$board).hashCode());
        String $bin_type = this.getBin_type();
        result = result * 59 + ($bin_type == null ? 43 : $bin_type.hashCode());
        return result;
    }

    public String toString() {
        return "BinPoseInfo(bin_type=" + this.getBin_type() + ", layer=" + this.getLayer() + ", x=" + this.getX() + ", y=" + this.getY() + ", z=" + this.getZ() + ", roll=" + this.getRoll() + ", pitch=" + this.getPitch() + ", yaw=" + this.getYaw() + ", width=" + this.getWidth() + ", height=" + this.getHeight() + ", depth=" + this.getDepth() + ", board=" + this.getBoard() + ")";
    }
}

