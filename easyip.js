var debug = require('debug')('contrib-easyip');
var easyip = require('easyip');
var Packet = easyip.Packet;

module.exports = function (RED) {

  /**
   * EasyIP from function
   */
  function EasyIPfrom(config) {
    debug('created instance of `EasyIPfrom`');
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

  RED.nodes.registerType('easyip-from', EasyIPfrom);
  debug('registered `easyip-from`');

  /**
   * EasyIP to function
   */
  function EasyIPto(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    this.on('input', function (msg) {
      msg.payload = Packet.toBuffer(msg.payload);
      this.send(msg);
    });
  }

  RED.nodes.registerType('easyip-to', EasyIPto);
  debug('registered `easyip-to`');


  /**
   * EasyIP server config node
   */
  function EasyIPServer(config) {
    debug('created instance of `EasyIPServer`')
    RED.nodes.createNode(this, config);
    var node = this;
    this.port = config.port;
    this.service = new easyip.Service();
    this.service.bind(this.port);
    this.service.on('listening', function (info) {
      debug('listening on %s:%s', info.address, info.port);
    });

    this.service.on('error', function (err) {
      debug('service error', err);
      node.log('service error', err);
    });

    /**
     * Close the connection when node is closed
     */
    this.on('close', function (done) {
      this.service.server.close(done);
    });
  }

  RED.nodes.registerType('easyip-server', EasyIPServer);
  debug('registered `easyip-server`');


  /**
   * EasyIP on Changed
   */

  function EasyIPchanged(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    this.server = RED.nodes.getNode(config.server);
    if (this.server && this.server.service) {
      debug('got a server and service');
      this.server.service.on('changed', function (operand, index, from, to) {
        debug('on changed %s with filter `%s`', operand, config.filter);
        if (config.filter !== '' && config.filter !== operand) {
          return;
        }
        var msg = {
          topic: 'easyip/' + operand.toLowerCase() + '/' + index,
          operand: operand,
          index: index,
          previous: from,
          payload: to
        };

        node.send(msg);
      });
    }
  }

  RED.nodes.registerType('easyip-changed', EasyIPchanged);
  debug('registered `easyip-changed`');


  /**
   * EasyIP update
   */

  function EasyIPupdate(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    config.index = parseInt(config.index);
    this.server = RED.nodes.getNode(config.server);
    if (this.server && this.server.service) {
      debug('got a server and service');
      this.on('input', function (msg) {
        msg.operand = typeof config.operand === 'string' && config.operand.length >= 5 ? config.operand : msg.operand;
        msg.index = hasIsNum(config.index) ? config.index : msg.index;

        msg.payload = typeof config.payload !== 'undefined' ? config.payload : msg.payload;

        debug('doing update  %s:%d, `%s`', msg.operand, msg.index, msg.payload);
        if(typeof msg.operand === 'string' && typeof msg.index === 'number' && typeof msg.payload !== 'undefined') {
          this.server.service.storage.set(msg.operand, msg.index, msg.payload);
        }
      });
    }
  }

  RED.nodes.registerType('easyip-update', EasyIPupdate);
  debug('registered `easyip-update`');


  /**
   * EasyIP update
   * This should send a request to a remote device
   */
   function hasIsNum(v) {
    return (typeof v === 'number') && !isNaN(v);
   }

  function EasyIPrequest(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.server = RED.nodes.getNode(config.server);
    config.offset = parseInt(config.offset);
    config.size = parseInt(config.size);
    config.localOffset = parseInt(config.localOffset);


    if (this.server && this.server.service) {
      debug('EasyIPrequest - got a server and service');
      this.on('input', function (msg) {
        debug('EasyIPrequest.on("input")', config, msg);


        msg.addr = typeof config.addr === 'string' && config.addr.length > 0 ? config.addr : msg.addr;
        msg.operand = typeof config.operand === 'string' && config.operand.length >=6 ?
          config.operand : msg.operand;

        msg.offset = hasIsNum(config.offset) ? config.offset : msg.offset;
        msg.size = hasIsNum(config.size) ? config.size : msg.size;
        msg.localOffset = hasIsNum(config.localOffset) ? config.localOffset : msg.localOffset;

        debug('EasyIPrequest- outgoing message', msg);
        if(typeof msg.addr === 'string') {
          msg.port = msg.port || easyip.EASYIP_PORT;
          try {
            this.server.service.doRequest(msg.addr, msg.operand,
              msg.offset, msg.size, msg.localOffset, function (err, packet) {
                node.status({});
                if (!err) {
                  msg.payload = packet;
                  node.send(msg);
                }
              });
          }
          catch(err) {
            debug('error requesting', err);
            node.log('error requesting', err);
            node.status({fill: 'red', shape: 'ring'});
          }
        }
        else {
          debug('msg.addr is not a string', msg.addr);
        }
      });
    }
  }

  RED.nodes.registerType('easyip-request', EasyIPrequest);
  debug('registered `easyip-request`');


  function EasyIPsend(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.server = RED.nodes.getNode(config.server);
    config.offset = parseInt(config.offset);
    config.size = parseInt(config.size);
    config.localOffset = parseInt(config.localOffset);


    if (this.server && this.server.service) {
      debug('EasyIPsend - got a server and service');
      this.on('input', function (msg) {
        debug('EasyIPsend.on("input")', config, msg);


        msg.addr = typeof config.addr === 'string' && config.addr.length > 0 ? config.addr : msg.addr;
        msg.operand = typeof config.operand === 'string' && config.operand.length >=6 ?
          config.operand : msg.operand;

        msg.offset = hasIsNum(config.offset) ? config.offset : msg.offset;
        msg.size = hasIsNum(config.size) ? config.size : msg.size;
        msg.localOffset = hasIsNum(config.localOffset) ? config.localOffset : msg.localOffset;

        debug('EasyIPsend- outgoing message', msg);
        if(typeof msg.addr === 'string') {
          msg.port = msg.port || easyip.EASYIP_PORT;
          try {
            this.server.service.doSend(msg.addr, msg.operand,
              msg.offset, msg.size, msg.localOffset, function (err, packet) {
                node.status({});
                if (!err) {
                  msg.payload = packet;
                  node.send(msg);
                }
              });
          }
          catch(err) {
            debug('error requesting', err);
            node.log('error requesting', err);
            node.status({fill: 'red', shape: 'ring'});
          }
        }
        else {
          debug('msg.addr is not a string', msg.addr);
        }
      });
    }
  }

  RED.nodes.registerType('easyip-send', EasyIPsend);
  debug('registered `easyip-send`');

};
