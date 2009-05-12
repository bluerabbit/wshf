(function(){
with (JSpec('WSHF.js')) {
  before_each (function(){});

  it('alias()', function (){
    $.alias({isfn:$.isFunction});
    $.isfn(function(){return;}).should_be(true);
  });
  
  it('extend() Class Extend 1', function (){
    $.extend(Array.prototype, {
      test: function (){
        return true;
      }
    });
    new Array().test().should_be(true);
  });
  
  it('extend() Class Extend 2', function (){
    var Human = function(name) {
       this.name = name;
    };
    Human.prototype = {
       getName: function() {
          return this.name;
       }
    };
    var Programmer = function (name, language){
      this.name = name;
      this.language = language;
    };
    Programmer.prototype = {
       getLanguage: function() {
          return this.language;
       }
    }
    $.extend(Programmer.prototype, Human.prototype);
    var bob = new Programmer('Bob', 'javascript');
    bob.getName().should_equal('Bob');
    bob.getLanguage().should_equal('javascript');
  });
  
  it('extend() arguments set default value', function (){
    function getArgsDefault(opts) {
       opts = $.extend({
          p1: 'A',
          p2: 'B'
       }, opts || {});
       return opts.p1 + opts.p2;
    }
    getArgsDefault().should_equal('AB');
    getArgsDefault({ p1: 'AA' }).should_equal('AAB');
    getArgsDefault({ p2: 'BB' }).should_equal('ABB');
    getArgsDefault({ p1: '1', p2: '2' }).should_equal('12');
  });
  
  it('isFunction()', function (){
    $.isFunction(function (){return true}).should_be(true);
    $.isFunction([]).should_be(false);
    $.isFunction(null).should_be(false);
    $.isFunction("").should_be(false);
  });

  it('load()', function (){
    $.cd().cd('..').cd('lib');
    $.load("WSHF").length.should_not_be_empty();
    $.load("empty.js").length.should_be_empty();
    $.load("WSHF.js").length.should_not_be_empty();
    $.load(["WSHF", "WSHF"]).length.should_not_be_empty();
    $.load(["WSHF", "WSHF.js"]).length.should_not_be_empty();
    $.load("http://jqueryjs.googlecode.com/files/jquery-1.3.2.min.js").length.should_not_be_empty();
    $.cd();
  });
  
  it('httpLoad()', function (){
    $.httpLoad("http://jqueryjs.googlecode.com/files/jquery-1.3.2.min.js").length.should_not_be_empty();
  });

  it('aop()', function (){
    var o = new Object();
    o.test = function (arg) {
      return true;
    };
    o.test("param1").should_equal(true);
    $.aop(o, "test", function (proceed, args, target, methodName) {
      var orgResult = proceed(args);
      return false;
    });
    o.test("param1").should_equal(false);
  });
  
  it('run()', function (){
    //$.run("cmd", 2, false);
    //$.run("cmd");
  });
  
  it('exec()', function (){
    var o = $.exec("cmd ");
    o.StdIn.WriteLine("dir");
    o.StdIn.WriteLine("exit");
    var msg;
    while(!o.StdOut.AtEndOfStream) {
      msg += o.StdOut.ReadLine();
    }
    msg.length.should_not_be_empty();
  });
  
  it('exit()', function (){
    //$.exit(-1);
  });
  
  it('sleep()', function (){
    //$.sleep(1000);
  });
  
  it('sleepif()', function (){
    //$.sleepif(function(){
    //  return true;
    //});
  });
  
  it('restartCscript()', function (){
    //$.restartCscript();
  });
  
  it('log()', function (){
    //$.log("log");
  });
  
  it('logEvent(), getEventLog()', function (){
    var msg = $.getYyyyMmDdHh24MISS() + '_Test';
    $.logEvent(msg);
    var eventLogs = $.getEventLog("Where SourceName = 'WSH' And TimeGenerated > '" + $.getYyyyMmDd() + "'");
    for (var i =0; i < eventLogs.length; i++) {
      var e = eventLogs[i];
      var e_msg =
          " ログ ファイル : " + e.LogFile +
          " レコード番号 : " + e.RecordNumber +
          " タイプ : " + e.Type +
          " 生成時刻 : " + e.TimeGenerated +
          " 書込時刻 : " + e.TimeWritten +
          " ソース : " + e.SourceName +
          " カテゴリ : " + e.Category +
          " カテゴリ文字列 : " + e.CategoryString +
          " イベント : " + e.EventCode +
          " データ : " + e.Data +
          " イベントID : " + e.EventIdentifier +
          " ユーザ : " + e.User +
          " コンピュータ : " + e.ComputerName +
          " メッセージ : " + e.message;
      if (e.message.indexOf(msg) > 0) {
        //$.print(e_msg);
        e_msg.should_not_be_empty();
      }
    }
  });

  it('print()', function (){
    //$.print("print");
  });
  
  it('alert()', function (){
    //$.alert("msg", "title");
  });
  
  it('popup()', function (){
    //$.popup("msg", "title");
  });
  
  it('confirmOkNGCancel()', function (){
    //$.confirmOkNGCancel("msg", "title");
  });
  
  it('pause()', function (){
    //$.pause();
  });
  
  it('inputBox()', function (){
    //$.inputBox('msg', 'title', 'defaultValue');
    //$.inputBox('msg', 'title', 'defaultValue', true);
  });

  it('getPID()', function (){
    $.getPID().should_not_be_empty();
  });
  
  it('getComputerName()', function (){
    $.getComputerName().should_not_be_empty();
  });
  
  it('osShutdown()', function (){
    //$.osShutdown();
  });
  
  it('osReboot()', function (){
    //$.osReboot();
  });
  
  it('sendKeys()', function (){
    //$.sendKeys("a");
  });
  
  it('getEnv', function (){
    $.getEnv("OS").should_not_be_empty();
  });
  
  it('iisRestart()', function (){
    //$.iisRestart().should_be(true);
  });
  
  // File -----------------------------------------------------------------------------------------------------
  it('fileOpen()', function (){
    var TEST_FILE = "c:/fileOpen_new.txt";
    if ($.fileExists(TEST_FILE)){
      $.rm(TEST_FILE);
    }
    $.fileOpen(TEST_FILE, 2/* 新規 */, function (file){
      file.WriteLine("w");
    });
  });
  
  it('fileGet()', function (){
    $.cd().cd('..').cd('lib');
    var f = $.fileGet($.getwd() + '\\WSHF.js');
    f.Attributes.should_not_be_empty();
    (f.DateCreated + '').should_not_be_empty();
    (f.DateLastAccessed + '').should_not_be_empty();
    (f.DateLastModified + '').should_not_be_empty();
    f.Name.should_not_be_empty();
    f.Path.should_not_be_empty();
    f.ShortName.should_equal('WSHF.js');
    f.ShortPath.should_not_be_empty();
    f.Size.should_not_be_empty();
    f.Type.should_not_be_empty();
  });
  
  it('fileCreate()', function (){});
  it('fileCopy()', function (){});
  it('fileDelete()', function (){});
  it('fileMove()', function (){});
  it('fileExists()', function (){});
  it('fileGetExtensionName()', function (){});
  
  it('fileGetAbsolutePathName()', function (){
    $.cd("c:/");
    $.fileOpen("c:/test.log", 8/* 追記 */, function (file){});
    $.fileGetAbsolutePathName("test.log").should_be("C:\\test.log");
  });
  
  // Folder ------------------------------------------------------------------------------------------------
  it('folderGet()', function (){
    var folder = $.folderGet("C:/WINDOWS/system32");
    folder.Items().Count.should_not_be_empty();
  });
  
  it('folderCreate(), folderDelete(), folderExists(), folderCopy, folderMove()', function (){
    var dir = 'c:/' + new Date().getTime();
    $.folderExists(dir).should_be(false);
    $.folderCreate(dir);
    $.folderExists(dir).should_be(true);
    var destinationDir = dir + '_';
    $.folderCopy(dir, destinationDir);
    $.folderExists(destinationDir).should_be(true);
    $.folderDelete(destinationDir);
    $.folderExists(destinationDir).should_be(false);
    $.folderMove(dir, destinationDir);
    $.folderGetSize(destinationDir).should_be(0);
    $.folderDelete(destinationDir);
  });
  
  it('folderGetParentFolderPath()', function (){
    $.cd("C:/WINDOWS/system32");
    $.folderGetParentFolderPath().should_equal("C:\\WINDOWS");
  });
  
  it('find()', function (){
    $.find("C:\\WINDOWS", "*.bmp").length.should_not_be_empty();
  });
  
  it('cd() getwd()', function (){
    var path = "C:\\WINDOWS\\system32";
    $.cd(path).getwd().should_equal(path);
  });

  it('zip() unzip()', function (){
  });

  it('getYyyyMmDd()', function (){
    $.getYyyyMmDd().length.should_be(8);
  });
  
  it('getYyyyMmDdHh24MISS()', function (){
    $.getYyyyMmDdHh24MISS().length.should_be(14);
  });
  
  it('each()', function (){
    var array = ["ok", "ng", "ok", "ng"];
    $.each(array, function (item, i) {
      //$.print(item + ':' + i);  // ok:0, ng:1, ok:2, ng:3
    });
    var list = $.each(array, function (item, i) {
      if (item == 'ok') return item;
    }).each(function (item, i){
      //$.print(item + ':' + i);  // ok:0, ok:1
      return item;
    });
    list.length.should_equal(2);
  });
}

})();