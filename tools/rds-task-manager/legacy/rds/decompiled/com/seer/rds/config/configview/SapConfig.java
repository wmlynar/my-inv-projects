/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.SapConfig
 */
package com.seer.rds.config.configview;

public class SapConfig {
    private Boolean enable = false;
    public String DESTINATION_NAME = "ABAP_AS_WITHOUT_POOL";
    public String SERVER_DESTINATION_NAME = "ABAP_AS_WITHOUT_POOL";
    public String SERVER_NAME = "CN_RDS_SERVER";
    public String JCO_AS_HOST_NAME = "127.0.0.1";
    public String JCO_SYSTEM_NR = "00";
    public String JCO_CLIENT_NR = "200";
    public String JCO_USER_NAME = "username";
    public String JCO_PASSWORD = "pwd";
    public String JCO_LANGUAGE = "en";
    public String JCO_POOL_CAPACITY = "3";
    public String JCO_PEAK_LIMIT = "10";
    public String JCO_GWHOST = "127.0.0.1";
    public String JCO_GWSERV = "sapgw00";
    public String JCO_PROGID = "CN_RDS";
    public String JCO_CONNECTION_COUNT = "2";
    public String CLIENT = "200";
    public String RECIPIENTPORT = "SAPR80";
    public String RECIPIENTPARTNERNUMBER = "CN_R80_200";
    public String IDOC_USER_NAME = "IDOC_USER_NAME";

    public Boolean getEnable() {
        return this.enable;
    }

    public String getDESTINATION_NAME() {
        return this.DESTINATION_NAME;
    }

    public String getSERVER_DESTINATION_NAME() {
        return this.SERVER_DESTINATION_NAME;
    }

    public String getSERVER_NAME() {
        return this.SERVER_NAME;
    }

    public String getJCO_AS_HOST_NAME() {
        return this.JCO_AS_HOST_NAME;
    }

    public String getJCO_SYSTEM_NR() {
        return this.JCO_SYSTEM_NR;
    }

    public String getJCO_CLIENT_NR() {
        return this.JCO_CLIENT_NR;
    }

    public String getJCO_USER_NAME() {
        return this.JCO_USER_NAME;
    }

    public String getJCO_PASSWORD() {
        return this.JCO_PASSWORD;
    }

    public String getJCO_LANGUAGE() {
        return this.JCO_LANGUAGE;
    }

    public String getJCO_POOL_CAPACITY() {
        return this.JCO_POOL_CAPACITY;
    }

    public String getJCO_PEAK_LIMIT() {
        return this.JCO_PEAK_LIMIT;
    }

    public String getJCO_GWHOST() {
        return this.JCO_GWHOST;
    }

    public String getJCO_GWSERV() {
        return this.JCO_GWSERV;
    }

    public String getJCO_PROGID() {
        return this.JCO_PROGID;
    }

    public String getJCO_CONNECTION_COUNT() {
        return this.JCO_CONNECTION_COUNT;
    }

    public String getCLIENT() {
        return this.CLIENT;
    }

    public String getRECIPIENTPORT() {
        return this.RECIPIENTPORT;
    }

    public String getRECIPIENTPARTNERNUMBER() {
        return this.RECIPIENTPARTNERNUMBER;
    }

    public String getIDOC_USER_NAME() {
        return this.IDOC_USER_NAME;
    }

    public void setEnable(Boolean enable) {
        this.enable = enable;
    }

    public void setDESTINATION_NAME(String DESTINATION_NAME) {
        this.DESTINATION_NAME = DESTINATION_NAME;
    }

    public void setSERVER_DESTINATION_NAME(String SERVER_DESTINATION_NAME) {
        this.SERVER_DESTINATION_NAME = SERVER_DESTINATION_NAME;
    }

    public void setSERVER_NAME(String SERVER_NAME) {
        this.SERVER_NAME = SERVER_NAME;
    }

    public void setJCO_AS_HOST_NAME(String JCO_AS_HOST_NAME) {
        this.JCO_AS_HOST_NAME = JCO_AS_HOST_NAME;
    }

    public void setJCO_SYSTEM_NR(String JCO_SYSTEM_NR) {
        this.JCO_SYSTEM_NR = JCO_SYSTEM_NR;
    }

    public void setJCO_CLIENT_NR(String JCO_CLIENT_NR) {
        this.JCO_CLIENT_NR = JCO_CLIENT_NR;
    }

    public void setJCO_USER_NAME(String JCO_USER_NAME) {
        this.JCO_USER_NAME = JCO_USER_NAME;
    }

    public void setJCO_PASSWORD(String JCO_PASSWORD) {
        this.JCO_PASSWORD = JCO_PASSWORD;
    }

    public void setJCO_LANGUAGE(String JCO_LANGUAGE) {
        this.JCO_LANGUAGE = JCO_LANGUAGE;
    }

    public void setJCO_POOL_CAPACITY(String JCO_POOL_CAPACITY) {
        this.JCO_POOL_CAPACITY = JCO_POOL_CAPACITY;
    }

    public void setJCO_PEAK_LIMIT(String JCO_PEAK_LIMIT) {
        this.JCO_PEAK_LIMIT = JCO_PEAK_LIMIT;
    }

    public void setJCO_GWHOST(String JCO_GWHOST) {
        this.JCO_GWHOST = JCO_GWHOST;
    }

    public void setJCO_GWSERV(String JCO_GWSERV) {
        this.JCO_GWSERV = JCO_GWSERV;
    }

    public void setJCO_PROGID(String JCO_PROGID) {
        this.JCO_PROGID = JCO_PROGID;
    }

    public void setJCO_CONNECTION_COUNT(String JCO_CONNECTION_COUNT) {
        this.JCO_CONNECTION_COUNT = JCO_CONNECTION_COUNT;
    }

    public void setCLIENT(String CLIENT) {
        this.CLIENT = CLIENT;
    }

    public void setRECIPIENTPORT(String RECIPIENTPORT) {
        this.RECIPIENTPORT = RECIPIENTPORT;
    }

    public void setRECIPIENTPARTNERNUMBER(String RECIPIENTPARTNERNUMBER) {
        this.RECIPIENTPARTNERNUMBER = RECIPIENTPARTNERNUMBER;
    }

    public void setIDOC_USER_NAME(String IDOC_USER_NAME) {
        this.IDOC_USER_NAME = IDOC_USER_NAME;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof SapConfig)) {
            return false;
        }
        SapConfig other = (SapConfig)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$enable = this.getEnable();
        Boolean other$enable = other.getEnable();
        if (this$enable == null ? other$enable != null : !((Object)this$enable).equals(other$enable)) {
            return false;
        }
        String this$DESTINATION_NAME = this.getDESTINATION_NAME();
        String other$DESTINATION_NAME = other.getDESTINATION_NAME();
        if (this$DESTINATION_NAME == null ? other$DESTINATION_NAME != null : !this$DESTINATION_NAME.equals(other$DESTINATION_NAME)) {
            return false;
        }
        String this$SERVER_DESTINATION_NAME = this.getSERVER_DESTINATION_NAME();
        String other$SERVER_DESTINATION_NAME = other.getSERVER_DESTINATION_NAME();
        if (this$SERVER_DESTINATION_NAME == null ? other$SERVER_DESTINATION_NAME != null : !this$SERVER_DESTINATION_NAME.equals(other$SERVER_DESTINATION_NAME)) {
            return false;
        }
        String this$SERVER_NAME = this.getSERVER_NAME();
        String other$SERVER_NAME = other.getSERVER_NAME();
        if (this$SERVER_NAME == null ? other$SERVER_NAME != null : !this$SERVER_NAME.equals(other$SERVER_NAME)) {
            return false;
        }
        String this$JCO_AS_HOST_NAME = this.getJCO_AS_HOST_NAME();
        String other$JCO_AS_HOST_NAME = other.getJCO_AS_HOST_NAME();
        if (this$JCO_AS_HOST_NAME == null ? other$JCO_AS_HOST_NAME != null : !this$JCO_AS_HOST_NAME.equals(other$JCO_AS_HOST_NAME)) {
            return false;
        }
        String this$JCO_SYSTEM_NR = this.getJCO_SYSTEM_NR();
        String other$JCO_SYSTEM_NR = other.getJCO_SYSTEM_NR();
        if (this$JCO_SYSTEM_NR == null ? other$JCO_SYSTEM_NR != null : !this$JCO_SYSTEM_NR.equals(other$JCO_SYSTEM_NR)) {
            return false;
        }
        String this$JCO_CLIENT_NR = this.getJCO_CLIENT_NR();
        String other$JCO_CLIENT_NR = other.getJCO_CLIENT_NR();
        if (this$JCO_CLIENT_NR == null ? other$JCO_CLIENT_NR != null : !this$JCO_CLIENT_NR.equals(other$JCO_CLIENT_NR)) {
            return false;
        }
        String this$JCO_USER_NAME = this.getJCO_USER_NAME();
        String other$JCO_USER_NAME = other.getJCO_USER_NAME();
        if (this$JCO_USER_NAME == null ? other$JCO_USER_NAME != null : !this$JCO_USER_NAME.equals(other$JCO_USER_NAME)) {
            return false;
        }
        String this$JCO_PASSWORD = this.getJCO_PASSWORD();
        String other$JCO_PASSWORD = other.getJCO_PASSWORD();
        if (this$JCO_PASSWORD == null ? other$JCO_PASSWORD != null : !this$JCO_PASSWORD.equals(other$JCO_PASSWORD)) {
            return false;
        }
        String this$JCO_LANGUAGE = this.getJCO_LANGUAGE();
        String other$JCO_LANGUAGE = other.getJCO_LANGUAGE();
        if (this$JCO_LANGUAGE == null ? other$JCO_LANGUAGE != null : !this$JCO_LANGUAGE.equals(other$JCO_LANGUAGE)) {
            return false;
        }
        String this$JCO_POOL_CAPACITY = this.getJCO_POOL_CAPACITY();
        String other$JCO_POOL_CAPACITY = other.getJCO_POOL_CAPACITY();
        if (this$JCO_POOL_CAPACITY == null ? other$JCO_POOL_CAPACITY != null : !this$JCO_POOL_CAPACITY.equals(other$JCO_POOL_CAPACITY)) {
            return false;
        }
        String this$JCO_PEAK_LIMIT = this.getJCO_PEAK_LIMIT();
        String other$JCO_PEAK_LIMIT = other.getJCO_PEAK_LIMIT();
        if (this$JCO_PEAK_LIMIT == null ? other$JCO_PEAK_LIMIT != null : !this$JCO_PEAK_LIMIT.equals(other$JCO_PEAK_LIMIT)) {
            return false;
        }
        String this$JCO_GWHOST = this.getJCO_GWHOST();
        String other$JCO_GWHOST = other.getJCO_GWHOST();
        if (this$JCO_GWHOST == null ? other$JCO_GWHOST != null : !this$JCO_GWHOST.equals(other$JCO_GWHOST)) {
            return false;
        }
        String this$JCO_GWSERV = this.getJCO_GWSERV();
        String other$JCO_GWSERV = other.getJCO_GWSERV();
        if (this$JCO_GWSERV == null ? other$JCO_GWSERV != null : !this$JCO_GWSERV.equals(other$JCO_GWSERV)) {
            return false;
        }
        String this$JCO_PROGID = this.getJCO_PROGID();
        String other$JCO_PROGID = other.getJCO_PROGID();
        if (this$JCO_PROGID == null ? other$JCO_PROGID != null : !this$JCO_PROGID.equals(other$JCO_PROGID)) {
            return false;
        }
        String this$JCO_CONNECTION_COUNT = this.getJCO_CONNECTION_COUNT();
        String other$JCO_CONNECTION_COUNT = other.getJCO_CONNECTION_COUNT();
        if (this$JCO_CONNECTION_COUNT == null ? other$JCO_CONNECTION_COUNT != null : !this$JCO_CONNECTION_COUNT.equals(other$JCO_CONNECTION_COUNT)) {
            return false;
        }
        String this$CLIENT = this.getCLIENT();
        String other$CLIENT = other.getCLIENT();
        if (this$CLIENT == null ? other$CLIENT != null : !this$CLIENT.equals(other$CLIENT)) {
            return false;
        }
        String this$RECIPIENTPORT = this.getRECIPIENTPORT();
        String other$RECIPIENTPORT = other.getRECIPIENTPORT();
        if (this$RECIPIENTPORT == null ? other$RECIPIENTPORT != null : !this$RECIPIENTPORT.equals(other$RECIPIENTPORT)) {
            return false;
        }
        String this$RECIPIENTPARTNERNUMBER = this.getRECIPIENTPARTNERNUMBER();
        String other$RECIPIENTPARTNERNUMBER = other.getRECIPIENTPARTNERNUMBER();
        if (this$RECIPIENTPARTNERNUMBER == null ? other$RECIPIENTPARTNERNUMBER != null : !this$RECIPIENTPARTNERNUMBER.equals(other$RECIPIENTPARTNERNUMBER)) {
            return false;
        }
        String this$IDOC_USER_NAME = this.getIDOC_USER_NAME();
        String other$IDOC_USER_NAME = other.getIDOC_USER_NAME();
        return !(this$IDOC_USER_NAME == null ? other$IDOC_USER_NAME != null : !this$IDOC_USER_NAME.equals(other$IDOC_USER_NAME));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SapConfig;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $enable = this.getEnable();
        result = result * 59 + ($enable == null ? 43 : ((Object)$enable).hashCode());
        String $DESTINATION_NAME = this.getDESTINATION_NAME();
        result = result * 59 + ($DESTINATION_NAME == null ? 43 : $DESTINATION_NAME.hashCode());
        String $SERVER_DESTINATION_NAME = this.getSERVER_DESTINATION_NAME();
        result = result * 59 + ($SERVER_DESTINATION_NAME == null ? 43 : $SERVER_DESTINATION_NAME.hashCode());
        String $SERVER_NAME = this.getSERVER_NAME();
        result = result * 59 + ($SERVER_NAME == null ? 43 : $SERVER_NAME.hashCode());
        String $JCO_AS_HOST_NAME = this.getJCO_AS_HOST_NAME();
        result = result * 59 + ($JCO_AS_HOST_NAME == null ? 43 : $JCO_AS_HOST_NAME.hashCode());
        String $JCO_SYSTEM_NR = this.getJCO_SYSTEM_NR();
        result = result * 59 + ($JCO_SYSTEM_NR == null ? 43 : $JCO_SYSTEM_NR.hashCode());
        String $JCO_CLIENT_NR = this.getJCO_CLIENT_NR();
        result = result * 59 + ($JCO_CLIENT_NR == null ? 43 : $JCO_CLIENT_NR.hashCode());
        String $JCO_USER_NAME = this.getJCO_USER_NAME();
        result = result * 59 + ($JCO_USER_NAME == null ? 43 : $JCO_USER_NAME.hashCode());
        String $JCO_PASSWORD = this.getJCO_PASSWORD();
        result = result * 59 + ($JCO_PASSWORD == null ? 43 : $JCO_PASSWORD.hashCode());
        String $JCO_LANGUAGE = this.getJCO_LANGUAGE();
        result = result * 59 + ($JCO_LANGUAGE == null ? 43 : $JCO_LANGUAGE.hashCode());
        String $JCO_POOL_CAPACITY = this.getJCO_POOL_CAPACITY();
        result = result * 59 + ($JCO_POOL_CAPACITY == null ? 43 : $JCO_POOL_CAPACITY.hashCode());
        String $JCO_PEAK_LIMIT = this.getJCO_PEAK_LIMIT();
        result = result * 59 + ($JCO_PEAK_LIMIT == null ? 43 : $JCO_PEAK_LIMIT.hashCode());
        String $JCO_GWHOST = this.getJCO_GWHOST();
        result = result * 59 + ($JCO_GWHOST == null ? 43 : $JCO_GWHOST.hashCode());
        String $JCO_GWSERV = this.getJCO_GWSERV();
        result = result * 59 + ($JCO_GWSERV == null ? 43 : $JCO_GWSERV.hashCode());
        String $JCO_PROGID = this.getJCO_PROGID();
        result = result * 59 + ($JCO_PROGID == null ? 43 : $JCO_PROGID.hashCode());
        String $JCO_CONNECTION_COUNT = this.getJCO_CONNECTION_COUNT();
        result = result * 59 + ($JCO_CONNECTION_COUNT == null ? 43 : $JCO_CONNECTION_COUNT.hashCode());
        String $CLIENT = this.getCLIENT();
        result = result * 59 + ($CLIENT == null ? 43 : $CLIENT.hashCode());
        String $RECIPIENTPORT = this.getRECIPIENTPORT();
        result = result * 59 + ($RECIPIENTPORT == null ? 43 : $RECIPIENTPORT.hashCode());
        String $RECIPIENTPARTNERNUMBER = this.getRECIPIENTPARTNERNUMBER();
        result = result * 59 + ($RECIPIENTPARTNERNUMBER == null ? 43 : $RECIPIENTPARTNERNUMBER.hashCode());
        String $IDOC_USER_NAME = this.getIDOC_USER_NAME();
        result = result * 59 + ($IDOC_USER_NAME == null ? 43 : $IDOC_USER_NAME.hashCode());
        return result;
    }

    public String toString() {
        return "SapConfig(enable=" + this.getEnable() + ", DESTINATION_NAME=" + this.getDESTINATION_NAME() + ", SERVER_DESTINATION_NAME=" + this.getSERVER_DESTINATION_NAME() + ", SERVER_NAME=" + this.getSERVER_NAME() + ", JCO_AS_HOST_NAME=" + this.getJCO_AS_HOST_NAME() + ", JCO_SYSTEM_NR=" + this.getJCO_SYSTEM_NR() + ", JCO_CLIENT_NR=" + this.getJCO_CLIENT_NR() + ", JCO_USER_NAME=" + this.getJCO_USER_NAME() + ", JCO_PASSWORD=" + this.getJCO_PASSWORD() + ", JCO_LANGUAGE=" + this.getJCO_LANGUAGE() + ", JCO_POOL_CAPACITY=" + this.getJCO_POOL_CAPACITY() + ", JCO_PEAK_LIMIT=" + this.getJCO_PEAK_LIMIT() + ", JCO_GWHOST=" + this.getJCO_GWHOST() + ", JCO_GWSERV=" + this.getJCO_GWSERV() + ", JCO_PROGID=" + this.getJCO_PROGID() + ", JCO_CONNECTION_COUNT=" + this.getJCO_CONNECTION_COUNT() + ", CLIENT=" + this.getCLIENT() + ", RECIPIENTPORT=" + this.getRECIPIENTPORT() + ", RECIPIENTPARTNERNUMBER=" + this.getRECIPIENTPARTNERNUMBER() + ", IDOC_USER_NAME=" + this.getIDOC_USER_NAME() + ")";
    }
}

