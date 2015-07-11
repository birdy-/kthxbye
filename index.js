(function () {
  var itemFetcher = require('./itemFetcher');
  var datastore = require('./datastore');
  var analyser = require('./analyser');
  var dispatcher = require('./dispatcher');

  var arguments = process.argv.slice(2);

  var refresh = function() {
    refreshItems();
    dispatcher.on('ItemFetch.New.FullList', function (data) {
      console.log('------');
      itemFetcher.bulkOverview(data);
    });
  };

  var refreshItems = function() {
    datastore.drop('list');
    itemFetcher.fullList();
  };

  var refreshPrices = function() {
    datastore.getList(function (err, data) {
      itemFetcher.bulkOverview(data);
    });
  };

  switch (arguments[0]) {
    case 'refresh':
      if (arguments[1] === 'items') {
        refreshList();
      }
      if (arguments[1] === 'prices') {
        refreshPrices();
      } else {
        refresh();
      }
    break;

    default:
      console.log('Available commands:\n' +
                  '  refresh            Refresh item list and prices\n' +
                  '  refresh items      Refresh item list\n' +
                  '  refresh prices     Refresh prices');
  }

})();
