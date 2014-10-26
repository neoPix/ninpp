(function(){
	xtag.register('ninpp-slide', {
		extends: 'div',
		lifecycle:{
			created: function(){
		    		this._initialize();
			}
	  	},
		methods: {
			_initialize: function(){
				this._delayedElements = Array.prototype.slice.call(this.getElementsByClassName('delayed'));
				this._currentAnimation = 0;
			},
			hide: function(){
				this.classList.remove('on');
			},
			show: function(){
				this.classList.add('on');
			},
			next: function(slideRef){
				if(this._currentAnimation < this._delayedElements.length){
					this._delayedElements[this._currentAnimation++].classList.add('on');
					this.dispatchEvent(new Event('next'));
					return true;
				}
				return false;
			},
			previous: function(slideRef){
				if(this._currentAnimation > 0){
					this._delayedElements[--this._currentAnimation].classList.remove('on');
					this.dispatchEvent(new Event('previous'));
					return true;
				}
				return false;
			},
			setAnimationStage: function(animation){
				this._delayedElements.forEach(function(delayed, i){
					if(animation > i)
						delayed.classList.add('on');
				});
				this._currentAnimation = animation;
			},
			update: function(view){
				this.style.height = 'auto';
				this.style.fontSize = 'inherit';
				var thisStyle = view.currentStyle || window.getComputedStyle(view), height = parseFloat(thisStyle.height.replace('px', ''));
				var style = this.currentStyle || window.getComputedStyle(this);
				var marginTop = parseFloat(style.marginTop.replace('px', '')),
				    marginBottom = parseFloat(style.marginBottom.replace('px', ''))
				    paddingTop = parseFloat(style.paddingTop.replace('px', '')),
				    paddingBottom = parseFloat(style.paddingBottom.replace('px', ''));
				var slideHeight = (height - (marginTop + marginBottom + paddingTop + paddingBottom)),
					defaultFontSize = parseFloat(style.fontSize.replace('px', '')), 
					fontSize = (defaultFontSize * (slideHeight / parseFloat(style.height.replace('px', ''))));
				
				this.style.fontSize =  Math.min(fontSize, defaultFontSize) + 'px';
				this.style.height = slideHeight + 'px';
			}
		}
	});
	xtag.register('ninpp-viewer', {
		extends: 'div',
		lifecycle:{
			created: function(){
				this.initial = this.outerHTML;
				this._init();	
			},
			removed: function(){
				this._remove();
			}
	  	},
		accessors: {
			slide: {
				get: function(){
					if(this.getAttribute('slide'))
						return parseInt(this.getAttribute('slide')) - 1;
					else return 0;
				},
				set: function(value){
					this.setAttribute('slide', (value + 1));
					if(this.__pagination) this.__pagination.innerHTML = (value + 1);
					if(this.__progression) this.__progression.value = this.slide / (this._slides.length - 1);
				}
			},
			paginate: {
				attribute: { boolean: true },
				set: function(){
					this._setPagination();
				}
			},
			progress: {
				attribute: { boolean: true },
				set: function(){
					this._setProgress();
				}
			},
		},
		methods: {
			_init: function(){
				var $this = this;
				this.__onResize = function(evt){$this._slides[$this.slide].update($this);};
				window.addEventListener('resize', this.__onResize);
				
				this.__onAnimationNext = function(){$this.dispatchEvent(new CustomEvent('nextAnimation', {detail:{ noDispatch : $this._noDispatch }}));};
				this.__onAnimationPrevious = function(){$this.dispatchEvent(new CustomEvent('previousAnimation', {detail:{ noDispatch : $this._noDispatch }}));};
				
				this._slides = Array.prototype.slice.call(this.getElementsByTagName('ninpp-slide'));
				this._prepareSlides();
				this.setSlide();
			},
			_setPagination: function(){
				if(this.paginate){
					if(!this.__pagination){
						this.__pagination = document.createElement('span');
						this.__pagination.classList.add('pagination');
						this.__pagination.innerHTML = this.slide + 1;
						this.appendChild(this.__pagination); 
					}
				}
				else{
					if(this.__pagination){
						this.removeChild(this.__pagination);
						delete this.__pagination;
					}
				}
			},
			_setProgress: function(){
				if(this.progress){
					if(!this.__progression){
						this.__progression = document.createElement('progress');
						this.__progression.classList.add('globalprogression');
						this.__progression.value = this.slide / this._slides.length;
						this.appendChild(this.__progression); 
					}
				}
				else{
					if(this.__progression){
						this.removeChild(this.__progression);
						delete this.__progression;
					}
				}
			},
			_remove: function(){
				window.removeEventListener('resize', this.__onResize);
			},
			_prepareSlides: function(){
				this._slides.forEach(function(slide, i){ if(!slide.getAttribute('id')) slide.setAttribute('id', 'slide' + (i+1)); });
			},
			setSlide: function(slidePosition){
				this.slide = this.slide || 0;
				this._slides[this.slide].removeEventListener('next', this.__onAnimationNext);
				this._slides[this.slide].removeEventListener('previous', this.__onAnimationPrevious);
				
				if(slidePosition == null)slidePosition = this.slide;
				this.slide = slidePosition;

				this._slides.forEach(function(slide){ slide.hide(); });
				this._slides[this.slide].show();
				this._slides[this.slide].update(this);
				
				this._slides[this.slide].addEventListener('next', this.__onAnimationNext);
				this._slides[this.slide].addEventListener('previous', this.__onAnimationPrevious);
			},
			next: function(noDispatch){
				this._noDispatch = noDispatch || false;
				if(!this._slides[this.slide].next()){
					if(this.slide < this._slides.length - 1){
						this.setSlide(this.slide + 1);
						this.dispatchEvent(new CustomEvent('next', {detail:{ noDispatch : this._noDispatch }}));
						return true;
					}
				}
				else return true;
				return false;
			},
			previous: function(noDispatch){
				this._noDispatch = noDispatch || false;
				if(!this._slides[this.slide].previous()){
					if(this.slide > 0){
						this.setSlide(this.slide - 1);
						this.dispatchEvent(new CustomEvent('previous', {detail:{ noDispatch : this._noDispatch }}));
						return true;
					}
				}
				else return true;
				return false;
			}
		}
	});
	
	xtag.register('ninpp-player', {
		extends: 'div',
		lifecycle:{
			created: function(){
		    	this._init();
			},
			removed: function(){
				this._remove();
			}
	  	},
		accessors: {
			duration: {
				attribute: {}
			},
			controls: {
				attribute: { boolean: true },
				set: function(value){
					this._setControls();
				}
			},
			sensibility: {
				attribute: {}
			},
			currentTime: {}
		},
		methods: {
			_init: function(){
				var $this = this;
				this.viewer = this.getElementsByTagName('ninpp-viewer');
				if(!this.viewer || this.viewer.length <= 0)
					console.error('There\'s no viewer in the player!');
				this.viewer = this.viewer[0];
				if(!this.sensibility)this.sensibility=0.1;
				this._history = [{date: +new Date(), what: 'started', slide: this.viewer.slide}];
				
				this.__onKeyPress = function(event) {$this._keyPressed(event);};
				this.__onSwipeStart = function(event) {$this.__swipeStart = {x: event.clientX, y:event.clientY};};
				this.__onSwipeEnd = function(event) {
					event.preventDefault();
					$this.__swipeEnd = {x: event.clientX, y:event.clientY}; 
					$this._swiped({x: $this.__swipeEnd.x - $this.__swipeStart.x, y: $this.__swipeEnd.y - $this.__swipeStart.y});
					delete $this.__swipeStart;
					delete $this.__swipeEnd;
				};
				this.__onNextSlide = function() { $this._history.push({date: +new Date(), what: 'nextslide', slide: $this.viewer.slide}); };
				this.__onPreviousSlide = function() { $this._history.push({date: +new Date(), what: 'previousslide', slide: $this.viewer.slide}); };
				this.__onNextAnimation = function() { $this._history.push({date: +new Date(), what: 'nextanimation', slide: $this.viewer.slide}); };
				this.__onPreviousAnimation = function() { $this._history.push({date: +new Date(), what: 'previousanimation', slide: $this.viewer.slide}); };
				$this.currentTime = 0;
				window.addEventListener('keydown', this.__onKeyPress);
				this.addEventListener('mousedown', this.__onSwipeStart);
				this.addEventListener('touchstart', this.__onSwipeStart);
				this.addEventListener('mouseup', this.__onSwipeEnd);
				this.addEventListener('touchend', this.__onSwipeEnd);
				this.viewer.addEventListener('next', this.__onNextSlide);
				this.viewer.addEventListener('previous', this.__onPreviousSlide);
				this.viewer.addEventListener('nextAnimation', this.__onNextAnimation);
				this.viewer.addEventListener('previousAnimation', this.__onPreviousAnimation);
				
				this.__timer = window.setInterval(function(){ $this.currentTime+=1; }, 1000);
			},
			_remove: function(){
				window.removeEventListener('keydown', this.__onKeyPress);
				this.removeEventListener('mousedown', this.__onSwipeStart);
				this.removeEventListener('touchstart', this.__onSwipeStart);
				this.removeEventListener('mouseup', this.__onSwipeEnd);
				this.removeEventListener('touchend', this.__onSwipeEnd);
				this.viewer.removeEventListener('next', this.__onNextSlide);
				this.viewer.removeEventListener('previous', this.__onPreviousSlide);
				this.viewer.removeEventListener('nextAnimation', this.__onNextAnimation);
				this.viewer.removeEventListener('previousAnimation', this.__onPreviousAnimation);
				window.clearInterval(this.__timer);
			},
			_swiped: function(direction){
				var sensibility = {x: this.sensibility * this.offsetWidth, y:this.sensibility * this.offsetHeight};
				if(Math.abs(direction.x) <= sensibility.x && Math.abs(direction.y) <= sensibility.y) return;
				
				if(Math.abs(direction.x) > Math.abs(direction.y)){
					if(direction.x > sensibility.x)
						this.viewer.next();
					else if(direction.x < -sensibility.x)
						this.viewer.previous();
				}
				else{
					if(direction.y > sensibility.y)
						this.viewer.next();
					else if(direction.y < -sensibility.y)
						this.viewer.previous();
				}	
			},
			_setControls: function(){
				if(this.controls){
					if(!this.__controls){
						var $this = this;
						this.__controls = document.createElement('ninpp-player-controls');
						this.appendChild(this.__controls); 
						this.__controls.addEventListener('fullscreen', function(){$this.setFullScreen();});
						this.__controls.addEventListener('presentator', function(){$this.setPresentator();});
						this.__controls.addEventListener('recordReady', function(event){$this._saveRecord(event);});
						this.__controls.addEventListener('recordStarted', function(){$this._history = [{date: +new Date(), what: 'started', slide: $this.viewer.slide}];});
					}
				}
				else{
					if(this.__controls){
						this.removeChild(this.__controls);
						delete this.__controls;
					}
				}
			},
			_saveRecord: function(event){
				this._history.push({date: +new Date(), what: 'ended', slide: this.viewer.slide});
				var $this = this,zip = new JSZip();
				zip.file("record.json", JSON.stringify(this._history));
				zip.file("slides.html", this.viewer.initial);
				this.getArrayFromBlob(event.detail.audio, function(arrayBuffer){
					zip.file("record.ogg", arrayBuffer);
					if(event.detail.video){
						$this.getArrayFromBlob(event.detail.video, function(arrayBuffer){
							zip.file("record.webm", arrayBuffer);
							saveAs(zip.generate({type:"blob"}), "presentation.npf");
						});
					}
					else
						saveAs(zip.generate({type:"blob"}), "presentation.npf");
				});
			},
			getArrayFromBlob: function(blob, callback){
				var reader = new FileReader();
				reader.onload = function(){
					callback(this.result);
				};
				reader.readAsArrayBuffer(blob);
			},
			_keyPressed: function(event){
				switch(event.keyCode){
					case 34:
					case 40:
					case 39:
						event.preventDefault();
						this.viewer.next();
						break;
					case 33:
					case 37:
					case 38:
						event.preventDefault();
						this.viewer.previous();
						break;
					case 66:
					case 122:
						event.preventDefault();
						this.setFullScreen();
						break;
					case 27:
						event.preventDefault();
						this.unSetFullScreen();
						break;
				}
			},
			setPresentator: function(){
				var $this = this;
				if(!this._presentator || this._presentator.closed){
					this._presentator = window.open("Lib/presentator.html", "presentator", "menubar=no,location=no");
					this._presentator.ninppPresentatorloading = function(){
						var p = $this._presentator.document.getElementsByTagName('ninpp-player')[0];
						p.innerHTML = $this.viewer.initial;
						$this._presentator.onload= function(){
							p.controls = false;
							p.duration = $this.duration;
							p.sensibility = $this.sensibility;
							p.viewer.setSlide($this.viewer.slide);
							p.viewer._slides[p.viewer.slide].setAnimationStage($this.viewer._slides[$this.viewer.slide]._currentAnimation);

							p.viewer.style.height = '80vh';
							p.viewer.style.width = '80vw';
							p.setChild($this);
							$this.setChild(p);
						};
						$this._presentator.onclose= function(){
							$this.unsetChild();
							p.unsetChild();
						};
					};
				}
				else{
					this._presentator.close();
				}
			},
			setChild: function(player){
				this.child = player, $this = this;
				
				this.__childGoNext = function(evt){ if(!evt.detail.noDispatch)$this.child.viewer.next(true); };
				this.__childGoPrevious = function(evt){ if(!evt.detail.noDispatch)$this.child.viewer.previous(true); };				

				this.viewer.addEventListener('next', this.__childGoNext);
				this.viewer.addEventListener('previous', this.__childGoPrevious);
				this.viewer.addEventListener('nextAnimation', this.__childGoNext);
				this.viewer.addEventListener('previousAnimation', this.__childGoPrevious);
			},
			unsetChild: function(){
				this.child = null;
				this.viewer.removeEventListener('next', this.__childGoNext);
				this.viewer.removeEventListener('previous', this.__childGoPrevious);
				this.viewer.removeEventListener('nextAnimation', this.__childGoNext);
				this.viewer.removeEventListener('previousAnimation', this.__childGoPrevious);
			},
			setFullScreen: function(){
				if (this.requestFullscreen) {
					this.requestFullscreen();
				} else if (this.msRequestFullscreen) {
					this.msRequestFullscreen();
				} else if (this.mozRequestFullScreen) {
					this.mozRequestFullScreen();
				} else if (this.webkitRequestFullscreen) {
					this.webkitRequestFullscreen();
				}
			},
			unSetFullScreen: function(){
				if (this.exitFullscreen) {
					this.exitFullscreen();
				} else if (this.msCancelFullScreen) {
					this.msCancelFullScreen();
				} else if (this.mozCancelFullScreen) {
					this.mozCancelFullScreen();
				} else if (this.webkitCancelFullScreen) {
					this.webkitCancelFullScreen();
				}
			}
		}
	});
	xtag.register('ninpp-player-controls', {
		extends: 'ninpp-player-controls',
		lifecycle:{
			created: function(){
				this._init();
			},
			removed: function(){
				this._remove();
			}
	  	},
		methods: {
			_init: function(){
				var $this = this;
				this.innerHTML = '<span class="option fullScreen">↕</span><span class="option presentator"/>🐵</span><span class="option record">⚫</span>';
				this._fullScreen = this.getElementsByClassName('fullScreen')[0];
				this._presentator = this.getElementsByClassName('presentator')[0];
				this._record = this.getElementsByClassName('record')[0];
				
				this.__fullScreenEvent = function(event){ 
					$this.dispatchEvent(new Event('fullscreen'));
				};
				this.__presentatorEvent = function(event){ 
					$this.dispatchEvent(new Event('presentator'));
				};
				this.__recordEvent = function(event){ 
					$this.toogleRecord();
				};
				
				this._fullScreen.addEventListener('click', this.__fullScreenEvent);
				this._presentator.addEventListener('click', this.__presentatorEvent);
				this._record.addEventListener('click', this.__recordEvent);
			},
			_remove: function(){
				this._fullScreen.removeEventListener('click', this.__fullScreenEvent);
				this._presentator.removeEventListener('click', this.__presentatorEvent);
				this._record.removeEventListener('click', this.__recordEvent);
			},
			toogleRecord: function(){
				var $this = this;
				if(!this._record.classList.contains('on')){
					if(!this._recorder) this._recorder = new NinppRecorder();
					this._recorder.recordFail = function(){
						$this._record.classList.remove('on');
					};
					this._recorder.manageBlob = function(blobAudio, blobVideo){
						$this.dispatchEvent(new CustomEvent('recordReady', {detail: {audio: blobAudio, video: blobVideo}}));
					};
					this._recorder.recordStarted = function(){
						$this.dispatchEvent(new Event('recordStarted'));
					};
					this._recorder.start();
					$this._record.classList.add('on');
				}
				else{
					this._recorder.stopRecording();
				}
			}
		}
	});
	xtag.register('ninpp-comment', {
		extends: 'div'
	});
	xtag.register('ninpp-presentator', {
		extends: 'div',
		lifecycle:{
			created: function(){
				this._init();
			},
			removed: function(){
				this._remove();
			}
	  	},
		methods: {
			_init: function(){
				var $this = this;
				this._player = this.getElementsByTagName('ninpp-player')[0];

				this.__slideChanged = function(){ $this.setComments(); $this.setSlide(); };
				this._player.viewer.addEventListener('next', this.__slideChanged);
				this._player.viewer.addEventListener('previous', this.__slideChanged);

				this.slides = document.createElement('ul');
				this.slides.classList.add('slides');
				this.appendChild(this.slides);
				this.setSlides();

				this.setComments();
				this.setSlide();
			},
			_remove : function(){
				this._player.viewer.removeEventListener('next', this.__slideChanged);
				this._player.viewer.removeEventListener('previous', this.__slideChanged);
			},
			setSlide: function(){
				var $this = this;
				Array.prototype.slice.call(this.slides.childNodes).forEach(function(slide, i){
					if(i == $this._player.viewer.slide){
						slide.classList.add('on');
						var slideStyle = slide.currentStyle || window.getComputedStyle(slide);
						$this.slides.scrollTop = i * (slide.offsetHeight + parseFloat(slideStyle.marginTop.replace('px', ''))) ;
					}
					else
						slide.classList.remove('on');
				});
			},
			setSlides: function(){
				var $this = this;
				var playerStyle = this._player.viewer.currentStyle || window.getComputedStyle(this._player.viewer);
				this._player.viewer._slides.forEach(function(slide, i){
					var li = document.createElement('li');
					li.style.backgroundImage = playerStyle.backgroundImage;
					li.style.backgroundSize = playerStyle.backgroundSize;
					var slide = slide.cloneNode(true);
					li.appendChild(slide);
					li.removeAttribute('id');
					$this.slides.appendChild(li);
					slide.update(li);
					li.__slideClick = function(event){ 
						$this._player.viewer.setSlide(i);
						$this._player.child.viewer.setSlide(i);
						$this.setSlide();
						$this.setComments();
					};
					li.addEventListener('click', li.__slideClick);
				});
			},
			setComments: function(){
				var $this = this;
				Array.prototype.slice.call(this.childNodes).forEach(function(child, i){
					if(child.tagName == 'NINPP-COMMENT') $this.removeChild(child);
				});
				var comments = this._player.viewer._slides[this._player.viewer.slide].getElementsByTagName('ninpp-comment');
				if(comments && comments.length > 0){
					this.appendChild(comments[0].cloneNode(true));
				}
			}
		}
	});
})();

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
		this.recordStarted();
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
	recordFail: function(e){},
	recordStarted: function(e){}
};

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */
var saveAs=saveAs||"undefined"!==typeof navigator&&navigator.msSaveOrOpenBlob&&navigator.msSaveOrOpenBlob.bind(navigator)||function(a){"use strict";if("undefined"===typeof navigator||!/MSIE [1-9]\./.test(navigator.userAgent)){var k=a.document,n=k.createElementNS("http://www.w3.org/1999/xhtml","a"),w="download"in n,x=function(c){var e=k.createEvent("MouseEvents");e.initMouseEvent("click",!0,!1,a,0,0,0,0,0,!1,!1,!1,!1,0,null);c.dispatchEvent(e)},q=a.webkitRequestFileSystem,u=a.requestFileSystem||q||a.mozRequestFileSystem,
y=function(c){(a.setImmediate||a.setTimeout)(function(){throw c;},0)},r=0,s=function(c){var e=function(){"string"===typeof c?(a.URL||a.webkitURL||a).revokeObjectURL(c):c.remove()};a.chrome?e():setTimeout(e,10)},t=function(c,a,d){a=[].concat(a);for(var b=a.length;b--;){var l=c["on"+a[b]];if("function"===typeof l)try{l.call(c,d||c)}catch(f){y(f)}}},m=function(c,e){var d=this,b=c.type,l=!1,f,p,k=function(){t(d,["writestart","progress","write","writeend"])},g=function(){if(l||!f)f=(a.URL||a.webkitURL||
a).createObjectURL(c);p?p.location.href=f:void 0==a.open(f,"_blank")&&"undefined"!==typeof safari&&(a.location.href=f);d.readyState=d.DONE;k();s(f)},h=function(a){return function(){if(d.readyState!==d.DONE)return a.apply(this,arguments)}},m={create:!0,exclusive:!1},v;d.readyState=d.INIT;e||(e="download");if(w)f=(a.URL||a.webkitURL||a).createObjectURL(c),n.href=f,n.download=e,x(n),d.readyState=d.DONE,k(),s(f);else{a.chrome&&b&&"application/octet-stream"!==b&&(v=c.slice||c.webkitSlice,c=v.call(c,0,
c.size,"application/octet-stream"),l=!0);q&&"download"!==e&&(e+=".download");if("application/octet-stream"===b||q)p=a;u?(r+=c.size,u(a.TEMPORARY,r,h(function(a){a.root.getDirectory("saved",m,h(function(a){var b=function(){a.getFile(e,m,h(function(a){a.createWriter(h(function(b){b.onwriteend=function(b){p.location.href=a.toURL();d.readyState=d.DONE;t(d,"writeend",b);s(a)};b.onerror=function(){var a=b.error;a.code!==a.ABORT_ERR&&g()};["writestart","progress","write","abort"].forEach(function(a){b["on"+
a]=d["on"+a]});b.write(c);d.abort=function(){b.abort();d.readyState=d.DONE};d.readyState=d.WRITING}),g)}),g)};a.getFile(e,{create:!1},h(function(a){a.remove();b()}),h(function(a){a.code===a.NOT_FOUND_ERR?b():g()}))}),g)}),g)):g()}},b=m.prototype;b.abort=function(){this.readyState=this.DONE;t(this,"abort")};b.readyState=b.INIT=0;b.WRITING=1;b.DONE=2;b.error=b.onwritestart=b.onprogress=b.onwrite=b.onabort=b.onerror=b.onwriteend=null;return function(a,b){return new m(a,b)}}}("undefined"!==typeof self&&
self||"undefined"!==typeof window&&window||this.content);"undefined"!==typeof module&&null!==module?module.exports=saveAs:"undefined"!==typeof define&&null!==define&&null!=define.amd&&define([],function(){return saveAs});
