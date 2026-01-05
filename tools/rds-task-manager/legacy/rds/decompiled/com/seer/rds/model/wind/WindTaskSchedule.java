/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.model.wind.WindTaskSchedule
 *  com.seer.rds.model.wind.WindTaskSchedule$WindTaskScheduleBuilder
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.Id
 *  javax.persistence.Lob
 *  javax.persistence.Table
 *  org.hibernate.annotations.GenericGenerator
 */
package com.seer.rds.model.wind;

import com.seer.rds.model.wind.WindTaskSchedule;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Lob;
import javax.persistence.Table;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name="t_windtaskschedule")
public class WindTaskSchedule {
    @Id
    @GenericGenerator(name="idGenerator", strategy="uuid")
    @GeneratedValue(generator="idGenerator")
    private String id;
    private String name;
    @Lob
    private String timeList;
    @Lob
    private String dateList;
    private String timeInterval;
    @Lob
    private String taskList;

    public static WindTaskScheduleBuilder builder() {
        return new WindTaskScheduleBuilder();
    }

    public String getId() {
        return this.id;
    }

    public String getName() {
        return this.name;
    }

    public String getTimeList() {
        return this.timeList;
    }

    public String getDateList() {
        return this.dateList;
    }

    public String getTimeInterval() {
        return this.timeInterval;
    }

    public String getTaskList() {
        return this.taskList;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setTimeList(String timeList) {
        this.timeList = timeList;
    }

    public void setDateList(String dateList) {
        this.dateList = dateList;
    }

    public void setTimeInterval(String timeInterval) {
        this.timeInterval = timeInterval;
    }

    public void setTaskList(String taskList) {
        this.taskList = taskList;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        }
        if (!(o instanceof WindTaskSchedule)) {
            return false;
        }
        WindTaskSchedule other = (WindTaskSchedule)o;
        if (!other.canEqual((Object)this)) {
            return false;
        }
        String this$id = this.getId();
        String other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) {
            return false;
        }
        String this$name = this.getName();
        String other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) {
            return false;
        }
        String this$timeList = this.getTimeList();
        String other$timeList = other.getTimeList();
        if (this$timeList == null ? other$timeList != null : !this$timeList.equals(other$timeList)) {
            return false;
        }
        String this$dateList = this.getDateList();
        String other$dateList = other.getDateList();
        if (this$dateList == null ? other$dateList != null : !this$dateList.equals(other$dateList)) {
            return false;
        }
        String this$timeInterval = this.getTimeInterval();
        String other$timeInterval = other.getTimeInterval();
        if (this$timeInterval == null ? other$timeInterval != null : !this$timeInterval.equals(other$timeInterval)) {
            return false;
        }
        String this$taskList = this.getTaskList();
        String other$taskList = other.getTaskList();
        return !(this$taskList == null ? other$taskList != null : !this$taskList.equals(other$taskList));
    }

    protected boolean canEqual(Object other) {
        return other instanceof WindTaskSchedule;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        String $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        String $name = this.getName();
        result = result * 59 + ($name == null ? 43 : $name.hashCode());
        String $timeList = this.getTimeList();
        result = result * 59 + ($timeList == null ? 43 : $timeList.hashCode());
        String $dateList = this.getDateList();
        result = result * 59 + ($dateList == null ? 43 : $dateList.hashCode());
        String $timeInterval = this.getTimeInterval();
        result = result * 59 + ($timeInterval == null ? 43 : $timeInterval.hashCode());
        String $taskList = this.getTaskList();
        result = result * 59 + ($taskList == null ? 43 : $taskList.hashCode());
        return result;
    }

    public String toString() {
        return "WindTaskSchedule(id=" + this.getId() + ", name=" + this.getName() + ", timeList=" + this.getTimeList() + ", dateList=" + this.getDateList() + ", timeInterval=" + this.getTimeInterval() + ", taskList=" + this.getTaskList() + ")";
    }

    public WindTaskSchedule() {
    }

    public WindTaskSchedule(String id, String name, String timeList, String dateList, String timeInterval, String taskList) {
        this.id = id;
        this.name = name;
        this.timeList = timeList;
        this.dateList = dateList;
        this.timeInterval = timeInterval;
        this.taskList = taskList;
    }
}

