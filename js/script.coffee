$.fn.addSiteOption = (site) ->
  $(this).append($("<li/>").data("site", site).html(site.name).css("background-image", "url(#{site.favicon_url})"))

api_cache = {}

$.getJSONCached = (url, callback) ->
  cache = api_cache[url]
  return callback(cache) if cache?
  continuation = (json) ->
    callback(json)
    api_cache[url] = json
  $.getJSON url + "&callback=?", continuation

$ ->
  menu = $ "#sites"
  tag_count = $ "#tag-count"
  site_name = $ "#site-name"
  tag_input = $ "input[name=tag]"
  site_current = {}
  tag_correlations = $ "#tag-correlations > tbody"
  api_key = "zg)SFUiAw3KznQKAw)AXzQ(("

  urls = 
    api_sites: (page) -> "http://api.stackexchange.com/2.1/sites?page=#{page}&pagesize=100&filter=!0U12eE-l6vTXjGb9hog*DtBLF&key=#{api_key}"
    api_tags: (site, tag) -> "http://api.stackexchange.com/2.1/tags?pagesize=8&order=desc&sort=popular&inname=#{encodeURIComponent(tag)}&site=#{site.api_site_parameter}&filter=!*M27MxijjqVg4jGo&key=#{api_key}"
    api_tag_count: (site, tag) -> "http://api.stackexchange.com/2.1/questions?order=desc&sort=activity&tagged=#{encodeURIComponent(tag)}&site=#{site.api_site_parameter}&filter=!LQa0AXyWeCS0eBBhfz)UnE&key=#{api_key}"
    api_tags_related: (site, tag) -> "http://api.stackexchange.com/2.1/tags/#{encodeURIComponent(tag)}/related?site=#{site.api_site_parameter}&key=#{api_key}&filter=!n9Z4Y*b7KJ"

  round = (num, dec) -> 
    result = (Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec)).toString()
    result += '0' while result.split('.').length > 1 and result.split('.')[1].length < dec
    result

  getsites = (page = 1) -> 
    $.getJSONCached urls.api_sites(page), (data) -> 
      menu.addSiteOption site for site in data.items when site.site_type is "main_site" and site.name.indexOf("Meta") isnt 0 and site.site_state is "normal"
      menu.show()
      getsites page + 1 if (data.has_more)

  gettag = (site, tag) ->
    tag_correlations.html "" if not tag?
    return if !tag? or !site?
    $.getJSONCached urls.api_tag_count(site, tag), (data) ->
      getcorrelations site, tag, data.total

  getcorrelations = (site, tag, total) ->
    $.getJSONCached urls.api_tags_related(site, tag), (data) ->
      template = $("#correlations-tmpl").html()
      correlations = { items :
        ({ tag_current: tag, tag: item.name, site: site_current.api_site_parameter, url: site.site_url + '/questions/tagged/' + encodeURIComponent(tag) + '+' + encodeURIComponent(item.name), correlation: round(item.count / total, 2) } for item in data.items) 
      }
      html = Mustache.to_html template, correlations
      tag_correlations.hide().html(html).fadeIn("fast");
      tag_input.focus().select()

  getmenuitem = (api_site_parameter) ->
    return null if not api_site_parameter? or api_site_parameter.length is 0
    menu.children("li").filter(-> $(this).data("site").api_site_parameter is api_site_parameter)

  getsite = (api_site_parameter) ->
    return null if not api_site_parameter? or api_site_parameter.length is 0
    return getmenuitem(api_site_parameter).data("site")

  getsites()

  tag_input.autocomplete { 
    source: (request, response) ->
      $.getJSONCached urls.api_tags(site_current, request.term), (data) ->
        items = ({ label: item.name, value: item.name } for item in data.items)
        response(items)
    select: (event, ui) -> 
      pushState site_current, ui.item.value
    autoFocus: true
    delay: 200
  }

  $('input.deletable').wrap('<span class="deleteicon" />').after $("<a/>").click ->
    $(this).prev('input').val('').focus()
    pushState site_current

  $(document).on 'click', '#sites > li', ->
    pushState $(this).data("site")

  $(document).on 'click', 'a.correlation', ->
    setTimeout pop, 1

  $(document).on 'click', 'a[href^="#"]', ->
    setTimeout pop, 1

  window.onpopstate = pop

  pop = (event) ->
    hash = location.hash.replace /^#+/, ''
    [api_site_parameter, tag] = hash.split '/'
    site = getsite api_site_parameter
    changeState site, tag
    
  pushState = (site, tag) ->
    hash = ""
    hash += site.api_site_parameter if site?
    hash += '/' + tag if tag?
    hash = "#" + hash if hash.length
    history.pushState { hash: hash }, null, hash if history.pushState?
    changeState site, tag

  changeState = (site, tag) ->
    site_current = site
    site_name.html site_current.name
    site_name.css "background-image", "url(#{site_current.favicon_url})"
    getmenuitem(site_current.api_site_parameter).addClass("selected").siblings().removeClass("selected")
    tag_input.val(tag).focus().select()
    gettag site, tag
  
  setTimeout ->
    pushState(getsite("stackoverflow")) if location.hash.length <= 1
    pop()
  , 400
