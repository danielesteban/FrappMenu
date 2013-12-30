MENU = {
	init : function() {
		/* Handlebars helpers */
		Handlebars.registerHelper('i', function(className) {
			return new Handlebars.SafeString('<span class="glyphicon glyphicon-' + className + '"></span>');
		});

		Handlebars.registerHelper('empty', function(data, options) {
			if(!data || !data.length) return options.fn(this);
			else return options.inverse(this);
		});

		/* Get & render installed Frapps */
		FRAPP.installed(function(frapps) {
			var engineFrapps = [
					'https://github.com/danielesteban/FrappInstaller.git',
					'https://github.com/danielesteban/FrappSignin.git',
					'https://github.com/danielesteban/FrappsMenu.git'
				];

			MENU.frapps = [];
			frapps.forEach(function(f) {
				engineFrapps.indexOf(f.repository.url) === -1 && MENU.frapps.push(f);
			});
			$('body').append(Handlebars.templates.menu({
				version : FRAPP.version.engine,
				year : (new Date()).getFullYear()
			})).css('overflow', 'auto');
			MENU.renderFrapps();
		});
	},
	renderFrapps : function(user) {
		var render = function(frapps) {
				$('menu.frapps').replaceWith(Handlebars.partials.menu(frapps));
				$('menu.frapps a').click(function(e) {
					var li = $(e.target).parents('li').first();
					if(li.attr('class') === 'add') MENU.add();	
					else FRAPP.load(frapps[li.index()], {}, true);
				}).bind('contextmenu', function(e) {
					var li = $(e.target).parents('li').first();
					if(li.attr('class') === 'add') return;
					var frapp = frapps[li.index()];
					FRAPP.contextmenu(e, [
						{
							label : 'Fork',
							click : function() {
								alert('Sorry, forking Frapps is not yet implemented.');
							}
						},
						{
							label : 'Force update',
							click : function() {
								FRAPP.update(frapp);
							}
						},
						{
							label : 'Remove',
							click : function() {
								if(!confirm(L.areYouSure)) return;
								FRAPP.rmdir(frapp.path, function() {
									li.fadeOut('fast');
								});
							}
						}
					]);
				});
				$('header .nav li').removeClass('active');
				$('header .nav li.' + (user ? 'yours' : 'all')).addClass('active');
			};

		if(!user) return render(MENU.frapps);
		SESSION.signin(function() {
			var frapps = [];
			MENU.frapps.forEach(function(f) {
				f.repository.url.indexOf(SESSION.data.html_url) === 0 && frapps.push(f);
			});
			render(frapps);
		});
	},
	modal : function(id) {
		var modal = $(Handlebars.partials[id]());
		modal.on('hidden.bs.modal', function() {
			$(this).remove();
		});
		$('body').append(modal);
		modal.modal('show');
		return modal;
	},
	create : function() {
		/* Show modal */
		var self = this;
		SESSION.signin(function() {
			var modal = self.modal('create');
			modal.on('shown.bs.modal', function() {
				$('input', this).first().focus();
			});
			$('form', modal).submit(function(e) {
				e.stopPropagation();
				e.preventDefault();
				var name = e.target.name.value;
				FRAPP.create({
					name : name
				}, function(frapp) {
					if(!frapp) return;
					FRAPP.load(frapp, {}, true, function() {
						FRAPP.edit(frapp);
					});
				});
			});
		});
	},
	add : function() {
		var modal = this.modal('add'),
			getSources = function() {
				FRAPP.getSources(function(data) {
					var sources = [],
						installed = [];

					MENU.frapps.forEach(function(f) {
						installed.push(f.repository.url);
					});
					data.forEach(function(source) {
						var frapps = [];
						source = JSON.parse(JSON.stringify(source));
						source.frapps.forEach(function(f) {
							if(installed.indexOf(f.repository.url) !== -1) return;
							if(f.icon) {
								if(f.repository.url.indexOf('https://github.com/') !== 0) delete f.icon;
								else {
									var repository = f.repository.url.substr(19),
										p = repository.indexOf('/'),
										author = repository.substr(0, p);
									
									repository = repository.substr(p + 1);
									p = repository.lastIndexOf('.git');
									var name = repository.substr(0, p !== -1 ? p : repository.length);
									f.icon = 'https://raw.github.com/' + author + '/' + name + '/master/' + f.icon;
								}
							}
							frapps.push(f); 
						});
						if(frapps.length) {
							source.frapps = frapps;
							sources.push(source);
						}
					});
					$('.frapps table', modal).replaceWith(Handlebars.partials.frapps(sources));
					$('.frapps table button', modal).click(function(e) {
						FRAPP.load(sources[Math.floor($(e.target).parents('tbody').first().index() / 2)].frapps[$(e.target).parents('tr').first().index()], {}, true);
					});
					$('.sources table', modal).replaceWith(Handlebars.partials.sources(data));
					$('.sources table button', modal).click(function(e) {
						FRAPP.removeSource(data[$(e.target).parents('tr').first().index()].url, getSources);
					});
				});
			};

		getSources();
		$('.repo form', modal).submit(function(e) {
			e.stopPropagation();
			e.preventDefault();
			if(e.target.url.value === '') return;
			modal.modal('hide');
			FRAPP.load({
				repository : {
					type : 'git',
					url : e.target.url.value
				}
			}, {}, true);
		});
		$('.sources form', modal).submit(function(e) {
			e.stopPropagation();
			e.preventDefault();
			if(e.target.url.value === '') return;
			FRAPP.addSource(e.target.url.value, getSources);
			e.target.reset();
		});
	}
};

window.addEventListener('frapp.init', MENU.init);
