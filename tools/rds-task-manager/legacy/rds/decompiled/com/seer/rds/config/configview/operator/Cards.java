/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.configview.operator.Card
 *  com.seer.rds.config.configview.operator.Cards
 */
package com.seer.rds.config.configview.operator;

import com.seer.rds.config.configview.operator.Card;
import java.util.List;

public class Cards {
    private Boolean enable = false;
    private List<Card> card = null;

    public Boolean getEnable() {
        return this.enable;
    }

    public List<Card> getCard() {
        return this.card;
    }

    public void setEnable(Boolean enable) {
        this.enable = enable;
    }

    public void setCard(List<Card> card) {
        this.card = card;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof Cards)) {
            return false;
        }
        Cards other = (Cards)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        Boolean this$enable = this.getEnable();
        Boolean other$enable = other.getEnable();
        if (this$enable == null ? other$enable != null : !((Object)this$enable).equals(other$enable)) {
            return false;
        }
        List this$card = this.getCard();
        List other$card = other.getCard();
        return !(this$card == null ? other$card != null : !((Object)this$card).equals(other$card));
    }

    protected boolean canEqual(Object other) {
        return other instanceof Cards;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Boolean $enable = this.getEnable();
        result = result * 59 + ($enable == null ? 43 : ((Object)$enable).hashCode());
        List $card = this.getCard();
        result = result * 59 + ($card == null ? 43 : ((Object)$card).hashCode());
        return result;
    }

    public String toString() {
        return "Cards(enable=" + this.getEnable() + ", card=" + this.getCard() + ")";
    }
}

