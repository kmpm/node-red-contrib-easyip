var DataWriter = require('./datawriter');
var DataReader = require('./datareader');
var extend = require('util')._extend;
var debug = require('debug')('easyip:packet');
var enums = require('./enums');

var Packet = module.exports = function (source) {
  source = source || {};
  source.payload = source.payload || [];
  this.flags = enums.keyOfBits(enums.FLAGS, 0);
  this.error =  0;
  this.counter = 0;
  this.index1 = 0;
  this.spare1 = 0;
  this.sendType =  enums.keyOf(enums.OPERANDS, 0);
  this.sendSize = 0;
  this.sendOffset = 0;
  this.spare2 =  0;
  this.reqType =  enums.keyOf(enums.OPERANDS, 0);
  this.reqSize =  0;
  this.reqOffsetServer =  0;
  this.reqOffsetClient =  0;
  this.payload = [];

  extend(this, source);
  if(source.payload) {
    this.payload = source.payload;
  }
}

Packet.parse = function (buffer, isInbound) {
  isInbound = isInbound === true ? true : false;
  debug('parse');
  var reader = new DataReader(buffer);
  var packet = new Packet();
  packet.flags = enums.keyOfBits(enums.FLAGS, reader.byte());
  packet.error = reader.byte();
  packet.counter = reader.short();
  packet.index1 = reader.short();
  packet.spare1 = reader.byte();
  packet.sendType = enums.keyOf(enums.OPERANDS, reader.byte());
  packet.sendSize = reader.short();
  packet.sendOffset = reader.short();
  packet.spare2  = reader.byte();
  packet.reqType = enums.keyOf(enums.OPERANDS, reader.byte());
  packet.reqSize = reader.short();
  packet.reqOffsetServer = reader.short();
  packet.reqOffsetClient = reader.short();


  var parsingType = packet.sendType;
  var parsingSize = packet.sendSize;
  if(packet.flags.indexOf('RESPONSE') >= 0) {
    //its a response, parse payload with reqType..
    debug('payload as reqType:%s', packet.reqType);
    parsingType = packet.reqType;
    parsingSize = packet.reqSize;
  }


  if (parsingType !== 'EMPTY') {
    while(!reader.isEOF() && packet.payload.length < parsingSize) {
      var value;
      if (parsingType === 'STRING') {
        value = reader.stringNt();
      }
      else {
        value = reader.short();
      }
      packet.payload.push(value);
      debug('read %d of %d into payload', packet.payload.length, parsingSize);
    }

  }
  return packet;
}

Packet.prototype.validate = function () {

  if(valueOrParse(enums.OPERANDS.STRING, this.sendType) === enums.OPERANDS.STRING && this.sendSize === 0) {
    this.sendSize = this.payload.length;
    debug('send %d string(s)', this.sendSize);
  }

  if(valueOrParse(enums.OPERANDS.STRING, this.reqType) === enums.OPERANDS.STRING && this.reqSize === 0) {
    this.reqSize = this.payload.length;
    debug('req %d string(s)', this.reqSize);
  }

}

Packet.toBuffer = function (packet) {
  debug('toBuffer');
  var writer = new DataWriter();
  packet.validate();
  var sendType = valueOrParse(enums.OPERANDS, packet.sendType);
  var reqType = valueOrParse(enums.OPERANDS, packet.reqType);
  writer.byte(valueOrParse(enums.FLAGS, packet.flags))
  .byte(packet.error)
  .short(packet.counter)
  .short(packet.index1)
  .byte(0)
  .byte(sendType)
  .short(packet.sendSize)
  .short(packet.sendOffset)
  .byte(0)
  .byte(reqType)
  .short(packet.reqSize)
  .short(packet.reqOffsetServer)
  .short(packet.reqOffsetClient);


  if (packet.payload.length > 0) {
    var isNumber = (typeof packet.payload[0] === 'number');
    packet.payload.forEach(function (p) {
      if (isNumber) {
        writer.short(p);
      }
      else {
        writer.stringNt(p);
      }
    });
    debug('payload written as %s', isNumber ? 'number' : 'string');
  }
  else {
    debug('no payload');
  }

  return writer.toBuffer();
}

function valueOrParse(list, value) {
  if (typeof value === 'number') {
    return value;
  }
  else if (typeof value === 'string') {
    var values = value.split('|');
    var newval = 0;
    values.forEach(function (v) {
      newval = newval | list[v];
    });
    debug('parsed value of `%s` to %d', value, newval);
    return newval;
  }
  else if (value instanceof Array) {
    values = value;
    values.forEach(function (v) {
      newval = newval | list[v];
    });
    debug('parsed value of `%s` to %d', value, newval);
    return newval;
  }
  else {
    debug('bad value', value);
    return 0;
  }
}