$.ajaxSetup({
	cache: true
});

var api_cache = {};

getJSONCached = function(url, callback) {
	var cache = api_cache[url];
	if (cache != null) {
		return callback ? callback(cache) : null;
	}

	var continuation = function(json) {
		api_cache[url] = json;
		return callback ? callback(json) : null;
	};

	return $.getJSON(url + '&callback=?', continuation);
};

var api_key = 'zg)SFUiAw3KznQKAw)AXzQ((';

var urls = {
	api_sites: function(page) {
		return '//api.stackexchange.com/2.2/sites?page=' + page + '&pagesize=100&filter=!0U12eE-l6vTXjGb9hog*DtBLF&key=' + api_key;
	},
	api_tags: function(site, tag) {
		return '//api.stackexchange.com/2.2/tags?pagesize=16&order=desc&sort=popular&inname=' + encodeURIComponent(tag) + '&site=' + site.api_site_parameter + '&filter=!*M27MxijjqVg4jGo&key=' + api_key;
	},
	api_tags_popular: function(site) {
		return '//api.stackexchange.com/2.2/tags?pagesize=5&order=desc&sort=popular&site=' + site.api_site_parameter + '&filter=!*M27MxijjqVg4jGo&key=' + api_key;
	},
	api_tag_count: function(site, tag) {
		return '//api.stackexchange.com/2.2/questions?order=desc&sort=activity&tagged=' + encodeURIComponent(tag) + '&site=' + site.api_site_parameter + '&filter=!LQa0AXyWeCS0eBBhfz)UnE&key=' + api_key;
	},
	api_tags_related: function(site, tag) {
		return '//api.stackexchange.com/2.2/tags/' + encodeURIComponent(tag) + '/related?site=' + site.api_site_parameter + '&key=' + api_key + '&pagesize=10&filter=!n9Z4Y*b7KJ';
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

$(function() {
	var doc = $(document);
	var sites = $('#sites');

	// start by loading all the sites
	(function() {
		getJSONCached(urls.api_sites(1), function(data) {
			var items = data.items;
			var len = items.length;
			for (var i = 0; i < len; i++) {
				var site = items[i];
				if (site.site_type === 'main_site' && site.name.indexOf('Meta') !== 0 && site.site_state === 'normal') {
					// scheme-relative url
					site.favicon_url = site.favicon_url.replace('http:', '');

					var a = $('<a>')
						.data('site', site)
						.attr('href', '#' + site.api_site_parameter)
						.html(site.name)
						.css('background-image', 'url(' + site.favicon_url + ')');

					sites.append(a);
				}
			}
			sites.show();
			doc.trigger('sites:load');
		});
	})();

	var header = $('h1');
	var siteName = $('.site-name');
	var tagName = $('.tag-name');
	var tagCorrelations = $('#tag-correlations');
	var title = $('title');
	var popular = $('#popular');
	var links = $('#tag-links');

	// spec takes the form of site[/tag]
	var updateState = function(spec) {
		var parts = spec.split('/');

		var api_site_parameter = parts[0];

		// ensure site UI state is correct
		var li = getMenuItem(api_site_parameter);
		if (li) {
			setSiteUI(li);
		} else {
			// site is invalid, reset to nothing and bail
			location.hash = '';
			return;
		}

		var site = li.data('site');
		state.site = site;

		loadPopularTags(site);

		// is there a tag?
		var tag;
		if (spec.length > 1) {
			tag = parts[1];
		}

		if (tag) {
			loadTag(site, tag)
			tagInput.val(tag);
		} else {
			// clear it out
			tagCorrelations.html('');
			links.hide();
			tagInput.val('').attr('placeholder', 'type a tag name here');
			popular.show();
		}

		tagInput.focus().select();
	};

	var pop = function() {
		// look for hash
		if (location.hash.length > 1) {
			var spec = location.hash.replace(/^#+/, '');
			updateState(spec);
			return;
		}

		// choose default
		var li = sites.children().eq(0);
		var site = li.data('site');
		updateState(site.api_site_parameter);
	};

	window.onpopstate = pop;
	doc.on('sites:load', pop);

	var getMenuItem = function(api_site_parameter) {
		var lis = sites.children();

		for (var i = 0; i < lis.length; i++) {
			var li = $(lis[i]);
			var site = li.data('site');
			if (site.api_site_parameter === api_site_parameter) {
				return li;
			}
		}

		return null;
	};

	var setSiteUI = function(li) {
		// select sites item
		li.addClass('selected').siblings().removeClass('selected');

		// update header
		var site = li.data('site');
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
		});
	};

	var loadTag = function(site, tag) {
		getJSONCached(urls.api_tag_count(site, tag), function(data) {
			loadCorrelations(site, tag, data.total);
		});
	};

	var soLink = links.find('a#so');
	var wikipediaLink = links.find('a#wikipedia');

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

	var tagInput = $('input[name=tag]');

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

	doc.on('mouseover', 'a.tag', function() {
		preFetchTag($(this));
	});

	var preFetchTag = function(a) {
		var href = a.attr('href');
		var parts = href.split('#');
		if (parts.length < 2) {
			return;
		}

		var hash = parts[1];
		parts = hash.split('/');
		if (parts.length < 2) {
			return;
		}

		var site = getMenuItem(parts[0]).data('site');
		var tag = parts[1];
		getJSONCached(urls.api_tag_count(site, tag), null);
		getJSONCached(urls.api_tags_related(site, tag), null);
	};
});