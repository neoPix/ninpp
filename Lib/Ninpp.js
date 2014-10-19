var Ninpp = function(){
	this.initialize();
};
Ninpp.prototype = {
	/// Initialisation de la présentation
	initialize: function(){
		this.body = document.getElementsByTagName('body')[0];
		this.history = [{when : new Date(), what: 'START', url: document.location}];
		this.slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
		this.progress = Array.prototype.slice.call(document.querySelectorAll("progress"));
		this.pageDisplay = Array.prototype.slice.call(document.querySelectorAll(".pagging"));
		this.curent = -1;		

		this._bindEvents();
		this._prepareSlides();
		if(window.location.hash)this.setSlideById(window.location.hash.replace('#', ''));
		else this.setNextSlide();
	},
	/// Aller à la slide suivante
	setNextSlide: function(){
		this.setSlide(this.curent + 1);
		this.history.push({when : new Date(), what: 'GOFORTH'});
	},
	/// Revenir à la slide précédente
	setPreviousSlide: function(){
		this.setSlide(this.curent - 1);
		this.history.push({when : new Date(), what: 'GOBACK'});
	},
	/// Afficher la slide ayant le numéro passé en paramètre
	setSlide: function(slideNumber){
		if(slideNumber >= 0 && slideNumber <= this.slides.length -1){
			this.slides.forEach(function(slide, i){
				slide.style.display = 'none';
			});
			this.slides[slideNumber].style.display='block';
			this.curent = slideNumber;
			window.location.hash = '#'+this.slides[slideNumber].getAttribute('id');
		}
		this._setSlideHeight();
		this._updateProgress();
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
	/// Mettre à jour la hauteur des slides
	_setSlideHeight: function(){
		var height = window.innerHeight;
		this.slides.forEach(function(slide, i){
			var style = slide.currentStyle || window.getComputedStyle(slide);
			var marginTop = parseFloat(style.marginTop.replace('px', '')),
			    marginBottom = parseFloat(style.marginBottom.replace('px', ''))
			    paddingTop = parseFloat(style.paddingTop.replace('px', '')),
			    paddingBottom = parseFloat(style.paddingBottom.replace('px', ''));
			slide.style.height = (height - (marginBottom + marginTop + paddingTop + paddingBottom)) + 'px';
		});
	},
};

var ninpp = new Ninpp();
