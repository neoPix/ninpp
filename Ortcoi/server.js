var multiparty = require('multiparty')
  , http = require('http')
  , fs = require('fs')
  , jszip = require('jszip');

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
    this._curent = null;
    this._queue = new Queue();
    this._done = new Array();
    this.initialize(port);
 }
App.prototype = {
    _server: null,
    _curent: null,
    _queue: null,
    _done: null,
    initialize : function(port){
        port = port || 8080;
        var $this = this;

        this._server = http.createServer(function(request, response) {
            response.setHeader('Access-Control-Allow-Origin', '*');
            if (request.method == 'OPTIONS') {
                response.send(200);
                return;
            }
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
            response.setHeader('Content-Type', 'application/json');
            response.end(result);

            $this.manageQueue();
        });

        form.parse(request);
    },
    manageQueue: function(){
        var $this = this;
        if(this._current == null && this._queue.size() > 0){
            this._current = this._queue.dequeue();
            this.copyFile(this._current, function(){
                $this.openZip();
            }, function(message){
                $this.manageError(message);
            });
            
        }
    },
    openZip: function(){
        var $this = this;
        fs.readFile('./curent.zip', function(err, data) {
            if (err) {
                $this.manageError(err);
                return;
            }
            var zip = new jszip(data);
            $this.manageZip(zip);
        });
    },
    manageZip: function(zip){
        // Convertion audio et video
        // Génération des miniatures image
        // Préparation du HTML
        // Regroupement dans un fichier zip /done/{code}.zip
        // Passage en done -> téléchargement client

        this._current.state = 'done';
        console.log(this._current);
        this._done.push(this._current);
        this._current = null;
        this.manageQueue();
    },
    manageError: function(error){
        this._current.error = error;
        this._current.state = 'failed';
        console.log(this._current);
        this._done.push(this._current);
        this._current = null;
        this.manageQueue();
    },
    copyFile: function(element, end, error){
        var source = fs.createReadStream(element.file.path);
        var dest = fs.createWriteStream('./curent.zip');
        source.pipe(dest);
        source.on('end', end);
        source.on('error', error);
    }
};
var app = new App(8080);