var timeout = require('./timeout'),
    get = require('./get');

function recursiveConvertJavaStringsToJsStrings(o){
    for(var k in o){
        if(o.hasOwnProperty(k)){
            var v = o[k];
            if(v instanceof Packages.java.lang.String){
                o[k] = String(v);   
            }else if(typeof v === 'object'){
                recursiveConvertJavaStringsToJsStrings(v);
            }
        }
    }
}

function getDb(){
    var dbf = Packages.javax.xml.parsers.DocumentBuilderFactory.newInstance();
    dbf.setNamespaceAware(true);
    return dbf.newDocumentBuilder();
}

module.exports = {

    //used in parsing
    getDocumentFromUrl : function(url,cb){
        try {
            var doc = getDb().parse(url);
            cb(null,doc);
        }catch(e){
            cb(e);
        }
    },

    parseDocumentFromString : function(str){
        var db = getDb();
        var is = new Packages.org.xml.sax.InputSource();
        is.setCharacterStream(new Packages.java.io.StringReader(str));

        return db.parse(is);
    },

    getDocumentFromFilesystem : function(url,cb){
        this.getDocumentFromUrl(url,cb);
    },

    getResourceFromUrl : get.getResource,

    //used at runtime
    postDataToUrl : function(url,data,cb){
        //TODO
    },

    setTimeout : timeout.setTimeout,

    clearTimeout : timeout.clearTimeout,

    log : function(){
        for(var i=0; i < arguments.length; i++){
            Packages.java.lang.System.out.println(arguments[i]);
        }
    }
};