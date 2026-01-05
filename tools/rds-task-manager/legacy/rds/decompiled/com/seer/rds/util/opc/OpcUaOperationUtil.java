/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.OpcUaConfig
 *  com.seer.rds.listener.impl.OPCSubscriptionListener
 *  com.seer.rds.util.SpringUtil
 *  com.seer.rds.util.opc.OpcUaClientBuilder
 *  com.seer.rds.util.opc.OpcUaOperationUtil
 *  org.eclipse.milo.opcua.sdk.client.OpcUaClient
 *  org.eclipse.milo.opcua.sdk.client.api.subscriptions.UaSubscription
 *  org.eclipse.milo.opcua.sdk.client.api.subscriptions.UaSubscription$ItemCreationCallback
 *  org.eclipse.milo.opcua.sdk.client.api.subscriptions.UaSubscription$NotificationListener
 *  org.eclipse.milo.opcua.stack.core.AttributeId
 *  org.eclipse.milo.opcua.stack.core.Identifiers
 *  org.eclipse.milo.opcua.stack.core.types.builtin.ByteString
 *  org.eclipse.milo.opcua.stack.core.types.builtin.DataValue
 *  org.eclipse.milo.opcua.stack.core.types.builtin.NodeId
 *  org.eclipse.milo.opcua.stack.core.types.builtin.StatusCode
 *  org.eclipse.milo.opcua.stack.core.types.builtin.Variant
 *  org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.UInteger
 *  org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.UShort
 *  org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.Unsigned
 *  org.eclipse.milo.opcua.stack.core.types.enumerated.BrowseDirection
 *  org.eclipse.milo.opcua.stack.core.types.enumerated.BrowseResultMask
 *  org.eclipse.milo.opcua.stack.core.types.enumerated.MonitoringMode
 *  org.eclipse.milo.opcua.stack.core.types.enumerated.NodeClass
 *  org.eclipse.milo.opcua.stack.core.types.enumerated.TimestampsToReturn
 *  org.eclipse.milo.opcua.stack.core.types.structured.BrowseDescription
 *  org.eclipse.milo.opcua.stack.core.types.structured.BrowseResult
 *  org.eclipse.milo.opcua.stack.core.types.structured.MonitoredItemCreateRequest
 *  org.eclipse.milo.opcua.stack.core.types.structured.MonitoringParameters
 *  org.eclipse.milo.opcua.stack.core.types.structured.ReadValueId
 *  org.eclipse.milo.opcua.stack.core.types.structured.ReferenceDescription
 *  org.eclipse.milo.opcua.stack.core.util.ConversionUtil
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util.opc;

import com.seer.rds.config.OpcUaConfig;
import com.seer.rds.listener.impl.OPCSubscriptionListener;
import com.seer.rds.util.SpringUtil;
import com.seer.rds.util.opc.OpcUaClientBuilder;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.atomic.AtomicInteger;
import org.eclipse.milo.opcua.sdk.client.OpcUaClient;
import org.eclipse.milo.opcua.sdk.client.api.subscriptions.UaSubscription;
import org.eclipse.milo.opcua.stack.core.AttributeId;
import org.eclipse.milo.opcua.stack.core.Identifiers;
import org.eclipse.milo.opcua.stack.core.types.builtin.ByteString;
import org.eclipse.milo.opcua.stack.core.types.builtin.DataValue;
import org.eclipse.milo.opcua.stack.core.types.builtin.NodeId;
import org.eclipse.milo.opcua.stack.core.types.builtin.StatusCode;
import org.eclipse.milo.opcua.stack.core.types.builtin.Variant;
import org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.UInteger;
import org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.UShort;
import org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.Unsigned;
import org.eclipse.milo.opcua.stack.core.types.enumerated.BrowseDirection;
import org.eclipse.milo.opcua.stack.core.types.enumerated.BrowseResultMask;
import org.eclipse.milo.opcua.stack.core.types.enumerated.MonitoringMode;
import org.eclipse.milo.opcua.stack.core.types.enumerated.NodeClass;
import org.eclipse.milo.opcua.stack.core.types.enumerated.TimestampsToReturn;
import org.eclipse.milo.opcua.stack.core.types.structured.BrowseDescription;
import org.eclipse.milo.opcua.stack.core.types.structured.BrowseResult;
import org.eclipse.milo.opcua.stack.core.types.structured.MonitoredItemCreateRequest;
import org.eclipse.milo.opcua.stack.core.types.structured.MonitoringParameters;
import org.eclipse.milo.opcua.stack.core.types.structured.ReadValueId;
import org.eclipse.milo.opcua.stack.core.types.structured.ReferenceDescription;
import org.eclipse.milo.opcua.stack.core.util.ConversionUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class OpcUaOperationUtil {
    private static final Logger log = LoggerFactory.getLogger(OpcUaOperationUtil.class);
    private static AtomicInteger subscriptionCount = new AtomicInteger(1);
    public static ConcurrentHashMap<String, UaSubscription> subscriptionList = new ConcurrentHashMap();
    public static ConcurrentHashMap<String, Variant> subscriptionCallbackValues = new ConcurrentHashMap();

    public static void browseNode() {
        OpcUaClient client = OpcUaClientBuilder.opcUaClient;
        try {
            client.connect().get();
            OpcUaOperationUtil.browseNode((String)"", (OpcUaClient)client, (NodeId)Identifiers.RootFolder);
        }
        catch (Exception e) {
            log.error("opc browse\u5931\u8d25", (Throwable)e);
        }
    }

    public static void ping() throws Exception {
        OpcUaClient client = OpcUaClientBuilder.opcUaClient;
        client.connect().get();
    }

    public static Object readDeviceValue(Integer namespaceIndex, String identifier) throws Exception {
        if (namespaceIndex == null) {
            namespaceIndex = 2;
        }
        NodeId nodeId = OpcUaOperationUtil.nodeId((Integer)namespaceIndex, (String)identifier);
        return OpcUaOperationUtil.doRead((NodeId)nodeId);
    }

    private static NodeId nodeId(Integer namespaceIndex, String identifier) {
        if (identifier.startsWith("g=")) {
            return new NodeId(namespaceIndex.intValue(), UUID.fromString(identifier.substring(2)));
        }
        if (identifier.startsWith("i=")) {
            return new NodeId(namespaceIndex.intValue(), Integer.valueOf(identifier.substring(2)).intValue());
        }
        if (identifier.startsWith("b=")) {
            byte[] decode = Base64.getDecoder().decode(identifier.substring(2));
            return new NodeId(namespaceIndex.intValue(), ByteString.of((byte[])decode));
        }
        if (identifier.startsWith("s=")) {
            return new NodeId(namespaceIndex.intValue(), identifier.substring(2));
        }
        return new NodeId(namespaceIndex.intValue(), identifier);
    }

    public static Object readDeviceValue(Integer namespaceIndex, int identifier) throws Exception {
        if (namespaceIndex == null) {
            namespaceIndex = 2;
        }
        NodeId nodeId = new NodeId(namespaceIndex.intValue(), identifier);
        return OpcUaOperationUtil.doRead((NodeId)nodeId);
    }

    private static Object doRead(NodeId nodeId) throws Exception {
        OpcUaClient client = OpcUaClientBuilder.opcUaClient;
        UShort namespaceIndex = nodeId.getNamespaceIndex();
        Object identifier = nodeId.getIdentifier();
        try {
            client.connect().get();
            CompletableFuture readValue = client.readValue(0.0, TimestampsToReturn.Both, nodeId);
            DataValue value = (DataValue)readValue.get();
            if (value.getStatusCode() != null) {
                if (value.getStatusCode().isGood()) {
                    return value.getValue().getValue();
                }
                log.error("\u8bfb\u53d6\u8bbe\u5907\u5f02\u5e38\uff0cidx:{}, id:{},statusCode:{}", new Object[]{namespaceIndex, identifier, value.getStatusCode().getValue()});
                throw new Exception("readOpcValue error: " + value.getStatusCode());
            }
            log.error("idx:{},id:{}, \u672a\u8bfb\u53d6\u5230\u8bbe\u5907\u6570\u636e", (Object)namespaceIndex, identifier);
            throw new Exception("read device error");
        }
        catch (Exception e) {
            log.error("idx:{},id:{}, \u8bfb\u53d6opc\u8bbe\u5907\u6570\u636e\u5f02\u5e38", new Object[]{namespaceIndex, identifier, e});
            throw e;
        }
    }

    public static Object readDeviceValueBySubscription(Integer namespaceIndex, String identifier) {
        String subscriptionCallbackKey = namespaceIndex + ":" + identifier;
        if (subscriptionList.containsKey(subscriptionCallbackKey)) {
            Variant value = (Variant)subscriptionCallbackValues.get(subscriptionCallbackKey);
            if (value != null) {
                return value.getValue();
            }
            log.warn("Variant value: {} is null.", (Object)subscriptionCallbackKey);
            return null;
        }
        OpcUaOperationUtil.createSubscriptionAndCallback((Integer)namespaceIndex, (String)identifier);
        Variant value = (Variant)subscriptionCallbackValues.get(subscriptionCallbackKey);
        if (value != null) {
            return value.getValue();
        }
        log.warn("Variant value: {} is null.", (Object)subscriptionCallbackKey);
        return null;
    }

    public static Object readDeviceValueBySubscription(Integer namespaceIndex, int identifier) {
        String subscriptionCallbackKey = namespaceIndex + ":" + identifier;
        if (subscriptionList.containsKey(subscriptionCallbackKey)) {
            Variant value = (Variant)subscriptionCallbackValues.get(subscriptionCallbackKey);
            if (value != null) {
                return value.getValue();
            }
            log.warn("Variant value: {} is null.", (Object)subscriptionCallbackKey);
            return null;
        }
        OpcUaOperationUtil.createSubscriptionAndCallback((Integer)namespaceIndex, (int)identifier);
        Variant value = (Variant)subscriptionCallbackValues.get(subscriptionCallbackKey);
        if (value != null) {
            return value.getValue();
        }
        log.warn("Variant value: {} is null.", (Object)subscriptionCallbackKey);
        return null;
    }

    public static boolean writeDeviceValue(Integer namespaceIndex, String identifier, Object editValue) {
        if (namespaceIndex == null) {
            namespaceIndex = 2;
        }
        NodeId nodeId = OpcUaOperationUtil.nodeId((Integer)namespaceIndex, (String)identifier);
        return OpcUaOperationUtil.doWrite((NodeId)nodeId, (Object)editValue);
    }

    public static boolean writeDeviceValue(Integer namespaceIndex, int identifier, Object editValue) {
        if (namespaceIndex == null) {
            namespaceIndex = 2;
        }
        NodeId nodeId = new NodeId(namespaceIndex.intValue(), identifier);
        return OpcUaOperationUtil.doWrite((NodeId)nodeId, (Object)editValue);
    }

    private static boolean doWrite(NodeId nodeId, Object editValue) {
        OpcUaClient client = OpcUaClientBuilder.opcUaClient;
        UShort namespaceIndex = nodeId.getNamespaceIndex();
        Object identifier = nodeId.getIdentifier();
        try {
            client.connect().get();
            Variant value = new Variant(editValue);
            DataValue dv = new DataValue(value, null, null);
            StatusCode statusCode = (StatusCode)client.writeValue(nodeId, dv).get();
            if (statusCode.isGood()) {
                log.info("========== >  successfully write '{}' to nodeId={}, statusCodes = {}", new Object[]{editValue, nodeId, statusCode});
                return true;
            }
            log.error("idx:{},id:{},statusCodes:{}", new Object[]{namespaceIndex, identifier, statusCode});
            return false;
        }
        catch (Exception e) {
            log.error("idx:{},id:{},\u5199opc\u8bbe\u5907\u5931\u8d25", new Object[]{namespaceIndex, identifier, e});
            return false;
        }
    }

    public static UaSubscription createSubscription(Integer namespaceIndex, String identifier, UaSubscription.ItemCreationCallback callback) {
        try {
            String subscriptionCallbackKey;
            if (namespaceIndex == null) {
                namespaceIndex = 2;
            }
            if (subscriptionList.containsKey(subscriptionCallbackKey = namespaceIndex + ":" + identifier)) {
                return (UaSubscription)subscriptionList.get(subscriptionCallbackKey);
            }
            OpcUaClient client = OpcUaClientBuilder.opcUaClient;
            client.connect().get();
            OpcUaConfig opcUaConfig = (OpcUaConfig)SpringUtil.getBean(OpcUaConfig.class);
            UaSubscription subscription = (UaSubscription)client.getSubscriptionManager().createSubscription(opcUaConfig.getOpcuaEndpointSubInterval().doubleValue()).get();
            MonitoringParameters parameters = new MonitoringParameters(Unsigned.uint((int)subscriptionCount.getAndIncrement()), opcUaConfig.getOpcuaEndpointSubInterval(), null, Unsigned.uint((int)5), Boolean.valueOf(true));
            NodeId nodeId = OpcUaOperationUtil.nodeId((Integer)namespaceIndex, (String)identifier);
            ReadValueId readValueId = new ReadValueId(nodeId, AttributeId.Value.uid(), null, null);
            MonitoredItemCreateRequest request = new MonitoredItemCreateRequest(readValueId, MonitoringMode.Reporting, parameters);
            ArrayList<MonitoredItemCreateRequest> requests = new ArrayList<MonitoredItemCreateRequest>();
            requests.add(request);
            List monitoredItems = (List)subscription.createMonitoredItems(TimestampsToReturn.Both, requests, callback).get();
            subscriptionList.put(subscriptionCallbackKey, subscription);
            return subscription;
        }
        catch (Exception e) {
            log.error("idx:{}, id:{},\u8ba2\u9605\u53d8\u91cf\u5931\u8d25", (Object)namespaceIndex, (Object)identifier);
            return null;
        }
    }

    public static synchronized UaSubscription createSubscriptionAndCallback(Integer namespaceIndex, String identifier) {
        try {
            String subscriptionCallbackKey;
            if (namespaceIndex == null) {
                namespaceIndex = 2;
            }
            if (subscriptionList.containsKey(subscriptionCallbackKey = namespaceIndex + ":" + identifier)) {
                return (UaSubscription)subscriptionList.get(subscriptionCallbackKey);
            }
            OpcUaClient client = OpcUaClientBuilder.opcUaClient;
            client.connect().get();
            OpcUaConfig opcUaConfig = (OpcUaConfig)SpringUtil.getBean(OpcUaConfig.class);
            UaSubscription subscription = (UaSubscription)client.getSubscriptionManager().createSubscription(opcUaConfig.getOpcuaEndpointSubInterval().doubleValue()).get();
            MonitoringParameters parameters = new MonitoringParameters(Unsigned.uint((int)subscriptionCount.getAndIncrement()), opcUaConfig.getOpcuaEndpointSubInterval(), null, Unsigned.uint((int)5), Boolean.valueOf(true));
            NodeId nodeId = OpcUaOperationUtil.nodeId((Integer)namespaceIndex, (String)identifier);
            ReadValueId readValueId = new ReadValueId(nodeId, AttributeId.Value.uid(), null, null);
            MonitoredItemCreateRequest request = new MonitoredItemCreateRequest(readValueId, MonitoringMode.Reporting, parameters);
            ArrayList<MonitoredItemCreateRequest> requests = new ArrayList<MonitoredItemCreateRequest>();
            requests.add(request);
            UaSubscription.ItemCreationCallback callback = (subscriptionItem, id) -> subscriptionItem.setValueConsumer((item, value) -> {
                if (value.getStatusCode().isGood()) {
                    subscriptionCallbackValues.put(subscriptionCallbackKey, value.getValue());
                } else {
                    log.warn("{} - opc subscription value is bad.", (Object)subscriptionCallbackKey);
                    subscriptionCallbackValues.put(subscriptionCallbackKey, Variant.NULL_VALUE);
                }
            });
            subscription.addNotificationListener((UaSubscription.NotificationListener)new OPCSubscriptionListener(namespaceIndex, identifier));
            List monitoredItems = (List)subscription.createMonitoredItems(TimestampsToReturn.Both, requests, callback).get();
            subscriptionList.put(subscriptionCallbackKey, subscription);
            return subscription;
        }
        catch (Exception e) {
            log.error("idx:{}, id:{},\u8ba2\u9605\u53d8\u91cf\u5931\u8d25", (Object)namespaceIndex, (Object)identifier);
            return null;
        }
    }

    public static synchronized UaSubscription createSubscriptionAndCallback(Integer namespaceIndex, int identifier) {
        try {
            String subscriptionCallbackKey;
            if (namespaceIndex == null) {
                namespaceIndex = 2;
            }
            if (subscriptionList.containsKey(subscriptionCallbackKey = namespaceIndex + ":" + identifier)) {
                return (UaSubscription)subscriptionList.get(subscriptionCallbackKey);
            }
            OpcUaClient client = OpcUaClientBuilder.opcUaClient;
            client.connect().get();
            OpcUaConfig opcUaConfig = (OpcUaConfig)SpringUtil.getBean(OpcUaConfig.class);
            UaSubscription subscription = (UaSubscription)client.getSubscriptionManager().createSubscription(opcUaConfig.getOpcuaEndpointSubInterval().doubleValue()).get();
            MonitoringParameters parameters = new MonitoringParameters(Unsigned.uint((int)subscriptionCount.getAndIncrement()), opcUaConfig.getOpcuaEndpointSubInterval(), null, Unsigned.uint((int)5), Boolean.valueOf(true));
            NodeId nodeId = new NodeId(namespaceIndex.intValue(), identifier);
            ReadValueId readValueId = new ReadValueId(nodeId, AttributeId.Value.uid(), null, null);
            MonitoredItemCreateRequest request = new MonitoredItemCreateRequest(readValueId, MonitoringMode.Reporting, parameters);
            ArrayList<MonitoredItemCreateRequest> requests = new ArrayList<MonitoredItemCreateRequest>();
            requests.add(request);
            UaSubscription.ItemCreationCallback callback = (subscriptionItem, id) -> subscriptionItem.setValueConsumer((item, value) -> {
                if (value.getStatusCode().isGood()) {
                    subscriptionCallbackValues.put(subscriptionCallbackKey, value.getValue());
                } else {
                    log.warn("{} - opc subscription value is bad.", (Object)subscriptionCallbackKey);
                    subscriptionCallbackValues.put(subscriptionCallbackKey, Variant.NULL_VALUE);
                }
            });
            subscription.addNotificationListener((UaSubscription.NotificationListener)new OPCSubscriptionListener(namespaceIndex, identifier));
            List monitoredItems = (List)subscription.createMonitoredItems(TimestampsToReturn.Both, requests, callback).get();
            subscriptionList.put(subscriptionCallbackKey, subscription);
            return subscription;
        }
        catch (Exception e) {
            log.error("idx:{}, id:{},\u8ba2\u9605\u53d8\u91cf\u5931\u8d25", (Object)namespaceIndex, (Object)identifier);
            return null;
        }
    }

    public static void deleteSubscription(UInteger subscriptionId) {
        try {
            OpcUaClient client = OpcUaClientBuilder.opcUaClient;
            client.connect().get();
            client.getSubscriptionManager().deleteSubscription(subscriptionId);
        }
        catch (Exception e) {
            log.error("\u5220\u9664\u8ba2\u9605\u5931\u8d25");
        }
    }

    private static void browseNode(String indent, OpcUaClient client, NodeId browseRoot) {
        BrowseDescription browse = new BrowseDescription(browseRoot, BrowseDirection.Forward, Identifiers.References, Boolean.valueOf(true), Unsigned.uint((int)(NodeClass.Object.getValue() | NodeClass.Variable.getValue())), Unsigned.uint((int)BrowseResultMask.All.getValue()));
        try {
            BrowseResult browseResult = (BrowseResult)client.browse(browse).get();
            List references = ConversionUtil.toList((Object[])browseResult.getReferences());
            for (ReferenceDescription rd : references) {
                log.info("{} Node={}", (Object)indent, (Object)rd.getBrowseName().getName());
                rd.getNodeId().toNodeId(client.getNamespaceTable()).ifPresent(nodeId -> OpcUaOperationUtil.browseNode((String)(indent + "  "), (OpcUaClient)client, (NodeId)nodeId));
            }
        }
        catch (InterruptedException | ExecutionException e) {
            log.error("Browsing nodeId={} failed: {}", new Object[]{browseRoot, e.getMessage(), e});
        }
    }
}

