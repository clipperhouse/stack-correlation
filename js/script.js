﻿// Generated by CoffeeScript 1.6.3
var api_cache;

$.fn.addSiteOption = function(site) {
  return $(this).append($("<li/>").data("site", site).html(site.name).css("background-image", "url(" + site.favicon_url + ")"));
};

api_cache = {};

$.getJSONCached = function(url, callback) {
  var cache, continuation;
  cache = api_cache[url];
  if (cache != null) {
    return callback(cache);
  }
  continuation = function(json) {
    callback(json);
    return api_cache[url] = json;
  };
  return $.getJSON(url + "&callback=?", continuation);
};

$(function() {
  var api_key, changeState, getcorrelations, getmenuitem, getsite, getsites, gettag, menu, pop, pushState, round, site_current, site_name, tag_correlations, tag_count, tag_input, title, urls;
  menu = $("#sites");
  tag_count = $("#tag-count");
  site_name = $("#site-name");
  tag_input = $("input[name=tag]");
  site_current = {};
  tag_correlations = $("#tag-correlations > tbody");
  api_key = "zg)SFUiAw3KznQKAw)AXzQ((";
  title = $("title");
  urls = {
    api_sites: function(page) {
      return "http://api.stackexchange.com/2.1/sites?page=" + page + "&pagesize=100&filter=!0U12eE-l6vTXjGb9hog*DtBLF&key=" + api_key;
    },
    api_tags: function(site, tag) {
      return "http://api.stackexchange.com/2.1/tags?pagesize=16&order=desc&sort=popular&inname=" + (encodeURIComponent(tag)) + "&site=" + site.api_site_parameter + "&filter=!*M27MxijjqVg4jGo&key=" + api_key;
    },
    api_tag_count: function(site, tag) {
      return "http://api.stackexchange.com/2.1/questions?order=desc&sort=activity&tagged=" + (encodeURIComponent(tag)) + "&site=" + site.api_site_parameter + "&filter=!LQa0AXyWeCS0eBBhfz)UnE&key=" + api_key;
    },
    api_tags_related: function(site, tag) {
      return "http://api.stackexchange.com/2.1/tags/" + (encodeURIComponent(tag)) + "/related?site=" + site.api_site_parameter + "&key=" + api_key + "&filter=!n9Z4Y*b7KJ";
    }
  };
  round = function(num, dec) {
    var result;
    result = (Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec)).toString();
    while (result.split('.').length > 1 && result.split('.')[1].length < dec) {
      result += '0';
    }
    return result;
  };
  getsites = function(page) {
    if (page == null) {
      page = 1;
    }
    return $.getJSONCached(urls.api_sites(page), function(data) {
      var site, _i, _len, _ref;
      _ref = data.items;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        site = _ref[_i];
        if (site.site_type === "main_site" && site.name.indexOf("Meta") !== 0 && site.site_state === "normal") {
          menu.addSiteOption(site);
        }
      }
      menu.show();
      if (data.has_more) {
        return getsites(page + 1);
      }
    });
  };
  gettag = function(site, tag) {
    if (tag == null) {
      tag_correlations.html("");
    }
    if ((tag == null) || (site == null)) {
      return;
    }
    return $.getJSONCached(urls.api_tag_count(site, tag), function(data) {
      return getcorrelations(site, tag, data.total);
    });
  };
  getcorrelations = function(site, tag, total) {
    return $.getJSONCached(urls.api_tags_related(site, tag), function(data) {
      var correlations, html, item, template;
      template = $("#correlations-tmpl").html();
      correlations = {
        items: (function() {
          var _i, _len, _ref, _results;
          _ref = data.items;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            item = _ref[_i];
            _results.push({
              tag_current: tag,
              tag: item.name,
              site: site_current.api_site_parameter,
              url: site.site_url + '/questions/tagged/' + encodeURIComponent(tag) + '+' + encodeURIComponent(item.name),
              correlation: round(item.count / total, 2)
            });
          }
          return _results;
        })()
      };
      html = Mustache.to_html(template, correlations);
      tag_correlations.hide().html(html).fadeIn("fast");
      return tag_input.focus().select();
    });
  };
  getmenuitem = function(api_site_parameter) {
    if ((api_site_parameter == null) || api_site_parameter.length === 0) {
      return null;
    }
    return menu.children("li").filter(function() {
      return $(this).data("site").api_site_parameter === api_site_parameter;
    });
  };
  getsite = function(api_site_parameter) {
    if ((api_site_parameter == null) || api_site_parameter.length === 0) {
      return null;
    }
    return getmenuitem(api_site_parameter).data("site");
  };
  getsites();
  tag_input.autocomplete({
    source: function(request, response) {
      return $.getJSONCached(urls.api_tags(site_current, request.term), function(data) {
        var item, items;
        items = (function() {
          var _i, _len, _ref, _results;
          _ref = data.items;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            item = _ref[_i];
            _results.push({
              label: item.name,
              value: item.name
            });
          }
          return _results;
        })();
        return response(items);
      });
    },
    select: function(event, ui) {
      return pushState(site_current, ui.item.value);
    },
    autoFocus: true,
    delay: 200
  });
  $('input.deletable').wrap('<span class="deleteicon" />').after($("<a/>").click(function() {
    $(this).prev('input').val('').focus();
    return pushState(site_current);
  }));
  $(document).on('click', '#sites > li', function() {
    return pushState($(this).data("site"));
  });
  $(document).on('click', 'a.correlation', function() {
    return setTimeout(pop, 1);
  });
  $(document).on('click', 'a[href^="#"]', function() {
    return setTimeout(pop, 1);
  });
  pop = function(event) {
    var api_site_parameter, hash, site, tag, _ref;
    hash = location.hash.replace(/^#+/, '');
    _ref = hash.split('/'), api_site_parameter = _ref[0], tag = _ref[1];
    site = getsite(api_site_parameter);
    return changeState(site, tag);
  };
  pushState = function(site, tag) {
    var hash;
    hash = "";
    if (site != null) {
      hash += site.api_site_parameter;
    }
    if (tag != null) {
      hash += '/' + tag;
    }
    if (hash.length) {
      hash = "#" + hash;
    }
    if (history.pushState != null) {
      history.pushState({
        hash: hash
      }, null, hash);
    }
    return changeState(site, tag);
  };
  changeState = function(site, tag) {
    var t;
    site_current = site;
    site_name.html(site_current.name);
    site_name.css("background-image", "url(" + site_current.favicon_url + ")");
    getmenuitem(site_current.api_site_parameter).addClass("selected").siblings().removeClass("selected");
    tag_input.val(tag).focus().select();
    t = 'Stack Exchange tag correlations';
    if (site_current != null) {
      t += ': ' + site_current.name;
    }
    if (tag != null) {
      t += ': ' + tag;
    }
    title.text(t);
    return gettag(site, tag);
  };
  window.onpopstate = pop;
  return setTimeout(function() {
    if (location.hash.length <= 1) {
      pushState(getsite("stackoverflow"));
    }
    return pop();
  }, 400);
});
