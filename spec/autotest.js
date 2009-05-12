// Usage: CScript.exe autotest.js
// Load Windows Script Host Framework
var LIB_DIR = "C:/WSHF/lib";
var f = WScript.CreateObject("Scripting.FileSystemObject").OpenTextFile(LIB_DIR + "/WSHF.js");eval(f.ReadAll());f.Close();f=null;
eval($.cd(LIB_DIR).load(["jspec.js"]));

var jspecReport = function(suites) {
  for (var i = 0; i < suites.length; i++) {
    var suite = suites[i];
	  $.print(suite.description + ': ');
	  for (var j = 0; j < suite.failures.length; j++) {
	    var fail = suite.failures[j];
	    $.print('  ' + fail.spec.description + ': ' + fail.message);
	  }
  }
  var examplesCnt = 0;
  var passTotal = 0;
  var failureTotal = 0;
  for (var i = 0; i < suites.length; i++) {
    var suite = suites[i];
	  passTotal += suite.passes.length;
	  examplesCnt += suite.specs.length;
	  failureTotal += suite.failures.length;
  }
  function getSpecLength(target){
    var spec = {};
    spec.length = 0;
    for (var i = 0, len = target.length; i < len; i++) {
      var desc = target[i].spec.description;
      if (spec[desc] == null) {
        spec[desc] = 1;
        spec.length++;
      }
    }
    return spec.length;
  }
  var pendingTotal = 0;
  for (var i = 0; i < suites.length; i++) {
    var suite = suites[0];
    var passCnt = getSpecLength(suite.passes)
    var failuresCnt = getSpecLength(suite.failures)
    pendingTotal += suite.specs.length - (passCnt + failuresCnt);
  }
  $.print('');
  $.print(examplesCnt + ' examples, ' + passTotal + ' passes, ' + failureTotal + ' failures, ' + pendingTotal + ' pending');
};
var StopWatch = function(){};
StopWatch.prototype = {
  start: function () {
    this.startDate = new Date();
    return this;
  },
  stop: function () {
    this.endDate = new Date();
    this.time = (new Date() - this.startDate)%1000;
    return this;
  },
  getTime: function (){
    return this.time;
  }
};

var SPEC_DIR = $.cd().getwd();
var lastRunDate = new Date();
var runCnt = 1;
while (true){
  var files = $.find(SPEC_DIR, "*_spec.js");
  for (var i=0; i < files.length; i++) {
    if ($.fileGet(files[i].Path).DateLastModified > lastRunDate) {
      eval($.load([files[i].Path]));
      try {
        $.print('[' + runCnt + '] ******************************************');
        runCnt++;
        var watch = new StopWatch().start();
        var result = JSpecManager.run(jspecReport);
        $.print('Finished in ' + watch.stop().getTime() + ' seconds');
      } catch(e) {
        $.print(e.description);
      }
      JSpecManager.suites = [];
      lastRunDate = new Date();
    }
  }
  $.sleep(3000);
}
