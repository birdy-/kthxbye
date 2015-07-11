(function () {
  var request = require('request');
  var zlib = require('zlib');
  var dispatcher = require('./dispatcher');
  var _ = require('lodash');
  var cheerio = require('cheerio');

  var DEFAULT_INTERVAL = 1000;

  var ItemFetcher = function () {};

  ItemFetcher.prototype.host = 'http://steamcommunity.com';
  ItemFetcher.prototype.baseUrlParams = {
    appid: '730',
    currency: '3'
  };
  ItemFetcher.prototype.baseUrl = {
    overview: '/market/priceoverview/',
    history: '/market/pricehistory/',
    list: '/market/search/render?start=0&count=10&currency=3&language=english&format=json&appid=730'
  };

  ItemFetcher.prototype.call = function (url, event, hash) {
    var self = this;
    var options = {
      url: this.host + url,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:37.0) Gecko/20100101 Firefox/37.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en,en-US;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    };

    var req = request.get(options);
    req.on('response', function(res) {
      var chunks = [];
      res.on('data', function (chunk) {
        chunks.push(chunk);
      });
      res.on('end', function () {
        var data;
        var buffer = Buffer.concat(chunks);
        var encoding = res.headers['content-encoding'];
        var handleData = function (data) {
          // Sometimes steam returns null, in this case we should retry
          if (data === 'null') {
            console.log('We failed to receive items. We try again in ' +
                        (DEFAULT_INTERVAL / 1000) + ' seconds');
            setTimeout(function () {
              self.call(url, event, hash);
            }, DEFAULT_INTERVAL);
          } else {
            self.handleData(event, data, hash);
          }
        };
        if (encoding === 'gzip') {
          zlib.gunzip(buffer, function(err, decoded) {
            data = decoded && decoded.toString();
            handleData(data);
          });
        } else if (encoding === 'deflate') {
          zlib.inflate(buffer, function(err, decoded) {
            data = decoded && decoded.toString();
            handleData(data);
          });
        } else {
          data = buffer.toString();
          handleData(data);
        }
      });
    });
  };

  ItemFetcher.prototype.handleData = function (event, data, hash) {
    data = this.parseJson(data);
    if (data.results_html) {
      data.results = this.parseHTML(data.results_html);
      delete data.results_html;
    }
    if (hash) data._hash = hash;
    this.dispatch(event, data);
  };

  ItemFetcher.prototype.parseHTML = function (data) {
      var results = [];
      var $ = cheerio.load(data);
      $('span.market_listing_item_name').each(function (index, element) {
        results.push($(element).text());
      });
      return results;
  };

  ItemFetcher.prototype.overview = function (hash) {
    console.log('Get "' + hash + '"');
    var url = this.constructUrl('overview', { 'market_hash_name': hash });

    this.call(url, 'ItemFetcher.New.Overview', hash);
  };

  ItemFetcher.prototype.bulkOverview = function (items) {
    var self = this;
    console.log('Fetch ' + items.length + ' items, every ' +
               (DEFAULT_INTERVAL/1000) + ' seconds');
    for (var i = 0; i < items.length; i++) {
      var index = i;
      var hash = typeof items[index] === 'string' ? items[index] : items[index].name;
      setTimeout(function (hash) {
        self.overview(hash);
      }, DEFAULT_INTERVAL*i, hash);
    }
  };

  ItemFetcher.prototype.list = function (pagesize, start, eventName) {
    pagesize = pagesize || 10;
    start = start || 0;
    eventName = eventName || 'ItemFetcher.New.List';

    var url = this.constructUrl('list', { pagesize: pagesize, start: start });

    this.call(url, eventName);
  };

  ItemFetcher.prototype.fullList = function () {
    console.log('Start to fetch a complete item list');
    var pagesize = 10;
    var start = 0;
    var uuid = Math.random().toString(36).substr(2);
    var eventName = 'ItemFetch.New.PartialFullList.' + uuid;
    this.list(pagesize, start, eventName);

    var allData = [];
    var self = this;
    dispatcher.on(eventName, function (data) {
      console.log('Receive 10 items from ' + data.start);
      var total_count = data.total_count;
      var start = data.start + pagesize;

      allData = allData.concat(data.results);
      if (start < total_count) {
        console.log('Get 10 new items from ' + start + ' in ' +
                    (DEFAULT_INTERVAL / 1000) + ' seconds');
        setTimeout(function () {
          self.list(pagesize, start, eventName);
        }, DEFAULT_INTERVAL);
      } else {
        console.log('All items has been received');
        self.dispatch('ItemFetch.New.FullList', allData);
      }
      self.dispatch('ItemFetch.New.List', data);
    });
  };

  ItemFetcher.prototype.constructUrl = function (key, params) {
    var url = this.baseUrl[key];
    if (!params) {
      params = {};
    }
    params = _.merge(params, this.baseUrlParams);

    var urlParams = '';
    for (var key in params) {
      if (params !== "") {
        urlParams += "&";
      }
      urlParams += key + "=" + params[key];
    }

    url += '?' + urlParams;

    return url;
  };

  ItemFetcher.prototype.parseJson = function (data) {
    return JSON.parse(data);
  };

  ItemFetcher.prototype.dispatch = function (event, data) {
    dispatcher.emit(event, data);
  };

  module.exports = new ItemFetcher();
})();
