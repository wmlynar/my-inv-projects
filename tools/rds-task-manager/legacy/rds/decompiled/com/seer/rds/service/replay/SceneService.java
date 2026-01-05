/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.seer.rds.dao.SceneMapper
 *  com.seer.rds.model.replay.SceneRecord
 *  com.seer.rds.service.replay.SceneService
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Service
 */
package com.seer.rds.service.replay;

import com.seer.rds.dao.SceneMapper;
import com.seer.rds.model.replay.SceneRecord;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SceneService {
    @Autowired
    private SceneMapper sceneMapper;

    public SceneRecord save(SceneRecord sceneRecord) {
        return (SceneRecord)this.sceneMapper.save((Object)sceneRecord);
    }

    public List<String> findMd5OrderByIdDesc() {
        return this.sceneMapper.findMd5OrderByIdDesc();
    }

    public void deleteById(Long id) {
        this.sceneMapper.deleteById((Object)id);
    }
}

