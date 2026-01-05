/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.ldap.ExampleClient
 */
package com.seer.rds.ldap;

import java.util.Hashtable;
import java.util.UUID;
import javax.naming.NamingEnumeration;
import javax.naming.NamingException;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.SearchControls;
import javax.naming.directory.SearchResult;
import javax.naming.ldap.InitialLdapContext;

public class ExampleClient {
    public static void main(String[] args) throws NamingException {
        Hashtable<String, String> env = new Hashtable<String, String>();
        env.put("java.naming.factory.initial", "com.sun.jndi.ldap.LdapCtxFactory");
        env.put("java.naming.provider.url", "ldap://127.0.0.1:389");
        env.put("java.naming.security.authentication", "simple");
        env.put("java.naming.security.principal", "CN=xilide,OU=test,DC=sanil,DC=hilti,DC=ac,DC=cn");
        env.put("java.naming.security.credentials", "test");
        env.put("com.sun.jndi.ldap.connect.timeout", "3000");
        InitialLdapContext ctx = new InitialLdapContext(env, null);
        SearchControls searchCtls = new SearchControls();
        searchCtls.setSearchScope(2);
        String searchFilter = "";
        String searchBase = "OU=Shanghai-P88,OU=CN,DC=hilti,DC=com";
        String[] returnedAtts = new String[]{"distinguishedName", "objectGUID", "name"};
        NamingEnumeration<SearchResult> answer = ctx.search(searchBase, searchFilter, searchCtls);
        while (answer.hasMoreElements()) {
            SearchResult sr = answer.next();
            Attributes Attrs = sr.getAttributes();
            if (Attrs == null) continue;
            NamingEnumeration<? extends Attribute> ne = Attrs.getAll();
            while (ne.hasMore()) {
                Attribute Attr = ne.next();
                String name = Attr.getID();
                NamingEnumeration<?> values = Attr.getAll();
                if (values == null) continue;
                while (values.hasMoreElements()) {
                    String value = "";
                    value = "objectGUID".equals(name) ? UUID.nameUUIDFromBytes((byte[])values.nextElement()).toString() : (String)values.nextElement();
                    System.out.println(name + " " + value);
                }
            }
            System.out.println("=====================");
        }
    }
}

