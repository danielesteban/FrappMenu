FRAPPSMENU = {
	create : function() {
		/* Show modal */
		SESSION.signin(function() {
			var modal = $(Handlebars.partials.create());
			modal.on('hidden.bs.modal', function() {
				$(this).remove();
			});
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
					FRAPP.load(frapp, {}, true);
					FRAPP.edit(frapp);
				});
			});
			$('body').append(modal);
			modal.modal('show');
		});
	}
};

window.addEventListener('frapp.init', function() {
	/* Handlebars helpers */
	Handlebars.registerHelper('i', function(className) {
		return new Handlebars.SafeString('<span class="glyphicon glyphicon-' + className + '"></span>');
	});

	/* Get & render installed Frapps */
	FRAPP.installed(function(frapps) {
		var engineFrapps = [
				'https://github.com/danielesteban/FrappsMenu.git',
				'https://github.com/danielesteban/FrappSignin.git'
			],
			l = frapps.length;

		for(var i=0; i<l; i++) {
			if(engineFrapps.indexOf(frapps[i].repository.url) === -1) continue;
			frapps.splice(i, 1);
			l--;
			i--;
		}
		$('body').append(Handlebars.templates.frapps({
			version : FRAPP.version.engine,
			year : (new Date()).getFullYear(),
			frapps : frapps
		})).css('overflow', 'auto');
		$('menu.frapps a').click(function(e) {
			var li = $(e.target).parents('li').first();
			if(li.attr('class') === 'add') {
				var modal = $(Handlebars.partials.add());
				modal.on('hidden.bs.modal', function() {
					$(this).remove();
				});
				modal.on('shown.bs.modal', function() {
					$('input', this).first().focus();
				});
				$('form', modal).submit(function(e) {
					e.stopPropagation();
					e.preventDefault();
					FRAPP.load({
						repository : {
							type : 'git',
							url : e.target.url.value
						}
					});
				});
				$('body').append(modal);
				modal.modal('show');
			} else {
				FRAPP.load(frapps[li.index()], {}, true);
			}
		});
	});
});
