#!/usr/bin/env node
import path3 from 'path';
import 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs2 from 'fs/promises';
import * as vl from 'vega-lite';
import * as themes from 'vega-themes';
import os from 'os';
import * as vega from 'vega';
import { Resvg } from '@resvg/resvg-js';
import { execFile } from 'child_process';

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  __defProp(target, "default", { value: mod, enumerable: true }) ,
  mod
));
var init_esm_shims = __esm({
  "../../node_modules/.bun/tsup@8.5.1+56827fd7746d73aa/node_modules/tsup/assets/esm_shims.js"() {
  }
});

// ../../node_modules/.bun/papaparse@5.5.3/node_modules/papaparse/papaparse.js
var require_papaparse = __commonJS({
  "../../node_modules/.bun/papaparse@5.5.3/node_modules/papaparse/papaparse.js"(exports$1, module) {
    init_esm_shims();
    (function(root, factory) {
      if (typeof define === "function" && define.amd) {
        define([], factory);
      } else if (typeof module === "object" && typeof exports$1 !== "undefined") {
        module.exports = factory();
      } else {
        root.Papa = factory();
      }
    })(exports$1, function moduleFactory() {
      var global = (function() {
        if (typeof self !== "undefined") {
          return self;
        }
        if (typeof window !== "undefined") {
          return window;
        }
        if (typeof global !== "undefined") {
          return global;
        }
        return {};
      })();
      function getWorkerBlob() {
        var URL = global.URL || global.webkitURL || null;
        var code = moduleFactory.toString();
        return Papa2.BLOB_URL || (Papa2.BLOB_URL = URL.createObjectURL(new Blob(["var global = (function() { if (typeof self !== 'undefined') { return self; } if (typeof window !== 'undefined') { return window; } if (typeof global !== 'undefined') { return global; } return {}; })(); global.IS_PAPA_WORKER=true; ", "(", code, ")();"], { type: "text/javascript" })));
      }
      var IS_WORKER = !global.document && !!global.postMessage, IS_PAPA_WORKER = global.IS_PAPA_WORKER || false;
      var workers = {}, workerIdCounter = 0;
      var Papa2 = {};
      Papa2.parse = CsvToJson;
      Papa2.unparse = JsonToCsv;
      Papa2.RECORD_SEP = String.fromCharCode(30);
      Papa2.UNIT_SEP = String.fromCharCode(31);
      Papa2.BYTE_ORDER_MARK = "\uFEFF";
      Papa2.BAD_DELIMITERS = ["\r", "\n", '"', Papa2.BYTE_ORDER_MARK];
      Papa2.WORKERS_SUPPORTED = !IS_WORKER && !!global.Worker;
      Papa2.NODE_STREAM_INPUT = 1;
      Papa2.LocalChunkSize = 1024 * 1024 * 10;
      Papa2.RemoteChunkSize = 1024 * 1024 * 5;
      Papa2.DefaultDelimiter = ",";
      Papa2.Parser = Parser;
      Papa2.ParserHandle = ParserHandle;
      Papa2.NetworkStreamer = NetworkStreamer;
      Papa2.FileStreamer = FileStreamer;
      Papa2.StringStreamer = StringStreamer;
      Papa2.ReadableStreamStreamer = ReadableStreamStreamer;
      if (typeof PAPA_BROWSER_CONTEXT === "undefined") {
        Papa2.DuplexStreamStreamer = DuplexStreamStreamer;
      }
      if (global.jQuery) {
        var $ = global.jQuery;
        $.fn.parse = function(options) {
          var config = options.config || {};
          var queue = [];
          this.each(function(idx) {
            var supported = $(this).prop("tagName").toUpperCase() === "INPUT" && $(this).attr("type").toLowerCase() === "file" && global.FileReader;
            if (!supported || !this.files || this.files.length === 0)
              return true;
            for (var i = 0; i < this.files.length; i++) {
              queue.push({
                file: this.files[i],
                inputElem: this,
                instanceConfig: $.extend({}, config)
              });
            }
          });
          parseNextFile();
          return this;
          function parseNextFile() {
            if (queue.length === 0) {
              if (isFunction(options.complete))
                options.complete();
              return;
            }
            var f = queue[0];
            if (isFunction(options.before)) {
              var returned = options.before(f.file, f.inputElem);
              if (typeof returned === "object") {
                if (returned.action === "abort") {
                  error("AbortError", f.file, f.inputElem, returned.reason);
                  return;
                } else if (returned.action === "skip") {
                  fileComplete();
                  return;
                } else if (typeof returned.config === "object")
                  f.instanceConfig = $.extend(f.instanceConfig, returned.config);
              } else if (returned === "skip") {
                fileComplete();
                return;
              }
            }
            var userCompleteFunc = f.instanceConfig.complete;
            f.instanceConfig.complete = function(results) {
              if (isFunction(userCompleteFunc))
                userCompleteFunc(results, f.file, f.inputElem);
              fileComplete();
            };
            Papa2.parse(f.file, f.instanceConfig);
          }
          function error(name, file, elem, reason) {
            if (isFunction(options.error))
              options.error({ name }, file, elem, reason);
          }
          function fileComplete() {
            queue.splice(0, 1);
            parseNextFile();
          }
        };
      }
      if (IS_PAPA_WORKER) {
        global.onmessage = workerThreadReceivedMessage;
      }
      function CsvToJson(_input, _config) {
        _config = _config || {};
        var dynamicTyping = _config.dynamicTyping || false;
        if (isFunction(dynamicTyping)) {
          _config.dynamicTypingFunction = dynamicTyping;
          dynamicTyping = {};
        }
        _config.dynamicTyping = dynamicTyping;
        _config.transform = isFunction(_config.transform) ? _config.transform : false;
        if (_config.worker && Papa2.WORKERS_SUPPORTED) {
          var w = newWorker();
          w.userStep = _config.step;
          w.userChunk = _config.chunk;
          w.userComplete = _config.complete;
          w.userError = _config.error;
          _config.step = isFunction(_config.step);
          _config.chunk = isFunction(_config.chunk);
          _config.complete = isFunction(_config.complete);
          _config.error = isFunction(_config.error);
          delete _config.worker;
          w.postMessage({
            input: _input,
            config: _config,
            workerId: w.id
          });
          return;
        }
        var streamer = null;
        if (_input === Papa2.NODE_STREAM_INPUT && typeof PAPA_BROWSER_CONTEXT === "undefined") {
          streamer = new DuplexStreamStreamer(_config);
          return streamer.getStream();
        } else if (typeof _input === "string") {
          _input = stripBom(_input);
          if (_config.download)
            streamer = new NetworkStreamer(_config);
          else
            streamer = new StringStreamer(_config);
        } else if (_input.readable === true && isFunction(_input.read) && isFunction(_input.on)) {
          streamer = new ReadableStreamStreamer(_config);
        } else if (global.File && _input instanceof File || _input instanceof Object)
          streamer = new FileStreamer(_config);
        return streamer.stream(_input);
        function stripBom(string) {
          if (string.charCodeAt(0) === 65279) {
            return string.slice(1);
          }
          return string;
        }
      }
      function JsonToCsv(_input, _config) {
        var _quotes = false;
        var _writeHeader = true;
        var _delimiter = ",";
        var _newline = "\r\n";
        var _quoteChar = '"';
        var _escapedQuote = _quoteChar + _quoteChar;
        var _skipEmptyLines = false;
        var _columns = null;
        var _escapeFormulae = false;
        unpackConfig();
        var quoteCharRegex = new RegExp(escapeRegExp(_quoteChar), "g");
        if (typeof _input === "string")
          _input = JSON.parse(_input);
        if (Array.isArray(_input)) {
          if (!_input.length || Array.isArray(_input[0]))
            return serialize(null, _input, _skipEmptyLines);
          else if (typeof _input[0] === "object")
            return serialize(_columns || Object.keys(_input[0]), _input, _skipEmptyLines);
        } else if (typeof _input === "object") {
          if (typeof _input.data === "string")
            _input.data = JSON.parse(_input.data);
          if (Array.isArray(_input.data)) {
            if (!_input.fields)
              _input.fields = _input.meta && _input.meta.fields || _columns;
            if (!_input.fields)
              _input.fields = Array.isArray(_input.data[0]) ? _input.fields : typeof _input.data[0] === "object" ? Object.keys(_input.data[0]) : [];
            if (!Array.isArray(_input.data[0]) && typeof _input.data[0] !== "object")
              _input.data = [_input.data];
          }
          return serialize(_input.fields || [], _input.data || [], _skipEmptyLines);
        }
        throw new Error("Unable to serialize unrecognized input");
        function unpackConfig() {
          if (typeof _config !== "object")
            return;
          if (typeof _config.delimiter === "string" && !Papa2.BAD_DELIMITERS.filter(function(value) {
            return _config.delimiter.indexOf(value) !== -1;
          }).length) {
            _delimiter = _config.delimiter;
          }
          if (typeof _config.quotes === "boolean" || typeof _config.quotes === "function" || Array.isArray(_config.quotes))
            _quotes = _config.quotes;
          if (typeof _config.skipEmptyLines === "boolean" || typeof _config.skipEmptyLines === "string")
            _skipEmptyLines = _config.skipEmptyLines;
          if (typeof _config.newline === "string")
            _newline = _config.newline;
          if (typeof _config.quoteChar === "string")
            _quoteChar = _config.quoteChar;
          if (typeof _config.header === "boolean")
            _writeHeader = _config.header;
          if (Array.isArray(_config.columns)) {
            if (_config.columns.length === 0) throw new Error("Option columns is empty");
            _columns = _config.columns;
          }
          if (_config.escapeChar !== void 0) {
            _escapedQuote = _config.escapeChar + _quoteChar;
          }
          if (_config.escapeFormulae instanceof RegExp) {
            _escapeFormulae = _config.escapeFormulae;
          } else if (typeof _config.escapeFormulae === "boolean" && _config.escapeFormulae) {
            _escapeFormulae = /^[=+\-@\t\r].*$/;
          }
        }
        function serialize(fields, data, skipEmptyLines) {
          var csv = "";
          if (typeof fields === "string")
            fields = JSON.parse(fields);
          if (typeof data === "string")
            data = JSON.parse(data);
          var hasHeader = Array.isArray(fields) && fields.length > 0;
          var dataKeyedByField = !Array.isArray(data[0]);
          if (hasHeader && _writeHeader) {
            for (var i = 0; i < fields.length; i++) {
              if (i > 0)
                csv += _delimiter;
              csv += safe(fields[i], i);
            }
            if (data.length > 0)
              csv += _newline;
          }
          for (var row = 0; row < data.length; row++) {
            var maxCol = hasHeader ? fields.length : data[row].length;
            var emptyLine = false;
            var nullLine = hasHeader ? Object.keys(data[row]).length === 0 : data[row].length === 0;
            if (skipEmptyLines && !hasHeader) {
              emptyLine = skipEmptyLines === "greedy" ? data[row].join("").trim() === "" : data[row].length === 1 && data[row][0].length === 0;
            }
            if (skipEmptyLines === "greedy" && hasHeader) {
              var line = [];
              for (var c = 0; c < maxCol; c++) {
                var cx = dataKeyedByField ? fields[c] : c;
                line.push(data[row][cx]);
              }
              emptyLine = line.join("").trim() === "";
            }
            if (!emptyLine) {
              for (var col = 0; col < maxCol; col++) {
                if (col > 0 && !nullLine)
                  csv += _delimiter;
                var colIdx = hasHeader && dataKeyedByField ? fields[col] : col;
                csv += safe(data[row][colIdx], col);
              }
              if (row < data.length - 1 && (!skipEmptyLines || maxCol > 0 && !nullLine)) {
                csv += _newline;
              }
            }
          }
          return csv;
        }
        function safe(str, col) {
          if (typeof str === "undefined" || str === null)
            return "";
          if (str.constructor === Date)
            return JSON.stringify(str).slice(1, 25);
          var needsQuotes = false;
          if (_escapeFormulae && typeof str === "string" && _escapeFormulae.test(str)) {
            str = "'" + str;
            needsQuotes = true;
          }
          var escapedQuoteStr = str.toString().replace(quoteCharRegex, _escapedQuote);
          needsQuotes = needsQuotes || _quotes === true || typeof _quotes === "function" && _quotes(str, col) || Array.isArray(_quotes) && _quotes[col] || hasAny(escapedQuoteStr, Papa2.BAD_DELIMITERS) || escapedQuoteStr.indexOf(_delimiter) > -1 || escapedQuoteStr.charAt(0) === " " || escapedQuoteStr.charAt(escapedQuoteStr.length - 1) === " ";
          return needsQuotes ? _quoteChar + escapedQuoteStr + _quoteChar : escapedQuoteStr;
        }
        function hasAny(str, substrings) {
          for (var i = 0; i < substrings.length; i++)
            if (str.indexOf(substrings[i]) > -1)
              return true;
          return false;
        }
      }
      function ChunkStreamer(config) {
        this._handle = null;
        this._finished = false;
        this._completed = false;
        this._halted = false;
        this._input = null;
        this._baseIndex = 0;
        this._partialLine = "";
        this._rowCount = 0;
        this._start = 0;
        this._nextChunk = null;
        this.isFirstChunk = true;
        this._completeResults = {
          data: [],
          errors: [],
          meta: {}
        };
        replaceConfig.call(this, config);
        this.parseChunk = function(chunk, isFakeChunk) {
          const skipFirstNLines = parseInt(this._config.skipFirstNLines) || 0;
          if (this.isFirstChunk && skipFirstNLines > 0) {
            let _newline = this._config.newline;
            if (!_newline) {
              const quoteChar = this._config.quoteChar || '"';
              _newline = this._handle.guessLineEndings(chunk, quoteChar);
            }
            const splitChunk = chunk.split(_newline);
            chunk = [...splitChunk.slice(skipFirstNLines)].join(_newline);
          }
          if (this.isFirstChunk && isFunction(this._config.beforeFirstChunk)) {
            var modifiedChunk = this._config.beforeFirstChunk(chunk);
            if (modifiedChunk !== void 0)
              chunk = modifiedChunk;
          }
          this.isFirstChunk = false;
          this._halted = false;
          var aggregate = this._partialLine + chunk;
          this._partialLine = "";
          var results = this._handle.parse(aggregate, this._baseIndex, !this._finished);
          if (this._handle.paused() || this._handle.aborted()) {
            this._halted = true;
            return;
          }
          var lastIndex = results.meta.cursor;
          if (!this._finished) {
            this._partialLine = aggregate.substring(lastIndex - this._baseIndex);
            this._baseIndex = lastIndex;
          }
          if (results && results.data)
            this._rowCount += results.data.length;
          var finishedIncludingPreview = this._finished || this._config.preview && this._rowCount >= this._config.preview;
          if (IS_PAPA_WORKER) {
            global.postMessage({
              results,
              workerId: Papa2.WORKER_ID,
              finished: finishedIncludingPreview
            });
          } else if (isFunction(this._config.chunk) && !isFakeChunk) {
            this._config.chunk(results, this._handle);
            if (this._handle.paused() || this._handle.aborted()) {
              this._halted = true;
              return;
            }
            results = void 0;
            this._completeResults = void 0;
          }
          if (!this._config.step && !this._config.chunk) {
            this._completeResults.data = this._completeResults.data.concat(results.data);
            this._completeResults.errors = this._completeResults.errors.concat(results.errors);
            this._completeResults.meta = results.meta;
          }
          if (!this._completed && finishedIncludingPreview && isFunction(this._config.complete) && (!results || !results.meta.aborted)) {
            this._config.complete(this._completeResults, this._input);
            this._completed = true;
          }
          if (!finishedIncludingPreview && (!results || !results.meta.paused))
            this._nextChunk();
          return results;
        };
        this._sendError = function(error) {
          if (isFunction(this._config.error))
            this._config.error(error);
          else if (IS_PAPA_WORKER && this._config.error) {
            global.postMessage({
              workerId: Papa2.WORKER_ID,
              error,
              finished: false
            });
          }
        };
        function replaceConfig(config2) {
          var configCopy = copy(config2);
          configCopy.chunkSize = parseInt(configCopy.chunkSize);
          if (!config2.step && !config2.chunk)
            configCopy.chunkSize = null;
          this._handle = new ParserHandle(configCopy);
          this._handle.streamer = this;
          this._config = configCopy;
        }
      }
      function NetworkStreamer(config) {
        config = config || {};
        if (!config.chunkSize)
          config.chunkSize = Papa2.RemoteChunkSize;
        ChunkStreamer.call(this, config);
        var xhr;
        if (IS_WORKER) {
          this._nextChunk = function() {
            this._readChunk();
            this._chunkLoaded();
          };
        } else {
          this._nextChunk = function() {
            this._readChunk();
          };
        }
        this.stream = function(url) {
          this._input = url;
          this._nextChunk();
        };
        this._readChunk = function() {
          if (this._finished) {
            this._chunkLoaded();
            return;
          }
          xhr = new XMLHttpRequest();
          if (this._config.withCredentials) {
            xhr.withCredentials = this._config.withCredentials;
          }
          if (!IS_WORKER) {
            xhr.onload = bindFunction(this._chunkLoaded, this);
            xhr.onerror = bindFunction(this._chunkError, this);
          }
          xhr.open(this._config.downloadRequestBody ? "POST" : "GET", this._input, !IS_WORKER);
          if (this._config.downloadRequestHeaders) {
            var headers = this._config.downloadRequestHeaders;
            for (var headerName in headers) {
              xhr.setRequestHeader(headerName, headers[headerName]);
            }
          }
          if (this._config.chunkSize) {
            var end = this._start + this._config.chunkSize - 1;
            xhr.setRequestHeader("Range", "bytes=" + this._start + "-" + end);
          }
          try {
            xhr.send(this._config.downloadRequestBody);
          } catch (err) {
            this._chunkError(err.message);
          }
          if (IS_WORKER && xhr.status === 0)
            this._chunkError();
        };
        this._chunkLoaded = function() {
          if (xhr.readyState !== 4)
            return;
          if (xhr.status < 200 || xhr.status >= 400) {
            this._chunkError();
            return;
          }
          this._start += this._config.chunkSize ? this._config.chunkSize : xhr.responseText.length;
          this._finished = !this._config.chunkSize || this._start >= getFileSize(xhr);
          this.parseChunk(xhr.responseText);
        };
        this._chunkError = function(errorMessage) {
          var errorText = xhr.statusText || errorMessage;
          this._sendError(new Error(errorText));
        };
        function getFileSize(xhr2) {
          var contentRange = xhr2.getResponseHeader("Content-Range");
          if (contentRange === null) {
            return -1;
          }
          return parseInt(contentRange.substring(contentRange.lastIndexOf("/") + 1));
        }
      }
      NetworkStreamer.prototype = Object.create(ChunkStreamer.prototype);
      NetworkStreamer.prototype.constructor = NetworkStreamer;
      function FileStreamer(config) {
        config = config || {};
        if (!config.chunkSize)
          config.chunkSize = Papa2.LocalChunkSize;
        ChunkStreamer.call(this, config);
        var reader, slice;
        var usingAsyncReader = typeof FileReader !== "undefined";
        this.stream = function(file) {
          this._input = file;
          slice = file.slice || file.webkitSlice || file.mozSlice;
          if (usingAsyncReader) {
            reader = new FileReader();
            reader.onload = bindFunction(this._chunkLoaded, this);
            reader.onerror = bindFunction(this._chunkError, this);
          } else
            reader = new FileReaderSync();
          this._nextChunk();
        };
        this._nextChunk = function() {
          if (!this._finished && (!this._config.preview || this._rowCount < this._config.preview))
            this._readChunk();
        };
        this._readChunk = function() {
          var input = this._input;
          if (this._config.chunkSize) {
            var end = Math.min(this._start + this._config.chunkSize, this._input.size);
            input = slice.call(input, this._start, end);
          }
          var txt = reader.readAsText(input, this._config.encoding);
          if (!usingAsyncReader)
            this._chunkLoaded({ target: { result: txt } });
        };
        this._chunkLoaded = function(event) {
          this._start += this._config.chunkSize;
          this._finished = !this._config.chunkSize || this._start >= this._input.size;
          this.parseChunk(event.target.result);
        };
        this._chunkError = function() {
          this._sendError(reader.error);
        };
      }
      FileStreamer.prototype = Object.create(ChunkStreamer.prototype);
      FileStreamer.prototype.constructor = FileStreamer;
      function StringStreamer(config) {
        config = config || {};
        ChunkStreamer.call(this, config);
        var remaining;
        this.stream = function(s) {
          remaining = s;
          return this._nextChunk();
        };
        this._nextChunk = function() {
          if (this._finished) return;
          var size = this._config.chunkSize;
          var chunk;
          if (size) {
            chunk = remaining.substring(0, size);
            remaining = remaining.substring(size);
          } else {
            chunk = remaining;
            remaining = "";
          }
          this._finished = !remaining;
          return this.parseChunk(chunk);
        };
      }
      StringStreamer.prototype = Object.create(StringStreamer.prototype);
      StringStreamer.prototype.constructor = StringStreamer;
      function ReadableStreamStreamer(config) {
        config = config || {};
        ChunkStreamer.call(this, config);
        var queue = [];
        var parseOnData = true;
        var streamHasEnded = false;
        this.pause = function() {
          ChunkStreamer.prototype.pause.apply(this, arguments);
          this._input.pause();
        };
        this.resume = function() {
          ChunkStreamer.prototype.resume.apply(this, arguments);
          this._input.resume();
        };
        this.stream = function(stream) {
          this._input = stream;
          this._input.on("data", this._streamData);
          this._input.on("end", this._streamEnd);
          this._input.on("error", this._streamError);
        };
        this._checkIsFinished = function() {
          if (streamHasEnded && queue.length === 1) {
            this._finished = true;
          }
        };
        this._nextChunk = function() {
          this._checkIsFinished();
          if (queue.length) {
            this.parseChunk(queue.shift());
          } else {
            parseOnData = true;
          }
        };
        this._streamData = bindFunction(function(chunk) {
          try {
            queue.push(typeof chunk === "string" ? chunk : chunk.toString(this._config.encoding));
            if (parseOnData) {
              parseOnData = false;
              this._checkIsFinished();
              this.parseChunk(queue.shift());
            }
          } catch (error) {
            this._streamError(error);
          }
        }, this);
        this._streamError = bindFunction(function(error) {
          this._streamCleanUp();
          this._sendError(error);
        }, this);
        this._streamEnd = bindFunction(function() {
          this._streamCleanUp();
          streamHasEnded = true;
          this._streamData("");
        }, this);
        this._streamCleanUp = bindFunction(function() {
          this._input.removeListener("data", this._streamData);
          this._input.removeListener("end", this._streamEnd);
          this._input.removeListener("error", this._streamError);
        }, this);
      }
      ReadableStreamStreamer.prototype = Object.create(ChunkStreamer.prototype);
      ReadableStreamStreamer.prototype.constructor = ReadableStreamStreamer;
      function DuplexStreamStreamer(_config) {
        var Duplex = __require("stream").Duplex;
        var config = copy(_config);
        var parseOnWrite = true;
        var writeStreamHasFinished = false;
        var parseCallbackQueue = [];
        var stream = null;
        this._onCsvData = function(results) {
          var data = results.data;
          if (!stream.push(data) && !this._handle.paused()) {
            this._handle.pause();
          }
        };
        this._onCsvComplete = function() {
          stream.push(null);
        };
        config.step = bindFunction(this._onCsvData, this);
        config.complete = bindFunction(this._onCsvComplete, this);
        ChunkStreamer.call(this, config);
        this._nextChunk = function() {
          if (writeStreamHasFinished && parseCallbackQueue.length === 1) {
            this._finished = true;
          }
          if (parseCallbackQueue.length) {
            parseCallbackQueue.shift()();
          } else {
            parseOnWrite = true;
          }
        };
        this._addToParseQueue = function(chunk, callback) {
          parseCallbackQueue.push(bindFunction(function() {
            this.parseChunk(typeof chunk === "string" ? chunk : chunk.toString(config.encoding));
            if (isFunction(callback)) {
              return callback();
            }
          }, this));
          if (parseOnWrite) {
            parseOnWrite = false;
            this._nextChunk();
          }
        };
        this._onRead = function() {
          if (this._handle.paused()) {
            this._handle.resume();
          }
        };
        this._onWrite = function(chunk, encoding, callback) {
          this._addToParseQueue(chunk, callback);
        };
        this._onWriteComplete = function() {
          writeStreamHasFinished = true;
          this._addToParseQueue("");
        };
        this.getStream = function() {
          return stream;
        };
        stream = new Duplex({
          readableObjectMode: true,
          decodeStrings: false,
          read: bindFunction(this._onRead, this),
          write: bindFunction(this._onWrite, this)
        });
        stream.once("finish", bindFunction(this._onWriteComplete, this));
      }
      if (typeof PAPA_BROWSER_CONTEXT === "undefined") {
        DuplexStreamStreamer.prototype = Object.create(ChunkStreamer.prototype);
        DuplexStreamStreamer.prototype.constructor = DuplexStreamStreamer;
      }
      function ParserHandle(_config) {
        var MAX_FLOAT = Math.pow(2, 53);
        var MIN_FLOAT = -MAX_FLOAT;
        var FLOAT = /^\s*-?(\d+\.?|\.\d+|\d+\.\d+)([eE][-+]?\d+)?\s*$/;
        var ISO_DATE = /^((\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)))$/;
        var self2 = this;
        var _stepCounter = 0;
        var _rowCounter = 0;
        var _input;
        var _parser;
        var _paused = false;
        var _aborted = false;
        var _delimiterError;
        var _fields = [];
        var _results = {
          // The last results returned from the parser
          data: [],
          errors: [],
          meta: {}
        };
        if (isFunction(_config.step)) {
          var userStep = _config.step;
          _config.step = function(results) {
            _results = results;
            if (needsHeaderRow())
              processResults();
            else {
              processResults();
              if (_results.data.length === 0)
                return;
              _stepCounter += results.data.length;
              if (_config.preview && _stepCounter > _config.preview)
                _parser.abort();
              else {
                _results.data = _results.data[0];
                userStep(_results, self2);
              }
            }
          };
        }
        this.parse = function(input, baseIndex, ignoreLastRow) {
          var quoteChar = _config.quoteChar || '"';
          if (!_config.newline)
            _config.newline = this.guessLineEndings(input, quoteChar);
          _delimiterError = false;
          if (!_config.delimiter) {
            var delimGuess = guessDelimiter(input, _config.newline, _config.skipEmptyLines, _config.comments, _config.delimitersToGuess);
            if (delimGuess.successful)
              _config.delimiter = delimGuess.bestDelimiter;
            else {
              _delimiterError = true;
              _config.delimiter = Papa2.DefaultDelimiter;
            }
            _results.meta.delimiter = _config.delimiter;
          } else if (isFunction(_config.delimiter)) {
            _config.delimiter = _config.delimiter(input);
            _results.meta.delimiter = _config.delimiter;
          }
          var parserConfig = copy(_config);
          if (_config.preview && _config.header)
            parserConfig.preview++;
          _input = input;
          _parser = new Parser(parserConfig);
          _results = _parser.parse(_input, baseIndex, ignoreLastRow);
          processResults();
          return _paused ? { meta: { paused: true } } : _results || { meta: { paused: false } };
        };
        this.paused = function() {
          return _paused;
        };
        this.pause = function() {
          _paused = true;
          _parser.abort();
          _input = isFunction(_config.chunk) ? "" : _input.substring(_parser.getCharIndex());
        };
        this.resume = function() {
          if (self2.streamer._halted) {
            _paused = false;
            self2.streamer.parseChunk(_input, true);
          } else {
            setTimeout(self2.resume, 3);
          }
        };
        this.aborted = function() {
          return _aborted;
        };
        this.abort = function() {
          _aborted = true;
          _parser.abort();
          _results.meta.aborted = true;
          if (isFunction(_config.complete))
            _config.complete(_results);
          _input = "";
        };
        this.guessLineEndings = function(input, quoteChar) {
          input = input.substring(0, 1024 * 1024);
          var re = new RegExp(escapeRegExp(quoteChar) + "([^]*?)" + escapeRegExp(quoteChar), "gm");
          input = input.replace(re, "");
          var r = input.split("\r");
          var n = input.split("\n");
          var nAppearsFirst = n.length > 1 && n[0].length < r[0].length;
          if (r.length === 1 || nAppearsFirst)
            return "\n";
          var numWithN = 0;
          for (var i = 0; i < r.length; i++) {
            if (r[i][0] === "\n")
              numWithN++;
          }
          return numWithN >= r.length / 2 ? "\r\n" : "\r";
        };
        function testEmptyLine(s) {
          return _config.skipEmptyLines === "greedy" ? s.join("").trim() === "" : s.length === 1 && s[0].length === 0;
        }
        function testFloat(s) {
          if (FLOAT.test(s)) {
            var floatValue = parseFloat(s);
            if (floatValue > MIN_FLOAT && floatValue < MAX_FLOAT) {
              return true;
            }
          }
          return false;
        }
        function processResults() {
          if (_results && _delimiterError) {
            addError("Delimiter", "UndetectableDelimiter", "Unable to auto-detect delimiting character; defaulted to '" + Papa2.DefaultDelimiter + "'");
            _delimiterError = false;
          }
          if (_config.skipEmptyLines) {
            _results.data = _results.data.filter(function(d) {
              return !testEmptyLine(d);
            });
          }
          if (needsHeaderRow())
            fillHeaderFields();
          return applyHeaderAndDynamicTypingAndTransformation();
        }
        function needsHeaderRow() {
          return _config.header && _fields.length === 0;
        }
        function fillHeaderFields() {
          if (!_results)
            return;
          function addHeader(header, i2) {
            if (isFunction(_config.transformHeader))
              header = _config.transformHeader(header, i2);
            _fields.push(header);
          }
          if (Array.isArray(_results.data[0])) {
            for (var i = 0; needsHeaderRow() && i < _results.data.length; i++)
              _results.data[i].forEach(addHeader);
            _results.data.splice(0, 1);
          } else
            _results.data.forEach(addHeader);
        }
        function shouldApplyDynamicTyping(field) {
          if (_config.dynamicTypingFunction && _config.dynamicTyping[field] === void 0) {
            _config.dynamicTyping[field] = _config.dynamicTypingFunction(field);
          }
          return (_config.dynamicTyping[field] || _config.dynamicTyping) === true;
        }
        function parseDynamic(field, value) {
          if (shouldApplyDynamicTyping(field)) {
            if (value === "true" || value === "TRUE")
              return true;
            else if (value === "false" || value === "FALSE")
              return false;
            else if (testFloat(value))
              return parseFloat(value);
            else if (ISO_DATE.test(value))
              return new Date(value);
            else
              return value === "" ? null : value;
          }
          return value;
        }
        function applyHeaderAndDynamicTypingAndTransformation() {
          if (!_results || !_config.header && !_config.dynamicTyping && !_config.transform)
            return _results;
          function processRow(rowSource, i) {
            var row = _config.header ? {} : [];
            var j;
            for (j = 0; j < rowSource.length; j++) {
              var field = j;
              var value = rowSource[j];
              if (_config.header)
                field = j >= _fields.length ? "__parsed_extra" : _fields[j];
              if (_config.transform)
                value = _config.transform(value, field);
              value = parseDynamic(field, value);
              if (field === "__parsed_extra") {
                row[field] = row[field] || [];
                row[field].push(value);
              } else
                row[field] = value;
            }
            if (_config.header) {
              if (j > _fields.length)
                addError("FieldMismatch", "TooManyFields", "Too many fields: expected " + _fields.length + " fields but parsed " + j, _rowCounter + i);
              else if (j < _fields.length)
                addError("FieldMismatch", "TooFewFields", "Too few fields: expected " + _fields.length + " fields but parsed " + j, _rowCounter + i);
            }
            return row;
          }
          var incrementBy = 1;
          if (!_results.data.length || Array.isArray(_results.data[0])) {
            _results.data = _results.data.map(processRow);
            incrementBy = _results.data.length;
          } else
            _results.data = processRow(_results.data, 0);
          if (_config.header && _results.meta)
            _results.meta.fields = _fields;
          _rowCounter += incrementBy;
          return _results;
        }
        function guessDelimiter(input, newline, skipEmptyLines, comments, delimitersToGuess) {
          var bestDelim, bestDelta, fieldCountPrevRow, maxFieldCount;
          delimitersToGuess = delimitersToGuess || [",", "	", "|", ";", Papa2.RECORD_SEP, Papa2.UNIT_SEP];
          for (var i = 0; i < delimitersToGuess.length; i++) {
            var delim = delimitersToGuess[i];
            var delta = 0, avgFieldCount = 0, emptyLinesCount = 0;
            fieldCountPrevRow = void 0;
            var preview = new Parser({
              comments,
              delimiter: delim,
              newline,
              preview: 10
            }).parse(input);
            for (var j = 0; j < preview.data.length; j++) {
              if (skipEmptyLines && testEmptyLine(preview.data[j])) {
                emptyLinesCount++;
                continue;
              }
              var fieldCount = preview.data[j].length;
              avgFieldCount += fieldCount;
              if (typeof fieldCountPrevRow === "undefined") {
                fieldCountPrevRow = fieldCount;
                continue;
              } else if (fieldCount > 0) {
                delta += Math.abs(fieldCount - fieldCountPrevRow);
                fieldCountPrevRow = fieldCount;
              }
            }
            if (preview.data.length > 0)
              avgFieldCount /= preview.data.length - emptyLinesCount;
            if ((typeof bestDelta === "undefined" || delta <= bestDelta) && (typeof maxFieldCount === "undefined" || avgFieldCount > maxFieldCount) && avgFieldCount > 1.99) {
              bestDelta = delta;
              bestDelim = delim;
              maxFieldCount = avgFieldCount;
            }
          }
          _config.delimiter = bestDelim;
          return {
            successful: !!bestDelim,
            bestDelimiter: bestDelim
          };
        }
        function addError(type, code, msg, row) {
          var error = {
            type,
            code,
            message: msg
          };
          if (row !== void 0) {
            error.row = row;
          }
          _results.errors.push(error);
        }
      }
      function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function Parser(config) {
        config = config || {};
        var delim = config.delimiter;
        var newline = config.newline;
        var comments = config.comments;
        var step = config.step;
        var preview = config.preview;
        var fastMode = config.fastMode;
        var quoteChar;
        var renamedHeaders = null;
        var headerParsed = false;
        if (config.quoteChar === void 0 || config.quoteChar === null) {
          quoteChar = '"';
        } else {
          quoteChar = config.quoteChar;
        }
        var escapeChar = quoteChar;
        if (config.escapeChar !== void 0) {
          escapeChar = config.escapeChar;
        }
        if (typeof delim !== "string" || Papa2.BAD_DELIMITERS.indexOf(delim) > -1)
          delim = ",";
        if (comments === delim)
          throw new Error("Comment character same as delimiter");
        else if (comments === true)
          comments = "#";
        else if (typeof comments !== "string" || Papa2.BAD_DELIMITERS.indexOf(comments) > -1)
          comments = false;
        if (newline !== "\n" && newline !== "\r" && newline !== "\r\n")
          newline = "\n";
        var cursor = 0;
        var aborted = false;
        this.parse = function(input, baseIndex, ignoreLastRow) {
          if (typeof input !== "string")
            throw new Error("Input must be a string");
          var inputLen = input.length, delimLen = delim.length, newlineLen = newline.length, commentsLen = comments.length;
          var stepIsFunction = isFunction(step);
          cursor = 0;
          var data = [], errors = [], row = [], lastCursor = 0;
          if (!input)
            return returnable();
          if (fastMode || fastMode !== false && input.indexOf(quoteChar) === -1) {
            var rows = input.split(newline);
            for (var i = 0; i < rows.length; i++) {
              row = rows[i];
              cursor += row.length;
              if (i !== rows.length - 1)
                cursor += newline.length;
              else if (ignoreLastRow)
                return returnable();
              if (comments && row.substring(0, commentsLen) === comments)
                continue;
              if (stepIsFunction) {
                data = [];
                pushRow(row.split(delim));
                doStep();
                if (aborted)
                  return returnable();
              } else
                pushRow(row.split(delim));
              if (preview && i >= preview) {
                data = data.slice(0, preview);
                return returnable(true);
              }
            }
            return returnable();
          }
          var nextDelim = input.indexOf(delim, cursor);
          var nextNewline = input.indexOf(newline, cursor);
          var quoteCharRegex = new RegExp(escapeRegExp(escapeChar) + escapeRegExp(quoteChar), "g");
          var quoteSearch = input.indexOf(quoteChar, cursor);
          for (; ; ) {
            if (input[cursor] === quoteChar) {
              quoteSearch = cursor;
              cursor++;
              for (; ; ) {
                quoteSearch = input.indexOf(quoteChar, quoteSearch + 1);
                if (quoteSearch === -1) {
                  if (!ignoreLastRow) {
                    errors.push({
                      type: "Quotes",
                      code: "MissingQuotes",
                      message: "Quoted field unterminated",
                      row: data.length,
                      // row has yet to be inserted
                      index: cursor
                    });
                  }
                  return finish();
                }
                if (quoteSearch === inputLen - 1) {
                  var value = input.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar);
                  return finish(value);
                }
                if (quoteChar === escapeChar && input[quoteSearch + 1] === escapeChar) {
                  quoteSearch++;
                  continue;
                }
                if (quoteChar !== escapeChar && quoteSearch !== 0 && input[quoteSearch - 1] === escapeChar) {
                  continue;
                }
                if (nextDelim !== -1 && nextDelim < quoteSearch + 1) {
                  nextDelim = input.indexOf(delim, quoteSearch + 1);
                }
                if (nextNewline !== -1 && nextNewline < quoteSearch + 1) {
                  nextNewline = input.indexOf(newline, quoteSearch + 1);
                }
                var checkUpTo = nextNewline === -1 ? nextDelim : Math.min(nextDelim, nextNewline);
                var spacesBetweenQuoteAndDelimiter = extraSpaces(checkUpTo);
                if (input.substr(quoteSearch + 1 + spacesBetweenQuoteAndDelimiter, delimLen) === delim) {
                  row.push(input.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar));
                  cursor = quoteSearch + 1 + spacesBetweenQuoteAndDelimiter + delimLen;
                  if (input[quoteSearch + 1 + spacesBetweenQuoteAndDelimiter + delimLen] !== quoteChar) {
                    quoteSearch = input.indexOf(quoteChar, cursor);
                  }
                  nextDelim = input.indexOf(delim, cursor);
                  nextNewline = input.indexOf(newline, cursor);
                  break;
                }
                var spacesBetweenQuoteAndNewLine = extraSpaces(nextNewline);
                if (input.substring(quoteSearch + 1 + spacesBetweenQuoteAndNewLine, quoteSearch + 1 + spacesBetweenQuoteAndNewLine + newlineLen) === newline) {
                  row.push(input.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar));
                  saveRow(quoteSearch + 1 + spacesBetweenQuoteAndNewLine + newlineLen);
                  nextDelim = input.indexOf(delim, cursor);
                  quoteSearch = input.indexOf(quoteChar, cursor);
                  if (stepIsFunction) {
                    doStep();
                    if (aborted)
                      return returnable();
                  }
                  if (preview && data.length >= preview)
                    return returnable(true);
                  break;
                }
                errors.push({
                  type: "Quotes",
                  code: "InvalidQuotes",
                  message: "Trailing quote on quoted field is malformed",
                  row: data.length,
                  // row has yet to be inserted
                  index: cursor
                });
                quoteSearch++;
                continue;
              }
              continue;
            }
            if (comments && row.length === 0 && input.substring(cursor, cursor + commentsLen) === comments) {
              if (nextNewline === -1)
                return returnable();
              cursor = nextNewline + newlineLen;
              nextNewline = input.indexOf(newline, cursor);
              nextDelim = input.indexOf(delim, cursor);
              continue;
            }
            if (nextDelim !== -1 && (nextDelim < nextNewline || nextNewline === -1)) {
              row.push(input.substring(cursor, nextDelim));
              cursor = nextDelim + delimLen;
              nextDelim = input.indexOf(delim, cursor);
              continue;
            }
            if (nextNewline !== -1) {
              row.push(input.substring(cursor, nextNewline));
              saveRow(nextNewline + newlineLen);
              if (stepIsFunction) {
                doStep();
                if (aborted)
                  return returnable();
              }
              if (preview && data.length >= preview)
                return returnable(true);
              continue;
            }
            break;
          }
          return finish();
          function pushRow(row2) {
            data.push(row2);
            lastCursor = cursor;
          }
          function extraSpaces(index) {
            var spaceLength = 0;
            if (index !== -1) {
              var textBetweenClosingQuoteAndIndex = input.substring(quoteSearch + 1, index);
              if (textBetweenClosingQuoteAndIndex && textBetweenClosingQuoteAndIndex.trim() === "") {
                spaceLength = textBetweenClosingQuoteAndIndex.length;
              }
            }
            return spaceLength;
          }
          function finish(value2) {
            if (ignoreLastRow)
              return returnable();
            if (typeof value2 === "undefined")
              value2 = input.substring(cursor);
            row.push(value2);
            cursor = inputLen;
            pushRow(row);
            if (stepIsFunction)
              doStep();
            return returnable();
          }
          function saveRow(newCursor) {
            cursor = newCursor;
            pushRow(row);
            row = [];
            nextNewline = input.indexOf(newline, cursor);
          }
          function returnable(stopped) {
            if (config.header && !baseIndex && data.length && !headerParsed) {
              const result = data[0];
              const headerCount = /* @__PURE__ */ Object.create(null);
              const usedHeaders = new Set(result);
              let duplicateHeaders = false;
              for (let i2 = 0; i2 < result.length; i2++) {
                let header = result[i2];
                if (isFunction(config.transformHeader))
                  header = config.transformHeader(header, i2);
                if (!headerCount[header]) {
                  headerCount[header] = 1;
                  result[i2] = header;
                } else {
                  let newHeader;
                  let suffixCount = headerCount[header];
                  do {
                    newHeader = `${header}_${suffixCount}`;
                    suffixCount++;
                  } while (usedHeaders.has(newHeader));
                  usedHeaders.add(newHeader);
                  result[i2] = newHeader;
                  headerCount[header]++;
                  duplicateHeaders = true;
                  if (renamedHeaders === null) {
                    renamedHeaders = {};
                  }
                  renamedHeaders[newHeader] = header;
                }
                usedHeaders.add(header);
              }
              if (duplicateHeaders) {
                console.warn("Duplicate headers found and renamed.");
              }
              headerParsed = true;
            }
            return {
              data,
              errors,
              meta: {
                delimiter: delim,
                linebreak: newline,
                aborted,
                truncated: !!stopped,
                cursor: lastCursor + (baseIndex || 0),
                renamedHeaders
              }
            };
          }
          function doStep() {
            step(returnable());
            data = [];
            errors = [];
          }
        };
        this.abort = function() {
          aborted = true;
        };
        this.getCharIndex = function() {
          return cursor;
        };
      }
      function newWorker() {
        if (!Papa2.WORKERS_SUPPORTED)
          return false;
        var workerUrl = getWorkerBlob();
        var w = new global.Worker(workerUrl);
        w.onmessage = mainThreadReceivedMessage;
        w.id = workerIdCounter++;
        workers[w.id] = w;
        return w;
      }
      function mainThreadReceivedMessage(e) {
        var msg = e.data;
        var worker = workers[msg.workerId];
        var aborted = false;
        if (msg.error)
          worker.userError(msg.error, msg.file);
        else if (msg.results && msg.results.data) {
          var abort = function() {
            aborted = true;
            completeWorker(msg.workerId, { data: [], errors: [], meta: { aborted: true } });
          };
          var handle = {
            abort,
            pause: notImplemented,
            resume: notImplemented
          };
          if (isFunction(worker.userStep)) {
            for (var i = 0; i < msg.results.data.length; i++) {
              worker.userStep({
                data: msg.results.data[i],
                errors: msg.results.errors,
                meta: msg.results.meta
              }, handle);
              if (aborted)
                break;
            }
            delete msg.results;
          } else if (isFunction(worker.userChunk)) {
            worker.userChunk(msg.results, handle, msg.file);
            delete msg.results;
          }
        }
        if (msg.finished && !aborted)
          completeWorker(msg.workerId, msg.results);
      }
      function completeWorker(workerId, results) {
        var worker = workers[workerId];
        if (isFunction(worker.userComplete))
          worker.userComplete(results);
        worker.terminate();
        delete workers[workerId];
      }
      function notImplemented() {
        throw new Error("Not implemented.");
      }
      function workerThreadReceivedMessage(e) {
        var msg = e.data;
        if (typeof Papa2.WORKER_ID === "undefined" && msg)
          Papa2.WORKER_ID = msg.workerId;
        if (typeof msg.input === "string") {
          global.postMessage({
            workerId: Papa2.WORKER_ID,
            results: Papa2.parse(msg.input, msg.config),
            finished: true
          });
        } else if (global.File && msg.input instanceof File || msg.input instanceof Object) {
          var results = Papa2.parse(msg.input, msg.config);
          if (results)
            global.postMessage({
              workerId: Papa2.WORKER_ID,
              results,
              finished: true
            });
        }
      }
      function copy(obj) {
        if (typeof obj !== "object" || obj === null)
          return obj;
        var cpy = Array.isArray(obj) ? [] : {};
        for (var key in obj)
          cpy[key] = copy(obj[key]);
        return cpy;
      }
      function bindFunction(f, self2) {
        return function() {
          f.apply(self2, arguments);
        };
      }
      function isFunction(func) {
        return typeof func === "function";
      }
      return Papa2;
    });
  }
});

// src/server.ts
init_esm_shims();

// src/tools/load-csv.ts
init_esm_shims();

// ../core/src/index.ts
init_esm_shims();

// ../core/src/csv-parser.ts
init_esm_shims();
var import_papaparse = __toESM(require_papaparse());
var ISO_DATE_RE = /^(\d{4}[-/]\d{2}([-/]\d{2})?(T\d{2}:\d{2}(:\d{2})?)?|\d{1,2}\/\d{1,2}\/\d{4})$/;
function parseCSVString(text) {
  const results = import_papaparse.default.parse(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });
  const data = results.data;
  const errors = results.errors.map((e) => `Row ${e.row}: ${e.message}`);
  const metadata = extractMetadata(data);
  return { data, metadata, errors };
}
function inferType(values) {
  const nonNull = values.filter((v) => v != null && v !== "");
  if (nonNull.length === 0) return "string";
  const sample = nonNull.slice(0, 100);
  if (sample.every((v) => typeof v === "number" || typeof v === "string" && !isNaN(Number(v)) && v.trim() !== "")) {
    return "number";
  }
  if (sample.every((v) => typeof v === "boolean")) {
    return "boolean";
  }
  if (sample.every((v) => typeof v === "string" && ISO_DATE_RE.test(v))) {
    return "date";
  }
  return "string";
}
function inferDateGranularity(sample) {
  if (/^\d{4}[-/]\d{2}$/.test(sample)) return "month";
  if (/T\d{2}:\d{2}:\d{2}/.test(sample)) return "minute";
  if (/T\d{2}:\d{2}/.test(sample)) return "hour";
  return "day";
}
function extractMetadata(data) {
  if (data.length === 0) return { rowCount: 0, columns: [] };
  const columnNames = Object.keys(data[0]);
  const colValues = /* @__PURE__ */ new Map();
  for (const name of columnNames) colValues.set(name, []);
  for (const row of data) {
    for (const name of columnNames) colValues.get(name).push(row[name]);
  }
  const columns = columnNames.map((name) => {
    const values = colValues.get(name);
    const type = inferType(values);
    const nonNull = values.filter((v) => v != null && v !== "");
    const uniqueSet = new Set(nonNull);
    const unique = uniqueSet.size;
    const sample = nonNull.slice(0, 5);
    const col = { name, type, sample, unique };
    if (type === "string" && unique <= 20) {
      col.categorical = { values: [...uniqueSet].sort() };
    }
    if (type === "number") {
      let min = Infinity;
      let max = -Infinity;
      for (const v of nonNull) {
        if (typeof v === "number") {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
      if (min !== Infinity) {
        col.min = min;
        col.max = max;
      }
    }
    if (type === "date" && nonNull.length > 0) {
      const dateStrings = nonNull.slice().sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );
      col.dateRange = {
        min: dateStrings[0],
        max: dateStrings[dateStrings.length - 1],
        granularity: inferDateGranularity(dateStrings[0])
      };
    }
    return col;
  });
  return { rowCount: data.length, columns };
}
function detectWideFormat(columns) {
  const numericCols = columns.filter((c) => c.type === "number");
  if (numericCols.length < 3) return [];
  const hints = [];
  const seen = /* @__PURE__ */ new Set();
  const suffixGroups = /* @__PURE__ */ new Map();
  for (const col of numericCols) {
    const parts = col.name.split(/[_\-]/);
    if (parts.length >= 2) {
      const suffix = parts.slice(1).join("_");
      let group = suffixGroups.get(suffix);
      if (!group) {
        group = [];
        suffixGroups.set(suffix, group);
      }
      group.push(col.name);
    }
  }
  const prefixGroups = /* @__PURE__ */ new Map();
  for (const col of numericCols) {
    const parts = col.name.split(/[_\-]/);
    if (parts.length >= 2) {
      const prefix = parts[0];
      let group = prefixGroups.get(prefix);
      if (!group) {
        group = [];
        prefixGroups.set(prefix, group);
      }
      group.push(col.name);
    }
  }
  suffixGroups.forEach((cols, suffix) => {
    if (cols.length >= 3) {
      const key = cols.slice().sort().join(",");
      if (seen.has(key)) return;
      seen.add(key);
      hints.push(
        `Columns ${cols.join(", ")} appear to be wide-format (same measure "${suffix}" across categories). To compare them, use melt: { "columns": ${JSON.stringify(cols)}, "key": "category", "value": "${suffix}" }`
      );
    }
  });
  prefixGroups.forEach((cols, prefix) => {
    if (cols.length >= 3) {
      const key = cols.slice().sort().join(",");
      if (seen.has(key)) return;
      seen.add(key);
      hints.push(
        `Columns ${cols.join(", ")} appear to be wide-format (same measure "${prefix}" across categories). To compare them, use melt: { "columns": ${JSON.stringify(cols)}, "key": "category", "value": "${prefix}" }`
      );
    }
  });
  return hints;
}
function datasetsToContext(datasets2) {
  const entries = Object.entries(datasets2);
  if (entries.length === 0) return "";
  if (entries.length === 1) {
    const [name, parsed] = entries[0];
    return `Dataset "${name}" (reference with \`{ "url": "${name}" }\`):
${metadataToContext(parsed.metadata)}`;
  }
  const sections = entries.map(
    ([name, parsed]) => `### ${name} (reference with \`{ "url": "${name}" }\`)
${metadataToContext(parsed.metadata)}`
  );
  const columnSets = entries.map(([name, parsed]) => ({
    name,
    cols: new Set(parsed.metadata.columns.map((c) => c.name))
  }));
  const joinKeys = [];
  for (let i = 0; i < columnSets.length; i++) {
    for (let j = i + 1; j < columnSets.length; j++) {
      for (const col of columnSets[i].cols) {
        if (columnSets[j].cols.has(col)) {
          joinKeys.push(`\`${col}\` (${columnSets[i].name} \u2194 ${columnSets[j].name})`);
        }
      }
    }
  }
  const header = `${entries.length} datasets available. Use lookup transforms to join across datasets.`;
  const keyHint = joinKeys.length > 0 ? `
Join keys: ${joinKeys.join(", ")}` : "";
  return `${header}${keyHint}

${sections.join("\n\n")}`;
}
function metadataToContext(metadata) {
  const lines = [
    `Dataset: ${metadata.rowCount} rows, ${metadata.columns.length} columns`,
    "",
    "Columns:"
  ];
  for (const col of metadata.columns) {
    let desc = `- ${col.name} (${col.type})`;
    if (col.unique !== void 0) desc += ` \u2014 ${col.unique} unique values`;
    if (col.min !== void 0) desc += `, range: ${col.min}\u2013${col.max}`;
    if (col.dateRange) {
      desc += `, range: ${col.dateRange.min} to ${col.dateRange.max}, granularity: ${col.dateRange.granularity}`;
    }
    if (col.categorical) {
      desc += `: ${col.categorical.values.join(", ")}`;
    } else if (!col.dateRange && col.sample.length > 0) {
      desc += ` \u2014 sample: ${col.sample.slice(0, 3).join(", ")}`;
    }
    lines.push(desc);
  }
  const highCardCols = metadata.columns.filter(
    (c) => c.type === "string" && c.unique !== void 0 && c.unique > 30
  );
  if (highCardCols.length > 0) {
    lines.push("");
    lines.push("\u26A0 High-cardinality columns:");
    for (const col of highCardCols) {
      lines.push(`  - ${col.name}: ${col.unique} unique values \u2014 too many for a categorical axis. Consider filtering to top/bottom N, binning, or using a different chart type.`);
    }
  }
  const wideHints = detectWideFormat(metadata.columns);
  if (wideHints.length > 0) {
    lines.push("");
    lines.push("Wide-format columns detected:");
    for (const hint of wideHints) {
      lines.push(`  ${hint}`);
    }
  }
  return lines.join("\n");
}

// ../core/src/inject-data.ts
init_esm_shims();
function getDatasetUrl(data) {
  if (typeof data === "object" && data !== null && "url" in data) {
    const url = data.url;
    if (typeof url === "string") return url;
  }
  return null;
}
function replaceData(obj, datasets2, topLevel = false) {
  const clone = { ...obj };
  const dsUrl = getDatasetUrl(clone.data);
  if (dsUrl && datasets2[dsUrl]) {
    clone.data = { values: datasets2[dsUrl] };
  }
  if (topLevel && !clone.data && !clone.hconcat && !clone.vconcat && !clone.concat) {
    const firstKey = Object.keys(datasets2)[0];
    if (firstKey) clone.data = { values: datasets2[firstKey] };
  }
  if (Array.isArray(clone.transform)) {
    clone.transform = clone.transform.map((t) => {
      if (t.lookup && t.from && typeof t.from === "object") {
        const from = { ...t.from };
        const fromUrl = getDatasetUrl(from.data);
        if (fromUrl && datasets2[fromUrl]) {
          from.data = { values: datasets2[fromUrl] };
        }
        if (Array.isArray(t.fields) && !from.fields) {
          from.fields = t.fields;
          const { fields, ...rest } = t;
          return { ...rest, from };
        }
        return { ...t, from };
      }
      return t;
    });
  }
  if (Array.isArray(clone.layer)) {
    clone.layer = clone.layer.map((l) => replaceData(l, datasets2));
  }
  if (clone.spec && typeof clone.spec === "object") {
    clone.spec = replaceData(clone.spec, datasets2);
  }
  for (const key of ["hconcat", "vconcat", "concat"]) {
    if (Array.isArray(clone[key])) {
      clone[key] = clone[key].map((s) => replaceData(s, datasets2));
    }
  }
  return clone;
}
function injectData(spec, datasets2) {
  return replaceData(structuredClone(spec), datasets2, true);
}

// ../core/src/validate-spec.ts
init_esm_shims();
function createWarningLogger(warnings) {
  let _level = 0;
  const self2 = {
    level(v) {
      if (v !== void 0) {
        _level = v;
        return self2;
      }
      return _level;
    },
    warn(...args) {
      warnings.push(args.map(String).join(" "));
      return self2;
    },
    info() {
      return self2;
    },
    debug() {
      return self2;
    },
    error() {
      return self2;
    }
  };
  return self2;
}
function getSubSpecs(spec) {
  const subs = [];
  for (const key of ["layer", "hconcat", "vconcat", "concat"]) {
    const arr = spec[key];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (item && typeof item === "object") subs.push(item);
      }
    }
  }
  const inner = spec.spec;
  if (inner && typeof inner === "object") subs.push(inner);
  return subs;
}
function collectEncodingFields(spec) {
  const fields = [];
  const enc = spec.encoding;
  if (enc) {
    for (const ch of Object.values(enc)) {
      if (ch && typeof ch === "object" && typeof ch.field === "string") {
        fields.push(ch.field);
      }
    }
  }
  for (const sub of getSubSpecs(spec)) {
    fields.push(...collectEncodingFields(sub));
  }
  return fields;
}
function lintTransforms(spec) {
  const warnings = [];
  const transforms = spec.transform;
  if (Array.isArray(transforms)) {
    const aliasMap = /* @__PURE__ */ new Map();
    for (const t of transforms) {
      if (Array.isArray(t.aggregate)) {
        for (const agg of t.aggregate) {
          if (agg.field && !agg.as) {
            warnings.push(
              `Aggregate transform on "${agg.field}" is missing "as" alias. After aggregate, the field becomes "${agg.op}_${agg.field}" (not "${agg.field}"). Add "as": "total" (or similar) and use that alias in window sort and encoding.`
            );
          } else if (typeof agg.field === "string" && typeof agg.as === "string") {
            aliasMap.set(agg.field, agg.as);
          }
        }
      }
    }
    if (aliasMap.size > 0) {
      const encFields = collectEncodingFields(spec);
      for (const field of encFields) {
        const alias = aliasMap.get(field);
        if (alias) {
          warnings.push(
            `Encoding references "${field}" but an aggregate transform renamed it to "${alias}". After aggregate, the original column "${field}" no longer exists. Change the encoding field to "${alias}" and remove any inline "aggregate" on that channel.`
          );
        }
      }
    }
  }
  for (const sub of getSubSpecs(spec)) {
    warnings.push(...lintTransforms(sub));
  }
  return warnings;
}
function getPrimaryDatasetKey(spec, datasets2) {
  const data = spec.data;
  if (data && typeof data.url === "string" && datasets2[data.url]) {
    return data.url;
  }
  const firstKey = Object.keys(datasets2)[0];
  return firstKey ?? null;
}
function getColumns(datasets2, key) {
  const rows = datasets2[key];
  if (!rows || rows.length === 0) return /* @__PURE__ */ new Set();
  return new Set(Object.keys(rows[0]));
}
function buildAvailableFields(baseColumns, transforms) {
  const available = new Set(baseColumns);
  if (!Array.isArray(transforms)) return available;
  for (const t of transforms) {
    if (Array.isArray(t.aggregate)) {
      const groupby = t.groupby ?? [];
      const survivors = new Set(groupby);
      for (const agg of t.aggregate) {
        if (typeof agg.as === "string") survivors.add(agg.as);
      }
      available.clear();
      for (const f of survivors) available.add(f);
    }
    if (t.lookup && t.from && typeof t.from === "object") {
      const from = t.from;
      const fields = from.fields;
      const topFields = t.fields;
      for (const f of fields ?? topFields ?? []) available.add(f);
    }
    if (typeof t.calculate === "string" && typeof t.as === "string") {
      available.add(t.as);
    }
    if (Array.isArray(t.fold)) {
      const foldAs = t.as ?? ["key", "value"];
      for (const f of foldAs) available.add(f);
    }
    if (Array.isArray(t.flatten)) {
      const flatAs = t.as;
      for (let i = 0; i < t.flatten.length; i++) {
        available.add(flatAs?.[i] ?? t.flatten[i]);
      }
    }
    if (Array.isArray(t.window)) {
      for (const w of t.window) {
        if (typeof w.as === "string") available.add(w.as);
      }
    }
    if (t.bin !== void 0 && typeof t.field === "string") {
      if (typeof t.as === "string") {
        available.add(t.as);
      } else if (Array.isArray(t.as)) {
        for (const a of t.as) available.add(a);
      }
    }
    if (typeof t.timeUnit === "string" && typeof t.field === "string") {
      if (typeof t.as === "string") {
        available.add(t.as);
      } else {
        available.add(`${t.timeUnit}_${t.field}`);
      }
    }
  }
  return available;
}
function getMarkType(mark) {
  if (typeof mark === "string") return mark;
  if (mark && typeof mark === "object" && typeof mark.type === "string") {
    return mark.type;
  }
  return null;
}
function getChannelInfo(enc, channel) {
  const ch = enc[channel];
  if (ch && typeof ch === "object") return ch;
  return null;
}
function lintSpecPatterns(spec, datasets2) {
  const warnings = [];
  const layers = spec.layer;
  const topEnc = spec.encoding;
  if (Array.isArray(layers) && topEnc) {
    const hasRuleLayer = layers.some((l) => getMarkType(l.mark) === "rule");
    if (hasRuleLayer) {
      const xInfo = getChannelInfo(topEnc, "x");
      const yInfo = getChannelInfo(topEnc, "y");
      const xIsCategorical = xInfo && (xInfo.type === "nominal" || xInfo.type === "ordinal");
      const yIsCategorical = yInfo && (yInfo.type === "nominal" || yInfo.type === "ordinal");
      if (xIsCategorical || yIsCategorical) {
        warnings.push(
          `A rule mark in a layer inherits shared categorical encoding. This renders vertical/horizontal lines at each category instead of a single reference line. Move each layer's encoding inside the layer object instead of sharing at top level.`
        );
      }
    }
  }
  const specsToCheck = [spec];
  if (Array.isArray(layers)) {
    for (const l of layers) {
      if (l && typeof l === "object") specsToCheck.push(l);
    }
  }
  for (const s of specsToCheck) {
    const sMarkType = getMarkType(s.mark);
    const sEnc = s.encoding;
    if (sMarkType === "point" && sEnc) {
      const hasInlineAggregate = Object.values(sEnc).some(
        (ch) => ch && typeof ch === "object" && typeof ch.aggregate === "string"
      );
      const transforms = s.transform ?? spec.transform;
      const hasTransformGroupby = Array.isArray(transforms) && transforms.some(
        (t) => Array.isArray(t.aggregate) && Array.isArray(t.groupby) && t.groupby.length > 0
      );
      if (hasInlineAggregate && !hasTransformGroupby) {
        warnings.push(
          `Point/scatter mark with inline aggregate may collapse all data to a single point. Use a transform with explicit "groupby" instead of inline aggregate in encoding.`
        );
      }
    }
  }
  const enc = spec.encoding;
  if (enc) {
    const primaryKey = getPrimaryDatasetKey(spec, datasets2);
    const rows = primaryKey ? datasets2[primaryKey] : void 0;
    for (const [channel, chSpec] of Object.entries(enc)) {
      if (!chSpec || typeof chSpec !== "object") continue;
      const chType = chSpec.type;
      const chField = chSpec.field;
      if (typeof chField !== "string") continue;
      let uniqueCount = null;
      if (rows && rows.length > 0) {
        const uniqueValues = new Set(rows.map((r) => r[chField]));
        uniqueCount = uniqueValues.size;
      }
      if ((channel === "x" || channel === "y") && chType === "nominal" && uniqueCount !== null && uniqueCount > 20) {
        warnings.push(
          `Field "${chField}" on ${channel}-axis has ${uniqueCount} unique values. Consider filtering to top/bottom N for readability.`
        );
      }
      if (channel === "shape" && uniqueCount !== null && uniqueCount > 6) {
        warnings.push(
          `Field "${chField}" in shape encoding has ${uniqueCount} unique values, but Vega-Lite only supports 6 distinct shapes. Values beyond 6 will reuse shapes, making them indistinguishable. Consider using color instead, or filter to \u22646 categories.`
        );
      }
      if (channel === "color" && chType === "nominal" && uniqueCount !== null && uniqueCount > 20) {
        warnings.push(
          `Field "${chField}" in color encoding has ${uniqueCount} unique values. The legend will be very long and colors hard to distinguish. Consider filtering to top/bottom N or grouping smaller categories.`
        );
      }
    }
  }
  for (const sub of getSubSpecs(spec)) {
    warnings.push(...lintSpecPatterns(sub, datasets2));
  }
  return warnings;
}
function findAggregateGroupby(transforms) {
  if (!Array.isArray(transforms)) return null;
  for (const t of transforms) {
    if (Array.isArray(t.aggregate)) {
      return t.groupby ?? [];
    }
  }
  return null;
}
function lintFieldReferences(spec, datasets2) {
  const warnings = [];
  const primaryKey = getPrimaryDatasetKey(spec, datasets2);
  if (!primaryKey) return warnings;
  const primaryColumns = getColumns(datasets2, primaryKey);
  if (primaryColumns.size === 0) return warnings;
  const transforms = spec.transform;
  const available = buildAvailableFields(primaryColumns, transforms);
  const aggregateGroupby = findAggregateGroupby(transforms);
  const encFields = collectEncodingFields(spec);
  for (const field of encFields) {
    if (available.has(field)) continue;
    if (aggregateGroupby !== null && primaryColumns.has(field)) {
      warnings.push(
        `Field "${field}" exists in the dataset but is not available after the aggregate transform. Add "${field}" to the aggregate's "groupby" array to preserve it.`
      );
      continue;
    }
    let foundIn = null;
    for (const [dsKey, rows] of Object.entries(datasets2)) {
      if (dsKey === primaryKey || rows.length === 0) continue;
      if (Object.keys(rows[0]).includes(field)) {
        foundIn = dsKey;
        break;
      }
    }
    if (foundIn) {
      const otherColumns = getColumns(datasets2, foundIn);
      const sharedKeys = [...primaryColumns].filter((c) => otherColumns.has(c));
      const keyHint = sharedKeys.length > 0 ? ` using shared key "${sharedKeys[0]}"` : "";
      warnings.push(
        `Field "${field}" is not in "${primaryKey}". It exists in "${foundIn}" \u2014 add a lookup transform${keyHint} to join it.`
      );
    } else {
      warnings.push(
        `Field "${field}" not found in any loaded dataset or transform alias.`
      );
    }
  }
  return warnings;
}
function validateSpec(spec, datasets2) {
  if (typeof spec.$schema === "string") {
    const schemaUrl = spec.$schema;
    if (!/^https:\/\/vega\.github\.io\/schema\/vega-lite\/v6\.json$/.test(schemaUrl)) {
      return {
        valid: false,
        error: `Invalid $schema: "${schemaUrl}". Must be a valid Vega-Lite v6 schema URL (https://vega.github.io/schema/vega-lite/v6.json), or omit $schema entirely.`
      };
    }
  }
  try {
    const fullSpec = injectData(spec, datasets2);
    const warnings = [];
    warnings.push(...lintTransforms(spec));
    warnings.push(...lintFieldReferences(spec, datasets2));
    warnings.push(...lintSpecPatterns(spec, datasets2));
    vl.compile(fullSpec, {
      logger: createWarningLogger(warnings)
    });
    return { valid: true, warnings };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

// ../core/src/themes.ts
init_esm_shims();
var DEFAULT_CONFIG = {
  font: "system-ui, -apple-system, sans-serif",
  axis: {
    labelFont: "system-ui, -apple-system, sans-serif",
    titleFont: "system-ui, -apple-system, sans-serif",
    gridColor: "#e5e5e5",
    gridOpacity: 0.8,
    domainColor: "#888",
    tickColor: "#888"
  },
  title: {
    font: "system-ui, -apple-system, sans-serif",
    fontSize: 16,
    fontWeight: 600,
    anchor: "start",
    subtitleFont: "system-ui, -apple-system, sans-serif",
    subtitleFontSize: 13,
    subtitleColor: "#666",
    subtitlePadding: 8,
    offset: 16
  },
  legend: {
    labelFont: "system-ui, -apple-system, sans-serif",
    titleFont: "system-ui, -apple-system, sans-serif"
  },
  range: { category: { scheme: "tableau10" } },
  view: { stroke: null },
  padding: { top: 16, bottom: 16, left: 16, right: 16 }
};
function getThemeConfig(themeId) {
  if (themeId === "default") return DEFAULT_CONFIG;
  const themeConfig = themes[themeId];
  if (!themeConfig) return DEFAULT_CONFIG;
  const t = themeConfig;
  const config = { ...DEFAULT_CONFIG };
  if (t.range) config.range = t.range;
  if (t.background) config.background = t.background;
  if (t.style) config.style = t.style;
  if (t.axis) {
    const themeAxis = t.axis;
    config.axis = {
      ...config.axis,
      ...themeAxis.domainColor != null && { domainColor: themeAxis.domainColor },
      ...themeAxis.gridColor != null && { gridColor: themeAxis.gridColor },
      ...themeAxis.tickColor != null && { tickColor: themeAxis.tickColor }
    };
  }
  if (t.title) {
    const themeTitle = t.title;
    config.title = {
      ...config.title,
      ...themeTitle.color != null && { color: themeTitle.color },
      ...themeTitle.subtitleColor != null && { subtitleColor: themeTitle.subtitleColor }
    };
  }
  return config;
}

// ../core/src/spec-schema.ts
init_esm_shims();
var encodingChannelSchema = z.record(z.string(), z.unknown()).describe("Vega-Lite encoding channel: { field, type (quantitative/nominal/ordinal/temporal), aggregate, bin, timeUnit, scale, axis, legend, sort, stack, title, tooltip, ... }");
var vlMarkSchema = z.union([
  z.string().describe("Mark type: bar, line, area, point, rect, rule, text, tick, arc, boxplot, errorbar, errorband, trail, square, circle"),
  z.object({ type: z.string() }).loose().describe("Mark with properties: { type, tooltip, opacity, ... }")
]);
var vlUnitSchema = z.lazy(() => z.object({
  data: z.object({ url: z.string() }).optional(),
  mark: vlMarkSchema.optional(),
  encoding: z.record(z.string(), encodingChannelSchema).optional(),
  transform: z.array(z.record(z.string(), z.unknown())).optional(),
  layer: z.array(vlUnitSchema).optional(),
  title: z.union([z.string(), z.object({ text: z.string(), subtitle: z.string().optional() }).loose()]).optional(),
  width: z.union([z.number(), z.literal("container")]).optional(),
  height: z.union([z.number(), z.literal("container")]).optional()
}));
function createVlSpecSchema(datasetNames) {
  const dataDesc = 'Use { url: "<filename>" } to reference the uploaded dataset';
  return z.object({
    data: z.object({ url: z.string() }).optional().describe(dataDesc),
    mark: vlMarkSchema.optional(),
    encoding: z.record(z.string(), encodingChannelSchema).optional().describe("Encoding channels: x, y, color, size, shape, opacity, theta, radius, text, tooltip, row, column, facet, detail, order"),
    transform: z.array(z.record(z.string(), z.unknown())).optional().describe("Array of transforms: filter, calculate, fold, aggregate, bin, window, lookup, flatten, pivot, regression, loess, density"),
    layer: z.array(vlUnitSchema).optional().describe("Array of layered specs (each with mark + encoding)"),
    hconcat: z.array(vlUnitSchema).optional().describe("Array of specs displayed horizontally side-by-side"),
    vconcat: z.array(vlUnitSchema).optional().describe("Array of specs stacked vertically"),
    facet: z.record(z.string(), z.unknown()).optional().describe("Facet field for small multiples"),
    repeat: z.unknown().optional().describe("Repeat spec for repeated views"),
    spec: vlUnitSchema.optional().describe("Inner spec for facet/repeat"),
    resolve: z.record(z.string(), z.unknown()).optional().describe("Resolve shared/independent scales across layers/facets"),
    title: z.union([z.string(), z.object({ text: z.string(), subtitle: z.string().optional() }).loose()]).optional(),
    width: z.union([z.number(), z.literal("container")]).optional(),
    height: z.union([z.number(), z.literal("container")]).optional()
  });
}
createVlSpecSchema();

// ../core/src/system-prompt.ts
init_esm_shims();

// ../core/src/docs.ts
init_esm_shims();

// ../core/src/tools.ts
init_esm_shims();

// ../core/src/prune-context.ts
init_esm_shims();

// src/tools/load-csv.ts
function registerLoadCsv(server2, datasets2) {
  server2.tool(
    "load_csv",
    "Load and parse a CSV file. Returns column metadata (names, types, sample values). Supports loading multiple CSVs.",
    { path: z.string().describe("Absolute path to the CSV file") },
    async ({ path: csvPath }) => {
      try {
        const ext = path3.extname(csvPath).toLowerCase();
        if (ext !== ".csv" && ext !== ".tsv") {
          return {
            content: [{ type: "text", text: `Error: Expected a .csv or .tsv file, got "${ext || "no extension"}"` }],
            isError: true
          };
        }
        const text = await fs2.readFile(csvPath, "utf8");
        const parsed = parseCSVString(text);
        const name = csvPath.split("/").pop() ?? csvPath;
        datasets2[name] = parsed;
        const context = Object.keys(datasets2).length > 1 ? datasetsToContext(datasets2) : `Dataset "${name}" (reference with \`{ "url": "${name}" }\`):
${metadataToContext(parsed.metadata)}`;
        return { content: [{ type: "text", text: context }] };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error loading CSV: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true
        };
      }
    }
  );
}

// src/tools/validate-chart.ts
init_esm_shims();
function registerValidateChart(server2, datasets2) {
  server2.tool(
    "validate_chart",
    "Validate a Vega-Lite spec against the compiler. Returns errors or warnings.",
    { spec: z.record(z.string(), z.unknown()).describe("Vega-Lite chart specification as JSON") },
    async ({ spec }) => {
      const dataRows = {};
      for (const [name, parsed] of Object.entries(datasets2)) {
        dataRows[name] = parsed.data;
      }
      const result = validateSpec(spec, dataRows);
      if (result.valid) {
        const msg = result.warnings.length > 0 ? `Spec is valid with warnings:
${result.warnings.map((w) => `- ${w}`).join("\n")}` : "Spec is valid.";
        return { content: [{ type: "text", text: msg }] };
      }
      return {
        content: [{ type: "text", text: `Spec is invalid: ${result.error}` }],
        isError: true
      };
    }
  );
}

// src/tools/render-chart.ts
init_esm_shims();

// ../core/src/renderer.ts
init_esm_shims();
function createWarningLogger2(warnings) {
  let _level = 0;
  const self2 = {
    level(v) {
      if (v !== void 0) {
        _level = v;
        return self2;
      }
      return _level;
    },
    warn(...args) {
      warnings.push(args.map(String).join(" "));
      return self2;
    },
    info() {
      return self2;
    },
    debug() {
      return self2;
    },
    error() {
      return self2;
    }
  };
  return self2;
}
async function renderChart(spec, datasets2, themeId = "default") {
  try {
    const warnings = [];
    const logger = createWarningLogger2(warnings);
    const withData = injectData(spec, datasets2);
    const config = getThemeConfig(themeId);
    const compiled = vl.compile(withData, { config, logger });
    const view = new vega.View(vega.parse(compiled.spec), {
      renderer: "none",
      logger
    });
    await view.runAsync();
    const svg = await view.toSVG();
    view.finalize();
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 900 }
    });
    const rendered = resvg.render();
    const png = Buffer.from(rendered.asPng());
    return { png, warnings };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// src/tools/render-chart.ts
function registerRenderChart(server2, datasets2) {
  server2.tool(
    "render_chart",
    `Render a Vega-Lite spec to a PNG image. Returns the file path of the saved image.

After rendering, you MUST use the Read tool to view the PNG and evaluate its quality. If the chart has issues (wrong encoding, poor readability, missing labels, etc.), fix the spec and render again. Once the chart looks good, call the open_interactive tool with the same spec to open it in the user's browser.`,
    {
      spec: z.record(z.string(), z.unknown()).describe("Vega-Lite chart specification"),
      theme: z.string().optional().describe("Theme ID (default, dark, excel, fivethirtyeight, ggplot2, googlecharts, latimes, powerbi, quartz, urbaninstitute, vox)"),
      outputPath: z.string().optional().describe("Custom output path for the PNG file")
    },
    async ({ spec, theme, outputPath }) => {
      try {
        const dataRows = {};
        for (const [name, parsed] of Object.entries(datasets2)) {
          dataRows[name] = parsed.data;
        }
        const result = await renderChart(spec, dataRows, theme ?? "default");
        if (result.error) {
          return {
            content: [{ type: "text", text: `Render error: ${result.error}` }],
            isError: true
          };
        }
        const png = result.png;
        const warnings = result.warnings;
        const tmpDir = path3.join(os.tmpdir(), "chartroom");
        await fs2.mkdir(tmpDir, { recursive: true });
        const filePath = outputPath ?? path3.join(tmpDir, `chart-${Date.now()}.png`);
        await fs2.writeFile(filePath, png);
        const warningText = warnings.length > 0 ? `
Warnings:
${warnings.map((w) => `- ${w}`).join("\n")}` : "";
        return {
          content: [{ type: "text", text: `Chart rendered and saved to: ${filePath}${warningText}

Use the Read tool to view the PNG and evaluate it. If the chart looks good, call open_interactive with the same spec to open it in the browser.` }]
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true
        };
      }
    }
  );
}

// src/tools/open-interactive.ts
init_esm_shims();
function openInBrowser(filePath) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  execFile(cmd, [filePath]);
}
function registerOpenInteractive(server2, datasets2) {
  server2.tool(
    "open_interactive",
    "Open the chart interactively in the user's default browser with hover tooltips and panning.",
    {
      spec: z.record(z.string(), z.unknown()).describe("Vega-Lite chart specification"),
      theme: z.string().optional().describe("Theme ID (default, dark, excel, fivethirtyeight, ggplot2, googlecharts, latimes, powerbi, quartz, urbaninstitute, vox)")
    },
    async ({ spec, theme }) => {
      try {
        const dataRows = {};
        for (const [name, parsed] of Object.entries(datasets2)) {
          dataRows[name] = parsed.data;
        }
        const withData = injectData(spec, dataRows);
        const themeId = theme ?? "default";
        const config = getThemeConfig(themeId);
        const fullSpec = { width: 600, height: 400, ...withData };
        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Chartroom \u2014 Interactive View</title>
  <script src="https://cdn.jsdelivr.net/npm/vega@6"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-lite@6"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
  <style>
    body { margin: 0; display: flex; justify-content: center; padding: 32px; background: #fafafa; font-family: system-ui; }
    #chart { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script>
    vegaEmbed('#chart', ${JSON.stringify(fullSpec)}, {
      config: ${JSON.stringify(config)},
      renderer: 'svg'
    });
  </script>
</body>
</html>`;
        const tmpDir = "/tmp/chartroom";
        await fs2.mkdir(tmpDir, { recursive: true });
        const filePath = path3.join(tmpDir, `interactive-${Date.now()}.html`);
        await fs2.writeFile(filePath, html);
        openInBrowser(filePath);
        return {
          content: [{ type: "text", text: `Interactive chart opened in browser: ${filePath}` }]
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true
        };
      }
    }
  );
}

// package.json
var package_default = {
  version: "0.1.3"};

// src/server.ts
var datasets = {};
var server = new McpServer({
  name: "chartroom",
  version: package_default.version
});
registerLoadCsv(server, datasets);
registerValidateChart(server, datasets);
registerRenderChart(server, datasets);
registerOpenInteractive(server, datasets);
var transport = new StdioServerTransport();
await server.connect(transport);
/*! Bundled license information:

papaparse/papaparse.js:
  (* @license
  Papa Parse
  v5.5.3
  https://github.com/mholt/PapaParse
  License: MIT
  *)
*/
