/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.config.PropConfig
 *  com.seer.rds.runnable.RDSSystemInfo
 *  com.seer.rds.runnable.RDSSystemInfo$1
 *  com.seer.rds.util.SpringUtil
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  oshi.SystemInfo
 *  oshi.hardware.CentralProcessor
 *  oshi.hardware.CentralProcessor$TickType
 */
package com.seer.rds.runnable;

import com.seer.rds.config.PropConfig;
import com.seer.rds.runnable.RDSSystemInfo;
import com.seer.rds.util.SpringUtil;
import com.sun.management.OperatingSystemMXBean;
import java.io.File;
import java.io.Serializable;
import java.lang.invoke.CallSite;
import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryPoolMXBean;
import java.lang.management.MemoryUsage;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.text.DecimalFormat;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;

public class RDSSystemInfo
implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(RDSSystemInfo.class);
    private static final long sleepTime = 60000L;

    @Override
    public void run() {
        while (true) {
            try {
                while (true) {
                    log.info("--------RDS Version number-------");
                    log.info(this.versionNumber().toString());
                    log.info("--------Disk usage--------");
                    log.info(this.mapDisk().toString());
                    log.info("--------Memory usage--------");
                    log.info(this.mapMem().toString());
                    log.info("--------Cpu usage--------");
                    log.info(this.mapCpu().toString());
                    log.info("--------Thread and jvm situation--------");
                    log.info(this.mapJvm().toString());
                    log.info("--------System parameters--------");
                    log.info(this.mapEnv().toString());
                    Thread.sleep(60000L);
                }
            }
            catch (Exception e1) {
                try {
                    Thread.sleep(60000L);
                }
                catch (InterruptedException e) {
                    log.error("RDSSystemInfo InterruptedException", (Throwable)e);
                }
                log.error("RDSSystemInfo Exception", (Throwable)e1);
                continue;
            }
            break;
        }
    }

    public String versionNumber() {
        PropConfig propConfig = (PropConfig)SpringUtil.getBean(PropConfig.class);
        return propConfig.getProjectVersion();
    }

    public LinkedHashMap<String, LinkedHashMap<String, String>> mapDisk() {
        LinkedHashMap<String, LinkedHashMap<String, String>> result = new LinkedHashMap<String, LinkedHashMap<String, String>>();
        File[] files = File.listRoots();
        Arrays.stream(files).forEach(file -> {
            String total = new DecimalFormat("#.#").format((double)file.getTotalSpace() * 1.0 / 1024.0 / 1024.0 / 1024.0) + "G";
            String free = new DecimalFormat("#.#").format((double)file.getFreeSpace() * 1.0 / 1024.0 / 1024.0 / 1024.0) + "G";
            String un = new DecimalFormat("#.#").format((double)file.getUsableSpace() * 1.0 / 1024.0 / 1024.0 / 1024.0) + "G";
            String path = file.getPath();
            LinkedHashMap<String, CallSite> pathMap = new LinkedHashMap<String, CallSite>();
            pathMap.put("Total space", (CallSite)((Object)total));
            pathMap.put("Available space", (CallSite)((Object)un));
            pathMap.put("Free space", (CallSite)((Object)free));
            result.put(path, pathMap);
        });
        return result;
    }

    public LinkedHashMap<String, LinkedHashMap<String, Serializable>> mapMem() {
        LinkedHashMap<String, LinkedHashMap<String, Serializable>> result = new LinkedHashMap<String, LinkedHashMap<String, Serializable>>();
        OperatingSystemMXBean osmxb = (OperatingSystemMXBean)ManagementFactory.getOperatingSystemMXBean();
        MemoryMXBean memoryMXBean = ManagementFactory.getMemoryMXBean();
        MemoryUsage memoryUsage = memoryMXBean.getHeapMemoryUsage();
        long initTotalMemorySize = memoryUsage.getInit();
        long maxMemorySize = memoryUsage.getMax();
        long usedMemorySize = memoryUsage.getUsed();
        LinkedHashMap<String, Object> memoryUsageMap = new LinkedHashMap<String, Object>();
        memoryUsageMap.put("Initial total memory", initTotalMemorySize);
        memoryUsageMap.put("Maximum available memory", maxMemorySize);
        memoryUsageMap.put("Used memory", usedMemorySize);
        String totalMemorySize = new DecimalFormat("#.##").format((double)osmxb.getTotalPhysicalMemorySize() / 1024.0 / 1024.0 / 1024.0) + "G";
        String freePhysicalMemorySize = new DecimalFormat("#.##").format((double)osmxb.getFreePhysicalMemorySize() / 1024.0 / 1024.0 / 1024.0) + "G";
        String usedMemory = new DecimalFormat("#.##").format((double)(osmxb.getTotalPhysicalMemorySize() - osmxb.getFreePhysicalMemorySize()) / 1024.0 / 1024.0 / 1024.0) + "G";
        memoryUsageMap.put("Total physical memory", totalMemorySize);
        memoryUsageMap.put("Remaining physical memory", freePhysicalMemorySize);
        memoryUsageMap.put("Physical memory used", usedMemory);
        String jvmInitMem = new DecimalFormat("#.#").format((double)initTotalMemorySize * 1.0 / 1024.0 / 1024.0) + "M";
        String jvmMaxMem = new DecimalFormat("#.#").format((double)maxMemorySize * 1.0 / 1024.0 / 1024.0) + "M";
        String jvmUsedMem = new DecimalFormat("#.#").format((double)usedMemorySize * 1.0 / 1024.0 / 1024.0) + "M";
        memoryUsageMap.put("JVM initial total memory", jvmInitMem);
        memoryUsageMap.put("Maximum available memory for JVM", jvmMaxMem);
        memoryUsageMap.put("Memory used by JVM", jvmUsedMem);
        result.put("System memory usage", memoryUsageMap);
        return result;
    }

    public LinkedHashMap<String, Serializable> mapCpu() throws InterruptedException {
        LinkedHashMap<String, Serializable> result = new LinkedHashMap<String, Serializable>();
        SystemInfo systemInfo = new SystemInfo();
        result.put("Program startup time", (Serializable)((Object)new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date(ManagementFactory.getRuntimeMXBean().getStartTime()))));
        CentralProcessor processor = systemInfo.getHardware().getProcessor();
        long[] prevTicks = processor.getSystemCpuLoadTicks();
        TimeUnit.SECONDS.sleep(1L);
        long[] ticks = processor.getSystemCpuLoadTicks();
        long nice = ticks[CentralProcessor.TickType.NICE.getIndex()] - prevTicks[CentralProcessor.TickType.NICE.getIndex()];
        long irq = ticks[CentralProcessor.TickType.IRQ.getIndex()] - prevTicks[CentralProcessor.TickType.IRQ.getIndex()];
        long softirq = ticks[CentralProcessor.TickType.SOFTIRQ.getIndex()] - prevTicks[CentralProcessor.TickType.SOFTIRQ.getIndex()];
        long steal = ticks[CentralProcessor.TickType.STEAL.getIndex()] - prevTicks[CentralProcessor.TickType.STEAL.getIndex()];
        long cSys = ticks[CentralProcessor.TickType.SYSTEM.getIndex()] - prevTicks[CentralProcessor.TickType.SYSTEM.getIndex()];
        long user = ticks[CentralProcessor.TickType.USER.getIndex()] - prevTicks[CentralProcessor.TickType.USER.getIndex()];
        long iowait = ticks[CentralProcessor.TickType.IOWAIT.getIndex()] - prevTicks[CentralProcessor.TickType.IOWAIT.getIndex()];
        long idle = ticks[CentralProcessor.TickType.IDLE.getIndex()] - prevTicks[CentralProcessor.TickType.IDLE.getIndex()];
        long totalCpu = user + nice + cSys + idle + iowait + irq + softirq + steal;
        result.put("Cpu kernel number", Integer.valueOf(processor.getLogicalProcessorCount()));
        result.put("Cpu system utilization", (Serializable)((Object)new DecimalFormat("#.##%").format((double)cSys * 1.0 / (double)totalCpu)));
        result.put("Cpu user utilization", (Serializable)((Object)new DecimalFormat("#.##%").format((double)user * 1.0 / (double)totalCpu)));
        result.put("Current waiting rate of cpu", (Serializable)((Object)new DecimalFormat("#.##%").format((double)iowait * 1.0 / (double)totalCpu)));
        result.put("Current idle rate of cpu", (Serializable)((Object)new DecimalFormat("#.##%").format((double)idle * 1.0 / (double)totalCpu)));
        return result;
    }

    public LinkedHashMap<String, Object> mapJvm() {
        LinkedHashMap<String, Object> result = new LinkedHashMap<String, Object>();
        ThreadGroup parentThread = Thread.currentThread().getThreadGroup();
        while (parentThread.getParent() != null) {
            parentThread = parentThread.getParent();
        }
        int totalThread = parentThread.activeCount();
        result.put("Number of bus programs", totalThread);
        result.put("PID", System.getProperty("PID"));
        result.put("ObjectPendingFinalizationCount", ManagementFactory.getMemoryMXBean().getObjectPendingFinalizationCount());
        result.put("HeapMemoryUsage", ManagementFactory.getMemoryMXBean().getHeapMemoryUsage());
        result.put("NonHeapMemoryUsage", ManagementFactory.getMemoryMXBean().getNonHeapMemoryUsage());
        result.put("ObjectName", ManagementFactory.getMemoryMXBean().getObjectName());
        result.put("LoadedClassCount", ManagementFactory.getClassLoadingMXBean().getLoadedClassCount());
        result.put("TotalLoadedClassCount", ManagementFactory.getClassLoadingMXBean().getTotalLoadedClassCount());
        result.put("TotalCompilationTime", ManagementFactory.getCompilationMXBean().getTotalCompilationTime());
        result.put("Compilation", ManagementFactory.getCompilationMXBean().getName());
        result.put("OperatingSystemMXBean", ManagementFactory.getOperatingSystemMXBean().getName());
        result.put("OperatingSystemMXArch", ManagementFactory.getOperatingSystemMXBean().getArch());
        result.put("AvailableProcessors", ManagementFactory.getOperatingSystemMXBean().getAvailableProcessors());
        result.put("SystemLoadAverage", ManagementFactory.getOperatingSystemMXBean().getSystemLoadAverage());
        LinkedHashMap<String, 1> jvmMemPool = new LinkedHashMap<String, 1>();
        List<MemoryPoolMXBean> memoryPoolMXBeans = ManagementFactory.getMemoryPoolMXBeans();
        for (MemoryPoolMXBean pool : memoryPoolMXBeans) {
            jvmMemPool.put(pool.getName(), new /* Unavailable Anonymous Inner Class!! */);
        }
        result.put("MemoryPool", jvmMemPool);
        LinkedHashMap<String, GarbageCollectorMXBean> garbageCollector = new LinkedHashMap<String, GarbageCollectorMXBean>();
        List<GarbageCollectorMXBean> garbageCollectorMXBeans = ManagementFactory.getGarbageCollectorMXBeans();
        for (GarbageCollectorMXBean garbageCollectorMXBean : garbageCollectorMXBeans) {
            garbageCollector.put(garbageCollectorMXBean.getName(), garbageCollectorMXBean);
        }
        result.put("GarbageCollector", garbageCollector);
        return result;
    }

    public LinkedHashMap<String, Serializable> mapEnv() throws UnknownHostException {
        LinkedHashMap<String, Serializable> result = new LinkedHashMap<String, Serializable>();
        Runtime r = Runtime.getRuntime();
        Properties props = System.getProperties();
        InetAddress addr = InetAddress.getLocalHost();
        String ip = addr.getHostAddress();
        Map<String, String> map = System.getenv();
        String userName = map.get("USERNAME");
        String computerName = map.get("COMPUTERNAME");
        String userDomain = map.get("USERDOMAIN");
        result.put("User name", (Serializable)((Object)userName));
        result.put("Computer name", (Serializable)((Object)computerName));
        result.put("Computer domain name", (Serializable)((Object)userDomain));
        result.put("Local ip address", (Serializable)((Object)ip));
        result.put("Local host name", (Serializable)((Object)addr.getHostName()));
        result.put("Total memory available to JVM", Long.valueOf(r.totalMemory()));
        result.put("Remaining memory available to JVM", Long.valueOf(r.freeMemory()));
        result.put("Number of processors that JVM can use", Integer.valueOf(r.availableProcessors()));
        return result;
    }
}

