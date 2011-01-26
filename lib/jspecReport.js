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