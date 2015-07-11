(function () {
  var dispatcher = require('./dispatcher');

  var Analyser = function () {
    this.initEvents();
  };

  Analyser.prototype.initEvents = function () {
    dispatcher.on('Datastore.New.Overview', function (doc) {
      console.log(doc);
    });
  };

  module.exports = new Analyser();

})();
