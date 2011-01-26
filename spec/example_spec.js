(function(){

    eval($.load(['Oo4o']));

    with(JSpec('example_spec.js')){

        before_all(function(){
        });

        after_all(function () {
        });

        it ('test1', function(){
            var hoge = "foo";
            hoge.should_be("foo");
        });
    }

})();