/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.serverInfo.Cpu
 *  com.seer.rds.model.serverInfo.Jvm
 *  com.seer.rds.model.serverInfo.Mem
 *  com.seer.rds.model.serverInfo.Sys
 *  com.seer.rds.model.serverInfo.SysFile
 *  com.seer.rds.util.server.Arith
 *  com.seer.rds.util.server.IpUtils
 *  com.seer.rds.util.server.Server
 *  oshi.SystemInfo
 *  oshi.hardware.CentralProcessor
 *  oshi.hardware.CentralProcessor$TickType
 *  oshi.hardware.GlobalMemory
 *  oshi.hardware.HardwareAbstractionLayer
 *  oshi.software.os.FileSystem
 *  oshi.software.os.OSFileStore
 *  oshi.software.os.OperatingSystem
 *  oshi.util.Util
 */
package com.seer.rds.util.server;

import com.seer.rds.model.serverInfo.Cpu;
import com.seer.rds.model.serverInfo.Jvm;
import com.seer.rds.model.serverInfo.Mem;
import com.seer.rds.model.serverInfo.Sys;
import com.seer.rds.model.serverInfo.SysFile;
import com.seer.rds.util.server.Arith;
import com.seer.rds.util.server.IpUtils;
import java.net.UnknownHostException;
import java.util.LinkedList;
import java.util.List;
import java.util.Properties;
import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;
import oshi.hardware.HardwareAbstractionLayer;
import oshi.software.os.FileSystem;
import oshi.software.os.OSFileStore;
import oshi.software.os.OperatingSystem;
import oshi.util.Util;

public class Server {
    private static final int OSHI_WAIT_SECOND = 1000;
    private Cpu cpu = new Cpu();
    private Mem mem = new Mem();
    private Jvm jvm = new Jvm();
    private Sys sys = new Sys();
    private List<SysFile> sysFiles = new LinkedList();

    public Cpu getCpu() {
        return this.cpu;
    }

    public void setCpu(Cpu cpu) {
        this.cpu = cpu;
    }

    public Mem getMem() {
        return this.mem;
    }

    public void setMem(Mem mem) {
        this.mem = mem;
    }

    public Jvm getJvm() {
        return this.jvm;
    }

    public void setJvm(Jvm jvm) {
        this.jvm = jvm;
    }

    public Sys getSys() {
        return this.sys;
    }

    public void setSys(Sys sys) {
        this.sys = sys;
    }

    public List<SysFile> getSysFiles() {
        return this.sysFiles;
    }

    public void setSysFiles(List<SysFile> sysFiles) {
        this.sysFiles = sysFiles;
    }

    public void copyTo() throws Exception {
        SystemInfo si = new SystemInfo();
        HardwareAbstractionLayer hal = si.getHardware();
        this.setCpuInfo(hal.getProcessor());
        this.setMemInfo(hal.getMemory());
        this.setSysInfo();
        this.setJvmInfo();
        this.setSysFiles(si.getOperatingSystem());
    }

    private void setCpuInfo(CentralProcessor processor) {
        long[] prevTicks = processor.getSystemCpuLoadTicks();
        Util.sleep((long)1000L);
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
        this.cpu.setCpuNum(processor.getLogicalProcessorCount());
        this.cpu.setTotal((double)totalCpu);
        this.cpu.setSys((double)cSys);
        this.cpu.setUsed((double)user);
        this.cpu.setWait((double)iowait);
        this.cpu.setFree((double)idle);
    }

    private void setMemInfo(GlobalMemory memory) {
        this.mem.setTotal(memory.getTotal());
        this.mem.setUsed(memory.getTotal() - memory.getAvailable());
        this.mem.setFree(memory.getAvailable());
    }

    private void setSysInfo() {
        Properties props = System.getProperties();
        this.sys.setComputerName(IpUtils.getHostName());
        this.sys.setComputerIp(IpUtils.getHostIp());
        this.sys.setOsName(props.getProperty("os.name"));
        this.sys.setOsArch(props.getProperty("os.arch"));
        this.sys.setUserDir(props.getProperty("user.dir"));
    }

    private void setJvmInfo() throws UnknownHostException {
        Properties props = System.getProperties();
        this.jvm.setTotal((double)Runtime.getRuntime().totalMemory());
        this.jvm.setMax((double)Runtime.getRuntime().maxMemory());
        this.jvm.setFree((double)Runtime.getRuntime().freeMemory());
        this.jvm.setVersion(props.getProperty("java.version"));
        this.jvm.setHome(props.getProperty("java.home"));
    }

    private void setSysFiles(OperatingSystem os) {
        FileSystem fileSystem = os.getFileSystem();
        List fsArray = fileSystem.getFileStores();
        for (OSFileStore fs : fsArray) {
            long free = fs.getUsableSpace();
            long total = fs.getTotalSpace();
            long used = total - free;
            SysFile sysFile = new SysFile();
            sysFile.setDirName(fs.getMount());
            sysFile.setSysTypeName(fs.getType());
            sysFile.setTypeName(fs.getName());
            sysFile.setTotal(this.convertFileSize(total));
            sysFile.setFree(this.convertFileSize(free));
            sysFile.setUsed(this.convertFileSize(used));
            sysFile.setUsage(Arith.mul((double)Arith.div((double)used, (double)total, (int)4), (double)100.0));
            this.sysFiles.add(sysFile);
        }
    }

    public String convertFileSize(long size) {
        long kb = 1024L;
        long mb = kb * 1024L;
        long gb = mb * 1024L;
        if (size >= gb) {
            return String.format("%.1f GB", Float.valueOf((float)size / (float)gb));
        }
        if (size >= mb) {
            float f = (float)size / (float)mb;
            return String.format(f > 100.0f ? "%.0f MB" : "%.1f MB", Float.valueOf(f));
        }
        if (size >= kb) {
            float f = (float)size / (float)kb;
            return String.format(f > 100.0f ? "%.0f KB" : "%.1f KB", Float.valueOf(f));
        }
        return String.format("%d B", size);
    }
}

