/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.MessageConversionUtils
 *  org.json.JSONArray
 *  org.json.JSONException
 *  org.json.JSONObject
 *  org.json.XML
 *  org.json.XMLTokener
 */
package com.seer.rds.util;

import java.io.Reader;
import java.io.StringReader;
import java.util.List;
import java.util.stream.Collectors;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.XML;
import org.json.XMLTokener;

/*
 * Exception performing whole class analysis ignored.
 */
public class MessageConversionUtils {
    static final String HEAD = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
    static final String BLANK = " ";
    static final String ADD_STR = "locale=\"zh_CN\"";

    public static String xmlToJson(String xmlStr) {
        JSONObject jsonObject = MessageConversionUtils.toJSONObject((String)xmlStr);
        return jsonObject.toString();
    }

    public static String jsonToXml(String jsonStr) {
        JSONObject jsonObject = new JSONObject(jsonStr);
        String xmlStr = MessageConversionUtils.toString((Object)jsonObject);
        return xmlStr;
    }

    public static String appendXmlTagCon(String xmlStr, String tagStr, String appendStr) {
        int i = xmlStr.indexOf(tagStr) + tagStr.length();
        StringBuilder builder = new StringBuilder(xmlStr).insert(i, " " + appendStr);
        return "" + builder;
    }

    public static String toString(Object object) throws JSONException {
        return MessageConversionUtils.toString((Object)object, null);
    }

    public static String toString(Object object, String tagName) throws JSONException {
        String string;
        StringBuilder sb = new StringBuilder();
        if (object instanceof JSONObject) {
            JSONObject jo = (JSONObject)object;
            if (tagName != null) {
                sb.append('<');
                sb.append(tagName);
                List startsWith = jo.keySet().stream().filter(s -> s.startsWith("-")).collect(Collectors.toList());
                for (String key : startsWith) {
                    sb.append(" ").append(key.substring(1)).append("=").append("\"").append(XML.escape((String)jo.opt(key).toString())).append("\"");
                }
                sb.append('>');
            }
            List noStartsWith = jo.keySet().stream().filter(s -> !s.startsWith("-")).collect(Collectors.toList());
            for (String key : noStartsWith) {
                Object val;
                int i;
                int jaLength;
                JSONArray ja;
                Object value = jo.opt(key);
                if (value == null) {
                    value = "";
                } else if (value.getClass().isArray()) {
                    value = new JSONArray(value);
                }
                if ("content".equals(key)) {
                    if (value instanceof JSONArray) {
                        ja = (JSONArray)value;
                        jaLength = ja.length();
                        for (i = 0; i < jaLength; ++i) {
                            if (i > 0) {
                                sb.append('\n');
                            }
                            val = ja.opt(i);
                            sb.append(XML.escape((String)val.toString()));
                        }
                        continue;
                    }
                    sb.append(XML.escape((String)value.toString()));
                    continue;
                }
                if (value instanceof JSONArray) {
                    ja = (JSONArray)value;
                    jaLength = ja.length();
                    for (i = 0; i < jaLength; ++i) {
                        val = ja.opt(i);
                        if (val instanceof JSONArray) {
                            sb.append('<');
                            sb.append(key);
                            sb.append('>');
                            sb.append(MessageConversionUtils.toString((Object)val));
                            sb.append("</");
                            sb.append(key);
                            sb.append('>');
                            continue;
                        }
                        sb.append(MessageConversionUtils.toString((Object)val, (String)key));
                    }
                    continue;
                }
                if ("".equals(value)) {
                    sb.append('<');
                    sb.append(key);
                    sb.append("/>");
                    continue;
                }
                sb.append(MessageConversionUtils.toString((Object)value, (String)key));
            }
            if (tagName != null) {
                sb.append("</");
                sb.append(tagName);
                sb.append('>');
            }
            return sb.toString();
        }
        if (object != null && (object instanceof JSONArray || object.getClass().isArray())) {
            JSONArray ja = object.getClass().isArray() ? new JSONArray(object) : (JSONArray)object;
            int jaLength = ja.length();
            for (int i = 0; i < jaLength; ++i) {
                Object val = ja.opt(i);
                sb.append(MessageConversionUtils.toString((Object)val, (String)(tagName == null ? "array" : tagName)));
            }
            return sb.toString();
        }
        String string2 = string = object == null ? "null" : XML.escape((String)object.toString());
        return tagName == null ? "\"" + string + "\"" : (string.length() == 0 ? "<" + tagName + "/>" : "<" + tagName + ">" + string + "</" + tagName + ">");
    }

    public static JSONObject toJSONObject(String string) throws JSONException {
        return MessageConversionUtils.toJSONObject((String)string, (boolean)false);
    }

    public static JSONObject toJSONObject(String string, boolean keepStrings) throws JSONException {
        return MessageConversionUtils.toJSONObject((Reader)new StringReader(string), (boolean)keepStrings);
    }

    public static JSONObject toJSONObject(Reader reader, boolean keepStrings) throws JSONException {
        JSONObject jo = new JSONObject();
        XMLTokener x = new XMLTokener(reader);
        while (x.more()) {
            x.skipPast("<");
            if (!x.more()) continue;
            MessageConversionUtils.parse((XMLTokener)x, (JSONObject)jo, null, (boolean)keepStrings);
        }
        return jo;
    }

    private static boolean parse(XMLTokener x, JSONObject context, String name, boolean keepStrings) throws JSONException {
        String string;
        JSONObject jsonobject = null;
        Object token = x.nextToken();
        if (token == XML.BANG) {
            char c = x.next();
            if (c == '-') {
                if (x.next() == '-') {
                    x.skipPast("-->");
                    return false;
                }
                x.back();
            } else if (c == '[') {
                token = x.nextToken();
                if ("CDATA".equals(token) && x.next() == '[') {
                    String string2 = x.nextCDATA();
                    if (string2.length() > 0) {
                        context.accumulate("content", (Object)string2);
                    }
                    return false;
                }
                throw x.syntaxError("Expected 'CDATA['");
            }
            int i = 1;
            do {
                if ((token = x.nextMeta()) == null) {
                    throw x.syntaxError("Missing '>' after '<!'.");
                }
                if (token == XML.LT) {
                    ++i;
                    continue;
                }
                if (token != XML.GT) continue;
                --i;
            } while (i > 0);
            return false;
        }
        if (token == XML.QUEST) {
            x.skipPast("?>");
            return false;
        }
        if (token == XML.SLASH) {
            token = x.nextToken();
            if (name == null) {
                throw x.syntaxError("Mismatched close tag " + token);
            }
            if (!token.equals(name)) {
                throw x.syntaxError("Mismatched " + name + " and " + token);
            }
            if (x.nextToken() != XML.GT) {
                throw x.syntaxError("Misshaped close tag");
            }
            return true;
        }
        if (token instanceof Character) {
            throw x.syntaxError("Misshaped tag");
        }
        String tagName = (String)token;
        token = null;
        jsonobject = new JSONObject();
        while (true) {
            if (token == null) {
                token = x.nextToken();
            }
            if (token == XML.SLASH) {
                token = x.nextToken();
                if (name == null) {
                    throw x.syntaxError("Mismatched close tag " + token);
                }
                if (!token.equals(XML.GT)) {
                    if (!token.equals(name)) {
                        throw x.syntaxError("Mismatched " + name + " and " + token);
                    }
                    if (x.nextToken() != XML.GT) {
                        throw x.syntaxError("Misshaped close tag");
                    }
                } else {
                    return false;
                }
            }
            if (!XML.GT.equals(token) && token != XML.SLASH) {
                token = "-" + token;
            }
            if (!(token instanceof String)) break;
            string = (String)token;
            token = x.nextToken();
            if (token == XML.EQ) {
                token = x.nextToken();
                if (!(token instanceof String)) {
                    throw x.syntaxError("Missing value");
                }
                jsonobject.accumulate(string, keepStrings ? (String)token : XML.stringToValue((String)((String)token)));
                token = null;
                continue;
            }
            jsonobject.accumulate(string, (Object)"");
        }
        if (token == XML.SLASH) {
            if (x.nextToken() != XML.GT) {
                throw x.syntaxError("Misshaped tag");
            }
            if (jsonobject.length() > 0) {
                context.accumulate(tagName, (Object)jsonobject);
            } else {
                context.accumulate(tagName, (Object)"");
            }
            return false;
        }
        if (token == XML.GT) {
            while (true) {
                if ((token = x.nextContent()) == null) {
                    if (tagName != null) {
                        throw x.syntaxError("Unclosed tag " + tagName);
                    }
                    return false;
                }
                if (token instanceof String) {
                    string = (String)token;
                    if (string.length() <= 0) continue;
                    jsonobject.accumulate("content", keepStrings ? string : XML.stringToValue((String)string));
                    continue;
                }
                if (token == XML.LT && MessageConversionUtils.parse((XMLTokener)x, (JSONObject)jsonobject, (String)tagName, (boolean)keepStrings)) break;
            }
            if (jsonobject.length() == 0) {
                context.accumulate(tagName, (Object)"");
            } else if (jsonobject.length() == 1 && jsonobject.opt("content") != null) {
                context.accumulate(tagName, jsonobject.opt("content"));
            } else {
                context.accumulate(tagName, (Object)jsonobject);
            }
            return false;
        }
        throw x.syntaxError("Misshaped tag");
    }
}

