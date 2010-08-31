/* -----------------------------------------------------------------
  WSHF: Windows Script Host(JScript) Framework.
------------------------------------------------------------------ */
/*
 * Copyright 2004-2010 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/**
 * var oo4o = new Oo4o("user", "pass", "sid");
 * var ds = oo4o.select("select sysdate as x from dual");
 * for (var i = 0; i < ds.length; i++) {
 *   var entity = ds[i];
 *   $.print(entity.x);
 * }
 * oo4o.close();
 */
var ORAPARM_INPUT    = 1;
var ORAPARM_OUTPUT   = 2;
var ORAPARM_BOTH     = 3;
var ORATYPE_VARCHAR2 = 1;
var ORATYPE_NUMBER   = 2;
var ORATYPE_SINT     = 3;
var ORATYPE_FLOAT    = 4;
var ORATYPE_STRING   = 5;
var ORATYPE_VARCHAR  = 9;
var ORATYPE_DATE     = 12;
var ORATYPE_UINT     = 68;
var ORATYPE_CHAR     = 96;
var ORATYPE_CHARZ    = 97;
var ORATYPE_CURSOR   = 102;

var Oo4o = function (user, pass, sid){
  this._user = user;
  this._pass = pass;
  this._sid = sid;
  this._oo4o = null;
  this._session = null;
  this.open();
};
Oo4o.prototype = {
  open: function () {
    this._oo4o = WScript.CreateObject("OracleInProcServer.XOraSession");
    this._session = this._oo4o.OpenDatabase(this._sid, this._user + "/" + this._pass, 0);
  },
  close: function () {
    this._oo4o = null;
    this._session = null;
  },
  select: function (sql) {
    var ds = this._session.DbCreateDynaset(sql, 12);
    var fields = ds.Fields;
    var result = new Array();
    while (!ds.EOF) {
      var entity = new Object();
      for (var i=0; i < fields.Count; i++) {
        var field = fields(i).Name;
        entity[field] = ds(field).Value;
        entity[field.toLowerCase()] = entity[field];
      }
      ds.DbMoveNext();
      result.push(entity);
    }
    ds = null;
    return result;
  },
  executeSQL: function (sql, bindValues) {
    sql = this.bind(sql, bindValues);
    try{
      var result = this._session.ExecuteSQL(sql);
    } finally {
      var e = new Enumerator(this._session.Parameters);
      e.moveFirst();
      while(!e.atEnd()) {
        this._session.Parameters.Remove(e.item().Name);
        e.moveFirst();
      }
    }
    return result;
  },
  bind: function (sql, bindValues) {
    if (sql.indexOf("?") == 0 || bindValues == null) return sql;
    var sqlLog = sql;
    for (var i=0; i< bindValues.length; i++) {
      if (bindValues[i] == null) bindValues[i] = '';
      sql = sql.replace('?', ':A' + i);
      this._session.Parameters.Add('A'+i, '' + bindValues[i], ORAPARM_INPUT);
      this._session.Parameters('A'+i).ServerType = ORATYPE_VARCHAR2;
      if (typeof(bindValues[i]) == 'number'){
        this._session.Parameters('A'+i).ServerType = ORATYPE_NUMBER; // TODO:‚Æ‚è‚ ‚¦‚¸í‚ÉVARCHAR2
        sqlLog = sqlLog.replace('?', bindValues[i]);
        continue;
      }
      sqlLog = sqlLog.replace('?', "'" + bindValues[i] + "'");
    }
    return sql;
  },
  begin: function () {
    if (this._session == null) this.open();
    this._session.BeginTrans();
  },
  commit: function () {
    if (this._session == null) this.open();
    this._session.CommitTrans();
  },
  rollback: function () {
    if (this._session == null) this.open();
    this._session.Rollback();
  },
  transaction: function (block) {
    var result = null;
    try {
      this.begin();
      result = block(this);
      this.commit();
    } catch(e) {
      this.rollback();
      throw e;
    } finally {
      this.close();
    }
    return result;
  },
  // Utility ------------------------------------------------
  disableFK: function (){
    var sql = "SELECT ' ALTER TABLE ' || TABLE_NAME || ' DISABLE CONSTRAINT ' || CONSTRAINT_NAME AS SQL_STR"
              + " FROM USER_CONSTRAINTS CONS"
              + " WHERE CONSTRAINT_TYPE = 'R' AND STATUS = 'ENABLED'"
              + " ORDER BY TABLE_NAME";
    var ds = this.select(sql);
    for (var i = 0; i < ds.length; i++) {
      var entity = ds[i];
      this.executeSQL(entity.SQL_STR);
    }
  },
  enableFK: function() {
    var sql = "SELECT ' ALTER TABLE ' || TABLE_NAME || ' ENABLE CONSTRAINT ' || CONSTRAINT_NAME AS SQL_STR"
              + " FROM USER_CONSTRAINTS CONS"
              + " WHERE CONSTRAINT_TYPE = 'R' AND STATUS = 'DISABLED'"
              + " ORDER BY TABLE_NAME";
    var ds = this.select(sql);
    for (var i = 0; i < ds.length; i++) {
      var entity = ds[i];
      this.executeSQL(entity.SQL_STR);
    }
  },
  plsqlCompile: function () {
    var sql = "SELECT 'ALTER ' ||"
            + "       CASE WHEN OBJECT_TYPE = 'PACKAGE BODY' THEN 'PACKAGE' ELSE OBJECT_TYPE"
            + "       END || ' ' ||"
            + "       OBJECT_NAME || ' ' ||"
            + "       CASE WHEN OBJECT_TYPE = 'PACKAGE BODY' THEN 'COMPILE BODY' ELSE 'COMPILE'"
            + "       END AS SQL_STR"
            + "     , OBJECT_NAME"
            + "     , OBJECT_TYPE"
            + " FROM USER_OBJECTS"
            + " WHERE STATUS = 'INVALID'"
            + " ORDER BY OBJECT_NAME"
            + "       , OBJECT_TYPE";
    var ds = this.select(sql);
    for (var i = 0; i < ds.length; i++) {
      var entity = ds[i];
      this.executeSQL(entity.SQL_STR);
    }
  },
  allTruncateTable: function () {
    var sql = "SELECT 'TRUNCATE TABLE ' || TABLE_NAME || ' ' AS SQL_STR"
              + " FROM USER_TABLES"
              + " ORDER BY TABLE_NAME";
    var ds = this.select(sql);
    for (var i = 0; i < ds.length; i++) {
      var entity = ds[i];
      this.executeSQL(entity.SQL_STR);
    }
  },
  killSession: function (user) {
    var sql = " SELECT "
              + "  SID, SERIAL# as SERIAL, USERNAME"
              + " FROM "
              + "  V$SESSION "
              + " WHERE "
              + "    USERNAME NOT IN ('SYS', 'SYSTEM', 'SYSMAN', 'DBSNMP') "
              + " AND STATUS IN ('INACTIVE', 'ACTIVE') "
              + " AND USERNAME = '" + user.toUpperCase() + "'";
    var ds = this.select(sql);
    for (var i = 0; i < ds.length; i++) {
      var entity = ds[i];
      this.executeSQL("ALTER SYSTEM KILL SESSION '" + entity.SID + ", " + entity.SERIAL + "'");
    }
  },
  userTableCopy: function (toUser) {
    var sql = "SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME";
    var ds = this.select(sql);
    for (var i = 0; i < ds.length; i++) {
      var entity = ds[i];
      this.executeSQL("INSERT INTO " + toUser + "." + entity.TABLE_NAME + " (SELECT * FROM " + this._user + "." + entity.TABLE_NAME + ")");
    }
  },
  userTableStats: function () {
    var sql = "SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME";
    var ds = this.select(sql);
    for (var i = 0; i < ds.length; i++) {
      var entity = ds[i];
      this.executeSQL("BEGIN DBMS_STATS.GATHER_TABLE_STATS(OWNNAME=>'" + this._user + "', TABNAME=>'" + entity.TABLE_NAME + "', ESTIMATE_PERCENT=>DBMS_STATS.AUTO_SAMPLE_SIZE); END;");
    }
  },
  userIndexStats: function () {
    var sql = "SELECT INDEX_NAME FROM USER_INDEXES ORDER BY INDEX_NAME";
    var ds = this.select(sql);
    for (var i = 0; i < ds.length; i++) {
      var entity = ds[i];
      this.executeSQL("BEGIN DBMS_STATS.GATHER_INDEX_STATS(OWNNAME=>'" + this._user + "', INDNAME=>'" + entity.INDEX_NAME + "'); END;");
    }
  }
};
