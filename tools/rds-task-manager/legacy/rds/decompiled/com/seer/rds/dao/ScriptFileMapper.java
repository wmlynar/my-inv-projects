/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.ScriptFileMapper
 *  com.seer.rds.model.script.ScriptFile
 *  org.springframework.data.jpa.repository.JpaRepository
 *  org.springframework.data.jpa.repository.JpaSpecificationExecutor
 *  org.springframework.data.jpa.repository.Modifying
 *  org.springframework.data.jpa.repository.Query
 *  org.springframework.stereotype.Repository
 *  org.springframework.transaction.annotation.Transactional
 */
package com.seer.rds.dao;

import com.seer.rds.model.script.ScriptFile;
import java.util.Date;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface ScriptFileMapper
extends JpaRepository<ScriptFile, Long>,
JpaSpecificationExecutor<ScriptFile> {
    public List<ScriptFile> findAllByEnable(int var1);

    public List<ScriptFile> findAllByDebugEnable(int var1);

    public ScriptFile findScriptFileByFolderName(String var1);

    @Transactional
    @Modifying
    @Query(value="update ScriptFile s set s.enable = :enable,s.enableTime = :enableTime where s.folderName = :folderName")
    public int updateScriptEnable(String var1, int var2, Date var3);

    @Transactional
    @Modifying
    @Query(value="update ScriptFile s set s.debugEnable = :enable where s.folderName = :folderName")
    public int updateScriptDebugEnable(String var1, int var2);

    @Transactional
    public int deleteScriptFileByFolderName(String var1);
}

