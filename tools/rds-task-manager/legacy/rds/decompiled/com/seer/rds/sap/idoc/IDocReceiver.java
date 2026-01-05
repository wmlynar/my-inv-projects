/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.sap.conn.idoc.IDocDocumentList
 *  com.sap.conn.idoc.IDocXMLProcessor
 *  com.sap.conn.idoc.jco.JCoIDoc
 *  com.sap.conn.idoc.jco.JCoIDocHandlerFactory
 *  com.sap.conn.idoc.jco.JCoIDocServer
 *  com.sap.conn.jco.server.JCoServerErrorListener
 *  com.sap.conn.jco.server.JCoServerExceptionListener
 *  com.sap.conn.jco.server.JCoServerTIDHandler
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.config.configview.CommonConfig
 *  com.seer.rds.sap.idoc.IDocReceiver
 *  com.seer.rds.sap.idoc.IDocReceiver$IDocHandlerFactory
 *  com.seer.rds.sap.idoc.IDocReceiver$ThrowableListener
 *  com.seer.rds.sap.idoc.IDocReceiver$TidHandler
 *  com.seer.rds.script.ScriptService
 *  com.seer.rds.web.config.ConfigFileController
 *  javax.annotation.PostConstruct
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.sap.idoc;

import com.sap.conn.idoc.IDocDocumentList;
import com.sap.conn.idoc.IDocXMLProcessor;
import com.sap.conn.idoc.jco.JCoIDoc;
import com.sap.conn.idoc.jco.JCoIDocHandlerFactory;
import com.sap.conn.idoc.jco.JCoIDocServer;
import com.sap.conn.jco.server.JCoServerErrorListener;
import com.sap.conn.jco.server.JCoServerExceptionListener;
import com.sap.conn.jco.server.JCoServerTIDHandler;
import com.seer.rds.config.PropConfig;
import com.seer.rds.config.configview.CommonConfig;
import com.seer.rds.sap.idoc.IDocReceiver;
import com.seer.rds.script.ScriptService;
import com.seer.rds.web.config.ConfigFileController;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Properties;
import javax.annotation.PostConstruct;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

@Component
public class IDocReceiver {
    private final Logger log = LoggerFactory.getLogger(this.getClass());
    @Autowired
    private ConfigFileController configFileController;
    @Autowired
    private ScriptService scriptService;

    @PostConstruct
    public void createIdocServerAndConnect() {
        try {
            if (!PropConfig.ifEnableIdocServer().booleanValue()) {
                return;
            }
            this.log.info("\u542f\u52a8 Idoc Server ....");
            CommonConfig commonConfig = ConfigFileController.commonConfig;
            if (null == commonConfig) {
                this.log.info("\u542f\u52a8 Idoc Server \u5931\u8d25\uff1a\u672a\u52a0\u8f7d\u6b63\u786e\u5230 biz \u914d\u7f6e\u6587\u4ef6\u3002");
                return;
            }
            this.start();
        }
        catch (Exception e) {
            this.log.error("\u542f\u52a8 Idoc Server \u5931\u8d25\uff0c\u8bf7\u68c0\u67e5 application-biz.yml \u6587\u4ef6\u914d\u7f6e\u662f\u5426\u6b63\u786e\u3002" + e.getMessage());
        }
    }

    public void start() {
        try {
            this.serverProperties();
            JCoIDocServer server = JCoIDoc.getServer((String)ConfigFileController.commonConfig.getSapConfig().getSERVER_NAME());
            server.setIDocHandlerFactory((JCoIDocHandlerFactory)new IDocHandlerFactory(this));
            server.setTIDHandler((JCoServerTIDHandler)new TidHandler(this));
            ThrowableListener listener = new ThrowableListener(this);
            server.addServerErrorListener((JCoServerErrorListener)listener);
            server.addServerExceptionListener((JCoServerExceptionListener)listener);
            server.setConnectionCount(1);
            server.start();
            this.log.info("Idoc Server \u542f\u52a8\u6210\u529f\u3002");
        }
        catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private void serverProperties() {
        Properties connectionProperties = new Properties();
        connectionProperties.setProperty("jco.client.ashost", ConfigFileController.commonConfig.getSapConfig().getJCO_AS_HOST_NAME());
        connectionProperties.setProperty("jco.client.sysnr", ConfigFileController.commonConfig.getSapConfig().getJCO_SYSTEM_NR());
        connectionProperties.setProperty("jco.client.client", ConfigFileController.commonConfig.getSapConfig().getJCO_CLIENT_NR());
        connectionProperties.setProperty("jco.client.user", ConfigFileController.commonConfig.getSapConfig().getJCO_USER_NAME());
        connectionProperties.setProperty("jco.client.passwd", ConfigFileController.commonConfig.getSapConfig().getJCO_PASSWORD());
        connectionProperties.setProperty("jco.client.lang", ConfigFileController.commonConfig.getSapConfig().getJCO_LANGUAGE());
        connectionProperties.setProperty("jco.destination.pool_capacity", ConfigFileController.commonConfig.getSapConfig().getJCO_POOL_CAPACITY());
        connectionProperties.setProperty("jco.destination.peak_limit", ConfigFileController.commonConfig.getSapConfig().getJCO_PEAK_LIMIT());
        this.createDataFile(ConfigFileController.commonConfig.getSapConfig().getSERVER_DESTINATION_NAME(), "jcoDestination", connectionProperties);
        Properties servertProperties = new Properties();
        servertProperties.setProperty("jco.server.gwhost", ConfigFileController.commonConfig.getSapConfig().getJCO_GWHOST());
        servertProperties.setProperty("jco.server.gwserv", ConfigFileController.commonConfig.getSapConfig().getJCO_GWSERV());
        servertProperties.setProperty("jco.server.progid", ConfigFileController.commonConfig.getSapConfig().getJCO_PROGID());
        servertProperties.setProperty("jco.server.repository_destination", ConfigFileController.commonConfig.getSapConfig().getSERVER_DESTINATION_NAME());
        servertProperties.setProperty("jco.server.connection_count", ConfigFileController.commonConfig.getSapConfig().getJCO_CONNECTION_COUNT());
        this.createDataFile(ConfigFileController.commonConfig.getSapConfig().getSERVER_NAME(), "jcoServer", servertProperties);
    }

    void createDataFile(String name, String suffix, Properties properties) {
        File cfg = new File(String.valueOf(name) + "." + suffix);
        if (!cfg.exists()) {
            try {
                FileOutputStream fos = new FileOutputStream(cfg, false);
                properties.store(fos, "RDS Idoc Receiver Configuration");
                fos.close();
            }
            catch (Exception e) {
                throw new RuntimeException("Unable to create the destination file " + cfg.getName(), e);
            }
        }
    }

    void analysisXML(String url) throws ParserConfigurationException, SAXException, IOException {
        String string;
        DocumentBuilderFactory bdf = DocumentBuilderFactory.newInstance();
        DocumentBuilder db = bdf.newDocumentBuilder();
        Document document = db.parse(new File(url));
        NodeList list = document.getElementsByTagName("E1LTORH");
        for (int i = 0; i < list.getLength(); ++i) {
            Element element = (Element)list.item(i);
            String warehouse = element.getElementsByTagName("LGNUM").item(0).getFirstChild().getNodeValue();
            String ordername = element.getElementsByTagName("TANUM").item(0).getFirstChild().getNodeValue();
            String quality = element.getElementsByTagName("SOLEX").item(0).getFirstChild().getNodeValue().substring(6, 10);
            string = element.getElementsByTagName("LZNUM").item(0).getFirstChild().getNodeValue();
        }
        NodeList list2 = document.getElementsByTagName("E1LTORI");
        for (int j = 0; j < list2.getLength(); ++j) {
            Element element2 = (Element)list.item(j);
            String item = element2.getElementsByTagName("TAPOS").item(0).getFirstChild().getNodeValue();
            String source = element2.getElementsByTagName("VLPLA").item(0).getFirstChild().getNodeValue();
            string = element2.getElementsByTagName("NLPLA").item(0).getFirstChild().getNodeValue();
        }
    }

    public String convertIDocListToXML(IDocDocumentList idocDocumentList) {
        IDocXMLProcessor xmlProcessor = JCoIDoc.getIDocFactory().getIDocXMLProcessor();
        String xmlString = xmlProcessor.render(idocDocumentList, 7);
        return xmlString;
    }

    public static void main(String[] args) {
        ScriptService scriptService = new ScriptService();
        scriptService.execute(ScriptService.onIdocReceivedFunction, (Object)"123");
    }
}

