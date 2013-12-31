FRAPPS = {
	init : function() {
		/* Handlebars helpers */
		Handlebars.registerHelper('i', function(className) {
			return new Handlebars.SafeString('<span class="glyphicon glyphicon-' + className + '"></span>');
		});

		Handlebars.registerHelper('empty', function(data, options) {
			if(!data || !data.length) return options.fn(this);
			else return options.inverse(this);
		});

		/* Render the frapp */
		$('body').append(Handlebars.templates.menu({
			version : FRAPP.version.engine,
			year : (new Date()).getFullYear()
		}));

		/* Router setup */
		ROUTER = new ROUTER(function(panel) {
			switch(panel) {
				case 'preferences':
					PREFERENCES.render();
				break;
				case 'yours':
					MENU.render(true);
				break;
				default:
					MENU.render();
			}
		});
	},
	setTabs : function(active) {
		$('header nav li').removeClass('active');
		$('header nav li.' + active).addClass('active');
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
				var name = e.target.name.value,
					button = $('form button', modal);

				if(name === '' || button.prop('disabled')) return;
				button.prop('disabled', true).text(L.creating + '...');
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
		var modal = this.modal('add');
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
		});
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
	}
};

MENU = {
	getFrapps : function(reload, callback) {
		/* Get installed Frapps */
		if(!reload && this.frapps) return callback(this.frapps);
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
			callback(MENU.frapps);
		});
	},
	render : function(user, reload) {
		var render = function(frapps) {
				$('section div.container').empty().append(Handlebars.partials.menu(frapps));
				$('menu.frapps a').click(function(e) {
					var li = $(e.target).parents('li').first();
					if(li.attr('class') === 'add') FRAPPS.add();	
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
									MENU.render(user, true);
								});
							}
						}
					]);
				});
				FRAPPS.setTabs((user ? 'yours' : 'all'));
			};

		MENU.getFrapps(reload, function(data) {
			if(!user) return render(data);
			SESSION.signin(function() {
				var frapps = [];
				data.forEach(function(f) {
					f.repository.url.indexOf(SESSION.data.html_url) === 0 && frapps.push(f);
				});
				render(frapps);
			});
		});
	}
};

PREFERENCES = {
	render : function() {
		FRAPP.getSources(function(sources) {
			$('section div.container').empty().append(Handlebars.partials.preferences({
				user : SESSION.data,
				sources : sources
			}));
			$('section .sources table button').click(function(e) {
				FRAPP.removeSource(sources[$(e.target).parents('tr').first().index()].url, ROUTER.reload.bind(ROUTER));
			});
			$('section .sources form').submit(function(e) {
				e.stopPropagation();
				e.preventDefault();
				if(e.target.url.value === '') return;
				FRAPP.addSource(e.target.url.value, ROUTER.reload.bind(ROUTER));
			});
			FRAPPS.setTabs('preferences');
		});
	}
};

window.addEventListener('frapp.init', FRAPPS.init);
