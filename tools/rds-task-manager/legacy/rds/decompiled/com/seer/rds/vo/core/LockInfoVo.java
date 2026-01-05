/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.vo.core.LockInfoVo
 */
package com.seer.rds.vo.core;

public class LockInfoVo {
    private String desc;
    private String ip;
    private Boolean locked;
    private String nick_name;
    private Integer port;
    private String time_t;
    private Integer type;

    public String getDesc() {
        return this.desc;
    }

    public String getIp() {
        return this.ip;
    }

    public Boolean getLocked() {
        return this.locked;
    }

    public String getNick_name() {
        return this.nick_name;
    }

    public Integer getPort() {
        return this.port;
    }

    public String getTime_t() {
        return this.time_t;
    }

    public Integer getType() {
        return this.type;
    }

    public void setDesc(String desc) {
        this.desc = desc;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public void setLocked(Boolean locked) {
        this.locked = locked;
    }

    public void setNick_name(String nick_name) {
        this.nick_name = nick_name;
    }

    public void setPort(Integer port) {
        this.port = port;
    }

    public void setTime_t(String time_t) {
        this.time_t = time_t;
    }

    public void setType(Integer type) {
        this.type = type;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof LockInfoVo)) {
            return false;
        }
        LockInfoVo other = (LockInfoVo)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$locked = this.getLocked();
        Boolean other$locked = other.getLocked();
        if (this$locked == null ? other$locked != null : !((Object)this$locked).equals(other$locked)) {
            return false;
        }
        Integer this$port = this.getPort();
        Integer other$port = other.getPort();
        if (this$port == null ? other$port != null : !((Object)this$port).equals(other$port)) {
            return false;
        }
        Integer this$type = this.getType();
        Integer other$type = other.getType();
        if (this$type == null ? other$type != null : !((Object)this$type).equals(other$type)) {
            return false;
        }
        String this$desc = this.getDesc();
        String other$desc = other.getDesc();
        if (this$desc == null ? other$desc != null : !this$desc.equals(other$desc)) {
            return false;
        }
        String this$ip = this.getIp();
        String other$ip = other.getIp();
        if (this$ip == null ? other$ip != null : !this$ip.equals(other$ip)) {
            return false;
        }
        String this$nick_name = this.getNick_name();
        String other$nick_name = other.getNick_name();
        if (this$nick_name == null ? other$nick_name != null : !this$nick_name.equals(other$nick_name)) {
            return false;
        }
        String this$time_t = this.getTime_t();
        String other$time_t = other.getTime_t();
        return !(this$time_t == null ? other$time_t != null : !this$time_t.equals(other$time_t));
    }

    protected boolean canEqual(Object other) {
        return other instanceof LockInfoVo;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $locked = this.getLocked();
        result = result * 59 + ($locked == null ? 43 : ((Object)$locked).hashCode());
        Integer $port = this.getPort();
        result = result * 59 + ($port == null ? 43 : ((Object)$port).hashCode());
        Integer $type = this.getType();
        result = result * 59 + ($type == null ? 43 : ((Object)$type).hashCode());
        String $desc = this.getDesc();
        result = result * 59 + ($desc == null ? 43 : $desc.hashCode());
        String $ip = this.getIp();
        result = result * 59 + ($ip == null ? 43 : $ip.hashCode());
        String $nick_name = this.getNick_name();
        result = result * 59 + ($nick_name == null ? 43 : $nick_name.hashCode());
        String $time_t = this.getTime_t();
        result = result * 59 + ($time_t == null ? 43 : $time_t.hashCode());
        return result;
    }

    public String toString() {
        return "LockInfoVo(desc=" + this.getDesc() + ", ip=" + this.getIp() + ", locked=" + this.getLocked() + ", nick_name=" + this.getNick_name() + ", port=" + this.getPort() + ", time_t=" + this.getTime_t() + ", type=" + this.getType() + ")";
    }

    public LockInfoVo(String desc, String ip, Boolean locked, String nick_name, Integer port, String time_t, Integer type) {
        this.desc = desc;
        this.ip = ip;
        this.locked = locked;
        this.nick_name = nick_name;
        this.port = port;
        this.time_t = time_t;
        this.type = type;
    }

    public LockInfoVo() {
    }
}

