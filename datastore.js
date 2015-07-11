(function () {
  var dispatcher = require('./dispatcher');
  var itemFetcher = require('./itemFetcher');
  var Database = require('nedb');

  var Datastore = function () {
    this.overview = new Database({ filename: './db/overview' });
    this.overview.loadDatabase();
    this.list = new Database({ filename: './db/list' });
    this.list.loadDatabase();
    this.initEvents();
  };

  Datastore.prototype.drop = function (database) {
    if (database === 'list') {
      this.list.remove({}, { multi: true });
    }
  };

  Datastore.prototype.cleanNumber = function (str) {
    return str.replace(',', '');
  };

  Datastore.prototype.cleanPrice = function (str) {
    return str.replace('&#8364; ', '').replace(',', '.');
  };

  Datastore.prototype.saveOverview = function (data) {
    var doc = {
      _hash: data._hash,
      lowestPrice: this.cleanPrice(data.lowest_price),
      volume: this.cleanNumber(data.volume),
      medianPrice: this.cleanPrice(data.median_price),
      date: new Date().toJSON()
    };
    this.overview.insert(doc);
    dispatcher.emit('Datastore.New.Overview', doc);
  };

  Datastore.prototype.getList = function (callback) {
    this.list.find({}, callback);
  };

  Datastore.prototype.saveList = function (data) {
    var list = [];
    for (var i = 0; i < data.results.length; i++) {
      var doc = {
        name: data.results[i]
      };
      this.list.insert(doc);
      list.push(doc);
    }
    dispatcher.emit('Datastore.New.List', list);
  };

  Datastore.prototype.initEvents = function () {
    var self = this;
    dispatcher.on('ItemFetcher.New.Overview', function (data) {
      self.saveOverview(data);
    });
    dispatcher.on('ItemFetcher.New.List', function (data) {
      self.saveList(data);
    });
  };

  module.exports = new Datastore();
})();
