'use strict';

var util = require('./util');
var Ajv = require('ajv');
var generateSchema = require('./generate_schema');
var instructions = require('jsonscript/instructions');
var evaluationKeywords = require('./evaluation_keywords');
var instructionKeywords = require('./instruction_keywords');

module.exports = JSONScript;


function JSONScript(opts) {
  if (!(this instanceof JSONScript)) return new JSONScript(opts);
  this._opts = util.copy(opts);
  this._instructions = [];
  this._evalKeywords = {};
  this._executors = util.copy(this._opts.executors);
  this._util = util;
  this.ajv = Ajv({ allErrors: true, v5: true });
  addAjvKeywords.call(this);
  addCoreInstructions.call(this);
}


JSONScript.prototype.validate = validateScript;
JSONScript.prototype.evaluate = evaluateScript;
JSONScript.prototype.addInstruction = addInstruction;
JSONScript.prototype.addExecutor = addExecutor;


function validateScript(script) {
  var valid = this._validate(script);
  validateScript.errors = this._validate.errors;
  return valid;
}


function evaluateScript(script) {
  var wrapped = { script: script };
  var valid;
  try {
    valid = this._evaluate.call(this, wrapped);
  } catch(e) {
    return Promise.reject(e);
  }
  if (!valid) return Promise.reject(Ajv.ValidationError(this._evaluate.errors));
  script = wrapped.script;
  if (script && typeof script.then == 'function') return script;
  return Promise.resolve(script);
}


function addInstruction(definition, keywordFunc, regenerateSchemas) {
  var valid = this._validateInstruction(definition);
  if (!valid) throw new Ajv.ValidationError(this._validateInstruction.errors);
  // TODO check instruction is unique
  this._instructions.push(definition);
  var keyword = definition.evaluate.keyword;
  this._evalKeywords[keyword] = keywordFunc;
  addAjvKeyword.call(this, keyword, 'object', true);
  if (regenerateSchemas !== false) generateSchemas();
}


function addExecutor(name, executor) {
  // TODO check duplicates, show warnings
  // ? TODO whitelist methods?
  this._executors[name] = executor;
}


function addAjvKeywords() {
  var self = this;
  addAjvKeyword.call(this, 'thenValidate', undefined);
  addAjvKeyword.call(this, 'itemsSerial', 'array');
  this._evalKeywords.objectToPromise = util.objectToPromise;
  addAjvKeyword.call(this, 'objectToPromise', 'object', true);
}


function addAjvKeyword(keyword, types, inlineInstruction) {
  var inlineFunc = evaluationKeywords[inlineInstruction ? 'inlineInstruction' : keyword];
  this.ajv.addKeyword(keyword, {
    type: types,
    inline: inlineFunc,
    statements: true,
    errors: 'full'
  });
} 


function addCoreInstructions() {
  this._validateInstruction = this.ajv.compile(require('jsonscript/schema/instruction.json'));
  instructions.forEach(function (inst) {
    this.addInstruction(inst, instructionKeywords[inst.evaluate.keyword], false);
  }, this);
  generateSchemas.call(this);
}


function generateSchemas() {
  this.ajv.addMetaSchema(_generate.call(this, 'evaluate_metaschema'));
  this._validate = this.ajv.compile(_generate.call(this, 'schema'));
  this._evaluate = this.ajv.compile(_generate.call(this, 'evaluate'));
}


function _generate(schemaName) {
  var schema = generateSchema(schemaName, this._instructions);
  this.ajv.removeSchema(schema.id);
  return schema;
}