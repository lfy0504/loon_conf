/*
 * Loon parser for AnyTLS subscriptions that require User-Agent: shadowrocket.
 * It ignores the native download result and refetches $resourceUrl with the
 * required UA, then converts anytls:// URIs into Loon AnyTLS node lines.
 */
(function () {
  var nativeText = typeof $resource !== "undefined" ? String($resource || "") : "";
  var resourceUrl = typeof $resourceUrl !== "undefined" ? String($resourceUrl || "") : "";
  var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

  function log(msg) {
    try { console.log("[UA-PARSER] " + msg); } catch (e) {}
  }

  function b64decode(input) {
    var str = String(input || "").replace(/[\r\n\t ]/g, "").replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    var out = "";
    var buf = 0;
    var bits = 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      if (ch === "=") break;
      var idx = B64.indexOf(ch);
      if (idx < 0) continue;
      buf = (buf << 6) | idx;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        out += String.fromCharCode((buf >> bits) & 0xff);
      }
    }
    return out;
  }

  function utf8Decode(binary) {
    var out = "";
    for (var i = 0; i < binary.length; i++) {
      var c = binary.charCodeAt(i);
      if (c < 0x80) {
        out += String.fromCharCode(c);
      } else if (c < 0xe0) {
        out += String.fromCharCode(((c & 0x1f) << 6) | (binary.charCodeAt(++i) & 0x3f));
      } else if (c < 0xf0) {
        out += String.fromCharCode(
          ((c & 0x0f) << 12) |
          ((binary.charCodeAt(++i) & 0x3f) << 6) |
          (binary.charCodeAt(++i) & 0x3f)
        );
      } else {
        var cp = ((c & 0x07) << 18) |
          ((binary.charCodeAt(++i) & 0x3f) << 12) |
          ((binary.charCodeAt(++i) & 0x3f) << 6) |
          (binary.charCodeAt(++i) & 0x3f);
        cp -= 0x10000;
        out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
      }
    }
    return out;
  }

  function decodeComponent(value) {
    try { return decodeURIComponent(value || ""); } catch (e) { return value || ""; }
  }

  function parseQuery(query) {
    var result = {};
    if (!query) return result;
    var parts = query.split("&");
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      var at = parts[i].indexOf("=");
      var key = at < 0 ? parts[i] : parts[i].slice(0, at);
      var val = at < 0 ? "" : parts[i].slice(at + 1);
      result[decodeComponent(key)] = decodeComponent(val);
    }
    return result;
  }

  function parseAnyTLS(line) {
    var m = /^anytls:\/\/([^@]+)@([^\/:]+):(\d+)\/?(?:\?([^#]*))?(?:#(.*))?$/i.exec(line);
    if (!m) return "";
    var password = decodeComponent(m[1]);
    var host = m[2];
    var port = m[3];
    var query = parseQuery(m[4] || "");
    var name = decodeComponent(m[5] || "") || ("AnyTLS-" + host + "-" + port);
    name = name.replace(/,/g, "，").replace(/=/g, "＝");
    var opts = [];
    var sni = query.sni || query.servername || query.serverName || query.peer;
    if (sni) opts.push("sni=" + sni);
    if (query.insecure === "1" || query.allowinsecure === "1" || query["skip-cert-verify"] === "1") {
      opts.push("skip-cert-verify=true");
    }
    opts.push("udp=true");
    return name + " = AnyTLS," + host + "," + port + ',"' + password + '",' + opts.join(",");
  }

  function parseResource(text) {
    var raw = String(text || "").trim();
    if (!raw) return [];
    var decoded = raw.indexOf("anytls://") >= 0 ? raw : utf8Decode(b64decode(raw));
    var lines = decoded.split(/\r?\n/);
    var nodes = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf("anytls://") !== 0) continue;
      var node = parseAnyTLS(line);
      if (node) nodes.push(node);
    }
    return nodes;
  }

  function finish(text, source) {
    var nodes = parseResource(text);
    if (!nodes.length && nativeText && text !== nativeText) {
      nodes = parseResource(nativeText);
      source = "native-fallback";
    }
    log("source=" + source + " nodes=" + nodes.length);
    $done(nodes.length ? nodes.join("\n") : nativeText);
  }

  if (!resourceUrl) {
    log("missing $resourceUrl, fallback native");
    finish(nativeText, "native");
    return;
  }

  log("fetch " + resourceUrl);
  if (typeof $httpClient === "undefined" || !$httpClient) {
    log("missing $httpClient, fallback native");
    finish(nativeText, "native");
    return;
  }

  $httpClient.get({
    url: resourceUrl,
    headers: {
      "User-Agent": "shadowrocket",
      "Cache-Control": "no-cache"
    },
    timeout: 15000
  }, function (error, response, data) {
    var status = response && (response.status || response.statusCode);
    log("status=" + (status === undefined ? "unknown" : status) + " error=" + (error ? String(error) : "none"));
    if (error || !data) {
      finish(nativeText, "native");
      return;
    }
    finish(String(data), "ua-fetch");
  });
})();
