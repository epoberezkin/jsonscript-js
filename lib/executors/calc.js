'use strict';

var util = require('./util');
var getNum = util.getNum;
var getBool = util.getBool;


module.exports = {
  add: calcAdd,
  subtract: calcSubtract,
  multiply: calcMultiply,
  divide: calcDivide,
  equal: calcEqual,
  notEqual: calcNotEqual,
  greater: calcComparison('greater', function (prev, num) { return prev <= num; }),
  lesser: calcComparison('lesser', function (prev, num) { return prev >= num; }),
  greaterEqual: calcComparison('greaterEqual', function (prev, num) { return prev < num; }),
  lesserEqual: calcComparison('lesserEqual', function (prev, num) { return prev > num; }),
  and: calcAnd,
  or: calcOr,
  not: calcNot,
  xor: calcXor
};


function calcAdd(args) {
  var result = 0;
  for (var i=0; i<args.length; i++)
    result += getNum(args, i, 'add');
  return result;
}


function calcSubtract(args) {
  var result = args[0];
  for (var i=1; i<args.length; i++)
    result -= getNum(args, i, 'subtract');
  return result;
}


function calcMultiply(args) {
  var result = 1;
  for (var i=0; i<args.length; i++) {
    var num = getNum(args, i, 'multiply');
    if (num == 0) return 0;
    result *= num;
  }
  return result;
}


function calcDivide(args) {
  var result = args[0];
  for (var i=1; i<args.length; i++) {
    var num = getNum(args, i, 'divide');
    if (num == 0) throw new Error('division by 0');
    result /= num;
  }
  return result;
}


function calcEqual(args) {
  return compareArgs(args, true);
}


function calcNotEqual(args) {
  return compareArgs(args, false);
}


function compareArgs(args, shouldBeEqual) {
  var item = args[0];
  for (var i=1; i<args.length; i++)
    if (args[i] !== item) return !shouldBeEqual;
  return shouldBeEqual;
}


function calcComparison(compName, compFunc) {
  return function (args) {
    var prev = args[0];
    for (var i=1; i<args.length; i++) {
      var num = getNum(args, i, compName);
      if (compFunc(prev, num)) return false;
      prev = num;
    }
    return true;
  };
}


function calcAnd(args) {
  for (var i=0; i<args.length; i++)
    if (!getBool(args, i, 'and')) return false;
  return true;
}


function calcOr(args) {
  for (var i=0; i<args.length; i++)
    if (getBool(args, i, 'or')) return true;
  return false;
}


function calcXor(args) {
  var result = false;
  for (var i=0; i<args.length; i++) {
    if (getBool(args, i, 'xor')) {
      if (result) return false;
      result = true;
    }
  }
  return result;
}


function calcNot(args) {
  if (typeof args != 'boolean')
    throw new Error('not expects boolean');
  return !args;
}
