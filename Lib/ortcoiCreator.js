var Ninpp = Ninpp || {};
Ninpp.ortcoiCreator = function(){this._init()};
Ninpp.ortcoiCreator.prototype = {
	_init: function(){
		var $this = this;
		this._step1 = document.getElementById('step1');

		this._fileReader = document.getElementById('readFile');

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
		if(typeof this._zip.files['record.json'] != 'undefined'
			&& typeof this._zip.files['record.ogg'] != 'undefined'
			&& typeof this._zip.files['slides.html'] != 'undefined'){
			this._step1.style.display = 'none';
			this._convertVideo();
		}
	},
	_getWorker: function(){
		this._worker = new Worker('../Lib/worker.js');
	},
	_convertVideo: function(){
		var $this = this;
		if(typeof this._zip.files['record.webm'] != 'undefined'){
			var audio = this._zip.files['record.ogg'].asUint8Array(),
				video = this._zip.files['record.webm'].asUint8Array();
			var worker = this._getWorker();
			this._worker.onmessage = function(event) {
				var message = event.data;
				if (message.type == "ready") {
					$this._startConvert(video);
				} else if (message.type == "stdout") {
					console.log(message.data);
				} else if (message.type == "stderr") {
					console.log('ERROR : ' + message.data);
				} else if (message.type == "start") {
					
				} else if (message.type == "done") {
					var result = message.data[0];
					$this._preparePackage(audio, result.data);
				}
			};
		}
		else{
			this._preparePackage(audio, null);
		}
	},
	_startConvert: function(video){
		this._worker.postMessage({
			type: 'command',
			arguments: [
				'-i', 'video.webm',
				'-c:v', 'mpeg4',
				'-b:v', '500k',
				'-strict', 'experimental',
				'output.mp4'
			],
			files: [
				{
					data: video,
					name: 'video.webm'
				}
			]
		});
	},
	_getHtml: function(audio, video){
		var html = '<html><head><link href="Style/reset.css" rel="stylesheet" /><link href="Style/ninpp.css" rel="stylesheet" /></head><body>';
		html += this._zip.file('slides.html').asText();
		html += '<div id="player"><audio src="audio.ogg" id="audio"/>';
		if(video)
			html += '<video src="video.mp4" id="video">';
		html += '</div><script>var history = '+this._zip.file('record.json').asText()+';</script>';
		html += '<script src="Lib/x-tag.js"></script><script src="Lib/ninpp.js"></script><script src="Lib/ortcoi.js"></script></body></html>';
		return html;
	},
	_preparePackage: function(audio, video){
		zip = new JSZip();
		zip.file("index.html", this._getHtml(audio, video));
		zip.file("audio.ogg", audio);
		if(video) zip.file("video.mp4", video);
		saveAs(zip.generate({type:"blob"}), "presentation.zip");
	}
};

var ninppOrtcoiCreator = new Ninpp.ortcoiCreator();
