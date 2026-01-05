/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.sap.conn.idoc.IDocFactory
 *  com.sap.conn.idoc.IDocRepository
 *  com.sap.conn.idoc.jco.JCoIDoc
 *  com.sap.conn.jco.JCoDestination
 *  com.sap.conn.jco.JCoException
 *  com.seer.rds.sap.idoc.BaseIDocInboundWrapper
 *  com.seer.rds.web.config.ConfigFileController
 */
package com.seer.rds.sap.idoc;

import com.sap.conn.idoc.IDocFactory;
import com.sap.conn.idoc.IDocRepository;
import com.sap.conn.idoc.jco.JCoIDoc;
import com.sap.conn.jco.JCoDestination;
import com.sap.conn.jco.JCoException;
import com.seer.rds.web.config.ConfigFileController;
import java.io.File;
import java.io.FileOutputStream;
import java.util.Properties;

public class BaseIDocInboundWrapper {
    protected static JCoDestination JCO_DESTINATION;
    protected static IDocRepository IDOC_REPOSITORY;
    protected static String TID;
    protected static IDocFactory IDOC_FACTORY;

    public BaseIDocInboundWrapper() throws JCoException {
        this.connectionProperties();
        this.prepareERPForIDoc();
    }

    private void createDestinationDataFile(Properties l_oConnectionProperties) {
        File destCfg = new File(String.valueOf(ConfigFileController.commonConfig.getSapConfig().getDESTINATION_NAME()) + ".jcoDestination");
        try {
            FileOutputStream fos = new FileOutputStream(destCfg, false);
            l_oConnectionProperties.store(fos, "RDS Idoc Sender Configuration");
            fos.close();
        }
        catch (Exception e) {
            throw new RuntimeException("Unable to create the destination files", e);
        }
    }

    private void connectionProperties() {
        Properties connectionProperties = new Properties();
        connectionProperties.setProperty("jco.client.ashost", ConfigFileController.commonConfig.getSapConfig().getJCO_AS_HOST_NAME());
        connectionProperties.setProperty("jco.client.sysnr", ConfigFileController.commonConfig.getSapConfig().getJCO_SYSTEM_NR());
        connectionProperties.setProperty("jco.client.client", ConfigFileController.commonConfig.getSapConfig().getJCO_CLIENT_NR());
        connectionProperties.setProperty("jco.client.user", ConfigFileController.commonConfig.getSapConfig().getJCO_USER_NAME());
        connectionProperties.setProperty("jco.client.passwd", ConfigFileController.commonConfig.getSapConfig().getJCO_PASSWORD());
        connectionProperties.setProperty("jco.client.lang", ConfigFileController.commonConfig.getSapConfig().getJCO_LANGUAGE());
        this.createDestinationDataFile(connectionProperties);
    }

    private void prepareERPForIDoc() throws JCoException {
        IDOC_REPOSITORY = JCoIDoc.getIDocRepository((JCoDestination)JCO_DESTINATION);
        TID = JCO_DESTINATION.createTID();
        IDOC_FACTORY = JCoIDoc.getIDocFactory();
    }
}

