/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.alibaba.druid.filter.config.ConfigTools
 *  com.alibaba.druid.pool.DruidDataSource
 *  com.seer.rds.config.DataBaseConfig
 *  org.apache.commons.lang3.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.context.annotation.Bean
 *  org.springframework.context.annotation.Configuration
 *  org.springframework.context.annotation.Primary
 */
package com.seer.rds.config;

import com.alibaba.druid.filter.config.ConfigTools;
import com.alibaba.druid.pool.DruidDataSource;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import javax.sql.DataSource;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class DataBaseConfig {
    private static final Logger log = LoggerFactory.getLogger(DataBaseConfig.class);
    @Value(value="${spring.datasource.url}")
    private String dbUrl;
    @Value(value="${spring.datasource.username}")
    private String username;
    @Value(value="${spring.datasource.password}")
    private String password;
    @Value(value="${spring.datasource.driver-class-name}")
    private String driverClassName;
    @Value(value="${spring.datasource.second.driver-class-name}")
    private String driverClassName1;
    @Value(value="${spring.datasource.kingdb.driver-class-name}")
    private String kingDriverClassName;
    @Value(value="${spring.datasource.oracle.driver-class-name}")
    private String oracleDriverClassName;
    @Value(value="${spring.datasource.initial-size}")
    private int initialSize;
    @Value(value="${spring.datasource.min-idle}")
    private int minIdle;
    @Value(value="${spring.datasource.max-active}")
    private int maxActive;
    @Value(value="${spring.datasource.max-wait}")
    private int maxWait;
    @Value(value="${DBEncode}")
    private Boolean DBEncode;
    @Value(value="${spring.datasource.databaseType}")
    private String dataBaseType;
    @Value(value="${databasePublicKey}")
    private String databasePublicKey;
    @Value(value="${project.version}")
    private String version;

    @Bean(initMethod="init", destroyMethod="close")
    @Primary
    public DataSource dataSource() throws SQLException {
        this.createDataBaseIfNotOracle();
        this.initIndexIfMySQLOrSQLServer();
        DruidDataSource druidDataSource = new DruidDataSource();
        druidDataSource.setUsername(this.username);
        druidDataSource.setPassword(this.password);
        druidDataSource.setUrl(this.dbUrl);
        this.setFiltersAndConnectionProperties(druidDataSource);
        druidDataSource.setInitialSize(this.initialSize);
        druidDataSource.setMinIdle(this.minIdle);
        druidDataSource.setMaxActive(this.maxActive);
        druidDataSource.setMaxWait((long)this.maxWait);
        druidDataSource.setUseGlobalDataSourceStat(true);
        druidDataSource.setDefaultTransactionIsolation(Integer.valueOf(2));
        this.setDriverClassName(druidDataSource);
        druidDataSource.setTestWhileIdle(true);
        this.setValidationQuery(druidDataSource);
        return druidDataSource;
    }

    private void createDataBaseIfNotOracle() {
        if (!this.dataBaseType.equals("ORACLE")) {
            this.createDataBase();
        }
    }

    private void initIndexIfMySQLOrSQLServer() {
        if (this.dataBaseType.equals("MYSQL") || this.dataBaseType.equals("SQLSERVER")) {
            this.initIndex();
        }
    }

    private void setFiltersAndConnectionProperties(DruidDataSource druidDataSource) throws SQLException {
        Object filters;
        Object object = filters = this.dataBaseType.equals("KINGDB") || this.dataBaseType.equals("ORACLE") ? "stat" : "stat,wall";
        if (this.DBEncode.booleanValue()) {
            filters = (String)filters + ",config";
            druidDataSource.setConnectionProperties("config.decrypt=true;config.decrypt.key=" + this.databasePublicKey);
        }
        druidDataSource.setFilters((String)filters);
    }

    private void setDriverClassName(DruidDataSource druidDataSource) {
        if (this.dataBaseType.equals("MYSQL")) {
            druidDataSource.setDriverClassName(this.driverClassName);
        } else if (this.dataBaseType.equals("SQLSERVER")) {
            druidDataSource.setDriverClassName(this.driverClassName1);
        } else if (this.dataBaseType.equals("KINGDB")) {
            druidDataSource.setDriverClassName(this.kingDriverClassName);
        } else if (this.dataBaseType.equals("ORACLE")) {
            druidDataSource.setDriverClassName(this.oracleDriverClassName);
        }
    }

    private void setValidationQuery(DruidDataSource druidDataSource) {
        if (this.dataBaseType.equals("ORACLE")) {
            druidDataSource.setValidationQuery("SELECT 1 FROM DUAL");
        } else {
            druidDataSource.setValidationQuery("SELECT 1");
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void createDataBase() {
        Connection conn = null;
        Statement stmt = null;
        try {
            String databaseUrl = this.dbUrl;
            if (StringUtils.isEmpty((CharSequence)databaseUrl)) {
                return;
            }
            Object dbUrl = "";
            String database = "";
            if (this.dataBaseType.equals("MYSQL")) {
                dbUrl = databaseUrl.substring(0, databaseUrl.lastIndexOf("/"));
                database = databaseUrl.substring(databaseUrl.lastIndexOf("/") + 1, databaseUrl.indexOf("?"));
                Class.forName(this.driverClassName);
            } else if (this.dataBaseType.equals("SQLSERVER")) {
                dbUrl = databaseUrl.substring(0, databaseUrl.lastIndexOf(";"));
                database = databaseUrl.substring(databaseUrl.lastIndexOf("=") + 1, databaseUrl.length());
                Class.forName(this.driverClassName1);
            } else if (this.dataBaseType.equals("KINGDB")) {
                dbUrl = databaseUrl.substring(0, databaseUrl.lastIndexOf("/")) + "/test";
                database = databaseUrl.substring(databaseUrl.lastIndexOf("/") + 1, databaseUrl.length());
                Class.forName(this.kingDriverClassName);
            }
            log.info("Connecting to database...");
            if (this.DBEncode.booleanValue()) {
                String pwd = ConfigTools.decrypt((String)this.databasePublicKey, (String)this.password);
                conn = DriverManager.getConnection((String)dbUrl, this.username, pwd);
            } else {
                conn = DriverManager.getConnection((String)dbUrl, this.username, this.password);
            }
            log.info("Creating database...");
            stmt = conn.createStatement();
            Object sql = "";
            if (this.dataBaseType.equals("MYSQL")) {
                sql = "CREATE DATABASE " + database + " DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin";
            } else if (this.dataBaseType.equals("SQLSERVER")) {
                sql = "CREATE DATABASE " + database + " COLLATE Chinese_PRC_CI_AS";
            } else if (this.dataBaseType.equals("KINGDB")) {
                sql = "CREATE DATABASE " + database;
            }
            stmt.executeUpdate((String)sql);
            log.info("Database created successfully...");
        }
        catch (SQLException se) {
            log.info("Database created failed,{}", (Object)se.getMessage());
        }
        catch (Exception e) {
            log.info("Database created failed...");
        }
        finally {
            try {
                if (stmt != null) {
                    stmt.close();
                }
            }
            catch (SQLException se) {}
            try {
                if (conn != null) {
                    conn.close();
                }
            }
            catch (SQLException se) {
                log.error("SQLException", (Throwable)se);
            }
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void initIndex() {
        log.info("initIndexIfMySQLOrSQLServer...");
        Connection conn = null;
        Statement stmt = null;
        try {
            if (this.dataBaseType.equals("MYSQL")) {
                Class.forName(this.driverClassName);
            } else if (this.dataBaseType.equals("SQLSERVER")) {
                Class.forName(this.driverClassName1);
            }
            if (this.DBEncode.booleanValue()) {
                String pwd = ConfigTools.decrypt((String)this.databasePublicKey, (String)this.password);
                conn = DriverManager.getConnection(this.dbUrl, this.username, pwd);
            } else {
                conn = DriverManager.getConnection(this.dbUrl, this.username, this.password);
            }
            conn.setAutoCommit(false);
            stmt = conn.createStatement();
            try {
                if (this.dataBaseType.equals("MYSQL")) {
                    stmt.execute("SHOW INDEX FROM t_alarmsrecord WHERE Key_name = 'startOnIndex';");
                } else if (this.dataBaseType.equals("SQLSERVER")) {
                    stmt.execute("SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('t_alarmsrecord') AND name = 'startOnIndex';");
                }
            }
            catch (Exception e) {
                log.error("alarmsrecord doesn't create,not need init index");
                if (stmt != null) {
                    try {
                        stmt.close();
                    }
                    catch (SQLException throwables) {
                        log.error("SQLException error", (Throwable)throwables);
                    }
                }
                if (conn != null) {
                    try {
                        conn.close();
                    }
                    catch (SQLException throwables) {
                        log.error("SQLException error", (Throwable)throwables);
                    }
                }
                return;
            }
            ResultSet indexSet = stmt.getResultSet();
            indexSet.next();
            try {
                indexSet.getString(1);
            }
            catch (SQLException e) {
                log.error("already init index");
                if (stmt != null) {
                    try {
                        stmt.close();
                    }
                    catch (SQLException throwables) {
                        log.error("SQLException error", (Throwable)throwables);
                    }
                }
                if (conn != null) {
                    try {
                        conn.close();
                    }
                    catch (SQLException throwables) {
                        log.error("SQLException error", (Throwable)throwables);
                    }
                }
                return;
            }
            Object sql = "";
            if (this.dataBaseType.equals("MYSQL")) {
                stmt.execute("select version()");
                ResultSet versionSet = stmt.getResultSet();
                versionSet.next();
                String version = versionSet.getString(1);
                sql = version.startsWith("10.3") ? (String)sql + "ALTER TABLE  `t_alarmsrecord`   DROP  INDEX  startOnIndex;ALTER TABLE  `t_alarmsrecord_merge`   DROP  INDEX  startOnIndex;ALTER TABLE  `t_robotstatusrecord`   DROP  INDEX  startOnIndex;ALTER TABLE  `t_alarmsrecord`   DROP  INDEX  vehicleIdIndex;ALTER TABLE  `t_alarmsrecord`   DROP  INDEX  levelIndex;ALTER TABLE  `t_alarmsrecord`   DROP  INDEX  alarmsCodeIndex;ALTER TABLE  `t_alarmsrecord_merge`   DROP  INDEX  vehicleIdIndex;ALTER TABLE  `t_alarmsrecord_merge`   DROP  INDEX  levelIndex;ALTER TABLE  `t_alarmsrecord_merge`   DROP  INDEX  alarmsCodeIndex;ALTER TABLE  `t_statrecord`   DROP  INDEX  timeIndex;ALTER TABLE  `t_statrecord`   DROP  INDEX  levelIndex;ALTER TABLE  `t_statrecord_duplicate`   DROP  INDEX  timeIndex;ALTER TABLE  `t_statrecord_duplicate`   DROP  INDEX  levelIndex;ALTER TABLE  `t_winddemandtask`   DROP  INDEX  statusIndex;ALTER TABLE  `t_worksite_attr_data`   DROP  INDEX  siteIdIndex;ALTER TABLE  `t_worksite_attr_data`   DROP  INDEX  attributeIdIndex;ALTER TABLE  `t_eventrecord`   DROP  INDEX  statusCreatedOnIndex;ALTER TABLE  `t_eventrecord`   DROP  INDEX  taskDefLabelCreatedOnIndex;ALTER TABLE  `t_eventrecord`   DROP  INDEX  CreatedOnIndex" : (String)sql + "ALTER TABLE  `t_alarmsrecord`   RENAME  INDEX  startOnIndex To alarmsrecordStartOnIndex;ALTER TABLE  `t_alarmsrecord_merge`   RENAME  INDEX  startOnIndex To alarmsrecordMergeStartOnIndex;ALTER TABLE  `t_robotstatusrecord`   RENAME  INDEX  startOnIndex To robotstatusrecordStartOnIndex;ALTER TABLE  `t_alarmsrecord`   RENAME  INDEX  vehicleIdIndex To alarmsrecordVehicleIdIndex;ALTER TABLE  `t_alarmsrecord`   RENAME  INDEX  levelIndex To alarmsrecordLevelIndex;ALTER TABLE  `t_alarmsrecord`   RENAME  INDEX  alarmsCodeIndex To alarmsrecordAlarmsCodeIndex;ALTER TABLE  `t_alarmsrecord_merge`   RENAME  INDEX  vehicleIdIndex To alarmsrecordMergeVehicleIdIndex;ALTER TABLE  `t_alarmsrecord_merge`   RENAME  INDEX  levelIndex To alarmsrecordMergeLevelIndex;ALTER TABLE  `t_alarmsrecord_merge`   RENAME  INDEX  alarmsCodeIndex To alarmsrecordMergeAlarmsCodeIndex;ALTER TABLE  `t_statrecord`   RENAME  INDEX  timeIndex To statrecordTimeIndex;ALTER TABLE  `t_statrecord_duplicate`   RENAME  INDEX  timeIndex To statrecordDupTimeIndex;ALTER TABLE  `t_winddemandtask`   RENAME  INDEX  statusIndex To winddemandtaskStatusIndex;ALTER TABLE  `t_worksite_attr_data`   RENAME  INDEX  siteIdIndex To worksiteAttrDataSiteIdIndex;ALTER TABLE  `t_worksite_attr_data`   RENAME  INDEX  attributeIdIndex To worksiteAttrDataAttributeIdIndex;ALTER TABLE  `t_eventrecord`   RENAME  INDEX  statusCreatedOnIndex To eventrecordStatusCreatedOnIndex;ALTER TABLE  `t_eventrecord`   RENAME  INDEX  taskDefLabelCreatedOnIndex To eventrecordTaskDefLabelCreatedOnIndex;ALTER TABLE  `t_eventrecord`   RENAME  INDEX  CreatedOnIndex To eventrecordCreatedOnIndex";
            } else if (this.dataBaseType.equals("SQLSERVER")) {
                sql = (String)sql + "EXEC sp_rename @objname = 't_alarmsrecord.startOnIndex',@newname = alarmsrecordStartOnIndex,@objtype = 'INDEX';EXEC sp_rename @objname = 't_alarmsrecord_merge.startOnIndex',@newname = alarmsrecordMergeStartOnIndex,@objtype = 'INDEX';EXEC sp_rename @objname = 't_robotstatusrecord.startOnIndex',@newname = robotstatusrecordStartOnIndex,@objtype = 'INDEX';EXEC sp_rename @objname = 't_alarmsrecord.vehicleIdIndex',@newname = alarmsrecordVehicleIdIndex,@objtype = 'INDEX';EXEC sp_rename @objname = 't_alarmsrecord.levelIndex',@newname = alarmsrecordLevelIndex,@objtype = 'INDEX';EXEC sp_rename @objname = 't_alarmsrecord.alarmsCodeIndex',@newname = alarmsrecordAlarmsCodeIndex,@objtype = 'INDEX';EXEC sp_rename @objname = 't_alarmsrecord_merge.vehicleIdIndex',@newname = alarmsrecordMergeVehicleIdIndex,@objtype = 'INDEX';EXEC sp_rename @objname = 't_alarmsrecord_merge.levelIndex',@newname = alarmsrecordMergeLevelIndex,@objtype = 'INDEX';EXEC sp_rename @objname = 't_alarmsrecord_merge.alarmsCodeIndex',@newname = alarmsrecordMergeAlarmsCodeIndex,@objtype = 'INDEX';EXEC sp_rename @objname = 't_statrecord.timeIndex',@newname = statrecordTimeIndex,@objtype = 'INDEX';EXEC sp_rename @objname = 't_statrecord_duplicate.timeIndex',@newname = statrecordDupTimeIndex,@objtype = 'INDEX';EXEC sp_rename @objname = 't_winddemandtask.statusIndex',@newname = winddemandtaskStatusIndex,@objtype = 'INDEX';EXEC sp_rename @objname = 't_worksite_attr_data.siteIdIndex',@newname = worksiteAttrDataSiteIdIndex,@objtype = 'INDEX';EXEC sp_rename @objname = 't_worksite_attr_data.attributeIdIndex',@newname = worksiteAttrDataAttributeIdIndex,@objtype = 'INDEX';EXEC sp_rename @objname = 't_eventrecord.statusCreatedOnIndex',@newname = eventrecordStatusCreatedOnIndex,@objtype = 'INDEX';EXEC sp_rename @objname = 't_eventrecord.taskDefLabelCreatedOnIndex',@newname = eventrecordTaskDefLabelCreatedOnIndex,@objtype = 'INDEX';EXEC sp_rename @objname = 't_eventrecord.CreatedOnIndex',@newname = eventrecordCreatedOnIndex,@objtype = 'INDEX';";
            }
            String[] sqlStatements = ((String)sql).split(";");
            for (String statementSql : sqlStatements) {
                stmt.addBatch(statementSql);
            }
            int[] updateCounts = stmt.executeBatch();
            conn.commit();
        }
        catch (Exception e) {
            log.error("initIndex error", (Throwable)e);
        }
        finally {
            if (stmt != null) {
                try {
                    stmt.close();
                }
                catch (SQLException throwables) {
                    log.error("SQLException error", (Throwable)throwables);
                }
            }
            if (conn != null) {
                try {
                    conn.close();
                }
                catch (SQLException throwables) {
                    log.error("SQLException error", (Throwable)throwables);
                }
            }
        }
    }
}

