(function(){

eval($.load(["Oo4o.js"]));

with (JSpec('Oo4o.js')) {
  before_each (function(){
    this.oo4o = new Oo4o("scott", "tiger", "orcl");
  });
  it ('Select文が実行できるか', function(){
    var ret = this.oo4o.select("select 1 as test from dual");
    ret[0].test.should_equal("1");
  });

  it ('バインド変数付Update文が実行できるか', function(){
    var ret = this.oo4o.executeSQL("UPDATE ENP SET ENAME = ?  where EMPNO = ?", ['name', 7000]);
    ret.should_equal(1);
  });
}

})();