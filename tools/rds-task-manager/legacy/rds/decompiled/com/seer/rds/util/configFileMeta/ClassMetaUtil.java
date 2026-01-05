/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.annotation.CfgFieldInterpreter
 *  com.seer.rds.annotation.IgnoreCfgView
 *  com.seer.rds.util.configFileMeta.ClassFieldMeta
 *  com.seer.rds.util.configFileMeta.ClassMeta
 *  com.seer.rds.util.configFileMeta.ClassMetaUtil
 *  com.seer.rds.util.configFileMeta.MapFieldMeta
 *  org.apache.commons.lang3.StringUtils
 */
package com.seer.rds.util.configFileMeta;

import com.seer.rds.annotation.CfgFieldInterpreter;
import com.seer.rds.annotation.IgnoreCfgView;
import com.seer.rds.util.configFileMeta.ClassFieldMeta;
import com.seer.rds.util.configFileMeta.ClassMeta;
import com.seer.rds.util.configFileMeta.MapFieldMeta;
import java.lang.reflect.Field;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.lang.reflect.WildcardType;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.commons.lang3.StringUtils;
import sun.misc.Unsafe;

/*
 * Exception performing whole class analysis ignored.
 */
public class ClassMetaUtil {
    private static final String SEER_PACKAGE_PATH = "com.seer.rds";

    public static List<ClassMeta> classMetaReader(Object targetObject) throws Exception {
        ArrayList<ClassMeta> result = new ArrayList<ClassMeta>();
        Class<?> clazz = targetObject.getClass();
        ArrayList<String> classNameCache = new ArrayList<String>();
        ClassMeta classMetaInfo = new ClassMeta();
        classMetaInfo.className = clazz.getSimpleName();
        result.add(classMetaInfo);
        classNameCache.add(clazz.getName());
        ClassMetaUtil.doReadClassInfo((Object)targetObject, result, (ClassMeta)classMetaInfo, classNameCache);
        return result;
    }

    private static void doReadClassInfo(Object targetObject, List<ClassMeta> classMetas, ClassMeta fatherClassMeta, List<String> classNameCache) throws Exception {
        Class<?> clazz = targetObject.getClass();
        for (Field classField : clazz.getDeclaredFields()) {
            Field[] enumFields;
            Type[] typeArgs;
            if (classField.getAnnotation(IgnoreCfgView.class) != null) continue;
            List<Object> enums = new ArrayList();
            ClassFieldMeta fieldMeta = new ClassFieldMeta();
            fieldMeta.fieldName = classField.getName();
            fieldMeta.fieldType = classField.getType().getSimpleName();
            classField.setAccessible(true);
            Object fieldValueObject = classField.get(targetObject);
            fieldMeta.defaultValue = classField.getType().getName().contains("com.seer.rds") && !classField.getType().isEnum() && fieldValueObject != null ? "object" : fieldValueObject;
            CfgFieldInterpreter fieldInterpreter = classField.getAnnotation(CfgFieldInterpreter.class);
            if (fieldInterpreter != null) {
                if (StringUtils.isNotBlank((CharSequence)fieldInterpreter.name())) {
                    fieldMeta.describe = fieldInterpreter.name();
                }
                if (StringUtils.isNotBlank((CharSequence)fieldInterpreter.remark())) {
                    fieldMeta.remark = fieldInterpreter.remark();
                }
                if (fieldInterpreter.min() > Integer.MIN_VALUE) {
                    fieldMeta.min = fieldInterpreter.min();
                }
                if (fieldInterpreter.max() < Integer.MAX_VALUE) {
                    fieldMeta.max = fieldInterpreter.max();
                }
            }
            String cacheableClassName = classField.getType().getTypeName();
            String classType = classField.getType().getSimpleName();
            if (classField.getType().isAssignableFrom(Object.class)) {
                fieldValueObject = null;
            } else if (List.class.isAssignableFrom(classField.getType())) {
                typeArgs = ((ParameterizedType)classField.getGenericType()).getActualTypeArguments();
                String[] nameArray = typeArgs[0].getTypeName().split("\\.");
                fieldMeta.ofType = nameArray[nameArray.length - 1];
                if (typeArgs[0] instanceof WildcardType && ((Class)((WildcardType)typeArgs[0]).getUpperBounds()[0]).isEnum()) {
                    fieldValueObject = null;
                    enumFields = ((Class)((WildcardType)typeArgs[0]).getUpperBounds()[0]).getFields();
                    enums = Arrays.stream(enumFields).map(Field::getName).collect(Collectors.toList());
                } else {
                    fieldValueObject = ClassMetaUtil.createObjectByClass((Class)((Class)typeArgs[0]));
                }
                cacheableClassName = typeArgs[0].getTypeName();
                classType = (String)fieldMeta.ofType;
            } else if (Map.class.isAssignableFrom(classField.getType())) {
                typeArgs = ((ParameterizedType)classField.getGenericType()).getActualTypeArguments();
                if (typeArgs[1] instanceof WildcardType) {
                    Type upperBound = ((WildcardType)typeArgs[1]).getUpperBounds()[0];
                    if (upperBound.getClass().isEnum()) {
                        enumFields = ((Class)upperBound).getFields();
                        enums = Arrays.stream(enumFields).map(Field::getName).collect(Collectors.toList());
                    } else {
                        ParameterizedType valueParamType = (ParameterizedType)upperBound;
                        String[] nameArray = valueParamType.getActualTypeArguments()[0].getTypeName().split("\\.");
                        String mapValuePlus = nameArray[nameArray.length - 1];
                        String[] keyTypeNames = typeArgs[0].getTypeName().split("\\.");
                        String[] valueTypeNames = valueParamType.getRawType().getTypeName().split("\\.");
                        MapFieldMeta mapFieldMeta = new MapFieldMeta();
                        mapFieldMeta.setKey(keyTypeNames[keyTypeNames.length - 1]);
                        mapFieldMeta.setValue(valueTypeNames[valueTypeNames.length - 1]);
                        mapFieldMeta.setValuePlus(mapValuePlus);
                        fieldMeta.ofType = mapFieldMeta;
                    }
                } else {
                    String[] keyTypeNames = typeArgs[0].getTypeName().split("\\.");
                    String[] valueTypeNames = typeArgs[1].getTypeName().split("\\.");
                    MapFieldMeta mapFieldMeta = new MapFieldMeta();
                    mapFieldMeta.setKey(keyTypeNames[keyTypeNames.length - 1]);
                    mapFieldMeta.setValue(valueTypeNames[valueTypeNames.length - 1]);
                    fieldMeta.ofType = mapFieldMeta;
                }
                fieldValueObject = ((MapFieldMeta)fieldMeta.ofType).value.equals("List") || ((MapFieldMeta)fieldMeta.ofType).value.equals("Map") ? null : ClassMetaUtil.createObjectByClass((Class)((Class)typeArgs[1]));
                cacheableClassName = typeArgs[1].getTypeName();
                String[] classTypeNames = typeArgs[1].getTypeName().split("\\.");
                classType = classTypeNames[classTypeNames.length - 1];
            } else if (classField.getType().isEnum()) {
                Field[] enumFields2 = classField.getType().getFields();
                enums = Arrays.stream(enumFields2).map(Field::getName).collect(Collectors.toList());
                fieldValueObject = null;
            } else if (fieldValueObject == null && classField.getType().getName().contains("com.seer.rds")) {
                fieldValueObject = ClassMetaUtil.createObjectByClass(classField.getType());
            }
            fatherClassMeta.fields.add(fieldMeta);
            if (classNameCache.contains(cacheableClassName) || !cacheableClassName.contains("com.seer.rds")) continue;
            ClassMeta classMetaInfo = new ClassMeta();
            classMetaInfo.className = classType;
            classMetaInfo.enums = enums;
            classMetas.add(classMetaInfo);
            classNameCache.add(cacheableClassName);
            if (fieldValueObject == null) continue;
            ClassMetaUtil.doReadClassInfo((Object)fieldValueObject, classMetas, (ClassMeta)classMetaInfo, classNameCache);
        }
    }

    private static Object createObjectByClass(Class<?> clazz) throws Exception {
        List noArgClassConstructor = Arrays.stream(clazz.getConstructors()).filter(it -> it.getParameterCount() == 0).collect(Collectors.toList());
        if (noArgClassConstructor.isEmpty()) {
            Class<Unsafe> klass = Unsafe.class;
            Field unsafeField = klass.getDeclaredField("theUnsafe");
            unsafeField.setAccessible(true);
            Unsafe unsafe = (Unsafe)unsafeField.get(null);
            return unsafe.allocateInstance(clazz);
        }
        return clazz.getDeclaredConstructor(new Class[0]).newInstance(new Object[0]);
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof ClassMetaUtil)) {
            return false;
        }
        ClassMetaUtil other = (ClassMetaUtil)o;
        return other.canEqual((Object)this);
    }

    protected boolean canEqual(Object other) {
        return other instanceof ClassMetaUtil;
    }

    public int hashCode() {
        boolean result = true;
        return 1;
    }

    public String toString() {
        return "ClassMetaUtil()";
    }
}

