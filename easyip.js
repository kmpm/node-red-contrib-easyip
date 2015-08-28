var debug = require('debug')('easyip');

var Packet = require('./lib/packet');

module.exports = function (RED) {

  function EasyIPin(config) {
    debug('created instance of `EasyIPin`');
    RED.nodes.createNode(this, config);
    var node = this;
    this.on('input', function (msg) {
      if (msg.payload instanceof Buffer) {
        var packet = Packet.parse(msg.payload);
        msg.payload = packet;
        this.send(msg);
      }
    });
  }

  RED.nodes.registerType('easyip in', EasyIPin);
  debug('registered `easyip in`');


  function EasyIPout(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    this.on('input', function (msg) {
      msg.payload = Packet.toBuffer(msg.payload);
      this.send(msg);
    });
  }

  RED.nodes.registerType('easyip out', EasyIPout);
  debug('registered `easyip out`');
};
