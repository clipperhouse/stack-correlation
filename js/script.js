(function($) {

	// set up json & cache
	var api_cache = {};

	$.ajaxSetup({
		cache: true
	});

	getJSONCached = function(url, callback) {
		var cache = api_cache[url];
		if (cache != null) {
			return callback && callback(cache);
		}

		var continuation = function(json) {
			api_cache[url] = json;
			return callback && callback(json);
		};

		return $.getJSON(url + '&callback=?', continuation);
	};

	var api_base_url = '//api.stackexchange.com/2.2/';
	var api_key_param = '&key=zg)SFUiAw3KznQKAw)AXzQ((';

	var urls = {
		api_sites: function(page) {
			return api_base_url + 'sites?page=' + page + '&pagesize=100&filter=!0U12eE-l6vTXjGb9hog*DtBLF' + api_key_param;
		},
		api_tags: function(site, tag) {
			return api_base_url + 'tags?pagesize=16&order=desc&sort=popular&inname=' + encodeURIComponent(tag) + '&site=' + site.api_site_parameter + '&filter=!*M27MxijjqVg4jGo' + api_key_param;
		},
		api_tags_popular: function(site) {
			return api_base_url + 'tags?pagesize=5&order=desc&sort=popular&site=' + site.api_site_parameter + '&filter=!*M27MxijjqVg4jGo' + api_key_param;
		},
		api_tag_count: function(site, tag) {
			return api_base_url + 'questions?order=desc&sort=activity&tagged=' + encodeURIComponent(tag) + '&site=' + site.api_site_parameter + '&filter=!LQa0AXyWeCS0eBBhfz)UnE' + api_key_param;
		},
		api_tags_related: function(site, tag) {
			return api_base_url + 'tags/' + encodeURIComponent(tag) + '/related?site=' + site.api_site_parameter + '&pagesize=10&filter=!n9Z4Y*b7KJ' + api_key_param;
		},
		site_tag: function(site, tag) {
			return site.site_url.replace('http:', '') + '/tags/' + encodeURIComponent(tag) + '/info';
		},
		wikipedia_search: function(tag) {
			return '//en.wikipedia.org/w/index.php?search=' + encodeURIComponent(tag.replace(/\-/g, ' ').replace('#', ' sharp'));
		},
	};

	var round = function(num, dec) {
		var result = (Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec)).toString();

		while (result.split('.').length > 1 && result.split('.')[1].length < dec) {
			result += '0';
		}

		return result;
	};

	var state = {};
	var sites = {};
	var defaultSite = null;

	var doc = $(document);
	var menu, header, siteName, tagName, tagCorrelations, title, popular, links, soLink, wikipediaLink, tagInput;

	doc.on('ready', function() {
		// start by loading all the sites
		getJSONCached(urls.api_sites(1), function(data) {
			var items = data.items;
			var len = items.length;
			for (var i = 0; i < len; i++) {
				var site = items[i];
				if (site.site_type === 'main_site' && site.name.indexOf('Meta') !== 0 && site.site_state === 'normal') {
					// scheme-relative url
					site.favicon_url = site.favicon_url.replace('http:', '');
					sites[site.api_site_parameter] = site;

					// first one, effectively
					if (defaultSite == null) {
						defaultSite = site;
					}
				}
			}
			doc.trigger('sites:load');
		});

		// and get the elements
		menu = $("#menu")
		header = $('h1');
		tagInput = $('input[name=tag]');
		siteName = $('.site-name');
		tagName = $('.tag-name');
		tagCorrelations = $('#tag-correlations');
		title = $('title');
		popular = $('#popular');
		links = $('#tag-links');
		soLink = links.find('a#so');
		wikipediaLink = links.find('a#wikipedia');

		// set up autocomplete
		tagInput.autocomplete({
			source: function(request, response) {
				getJSONCached(urls.api_tags(state.site, request.term), function(data) {
					var results = [];
					var items = data.items;
					var len = items.length;

					for (var i = 0; i < len; i++) {
						item = items[i];
						results.push({
							label: item.name,
							value: item.name,
							spec: state.site.api_site_parameter + '/' + item.name,
						});
					}

					response(results);
				});
			},
			select: function(event, ui) {
				location.href = '#' + ui.item.spec;
			},
			autoFocus: true,
			delay: 200
		});
	});

	// build the right-hand sites menu once we have the data
	doc.on('sites:load', function() {
		for (var key in sites) {
			if (sites.hasOwnProperty(key)) {
				var site = sites[key];
				var a = $('<a>')
					.attr('href', '#' + site.api_site_parameter)
					.html(site.name)
					.css('background-image', 'url(' + site.favicon_url + ')');

				// add UI element
				menu.append(a);
				// keep a reference to link
				site.a = a;
			}
		}
		menu.show();
		doc.trigger('menu:load');
	});

	// once we have the menu, initialize state
	doc.on('menu:load', function() {
		pop();
		window.onpopstate = pop;
	});

	var pop = function() {
		var newState = parseUrl(location.href);
		transition(newState);
	};

	// returns a state object, as expressed by the url
	var parseUrl = function(url) {
		var newState = {};

		// is there a hash?
		var parts = url.split('#');
		if (parts.length < 2) {
			// if no hash, go with first site
			newState.site = defaultSite;
			return newState;
		}

		var hash = parts[1];
		parts = hash.split('/');
		var site = sites[parts[0]]

		// is there a site for that?
		if (site) {
			newState.site = site;
		} else {
			// bad hash
		}

		if (parts.length > 1) {
			newState.tag = parts[1];
		}

		return newState;
	};

	var transition = function(newState) {
		setSiteUI(newState.site);

		if (newState.tag) {
			loadTag(newState.site, newState.tag)
			tagInput.val(newState.tag);
		} else {
			// clear it out
			tagInput.val('').attr('placeholder', 'type a tag name here');
			tagCorrelations.html('');
			links.hide();
			loadPopularTags(newState.site);
		}

		tagInput.focus().select();
		state = newState;
	};

	var setSiteUI = function(site) {
		// select menu item
		site.a.addClass('selected').siblings().removeClass('selected');

		// update header
		siteName.html(site.name);
		header.css('background-image', 'url(' + site.favicon_url.replace('http:', '') + ')');
	};

	var loadPopularTags = function(site) {
		getJSONCached(urls.api_tags_popular(site), function(data) {
			popular.html('Popular: &nbsp;');

			var items = data.items;
			var len = items.length;

			for (var i = 0; i < len; i++) {
				item = items[i];
				var a = $('<a>').attr('href', '#' + state.site.api_site_parameter + '/' + item.name)
					.addClass('tag').html(item.name);
				popular.append(a).append('&nbsp;');
			}
			popular.show();
		});
	};

	var loadTag = function(site, tag) {
		getJSONCached(urls.api_tag_count(site, tag), function(data) {
			loadCorrelations(site, tag, data.total);
		});
	};

	var loadCorrelations = function(site, tag, total) {
		getJSONCached(urls.api_tags_related(site, tag), function(data) {
			var correlations = [];
			var items = data.items;
			var len = items.length;

			for (var i = 0; i < len; i++) {
				item = items[i];
				correlations.push({
					tag: item.name,
					site: site.api_site_parameter,
					favicon: site.favicon_url.replace('http:', ''),
					url: site.site_url.replace('http:', '') + '/questions/tagged/' + encodeURIComponent(tag) + '+' + encodeURIComponent(item.name),
					correlation: i == 0 ? ('appears on ' + round(100 * item.count / total, 0) + '% of ‘' + tag + '’ questions') : (round(100 * item.count / total, 0) + '%')
				});
			}

			var obj = {
				'correlations': correlations
			};

			var template = $('#correlations-tmpl').html();
			var html = Mustache.to_html(template, obj);

			tagCorrelations.hide().html(html).fadeIn('fast');
			popular.hide();
			tagName.html(tag);
			soLink.attr('href', urls.site_tag(site, tag));
			wikipediaLink.attr('href', urls.wikipedia_search(tag));
			links.show();
		});
	};

	doc.on('mouseover', 'a.tag', function() {
		preFetchTag($(this));
	});

	var preFetchTag = function(a) {
		var stateToBe = parseUrl(a.attr('href'));
		getJSONCached(urls.api_tag_count(stateToBe.site, stateToBe.tag), null);
		getJSONCached(urls.api_tags_related(stateToBe.site, stateToBe.tag), null);
	};
})(jQuery);