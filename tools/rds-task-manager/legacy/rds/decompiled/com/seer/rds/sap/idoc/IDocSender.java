/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.sap.conn.idoc.IDocConversionException
 *  com.sap.conn.idoc.IDocDocument
 *  com.sap.conn.idoc.IDocFieldNotFoundException
 *  com.sap.conn.idoc.IDocIllegalTypeException
 *  com.sap.conn.idoc.IDocMetaDataUnavailableException
 *  com.sap.conn.idoc.IDocSegment
 *  com.sap.conn.idoc.IDocSyntaxException
 *  com.sap.conn.jco.JCoException
 *  com.seer.rds.sap.idoc.IDocInboundWrapper
 *  com.seer.rds.sap.idoc.IDocSender
 *  com.seer.rds.web.config.ConfigFileController
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.sap.idoc;

import com.sap.conn.idoc.IDocConversionException;
import com.sap.conn.idoc.IDocDocument;
import com.sap.conn.idoc.IDocFieldNotFoundException;
import com.sap.conn.idoc.IDocIllegalTypeException;
import com.sap.conn.idoc.IDocMetaDataUnavailableException;
import com.sap.conn.idoc.IDocSegment;
import com.sap.conn.idoc.IDocSyntaxException;
import com.sap.conn.jco.JCoException;
import com.seer.rds.sap.idoc.IDocInboundWrapper;
import com.seer.rds.web.config.ConfigFileController;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class IDocSender {
    @Autowired
    private ConfigFileController configFileController;
    private final Logger log = LoggerFactory.getLogger(IDocSender.class);

    public void SendJournalInfoToSAP() {
        this.log.info("SendJournalInfoToSAP :: Start");
        try {
            HashMap headerMap = new HashMap();
            String journalHeadValueId = (String)headerMap.get("journalHeadValueId");
            String DOC_TYPE = (String)headerMap.get("BLART");
            String COMP_CODE = (String)headerMap.get("BUKRS");
            Date DOC_DATE = (Date)headerMap.get("BLDAT");
            Date PSTNG_DATE = (Date)headerMap.get("BUDAT");
            String USERNAME = (String)headerMap.get("USNAM");
            if (USERNAME == null || USERNAME.isEmpty()) {
                USERNAME = "QX0HLY01";
            }
            String HEADER_TXT = (String)headerMap.get("BKTXT");
            String CURRENCY = (String)headerMap.get("WAERS");
            IDocInboundWrapper l_oIDocInboundReceiptWrapper = new IDocInboundWrapper();
            IDocDocument l_oIDocDocument = l_oIDocInboundReceiptWrapper.getNewIDocDocument("ACC_EMPLOYEE");
            IDocSegment l_oIDocSegment = l_oIDocDocument.getRootSegment();
            l_oIDocDocument.setClient(ConfigFileController.commonConfig.getSapConfig().getCLIENT());
            l_oIDocDocument.setIDocSAPRelease("740");
            l_oIDocDocument.setStatus("53");
            l_oIDocDocument.setDirection("2");
            l_oIDocDocument.setIDocType("ACC_EMPLOYEE");
            l_oIDocDocument.setMessageType("ACC_EMPLOYEE_EXP");
            l_oIDocDocument.setSenderPort("CN_HLY");
            l_oIDocDocument.setSenderPartnerType("LS");
            l_oIDocDocument.setSenderPartnerNumber("CN_HLY");
            l_oIDocDocument.setRecipientPort(ConfigFileController.commonConfig.getSapConfig().getRECIPIENTPORT());
            l_oIDocDocument.setRecipientPartnerType("LS");
            l_oIDocDocument.setRecipientPartnerNumber(ConfigFileController.commonConfig.getSapConfig().getRECIPIENTPARTNERNUMBER());
            Date date = new Date(System.currentTimeMillis());
            l_oIDocDocument.setCreationDate(date);
            l_oIDocDocument.setCreationTime(date);
            l_oIDocSegment = l_oIDocSegment.addChild("E1BPACHE04");
            l_oIDocSegment.setValue("COMP_CODE", COMP_CODE);
            l_oIDocSegment.setValue("COMPO_ACC", "ACC");
            l_oIDocSegment.setValue("DOC_DATE", DOC_DATE.toString());
            l_oIDocSegment.setValue("PSTNG_DATE", PSTNG_DATE.toString());
            l_oIDocSegment.setValue("DOC_TYPE", DOC_TYPE);
            l_oIDocSegment.setValue("USERNAME", USERNAME);
            l_oIDocSegment.setValue("HEADER_TXT", journalHeadValueId);
            l_oIDocSegment.setValue("TRANS_DATE", DOC_DATE.toString());
            ArrayList itemlist = new ArrayList();
            for (int j = 0; j < itemlist.size(); ++j) {
                Map itemMap = new HashMap();
                itemMap = (Map)itemlist.get(j);
                String journalHeadValueId_item = (String)itemMap.get("journalHeadValueId");
                if (!journalHeadValueId.equals(journalHeadValueId_item)) continue;
                int ITEMNO_ACC = (Integer)itemMap.get("BUZEI");
                String GL_ACCOUNT = (String)itemMap.get("HKONT");
                String ITEM_TEXT = (String)itemMap.get("SGTXT");
                String TAX_CODE = (String)itemMap.get("MWSKZ");
                String COSTCENTER = (String)itemMap.get("KOSTL");
                String ORDERID = (String)itemMap.get("AUFNR");
                BigDecimal AMT_DOCCUR = (BigDecimal)itemMap.get("WRBTR");
                BigDecimal AMT_BASE = (BigDecimal)itemMap.get("FWBAS");
                String AMT_DOCCURstr = "";
                if (AMT_DOCCUR != null) {
                    AMT_DOCCURstr = AMT_DOCCUR.toString();
                }
                String AMT_BASEstr = "";
                if (AMT_BASE != null) {
                    AMT_BASEstr = AMT_BASE.toString();
                }
                if (AMT_BASE != null && AMT_BASE.doubleValue() > 0.0) {
                    l_oIDocSegment = l_oIDocSegment.addSibling("E1BPACTX01");
                    l_oIDocSegment.setValue("ITEMNO_ACC", ITEMNO_ACC);
                    l_oIDocSegment.setValue("GL_ACCOUNT", GL_ACCOUNT);
                    l_oIDocSegment.setValue("TAX_CODE", TAX_CODE);
                } else {
                    l_oIDocSegment = l_oIDocSegment.addSibling("E1BPACGL04");
                    l_oIDocSegment.setValue("ITEMNO_ACC", ITEMNO_ACC);
                    l_oIDocSegment.setValue("GL_ACCOUNT", GL_ACCOUNT);
                    l_oIDocSegment.setValue("PSTNG_DATE", PSTNG_DATE.toString());
                    l_oIDocSegment.setValue("DOC_TYPE", DOC_TYPE);
                    l_oIDocSegment.setValue("ITEM_TEXT", ITEM_TEXT);
                    l_oIDocSegment.setValue("TAX_CODE", TAX_CODE);
                    l_oIDocSegment.setValue("COSTCENTER", COSTCENTER);
                    l_oIDocSegment.setValue("ORDERID", ORDERID);
                }
                l_oIDocSegment = l_oIDocSegment.addSibling("E1BPACCR04");
                l_oIDocSegment.setValue("ITEMNO_ACC", ITEMNO_ACC);
                l_oIDocSegment.setValue("CURR_TYPE", "00");
                l_oIDocSegment.setValue("CURRENCY", CURRENCY);
                l_oIDocSegment.setValue("AMT_DOCCUR", AMT_DOCCURstr);
                l_oIDocSegment.setValue("AMT_BASE", AMT_BASEstr);
            }
            this.log.info("SendJournalInfoToSAP :: Send Started: journalHeadValueId :: " + journalHeadValueId);
            boolean l_oResponse = l_oIDocInboundReceiptWrapper.sendIDocAsIDocDocument(l_oIDocDocument);
            if (l_oResponse) {
                this.log.info("SendJournalInfoToSAP :: Send successful: journalHeadValueId :: " + journalHeadValueId);
            }
            this.log.info("SendJournalInfoToSAP :: end");
        }
        catch (IDocIllegalTypeException oX) {
            this.log.error("An IDocIllegalTypeException has occured", (Throwable)oX);
            this.log.info("An IDocIllegalTypeException has occured :: " + oX.getMessage());
        }
        catch (IDocSyntaxException oX2) {
            this.log.error("An IDocSyntaxException has occured", (Throwable)oX2);
            this.log.info("An IDocSyntaxException has occured :: " + oX2.getMessage());
        }
        catch (IDocMetaDataUnavailableException oX3) {
            this.log.error("An IDocMetaDataUnavailableException has occured", (Throwable)oX3);
            this.log.info("An IDocMetaDataUnavailableException has occured :: " + oX3.getMessage());
        }
        catch (JCoException oX4) {
            this.log.error("A JCoException has occured", (Throwable)oX4);
            this.log.info("A JCoException has occured :: " + oX4.getMessage());
        }
        catch (IDocFieldNotFoundException oX5) {
            this.log.error("IDocFieldNotFoundException", (Throwable)oX5);
            this.log.info("IDocFieldNotFoundException :: " + oX5.getMessage());
        }
        catch (IDocConversionException oX6) {
            this.log.error("IDocConversionException", (Throwable)oX6);
            this.log.info("IDocConversionException :: " + oX6.getMessage());
        }
        catch (Exception e) {
            this.log.error("IDocException", (Throwable)e);
            this.log.info("IDocException :: " + e.getMessage());
        }
    }
}

