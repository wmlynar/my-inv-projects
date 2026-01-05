/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.util.RSACipherUtil
 *  com.seer.rds.util.RSASignUtil
 *  org.bouncycastle.util.encoders.Base64
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package com.seer.rds.util;

import com.seer.rds.util.RSACipherUtil;
import java.io.UnsupportedEncodingException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.SignatureException;
import java.security.cert.X509Certificate;
import org.bouncycastle.util.encoders.Base64;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Exception performing whole class analysis ignored.
 */
public class RSASignUtil {
    private static final Logger log = LoggerFactory.getLogger(RSASignUtil.class);
    private static final String charset = "UTF-8";
    private static final String signType = "spay";

    public static String sign(PrivateKey privateKey, String plainText) {
        try {
            Signature signature = RSASignUtil.getSignatureObj((String)"spay");
            signature.initSign(privateKey);
            signature.update(plainText.getBytes("UTF-8"));
            byte[] signData = signature.sign();
            return new String(Base64.encode((byte[])signData));
        }
        catch (InvalidKeyException e) {
            log.error("sign error:{}", (Throwable)e);
        }
        catch (SignatureException e) {
            log.error("sign error:{}", (Throwable)e);
        }
        catch (UnsupportedEncodingException e) {
            log.error("sign error:{}", (Throwable)e);
        }
        return null;
    }

    public static boolean verifySign(PublicKey publicKey, String plainText, String signature) throws Exception {
        byte[] signData = Base64.decode((byte[])signature.getBytes("UTF-8"));
        try {
            Signature sig = RSASignUtil.getSignatureObj((String)"spay");
            sig.initVerify(publicKey);
            sig.update(plainText.getBytes("UTF-8"));
            return sig.verify(signData);
        }
        catch (InvalidKeyException e) {
            log.error("verify sign error:{}", (Throwable)e);
        }
        catch (SignatureException e) {
            log.error("verify sign error:{}", (Throwable)e);
        }
        catch (UnsupportedEncodingException e) {
            log.error("verify sign error:{}", (Throwable)e);
        }
        return false;
    }

    public static boolean verifySign(X509Certificate cert, String plainText, String signature) throws Exception {
        byte[] signData = Base64.decode((byte[])signature.getBytes("UTF-8"));
        try {
            Signature sig = RSASignUtil.getSignatureObj((String)"spay");
            sig.initVerify(cert);
            sig.update(plainText.getBytes("UTF-8"));
            return sig.verify(signData);
        }
        catch (InvalidKeyException e) {
            log.error("verify sign error:{}", (Throwable)e);
        }
        catch (SignatureException e) {
            log.error("verify sign error:{}", (Throwable)e);
        }
        catch (UnsupportedEncodingException e) {
            log.error("verify sign error:{}", (Throwable)e);
        }
        return false;
    }

    private static Signature getSignatureObj(String signType) {
        String shaAlgorithm = null;
        if ("rest".equals(signType)) {
            shaAlgorithm = "SHA256withRSA";
        } else if ("spay".equals(signType)) {
            shaAlgorithm = "SHA1withRSA";
        }
        try {
            return Signature.getInstance(shaAlgorithm);
        }
        catch (NoSuchAlgorithmException e) {
            log.error("get signature error:{}", (Throwable)e);
            return null;
        }
    }

    public static void main(String[] args) throws Exception {
        String hostName = "RDS-01";
        String endDate = "2022-09-09";
        String text = hostName + ":" + endDate;
        String privateKey = "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCgwNoQaJF6xVEL2H693W2BFp3fNBua0ObDRg/TBfybYq+23lK3pbBz2JMXtMkIYy8m8FYEknLj6XUw+G7RlNHXNVj+j+Cf/m2bSNG2kDCjx8F0tlY2hDCmw4xD33ndQjpt0NeFmfK4idQaQXa0EmEeWXCCNfmTuqt+oJA4bw3y6CxBIKxg1EBjO02cg3AcEUl/24f4ZXevKpJLcikgxDGMiSQi/Gs0hd5Rbclqtm9eeNADYd+U60URwGSB+w+vZvYxaQzIhUaBIQqMkr8XgwWFjxzuppxVIPlYkxF3n1tBqm3oqEzlSlfr9clPeedeOKh4ZFtcS4V+Cz6XEBkzenV5AgMBAAECggEAUNWJEfUzKnQsM/Oyj9DXrrDrxABU3T2svIbvkCKTiqNOTntvRs+3chl2pdYPvPr7C+6Qoo3t3fNYLb7PIu5dsoUt8hvxTSLIhOxSICZTfxgEjKbfpVxFhqYQU1T916fk77GznofySJ9uG6HNifEwCu3YqHFxxbp5YBxnSSl27yzKhmh60s0RvZ5CiCYS3tY1JjWmhJsG+SCz9DQhVefrg0Bqhr1FX1rrXEcl2pVaZsZer8QlTjtwkImXr5koeujHfMjssEKgeLGU6KaVA5NPZ06uWub41bJHyeUiS/WfGyVfV2M02nvWWKlaEm26kBpeL0eBNbOXU6bi9y/Q5a/hcQKBgQDL8YXxyuMKVwOTQGBO9CdUXkjfqYGB2cAPclb6h3+Zv2E3D5nqyfzyvsmXROacZHyPA/GWGaDk3+gKK7AkHtQ71bSVbzr8VUq6+7PSy4Mr5qHZGxwnRgVkBXw5Bfdvkeqe8WOVNI/kCEurkZR0ukKmiEzoglMXcg3MyjwNOcGa3QKBgQDJyR0zgreDQgsXRZTe8tFfE/TzQONTmh3KxDmFMq31CJs3FvG0+n4GD4yyNz/vOHduHz4okpzQKk8Me6anZAlGYAVWQUTAy+Rf0Kq9NHuO7s5lmQlGUBB0nIe1LP5lOKjVjh87+BjOYnV7K9c5b95AEgZ+pFUweXUXxDcRJSnVTQKBgQCuz1x/j+eiYklnO4QRyQe5MoQGavXeRrZwxxI09lXyhG+g0Zed//r4W37SUbXWEfAOalP21Arsg9wSc7Ysj9xdWWXLvSbzSWyf78YIhnbt92d9f9ZW95cBUA5Vln6sPIe+K6yvJPm9fTrXWhbFIy6kLiq2FZeBfjrD8gkdUQdZZQKBgQCm0JdOdTsGzPtkQsa+xVhnVJVE4BjOjXMhpLS0s9/x2SqQEWzCo+65TfOPhXNabYD2TefSHNp8kO2GsVZlvaKZRlpDI3QWOrjSqSvtfMzErhF9FlX/hcME1D6wfcDVp1CUM4kIx6KiQ+1BZU3pEt1WdFBgM7SlfVNa0YCAsQtzZQKBgHlvFWp6VB2hzUnHwQuI4/q8J++r1nVKV7n6eYnxj7v/j31gpTQQ+bc6cbLv8cBZuacx+0ng9srO4UIqBwZBTa9y6qrjZ8P3cMK/TcThWgGUjBHfrxuPJZQlVBsRH1atpop4or2zKBq+/yWV8YAqx1qv/3xdvxq5BBcRHLnw2/qB";
        String publicKeyString = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoMDaEGiResVRC9h+vd1tgRad3zQbmtDmw0YP0wX8m2Kvtt5St6Wwc9iTF7TJCGMvJvBWBJJy4+l1MPhu0ZTR1zVY/o/gn/5tm0jRtpAwo8fBdLZWNoQwpsOMQ9953UI6bdDXhZnyuInUGkF2tBJhHllwgjX5k7qrfqCQOG8N8ugsQSCsYNRAYztNnINwHBFJf9uH+GV3ryqSS3IpIMQxjIkkIvxrNIXeUW3JarZvXnjQA2HflOtFEcBkgfsPr2b2MWkMyIVGgSEKjJK/F4MFhY8c7qacVSD5WJMRd59bQapt6KhM5UpX6/XJT3nnXjioeGRbXEuFfgs+lxAZM3p1eQIDAQAB";
        String signature = RSASignUtil.sign((PrivateKey)RSACipherUtil.getPrivateKeyFromKeyString((String)privateKey), (String)text);
        System.out.println("signature:" + signature);
        String text2 = "RDS-01:2022-09-12";
        PublicKey publicKey = RSACipherUtil.getPublicKeyFromKeyString((String)publicKeyString);
        boolean verifiedOK = RSASignUtil.verifySign((PublicKey)publicKey, (String)text2, (String)signature);
        System.out.println("verifiedOK:" + verifiedOK);
    }
}

