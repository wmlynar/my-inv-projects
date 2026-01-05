/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.RSACipherUtil
 *  org.bouncycastle.util.encoders.Base64
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util;

import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import javax.crypto.Cipher;
import org.bouncycastle.util.encoders.Base64;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class RSACipherUtil {
    private static final Logger log = LoggerFactory.getLogger(RSACipherUtil.class);

    public static PublicKey getPublicKeyFromKeyString(String publicKeyStr) {
        try {
            byte[] keyBytes = Base64.decode((byte[])publicKeyStr.getBytes());
            X509EncodedKeySpec x509KeySpec = new X509EncodedKeySpec(keyBytes);
            KeyFactory keyFactory = KeyFactory.getInstance("RSA");
            return keyFactory.generatePublic(x509KeySpec);
        }
        catch (NoSuchAlgorithmException e) {
            log.error("Get public key error:{}", (Throwable)e);
        }
        catch (InvalidKeySpecException e) {
            log.error("Get public key error:{}", (Throwable)e);
        }
        return null;
    }

    public static PrivateKey getPrivateKeyFromKeyString(String privateKeyStr) throws Exception {
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        byte[] decodedKey = Base64.decode((byte[])privateKeyStr.getBytes());
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(decodedKey);
        return keyFactory.generatePrivate(keySpec);
    }

    public static String encrypt(PublicKey publicKey, String data, String charset) throws Exception {
        Cipher cipher = Cipher.getInstance(KeyFactory.getInstance("RSA").getAlgorithm());
        cipher.init(1, publicKey);
        byte[] cipherText = cipher.doFinal(data.getBytes(charset));
        byte[] encodedByte = Base64.encode((byte[])cipherText);
        return new String(encodedByte);
    }

    public static String decrypt(PrivateKey privateKey, String data, String charset) throws Exception {
        byte[] byteData = Base64.decode((byte[])data.getBytes(charset));
        Cipher cipher = Cipher.getInstance(KeyFactory.getInstance("RSA").getAlgorithm());
        cipher.init(2, privateKey);
        byte[] retB = cipher.doFinal(byteData);
        return new String(retB);
    }

    public static void main(String[] args) throws Exception {
        String publicKey = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA968ziJgdyYiIiZuqRmBW85i5bOIh7u73oev2q7WK4jUlncLAqTGYQjsppS1Rt1yQeomMTDg3zi9yeuVW2UXbbSimschuBZN6OJ9unL3Qc9p+IC6KecrK7C1jvddmhb/WPUytaeJMIXQe8nVlM0/WABtBJ6pl4VWf+npEsqKraSSiceb39iEIWyT0vI1qKaE5GcHJi1TJLIUqozDICXT2axmc18AWrwX7IGa9DjPnMBEMYj4ZVCX72DPhd1hww3NY1eulsOltx8j01URah2+M+xgWyNjNyJXpZZ1Y5EiP/y+5rfL/4hUl800VzGH544I7SwQNFyntOsIYnHRlXSMwmQIDAQAB";
        String hostName = "RDS-01";
        String endDate = "2022-09-09";
        String text = hostName + ":" + endDate;
        String result = RSACipherUtil.encrypt((PublicKey)RSACipherUtil.getPublicKeyFromKeyString((String)publicKey), (String)text, (String)"UTF-8");
        System.out.println(result);
        String privateKey = "MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQD3rzOImB3JiIiJm6pGYFbzmLls4iHu7veh6/artYriNSWdwsCpMZhCOymlLVG3XJB6iYxMODfOL3J65VbZRdttKKaxyG4Fk3o4n26cvdBz2n4gLop5ysrsLWO912aFv9Y9TK1p4kwhdB7ydWUzT9YAG0EnqmXhVZ/6ekSyoqtpJKJx5vf2IQhbJPS8jWopoTkZwcmLVMkshSqjMMgJdPZrGZzXwBavBfsgZr0OM+cwEQxiPhlUJfvYM+F3WHDDc1jV66Ww6W3HyPTVRFqHb4z7GBbI2M3IlellnVjkSI//L7mt8v/iFSXzTRXMYfnjgjtLBA0XKe06whicdGVdIzCZAgMBAAECggEBAJwR+hcIQzzKm76aKCFQc3nrsmu50kgMrF2LolNwgaMoeht+rIfwiFCzlvpOJD+2RBPyuEUO55s0qp5mBOPD8RBHnUJJWYqJ82najIiX0tIty2vb58X20wcfUso9AI0m5Iib2Gnv/qjV0upUrwA2PlKy2ct0w93JZpUelks51WjaP2k5pw8bF5ZOFB2Vw5pjCCCpXVszo8QBQU9JUKm3of6b260G0KTuClAo9L7re4VdlRkOQBSFagKyl3fAM9UZ1gJt0L8/DaW1A9Oy58QBrvHgRtbmNeX5zYVLtuR/RlJGGOjP2IS9PJEGFy+cYKNR0IrbI3H5kvyYnoCDGI8VvEECgYEA/UwIXMRviL+wkUSZdPAP7zmLRJaude5nrPFe4KUZFRug3AhEYQmZML34FW2789tUaBjluOwFLPtNiZcKsBm9JSnmM5w6evD73cC1axrMl3hOF1tKIy5t71qQU8n6zoWT30fuUEvtUJYGpZKNaTWvH3mH5veRm5jxtq//YDqN7JcCgYEA+lPV+aoXnnIPDf8ukdbWAlbuBsMmSC+A8STo0PUFN8Mi5KkujpfYNs5tCZL6UNvFs7fq0XZHGmSCM4KGalaCQi0jYVYlywkr2mxlThq/zdB08Ob6zKWQf1rwFMXbn9dcs4YzGMt7cICrD8gKnsPtkUaNODF3jn6H6F0fdxYyAk8CgYBcm6TfDe7dZ4BNzG/ywiaBR1+0xwaoFW8QWvteVN5zyjMo31joxZKdsIb4hrNWOBWHLbsnvhsyU/sIWBHPSsnNwaDps6/p7RuY+vEZZKXyp0id34GelUYaYdks2Ub6pPnog6sM7oWolgF+HbPYCImrj0px1ogFBIkzSuuqqh3jpwKBgQDwT/lT86E2/6JKOpa3dPoARvm8zi17EPeFCHzk1MPMk210/KFwTH9JpgPxNANQCpuR+1bW/OgngyOnVX+6qA/mfbTAZdZkQwqxZmwefflyGNOazPMp8St1x5RBLOy5VyNsSMHW5Mk86JjPzqe7YLY5R/ScZIi05+2K+ZMSXOFnawKBgQChpdNohfarL9oBBurM6oEWf5KmEMk6YCxayypmNtLETw0ZSK28GDY0kyPTw49Ln8NCVOOIIXwr2ZA5Hp3Q5nReOO7WlkYyxJWDMpdQs7leNvKFFvPUdsmmHwlkKd6LSImqd0A6JDloumrEqOhA55VUMO8A9RdzDhijmlMEYusE6g==";
        String out = RSACipherUtil.decrypt((PrivateKey)RSACipherUtil.getPrivateKeyFromKeyString((String)privateKey), (String)result, (String)"UTF-8");
        System.out.println("end out:" + out);
    }
}

