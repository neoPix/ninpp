var multiparty = require('multiparty')
  , http = require('http');

var Queue = function(){ this._queue = new Array(); };
Queue.prototype = {
    _queue: null,
    dequeue: function(){
        return this._queue.pop();
    },
    enqueue: function(item){
        return this._queue.unshift(item);
    },
    size: function(){
        return this._queue.length;
    }
};

var App = function(port){ 
    this._server = null;
    this._queue = new Queue();
    this.initialize(port);
 }
App.prototype = {
    _server: null,
    initialize : function(port){
        port = port || 8080;
        var $this = this;

        this._server = http.createServer(function(request, response) {
            switch(request.url){
                case '/Upload' :
                    $this.manageUpload(request, response);
                    break;
                case '/GetStatus' :
                    $this.manageStatus(request, response);
                    break;
            }
        }).listen(port);

        console.log('Starting ninpp server on port : '+port);
    },
    getToken: function(){
        return parseInt(Math.random() * 1000000000).toString(32);
    },
    manageStatus: function(request, response){
        response.end();
    },
    manageUpload: function(request, response){
        var $this = this, form = new multiparty.Form({autoFiles: true}), files = [];

        form.on('file', function(file, fileInfo){
            files.push(fileInfo);
        });

        form.on('close', function(){
            var element = { token: $this.getToken(), file: files[0], state: 'waiting' }
            $this._queue.enqueue(element);

            var result = JSON.stringify({token : element.token, state: element.state, position: $this._queue.size()}, null, 3);
            response.setHeader('Access-Control-Allow-Origin', '*');
            response.setHeader('Content-Type', 'application/json');
            response.end(result);
        });

        form.parse(request);
    }
};
var app = new App(8080);