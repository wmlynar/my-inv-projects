/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.sap.conn.idoc.IDocDocument
 *  com.sap.conn.idoc.IDocDocumentList
 *  com.sap.conn.idoc.IDocMetaDataUnavailableException
 *  com.sap.conn.idoc.IDocParseException
 *  com.sap.conn.idoc.IDocSyntaxException
 *  com.sap.conn.idoc.IDocXMLProcessor
 *  com.sap.conn.idoc.jco.JCoIDoc
 *  com.sap.conn.jco.JCoDestination
 *  com.sap.conn.jco.JCoException
 *  com.seer.rds.sap.idoc.BaseIDocInboundWrapper
 *  com.seer.rds.sap.idoc.IDocInboundWrapper
 */
package com.seer.rds.sap.idoc;

import com.sap.conn.idoc.IDocDocument;
import com.sap.conn.idoc.IDocDocumentList;
import com.sap.conn.idoc.IDocMetaDataUnavailableException;
import com.sap.conn.idoc.IDocParseException;
import com.sap.conn.idoc.IDocSyntaxException;
import com.sap.conn.idoc.IDocXMLProcessor;
import com.sap.conn.idoc.jco.JCoIDoc;
import com.sap.conn.jco.JCoDestination;
import com.sap.conn.jco.JCoException;
import com.seer.rds.sap.idoc.BaseIDocInboundWrapper;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;

public class IDocInboundWrapper
extends BaseIDocInboundWrapper {
    public IDocDocument getNewIDocDocument(String p_sIDocType) throws IDocMetaDataUnavailableException {
        IDocDocument l_oIDocDocument = IDOC_FACTORY.createIDocDocument(IDOC_REPOSITORY, p_sIDocType);
        return l_oIDocDocument;
    }

    public boolean sendIDocAsIDocDocument(IDocDocument p_oIDocDocument) throws IDocSyntaxException, IDocMetaDataUnavailableException, JCoException {
        p_oIDocDocument.checkSyntax();
        JCoIDoc.send((IDocDocument)p_oIDocDocument, (char)'0', (JCoDestination)JCO_DESTINATION, (String)TID);
        JCO_DESTINATION.confirmTID(TID);
        return true;
    }

    public boolean sendIDocAsIDocXML(String p_sLocation, String p_sFileName) throws IOException, IDocParseException, JCoException, IDocSyntaxException, IDocMetaDataUnavailableException {
        String l_sIDocXML = this.readIDocXML(String.valueOf(p_sLocation) + "\\" + p_sFileName);
        IDocXMLProcessor l_oIDocXMLProcessor = IDOC_FACTORY.getIDocXMLProcessor();
        IDocDocumentList l_oIDocDocumentList = l_oIDocXMLProcessor.parse(IDOC_REPOSITORY, l_sIDocXML);
        for (int i = 0; i < l_oIDocDocumentList.size(); ++i) {
            IDocDocument l_oIDocDocument = l_oIDocDocumentList.get(i);
            l_oIDocDocument.checkSyntax();
        }
        JCoIDoc.send((IDocDocumentList)l_oIDocDocumentList, (char)'0', (JCoDestination)JCO_DESTINATION, (String)TID);
        JCO_DESTINATION.confirmTID(TID);
        return true;
    }

    private String readIDocXML(String p_sFullQualifiedFileName) throws IOException {
        String l_sLine;
        String l_sIDocXML = null;
        FileReader l_oFileReader = new FileReader(p_sFullQualifiedFileName);
        BufferedReader l_oBufferedReader = new BufferedReader(l_oFileReader);
        StringBuffer l_oStringBuffer = new StringBuffer();
        while ((l_sLine = l_oBufferedReader.readLine()) != null) {
            l_oStringBuffer.append(l_sLine);
        }
        l_sIDocXML = l_oStringBuffer.toString();
        l_oBufferedReader.close();
        l_oFileReader.close();
        return l_sIDocXML;
    }
}

