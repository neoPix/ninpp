var multiparty = require('multiparty')
  , http = require('http')
  , fs = require('fs')
  , jszip = require('jszip')
  , spawn = require('child_process').spawn
  , exec = require('child_process').exec;

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

var FFmpegEncode = function(params, done, fail){ 
    var process = spawn('./bin/ffmpeg', params);

    process.stdout.on('data', function (data) {});

    process.stderr.on('data', function (data) {});

    process.on('close', function (code) {
        if(code == 0)
           done();
        else
            fail();
    });
};

var App = function(port){ 
    this._server = null;
    this._current = null;
    this._type = null;
    this._queue = new Queue();
    this._done = new Array();
    this.initialize(port);
 }
App.prototype = {
    _server: null,
    _current: null,
    _queue: null,
    _done: null,
    _formats: null,
    _type: null,
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
        exec('rm ./curent.zip && rm -R ./curent', function(){
            if($this._current == null && $this._queue.size() > 0){
                $this._current = $this._queue.dequeue();
                $this.copyFile($this._current, function(){
                    $this.openZip();
                }, function(message){
                    $this.manageError(message);
                });
            }
        });
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
        var $this = this;
        exec('mkdir -p ./done/'+$this._current.token+' && unzip curent.zip -d curent', function(error){
            $this.convert(zip);
        });
    },
    convert: function(zip){
        var $this = this;
        this._current.state = 'convertion';
        if(zip.file('audio.ogg') && zip.file('video.mp4')){
            FFmpegEncode(['-i', './curent/video.mp4', '-itsoffset', '-1.45', '-i', './curent/audio.ogg', '-c:v', 'h264', '-c:a', 'mp3', '-strict', 'experimental', './done/'+$this._current.token+'/video.mp4'], function(){
                FFmpegEncode(['-i', './curent/video.mp4', '-itsoffset', '-1.45', '-i', './curent/audio.ogg', '-c:v', 'theora', '-c:a', 'vorbis', '-strict', 'experimental', './done/'+$this._current.token+'/video.ogg'], function(){
                    FFmpegEncode(['-i', './curent/video.mp4', '-itsoffset', '-1.45', '-i', './curent/audio.ogg', '-c:v', 'libvpx', '-c:a', 'vorbis', '-strict', 'experimental', './done/'+$this._current.token+'/video.webm'], function(){
                        $this._type = 'video';
                        $this.createThumbnail(zip);
                    }, function(){
                        $this.manageError('webm conversion error.');
                    });
                }, function(){
                    $this.manageError('ogg conversion error.');
                });
            }, function(){
                $this.manageError('h264 conversion error.');
            });
        }
        else if(zip.file('audio.ogg')==null && zip.file('video.mp4')){
            FFmpegEncode(['-i', './curent/video.mp4', '-c:v', 'h264', '-c:a', 'mp3', '-strict', 'experimental', './done/'+$this._current.token+'/video.mp4'], function(){
                FFmpegEncode(['-i', './curent/video.mp4', '-c:v', 'theora', '-c:a', 'copy', '-strict', 'experimental', './done/'+$this._current.token+'/video.ogg'], function(){
                    FFmpegEncode(['-i', './curent/video.mp4', '-c:v', 'libvpx', '-c:a', 'copy', '-strict', 'experimental', './done/'+$this._current.token+'/video.webm'], function(){
                        $this._type = 'video';
                        $this.createThumbnail(zip);
                    }, function(){
                        $this.manageError('webm conversion error.');
                    });
                }, function(){
                    $this.manageError('ogg conversion error.');
                });
            }, function(){
                $this.manageError('h264 conversion error.');
            });
        }
        else if(zip.file('audio.ogg') && zip.file('video.mp4')==null){
            FFmpegEncode(['-i', './curent/audio.ogg', '-c:a', 'mp3', '-strict', 'experimental', './done/'+$this._current.token+'/audio.mp3'], function(){
                FFmpegEncode(['-i', './curent/audio.ogg', '-c:a', 'vorbis', '-strict', 'experimental', './done/'+$this._current.token+'/audio.ogg'], function(){
                    $this._type = 'audio';
                    $this.createHTML(zip);
                }, function(){
                    $this.manageError('vorbis conversion error.');
                });
            }, function(){
                $this.manageError('mp3 conversion error.');
            });
        }
    },
    createThumbnail: function(zip){
        this._current.state = 'thumbnail';
        var $this = this;
        FFmpegEncode(['-i', './curent/video.mp4', '-f', 'image2', '-vf', 'fps=fps=12/60', './done/'+this._current.token+'/thumb_%03d.jpg'], function(){
            $this.createHTML(zip);
        }, function(){
            $this.manageError('Thumbnails generation error.');
        });
    },
    createHTML: function(zip){
        var $this = this;
        this._current.state = 'html';
        fs.readFile('./template.html', 'utf8', function (err,data) {
            if (err) {
                return $this.manageError(err);
            }
            data = data
                .replace('%media%', $this.getMediaHtml())
                .replace('%slides%', zip.file('slides.html').asText())
                .replace('%record%', zip.file('record.json').asText());
            fs.writeFile('./done/'+$this._current.token+'/index.html', data, function(err) {
                if (err) {
                    return $this.manageError(err);
                }
                exec('zip -r -9 ./done/'+$this._current.token+'.zip ./done/'+$this._current.token+'/', function(){
                    exec('rm -r ./done/'+$this._current.token+'/', function(){
                        $this.creationDone();
                    });
                });
            }); 

        });
        // ajout des libs js
        // ajout du css
    },
    getMediaHtml: function(){
        switch(this._type){
            case 'audio':
                return '<audio preload="auto"><source src="audio.ogg" type="audio/ogg"><source src="audio.mp3" type="audio/mpeg"></audio>';
            case 'video':
                return '<video preload="auto"><source src="video.webm" type="video/webm"><source src="video.mp4" type="video/mp4"><source src="video.ogg" type="video/ogg"></video>';
            default:
                return 'unknown format';
        }
    },
    creationDone: function(){
        this._current.state = 'done';
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