const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
let sqlJsPromise = null;

function getSqlJs() {
  if (!sqlJsPromise) {
    try {
      let initSqlJs = null;
      try {
        initSqlJs = require('sql.js');
      } catch (err) {
        const taskManagerRequire = createRequire(path.resolve(__dirname, '..', 'task-manager', 'package.json'));
        initSqlJs = taskManagerRequire('sql.js');
      }
      sqlJsPromise = initSqlJs();
    } catch (err) {
      sqlJsPromise = Promise.reject(err);
    }
  }
  return sqlJsPromise;
}

function findRobotParamPath(scenePath, robotId, rootOverride) {
  if (!robotId) {
    return null;
  }
  const root = rootOverride
    ? path.resolve(rootOverride)
    : scenePath
      ? path.resolve(path.dirname(scenePath))
      : null;
  if (!root) {
    return null;
  }
  return path.join(root, 'robots', robotId, 'params', 'robot.param');
}

async function parseRobotParam(filePath, { maxRowsPerTable = 2000 } = {}) {
  if (!filePath || !fs.existsSync(filePath)) {
    return { error: 'param_not_found' };
  }
  try {
    const SQL = await getSqlJs();
    const buffer = fs.readFileSync(filePath);
    const db = new SQL.Database(buffer);
    const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const tables = tablesResult.length > 0 ? tablesResult[0].values.map((row) => row[0]) : [];
    const out = { table_names: tables, tables: {} };
    for (const table of tables) {
      const colInfo = db.exec(`PRAGMA table_info('${table}')`);
      const cols = colInfo.length > 0 ? colInfo[0].values.map((row) => row[1]) : [];
      const data = db.exec(`SELECT * FROM '${table}' LIMIT ${Number(maxRowsPerTable) || 2000}`);
      const rows = data.length > 0 ? data[0].values : [];
      out.tables[table] = rows.map((row) => {
        const item = {};
        for (let i = 0; i < cols.length; i += 1) {
          item[cols[i]] = row[i];
        }
        return item;
      });
    }
    db.close();
    return out;
  } catch (err) {
    return { error: 'parse_failed', message: err.message };
  }
}

module.exports = {
  findRobotParamPath,
  parseRobotParam
};
