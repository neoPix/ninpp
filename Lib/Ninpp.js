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
				var contentTab = this.getElementsByClassName('content'), $this = this;;
				if(contentTab.length > 0){
					this.content = contentTab[0];
				}
				else{
					this.content = document.createElement('section');
					this.content.classList.add('content');
					this.content.innerHTML = this.innerHTML;
					this.innerHTML = '';
					this.appendChild(this.content);
					Array.prototype.slice.call(this.content.getElementsByTagName('style')).forEach(function(style){
						$this.appendChild(style);
					});
				}
				this._delayedElements = Array.prototype.slice.call(this.getElementsByClassName('delayed'));
				this._currentAnimation = 0;
			},
			hide: function(){
				this.classList.remove('on');
				this.classList.remove('passed');
			},
			passed: function(){
				this.classList.remove('on');
				this.classList.add('passed');
			},
			show: function(){
				this.classList.add('on');
				this.classList.remove('passed');
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
				this.content.style.height = 'auto';
				this.content.style.fontSize = 'inherit';
				var thisStyle = view.currentStyle || window.getComputedStyle(view), height = parseFloat(thisStyle.height.replace('px', '')), width = parseFloat(thisStyle.width.replace('px', ''));

				this.style.height = thisStyle.height;
				this.style.width = thisStyle.width;

				var style = this.content.currentStyle || window.getComputedStyle(this.content);
				var marginTop = parseFloat(style.marginTop.replace('px', '')),
				    marginBottom = parseFloat(style.marginBottom.replace('px', ''))
				    paddingTop = parseFloat(style.paddingTop.replace('px', '')),
				    paddingBottom = parseFloat(style.paddingBottom.replace('px', ''));
				var slideHeight = (height - (marginTop + marginBottom + paddingTop + paddingBottom)),
					defaultFontSize = parseFloat(style.fontSize.replace('px', '')), 
					fontSize = (defaultFontSize * (slideHeight / parseFloat(style.height.replace('px', ''))));
				
				this.content.style.fontSize =  Math.min(fontSize, defaultFontSize) + 'px';
				this.content.style.height = slideHeight + 'px';
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
				var $this = this;
				this.slide = this.slide || 0;
				this._slides[this.slide].removeEventListener('next', this.__onAnimationNext);
				this._slides[this.slide].removeEventListener('previous', this.__onAnimationPrevious);
				
				if(slidePosition == null)slidePosition = this.slide;
				this.slide = slidePosition;

				this._slides.forEach(function(slide, i){ 
					if(i > $this.slide) 
						slide.hide(); 
					else slide.passed();
				});
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
				this.__onTouchStart = function(event) { $this.__swipeStart = {x: event.changedTouches[0].clientX, y:event.changedTouches[0].clientY};};
				this.__onTouchEnd = function(event) {
					event.preventDefault();
					$this.__swipeEnd = {x: event.changedTouches[0].clientX, y:event.changedTouches[0].clientY}; 
					$this._swiped({x: $this.__swipeEnd.x - $this.__swipeStart.x, y: $this.__swipeEnd.y - $this.__swipeStart.y});
					delete $this.__swipeStart;
					delete $this.__swipeEnd;
				};
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
				this.addEventListener('touchstart', this.__onTouchStart);
				this.addEventListener('mouseup', this.__onSwipeEnd);
				this.addEventListener('touchend', this.__onTouchEnd);
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
						this.__controls.addEventListener('fullscreen', function(){$this.toogleFullScreen();});
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

				var waitingFor = ((event.detail.audio)?1:0) + ((event.detail.video)?1:0), done = 0;
				var onDone = function(){
					if(waitingFor == done){
						saveAs(zip.generate({type:"blob"}), "presentation.npf");
					}
				};

				if(event.detail.audio){
					this.getArrayFromBlob(event.detail.audio, function(arrayBuffer){
						zip.file('record.' + $this._getExtention(event.detail.audio.type), arrayBuffer);
						done++;
						onDone();
					});
				}
				if(event.detail.video){
					this.getArrayFromBlob(event.detail.video, function(arrayBuffer){
						zip.file('record.' + $this._getExtention(event.detail.video.type), arrayBuffer);
						done++;
						onDone();
					});
				}				
			},
			_getExtention: function(type){
				switch(type){
					case 'audio/ogg':
						return 'ogg';
					case 'video/webm':
						return 'webm';
					case 'audio/wav':
						return 'wav';
					default: 
						var type = type.split('/');
						return type[type.length-1];
				}
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
						this.toogleFullScreen();
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
			toogleFullScreen: function(){
				var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
				if(fullscreenElement)
					this.unSetFullScreen();
				else
					this.setFullScreen();
			},
			setFullScreen: function(){
				if (this.requestFullscreen) {
					this.requestFullscreen();
				} else if (this.msRequestFullscreen) {
					this.msRequestFullscreen();
				} else if (this.mozRequestFullScreen) {
					this.mozRequestFullScreen();
				} else if (this.webkitRequestFullscreen) {
					document.body.webkitRequestFullscreen();
				}
				if(this.__controls)
					this.__controls.toogleOpen(false);
			},
			unSetFullScreen: function(){
				if (this.exitFullscreen) {
					this.exitFullscreen();
				} else if (this.msCancelFullScreen) {
					this.msCancelFullScreen();
				} else if (this.mozCancelFullScreen) {
					this.mozCancelFullScreen();
				} else if (this.webkitCancelFullScreen) {
					document.body.webkitCancelFullScreen();
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
				this.innerHTML = '<span class="openner"></span><span class="option fullScreen">↕</span><span class="option presentator"/>🐵</span><span class="option record">⚫</span>';
				this._fullScreen = this.getElementsByClassName('fullScreen')[0];
				this._presentator = this.getElementsByClassName('presentator')[0];
				this._record = this.getElementsByClassName('record')[0];
				this._open = this.getElementsByClassName('openner')[0];
				
				this.__fullScreenEvent = function(event){ 
					$this.dispatchEvent(new Event('fullscreen'));
				};
				this.__presentatorEvent = function(event){ 
					$this.dispatchEvent(new Event('presentator'));
				};
				this.__recordEvent = function(event){ 
					$this.toogleRecord();
				};
				this.__openOrCloseEvent = function(event){ 
					$this.toogleOpen();
				};
				
				this._fullScreen.addEventListener('click', this.__fullScreenEvent);
				this._presentator.addEventListener('click', this.__presentatorEvent);
				this._record.addEventListener('click', this.__recordEvent);
				this._open.addEventListener('click', this.__openOrCloseEvent);
				this._fullScreen.addEventListener('touchend', this.__fullScreenEvent);
				this._presentator.addEventListener('touchend', this.__presentatorEvent);
				this._record.addEventListener('touchend', this.__recordEvent);
				this._open.addEventListener('touchend', this.__openOrCloseEvent);
			},
			_remove: function(){
				this._fullScreen.removeEventListener('click', this.__fullScreenEvent);
				this._presentator.removeEventListener('click', this.__presentatorEvent);
				this._record.removeEventListener('click', this.__recordEvent);
				this._open.removeEventListener('click', this.__openOrCloseEvent);
				this._fullScreen.removeEventListener('touchend', this.__fullScreenEvent);
				this._presentator.removeEventListener('touchend', this.__presentatorEvent);
				this._record.removeEventListener('touchend', this.__recordEvent);
				this._open.removeEventListener('touchend', this.__openOrCloseEvent);
			},
			toogleOpen: function(toogle){
				if(typeof toogle == 'undefined') toogle = false;
				if(!this.classList.contains('on') || toogle)
					this.classList.add('on');
				else
					this.classList.remove('on');
			},
			toogleRecord: function(){
				var $this = this;
				if(!this._record.classList.contains('on')){
					if(!this._recorder) this._recorder = new NinppRecorder();
					this._recorder.recordFail = function(){
						$this._record.classList.remove('on');
					};
					this._recorder.manageBlob = function(blobAudio, blobVideo){
						$this._record.classList.remove('on');
						console.log(blobVideo);
						$this.dispatchEvent(new CustomEvent('recordReady', {detail: {audio: blobAudio, video: blobVideo}}));
					};
					this._recorder.recordStarted = function(){
						$this._record.classList.add('on');
						$this.dispatchEvent(new Event('recordStarted'));
					};
					this._recorder.start();
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
	xtag.register('ninpp-media', {
		extends: 'div',
		lifecycle:{
			created: function(){
				this._init();
			},
			removed: function(){
			}
	  	},
		methods: {
			_init: function(){
				this._media = this.getElementsByTagName('video');
				if(this._media.length <= 0)
					this._media = this.getElementsByTagName('audio');
				if(this._media.length <= 0)
					alert('Ni audio ni vidéo, c\'est quoi ce bordel!');
				this._media = this._media[0];
				this._isVideo = this._media.tagName == 'VIDEO';

				this._bind();
			},
			_bind: function(){
				var $this = this;
				this._media.ontimeupdate = function(event){ $this.dispatchEvent(new CustomEvent('timeChanged', {detail: {time: $this._media.currentTime, duration : $this._media.duration} })); };
			},
			play: function(){
				this._media.play();
			},
			pause: function(){
				this._media.pause();
			},
			setTime: function(time){
				this._media.currentTime = time;
			},
			setProgress: function(progress){
				this.setTime(progress * this._media.duration);
			}
		}
	});
	xtag.register('ninpp-replay', {
		extends: 'div',
		lifecycle:{
			created: function(){
				this._init();
			},
			removed: function(){
			}
	  	},
		methods: {
			_init: function(){
				this.viewer = this.getElementsByTagName('ninpp-viewer')[0];
				this.media = this.getElementsByTagName('ninpp-media')[0];

				this.previousButton = document.createElement('button');
				this.previousButton.classList.add('previous');
				this.previousButton.classList.add('button');
				this.previousButton.innerHTML = '◂◂';
				this.appendChild(this.previousButton);

				this.nextButton = document.createElement('button');
				this.nextButton.classList.add('next');
				this.nextButton.classList.add('button');
				this.nextButton.innerHTML = '▸▸';
				this.appendChild(this.nextButton);

				this.playButton = document.createElement('button');
				this.playButton.classList.add('play');
				this.playButton.classList.add('button');
				this.playButton.innerHTML = '►';
				this.appendChild(this.playButton);

				this.progress = document.createElement('progress');
				this.progress.value = 0;
				this.progress.classList.add('globalProgress');
				this.appendChild(this.progress);

				this.viewer.style.width = '80vw';
				this.viewer.setSlide(this.viewer.slide);
				this.media.style.width = '19.5vw';
				this._loadHistory();
				this._bind();
			},
			_loadHistory: function(){
				this.history = this.getElementsByClassName('ninpp-history')[0];
				var json = JSON.parse(this.history.innerHTML);
				this.removeChild(this.history);
				this.history = json;

				var first = this.history[0].date;
				this.history.forEach(function(h, i){
					h.date = h.date - first;
					h.position = i;
				});
				this._lastEventTime = 0;
				this.viewer.setSlide(this.history[0].slide);
			},
			_bind: function(){
				var $this = this;
				this.__onTimeChanged = function(event){ $this.mediaTimeChanged(event.detail.time * 1000, event.detail.duration * 1000); };
				this.__onplayClicked = function(event){ $this.play(); };
				this.__onVideoClicked = function(){ $this.showVideo(); };
				this.__onSlideClicked = function(){ $this.showSlide(); };
				this.__onProgressChanged = function(event){ $this.media.setProgress(event.clientX / $this.progress.offsetWidth); };
				this.__goNextSlide = function(){ $this.goNext(); };
				this.__goPreviousSlide = function(){ $this.goPrevious(); };
				this.media.addEventListener('timeChanged', this.__onTimeChanged);
				this.previousButton.addEventListener('click', this.__goPreviousSlide);
				this.nextButton.addEventListener('click', this.__goNextSlide);
				this.playButton.addEventListener('click', this.__onplayClicked);
				this.media.addEventListener('click', this.__onVideoClicked);
				this.viewer.addEventListener('click', this.__onSlideClicked);
				this.progress.addEventListener('click', this.__onProgressChanged);
			},
			play: function(){
				if(!this.media._media.paused){
					this.media.pause();
					this.playButton.innerHTML = '►';
				}
				else{
					this.media.play();
					this.playButton.innerHTML = '‖';
				}
			},
			showVideo: function(){
				this.media.style.width = '34.5vw';
				this.viewer.style.width = '65vw';
				this.viewer._slides[this.viewer.slide].update(this.viewer);
			},
			showSlide: function(){
				this.media.style.width = '19.5vw';
				this.viewer.style.width = '80vw';
				this.viewer._slides[this.viewer.slide].update(this.viewer);
			},
			goNext: function(){
				var $this = this;
				this.history.every(function(h){
					if($this._lastEventTime < h.date){
						if(h.what == 'nextslide'){
							$this.media.setTime((h.date + 1) / 1000);
							return false;
						}
					}
					return true;
				});
			},
			goPrevious: function(){
				var $this = this;
				this.history.reverse();
				this.history.every(function(h){
					if($this._lastEventTime - 1 > h.date){
						if(h.what == 'nextslide' || h.what == 'started'){
							$this.media.setTime((h.date + 1) / 1000);
							return false;
						}
					}
					return true;
				});
				this.history.reverse();
			},
			mediaTimeChanged: function(time, duration){
				var $this = this;
				this.progress.value = time / duration;

				var changed = this.history.filter(function(h){ return h.date >= Math.min(time, $this._lastEventTime) && h.date <= Math.max(time, $this._lastEventTime) });

				if(changed && changed.length > 0){
					if($this._lastEventTime < time){
						changed.forEach(function(h){
							if(h.date < time && $this._lastEventTime < h.date){
								$this._lastEventTime = h.date;
								switch(h.what)
								{
									case 'nextslide':
									case 'nextanimation':
										$this.viewer.next();
										break;
									case 'previousslide':
									case 'previousanimation':
										$this.viewer.previous();
										break;
								}
							}
						});
					}
					else{
						var last = changed[0].position;
						changed.reverse();
						if(last > 1) changed.push(this.history[last - 1]);
						changed.forEach(function(h){
							if(h.date >= time && $this._lastEventTime >= h.date){
								$this._lastEventTime = h.date;
								switch(h.what)
								{
									case 'nextslide':
									case 'nextanimation':
										$this.viewer.previous();
										break;
									case 'previousslide':
									case 'previousanimation':
										$this.viewer.next();
										break;
								}
							}
						});
						$this._lastEventTime = time;
					}
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
    this.isChrome = !!navigator.webkitGetUserMedia;
};
NinppRecorder.prototype = {
	/// Préparation et démarage de l'enregistrement Video et Audio
	start: function(){
		var $this = this;
		this.stream = {};
		if(!this.isChrome){
			navigator.getUserMedia({audio: true, video: true}, function(streamaudiovideo) {
				$this.stream.audioVideoStream = streamaudiovideo;
				$this.startRecording();
			}, function(e){
				console.log('No video or audio device');
			});
		}
		else{
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
		}
	},
	/// Démarage de l'enregistrement Video et Audio
	startRecording: function(){
		var $this=this;
		this.recorder = {};
		if(!this.isChrome){
			if(typeof this.stream.audioVideoStream != 'undefined'){
				this.recorder.audioVideoStreamRecorder = RecordRTC(this.stream.audioVideoStream);
				this.recorder.audioVideoStreamRecorder.startRecording();
			}
		}
		else{
			if(typeof this.stream.audioStream != 'undefined') this.recorder.audioStreamRecorder = RecordRTC(this.stream.audioStream, {type: 'audio'});
			if(typeof this.stream.videoStream != 'undefined') this.recorder.videoStreamRecorder = RecordRTC(this.stream.videoStream, {type: 'video'});
			
			if(typeof this.recorder.audioStreamRecorder != 'undefined') this.recorder.audioStreamRecorder.startRecording();
			if(typeof this.recorder.videoStreamRecorder != 'undefined') this.recorder.videoStreamRecorder.startRecording();
		}
		this.recordStarted();
	},
	/// Démarage de l'enregistrement Video et Audio
	stopRecording: function(){
		var $this = this;
		if(!this.isChrome){
			if(typeof this.recorder.audioVideoStreamRecorder != 'undefined'){
				this.recorder.audioVideoStreamRecorder.stopRecording(function () {
					$this.manageBlob(null, $this.recorder.audioVideoStreamRecorder.getBlob());
		    	});
			}
		}
		else{
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