/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.LDAPConfig
 *  com.seer.rds.ldap.LdapUtil
 *  com.seer.rds.util.SpringUtil
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.stereotype.Component
 */
package com.seer.rds.ldap;

import com.seer.rds.config.LDAPConfig;
import com.seer.rds.util.SpringUtil;
import java.util.Hashtable;
import java.util.Objects;
import javax.naming.NamingEnumeration;
import javax.naming.NamingException;
import javax.naming.directory.Attribute;
import javax.naming.directory.SearchControls;
import javax.naming.directory.SearchResult;
import javax.naming.ldap.InitialLdapContext;
import javax.naming.ldap.LdapContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/*
 * Exception performing whole class analysis ignored.
 */
@Component
public class LdapUtil {
    private static final Logger log = LoggerFactory.getLogger(LdapUtil.class);

    public static LdapContext getCtx() throws NamingException {
        LDAPConfig ldapConfig = (LDAPConfig)SpringUtil.getBean(LDAPConfig.class);
        Hashtable<String, Object> mEnv = new Hashtable<String, Object>();
        if (Objects.equals(ldapConfig.getSecurityProtocol().toLowerCase(), "ssl")) {
            System.setProperty("com.sun.jndi.ldap.object.disableEndpointIdentification", "true");
            mEnv.put("java.naming.security.protocol", "ssl");
            mEnv.put("java.naming.authoritative", "true");
            mEnv.put("java.naming.ldap.factory.socket", "com.seer.rds.ldap.SSLSocketFactory");
        }
        mEnv.put("java.naming.factory.initial", "com.sun.jndi.ldap.LdapCtxFactory");
        mEnv.put("java.naming.provider.url", ldapConfig.getLdapUrl() + ":" + ldapConfig.getPort());
        mEnv.put("java.naming.security.authentication", ldapConfig.getSecurityAuthentication());
        mEnv.put("java.naming.security.principal", ldapConfig.getSecurityPrincipal());
        mEnv.put("java.naming.security.credentials", ldapConfig.getSecurityCredentials());
        try {
            new InitialLdapContext(mEnv, null);
        }
        catch (NamingException e) {
            log.error("LdapContext Exception", (Throwable)e);
        }
        return new InitialLdapContext(mEnv, null);
    }

    public static Boolean ldapCheck(String username, String password) {
        LDAPConfig ldapConfig = (LDAPConfig)SpringUtil.getBean(LDAPConfig.class);
        try {
            LdapContext ldapContext = LdapUtil.getCtx();
            String searchFilter = ldapConfig.getSearchFilterName() + "=" + username;
            String searchBase = ldapConfig.getSearchBase();
            SearchControls searchControls = new SearchControls();
            searchControls.setSearchScope(2);
            NamingEnumeration<SearchResult> answer = ldapContext.search(searchBase, searchFilter, searchControls);
            String dn = "";
            if (answer.hasMoreElements()) {
                SearchResult next = answer.next();
                if (answer.hasMoreElements()) {
                    log.info("**********The user is not exist in LDAP. username : $username");
                    return false;
                }
                NamingEnumeration<? extends Attribute> attrs = next.getAttributes().getAll();
                while (attrs.hasMore()) {
                    Attribute attr = attrs.next();
                    String id = attr.getID();
                    if (!Objects.equals(ldapConfig.getDistinguishedName(), id)) continue;
                    dn = String.valueOf(attr.get());
                }
            }
            log.info("***********dn :" + dn);
            if (dn.isBlank()) {
                return false;
            }
            ldapContext.addToEnvironment("java.naming.security.principal", dn);
            ldapContext.addToEnvironment("java.naming.security.credentials", password);
            ldapContext.reconnect(null);
        }
        catch (Exception e) {
            log.error("ldapCheck failed ", (Throwable)e);
            return false;
        }
        return true;
    }
}

