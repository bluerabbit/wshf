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
(function(){

var FILE_IOMODE_FOR_READING = 1;   // 読取専用モード
var FILE_IOMODE_FOR_WRITING = 2;   // 書込モード
var FILE_IOMODE_FOR_APPENDING = 8; // 追記モード
var AD_TYPE_BINARY = 1;      // ADODB.Stream Type バイナリモード
var AD_TYPE_TEXT = 2;        // ADODB.Stream Type テキストモード
var WINDOW_SIZE_NOMAL = 1; // 通常
var WINDOW_SIZE_MIN = 2;   // 最小化
var WINDOW_SIZE_MAX = 3;   // 最大化
var LOG_EVENT_SUCCESS = 0;
var LOG_EVENT_ERROR = 1; // エラー
var LOG_EVENT_WARNING = 2; // 警告
var LOG_EVENT_INFORMATION = 4; // 情報
var LOG_EVENT_AUDIT_SUCCESS = 8; // セキュリティの成功の監査
var LOG_EVENT_AUDIT_FAILURE = 16; // セキュリティの失敗の監査

var vbOK = 1;     //［OK］が押された
var vbCancel = 2; //［キャンセル］が押された
var vbAbort = 3;  //［中止］が押された
var vbRetry = 4;  //［再試行］が押された
var vbIgnore = 5; //［無視］が押された
var vbYes = 6;    //［はい］が押された
var vbNo = 7;     //［いいえ］が押された
var vbNone = -1;    // 制限時間が経過した

var ssfINTERNETCACHE = 32;

var document = new ActiveXObject( "htmlfile" );
document.write("<html></html>");
var window = document.parentWindow;

var WSHF = function(){
  // Property
  this.shell = WScript.CreateObject("WScript.Shell");
  this.fileSystemObject = new ActiveXObject("Scripting.FileSystemObject");
  this.shellApplication = WScript.CreateObject("Shell.Application");
  this.scriptPath = this.shell.CurrentDirectory;
  this.scriptName = WScript.ScriptName;
  this.scriptFullName = WScript.ScriptFullName;
  this.logFilePath = WScript.ScriptFullName + '_' + this.getYyyyMmDd() + '.log';
  this.arguments = new Array();
  for (var i = 0; i < WScript.Arguments.length; i++) {
    this.arguments.push(WScript.Arguments(i));
  }
  this.args = this.arguments;
  // Method
  this.alias({cp:this.fileCopy,
              rm:this.fileDelete,
              erase:this.fileDelete,
              mv:this.fileMove,
              rename:this.fileMove,
              getExtName:this.fileGetExtensionName,
              mkdir:this.folderCreate,
              deltree:this.folderDelete,
              rmdir:this.folderDelete,
              puts:this.print,
              p:this.print,
              chdir:this.cd,
              start:this.run,
              system:this.run,
              call:this.run,
              msgbox:this.alert,
              echo:this.print,
              confirm:this.popup,
              prompt:this.inputBox,
              quit:this.exit,
              wait:this.sleep
             });
};
WSHF.VERSION = '0.0.3';
WSHF.prototype = {
    alias: function (hash) {
      for (var prop in hash) {
        this[prop] = hash[prop];
      }
    },
    extend: function (destination, source) {
      for (property in source) {
        destination[property] = source[property];
      }
      return destination;
    },
    isFunction: function (fun) {
      return (typeof fun == "function");
    },
    load: function (file) {
      if (file.constructor !=  Array) file = new Array(file);
      var script = "";
      for (var i = 0; i < file.length; i++) {
        if (file[i].indexOf("http") == 0) {
          script += this.httpLoad(file[i]);
          continue;
        }
        if (this.fileGetExtensionName(file[i]) != "js" && this.fileExists(file[i]) + ".js") {
          file[i] = file[i] + ".js";
        }
        if (this.fileExists(file[i])) {
          var fileTmp = this.fileSystemObject.OpenTextFile(file[i]);
          script += fileTmp.ReadAll();
          fileTmp.Close();
        } else {
          this.print("File NotFound:" + file[i]);
        }
      }
      return script;
    },
    httpLoad: function (url) {
      var stream = new ActiveXObject("ADODB.Stream");
      var xhr = new ActiveXObject("Microsoft.XMLHTTP");
      try {
        xhr.open( "GET", url, true );
        xhr.send();
        stream.Open();
        stream.Type = AD_TYPE_BINARY;
        stream.Write( xhr.responseBody );
        stream.Position = 0;
        stream.Type = AD_TYPE_TEXT;
        stream.Charset = "_autodetect";
        return stream.ReadText();
      } catch(e) {
        this.print(e.description);
        throw e;
      } finally {
        stream.Close();
        stream = null;
        xhr = null;
      }
    },
    wget: function (url, fileName) {
      if (fileName == null) {
        var nameFromUrl = function(url) {
          var parts = url.split( /[\\\/]/g );
          var f = parts[parts.length - 1];
          f = f.replace( /[\\\/:,;\*\?"<>\|]/g, "_" );
          parts[parts.length - 1] = f;
          return f;
        }
        fileName = nameFromUrl(url);
      }
      var xhr = new ActiveXObject("Microsoft.XMLHTTP");
      xhr.open( "GET", url, true );
      var completed = false;
      xhr.onreadystatechange = function() {
        if( xhr.readyState < 4 /* complete */ ) {
          return;
        }
        try {
          var getFileSize = function(headers) {
            var headers = xhr.getAllResponseHeaders();
            var result = {}, lines = headers.split( /((\r\n)|\r|\n)/g );
            for(var i = 0, l = lines.length; i < l; i++) {
              var matches = /^([^:]+): (.*)$/.exec( lines[i] );
              if( matches ) result[ matches[1].toLowerCase() ] = matches[2];
            }
            return result[ "content-length" ] || 'none';
          }
          var fileSize = getFileSize(xhr.getAllResponseHeaders());
          if (xhr.status != '200') {
            $.p('接続に失敗しました');
            completed = true;
            return;
          }
//          $.print("file size->" + fileSize);
          var stream = new ActiveXObject("ADODB.Stream");
          stream.Open();
          stream.Position = 0;
          stream.Type = 1; // AD_TYPE_BINARY
          stream.Write( xhr.responseBody );
          stream.SaveToFile( fileName, 2 );  // adSaveCreateOverWrite
        } catch(e) {
           $.print( e );
        } finally {
          if( stream ) {
            try { stream.Close(); } catch(e) {}
          }
        }
        completed = true;
      }
      xhr.send();
      while( ! completed ) {
        $.sleep( 50 );
      }
    },
    aop: function (target, methodNames, advice) {
      methodNames = [].concat(methodNames);
      for(var i=0 ; i < methodNames.length; i++){
        if (methodNames[i].indexOf('*')==-1) continue;
        var hint = methodNames.splice(i, 1)[0];
        hint = new RegExp('^' + hint.replace(/\*/g, '.*'));
        for(var prop in target) {
          if(hint.test(prop) && typeof(target[prop]) == 'function') {
            methodNames.push(prop);
          }
        }
      }
      var addAround = function (target, methodName, advice) {
        var method = target[methodName];
        target[methodName] = function() {
          return advice(
            function(args){
              return method.apply(target, args);
            },
            arguments, target, methodName);
        };
      }
      for(var i=0; i< methodNames.length; i++){
        addAround(target, methodNames[i], advice);
      }
      return this;
    },
    run: function (exe, windowSize, isExit /* 終了を待たない：false */) {
      if (windowSize == null) windowSize = WINDOW_SIZE_NOMAL;
      if (isExit == null) isExit = true;
      this.print(exe);
      return this.shell.Run(exe, windowSize, isExit);
    },
    exec: function (args) {
      return this.shell.Exec(args);
    },
    exit: function (returnCode) {
      this.print("Application Exit::" + returnCode);
      WScript.Quit(returnCode);
    },
    sleep: function (time) {
      if (time) {
        WScript.Sleep(time);
      } else {
        this.sleepif(function () {return false;}); // EndLess loop
      }
    },
    sleepif: function (fn, args) {
      while(true){
        if (fn(args)) return true;
        this.sleep(200);
      }
    },
    pkill: function (programName){
      var strComputer = ".";
      var name = "winmgmts:\\\\" + strComputer + "\\root\\CIMV2";
      var oWmis = GetObject(name);
      var cols = oWmis.ExecQuery("SELECT * FROM Win32_Process WHERE Caption = '"+ programName +"'");
      var list = new Enumerator(cols);
      for(;!list.atEnd(); list.moveNext()){
        var proc = list.item();
        try {
          proc.terminate();
        } catch (ignore) {
        }
      }
    },
    restartCscript: function () {
      if(this.isWScriptRunning()){
        var str = 'CMD /C CScript //Nologo "' + WScript.ScriptFullName + '"';
        for(var i = 0; i < this.arguments.length; i++) {
          var arg = this.arguments[i];
          if(arg.indexOf(" ", 0) >= 0) {
            arg = '"' + arg + '"';
          }
          str += ' ' + arg;
        }
        this.shell.Run(str, 1, false);
        WScript.Quit(0);
      }
    },
    log: function (message) {
      var textStream = this.fileSystemObject.OpenTextFile(this.logFilePath, FILE_IOMODE_FOR_APPENDING, true);
      this.print(message);
      textStream.WriteLine(this._getTimeMsg() + " " + message.replace(String.fromCharCode(8722), "-"));
      textStream.Close();
      return this;
    },
    logEvent: function (message, logLevel) {
      if (logLevel == null) logLevel = LOG_EVENT_SUCCESS;
      this.shell.LogEvent(logLevel, WScript.ScriptFullName + "::" + message);
      return this; // method chain
    },
    _getTimeMsg: function () {
      var date = new Date();
      var time = date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate()
                 + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + ":" + date.getMilliseconds();
      return time;
    },
    print: function (message) {
      var p = function (msg) {
        WScript.Echo(msg);
        //WScript.StdOut.WriteLine();
      };
      if (message != null && typeof(message) == 'object') {
        for(var i in message) {
          if(this.isFunction(message[i])) {
            p(this._getTimeMsg() + " " + "[" + i + "]->[function]");
          } else {
            p(this._getTimeMsg() + " " + "[" + i + "]->[" + message[i] + "]");
          }
        }
        return;
      }
      p(this._getTimeMsg() + " " +message);
      return this;
    },
    alert: function (msg, title, displayTime) {
      return this.shell.Popup(msg, displayTime, title, 64);
    },
    popup: function (msg, title, displayTime) {
      var result = this.shell.Popup(msg, displayTime, title, 4); // [はい］［いいえ］を表示
      if (result == 6) {
        return true; // [はい]
      }
      return false; // 7:［いいえ］or -1: 制限時間
    },
    confirmOkNGCancel: function (msg, title) {
      var result = this.shell.Popup(msg, 5, title, 3); //［はい］［いいえ］［キャンセル］を表示
      //  6|［はい］が押された
      //  7|［いいえ］が押された
      //  2|［キャンセル］が押された
      // -1| 制限時間が経過した
      return result;
    },
    pause: function () {
      this.shell.Popup("続行するにはキーを押してください . . .");
      return this; // method chain
    },
    inputBox: function (msg, title, defaultValue, isNotNull) {
      if (isNotNull == null) isNotNull = false;

      if (this._inputBoxFn == null) {
        function createVbsFunction() {
          var sctl = new ActiveXObject("ScriptControl");
          sctl.Language = "VBScript";
          sctl.AddCode('Function vbInputBox(msg, title, defaultValue):'
                         + 'vbInputBox=InputBox(unescape(escape(msg)), unescape(escape(title)), unescape(escape(defaultValue))):'
                      +'End Function');
          return function(msg) {
            return sctl.CodeObject.vbInputBox(msg, title, defaultValue);
          };
        }
        this._inputBoxFn = createVbsFunction();
      }

      var v;
      while(true){
        v = this._inputBoxFn(msg);
        if (!isNotNull) break;
        if (v != null && v.length != null && v.length != 0) break;
      }
      return v;
    },
    clearInterval: function(id){
        return window.clearInterval( id );
    },
    clearTimeout: function(id){
        return window.clearTimeout(id);
    },
    setInterval: function(code, interval){
        return window.setInterval(code, interval);
    },
    setTimeout: function(code, delay){
        return window.setTimeout(code, delay);
    },
    isWScriptRunning: function () {
        return /wscript\.exe$/i.test(WScript.FullName);
    },
    readLine: function () {
      if (this.isWScriptRunning()) {
        return this.inputBox();
      }
      return WScript.StdIn.ReadLine();
    },
    timer: function (delay, repeatCount, fn) {
        var runCount = 0;
        var timerId = $.setInterval(function (){
            runCount++;
            fn();
            if (repeatCount == runCount) {
                $.clearInterval(timerId);
            }
        }, delay);
    },
    watch: function (dir, searchName/* wildCard Or RegExp */, fn, timeMs) {
      var lastRunDate = new Date();
      var wshf = this;
      wshf.timer(timeMs || 3000, -1, function () {
        var files = wshf.find(dir, searchName, true);
        for (var i=0; i < files.length; i++) {
          var file = wshf.fileGet(files[i].Path);
          if (file.DateLastModified > lastRunDate) {
            try {
              fn(file);
            } catch(e) {
              wshf.print(e.description);
            }
            lastRunDate = new Date();
          }
        }
      });
    },
    watchr: function (dir, searchName/* wildCard Or RegExp */, fn, timeMs) {
      this.watch(dir, searchName, fn, timeMs);
      this.sleep();
    },
    // [Shell]--------------------------------------------------------------------------------
    getPID: function () {
      if (this._pid != null) return this._pid;

      var oExec = this.exec("MSHTA.EXE -");
      var Processes = GetObject("winmgmts:root\\CIMV2").ExecQuery("SELECT * FROM Win32_Process WHERE ProcessID=" + oExec.ProcessID);
      if (Processes.Count != 1) {
        oExec.Terminate();
        throw new Error();
      }
      var items = new Enumerator(Processes);
      var pid;
      for(;!items.atEnd();items.moveNext()){
       pid = items.item().ParentProcessID;
      }
      oExec.Terminate();

      this._pid = pid;
      return pid;
    },
    getComputerName: function () {
      return this.shell.ExpandEnvironmentStrings("%COMPUTERNAME%");
    },
    osShutdown: function (timeout /* タイムアウトをxx秒で指定 */) {
      if (timeout == null) timeout = 0;
      this.run("shutdown -s -t " + timeout, 0, false);
      return this;
    },
    osReboot: function (timeout /* タイムアウトをxx秒で指定 */, option /* -f(実行中のプロセスを警告なしで閉じる) */) {
      if (timeout == null) timeout = 0;
      if (option == null) option = '';
      this.run("shutdown -r -t " + timeout + " " + option, 0, false);
      return this;
    },
    sendKeys: function (key) {
      this.shell.Sendkeys(key);
      return this;
    },
    getEnv: function (name) {
      return this.shell.ExpandEnvironmentStrings("%" + name + "%");
    },
    getEventLog: function (where) {
      if (where == null) where="";
      var items = new Enumerator(GetObject("winmgmts:").InstancesOf("Win32_NTLogEvent " + where)); // WQL (WMI Query Language)
      var result = new Array();
      for(;!items.atEnd();items.moveNext()){
         result.push(items.item());
      }
      return result;
    },
    iisRestart: function (){
      this.run("iisreset", 0, true);
      this.sleep(5000);
      var oExec = this.exec("iisreset /status");
      while(oExec.Status == 0) {
        this.sleep(100);
      }
      // boot check
      var return_val = false;
      while(!oExec.StdOut.AtEndOfStream) {
        var msg = oExec.StdOut.ReadLine();
        if (msg.indexOf("World Wide Web Publishing") != -1 && msg.indexOf("( W3SVC ) の状態 : 実行中") != -1) {
          return_val = true;
        }
      }
      return return_val;
    },
    ieCacheClear: function () {
      var folder = this.shellApplication.NameSpace(ssfINTERNETCACHE);
      var ieTempFiles = folder.Items();
      for (var i = 0; i < ieTempFiles.Count; i++) {
        var item = ieTempFiles.item(i);
        var itemPath = folder.GetDetailsOf(item, 1);
        if (itemPath.indexOf('Cookie:') != 0) {
          item.InvokeVerb("delete");
          //this.p('cache delete:' + itemPath);
        }
      }
    },
    // File -----------------------------------------------------------------------------------------------------
    fileOpen: function (fileName, iomode, block) {
      if (iomode == null) iomode = FILE_IOMODE_FOR_READING;
      var textStream = this.fileSystemObject.OpenTextFile(fileName, iomode, true /* 存在しない場合新規作成するか */);
      if (!this.isFunction(block)) return textStream;
      try {
        return block(textStream);
      } catch(e) {
        throw e;
      } finally {
        textStream.Close();
      }
    },
    fileGet: function (path) {
      return this.fileSystemObject.GetFile(path);
    },
    fileCreate: function (fileName, block) {
      return this.fileOpen(fileName, FILE_IOMODE_FOR_WRITING, block); // Fileが存在する場合は一旦削除される
    },
    fileCopy: function (src, dest) {
      this.fileSystemObject.GetFile(src).Copy(dest);
      return this.fileGet(dest);
    },
    fileDelete: function (file, force) {
      if (force == null) force = false; // 読み取り専用は削除しない
      this.fileSystemObject.GetFile(file).Delete(force);
      return this;
    },
    fileMove: function (file, dest) {
      this.fileSystemObject.GetFile(file).Move(dest);
      return this.fileGet(dest);
    },
    fileExists: function (fileName) {
      return this.fileSystemObject.FileExists(fileName);
    },
    fileGetExtensionName: function (fileName) {
      return this.fileSystemObject.GetExtensionName(fileName);
    },
    fileGetAbsolutePathName: function (filename) {
      return this.fileSystemObject.GetAbsolutePathName(filename);
    },
    // Folder ------------------------------------------------------------------------------------------------
    folderGet: function (path) {
      var dir = this.shellApplication.NameSpace(path);
      if (dir != null) return dir;
      return this.shellApplication.NameSpace(this.fileSystemObject.GetFolder(path).Path);
    },
    folderCreate: function (path) {
      this.fileSystemObject.CreateFolder(path);
      return this;
    },
    folderCopy: function (source, destination) {
      return this.fileSystemObject.CopyFolder(source , destination);
    },
    folderDelete: function (path) {
      this.fileSystemObject.DeleteFolder(path);
      return this;
    },
    folderMove: function (source, destination) {
      this.fileSystemObject.GetFolder(source).Move(destination);
      return this;
    },
    folderExists: function (folderspec) {
      return this.fileSystemObject.FolderExists(folderspec);
    },
    folderGetSize: function (folderPath) {
      var items = this.find(folderPath, null, true);
      var totalSize = 0;
      for (var i = 0; i < items.length; i++) {
        totalSize += items[i].Size;
      }
      return totalSize;
    },
    folderGetParentFolderPath: function () {
      var currentPath = this.fileSystemObject.GetFolder(".").path;
      this.cd("..");
      var parentPath = this.shell.CurrentDirectory;
      this.cd(currentPath);
      return parentPath;
    },
    find: function (path, searchName/* wildCard Or RegExp */, recursive) {
      if (path == null) path = this.shell.CurrentDirectory;
      if (recursive == null) recursive = false;
      if (!this.folderExists(path) && this.fileGetExtensionName(path.toLowerCase()) != "zip") {
          return new Array();
      }
      if (searchName == null) searchName = "*";
      var reg = null;
      if (searchName.constructor == RegExp) {
        reg = searchName;
      } else {
        reg = new RegExp('^' + searchName.replace(/\*/g, '.*') + '$');
      }
      var fileItemsToArray = function(items) {
        var list = new Array();
        for (var i=0; i < items.Count; i++) {
          list.push(items.item(i));
        }
        return list;
      };

      var folderGetFiles = function(shell, items, recursive) {
        var list = new Array();
        for (var i = 0; i < items.Count; i++) {
          var item = items.item(i);
          if (recursive && item.IsFolder) {
            var _items = folderGetFiles(shell, shell.NameSpace(item.Path).Items(), recursive);
            for (var j=0; j < _items.length; j++) {
              list.push(_items[j]);
            }
            continue;
          }
          list.push(item);
        }
        return list;
      };

      var fileItems = null;
      if (!recursive) {
        fileItems = fileItemsToArray(this.folderGet(path).Items());
      } else {
        fileItems = folderGetFiles(this.shellApplication, this.folderGet(path).Items(), recursive);
      }
      var result = new Array();
      for (var i=0; i < fileItems.length; i++) {
        if (searchName.constructor != RegExp && (searchName.indexOf("*") == -1)) {
          if (fileItems[i].Name == searchName) result.push(fileItems[i]);
        } else if (reg.test(fileItems[i].Name)) {
          result.push(fileItems[i]);
        }
      }
      return result;
    },
    getwd: function () {
      return this.fileSystemObject.GetFolder(".").Path;
    },
    cd: function (path) {
      if (path == null) {
        this.shell.CurrentDirectory = this.scriptPath; // cscriptを実行したディレクトリに戻す
      } else {
        this.shell.CurrentDirectory = path;
      }
      return this; // method chain
    },
    zip: function (zipName, addFilePath) {
      // zipファイルがあったらそれに追加する。なかったら作成する
      // ファイル名にパスがなかったらカレントディレクトリで見る
      if (!this.fileExists(zipName)){
        var zipFile = this.fileSystemObject.CreateTextFile(zipName, false);
        zipFile.Write("PK\5\6\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0");
        zipFile.Close();
      }

      var zipFolder = this.shellApplication.NameSpace(this.fileGetAbsolutePathName(zipName));
      var fileCnt = zipFolder.Items().Count + 1;
      if (!this.fileExists(addFilePath)) return false;
      zipFolder.CopyHere(this.fileGetAbsolutePathName(addFilePath)); // ファイルをadd
      while(zipFolder.Items().Count != fileCnt) {
        this.sleep(200); // コピーが完了するまで待機
      }
      return this;
    },
    unzip: function (zipName, unzipDir) {
      var unzipFolder = this.shellApplication.NameSpace(unzipDir);
      var items = this.find(zipName, null, true);
      for (var i=0; i < items.length; i++) {
        unzipFolder.CopyHere(items[i]);
      }
      return this;
    },
    clipboard: function (fn){
      var Clipboard = function() {
        this._ie = new ActiveXObject('InternetExplorer.Application');
        this._ie.navigate("about:blank");
        while(this._ie.Busy) {
          WScript.Sleep(10);
        }
        this._ie.Visible = false;
        this._textarea = this._ie.document.createElement("textarea");
        this._ie.document.body.appendChild(this._textarea);
        this._textarea.focus();
        this._closed = false;
      }

      Clipboard.prototype = {
        set: function(text) {
          if (this._closed) {
            return;
          }
          this._textarea.innerText = text;
          this._ie.execWB(17 /* select all */, 0);
          this._ie.execWB(12 /* copy */, 0);
        },
        get: function() {
          if (this._closed) {
            return;
          }
          this._textarea.innerText = "";
          this._ie.execWB(13 /* paste */, 0);
          return this._textarea.innerText;
        },
        close: function() {
          this._ie.Quit();
          this._closed = true;
        }
      }

      if (!this.isFunction(fn)) {
        return new Clipboard();
      }
      var clip = null;
      try {
        clip = new Clipboard();
        fn(clip);
      } finally {
        if (clip != null) {
          clip.close();
        }
      }
    },
    getYyyyMmDd: function () {
      var date = new Date();
      var yyyy = date.getFullYear();
      var mm = date.getMonth() + 1;
      var dd = date.getDate();
      if (mm < 10) mm = "0" + mm;
      if (dd < 10) dd = "0" + dd;
      return yyyy + mm + dd;
    },
    getYyyyMmDdHh24MISS: function () {
      var date = new Date();
      var yyyy = date.getFullYear();
      var mm = date.getMonth() + 1;
      var dd = date.getDate();
      var hh = date.getHours();
      var mi = date.getMinutes();
      var ss = date.getSeconds();
      if (mm < 10) mm = "0" + mm;
      if (dd < 10) dd = "0" + dd;
      if (hh < 10) hh = "0" + hh;
      if (mi < 10) mi = "0" + mi;
      if (ss < 10) ss = "0" + ss;
      return yyyy + mm + dd + hh + mi + ss;
    },
    each: function (array, fn) {
      if(!this.isFunction(fn)) throw new TypeError();
      var eachFn = function (fn){
        var list = this;
        var len = list.length;
        var result = new Array();
        for (var i=0; i < len; i++) {
          var ret = fn.apply(list, [list[i], i]);
          if (ret != null) result.push(ret);
        }
        return result; // method chain
      }
      array.each = eachFn;
      var result = array.each(fn);
      result.each = eachFn;
      return result;
    },
    trim: function (text){
      return (text || "").replace( /^\s+|\s+$/g, "" );
    }
};
// global object
$ = new WSHF();

})();