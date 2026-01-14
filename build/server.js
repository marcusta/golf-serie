// @bun
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || undefined;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/hono/dist/utils/body.js
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== undefined) {
    if (Array.isArray(form[key])) {
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    form[key] = value;
  }
};
var handleParsingNestedValues = (form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match, index) => {
    const mark = `@${index}`;
    groups.push([mark, match]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1;i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1;j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match[1], new RegExp(`^${match[2]}(?=/${next})`)] : [label, match[1], new RegExp(`^${match[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
      try {
        return decoder(match);
      } catch {
        return match;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", 8);
  let i = start;
  for (;i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const path = url.slice(start, queryIndex === -1 ? undefined : queryIndex);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? decodeURIComponent_(value) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf(`?${key}`, 8);
    if (keyIndex2 === -1) {
      keyIndex2 = url.indexOf(`&${key}`, 8);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? undefined : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? undefined : nextKeyIndex : valueIndex);
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? undefined : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = (str) => tryDecode(str, decodeURIComponent_);
var HonoRequest = class {
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param ? /\%/.test(param) ? tryDecodeURIComponent(param) : param : undefined;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value && typeof value === "string") {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? undefined;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw[key]();
  };
  json() {
    return this.#cachedBody("json");
  }
  text() {
    return this.#cachedBody("text");
  }
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  blob() {
    return this.#cachedBody("blob");
  }
  formData() {
    return this.#cachedBody("formData");
  }
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then((res) => Promise.all(res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))).then(() => buffer[0]));
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setHeaders = (headers, map = {}) => {
  for (const key of Object.keys(map)) {
    headers.set(key, map[key]);
  }
  return headers;
};
var Context = class {
  #rawRequest;
  #req;
  env = {};
  #var;
  finalized = false;
  error;
  #status = 200;
  #executionCtx;
  #headers;
  #preparedHeaders;
  #res;
  #isFresh = true;
  #layout;
  #renderer;
  #notFoundHandler;
  #matchResult;
  #path;
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  get res() {
    this.#isFresh = false;
    return this.#res ||= new Response("404 Not Found", { status: 404 });
  }
  set res(_res) {
    this.#isFresh = false;
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  setLayout = (layout) => this.#layout = layout;
  getLayout = () => this.#layout;
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    if (value === undefined) {
      if (this.#headers) {
        this.#headers.delete(name);
      } else if (this.#preparedHeaders) {
        delete this.#preparedHeaders[name.toLocaleLowerCase()];
      }
      if (this.finalized) {
        this.res.headers.delete(name);
      }
      return;
    }
    if (options?.append) {
      if (!this.#headers) {
        this.#isFresh = false;
        this.#headers = new Headers(this.#preparedHeaders);
        this.#preparedHeaders = {};
      }
      this.#headers.append(name, value);
    } else {
      if (this.#headers) {
        this.#headers.set(name, value);
      } else {
        this.#preparedHeaders ??= {};
        this.#preparedHeaders[name.toLowerCase()] = value;
      }
    }
    if (this.finalized) {
      if (options?.append) {
        this.res.headers.append(name, value);
      } else {
        this.res.headers.set(name, value);
      }
    }
  };
  status = (status) => {
    this.#isFresh = false;
    this.#status = status;
  };
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map;
    this.#var.set(key, value);
  };
  get = (key) => {
    return this.#var ? this.#var.get(key) : undefined;
  };
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    if (this.#isFresh && !headers && !arg && this.#status === 200) {
      return new Response(data, {
        headers: this.#preparedHeaders
      });
    }
    if (arg && typeof arg !== "number") {
      const header = new Headers(arg.headers);
      if (this.#headers) {
        this.#headers.forEach((v, k) => {
          if (k === "set-cookie") {
            header.append(k, v);
          } else {
            header.set(k, v);
          }
        });
      }
      const headers2 = setHeaders(header, this.#preparedHeaders);
      return new Response(data, {
        headers: headers2,
        status: arg.status ?? this.#status
      });
    }
    const status = typeof arg === "number" ? arg : this.#status;
    this.#preparedHeaders ??= {};
    this.#headers ??= new Headers;
    setHeaders(this.#headers, this.#preparedHeaders);
    if (this.#res) {
      this.#res.headers.forEach((v, k) => {
        if (k === "set-cookie") {
          this.#headers?.append(k, v);
        } else {
          this.#headers?.set(k, v);
        }
      });
      setHeaders(this.#headers, this.#preparedHeaders);
    }
    headers ??= {};
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === "string") {
        this.#headers.set(k, v);
      } else {
        this.#headers.delete(k);
        for (const v2 of v) {
          this.#headers.append(k, v2);
        }
      }
    }
    return new Response(data, {
      status,
      headers: this.#headers
    });
  }
  newResponse = (...args) => this.#newResponse(...args);
  body = (data, arg, headers) => {
    return typeof arg === "number" ? this.#newResponse(data, arg, headers) : this.#newResponse(data, arg);
  };
  text = (text, arg, headers) => {
    if (!this.#preparedHeaders) {
      if (this.#isFresh && !headers && !arg) {
        return new Response(text);
      }
      this.#preparedHeaders = {};
    }
    this.#preparedHeaders["content-type"] = TEXT_PLAIN;
    if (typeof arg === "number") {
      return this.#newResponse(text, arg, headers);
    }
    return this.#newResponse(text, arg);
  };
  json = (object, arg, headers) => {
    const body = JSON.stringify(object);
    this.#preparedHeaders ??= {};
    this.#preparedHeaders["content-type"] = "application/json";
    return typeof arg === "number" ? this.#newResponse(body, arg, headers) : this.#newResponse(body, arg);
  };
  html = (html, arg, headers) => {
    this.#preparedHeaders ??= {};
    this.#preparedHeaders["content-type"] = "text/html; charset=UTF-8";
    if (typeof html === "object") {
      return resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then((html2) => {
        return typeof arg === "number" ? this.#newResponse(html2, arg, headers) : this.#newResponse(html2, arg);
      });
    }
    return typeof arg === "number" ? this.#newResponse(html, arg, headers) : this.#newResponse(html, arg);
  };
  redirect = (location, status) => {
    this.#headers ??= new Headers;
    this.#headers.set("Location", String(location));
    return this.newResponse(null, status ?? 302);
  };
  notFound = () => {
    this.#notFoundHandler ??= () => new Response;
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    return err.getResponse();
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  route(path, app) {
    const subApp = this.basePath(path);
    app.routes.map((r) => {
      let handler;
      if (app.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = undefined;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`, requestInit), Env, executionCtx);
  };
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, undefined, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== undefined) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some((k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR)) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new Node;
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some((k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR)) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new Node;
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node;
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0;; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1;i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1;j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== undefined) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== undefined) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var emptyParam = [];
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(path === "*" ? "" : `^${path.replace(/\/\*$|([.\\+*[^\]$()])/g, (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)")}$`);
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie;
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map((route) => [!/\*|\/:/.test(route[0]), ...route]).sort(([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length);
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length;i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (;paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length;i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length;j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length;k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach((p) => re.test(p) && routes[m][p].push([handler, paramCount]));
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length;i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match(method, path) {
    clearWildcardRegExpCache();
    const matchers = this.#buildAllMatchers();
    this.match = (method2, path2) => {
      const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
      const staticMatch = matcher[2][path2];
      if (staticMatch) {
        return staticMatch;
      }
      const match = path2.match(matcher[0]);
      if (!match) {
        return [[], emptyParam];
      }
      const index = match.indexOf("", 1);
      return [matcher[1][index], match];
    };
    return this.match(method, path);
  }
  #buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = undefined;
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]]));
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (;i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length;i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = undefined;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length;i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (Object.keys(curNode.#children).includes(key)) {
        curNode = curNode.#children[key];
        const pattern2 = getPattern(p, nextP);
        if (pattern2) {
          possibleKeys.push(pattern2[1]);
        }
        continue;
      }
      curNode.#children[key] = new Node2;
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    const m = /* @__PURE__ */ Object.create(null);
    const handlerSet = {
      handler,
      possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
      score: this.#order
    };
    m[method] = handlerSet;
    curNode.#methods.push(m);
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length;i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== undefined) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length;i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    for (let i = 0, len = parts.length;i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length;j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(...this.#getHandlerSets(nextNode.#children["*"], method, node.#params));
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length;k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          if (part === "") {
            continue;
          }
          const [key, name, matcher] = pattern;
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp) {
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(...this.#getHandlerSets(child.#children["*"], method, params, node.#params));
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2;
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length;i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter, new TrieRouter]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = (options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  return async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    const allowOrigin = findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.origin !== "*") {
      const existingVary = c.req.header("Vary");
      if (existingVary) {
        set("Vary", existingVary);
      } else {
        set("Vary", "Origin");
      }
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      if (opts.allowMethods?.length) {
        set("Access-Control-Allow-Methods", opts.allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
  };
};

// node_modules/hono/dist/utils/cookie.js
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var parse = (cookie, name) => {
  if (name && cookie.indexOf(name) === -1) {
    return {};
  }
  const pairs = cookie.trim().split(";");
  const parsedCookie = {};
  for (let pairStr of pairs) {
    pairStr = pairStr.trim();
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) {
      continue;
    }
    const cookieName = pairStr.substring(0, valueStartPos).trim();
    if (name && name !== cookieName || !validCookieNameRegEx.test(cookieName)) {
      continue;
    }
    let cookieValue = pairStr.substring(valueStartPos + 1).trim();
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
      cookieValue = cookieValue.slice(1, -1);
    }
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] = decodeURIComponent_(cookieValue);
      if (name) {
        break;
      }
    }
  }
  return parsedCookie;
};
var _serialize = (name, value, opt = {}) => {
  let cookie = `${name}=${value}`;
  if (name.startsWith("__Secure-") && !opt.secure) {
    throw new Error("__Secure- Cookie must have Secure attributes");
  }
  if (name.startsWith("__Host-")) {
    if (!opt.secure) {
      throw new Error("__Host- Cookie must have Secure attributes");
    }
    if (opt.path !== "/") {
      throw new Error('__Host- Cookie must have Path attributes with "/"');
    }
    if (opt.domain) {
      throw new Error("__Host- Cookie must not have Domain attributes");
    }
  }
  if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
    if (opt.maxAge > 34560000) {
      throw new Error("Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration.");
    }
    cookie += `; Max-Age=${opt.maxAge | 0}`;
  }
  if (opt.domain && opt.prefix !== "host") {
    cookie += `; Domain=${opt.domain}`;
  }
  if (opt.path) {
    cookie += `; Path=${opt.path}`;
  }
  if (opt.expires) {
    if (opt.expires.getTime() - Date.now() > 34560000000) {
      throw new Error("Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future.");
    }
    cookie += `; Expires=${opt.expires.toUTCString()}`;
  }
  if (opt.httpOnly) {
    cookie += "; HttpOnly";
  }
  if (opt.secure) {
    cookie += "; Secure";
  }
  if (opt.sameSite) {
    cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
  }
  if (opt.priority) {
    cookie += `; Priority=${opt.priority}`;
  }
  if (opt.partitioned) {
    if (!opt.secure) {
      throw new Error("Partitioned Cookie must have Secure attributes");
    }
    cookie += "; Partitioned";
  }
  return cookie;
};
var serialize = (name, value, opt) => {
  value = encodeURIComponent(value);
  return _serialize(name, value, opt);
};

// node_modules/hono/dist/helper/cookie/index.js
var getCookie = (c, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) {
      return;
    }
    let finalKey = key;
    if (prefix === "secure") {
      finalKey = "__Secure-" + key;
    } else if (prefix === "host") {
      finalKey = "__Host-" + key;
    }
    const obj2 = parse(cookie, finalKey);
    return obj2[finalKey];
  }
  if (!cookie) {
    return {};
  }
  const obj = parse(cookie);
  return obj;
};
var setCookie = (c, name, value, opt) => {
  let cookie;
  if (opt?.prefix === "secure") {
    cookie = serialize("__Secure-" + name, value, { path: "/", ...opt, secure: true });
  } else if (opt?.prefix === "host") {
    cookie = serialize("__Host-" + name, value, {
      ...opt,
      path: "/",
      secure: true,
      domain: undefined
    });
  } else {
    cookie = serialize(name, value, { path: "/", ...opt });
  }
  c.header("Set-Cookie", cookie, { append: true });
};
var deleteCookie = (c, name, opt) => {
  const deletedCookie = getCookie(c, name, opt?.prefix);
  setCookie(c, name, "", { ...opt, maxAge: 0 });
  return deletedCookie;
};

// src/api/auth.ts
function createAuthApi(authService) {
  const app = new Hono2;
  app.post("/register", async (c) => {
    try {
      const { email, password, role } = await c.req.json();
      if (!email || !password) {
        return c.json({ error: "Email and password are required" }, 400);
      }
      const userRole = role === "ADMIN" || role === "SUPER_ADMIN" ? "PLAYER" : "PLAYER";
      const user = await authService.register(email, password, userRole);
      return c.json({ user }, 201);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.post("/login", async (c) => {
    try {
      const { email, password } = await c.req.json();
      if (!email || !password) {
        return c.json({ error: "Email and password are required" }, 400);
      }
      const { sessionId, user } = await authService.login(email, password);
      setCookie(c, "session_id", sessionId, {
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/"
      });
      return c.json({ user });
    } catch (error) {
      return c.json({ error: error.message }, 401);
    }
  });
  app.post("/logout", async (c) => {
    const sessionId = c.req.header("Cookie")?.match(/session_id=([^;]+)/)?.[1];
    if (sessionId) {
      await authService.logout(sessionId);
    }
    deleteCookie(c, "session_id", { path: "/" });
    return c.json({ success: true });
  });
  app.get("/me", (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ user: null });
    }
    return c.json({ user });
  });
  app.put("/email", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }
    try {
      const { newEmail, currentPassword } = await c.req.json();
      if (!newEmail || !currentPassword) {
        return c.json({ error: "New email and current password are required" }, 400);
      }
      const result = await authService.updateEmail(user.id, newEmail, currentPassword);
      return c.json({ email: result.email });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.put("/password", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }
    try {
      const { currentPassword, newPassword } = await c.req.json();
      if (!currentPassword || !newPassword) {
        return c.json({ error: "Current password and new password are required" }, 400);
      }
      await authService.updatePassword(user.id, currentPassword, newPassword);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  return app;
}

// src/api/clubs.ts
function createClubsApi(clubService) {
  return {
    async create(req) {
      try {
        const data = await req.json();
        const club = await clubService.create(data);
        return new Response(JSON.stringify(club), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findAll() {
      try {
        const clubs = await clubService.findAll();
        return new Response(JSON.stringify(clubs), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findById(req, id) {
      try {
        const club = await clubService.findById(id);
        if (!club) {
          return new Response(JSON.stringify({ error: "Club not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify(club), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async update(req, id) {
      try {
        const data = await req.json();
        const club = await clubService.update(id, data);
        return new Response(JSON.stringify(club), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async delete(req, id) {
      try {
        await clubService.delete(id);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  };
}

// node_modules/zod/dist/esm/v3/external.js
var exports_external = {};
__export(exports_external, {
  void: () => voidType,
  util: () => util,
  unknown: () => unknownType,
  union: () => unionType,
  undefined: () => undefinedType,
  tuple: () => tupleType,
  transformer: () => effectsType,
  symbol: () => symbolType,
  string: () => stringType,
  strictObject: () => strictObjectType,
  setErrorMap: () => setErrorMap,
  set: () => setType,
  record: () => recordType,
  quotelessJson: () => quotelessJson,
  promise: () => promiseType,
  preprocess: () => preprocessType,
  pipeline: () => pipelineType,
  ostring: () => ostring,
  optional: () => optionalType,
  onumber: () => onumber,
  oboolean: () => oboolean,
  objectUtil: () => objectUtil,
  object: () => objectType,
  number: () => numberType,
  nullable: () => nullableType,
  null: () => nullType,
  never: () => neverType,
  nativeEnum: () => nativeEnumType,
  nan: () => nanType,
  map: () => mapType,
  makeIssue: () => makeIssue,
  literal: () => literalType,
  lazy: () => lazyType,
  late: () => late,
  isValid: () => isValid,
  isDirty: () => isDirty,
  isAsync: () => isAsync,
  isAborted: () => isAborted,
  intersection: () => intersectionType,
  instanceof: () => instanceOfType,
  getParsedType: () => getParsedType,
  getErrorMap: () => getErrorMap,
  function: () => functionType,
  enum: () => enumType,
  effect: () => effectsType,
  discriminatedUnion: () => discriminatedUnionType,
  defaultErrorMap: () => en_default,
  datetimeRegex: () => datetimeRegex,
  date: () => dateType,
  custom: () => custom,
  coerce: () => coerce,
  boolean: () => booleanType,
  bigint: () => bigIntType,
  array: () => arrayType,
  any: () => anyType,
  addIssueToContext: () => addIssueToContext,
  ZodVoid: () => ZodVoid,
  ZodUnknown: () => ZodUnknown,
  ZodUnion: () => ZodUnion,
  ZodUndefined: () => ZodUndefined,
  ZodType: () => ZodType,
  ZodTuple: () => ZodTuple,
  ZodTransformer: () => ZodEffects,
  ZodSymbol: () => ZodSymbol,
  ZodString: () => ZodString,
  ZodSet: () => ZodSet,
  ZodSchema: () => ZodType,
  ZodRecord: () => ZodRecord,
  ZodReadonly: () => ZodReadonly,
  ZodPromise: () => ZodPromise,
  ZodPipeline: () => ZodPipeline,
  ZodParsedType: () => ZodParsedType,
  ZodOptional: () => ZodOptional,
  ZodObject: () => ZodObject,
  ZodNumber: () => ZodNumber,
  ZodNullable: () => ZodNullable,
  ZodNull: () => ZodNull,
  ZodNever: () => ZodNever,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNaN: () => ZodNaN,
  ZodMap: () => ZodMap,
  ZodLiteral: () => ZodLiteral,
  ZodLazy: () => ZodLazy,
  ZodIssueCode: () => ZodIssueCode,
  ZodIntersection: () => ZodIntersection,
  ZodFunction: () => ZodFunction,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodError: () => ZodError,
  ZodEnum: () => ZodEnum,
  ZodEffects: () => ZodEffects,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodDefault: () => ZodDefault,
  ZodDate: () => ZodDate,
  ZodCatch: () => ZodCatch,
  ZodBranded: () => ZodBranded,
  ZodBoolean: () => ZodBoolean,
  ZodBigInt: () => ZodBigInt,
  ZodArray: () => ZodArray,
  ZodAny: () => ZodAny,
  Schema: () => ZodType,
  ParseStatus: () => ParseStatus,
  OK: () => OK,
  NEVER: () => NEVER,
  INVALID: () => INVALID,
  EMPTY_PATH: () => EMPTY_PATH,
  DIRTY: () => DIRTY,
  BRAND: () => BRAND
});

// node_modules/zod/dist/esm/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error;
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/zod/dist/esm/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};

class ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
        fieldErrors[sub.path[0]].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
}
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/dist/esm/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/zod/dist/esm/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
// node_modules/zod/dist/esm/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== undefined) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      ctx.schemaErrorMap,
      overrideMap,
      overrideMap === en_default ? undefined : en_default
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}

class ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
}
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
// node_modules/zod/dist/esm/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/dist/esm/v3/types.js
var __classPrivateFieldGet = function(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = function(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var _ZodEnum_cache;
var _ZodNativeEnum_cache;

class ParseInputLazyPath {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
}
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}

class ZodType {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus,
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(undefined).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}

class ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus;
    let ctx = undefined;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
}
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}

class ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = undefined;
    const status = new ParseStatus;
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
}
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};

class ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = undefined;
    const status = new ParseStatus;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
}
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};

class ZodBoolean extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};

class ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus;
    let ctx = undefined;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
}
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};

class ZodSymbol extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};

class ZodUndefined extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};

class ZodNull extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};

class ZodAny extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
}
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};

class ZodUnknown extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
}
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};

class ZodNever extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
}
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};

class ZodVoid extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};

class ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : undefined,
          maximum: tooBig ? def.exactLength.value : undefined,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
}
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}

class ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== undefined ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  extend(augmentation) {
    return new ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  merge(merging) {
    const merged = new ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  catchall(index) {
    return new ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
}
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};

class ZodUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = undefined;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
}
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [undefined];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [undefined, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};

class ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  static create(discriminator, options, params) {
    const optionsMap = new Map;
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
}
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0;index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}

class ZodIntersection extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
}
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};

class ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new ZodTuple({
      ...this._def,
      rest
    });
  }
}
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};

class ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
}

class ZodMap extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = new Map;
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = new Map;
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
}
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};

class ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = new Set;
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
}
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};

class ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
}

class ZodLazy extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
}
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};

class ZodLiteral extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
}
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}

class ZodEnum extends ZodType {
  constructor() {
    super(...arguments);
    _ZodEnum_cache.set(this, undefined);
  }
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodEnum_cache, new Set(this._def.values), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f").has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
}
_ZodEnum_cache = new WeakMap;
ZodEnum.create = createZodEnum;

class ZodNativeEnum extends ZodType {
  constructor() {
    super(...arguments);
    _ZodNativeEnum_cache.set(this, undefined);
  }
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodNativeEnum_cache, new Set(util.getValidEnumValues(this._def.values)), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f").has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
}
_ZodNativeEnum_cache = new WeakMap;
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};

class ZodPromise extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
}
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};

class ZodEffects extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return base;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return base;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
}
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
class ZodOptional extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(undefined);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};

class ZodNullable extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};

class ZodDefault extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};

class ZodCatch extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
}
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};

class ZodNaN extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
}
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");

class ZodBranded extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
}

class ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
}

class ZodReadonly extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;
// src/api/competition-category-tees.ts
var setCategoryTeesSchema = exports_external.object({
  mappings: exports_external.array(exports_external.object({
    categoryId: exports_external.number().positive(),
    teeId: exports_external.number().positive()
  }))
});
function createCompetitionCategoryTeesApi(categoryTeeService) {
  return {
    async getByCompetition(competitionId) {
      try {
        const categoryTees = categoryTeeService.getByCompetition(competitionId);
        return new Response(JSON.stringify({ categoryTees }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async setForCompetition(req, competitionId) {
      try {
        const rawData = await req.json();
        const data = setCategoryTeesSchema.parse(rawData);
        const categoryTees = categoryTeeService.setForCompetition(competitionId, data.mappings);
        return new Response(JSON.stringify({ categoryTees }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof exports_external.ZodError) {
          return new Response(JSON.stringify({ error: "Invalid request format" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        if (error instanceof Error) {
          const status = error.message === "Competition not found" || error.message.includes("does not belong") ? 400 : 500;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  };
}

// src/api/competitions.ts
var createCompetitionSchema = exports_external.object({
  name: exports_external.string().min(1),
  date: exports_external.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  course_id: exports_external.number().positive(),
  series_id: exports_external.number().positive().optional(),
  tour_id: exports_external.number().positive().optional(),
  point_template_id: exports_external.number().positive().optional(),
  manual_entry_format: exports_external.enum(["out_in_total", "total_only"]).optional(),
  points_multiplier: exports_external.number().positive().optional(),
  venue_type: exports_external.enum(["outdoor", "indoor"]).optional(),
  start_mode: exports_external.enum(["scheduled", "open"]).optional(),
  open_start: exports_external.string().optional(),
  open_end: exports_external.string().optional(),
  owner_id: exports_external.number().positive().optional()
});
var updateCompetitionSchema = exports_external.object({
  name: exports_external.string().min(1).optional(),
  date: exports_external.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  course_id: exports_external.number().positive().optional(),
  series_id: exports_external.number().positive().nullable().optional(),
  tour_id: exports_external.number().positive().nullable().optional(),
  point_template_id: exports_external.number().positive().nullable().optional(),
  manual_entry_format: exports_external.enum(["out_in_total", "total_only"]).optional(),
  points_multiplier: exports_external.number().positive().optional(),
  venue_type: exports_external.enum(["outdoor", "indoor"]).optional(),
  start_mode: exports_external.enum(["scheduled", "open"]).optional(),
  open_start: exports_external.string().nullable().optional(),
  open_end: exports_external.string().nullable().optional()
});
function createCompetitionsApi(competitionService) {
  return {
    async create(req) {
      try {
        const rawData = await req.json();
        const data = createCompetitionSchema.parse(rawData);
        const competition = await competitionService.create(data);
        return new Response(JSON.stringify(competition), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof exports_external.ZodError) {
          const firstIssue = error.errors[0];
          let message = "Validation error";
          if (firstIssue.path[0] === "name" && firstIssue.code === "too_small") {
            message = "Competition name is required";
          } else if (firstIssue.path[0] === "date" && firstIssue.code === "invalid_string") {
            message = "Date must be in YYYY-MM-DD format (e.g., 2024-03-21)";
          }
          return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findAll() {
      try {
        const competitions = await competitionService.findAll();
        return new Response(JSON.stringify(competitions), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findById(req, id) {
      try {
        const competition = await competitionService.findById(id);
        if (!competition) {
          return new Response(JSON.stringify({ error: "Competition not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify(competition), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async update(req, id) {
      try {
        const rawData = await req.json();
        const data = updateCompetitionSchema.parse(rawData);
        const competition = await competitionService.update(id, data);
        return new Response(JSON.stringify(competition), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof exports_external.ZodError) {
          const firstIssue = error.errors[0];
          let message = "Validation error";
          if (firstIssue.path[0] === "date" && firstIssue.code === "invalid_string") {
            message = "Date must be in YYYY-MM-DD format (e.g., 2024-03-21)";
          }
          return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async delete(id) {
      try {
        await competitionService.delete(id);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async getLeaderboard(competitionId) {
      try {
        const leaderboard = await competitionService.getLeaderboard(competitionId);
        return new Response(JSON.stringify(leaderboard), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message === "Competition not found" ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async getLeaderboardWithDetails(competitionId) {
      try {
        const response = await competitionService.getLeaderboardWithDetails(competitionId);
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message === "Competition not found" ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async getTeamLeaderboard(competitionId) {
      try {
        const teamLeaderboard = await competitionService.getTeamLeaderboard(competitionId);
        return new Response(JSON.stringify(teamLeaderboard), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message === "Competition not found" ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  };
}

// src/api/courses.ts
function createCoursesApi(courseService, courseTeeService) {
  return {
    async create(req) {
      try {
        const data = await req.json();
        const course = await courseService.create(data);
        return new Response(JSON.stringify(course), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findAll() {
      try {
        const courses = await courseService.findAll();
        return new Response(JSON.stringify(courses), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findById(req, id) {
      try {
        const course = await courseService.findById(id);
        if (!course) {
          return new Response(JSON.stringify({ error: "Course not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify(course), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async update(req, id) {
      try {
        const data = await req.json();
        const course = await courseService.update(id, data);
        return new Response(JSON.stringify(course), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async updateHoles(req, id) {
      try {
        const body = await req.json();
        let pars;
        let strokeIndex;
        if (Array.isArray(body)) {
          pars = body;
        } else {
          pars = body.pars;
          strokeIndex = body.stroke_index;
        }
        const course = await courseService.updateHoles(id, pars, strokeIndex);
        return new Response(JSON.stringify(course), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async delete(id) {
      try {
        await courseService.delete(id);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async importCourses(req) {
      try {
        const data = await req.json();
        const results = await courseService.importCourses(data);
        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async importForCourse(req, courseId) {
      try {
        const data = await req.json();
        const result = await courseService.importForCourse(courseId, data);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async getTees(courseId) {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      try {
        const tees = courseTeeService.findByCourse(courseId);
        return new Response(JSON.stringify(tees), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async getTee(courseId, teeId) {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      try {
        const tee = courseTeeService.findById(teeId);
        if (!tee || tee.course_id !== courseId) {
          return new Response(JSON.stringify({ error: "Tee not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify(tee), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async createTee(req, courseId) {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      try {
        const data = await req.json();
        const tee = courseTeeService.create(courseId, data);
        return new Response(JSON.stringify(tee), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message.includes("not found") ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async updateTee(req, courseId, teeId) {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      try {
        const existingTee = courseTeeService.findById(teeId);
        if (!existingTee || existingTee.course_id !== courseId) {
          return new Response(JSON.stringify({ error: "Tee not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        const data = await req.json();
        const tee = courseTeeService.update(teeId, data);
        return new Response(JSON.stringify(tee), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message.includes("not found") ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async deleteTee(courseId, teeId) {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      try {
        const existingTee = courseTeeService.findById(teeId);
        if (!existingTee || existingTee.course_id !== courseId) {
          return new Response(JSON.stringify({ error: "Tee not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        courseTeeService.delete(teeId);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message.includes("not found") ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async getTeeRatings(courseId, teeId) {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      try {
        const tee = courseTeeService.findById(teeId);
        if (!tee || tee.course_id !== courseId) {
          return new Response(JSON.stringify({ error: "Tee not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        const ratings = courseTeeService.getRatingsForTee(teeId);
        return new Response(JSON.stringify(ratings), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async getTeeRatingByGender(courseId, teeId, gender) {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      try {
        if (!["men", "women"].includes(gender)) {
          return new Response(JSON.stringify({ error: "Gender must be 'men' or 'women'" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        const tee = courseTeeService.findById(teeId);
        if (!tee || tee.course_id !== courseId) {
          return new Response(JSON.stringify({ error: "Tee not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        const rating = courseTeeService.getRatingByGender(teeId, gender);
        if (!rating) {
          return new Response(JSON.stringify({ error: "Rating not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify(rating), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async upsertTeeRating(req, courseId, teeId) {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      try {
        const tee = courseTeeService.findById(teeId);
        if (!tee || tee.course_id !== courseId) {
          return new Response(JSON.stringify({ error: "Tee not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        const data = await req.json();
        const rating = courseTeeService.upsertRating(teeId, data);
        return new Response(JSON.stringify(rating), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message.includes("not found") ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async updateTeeRating(req, courseId, teeId, ratingId) {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      try {
        const tee = courseTeeService.findById(teeId);
        if (!tee || tee.course_id !== courseId) {
          return new Response(JSON.stringify({ error: "Tee not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        const existingRating = courseTeeService.getRatingById(ratingId);
        if (!existingRating || existingRating.tee_id !== teeId) {
          return new Response(JSON.stringify({ error: "Rating not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        const data = await req.json();
        const rating = courseTeeService.updateRating(ratingId, data);
        return new Response(JSON.stringify(rating), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message.includes("not found") ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async deleteTeeRating(courseId, teeId, gender) {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      try {
        if (!["men", "women"].includes(gender)) {
          return new Response(JSON.stringify({ error: "Gender must be 'men' or 'women'" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        const tee = courseTeeService.findById(teeId);
        if (!tee || tee.course_id !== courseId) {
          return new Response(JSON.stringify({ error: "Tee not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        const rating = courseTeeService.getRatingByGender(teeId, gender);
        if (!rating) {
          return new Response(JSON.stringify({ error: "Rating not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        courseTeeService.deleteRatingByGender(teeId, gender);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message.includes("not found") ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  };
}

// src/api/documents.ts
function createDocumentsApi(documentService) {
  return {
    async create(req) {
      try {
        const data = await req.json();
        const document = await documentService.create(data);
        return new Response(JSON.stringify(document), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findAll() {
      try {
        const documents = await documentService.findAll();
        return new Response(JSON.stringify(documents), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findById(req, id) {
      try {
        const document = await documentService.findById(id);
        if (!document) {
          return new Response(JSON.stringify({ error: "Document not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify(document), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findBySeriesId(seriesId) {
      try {
        const documents = await documentService.findBySeriesId(seriesId);
        return new Response(JSON.stringify(documents), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findBySeriesIdAndType(seriesId, type) {
      try {
        const documents = await documentService.findBySeriesIdAndType(seriesId, type);
        return new Response(JSON.stringify(documents), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async update(req, id) {
      try {
        const data = await req.json();
        const document = await documentService.update(id, data);
        return new Response(JSON.stringify(document), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async delete(id) {
      try {
        await documentService.delete(id);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async getDocumentTypes(seriesId) {
      try {
        const types2 = await documentService.getDocumentTypes(seriesId);
        return new Response(JSON.stringify(types2), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async createForSeries(req, seriesId) {
      try {
        const data = await req.json();
        const document = await documentService.create({
          title: data.title,
          content: data.content,
          type: "general",
          series_id: seriesId
        });
        return new Response(JSON.stringify(document), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async updateForSeries(req, seriesId, documentId) {
      try {
        const document = await documentService.findById(documentId);
        if (!document) {
          return new Response(JSON.stringify({ error: "Document not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        if (document.series_id !== seriesId) {
          return new Response(JSON.stringify({
            error: "Document does not belong to this series"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        const data = await req.json();
        const updatedDocument = await documentService.update(documentId, data);
        return new Response(JSON.stringify(updatedDocument), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async deleteForSeries(seriesId, documentId) {
      try {
        const document = await documentService.findById(documentId);
        if (!document) {
          return new Response(JSON.stringify({ error: "Document not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        if (document.series_id !== seriesId) {
          return new Response(JSON.stringify({
            error: "Document does not belong to this series"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        await documentService.delete(documentId);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  };
}

// src/api/participants.ts
function createParticipantsApi(participantService) {
  return {
    async create(req) {
      try {
        const data = await req.json();
        const participant = await participantService.create(data);
        return new Response(JSON.stringify(participant), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findAll() {
      try {
        const participants = await participantService.findAll();
        return new Response(JSON.stringify(participants), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findById(req, id) {
      try {
        const participant = await participantService.findById(id);
        if (!participant) {
          return new Response(JSON.stringify({ error: "Participant not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async update(req, id) {
      try {
        const data = await req.json();
        const participant = await participantService.update(id, data);
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async delete(id) {
      try {
        console.log("delete! /api/participants/:id", id);
        await participantService.delete(id);
        console.log("delete complete! /api/participants/:id", id);
        return new Response(null, { status: 204 });
      } catch (error) {
        console.log("delete error! /api/participants/:id", id, error);
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findAllForCompetition(competitionId) {
      try {
        const participants = await participantService.findAllForCompetition(competitionId);
        return new Response(JSON.stringify(participants), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async updateScore(req, id) {
      try {
        const data = await req.json();
        if (data.shots === undefined || data.shots === null) {
          return new Response(JSON.stringify({ error: "Shots are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        if (!data.hole) {
          return new Response(JSON.stringify({ error: "Hole is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        const participant = await participantService.updateScore(id, data.hole, data.shots);
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message === "Participant not found" ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async lock(req, id) {
      try {
        const participant = await participantService.lock(id);
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message === "Participant not found" ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async unlock(req, id) {
      try {
        const participant = await participantService.unlock(id);
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message === "Participant not found" ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async updateManualScore(req, id) {
      try {
        const data = await req.json();
        if (data.total === undefined) {
          return new Response(JSON.stringify({ error: "Total score is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        const participant = await participantService.updateManualScore(id, data);
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message === "Participant not found" ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async adminSetDQ(req, id, adminUserId) {
      try {
        const data = await req.json();
        if (typeof data.is_dq !== "boolean") {
          return new Response(JSON.stringify({ error: "is_dq must be a boolean" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        const participant = await participantService.adminSetDQ(id, data.is_dq, data.admin_notes, adminUserId);
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message === "Participant not found" ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async adminUpdateScore(req, id, adminUserId) {
      try {
        const data = await req.json();
        if (!Array.isArray(data.score)) {
          return new Response(JSON.stringify({ error: "score must be an array" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        const participant = await participantService.adminUpdateScore(id, data.score, data.admin_notes, adminUserId);
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message === "Participant not found" ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  };
}

// src/middleware/auth.ts
function createAuthMiddleware(authService) {
  return async (c, next) => {
    const sessionId = getCookie(c, "session_id");
    if (sessionId) {
      const session = await authService.validateSession(sessionId);
      if (session) {
        c.set("user", session.user);
      } else {
        c.set("user", null);
      }
    } else {
      c.set("user", null);
    }
    await next();
  };
}
function requireAuth() {
  return async (c, next) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
  };
}
function requireRole(...roles) {
  return async (c, next) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!roles.includes(user.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}

// src/api/players.ts
function createPlayersApi(playerService, playerProfileService) {
  const app = new Hono2;
  app.get("/", async (c) => {
    try {
      const players = playerService.findAll();
      return c.json(players);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.get("/me", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const player = playerService.findByUserId(user.id);
      if (!player) {
        return c.json({ player: null });
      }
      return c.json(player);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.get("/me/profile", requireAuth(), async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const player = playerService.findByUserId(user.id);
      if (!player) {
        return c.json({ error: "No player profile linked to this account" }, 404);
      }
      const profile = playerProfileService.getFullProfile(player.id);
      if (!profile) {
        return c.json({ error: "Profile not found" }, 404);
      }
      return c.json(profile);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.put("/me/profile", requireAuth(), async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const player = playerService.findByUserId(user.id);
      if (!player) {
        return c.json({ error: "No player profile linked to this account" }, 404);
      }
      const body = await c.req.json();
      playerProfileService.updateProfile(player.id, {
        display_name: body.display_name,
        bio: body.bio,
        avatar_url: body.avatar_url,
        home_course_id: body.home_course_id,
        visibility: body.visibility,
        gender: body.gender
      });
      const fullProfile = playerProfileService.getFullProfile(player.id);
      return c.json(fullProfile);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.get("/me/handicap", requireAuth(), async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const player = playerService.findByUserId(user.id);
      if (!player) {
        return c.json({ error: "No player profile linked to this account" }, 404);
      }
      const handicapData = playerProfileService.getHandicapWithHistory(player.id);
      if (!handicapData) {
        return c.json({ error: "Handicap data not found" }, 404);
      }
      return c.json(handicapData);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.post("/me/handicap", requireAuth(), async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const player = playerService.findByUserId(user.id);
      if (!player) {
        return c.json({ error: "No player profile linked to this account" }, 404);
      }
      const body = await c.req.json();
      if (body.handicap_index === undefined || body.handicap_index === null) {
        return c.json({ error: "handicap_index is required" }, 400);
      }
      const entry = playerProfileService.recordHandicap(player.id, {
        handicap_index: body.handicap_index,
        effective_date: body.effective_date,
        notes: body.notes
      });
      return c.json(entry, 201);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.get("/me/rounds", requireAuth(), async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const player = playerService.findByUserId(user.id);
      if (!player) {
        return c.json({ error: "No player profile linked to this account" }, 404);
      }
      const limit = c.req.query("limit") ? parseInt(c.req.query("limit")) : undefined;
      const offset = c.req.query("offset") ? parseInt(c.req.query("offset")) : undefined;
      const rounds = playerProfileService.getRoundHistory(player.id, limit, offset);
      return c.json(rounds);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.get("/me/tours-and-series", requireAuth(), async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const player = playerService.findByUserId(user.id);
      if (!player) {
        return c.json({ tours: [], series: [] });
      }
      const toursAndSeries = playerProfileService.getPlayerToursAndSeries(player.id);
      return c.json(toursAndSeries);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.get("/is-friend/:targetPlayerId", requireAuth(), async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const viewerPlayer = playerService.findByUserId(user.id);
      if (!viewerPlayer) {
        return c.json({ isFriend: false, commonTours: [] });
      }
      const targetPlayerId = parseInt(c.req.param("targetPlayerId"));
      const isFriend = playerProfileService.isFriend(viewerPlayer.id, targetPlayerId);
      const commonTours = isFriend ? playerProfileService.getCommonTours(viewerPlayer.id, targetPlayerId) : [];
      return c.json({ isFriend, commonTours });
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.get("/:id/tours-and-series", async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }
      const playerId = parseInt(c.req.param("id"));
      const player = playerService.findById(playerId);
      if (!player) {
        return c.json({ error: "Player not found" }, 404);
      }
      const toursAndSeries = playerProfileService.getPlayerToursAndSeries(playerId);
      return c.json(toursAndSeries);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.get("/:id/rounds", async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }
      const playerId = parseInt(c.req.param("id"));
      const player = playerService.findById(playerId);
      if (!player) {
        return c.json({ error: "Player not found" }, 404);
      }
      const limit = c.req.query("limit") ? parseInt(c.req.query("limit")) : undefined;
      const offset = c.req.query("offset") ? parseInt(c.req.query("offset")) : undefined;
      const rounds = playerProfileService.getRoundHistory(playerId, limit, offset);
      return c.json(rounds);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.get("/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const player = playerService.findById(id);
      if (!player) {
        return c.json({ error: "Player not found" }, 404);
      }
      return c.json(player);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.get("/:id/profile", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const profile = playerService.getPlayerProfile(id);
      if (!profile) {
        return c.json({ error: "Player not found" }, 404);
      }
      return c.json(profile);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.get("/:id/full", async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }
      const id = parseInt(c.req.param("id"));
      const user = c.get("user");
      const viewerId = user?.id;
      const profile = playerProfileService.getPublicProfile(id, viewerId);
      if (!profile) {
        return c.json({ error: "Player not found or profile is private" }, 404);
      }
      return c.json(profile);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.post("/", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const body = await c.req.json();
      if (!body.name) {
        return c.json({ error: "Player name is required" }, 400);
      }
      const player = playerService.create({
        name: body.name,
        handicap: body.handicap,
        user_id: body.user_id
      }, user?.id);
      return c.json(player, 201);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.post("/register", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const body = await c.req.json();
      const existingPlayer = playerService.findByUserId(user.id);
      if (existingPlayer) {
        return c.json({ error: "User already has a player profile" }, 400);
      }
      let player;
      if (body.player_id) {
        player = playerService.linkToUser(body.player_id, user.id);
      } else {
        if (!body.name) {
          return c.json({ error: "Player name is required" }, 400);
        }
        player = playerService.create({
          name: body.name,
          handicap: body.handicap || 0,
          user_id: user.id
        }, user.id);
      }
      return c.json(player, 201);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.put("/:id", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      const player = playerService.findById(id);
      if (!player) {
        return c.json({ error: "Player not found" }, 404);
      }
      const isOwner = player.user_id === user?.id;
      const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
      if (!isOwner && !isAdmin) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const updated = playerService.update(id, {
        name: body.name,
        handicap: body.handicap
      });
      return c.json(updated);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.delete("/:id", requireRole("ADMIN", "SUPER_ADMIN"), async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      playerService.delete(id);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  return app;
}

// src/api/point-templates.ts
function createPointTemplatesApi(pointTemplateService) {
  const app = new Hono2;
  app.get("/", async (c) => {
    try {
      const templates = pointTemplateService.findAll();
      return c.json(templates);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.get("/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const template = pointTemplateService.findById(id);
      if (!template) {
        return c.json({ error: "Point template not found" }, 404);
      }
      return c.json(template);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.post("/", requireRole("ADMIN", "SUPER_ADMIN"), async (c) => {
    try {
      const user = c.get("user");
      const body = await c.req.json();
      if (!body.name) {
        return c.json({ error: "Template name is required" }, 400);
      }
      if (!body.points_structure) {
        return c.json({ error: "Points structure is required" }, 400);
      }
      const template = pointTemplateService.create({
        name: body.name,
        points_structure: body.points_structure
      }, user.id);
      return c.json(template, 201);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.put("/:id", requireRole("ADMIN", "SUPER_ADMIN"), async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      const updated = pointTemplateService.update(id, {
        name: body.name,
        points_structure: body.points_structure
      });
      return c.json(updated);
    } catch (error) {
      if (error.message === "Point template not found") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
  });
  app.delete("/:id", requireRole("ADMIN", "SUPER_ADMIN"), async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      pointTemplateService.delete(id);
      return c.json({ success: true });
    } catch (error) {
      if (error.message === "Point template not found") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
  });
  return app;
}

// src/api/series.ts
function createSeriesApi(seriesService) {
  return {
    async create(req) {
      try {
        const data = await req.json();
        const series = await seriesService.create(data);
        return new Response(JSON.stringify(series), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findAll() {
      try {
        const series = await seriesService.findAll();
        return new Response(JSON.stringify(series), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findById(req, id) {
      try {
        const series = await seriesService.findById(id);
        if (!series) {
          return new Response(JSON.stringify({ error: "Series not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify(series), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async update(req, id) {
      try {
        const data = await req.json();
        const series = await seriesService.update(id, data);
        return new Response(JSON.stringify(series), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async delete(id) {
      try {
        await seriesService.delete(id);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async getCompetitions(id) {
      try {
        const competitions = await seriesService.getCompetitions(id);
        return new Response(JSON.stringify(competitions), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async getTeams(id) {
      try {
        const teams = await seriesService.getTeams(id);
        return new Response(JSON.stringify(teams), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async getStandings(id) {
      try {
        const standings = await seriesService.getStandings(id);
        return new Response(JSON.stringify(standings), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findPublic() {
      try {
        const series = await seriesService.findPublic();
        return new Response(JSON.stringify(series), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async addTeam(seriesId, teamId) {
      try {
        await seriesService.addTeam(seriesId, teamId);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async removeTeam(seriesId, teamId) {
      try {
        await seriesService.removeTeam(seriesId, teamId);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async getAvailableTeams(seriesId) {
      try {
        const teams = await seriesService.getAvailableTeams(seriesId);
        return new Response(JSON.stringify(teams), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  };
}

// src/api/teams.ts
function createTeamsApi(teamService) {
  return {
    async create(req) {
      try {
        const data = await req.json();
        const team = await teamService.create(data);
        return new Response(JSON.stringify(team), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findAll() {
      try {
        const teams = await teamService.findAll();
        return new Response(JSON.stringify(teams), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findById(req, id) {
      try {
        const team = await teamService.findById(id);
        if (!team) {
          return new Response(JSON.stringify({ error: "Team not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify(team), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async update(req, id) {
      try {
        const data = await req.json();
        const team = await teamService.update(id, data);
        return new Response(JSON.stringify(team), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  };
}

// src/api/tee-times.ts
function createTeeTimesApi(teeTimeService) {
  return {
    async createForCompetition(req, competitionId) {
      try {
        const data = await req.json();
        const teeTime = await teeTimeService.create({
          ...data,
          competition_id: competitionId
        });
        return new Response(JSON.stringify(teeTime), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findAllForCompetition(competitionId) {
      try {
        const teeTimes = await teeTimeService.findAllForCompetitionWithParticipants(competitionId);
        return new Response(JSON.stringify(teeTimes), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error && error.message === "Competition not found") {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findById(req, id) {
      try {
        const teeTime = await teeTimeService.findById(id);
        if (!teeTime) {
          return new Response(JSON.stringify({ error: "Tee time not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify(teeTime), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findByIdWithParticipants(req, id) {
      try {
        const teeTime = await teeTimeService.findByIdWithParticipants(id);
        if (!teeTime) {
          return new Response(JSON.stringify({ error: "Tee time not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify(teeTime), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async update(req, id) {
      try {
        const data = await req.json();
        const teeTime = await teeTimeService.update(id, data);
        return new Response(JSON.stringify(teeTime), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async delete(id) {
      try {
        await teeTimeService.delete(id);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async updateParticipantsOrder(req, id) {
      try {
        const body = await req.json();
        const updatedTeeTime = await teeTimeService.updateParticipantsOrder(id, body.participantIds);
        return new Response(JSON.stringify(updatedTeeTime), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "Tee time not found") {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 404,
              headers: { "Content-Type": "application/json" }
            });
          }
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  };
}

// src/api/tours.ts
function createToursApi(tourService, enrollmentService, adminService, documentService, categoryService, pointTemplateService) {
  const app = new Hono2;
  app.get("/", async (c) => {
    try {
      const user = c.get("user");
      if (user?.role === "SUPER_ADMIN") {
        const tours2 = tourService.findAll();
        return c.json(tours2);
      }
      if (user?.role === "ORGANIZER" || user?.role === "ADMIN") {
        const tours2 = tourService.findForUser(user.id);
        return c.json(tours2);
      }
      const tours = tourService.findAll();
      const visibleTours = tours.filter((tour) => enrollmentService.canViewTour(tour.id, user?.id ?? null));
      return c.json(visibleTours);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.get("/:id", async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const tour = tourService.findById(id);
      if (!tour) {
        return c.json({ error: "Tour not found" }, 404);
      }
      if (!enrollmentService.canViewTour(id, user?.id ?? null)) {
        return c.json({ error: "Tour not found" }, 404);
      }
      return c.json(tour);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.get("/:id/competitions", async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      if (!enrollmentService.canViewTour(id, user?.id ?? null)) {
        return c.json({ error: "Tour not found" }, 404);
      }
      const competitions = tourService.getCompetitions(id);
      return c.json(competitions);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.get("/:id/standings", async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      if (!enrollmentService.canViewTour(id, user?.id ?? null)) {
        return c.json({ error: "Tour not found" }, 404);
      }
      const format = c.req.query("format");
      if (format === "simple") {
        const standings2 = tourService.getStandings(id);
        return c.json(standings2);
      }
      const categoryParam = c.req.query("category");
      const categoryId = categoryParam ? parseInt(categoryParam) : undefined;
      const scoringTypeParam = c.req.query("scoring_type");
      const scoringType = scoringTypeParam === "gross" || scoringTypeParam === "net" ? scoringTypeParam : undefined;
      const standings = tourService.getFullStandings(id, categoryId, scoringType);
      return c.json(standings);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.post("/", requireRole("ORGANIZER", "SUPER_ADMIN"), async (c) => {
    try {
      const user = c.get("user");
      const body = await c.req.json();
      if (!body.name) {
        return c.json({ error: "Tour name is required" }, 400);
      }
      const tour = tourService.create({
        name: body.name,
        description: body.description,
        banner_image_url: body.banner_image_url,
        point_template_id: body.point_template_id
      }, user.id);
      return c.json(tour, 201);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.put("/:id", requireRole("ORGANIZER", "ADMIN", "SUPER_ADMIN"), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      const tour = tourService.findById(id);
      if (!tour) {
        return c.json({ error: "Tour not found" }, 404);
      }
      if (tour.owner_id !== user.id && user.role !== "SUPER_ADMIN") {
        return c.json({ error: "Forbidden" }, 403);
      }
      const updated = tourService.update(id, {
        name: body.name,
        description: body.description,
        banner_image_url: body.banner_image_url,
        landing_document_id: body.landing_document_id,
        point_template_id: body.point_template_id
      });
      return c.json(updated);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.delete("/:id", requireRole("ORGANIZER", "ADMIN", "SUPER_ADMIN"), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const tour = tourService.findById(id);
      if (!tour) {
        return c.json({ error: "Tour not found" }, 404);
      }
      if (tour.owner_id !== user.id && user.role !== "SUPER_ADMIN") {
        return c.json({ error: "Forbidden" }, 403);
      }
      tourService.delete(id);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.get("/:id/enrollments", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const status = c.req.query("status");
      if (!enrollmentService.canManageTour(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const enrollments = enrollmentService.getEnrollments(id, status);
      return c.json(enrollments);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.post("/:id/enrollments", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      if (!enrollmentService.canManageTour(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!body.email) {
        return c.json({ error: "Email is required" }, 400);
      }
      const enrollment = enrollmentService.addPendingEnrollment(id, body.email);
      return c.json(enrollment, 201);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.post("/:id/enrollments/request", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      if (!body.playerId) {
        return c.json({ error: "Player ID is required" }, 400);
      }
      const enrollment = enrollmentService.requestEnrollment(id, body.playerId);
      return c.json(enrollment, 201);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.put("/:id/enrollments/:enrollmentId/approve", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const enrollmentId = parseInt(c.req.param("enrollmentId"));
      if (!enrollmentService.canManageTour(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const enrollment = enrollmentService.findById(enrollmentId);
      if (!enrollment || enrollment.tour_id !== id) {
        return c.json({ error: "Enrollment not found" }, 404);
      }
      const approved = enrollmentService.approveEnrollment(enrollmentId);
      return c.json(approved);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.delete("/:id/enrollments/:enrollmentId", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const enrollmentId = parseInt(c.req.param("enrollmentId"));
      if (!enrollmentService.canManageTour(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      enrollmentService.removeEnrollment(id, enrollmentId);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.get("/:id/admins", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      if (!adminService.canManageTour(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const admins = adminService.getTourAdmins(id);
      return c.json(admins);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.post("/:id/admins", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      if (!adminService.canManageTourAdmins(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!body.userId) {
        return c.json({ error: "User ID is required" }, 400);
      }
      const admin = adminService.addTourAdmin(id, body.userId);
      return c.json(admin, 201);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.delete("/:id/admins/:userId", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const userId = parseInt(c.req.param("userId"));
      if (!adminService.canManageTourAdmins(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      adminService.removeTourAdmin(id, userId);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.get("/:id/registration-link", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const email = c.req.query("email");
      if (!enrollmentService.canManageTour(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!email) {
        return c.json({ error: "Email is required" }, 400);
      }
      return c.json({
        email: email.toLowerCase(),
        path: `/register?email=${encodeURIComponent(email.toLowerCase())}`
      });
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.get("/:id/documents/types", async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      if (!enrollmentService.canViewTour(id, user?.id ?? null)) {
        return c.json({ error: "Tour not found" }, 404);
      }
      const types2 = await documentService.getDocumentTypes(id);
      return c.json(types2);
    } catch (error) {
      if (error.message === "Tour not found") {
        return c.json({ error: "Tour not found" }, 404);
      }
      return c.json({ error: error.message }, 500);
    }
  });
  app.get("/:id/documents", async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      if (!enrollmentService.canViewTour(id, user?.id ?? null)) {
        return c.json({ error: "Tour not found" }, 404);
      }
      const documents = await documentService.findByTourId(id);
      return c.json(documents);
    } catch (error) {
      if (error.message === "Tour not found") {
        return c.json({ error: "Tour not found" }, 404);
      }
      return c.json({ error: error.message }, 500);
    }
  });
  app.get("/:id/documents/:documentId", async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const documentId = parseInt(c.req.param("documentId"));
      if (!enrollmentService.canViewTour(id, user?.id ?? null)) {
        return c.json({ error: "Tour not found" }, 404);
      }
      const document = await documentService.findById(documentId);
      if (!document || document.tour_id !== id) {
        return c.json({ error: "Document not found" }, 404);
      }
      return c.json(document);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.post("/:id/documents", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      if (!enrollmentService.canManageTour(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const document = await documentService.create({
        title: body.title,
        content: body.content,
        type: body.type || "general",
        tour_id: id
      });
      return c.json(document, 201);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.put("/:id/documents/:documentId", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const documentId = parseInt(c.req.param("documentId"));
      const body = await c.req.json();
      if (!enrollmentService.canManageTour(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const existingDocument = await documentService.findById(documentId);
      if (!existingDocument || existingDocument.tour_id !== id) {
        return c.json({ error: "Document not found" }, 404);
      }
      const document = await documentService.update(documentId, {
        title: body.title,
        content: body.content,
        type: body.type
      });
      return c.json(document);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.delete("/:id/documents/:documentId", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const documentId = parseInt(c.req.param("documentId"));
      if (!enrollmentService.canManageTour(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const existingDocument = await documentService.findById(documentId);
      if (!existingDocument || existingDocument.tour_id !== id) {
        return c.json({ error: "Document not found" }, 404);
      }
      await documentService.delete(documentId);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.get("/:id/categories", async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      if (!enrollmentService.canViewTour(id, user?.id ?? null)) {
        return c.json({ error: "Tour not found" }, 404);
      }
      const categories = categoryService.findByTour(id);
      return c.json(categories);
    } catch (error) {
      if (error.message === "Tour not found") {
        return c.json({ error: "Tour not found" }, 404);
      }
      return c.json({ error: error.message }, 500);
    }
  });
  app.post("/:id/categories", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      if (!enrollmentService.canManageTour(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!body.name) {
        return c.json({ error: "Category name is required" }, 400);
      }
      const category = categoryService.create(id, {
        name: body.name,
        description: body.description,
        sort_order: body.sort_order
      });
      return c.json(category, 201);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.put("/:id/categories/reorder", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      if (!enrollmentService.canManageTour(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!Array.isArray(body.categoryIds)) {
        return c.json({ error: "categoryIds array is required" }, 400);
      }
      categoryService.reorder(id, body.categoryIds);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.put("/:id/categories/:categoryId", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const categoryId = parseInt(c.req.param("categoryId"));
      const body = await c.req.json();
      if (!enrollmentService.canManageTour(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const existingCategory = categoryService.findById(categoryId);
      if (!existingCategory || existingCategory.tour_id !== id) {
        return c.json({ error: "Category not found" }, 404);
      }
      const category = categoryService.update(categoryId, {
        name: body.name,
        description: body.description,
        sort_order: body.sort_order
      });
      return c.json(category);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.delete("/:id/categories/:categoryId", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const categoryId = parseInt(c.req.param("categoryId"));
      if (!enrollmentService.canManageTour(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const existingCategory = categoryService.findById(categoryId);
      if (!existingCategory || existingCategory.tour_id !== id) {
        return c.json({ error: "Category not found" }, 404);
      }
      categoryService.delete(categoryId);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.put("/:id/enrollments/:enrollmentId/category", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const enrollmentId = parseInt(c.req.param("enrollmentId"));
      const body = await c.req.json();
      if (!enrollmentService.canManageTour(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const enrollment = enrollmentService.findById(enrollmentId);
      if (!enrollment || enrollment.tour_id !== id) {
        return c.json({ error: "Enrollment not found" }, 404);
      }
      categoryService.assignToEnrollment(enrollmentId, body.categoryId ?? null);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.put("/:id/enrollments/bulk-category", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      if (!enrollmentService.canManageTour(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!Array.isArray(body.enrollmentIds)) {
        return c.json({ error: "enrollmentIds array is required" }, 400);
      }
      const updated = categoryService.bulkAssign(body.enrollmentIds, body.categoryId ?? null);
      return c.json({ success: true, updated });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.get("/:id/point-templates", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const templates = pointTemplateService.findByTour(id);
      return c.json(templates);
    } catch (error) {
      return c.json({ error: error.message }, 500);
    }
  });
  app.post("/:id/point-templates", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      if (!enrollmentService.canManageTour(id, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!body.name) {
        return c.json({ error: "Template name is required" }, 400);
      }
      if (!body.points_structure) {
        return c.json({ error: "Points structure is required" }, 400);
      }
      const template = pointTemplateService.createForTour(id, body, user.id);
      return c.json(template, 201);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.put("/:id/point-templates/:templateId", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const tourId = parseInt(c.req.param("id"));
      const templateId = parseInt(c.req.param("templateId"));
      const body = await c.req.json();
      if (!enrollmentService.canManageTour(tourId, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!pointTemplateService.belongsToTour(templateId, tourId)) {
        return c.json({ error: "Template not found" }, 404);
      }
      const template = pointTemplateService.update(templateId, body);
      return c.json(template);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.delete("/:id/point-templates/:templateId", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const tourId = parseInt(c.req.param("id"));
      const templateId = parseInt(c.req.param("templateId"));
      if (!enrollmentService.canManageTour(tourId, user.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (!pointTemplateService.belongsToTour(templateId, tourId)) {
        return c.json({ error: "Template not found" }, 404);
      }
      pointTemplateService.delete(templateId);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  return app;
}

// src/api/games.ts
var createGameSchema = exports_external.object({
  course_id: exports_external.number().positive(),
  name: exports_external.string().optional(),
  game_type: exports_external.string().optional(),
  scoring_mode: exports_external.enum(["gross", "net", "both"]).optional(),
  scheduled_date: exports_external.string().optional(),
  custom_settings: exports_external.record(exports_external.any()).optional()
});
var updateGameSchema = exports_external.object({
  course_id: exports_external.number().positive().optional(),
  name: exports_external.string().optional(),
  game_type: exports_external.string().optional(),
  scoring_mode: exports_external.enum(["gross", "net", "both"]).optional(),
  scheduled_date: exports_external.string().optional(),
  custom_settings: exports_external.record(exports_external.any()).optional()
});
var addGamePlayerSchema = exports_external.object({
  player_id: exports_external.number().positive().optional(),
  guest_name: exports_external.string().min(1).optional(),
  guest_handicap: exports_external.number().optional(),
  guest_gender: exports_external.enum(["male", "female"]).optional(),
  tee_id: exports_external.number().positive().optional()
});
var createGameGroupSchema = exports_external.object({
  name: exports_external.string().min(1).optional(),
  start_hole: exports_external.number().positive().optional()
});
var updateGameStatusSchema = exports_external.object({
  status: exports_external.enum(["setup", "ready", "active", "completed"])
});
var assignTeeSchema = exports_external.object({
  tee_id: exports_external.number().positive()
});
var setGroupMembersSchema = exports_external.object({
  game_player_ids: exports_external.array(exports_external.number().positive())
});
function createGamesApi(gameService, gameGroupService, gameScoreService) {
  return {
    async create(req, userId) {
      try {
        const rawData = await req.json();
        const data = createGameSchema.parse(rawData);
        const game = gameService.createGame(userId, data);
        return new Response(JSON.stringify(game), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof exports_external.ZodError) {
          return new Response(JSON.stringify({ error: "Validation error", details: error.errors }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async update(req, gameId, userId) {
      try {
        const rawData = await req.json();
        const data = updateGameSchema.parse(rawData);
        const game = gameService.updateGame(gameId, data, userId);
        return new Response(JSON.stringify(game), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof exports_external.ZodError) {
          return new Response(JSON.stringify({ error: "Validation error", details: error.errors }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findById(gameId) {
      try {
        const game = gameService.findByIdWithDetails(gameId);
        if (!game) {
          return new Response(JSON.stringify({ error: "Game not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify(game), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async findMyGames(userId) {
      try {
        const games = gameService.findMyGames(userId);
        return new Response(JSON.stringify(games), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async updateStatus(req, gameId, userId) {
      try {
        const rawData = await req.json();
        const data = updateGameStatusSchema.parse(rawData);
        const game = gameService.updateGameStatus(gameId, data.status, userId);
        return new Response(JSON.stringify(game), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof exports_external.ZodError) {
          return new Response(JSON.stringify({ error: "Validation error", details: error.errors }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async deleteGame(gameId, userId) {
      try {
        gameService.deleteGame(gameId, userId);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async addPlayer(req, gameId, userId) {
      try {
        const rawData = await req.json();
        const data = addGamePlayerSchema.parse(rawData);
        const player = gameService.addPlayer(gameId, data, userId);
        return new Response(JSON.stringify(player), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof exports_external.ZodError) {
          return new Response(JSON.stringify({ error: "Validation error", details: error.errors }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async removePlayer(gameId, playerId, userId) {
      try {
        gameService.removePlayer(gameId, playerId, userId);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async assignTee(req, gameId, playerId, userId) {
      try {
        const rawData = await req.json();
        const data = assignTeeSchema.parse(rawData);
        const player = gameService.assignTee(gameId, playerId, data.tee_id, userId);
        return new Response(JSON.stringify(player), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof exports_external.ZodError) {
          return new Response(JSON.stringify({ error: "Validation error", details: error.errors }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async getPlayers(gameId) {
      try {
        const players = gameService.findGamePlayers(gameId);
        return new Response(JSON.stringify(players), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async createGroup(req, gameId, userId) {
      try {
        const rawData = await req.json();
        const data = createGameGroupSchema.parse(rawData);
        const group = gameGroupService.createGroup(gameId, data);
        return new Response(JSON.stringify(group), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof exports_external.ZodError) {
          return new Response(JSON.stringify({ error: "Validation error", details: error.errors }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async setGroupMembers(req, groupId, userId) {
      try {
        const rawData = await req.json();
        const data = setGroupMembersSchema.parse(rawData);
        const members = gameGroupService.setGroupMembers(groupId, data.game_player_ids);
        return new Response(JSON.stringify(members), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof exports_external.ZodError) {
          return new Response(JSON.stringify({ error: "Validation error", details: error.errors }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async deleteGroup(groupId, userId) {
      try {
        gameGroupService.deleteGroup(groupId);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async getGroups(gameId) {
      try {
        const groups = gameGroupService.findGroupsForGame(gameId);
        return new Response(JSON.stringify(groups), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async getGroupScores(groupId) {
      try {
        const scores = gameScoreService.findScoresForGroupWithDetails(groupId);
        return new Response(JSON.stringify(scores), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async getLeaderboard(gameId) {
      try {
        const leaderboard = gameScoreService.getLeaderboard(gameId);
        return new Response(JSON.stringify(leaderboard), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  };
}

// src/api/game-scores.ts
var updateScoreSchema = exports_external.object({
  shots: exports_external.number()
});
function createGameScoresApi(gameScoreService) {
  return {
    async updateScore(req, memberId, hole) {
      try {
        const rawData = await req.json();
        const data = updateScoreSchema.parse(rawData);
        const score = gameScoreService.updateScore(memberId, hole, data.shots);
        return new Response(JSON.stringify(score), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof exports_external.ZodError) {
          return new Response(JSON.stringify({ error: "Validation error", details: error.errors }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async lockScore(memberId) {
      try {
        const score = gameScoreService.lockScore(memberId);
        return new Response(JSON.stringify(score), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    },
    async unlockScore(memberId, userId) {
      try {
        const score = gameScoreService.unlockScore(memberId);
        return new Response(JSON.stringify(score), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  };
}

// src/services/auth.service.ts
var SESSION_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7;
var MIN_PASSWORD_LENGTH = 6;

class AuthService {
  db;
  tourEnrollmentService;
  playerService;
  constructor(db, deps) {
    this.db = db;
    this.tourEnrollmentService = deps?.tourEnrollmentService;
    this.playerService = deps?.playerService;
  }
  validateNewPassword(password) {
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
  }
  extractEmailName(email) {
    return email.split("@")[0];
  }
  findUserByEmail(email) {
    return this.db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  }
  findUserById(id) {
    return this.db.prepare("SELECT id, email, password_hash, role FROM users WHERE id = ?").get(id);
  }
  findUserExistsByEmail(email) {
    const row = this.db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    return row !== null;
  }
  findUserExistsByEmailExcluding(email, excludeUserId) {
    const row = this.db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, excludeUserId);
    return row !== null;
  }
  insertUserRow(email, passwordHash, role) {
    return this.db.prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?) RETURNING id, email, role").get(email, passwordHash, role);
  }
  findSessionWithUser(sessionId) {
    return this.db.prepare(`
      SELECT s.*, u.email, u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(sessionId);
  }
  insertSessionRow(sessionId, userId, expiresAt) {
    this.db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(sessionId, userId, expiresAt);
  }
  deleteSessionRow(sessionId) {
    this.db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }
  updateUserEmailRow(userId, email) {
    this.db.prepare("UPDATE users SET email = ? WHERE id = ?").run(email, userId);
  }
  updateUserPasswordRow(userId, passwordHash) {
    this.db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
  }
  findTourName(tourId) {
    const result = this.db.prepare("SELECT name FROM tours WHERE id = ?").get(tourId);
    return result?.name ?? null;
  }
  findAllUsersRows() {
    return this.db.prepare("SELECT id, email, role, created_at FROM users ORDER BY email").all();
  }
  updateUserRoleRow(userId, role) {
    this.db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
  }
  async register(email, password, role = "PLAYER") {
    if (this.findUserExistsByEmail(email)) {
      throw new Error("User already exists");
    }
    const passwordHash = await Bun.password.hash(password);
    const result = this.insertUserRow(email, passwordHash, role);
    const autoEnrollments = await this.processAutoEnrollments(result.id, email);
    return {
      ...result,
      player_id: autoEnrollments.playerId,
      auto_enrollments: autoEnrollments.enrollments
    };
  }
  async processAutoEnrollments(userId, email) {
    if (!this.tourEnrollmentService || !this.playerService) {
      return {};
    }
    const pendingEnrollments = this.tourEnrollmentService.getPendingEnrollmentsForEmail(email);
    if (pendingEnrollments.length === 0) {
      return {};
    }
    const emailName = this.extractEmailName(email);
    const player = this.playerService.create({ name: emailName, user_id: userId }, userId);
    const activatedEnrollments = [];
    for (const enrollment of pendingEnrollments) {
      try {
        const activated = this.tourEnrollmentService.activateEnrollment(enrollment.tour_id, email, player.id);
        const tourName = this.findTourName(enrollment.tour_id);
        activatedEnrollments.push({
          tour_id: enrollment.tour_id,
          tour_name: tourName || "Unknown Tour",
          enrollment_id: activated.id
        });
      } catch (error) {
        console.warn(`Failed to activate enrollment for tour ${enrollment.tour_id}:`, error);
      }
    }
    return {
      playerId: player.id,
      enrollments: activatedEnrollments.length > 0 ? activatedEnrollments : undefined
    };
  }
  async login(email, password) {
    const user = this.findUserByEmail(email);
    if (!user) {
      throw new Error("Invalid credentials");
    }
    const isValid2 = await Bun.password.verify(password, user.password_hash);
    if (!isValid2) {
      throw new Error("Invalid credentials");
    }
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + SESSION_EXPIRY_MS;
    this.insertSessionRow(sessionId, user.id, expiresAt);
    return { sessionId, user: { id: user.id, email: user.email, role: user.role } };
  }
  async validateSession(sessionId) {
    const session = this.findSessionWithUser(sessionId);
    if (!session) {
      return null;
    }
    if (Date.now() > session.expires_at) {
      this.deleteSessionRow(sessionId);
      return null;
    }
    return {
      sessionId: session.id,
      user: { id: session.user_id, email: session.email, role: session.role }
    };
  }
  async logout(sessionId) {
    this.deleteSessionRow(sessionId);
  }
  async updateEmail(userId, newEmail, currentPassword) {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    const isValid2 = await Bun.password.verify(currentPassword, user.password_hash);
    if (!isValid2) {
      throw new Error("Current password is incorrect");
    }
    if (this.findUserExistsByEmailExcluding(newEmail, userId)) {
      throw new Error("Email already in use");
    }
    this.updateUserEmailRow(userId, newEmail);
    return { email: newEmail };
  }
  async updatePassword(userId, currentPassword, newPassword) {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    const isValid2 = await Bun.password.verify(currentPassword, user.password_hash);
    if (!isValid2) {
      throw new Error("Current password is incorrect");
    }
    this.validateNewPassword(newPassword);
    const newPasswordHash = await Bun.password.hash(newPassword);
    this.updateUserPasswordRow(userId, newPasswordHash);
  }
  getAllUsers() {
    return this.findAllUsersRows();
  }
  updateUserRole(userId, newRole) {
    const validRoles = ["SUPER_ADMIN", "ORGANIZER", "ADMIN", "PLAYER"];
    if (!validRoles.includes(newRole)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
    }
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    this.updateUserRoleRow(userId, newRole);
    return { id: userId, email: user.email, role: newRole };
  }
}
function createAuthService(db, deps) {
  return new AuthService(db, deps);
}

// src/services/club.service.ts
class ClubService {
  db;
  constructor(db) {
    this.db = db;
  }
  transformClubRow(row) {
    return {
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  validateClubName(name) {
    if (!name?.trim()) {
      throw new Error("Club name is required");
    }
  }
  validateClubNameNotEmpty(name) {
    if (name !== undefined && !name.trim()) {
      throw new Error("Club name cannot be empty");
    }
  }
  insertClubRow(name) {
    const stmt = this.db.prepare(`
      INSERT INTO clubs (name)
      VALUES (?)
      RETURNING *
    `);
    return stmt.get(name);
  }
  findAllClubRows() {
    const stmt = this.db.prepare("SELECT * FROM clubs ORDER BY name");
    return stmt.all();
  }
  findClubRowById(id) {
    const stmt = this.db.prepare("SELECT * FROM clubs WHERE id = ?");
    return stmt.get(id);
  }
  findClubRowByName(name) {
    const stmt = this.db.prepare("SELECT * FROM clubs WHERE LOWER(name) = LOWER(?)");
    return stmt.get(name);
  }
  updateClubNameRow(id, name) {
    const stmt = this.db.prepare(`
      UPDATE clubs
      SET name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(name, id);
  }
  findCoursesByClub(clubId) {
    const stmt = this.db.prepare("SELECT id FROM courses WHERE club_id = ?");
    return stmt.all(clubId);
  }
  deleteClubRow(id) {
    const stmt = this.db.prepare("DELETE FROM clubs WHERE id = ?");
    stmt.run(id);
  }
  async create(data) {
    this.validateClubName(data.name);
    const trimmedName = data.name.trim();
    const existingClub = this.findClubRowByName(trimmedName);
    if (existingClub) {
      throw new Error(`Club with name "${trimmedName}" already exists`);
    }
    const row = this.insertClubRow(trimmedName);
    return this.transformClubRow(row);
  }
  async findAll() {
    const rows = this.findAllClubRows();
    return rows.map((row) => this.transformClubRow(row));
  }
  async findById(id) {
    const row = this.findClubRowById(id);
    if (!row)
      return null;
    return this.transformClubRow(row);
  }
  async findByName(name) {
    const row = this.findClubRowByName(name);
    if (!row)
      return null;
    return this.transformClubRow(row);
  }
  async findOrCreate(name) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Club name cannot be empty");
    }
    const existingClub = this.findClubRowByName(trimmedName);
    if (existingClub) {
      return this.transformClubRow(existingClub);
    }
    const row = this.insertClubRow(trimmedName);
    return this.transformClubRow(row);
  }
  async update(id, data) {
    const existingRow = this.findClubRowById(id);
    if (!existingRow) {
      throw new Error("Club not found");
    }
    this.validateClubNameNotEmpty(data.name);
    if (!data.name) {
      return this.transformClubRow(existingRow);
    }
    const trimmedName = data.name.trim();
    const conflictingClub = this.findClubRowByName(trimmedName);
    if (conflictingClub && conflictingClub.id !== id) {
      throw new Error(`Club with name "${trimmedName}" already exists`);
    }
    const updatedRow = this.updateClubNameRow(id, trimmedName);
    return this.transformClubRow(updatedRow);
  }
  async delete(id) {
    const existingRow = this.findClubRowById(id);
    if (!existingRow) {
      throw new Error("Club not found");
    }
    const courses = this.findCoursesByClub(id);
    if (courses.length > 0) {
      throw new Error("Cannot delete club that has courses");
    }
    this.deleteClubRow(id);
  }
}

// src/services/competition-category-tee.service.ts
class CompetitionCategoryTeeService {
  db;
  constructor(db) {
    this.db = db;
  }
  getByCompetition(competitionId) {
    const query = this.db.query(`
      SELECT
        cct.id,
        cct.competition_id,
        cct.category_id,
        tc.name as category_name,
        cct.tee_id,
        ct.name as tee_name,
        ct.color as tee_color,
        cct.created_at
      FROM competition_category_tees cct
      JOIN tour_categories tc ON cct.category_id = tc.id
      JOIN course_tees ct ON cct.tee_id = ct.id
      WHERE cct.competition_id = ?
      ORDER BY tc.sort_order, tc.name
    `);
    const rows = query.all(competitionId);
    return rows.map((row) => ({
      id: row.id,
      competition_id: row.competition_id,
      category_id: row.category_id,
      category_name: row.category_name || undefined,
      tee_id: row.tee_id,
      tee_name: row.tee_name || undefined,
      tee_color: row.tee_color || undefined,
      created_at: row.created_at
    }));
  }
  setForCompetition(competitionId, mappings) {
    const competition = this.db.query("SELECT id, tour_id, course_id FROM competitions WHERE id = ?").get(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }
    if (!competition.tour_id) {
      throw new Error("Category-tee mappings are only valid for tour competitions");
    }
    if (mappings.length > 0) {
      const categoryIds = mappings.map((m) => m.categoryId);
      const placeholders = categoryIds.map(() => "?").join(",");
      const validCategories = this.db.query(`SELECT id FROM tour_categories WHERE tour_id = ? AND id IN (${placeholders})`).all(competition.tour_id, ...categoryIds);
      const validCategoryIds = new Set(validCategories.map((c) => c.id));
      for (const mapping of mappings) {
        if (!validCategoryIds.has(mapping.categoryId)) {
          throw new Error(`Category ${mapping.categoryId} does not belong to this tour`);
        }
      }
      const teeIds = mappings.map((m) => m.teeId);
      const teePlaceholders = teeIds.map(() => "?").join(",");
      const validTees = this.db.query(`SELECT id FROM course_tees WHERE course_id = ? AND id IN (${teePlaceholders})`).all(competition.course_id, ...teeIds);
      const validTeeIds = new Set(validTees.map((t) => t.id));
      for (const mapping of mappings) {
        if (!validTeeIds.has(mapping.teeId)) {
          throw new Error(`Tee ${mapping.teeId} does not belong to the competition's course`);
        }
      }
    }
    this.db.query("DELETE FROM competition_category_tees WHERE competition_id = ?").run(competitionId);
    if (mappings.length > 0) {
      const insertStmt = this.db.prepare("INSERT INTO competition_category_tees (competition_id, category_id, tee_id) VALUES (?, ?, ?)");
      for (const mapping of mappings) {
        insertStmt.run(competitionId, mapping.categoryId, mapping.teeId);
      }
    }
    return this.getByCompetition(competitionId);
  }
  deleteForCompetition(competitionId) {
    this.db.query("DELETE FROM competition_category_tees WHERE competition_id = ?").run(competitionId);
  }
  getTeeForCategory(competitionId, categoryId) {
    const result = this.db.query("SELECT tee_id FROM competition_category_tees WHERE competition_id = ? AND category_id = ?").get(competitionId, categoryId);
    return result?.tee_id || null;
  }
}

// src/utils/handicap.ts
function calculateCourseHandicap(handicapIndex, slopeRating, courseRating, par) {
  if (handicapIndex < 0) {
    const courseHandicap2 = handicapIndex * slopeRating / 113 + (courseRating - par);
    return Math.round(courseHandicap2);
  }
  const courseHandicap = handicapIndex * slopeRating / 113 + (courseRating - par);
  return Math.round(courseHandicap);
}
function distributeHandicapStrokes(courseHandicap, strokeIndex) {
  if (!strokeIndex || strokeIndex.length === 0) {
    const baseStrokes = Math.floor(courseHandicap / 18);
    const extraStrokes = courseHandicap % 18;
    return Array(18).fill(baseStrokes).map((strokes, i) => i < extraStrokes ? strokes + 1 : strokes);
  }
  if (strokeIndex.length !== 18) {
    throw new Error("Stroke index must have exactly 18 values");
  }
  const strokesPerHole = Array(18).fill(0);
  if (courseHandicap < 0) {
    const absHandicap = Math.abs(courseHandicap);
    for (let i = 0;i < absHandicap && i < 18; i++) {
      const easiestHoleIdx = strokeIndex.indexOf(18 - i);
      if (easiestHoleIdx !== -1) {
        strokesPerHole[easiestHoleIdx] = -1;
      }
    }
    return strokesPerHole;
  }
  let remainingStrokes = courseHandicap;
  while (remainingStrokes > 0) {
    const fullRounds = Math.floor(remainingStrokes / 18);
    const partialStrokes = remainingStrokes % 18;
    if (fullRounds > 0) {
      for (let i = 0;i < 18; i++) {
        strokesPerHole[i] += fullRounds;
      }
      remainingStrokes = partialStrokes;
    }
    for (let strokePriority = 1;strokePriority <= partialStrokes; strokePriority++) {
      const holeIdx = strokeIndex.indexOf(strokePriority);
      if (holeIdx !== -1) {
        strokesPerHole[holeIdx] += 1;
      }
    }
    remainingStrokes = 0;
  }
  return strokesPerHole;
}
function validateStrokeIndex(strokeIndex) {
  if (!strokeIndex || strokeIndex.length !== 18) {
    return false;
  }
  const sorted = [...strokeIndex].sort((a, b) => a - b);
  for (let i = 0;i < 18; i++) {
    if (sorted[i] !== i + 1) {
      return false;
    }
  }
  return true;
}

// src/constants/golf.ts
var GOLF = {
  HOLES_PER_ROUND: 18,
  FRONT_NINE_START: 1,
  BACK_NINE_START: 10,
  STANDARD_SLOPE_RATING: 113,
  STANDARD_COURSE_RATING: 72,
  MIN_PAR: 3,
  MAX_PAR: 6,
  MIN_COURSE_RATING: 50,
  MAX_COURSE_RATING: 90,
  MIN_SLOPE_RATING: 55,
  MAX_SLOPE_RATING: 155,
  MIN_HANDICAP_INDEX: -10,
  MAX_HANDICAP_INDEX: 54,
  UNREPORTED_HOLE: -1
};

// src/utils/parsing.ts
function safeParseJson(json, fieldName) {
  try {
    return JSON.parse(json);
  } catch (e) {
    const message = e instanceof Error ? e.message : "parse error";
    throw new Error(`Invalid ${fieldName} format: ${message}`);
  }
}
function parseScoreArray(json) {
  if (!json) {
    return [];
  }
  const parsed = safeParseJson(json, "score");
  if (!Array.isArray(parsed)) {
    throw new Error("Score must be an array");
  }
  return parsed;
}
function parseParsArray(json) {
  if (!json) {
    return [];
  }
  const parsed = safeParseJson(json, "pars");
  if (!Array.isArray(parsed)) {
    throw new Error("Pars must be an array");
  }
  return parsed;
}
function parseStrokeIndex(json) {
  if (!json) {
    return [];
  }
  const parsed = safeParseJson(json, "stroke index");
  if (!Array.isArray(parsed)) {
    throw new Error("Stroke index must be an array");
  }
  return parsed;
}
function safeParseJsonWithDefault(json, defaultValue) {
  if (!json) {
    return defaultValue;
  }
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

// src/utils/points.ts
function calculateDefaultPoints(position, numberOfParticipants, multiplier = 1) {
  if (position <= 0)
    return 0;
  let basePoints;
  if (position === 1) {
    basePoints = numberOfParticipants + 2;
  } else if (position === 2) {
    basePoints = numberOfParticipants;
  } else {
    basePoints = numberOfParticipants - (position - 1);
    basePoints = Math.max(0, basePoints);
  }
  return basePoints * multiplier;
}

// src/services/leaderboard.service.ts
class LeaderboardService {
  db;
  constructor(db) {
    this.db = db;
  }
  async getLeaderboard(competitionId) {
    const response = await this.getLeaderboardWithDetails(competitionId);
    return response.entries;
  }
  async getLeaderboardWithDetails(competitionId) {
    const context = this.loadLeaderboardContext(competitionId);
    const participants = this.findParticipantsForCompetition(competitionId);
    const entries = participants.map((p) => this.buildParticipantEntry(p, context));
    const sortedEntries = this.sortLeaderboard(entries);
    const entriesWithPoints = this.addPointsToLeaderboard(sortedEntries, context, competitionId);
    return this.buildLeaderboardResponse(entriesWithPoints, context, competitionId);
  }
  async getTeamLeaderboard(competitionId) {
    const leaderboard = await this.getLeaderboard(competitionId);
    const competition = this.findCompetitionWithPars(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }
    const numberOfTeams = this.findCompetitionTeamCount(competitionId);
    return this.transformLeaderboardToTeamLeaderboard(leaderboard, numberOfTeams, competition.points_multiplier || 1);
  }
  loadLeaderboardContext(competitionId) {
    const competition = this.findCompetitionWithPars(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }
    const isTourCompetition = !!competition.tour_id;
    const isResultsFinal = !!competition.is_results_final;
    const scoringMode = competition.tour_id ? this.findTourScoringMode(competition.tour_id) : undefined;
    const needsStrokeIndex = scoringMode && scoringMode !== "gross";
    const strokeIndex = needsStrokeIndex ? this.parseStrokeIndex(competition.course_stroke_index) : [];
    const { teeInfo, courseRating, slopeRating } = this.getTeeInfoForCompetition(competition.tee_id, scoringMode, strokeIndex);
    const playerHandicaps = this.getPlayerHandicapsForCompetition(competition.tour_id, scoringMode);
    const categories = competition.tour_id ? this.findCategoriesForCompetition(competition.tour_id, competitionId) : [];
    const categoryTeeRatings = this.getCategoryTeeRatingsForCompetition(competitionId, competition.tour_id, scoringMode);
    const pars = parseParsArray(competition.pars);
    const totalPar = pars.reduce((sum, par) => sum + par, 0);
    const isOpenCompetitionClosed = this.isCompetitionWindowClosed(competition);
    return {
      competition,
      pars,
      totalPar,
      scoringMode,
      isTourCompetition,
      isResultsFinal,
      isOpenCompetitionClosed,
      teeInfo,
      strokeIndex,
      courseRating,
      slopeRating,
      categoryTeeRatings,
      categories,
      playerHandicaps
    };
  }
  buildParticipantEntry(participant, context) {
    const score = this.parseParticipantScore(participant.score);
    const handicapIndex = this.getParticipantHandicapIndex(participant, context.playerHandicaps);
    const handicapInfo = this.calculateHandicapInfo(participant, handicapIndex, context);
    if (participant.manual_score_total !== null && participant.manual_score_total !== undefined) {
      return this.buildManualScoreEntry(participant, score, handicapIndex, handicapInfo, context);
    }
    return this.buildHoleByHoleEntry(participant, score, handicapIndex, handicapInfo, context);
  }
  getParticipantHandicapIndex(participant, playerHandicaps) {
    if (participant.handicap_index !== null && participant.handicap_index !== undefined) {
      return participant.handicap_index;
    }
    if (participant.player_id) {
      return playerHandicaps.get(participant.player_id) ?? null;
    }
    return null;
  }
  calculateHandicapInfo(participant, handicapIndex, context) {
    if (handicapIndex === null || !context.scoringMode || context.scoringMode === "gross") {
      return {};
    }
    let playerCourseRating = context.courseRating;
    let playerSlopeRating = context.slopeRating;
    if (participant.category_id && context.categoryTeeRatings.has(participant.category_id)) {
      const catTee = context.categoryTeeRatings.get(participant.category_id);
      playerCourseRating = catTee.courseRating;
      playerSlopeRating = catTee.slopeRating;
    }
    const courseHandicap = calculateCourseHandicap(handicapIndex, playerSlopeRating, playerCourseRating, context.totalPar);
    const handicapStrokesPerHole = distributeHandicapStrokes(courseHandicap, context.strokeIndex);
    return { courseHandicap, handicapStrokesPerHole };
  }
  buildManualScoreEntry(participant, score, handicapIndex, handicapInfo, context) {
    const totalShots = participant.manual_score_total;
    const holesPlayed = GOLF.HOLES_PER_ROUND;
    const relativeToPar = totalShots - context.totalPar;
    let netTotalShots;
    let netRelativeToPar;
    if (handicapInfo.courseHandicap !== undefined) {
      netTotalShots = totalShots - handicapInfo.courseHandicap;
      netRelativeToPar = netTotalShots - context.totalPar;
    }
    return {
      participant: this.transformParticipantRowForLeaderboard(participant, score, handicapIndex, participant.category_id, participant.category_name),
      totalShots,
      holesPlayed,
      relativeToPar,
      startTime: participant.teetime,
      netTotalShots,
      netRelativeToPar,
      courseHandicap: handicapInfo.courseHandicap,
      isDNF: false
    };
  }
  buildHoleByHoleEntry(participant, score, handicapIndex, handicapInfo, context) {
    const holesPlayed = this.calculateHolesPlayed(score);
    const totalShots = this.calculateTotalShots(score);
    const relativeToPar = this.calculateRelativeToPar(score, context.pars);
    let netTotalShots;
    let netRelativeToPar;
    if (handicapInfo.courseHandicap !== undefined && handicapInfo.handicapStrokesPerHole && holesPlayed > 0 && !score.includes(GOLF.UNREPORTED_HOLE)) {
      const netScores = this.calculateNetScores(score, context.pars, holesPlayed, totalShots, handicapInfo.courseHandicap, handicapInfo.handicapStrokesPerHole);
      netTotalShots = netScores.netTotalShots;
      netRelativeToPar = netScores.netRelativeToPar;
    }
    const isDNF = context.isOpenCompetitionClosed && holesPlayed < GOLF.HOLES_PER_ROUND;
    return {
      participant: this.transformParticipantRowForLeaderboard(participant, score, handicapIndex, participant.category_id, participant.category_name),
      totalShots,
      holesPlayed,
      relativeToPar,
      startTime: participant.teetime,
      netTotalShots,
      netRelativeToPar,
      courseHandicap: handicapInfo.courseHandicap,
      isDNF
    };
  }
  parseParticipantScore(score) {
    if (typeof score === "string") {
      return safeParseJsonWithDefault(score, []);
    }
    return Array.isArray(score) ? score : [];
  }
  calculateHolesPlayed(score) {
    return score.filter((s) => s > 0 || s === GOLF.UNREPORTED_HOLE).length;
  }
  calculateTotalShots(score) {
    return score.reduce((sum, shots) => sum + (shots > 0 ? shots : 0), 0);
  }
  calculateRelativeToPar(score, pars) {
    let relativeToPar = 0;
    for (let i = 0;i < score.length; i++) {
      if (score[i] > 0 && pars[i] !== undefined) {
        relativeToPar += score[i] - pars[i];
      }
    }
    return relativeToPar;
  }
  calculateNetScores(score, pars, holesPlayed, totalShots, courseHandicap, handicapStrokesPerHole) {
    if (holesPlayed === 0 || score.includes(GOLF.UNREPORTED_HOLE)) {
      return { netTotalShots: undefined, netRelativeToPar: undefined };
    }
    let netScore = 0;
    let parForHolesPlayed = 0;
    for (let i = 0;i < score.length; i++) {
      if (score[i] > 0) {
        netScore += score[i] - handicapStrokesPerHole[i];
        parForHolesPlayed += pars[i] || 0;
      }
    }
    const netRelativeToPar = netScore - parForHolesPlayed;
    const netTotalShots = holesPlayed === GOLF.HOLES_PER_ROUND ? totalShots - courseHandicap : undefined;
    return { netTotalShots, netRelativeToPar };
  }
  isCompetitionWindowClosed(competition) {
    return competition.start_mode === "open" && !!competition.open_end && new Date(competition.open_end) < new Date;
  }
  getTeeInfoForCompetition(teeId, scoringMode, strokeIndex) {
    let courseRating = GOLF.STANDARD_COURSE_RATING;
    let slopeRating = GOLF.STANDARD_SLOPE_RATING;
    let teeInfo;
    if (teeId) {
      const tee = this.findTeeWithRatings(teeId);
      if (tee) {
        const ratings = this.extractTeeRatings(tee);
        courseRating = ratings.courseRating;
        slopeRating = ratings.slopeRating;
        teeInfo = this.buildTeeInfo(tee, strokeIndex, courseRating, slopeRating);
      }
    }
    if (!teeInfo && scoringMode && scoringMode !== "gross") {
      teeInfo = this.buildDefaultTeeInfo(courseRating, slopeRating, strokeIndex);
    }
    return { teeInfo, courseRating, slopeRating };
  }
  getPlayerHandicapsForCompetition(tourId, scoringMode) {
    if (!tourId || !scoringMode || scoringMode === "gross") {
      return new Map;
    }
    const handicapRows = this.findPlayerHandicapRows(tourId);
    return this.buildPlayerHandicapMap(handicapRows);
  }
  getCategoryTeeRatingsForCompetition(competitionId, tourId, scoringMode) {
    if (!tourId || !scoringMode || scoringMode === "gross") {
      return new Map;
    }
    const categoryTeeRows = this.findCategoryTeeRows(competitionId);
    return this.buildCategoryTeeRatingsMap(categoryTeeRows);
  }
  transformParticipantRowForLeaderboard(row, parsedScore, handicapIndex, categoryId, categoryName) {
    return {
      id: row.id,
      tee_order: row.tee_order,
      team_id: row.team_id,
      tee_time_id: row.tee_time_id,
      position_name: row.position_name,
      player_name: row.player_name,
      player_id: row.player_id,
      score: parsedScore,
      is_locked: Boolean(row.is_locked),
      locked_at: row.locked_at,
      handicap_index: handicapIndex,
      manual_score_out: row.manual_score_out,
      manual_score_in: row.manual_score_in,
      manual_score_total: row.manual_score_total,
      is_dq: Boolean(row.is_dq),
      admin_notes: row.admin_notes,
      admin_modified_by: row.admin_modified_by,
      admin_modified_at: row.admin_modified_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      team_name: row.team_name,
      category_id: categoryId ?? undefined,
      category_name: categoryName ?? undefined
    };
  }
  parseStrokeIndex(json) {
    if (!json) {
      throw new Error("Course stroke_index is required but not set. Please configure stroke index for this course.");
    }
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      if (!Array.isArray(parsed) || parsed.length !== GOLF.HOLES_PER_ROUND) {
        throw new Error("Invalid stroke_index format: must be array of 18 numbers");
      }
      return parsed;
    } catch (e) {
      if (e instanceof Error && e.message.includes("stroke_index")) {
        throw e;
      }
      throw new Error(`Failed to parse stroke_index: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }
  extractTeeRatings(tee) {
    let courseRating = tee.course_rating || GOLF.STANDARD_COURSE_RATING;
    let slopeRating = tee.slope_rating || GOLF.STANDARD_SLOPE_RATING;
    if (tee.ratings_json) {
      const ratings = safeParseJsonWithDefault(tee.ratings_json, []);
      const menRating = ratings.find((r) => r.gender === "men");
      if (menRating) {
        courseRating = menRating.course_rating;
        slopeRating = menRating.slope_rating;
      }
    }
    return { courseRating, slopeRating };
  }
  buildTeeInfo(tee, strokeIndex, courseRating, slopeRating) {
    return {
      id: tee.id,
      name: tee.name,
      color: tee.color,
      courseRating,
      slopeRating,
      strokeIndex
    };
  }
  buildDefaultTeeInfo(courseRating, slopeRating, strokeIndex) {
    return {
      id: 0,
      name: "Default",
      courseRating,
      slopeRating,
      strokeIndex
    };
  }
  buildPlayerHandicapMap(rows) {
    const map = new Map;
    for (const row of rows) {
      if (row.handicap_index !== null) {
        map.set(row.player_id, row.handicap_index);
      }
    }
    return map;
  }
  transformCategoryTeeRow(row) {
    let courseRating = row.legacy_course_rating || GOLF.STANDARD_COURSE_RATING;
    let slopeRating = row.legacy_slope_rating || GOLF.STANDARD_SLOPE_RATING;
    if (row.ratings_json) {
      const ratings = safeParseJsonWithDefault(row.ratings_json, []);
      const menRating = ratings.find((r) => r.gender === "men");
      if (menRating) {
        courseRating = menRating.course_rating;
        slopeRating = menRating.slope_rating;
      } else if (ratings.length > 0) {
        courseRating = ratings[0].course_rating;
        slopeRating = ratings[0].slope_rating;
      }
    }
    return {
      categoryId: row.category_id,
      teeId: row.tee_id,
      teeName: row.tee_name,
      courseRating,
      slopeRating
    };
  }
  buildCategoryTeeRatingsMap(rows) {
    const map = new Map;
    for (const row of rows) {
      map.set(row.category_id, this.transformCategoryTeeRow(row));
    }
    return map;
  }
  sortLeaderboard(entries) {
    return entries.sort((a, b) => {
      const aIsDQ = a.participant.is_dq;
      const bIsDQ = b.participant.is_dq;
      if (aIsDQ && !bIsDQ)
        return 1;
      if (!aIsDQ && bIsDQ)
        return -1;
      if (aIsDQ && bIsDQ) {
        const aName = a.participant.player_name || a.participant.team_name || "";
        const bName = b.participant.player_name || b.participant.team_name || "";
        return aName.localeCompare(bName);
      }
      if (a.isDNF && !b.isDNF)
        return 1;
      if (!a.isDNF && b.isDNF)
        return -1;
      if (a.isDNF && b.isDNF) {
        return b.holesPlayed - a.holesPlayed;
      }
      return a.relativeToPar - b.relativeToPar;
    });
  }
  addPointsToLeaderboard(sortedEntries, context, competitionId) {
    if (!context.isTourCompetition) {
      return sortedEntries;
    }
    if (context.isResultsFinal) {
      const storedResults = this.findStoredResultRows(competitionId);
      return this.addStoredPointsToLeaderboard(sortedEntries, storedResults);
    }
    const pointTemplate = context.competition.point_template_id ? this.findPointTemplateRow(context.competition.point_template_id) : null;
    return this.addProjectedPointsToLeaderboard(sortedEntries, pointTemplate, context.competition.points_multiplier || 1);
  }
  addStoredPointsToLeaderboard(entries, storedResults) {
    const grossResultsMap = new Map;
    const netResultsMap = new Map;
    for (const r of storedResults) {
      if (r.scoring_type === "gross") {
        grossResultsMap.set(r.participant_id, r);
      } else if (r.scoring_type === "net") {
        netResultsMap.set(r.participant_id, r);
      }
    }
    return entries.map((entry) => {
      const grossStored = grossResultsMap.get(entry.participant.id);
      const netStored = netResultsMap.get(entry.participant.id);
      return {
        ...entry,
        position: grossStored?.position || 0,
        points: grossStored?.points || 0,
        netPosition: netStored?.position,
        netPoints: netStored?.points,
        isProjected: false
      };
    });
  }
  addProjectedPointsToLeaderboard(sortedEntries, pointTemplate, pointsMultiplier) {
    const grossPositions = this.calculateProjectedPositions(sortedEntries, (entry) => entry.relativeToPar, pointTemplate, pointsMultiplier);
    const hasNetScores = sortedEntries.some((e) => e.netRelativeToPar !== undefined);
    const netPositions = hasNetScores ? this.calculateProjectedPositions(sortedEntries, (entry) => entry.netRelativeToPar ?? entry.relativeToPar, pointTemplate, pointsMultiplier) : null;
    return sortedEntries.map((entry) => {
      const grossResult = grossPositions.get(entry.participant.id);
      const netResult = netPositions?.get(entry.participant.id);
      return {
        ...entry,
        position: grossResult?.position ?? 0,
        points: grossResult?.points ?? 0,
        netPosition: netResult?.position,
        netPoints: netResult?.points,
        isProjected: true
      };
    });
  }
  calculateProjectedPositions(entries, scoreGetter, pointTemplate, pointsMultiplier) {
    const finishedPlayers = entries.filter((e) => e.holesPlayed === GOLF.HOLES_PER_ROUND && !e.participant.is_dq && !e.isDNF);
    const numberOfPlayers = finishedPlayers.length;
    const sortedByScore = [...finishedPlayers].sort((a, b) => {
      return scoreGetter(a) - scoreGetter(b);
    });
    let currentPosition = 1;
    let previousScore = Number.MIN_SAFE_INTEGER;
    const results = new Map;
    sortedByScore.forEach((entry, index) => {
      const score = scoreGetter(entry);
      if (score !== previousScore) {
        currentPosition = index + 1;
      }
      previousScore = score;
      const points = this.calculateProjectedPoints(currentPosition, numberOfPlayers, pointTemplate, pointsMultiplier);
      results.set(entry.participant.id, { position: currentPosition, points });
    });
    return results;
  }
  calculateProjectedPoints(position, numberOfPlayers, pointTemplate, pointsMultiplier) {
    if (position <= 0)
      return 0;
    let basePoints;
    if (pointTemplate) {
      try {
        const structure = JSON.parse(pointTemplate.points_structure);
        if (structure[position.toString()]) {
          basePoints = structure[position.toString()];
        } else {
          basePoints = structure["default"] || 0;
        }
      } catch {
        basePoints = 0;
      }
    } else {
      basePoints = calculateDefaultPoints(position, numberOfPlayers);
    }
    return Math.round(basePoints * pointsMultiplier);
  }
  buildLeaderboardResponse(entries, context, competitionId) {
    const categoryTeesResponse = this.buildCategoryTeesResponse(context.categories, context.categoryTeeRatings);
    return {
      entries,
      competitionId,
      scoringMode: context.scoringMode,
      isTourCompetition: context.isTourCompetition,
      isResultsFinal: context.isResultsFinal,
      tee: context.teeInfo,
      categoryTees: categoryTeesResponse,
      categories: context.categories.length > 0 ? context.categories : undefined
    };
  }
  buildCategoryTeesResponse(categories, categoryTeeRatings) {
    if (categoryTeeRatings.size === 0 || categories.length === 0) {
      return;
    }
    const response = [];
    for (const cat of categories) {
      const catTee = categoryTeeRatings.get(cat.id);
      if (catTee) {
        response.push({
          categoryId: cat.id,
          categoryName: cat.name,
          teeId: catTee.teeId,
          teeName: catTee.teeName,
          courseRating: catTee.courseRating,
          slopeRating: catTee.slopeRating
        });
      }
    }
    return response.length > 0 ? response : undefined;
  }
  transformLeaderboardToTeamLeaderboard(leaderboard, numberOfTeams, pointsMultiplier = 1) {
    const teamGroups = this.groupParticipantsByTeam(leaderboard);
    this.populateTeamStartTimes(teamGroups);
    const sortedTeamGroups = this.sortTeamGroups(Object.values(teamGroups));
    const sortedTeams = this.mapTeamGroupsToEntries(sortedTeamGroups);
    this.assignTeamPoints(sortedTeams, numberOfTeams, pointsMultiplier);
    return sortedTeams;
  }
  groupParticipantsByTeam(leaderboard) {
    return leaderboard.reduce((acc, entry) => {
      const teamId = entry.participant.team_id;
      const teamName = entry.participant.team_name;
      if (!acc[teamId]) {
        acc[teamId] = {
          teamId,
          teamName,
          participants: [],
          totalShots: 0,
          totalRelativeScore: 0,
          maxHolesCompleted: 0,
          startTime: null
        };
      }
      const hasStarted = entry.holesPlayed > 0;
      const hasInvalidRound = entry.participant.score.includes(-1);
      acc[teamId].participants.push(entry);
      if (hasStarted && !hasInvalidRound) {
        acc[teamId].totalShots += entry.totalShots;
        acc[teamId].totalRelativeScore += entry.relativeToPar;
      }
      if (hasStarted) {
        acc[teamId].maxHolesCompleted = Math.max(acc[teamId].maxHolesCompleted, entry.holesPlayed);
      }
      return acc;
    }, {});
  }
  populateTeamStartTimes(teamGroups) {
    Object.values(teamGroups).forEach((team) => {
      let earliestStartTime = null;
      team.participants.forEach((participant) => {
        if (participant.startTime) {
          if (!earliestStartTime || participant.startTime < earliestStartTime) {
            earliestStartTime = participant.startTime;
          }
        }
      });
      if (earliestStartTime) {
        team.startTime = earliestStartTime;
      }
    });
  }
  sortTeamGroups(teamGroups) {
    return teamGroups.sort((a, b) => {
      const statusA = this.getTeamStatus(a);
      const statusB = this.getTeamStatus(b);
      if (statusA !== statusB) {
        const statusOrder = { FINISHED: 0, IN_PROGRESS: 1, NOT_STARTED: 2 };
        return statusOrder[statusA] - statusOrder[statusB];
      }
      if (statusA === "NOT_STARTED")
        return 0;
      if (a.totalRelativeScore !== b.totalRelativeScore) {
        return a.totalRelativeScore - b.totalRelativeScore;
      }
      return this.compareTeamIndividualScores(a, b);
    });
  }
  getTeamStatus(team) {
    const anyStarted = team.participants.some((p) => p.holesPlayed > 0);
    if (!anyStarted)
      return "NOT_STARTED";
    const allFinished = team.participants.every((p) => p.participant.is_locked && !p.participant.score.includes(-1));
    if (allFinished)
      return "FINISHED";
    return "IN_PROGRESS";
  }
  compareTeamIndividualScores(a, b) {
    const sortedScoresA = a.participants.filter((p) => p.holesPlayed > 0 && !p.participant.score.includes(-1)).map((p) => p.relativeToPar).sort((x, y) => x - y);
    const sortedScoresB = b.participants.filter((p) => p.holesPlayed > 0 && !p.participant.score.includes(-1)).map((p) => p.relativeToPar).sort((x, y) => x - y);
    const maxPlayers = Math.max(sortedScoresA.length, sortedScoresB.length);
    for (let i = 0;i < maxPlayers; i++) {
      const scoreA = sortedScoresA[i];
      const scoreB = sortedScoresB[i];
      if (scoreA === undefined)
        return 1;
      if (scoreB === undefined)
        return -1;
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
    }
    return 0;
  }
  mapTeamGroupsToEntries(sortedTeamGroups) {
    return sortedTeamGroups.map((team) => {
      const status = this.getTeamStatus(team);
      const anyStarted = team.participants.some((p) => p.holesPlayed > 0);
      let displayProgress;
      if (status === "NOT_STARTED") {
        displayProgress = team.startTime ? `Starts ${team.startTime}` : "Starts TBD";
      } else if (status === "FINISHED") {
        displayProgress = "F";
      } else {
        displayProgress = `Thru ${team.maxHolesCompleted}`;
      }
      return {
        teamId: team.teamId,
        teamName: team.teamName,
        status,
        startTime: team.startTime,
        displayProgress,
        totalRelativeScore: anyStarted ? team.totalRelativeScore : null,
        totalShots: anyStarted ? team.totalShots : null,
        teamPoints: null
      };
    });
  }
  assignTeamPoints(sortedTeams, numberOfTeams, pointsMultiplier) {
    if (numberOfTeams <= 0)
      return;
    let currentPosition = 0;
    let lastScoreSignature = null;
    sortedTeams.forEach((team, index) => {
      if (team.status !== "NOT_STARTED") {
        const scoreSignature = `${team.totalRelativeScore}-${index}`;
        if (scoreSignature !== lastScoreSignature) {
          currentPosition = index + 1;
        }
        team.teamPoints = calculateDefaultPoints(currentPosition, numberOfTeams, pointsMultiplier);
        lastScoreSignature = scoreSignature;
      }
    });
  }
  findCompetitionWithPars(id) {
    const stmt = this.db.prepare(`
      SELECT c.*, co.pars, co.stroke_index as course_stroke_index
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.id = ?
    `);
    return stmt.get(id);
  }
  findTourScoringMode(tourId) {
    const stmt = this.db.prepare("SELECT scoring_mode FROM tours WHERE id = ?");
    const tour = stmt.get(tourId);
    return tour?.scoring_mode;
  }
  findTeeWithRatings(teeId) {
    const stmt = this.db.prepare(`
      SELECT ct.*,
             (SELECT json_group_array(json_object('gender', ctr.gender, 'course_rating', ctr.course_rating, 'slope_rating', ctr.slope_rating))
              FROM course_tee_ratings ctr WHERE ctr.tee_id = ct.id) as ratings_json
      FROM course_tees ct
      WHERE ct.id = ?
    `);
    return stmt.get(teeId);
  }
  findPlayerHandicapRows(tourId) {
    const stmt = this.db.prepare(`
      SELECT te.player_id, COALESCE(te.playing_handicap, p.handicap) as handicap_index
      FROM tour_enrollments te
      JOIN players p ON te.player_id = p.id
      WHERE te.tour_id = ? AND te.player_id IS NOT NULL AND te.status = 'active'
    `);
    return stmt.all(tourId);
  }
  findParticipantsForCompetition(competitionId) {
    const stmt = this.db.prepare(`
      SELECT p.*, tm.name as team_name, tm.id as team_id, t.teetime, p.player_id,
             te.category_id, tc.name as category_name,
             COALESCE(pp.display_name, pl.name, p.player_names) as player_name
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      JOIN teams tm ON p.team_id = tm.id
      LEFT JOIN competitions c ON t.competition_id = c.id
      LEFT JOIN players pl ON p.player_id = pl.id
      LEFT JOIN player_profiles pp ON pl.id = pp.player_id
      LEFT JOIN tour_enrollments te ON p.player_id = te.player_id AND c.tour_id = te.tour_id
      LEFT JOIN tour_categories tc ON te.category_id = tc.id
      WHERE t.competition_id = ?
      ORDER BY t.teetime, p.tee_order
    `);
    return stmt.all(competitionId);
  }
  findCategoriesForCompetition(tourId, competitionId) {
    const stmt = this.db.prepare(`
      SELECT DISTINCT tc.id, tc.tour_id, tc.name, tc.description, tc.sort_order, tc.created_at
      FROM tour_categories tc
      INNER JOIN tour_enrollments te ON tc.id = te.category_id
      INNER JOIN participants p ON te.player_id = p.player_id
      INNER JOIN tee_times t ON p.tee_time_id = t.id
      WHERE tc.tour_id = ? AND t.competition_id = ?
      ORDER BY tc.sort_order ASC, tc.name ASC
    `);
    return stmt.all(tourId, competitionId);
  }
  findCategoryTeeRows(competitionId) {
    const stmt = this.db.prepare(`
      SELECT
        cct.category_id,
        cct.tee_id,
        ct.name as tee_name,
        ct.stroke_index,
        ct.course_rating as legacy_course_rating,
        ct.slope_rating as legacy_slope_rating,
        (SELECT json_group_array(json_object('gender', ctr.gender, 'course_rating', ctr.course_rating, 'slope_rating', ctr.slope_rating))
         FROM course_tee_ratings ctr WHERE ctr.tee_id = ct.id) as ratings_json
      FROM competition_category_tees cct
      JOIN course_tees ct ON cct.tee_id = ct.id
      WHERE cct.competition_id = ?
    `);
    return stmt.all(competitionId);
  }
  findStoredResultRows(competitionId) {
    const stmt = this.db.prepare(`
      SELECT participant_id, position, points, scoring_type
      FROM competition_results
      WHERE competition_id = ?
    `);
    return stmt.all(competitionId);
  }
  findPointTemplateRow(templateId) {
    const stmt = this.db.prepare("SELECT id, name, points_structure FROM point_templates WHERE id = ?");
    return stmt.get(templateId);
  }
  findSeriesTeamCount(seriesId) {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM series_teams WHERE series_id = ?");
    const result = stmt.get(seriesId);
    return result?.count || 0;
  }
  findCompetitionTeamCount(competitionId) {
    const stmt = this.db.prepare(`
      SELECT COUNT(DISTINCT p.team_id) as count
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      WHERE t.competition_id = ?
    `);
    const result = stmt.get(competitionId);
    return result?.count || 0;
  }
}

// src/services/competition-service.ts
function isValidYYYYMMDD(date) {
  const parsed = Date.parse(date);
  return !isNaN(parsed) && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

class CompetitionService {
  db;
  leaderboardService;
  constructor(db) {
    this.db = db;
    this.leaderboardService = new LeaderboardService(db);
  }
  async create(data) {
    this.validateCompetitionName(data.name);
    this.validateCompetitionDate(data.date);
    if (!this.findCourseExists(data.course_id)) {
      throw new Error("Course not found");
    }
    if (data.series_id && !this.findSeriesExists(data.series_id)) {
      throw new Error("Series not found");
    }
    if (data.tour_id && !this.findTourExists(data.tour_id)) {
      throw new Error("Tour not found");
    }
    if (data.tee_id) {
      const tee = this.findTeeWithCourse(data.tee_id);
      if (!tee) {
        throw new Error("Tee not found");
      }
      if (tee.course_id !== data.course_id) {
        throw new Error("Tee must belong to the competition's course");
      }
    }
    return this.insertCompetitionRow(data);
  }
  async findAll() {
    const rows = this.findAllCompetitionRows();
    return rows.map((row) => this.transformCompetitionRowToResult(row));
  }
  async findById(id) {
    const row = this.findCompetitionRowById(id);
    if (!row)
      return null;
    return this.transformCompetitionRowToResult(row);
  }
  async update(id, data) {
    const competition = await this.findById(id);
    if (!competition) {
      throw new Error("Competition not found");
    }
    this.validateCompetitionNameNotEmpty(data.name);
    this.validateCompetitionDateFormat(data.date);
    if (data.course_id && !this.findCourseExists(data.course_id)) {
      throw new Error("Course not found");
    }
    if (data.series_id !== undefined && data.series_id !== null) {
      if (!this.findSeriesExists(data.series_id)) {
        throw new Error("Series not found");
      }
    }
    if (data.tour_id !== undefined && data.tour_id !== null) {
      if (!this.findTourExists(data.tour_id)) {
        throw new Error("Tour not found");
      }
    }
    if (data.tee_id !== undefined && data.tee_id !== null) {
      const tee = this.findTeeWithCourse(data.tee_id);
      if (!tee) {
        throw new Error("Tee not found");
      }
      const effectiveCourseId = data.course_id ?? competition.course_id;
      if (tee.course_id !== effectiveCourseId) {
        throw new Error("Tee must belong to the competition's course");
      }
    }
    const { updates, values } = this.buildUpdateFields(data);
    if (updates.length === 0) {
      return competition;
    }
    return this.updateCompetitionRow(id, updates, values);
  }
  async delete(id) {
    const competition = await this.findById(id);
    if (!competition) {
      throw new Error("Competition not found");
    }
    const teeTimes = this.findTeeTimesForCompetition(id);
    if (teeTimes.length > 0) {
      throw new Error("Cannot delete competition that has tee times");
    }
    this.deleteCompetitionRow(id);
  }
  async getLeaderboard(competitionId) {
    return this.leaderboardService.getLeaderboard(competitionId);
  }
  async getLeaderboardWithDetails(competitionId) {
    return this.leaderboardService.getLeaderboardWithDetails(competitionId);
  }
  async getTeamLeaderboard(competitionId) {
    return this.leaderboardService.getTeamLeaderboard(competitionId);
  }
  transformCompetitionRowToResult(row) {
    return {
      ...row,
      course: {
        id: row.course_id,
        name: row.course_name
      },
      participant_count: row.participant_count ?? 0
    };
  }
  validateCompetitionName(name) {
    if (!name?.trim()) {
      throw new Error("Competition name is required");
    }
  }
  validateCompetitionDate(date) {
    if (!date?.trim()) {
      throw new Error("Competition date is required");
    }
    if (!isValidYYYYMMDD(date)) {
      throw new Error("Date must be in YYYY-MM-DD format (e.g., 2024-03-21)");
    }
  }
  validateCompetitionNameNotEmpty(name) {
    if (name && !name.trim()) {
      throw new Error("Competition name cannot be empty");
    }
  }
  validateCompetitionDateFormat(date) {
    if (date && !isValidYYYYMMDD(date)) {
      throw new Error("Date must be in YYYY-MM-DD format (e.g., 2024-03-21)");
    }
  }
  buildUpdateFields(data) {
    const updates = [];
    const values = [];
    if (data.name) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.date) {
      updates.push("date = ?");
      values.push(data.date);
    }
    if (data.course_id) {
      updates.push("course_id = ?");
      values.push(data.course_id);
    }
    if (data.series_id !== undefined) {
      updates.push("series_id = ?");
      values.push(data.series_id);
    }
    if (data.tour_id !== undefined) {
      updates.push("tour_id = ?");
      values.push(data.tour_id);
    }
    if (data.tee_id !== undefined) {
      updates.push("tee_id = ?");
      values.push(data.tee_id);
    }
    if (data.point_template_id !== undefined) {
      updates.push("point_template_id = ?");
      values.push(data.point_template_id);
    }
    if (data.manual_entry_format) {
      updates.push("manual_entry_format = ?");
      values.push(data.manual_entry_format);
    }
    if (data.points_multiplier !== undefined) {
      updates.push("points_multiplier = ?");
      values.push(data.points_multiplier);
    }
    if (data.venue_type !== undefined) {
      updates.push("venue_type = ?");
      values.push(data.venue_type);
    }
    if (data.start_mode !== undefined) {
      updates.push("start_mode = ?");
      values.push(data.start_mode);
    }
    if (data.open_start !== undefined) {
      updates.push("open_start = ?");
      values.push(data.open_start);
    }
    if (data.open_end !== undefined) {
      updates.push("open_end = ?");
      values.push(data.open_end);
    }
    return { updates, values };
  }
  findCourseExists(id) {
    const stmt = this.db.prepare("SELECT 1 FROM courses WHERE id = ?");
    return stmt.get(id) !== null;
  }
  findSeriesExists(id) {
    const stmt = this.db.prepare("SELECT 1 FROM series WHERE id = ?");
    return stmt.get(id) !== null;
  }
  findTourExists(id) {
    const stmt = this.db.prepare("SELECT 1 FROM tours WHERE id = ?");
    return stmt.get(id) !== null;
  }
  findTeeWithCourse(id) {
    const stmt = this.db.prepare("SELECT id, course_id FROM course_tees WHERE id = ?");
    return stmt.get(id);
  }
  findTeeTimesForCompetition(competitionId) {
    const stmt = this.db.prepare("SELECT id FROM tee_times WHERE competition_id = ?");
    return stmt.all(competitionId);
  }
  findAllCompetitionRows() {
    const stmt = this.db.prepare(`
      SELECT c.*, co.name as course_name,
        (SELECT COUNT(*)
         FROM participants p
         JOIN tee_times t ON p.tee_time_id = t.id
         WHERE t.competition_id = c.id) as participant_count
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
    `);
    return stmt.all();
  }
  findCompetitionRowById(id) {
    const stmt = this.db.prepare(`
      SELECT c.*, co.name as course_name
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.id = ?
    `);
    return stmt.get(id);
  }
  insertCompetitionRow(data) {
    const stmt = this.db.prepare(`
      INSERT INTO competitions (name, date, course_id, series_id, tour_id, tee_id, point_template_id, manual_entry_format, points_multiplier, venue_type, start_mode, open_start, open_end, owner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(data.name, data.date, data.course_id, data.series_id || null, data.tour_id || null, data.tee_id || null, data.point_template_id || null, data.manual_entry_format || "out_in_total", data.points_multiplier ?? 1, data.venue_type || "outdoor", data.start_mode || "scheduled", data.open_start || null, data.open_end || null, data.owner_id || null);
  }
  updateCompetitionRow(id, updates, values) {
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    const stmt = this.db.prepare(`
      UPDATE competitions
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(...values);
  }
  deleteCompetitionRow(id) {
    const stmt = this.db.prepare("DELETE FROM competitions WHERE id = ?");
    stmt.run(id);
  }
  findUserRole(userId) {
    const row = this.db.prepare("SELECT role FROM users WHERE id = ?").get(userId);
    return row?.role ?? null;
  }
  findStandAloneCompetitionRows() {
    const stmt = this.db.prepare(`
      SELECT c.*, co.name as course_name,
        (SELECT COUNT(*)
         FROM participants p
         JOIN tee_times t ON p.tee_time_id = t.id
         WHERE t.competition_id = c.id) as participant_count
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.series_id IS NULL AND c.tour_id IS NULL
      ORDER BY c.date DESC
    `);
    return stmt.all();
  }
  findStandAloneCompetitionsForUserRows(userId) {
    const stmt = this.db.prepare(`
      SELECT DISTINCT c.*, co.name as course_name,
        (SELECT COUNT(*)
         FROM participants p
         JOIN tee_times t ON p.tee_time_id = t.id
         WHERE t.competition_id = c.id) as participant_count
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      LEFT JOIN competition_admins ca ON c.id = ca.competition_id AND ca.user_id = ?
      WHERE c.series_id IS NULL
        AND c.tour_id IS NULL
        AND (c.owner_id = ? OR ca.user_id IS NOT NULL)
      ORDER BY c.date DESC
    `);
    return stmt.all(userId, userId);
  }
  findCompetitionsForUserRows(userId) {
    const stmt = this.db.prepare(`
      SELECT DISTINCT c.*, co.name as course_name,
        (SELECT COUNT(*)
         FROM participants p
         JOIN tee_times t ON p.tee_time_id = t.id
         WHERE t.competition_id = c.id) as participant_count
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      LEFT JOIN competition_admins ca ON c.id = ca.competition_id AND ca.user_id = ?
      LEFT JOIN series s ON c.series_id = s.id
      LEFT JOIN series_admins sa ON s.id = sa.series_id AND sa.user_id = ?
      LEFT JOIN tours t ON c.tour_id = t.id
      LEFT JOIN tour_admins ta ON t.id = ta.tour_id AND ta.user_id = ?
      WHERE
        c.owner_id = ?
        OR ca.user_id IS NOT NULL
        OR s.owner_id = ?
        OR sa.user_id IS NOT NULL
        OR t.owner_id = ?
        OR ta.user_id IS NOT NULL
      ORDER BY c.date DESC
    `);
    return stmt.all(userId, userId, userId, userId, userId, userId);
  }
  async findStandAlone(userId) {
    const userRole = this.findUserRole(userId);
    const rows = userRole === "SUPER_ADMIN" ? this.findStandAloneCompetitionRows() : this.findStandAloneCompetitionsForUserRows(userId);
    return rows.map((row) => this.transformCompetitionRowToResult(row));
  }
  async findForUser(userId) {
    const userRole = this.findUserRole(userId);
    const rows = userRole === "SUPER_ADMIN" ? this.findAllCompetitionRows() : this.findCompetitionsForUserRows(userId);
    return rows.map((row) => this.transformCompetitionRowToResult(row));
  }
}

// src/utils/tee-colors.ts
var SWEDISH_TEE_COLORS = {
  vit: "White",
  r\u{f6}d: "Red",
  bl\u{e5}: "Blue",
  gul: "Yellow",
  orange: "Orange",
  svart: "Black",
  gr\u{f6}n: "Green",
  gr\u{e5}: "Gray",
  rosa: "Pink"
};
function getTeeColor(teeName) {
  const normalized = teeName.toLowerCase().trim();
  if (SWEDISH_TEE_COLORS[normalized]) {
    return SWEDISH_TEE_COLORS[normalized];
  }
  const englishColors = Object.values(SWEDISH_TEE_COLORS).map((c) => c.toLowerCase());
  if (englishColors.includes(normalized)) {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  return;
}

// src/services/course-service.ts
class CourseService {
  db;
  teeService;
  clubService;
  constructor(db, teeService, clubService) {
    this.db = db;
    this.teeService = teeService;
    this.clubService = clubService;
  }
  calculatePars(pars) {
    const out = pars.slice(0, 9).reduce((sum, par) => sum + par, 0);
    const in_ = pars.slice(9).reduce((sum, par) => sum + par, 0);
    return {
      holes: pars,
      out,
      in: in_,
      total: out + in_
    };
  }
  transformCourseRow(row) {
    const pars = parseParsArray(row.pars);
    const strokeIndex = row.stroke_index ? JSON.parse(row.stroke_index) : undefined;
    return {
      id: row.id,
      name: row.name,
      club_id: row.club_id ?? undefined,
      club_name: row.club_name ?? undefined,
      pars: this.calculatePars(pars),
      stroke_index: strokeIndex,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  validateCourseName(name) {
    if (!name?.trim()) {
      throw new Error("Course name is required");
    }
  }
  validateCourseNameNotEmpty(name) {
    if (name !== undefined && !name.trim()) {
      throw new Error("Course name cannot be empty");
    }
  }
  validateParsArray(pars) {
    if (pars.length > GOLF.HOLES_PER_ROUND) {
      throw new Error(`Course cannot have more than ${GOLF.HOLES_PER_ROUND} holes`);
    }
    if (!pars.every((par) => Number.isInteger(par) && par >= GOLF.MIN_PAR && par <= GOLF.MAX_PAR)) {
      throw new Error(`All pars must be integers between ${GOLF.MIN_PAR} and ${GOLF.MAX_PAR}`);
    }
  }
  validateStrokeIndex(strokeIndex) {
    if (strokeIndex.length !== GOLF.HOLES_PER_ROUND) {
      throw new Error(`Stroke index must have exactly ${GOLF.HOLES_PER_ROUND} values`);
    }
    const sorted = [...strokeIndex].sort((a, b) => a - b);
    const expected = Array.from({ length: GOLF.HOLES_PER_ROUND }, (_, i) => i + 1);
    if (!sorted.every((val, i) => val === expected[i])) {
      throw new Error("Stroke index must contain each value from 1 to 18 exactly once");
    }
  }
  validateImportCourseData(data) {
    if (!data.course_metadata?.course_name?.trim()) {
      throw new Error("Course name is required");
    }
    if (!Array.isArray(data.scorecard) || data.scorecard.length !== GOLF.HOLES_PER_ROUND) {
      throw new Error(`Scorecard must have exactly ${GOLF.HOLES_PER_ROUND} holes`);
    }
    if (!Array.isArray(data.tee_ratings) || data.tee_ratings.length === 0) {
      throw new Error("At least one tee rating is required");
    }
  }
  extractParsFromScorecard(scorecard) {
    return scorecard.map((hole) => hole.par);
  }
  extractStrokeIndexFromScorecard(scorecard) {
    return scorecard.map((hole) => hole.hcp_men);
  }
  insertCourseRow(name, clubId) {
    const stmt = this.db.prepare(`
      INSERT INTO courses (name, pars, club_id)
      VALUES (?, ?, ?)
      RETURNING *
    `);
    return stmt.get(name, JSON.stringify([]), clubId ?? null);
  }
  findAllCourseRows() {
    const stmt = this.db.prepare("SELECT * FROM courses");
    return stmt.all();
  }
  findAllCoursesWithClub() {
    const stmt = this.db.prepare(`
      SELECT c.*, cl.name as club_name
      FROM courses c
      LEFT JOIN clubs cl ON c.club_id = cl.id
      ORDER BY COALESCE(cl.name, c.name), c.name
    `);
    return stmt.all();
  }
  findCourseRowById(id) {
    const stmt = this.db.prepare("SELECT * FROM courses WHERE id = ?");
    return stmt.get(id);
  }
  findCourseRowByName(name) {
    const stmt = this.db.prepare("SELECT * FROM courses WHERE LOWER(name) = LOWER(?)");
    return stmt.get(name);
  }
  updateCourseNameRow(id, name) {
    const stmt = this.db.prepare(`
      UPDATE courses
      SET name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(name, id);
  }
  updateCourseClubIdRow(id, clubId) {
    const stmt = this.db.prepare(`
      UPDATE courses
      SET club_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(clubId, id);
  }
  updateCourseNameAndClubIdRow(id, name, clubId) {
    const stmt = this.db.prepare(`
      UPDATE courses
      SET name = ?, club_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(name, clubId, id);
  }
  updateCourseParsRow(id, pars) {
    const stmt = this.db.prepare(`
      UPDATE courses
      SET pars = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(JSON.stringify(pars), id);
  }
  updateCourseStrokeIndexRow(id, strokeIndex) {
    const stmt = this.db.prepare(`
      UPDATE courses
      SET stroke_index = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(JSON.stringify(strokeIndex), id);
  }
  updateCourseParsAndStrokeIndexRow(id, pars, strokeIndex) {
    const stmt = this.db.prepare(`
      UPDATE courses
      SET pars = ?, stroke_index = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(JSON.stringify(pars), JSON.stringify(strokeIndex), id);
  }
  findCompetitionsByCourse(courseId) {
    const stmt = this.db.prepare("SELECT id FROM competitions WHERE course_id = ?");
    return stmt.all(courseId);
  }
  deleteCourseRow(id) {
    const stmt = this.db.prepare("DELETE FROM courses WHERE id = ?");
    stmt.run(id);
  }
  async create(data) {
    this.validateCourseName(data.name);
    const row = this.insertCourseRow(data.name, data.club_id);
    return this.transformCourseRow(row);
  }
  async findAll() {
    const rows = this.findAllCoursesWithClub();
    return rows.map((row) => this.transformCourseRow(row));
  }
  async findById(id) {
    const row = this.findCourseRowById(id);
    if (!row)
      return null;
    return this.transformCourseRow(row);
  }
  async update(id, data) {
    const existingRow = this.findCourseRowById(id);
    if (!existingRow) {
      throw new Error("Course not found");
    }
    this.validateCourseNameNotEmpty(data.name);
    if (!data.name && data.club_id === undefined) {
      return this.transformCourseRow(existingRow);
    }
    let updatedRow;
    if (data.name && data.club_id !== undefined) {
      updatedRow = this.updateCourseNameAndClubIdRow(id, data.name, data.club_id ?? null);
    } else if (data.name) {
      updatedRow = this.updateCourseNameRow(id, data.name);
    } else {
      updatedRow = this.updateCourseClubIdRow(id, data.club_id ?? null);
    }
    return this.transformCourseRow(updatedRow);
  }
  async updateHoles(id, pars, strokeIndex) {
    const existingRow = this.findCourseRowById(id);
    if (!existingRow) {
      throw new Error("Course not found");
    }
    this.validateParsArray(pars);
    if (strokeIndex) {
      this.validateStrokeIndex(strokeIndex);
    }
    let updatedRow;
    if (strokeIndex) {
      updatedRow = this.updateCourseParsAndStrokeIndexRow(id, pars, strokeIndex);
    } else {
      updatedRow = this.updateCourseParsRow(id, pars);
    }
    return this.transformCourseRow(updatedRow);
  }
  async delete(id) {
    const existingRow = this.findCourseRowById(id);
    if (!existingRow) {
      throw new Error("Course not found");
    }
    const competitions = this.findCompetitionsByCourse(id);
    if (competitions.length > 0) {
      throw new Error("Cannot delete course that is used in competitions");
    }
    this.deleteCourseRow(id);
  }
  async importForCourse(courseId, data) {
    if (!this.teeService) {
      throw new Error("CourseTeeService is required for import functionality");
    }
    if (!this.clubService) {
      throw new Error("ClubService is required for import functionality");
    }
    const existingRow = this.findCourseRowById(courseId);
    if (!existingRow) {
      throw new Error("Course not found");
    }
    try {
      this.validateImportCourseData(data);
      const courseName = data.course_metadata.course_name.trim();
      const clubName = data.course_metadata.club_name.trim();
      const pars = this.extractParsFromScorecard(data.scorecard);
      const strokeIndex = this.extractStrokeIndexFromScorecard(data.scorecard);
      this.validateParsArray(pars);
      this.validateStrokeIndex(strokeIndex);
      const club = await this.clubService.findOrCreate(clubName);
      if (existingRow.name !== courseName) {
        await this.update(courseId, { name: courseName, club_id: club.id });
      } else {
        await this.update(courseId, { club_id: club.id });
      }
      await this.updateHoles(courseId, pars, strokeIndex);
      const existingTees = this.teeService.findByCourse(courseId);
      let teesProcessed = 0;
      for (const teeRating of data.tee_ratings) {
        const teeName = teeRating.tee_name.trim();
        const teeColor = getTeeColor(teeName);
        const existingTee = existingTees.find((t) => t.name.toLowerCase() === teeName.toLowerCase());
        let teeId;
        if (existingTee) {
          const updatedTee = this.teeService.update(existingTee.id, {
            name: teeName,
            color: teeColor
          });
          teeId = updatedTee.id;
        } else {
          const ratings = [];
          if (teeRating.men) {
            ratings.push({
              gender: "men",
              course_rating: teeRating.men.course_rating,
              slope_rating: teeRating.men.slope
            });
          }
          if (teeRating.women) {
            ratings.push({
              gender: "women",
              course_rating: teeRating.women.course_rating,
              slope_rating: teeRating.women.slope
            });
          }
          if (ratings.length === 0) {
            throw new Error(`Tee ${teeName} has no ratings`);
          }
          const newTee = this.teeService.create(courseId, {
            name: teeName,
            color: teeColor,
            ratings
          });
          teeId = newTee.id;
        }
        if (existingTee) {
          if (teeRating.men) {
            this.teeService.upsertRating(teeId, {
              gender: "men",
              course_rating: teeRating.men.course_rating,
              slope_rating: teeRating.men.slope
            });
          }
          if (teeRating.women) {
            this.teeService.upsertRating(teeId, {
              gender: "women",
              course_rating: teeRating.women.course_rating,
              slope_rating: teeRating.women.slope
            });
          }
        }
        teesProcessed++;
      }
      return {
        success: true,
        courseName,
        courseId,
        action: "updated",
        teesProcessed
      };
    } catch (error) {
      return {
        success: false,
        courseName: data.course_metadata?.course_name || "Unknown",
        courseId,
        action: "updated",
        teesProcessed: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"]
      };
    }
  }
  async importCourses(data) {
    if (!this.teeService) {
      throw new Error("CourseTeeService is required for import functionality");
    }
    if (!this.clubService) {
      throw new Error("ClubService is required for import functionality");
    }
    const courses = Array.isArray(data) ? data : [data];
    const results = [];
    for (const courseData of courses) {
      try {
        this.validateImportCourseData(courseData);
        const courseName = courseData.course_metadata.course_name.trim();
        const clubName = courseData.course_metadata.club_name.trim();
        const pars = this.extractParsFromScorecard(courseData.scorecard);
        const strokeIndex = this.extractStrokeIndexFromScorecard(courseData.scorecard);
        this.validateParsArray(pars);
        this.validateStrokeIndex(strokeIndex);
        const club = await this.clubService.findOrCreate(clubName);
        const existingCourseRow = this.findCourseRowByName(courseName);
        let courseId;
        let action;
        if (existingCourseRow) {
          await this.update(existingCourseRow.id, { club_id: club.id });
          await this.updateHoles(existingCourseRow.id, pars, strokeIndex);
          courseId = existingCourseRow.id;
          action = "updated";
        } else {
          const newCourse = await this.create({ name: courseName, club_id: club.id });
          await this.updateHoles(newCourse.id, pars, strokeIndex);
          courseId = newCourse.id;
          action = "created";
        }
        const existingTees = this.teeService.findByCourse(courseId);
        let teesProcessed = 0;
        for (const teeRating of courseData.tee_ratings) {
          const teeName = teeRating.tee_name.trim();
          const teeColor = getTeeColor(teeName);
          const existingTee = existingTees.find((t) => t.name.toLowerCase() === teeName.toLowerCase());
          let teeId;
          if (existingTee) {
            const updatedTee = this.teeService.update(existingTee.id, {
              name: teeName,
              color: teeColor
            });
            teeId = updatedTee.id;
          } else {
            const ratings = [];
            if (teeRating.men) {
              ratings.push({
                gender: "men",
                course_rating: teeRating.men.course_rating,
                slope_rating: teeRating.men.slope
              });
            }
            if (teeRating.women) {
              ratings.push({
                gender: "women",
                course_rating: teeRating.women.course_rating,
                slope_rating: teeRating.women.slope
              });
            }
            if (ratings.length === 0) {
              throw new Error(`Tee ${teeName} has no ratings`);
            }
            const newTee = this.teeService.create(courseId, {
              name: teeName,
              color: teeColor,
              ratings
            });
            teeId = newTee.id;
          }
          if (existingTee) {
            if (teeRating.men) {
              this.teeService.upsertRating(teeId, {
                gender: "men",
                course_rating: teeRating.men.course_rating,
                slope_rating: teeRating.men.slope
              });
            }
            if (teeRating.women) {
              this.teeService.upsertRating(teeId, {
                gender: "women",
                course_rating: teeRating.women.course_rating,
                slope_rating: teeRating.women.slope
              });
            }
          }
          teesProcessed++;
        }
        results.push({
          success: true,
          courseName,
          courseId,
          action,
          teesProcessed
        });
      } catch (error) {
        results.push({
          success: false,
          courseName: courseData.course_metadata?.course_name || "Unknown",
          courseId: -1,
          action: "created",
          teesProcessed: 0,
          errors: [error instanceof Error ? error.message : "Unknown error"]
        });
      }
    }
    return results;
  }
}

// src/services/course-tee.service.ts
class CourseTeeService {
  db;
  constructor(db) {
    this.db = db;
  }
  transformTeeRow(row) {
    return {
      id: row.id,
      course_id: row.course_id,
      name: row.name,
      color: row.color || undefined,
      course_rating: row.course_rating,
      slope_rating: row.slope_rating,
      stroke_index: row.stroke_index ? parseStrokeIndex(row.stroke_index) : undefined,
      pars: row.pars ? parseParsArray(row.pars) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  transformRatingRow(row) {
    return {
      id: row.id,
      tee_id: row.tee_id,
      gender: row.gender,
      course_rating: row.course_rating,
      slope_rating: row.slope_rating,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  validateRatingGender(gender) {
    if (!["men", "women"].includes(gender)) {
      throw new Error("Gender must be 'men' or 'women'");
    }
  }
  validateCourseRating(courseRating) {
    if (courseRating < GOLF.MIN_COURSE_RATING || courseRating > GOLF.MAX_COURSE_RATING) {
      throw new Error(`Course rating must be between ${GOLF.MIN_COURSE_RATING} and ${GOLF.MAX_COURSE_RATING}`);
    }
  }
  validateSlopeRating(slopeRating) {
    if (slopeRating < GOLF.MIN_SLOPE_RATING || slopeRating > GOLF.MAX_SLOPE_RATING) {
      throw new Error(`Slope rating must be between ${GOLF.MIN_SLOPE_RATING} and ${GOLF.MAX_SLOPE_RATING}`);
    }
  }
  validateTeeName(name) {
    if (!name?.trim()) {
      throw new Error("Tee name is required");
    }
  }
  validateTeeNameNotEmpty(name) {
    if (name !== undefined && !name?.trim()) {
      throw new Error("Tee name cannot be empty");
    }
  }
  validateStrokeIndexArray(strokeIndex) {
    if (strokeIndex !== undefined && strokeIndex !== null) {
      if (!validateStrokeIndex(strokeIndex)) {
        throw new Error(`Stroke index must contain each number from 1-${GOLF.HOLES_PER_ROUND} exactly once`);
      }
    }
  }
  validateParsArray(pars) {
    if (pars !== undefined && pars !== null) {
      if (pars.length !== GOLF.HOLES_PER_ROUND) {
        throw new Error(`Pars must have exactly ${GOLF.HOLES_PER_ROUND} values`);
      }
      if (!pars.every((par) => Number.isInteger(par) && par >= GOLF.MIN_PAR && par <= GOLF.MAX_PAR)) {
        throw new Error(`All pars must be integers between ${GOLF.MIN_PAR} and ${GOLF.MAX_PAR}`);
      }
    }
  }
  validateRatingsArray(ratings) {
    if (!ratings)
      return;
    for (const rating of ratings) {
      this.validateRatingGender(rating.gender);
      this.validateCourseRating(rating.course_rating);
      if (rating.slope_rating !== undefined) {
        this.validateSlopeRating(rating.slope_rating);
      }
    }
  }
  determineCourseAndSlopeRating(data) {
    if (data.course_rating !== undefined) {
      return {
        courseRating: data.course_rating,
        slopeRating: data.slope_rating || GOLF.STANDARD_SLOPE_RATING
      };
    }
    if (data.ratings && data.ratings.length > 0) {
      const mensRating = data.ratings.find((r) => r.gender === "men");
      const firstRating = mensRating || data.ratings[0];
      return {
        courseRating: firstRating.course_rating,
        slopeRating: firstRating.slope_rating || GOLF.STANDARD_SLOPE_RATING
      };
    }
    throw new Error("Course rating must be provided either directly or via ratings array");
  }
  findTeeRowById(id) {
    const stmt = this.db.prepare("SELECT * FROM course_tees WHERE id = ?");
    return stmt.get(id);
  }
  findTeeRowsByCourse(courseId) {
    const stmt = this.db.prepare(`
      SELECT * FROM course_tees
      WHERE course_id = ?
      ORDER BY name ASC
    `);
    return stmt.all(courseId);
  }
  findRatingRowsByTee(teeId) {
    const stmt = this.db.prepare(`
      SELECT * FROM course_tee_ratings
      WHERE tee_id = ?
      ORDER BY gender ASC
    `);
    return stmt.all(teeId);
  }
  findRatingRowById(id) {
    const stmt = this.db.prepare("SELECT * FROM course_tee_ratings WHERE id = ?");
    return stmt.get(id);
  }
  findRatingRowByGender(teeId, gender) {
    const stmt = this.db.prepare(`
      SELECT * FROM course_tee_ratings
      WHERE tee_id = ? AND gender = ?
    `);
    return stmt.get(teeId, gender);
  }
  findCourseExists(courseId) {
    const stmt = this.db.prepare("SELECT id FROM courses WHERE id = ?");
    return stmt.get(courseId) !== null;
  }
  findDuplicateTee(courseId, name) {
    const stmt = this.db.prepare("SELECT id FROM course_tees WHERE course_id = ? AND name = ?");
    return stmt.get(courseId, name) !== null;
  }
  findDuplicateTeeExcluding(courseId, name, excludeId) {
    const stmt = this.db.prepare("SELECT id FROM course_tees WHERE course_id = ? AND name = ? AND id != ?");
    return stmt.get(courseId, name, excludeId) !== null;
  }
  findCompetitionsByTee(teeId) {
    const stmt = this.db.prepare("SELECT id FROM competitions WHERE tee_id = ?");
    return stmt.all(teeId);
  }
  insertTeeRow(courseId, name, color, courseRating, slopeRating, strokeIndex, pars) {
    const stmt = this.db.prepare(`
      INSERT INTO course_tees (course_id, name, color, course_rating, slope_rating, stroke_index, pars)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(courseId, name, color, courseRating, slopeRating, strokeIndex ? JSON.stringify(strokeIndex) : null, pars ? JSON.stringify(pars) : null);
  }
  upsertRatingRow(teeId, gender, courseRating, slopeRating) {
    const stmt = this.db.prepare(`
      INSERT INTO course_tee_ratings (tee_id, gender, course_rating, slope_rating)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(tee_id, gender) DO UPDATE SET
        course_rating = excluded.course_rating,
        slope_rating = excluded.slope_rating,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);
    return stmt.get(teeId, gender, courseRating, slopeRating);
  }
  updateRatingRow(id, courseRating, slopeRating) {
    const stmt = this.db.prepare(`
      UPDATE course_tee_ratings
      SET course_rating = ?, slope_rating = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(courseRating, slopeRating, id);
  }
  deleteRatingRow(id) {
    const stmt = this.db.prepare("DELETE FROM course_tee_ratings WHERE id = ?");
    stmt.run(id);
  }
  deleteRatingRowByGender(teeId, gender) {
    const stmt = this.db.prepare("DELETE FROM course_tee_ratings WHERE tee_id = ? AND gender = ?");
    stmt.run(teeId, gender);
  }
  updateTeeRow(id, name, color, courseRating, slopeRating, strokeIndex, pars) {
    const stmt = this.db.prepare(`
      UPDATE course_tees
      SET name = ?, color = ?, course_rating = ?, slope_rating = ?, stroke_index = ?, pars = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(name, color, courseRating, slopeRating, strokeIndex ? JSON.stringify(strokeIndex) : null, pars ? JSON.stringify(pars) : null, id);
  }
  deleteTeeRow(id) {
    const stmt = this.db.prepare("DELETE FROM course_tees WHERE id = ?");
    stmt.run(id);
  }
  findTeeRowsByCourseWithDetails(courseId) {
    const stmt = this.db.prepare(`
      SELECT ct.*, c.name as course_name
      FROM course_tees ct
      JOIN courses c ON ct.course_id = c.id
      WHERE ct.course_id = ?
      ORDER BY ct.name ASC
    `);
    return stmt.all(courseId);
  }
  getRatingsForTee(teeId) {
    const rows = this.findRatingRowsByTee(teeId);
    return rows.map((row) => this.transformRatingRow(row));
  }
  getRatingByGender(teeId, gender) {
    const row = this.findRatingRowByGender(teeId, gender);
    return row ? this.transformRatingRow(row) : null;
  }
  getRatingById(id) {
    const row = this.findRatingRowById(id);
    return row ? this.transformRatingRow(row) : null;
  }
  upsertRating(teeId, data) {
    const teeRow = this.findTeeRowById(teeId);
    if (!teeRow) {
      throw new Error("Tee not found");
    }
    this.validateRatingGender(data.gender);
    this.validateCourseRating(data.course_rating);
    const slopeRating = data.slope_rating || GOLF.STANDARD_SLOPE_RATING;
    this.validateSlopeRating(slopeRating);
    const row = this.upsertRatingRow(teeId, data.gender, data.course_rating, slopeRating);
    return this.transformRatingRow(row);
  }
  updateRating(id, data) {
    const ratingRow = this.findRatingRowById(id);
    if (!ratingRow) {
      throw new Error("Rating not found");
    }
    if (data.course_rating !== undefined) {
      this.validateCourseRating(data.course_rating);
    }
    if (data.slope_rating !== undefined) {
      this.validateSlopeRating(data.slope_rating);
    }
    if (data.course_rating === undefined && data.slope_rating === undefined) {
      return this.transformRatingRow(ratingRow);
    }
    const courseRating = data.course_rating ?? ratingRow.course_rating;
    const slopeRating = data.slope_rating ?? ratingRow.slope_rating;
    const row = this.updateRatingRow(id, courseRating, slopeRating);
    return this.transformRatingRow(row);
  }
  deleteRating(id) {
    const ratingRow = this.findRatingRowById(id);
    if (!ratingRow) {
      throw new Error("Rating not found");
    }
    this.deleteRatingRow(id);
  }
  deleteRatingByGender(teeId, gender) {
    this.deleteRatingRowByGender(teeId, gender);
  }
  findByCourse(courseId) {
    const rows = this.findTeeRowsByCourse(courseId);
    return rows.map((row) => {
      const tee = this.transformTeeRow(row);
      tee.ratings = this.getRatingsForTee(row.id);
      return tee;
    });
  }
  findById(id) {
    const row = this.findTeeRowById(id);
    if (!row)
      return null;
    const tee = this.transformTeeRow(row);
    tee.ratings = this.getRatingsForTee(row.id);
    return tee;
  }
  create(courseId, data) {
    if (!this.findCourseExists(courseId)) {
      throw new Error("Course not found");
    }
    this.validateTeeName(data.name);
    if (this.findDuplicateTee(courseId, data.name)) {
      throw new Error("Tee with this name already exists for this course");
    }
    const { courseRating, slopeRating } = this.determineCourseAndSlopeRating(data);
    this.validateCourseRating(courseRating);
    this.validateSlopeRating(slopeRating);
    this.validateStrokeIndexArray(data.stroke_index);
    this.validateParsArray(data.pars);
    this.validateRatingsArray(data.ratings);
    const row = this.insertTeeRow(courseId, data.name.trim(), data.color || null, courseRating, slopeRating, data.stroke_index || null, data.pars || null);
    if (data.ratings && data.ratings.length > 0) {
      for (const rating of data.ratings) {
        this.upsertRating(row.id, rating);
      }
    } else if (data.course_rating !== undefined) {
      this.upsertRating(row.id, {
        gender: "men",
        course_rating: courseRating,
        slope_rating: slopeRating
      });
    }
    return this.findById(row.id);
  }
  update(id, data) {
    const existingRow = this.findTeeRowById(id);
    if (!existingRow) {
      throw new Error("Tee not found");
    }
    this.validateTeeNameNotEmpty(data.name);
    if (data.name !== undefined && data.name !== existingRow.name) {
      if (this.findDuplicateTeeExcluding(existingRow.course_id, data.name, id)) {
        throw new Error("Tee with this name already exists for this course");
      }
    }
    if (data.course_rating !== undefined) {
      this.validateCourseRating(data.course_rating);
    }
    if (data.slope_rating !== undefined) {
      this.validateSlopeRating(data.slope_rating);
    }
    this.validateStrokeIndexArray(data.stroke_index);
    this.validateParsArray(data.pars);
    const hasChanges = data.name !== undefined || data.color !== undefined || data.course_rating !== undefined || data.slope_rating !== undefined || data.stroke_index !== undefined || data.pars !== undefined;
    if (!hasChanges) {
      const tee2 = this.transformTeeRow(existingRow);
      tee2.ratings = this.getRatingsForTee(id);
      return tee2;
    }
    const name = data.name !== undefined ? data.name.trim() : existingRow.name;
    const color = data.color !== undefined ? data.color || null : existingRow.color;
    const courseRating = data.course_rating ?? existingRow.course_rating;
    const slopeRating = data.slope_rating ?? existingRow.slope_rating;
    const strokeIndex = data.stroke_index !== undefined ? data.stroke_index : existingRow.stroke_index ? parseStrokeIndex(existingRow.stroke_index) : null;
    const pars = data.pars !== undefined ? data.pars : existingRow.pars ? parseParsArray(existingRow.pars) : null;
    const updatedRow = this.updateTeeRow(id, name, color, courseRating, slopeRating, strokeIndex, pars);
    const tee = this.transformTeeRow(updatedRow);
    tee.ratings = this.getRatingsForTee(id);
    return tee;
  }
  delete(id) {
    const existingRow = this.findTeeRowById(id);
    if (!existingRow) {
      throw new Error("Tee not found");
    }
    const competitions = this.findCompetitionsByTee(id);
    if (competitions.length > 0) {
      throw new Error("Cannot delete tee that is used in competitions");
    }
    this.deleteTeeRow(id);
  }
  findByCourseWithDetails(courseId) {
    const rows = this.findTeeRowsByCourseWithDetails(courseId);
    return rows.map((row) => {
      const tee = this.transformTeeRow(row);
      tee.ratings = this.getRatingsForTee(row.id);
      return {
        ...tee,
        course_name: row.course_name
      };
    });
  }
}

// src/services/document-service.ts
class DocumentService {
  db;
  constructor(db) {
    this.db = db;
  }
  validateCreateDocumentData(data) {
    if (!data.title?.trim()) {
      throw new Error("Document title is required");
    }
    if (!data.content?.trim()) {
      throw new Error("Document content is required");
    }
    if (!data.type?.trim()) {
      throw new Error("Document type is required");
    }
    if (!data.series_id) {
      throw new Error("Series ID is required");
    }
  }
  validateUpdateDocumentData(data) {
    if (data.title !== undefined && !data.title.trim()) {
      throw new Error("Document title cannot be empty");
    }
    if (data.content !== undefined && !data.content.trim()) {
      throw new Error("Document content cannot be empty");
    }
    if (data.type !== undefined && !data.type.trim()) {
      throw new Error("Document type cannot be empty");
    }
  }
  extractTypes(rows) {
    return rows.map((r) => r.type);
  }
  findSeriesExists(id) {
    const stmt = this.db.prepare("SELECT id FROM series WHERE id = ?");
    return stmt.get(id) !== null;
  }
  insertDocument(data) {
    const stmt = this.db.prepare(`
      INSERT INTO documents (title, content, type, series_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S.%f', 'now'), strftime('%Y-%m-%d %H:%M:%S.%f', 'now'))
      RETURNING *
    `);
    return stmt.get(data.title.trim(), data.content.trim(), data.type.trim(), data.series_id);
  }
  findDocumentsBySeries(seriesId) {
    const stmt = this.db.prepare(`
      SELECT id, title, content, type, series_id, created_at, updated_at
      FROM documents
      WHERE series_id = ?
      ORDER BY type, title
    `);
    return stmt.all(seriesId);
  }
  findDocumentsBySeriesAndType(seriesId, type) {
    const stmt = this.db.prepare(`
      SELECT id, title, content, type, series_id, created_at, updated_at
      FROM documents
      WHERE series_id = ? AND type = ?
      ORDER BY title
    `);
    return stmt.all(seriesId, type.trim());
  }
  findDistinctTypesBySeries(seriesId) {
    const stmt = this.db.prepare(`
      SELECT DISTINCT type
      FROM documents
      WHERE series_id = ?
      ORDER BY type
    `);
    return stmt.all(seriesId);
  }
  updateDocumentRow(id, title, content, type) {
    const stmt = this.db.prepare(`
      UPDATE documents
      SET title = ?, content = ?, type = ?, updated_at = strftime('%Y-%m-%d %H:%M:%S.%f', 'now')
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(title, content, type, id);
  }
  deleteDocumentRow(id) {
    const stmt = this.db.prepare("DELETE FROM documents WHERE id = ?");
    stmt.run(id);
  }
  async create(data) {
    this.validateCreateDocumentData(data);
    if (!this.findSeriesExists(data.series_id)) {
      throw new Error("Series not found");
    }
    return this.insertDocument(data);
  }
  async findAll() {
    const stmt = this.db.prepare(`
      SELECT id, title, content, type, series_id, created_at, updated_at
      FROM documents
      ORDER BY strftime('%s.%f', created_at) DESC
    `);
    return stmt.all();
  }
  async findById(id) {
    const stmt = this.db.prepare(`
      SELECT id, title, content, type, series_id, created_at, updated_at
      FROM documents
      WHERE id = ?
    `);
    const result = stmt.get(id);
    return result || null;
  }
  async findBySeriesId(seriesId) {
    if (!this.findSeriesExists(seriesId)) {
      throw new Error("Series not found");
    }
    return this.findDocumentsBySeries(seriesId);
  }
  async findBySeriesIdAndType(seriesId, type) {
    if (!this.findSeriesExists(seriesId)) {
      throw new Error("Series not found");
    }
    return this.findDocumentsBySeriesAndType(seriesId, type);
  }
  async update(id, data) {
    const document = await this.findById(id);
    if (!document) {
      throw new Error("Document not found");
    }
    this.validateUpdateDocumentData(data);
    if (data.title === undefined && data.content === undefined && data.type === undefined) {
      return document;
    }
    const title = data.title !== undefined ? data.title.trim() : document.title;
    const content = data.content !== undefined ? data.content.trim() : document.content;
    const type = data.type !== undefined ? data.type.trim() : document.type;
    return this.updateDocumentRow(id, title, content, type);
  }
  async delete(id) {
    const document = await this.findById(id);
    if (!document) {
      throw new Error("Document not found");
    }
    this.deleteDocumentRow(id);
  }
  async getDocumentTypes(seriesId) {
    if (!this.findSeriesExists(seriesId)) {
      throw new Error("Series not found");
    }
    const rows = this.findDistinctTypesBySeries(seriesId);
    return this.extractTypes(rows);
  }
}

// src/services/participant-service.ts
class ParticipantService {
  db;
  constructor(db) {
    this.db = db;
  }
  validatePositionName(name) {
    if (!name?.trim()) {
      throw new Error("Position name is required");
    }
  }
  validatePositionNameNotEmpty(name) {
    if (!name.trim()) {
      throw new Error("Position name cannot be empty");
    }
  }
  validateTeeOrder(order) {
    if (order < 1) {
      throw new Error("Tee order must be greater than 0");
    }
  }
  validateHoleNumber(hole, maxHoles) {
    if (hole < 1 || hole > maxHoles) {
      throw new Error(`Hole number must be between 1 and ${maxHoles}`);
    }
  }
  validateShotsValue(shots) {
    if (shots !== GOLF.UNREPORTED_HOLE && shots !== 0 && shots < 1) {
      throw new Error("Shots must be greater than 0, or -1 (gave up), or 0 (clear score)");
    }
  }
  validateTotalScore(score) {
    if (score !== null && (score < 0 || !Number.isInteger(score))) {
      throw new Error("Total score must be a non-negative integer or null to clear");
    }
  }
  validateOutInScore(score, fieldName) {
    if (score !== undefined && score !== null && (score < 0 || !Number.isInteger(score))) {
      throw new Error(`${fieldName} score must be a non-negative integer or null to clear`);
    }
  }
  validateScoreArray(score) {
    if (!Array.isArray(score) || score.length !== GOLF.HOLES_PER_ROUND) {
      throw new Error(`Score must be an array of ${GOLF.HOLES_PER_ROUND} elements`);
    }
    for (let i = 0;i < score.length; i++) {
      const s = score[i];
      if (typeof s !== "number" || s < GOLF.UNREPORTED_HOLE && s !== 0) {
        throw new Error(`Invalid score at hole ${i + 1}: must be 0, ${GOLF.UNREPORTED_HOLE} (DNF), or positive`);
      }
    }
  }
  transformParticipantRow(row) {
    return {
      ...row,
      player_name: row.player_names,
      score: this.parseScoreJson(row.score),
      is_locked: Boolean(row.is_locked),
      is_dq: Boolean(row.is_dq)
    };
  }
  transformParticipantRowWithTeam(row) {
    return this.transformParticipantRow(row);
  }
  parseScoreJson(json) {
    return safeParseJsonWithDefault(json, []);
  }
  initializeScoreArray(existingScore, length) {
    if (!existingScore || !Array.isArray(existingScore)) {
      return new Array(length).fill(0);
    }
    const score = [...existingScore];
    for (let i = 0;i < length; i++) {
      if (score[i] === null || score[i] === undefined) {
        score[i] = 0;
      }
    }
    return score;
  }
  shouldCaptureHandicap(courseInfo, shots, existingScore) {
    if (!courseInfo.player_id)
      return false;
    if (courseInfo.handicap_index !== null)
      return false;
    if (shots <= 0)
      return false;
    const hasExistingScores = existingScore.some((s) => s > 0 || s === GOLF.UNREPORTED_HOLE);
    return !hasExistingScores;
  }
  buildUpdateFields(data) {
    const updates = [];
    const values = [];
    if (data.tee_order) {
      updates.push("tee_order = ?");
      values.push(data.tee_order);
    }
    if (data.team_id) {
      updates.push("team_id = ?");
      values.push(data.team_id);
    }
    if (data.tee_time_id) {
      updates.push("tee_time_id = ?");
      values.push(data.tee_time_id);
    }
    if (data.position_name) {
      updates.push("position_name = ?");
      values.push(data.position_name);
    }
    if (data.player_names !== undefined) {
      updates.push("player_names = ?");
      values.push(data.player_names);
    }
    if (data.handicap_index !== undefined) {
      updates.push("handicap_index = ?");
      values.push(data.handicap_index);
    }
    return { updates, values };
  }
  buildManualScoreFields(scores) {
    const updates = [];
    const values = [];
    if (scores.out !== undefined) {
      updates.push("manual_score_out = ?");
      values.push(scores.out);
    }
    if (scores.in !== undefined) {
      updates.push("manual_score_in = ?");
      values.push(scores.in);
    }
    updates.push("manual_score_total = ?");
    values.push(scores.total);
    return { updates, values };
  }
  determineHandicapToCapture(courseInfo) {
    if (!courseInfo.player_id)
      return null;
    if (courseInfo.tour_id) {
      return this.findPlayerHandicapFromTour(courseInfo.tour_id, courseInfo.player_id);
    } else {
      return this.findPlayerHandicap(courseInfo.player_id);
    }
  }
  findTeamExists(id) {
    const row = this.db.prepare("SELECT id FROM teams WHERE id = ?").get(id);
    return row !== null;
  }
  findTeeTimeExists(id) {
    const row = this.db.prepare("SELECT id FROM tee_times WHERE id = ?").get(id);
    return row !== null;
  }
  findCompetitionExists(id) {
    const row = this.db.prepare("SELECT id FROM competitions WHERE id = ?").get(id);
    return row !== null;
  }
  insertParticipantRow(teeOrder, teamId, teeTimeId, positionName, playerNames, playerId) {
    return this.db.prepare(`
      INSERT INTO participants (tee_order, team_id, tee_time_id, position_name, player_names, player_id, score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).get(teeOrder, teamId, teeTimeId, positionName, playerNames, playerId, JSON.stringify([]));
  }
  findAllParticipantRows() {
    return this.db.prepare("SELECT * FROM participants").all();
  }
  findParticipantRowWithTeam(id) {
    return this.db.prepare(`
      SELECT p.*, te.name as team_name
      FROM participants p
      JOIN teams te ON p.team_id = te.id
      WHERE p.id = ?
    `).get(id);
  }
  updateParticipantRow(id, updates, values) {
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    return this.db.prepare(`
      UPDATE participants
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `).get(...values);
  }
  findParticipantRowsByCompetition(competitionId) {
    return this.db.prepare(`
      SELECT p.*, te.name as team_name
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      JOIN teams te ON p.team_id = te.id
      WHERE t.competition_id = ?
      ORDER BY t.teetime, p.tee_order
    `).all(competitionId);
  }
  findParticipantCourseInfo(id) {
    return this.db.prepare(`
      SELECT co.pars, c.tour_id, p.player_id, p.handicap_index
      FROM participants p
      JOIN tee_times t ON p.tee_time_id = t.id
      JOIN competitions c ON t.competition_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE p.id = ?
    `).get(id);
  }
  findPlayerHandicapFromTour(tourId, playerId) {
    const result = this.db.prepare(`
      SELECT COALESCE(te.playing_handicap, pl.handicap) as handicap_index
      FROM players pl
      LEFT JOIN tour_enrollments te ON te.player_id = pl.id AND te.tour_id = ? AND te.status = 'active'
      WHERE pl.id = ?
    `).get(tourId, playerId);
    return result?.handicap_index ?? null;
  }
  findPlayerHandicap(playerId) {
    const result = this.db.prepare("SELECT handicap FROM players WHERE id = ?").get(playerId);
    return result?.handicap ?? null;
  }
  updateScoreRow(id, scoreJson) {
    this.db.prepare(`
      UPDATE participants
      SET score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(scoreJson, id);
  }
  updateScoreWithHandicapRow(id, scoreJson, handicapIndex) {
    this.db.prepare(`
      UPDATE participants
      SET score = ?, handicap_index = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(scoreJson, handicapIndex, id);
  }
  deleteParticipantRow(id) {
    this.db.prepare("DELETE FROM participants WHERE id = ?").run(id);
  }
  updateLockedRow(id, isLocked) {
    if (isLocked) {
      return this.db.prepare(`
        UPDATE participants
        SET is_locked = 1, locked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `).get(id);
    } else {
      return this.db.prepare(`
        UPDATE participants
        SET is_locked = 0, locked_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `).get(id);
    }
  }
  updateManualScoreRow(id, updates, values) {
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    this.db.prepare(`
      UPDATE participants
      SET ${updates.join(", ")}
      WHERE id = ?
    `).run(...values);
  }
  updateDQRow(id, isDQ, adminNotes, adminUserId) {
    this.db.prepare(`
      UPDATE participants
      SET is_dq = ?,
          admin_notes = ?,
          admin_modified_by = ?,
          admin_modified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(isDQ ? 1 : 0, adminNotes, adminUserId, id);
  }
  updateAdminScoreRow(id, scoreJson, adminNotes, adminUserId) {
    this.db.prepare(`
      UPDATE participants
      SET score = ?,
          admin_notes = ?,
          admin_modified_by = ?,
          admin_modified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(scoreJson, adminNotes, adminUserId, id);
  }
  async create(data) {
    this.validatePositionName(data.position_name);
    this.validateTeeOrder(data.tee_order);
    if (!this.findTeamExists(data.team_id)) {
      throw new Error("Team not found");
    }
    if (!this.findTeeTimeExists(data.tee_time_id)) {
      throw new Error("Tee time not found");
    }
    const row = this.insertParticipantRow(data.tee_order, data.team_id, data.tee_time_id, data.position_name, data.player_names || null, data.player_id || null);
    return this.transformParticipantRow(row);
  }
  async findAll() {
    const rows = this.findAllParticipantRows();
    return rows.map((row) => this.transformParticipantRow(row));
  }
  async findById(id) {
    const row = this.findParticipantRowWithTeam(id);
    if (!row)
      return null;
    const participant = this.transformParticipantRowWithTeam(row);
    return {
      ...participant,
      handicap_index: row.handicap_index
    };
  }
  async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Participant not found");
    }
    if (data.position_name) {
      this.validatePositionNameNotEmpty(data.position_name);
    }
    if (data.tee_order) {
      this.validateTeeOrder(data.tee_order);
    }
    if (data.team_id && !this.findTeamExists(data.team_id)) {
      throw new Error("Team not found");
    }
    if (data.tee_time_id && !this.findTeeTimeExists(data.tee_time_id)) {
      throw new Error("Tee time not found");
    }
    const { updates, values } = this.buildUpdateFields(data);
    if (updates.length === 0) {
      return existing;
    }
    const row = this.updateParticipantRow(id, updates, values);
    return this.transformParticipantRow(row);
  }
  async findAllForCompetition(competitionId) {
    if (!this.findCompetitionExists(competitionId)) {
      throw new Error("Competition not found");
    }
    const rows = this.findParticipantRowsByCompetition(competitionId);
    return rows.map((row) => this.transformParticipantRowWithTeam(row));
  }
  async updateScore(id, hole, shots) {
    const participant = await this.findById(id);
    if (!participant) {
      throw new Error("Participant not found");
    }
    if (participant.is_locked) {
      throw new Error("Scorecard is locked and cannot be modified.");
    }
    const courseInfo = this.findParticipantCourseInfo(id);
    if (!courseInfo) {
      throw new Error("Could not find course for participant");
    }
    const pars = safeParseJsonWithDefault(courseInfo.pars, []);
    this.validateHoleNumber(hole, pars.length);
    this.validateShotsValue(shots);
    const score = this.initializeScoreArray(participant.score, pars.length);
    let capturedHandicapIndex = null;
    if (this.shouldCaptureHandicap(courseInfo, shots, score)) {
      capturedHandicapIndex = this.determineHandicapToCapture(courseInfo);
    }
    score[hole - 1] = shots;
    if (capturedHandicapIndex !== null) {
      this.updateScoreWithHandicapRow(id, JSON.stringify(score), capturedHandicapIndex);
    } else {
      this.updateScoreRow(id, JSON.stringify(score));
    }
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error("Participant not found");
    }
    return updated;
  }
  async delete(id) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Participant not found");
    }
    this.deleteParticipantRow(id);
  }
  async lock(id) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Participant not found");
    }
    const row = this.updateLockedRow(id, true);
    return this.transformParticipantRow(row);
  }
  async unlock(id) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Participant not found");
    }
    const row = this.updateLockedRow(id, false);
    return this.transformParticipantRow(row);
  }
  async updateManualScore(participantId, scores) {
    const existing = await this.findById(participantId);
    if (!existing) {
      throw new Error("Participant not found");
    }
    this.validateTotalScore(scores.total);
    this.validateOutInScore(scores.out, "Out");
    this.validateOutInScore(scores.in, "In");
    const { updates, values } = this.buildManualScoreFields(scores);
    this.updateManualScoreRow(participantId, updates, values);
    const row = this.findParticipantRowWithTeam(participantId);
    if (!row) {
      throw new Error("Participant not found after update");
    }
    return this.transformParticipantRowWithTeam(row);
  }
  async adminSetDQ(participantId, isDQ, adminNotes, adminUserId) {
    const existing = await this.findById(participantId);
    if (!existing) {
      throw new Error("Participant not found");
    }
    this.updateDQRow(participantId, isDQ, adminNotes || null, adminUserId);
    const updated = await this.findById(participantId);
    if (!updated) {
      throw new Error("Participant not found after update");
    }
    return updated;
  }
  async adminUpdateScore(participantId, score, adminNotes, adminUserId) {
    const existing = await this.findById(participantId);
    if (!existing) {
      throw new Error("Participant not found");
    }
    this.validateScoreArray(score);
    this.updateAdminScoreRow(participantId, JSON.stringify(score), adminNotes || null, adminUserId);
    const updated = await this.findById(participantId);
    if (!updated) {
      throw new Error("Participant not found after update");
    }
    return updated;
  }
}

// src/services/player.service.ts
class PlayerService {
  db;
  constructor(db) {
    this.db = db;
  }
  findAllPlayerRows() {
    return this.db.prepare("SELECT * FROM players ORDER BY name ASC").all();
  }
  findPlayerRowById(id) {
    return this.db.prepare("SELECT * FROM players WHERE id = ?").get(id);
  }
  findPlayerRowByUserId(userId) {
    return this.db.prepare("SELECT * FROM players WHERE user_id = ?").get(userId);
  }
  findPlayerStatsRow(playerId) {
    return this.db.prepare(`
        SELECT
          COUNT(DISTINCT p.competition_id) as competitions_played,
          COUNT(p.id) as total_rounds,
          MIN(p.total_score) as best_score,
          AVG(p.total_score) as average_score
        FROM participants p
        WHERE p.player_id = ? AND p.total_score IS NOT NULL
      `).get(playerId);
  }
  insertPlayerRow(name, handicap, userId, createdBy) {
    return this.db.prepare(`
        INSERT INTO players (name, handicap, user_id, created_by)
        VALUES (?, ?, ?, ?)
        RETURNING *
      `).get(name, handicap, userId, createdBy);
  }
  updatePlayerRow(id, updates, values) {
    return this.db.prepare(`
        UPDATE players
        SET ${updates.join(", ")}
        WHERE id = ?
        RETURNING *
      `).get(...values, id);
  }
  updatePlayerLinkRow(playerId, userId) {
    return this.db.prepare(`
        UPDATE players
        SET user_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `).get(userId, playerId);
  }
  deletePlayerRow(id) {
    const result = this.db.prepare("DELETE FROM players WHERE id = ?").run(id);
    return result.changes;
  }
  buildUpdateFields(data) {
    const updates = [];
    const values = [];
    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.handicap !== undefined) {
      updates.push("handicap = ?");
      values.push(data.handicap);
    }
    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
    }
    return { updates, values };
  }
  transformToPlayerProfile(player, stats) {
    return {
      ...player,
      competitions_played: stats?.competitions_played || 0,
      total_rounds: stats?.total_rounds || 0,
      best_score: stats?.best_score || null,
      average_score: this.calculateRoundedAverage(stats?.average_score)
    };
  }
  calculateRoundedAverage(avgScore) {
    if (avgScore === null || avgScore === undefined) {
      return null;
    }
    return Math.round(avgScore * 10) / 10;
  }
  findAll() {
    return this.findAllPlayerRows();
  }
  findById(id) {
    return this.findPlayerRowById(id);
  }
  findByUserId(userId) {
    return this.findPlayerRowByUserId(userId);
  }
  getPlayerProfile(id) {
    const player = this.findPlayerRowById(id);
    if (!player) {
      return null;
    }
    try {
      const stats = this.findPlayerStatsRow(id);
      return this.transformToPlayerProfile(player, stats);
    } catch (error) {
      console.warn("Error fetching player stats, returning zero stats:", error);
      return this.transformToPlayerProfile(player, null);
    }
  }
  create(data, createdBy) {
    const handicap = data.handicap ?? 0;
    const userId = data.user_id ?? null;
    const createdById = createdBy ?? null;
    return this.insertPlayerRow(data.name, handicap, userId, createdById);
  }
  update(id, data) {
    const player = this.findPlayerRowById(id);
    if (!player) {
      throw new Error("Player not found");
    }
    const { updates, values } = this.buildUpdateFields(data);
    if (updates.length === 0) {
      return player;
    }
    return this.updatePlayerRow(id, updates, values);
  }
  delete(id) {
    const changes = this.deletePlayerRow(id);
    if (changes === 0) {
      throw new Error("Player not found");
    }
  }
  linkToUser(playerId, userId) {
    const player = this.findPlayerRowById(playerId);
    if (!player) {
      throw new Error("Player not found");
    }
    const existingLink = this.findPlayerRowByUserId(userId);
    if (existingLink && existingLink.id !== playerId) {
      throw new Error("User is already linked to another player");
    }
    return this.updatePlayerLinkRow(playerId, userId);
  }
  updateHandicap(id, handicap) {
    return this.update(id, { handicap });
  }
}
function createPlayerService(db) {
  return new PlayerService(db);
}

// src/services/player-profile.service.ts
var VALID_VISIBILITY_VALUES = ["public", "friends", "private"];

class PlayerProfileService {
  db;
  constructor(db) {
    this.db = db;
  }
  findProfileRowWithCourse(playerId) {
    return this.db.prepare(`
        SELECT pp.*, c.name as home_course_name
        FROM player_profiles pp
        LEFT JOIN courses c ON pp.home_course_id = c.id
        WHERE pp.player_id = ?
      `).get(playerId);
  }
  findPlayerExists(playerId) {
    const row = this.db.prepare("SELECT id FROM players WHERE id = ?").get(playerId);
    return !!row;
  }
  findCourseExists(courseId) {
    const row = this.db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId);
    return !!row;
  }
  insertDefaultProfileRow(playerId) {
    this.db.prepare(`
        INSERT INTO player_profiles (player_id, visibility)
        VALUES (?, 'public')
      `).run(playerId);
  }
  updateProfileRow(playerId, updates, values) {
    this.db.prepare(`
        UPDATE player_profiles
        SET ${updates.join(", ")}
        WHERE player_id = ?
      `).run(...values, playerId);
  }
  findPlayerRow(playerId) {
    return this.db.prepare("SELECT * FROM players WHERE id = ?").get(playerId);
  }
  findPlayerStatsRow(playerId) {
    return this.db.prepare(`
        SELECT
          COUNT(DISTINCT tt.competition_id) as competitions_played,
          COUNT(p.id) as total_rounds,
          MIN(
            CASE
              WHEN p.manual_score_total IS NOT NULL THEN p.manual_score_total
              WHEN p.score IS NOT NULL AND p.score != '[]' THEN (
                SELECT SUM(value) FROM json_each(p.score) WHERE value > 0
              )
              ELSE NULL
            END
          ) as best_score,
          AVG(
            CASE
              WHEN p.manual_score_total IS NOT NULL THEN p.manual_score_total
              WHEN p.score IS NOT NULL AND p.score != '[]' THEN (
                SELECT SUM(value) FROM json_each(p.score) WHERE value > 0
              )
              ELSE NULL
            END
          ) as average_score
        FROM participants p
        JOIN tee_times tt ON p.tee_time_id = tt.id
        WHERE p.player_id = ?
          AND (
            p.manual_score_total IS NOT NULL
            OR (p.score IS NOT NULL AND p.score != '[]' AND EXISTS (SELECT 1 FROM json_each(p.score) WHERE value > 0))
          )
      `).get(playerId);
  }
  findHandicapHistoryRows(playerId, limit) {
    const sql = `
      SELECT * FROM handicap_history
      WHERE player_id = ?
      ORDER BY effective_date DESC, created_at DESC
      ${limit ? `LIMIT ${limit}` : ""}
    `;
    return this.db.prepare(sql).all(playerId);
  }
  findPlayerHandicap(playerId) {
    return this.db.prepare("SELECT handicap FROM players WHERE id = ?").get(playerId);
  }
  insertHandicapHistoryRow(playerId, handicapIndex, effectiveDate, notes) {
    return this.db.prepare(`
        INSERT INTO handicap_history (player_id, handicap_index, effective_date, source, notes)
        VALUES (?, ?, ?, 'manual', ?)
        RETURNING *
      `).get(playerId, handicapIndex, effectiveDate, notes);
  }
  updatePlayerHandicapRow(playerId, handicap) {
    this.db.prepare(`
        UPDATE players
        SET handicap = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(handicap, playerId);
  }
  updatePlayerGenderRow(playerId, gender) {
    this.db.prepare(`
        UPDATE players
        SET gender = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(gender, playerId);
  }
  findRoundHistoryRows(playerId, limit, offset) {
    const sql = `
      SELECT
        p.id as participant_id,
        c.id as competition_id,
        c.name as competition_name,
        c.date as competition_date,
        co.id as course_id,
        co.name as course_name,
        CASE
          WHEN p.manual_score_total IS NOT NULL THEN p.manual_score_total
          WHEN p.score IS NOT NULL AND p.score != '[]' THEN (
            SELECT SUM(value) FROM json_each(p.score) WHERE value > 0
          )
          ELSE NULL
        END as total_score,
        (SELECT SUM(value) FROM json_each(co.pars)) as par_total,
        (
          SELECT COUNT(*)
          FROM json_each(p.score)
          WHERE json_each.value > 0
        ) as holes_played
      FROM participants p
      JOIN tee_times tt ON p.tee_time_id = tt.id
      JOIN competitions c ON tt.competition_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE p.player_id = ?
        AND (
          p.manual_score_total IS NOT NULL
          OR (p.score IS NOT NULL AND p.score != '[]' AND EXISTS (SELECT 1 FROM json_each(p.score) WHERE value > 0))
        )
      ORDER BY c.date DESC, c.id DESC
      ${limit ? `LIMIT ${limit}` : ""}
      ${offset ? `OFFSET ${offset}` : ""}
    `;
    return this.db.prepare(sql).all(playerId);
  }
  findCommonTourExists(viewerPlayerId, targetPlayerId) {
    const row = this.db.prepare(`
        SELECT 1 FROM tour_enrollments e1
        JOIN tour_enrollments e2 ON e1.tour_id = e2.tour_id
        WHERE e1.player_id = ?
          AND e2.player_id = ?
          AND e1.status = 'active'
          AND e2.status = 'active'
        LIMIT 1
      `).get(viewerPlayerId, targetPlayerId);
    return !!row;
  }
  findCommonToursRows(viewerPlayerId, targetPlayerId) {
    return this.db.prepare(`
        SELECT DISTINCT t.id, t.name
        FROM tours t
        JOIN tour_enrollments e1 ON t.id = e1.tour_id
        JOIN tour_enrollments e2 ON t.id = e2.tour_id
        WHERE e1.player_id = ?
          AND e2.player_id = ?
          AND e1.status = 'active'
          AND e2.status = 'active'
        ORDER BY t.name
      `).all(viewerPlayerId, targetPlayerId);
  }
  findTourEnrollmentRows(playerId) {
    return this.db.prepare(`
        SELECT
          te.tour_id,
          t.name as tour_name,
          te.status as enrollment_status,
          tc.name as category_name
        FROM tour_enrollments te
        JOIN tours t ON te.tour_id = t.id
        LEFT JOIN tour_categories tc ON te.category_id = tc.id
        WHERE te.player_id = ?
        ORDER BY t.name
      `).all(playerId);
  }
  findSeriesParticipationRows(playerId) {
    return this.db.prepare(`
        SELECT
          s.id as series_id,
          s.name as series_name,
          COUNT(DISTINCT c.id) as competitions_played,
          MAX(c.date) as last_played_date
        FROM participants p
        JOIN tee_times tt ON p.tee_time_id = tt.id
        JOIN competitions c ON tt.competition_id = c.id
        JOIN series s ON c.series_id = s.id
        WHERE p.player_id = ?
          AND c.series_id IS NOT NULL
          AND (
            p.manual_score_total IS NOT NULL
            OR (
              p.score IS NOT NULL
              AND p.score != '[]'
              AND EXISTS (SELECT 1 FROM json_each(p.score) WHERE json_each.value > 0)
            )
          )
        GROUP BY s.id, s.name
        ORDER BY last_played_date DESC
      `).all(playerId);
  }
  findPlayerTourStatsRow(playerId, tourId) {
    return this.db.prepare(`
        SELECT
          SUM(cr.points) as total_points,
          COUNT(DISTINCT cr.competition_id) as competitions_played
        FROM competition_results cr
        JOIN competitions c ON cr.competition_id = c.id
        WHERE cr.player_id = ?
          AND c.tour_id = ?
          AND cr.scoring_type = 'gross'
          AND c.is_results_final = 1
      `).get(playerId, tourId);
  }
  findAllTourStandingsRows(tourId) {
    return this.db.prepare(`
        SELECT
          cr.player_id,
          SUM(cr.points) as total_points
        FROM competition_results cr
        JOIN competitions c ON cr.competition_id = c.id
        WHERE c.tour_id = ?
          AND cr.scoring_type = 'gross'
          AND c.is_results_final = 1
        GROUP BY cr.player_id
        ORDER BY total_points DESC
      `).all(tourId);
  }
  transformProfileRow(row) {
    return {
      player_id: row.player_id,
      display_name: row.display_name ?? undefined,
      bio: row.bio ?? undefined,
      avatar_url: row.avatar_url ?? undefined,
      home_course_id: row.home_course_id ?? undefined,
      home_course_name: row.home_course_name ?? undefined,
      visibility: row.visibility,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  transformHistoryRow(row) {
    return {
      id: row.id,
      player_id: row.player_id,
      handicap_index: row.handicap_index,
      effective_date: row.effective_date,
      source: row.source,
      notes: row.notes ?? undefined,
      created_at: row.created_at
    };
  }
  transformStatsRow(stats) {
    return {
      competitions_played: stats?.competitions_played || 0,
      total_rounds: stats?.total_rounds || 0,
      best_score: stats?.best_score || null,
      average_score: this.calculateRoundedAverage(stats?.average_score)
    };
  }
  transformRoundRow(row) {
    const parTotal = row.par_total || GOLF.STANDARD_COURSE_RATING;
    return {
      participant_id: row.participant_id,
      competition_id: row.competition_id,
      competition_name: row.competition_name,
      competition_date: row.competition_date,
      course_id: row.course_id,
      course_name: row.course_name,
      gross_score: row.total_score,
      relative_to_par: row.total_score - parTotal,
      holes_played: row.holes_played || 0
    };
  }
  transformToFullProfile(player, profile, stats, handicapHistory) {
    return {
      id: player.id,
      name: player.name,
      handicap: player.handicap,
      user_id: player.user_id ?? undefined,
      gender: player.gender,
      display_name: profile.display_name,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      home_course_id: profile.home_course_id,
      home_course_name: profile.home_course_name,
      visibility: profile.visibility,
      competitions_played: stats.competitions_played,
      total_rounds: stats.total_rounds,
      best_score: stats.best_score ?? undefined,
      average_score: stats.average_score ?? undefined,
      handicap_history: handicapHistory
    };
  }
  transformTourEnrollmentRow(enrollment, standingInfo) {
    return {
      tour_id: enrollment.tour_id,
      tour_name: enrollment.tour_name,
      enrollment_status: enrollment.enrollment_status,
      category_name: enrollment.category_name ?? undefined,
      position: standingInfo?.position,
      total_points: standingInfo?.total_points,
      competitions_played: standingInfo?.competitions_played ?? 0
    };
  }
  transformSeriesParticipationRow(row) {
    return {
      series_id: row.series_id,
      series_name: row.series_name,
      competitions_played: row.competitions_played,
      last_played_date: row.last_played_date
    };
  }
  calculateRoundedAverage(avgScore) {
    if (avgScore === null || avgScore === undefined) {
      return null;
    }
    return Math.round(avgScore * 10) / 10;
  }
  validateVisibility(visibility) {
    if (!VALID_VISIBILITY_VALUES.includes(visibility)) {
      throw new Error("Invalid visibility setting");
    }
  }
  validateHandicapIndex(handicapIndex) {
    if (handicapIndex < GOLF.MIN_HANDICAP_INDEX || handicapIndex > GOLF.MAX_HANDICAP_INDEX) {
      throw new Error(`Handicap index must be between ${GOLF.MIN_HANDICAP_INDEX} and ${GOLF.MAX_HANDICAP_INDEX}`);
    }
  }
  buildProfileUpdateFields(data) {
    const updates = [];
    const values = [];
    if (data.display_name !== undefined) {
      updates.push("display_name = ?");
      values.push(data.display_name || null);
    }
    if (data.bio !== undefined) {
      updates.push("bio = ?");
      values.push(data.bio || null);
    }
    if (data.avatar_url !== undefined) {
      updates.push("avatar_url = ?");
      values.push(data.avatar_url || null);
    }
    if (data.home_course_id !== undefined) {
      updates.push("home_course_id = ?");
      values.push(data.home_course_id);
    }
    if (data.visibility !== undefined) {
      updates.push("visibility = ?");
      values.push(data.visibility);
    }
    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
    }
    return { updates, values };
  }
  calculatePlayerPosition(allStandings, playerId, playerTotalPoints, competitionsPlayed) {
    let position = 1;
    let previousPoints = Number.MAX_SAFE_INTEGER;
    for (let i = 0;i < allStandings.length; i++) {
      if (allStandings[i].total_points !== previousPoints) {
        position = i + 1;
      }
      previousPoints = allStandings[i].total_points;
      if (allStandings[i].player_id === playerId) {
        return {
          position,
          total_points: playerTotalPoints,
          competitions_played: competitionsPlayed
        };
      }
    }
    return {
      position: allStandings.length + 1,
      total_points: playerTotalPoints,
      competitions_played: competitionsPlayed
    };
  }
  canViewPrivateProfile(profileUserId, viewerId) {
    return !!viewerId && profileUserId === viewerId;
  }
  getTodayDateString() {
    return new Date().toISOString().split("T")[0];
  }
  getProfile(playerId) {
    const row = this.findProfileRowWithCourse(playerId);
    if (!row) {
      return null;
    }
    return this.transformProfileRow(row);
  }
  getOrCreateProfile(playerId) {
    const existing = this.getProfile(playerId);
    if (existing) {
      return existing;
    }
    if (!this.findPlayerExists(playerId)) {
      throw new Error("Player not found");
    }
    this.insertDefaultProfileRow(playerId);
    return this.getProfile(playerId);
  }
  updateProfile(playerId, data) {
    this.getOrCreateProfile(playerId);
    if (data.home_course_id !== undefined && data.home_course_id !== null) {
      if (!this.findCourseExists(data.home_course_id)) {
        throw new Error("Course not found");
      }
    }
    if (data.visibility !== undefined) {
      this.validateVisibility(data.visibility);
    }
    if (data.gender !== undefined) {
      this.updatePlayerGenderRow(playerId, data.gender);
    }
    const { updates, values } = this.buildProfileUpdateFields(data);
    if (updates.length === 0 && data.gender === undefined) {
      return this.getProfile(playerId);
    }
    if (updates.length > 0) {
      this.updateProfileRow(playerId, updates, values);
    }
    return this.getProfile(playerId);
  }
  getFullProfile(playerId) {
    const player = this.findPlayerRow(playerId);
    if (!player) {
      return null;
    }
    const profile = this.getOrCreateProfile(playerId);
    const stats = this.getPlayerStats(playerId);
    const handicapHistory = this.getHandicapHistory(playerId, 10);
    return this.transformToFullProfile(player, profile, stats, handicapHistory);
  }
  getPublicProfile(playerId, viewerId) {
    const fullProfile = this.getFullProfile(playerId);
    if (!fullProfile) {
      return null;
    }
    if (fullProfile.visibility === "private") {
      if (!this.canViewPrivateProfile(fullProfile.user_id, viewerId)) {
        return null;
      }
    }
    return fullProfile;
  }
  getPlayerStats(playerId) {
    try {
      const stats = this.findPlayerStatsRow(playerId);
      return this.transformStatsRow(stats);
    } catch (error) {
      console.error("Error getting player stats:", error);
      return this.transformStatsRow(null);
    }
  }
  getHandicapHistory(playerId, limit) {
    const rows = this.findHandicapHistoryRows(playerId, limit);
    return rows.map((row) => this.transformHistoryRow(row));
  }
  getHandicapWithHistory(playerId) {
    const player = this.findPlayerHandicap(playerId);
    if (!player) {
      return null;
    }
    const history = this.getHandicapHistory(playerId);
    return {
      current: player.handicap,
      history
    };
  }
  recordHandicap(playerId, data) {
    if (!this.findPlayerExists(playerId)) {
      throw new Error("Player not found");
    }
    this.validateHandicapIndex(data.handicap_index);
    const effectiveDate = data.effective_date || this.getTodayDateString();
    const historyEntry = this.insertHandicapHistoryRow(playerId, data.handicap_index, effectiveDate, data.notes || null);
    this.updatePlayerHandicapRow(playerId, data.handicap_index);
    return this.transformHistoryRow(historyEntry);
  }
  getRoundHistory(playerId, limit, offset) {
    const rows = this.findRoundHistoryRows(playerId, limit, offset);
    return rows.map((row) => this.transformRoundRow(row));
  }
  isFriend(viewerPlayerId, targetPlayerId) {
    if (viewerPlayerId === targetPlayerId) {
      return true;
    }
    return this.findCommonTourExists(viewerPlayerId, targetPlayerId);
  }
  getCommonTours(viewerPlayerId, targetPlayerId) {
    return this.findCommonToursRows(viewerPlayerId, targetPlayerId);
  }
  getPlayerToursAndSeries(playerId) {
    const tourEnrollments = this.findTourEnrollmentRows(playerId);
    const tours = tourEnrollments.map((enrollment) => {
      const standingInfo = this.getPlayerTourStanding(playerId, enrollment.tour_id);
      return this.transformTourEnrollmentRow(enrollment, standingInfo);
    });
    const seriesRows = this.findSeriesParticipationRows(playerId);
    const series = seriesRows.map((row) => this.transformSeriesParticipationRow(row));
    return { tours, series };
  }
  getPlayerTourStanding(playerId, tourId) {
    try {
      const playerStats = this.findPlayerTourStatsRow(playerId, tourId);
      if (!playerStats || playerStats.total_points === null) {
        return null;
      }
      const allStandings = this.findAllTourStandingsRows(tourId);
      return this.calculatePlayerPosition(allStandings, playerId, playerStats.total_points, playerStats.competitions_played);
    } catch {
      return null;
    }
  }
}
function createPlayerProfileService(db) {
  return new PlayerProfileService(db);
}

// src/services/point-template.service.ts
class PointTemplateService {
  db;
  constructor(db) {
    this.db = db;
  }
  getPointsForPosition(structure, position) {
    if (structure[position.toString()]) {
      return structure[position.toString()];
    }
    return structure["default"] || 0;
  }
  insertPointTemplate(name, pointsStructureJson, createdBy) {
    return this.db.prepare(`INSERT INTO point_templates (name, points_structure, created_by)
         VALUES (?, ?, ?)
         RETURNING *`).get(name, pointsStructureJson, createdBy);
  }
  updatePointTemplateRow(id, name, pointsStructureJson) {
    return this.db.prepare(`UPDATE point_templates
         SET name = ?, points_structure = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
         RETURNING *`).get(name, pointsStructureJson, id);
  }
  findByTourIdQuery(tourId) {
    return this.db.prepare("SELECT * FROM point_templates WHERE tour_id = ? ORDER BY name ASC").all(tourId);
  }
  insertPointTemplateForTour(tourId, name, pointsStructureJson, createdBy) {
    return this.db.prepare(`INSERT INTO point_templates (name, points_structure, created_by, tour_id)
         VALUES (?, ?, ?, ?)
         RETURNING *`).get(name, pointsStructureJson, createdBy, tourId);
  }
  findAll() {
    return this.db.prepare("SELECT * FROM point_templates ORDER BY name ASC").all();
  }
  findById(id) {
    return this.db.prepare("SELECT * FROM point_templates WHERE id = ?").get(id);
  }
  create(data, createdBy) {
    const pointsStructureJson = JSON.stringify(data.points_structure);
    return this.insertPointTemplate(data.name, pointsStructureJson, createdBy);
  }
  update(id, data) {
    const template = this.findById(id);
    if (!template) {
      throw new Error("Point template not found");
    }
    if (data.name === undefined && data.points_structure === undefined) {
      return template;
    }
    const name = data.name !== undefined ? data.name : template.name;
    const pointsStructureJson = data.points_structure !== undefined ? JSON.stringify(data.points_structure) : template.points_structure;
    return this.updatePointTemplateRow(id, name, pointsStructureJson);
  }
  delete(id) {
    const result = this.db.prepare("DELETE FROM point_templates WHERE id = ?").run(id);
    if (result.changes === 0) {
      throw new Error("Point template not found");
    }
  }
  findByTour(tourId) {
    return this.findByTourIdQuery(tourId);
  }
  createForTour(tourId, data, createdBy) {
    const pointsStructureJson = JSON.stringify(data.points_structure);
    return this.insertPointTemplateForTour(tourId, data.name, pointsStructureJson, createdBy);
  }
  belongsToTour(templateId, tourId) {
    const template = this.findById(templateId);
    return template !== null && template.tour_id === tourId;
  }
  calculatePoints(templateId, position) {
    const template = this.findById(templateId);
    if (!template) {
      throw new Error("Point template not found");
    }
    const structure = safeParseJson(template.points_structure, "points_structure");
    return this.getPointsForPosition(structure, position);
  }
}
function createPointTemplateService(db) {
  return new PointTemplateService(db);
}

// src/services/series-service.ts
class SeriesService {
  db;
  competitionService;
  constructor(db, competitionService) {
    this.db = db;
    this.competitionService = competitionService;
  }
  validateSeriesName(name) {
    if (!name?.trim()) {
      throw new Error("Series name is required");
    }
  }
  validateSeriesNameNotEmpty(name) {
    if (!name.trim()) {
      throw new Error("Series name cannot be empty");
    }
  }
  translateUniqueConstraintError(error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      return new Error("Series name must be unique");
    }
    return error;
  }
  transformSeriesRow(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      banner_image_url: row.banner_image_url,
      is_public: Boolean(row.is_public),
      landing_document_id: row.landing_document_id,
      owner_id: row.owner_id,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  transformCompetitionRow(row) {
    return {
      id: row.id,
      name: row.name,
      date: row.date,
      course_id: row.course_id,
      tee_id: row.tee_id,
      series_id: row.series_id,
      tour_id: row.tour_id,
      manual_entry_format: row.manual_entry_format,
      points_multiplier: row.points_multiplier,
      venue_type: row.venue_type,
      start_mode: row.start_mode,
      open_start: row.open_start,
      open_end: row.open_end,
      is_results_final: Boolean(row.is_results_final),
      results_finalized_at: row.results_finalized_at,
      participant_count: row.participant_count,
      course: {
        id: row.course_id,
        name: row.course_name
      }
    };
  }
  buildUpdateFields(data) {
    const updates = [];
    const values = [];
    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      values.push(data.description);
    }
    if (data.banner_image_url !== undefined) {
      updates.push("banner_image_url = ?");
      values.push(data.banner_image_url);
    }
    if (data.is_public !== undefined) {
      updates.push("is_public = ?");
      values.push(data.is_public ? 1 : 0);
    }
    if (data.landing_document_id !== undefined) {
      updates.push("landing_document_id = ?");
      values.push(data.landing_document_id);
    }
    return { updates, values };
  }
  isPastCompetition(competitionDate) {
    const today = new Date;
    today.setHours(0, 0, 0, 0);
    const compDate = new Date(competitionDate);
    compDate.setHours(0, 0, 0, 0);
    return compDate < today;
  }
  teamResultsHaveScores(teamResults) {
    return teamResults.some((team) => team.totalShots && team.totalShots > 0);
  }
  shouldIncludeCompetition(competitionDate, teamResults) {
    return this.isPastCompetition(competitionDate) || this.teamResultsHaveScores(teamResults);
  }
  calculateTeamStandings(competitions, teamResultsByCompetition) {
    const teamStandings = {};
    for (const competition of competitions) {
      const teamResults = teamResultsByCompetition.get(competition.id);
      if (!teamResults)
        continue;
      const competitionDate = new Date(competition.date);
      if (!this.shouldIncludeCompetition(competitionDate, teamResults)) {
        continue;
      }
      for (let i = 0;i < teamResults.length; i++) {
        const teamResult = teamResults[i];
        if (!teamStandings[teamResult.teamId]) {
          teamStandings[teamResult.teamId] = {
            team_id: teamResult.teamId,
            team_name: teamResult.teamName,
            total_points: 0,
            competitions_played: 0,
            position: 0,
            competitions: []
          };
        }
        if (teamResult.teamPoints !== null) {
          teamStandings[teamResult.teamId].total_points += teamResult.teamPoints;
          teamStandings[teamResult.teamId].competitions_played += 1;
          teamStandings[teamResult.teamId].competitions.push({
            competition_id: competition.id,
            competition_name: competition.name,
            competition_date: competition.date,
            points: teamResult.teamPoints,
            position: i + 1
          });
        }
      }
    }
    return this.sortAndRankTeamStandings(Object.values(teamStandings));
  }
  sortAndRankTeamStandings(standings) {
    return standings.sort((a, b) => b.total_points - a.total_points).map((team, index) => ({
      ...team,
      position: index + 1
    }));
  }
  insertSeriesRow(name, description, bannerImageUrl, isPublic, ownerId) {
    return this.db.prepare(`
      INSERT INTO series (name, description, banner_image_url, is_public, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S.%f', 'now'), strftime('%Y-%m-%d %H:%M:%S.%f', 'now'))
      RETURNING *
    `).get(name, description, bannerImageUrl, isPublic, ownerId);
  }
  findAllSeriesRows() {
    return this.db.prepare(`
      SELECT id, name, description, banner_image_url, is_public, landing_document_id, owner_id, created_at, updated_at
      FROM series
      ORDER BY strftime('%s.%f', created_at) DESC
    `).all();
  }
  findPublicSeriesRows() {
    return this.db.prepare(`
      SELECT
        s.id, s.name, s.description, s.banner_image_url, s.is_public,
        s.landing_document_id, s.owner_id, s.created_at, s.updated_at,
        MAX(c.date) as latest_competition_date,
        COUNT(c.id) as competition_count,
        SUM(CASE WHEN c.is_results_final = 1 THEN 1 ELSE 0 END) as finalized_count
      FROM series s
      LEFT JOIN competitions c ON s.id = c.series_id
      WHERE s.is_public = 1
      GROUP BY s.id
      ORDER BY
        CASE
          -- ACTIVE: has competitions, not all finalized, latest competition is not too old
          WHEN competition_count > 0
               AND finalized_count < competition_count
               AND julianday('now') - julianday(latest_competition_date) <= 180
          THEN 1
          -- UPCOMING: no competitions OR all in future
          WHEN competition_count = 0
               OR julianday(MAX(c.date)) > julianday('now')
          THEN 2
          -- COMPLETED: all competitions finalized OR last competition is old
          ELSE 3
        END,
        latest_competition_date DESC,
        strftime('%s.%f', s.created_at) DESC
    `).all();
  }
  findSeriesRowById(id) {
    return this.db.prepare(`
      SELECT id, name, description, banner_image_url, is_public, landing_document_id, owner_id, created_at, updated_at
      FROM series
      WHERE id = ?
    `).get(id);
  }
  findSeriesForUserRows(userId) {
    return this.db.prepare(`
      SELECT DISTINCT s.id, s.name, s.description, s.banner_image_url, s.is_public,
             s.landing_document_id, s.owner_id, s.created_at, s.updated_at
      FROM series s
      LEFT JOIN series_admins sa ON s.id = sa.series_id
      WHERE s.owner_id = ? OR sa.user_id = ?
      ORDER BY strftime('%s.%f', s.created_at) DESC
    `).all(userId, userId);
  }
  findDocumentRow(id) {
    return this.db.prepare("SELECT id, series_id FROM documents WHERE id = ?").get(id);
  }
  updateSeriesRow(id, updates, values) {
    updates.push("updated_at = strftime('%Y-%m-%d %H:%M:%S.%f', 'now')");
    values.push(id);
    return this.db.prepare(`
      UPDATE series
      SET ${updates.join(", ")}
      WHERE id = ?
      RETURNING *
    `).get(...values);
  }
  deleteSeriesRow(id) {
    this.db.prepare("DELETE FROM series WHERE id = ?").run(id);
  }
  findCompetitionRowsBySeries(seriesId) {
    return this.db.prepare(`
      SELECT
        c.*,
        co.name as course_name,
        (SELECT COUNT(DISTINCT p.id)
         FROM participants p
         JOIN tee_times t ON p.tee_time_id = t.id
         WHERE t.competition_id = c.id) as participant_count
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      WHERE c.series_id = ?
      ORDER BY c.date
    `).all(seriesId);
  }
  findTeamRowsBySeries(seriesId) {
    return this.db.prepare(`
      SELECT t.id, t.name, t.created_at, t.updated_at
      FROM teams t
      JOIN series_teams st ON t.id = st.team_id
      WHERE st.series_id = ?
      ORDER BY t.name
    `).all(seriesId);
  }
  findTeamExists(id) {
    const row = this.db.prepare("SELECT id FROM teams WHERE id = ?").get(id);
    return row !== null;
  }
  insertSeriesTeamRow(seriesId, teamId) {
    this.db.prepare(`
      INSERT INTO series_teams (series_id, team_id)
      VALUES (?, ?)
    `).run(seriesId, teamId);
  }
  deleteSeriesTeamRow(seriesId, teamId) {
    const result = this.db.prepare(`
      DELETE FROM series_teams
      WHERE series_id = ? AND team_id = ?
    `).run(seriesId, teamId);
    return result.changes;
  }
  findAvailableTeamRows(seriesId) {
    return this.db.prepare(`
      SELECT t.id, t.name, t.created_at, t.updated_at
      FROM teams t
      WHERE t.id NOT IN (
        SELECT team_id
        FROM series_teams
        WHERE series_id = ?
      )
      ORDER BY t.name
    `).all(seriesId);
  }
  findCompetitionInfoBySeries(seriesId) {
    return this.db.prepare(`
      SELECT c.id, c.name, c.date
      FROM competitions c
      WHERE c.series_id = ?
      ORDER BY c.date
    `).all(seriesId);
  }
  async create(data, ownerId) {
    this.validateSeriesName(data.name);
    try {
      const isPublic = data.is_public !== undefined ? data.is_public ? 1 : 0 : 1;
      const row = this.insertSeriesRow(data.name, data.description || null, data.banner_image_url || null, isPublic, ownerId ?? null);
      return this.transformSeriesRow(row);
    } catch (error) {
      if (error instanceof Error) {
        throw this.translateUniqueConstraintError(error);
      }
      throw error;
    }
  }
  async findAll() {
    const rows = this.findAllSeriesRows();
    return rows.map((row) => this.transformSeriesRow(row));
  }
  async findPublic() {
    const rows = this.findPublicSeriesRows();
    return rows.map((row) => this.transformSeriesRow(row));
  }
  async findForUser(userId) {
    const rows = this.findSeriesForUserRows(userId);
    return rows.map((row) => this.transformSeriesRow(row));
  }
  async findById(id) {
    const row = this.findSeriesRowById(id);
    if (!row)
      return null;
    return this.transformSeriesRow(row);
  }
  async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Series not found");
    }
    if (data.name !== undefined) {
      this.validateSeriesNameNotEmpty(data.name);
    }
    if (data.landing_document_id !== undefined && data.landing_document_id !== null) {
      const document = this.findDocumentRow(data.landing_document_id);
      if (!document) {
        throw new Error("Landing document not found");
      }
      if (document.series_id !== id) {
        throw new Error("Landing document must belong to the same series");
      }
    }
    const { updates, values } = this.buildUpdateFields(data);
    if (updates.length === 0) {
      return existing;
    }
    try {
      const row = this.updateSeriesRow(id, updates, values);
      return this.transformSeriesRow(row);
    } catch (error) {
      if (error instanceof Error) {
        throw this.translateUniqueConstraintError(error);
      }
      throw error;
    }
  }
  async delete(id) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Series not found");
    }
    this.deleteSeriesRow(id);
  }
  async getCompetitions(id) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Series not found");
    }
    const rows = this.findCompetitionRowsBySeries(id);
    return rows.map((row) => this.transformCompetitionRow(row));
  }
  async getTeams(id) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Series not found");
    }
    return this.findTeamRowsBySeries(id);
  }
  async addTeam(seriesId, teamId) {
    const existing = await this.findById(seriesId);
    if (!existing) {
      throw new Error("Series not found");
    }
    if (!this.findTeamExists(teamId)) {
      throw new Error("Team not found");
    }
    try {
      this.insertSeriesTeamRow(seriesId, teamId);
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        throw new Error("Team is already in this series");
      }
      throw error;
    }
  }
  async removeTeam(seriesId, teamId) {
    const changes = this.deleteSeriesTeamRow(seriesId, teamId);
    if (changes === 0) {
      throw new Error("Team is not in this series");
    }
  }
  async getAvailableTeams(seriesId) {
    return this.findAvailableTeamRows(seriesId);
  }
  async getStandings(id) {
    const series = await this.findById(id);
    if (!series) {
      throw new Error("Series not found");
    }
    const competitions = this.findCompetitionInfoBySeries(id);
    const teamResultsByCompetition = new Map;
    for (const competition of competitions) {
      const teamResults = await this.competitionService.getTeamLeaderboard(competition.id);
      teamResultsByCompetition.set(competition.id, teamResults);
    }
    const teamStandings = this.calculateTeamStandings(competitions, teamResultsByCompetition);
    return {
      series,
      team_standings: teamStandings,
      total_competitions: competitions.length
    };
  }
}

// src/services/team-service.ts
class TeamService {
  db;
  constructor(db) {
    this.db = db;
  }
  validateTeamName(name) {
    if (!name?.trim()) {
      throw new Error("Team name is required");
    }
  }
  validateTeamUpdate(data) {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error("Team name cannot be empty");
    }
  }
  translateUniqueConstraintError(error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return new Error("Team name must be unique");
    }
    return error instanceof Error ? error : new Error(String(error));
  }
  insertTeam(name) {
    const stmt = this.db.prepare(`
      INSERT INTO teams (name, created_at, updated_at)
      VALUES (?, strftime('%Y-%m-%d %H:%M:%S.%f', 'now'), strftime('%Y-%m-%d %H:%M:%S.%f', 'now'))
      RETURNING *
    `);
    return stmt.get(name);
  }
  updateTeamRow(id, name) {
    const stmt = this.db.prepare(`
      UPDATE teams
      SET name = ?, updated_at = strftime('%Y-%m-%d %H:%M:%S.%f', 'now')
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(name, id);
  }
  async create(data) {
    this.validateTeamName(data.name);
    try {
      return this.insertTeam(data.name);
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }
  async findAll() {
    const stmt = this.db.prepare("SELECT id, name, created_at, updated_at FROM teams");
    return stmt.all();
  }
  async findById(id) {
    const stmt = this.db.prepare("SELECT id, name, created_at, updated_at FROM teams WHERE id = ?");
    return stmt.get(id);
  }
  async update(id, data) {
    this.validateTeamUpdate(data);
    if (data.name === undefined) {
      const team = await this.findById(id);
      if (!team) {
        throw new Error("Team not found");
      }
      return team;
    }
    try {
      const team = this.updateTeamRow(id, data.name);
      if (!team) {
        throw new Error("Team not found");
      }
      return team;
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }
}

// src/services/tee-time-service.ts
class TeeTimeService {
  db;
  constructor(db) {
    this.db = db;
  }
  validateTeeTimeRequired(teetime) {
    if (!teetime?.trim()) {
      throw new Error("Tee time is required");
    }
  }
  validateTeeTimeNotEmpty(teetime) {
    if (teetime !== undefined && !teetime.trim()) {
      throw new Error("Tee time cannot be empty");
    }
  }
  validateCreateForVenueType(data, venueType) {
    if (venueType === "indoor") {
      if (!data.hitting_bay) {
        throw new Error("Hitting bay is required for indoor competitions");
      }
      if (data.hitting_bay < 1) {
        throw new Error("Hitting bay must be a positive number");
      }
    } else {
      const startHole = data.start_hole ?? 1;
      if (startHole !== 1 && startHole !== 10) {
        throw new Error("start_hole must be 1 or 10");
      }
      if (data.hitting_bay) {
        throw new Error("Hitting bay should not be set for outdoor competitions");
      }
    }
  }
  validateUpdateForVenueType(data, venueType) {
    if (venueType === "indoor") {
      if (typeof data.hitting_bay !== "undefined") {
        if (!data.hitting_bay) {
          throw new Error("Hitting bay is required for indoor competitions");
        }
        if (data.hitting_bay < 1) {
          throw new Error("Hitting bay must be a positive number");
        }
      }
      if (typeof data.start_hole !== "undefined" && data.start_hole !== 1) {
        throw new Error("Start hole is not applicable for indoor competitions");
      }
    } else {
      if (typeof data.start_hole !== "undefined") {
        if (data.start_hole !== 1 && data.start_hole !== 10) {
          throw new Error("start_hole must be 1 or 10");
        }
      }
      if (typeof data.hitting_bay !== "undefined" && data.hitting_bay !== null) {
        throw new Error("Hitting bay should not be set for outdoor competitions");
      }
    }
  }
  transformParticipantRow(row) {
    return {
      ...row,
      score: typeof row.score === "string" ? safeParseJsonWithDefault(row.score, []) : row.score || []
    };
  }
  transformTeeTimeWithParticipants(teeTimeRow, participantRows) {
    const parsedParticipants = participantRows.map((p) => this.transformParticipantRow(p));
    const pars = safeParseJson(teeTimeRow.pars, "pars");
    return {
      ...teeTimeRow,
      course_name: teeTimeRow.course_name,
      pars,
      participants: parsedParticipants
    };
  }
  validateParticipantIds(newOrder, validIds) {
    const invalidIds = newOrder.filter((id) => !validIds.includes(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid participant IDs: ${invalidIds.join(", ")}`);
    }
  }
  findCompetitionVenueInfo(competitionId) {
    const stmt = this.db.prepare("SELECT id, venue_type FROM competitions WHERE id = ?");
    return stmt.get(competitionId);
  }
  findCompetitionExists(competitionId) {
    const stmt = this.db.prepare("SELECT id FROM competitions WHERE id = ?");
    return stmt.get(competitionId) !== null;
  }
  insertTeeTimeRow(teetime, competitionId, startHole, hittingBay) {
    const stmt = this.db.prepare(`
      INSERT INTO tee_times (teetime, competition_id, start_hole, hitting_bay)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(teetime, competitionId, startHole, hittingBay);
  }
  findTeeTimeRowsByCompetition(competitionId) {
    const stmt = this.db.prepare("SELECT * FROM tee_times WHERE competition_id = ? ORDER BY teetime");
    return stmt.all(competitionId);
  }
  findTeeTimeRowsWithCourseByCompetition(competitionId) {
    const stmt = this.db.prepare(`
      SELECT t.*, co.name as course_name, co.pars
      FROM tee_times t
      JOIN competitions c ON t.competition_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE t.competition_id = ?
      ORDER BY t.teetime
    `);
    return stmt.all(competitionId);
  }
  findTeeTimeRowById(id) {
    const stmt = this.db.prepare("SELECT * FROM tee_times WHERE id = ?");
    return stmt.get(id);
  }
  findTeeTimeRowWithCourse(id) {
    const stmt = this.db.prepare(`
      SELECT t.*, co.name as course_name, co.pars
      FROM tee_times t
      JOIN competitions c ON t.competition_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE t.id = ?
    `);
    return stmt.get(id);
  }
  findParticipantRowsByTeeTime(teeTimeId) {
    const stmt = this.db.prepare(`
      SELECT p.*, t.name as team_name, p.player_id, p.is_dq
      FROM participants p
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE p.tee_time_id = ?
      ORDER BY p.tee_order
    `);
    return stmt.all(teeTimeId);
  }
  findParticipantIdsByTeeTime(teeTimeId) {
    const stmt = this.db.prepare("SELECT id FROM participants WHERE tee_time_id = ?");
    const rows = stmt.all(teeTimeId);
    return rows.map((r) => r.id);
  }
  updateTeeTimeRow(id, teetime, competitionId, startHole, hittingBay) {
    const stmt = this.db.prepare(`
      UPDATE tee_times
      SET teetime = ?, competition_id = ?, start_hole = ?, hitting_bay = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);
    return stmt.get(teetime, competitionId, startHole, hittingBay, id);
  }
  deleteTeeTimeRow(id) {
    const stmt = this.db.prepare("DELETE FROM tee_times WHERE id = ?");
    stmt.run(id);
  }
  updateParticipantOrderRow(participantId, order) {
    const stmt = this.db.prepare("UPDATE participants SET tee_order = ? WHERE id = ?");
    stmt.run(order, participantId);
  }
  async create(data) {
    this.validateTeeTimeRequired(data.teetime);
    const competition = this.findCompetitionVenueInfo(data.competition_id);
    if (!competition) {
      throw new Error("Competition not found");
    }
    this.validateCreateForVenueType(data, competition.venue_type);
    const startHole = data.start_hole ?? 1;
    return this.insertTeeTimeRow(data.teetime, data.competition_id, startHole, data.hitting_bay ?? null);
  }
  async findAllForCompetition(competitionId) {
    if (!this.findCompetitionExists(competitionId)) {
      throw new Error("Competition not found");
    }
    return this.findTeeTimeRowsByCompetition(competitionId);
  }
  async findAllForCompetitionWithParticipants(competitionId) {
    if (!this.findCompetitionExists(competitionId)) {
      throw new Error("Competition not found");
    }
    const teeTimeRows = this.findTeeTimeRowsWithCourseByCompetition(competitionId);
    return teeTimeRows.map((teeTimeRow) => {
      const participantRows = this.findParticipantRowsByTeeTime(teeTimeRow.id);
      return this.transformTeeTimeWithParticipants(teeTimeRow, participantRows);
    });
  }
  async findById(id) {
    return this.findTeeTimeRowById(id);
  }
  async findByIdWithParticipants(id) {
    const teeTimeRow = this.findTeeTimeRowWithCourse(id);
    if (!teeTimeRow)
      return null;
    const participantRows = this.findParticipantRowsByTeeTime(id);
    return this.transformTeeTimeWithParticipants(teeTimeRow, participantRows);
  }
  async update(id, data) {
    const existingTeeTime = this.findTeeTimeRowById(id);
    if (!existingTeeTime) {
      throw new Error("Tee time not found");
    }
    this.validateTeeTimeNotEmpty(data.teetime);
    const competitionId = data.competition_id ?? existingTeeTime.competition_id;
    const competition = this.findCompetitionVenueInfo(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }
    this.validateUpdateForVenueType(data, competition.venue_type);
    const hasChanges = data.teetime !== undefined || data.competition_id !== undefined || data.start_hole !== undefined || data.hitting_bay !== undefined;
    if (!hasChanges) {
      return existingTeeTime;
    }
    const teetime = data.teetime ?? existingTeeTime.teetime;
    const startHole = data.start_hole ?? existingTeeTime.start_hole;
    const hittingBay = data.hitting_bay !== undefined ? data.hitting_bay ?? null : existingTeeTime.hitting_bay ?? null;
    return this.updateTeeTimeRow(id, teetime, competitionId, startHole, hittingBay);
  }
  async delete(id) {
    const existingTeeTime = this.findTeeTimeRowById(id);
    if (!existingTeeTime) {
      throw new Error("Tee time not found");
    }
    this.deleteTeeTimeRow(id);
  }
  async updateParticipantsOrder(id, newOrder) {
    const existingTeeTime = this.findTeeTimeRowById(id);
    if (!existingTeeTime) {
      throw new Error("Tee time not found");
    }
    const validParticipantIds = this.findParticipantIdsByTeeTime(id);
    this.validateParticipantIds(newOrder, validParticipantIds);
    newOrder.forEach((participantId, index) => {
      this.updateParticipantOrderRow(participantId, index + 1);
    });
    const updatedTeeTime = await this.findByIdWithParticipants(id);
    if (!updatedTeeTime) {
      throw new Error("Failed to retrieve updated tee time");
    }
    return updatedTeeTime;
  }
}

// src/services/series-admin.service.ts
class SeriesAdminService {
  db;
  constructor(db) {
    this.db = db;
  }
  findSeriesExists(seriesId) {
    const result = this.db.prepare("SELECT 1 FROM series WHERE id = ?").get(seriesId);
    return !!result;
  }
  findUserExists(userId) {
    const result = this.db.prepare("SELECT 1 FROM users WHERE id = ?").get(userId);
    return !!result;
  }
  findSeriesAdminExists(seriesId, userId) {
    const result = this.db.prepare("SELECT 1 FROM series_admins WHERE series_id = ? AND user_id = ? LIMIT 1").get(seriesId, userId);
    return !!result;
  }
  findUserRole(userId) {
    const row = this.db.prepare("SELECT role FROM users WHERE id = ?").get(userId);
    return row?.role ?? null;
  }
  findSeriesOwnerId(seriesId) {
    const row = this.db.prepare("SELECT owner_id FROM series WHERE id = ?").get(seriesId);
    return row?.owner_id ?? null;
  }
  insertSeriesAdminRow(seriesId, userId) {
    return this.db.prepare(`
        INSERT INTO series_admins (series_id, user_id)
        VALUES (?, ?)
        RETURNING *
      `).get(seriesId, userId);
  }
  deleteSeriesAdminRow(seriesId, userId) {
    const result = this.db.prepare("DELETE FROM series_admins WHERE series_id = ? AND user_id = ?").run(seriesId, userId);
    return result.changes;
  }
  findSeriesAdminsWithUser(seriesId) {
    return this.db.prepare(`
        SELECT
          sa.*,
          u.email,
          u.role
        FROM series_admins sa
        JOIN users u ON sa.user_id = u.id
        WHERE sa.series_id = ?
        ORDER BY sa.created_at ASC
      `).all(seriesId);
  }
  findSeriesForUser(userId) {
    return this.db.prepare(`
        SELECT sa.series_id, s.name as series_name
        FROM series_admins sa
        JOIN series s ON sa.series_id = s.id
        WHERE sa.user_id = ?
        ORDER BY s.name ASC
      `).all(userId);
  }
  findSeriesAdminById(id) {
    return this.db.prepare("SELECT * FROM series_admins WHERE id = ?").get(id);
  }
  isSuperAdmin(role) {
    return role === "SUPER_ADMIN";
  }
  addSeriesAdmin(seriesId, userId) {
    if (!this.findSeriesExists(seriesId)) {
      throw new Error("Series not found");
    }
    if (!this.findUserExists(userId)) {
      throw new Error("User not found");
    }
    if (this.findSeriesAdminExists(seriesId, userId)) {
      throw new Error("User is already an admin for this series");
    }
    return this.insertSeriesAdminRow(seriesId, userId);
  }
  removeSeriesAdmin(seriesId, userId) {
    const changes = this.deleteSeriesAdminRow(seriesId, userId);
    if (changes === 0) {
      throw new Error("Series admin not found");
    }
  }
  getSeriesAdmins(seriesId) {
    if (!this.findSeriesExists(seriesId)) {
      throw new Error("Series not found");
    }
    return this.findSeriesAdminsWithUser(seriesId);
  }
  isSeriesAdmin(seriesId, userId) {
    return this.findSeriesAdminExists(seriesId, userId);
  }
  getSeriesForAdmin(userId) {
    return this.findSeriesForUser(userId);
  }
  canManageSeries(seriesId, userId) {
    const userRole = this.findUserRole(userId);
    if (this.isSuperAdmin(userRole)) {
      return true;
    }
    const ownerId = this.findSeriesOwnerId(seriesId);
    if (ownerId === null) {
      return this.findSeriesAdminExists(seriesId, userId);
    }
    if (ownerId === userId) {
      return true;
    }
    return this.findSeriesAdminExists(seriesId, userId);
  }
  canManageSeriesAdmins(seriesId, userId) {
    const userRole = this.findUserRole(userId);
    if (this.isSuperAdmin(userRole)) {
      return true;
    }
    const ownerId = this.findSeriesOwnerId(seriesId);
    if (ownerId === null) {
      return false;
    }
    return ownerId === userId;
  }
  findById(id) {
    return this.findSeriesAdminById(id);
  }
}
function createSeriesAdminService(db) {
  return new SeriesAdminService(db);
}

// src/services/competition-admin.service.ts
class CompetitionAdminService {
  db;
  constructor(db) {
    this.db = db;
  }
  findCompetitionExists(competitionId) {
    const result = this.db.prepare("SELECT 1 FROM competitions WHERE id = ?").get(competitionId);
    return !!result;
  }
  findUserExists(userId) {
    const result = this.db.prepare("SELECT 1 FROM users WHERE id = ?").get(userId);
    return !!result;
  }
  findCompetitionAdminExists(competitionId, userId) {
    const result = this.db.prepare("SELECT 1 FROM competition_admins WHERE competition_id = ? AND user_id = ? LIMIT 1").get(competitionId, userId);
    return !!result;
  }
  findUserRole(userId) {
    const row = this.db.prepare("SELECT role FROM users WHERE id = ?").get(userId);
    return row?.role ?? null;
  }
  findCompetitionOwnerAndContext(competitionId) {
    return this.db.prepare("SELECT owner_id, series_id, tour_id FROM competitions WHERE id = ?").get(competitionId);
  }
  findSeriesOwnerId(seriesId) {
    const row = this.db.prepare("SELECT owner_id FROM series WHERE id = ?").get(seriesId);
    return row?.owner_id ?? null;
  }
  findSeriesAdminExists(seriesId, userId) {
    const result = this.db.prepare("SELECT 1 FROM series_admins WHERE series_id = ? AND user_id = ? LIMIT 1").get(seriesId, userId);
    return !!result;
  }
  findTourOwnerId(tourId) {
    const row = this.db.prepare("SELECT owner_id FROM tours WHERE id = ?").get(tourId);
    return row?.owner_id ?? null;
  }
  findTourAdminExists(tourId, userId) {
    const result = this.db.prepare("SELECT 1 FROM tour_admins WHERE tour_id = ? AND user_id = ? LIMIT 1").get(tourId, userId);
    return !!result;
  }
  insertCompetitionAdminRow(competitionId, userId) {
    return this.db.prepare(`
        INSERT INTO competition_admins (competition_id, user_id)
        VALUES (?, ?)
        RETURNING *
      `).get(competitionId, userId);
  }
  deleteCompetitionAdminRow(competitionId, userId) {
    const result = this.db.prepare("DELETE FROM competition_admins WHERE competition_id = ? AND user_id = ?").run(competitionId, userId);
    return result.changes;
  }
  findCompetitionAdminsWithUser(competitionId) {
    return this.db.prepare(`
        SELECT
          ca.*,
          u.email,
          u.role
        FROM competition_admins ca
        JOIN users u ON ca.user_id = u.id
        WHERE ca.competition_id = ?
        ORDER BY ca.created_at ASC
      `).all(competitionId);
  }
  findCompetitionsForUser(userId) {
    return this.db.prepare(`
        SELECT ca.competition_id, c.name as competition_name
        FROM competition_admins ca
        JOIN competitions c ON ca.competition_id = c.id
        WHERE ca.user_id = ?
        ORDER BY c.date DESC
      `).all(userId);
  }
  findCompetitionAdminById(id) {
    return this.db.prepare("SELECT * FROM competition_admins WHERE id = ?").get(id);
  }
  isSuperAdmin(role) {
    return role === "SUPER_ADMIN";
  }
  addCompetitionAdmin(competitionId, userId) {
    if (!this.findCompetitionExists(competitionId)) {
      throw new Error("Competition not found");
    }
    if (!this.findUserExists(userId)) {
      throw new Error("User not found");
    }
    if (this.findCompetitionAdminExists(competitionId, userId)) {
      throw new Error("User is already an admin for this competition");
    }
    return this.insertCompetitionAdminRow(competitionId, userId);
  }
  removeCompetitionAdmin(competitionId, userId) {
    const changes = this.deleteCompetitionAdminRow(competitionId, userId);
    if (changes === 0) {
      throw new Error("Competition admin not found");
    }
  }
  getCompetitionAdmins(competitionId) {
    if (!this.findCompetitionExists(competitionId)) {
      throw new Error("Competition not found");
    }
    return this.findCompetitionAdminsWithUser(competitionId);
  }
  isCompetitionAdmin(competitionId, userId) {
    return this.findCompetitionAdminExists(competitionId, userId);
  }
  getCompetitionsForAdmin(userId) {
    return this.findCompetitionsForUser(userId);
  }
  canManageSeriesInternal(seriesId, userId) {
    const userRole = this.findUserRole(userId);
    if (this.isSuperAdmin(userRole)) {
      return true;
    }
    const ownerId = this.findSeriesOwnerId(seriesId);
    if (ownerId === userId) {
      return true;
    }
    return this.findSeriesAdminExists(seriesId, userId);
  }
  canManageTourInternal(tourId, userId) {
    const userRole = this.findUserRole(userId);
    if (this.isSuperAdmin(userRole)) {
      return true;
    }
    const ownerId = this.findTourOwnerId(tourId);
    if (ownerId === userId) {
      return true;
    }
    return this.findTourAdminExists(tourId, userId);
  }
  canManageCompetition(competitionId, userId) {
    const userRole = this.findUserRole(userId);
    if (this.isSuperAdmin(userRole)) {
      return true;
    }
    const context = this.findCompetitionOwnerAndContext(competitionId);
    if (!context) {
      return false;
    }
    if (context.owner_id === userId) {
      return true;
    }
    if (this.findCompetitionAdminExists(competitionId, userId)) {
      return true;
    }
    if (context.series_id) {
      if (this.canManageSeriesInternal(context.series_id, userId)) {
        return true;
      }
    }
    if (context.tour_id) {
      if (this.canManageTourInternal(context.tour_id, userId)) {
        return true;
      }
    }
    return false;
  }
  canManageCompetitionAdmins(competitionId, userId) {
    const userRole = this.findUserRole(userId);
    if (this.isSuperAdmin(userRole)) {
      return true;
    }
    const context = this.findCompetitionOwnerAndContext(competitionId);
    if (!context) {
      return false;
    }
    if (context.owner_id === userId) {
      return true;
    }
    if (context.series_id) {
      const seriesOwnerId = this.findSeriesOwnerId(context.series_id);
      if (seriesOwnerId === userId) {
        return true;
      }
    }
    if (context.tour_id) {
      const tourOwnerId = this.findTourOwnerId(context.tour_id);
      if (tourOwnerId === userId) {
        return true;
      }
    }
    return false;
  }
  findById(id) {
    return this.findCompetitionAdminById(id);
  }
}
function createCompetitionAdminService(db) {
  return new CompetitionAdminService(db);
}

// src/services/tour-admin.service.ts
class TourAdminService {
  db;
  constructor(db) {
    this.db = db;
  }
  findTourExists(tourId) {
    const result = this.db.prepare("SELECT 1 FROM tours WHERE id = ?").get(tourId);
    return !!result;
  }
  findUserExists(userId) {
    const result = this.db.prepare("SELECT 1 FROM users WHERE id = ?").get(userId);
    return !!result;
  }
  findTourAdminExists(tourId, userId) {
    const result = this.db.prepare("SELECT 1 FROM tour_admins WHERE tour_id = ? AND user_id = ? LIMIT 1").get(tourId, userId);
    return !!result;
  }
  findUserRole(userId) {
    const row = this.db.prepare("SELECT role FROM users WHERE id = ?").get(userId);
    return row?.role ?? null;
  }
  findTourOwnerId(tourId) {
    const row = this.db.prepare("SELECT owner_id FROM tours WHERE id = ?").get(tourId);
    return row?.owner_id ?? null;
  }
  insertTourAdminRow(tourId, userId) {
    return this.db.prepare(`
        INSERT INTO tour_admins (tour_id, user_id)
        VALUES (?, ?)
        RETURNING *
      `).get(tourId, userId);
  }
  deleteTourAdminRow(tourId, userId) {
    const result = this.db.prepare("DELETE FROM tour_admins WHERE tour_id = ? AND user_id = ?").run(tourId, userId);
    return result.changes;
  }
  findTourAdminsWithUser(tourId) {
    return this.db.prepare(`
        SELECT
          ta.*,
          u.email,
          u.role
        FROM tour_admins ta
        JOIN users u ON ta.user_id = u.id
        WHERE ta.tour_id = ?
        ORDER BY ta.created_at ASC
      `).all(tourId);
  }
  findToursForUser(userId) {
    return this.db.prepare(`
        SELECT ta.tour_id, t.name as tour_name
        FROM tour_admins ta
        JOIN tours t ON ta.tour_id = t.id
        WHERE ta.user_id = ?
        ORDER BY t.name ASC
      `).all(userId);
  }
  findTourAdminById(id) {
    return this.db.prepare("SELECT * FROM tour_admins WHERE id = ?").get(id);
  }
  isSuperAdmin(role) {
    return role === "SUPER_ADMIN";
  }
  addTourAdmin(tourId, userId) {
    if (!this.findTourExists(tourId)) {
      throw new Error("Tour not found");
    }
    if (!this.findUserExists(userId)) {
      throw new Error("User not found");
    }
    if (this.findTourAdminExists(tourId, userId)) {
      throw new Error("User is already an admin for this tour");
    }
    return this.insertTourAdminRow(tourId, userId);
  }
  removeTourAdmin(tourId, userId) {
    const changes = this.deleteTourAdminRow(tourId, userId);
    if (changes === 0) {
      throw new Error("Tour admin not found");
    }
  }
  getTourAdmins(tourId) {
    if (!this.findTourExists(tourId)) {
      throw new Error("Tour not found");
    }
    return this.findTourAdminsWithUser(tourId);
  }
  isTourAdmin(tourId, userId) {
    return this.findTourAdminExists(tourId, userId);
  }
  getToursForAdmin(userId) {
    return this.findToursForUser(userId);
  }
  canManageTour(tourId, userId) {
    const userRole = this.findUserRole(userId);
    if (this.isSuperAdmin(userRole)) {
      return true;
    }
    const ownerId = this.findTourOwnerId(tourId);
    if (ownerId === null) {
      return false;
    }
    if (ownerId === userId) {
      return true;
    }
    return this.findTourAdminExists(tourId, userId);
  }
  canManageTourAdmins(tourId, userId) {
    const userRole = this.findUserRole(userId);
    if (this.isSuperAdmin(userRole)) {
      return true;
    }
    const ownerId = this.findTourOwnerId(tourId);
    if (ownerId === null) {
      return false;
    }
    return ownerId === userId;
  }
  findById(id) {
    return this.findTourAdminById(id);
  }
}
function createTourAdminService(db) {
  return new TourAdminService(db);
}

// src/services/tour-category.service.ts
class TourCategoryService {
  db;
  constructor(db) {
    this.db = db;
  }
  findTourExists(tourId) {
    const result = this.db.prepare("SELECT 1 FROM tours WHERE id = ?").get(tourId);
    return !!result;
  }
  findCategoryByTourAndName(tourId, name) {
    const result = this.db.prepare("SELECT 1 FROM tour_categories WHERE tour_id = ? AND LOWER(name) = LOWER(?) LIMIT 1").get(tourId, name);
    return !!result;
  }
  findCategoryByTourAndNameExcluding(tourId, name, excludeId) {
    const result = this.db.prepare("SELECT 1 FROM tour_categories WHERE tour_id = ? AND LOWER(name) = LOWER(?) AND id != ? LIMIT 1").get(tourId, name, excludeId);
    return !!result;
  }
  findMaxSortOrder(tourId) {
    const row = this.db.prepare("SELECT COALESCE(MAX(sort_order), -1) as max_order FROM tour_categories WHERE tour_id = ?").get(tourId);
    return row.max_order;
  }
  insertCategoryRow(tourId, name, description, sortOrder) {
    return this.db.prepare(`
        INSERT INTO tour_categories (tour_id, name, description, sort_order)
        VALUES (?, ?, ?, ?)
        RETURNING *
      `).get(tourId, name, description, sortOrder);
  }
  updateCategoryRow(id, name, description, sortOrder) {
    return this.db.prepare(`
        UPDATE tour_categories
        SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          sort_order = COALESCE(?, sort_order)
        WHERE id = ?
        RETURNING *
      `).get(name, description, sortOrder, id);
  }
  deleteCategoryRow(id) {
    this.db.prepare("DELETE FROM tour_categories WHERE id = ?").run(id);
  }
  findCategoryById(id) {
    return this.db.prepare("SELECT * FROM tour_categories WHERE id = ?").get(id);
  }
  findCategoriesByTourWithCount(tourId) {
    return this.db.prepare(`
        SELECT
          tc.*,
          (SELECT COUNT(*) FROM tour_enrollments WHERE category_id = tc.id) as enrollment_count
        FROM tour_categories tc
        WHERE tc.tour_id = ?
        ORDER BY tc.sort_order ASC, tc.name ASC
      `).all(tourId);
  }
  updateCategorySortOrder(id, sortOrder) {
    this.db.prepare("UPDATE tour_categories SET sort_order = ? WHERE id = ?").run(sortOrder, id);
  }
  findEnrollmentTourId(enrollmentId) {
    const row = this.db.prepare("SELECT tour_id FROM tour_enrollments WHERE id = ?").get(enrollmentId);
    return row?.tour_id ?? null;
  }
  updateEnrollmentCategory(enrollmentId, categoryId) {
    this.db.prepare("UPDATE tour_enrollments SET category_id = ? WHERE id = ?").run(categoryId, enrollmentId);
  }
  findEnrollmentsByIds(enrollmentIds) {
    const placeholders = enrollmentIds.map(() => "?").join(",");
    return this.db.prepare(`SELECT id, tour_id FROM tour_enrollments WHERE id IN (${placeholders})`).all(...enrollmentIds);
  }
  updateEnrollmentsCategory(enrollmentIds, categoryId) {
    const placeholders = enrollmentIds.map(() => "?").join(",");
    const result = this.db.prepare(`UPDATE tour_enrollments SET category_id = ? WHERE id IN (${placeholders})`).run(categoryId, ...enrollmentIds);
    return result.changes;
  }
  findEnrollmentsByCategory(categoryId) {
    return this.db.prepare(`
        SELECT
          te.id,
          te.player_id,
          te.email,
          p.name as player_name
        FROM tour_enrollments te
        LEFT JOIN players p ON te.player_id = p.id
        WHERE te.category_id = ?
        ORDER BY COALESCE(p.name, te.email) ASC
      `).all(categoryId);
  }
  validateCategoriesInTour(categoryIds, validCategoryIds) {
    for (const id of categoryIds) {
      if (!validCategoryIds.has(id)) {
        throw new Error(`Category ${id} does not belong to this tour`);
      }
    }
  }
  validateAllEnrollmentsSameTour(enrollments, expectedCount) {
    if (enrollments.length !== expectedCount) {
      throw new Error("One or more enrollments not found");
    }
    const tourIds = new Set(enrollments.map((e) => e.tour_id));
    if (tourIds.size > 1) {
      throw new Error("All enrollments must belong to the same tour");
    }
    return enrollments[0].tour_id;
  }
  create(tourId, data) {
    if (!this.findTourExists(tourId)) {
      throw new Error("Tour not found");
    }
    if (this.findCategoryByTourAndName(tourId, data.name)) {
      throw new Error("A category with this name already exists in this tour");
    }
    const sortOrder = data.sort_order ?? this.findMaxSortOrder(tourId) + 1;
    return this.insertCategoryRow(tourId, data.name, data.description ?? null, sortOrder);
  }
  update(id, data) {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error("Category not found");
    }
    const isNameChanging = data.name && data.name.toLowerCase() !== existing.name.toLowerCase();
    if (isNameChanging) {
      const isDuplicate = this.findCategoryByTourAndNameExcluding(existing.tour_id, data.name, id);
      if (isDuplicate) {
        throw new Error("A category with this name already exists in this tour");
      }
    }
    return this.updateCategoryRow(id, data.name ?? null, data.description ?? null, data.sort_order ?? null);
  }
  delete(id) {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error("Category not found");
    }
    this.deleteCategoryRow(id);
  }
  findById(id) {
    return this.findCategoryById(id);
  }
  findByTour(tourId) {
    if (!this.findTourExists(tourId)) {
      throw new Error("Tour not found");
    }
    return this.findCategoriesByTourWithCount(tourId);
  }
  reorder(tourId, categoryIds) {
    const categories = this.findByTour(tourId);
    const validCategoryIds = new Set(categories.map((c) => c.id));
    this.validateCategoriesInTour(categoryIds, validCategoryIds);
    for (let i = 0;i < categoryIds.length; i++) {
      this.updateCategorySortOrder(categoryIds[i], i);
    }
  }
  assignToEnrollment(enrollmentId, categoryId) {
    const enrollmentTourId = this.findEnrollmentTourId(enrollmentId);
    if (enrollmentTourId === null) {
      throw new Error("Enrollment not found");
    }
    if (categoryId !== null) {
      const category = this.findById(categoryId);
      if (!category) {
        throw new Error("Category not found");
      }
      if (category.tour_id !== enrollmentTourId) {
        throw new Error("Category does not belong to the same tour as the enrollment");
      }
    }
    this.updateEnrollmentCategory(enrollmentId, categoryId);
  }
  bulkAssign(enrollmentIds, categoryId) {
    if (enrollmentIds.length === 0) {
      return 0;
    }
    const enrollments = this.findEnrollmentsByIds(enrollmentIds);
    const tourId = this.validateAllEnrollmentsSameTour(enrollments, enrollmentIds.length);
    if (categoryId !== null) {
      const category = this.findById(categoryId);
      if (!category) {
        throw new Error("Category not found");
      }
      if (category.tour_id !== tourId) {
        throw new Error("Category does not belong to the same tour as the enrollments");
      }
    }
    return this.updateEnrollmentsCategory(enrollmentIds, categoryId);
  }
  getEnrollmentsByCategory(categoryId) {
    const category = this.findById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }
    return this.findEnrollmentsByCategory(categoryId);
  }
}
function createTourCategoryService(db) {
  return new TourCategoryService(db);
}

// src/services/tour-document.service.ts
class TourDocumentService {
  db;
  constructor(db) {
    this.db = db;
  }
  findTourExists(tourId) {
    const result = this.db.prepare("SELECT 1 FROM tours WHERE id = ?").get(tourId);
    return !!result;
  }
  insertDocumentRow(title, content, type, tourId) {
    return this.db.prepare(`
        INSERT INTO tour_documents (title, content, type, tour_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S.%f', 'now'), strftime('%Y-%m-%d %H:%M:%S.%f', 'now'))
        RETURNING *
      `).get(title, content, type, tourId);
  }
  findAllDocuments() {
    return this.db.prepare(`
        SELECT id, title, content, type, tour_id, created_at, updated_at
        FROM tour_documents
        ORDER BY strftime('%s.%f', created_at) DESC
      `).all();
  }
  findDocumentById(id) {
    return this.db.prepare(`
        SELECT id, title, content, type, tour_id, created_at, updated_at
        FROM tour_documents
        WHERE id = ?
      `).get(id);
  }
  findDocumentsByTour(tourId) {
    return this.db.prepare(`
        SELECT id, title, content, type, tour_id, created_at, updated_at
        FROM tour_documents
        WHERE tour_id = ?
        ORDER BY type, title
      `).all(tourId);
  }
  findDocumentsByTourAndType(tourId, type) {
    return this.db.prepare(`
        SELECT id, title, content, type, tour_id, created_at, updated_at
        FROM tour_documents
        WHERE tour_id = ? AND type = ?
        ORDER BY title
      `).all(tourId, type);
  }
  updateDocumentRow(id, updates, values) {
    return this.db.prepare(`
        UPDATE tour_documents
        SET ${updates.join(", ")}
        WHERE id = ?
        RETURNING *
      `).get(...values);
  }
  deleteDocumentRow(id) {
    this.db.prepare("DELETE FROM tour_documents WHERE id = ?").run(id);
  }
  findDistinctTypesByTour(tourId) {
    return this.db.prepare(`
        SELECT DISTINCT type
        FROM tour_documents
        WHERE tour_id = ?
        ORDER BY type
      `).all(tourId);
  }
  validateCreateData(data) {
    if (!data.title?.trim()) {
      throw new Error("Document title is required");
    }
    if (!data.content?.trim()) {
      throw new Error("Document content is required");
    }
    if (!data.tour_id) {
      throw new Error("Tour ID is required");
    }
  }
  validateUpdateData(data) {
    if (data.title !== undefined && !data.title.trim()) {
      throw new Error("Document title cannot be empty");
    }
    if (data.content !== undefined && !data.content.trim()) {
      throw new Error("Document content cannot be empty");
    }
    if (data.type !== undefined && !data.type.trim()) {
      throw new Error("Document type cannot be empty");
    }
  }
  buildUpdateQuery(data, id) {
    const updates = [];
    const values = [];
    if (data.title !== undefined) {
      updates.push("title = ?");
      values.push(data.title.trim());
    }
    if (data.content !== undefined) {
      updates.push("content = ?");
      values.push(data.content.trim());
    }
    if (data.type !== undefined) {
      updates.push("type = ?");
      values.push(data.type.trim());
    }
    updates.push("updated_at = strftime('%Y-%m-%d %H:%M:%S.%f', 'now')");
    values.push(id);
    return { updates, values };
  }
  extractTypes(rows) {
    return rows.map((r) => r.type);
  }
  create(data) {
    this.validateCreateData(data);
    if (!this.findTourExists(data.tour_id)) {
      throw new Error("Tour not found");
    }
    const type = data.type?.trim() || "general";
    return this.insertDocumentRow(data.title.trim(), data.content.trim(), type, data.tour_id);
  }
  findAll() {
    return this.findAllDocuments();
  }
  findById(id) {
    return this.findDocumentById(id);
  }
  findByTourId(tourId) {
    if (!this.findTourExists(tourId)) {
      throw new Error("Tour not found");
    }
    return this.findDocumentsByTour(tourId);
  }
  findByTourIdAndType(tourId, type) {
    if (!this.findTourExists(tourId)) {
      throw new Error("Tour not found");
    }
    return this.findDocumentsByTourAndType(tourId, type.trim());
  }
  update(id, data) {
    const document = this.findById(id);
    if (!document) {
      throw new Error("Document not found");
    }
    this.validateUpdateData(data);
    const { updates, values } = this.buildUpdateQuery(data, id);
    if (updates.length === 1) {
      return document;
    }
    return this.updateDocumentRow(id, updates, values);
  }
  delete(id) {
    const document = this.findById(id);
    if (!document) {
      throw new Error("Document not found");
    }
    this.deleteDocumentRow(id);
  }
  getDocumentTypes(tourId) {
    if (!this.findTourExists(tourId)) {
      throw new Error("Tour not found");
    }
    const rows = this.findDistinctTypesByTour(tourId);
    return this.extractTypes(rows);
  }
}

// src/services/tour-enrollment.service.ts
class TourEnrollmentService {
  db;
  constructor(db) {
    this.db = db;
  }
  findTourExists(tourId) {
    const result = this.db.prepare("SELECT 1 FROM tours WHERE id = ?").get(tourId);
    return !!result;
  }
  findTourWithMode(tourId) {
    return this.db.prepare("SELECT id, enrollment_mode FROM tours WHERE id = ?").get(tourId);
  }
  findTourVisibility(tourId) {
    return this.db.prepare("SELECT id, visibility, owner_id FROM tours WHERE id = ?").get(tourId);
  }
  findTourOwnerId(tourId) {
    const row = this.db.prepare("SELECT owner_id FROM tours WHERE id = ?").get(tourId);
    return row?.owner_id ?? null;
  }
  findUserByEmailLower(email) {
    return this.db.prepare("SELECT id, email, role FROM users WHERE LOWER(email) = ?").get(email.toLowerCase());
  }
  findUserRole(userId) {
    const row = this.db.prepare("SELECT role FROM users WHERE id = ?").get(userId);
    return row?.role ?? null;
  }
  findPlayerByUserId(userId) {
    return this.db.prepare("SELECT id FROM players WHERE user_id = ?").get(userId);
  }
  findPlayerWithEmail(playerId) {
    return this.db.prepare(`
        SELECT p.id, u.email
        FROM players p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `).get(playerId);
  }
  findTourAdminExists(tourId, userId) {
    const result = this.db.prepare("SELECT 1 FROM tour_admins WHERE tour_id = ? AND user_id = ? LIMIT 1").get(tourId, userId);
    return !!result;
  }
  findActiveEnrollmentByUser(tourId, userId) {
    const result = this.db.prepare(`
        SELECT 1 FROM tour_enrollments te
        JOIN players p ON te.player_id = p.id
        WHERE te.tour_id = ? AND p.user_id = ? AND te.status = 'active'
        LIMIT 1
      `).get(tourId, userId);
    return !!result;
  }
  insertPlayerRow(name, userId) {
    return this.db.prepare("INSERT INTO players (name, user_id) VALUES (?, ?) RETURNING id").get(name, userId);
  }
  insertActiveEnrollmentRow(tourId, playerId, email) {
    return this.db.prepare(`
        INSERT INTO tour_enrollments (tour_id, player_id, email, status)
        VALUES (?, ?, ?, 'active')
        RETURNING *
      `).get(tourId, playerId, email);
  }
  insertPendingEnrollmentRow(tourId, email) {
    return this.db.prepare(`
        INSERT INTO tour_enrollments (tour_id, email, status)
        VALUES (?, ?, 'pending')
        RETURNING *
      `).get(tourId, email);
  }
  insertRequestedEnrollmentRow(tourId, playerId, email) {
    return this.db.prepare(`
        INSERT INTO tour_enrollments (tour_id, player_id, email, status)
        VALUES (?, ?, ?, 'requested')
        RETURNING *
      `).get(tourId, playerId, email);
  }
  updateEnrollmentStatusRow(enrollmentId, status) {
    return this.db.prepare(`
        UPDATE tour_enrollments
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `).get(status, enrollmentId);
  }
  updateEnrollmentWithPlayerRow(enrollmentId, playerId) {
    return this.db.prepare(`
        UPDATE tour_enrollments
        SET status = 'active', player_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        RETURNING *
      `).get(playerId, enrollmentId);
  }
  deleteEnrollmentRow(enrollmentId) {
    const result = this.db.prepare("DELETE FROM tour_enrollments WHERE id = ?").run(enrollmentId);
    return result.changes;
  }
  deleteEnrollmentByTourRow(enrollmentId, tourId) {
    const result = this.db.prepare("DELETE FROM tour_enrollments WHERE id = ? AND tour_id = ?").run(enrollmentId, tourId);
    return result.changes;
  }
  findEnrollmentsByTour(tourId) {
    return this.db.prepare(`
        SELECT
          te.*,
          p.name as player_name,
          tc.name as category_name,
          COALESCE(te.playing_handicap, p.handicap) as handicap
        FROM tour_enrollments te
        LEFT JOIN players p ON te.player_id = p.id
        LEFT JOIN tour_categories tc ON te.category_id = tc.id
        WHERE te.tour_id = ?
        ORDER BY te.created_at DESC
      `).all(tourId);
  }
  findEnrollmentsByTourAndStatus(tourId, status) {
    return this.db.prepare(`
        SELECT
          te.*,
          p.name as player_name,
          tc.name as category_name,
          COALESCE(te.playing_handicap, p.handicap) as handicap
        FROM tour_enrollments te
        LEFT JOIN players p ON te.player_id = p.id
        LEFT JOIN tour_categories tc ON te.category_id = tc.id
        WHERE te.tour_id = ? AND te.status = ?
        ORDER BY te.created_at DESC
      `).all(tourId, status);
  }
  findEnrollmentsByPlayer(playerId) {
    return this.db.prepare(`
        SELECT * FROM tour_enrollments
        WHERE player_id = ?
        ORDER BY created_at DESC
      `).all(playerId);
  }
  extractEmailName(email) {
    return email.split("@")[0];
  }
  validateEnrollmentStatus(enrollment, expectedStatus, action) {
    if (enrollment.status !== expectedStatus) {
      throw new Error(`Can only ${action} enrollments with '${expectedStatus}' status`);
    }
  }
  addPendingEnrollment(tourId, email) {
    if (!this.findTourExists(tourId)) {
      throw new Error("Tour not found");
    }
    const existingEnrollment = this.getEnrollmentByEmail(tourId, email);
    if (existingEnrollment) {
      throw new Error("Email is already enrolled in this tour");
    }
    const normalizedEmail = email.toLowerCase();
    const existingUser = this.findUserByEmailLower(normalizedEmail);
    if (existingUser) {
      let player = this.findPlayerByUserId(existingUser.id);
      if (!player) {
        const emailName = this.extractEmailName(existingUser.email);
        player = this.insertPlayerRow(emailName, existingUser.id);
      }
      return this.insertActiveEnrollmentRow(tourId, player.id, normalizedEmail);
    }
    return this.insertPendingEnrollmentRow(tourId, normalizedEmail);
  }
  requestEnrollment(tourId, playerId) {
    const tour = this.findTourWithMode(tourId);
    if (!tour) {
      throw new Error("Tour not found");
    }
    if (tour.enrollment_mode !== "request") {
      throw new Error("This tour does not accept enrollment requests");
    }
    const player = this.findPlayerWithEmail(playerId);
    if (!player) {
      throw new Error("Player not found or not linked to a user account");
    }
    const existingEnrollment = this.getEnrollmentByEmail(tourId, player.email);
    if (existingEnrollment) {
      throw new Error("Player is already enrolled or has a pending request");
    }
    return this.insertRequestedEnrollmentRow(tourId, playerId, player.email.toLowerCase());
  }
  approveEnrollment(enrollmentId) {
    const enrollment = this.findById(enrollmentId);
    if (!enrollment) {
      throw new Error("Enrollment not found");
    }
    this.validateEnrollmentStatus(enrollment, "requested", "approve");
    return this.updateEnrollmentStatusRow(enrollmentId, "active");
  }
  rejectEnrollment(enrollmentId) {
    const changes = this.deleteEnrollmentRow(enrollmentId);
    if (changes === 0) {
      throw new Error("Enrollment not found");
    }
  }
  getEnrollments(tourId, status) {
    if (status) {
      return this.findEnrollmentsByTourAndStatus(tourId, status);
    }
    return this.findEnrollmentsByTour(tourId);
  }
  getEnrollmentByEmail(tourId, email) {
    return this.db.prepare(`
        SELECT
          te.*,
          p.name as player_name,
          tc.name as category_name
        FROM tour_enrollments te
        LEFT JOIN players p ON te.player_id = p.id
        LEFT JOIN tour_categories tc ON te.category_id = tc.id
        WHERE te.tour_id = ? AND LOWER(te.email) = LOWER(?)
      `).get(tourId, email);
  }
  findById(id) {
    return this.db.prepare("SELECT * FROM tour_enrollments WHERE id = ?").get(id);
  }
  activateEnrollment(tourId, email, playerId) {
    const enrollment = this.getEnrollmentByEmail(tourId, email);
    if (!enrollment) {
      throw new Error("Enrollment not found for this email");
    }
    this.validateEnrollmentStatus(enrollment, "pending", "activate");
    return this.updateEnrollmentWithPlayerRow(enrollment.id, playerId);
  }
  getPendingEnrollmentsForEmail(email) {
    return this.db.prepare(`
        SELECT * FROM tour_enrollments
        WHERE LOWER(email) = LOWER(?) AND status = 'pending'
      `).all(email);
  }
  canViewTour(tourId, userId) {
    const tour = this.findTourVisibility(tourId);
    if (!tour) {
      return false;
    }
    if (tour.visibility === "public") {
      return true;
    }
    if (!userId) {
      return false;
    }
    const userRole = this.findUserRole(userId);
    if (userRole === "SUPER_ADMIN") {
      return true;
    }
    if (tour.owner_id === userId) {
      return true;
    }
    if (this.findTourAdminExists(tourId, userId)) {
      return true;
    }
    return this.findActiveEnrollmentByUser(tourId, userId);
  }
  canManageTour(tourId, userId) {
    const userRole = this.findUserRole(userId);
    if (userRole === "SUPER_ADMIN") {
      return true;
    }
    const ownerId = this.findTourOwnerId(tourId);
    if (ownerId === null) {
      return false;
    }
    if (ownerId === userId) {
      return true;
    }
    return this.findTourAdminExists(tourId, userId);
  }
  getEnrollmentsForPlayer(playerId) {
    return this.findEnrollmentsByPlayer(playerId);
  }
  removeEnrollment(tourId, enrollmentId) {
    const changes = this.deleteEnrollmentByTourRow(enrollmentId, tourId);
    if (changes === 0) {
      throw new Error("Enrollment not found");
    }
  }
}
function createTourEnrollmentService(db) {
  return new TourEnrollmentService(db);
}

// src/services/tour-competition-registration.service.ts
var MAX_GROUP_SIZE = 4;

class TourCompetitionRegistrationService {
  db;
  constructor(db) {
    this.db = db;
  }
  findCompetitionWithTour(competitionId) {
    return this.db.prepare(`SELECT c.id, c.tour_id, c.start_mode, c.open_start, c.open_end
         FROM competitions c
         WHERE c.id = ?`).get(competitionId);
  }
  findCompetitionTourId(competitionId) {
    const row = this.db.prepare("SELECT tour_id FROM competitions WHERE id = ?").get(competitionId);
    return row?.tour_id ?? null;
  }
  findCoursePars(competitionId) {
    const row = this.db.prepare(`SELECT co.pars
         FROM competitions c
         JOIN courses co ON c.course_id = co.id
         WHERE c.id = ?`).get(competitionId);
    return row?.pars ?? null;
  }
  findPlayerById(playerId) {
    return this.db.prepare("SELECT id, name, handicap FROM players WHERE id = ?").get(playerId);
  }
  findPlayerName(playerId) {
    const row = this.db.prepare("SELECT name FROM players WHERE id = ?").get(playerId);
    return row?.name ?? null;
  }
  findActiveEnrollment(tourId, playerId) {
    return this.db.prepare(`SELECT id FROM tour_enrollments
         WHERE tour_id = ? AND player_id = ? AND status = 'active'`).get(tourId, playerId);
  }
  findRegistrationRow(competitionId, playerId) {
    return this.db.prepare(`SELECT * FROM tour_competition_registrations
         WHERE competition_id = ? AND player_id = ?`).get(competitionId, playerId);
  }
  findRegistrationsByCompetition(competitionId) {
    return this.db.prepare(`SELECT r.*, p.name as player_name, p.handicap, tc.name as category_name
         FROM tour_competition_registrations r
         JOIN players p ON r.player_id = p.id
         LEFT JOIN tour_enrollments te ON r.enrollment_id = te.id
         LEFT JOIN tour_categories tc ON te.category_id = tc.id
         WHERE r.competition_id = ?
         ORDER BY r.registered_at`).all(competitionId);
  }
  findAvailablePlayersForCompetition(competitionId, tourId) {
    return this.db.prepare(`SELECT
          p.id as player_id,
          COALESCE(pp.display_name, p.name) as name,
          COALESCE(te.playing_handicap, p.handicap) as handicap,
          r.status as registration_status,
          r.tee_time_id as group_tee_time_id
         FROM tour_enrollments te
         JOIN players p ON te.player_id = p.id
         LEFT JOIN player_profiles pp ON p.id = pp.player_id
         LEFT JOIN tour_competition_registrations r
           ON r.competition_id = ? AND r.player_id = p.id
         WHERE te.tour_id = ? AND te.status = 'active' AND te.player_id IS NOT NULL
         ORDER BY
           CASE WHEN r.status = 'looking_for_group' THEN 0 ELSE 1 END,
           COALESCE(pp.display_name, p.name)`).all(competitionId, tourId);
  }
  findTeamByName(name) {
    return this.db.prepare("SELECT id FROM teams WHERE name = ?").get(name);
  }
  insertTeamRow(name) {
    return this.db.prepare("INSERT INTO teams (name) VALUES (?) RETURNING id").get(name);
  }
  insertTeeTimeRow(competitionId) {
    return this.db.prepare(`INSERT INTO tee_times (teetime, competition_id, start_hole)
         VALUES ('', ?, 1)
         RETURNING id`).get(competitionId);
  }
  insertParticipantRow(teamId, teeTimeId, playerId, playerName, teeOrder = 1) {
    return this.db.prepare(`INSERT INTO participants (tee_order, team_id, tee_time_id, position_name, player_id, player_names, score)
         VALUES (?, ?, ?, 'Player', ?, ?, '[]')
         RETURNING id`).get(teeOrder, teamId, teeTimeId, playerId, playerName);
  }
  insertRegistrationRow(competitionId, playerId, enrollmentId, teeTimeId, participantId, status, groupCreatedBy) {
    return this.db.prepare(`INSERT INTO tour_competition_registrations
         (competition_id, player_id, enrollment_id, tee_time_id, participant_id, status, group_created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING *`).get(competitionId, playerId, enrollmentId, teeTimeId, participantId, status, groupCreatedBy);
  }
  deleteParticipantRow(participantId) {
    this.db.prepare("DELETE FROM participants WHERE id = ?").run(participantId);
  }
  findParticipantCountByTeeTime(teeTimeId) {
    const row = this.db.prepare("SELECT COUNT(*) as count FROM participants WHERE tee_time_id = ?").get(teeTimeId);
    return row.count;
  }
  findRegistrationCountByTeeTime(teeTimeId) {
    const row = this.db.prepare(`SELECT COUNT(*) as count FROM tour_competition_registrations
         WHERE tee_time_id = ?`).get(teeTimeId);
    return row.count;
  }
  deleteTeeTimeRow(teeTimeId) {
    this.db.prepare("DELETE FROM tee_times WHERE id = ?").run(teeTimeId);
  }
  deleteRegistrationRow(registrationId) {
    this.db.prepare("DELETE FROM tour_competition_registrations WHERE id = ?").run(registrationId);
  }
  updateRegistrationStatusRow(registrationId, status) {
    this.db.prepare(`UPDATE tour_competition_registrations
         SET status = ?
         WHERE id = ?`).run(status, registrationId);
  }
  updateRegistrationStartedRow(registrationId) {
    this.db.prepare(`UPDATE tour_competition_registrations
         SET status = 'playing', started_at = CURRENT_TIMESTAMP
         WHERE id = ?`).run(registrationId);
  }
  updateRegistrationFinishedRow(registrationId) {
    this.db.prepare(`UPDATE tour_competition_registrations
         SET status = 'finished', finished_at = CURRENT_TIMESTAMP
         WHERE id = ?`).run(registrationId);
  }
  findGroupMembersByTeeTime(teeTimeId) {
    return this.db.prepare(`SELECT r.player_id,
                COALESCE(pp.display_name, p.name) as name,
                COALESCE(te.playing_handicap, p.handicap) as handicap
         FROM tour_competition_registrations r
         JOIN players p ON r.player_id = p.id
         LEFT JOIN player_profiles pp ON p.id = pp.player_id
         JOIN tour_enrollments te ON r.enrollment_id = te.id
         WHERE r.tee_time_id = ?
         ORDER BY r.registered_at`).all(teeTimeId);
  }
  findActiveRoundsForPlayer(playerId) {
    return this.db.prepare(`SELECT
          t.id as tour_id,
          t.name as tour_name,
          c.id as competition_id,
          c.name as competition_name,
          co.name as course_name,
          r.tee_time_id,
          r.participant_id,
          r.status as registration_status,
          c.open_end as open_until,
          p.score
         FROM tour_competition_registrations r
         JOIN competitions c ON r.competition_id = c.id
         JOIN tours t ON c.tour_id = t.id
         JOIN courses co ON c.course_id = co.id
         JOIN participants p ON r.participant_id = p.id
         WHERE r.player_id = ? AND r.status IN ('registered', 'playing', 'looking_for_group', 'finished')
         ORDER BY c.date DESC`).all(playerId);
  }
  findGroupMembersExcludingPlayer(teeTimeId, excludePlayerId) {
    return this.db.prepare(`SELECT p.name, COALESCE(te.playing_handicap, p.handicap) as handicap
         FROM tour_competition_registrations r
         JOIN players p ON r.player_id = p.id
         JOIN tour_enrollments te ON r.enrollment_id = te.id
         WHERE r.tee_time_id = ? AND r.player_id != ?`).all(teeTimeId, excludePlayerId);
  }
  findCompetitionGroupParticipants(competitionId) {
    return this.db.prepare(`SELECT
          tt.id as tee_time_id,
          par.id as participant_id,
          COALESCE(pp.display_name, pl.name, par.player_names) as player_name,
          par.score,
          par.is_locked,
          par.is_dq,
          tm.name as team_name,
          par.player_id,
          r.status as registration_status,
          r.started_at,
          r.finished_at,
          COALESCE(par.handicap_index, te.playing_handicap, pl.handicap) as handicap,
          tc.name as category_name
         FROM tee_times tt
         JOIN competitions c ON tt.competition_id = c.id
         JOIN participants par ON par.tee_time_id = tt.id
         LEFT JOIN teams tm ON par.team_id = tm.id
         LEFT JOIN players pl ON par.player_id = pl.id
         LEFT JOIN player_profiles pp ON pl.id = pp.player_id
         LEFT JOIN tour_enrollments te ON par.player_id = te.player_id AND c.tour_id = te.tour_id
         LEFT JOIN tour_categories tc ON te.category_id = tc.id
         LEFT JOIN tour_competition_registrations r ON r.participant_id = par.id
         WHERE tt.competition_id = ?
         ORDER BY tt.id, par.tee_order`).all(competitionId);
  }
  findMaxTeeOrderForTeeTime(teeTimeId) {
    const row = this.db.prepare(`SELECT MAX(tee_order) as max_order FROM participants WHERE tee_time_id = ?`).get(teeTimeId);
    return row.max_order ?? 0;
  }
  updateParticipantTeeTime(participantId, teeTimeId, teeOrder) {
    this.db.prepare(`UPDATE participants
         SET tee_time_id = ?, tee_order = ?
         WHERE id = ?`).run(teeTimeId, teeOrder, participantId);
  }
  updateRegistrationTeeTime(registrationId, teeTimeId, groupCreatedBy) {
    this.db.prepare(`UPDATE tour_competition_registrations
         SET tee_time_id = ?, status = 'registered', group_created_by = ?
         WHERE id = ?`).run(teeTimeId, groupCreatedBy, registrationId);
  }
  updateRegistrationTeeTimeOnly(registrationId, teeTimeId) {
    this.db.prepare(`UPDATE tour_competition_registrations
         SET tee_time_id = ?, group_created_by = NULL
         WHERE id = ?`).run(teeTimeId, registrationId);
  }
  clearRegistrationGroupData(registrationId) {
    this.db.prepare(`UPDATE tour_competition_registrations
         SET tee_time_id = NULL, participant_id = NULL, group_created_by = NULL, status = 'registered'
         WHERE id = ?`).run(registrationId);
  }
  validateCompetitionOpen(competition) {
    const now = new Date;
    if (competition.open_start && new Date(competition.open_start) > now) {
      throw new Error("Competition has not opened yet");
    }
    if (competition.open_end && new Date(competition.open_end) < now) {
      throw new Error("Competition has closed");
    }
  }
  validateNotPlayingOrFinished(status, action = "modify") {
    if (status === "playing" || status === "finished") {
      throw new Error(`Cannot ${action} after starting to play`);
    }
  }
  validateCanStartPlaying(status) {
    if (status !== "registered" && status !== "looking_for_group") {
      throw new Error("Invalid status for starting play");
    }
  }
  validateCanFinishPlaying(status) {
    if (status !== "playing") {
      throw new Error("Must be playing to finish");
    }
  }
  hasRecordedScores(participantId) {
    const participant = this.db.prepare("SELECT score FROM participants WHERE id = ?").get(participantId);
    if (!participant)
      return false;
    const scores = this.parseScoreArray(participant.score);
    const holesPlayed = this.calculateHolesPlayed(scores);
    return holesPlayed > 0;
  }
  determineInitialStatus(mode) {
    return mode === "looking_for_group" ? "looking_for_group" : "registered";
  }
  determineGroupCreatedBy(mode, playerId) {
    return mode === "create_group" ? playerId : null;
  }
  mapToAvailableStatus(status, hasTeeTime) {
    if (!status)
      return "available";
    switch (status) {
      case "looking_for_group":
        return "looking_for_group";
      case "registered":
        return hasTeeTime ? "in_group" : "available";
      case "playing":
        return "playing";
      case "finished":
        return "finished";
      case "withdrawn":
        return "available";
      default:
        return "available";
    }
  }
  parseScoreArray(scoreJson) {
    if (!scoreJson)
      return [];
    return safeParseJsonWithDefault(scoreJson, []);
  }
  calculateHolesPlayed(scores) {
    return scores.filter((s) => s > 0).length;
  }
  calculateRelativeToPar(scores, pars) {
    let relativeToPar = 0;
    for (let i = 0;i < scores.length; i++) {
      if (scores[i] > 0 && pars[i]) {
        relativeToPar += scores[i] - pars[i];
      }
    }
    return relativeToPar;
  }
  formatScoreDisplay(relativeToPar) {
    if (relativeToPar === 0)
      return "E";
    return relativeToPar > 0 ? `+${relativeToPar}` : `${relativeToPar}`;
  }
  formatScoreDisplayWithDash(relativeToPar, holesPlayed) {
    if (holesPlayed === 0)
      return "-";
    return this.formatScoreDisplay(relativeToPar);
  }
  isRoundExpired(openUntil) {
    if (!openUntil)
      return false;
    return new Date(openUntil) < new Date;
  }
  isRoundFinished(registrationStatus, holesPlayed) {
    return registrationStatus === "finished" || holesPlayed === GOLF.HOLES_PER_ROUND;
  }
  buildPlayingGroup(teeTimeId, members, currentPlayerId) {
    return {
      tee_time_id: teeTimeId,
      players: members.map((m) => ({
        player_id: m.player_id,
        name: m.name,
        handicap: m.handicap ?? undefined,
        is_you: m.player_id === currentPlayerId
      })),
      max_players: MAX_GROUP_SIZE
    };
  }
  groupParticipantsByTeeTime(participants) {
    const groupMap = new Map;
    for (const p of participants) {
      if (!groupMap.has(p.tee_time_id)) {
        groupMap.set(p.tee_time_id, []);
      }
      groupMap.get(p.tee_time_id).push(p);
    }
    return groupMap;
  }
  determineMemberStatus(member, holesPlayed) {
    let status = "registered";
    let isPlaying = false;
    let isFinished = true;
    if (member.is_locked) {
      status = "finished";
    } else if (member.registration_status === "playing" || holesPlayed > 0) {
      status = "playing";
      isPlaying = true;
      isFinished = false;
    } else if (member.registration_status === "finished") {
      status = "finished";
    } else {
      isFinished = false;
    }
    return { status, isPlaying, isFinished };
  }
  determineGroupStatus(hasPlaying, allFinished, allLocked) {
    if (allFinished && allLocked) {
      return "finished";
    } else if (hasPlaying) {
      return "on_course";
    }
    return "registered";
  }
  sortGroupsByStatus(groups) {
    const statusOrder = {
      on_course: 0,
      registered: 1,
      finished: 2
    };
    return groups.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }
  getTourTeamName(tourId) {
    return `Tour ${tourId} Players`;
  }
  async register(competitionId, playerId, mode) {
    const competition = this.findCompetitionWithTour(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }
    if (!competition.tour_id) {
      throw new Error("Competition is not part of a tour");
    }
    if (competition.start_mode !== "open") {
      throw new Error("Competition is not in open-start mode");
    }
    this.validateCompetitionOpen(competition);
    const player = this.findPlayerById(playerId);
    if (!player) {
      throw new Error("Player not found");
    }
    const enrollment = this.findActiveEnrollment(competition.tour_id, playerId);
    if (!enrollment) {
      throw new Error("Player is not enrolled in this tour");
    }
    const existing = await this.getRegistration(competitionId, playerId);
    if (existing) {
      throw new Error("Player is already registered for this competition");
    }
    const status = this.determineInitialStatus(mode);
    const groupCreatedBy = this.determineGroupCreatedBy(mode, playerId);
    let teeTimeId = null;
    let participantId = null;
    if (mode !== "looking_for_group") {
      const teamId = await this.getOrCreateTourTeam(competition.tour_id);
      const teeTime = this.insertTeeTimeRow(competitionId);
      const participant = this.insertParticipantRow(teamId, teeTime.id, playerId, player.name);
      teeTimeId = teeTime.id;
      participantId = participant.id;
    }
    const registration = this.insertRegistrationRow(competitionId, playerId, enrollment.id, teeTimeId, participantId, status, groupCreatedBy);
    const response = { registration };
    if (teeTimeId) {
      response.group = await this.getGroupByTeeTime(teeTimeId, playerId);
    }
    return response;
  }
  async withdraw(competitionId, playerId) {
    const registration = await this.getRegistration(competitionId, playerId);
    if (!registration) {
      throw new Error("Registration not found");
    }
    if (registration.status === "playing" || registration.status === "finished") {
      throw new Error("Cannot withdraw after starting to play");
    }
    if (registration.participant_id) {
      this.deleteParticipantRow(registration.participant_id);
    }
    if (registration.tee_time_id) {
      const remainingCount = this.findParticipantCountByTeeTime(registration.tee_time_id);
      if (remainingCount === 0) {
        this.deleteTeeTimeRow(registration.tee_time_id);
      }
    }
    this.deleteRegistrationRow(registration.id);
  }
  async getRegistration(competitionId, playerId) {
    return this.findRegistrationRow(competitionId, playerId);
  }
  async getRegistrationsForCompetition(competitionId) {
    return this.findRegistrationsByCompetition(competitionId);
  }
  async getAvailablePlayers(competitionId) {
    const tourId = this.findCompetitionTourId(competitionId);
    if (!tourId) {
      throw new Error("Competition not found or not part of a tour");
    }
    const players = this.findAvailablePlayersForCompetition(competitionId, tourId);
    return players.map((p) => ({
      player_id: p.player_id,
      name: p.name,
      handicap: p.handicap ?? undefined,
      status: this.mapToAvailableStatus(p.registration_status, p.group_tee_time_id !== null),
      group_tee_time_id: p.group_tee_time_id ?? undefined
    }));
  }
  async addToGroup(competitionId, groupCreatorPlayerId, playerIdsToAdd) {
    const creatorReg = await this.getRegistration(competitionId, groupCreatorPlayerId);
    if (!creatorReg || !creatorReg.tee_time_id) {
      throw new Error("You must be registered first");
    }
    if (creatorReg.participant_id && this.hasRecordedScores(creatorReg.participant_id)) {
      throw new Error("Cannot modify group after recording scores");
    }
    const currentMembers = await this.getGroupMemberCount(creatorReg.tee_time_id);
    if (currentMembers + playerIdsToAdd.length > MAX_GROUP_SIZE) {
      throw new Error(`Cannot add ${playerIdsToAdd.length} players. Group would exceed ${MAX_GROUP_SIZE} players.`);
    }
    const tourId = this.findCompetitionTourId(competitionId);
    if (!tourId) {
      throw new Error("Competition not found");
    }
    const teamId = await this.getOrCreateTourTeam(tourId);
    for (const playerId of playerIdsToAdd) {
      await this.addPlayerToGroup(competitionId, playerId, creatorReg.tee_time_id, teamId, groupCreatorPlayerId);
    }
    return this.getGroupByTeeTime(creatorReg.tee_time_id, groupCreatorPlayerId);
  }
  async removeFromGroup(competitionId, groupCreatorPlayerId, playerIdToRemove) {
    const creatorReg = await this.getRegistration(competitionId, groupCreatorPlayerId);
    if (!creatorReg || !creatorReg.tee_time_id) {
      throw new Error("You must be registered first");
    }
    const targetReg = await this.getRegistration(competitionId, playerIdToRemove);
    if (!targetReg || targetReg.tee_time_id !== creatorReg.tee_time_id) {
      throw new Error("Player is not in your group");
    }
    if (targetReg.participant_id && this.hasRecordedScores(targetReg.participant_id)) {
      throw new Error("Cannot remove player who has already recorded scores");
    }
    if (playerIdToRemove === groupCreatorPlayerId) {
      throw new Error("Use leaveGroup to remove yourself");
    }
    if (targetReg.participant_id) {
      this.deleteParticipantRow(targetReg.participant_id);
    }
    this.clearRegistrationGroupData(targetReg.id);
    const remainingCount = this.findParticipantCountByTeeTime(creatorReg.tee_time_id);
    if (remainingCount === 0) {
      this.deleteTeeTimeRow(creatorReg.tee_time_id);
    }
    return this.getGroupByTeeTime(creatorReg.tee_time_id, groupCreatorPlayerId);
  }
  async leaveGroup(competitionId, playerId) {
    const registration = await this.getRegistration(competitionId, playerId);
    if (!registration) {
      throw new Error("Registration not found");
    }
    if (registration.participant_id && this.hasRecordedScores(registration.participant_id)) {
      throw new Error("Cannot leave group after recording scores");
    }
    const oldTeeTimeId = registration.tee_time_id;
    if (registration.participant_id) {
      this.deleteParticipantRow(registration.participant_id);
    }
    this.clearRegistrationGroupData(registration.id);
    if (oldTeeTimeId) {
      const remainingCount = this.findParticipantCountByTeeTime(oldTeeTimeId);
      if (remainingCount === 0) {
        this.deleteTeeTimeRow(oldTeeTimeId);
      }
    }
  }
  async getGroupByTeeTime(teeTimeId, currentPlayerId) {
    const members = this.findGroupMembersByTeeTime(teeTimeId);
    return this.buildPlayingGroup(teeTimeId, members, currentPlayerId);
  }
  async getGroupMemberCount(teeTimeId) {
    return this.findRegistrationCountByTeeTime(teeTimeId);
  }
  async startPlaying(competitionId, playerId) {
    const registration = await this.getRegistration(competitionId, playerId);
    if (!registration) {
      throw new Error("Registration not found");
    }
    this.validateCanStartPlaying(registration.status);
    let teeTimeId = registration.tee_time_id;
    if (!teeTimeId) {
      const tourId = this.findCompetitionTourId(competitionId);
      if (!tourId) {
        throw new Error("Competition not found");
      }
      const player = this.findPlayerById(playerId);
      if (!player) {
        throw new Error("Player not found");
      }
      const teamId = await this.getOrCreateTourTeam(tourId);
      const teeTime = this.insertTeeTimeRow(competitionId);
      const participant = this.insertParticipantRow(teamId, teeTime.id, playerId, player.name);
      teeTimeId = teeTime.id;
      this.db.prepare(`UPDATE tour_competition_registrations
           SET tee_time_id = ?, participant_id = ?
           WHERE id = ?`).run(teeTimeId, participant.id, registration.id);
    }
    this.updateRegistrationStartedRow(registration.id);
    return { tee_time_id: teeTimeId };
  }
  async finishPlaying(competitionId, playerId) {
    const registration = await this.getRegistration(competitionId, playerId);
    if (!registration) {
      throw new Error("Registration not found");
    }
    this.validateCanFinishPlaying(registration.status);
    this.updateRegistrationFinishedRow(registration.id);
  }
  async getActiveRounds(playerId) {
    const rounds = this.findActiveRoundsForPlayer(playerId);
    const activeRounds = [];
    for (const round of rounds) {
      const scores = this.parseScoreArray(round.score);
      const holesPlayed = this.calculateHolesPlayed(scores);
      const isExpired = this.isRoundExpired(round.open_until);
      const isFinished = this.isRoundFinished(round.registration_status, holesPlayed);
      if (isExpired && !isFinished) {
        continue;
      }
      const groupMembers = this.findGroupMembersExcludingPlayer(round.tee_time_id, playerId);
      const parsJson = this.findCoursePars(round.competition_id);
      const pars = this.parseScoreArray(parsJson);
      const relativeToPar = this.calculateRelativeToPar(scores, pars);
      const currentScore = this.formatScoreDisplay(relativeToPar);
      const status = round.registration_status === "finished" ? "finished" : "playing";
      activeRounds.push({
        tour_id: round.tour_id,
        tour_name: round.tour_name,
        competition_id: round.competition_id,
        competition_name: round.competition_name,
        course_name: round.course_name,
        tee_time_id: round.tee_time_id,
        participant_id: round.participant_id,
        holes_played: holesPlayed,
        current_score: currentScore,
        group: groupMembers.map((m) => ({
          name: m.name,
          handicap: m.handicap ?? undefined
        })),
        open_until: round.open_until ?? undefined,
        status
      });
    }
    return activeRounds;
  }
  async getCompetitionGroups(competitionId) {
    const parsJson = this.findCoursePars(competitionId);
    if (!parsJson) {
      throw new Error("Competition not found");
    }
    const pars = this.parseScoreArray(parsJson);
    const participants = this.findCompetitionGroupParticipants(competitionId);
    const groupMap = this.groupParticipantsByTeeTime(participants);
    const groups = [];
    for (const [teeTimeId, members] of groupMap) {
      let hasPlaying = false;
      let allFinished = true;
      let earliestStarted;
      let latestFinished;
      const groupMembers = members.map((m) => {
        const scores = this.parseScoreArray(m.score);
        const holesPlayed = this.calculateHolesPlayed(scores);
        const relativeToPar = this.calculateRelativeToPar(scores, pars);
        const currentScore = this.formatScoreDisplayWithDash(relativeToPar, holesPlayed);
        const memberInfo = this.determineMemberStatus(m, holesPlayed);
        if (memberInfo.isPlaying)
          hasPlaying = true;
        if (!memberInfo.isFinished)
          allFinished = false;
        if (m.started_at && (!earliestStarted || m.started_at < earliestStarted)) {
          earliestStarted = m.started_at;
        }
        if (m.finished_at && (!latestFinished || m.finished_at > latestFinished)) {
          latestFinished = m.finished_at;
        }
        return {
          player_id: m.player_id ?? m.participant_id,
          participant_id: m.participant_id,
          name: m.player_name || m.team_name || "",
          handicap: m.handicap ?? undefined,
          category_name: m.category_name ?? undefined,
          registration_status: memberInfo.status,
          holes_played: holesPlayed,
          current_score: currentScore,
          score: scores,
          is_dq: Boolean(m.is_dq)
        };
      });
      const allLocked = members.length > 0 && members.every((m) => m.is_locked);
      const groupStatus = this.determineGroupStatus(hasPlaying, allFinished, allLocked);
      groups.push({
        tee_time_id: teeTimeId,
        status: groupStatus,
        members: groupMembers,
        started_at: earliestStarted,
        finished_at: latestFinished
      });
    }
    return this.sortGroupsByStatus(groups);
  }
  async getOrCreateTourTeam(tourId) {
    const teamName = this.getTourTeamName(tourId);
    let team = this.findTeamByName(teamName);
    if (!team) {
      team = this.insertTeamRow(teamName);
    }
    return team.id;
  }
  async addPlayerToGroup(competitionId, playerId, targetTeeTimeId, teamId, groupCreatedBy) {
    const tourId = this.findCompetitionTourId(competitionId);
    if (!tourId) {
      throw new Error("Competition not found");
    }
    const enrollment = this.findActiveEnrollment(tourId, playerId);
    if (!enrollment) {
      throw new Error(`Player ${playerId} is not enrolled in this tour`);
    }
    const playerName = this.findPlayerName(playerId);
    if (!playerName) {
      throw new Error(`Player ${playerId} not found`);
    }
    const existingReg = await this.getRegistration(competitionId, playerId);
    if (existingReg) {
      if (existingReg.participant_id && this.hasRecordedScores(existingReg.participant_id)) {
        throw new Error(`Player ${playerName} has already recorded scores`);
      }
      if (existingReg.tee_time_id === targetTeeTimeId) {
        throw new Error(`Player ${playerName} is already in this group`);
      }
      const nextOrder = this.findMaxTeeOrderForTeeTime(targetTeeTimeId) + 1;
      let participantId;
      if (existingReg.participant_id) {
        this.updateParticipantTeeTime(existingReg.participant_id, targetTeeTimeId, nextOrder);
        participantId = existingReg.participant_id;
        if (existingReg.tee_time_id) {
          const remaining = this.findParticipantCountByTeeTime(existingReg.tee_time_id);
          if (remaining === 0) {
            this.deleteTeeTimeRow(existingReg.tee_time_id);
          }
        }
      } else {
        const participant = this.insertParticipantRow(teamId, targetTeeTimeId, playerId, playerName, nextOrder);
        participantId = participant.id;
      }
      this.updateRegistrationTeeTime(existingReg.id, targetTeeTimeId, groupCreatedBy);
      if (!existingReg.participant_id) {
        this.db.prepare(`UPDATE tour_competition_registrations
             SET participant_id = ?
             WHERE id = ?`).run(participantId, existingReg.id);
      }
    } else {
      const nextOrder = this.findMaxTeeOrderForTeeTime(targetTeeTimeId) + 1;
      const participant = this.insertParticipantRow(teamId, targetTeeTimeId, playerId, playerName, nextOrder);
      this.insertRegistrationRow(competitionId, playerId, enrollment.id, targetTeeTimeId, participant.id, "registered", groupCreatedBy);
    }
  }
  async movePlayerToSoloGroup(competitionId, playerId) {
    const registration = await this.getRegistration(competitionId, playerId);
    if (!registration || !registration.tee_time_id) {
      throw new Error("Registration not found");
    }
    const oldTeeTimeId = registration.tee_time_id;
    const newTeeTime = this.insertTeeTimeRow(competitionId);
    this.updateParticipantTeeTime(registration.participant_id, newTeeTime.id, 1);
    this.updateRegistrationTeeTimeOnly(registration.id, newTeeTime.id);
    const remaining = this.findParticipantCountByTeeTime(oldTeeTimeId);
    if (remaining === 0) {
      this.deleteTeeTimeRow(oldTeeTimeId);
    }
  }
}
function createTourCompetitionRegistrationService(db) {
  return new TourCompetitionRegistrationService(db);
}

// src/services/tour.service.ts
class TourService {
  db;
  constructor(db) {
    this.db = db;
  }
  validateScoringMode(mode) {
    const validScoringModes = ["gross", "net", "both"];
    if (!validScoringModes.includes(mode)) {
      throw new Error("Invalid scoring mode. Must be 'gross', 'net', or 'both'");
    }
  }
  validatePointTemplateExists(templateId) {
    const exists = this.findPointTemplateExists(templateId);
    if (!exists) {
      throw new Error("Point template not found");
    }
  }
  validateLandingDocument(documentId, tourId) {
    const document = this.findDocumentRow(documentId);
    if (!document) {
      throw new Error("Landing document not found");
    }
    if (document.tour_id !== tourId) {
      throw new Error("Landing document must belong to the same tour");
    }
  }
  findPointTemplateExists(id) {
    const row = this.db.prepare("SELECT id FROM point_templates WHERE id = ?").get(id);
    return row !== null;
  }
  findDocumentRow(id) {
    return this.db.prepare("SELECT id, tour_id FROM tour_documents WHERE id = ?").get(id);
  }
  findCategoriesByTour(tourId) {
    return this.db.prepare("SELECT * FROM tour_categories WHERE tour_id = ? ORDER BY sort_order ASC, name ASC").all(tourId);
  }
  findPointTemplateRow(id) {
    return this.db.prepare("SELECT id, name, points_structure FROM point_templates WHERE id = ?").get(id);
  }
  findEnrollmentCount(tourId, categoryId) {
    let query = "SELECT COUNT(*) as count FROM tour_enrollments WHERE tour_id = ? AND status = 'active'";
    const params = [tourId];
    if (categoryId !== undefined) {
      query += " AND category_id = ?";
      params.push(categoryId);
    }
    const result = this.db.prepare(query).get(...params);
    return result.count;
  }
  findEnrollmentRows(tourId) {
    return this.db.prepare(`
        SELECT te.player_id, te.category_id, tc.name as category_name,
               COALESCE(te.playing_handicap, p.handicap) as handicap,
               COALESCE(pp.display_name, p.name) as player_name
        FROM tour_enrollments te
        LEFT JOIN tour_categories tc ON te.category_id = tc.id
        LEFT JOIN players p ON te.player_id = p.id
        LEFT JOIN player_profiles pp ON p.id = pp.player_id
        WHERE te.tour_id = ? AND te.status = 'active' AND te.player_id IS NOT NULL
      `).all(tourId);
  }
  findFinalizedCompetitionIds(tourId) {
    const rows = this.db.prepare("SELECT id FROM competitions WHERE tour_id = ? AND is_results_final = 1").all(tourId);
    return new Set(rows.map((c) => c.id));
  }
  findStoredResultRows(tourId, scoringType) {
    return this.db.prepare(`
        SELECT
          cr.player_id,
          cr.competition_id,
          cr.position,
          cr.points,
          cr.relative_to_par,
          c.name as competition_name,
          c.date as competition_date,
          COALESCE(pp.display_name, pl.name) as player_name
        FROM competition_results cr
        JOIN competitions c ON cr.competition_id = c.id
        JOIN players pl ON cr.player_id = pl.id
        LEFT JOIN player_profiles pp ON pl.id = pp.player_id
        WHERE c.tour_id = ?
          AND cr.scoring_type = ?
          AND c.is_results_final = 1
        ORDER BY c.date ASC
      `).all(tourId, scoringType);
  }
  findCompetitionStartInfo(competitionId) {
    return this.db.prepare("SELECT start_mode, open_end FROM competitions WHERE id = ?").get(competitionId);
  }
  findParticipantRowsForCompetition(competitionId) {
    return this.db.prepare(`
        SELECT
          p.id,
          p.player_id,
          p.score,
          p.is_locked,
          p.is_dq,
          p.manual_score_total,
          COALESCE(pp.display_name, pl.name) as player_name,
          c.id as competition_id,
          c.name as competition_name,
          c.date as competition_date
        FROM participants p
        JOIN players pl ON p.player_id = pl.id
        LEFT JOIN player_profiles pp ON pl.id = pp.player_id
        JOIN tee_times t ON p.tee_time_id = t.id
        JOIN competitions c ON t.competition_id = c.id
        WHERE t.competition_id = ? AND p.player_id IS NOT NULL
      `).all(competitionId);
  }
  insertTourRow(name, description, ownerId, bannerImageUrl, pointTemplateId, scoringMode) {
    return this.db.prepare(`
        INSERT INTO tours (name, description, owner_id, banner_image_url, point_template_id, scoring_mode)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING *
      `).get(name, description, ownerId, bannerImageUrl, pointTemplateId, scoringMode);
  }
  updateTourRow(id, updates, values) {
    return this.db.prepare(`
        UPDATE tours
        SET ${updates.join(", ")}
        WHERE id = ?
        RETURNING *
      `).get(...values, id);
  }
  isPastCompetition(competitionDate) {
    const compDate = new Date(competitionDate);
    const today = new Date;
    today.setHours(0, 0, 0, 0);
    compDate.setHours(0, 0, 0, 0);
    return compDate < today;
  }
  buildEnrollmentMaps(enrollments) {
    const playerCategories = new Map;
    const playerHandicaps = new Map;
    const playerNames = new Map;
    for (const enrollment of enrollments) {
      playerCategories.set(enrollment.player_id, {
        category_id: enrollment.category_id,
        category_name: enrollment.category_name
      });
      if (enrollment.handicap !== null) {
        playerHandicaps.set(enrollment.player_id, enrollment.handicap);
      }
      playerNames.set(enrollment.player_id, enrollment.player_name);
    }
    return { playerCategories, playerHandicaps, playerNames };
  }
  sortAndRankStandings(standings) {
    const sortedStandings = standings.sort((a, b) => {
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points;
      }
      if (b.competitions_played !== a.competitions_played) {
        return b.competitions_played - a.competitions_played;
      }
      return a.player_name.localeCompare(b.player_name);
    });
    let currentPosition = 1;
    let previousPoints = -1;
    let previousCompetitions = -1;
    sortedStandings.forEach((standing, index) => {
      if (standing.total_points !== previousPoints || standing.competitions_played !== previousCompetitions) {
        currentPosition = index + 1;
      }
      standing.position = currentPosition;
      previousPoints = standing.total_points;
      previousCompetitions = standing.competitions_played;
    });
    return sortedStandings;
  }
  initializePlayerStanding(playerId, playerName, playerCategory) {
    return {
      player_id: playerId,
      player_name: playerName,
      category_id: playerCategory?.category_id ?? undefined,
      category_name: playerCategory?.category_name ?? undefined,
      actual_points: 0,
      projected_points: 0,
      total_points: 0,
      competitions_played: 0,
      position: 0,
      competitions: []
    };
  }
  isCompetitionWindowClosed(startInfo) {
    return startInfo?.start_mode === "open" && startInfo.open_end !== null && new Date(startInfo.open_end) < new Date;
  }
  determineParticipantFinished(participant, isOpenCompetitionClosed) {
    if (participant.is_dq) {
      return { isFinished: false, totalShots: 0, relativeToPar: 0 };
    }
    if (participant.manual_score_total !== null && participant.manual_score_total !== undefined) {
      return {
        isFinished: true,
        totalShots: participant.manual_score_total,
        relativeToPar: 0
      };
    }
    const score = parseScoreArray(participant.score || "");
    const hasInvalidRound = score.includes(GOLF.UNREPORTED_HOLE);
    const holesPlayed = score.filter((s) => s > 0 || s === GOLF.UNREPORTED_HOLE).length;
    let isFinished;
    if (isOpenCompetitionClosed) {
      isFinished = holesPlayed === GOLF.HOLES_PER_ROUND && !hasInvalidRound;
    } else {
      isFinished = Boolean(participant.is_locked) && holesPlayed === GOLF.HOLES_PER_ROUND && !hasInvalidRound;
    }
    if (!isFinished) {
      return { isFinished: false, totalShots: 0, relativeToPar: 0 };
    }
    const totalShots = score.reduce((sum, s) => sum + (s > 0 ? s : 0), 0);
    return { isFinished: true, totalShots, relativeToPar: 0 };
  }
  calculateRelativeToPar(score, pars) {
    let relativeToPar = 0;
    for (let i = 0;i < score.length && i < pars.length; i++) {
      if (score[i] > 0) {
        relativeToPar += score[i] - pars[i];
      }
    }
    return relativeToPar;
  }
  buildUpdateFields(data) {
    const updates = [];
    const values = [];
    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      values.push(data.description);
    }
    if (data.banner_image_url !== undefined) {
      updates.push("banner_image_url = ?");
      values.push(data.banner_image_url);
    }
    if (data.landing_document_id !== undefined) {
      updates.push("landing_document_id = ?");
      values.push(data.landing_document_id);
    }
    if (data.point_template_id !== undefined) {
      updates.push("point_template_id = ?");
      values.push(data.point_template_id);
    }
    if (data.scoring_mode !== undefined) {
      updates.push("scoring_mode = ?");
      values.push(data.scoring_mode);
    }
    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
    }
    return { updates, values };
  }
  findAll() {
    return this.db.prepare("SELECT * FROM tours ORDER BY name ASC").all();
  }
  findForUser(userId) {
    return this.db.prepare(`
        SELECT DISTINCT t.*
        FROM tours t
        LEFT JOIN tour_admins ta ON t.id = ta.tour_id
        WHERE t.owner_id = ? OR ta.user_id = ?
        ORDER BY t.name ASC
      `).all(userId, userId);
  }
  findById(id) {
    return this.db.prepare("SELECT * FROM tours WHERE id = ?").get(id);
  }
  create(data, ownerId) {
    if (data.point_template_id) {
      this.validatePointTemplateExists(data.point_template_id);
    }
    const scoringMode = data.scoring_mode || "gross";
    this.validateScoringMode(scoringMode);
    return this.insertTourRow(data.name, data.description || null, ownerId, data.banner_image_url || null, data.point_template_id || null, scoringMode);
  }
  update(id, data) {
    const tour = this.findById(id);
    if (!tour) {
      throw new Error("Tour not found");
    }
    if (data.landing_document_id !== undefined && data.landing_document_id !== null) {
      this.validateLandingDocument(data.landing_document_id, id);
    }
    if (data.point_template_id !== undefined && data.point_template_id !== null) {
      this.validatePointTemplateExists(data.point_template_id);
    }
    if (data.scoring_mode !== undefined) {
      this.validateScoringMode(data.scoring_mode);
    }
    const { updates, values } = this.buildUpdateFields(data);
    if (updates.length === 0) {
      return tour;
    }
    return this.updateTourRow(id, updates, values);
  }
  delete(id) {
    const result = this.db.prepare("DELETE FROM tours WHERE id = ?").run(id);
    if (result.changes === 0) {
      throw new Error("Tour not found");
    }
  }
  getCompetitions(tourId) {
    return this.db.prepare(`
      SELECT c.*, co.name as course_name, co.pars,
             ct.slope_rating, ct.course_rating
      FROM competitions c
      JOIN courses co ON c.course_id = co.id
      LEFT JOIN course_tees ct ON c.tee_id = ct.id
      WHERE c.tour_id = ?
      ORDER BY c.date DESC
    `).all(tourId);
  }
  getFullStandings(tourId, categoryId, scoringType) {
    const tour = this.findById(tourId);
    if (!tour) {
      throw new Error("Tour not found");
    }
    const categories = this.findCategoriesByTour(tourId);
    if (categoryId !== undefined) {
      const categoryExists = categories.some((c) => c.id === categoryId);
      if (!categoryExists) {
        throw new Error("Category not found");
      }
    }
    const competitions = this.getCompetitions(tourId);
    if (competitions.length === 0) {
      return this.buildEmptyStandingsResponse(tour, categories, categoryId);
    }
    const pointTemplate = tour.point_template_id ? this.findPointTemplateRow(tour.point_template_id) : null;
    const numberOfPlayers = this.findEnrollmentCount(tourId, categoryId);
    const enrollmentRows = this.findEnrollmentRows(tourId);
    const { playerCategories, playerHandicaps } = this.buildEnrollmentMaps(enrollmentRows);
    const effectiveScoringType = scoringType || (tour.scoring_mode === "net" ? "net" : "gross");
    const playerStandings = new Map;
    const finalizedCompetitionIds = this.findFinalizedCompetitionIds(tourId);
    this.processStoredResults(tourId, effectiveScoringType, categoryId, playerCategories, playerStandings);
    const hasProjectedResults = this.processLiveCompetitions(competitions, finalizedCompetitionIds, categoryId, effectiveScoringType, playerCategories, playerHandicaps, numberOfPlayers, pointTemplate, playerStandings);
    const sortedStandings = this.sortAndRankStandings(Array.from(playerStandings.values()));
    return {
      tour,
      player_standings: sortedStandings,
      total_competitions: competitions.length,
      scoring_mode: tour.scoring_mode || "gross",
      selected_scoring_type: effectiveScoringType,
      point_template: pointTemplate ? { id: pointTemplate.id, name: pointTemplate.name } : undefined,
      categories,
      selected_category_id: categoryId,
      has_projected_results: hasProjectedResults
    };
  }
  buildEmptyStandingsResponse(tour, categories, categoryId) {
    return {
      tour,
      player_standings: [],
      total_competitions: 0,
      scoring_mode: tour.scoring_mode || "gross",
      point_template: undefined,
      categories,
      selected_category_id: categoryId
    };
  }
  processStoredResults(tourId, scoringType, categoryId, playerCategories, playerStandings) {
    const storedResults = this.findStoredResultRows(tourId, scoringType);
    for (const result of storedResults) {
      const playerCategory = playerCategories.get(result.player_id);
      if (categoryId !== undefined) {
        if (!playerCategory || playerCategory.category_id !== categoryId) {
          continue;
        }
      }
      if (!playerStandings.has(result.player_id)) {
        playerStandings.set(result.player_id, this.initializePlayerStanding(result.player_id, result.player_name, playerCategory));
      }
      const standing = playerStandings.get(result.player_id);
      standing.actual_points += result.points;
      standing.projected_points += result.points;
      standing.total_points += result.points;
      standing.competitions_played += 1;
      standing.competitions.push({
        competition_id: result.competition_id,
        competition_name: result.competition_name,
        competition_date: result.competition_date,
        points: result.points,
        position: result.position,
        score_relative_to_par: result.relative_to_par,
        is_projected: false
      });
    }
  }
  processLiveCompetitions(competitions, finalizedCompetitionIds, categoryId, scoringType, playerCategories, playerHandicaps, numberOfPlayers, pointTemplate, playerStandings) {
    let hasProjectedResults = false;
    for (const competition of competitions) {
      if (finalizedCompetitionIds.has(competition.id)) {
        continue;
      }
      const isPast = this.isPastCompetition(competition.date);
      const results = this.getCompetitionPlayerResults(competition.id, competition.pars);
      const hasFinishedPlayers = results.some((r) => r.is_finished);
      if (!isPast && !hasFinishedPlayers) {
        continue;
      }
      hasProjectedResults = true;
      const adjustedResults = this.adjustResultsForScoring(results.filter((r) => r.is_finished), scoringType, playerHandicaps, competition);
      const rankedResults = this.rankPlayersByScore(adjustedResults);
      for (const result of rankedResults) {
        const playerCategory = playerCategories.get(result.player_id);
        if (categoryId !== undefined) {
          if (!playerCategory || playerCategory.category_id !== categoryId) {
            continue;
          }
        }
        const points = this.calculatePlayerPoints(result.position, numberOfPlayers, pointTemplate);
        if (!playerStandings.has(result.player_id)) {
          playerStandings.set(result.player_id, this.initializePlayerStanding(result.player_id, result.player_name, playerCategory));
        }
        const standing = playerStandings.get(result.player_id);
        standing.projected_points += points;
        standing.total_points += points;
        standing.competitions_played += 1;
        standing.competitions.push({
          competition_id: competition.id,
          competition_name: competition.name,
          competition_date: competition.date,
          points,
          position: result.position,
          score_relative_to_par: result.relative_to_par,
          is_projected: true
        });
      }
    }
    return hasProjectedResults;
  }
  adjustResultsForScoring(results, scoringType, playerHandicaps, competition) {
    if (scoringType !== "net") {
      return results;
    }
    const slopeRating = competition.slope_rating || GOLF.STANDARD_SLOPE_RATING;
    const courseRating = competition.course_rating || GOLF.STANDARD_COURSE_RATING;
    const pars = parseParsArray(competition.pars);
    const totalPar = pars.reduce((sum, par) => sum + par, 0);
    return results.map((result) => {
      const handicapIndex = playerHandicaps.get(result.player_id) || 0;
      const courseHandicap = calculateCourseHandicap(handicapIndex, slopeRating, courseRating, totalPar);
      return {
        ...result,
        relative_to_par: result.relative_to_par - courseHandicap
      };
    });
  }
  getCompetitionPlayerResults(competitionId, coursePars) {
    const pars = parseParsArray(coursePars);
    const totalPar = pars.reduce((sum, par) => sum + par, 0);
    const startInfo = this.findCompetitionStartInfo(competitionId);
    const isOpenCompetitionClosed = this.isCompetitionWindowClosed(startInfo);
    const participants = this.findParticipantRowsForCompetition(competitionId);
    const results = participants.map((participant) => {
      const { isFinished, totalShots } = this.determineParticipantFinished(participant, isOpenCompetitionClosed);
      let relativeToPar = 0;
      if (isFinished) {
        if (participant.manual_score_total !== null && participant.manual_score_total !== undefined) {
          relativeToPar = totalShots - totalPar;
        } else {
          const score = parseScoreArray(participant.score || "");
          relativeToPar = this.calculateRelativeToPar(score, pars);
        }
      }
      return {
        competition_id: participant.competition_id,
        competition_name: participant.competition_name,
        competition_date: participant.competition_date,
        player_id: participant.player_id,
        player_name: participant.player_name,
        total_shots: totalShots,
        relative_to_par: relativeToPar,
        is_finished: isFinished
      };
    });
    return results.map((r) => ({ ...r, position: 0 }));
  }
  rankPlayersByScore(results) {
    const sorted = [...results].sort((a, b) => {
      if (a.relative_to_par !== b.relative_to_par) {
        return a.relative_to_par - b.relative_to_par;
      }
      return a.player_name.localeCompare(b.player_name);
    });
    let currentPosition = 1;
    let previousScore = Number.MIN_SAFE_INTEGER;
    return sorted.map((result, index) => {
      if (result.relative_to_par !== previousScore) {
        currentPosition = index + 1;
      }
      previousScore = result.relative_to_par;
      return { ...result, position: currentPosition };
    });
  }
  calculatePlayerPoints(position, numberOfPlayers, pointTemplate) {
    if (pointTemplate) {
      const structure = safeParseJson(pointTemplate.points_structure, "points_structure");
      if (structure[position.toString()]) {
        return structure[position.toString()];
      }
      return structure["default"] || 0;
    }
    if (position <= 0)
      return 0;
    let basePoints;
    if (position === 1) {
      basePoints = numberOfPlayers + 2;
    } else if (position === 2) {
      basePoints = numberOfPlayers;
    } else {
      basePoints = numberOfPlayers - (position - 1);
      basePoints = Math.max(0, basePoints);
    }
    return basePoints;
  }
  getStandings(tourId) {
    try {
      const fullStandings = this.getFullStandings(tourId);
      return fullStandings.player_standings.map((standing) => ({
        player_id: standing.player_id,
        player_name: standing.player_name,
        total_points: standing.total_points,
        competitions_played: standing.competitions_played
      }));
    } catch (error) {
      console.warn("Error fetching tour standings:", error);
      return [];
    }
  }
}
function createTourService(db) {
  return new TourService(db);
}

// src/api/tour-competition-registration.ts
var registerSchema = exports_external.object({
  mode: exports_external.enum(["solo", "looking_for_group", "create_group"])
});
var addToGroupSchema = exports_external.object({
  playerIds: exports_external.array(exports_external.number().positive()).min(1)
});
var removeFromGroupSchema = exports_external.object({
  playerId: exports_external.number().positive()
});
function createTourCompetitionRegistrationApi(registrationService, enrollmentService, playerService) {
  const app = new Hono2;
  function getPlayerIdForUser(userId) {
    const player = playerService.findByUserId(userId);
    return player?.id ?? null;
  }
  function isPlayerEnrolledInTour(competitionId, playerId) {
    return true;
  }
  app.post("/:id/register", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const competitionId = parseInt(c.req.param("id"));
      const playerId = getPlayerIdForUser(user.id);
      if (!playerId) {
        return c.json({ error: "No player profile found. Please create one first." }, 400);
      }
      const body = await c.req.json();
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: "Mode must be solo, looking_for_group, or create_group" }, 400);
      }
      const mode = parsed.data.mode;
      const result = await registrationService.register(competitionId, playerId, mode);
      return c.json(result, 201);
    } catch (error) {
      if (error.message === "Competition not found") {
        return c.json({ error: error.message }, 404);
      }
      if (error.message.includes("not enrolled") || error.message.includes("not part of a tour") || error.message.includes("already registered") || error.message.includes("not in open-start mode") || error.message.includes("not opened yet") || error.message.includes("has closed")) {
        return c.json({ error: error.message }, 400);
      }
      console.error("Registration error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });
  app.delete("/:id/register", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const competitionId = parseInt(c.req.param("id"));
      const playerId = getPlayerIdForUser(user.id);
      if (!playerId) {
        return c.json({ error: "No player profile found" }, 400);
      }
      await registrationService.withdraw(competitionId, playerId);
      return c.json({ success: true });
    } catch (error) {
      if (error.message === "Registration not found") {
        return c.json({ error: error.message }, 404);
      }
      if (error.message.includes("Cannot withdraw")) {
        return c.json({ error: error.message }, 400);
      }
      console.error("Withdraw error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });
  app.get("/:id/my-registration", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const competitionId = parseInt(c.req.param("id"));
      const playerId = getPlayerIdForUser(user.id);
      if (!playerId) {
        return c.json({ registered: false, registration: null });
      }
      const registration = await registrationService.getRegistration(competitionId, playerId);
      if (!registration) {
        return c.json({ registered: false, registration: null });
      }
      let group = null;
      if (registration.tee_time_id) {
        group = await registrationService.getGroupByTeeTime(registration.tee_time_id, playerId);
      }
      return c.json({
        registered: true,
        registration,
        group
      });
    } catch (error) {
      console.error("Get registration error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });
  app.get("/:id/available-players", requireAuth(), async (c) => {
    try {
      const competitionId = parseInt(c.req.param("id"));
      const players = await registrationService.getAvailablePlayers(competitionId);
      return c.json(players);
    } catch (error) {
      if (error.message.includes("not found") || error.message.includes("not part of a tour")) {
        return c.json({ error: error.message }, 404);
      }
      console.error("Available players error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });
  app.post("/:id/group/add", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const competitionId = parseInt(c.req.param("id"));
      const playerId = getPlayerIdForUser(user.id);
      if (!playerId) {
        return c.json({ error: "No player profile found" }, 400);
      }
      const body = await c.req.json();
      const parsed = addToGroupSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: "playerIds must be an array of player IDs" }, 400);
      }
      const group = await registrationService.addToGroup(competitionId, playerId, parsed.data.playerIds);
      return c.json(group);
    } catch (error) {
      if (error.message.includes("must be registered") || error.message.includes("Cannot modify group") || error.message.includes("exceed") || error.message.includes("not enrolled") || error.message.includes("already in this group") || error.message.includes("already started playing")) {
        return c.json({ error: error.message }, 400);
      }
      console.error("Add to group error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });
  app.post("/:id/group/remove", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const competitionId = parseInt(c.req.param("id"));
      const playerId = getPlayerIdForUser(user.id);
      if (!playerId) {
        return c.json({ error: "No player profile found" }, 400);
      }
      const body = await c.req.json();
      const parsed = removeFromGroupSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: "playerId is required" }, 400);
      }
      const group = await registrationService.removeFromGroup(competitionId, playerId, parsed.data.playerId);
      return c.json(group);
    } catch (error) {
      if (error.message.includes("must be registered") || error.message.includes("not in your group") || error.message.includes("Cannot remove") || error.message.includes("Use leaveGroup")) {
        return c.json({ error: error.message }, 400);
      }
      console.error("Remove from group error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });
  app.post("/:id/group/leave", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const competitionId = parseInt(c.req.param("id"));
      const playerId = getPlayerIdForUser(user.id);
      if (!playerId) {
        return c.json({ error: "No player profile found" }, 400);
      }
      await registrationService.leaveGroup(competitionId, playerId);
      return c.json({ message: "Successfully left group" });
    } catch (error) {
      if (error.message === "Registration not found" || error.message.includes("Cannot leave group")) {
        return c.json({ error: error.message }, 400);
      }
      console.error("Leave group error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });
  app.get("/:id/group", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const competitionId = parseInt(c.req.param("id"));
      const playerId = getPlayerIdForUser(user.id);
      if (!playerId) {
        return c.json({ error: "No player profile found" }, 400);
      }
      const registration = await registrationService.getRegistration(competitionId, playerId);
      if (!registration || !registration.tee_time_id) {
        return c.json({ error: "Not registered or no group" }, 404);
      }
      const group = await registrationService.getGroupByTeeTime(registration.tee_time_id, playerId);
      return c.json(group);
    } catch (error) {
      console.error("Get group error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });
  app.post("/:id/start-playing", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const competitionId = parseInt(c.req.param("id"));
      const playerId = getPlayerIdForUser(user.id);
      if (!playerId) {
        return c.json({ error: "No player profile found" }, 400);
      }
      const result = await registrationService.startPlaying(competitionId, playerId);
      return c.json({ success: true, tee_time_id: result.tee_time_id });
    } catch (error) {
      if (error.message === "Registration not found" || error.message.includes("Invalid status")) {
        return c.json({ error: error.message }, 400);
      }
      console.error("Start playing error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });
  app.get("/:id/registrations", requireAuth(), async (c) => {
    try {
      const competitionId = parseInt(c.req.param("id"));
      const registrations = await registrationService.getRegistrationsForCompetition(competitionId);
      return c.json(registrations);
    } catch (error) {
      console.error("Get registrations error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });
  app.get("/:id/groups", requireAuth(), async (c) => {
    try {
      const competitionId = parseInt(c.req.param("id"));
      const groups = await registrationService.getCompetitionGroups(competitionId);
      return c.json(groups);
    } catch (error) {
      if (error.message === "Competition not found") {
        return c.json({ error: error.message }, 404);
      }
      console.error("Get groups error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });
  return app;
}

// src/services/competition-results.service.ts
class CompetitionResultsService {
  db;
  constructor(db) {
    this.db = db;
  }
  findCompetitionDetails(competitionId) {
    return this.db.prepare(`
        SELECT c.*, co.pars, t.point_template_id, t.scoring_mode
        FROM competitions c
        LEFT JOIN courses co ON c.course_id = co.id
        LEFT JOIN tours t ON c.tour_id = t.id
        WHERE c.id = ?
      `).get(competitionId);
  }
  findPointTemplateRow(templateId) {
    return this.db.prepare("SELECT id, name, points_structure FROM point_templates WHERE id = ?").get(templateId);
  }
  findActiveEnrollmentCount(tourId) {
    const row = this.db.prepare("SELECT COUNT(*) as count FROM tour_enrollments WHERE tour_id = ? AND status = 'active'").get(tourId);
    return row.count;
  }
  findParticipantDataRows(competitionId) {
    return this.db.prepare(`
        SELECT
          p.id,
          p.player_id,
          p.score,
          p.is_locked,
          p.is_dq,
          p.manual_score_total,
          p.handicap_index,
          pl.name as player_name
        FROM participants p
        JOIN players pl ON p.player_id = pl.id
        JOIN tee_times tt ON p.tee_time_id = tt.id
        WHERE tt.competition_id = ? AND p.player_id IS NOT NULL
      `).all(competitionId);
  }
  deleteCompetitionResultRows(competitionId) {
    this.db.prepare("DELETE FROM competition_results WHERE competition_id = ?").run(competitionId);
  }
  insertCompetitionResultRow(competitionId, result, scoringType) {
    this.db.prepare(`
        INSERT INTO competition_results
          (competition_id, participant_id, player_id, position, points, gross_score, net_score, relative_to_par, scoring_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(competitionId, result.participant_id, result.player_id, result.position, result.points, result.gross_score, result.net_score, result.relative_to_par, scoringType);
  }
  updateCompetitionFinalizedRow(competitionId) {
    this.db.prepare(`
        UPDATE competitions
        SET is_results_final = 1, results_finalized_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(competitionId);
  }
  findCompetitionResultRows(competitionId, scoringType) {
    return this.db.prepare(`
        SELECT cr.*, pl.name as player_name
        FROM competition_results cr
        LEFT JOIN players pl ON cr.player_id = pl.id
        WHERE cr.competition_id = ? AND cr.scoring_type = ?
        ORDER BY cr.position ASC
      `).all(competitionId, scoringType);
  }
  findPlayerResultRows(playerId, scoringType) {
    return this.db.prepare(`
        SELECT
          cr.*,
          c.name as competition_name,
          c.date as competition_date,
          c.tour_id,
          t.name as tour_name
        FROM competition_results cr
        JOIN competitions c ON cr.competition_id = c.id
        LEFT JOIN tours t ON c.tour_id = t.id
        WHERE cr.player_id = ? AND cr.scoring_type = ?
        ORDER BY c.date DESC
      `).all(playerId, scoringType);
  }
  findCompetitionFinalizedRow(competitionId) {
    return this.db.prepare("SELECT is_results_final FROM competitions WHERE id = ?").get(competitionId);
  }
  findPlayerTourPointsRow(playerId, tourId, scoringType) {
    return this.db.prepare(`
        SELECT
          SUM(cr.points) as total_points,
          COUNT(DISTINCT cr.competition_id) as competitions_played
        FROM competition_results cr
        JOIN competitions c ON cr.competition_id = c.id
        WHERE cr.player_id = ?
          AND c.tour_id = ?
          AND cr.scoring_type = ?
          AND c.is_results_final = 1
      `).get(playerId, tourId, scoringType);
  }
  findTourStandingRows(tourId, scoringType) {
    return this.db.prepare(`
        SELECT
          cr.player_id,
          pl.name as player_name,
          SUM(cr.points) as total_points,
          COUNT(DISTINCT cr.competition_id) as competitions_played
        FROM competition_results cr
        JOIN competitions c ON cr.competition_id = c.id
        JOIN players pl ON cr.player_id = pl.id
        WHERE c.tour_id = ?
          AND cr.scoring_type = ?
          AND c.is_results_final = 1
        GROUP BY cr.player_id, pl.name
        ORDER BY total_points DESC, competitions_played DESC
      `).all(tourId, scoringType);
  }
  parseParsFromCompetition(competition) {
    if (!competition.pars) {
      return { pars: [], totalPar: GOLF.STANDARD_COURSE_RATING };
    }
    try {
      const pars = parseParsArray(competition.pars);
      if (pars.length > 0) {
        const totalPar = pars.reduce((sum, p) => sum + p, 0);
        return { pars, totalPar };
      }
      return { pars: [], totalPar: GOLF.STANDARD_COURSE_RATING };
    } catch {
      return { pars: [], totalPar: GOLF.STANDARD_COURSE_RATING };
    }
  }
  isOpenCompetitionClosed(competition) {
    return competition.start_mode === "open" && competition.open_end !== null && new Date(competition.open_end) < new Date;
  }
  parseParticipantScore(score) {
    try {
      if (typeof score === "string") {
        return JSON.parse(score);
      }
      return Array.isArray(score) ? score : [];
    } catch {
      return [];
    }
  }
  hasInvalidHole(score) {
    return score.includes(GOLF.UNREPORTED_HOLE);
  }
  calculateHolesPlayed(score) {
    return score.filter((s) => s > 0 || s === GOLF.UNREPORTED_HOLE).length;
  }
  calculateGrossScore(score) {
    return score.reduce((sum, s) => sum + (s > 0 ? s : 0), 0);
  }
  calculateRelativeToParFromScore(score, pars) {
    let relativeToPar = 0;
    for (let i = 0;i < score.length && i < pars.length; i++) {
      if (score[i] > 0) {
        relativeToPar += score[i] - pars[i];
      }
    }
    return relativeToPar;
  }
  calculateNetScore(grossScore, handicapIndex) {
    if (handicapIndex === null) {
      return null;
    }
    return grossScore - Math.round(handicapIndex);
  }
  isParticipantFinished(participant, score, isOpenCompetitionClosed) {
    if (participant.is_dq) {
      return false;
    }
    if (participant.manual_score_total !== null && participant.manual_score_total !== undefined) {
      return true;
    }
    const hasInvalidRound = this.hasInvalidHole(score);
    const holesPlayed = this.calculateHolesPlayed(score);
    if (isOpenCompetitionClosed) {
      return holesPlayed === GOLF.HOLES_PER_ROUND && !hasInvalidRound;
    }
    return participant.is_locked === 1 && holesPlayed === GOLF.HOLES_PER_ROUND && !hasInvalidRound;
  }
  buildParticipantResult(participant, pars, totalPar, isOpenCompetitionClosed) {
    const score = this.parseParticipantScore(participant.score);
    const isFinished = this.isParticipantFinished(participant, score, isOpenCompetitionClosed);
    let grossScore = 0;
    let relativeToPar = 0;
    let netScore = null;
    if (isFinished) {
      if (participant.manual_score_total !== null && participant.manual_score_total !== undefined) {
        grossScore = participant.manual_score_total;
        relativeToPar = grossScore - totalPar;
      } else {
        grossScore = this.calculateGrossScore(score);
        relativeToPar = this.calculateRelativeToParFromScore(score, pars);
      }
      netScore = this.calculateNetScore(grossScore, participant.handicap_index);
    }
    return {
      participant_id: participant.id,
      player_id: participant.player_id,
      player_name: participant.player_name,
      gross_score: grossScore,
      net_score: netScore,
      relative_to_par: relativeToPar,
      is_finished: isFinished,
      position: 0,
      points: 0
    };
  }
  sortResultsByScore(results) {
    return [...results].sort((a, b) => {
      if (a.relative_to_par !== b.relative_to_par) {
        return a.relative_to_par - b.relative_to_par;
      }
      return a.player_name.localeCompare(b.player_name);
    });
  }
  sortResultsByNetScore(results, totalPar) {
    return [...results].filter((r) => r.net_score !== null).sort((a, b) => {
      const aNetRelative = a.net_score - totalPar;
      const bNetRelative = b.net_score - totalPar;
      if (aNetRelative !== bNetRelative) {
        return aNetRelative - bNetRelative;
      }
      return a.player_name.localeCompare(b.player_name);
    });
  }
  assignNetPositionsAndPoints(sortedResults, numberOfPlayers, pointTemplate, pointsMultiplier, totalPar) {
    const resultsWithNetRelative = sortedResults.map((r) => ({
      ...r,
      netRelative: r.net_score - totalPar
    }));
    const groups = this.groupResultsByScore(resultsWithNetRelative, (r) => r.netRelative);
    return this.assignAveragedPointsToGroups(groups, numberOfPlayers, pointTemplate, pointsMultiplier, (r, position, points) => ({
      ...r,
      position,
      points,
      relative_to_par: r.netRelative
    }));
  }
  assignPositionsAndPoints(sortedResults, numberOfPlayers, pointTemplate, pointsMultiplier) {
    const groups = this.groupResultsByScore(sortedResults, (r) => r.relative_to_par);
    return this.assignAveragedPointsToGroups(groups, numberOfPlayers, pointTemplate, pointsMultiplier, (r, position, points) => ({
      ...r,
      position,
      points
    }));
  }
  groupResultsByScore(sortedResults, getScore) {
    const groups = [];
    let currentGroup = [];
    let previousScore = Number.MIN_SAFE_INTEGER;
    for (const result of sortedResults) {
      const score = getScore(result);
      if (score !== previousScore && currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(result);
      previousScore = score;
    }
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    return groups;
  }
  assignAveragedPointsToGroups(groups, numberOfPlayers, pointTemplate, pointsMultiplier, mapResult) {
    const results = [];
    let currentPosition = 1;
    for (const group of groups) {
      const tiedCount = group.length;
      let totalPoints = 0;
      for (let i = 0;i < tiedCount; i++) {
        totalPoints += this.calculatePointsForPosition(currentPosition + i, numberOfPlayers, pointTemplate);
      }
      const averagedPoints = totalPoints / tiedCount * pointsMultiplier;
      for (const result of group) {
        results.push(mapResult(result, currentPosition, Math.round(averagedPoints)));
      }
      currentPosition += tiedCount;
    }
    return results;
  }
  calculatePointsForPosition(position, numberOfPlayers, pointTemplate) {
    if (pointTemplate) {
      try {
        const structure = safeParseJson(pointTemplate.points_structure, "points_structure");
        if (structure[position.toString()]) {
          return structure[position.toString()];
        }
        return structure["default"] || 0;
      } catch {
        return 0;
      }
    }
    return calculateDefaultPoints(position, numberOfPlayers);
  }
  assignStandingPositions(standings) {
    let currentPosition = 1;
    let previousPoints = Number.MAX_SAFE_INTEGER;
    return standings.map((standing, index) => {
      if (standing.total_points !== previousPoints) {
        currentPosition = index + 1;
      }
      previousPoints = standing.total_points;
      return { ...standing, position: currentPosition };
    });
  }
  finalizeCompetitionResults(competitionId) {
    const competition = this.findCompetitionDetails(competitionId);
    if (!competition) {
      throw new Error("Competition not found");
    }
    const { pars, totalPar } = this.parseParsFromCompetition(competition);
    const pointTemplate = competition.point_template_id ? this.findPointTemplateRow(competition.point_template_id) : null;
    const numberOfPlayers = competition.tour_id ? this.findActiveEnrollmentCount(competition.tour_id) : 0;
    const isOpenCompetitionClosed = this.isOpenCompetitionClosed(competition);
    const participants = this.findParticipantDataRows(competitionId);
    const results = participants.map((p) => this.buildParticipantResult(p, pars, totalPar, isOpenCompetitionClosed));
    const finishedResults = results.filter((r) => r.is_finished);
    const sortedResults = this.sortResultsByScore(finishedResults);
    const effectivePlayerCount = numberOfPlayers || finishedResults.length;
    const rankedResults = this.assignPositionsAndPoints(sortedResults, effectivePlayerCount, pointTemplate, competition.points_multiplier || 1);
    const unfinishedResults = results.filter((r) => !r.is_finished).map((r) => ({ ...r, position: 0, points: 0 }));
    const allResults = [...rankedResults, ...unfinishedResults];
    this.deleteCompetitionResultRows(competitionId);
    for (const result of allResults) {
      if (result.is_finished) {
        this.insertCompetitionResultRow(competitionId, result, "gross");
      }
    }
    const scoringMode = competition.scoring_mode || "gross";
    if (scoringMode === "net" || scoringMode === "both") {
      const netSortedResults = this.sortResultsByNetScore(finishedResults, totalPar);
      const netRankedResults = this.assignNetPositionsAndPoints(netSortedResults, effectivePlayerCount, pointTemplate, competition.points_multiplier || 1, totalPar);
      for (const result of netRankedResults) {
        this.insertCompetitionResultRow(competitionId, result, "net");
      }
    }
    this.updateCompetitionFinalizedRow(competitionId);
  }
  getCompetitionResults(competitionId, scoringType = "gross") {
    return this.findCompetitionResultRows(competitionId, scoringType);
  }
  getPlayerResults(playerId, scoringType = "gross") {
    return this.findPlayerResultRows(playerId, scoringType);
  }
  isCompetitionFinalized(competitionId) {
    const result = this.findCompetitionFinalizedRow(competitionId);
    return result?.is_results_final === 1;
  }
  recalculateResults(competitionId) {
    this.finalizeCompetitionResults(competitionId);
  }
  getPlayerTourPoints(playerId, tourId, scoringType = "gross") {
    const result = this.findPlayerTourPointsRow(playerId, tourId, scoringType);
    return {
      total_points: result.total_points || 0,
      competitions_played: result.competitions_played || 0
    };
  }
  getTourStandingsFromResults(tourId, scoringType = "gross") {
    const standings = this.findTourStandingRows(tourId, scoringType);
    return this.assignStandingPositions(standings);
  }
}
function createCompetitionResultsService(db) {
  return new CompetitionResultsService(db);
}

// src/services/game-strategies/base.ts
class GameTypeStrategy {
  db;
  constructor(db) {
    this.db = db;
  }
  validateScore(hole, shots, par) {
    if (shots !== -1 && shots !== 0 && shots < 1) {
      throw new Error("Invalid score value");
    }
  }
  getDefaultSettings() {
    return {};
  }
}

// src/services/game-strategies/stroke-play.ts
class StrokePlayStrategy extends GameTypeStrategy {
  typeName = "stroke_play";
  displayName = "Stroke Play";
  validateSettings(settings) {
    return;
  }
  calculateResults(scores, handicaps, context) {
    const results = [];
    const totalPar = context.pars.reduce((sum, par) => sum + par, 0);
    for (const [memberId, scoreArray] of scores.entries()) {
      const holesPlayed = scoreArray.filter((s) => s > 0 || s === GOLF.UNREPORTED_HOLE).length;
      const grossTotal = this.calculateGrossTotal(scoreArray);
      const relativeToPar = this.calculateRelativeToPar(scoreArray, context.pars);
      const result = {
        memberId,
        memberName: "",
        grossTotal,
        relativeToPar,
        holesPlayed,
        position: 0
      };
      if (context.scoringMode !== "gross" && handicaps.has(memberId)) {
        const handicapIndex = handicaps.get(memberId);
        const teeRating = context.playerTeeRatings?.get(memberId);
        const slopeRating = teeRating?.slopeRating ?? GOLF.STANDARD_SLOPE_RATING;
        const courseRating = teeRating?.courseRating ?? GOLF.STANDARD_COURSE_RATING;
        const par = teeRating?.par ?? totalPar;
        const courseHandicap = calculateCourseHandicap(handicapIndex, slopeRating, courseRating, par);
        const strokesPerHole = distributeHandicapStrokes(courseHandicap, context.strokeIndex);
        const netData = this.calculateNetScore(scoreArray, context.pars, strokesPerHole);
        result.netTotal = netData.netTotal;
        result.netRelativeToPar = netData.netRelativeToPar;
      }
      results.push(result);
    }
    this.sortResults(results, context.scoringMode);
    this.assignPositions(results, context.scoringMode);
    return results;
  }
  calculateGrossTotal(scores) {
    return scores.reduce((sum, s) => {
      return s > 0 ? sum + s : sum;
    }, 0);
  }
  calculateRelativeToPar(scores, pars) {
    let relativeToPar = 0;
    for (let i = 0;i < scores.length; i++) {
      if (scores[i] > 0) {
        relativeToPar += scores[i] - pars[i];
      }
    }
    return relativeToPar;
  }
  calculateNetScore(scores, pars, strokesPerHole) {
    let netScore = 0;
    let parForHolesPlayed = 0;
    for (let i = 0;i < scores.length; i++) {
      if (scores[i] > 0) {
        netScore += scores[i] - strokesPerHole[i];
        parForHolesPlayed += pars[i];
      }
    }
    return {
      netTotal: netScore,
      netRelativeToPar: netScore - parForHolesPlayed
    };
  }
  sortResults(results, scoringMode) {
    results.sort((a, b) => {
      if (scoringMode === "net") {
        const aScore = a.netRelativeToPar ?? a.relativeToPar;
        const bScore = b.netRelativeToPar ?? b.relativeToPar;
        return aScore - bScore;
      } else {
        return a.relativeToPar - b.relativeToPar;
      }
    });
  }
  assignPositions(results, scoringMode) {
    let currentPosition = 1;
    results.forEach((result, index) => {
      if (index > 0) {
        const prevResult = results[index - 1];
        const prevScore = scoringMode === "net" ? prevResult.netRelativeToPar ?? prevResult.relativeToPar : prevResult.relativeToPar;
        const currScore = scoringMode === "net" ? result.netRelativeToPar ?? result.relativeToPar : result.relativeToPar;
        if (currScore !== prevScore) {
          currentPosition = index + 1;
        }
      }
      result.position = currentPosition;
    });
  }
}

// src/services/game-strategies/registry.ts
class GameTypeRegistry {
  strategies = new Map;
  constructor() {
    this.register(StrokePlayStrategy);
  }
  register(strategyClass) {
    const tempDb = {};
    const instance = new strategyClass(tempDb);
    this.strategies.set(instance.typeName, strategyClass);
  }
  get(typeName, db) {
    const StrategyClass = this.strategies.get(typeName);
    if (!StrategyClass) {
      throw new Error(`Unknown game type: ${typeName}. Available types: ${this.listAvailable().join(", ")}`);
    }
    return new StrategyClass(db);
  }
  has(typeName) {
    return this.strategies.has(typeName);
  }
  listAvailable() {
    return Array.from(this.strategies.keys());
  }
  getAllMetadata(db) {
    const metadata = [];
    for (const [typeName, StrategyClass] of this.strategies.entries()) {
      const instance = new StrategyClass(db);
      metadata.push({
        typeName: instance.typeName,
        displayName: instance.displayName
      });
    }
    return metadata;
  }
}
var gameTypeRegistry = new GameTypeRegistry;

// src/services/game.service.ts
class GameService {
  db;
  constructor(db) {
    this.db = db;
  }
  validateGameType(gameType) {
    if (!gameTypeRegistry.has(gameType)) {
      throw new Error(`Invalid game type: ${gameType}. Available: ${gameTypeRegistry.listAvailable().join(", ")}`);
    }
  }
  validateScoringMode(scoringMode) {
    const validModes = ["gross", "net", "both"];
    if (!validModes.includes(scoringMode)) {
      throw new Error(`Invalid scoring mode: ${scoringMode}. Must be one of: ${validModes.join(", ")}`);
    }
  }
  validateGameStatus(status) {
    const validStatuses = ["setup", "ready", "active", "completed"];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid game status: ${status}. Must be one of: ${validStatuses.join(", ")}`);
    }
  }
  validatePlayerData(data) {
    const hasPlayerId = data.player_id !== undefined && data.player_id !== null;
    const hasGuestName = data.guest_name !== undefined && data.guest_name !== null;
    if (hasPlayerId && hasGuestName) {
      throw new Error("Cannot specify both player_id and guest_name");
    }
    if (!hasPlayerId && !hasGuestName) {
      throw new Error("Must specify either player_id or guest_name");
    }
    if (hasGuestName && !data.guest_name?.trim()) {
      throw new Error("Guest name cannot be empty");
    }
  }
  validateGameStatusForModification(status) {
    if (status !== "setup") {
      throw new Error("Game cannot be modified after it has started");
    }
  }
  findGameRow(gameId) {
    const stmt = this.db.prepare("SELECT * FROM games WHERE id = ?");
    return stmt.get(gameId);
  }
  findGameWithDetailsRow(gameId) {
    const stmt = this.db.prepare(`
      SELECT
        g.*,
        c.name as course_name,
        u.email as owner_name,
        (SELECT COUNT(*) FROM game_players WHERE game_id = g.id) as player_count,
        (SELECT COUNT(*) FROM game_groups WHERE game_id = g.id) as group_count
      FROM games g
      JOIN courses c ON c.id = g.course_id
      JOIN users u ON u.id = g.owner_id
      WHERE g.id = ?
    `);
    return stmt.get(gameId);
  }
  findMyGamesRows(userId) {
    const stmt = this.db.prepare(`
      SELECT
        g.*,
        c.name as course_name,
        u.email as owner_name,
        (SELECT COUNT(*) FROM game_players WHERE game_id = g.id) as player_count,
        (SELECT COUNT(*) FROM game_groups WHERE game_id = g.id) as group_count
      FROM games g
      JOIN courses c ON c.id = g.course_id
      JOIN users u ON u.id = g.owner_id
      WHERE g.owner_id = ? OR g.id IN (
        SELECT game_id FROM game_players WHERE player_id = (
          SELECT id FROM players WHERE user_id = ?
        )
      )
      ORDER BY g.created_at DESC
    `);
    return stmt.all(userId, userId);
  }
  insertGameRow(ownerId, courseId, name, gameType, scoringMode, customSettings, scheduledDate) {
    const stmt = this.db.prepare(`
      INSERT INTO games (owner_id, course_id, name, game_type, scoring_mode, custom_settings, scheduled_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(ownerId, courseId, name, gameType, scoringMode, customSettings, scheduledDate);
  }
  updateGameStatusRow(gameId, status) {
    const now = new Date().toISOString();
    const timestampField = status === "active" ? "started_at" : status === "completed" ? "completed_at" : null;
    if (timestampField) {
      const stmt = this.db.prepare(`
        UPDATE games
        SET status = ?, ${timestampField} = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(status, now, gameId);
    } else {
      const stmt = this.db.prepare(`
        UPDATE games
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(status, gameId);
    }
  }
  deleteGameRow(gameId) {
    const stmt = this.db.prepare("DELETE FROM games WHERE id = ?");
    stmt.run(gameId);
  }
  updateGameCourseRow(gameId, courseId) {
    const stmt = this.db.prepare(`
      UPDATE games
      SET course_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(courseId, gameId);
  }
  updateGameTypeRow(gameId, gameType) {
    const stmt = this.db.prepare(`
      UPDATE games
      SET game_type = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(gameType, gameId);
  }
  updateGameScoringModeRow(gameId, scoringMode) {
    const stmt = this.db.prepare(`
      UPDATE games
      SET scoring_mode = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(scoringMode, gameId);
  }
  updateGameCustomSettingsRow(gameId, customSettings) {
    const stmt = this.db.prepare(`
      UPDATE games
      SET custom_settings = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(customSettings, gameId);
  }
  updateGameScheduledDateRow(gameId, scheduledDate) {
    const stmt = this.db.prepare(`
      UPDATE games
      SET scheduled_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(scheduledDate, gameId);
  }
  updateGameNameRow(gameId, name) {
    const stmt = this.db.prepare(`
      UPDATE games
      SET name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(name, gameId);
  }
  insertGamePlayerRow(gameId, playerId, guestName, guestHandicap, guestGender, teeId, displayOrder, isOwner) {
    const stmt = this.db.prepare(`
      INSERT INTO game_players (
        game_id, player_id, guest_name, guest_handicap, guest_gender, tee_id, display_order, is_owner
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(gameId, playerId, guestName, guestHandicap, guestGender, teeId, displayOrder, isOwner ? 1 : 0);
  }
  findGamePlayerRow(gamePlayerId) {
    const stmt = this.db.prepare("SELECT * FROM game_players WHERE id = ?");
    return stmt.get(gamePlayerId);
  }
  findGamePlayersRows(gameId) {
    const stmt = this.db.prepare("SELECT * FROM game_players WHERE game_id = ? ORDER BY display_order");
    return stmt.all(gameId);
  }
  findGamePlayersWithNamesRows(gameId) {
    const stmt = this.db.prepare(`
      SELECT
        gp.*,
        p.name as player_name,
        pp.display_name as player_display_name,
        p.handicap as player_handicap,
        p.gender as player_gender,
        c.pars as course_pars,
        ctr.course_rating as tee_course_rating,
        ctr.slope_rating as tee_slope_rating
      FROM game_players gp
      LEFT JOIN players p ON gp.player_id = p.id
      LEFT JOIN player_profiles pp ON p.id = pp.player_id
      LEFT JOIN games g ON gp.game_id = g.id
      LEFT JOIN courses c ON g.course_id = c.id
      LEFT JOIN course_tee_ratings ctr ON gp.tee_id = ctr.tee_id
        AND ctr.gender = CASE
          WHEN gp.player_id IS NOT NULL THEN
            CASE p.gender
              WHEN 'male' THEN 'men'
              WHEN 'female' THEN 'women'
              ELSE NULL
            END
          ELSE
            CASE gp.guest_gender
              WHEN 'male' THEN 'men'
              WHEN 'female' THEN 'women'
              ELSE NULL
            END
        END
      WHERE gp.game_id = ?
      ORDER BY gp.display_order
    `);
    return stmt.all(gameId);
  }
  deleteGamePlayerRow(gamePlayerId) {
    const stmt = this.db.prepare("DELETE FROM game_players WHERE id = ?");
    stmt.run(gamePlayerId);
  }
  updateGamePlayerTeeRow(gamePlayerId, teeId) {
    const stmt = this.db.prepare(`
      UPDATE game_players
      SET tee_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(teeId, gamePlayerId);
  }
  getNextPlayerDisplayOrder(gameId) {
    const stmt = this.db.prepare("SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM game_players WHERE game_id = ?");
    const result = stmt.get(gameId);
    return result.next_order;
  }
  findCourseExists(courseId) {
    const stmt = this.db.prepare("SELECT 1 FROM courses WHERE id = ?");
    return stmt.get(courseId) !== null;
  }
  findPlayerExists(playerId) {
    const stmt = this.db.prepare("SELECT 1 FROM players WHERE id = ?");
    return stmt.get(playerId) !== null;
  }
  findTeeExists(teeId) {
    const stmt = this.db.prepare("SELECT 1 FROM course_tees WHERE id = ?");
    return stmt.get(teeId) !== null;
  }
  transformGameRow(row) {
    return {
      ...row,
      name: row.name ?? undefined,
      custom_settings: row.custom_settings ? JSON.parse(row.custom_settings) : undefined,
      scheduled_date: row.scheduled_date ?? undefined,
      started_at: row.started_at ?? undefined,
      completed_at: row.completed_at ?? undefined
    };
  }
  transformGamePlayerRow(row) {
    let play_handicap = undefined;
    const handicapIndex = row.player_id ? row.player_handicap : row.guest_handicap;
    const courseRating = row.tee_course_rating;
    const slopeRating = row.tee_slope_rating;
    const pars = row.course_pars ? JSON.parse(row.course_pars) : [];
    const coursePar = pars.reduce((sum, par) => sum + par, 0);
    if (handicapIndex != null && courseRating != null && slopeRating != null && coursePar > 0) {
      play_handicap = Math.round(handicapIndex * (slopeRating / 113) + (courseRating - coursePar));
    }
    return {
      ...row,
      player_id: row.player_id ?? undefined,
      player_name: row.player_name ?? undefined,
      player_display_name: row.player_display_name ?? undefined,
      guest_name: row.guest_name ?? undefined,
      guest_handicap: row.guest_handicap ?? undefined,
      guest_gender: row.guest_gender ?? undefined,
      tee_id: row.tee_id ?? undefined,
      play_handicap,
      is_owner: Boolean(row.is_owner)
    };
  }
  transformGameWithDetailsRow(row) {
    return {
      ...this.transformGameRow(row),
      course_name: row.course_name,
      owner_name: row.owner_name,
      player_count: row.player_count,
      group_count: row.group_count
    };
  }
  createGame(ownerId, data) {
    const gameType = data.game_type ?? "stroke_play";
    const scoringMode = data.scoring_mode ?? "gross";
    this.validateGameType(gameType);
    this.validateScoringMode(scoringMode);
    if (!this.findCourseExists(data.course_id)) {
      throw new Error(`Course with id ${data.course_id} not found`);
    }
    if (data.custom_settings) {
      const strategy = gameTypeRegistry.get(gameType, this.db);
      strategy.validateSettings(data.custom_settings);
    }
    const customSettingsJson = data.custom_settings ? JSON.stringify(data.custom_settings) : null;
    return this.db.transaction(() => {
      const row = this.insertGameRow(ownerId, data.course_id, data.name ?? null, gameType, scoringMode, customSettingsJson, data.scheduled_date ?? null);
      this.insertGamePlayerRow(row.id, ownerId, null, null, null, null, 1, true);
      return this.transformGameRow(row);
    })();
  }
  findById(gameId) {
    const row = this.findGameRow(gameId);
    return row ? this.transformGameRow(row) : null;
  }
  findByIdWithDetails(gameId) {
    const row = this.findGameWithDetailsRow(gameId);
    return row ? this.transformGameWithDetailsRow(row) : null;
  }
  findMyGames(userId) {
    const rows = this.findMyGamesRows(userId);
    return rows.map((row) => this.transformGameWithDetailsRow(row));
  }
  updateGame(gameId, data, userId) {
    const game = this.findGameRow(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }
    if (!this.canUserModifyGame(gameId, userId)) {
      throw new Error("Only the game owner can update the game");
    }
    this.validateGameStatusForModification(game.status);
    if (data.course_id !== undefined) {
      if (!this.findCourseExists(data.course_id)) {
        throw new Error(`Course ${data.course_id} not found`);
      }
      this.updateGameCourseRow(gameId, data.course_id);
    }
    if (data.game_type !== undefined) {
      this.validateGameType(data.game_type);
      this.updateGameTypeRow(gameId, data.game_type);
    }
    if (data.scoring_mode !== undefined) {
      this.validateScoringMode(data.scoring_mode);
      this.updateGameScoringModeRow(gameId, data.scoring_mode);
    }
    if (data.custom_settings !== undefined) {
      const gameType = data.game_type || game.game_type;
      const strategy = gameTypeRegistry.get(gameType, this.db);
      strategy.validateSettings(data.custom_settings);
      const customSettingsJson = JSON.stringify(data.custom_settings);
      this.updateGameCustomSettingsRow(gameId, customSettingsJson);
    }
    if (data.scheduled_date !== undefined) {
      this.updateGameScheduledDateRow(gameId, data.scheduled_date);
    }
    if (data.name !== undefined) {
      this.updateGameNameRow(gameId, data.name);
    }
    const updated = this.findGameRow(gameId);
    return this.transformGameRow(updated);
  }
  updateGameStatus(gameId, status, userId) {
    this.validateGameStatus(status);
    const game = this.findGameRow(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }
    if (!this.canUserModifyGame(gameId, userId)) {
      throw new Error("Only the game owner can update game status");
    }
    this.updateGameStatusRow(gameId, status);
    const updated = this.findGameRow(gameId);
    return this.transformGameRow(updated);
  }
  deleteGame(gameId, userId) {
    const game = this.findGameRow(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }
    if (!this.canUserModifyGame(gameId, userId)) {
      throw new Error("Only the game owner can delete the game");
    }
    if (game.status !== "setup") {
      throw new Error("Can only delete games that haven't started");
    }
    this.deleteGameRow(gameId);
  }
  addPlayer(gameId, data, userId) {
    this.validatePlayerData(data);
    const game = this.findGameRow(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }
    if (!this.canUserModifyGame(gameId, userId)) {
      throw new Error("Only the game owner can add players");
    }
    this.validateGameStatusForModification(game.status);
    if (data.player_id && !this.findPlayerExists(data.player_id)) {
      throw new Error(`Player ${data.player_id} not found`);
    }
    if (data.tee_id && !this.findTeeExists(data.tee_id)) {
      throw new Error(`Tee ${data.tee_id} not found`);
    }
    const displayOrder = this.getNextPlayerDisplayOrder(gameId);
    const row = this.insertGamePlayerRow(gameId, data.player_id ?? null, data.guest_name ?? null, data.guest_handicap ?? null, data.guest_gender ?? null, data.tee_id ?? null, displayOrder, false);
    return this.transformGamePlayerRow(row);
  }
  removePlayer(gameId, gamePlayerId, userId) {
    const game = this.findGameRow(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }
    if (!this.canUserModifyGame(gameId, userId)) {
      throw new Error("Only the game owner can remove players");
    }
    this.validateGameStatusForModification(game.status);
    const gamePlayer = this.findGamePlayerRow(gamePlayerId);
    if (!gamePlayer) {
      throw new Error(`Game player ${gamePlayerId} not found`);
    }
    if (gamePlayer.game_id !== gameId) {
      throw new Error("Player does not belong to this game");
    }
    this.deleteGamePlayerRow(gamePlayerId);
  }
  assignTee(gameId, gamePlayerId, teeId, userId) {
    const game = this.findGameRow(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }
    if (!this.canUserModifyGame(gameId, userId)) {
      throw new Error("Only the game owner can assign tees");
    }
    if (!this.findTeeExists(teeId)) {
      throw new Error(`Tee ${teeId} not found`);
    }
    const gamePlayer = this.findGamePlayerRow(gamePlayerId);
    if (!gamePlayer) {
      throw new Error(`Game player ${gamePlayerId} not found`);
    }
    if (gamePlayer.game_id !== gameId) {
      throw new Error("Player does not belong to this game");
    }
    this.updateGamePlayerTeeRow(gamePlayerId, teeId);
    const updated = this.findGamePlayerRow(gamePlayerId);
    return this.transformGamePlayerRow(updated);
  }
  findGamePlayers(gameId) {
    const rows = this.findGamePlayersWithNamesRows(gameId);
    return rows.map((row) => this.transformGamePlayerRow(row));
  }
  canUserModifyGame(gameId, userId) {
    const game = this.findGameRow(gameId);
    if (!game)
      return false;
    return game.owner_id === userId;
  }
}

// src/services/game-group.service.ts
class GameGroupService {
  db;
  constructor(db) {
    this.db = db;
  }
  validateStartHole(startHole) {
    if (startHole !== 1 && startHole !== 10) {
      throw new Error("Start hole must be 1 or 10");
    }
  }
  validateTeeOrder(teeOrder) {
    if (teeOrder < 1) {
      throw new Error("Tee order must be greater than 0");
    }
  }
  findGameGroupRow(groupId) {
    const stmt = this.db.prepare("SELECT * FROM game_groups WHERE id = ?");
    return stmt.get(groupId);
  }
  findGameGroupsRows(gameId) {
    const stmt = this.db.prepare(`
      SELECT * FROM game_groups
      WHERE game_id = ?
      ORDER BY group_order
    `);
    return stmt.all(gameId);
  }
  insertGameGroupRow(gameId, name, startHole, groupOrder) {
    const stmt = this.db.prepare(`
      INSERT INTO game_groups (game_id, name, start_hole, group_order)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(gameId, name, startHole, groupOrder);
  }
  deleteGameGroupRow(groupId) {
    const stmt = this.db.prepare("DELETE FROM game_groups WHERE id = ?");
    stmt.run(groupId);
  }
  getNextGroupOrder(gameId) {
    const stmt = this.db.prepare(`
      SELECT COALESCE(MAX(group_order), 0) + 1 as next_order
      FROM game_groups
      WHERE game_id = ?
    `);
    const result = stmt.get(gameId);
    return result.next_order;
  }
  findGroupMemberRow(memberId) {
    const stmt = this.db.prepare("SELECT * FROM game_group_members WHERE id = ?");
    return stmt.get(memberId);
  }
  findGroupMembersRows(groupId) {
    const stmt = this.db.prepare(`
      SELECT * FROM game_group_members
      WHERE game_group_id = ?
      ORDER BY tee_order
    `);
    return stmt.all(groupId);
  }
  insertGroupMemberRow(groupId, gamePlayerId, teeOrder) {
    const stmt = this.db.prepare(`
      INSERT INTO game_group_members (game_group_id, game_player_id, tee_order)
      VALUES (?, ?, ?)
      RETURNING *
    `);
    return stmt.get(groupId, gamePlayerId, teeOrder);
  }
  deleteGroupMemberRow(memberId) {
    const stmt = this.db.prepare("DELETE FROM game_group_members WHERE id = ?");
    stmt.run(memberId);
  }
  updateGroupMemberTeeOrderRow(memberId, teeOrder) {
    const stmt = this.db.prepare(`
      UPDATE game_group_members
      SET tee_order = ?
      WHERE id = ?
    `);
    stmt.run(teeOrder, memberId);
  }
  deleteGroupMembersByGroupRow(groupId) {
    const stmt = this.db.prepare("DELETE FROM game_group_members WHERE game_group_id = ?");
    stmt.run(groupId);
  }
  getNextTeeOrder(groupId) {
    const stmt = this.db.prepare(`
      SELECT COALESCE(MAX(tee_order), 0) + 1 as next_order
      FROM game_group_members
      WHERE game_group_id = ?
    `);
    const result = stmt.get(groupId);
    return result.next_order;
  }
  findGameScoreExists(memberId) {
    const stmt = this.db.prepare("SELECT 1 FROM game_scores WHERE game_group_member_id = ?");
    return stmt.get(memberId) !== null;
  }
  insertGameScoreRow(memberId) {
    const stmt = this.db.prepare(`
      INSERT INTO game_scores (game_group_member_id, score)
      VALUES (?, '[]')
    `);
    stmt.run(memberId);
  }
  findGameExists(gameId) {
    const stmt = this.db.prepare("SELECT 1 FROM games WHERE id = ?");
    return stmt.get(gameId) !== null;
  }
  findGamePlayerExists(gamePlayerId) {
    const stmt = this.db.prepare("SELECT 1 FROM game_players WHERE id = ?");
    return stmt.get(gamePlayerId) !== null;
  }
  transformGameGroupRow(row) {
    return {
      ...row,
      name: row.name ?? undefined
    };
  }
  transformGameGroupMemberRow(row) {
    return {
      ...row
    };
  }
  createGroup(gameId, data) {
    const startHole = data.start_hole ?? 1;
    this.validateStartHole(startHole);
    if (!this.findGameExists(gameId)) {
      throw new Error(`Game ${gameId} not found`);
    }
    const groupOrder = this.getNextGroupOrder(gameId);
    const row = this.insertGameGroupRow(gameId, data.name ?? null, startHole, groupOrder);
    return this.transformGameGroupRow(row);
  }
  findById(groupId) {
    const row = this.findGameGroupRow(groupId);
    return row ? this.transformGameGroupRow(row) : null;
  }
  findGroupsForGame(gameId) {
    const rows = this.findGameGroupsRows(gameId);
    return rows.map((row) => this.transformGameGroupRow(row));
  }
  deleteGroup(groupId) {
    const group = this.findGameGroupRow(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }
    this.deleteGameGroupRow(groupId);
  }
  addMemberToGroup(groupId, gamePlayerId, teeOrder) {
    if (!this.findGameGroupRow(groupId)) {
      throw new Error(`Group ${groupId} not found`);
    }
    if (!this.findGamePlayerExists(gamePlayerId)) {
      throw new Error(`Game player ${gamePlayerId} not found`);
    }
    const finalTeeOrder = teeOrder ?? this.getNextTeeOrder(groupId);
    this.validateTeeOrder(finalTeeOrder);
    const row = this.insertGroupMemberRow(groupId, gamePlayerId, finalTeeOrder);
    if (!this.findGameScoreExists(row.id)) {
      this.insertGameScoreRow(row.id);
    }
    return this.transformGameGroupMemberRow(row);
  }
  removeMemberFromGroup(memberId) {
    const member = this.findGroupMemberRow(memberId);
    if (!member) {
      throw new Error(`Group member ${memberId} not found`);
    }
    this.deleteGroupMemberRow(memberId);
  }
  findGroupMembers(groupId) {
    const rows = this.findGroupMembersRows(groupId);
    return rows.map((row) => this.transformGameGroupMemberRow(row));
  }
  reorderMembers(groupId, memberIds) {
    if (!this.findGameGroupRow(groupId)) {
      throw new Error(`Group ${groupId} not found`);
    }
    this.db.transaction(() => {
      memberIds.forEach((memberId, index) => {
        const member = this.findGroupMemberRow(memberId);
        if (!member) {
          throw new Error(`Group member ${memberId} not found`);
        }
        if (member.game_group_id !== groupId) {
          throw new Error(`Member ${memberId} does not belong to group ${groupId}`);
        }
        this.updateGroupMemberTeeOrderRow(memberId, index + 1);
      });
    })();
  }
  setGroupMembers(groupId, gamePlayerIds) {
    if (!this.findGameGroupRow(groupId)) {
      throw new Error(`Group ${groupId} not found`);
    }
    return this.db.transaction(() => {
      this.deleteGroupMembersByGroupRow(groupId);
      const members = [];
      gamePlayerIds.forEach((gamePlayerId, index) => {
        if (!this.findGamePlayerExists(gamePlayerId)) {
          throw new Error(`Game player ${gamePlayerId} not found`);
        }
        const row = this.insertGroupMemberRow(groupId, gamePlayerId, index + 1);
        if (!this.findGameScoreExists(row.id)) {
          this.insertGameScoreRow(row.id);
        }
        members.push(this.transformGameGroupMemberRow(row));
      });
      return members;
    })();
  }
}

// src/services/game-score.service.ts
class GameScoreService {
  db;
  constructor(db) {
    this.db = db;
  }
  validateHoleNumber(hole) {
    if (hole < 1 || hole > GOLF.HOLES_PER_ROUND) {
      throw new Error(`Hole number must be between 1 and ${GOLF.HOLES_PER_ROUND}`);
    }
  }
  validateShotsValue(shots) {
    if (shots !== GOLF.UNREPORTED_HOLE && shots !== 0 && shots < 1) {
      throw new Error("Shots must be greater than 0, or -1 (gave up), or 0 (clear score)");
    }
  }
  findGameScoreRow(memberId) {
    const stmt = this.db.prepare("SELECT * FROM game_scores WHERE game_group_member_id = ?");
    return stmt.get(memberId);
  }
  findScoresForGroupRows(groupId) {
    const stmt = this.db.prepare(`
      SELECT
        gs.*,
        COALESCE(pp.display_name, p.name, gp.guest_name) as member_name,
        gp.id as game_player_id,
        gp.player_id,
        gp.guest_name,
        p.handicap as handicap_index_from_player,
        gg.start_hole,
        gp.tee_id,
        gp.guest_gender,
        ctr.course_rating,
        ctr.slope_rating,
        COALESCE(ct.stroke_index, c.stroke_index) as stroke_index,
        c.pars
      FROM game_scores gs
      JOIN game_group_members ggm ON ggm.id = gs.game_group_member_id
      JOIN game_players gp ON gp.id = ggm.game_player_id
      JOIN game_groups gg ON gg.id = ggm.game_group_id
      JOIN games g ON g.id = gg.game_id
      JOIN courses c ON c.id = g.course_id
      LEFT JOIN players p ON p.id = gp.player_id
      LEFT JOIN player_profiles pp ON pp.player_id = p.id
      LEFT JOIN course_tees ct ON ct.id = gp.tee_id
      LEFT JOIN course_tee_ratings ctr ON ctr.tee_id = gp.tee_id
        AND ctr.gender = CASE
          WHEN p.gender = 'female' THEN 'women'
          WHEN gp.guest_gender = 'female' THEN 'women'
          ELSE 'men'
        END
      WHERE ggm.game_group_id = ?
      ORDER BY ggm.tee_order
    `);
    return stmt.all(groupId);
  }
  findAllScoresForGameRows(gameId) {
    const stmt = this.db.prepare(`
      SELECT
        gs.*,
        COALESCE(pp.display_name, p.name, gp.guest_name) as member_name,
        gp.id as game_player_id,
        gp.player_id,
        gp.guest_name,
        gp.tee_id,
        gp.guest_gender,
        p.handicap as handicap_index_from_player,
        gg.start_hole
      FROM game_scores gs
      JOIN game_group_members ggm ON ggm.id = gs.game_group_member_id
      JOIN game_players gp ON gp.id = ggm.game_player_id
      JOIN game_groups gg ON gg.id = ggm.game_group_id
      LEFT JOIN players p ON p.id = gp.player_id
      LEFT JOIN player_profiles pp ON pp.player_id = p.id
      WHERE gg.game_id = ?
    `);
    return stmt.all(gameId);
  }
  findGameContextRow(gameId) {
    const stmt = this.db.prepare(`
      SELECT
        g.id as game_id,
        g.game_type,
        g.scoring_mode,
        c.pars,
        c.stroke_index,
        113 as slope_rating,
        72 as course_rating
      FROM games g
      JOIN courses c ON c.id = g.course_id
      WHERE g.id = ?
    `);
    return stmt.get(gameId);
  }
  findPlayerTeeRatingsForGameRows(gameId) {
    const stmt = this.db.prepare(`
      SELECT
        ggm.id as game_group_member_id,
        gp.tee_id,
        CASE
          WHEN gp.guest_gender = 'female' THEN 'women'
          ELSE 'men'
        END as gender,
        ctr.course_rating,
        ctr.slope_rating
      FROM game_group_members ggm
      JOIN game_players gp ON gp.id = ggm.game_player_id
      JOIN game_groups gg ON gg.id = ggm.game_group_id
      LEFT JOIN players p ON p.id = gp.player_id
      LEFT JOIN player_profiles pp ON pp.player_id = p.id
      LEFT JOIN course_tee_ratings ctr ON ctr.tee_id = gp.tee_id
        AND ctr.gender = CASE
          WHEN gp.guest_gender = 'female' THEN 'women'
          ELSE 'men'
        END
      WHERE gg.game_id = ?
    `);
    return stmt.all(gameId);
  }
  insertGameScoreRow(memberId) {
    const stmt = this.db.prepare(`
      INSERT INTO game_scores (game_group_member_id, score)
      VALUES (?, '[]')
      RETURNING *
    `);
    return stmt.get(memberId);
  }
  updateScoreArrayRow(memberId, scoreJson) {
    const stmt = this.db.prepare(`
      UPDATE game_scores
      SET score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE game_group_member_id = ?
    `);
    stmt.run(scoreJson, memberId);
  }
  updateHandicapSnapshotRow(memberId, handicapIndex) {
    const stmt = this.db.prepare(`
      UPDATE game_scores
      SET handicap_index = ?
      WHERE game_group_member_id = ?
    `);
    stmt.run(handicapIndex, memberId);
  }
  updateLockStatusRow(memberId, isLocked) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE game_scores
      SET is_locked = ?, locked_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE game_group_member_id = ?
    `);
    stmt.run(isLocked ? 1 : 0, isLocked ? now : null, memberId);
  }
  findGroupMemberExists(memberId) {
    const stmt = this.db.prepare("SELECT 1 FROM game_group_members WHERE id = ?");
    return stmt.get(memberId) !== null;
  }
  findPlayerIdForMember(memberId) {
    const stmt = this.db.prepare(`
      SELECT gp.player_id
      FROM game_group_members ggm
      JOIN game_players gp ON gp.id = ggm.game_player_id
      WHERE ggm.id = ?
    `);
    const result = stmt.get(memberId);
    return result?.player_id ?? null;
  }
  findPlayerHandicap(playerId) {
    const stmt = this.db.prepare("SELECT handicap FROM players WHERE id = ?");
    const result = stmt.get(playerId);
    return result?.handicap ?? null;
  }
  transformGameScoreRow(row) {
    return {
      ...row,
      score: this.parseScoreJson(row.score),
      is_locked: Boolean(row.is_locked),
      locked_at: row.locked_at ?? undefined,
      handicap_index: row.handicap_index ?? undefined,
      custom_data: row.custom_data ? JSON.parse(row.custom_data) : undefined
    };
  }
  transformGameScoreWithDetailsRow(row) {
    const baseScore = this.transformGameScoreRow(row);
    let courseHandicap = null;
    let strokeIndex = null;
    let handicapStrokesPerHole = null;
    const handicapIndex = row.handicap_index ?? row.handicap_index_from_player;
    if (row.tee_id && handicapIndex !== null && row.course_rating !== null && row.slope_rating !== null) {
      const pars = this.parseParsArray(row.pars);
      const totalPar = pars.reduce((sum, par) => sum + par, 0);
      strokeIndex = this.parseStrokeIndex(row.stroke_index);
      courseHandicap = calculateCourseHandicap(handicapIndex, row.slope_rating, row.course_rating, totalPar);
      handicapStrokesPerHole = distributeHandicapStrokes(courseHandicap, strokeIndex);
    }
    return {
      ...baseScore,
      member_name: row.member_name,
      game_player_id: row.game_player_id,
      player_id: row.player_id,
      guest_name: row.guest_name,
      course_handicap: courseHandicap,
      stroke_index: strokeIndex,
      handicap_strokes_per_hole: handicapStrokesPerHole,
      tee_id: row.tee_id,
      course_rating: row.course_rating,
      slope_rating: row.slope_rating
    };
  }
  parseScoreJson(json) {
    return safeParseJsonWithDefault(json, []);
  }
  parseParsArray(json) {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.holes)) {
        return parsed.holes;
      }
      throw new Error("Invalid pars format");
    } catch (e) {
      throw new Error(`Failed to parse pars: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }
  parseStrokeIndex(json) {
    if (!json) {
      return Array.from({ length: GOLF.HOLES_PER_ROUND }, (_, i) => i + 1);
    }
    return safeParseJsonWithDefault(json, Array.from({ length: GOLF.HOLES_PER_ROUND }, (_, i) => i + 1));
  }
  calculateHolesPlayed(scores) {
    return scores.filter((s) => s > 0 || s === GOLF.UNREPORTED_HOLE).length;
  }
  buildPlayerTeeRatingsMap(rows, totalPar) {
    const ratingsMap = new Map;
    for (const row of rows) {
      if (!row.tee_id || row.course_rating === null || row.slope_rating === null) {
        continue;
      }
      ratingsMap.set(row.game_group_member_id, {
        courseRating: row.course_rating,
        slopeRating: row.slope_rating,
        par: totalPar
      });
    }
    return ratingsMap;
  }
  updateScore(memberId, hole, shots) {
    this.validateHoleNumber(hole);
    this.validateShotsValue(shots);
    if (!this.findGroupMemberExists(memberId)) {
      throw new Error(`Group member ${memberId} not found`);
    }
    let scoreRow = this.findGameScoreRow(memberId);
    if (!scoreRow) {
      scoreRow = this.insertGameScoreRow(memberId);
    }
    if (scoreRow.is_locked) {
      throw new Error("Cannot update a locked scorecard");
    }
    const scores = this.parseScoreJson(scoreRow.score);
    while (scores.length < GOLF.HOLES_PER_ROUND) {
      scores.push(0);
    }
    const isFirstScore = scores.every((s) => s === 0);
    const hasActualScore = shots > 0 || shots === GOLF.UNREPORTED_HOLE;
    scores[hole - 1] = shots;
    this.updateScoreArrayRow(memberId, JSON.stringify(scores));
    if (isFirstScore && hasActualScore) {
      this.captureHandicapSnapshot(memberId);
    }
    const updated = this.findGameScoreRow(memberId);
    return this.transformGameScoreRow(updated);
  }
  lockScore(memberId) {
    const scoreRow = this.findGameScoreRow(memberId);
    if (!scoreRow) {
      throw new Error(`Score for member ${memberId} not found`);
    }
    if (scoreRow.is_locked) {
      throw new Error("Scorecard is already locked");
    }
    this.updateLockStatusRow(memberId, true);
    const updated = this.findGameScoreRow(memberId);
    return this.transformGameScoreRow(updated);
  }
  unlockScore(memberId) {
    const scoreRow = this.findGameScoreRow(memberId);
    if (!scoreRow) {
      throw new Error(`Score for member ${memberId} not found`);
    }
    if (!scoreRow.is_locked) {
      throw new Error("Scorecard is not locked");
    }
    this.updateLockStatusRow(memberId, false);
    const updated = this.findGameScoreRow(memberId);
    return this.transformGameScoreRow(updated);
  }
  findScoresForGroup(groupId) {
    const rows = this.findScoresForGroupRows(groupId);
    return rows.map((row) => this.transformGameScoreRow(row));
  }
  findScoresForGroupWithDetails(groupId) {
    const rows = this.findScoresForGroupRows(groupId);
    return rows.map((row) => this.transformGameScoreWithDetailsRow(row));
  }
  getLeaderboard(gameId) {
    const contextRow = this.findGameContextRow(gameId);
    if (!contextRow) {
      throw new Error(`Game ${gameId} not found`);
    }
    const pars = this.parseParsArray(contextRow.pars);
    const strokeIndex = this.parseStrokeIndex(contextRow.stroke_index);
    const totalPar = pars.reduce((sum, par) => sum + par, 0);
    const scoreRows = this.findAllScoresForGameRows(gameId);
    const scores = new Map;
    const handicaps = new Map;
    const memberNames = new Map;
    const memberPlayerIds = new Map;
    const isLockedMap = new Map;
    const startHoles = new Map;
    for (const row of scoreRows) {
      const scoreArray = this.parseScoreJson(row.score);
      scores.set(row.game_group_member_id, scoreArray);
      memberNames.set(row.game_group_member_id, row.member_name);
      memberPlayerIds.set(row.game_group_member_id, row.game_player_id);
      isLockedMap.set(row.game_group_member_id, Boolean(row.is_locked));
      startHoles.set(row.game_group_member_id, row.start_hole);
      if (row.handicap_index !== null) {
        handicaps.set(row.game_group_member_id, row.handicap_index);
      } else if (row.handicap_index_from_player !== null) {
        handicaps.set(row.game_group_member_id, row.handicap_index_from_player);
      }
    }
    const teeRatingRows = this.findPlayerTeeRatingsForGameRows(gameId);
    const playerTeeRatings = this.buildPlayerTeeRatingsMap(teeRatingRows, totalPar);
    const strategy = gameTypeRegistry.get(contextRow.game_type, this.db);
    const context = {
      gameId,
      pars,
      strokeIndex,
      scoringMode: contextRow.scoring_mode,
      playerTeeRatings
    };
    const results = strategy.calculateResults(scores, handicaps, context);
    return results.map((result) => ({
      memberName: memberNames.get(result.memberId) ?? "Unknown",
      gamePlayerId: memberPlayerIds.get(result.memberId) ?? 0,
      grossTotal: result.grossTotal,
      netTotal: result.netTotal,
      relativeToPar: result.relativeToPar,
      netRelativeToPar: result.netRelativeToPar,
      holesPlayed: result.holesPlayed,
      position: result.position,
      isLocked: isLockedMap.get(result.memberId) ?? false,
      startHole: startHoles.get(result.memberId) ?? 1,
      customData: result.customDisplayData
    }));
  }
  captureHandicapSnapshot(memberId) {
    const playerId = this.findPlayerIdForMember(memberId);
    if (!playerId) {
      return;
    }
    const handicap = this.findPlayerHandicap(playerId);
    if (handicap !== null) {
      this.updateHandicapSnapshotRow(memberId, handicap);
    }
  }
}

// src/app.ts
function createApp(db) {
  const clubService = new ClubService(db);
  const courseTeeService = new CourseTeeService(db);
  const courseService = new CourseService(db, courseTeeService, clubService);
  const teamService = new TeamService(db);
  const competitionService = new CompetitionService(db);
  const competitionCategoryTeeService = new CompetitionCategoryTeeService(db);
  const teeTimeService = new TeeTimeService(db);
  const participantService = new ParticipantService(db);
  const seriesService = new SeriesService(db, competitionService);
  const seriesAdminService = createSeriesAdminService(db);
  const competitionAdminService = createCompetitionAdminService(db);
  const documentService = new DocumentService(db);
  const playerService = createPlayerService(db);
  const playerProfileService = createPlayerProfileService(db);
  const pointTemplateService = createPointTemplateService(db);
  const tourService = createTourService(db);
  const tourEnrollmentService = createTourEnrollmentService(db);
  const tourAdminService = createTourAdminService(db);
  const tourDocumentService = new TourDocumentService(db);
  const tourCategoryService = createTourCategoryService(db);
  const tourCompetitionRegistrationService = createTourCompetitionRegistrationService(db);
  const competitionResultsService = createCompetitionResultsService(db);
  const gameService = new GameService(db);
  const gameGroupService = new GameGroupService(db);
  const gameScoreService = new GameScoreService(db);
  const authService = createAuthService(db, {
    tourEnrollmentService,
    playerService
  });
  const clubsApi = createClubsApi(clubService);
  const coursesApi = createCoursesApi(courseService, courseTeeService);
  const teamsApi = createTeamsApi(teamService);
  const competitionsApi = createCompetitionsApi(competitionService);
  const competitionCategoryTeesApi = createCompetitionCategoryTeesApi(competitionCategoryTeeService);
  const teeTimesApi = createTeeTimesApi(teeTimeService);
  const participantsApi = createParticipantsApi(participantService);
  const seriesApi = createSeriesApi(seriesService);
  const documentsApi = createDocumentsApi(documentService);
  const authApi = createAuthApi(authService);
  const playersApi = createPlayersApi(playerService, playerProfileService);
  const pointTemplatesApi = createPointTemplatesApi(pointTemplateService);
  const toursApi = createToursApi(tourService, tourEnrollmentService, tourAdminService, tourDocumentService, tourCategoryService, pointTemplateService);
  const tourCompetitionRegistrationApi = createTourCompetitionRegistrationApi(tourCompetitionRegistrationService, tourEnrollmentService, playerService);
  const gamesApi = createGamesApi(gameService, gameGroupService, gameScoreService);
  const gameScoresApi = createGameScoresApi(gameScoreService);
  const app = new Hono2;
  app.use("*", cors({
    origin: (origin) => origin || "http://localhost:5173",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }));
  app.use("*", async (c, next) => {
    console.log(`${c.req.method} ${c.req.url}`);
    await next();
  });
  app.use("*", createAuthMiddleware(authService));
  app.route("/api/auth", authApi);
  app.get("/api/users", (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (user.role !== "SUPER_ADMIN" && user.role !== "ORGANIZER" && user.role !== "ADMIN") {
      return c.json({ error: "Forbidden" }, 403);
    }
    const users = authService.getAllUsers();
    return c.json(users);
  });
  app.put("/api/users/:id/role", requireRole("SUPER_ADMIN"), async (c) => {
    const requestingUser = c.get("user");
    const userId = parseInt(c.req.param("id"));
    if (userId === requestingUser.id) {
      return c.json({ error: "Cannot change your own role" }, 400);
    }
    try {
      const body = await c.req.json();
      const { role } = body;
      if (!role) {
        return c.json({ error: "Role is required" }, 400);
      }
      const updatedUser = authService.updateUserRole(userId, role);
      return c.json(updatedUser);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 400);
    }
  });
  app.route("/api/players", playersApi);
  app.route("/api/point-templates", pointTemplatesApi);
  app.route("/api/tours", toursApi);
  app.route("/api/competitions", tourCompetitionRegistrationApi);
  app.get("/api/player/enrollments", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const player = playerService.findByUserId(user.id);
    if (!player) {
      return c.json([]);
    }
    const enrollments = tourEnrollmentService.getEnrollmentsForPlayer(player.id);
    return c.json(enrollments);
  });
  app.get("/api/player/active-rounds", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const player = playerService.findByUserId(user.id);
    if (!player) {
      return c.json([]);
    }
    try {
      const activeRounds = await tourCompetitionRegistrationService.getActiveRounds(player.id);
      return c.json(activeRounds);
    } catch (error) {
      console.error("Active rounds error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });
  app.post("/api/clubs", async (c) => {
    return await clubsApi.create(c.req.raw);
  });
  app.get("/api/clubs", async (c) => {
    return await clubsApi.findAll();
  });
  app.get("/api/clubs/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await clubsApi.findById(c.req.raw, id);
  });
  app.put("/api/clubs/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await clubsApi.update(c.req.raw, id);
  });
  app.delete("/api/clubs/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await clubsApi.delete(c.req.raw, id);
  });
  app.post("/api/courses", async (c) => {
    return await coursesApi.create(c.req.raw);
  });
  app.get("/api/courses", async (c) => {
    return await coursesApi.findAll();
  });
  app.get("/api/courses/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await coursesApi.findById(c.req.raw, id);
  });
  app.put("/api/courses/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await coursesApi.update(c.req.raw, id);
  });
  app.delete("/api/courses/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await coursesApi.delete(id);
  });
  app.put("/api/courses/:id/holes", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await coursesApi.updateHoles(c.req.raw, id);
  });
  app.post("/api/courses/import", async (c) => {
    return await coursesApi.importCourses(c.req.raw);
  });
  app.post("/api/courses/:id/import", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await coursesApi.importForCourse(c.req.raw, id);
  });
  app.get("/api/courses/:courseId/tees", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    return await coursesApi.getTees(courseId);
  });
  app.get("/api/courses/:courseId/tees/:teeId", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    const teeId = parseInt(c.req.param("teeId"));
    return await coursesApi.getTee(courseId, teeId);
  });
  app.post("/api/courses/:courseId/tees", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    return await coursesApi.createTee(c.req.raw, courseId);
  });
  app.put("/api/courses/:courseId/tees/:teeId", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    const teeId = parseInt(c.req.param("teeId"));
    return await coursesApi.updateTee(c.req.raw, courseId, teeId);
  });
  app.delete("/api/courses/:courseId/tees/:teeId", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    const teeId = parseInt(c.req.param("teeId"));
    return await coursesApi.deleteTee(courseId, teeId);
  });
  app.get("/api/courses/:courseId/tees/:teeId/ratings", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    const teeId = parseInt(c.req.param("teeId"));
    return await coursesApi.getTeeRatings(courseId, teeId);
  });
  app.get("/api/courses/:courseId/tees/:teeId/ratings/:gender", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    const teeId = parseInt(c.req.param("teeId"));
    const gender = c.req.param("gender");
    return await coursesApi.getTeeRatingByGender(courseId, teeId, gender);
  });
  app.post("/api/courses/:courseId/tees/:teeId/ratings", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    const teeId = parseInt(c.req.param("teeId"));
    return await coursesApi.upsertTeeRating(c.req.raw, courseId, teeId);
  });
  app.put("/api/courses/:courseId/tees/:teeId/ratings/:ratingId", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    const teeId = parseInt(c.req.param("teeId"));
    const ratingId = parseInt(c.req.param("ratingId"));
    return await coursesApi.updateTeeRating(c.req.raw, courseId, teeId, ratingId);
  });
  app.delete("/api/courses/:courseId/tees/:teeId/ratings/:gender", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    const teeId = parseInt(c.req.param("teeId"));
    const gender = c.req.param("gender");
    return await coursesApi.deleteTeeRating(courseId, teeId, gender);
  });
  app.post("/api/teams", async (c) => {
    return await teamsApi.create(c.req.raw);
  });
  app.get("/api/teams", async (c) => {
    return await teamsApi.findAll();
  });
  app.get("/api/teams/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teamsApi.findById(c.req.raw, id);
  });
  app.put("/api/teams/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teamsApi.update(c.req.raw, id);
  });
  app.post("/api/competitions", requireRole("ORGANIZER", "SUPER_ADMIN"), async (c) => {
    const user = c.get("user");
    try {
      const body = await c.req.json();
      const dataWithOwner = { ...body, owner_id: user.id };
      const competition = await competitionService.create(dataWithOwner);
      return c.json(competition, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 400);
    }
  });
  app.get("/api/competitions", async (c) => {
    return await competitionsApi.findAll();
  });
  app.get("/api/competitions/standalone", requireAuth(), async (c) => {
    const user = c.get("user");
    try {
      const competitions = await competitionService.findStandAlone(user.id);
      return c.json(competitions);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 500);
    }
  });
  app.get("/api/competitions/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await competitionsApi.findById(c.req.raw, id);
  });
  app.put("/api/competitions/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await competitionsApi.update(c.req.raw, id);
  });
  app.delete("/api/competitions/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await competitionsApi.delete(id);
  });
  app.get("/api/competitions/:competitionId/participants", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await participantsApi.findAllForCompetition(competitionId);
  });
  app.get("/api/competitions/:competitionId/leaderboard", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await competitionsApi.getLeaderboard(competitionId);
  });
  app.get("/api/competitions/:competitionId/leaderboard/details", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await competitionsApi.getLeaderboardWithDetails(competitionId);
  });
  app.get("/api/competitions/:competitionId/team-leaderboard", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await competitionsApi.getTeamLeaderboard(competitionId);
  });
  app.post("/api/competitions/:competitionId/finalize", requireAuth(), async (c) => {
    try {
      const competitionId = parseInt(c.req.param("competitionId"));
      const competition = competitionService.findById(competitionId);
      if (!competition) {
        return c.json({ error: "Competition not found" }, 404);
      }
      competitionResultsService.finalizeCompetitionResults(competitionId);
      return c.json({
        success: true,
        message: "Competition results finalized",
        competition_id: competitionId
      });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.get("/api/competitions/:competitionId/results", async (c) => {
    try {
      const competitionId = parseInt(c.req.param("competitionId"));
      const scoringType = c.req.query("scoring_type") || "gross";
      const results = competitionResultsService.getCompetitionResults(competitionId, scoringType);
      const isFinalized = competitionResultsService.isCompetitionFinalized(competitionId);
      return c.json({
        results,
        is_finalized: isFinalized
      });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
  app.get("/api/competitions/:competitionId/category-tees", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await competitionCategoryTeesApi.getByCompetition(competitionId);
  });
  app.put("/api/competitions/:competitionId/category-tees", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await competitionCategoryTeesApi.setForCompetition(c.req.raw, competitionId);
  });
  app.post("/api/games", requireAuth(), async (c) => {
    const user = c.get("user");
    return await gamesApi.create(c.req.raw, user.id);
  });
  app.get("/api/games/my", requireAuth(), async (c) => {
    const user = c.get("user");
    return await gamesApi.findMyGames(user.id);
  });
  app.get("/api/games/:id", requireAuth(), async (c) => {
    const gameId = parseInt(c.req.param("id"));
    return await gamesApi.findById(gameId);
  });
  app.put("/api/games/:id", requireAuth(), async (c) => {
    const gameId = parseInt(c.req.param("id"));
    const user = c.get("user");
    return await gamesApi.update(c.req.raw, gameId, user.id);
  });
  app.put("/api/games/:id/status", requireAuth(), async (c) => {
    const gameId = parseInt(c.req.param("id"));
    const user = c.get("user");
    return await gamesApi.updateStatus(c.req.raw, gameId, user.id);
  });
  app.delete("/api/games/:id", requireAuth(), async (c) => {
    const gameId = parseInt(c.req.param("id"));
    const user = c.get("user");
    return await gamesApi.deleteGame(gameId, user.id);
  });
  app.post("/api/games/:id/players", requireAuth(), async (c) => {
    const gameId = parseInt(c.req.param("id"));
    const user = c.get("user");
    return await gamesApi.addPlayer(c.req.raw, gameId, user.id);
  });
  app.delete("/api/games/:id/players/:playerId", requireAuth(), async (c) => {
    const gameId = parseInt(c.req.param("id"));
    const playerId = parseInt(c.req.param("playerId"));
    const user = c.get("user");
    return await gamesApi.removePlayer(gameId, playerId, user.id);
  });
  app.put("/api/games/:id/players/:playerId/tee", requireAuth(), async (c) => {
    const gameId = parseInt(c.req.param("id"));
    const playerId = parseInt(c.req.param("playerId"));
    const user = c.get("user");
    return await gamesApi.assignTee(c.req.raw, gameId, playerId, user.id);
  });
  app.get("/api/games/:id/players", requireAuth(), async (c) => {
    const gameId = parseInt(c.req.param("id"));
    return await gamesApi.getPlayers(gameId);
  });
  app.post("/api/games/:id/groups", requireAuth(), async (c) => {
    const gameId = parseInt(c.req.param("id"));
    const user = c.get("user");
    return await gamesApi.createGroup(c.req.raw, gameId, user.id);
  });
  app.put("/api/games/:id/groups/:groupId/members", requireAuth(), async (c) => {
    const groupId = parseInt(c.req.param("groupId"));
    const user = c.get("user");
    return await gamesApi.setGroupMembers(c.req.raw, groupId, user.id);
  });
  app.delete("/api/games/:id/groups/:groupId", requireAuth(), async (c) => {
    const groupId = parseInt(c.req.param("groupId"));
    const user = c.get("user");
    return await gamesApi.deleteGroup(groupId, user.id);
  });
  app.get("/api/games/:id/groups", requireAuth(), async (c) => {
    const gameId = parseInt(c.req.param("id"));
    return await gamesApi.getGroups(gameId);
  });
  app.get("/api/games/:id/groups/:groupId/scores", requireAuth(), async (c) => {
    const groupId = parseInt(c.req.param("groupId"));
    return await gamesApi.getGroupScores(groupId);
  });
  app.get("/api/games/:id/leaderboard", requireAuth(), async (c) => {
    const gameId = parseInt(c.req.param("id"));
    return await gamesApi.getLeaderboard(gameId);
  });
  app.put("/api/game-scores/:memberId/hole/:hole", requireAuth(), async (c) => {
    const memberId = parseInt(c.req.param("memberId"));
    const hole = parseInt(c.req.param("hole"));
    return await gameScoresApi.updateScore(c.req.raw, memberId, hole);
  });
  app.post("/api/game-scores/:memberId/lock", requireAuth(), async (c) => {
    const memberId = parseInt(c.req.param("memberId"));
    return await gameScoresApi.lockScore(memberId);
  });
  app.post("/api/game-scores/:memberId/unlock", requireAuth(), async (c) => {
    const memberId = parseInt(c.req.param("memberId"));
    const user = c.get("user");
    return await gameScoresApi.unlockScore(memberId, user.id);
  });
  app.post("/api/competitions/:competitionId/tee-times", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await teeTimesApi.createForCompetition(c.req.raw, competitionId);
  });
  app.get("/api/competitions/:competitionId/tee-times", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await teeTimesApi.findAllForCompetition(competitionId);
  });
  app.get("/api/competitions/:id/admins", requireAuth(), async (c) => {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    if (!competitionAdminService.canManageCompetition(id, user.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    try {
      const admins = competitionAdminService.getCompetitionAdmins(id);
      return c.json(admins);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 500);
    }
  });
  app.post("/api/competitions/:id/admins", requireAuth(), async (c) => {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    if (!competitionAdminService.canManageCompetitionAdmins(id, user.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    try {
      const body = await c.req.json();
      if (!body.userId) {
        return c.json({ error: "User ID is required" }, 400);
      }
      const admin = competitionAdminService.addCompetitionAdmin(id, body.userId);
      return c.json(admin, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 400);
    }
  });
  app.delete("/api/competitions/:id/admins/:userId", requireAuth(), async (c) => {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    const userId = parseInt(c.req.param("userId"));
    if (!competitionAdminService.canManageCompetitionAdmins(id, user.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    try {
      competitionAdminService.removeCompetitionAdmin(id, userId);
      return c.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 400);
    }
  });
  app.get("/api/tee-times/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teeTimesApi.findByIdWithParticipants(c.req.raw, id);
  });
  app.put("/api/tee-times/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teeTimesApi.update(c.req.raw, id);
  });
  app.delete("/api/tee-times/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teeTimesApi.delete(id);
  });
  app.put("/api/tee-times/:id/participants/order", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teeTimesApi.updateParticipantsOrder(c.req.raw, id);
  });
  app.post("/api/participants", async (c) => {
    return await participantsApi.create(c.req.raw);
  });
  app.get("/api/participants", async (c) => {
    return await participantsApi.findAll();
  });
  app.get("/api/participants/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.findById(c.req.raw, id);
  });
  app.put("/api/participants/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.update(c.req.raw, id);
  });
  app.delete("/api/participants/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.delete(id);
  });
  app.put("/api/participants/:id/score", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.updateScore(c.req.raw, id);
  });
  app.put("/api/participants/:id/manual-score", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.updateManualScore(c.req.raw, id);
  });
  app.post("/api/participants/:id/lock", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.lock(c.req.raw, id);
  });
  app.post("/api/participants/:id/unlock", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.unlock(c.req.raw, id);
  });
  app.post("/api/participants/:id/admin/dq", requireAuth(), async (c) => {
    const id = parseInt(c.req.param("id"));
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return await participantsApi.adminSetDQ(c.req.raw, id, user.id);
  });
  app.post("/api/participants/:id/admin/score", requireAuth(), async (c) => {
    const id = parseInt(c.req.param("id"));
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return await participantsApi.adminUpdateScore(c.req.raw, id, user.id);
  });
  app.post("/api/series", requireRole("ORGANIZER", "SUPER_ADMIN"), async (c) => {
    const user = c.get("user");
    try {
      const data = await c.req.json();
      const series = await seriesService.create(data, user.id);
      return c.json(series, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 400);
    }
  });
  app.get("/api/series", async (c) => {
    const user = c.get("user");
    try {
      if (user?.role === "SUPER_ADMIN") {
        const series = await seriesService.findAll();
        return c.json(series);
      } else if (user) {
        const series = await seriesService.findForUser(user.id);
        return c.json(series);
      } else {
        const series = await seriesService.findPublic();
        return c.json(series);
      }
    } catch (error) {
      return c.json({ error: "Internal server error" }, 500);
    }
  });
  app.get("/api/series/public", async (c) => {
    return await seriesApi.findPublic();
  });
  app.get("/api/series/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.findById(c.req.raw, id);
  });
  app.put("/api/series/:id", requireAuth(), async (c) => {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    if (!seriesAdminService.canManageSeries(id, user.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    return await seriesApi.update(c.req.raw, id);
  });
  app.delete("/api/series/:id", requireAuth(), async (c) => {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    if (!seriesAdminService.canManageSeriesAdmins(id, user.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    return await seriesApi.delete(id);
  });
  app.get("/api/series/:id/competitions", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.getCompetitions(id);
  });
  app.get("/api/series/:id/teams", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.getTeams(id);
  });
  app.get("/api/series/:id/standings", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.getStandings(id);
  });
  app.post("/api/series/:id/teams/:teamId", requireAuth(), async (c) => {
    const user = c.get("user");
    if (user.role !== "SUPER_ADMIN") {
      return c.json({ error: "Forbidden - only SUPER_ADMIN can manage teams" }, 403);
    }
    const seriesId = parseInt(c.req.param("id"));
    const teamId = parseInt(c.req.param("teamId"));
    return await seriesApi.addTeam(seriesId, teamId);
  });
  app.delete("/api/series/:id/teams/:teamId", requireAuth(), async (c) => {
    const user = c.get("user");
    if (user.role !== "SUPER_ADMIN") {
      return c.json({ error: "Forbidden - only SUPER_ADMIN can manage teams" }, 403);
    }
    const seriesId = parseInt(c.req.param("id"));
    const teamId = parseInt(c.req.param("teamId"));
    return await seriesApi.removeTeam(seriesId, teamId);
  });
  app.get("/api/series/:id/available-teams", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.getAvailableTeams(id);
  });
  app.get("/api/series/:id/admins", requireAuth(), async (c) => {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    if (!seriesAdminService.canManageSeries(id, user.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    try {
      const admins = seriesAdminService.getSeriesAdmins(id);
      return c.json(admins);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 500);
    }
  });
  app.post("/api/series/:id/admins", requireAuth(), async (c) => {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    if (!seriesAdminService.canManageSeriesAdmins(id, user.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    try {
      const body = await c.req.json();
      if (!body.userId) {
        return c.json({ error: "User ID is required" }, 400);
      }
      const admin = seriesAdminService.addSeriesAdmin(id, body.userId);
      return c.json(admin, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 400);
    }
  });
  app.delete("/api/series/:id/admins/:userId", requireAuth(), async (c) => {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    const userId = parseInt(c.req.param("userId"));
    if (!seriesAdminService.canManageSeriesAdmins(id, user.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    try {
      seriesAdminService.removeSeriesAdmin(id, userId);
      return c.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 400);
    }
  });
  app.post("/api/documents", async (c) => {
    return await documentsApi.create(c.req.raw);
  });
  app.get("/api/documents", async (c) => {
    return await documentsApi.findAll();
  });
  app.get("/api/documents/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await documentsApi.findById(c.req.raw, id);
  });
  app.put("/api/documents/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await documentsApi.update(c.req.raw, id);
  });
  app.delete("/api/documents/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await documentsApi.delete(id);
  });
  app.post("/api/series/:seriesId/documents", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    return await documentsApi.createForSeries(c.req.raw, seriesId);
  });
  app.get("/api/series/:seriesId/documents", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    return await documentsApi.findBySeriesId(seriesId);
  });
  app.put("/api/series/:seriesId/documents/:documentId", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    const documentId = parseInt(c.req.param("documentId"));
    return await documentsApi.updateForSeries(c.req.raw, seriesId, documentId);
  });
  app.delete("/api/series/:seriesId/documents/:documentId", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    const documentId = parseInt(c.req.param("documentId"));
    return await documentsApi.deleteForSeries(seriesId, documentId);
  });
  app.get("/api/series/:seriesId/documents/types", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    return await documentsApi.getDocumentTypes(seriesId);
  });
  app.get("/api/series/:seriesId/documents/type/:type", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    const type = c.req.param("type");
    return await documentsApi.findBySeriesIdAndType(seriesId, type);
  });
  app.get("*", async (c) => {
    const assetPath = new URL(c.req.url).pathname;
    if (assetPath.startsWith("/api/")) {
      return c.text("Not Found", 404);
    }
    const filePath = `frontend_dist${assetPath === "/" ? "/index.html" : assetPath}`;
    const file = Bun.file(filePath);
    if (await file.exists()) {
      const headers = new Headers;
      const acceptEncoding = c.req.header("Accept-Encoding") || "";
      const supportsGzip = acceptEncoding.includes("gzip");
      if (filePath.endsWith(".js"))
        headers.set("Content-Type", "application/javascript");
      if (filePath.endsWith(".css"))
        headers.set("Content-Type", "text/css");
      if (filePath.endsWith(".html"))
        headers.set("Content-Type", "text/html");
      if (filePath.endsWith(".png"))
        headers.set("Content-Type", "image/png");
      if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg"))
        headers.set("Content-Type", "image/jpeg");
      if (filePath.endsWith(".svg"))
        headers.set("Content-Type", "image/svg+xml");
      if (assetPath.match(/assets\/.*-[a-zA-Z0-9_-]+\.(js|css|png|jpg|jpeg|svg|woff|woff2)$/)) {
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      } else if (assetPath.endsWith("index.html")) {
        headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      } else {
        headers.set("Cache-Control", "public, max-age=3600");
      }
      if (supportsGzip && (filePath.endsWith(".js") || filePath.endsWith(".css") || filePath.endsWith(".html") || filePath.endsWith(".svg"))) {
        try {
          const fileContent = await file.arrayBuffer();
          const compressed = Bun.gzipSync(new Uint8Array(fileContent));
          headers.set("Content-Encoding", "gzip");
          headers.set("Content-Length", compressed.length.toString());
          return new Response(compressed, { headers });
        } catch (error) {
          console.error("Compression failed for", assetPath, error);
        }
      }
      return new Response(file, { headers });
    }
    const indexFile = Bun.file("frontend_dist/index.html");
    if (await indexFile.exists()) {
      const headers = new Headers({
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      });
      const acceptEncoding = c.req.header("Accept-Encoding") || "";
      if (acceptEncoding.includes("gzip")) {
        try {
          const fileContent = await indexFile.arrayBuffer();
          const compressed = Bun.gzipSync(new Uint8Array(fileContent));
          headers.set("Content-Encoding", "gzip");
          headers.set("Content-Length", compressed.length.toString());
          return new Response(compressed, { headers });
        } catch (error) {
          console.error("Compression failed for index.html", error);
        }
      }
      return new Response(indexFile, { headers });
    }
    return c.text("Not Found", 404);
  });
  return app;
}

// src/database/db.ts
import { Database } from "bun:sqlite";

// src/database/migrations/base.ts
class Migration {
  db;
  constructor(db) {
    this.db = db;
  }
  async execute(sql) {
    this.db.run(sql);
  }
  async columnExists(table, column) {
    const stmt = this.db.prepare(`SELECT name FROM pragma_table_info(?) WHERE name = ?`);
    const result = stmt.get(table, column);
    return result !== null;
  }
}

// src/database/migrations/001_initial_schema.ts
class InitialSchemaMigration extends Migration {
  version = 1;
  description = "Initial database schema";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        pars TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.execute(`
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.execute(`
      CREATE TABLE IF NOT EXISTS competitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        course_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id)
      )
    `);
    await this.execute(`
      CREATE TABLE IF NOT EXISTS tee_times (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teetime TEXT NOT NULL,
        competition_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (competition_id) REFERENCES competitions(id)
      )
    `);
    await this.execute(`
      CREATE TABLE IF NOT EXISTS participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tee_order INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        position_name TEXT NOT NULL,
        player_names TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id)
      )
    `);
  }
  async down() {
    await this.execute("DROP TABLE IF EXISTS participants");
    await this.execute("DROP TABLE IF EXISTS tee_times");
    await this.execute("DROP TABLE IF EXISTS competitions");
    await this.execute("DROP TABLE IF EXISTS teams");
    await this.execute("DROP TABLE IF EXISTS courses");
  }
}

// src/database/migrations/002_add_tee_time_id.ts
class AddTeeTimeIdMigration extends Migration {
  version = 2;
  description = "Add tee_time_id to participants table";
  async up() {
    const columnExists = await this.columnExists("participants", "tee_time_id");
    if (!columnExists) {
      await this.execute(`
        ALTER TABLE participants 
        ADD COLUMN tee_time_id INTEGER REFERENCES tee_times(id)
      `);
    }
  }
  async down() {
    await this.execute(`
      CREATE TABLE participants_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tee_order INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        position_name TEXT NOT NULL,
        player_names TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id)
      )
    `);
    await this.execute(`
      INSERT INTO participants_new 
      SELECT id, tee_order, team_id, position_name, player_names, created_at, updated_at 
      FROM participants
    `);
    await this.execute("DROP TABLE participants");
    await this.execute("ALTER TABLE participants_new RENAME TO participants");
  }
}

// src/database/migrations/003_add_participant_score.ts
class AddParticipantScoreMigration extends Migration {
  version = 3;
  description = "Add score field to participants table";
  async up() {
    const columnExists = await this.columnExists("participants", "score");
    if (!columnExists) {
      await this.execute(`
        ALTER TABLE participants 
        ADD COLUMN score TEXT DEFAULT '[]'
      `);
    }
  }
  async down() {
    await this.execute(`
      CREATE TABLE participants_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tee_order INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        tee_time_id INTEGER NOT NULL,
        position_name TEXT NOT NULL,
        player_names TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (tee_time_id) REFERENCES tee_times(id)
      )
    `);
    await this.execute(`
      INSERT INTO participants_new 
      SELECT id, tee_order, team_id, tee_time_id, position_name, player_names, created_at, updated_at 
      FROM participants
    `);
    await this.execute("DROP TABLE participants");
    await this.execute("ALTER TABLE participants_new RENAME TO participants");
  }
}

// src/database/migrations/004_add_series.ts
class AddSeriesMigration extends Migration {
  version = 4;
  description = "Add series table and optional series relationships";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS series (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        banner_image_url TEXT,
        is_public INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.execute(`
      ALTER TABLE competitions 
      ADD COLUMN series_id INTEGER REFERENCES series(id) ON DELETE SET NULL
    `);
    await this.execute(`
      ALTER TABLE teams 
      ADD COLUMN series_id INTEGER REFERENCES series(id) ON DELETE SET NULL
    `);
  }
  async down() {
    await this.execute(`
      CREATE TABLE teams_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.execute(`INSERT INTO teams_temp SELECT id, name, created_at, updated_at FROM teams`);
    await this.execute(`DROP TABLE teams`);
    await this.execute(`ALTER TABLE teams_temp RENAME TO teams`);
    await this.execute(`
      CREATE TABLE competitions_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        course_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id)
      )
    `);
    await this.execute(`INSERT INTO competitions_temp SELECT id, name, date, course_id, created_at, updated_at FROM competitions`);
    await this.execute(`DROP TABLE competitions`);
    await this.execute(`ALTER TABLE competitions_temp RENAME TO competitions`);
    await this.execute("DROP TABLE IF EXISTS series");
  }
}

// src/database/migrations/005_add_series_fields.ts
class AddSeriesFieldsMigration extends Migration {
  version = 5;
  description = "Add banner_image_url and is_public fields to series table";
  async up() {
    const bannerColumnExists = await this.columnExists("series", "banner_image_url");
    if (!bannerColumnExists) {
      await this.execute(`
        ALTER TABLE series 
        ADD COLUMN banner_image_url TEXT
      `);
    }
    const publicColumnExists = await this.columnExists("series", "is_public");
    if (!publicColumnExists) {
      await this.execute(`
        ALTER TABLE series 
        ADD COLUMN is_public INTEGER DEFAULT 1
      `);
    }
  }
  async down() {
    await this.execute(`
      CREATE TABLE series_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.execute(`
      INSERT INTO series_new (id, name, description, created_at, updated_at)
      SELECT id, name, description, created_at, updated_at 
      FROM series
    `);
    await this.execute("DROP TABLE series");
    await this.execute("ALTER TABLE series_new RENAME TO series");
  }
}

// src/database/migrations/006_series_teams_junction.ts
class SeriesTeamsJunctionMigration extends Migration {
  version = 6;
  description = "Create series_teams junction table for many-to-many relationship";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS series_teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        UNIQUE(series_id, team_id)
      )
    `);
    await this.execute(`
      INSERT OR IGNORE INTO series_teams (series_id, team_id)
      SELECT series_id, id
      FROM teams
      WHERE series_id IS NOT NULL
    `);
    await this.execute("PRAGMA foreign_keys = OFF");
    await this.execute(`DROP TABLE IF EXISTS teams_new`);
    await this.execute(`
      CREATE TABLE teams_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.execute(`
      INSERT INTO teams_new (id, name, created_at, updated_at)
      SELECT id, name, created_at, updated_at
      FROM teams
    `);
    await this.execute("DROP TABLE teams");
    await this.execute("ALTER TABLE teams_new RENAME TO teams");
    await this.execute("PRAGMA foreign_keys = ON");
  }
  async down() {
    await this.execute(`
      ALTER TABLE teams 
      ADD COLUMN series_id INTEGER REFERENCES series(id) ON DELETE SET NULL
    `);
    await this.execute(`
      UPDATE teams 
      SET series_id = (
        SELECT series_id 
        FROM series_teams 
        WHERE series_teams.team_id = teams.id 
        LIMIT 1
      )
    `);
    await this.execute("DROP TABLE IF EXISTS series_teams");
  }
}

// src/database/migrations/007_add_documents.ts
class AddDocumentsMigration extends Migration {
  version = 7;
  description = "Add documents table for series-related documentation";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        series_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
      )
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_documents_series_id ON documents(series_id)
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type)
    `);
  }
  async down() {
    await this.execute("DROP INDEX IF EXISTS idx_documents_type");
    await this.execute("DROP INDEX IF EXISTS idx_documents_series_id");
    await this.execute("DROP TABLE IF EXISTS documents");
  }
}

// src/database/migrations/008_add_landing_document_to_series.ts
class AddLandingDocumentToSeriesMigration extends Migration {
  version = 8;
  description = "Add landing_document_id field to series table";
  async up() {
    await this.execute(`
      ALTER TABLE series 
      ADD COLUMN landing_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_series_landing_document_id ON series(landing_document_id)
    `);
  }
  async down() {
    await this.execute("DROP INDEX IF EXISTS idx_series_landing_document_id");
    await this.execute(`
      CREATE TABLE series_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        banner_image_url TEXT,
        is_public INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.execute(`
      INSERT INTO series_temp (id, name, description, banner_image_url, is_public, created_at, updated_at)
      SELECT id, name, description, banner_image_url, is_public, created_at, updated_at FROM series
    `);
    await this.execute(`DROP TABLE series`);
    await this.execute(`ALTER TABLE series_temp RENAME TO series`);
  }
}

// src/database/migrations/009_add_participant_lock_status.ts
class AddParticipantLockStatusMigration extends Migration {
  version = 9;
  description = "Add lock status fields to participants table";
  async up() {
    const isLockedExists = await this.columnExists("participants", "is_locked");
    if (!isLockedExists) {
      await this.execute(`
        ALTER TABLE participants 
        ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0
      `);
    }
    const lockedAtExists = await this.columnExists("participants", "locked_at");
    if (!lockedAtExists) {
      await this.execute(`
        ALTER TABLE participants 
        ADD COLUMN locked_at DATETIME NULL
      `);
    }
  }
  async down() {
    await this.execute(`
      CREATE TABLE participants_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tee_order INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        tee_time_id INTEGER NOT NULL,
        position_name TEXT NOT NULL,
        player_names TEXT,
        score TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (tee_time_id) REFERENCES tee_times(id)
      )
    `);
    await this.execute(`
      INSERT INTO participants_temp 
      SELECT id, tee_order, team_id, tee_time_id, position_name, player_names, score, created_at, updated_at 
      FROM participants
    `);
    await this.execute("DROP TABLE participants");
    await this.execute("ALTER TABLE participants_temp RENAME TO participants");
  }
}

// src/database/migrations/010_add_manual_scores_to_participants.ts
class AddManualScoresToParticipantsMigration extends Migration {
  version = 10;
  description = "Add manual score fields to participants table";
  async up() {
    const outExists = await this.columnExists("participants", "manual_score_out");
    if (!outExists) {
      await this.execute(`
        ALTER TABLE participants 
        ADD COLUMN manual_score_out INTEGER NULL
      `);
    }
    const inExists = await this.columnExists("participants", "manual_score_in");
    if (!inExists) {
      await this.execute(`
        ALTER TABLE participants 
        ADD COLUMN manual_score_in INTEGER NULL
      `);
    }
    const totalExists = await this.columnExists("participants", "manual_score_total");
    if (!totalExists) {
      await this.execute(`
        ALTER TABLE participants 
        ADD COLUMN manual_score_total INTEGER NULL
      `);
    }
  }
  async down() {
    await this.execute(`
      CREATE TABLE participants_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tee_order INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        tee_time_id INTEGER NOT NULL,
        position_name TEXT NOT NULL,
        player_names TEXT,
        score TEXT DEFAULT '[]',
        is_locked INTEGER NOT NULL DEFAULT 0,
        locked_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (tee_time_id) REFERENCES tee_times(id)
      )
    `);
    await this.execute(`
      INSERT INTO participants_temp 
      SELECT id, tee_order, team_id, tee_time_id, position_name, player_names, score, is_locked, locked_at, created_at, updated_at 
      FROM participants
    `);
    await this.execute("DROP TABLE participants");
    await this.execute("ALTER TABLE participants_temp RENAME TO participants");
  }
}

// src/database/migrations/011_add_manual_entry_format_to_competitions.ts
class AddManualEntryFormatToCompetitions extends Migration {
  version = 11;
  description = "Add manual_entry_format column to competitions table";
  constructor(db) {
    super(db);
  }
  async up() {
    console.log("Adding manual_entry_format column to competitions table...");
    this.db.exec(`
      ALTER TABLE competitions 
      ADD COLUMN manual_entry_format TEXT NOT NULL DEFAULT 'out_in_total'
    `);
    console.log("manual_entry_format column added successfully");
  }
  async down() {
    console.log("Removing manual_entry_format column from competitions table...");
    this.db.exec(`
      CREATE TABLE competitions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        course_id INTEGER NOT NULL,
        series_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (series_id) REFERENCES series(id)
      )
    `);
    this.db.exec(`
      INSERT INTO competitions_new 
      (id, name, date, course_id, series_id, created_at, updated_at)
      SELECT id, name, date, course_id, series_id, created_at, updated_at
      FROM competitions
    `);
    this.db.exec(`DROP TABLE competitions`);
    this.db.exec(`ALTER TABLE competitions_new RENAME TO competitions`);
    console.log("manual_entry_format column removed successfully");
  }
}

// src/database/migrations/012_add_start_hole_to_tee_times.ts
class AddStartHoleToTeeTimesMigration extends Migration {
  version = 12;
  description = "Add start_hole column to tee_times (default 1)";
  async up() {
    const hasColumn = await this.columnExists("tee_times", "start_hole");
    if (!hasColumn) {
      await this.execute("ALTER TABLE tee_times ADD COLUMN start_hole INTEGER NOT NULL DEFAULT 1");
    }
  }
  async down() {
  }
}

// src/database/migrations/013_add_points_multiplier_to_competitions.ts
class AddPointsMultiplierToCompetitionsMigration extends Migration {
  version = 13;
  description = "Add points_multiplier column to competitions table (default 1)";
  async up() {
    const hasColumn = await this.columnExists("competitions", "points_multiplier");
    if (!hasColumn) {
      await this.execute("ALTER TABLE competitions ADD COLUMN points_multiplier REAL NOT NULL DEFAULT 1");
    }
  }
  async down() {
  }
}

// src/database/migrations/014_add_indoor_support.ts
class AddIndoorSupportMigration extends Migration {
  version = 14;
  description = "Add indoor golf simulator support (venue_type to competitions, hitting_bay to tee_times)";
  async up() {
    const hasVenueTypeColumn = await this.columnExists("competitions", "venue_type");
    if (!hasVenueTypeColumn) {
      await this.execute("ALTER TABLE competitions ADD COLUMN venue_type TEXT NOT NULL DEFAULT 'outdoor'");
    }
    const hasBayColumn = await this.columnExists("tee_times", "hitting_bay");
    if (!hasBayColumn) {
      await this.execute("ALTER TABLE tee_times ADD COLUMN hitting_bay INTEGER");
    }
  }
  async down() {
  }
}

// src/database/migrations/015_add_users_and_sessions.ts
class AddUsersAndSessionsMigration extends Migration {
  version = 15;
  description = "Add users and sessions tables";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'PLAYER', -- SUPER_ADMIN, ADMIN, PLAYER
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }
  async down() {
    await this.execute("DROP TABLE IF EXISTS sessions");
    await this.execute("DROP TABLE IF EXISTS users");
  }
}

// src/database/migrations/016_add_players.ts
class AddPlayersMigration extends Migration {
  version = 16;
  description = "Add players table";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        handicap REAL DEFAULT 0,
        user_id INTEGER,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
  }
  async down() {
    await this.execute("DROP TABLE IF EXISTS players");
  }
}

// src/database/migrations/017_add_tours_and_point_templates.ts
class AddToursAndPointTemplatesMigration extends Migration {
  version = 17;
  description = "Add tours and point templates tables";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS point_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        points_structure TEXT NOT NULL, -- JSON string
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await this.execute(`
      CREATE TABLE IF NOT EXISTS tours (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }
  async down() {
    await this.execute("DROP TABLE IF EXISTS tours");
    await this.execute("DROP TABLE IF EXISTS point_templates");
  }
}

// src/database/migrations/018_update_existing_tables.ts
class UpdateExistingTablesMigration extends Migration {
  version = 18;
  description = "Update series, competitions, and participants tables";
  async up() {
    if (!await this.columnExists("series", "owner_id")) {
      await this.execute("ALTER TABLE series ADD COLUMN owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL");
    }
    if (!await this.columnExists("competitions", "tour_id")) {
      await this.execute("ALTER TABLE competitions ADD COLUMN tour_id INTEGER REFERENCES tours(id) ON DELETE SET NULL");
    }
    if (!await this.columnExists("competitions", "point_template_id")) {
      await this.execute("ALTER TABLE competitions ADD COLUMN point_template_id INTEGER REFERENCES point_templates(id) ON DELETE SET NULL");
    }
    if (!await this.columnExists("participants", "player_id")) {
      await this.execute("ALTER TABLE participants ADD COLUMN player_id INTEGER REFERENCES players(id) ON DELETE SET NULL");
    }
  }
  async down() {
    try {
      await this.execute("ALTER TABLE series DROP COLUMN owner_id");
      await this.execute("ALTER TABLE competitions DROP COLUMN tour_id");
      await this.execute("ALTER TABLE competitions DROP COLUMN point_template_id");
      await this.execute("ALTER TABLE participants DROP COLUMN player_id");
    } catch (e) {
      console.warn("Down migration for columns failed (possibly not supported by SQLite version):", e);
    }
  }
}

// src/database/migrations/019_add_start_mode_to_competitions.ts
class AddStartModeToCompetitionsMigration extends Migration {
  version = 19;
  description = "Add start_mode column to competitions table (scheduled or open) with open period fields";
  async up() {
    const hasStartModeColumn = await this.columnExists("competitions", "start_mode");
    if (!hasStartModeColumn) {
      await this.execute("ALTER TABLE competitions ADD COLUMN start_mode TEXT NOT NULL DEFAULT 'scheduled'");
    }
    const hasOpenStartColumn = await this.columnExists("competitions", "open_start");
    if (!hasOpenStartColumn) {
      await this.execute("ALTER TABLE competitions ADD COLUMN open_start DATETIME");
    }
    const hasOpenEndColumn = await this.columnExists("competitions", "open_end");
    if (!hasOpenEndColumn) {
      await this.execute("ALTER TABLE competitions ADD COLUMN open_end DATETIME");
    }
  }
  async down() {
  }
}

// src/database/migrations/020_add_open_period_to_competitions.ts
class AddOpenPeriodToCompetitionsMigration extends Migration {
  version = 20;
  description = "Add open_start and open_end columns to competitions table for open period";
  async up() {
    const hasOpenStartColumn = await this.columnExists("competitions", "open_start");
    if (!hasOpenStartColumn) {
      await this.execute("ALTER TABLE competitions ADD COLUMN open_start DATETIME");
    }
    const hasOpenEndColumn = await this.columnExists("competitions", "open_end");
    if (!hasOpenEndColumn) {
      await this.execute("ALTER TABLE competitions ADD COLUMN open_end DATETIME");
    }
  }
  async down() {
  }
}

// src/database/migrations/021_add_tour_enrollments.ts
class AddTourEnrollmentsMigration extends Migration {
  version = 21;
  description = "Add tour_enrollments table for managing tour memberships";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS tour_enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tour_id INTEGER NOT NULL,
        player_id INTEGER,
        email TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
        UNIQUE(tour_id, email)
      )
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tour_enrollments_email ON tour_enrollments(email)
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tour_enrollments_status ON tour_enrollments(tour_id, status)
    `);
  }
  async down() {
    await this.execute("DROP INDEX IF EXISTS idx_tour_enrollments_status");
    await this.execute("DROP INDEX IF EXISTS idx_tour_enrollments_email");
    await this.execute("DROP TABLE IF EXISTS tour_enrollments");
  }
}

// src/database/migrations/022_add_tour_admins.ts
class AddTourAdminsMigration extends Migration {
  version = 22;
  description = "Add tour_admins table for tour-specific admin assignments";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS tour_admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tour_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(tour_id, user_id)
      )
    `);
  }
  async down() {
    await this.execute("DROP TABLE IF EXISTS tour_admins");
  }
}

// src/database/migrations/023_add_tour_settings.ts
class AddTourSettingsMigration extends Migration {
  version = 23;
  description = "Add enrollment_mode and visibility settings to tours table";
  async up() {
    if (!await this.columnExists("tours", "enrollment_mode")) {
      await this.execute("ALTER TABLE tours ADD COLUMN enrollment_mode TEXT NOT NULL DEFAULT 'closed'");
    }
    if (!await this.columnExists("tours", "visibility")) {
      await this.execute("ALTER TABLE tours ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private'");
    }
  }
  async down() {
    try {
      await this.execute("ALTER TABLE tours DROP COLUMN enrollment_mode");
      await this.execute("ALTER TABLE tours DROP COLUMN visibility");
    } catch (e) {
      console.warn("Down migration for tour settings columns failed (possibly not supported by SQLite version):", e);
    }
  }
}

// src/database/migrations/024_add_tour_fields.ts
class AddTourFieldsMigration extends Migration {
  version = 24;
  description = "Add banner_image_url and landing_document_id fields to tours table";
  async up() {
    const bannerColumnExists = await this.columnExists("tours", "banner_image_url");
    if (!bannerColumnExists) {
      await this.execute(`
        ALTER TABLE tours
        ADD COLUMN banner_image_url TEXT
      `);
    }
    const landingDocColumnExists = await this.columnExists("tours", "landing_document_id");
    if (!landingDocColumnExists) {
      await this.execute(`
        ALTER TABLE tours
        ADD COLUMN landing_document_id INTEGER REFERENCES tour_documents(id) ON DELETE SET NULL
      `);
    }
  }
  async down() {
  }
}

// src/database/migrations/025_add_tour_documents.ts
class AddTourDocumentsMigration extends Migration {
  version = 25;
  description = "Add tour_documents table for tour-related documentation";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS tour_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'general',
        tour_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
      )
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tour_documents_tour_id ON tour_documents(tour_id)
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tour_documents_type ON tour_documents(type)
    `);
  }
  async down() {
    await this.execute("DROP INDEX IF EXISTS idx_tour_documents_type");
    await this.execute("DROP INDEX IF EXISTS idx_tour_documents_tour_id");
    await this.execute("DROP TABLE IF EXISTS tour_documents");
  }
}

// src/database/migrations/026_add_tour_point_template.ts
class AddTourPointTemplateMigration extends Migration {
  version = 26;
  description = "Add point_template_id to tours for standings calculation";
  async up() {
    if (!await this.columnExists("tours", "point_template_id")) {
      await this.execute(`
        ALTER TABLE tours ADD COLUMN point_template_id INTEGER REFERENCES point_templates(id) ON DELETE SET NULL
      `);
    }
  }
  async down() {
    console.warn("Down migration for point_template_id column not supported");
  }
}

// src/database/migrations/027_add_tour_scoring_mode.ts
class AddTourScoringModeMigration extends Migration {
  version = 27;
  description = "Add scoring_mode to tours for gross/net scoring support";
  async up() {
    if (!await this.columnExists("tours", "scoring_mode")) {
      await this.execute(`
        ALTER TABLE tours ADD COLUMN scoring_mode TEXT NOT NULL DEFAULT 'gross'
      `);
    }
  }
  async down() {
    console.warn("Down migration for scoring_mode column not supported");
  }
}

// src/database/migrations/028_add_course_tees.ts
class AddCourseTeesMigration extends Migration {
  version = 28;
  description = "Add course_tees table for tee box ratings and stroke index";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS course_tees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT,
        course_rating REAL NOT NULL,
        slope_rating INTEGER NOT NULL DEFAULT 113,
        stroke_index TEXT,
        pars TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(course_id, name)
      )
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_course_tees_course_id ON course_tees(course_id)
    `);
  }
  async down() {
    await this.execute("DROP TABLE IF EXISTS course_tees");
  }
}

// src/database/migrations/029_add_competition_tee_id.ts
class AddCompetitionTeeIdMigration extends Migration {
  version = 29;
  description = "Add tee_id to competitions for linking to specific tee box";
  async up() {
    if (!await this.columnExists("competitions", "tee_id")) {
      await this.execute(`
        ALTER TABLE competitions ADD COLUMN tee_id INTEGER REFERENCES course_tees(id) ON DELETE SET NULL
      `);
    }
  }
  async down() {
    console.warn("Down migration for tee_id column not supported");
  }
}

// src/database/migrations/030_add_enrollment_playing_handicap.ts
class AddEnrollmentPlayingHandicapMigration extends Migration {
  version = 30;
  description = "Add playing_handicap to tour_enrollments for tour-specific handicap index";
  async up() {
    if (!await this.columnExists("tour_enrollments", "playing_handicap")) {
      await this.execute(`
        ALTER TABLE tour_enrollments ADD COLUMN playing_handicap REAL
      `);
    }
  }
  async down() {
    console.warn("Down migration for playing_handicap column not supported");
  }
}

// src/database/migrations/031_add_tour_categories.ts
class AddTourCategoriesMigration extends Migration {
  version = 31;
  description = "Add tour_categories table for player classification within tours";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS tour_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tour_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
        UNIQUE(tour_id, name)
      )
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tour_categories_tour_id ON tour_categories(tour_id)
    `);
  }
  async down() {
    await this.execute("DROP INDEX IF EXISTS idx_tour_categories_tour_id");
    await this.execute("DROP TABLE IF EXISTS tour_categories");
  }
}

// src/database/migrations/032_add_enrollment_category.ts
class AddEnrollmentCategoryMigration extends Migration {
  version = 32;
  description = "Add category_id to tour_enrollments for player classification";
  async up() {
    if (await this.columnExists("tour_enrollments", "category_id")) {
      return;
    }
    await this.execute(`
      ALTER TABLE tour_enrollments ADD COLUMN category_id INTEGER REFERENCES tour_categories(id) ON DELETE SET NULL
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tour_enrollments_category ON tour_enrollments(category_id)
    `);
  }
  async down() {
    await this.execute("DROP INDEX IF EXISTS idx_tour_enrollments_category");
  }
}

// src/database/migrations/033_add_course_tee_ratings.ts
class AddCourseTeeRatingsMigration extends Migration {
  version = 33;
  description = "Add course_tee_ratings table for gender-specific course/slope ratings";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS course_tee_ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tee_id INTEGER NOT NULL REFERENCES course_tees(id) ON DELETE CASCADE,
        gender TEXT NOT NULL CHECK(gender IN ('men', 'women')),
        course_rating REAL NOT NULL,
        slope_rating INTEGER NOT NULL DEFAULT 113,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tee_id, gender)
      )
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_course_tee_ratings_tee_id ON course_tee_ratings(tee_id)
    `);
    await this.execute(`
      INSERT INTO course_tee_ratings (tee_id, gender, course_rating, slope_rating)
      SELECT id, 'men', course_rating, slope_rating
      FROM course_tees
      WHERE course_rating IS NOT NULL
    `);
  }
  async down() {
    await this.execute("DROP TABLE IF EXISTS course_tee_ratings");
  }
}

// src/database/migrations/034_add_tour_competition_registrations.ts
class AddTourCompetitionRegistrationsMigration extends Migration {
  version = 34;
  description = "Add tour_competition_registrations table for player self-registration in open competitions";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS tour_competition_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
        player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        enrollment_id INTEGER NOT NULL REFERENCES tour_enrollments(id) ON DELETE CASCADE,

        -- Group membership (players sharing same tee_time are in same group)
        tee_time_id INTEGER REFERENCES tee_times(id) ON DELETE SET NULL,
        participant_id INTEGER REFERENCES participants(id) ON DELETE SET NULL,

        -- Status tracking
        -- 'looking_for_group' - Wants to be added by others
        -- 'registered'        - Solo or in a group, ready to play
        -- 'playing'           - Currently on course (started entering scores)
        -- 'finished'          - Scorecard locked
        -- 'withdrawn'         - Left the competition
        status TEXT NOT NULL DEFAULT 'registered'
          CHECK(status IN ('looking_for_group', 'registered', 'playing', 'finished', 'withdrawn')),

        -- Group info (who created the group this player is in)
        group_created_by INTEGER REFERENCES players(id) ON DELETE SET NULL,

        -- Timestamps
        registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
        started_at TEXT,
        finished_at TEXT,

        -- Each player can only register once per competition
        UNIQUE(competition_id, player_id)
      )
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tcr_competition_status
      ON tour_competition_registrations(competition_id, status)
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tcr_tee_time
      ON tour_competition_registrations(tee_time_id)
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_tcr_player
      ON tour_competition_registrations(player_id)
    `);
  }
  async down() {
    await this.execute("DROP TABLE IF EXISTS tour_competition_registrations");
  }
}

// src/database/migrations/035_add_competition_category_tees.ts
class AddCompetitionCategoryTeesMigration extends Migration {
  version = 35;
  description = "Add competition_category_tees table for category-specific tee assignments";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS competition_category_tees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competition_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        tee_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES tour_categories(id) ON DELETE CASCADE,
        FOREIGN KEY (tee_id) REFERENCES course_tees(id),
        UNIQUE(competition_id, category_id)
      )
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_competition_category_tees_competition
        ON competition_category_tees(competition_id)
    `);
  }
  async down() {
    await this.execute("DROP INDEX IF EXISTS idx_competition_category_tees_competition");
    await this.execute("DROP TABLE IF EXISTS competition_category_tees");
  }
}

// src/database/migrations/036_add_player_profiles.ts
class AddPlayerProfilesMigration extends Migration {
  version = 36;
  description = "Add player_profiles and handicap_history tables";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS handicap_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        handicap_index REAL NOT NULL,
        effective_date TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'manual',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_handicap_history_player
      ON handicap_history(player_id, effective_date DESC)
    `);
    await this.execute(`
      CREATE TABLE IF NOT EXISTS player_profiles (
        player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
        display_name TEXT,
        bio TEXT,
        avatar_url TEXT,
        home_course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        visibility TEXT NOT NULL DEFAULT 'public',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.execute(`
      INSERT INTO handicap_history (player_id, handicap_index, effective_date, source, notes)
      SELECT
        id,
        handicap,
        date('now'),
        'import',
        'Initial handicap imported from player record'
      FROM players
      WHERE handicap IS NOT NULL AND handicap != 0
    `);
  }
  async down() {
    await this.execute("DROP INDEX IF EXISTS idx_handicap_history_player");
    await this.execute("DROP TABLE IF EXISTS handicap_history");
    await this.execute("DROP TABLE IF EXISTS player_profiles");
  }
}

// src/database/migrations/037_add_participant_handicap_snapshot.ts
class AddParticipantHandicapSnapshotMigration extends Migration {
  version = 37;
  description = "Add handicap_index snapshot column to participants table";
  async up() {
    if (!await this.columnExists("participants", "handicap_index")) {
      await this.execute("ALTER TABLE participants ADD COLUMN handicap_index REAL");
    }
  }
  async down() {
    try {
      await this.execute("ALTER TABLE participants DROP COLUMN handicap_index");
    } catch (e) {
      console.warn("Down migration for handicap_index column failed (possibly not supported by SQLite version):", e);
    }
  }
}

// src/database/migrations/038_add_participant_dq_and_audit.ts
class AddParticipantDQAndAuditMigration extends Migration {
  version = 38;
  description = "Add DQ status and audit fields to participants table";
  async up() {
    if (!await this.columnExists("participants", "is_dq")) {
      await this.execute("ALTER TABLE participants ADD COLUMN is_dq INTEGER DEFAULT 0");
    }
    if (!await this.columnExists("participants", "admin_notes")) {
      await this.execute("ALTER TABLE participants ADD COLUMN admin_notes TEXT");
    }
    if (!await this.columnExists("participants", "admin_modified_by")) {
      await this.execute("ALTER TABLE participants ADD COLUMN admin_modified_by INTEGER REFERENCES users(id)");
    }
    if (!await this.columnExists("participants", "admin_modified_at")) {
      await this.execute("ALTER TABLE participants ADD COLUMN admin_modified_at TEXT");
    }
  }
  async down() {
    const columns = ["is_dq", "admin_notes", "admin_modified_by", "admin_modified_at"];
    for (const column of columns) {
      try {
        await this.execute(`ALTER TABLE participants DROP COLUMN ${column}`);
      } catch (e) {
        console.warn(`Down migration for ${column} column failed (possibly not supported by SQLite version):`, e);
      }
    }
  }
}

// src/database/migrations/039_add_competition_results.ts
class AddCompetitionResultsMigration extends Migration {
  version = 39;
  description = "Add competition_results table for storing finalized competition results";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS competition_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
        participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,

        -- Position and points
        position INTEGER NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,

        -- Score data
        gross_score INTEGER,
        net_score INTEGER,
        relative_to_par INTEGER,

        -- Scoring type (for tours with both gross and net)
        scoring_type TEXT NOT NULL DEFAULT 'gross' CHECK(scoring_type IN ('gross', 'net')),

        -- Metadata
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        -- Unique constraint: one result per participant per scoring type
        UNIQUE(participant_id, scoring_type)
      )
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_competition_results_competition
      ON competition_results(competition_id)
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_competition_results_player
      ON competition_results(player_id)
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_competition_results_player_scoring
      ON competition_results(player_id, scoring_type)
    `);
    if (!await this.columnExists("competitions", "is_results_final")) {
      await this.execute("ALTER TABLE competitions ADD COLUMN is_results_final INTEGER DEFAULT 0");
    }
    if (!await this.columnExists("competitions", "results_finalized_at")) {
      await this.execute("ALTER TABLE competitions ADD COLUMN results_finalized_at DATETIME");
    }
  }
  async down() {
    await this.execute("DROP TABLE IF EXISTS competition_results");
    try {
      await this.execute("ALTER TABLE competitions DROP COLUMN is_results_final");
    } catch (e) {
      console.warn("Could not drop is_results_final column:", e);
    }
    try {
      await this.execute("ALTER TABLE competitions DROP COLUMN results_finalized_at");
    } catch (e) {
      console.warn("Could not drop results_finalized_at column:", e);
    }
  }
}

// src/database/migrations/040_move_stroke_index_to_courses.ts
class MoveStrokeIndexToCoursesMigration extends Migration {
  version = 40;
  description = "Move stroke_index from course_tees to courses table (stroke index is a course property, not tee-specific)";
  async up() {
    if (!await this.columnExists("courses", "stroke_index")) {
      await this.execute("ALTER TABLE courses ADD COLUMN stroke_index TEXT");
    }
    await this.execute(`
      UPDATE courses
      SET stroke_index = (
        SELECT ct.stroke_index
        FROM course_tees ct
        WHERE ct.course_id = courses.id
          AND ct.stroke_index IS NOT NULL
        LIMIT 1
      )
      WHERE EXISTS (
        SELECT 1 FROM course_tees ct
        WHERE ct.course_id = courses.id
          AND ct.stroke_index IS NOT NULL
      )
    `);
  }
  async down() {
    await this.execute(`
      UPDATE course_tees
      SET stroke_index = (
        SELECT c.stroke_index
        FROM courses c
        WHERE c.id = course_tees.course_id
      )
      WHERE stroke_index IS NULL
    `);
  }
}

// src/database/migrations/041_add_series_admins.ts
class AddSeriesAdminsMigration extends Migration {
  version = 41;
  description = "Add series_admins table for series-specific admin assignments";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS series_admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(series_id, user_id)
      )
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_series_admins_series_id
      ON series_admins(series_id)
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_series_admins_user_id
      ON series_admins(user_id)
    `);
  }
  async down() {
    await this.execute("DROP TABLE IF EXISTS series_admins");
  }
}

// src/database/migrations/042_add_competition_ownership.ts
class AddCompetitionOwnershipMigration extends Migration {
  version = 42;
  description = "Add owner_id to competitions and create competition_admins table";
  async up() {
    const columns = this.db.prepare("PRAGMA table_info(competitions)").all();
    const hasOwnerIdColumn = columns.some((col) => col.name === "owner_id");
    if (!hasOwnerIdColumn) {
      await this.execute(`
        ALTER TABLE competitions ADD COLUMN owner_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL
      `);
    }
    await this.execute(`
      CREATE TABLE IF NOT EXISTS competition_admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competition_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(competition_id, user_id)
      )
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_competition_admins_competition_id
      ON competition_admins(competition_id)
    `);
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_competition_admins_user_id
      ON competition_admins(user_id)
    `);
  }
  async down() {
    await this.execute("DROP TABLE IF EXISTS competition_admins");
  }
}

// src/database/migrations/043_add_tour_id_to_point_templates.ts
class AddTourIdToPointTemplatesMigration extends Migration {
  version = 43;
  description = "Add tour_id to point_templates for tour-scoped templates";
  async up() {
    const columns = this.db.prepare("PRAGMA table_info(point_templates)").all();
    const hasTourIdColumn = columns.some((col) => col.name === "tour_id");
    if (!hasTourIdColumn) {
      await this.execute(`
        ALTER TABLE point_templates ADD COLUMN tour_id INTEGER
        REFERENCES tours(id) ON DELETE CASCADE
      `);
    }
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_point_templates_tour_id
      ON point_templates(tour_id)
    `);
  }
  async down() {
    await this.execute("DROP INDEX IF EXISTS idx_point_templates_tour_id");
  }
}

// src/database/migrations/044_add_clubs.ts
class AddClubsMigration extends Migration {
  version = 44;
  description = "Add clubs table and club_id to courses";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS clubs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    if (!await this.columnExists("courses", "club_id")) {
      await this.execute(`
        INSERT INTO clubs (name)
        SELECT DISTINCT 'Default Club'
        WHERE EXISTS (SELECT 1 FROM courses)
      `);
      await this.execute(`
        ALTER TABLE courses ADD COLUMN club_id INTEGER REFERENCES clubs(id)
      `);
      await this.execute(`
        UPDATE courses
        SET club_id = (SELECT id FROM clubs WHERE name = 'Default Club')
        WHERE club_id IS NULL
      `);
    }
  }
  async down() {
    if (await this.columnExists("courses", "club_id")) {
      await this.execute(`
        ALTER TABLE courses DROP COLUMN club_id
      `);
    }
    await this.execute("DROP TABLE IF EXISTS clubs");
  }
}

// src/database/migrations/045_add_casual_games.ts
class AddCasualGamesMigration extends Migration {
  version = 45;
  description = "Add casual games tables";
  async up() {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL REFERENCES users(id),
        course_id INTEGER NOT NULL REFERENCES courses(id),
        game_type VARCHAR(50) NOT NULL DEFAULT 'stroke_play',
        scoring_mode VARCHAR(20) NOT NULL DEFAULT 'gross',
        status VARCHAR(20) NOT NULL DEFAULT 'setup',
        custom_settings TEXT,
        scheduled_date DATETIME,
        started_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.execute("CREATE INDEX IF NOT EXISTS idx_games_owner ON games(owner_id)");
    await this.execute("CREATE INDEX IF NOT EXISTS idx_games_status ON games(status)");
    await this.execute("CREATE INDEX IF NOT EXISTS idx_games_course ON games(course_id)");
    await this.execute(`
      CREATE TABLE IF NOT EXISTS game_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        player_id INTEGER REFERENCES players(id),
        guest_name VARCHAR(255),
        guest_handicap REAL,
        tee_id INTEGER REFERENCES course_tees(id),
        display_order INTEGER NOT NULL DEFAULT 0,
        is_owner INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CHECK (
          (player_id IS NOT NULL AND guest_name IS NULL) OR
          (player_id IS NULL AND guest_name IS NOT NULL)
        )
      )
    `);
    await this.execute("CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id)");
    await this.execute("CREATE INDEX IF NOT EXISTS idx_game_players_player ON game_players(player_id)");
    await this.execute(`
      CREATE TABLE IF NOT EXISTS game_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        name VARCHAR(100),
        start_hole INTEGER NOT NULL DEFAULT 1,
        group_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.execute("CREATE INDEX IF NOT EXISTS idx_game_groups_game ON game_groups(game_id)");
    await this.execute(`
      CREATE TABLE IF NOT EXISTS game_group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_group_id INTEGER NOT NULL REFERENCES game_groups(id) ON DELETE CASCADE,
        game_player_id INTEGER NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
        tee_order INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(game_group_id, game_player_id)
      )
    `);
    await this.execute("CREATE INDEX IF NOT EXISTS idx_group_members_group ON game_group_members(game_group_id)");
    await this.execute("CREATE INDEX IF NOT EXISTS idx_group_members_player ON game_group_members(game_player_id)");
    await this.execute(`
      CREATE TABLE IF NOT EXISTS game_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_group_member_id INTEGER NOT NULL REFERENCES game_group_members(id) ON DELETE CASCADE,
        score TEXT NOT NULL DEFAULT '[]',
        handicap_index REAL,
        is_locked INTEGER DEFAULT 0,
        locked_at DATETIME,
        custom_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.execute("CREATE INDEX IF NOT EXISTS idx_game_scores_member ON game_scores(game_group_member_id)");
  }
  async down() {
    await this.execute("DROP TABLE IF EXISTS game_scores");
    await this.execute("DROP TABLE IF EXISTS game_group_members");
    await this.execute("DROP TABLE IF EXISTS game_groups");
    await this.execute("DROP TABLE IF EXISTS game_players");
    await this.execute("DROP TABLE IF EXISTS games");
  }
}

// src/database/migrations/046_add_player_gender_fields.ts
class AddPlayerGenderFieldsMigration extends Migration {
  version = 46;
  description = "Add gender fields for PHCP calculation with gender-specific ratings";
  async up() {
    if (!await this.columnExists("players", "gender")) {
      await this.execute(`
        ALTER TABLE players ADD COLUMN gender TEXT CHECK(gender IN ('male', 'female'))
      `);
    }
    if (!await this.columnExists("game_players", "guest_gender")) {
      await this.execute(`
        ALTER TABLE game_players ADD COLUMN guest_gender TEXT CHECK(guest_gender IN ('male', 'female'))
      `);
    }
  }
  async down() {
  }
}

// src/database/migrations/047_add_game_name.ts
class AddGameNameMigration extends Migration {
  version = 47;
  description = "Add name field to games table";
  async up() {
    if (!await this.columnExists("games", "name")) {
      await this.execute(`
        ALTER TABLE games ADD COLUMN name TEXT
      `);
    }
  }
  async down() {
  }
}

// src/database/db.ts
function createDatabase(dbPath) {
  const finalPath = dbPath || process.env.DB_PATH || "golf_series.db";
  console.log(`\uD83D\uDCC1 Using database: ${finalPath}`);
  const db = new Database(finalPath);
  db.run("PRAGMA foreign_keys = ON");
  return db;
}
async function initializeDatabase(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const appliedMigrations = db.query("SELECT version FROM migrations").all();
  const appliedVersions = new Set(appliedMigrations.map((m) => m.version));
  const migrations = [
    new InitialSchemaMigration(db),
    new AddTeeTimeIdMigration(db),
    new AddParticipantScoreMigration(db),
    new AddSeriesMigration(db),
    new AddSeriesFieldsMigration(db),
    new SeriesTeamsJunctionMigration(db),
    new AddDocumentsMigration(db),
    new AddLandingDocumentToSeriesMigration(db),
    new AddParticipantLockStatusMigration(db),
    new AddManualScoresToParticipantsMigration(db),
    new AddManualEntryFormatToCompetitions(db),
    new AddStartHoleToTeeTimesMigration(db),
    new AddPointsMultiplierToCompetitionsMigration(db),
    new AddIndoorSupportMigration(db),
    new AddUsersAndSessionsMigration(db),
    new AddPlayersMigration(db),
    new AddToursAndPointTemplatesMigration(db),
    new UpdateExistingTablesMigration(db),
    new AddStartModeToCompetitionsMigration(db),
    new AddOpenPeriodToCompetitionsMigration(db),
    new AddTourEnrollmentsMigration(db),
    new AddTourAdminsMigration(db),
    new AddTourSettingsMigration(db),
    new AddTourFieldsMigration(db),
    new AddTourDocumentsMigration(db),
    new AddTourPointTemplateMigration(db),
    new AddTourScoringModeMigration(db),
    new AddCourseTeesMigration(db),
    new AddCompetitionTeeIdMigration(db),
    new AddEnrollmentPlayingHandicapMigration(db),
    new AddTourCategoriesMigration(db),
    new AddEnrollmentCategoryMigration(db),
    new AddCourseTeeRatingsMigration(db),
    new AddTourCompetitionRegistrationsMigration(db),
    new AddCompetitionCategoryTeesMigration(db),
    new AddPlayerProfilesMigration(db),
    new AddParticipantHandicapSnapshotMigration(db),
    new AddParticipantDQAndAuditMigration(db),
    new AddCompetitionResultsMigration(db),
    new MoveStrokeIndexToCoursesMigration(db),
    new AddSeriesAdminsMigration(db),
    new AddCompetitionOwnershipMigration(db),
    new AddTourIdToPointTemplatesMigration(db),
    new AddClubsMigration(db),
    new AddCasualGamesMigration(db),
    new AddPlayerGenderFieldsMigration(db),
    new AddGameNameMigration(db)
  ];
  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      await migration.up();
      db.run("INSERT INTO migrations (version, description) VALUES (?, ?)", [
        migration.version,
        migration.description
      ]);
    }
  }
}

// src/server.ts
var db = createDatabase();
initializeDatabase(db);
var app = createApp(db);
var server = Bun.serve({
  port: process.env.PORT || 3010,
  fetch: app.fetch
});
console.log(`Server running on port ${server.port}`);
