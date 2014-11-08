var Ninpp = Ninpp || {};
Ninpp.ortcoiCreator = function(){this._init()};
Ninpp.ortcoiCreator.prototype = {
	_init: function(){
		var $this = this;
		this._step1 = document.getElementById('step1');

		this._fileReader = document.getElementById('readFile');
		this._compress = document.getElementById('useConpression');

		this._fileReader.addEventListener('change', function(){$this._readZip($this._fileReader.files[0]);});
	},
	_readZip: function(file){
		var $this = this, reader = new FileReader();
		reader.onload = function() {
			$this._zip = new JSZip(reader.result);
			$this._checkZip();
		};
		reader.readAsBinaryString(file);
	},
	_checkZip: function(){
		this._step1.style.display = 'none';
		if(this._compress.checked){
			this._compressVideoAndAudio();
		}
		else{
			var results = {}
			if(typeof this._zip.files['record.wav'] != 'undefined'){
				audio = this._zip.files['record.wav'].asUint8Array();
				results.audio = { name: 'output.ogg', data:audio };
			}
			if(typeof this._zip.files['record.ogg'] != 'undefined'){
				audio = this._zip.files['record.ogg'].asUint8Array();
				results.audio = { name: 'output.ogg', data:audio };
			}
			if(typeof this._zip.files['record.webm'] != 'undefined'){
				audio = this._zip.files['record.webm'].asUint8Array();
				results.video = { name: 'output.webm', data:audio };
			}
			this._convertDone(results);
		}
	},
	_getWorker: function(onReady, onDone){
		var worker = new Worker('../Lib/worker.js');
		worker.onmessage = function(event) {
			var message = event.data;
			if (message.type == "ready") {
				onReady(worker);
			} else if (message.type == "stdout") {
				console.log(message.data);
			} else if (message.type == "stderr") {
				console.log('ERROR : ' + message.data);
			} else if (message.type == "start") {
				
			} else if (message.type == "done") {
				onDone(message.data[0]);
			}
		};
		return worker;
	},

	_compressVideoAndAudio: function(){
		var $this = this;
		var audio = null, video = null, count = 0, done = 0, results = {};
		var untilDone = function(){
			if(done == count){
				$this._convertDone(results);
			}
		};
		if(typeof this._zip.files['record.wav'] != 'undefined'){
			audio = this._zip.files['record.wav'].asUint8Array();
			this._getWorker(function(w){
				count++;
				$this._startConvertAudio(audio, 'wav', w);
			}, function(data){
				results.audio = data;
				done++;
				untilDone();
			});
		}
		if(typeof this._zip.files['record.ogg'] != 'undefined'){
			audio = this._zip.files['record.ogg'].asUint8Array();
			results.audio = { name:"output.ogg", data:audio};
		}
		if(typeof this._zip.files['record.webm'] != 'undefined'){
			video = this._zip.files['record.webm'].asUint8Array();
			this._getWorker(function(w){
				count++;
				$this._startConvertVideo(video, audio == null, w);
			}, function(data){
				results.video = data;
				done++;
				untilDone();
			});
		}
	},
	_startConvertVideo: function(video, withAudio, worker){
		var args = [
			'-i', 'video.webm',
			'-c:v', 'mpeg4',
			'-b:v', '600k'
		];
		if(withAudio){
			args.push('-c:a');
			args.push('copy');
		}
		args.push('-strict');
		args.push('experimental');
		args.push('output.mp4');

		worker.postMessage({
			type: 'command',
			arguments: args,
			files: [
				{
					data: video,
					name: 'video.webm'
				}
			]
		});
	},
	_startConvertAudio: function(audio, type, worker){
		var args = [
			'-i', 'audio.ext',
		];
		if(type == "ogg"){
			args.push('-c:a');
			args.push('copy');
		}
		else if(type == "ogg"){
			args.push('-c:a');
			args.push('vorbis');
		}
		args.push('-strict');
		args.push('experimental');
		args.push('output.ogg');

		worker.postMessage({
			type: 'command',
			arguments: args,
			files: [
				{
					data: audio,
					name: 'audio.ext'
				}
			]
		});
	},
	_convertDone: function(done){
		zip = new JSZip();
		zip.file('slides.html', this._zip.file('slides.html').asText());
		zip.file('record.json', this._zip.file('record.json').asText());
		if(done.audio)
			zip.file('audio.ogg', done.audio.data);
		if(done.video)
			zip.file("video.mp4", done.video.data);
		var presentation = zip.generate({type:"blob"});
		this.sendBlob(presentation);
	},
	sendBlob: function(blob){
		var form = new FormData(),
	    request = new XMLHttpRequest();
		form.append("blob",blob);
		request.open("POST","http://localhost:8080/Upload",true);
		request.onreadystatechange = function() {
			console.log(request);
		};
		request.send(form);
	}
};

var ninppOrtcoiCreator = new Ninpp.ortcoiCreator();
