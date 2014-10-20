var Ninpp = function(){
	this.initialize();
};
Ninpp.prototype = {
	/// Initialisation de la présentation
	initialize: function(){
		this.body = document.getElementsByTagName('body')[0];
		this.history = [{when : +new Date(), what: 'START', page: window.location.hash.replace('#', '')}];
		this.slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
		this.progress = Array.prototype.slice.call(document.querySelectorAll("progress"));
		this.pageDisplay = Array.prototype.slice.call(document.querySelectorAll(".pagging"));
		this.curent = -1;
		this.inSlideCurrent = -1;		

		this._bindEvents();
		this._prepareSlides();
		if(window.location.hash)this.setSlideById(window.location.hash.replace('#', ''));
		else this.setSlide(0);
	},
	/// Aller à la slide suivante
	setNextSlide: function(){
		this.inSlideCurrent++;
		if(this.inSlideCurrent >= this.inSlideDelayed.length){
			if(this.setSlide(this.curent + 1)){
				this.history.push({when : +new Date(), what: 'GOTONEXTSLIDE', page: window.location.hash.replace('#', '')});
				this.inSlideDelayed.forEach(function(delayed){
					delayed.classList.remove('on');
				});
				this.inSlideCurrent = -1;
			}
			else
				this.inSlideCurrent--;
		}
		else{
			this.inSlideDelayed[this.inSlideCurrent].classList.add('on');
			this.history.push({when : +new Date(), what: 'GOTONEXTANIMATION', page: window.location.hash.replace('#', '')});
		}
		
	},
	/// Revenir à la slide précédente
	setPreviousSlide: function(){
		if(this.inSlideCurrent < 0){
			if(this.setSlide(this.curent - 1)){
				this.history.push({when : +new Date(), what: 'GOTOPREVIOUSSLIDE', page: window.location.hash.replace('#', '')});
				this.inSlideDelayed.forEach(function(delayed){
					delayed.classList.add('on');
				});
				this.inSlideCurrent = this.inSlideDelayed.length;
			}
			else
				this.inSlideCurrent++;
		}
		else{
			this.inSlideDelayed[this.inSlideCurrent].classList.remove('on');
			this.history.push({when : +new Date(), what: 'GOTOPREVIOUSANIMATION', page: window.location.hash.replace('#', '')});
		}
		this.inSlideCurrent--;
	},
	/// Afficher la slide ayant le numéro passé en paramètre
	setSlide: function(slideNumber){
		if(slideNumber >= 0 && slideNumber <= this.slides.length -1){
			this.slides.forEach(function(slide, i){
				slide.style.display = 'none';
			});
			this.slides[slideNumber].style.display='block';
			this._setTitle(this.slides[slideNumber]);
			this.inSlideDelayed = Array.prototype.slice.call(this.slides[slideNumber].getElementsByClassName('delayed'));
			this.curent = slideNumber;
			window.location.hash = '#'+this.slides[slideNumber].getAttribute('id');
			this._setSlideHeight();
			this._updateProgress();
			return true;
		}
		return false;
	},
	/// Afficher la slide ayant l'identifiant passé en paramètre
	setSlideById: function(id){
		var $this = this;
		this.slides.forEach(function(slide, i){ 
			if(slide.getAttribute('id') == id)
				$this.setSlide(i);
		});
	},
	/// Passer la présentation en plein écran
	setFullScreen: function(){
		if (this.body.requestFullscreen) {
			this.body.requestFullscreen();
		} else if (this.body.msRequestFullscreen) {
			this.body.msRequestFullscreen();
		} else if (this.body.mozRequestFullScreen) {
			this.body.mozRequestFullScreen();
		} else if (this.body.webkitRequestFullscreen) {
			this.body.webkitRequestFullscreen();
		}
	},
	/// Initialisation et réparation des slides
	_prepareSlides: function(){
		this.slides.forEach(function(slide, i){
			if(!slide.getAttribute('id'))
				slide.setAttribute('id', 'slide'+(i+1));
		});
	},
	/// Définition du titre de la page en fonction de la slide
	_setTitle: function(slide){
		if(slide.getAttribute('data-title')){
			document.title = slide.getAttribute('data-title');	
		}
		else if(slide.getElementsByTagName('h1').length > 0){
			document.title = slide.getElementsByTagName('h1')[0].innerHTML;
		}
		else if(slide.getElementsByTagName('h2').length > 0){
			document.title = slide.getElementsByTagName('h2')[0].innerHTML;
		}
	},
	/// Mise à jour des informations de progressions
	/// Bare de progression de type overal s'il y en a
	/// Informations de pagination
	_updateProgress: function(){
		var overalProgress = this.curent / (this.slides.length - 1), $this = this;
		this.progress.filter(function(progress){return progress.getAttribute('data-type') == 'overal';})
			.forEach(function(progress){
				progress.value = overalProgress;
			});
		this.pageDisplay.forEach(function(pagging){
			switch(pagging.getAttribute('data-format')){
				case 'progress':
					pagging.innerHTML = ($this.curent + 1) + '/' + $this.slides.length;
					break;
				case 'simple':
				default:
					pagging.innerHTML = $this.curent + 1;
					break;
			}
		});
	},
	/// Attachement des événements
	_bindEvents: function(){
		var $this = this;
		window.addEventListener('resize', function(event){$this._setSlideHeight();});
		window.addEventListener("keydown", function(event) {$this._manageKeyPress(event);});
		var duration = parseFloat(this.body.getAttribute('data-duration')) * 60, time = 0, progress = this.progress.filter(function(progress){return progress.getAttribute('data-type') == 'time';});
		if(progress.length > 0)
			window.setInterval(function(){
				time ++;
				progress.forEach(function(progress){
					progress.value = time / duration;			
				});
			}, 1000);
		document.querySelector('.recorder').addEventListener('click', function(){$this._startStopRecording(this);});
	},
	/// Gestion de l'event keyDown
	_manageKeyPress: function(event){
		switch(event.keyCode){
			case 34:
			case 40:
			case 39:
				event.preventDefault();
				this.setNextSlide();
				break;
			case 33:
			case 37:
			case 38:
				event.preventDefault();
				this.setPreviousSlide();
				break;
			case 66:
				event.preventDefault();
				this.setFullScreen();
				break;
		}
	},
	/// Gestion des enregistrements Audio et Vidéo
	_startStopRecording: function(button){
		$this = this;
		if(button.classList.contains('recording')){
			button.classList.remove('recording');
			this.ninppRecorder.stopRecording();
		}
		else{
			this.history = [{when : +new Date(), what: 'START', page: window.location.hash.replace('#', '')}];
			if(!this.ninppRecorder){
				this.ninppRecorder = new NinppRecorder();
				this.recordFail = function(){
					button.classList.remove('recording');
				};
				this.ninppRecorder.manageBlob = function(blobAudio, blobVideo){
					var zip = new JSZip();
					zip.file("History.json", JSON.stringify($this.history));

					var arrayBuffer, audioFileReader = new FileReader();
					audioFileReader.onload = function() {
						arrayBuffer = this.result;
						zip.file("Record.ogg", arrayBuffer);
						if(blobVideo){
							var videoFileReader = new FileReader();
							videoFileReader.onload = function() {
								arrayBuffer = this.result;
								zip.file("Record.webm", arrayBuffer);
								var content = zip.generate({type:"blob"});
								saveAs(content, "presentation.zip");
							};
							videoFileReader.readAsArrayBuffer(blobVideo);
						}
						else{
							var content = zip.generate({type:"blob"});
							saveAs(content, "presentation.zip");
						}
					};
					audioFileReader.readAsArrayBuffer(blobAudio);


					var arrayBuffer;
					var videoFileReader = new FileReader();
					videoFileReader.onload = function() {
						arrayBuffer = this.result;
						zip.file("Record.webm", arrayBuffer);
						var audioFileReader = new FileReader();
						audioFileReader.onload = function() {
							arrayBuffer = this.result;
							zip.file("Record.ogg", arrayBuffer);
							var content = zip.generate({type:"blob"});
							saveAs(content, "presentation.zip");
						};
						audioFileReader.readAsArrayBuffer(blobAudio);
					};
					videoFileReader.readAsArrayBuffer(blobVideo);
				};
			}
			this.ninppRecorder.start();
			button.classList.add('recording');
		}
	},
	/// Mettre à jour la hauteur des slides
	_setSlideHeight: function(){
		var height = window.innerHeight;
		this.slides.forEach(function(slide, i){
			slide.style.height = 'auto';
			slide.style.fontSize = 'inherit';
			var style = slide.currentStyle || window.getComputedStyle(slide);
			var marginTop = parseFloat(style.marginTop.replace('px', '')),
			    marginBottom = parseFloat(style.marginBottom.replace('px', ''))
			    paddingTop = parseFloat(style.paddingTop.replace('px', '')),
			    paddingBottom = parseFloat(style.paddingBottom.replace('px', ''));
	
			var slideHeight = (height - (marginBottom + marginTop + paddingTop + paddingBottom)), defaultFontSize = parseFloat(style.fontSize.replace('px', '')), fontSize = (defaultFontSize * (slideHeight / parseFloat(style.height.replace('px', ''))));
			slide.style.fontSize =  Math.min(fontSize, defaultFontSize) + 'px';
			slide.style.height = slideHeight + 'px';
		});
	},
};

var NinppRecorder = function(){
	navigator.getUserMedia  = navigator.getUserMedia || 
                         navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia || 
                           navigator.msGetUserMedia;
};
NinppRecorder.prototype = {
	/// Préparation et démarage de l'enregistrement Video et Audio
	start: function(){
		var $this = this;
		this.stream = {};
		navigator.getUserMedia({audio: true, video: false}, function(streamaudio) {
			$this.stream.audioStream = streamaudio;
			navigator.getUserMedia({audio: false, video: true}, function(streamvideo) {
				$this.stream.videoStream = streamvideo;
				$this.startRecording();
			}, function(e){
				console.log('No video device');
				$this.startRecording();
			});
		}, function(e){
			console.error('No audio device');
			$this.recordFail(e);
		});
	},
	/// Démarage de l'enregistrement Video et Audio
	startRecording: function(){
		var $this=this;
		this.recorder = {};
		if(typeof this.stream.audioStream != 'undefined') this.recorder.audioStreamRecorder = RecordRTC(this.stream.audioStream);
		if(typeof this.stream.videoStream != 'undefined') this.recorder.videoStreamRecorder = RecordRTC(this.stream.videoStream);
		
		if(typeof this.recorder.audioStreamRecorder != 'undefined') this.recorder.audioStreamRecorder.startRecording();
		if(typeof this.recorder.videoStreamRecorder != 'undefined') this.recorder.videoStreamRecorder.startRecording();
	},
	/// Démarage de l'enregistrement Video et Audio
	stopRecording: function(){
		var $this = this;
		if(typeof this.recorder.audioStreamRecorder != 'undefined' && typeof this.recorder.videoStreamRecorder != 'undefined'){
			this.recorder.videoStreamRecorder.stopRecording(function () {
				$this.recorder.audioStreamRecorder.stopRecording(function () {
					$this.manageBlob($this.recorder.audioStreamRecorder.getBlob(), $this.recorder.videoStreamRecorder.getBlob());
				});
			
		    	});
		}
		else if(typeof this.recorder.audioStreamRecorder != 'undefined'){
			$this.recorder.audioStreamRecorder.stopRecording(function () {
				$this.manageBlob($this.recorder.audioStreamRecorder.getBlob(), null);
			});
		}
	},
	/// Callback de fin d'enregistrement
	manageBlob: function(blobAudio, blobVideo){},
	/// callback en cas d'echec d'enregistrement
	recordFail: function(e){}
};

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */
var saveAs=saveAs||"undefined"!==typeof navigator&&navigator.msSaveOrOpenBlob&&navigator.msSaveOrOpenBlob.bind(navigator)||function(a){"use strict";if("undefined"===typeof navigator||!/MSIE [1-9]\./.test(navigator.userAgent)){var k=a.document,n=k.createElementNS("http://www.w3.org/1999/xhtml","a"),w="download"in n,x=function(c){var e=k.createEvent("MouseEvents");e.initMouseEvent("click",!0,!1,a,0,0,0,0,0,!1,!1,!1,!1,0,null);c.dispatchEvent(e)},q=a.webkitRequestFileSystem,u=a.requestFileSystem||q||a.mozRequestFileSystem,
y=function(c){(a.setImmediate||a.setTimeout)(function(){throw c;},0)},r=0,s=function(c){var e=function(){"string"===typeof c?(a.URL||a.webkitURL||a).revokeObjectURL(c):c.remove()};a.chrome?e():setTimeout(e,10)},t=function(c,a,d){a=[].concat(a);for(var b=a.length;b--;){var l=c["on"+a[b]];if("function"===typeof l)try{l.call(c,d||c)}catch(f){y(f)}}},m=function(c,e){var d=this,b=c.type,l=!1,f,p,k=function(){t(d,["writestart","progress","write","writeend"])},g=function(){if(l||!f)f=(a.URL||a.webkitURL||
a).createObjectURL(c);p?p.location.href=f:void 0==a.open(f,"_blank")&&"undefined"!==typeof safari&&(a.location.href=f);d.readyState=d.DONE;k();s(f)},h=function(a){return function(){if(d.readyState!==d.DONE)return a.apply(this,arguments)}},m={create:!0,exclusive:!1},v;d.readyState=d.INIT;e||(e="download");if(w)f=(a.URL||a.webkitURL||a).createObjectURL(c),n.href=f,n.download=e,x(n),d.readyState=d.DONE,k(),s(f);else{a.chrome&&b&&"application/octet-stream"!==b&&(v=c.slice||c.webkitSlice,c=v.call(c,0,
c.size,"application/octet-stream"),l=!0);q&&"download"!==e&&(e+=".download");if("application/octet-stream"===b||q)p=a;u?(r+=c.size,u(a.TEMPORARY,r,h(function(a){a.root.getDirectory("saved",m,h(function(a){var b=function(){a.getFile(e,m,h(function(a){a.createWriter(h(function(b){b.onwriteend=function(b){p.location.href=a.toURL();d.readyState=d.DONE;t(d,"writeend",b);s(a)};b.onerror=function(){var a=b.error;a.code!==a.ABORT_ERR&&g()};["writestart","progress","write","abort"].forEach(function(a){b["on"+
a]=d["on"+a]});b.write(c);d.abort=function(){b.abort();d.readyState=d.DONE};d.readyState=d.WRITING}),g)}),g)};a.getFile(e,{create:!1},h(function(a){a.remove();b()}),h(function(a){a.code===a.NOT_FOUND_ERR?b():g()}))}),g)}),g)):g()}},b=m.prototype;b.abort=function(){this.readyState=this.DONE;t(this,"abort")};b.readyState=b.INIT=0;b.WRITING=1;b.DONE=2;b.error=b.onwritestart=b.onprogress=b.onwrite=b.onabort=b.onerror=b.onwriteend=null;return function(a,b){return new m(a,b)}}}("undefined"!==typeof self&&
self||"undefined"!==typeof window&&window||this.content);"undefined"!==typeof module&&null!==module?module.exports=saveAs:"undefined"!==typeof define&&null!==define&&null!=define.amd&&define([],function(){return saveAs});

var ninpp = new Ninpp();
