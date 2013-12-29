MENU = {
	init : function() {
		/* Handlebars helpers */
		Handlebars.registerHelper('i', function(className) {
			return new Handlebars.SafeString('<span class="glyphicon glyphicon-' + className + '"></span>');
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
				});
				$('header .nav li.' + (user ? 'yours' : 'all')).addClass('active');
			};

		$('header .nav li').removeClass('active');
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
		modal.on('shown.bs.modal', function() {
			$('input', this).first().focus();
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
		var modal = this.modal('add');
		$('form', modal).submit(function(e) {
			e.stopPropagation();
			e.preventDefault();
			modal.modal('hide');
			FRAPP.install({
				repository : {
					type : 'git',
					url : e.target.url.value
				}
			}, {}, FRAPP.close);
		});
	}
};

window.addEventListener('frapp.init', MENU.init);
