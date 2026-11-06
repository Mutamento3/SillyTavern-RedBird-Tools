var n$1, l$2, u$3, t$2, i$2, r$2, o$2, e$2, f$3, c$2, a$2, s$2, h$3, p$3, v$2, d$2 = {}, w$3 = [], _$1 = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, g$2 = Array.isArray;
function m$3(n2, l2) {
  for (var u2 in l2) n2[u2] = l2[u2];
  return n2;
}
function b$2(n2) {
  n2 && n2.parentNode && n2.parentNode.removeChild(n2);
}
function k$2(l2, u2, t2) {
  var i2, r2, o2, e2 = {};
  for (o2 in u2) "key" == o2 ? i2 = u2[o2] : "ref" == o2 ? r2 = u2[o2] : e2[o2] = u2[o2];
  if (arguments.length > 2 && (e2.children = arguments.length > 3 ? n$1.call(arguments, 2) : t2), "function" == typeof l2 && null != l2.defaultProps) for (o2 in l2.defaultProps) void 0 === e2[o2] && (e2[o2] = l2.defaultProps[o2]);
  return x$1(l2, e2, i2, r2, null);
}
function x$1(n2, t2, i2, r2, o2) {
  var e2 = { type: n2, props: t2, key: i2, ref: r2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o2 ? ++u$3 : o2, __i: -1, __u: 0 };
  return null == o2 && null != l$2.vnode && l$2.vnode(e2), e2;
}
function S$1(n2) {
  return n2.children;
}
function C$1(n2, l2) {
  this.props = n2, this.context = l2;
}
function $(n2, l2) {
  if (null == l2) return n2.__ ? $(n2.__, n2.__i + 1) : null;
  for (var u2; l2 < n2.__k.length; l2++) if (null != (u2 = n2.__k[l2]) && null != u2.__e) return u2.__e;
  return "function" == typeof n2.type ? $(n2) : null;
}
function I(n2) {
  if (n2.__P && n2.__d) {
    var u2 = n2.__v, t2 = u2.__e, i2 = [], r2 = [], o2 = m$3({}, u2);
    o2.__v = u2.__v + 1, l$2.vnode && l$2.vnode(o2), q(n2.__P, o2, u2, n2.__n, n2.__P.namespaceURI, 32 & u2.__u ? [t2] : null, i2, null == t2 ? $(u2) : t2, !!(32 & u2.__u), r2), o2.__v = u2.__v, o2.__.__k[o2.__i] = o2, D$1(i2, o2, r2), u2.__e = u2.__ = null, o2.__e != t2 && P(o2);
  }
}
function P(n2) {
  if (null != (n2 = n2.__) && null != n2.__c) return n2.__e = n2.__c.base = null, n2.__k.some(function(l2) {
    if (null != l2 && null != l2.__e) return n2.__e = n2.__c.base = l2.__e;
  }), P(n2);
}
function A$2(n2) {
  (!n2.__d && (n2.__d = true) && i$2.push(n2) && !H.__r++ || r$2 != l$2.debounceRendering) && ((r$2 = l$2.debounceRendering) || o$2)(H);
}
function H() {
  try {
    for (var n2, l2 = 1; i$2.length; ) i$2.length > l2 && i$2.sort(e$2), n2 = i$2.shift(), l2 = i$2.length, I(n2);
  } finally {
    i$2.length = H.__r = 0;
  }
}
function L(n2, l2, u2, t2, i2, r2, o2, e2, f2, c2, a2) {
  var s2, h2, p2, v2, y2, _2, g2 = t2 && t2.__k || w$3, m2 = l2.length;
  for (f2 = T$1(u2, l2, g2, f2, m2), s2 = 0; s2 < m2; s2++) null != (p2 = u2.__k[s2]) && (h2 = -1 != p2.__i && g2[p2.__i] || d$2, p2.__i = s2, _2 = q(n2, p2, h2, i2, r2, o2, e2, f2, c2, a2), v2 = p2.__e, p2.ref && h2.ref != p2.ref && (h2.ref && J(h2.ref, null, p2), a2.push(p2.ref, p2.__c || v2, p2)), null == y2 && null != v2 && (y2 = v2), 4 & p2.__u ? (f2 = j$2(p2, f2, n2), h2.__e && (h2.__e = null)) : "function" == typeof p2.type && void 0 !== _2 ? f2 = _2 : v2 && (f2 = v2.nextSibling), p2.__u &= -7);
  return u2.__e = y2, f2;
}
function T$1(n2, l2, u2, t2, i2) {
  var r2, o2, e2, f2, c2, a2 = u2.length, s2 = a2, h2 = 0;
  for (n2.__k = new Array(i2), r2 = 0; r2 < i2; r2++) null != (o2 = l2[r2]) && "boolean" != typeof o2 && "function" != typeof o2 ? ("string" == typeof o2 || "number" == typeof o2 || "bigint" == typeof o2 || o2.constructor == String ? o2 = n2.__k[r2] = x$1(null, o2, null, null, null) : g$2(o2) ? o2 = n2.__k[r2] = x$1(S$1, { children: o2 }, null, null, null) : void 0 === o2.constructor && o2.__b > 0 ? o2 = n2.__k[r2] = x$1(o2.type, o2.props, o2.key, o2.ref ? o2.ref : null, o2.__v) : n2.__k[r2] = o2, f2 = r2 + h2, o2.__ = n2, o2.__b = n2.__b + 1, e2 = null, -1 != (c2 = o2.__i = O$1(o2, u2, f2, s2)) && (s2--, (e2 = u2[c2]) && (e2.__u |= 2)), null == e2 || null == e2.__v ? (-1 == c2 && (i2 > a2 ? h2-- : i2 < a2 && h2++), "function" != typeof o2.type && (o2.__u |= 4)) : c2 != f2 && (c2 == f2 - 1 ? h2-- : c2 == f2 + 1 ? h2++ : (c2 > f2 ? h2-- : h2++, o2.__u |= 4))) : n2.__k[r2] = null;
  if (s2) for (r2 = 0; r2 < a2; r2++) null != (e2 = u2[r2]) && 0 == (2 & e2.__u) && (e2.__e == t2 && (t2 = $(e2)), K(e2, e2));
  return t2;
}
function j$2(n2, l2, u2) {
  var t2, i2;
  if ("function" == typeof n2.type) {
    for (t2 = n2.__k, i2 = 0; t2 && i2 < t2.length; i2++) t2[i2] && (t2[i2].__ = n2, l2 = j$2(t2[i2], l2, u2));
    return l2;
  }
  n2.__e != l2 && (l2 && n2.type && !l2.parentNode && (l2 = $(n2)), l2 = u2.insertBefore(n2.__e, l2 || null));
  do {
    l2 = l2 && l2.nextSibling;
  } while (null != l2 && 8 == l2.nodeType);
  return l2;
}
function O$1(n2, l2, u2, t2) {
  var i2, r2, o2, e2 = n2.key, f2 = n2.type, c2 = l2[u2], a2 = null != c2 && 0 == (2 & c2.__u);
  if (null === c2 && null == e2 || a2 && e2 == c2.key && f2 == c2.type) return u2;
  if (t2 > (a2 ? 1 : 0)) {
    for (i2 = u2 - 1, r2 = u2 + 1; i2 >= 0 || r2 < l2.length; ) if (null != (c2 = l2[o2 = i2 >= 0 ? i2-- : r2++]) && 0 == (2 & c2.__u) && e2 == c2.key && f2 == c2.type) return o2;
  }
  return -1;
}
function z$1(n2, l2, u2) {
  "-" == l2[0] ? n2.setProperty(l2, null == u2 ? "" : u2) : n2[l2] = null == u2 ? "" : "number" != typeof u2 || _$1.test(l2) ? u2 : u2 + "px";
}
function N(n2, l2, u2, t2, i2) {
  var r2, o2;
  n: if ("style" == l2) if ("string" == typeof u2) n2.style.cssText = u2;
  else {
    if ("string" == typeof t2 && (n2.style.cssText = t2 = ""), t2) for (l2 in t2) u2 && l2 in u2 || z$1(n2.style, l2, "");
    if (u2) for (l2 in u2) t2 && u2[l2] == t2[l2] || z$1(n2.style, l2, u2[l2]);
  }
  else if ("o" == l2[0] && "n" == l2[1]) r2 = l2 != (l2 = l2.replace(s$2, "$1")), o2 = l2.toLowerCase(), l2 = o2 in n2 || "onFocusOut" == l2 || "onFocusIn" == l2 ? o2.slice(2) : l2.slice(2), n2.l || (n2.l = {}), n2.l[l2 + r2] = u2, u2 ? t2 ? u2[a$2] = t2[a$2] : (u2[a$2] = h$3, n2.addEventListener(l2, r2 ? v$2 : p$3, r2)) : n2.removeEventListener(l2, r2 ? v$2 : p$3, r2);
  else {
    if ("http://www.w3.org/2000/svg" == i2) l2 = l2.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
    else if ("width" != l2 && "height" != l2 && "href" != l2 && "list" != l2 && "form" != l2 && "tabIndex" != l2 && "download" != l2 && "rowSpan" != l2 && "colSpan" != l2 && "role" != l2 && "popover" != l2 && l2 in n2) try {
      n2[l2] = null == u2 ? "" : u2;
      break n;
    } catch (n3) {
    }
    "function" == typeof u2 || (null == u2 || false === u2 && "-" != l2[4] ? n2.removeAttribute(l2) : n2.setAttribute(l2, "popover" == l2 && 1 == u2 ? "" : u2));
  }
}
function V(n2) {
  return function(u2) {
    if (this.l) {
      var t2 = this.l[u2.type + n2];
      if (null == u2[c$2]) u2[c$2] = h$3++;
      else if (u2[c$2] < t2[a$2]) return;
      return t2(l$2.event ? l$2.event(u2) : u2);
    }
  };
}
function q(n2, u2, t2, i2, r2, o2, e2, f2, c2, a2) {
  var s2, h2, p2, v2, y2, d2, _2, k2, x2, M2, I2, P2, A2, H2, T2, j2, F2 = u2.type;
  if (void 0 !== u2.constructor) return null;
  128 & t2.__u && (c2 = !!(32 & t2.__u), o2 = [f2 = u2.__e = t2.__e]), (s2 = l$2.__b) && s2(u2);
  n: if ("function" == typeof F2) {
    h2 = e2.length;
    try {
      if (x2 = u2.props, M2 = F2.prototype && F2.prototype.render, I2 = (s2 = F2.contextType) && i2[s2.__c], P2 = s2 ? I2 ? I2.props.value : s2.__ : i2, t2.__c ? k2 = (p2 = u2.__c = t2.__c).__ = p2.__E : (M2 ? u2.__c = p2 = new F2(x2, P2) : (u2.__c = p2 = new C$1(x2, P2), p2.constructor = F2, p2.render = Q), I2 && I2.sub(p2), p2.state || (p2.state = {}), p2.__n = i2, v2 = p2.__d = true, p2.__h = [], p2._sb = []), M2 && null == p2.__s && (p2.__s = p2.state), M2 && null != F2.getDerivedStateFromProps && (p2.__s == p2.state && (p2.__s = m$3({}, p2.__s)), m$3(p2.__s, F2.getDerivedStateFromProps(x2, p2.__s))), y2 = p2.props, d2 = p2.state, p2.__v = u2, v2) M2 && null == F2.getDerivedStateFromProps && null != p2.componentWillMount && p2.componentWillMount(), M2 && null != p2.componentDidMount && p2.__h.push(p2.componentDidMount);
      else {
        if (M2 && null == F2.getDerivedStateFromProps && x2 !== y2 && null != p2.componentWillReceiveProps && p2.componentWillReceiveProps(x2, P2), u2.__v == t2.__v || !p2.__e && null != p2.shouldComponentUpdate && false === p2.shouldComponentUpdate(x2, p2.__s, P2)) {
          u2.__v != t2.__v && (p2.props = x2, p2.state = p2.__s, p2.__d = false), u2.__e = t2.__e, u2.__k = t2.__k, u2.__k.some(function(n3) {
            n3 && (n3.__ = u2);
          }), w$3.push.apply(p2.__h, p2._sb), p2._sb = [], p2.__h.length && e2.push(p2), f2 = $(t2);
          break n;
        }
        null != p2.componentWillUpdate && p2.componentWillUpdate(x2, p2.__s, P2), M2 && null != p2.componentDidUpdate && p2.__h.push(function() {
          p2.componentDidUpdate(y2, d2, _2);
        });
      }
      if (p2.context = P2, p2.props = x2, p2.__P = n2, p2.__e = false, A2 = l$2.__r, H2 = 0, M2) p2.state = p2.__s, p2.__d = false, A2 && A2(u2), s2 = p2.render(p2.props, p2.state, p2.context), w$3.push.apply(p2.__h, p2._sb), p2._sb = [];
      else do {
        p2.__d = false, A2 && A2(u2), s2 = p2.render(p2.props, p2.state, p2.context), p2.state = p2.__s;
      } while (p2.__d && ++H2 < 25);
      p2.state = p2.__s, null != p2.getChildContext && (i2 = m$3(m$3({}, i2), p2.getChildContext())), M2 && !v2 && null != p2.getSnapshotBeforeUpdate && (_2 = p2.getSnapshotBeforeUpdate(y2, d2)), T2 = null != s2 && s2.type === S$1 && null == s2.key ? E(s2.props.children) : s2, f2 = L(n2, g$2(T2) ? T2 : [T2], u2, t2, i2, r2, o2, e2, f2, c2, a2), p2.base = u2.__e, u2.__u &= -161, p2.__h.length && e2.push(p2), k2 && (p2.__E = p2.__ = null);
    } catch (n3) {
      if (e2.length = h2, u2.__v = null, c2 || null != o2) {
        if (n3.then) {
          for (u2.__u |= c2 ? 160 : 128; f2 && 8 == f2.nodeType && f2.nextSibling; ) f2 = f2.nextSibling;
          null != o2 && (o2[o2.indexOf(f2)] = null), u2.__e = f2;
        } else if (null != o2) for (j2 = o2.length; j2--; ) b$2(o2[j2]);
      } else u2.__e = t2.__e;
      null == u2.__k && (u2.__k = t2.__k || []), n3.then || B$1(u2), l$2.__e(n3, u2, t2);
    }
  } else null == o2 && u2.__v == t2.__v ? (u2.__k = t2.__k, u2.__e = t2.__e) : f2 = u2.__e = G(t2.__e, u2, t2, i2, r2, o2, e2, c2, a2);
  return (s2 = l$2.diffed) && s2(u2), 128 & u2.__u ? void 0 : f2;
}
function B$1(n2) {
  n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(B$1));
}
function D$1(n2, u2, t2) {
  for (var i2 = 0; i2 < t2.length; i2++) J(t2[i2], t2[++i2], t2[++i2]);
  l$2.__c && l$2.__c(u2, n2), n2.some(function(u3) {
    try {
      n2 = u3.__h, u3.__h = [], n2.some(function(n3) {
        n3.call(u3);
      });
    } catch (n3) {
      l$2.__e(n3, u3.__v);
    }
  });
}
function E(n2) {
  return "object" != typeof n2 || null == n2 || n2.__b > 0 ? n2 : g$2(n2) ? n2.map(E) : void 0 !== n2.constructor ? null : m$3({}, n2);
}
function G(u2, t2, i2, r2, o2, e2, f2, c2, a2) {
  var s2, h2, p2, v2, y2, w2, _2, m2 = i2.props || d$2, k2 = t2.props, x2 = t2.type;
  if ("svg" == x2 ? o2 = "http://www.w3.org/2000/svg" : "math" == x2 ? o2 = "http://www.w3.org/1998/Math/MathML" : o2 || (o2 = "http://www.w3.org/1999/xhtml"), null != e2) {
    for (s2 = 0; s2 < e2.length; s2++) if ((y2 = e2[s2]) && "setAttribute" in y2 == !!x2 && (x2 ? y2.localName == x2 : 3 == y2.nodeType)) {
      u2 = y2, e2[s2] = null;
      break;
    }
  }
  if (null == u2) {
    if (null == x2) return document.createTextNode(k2);
    u2 = document.createElementNS(o2, x2, k2.is && k2), c2 && (l$2.__m && l$2.__m(t2, e2), c2 = false), e2 = null;
  }
  if (null == x2) m2 === k2 || c2 && u2.data == k2 || (u2.data = k2);
  else {
    if (e2 = "textarea" == x2 && null != k2.defaultValue ? null : e2 && n$1.call(u2.childNodes), !c2 && null != e2) for (m2 = {}, s2 = 0; s2 < u2.attributes.length; s2++) m2[(y2 = u2.attributes[s2]).name] = y2.value;
    for (s2 in m2) y2 = m2[s2], "dangerouslySetInnerHTML" == s2 ? p2 = y2 : "children" == s2 || s2 in k2 || "value" == s2 && "defaultValue" in k2 || "checked" == s2 && "defaultChecked" in k2 || N(u2, s2, null, y2, o2);
    for (s2 in k2) y2 = k2[s2], "children" == s2 ? v2 = y2 : "dangerouslySetInnerHTML" == s2 ? h2 = y2 : "value" == s2 ? w2 = y2 : "checked" == s2 ? _2 = y2 : c2 && "function" != typeof y2 || m2[s2] === y2 || N(u2, s2, y2, m2[s2], o2);
    if (h2) c2 || p2 && (h2.__html == p2.__html || h2.__html == u2.innerHTML) || (u2.innerHTML = h2.__html), t2.__k = [];
    else if (p2 && (u2.innerHTML = ""), L("template" == t2.type ? u2.content : u2, g$2(v2) ? v2 : [v2], t2, i2, r2, "foreignObject" == x2 ? "http://www.w3.org/1999/xhtml" : o2, e2, f2, e2 ? e2[0] : i2.__k && $(i2, 0), c2, a2), null != e2) for (s2 = e2.length; s2--; ) b$2(e2[s2]);
    c2 && "textarea" != x2 || (s2 = "value", "progress" == x2 && null == w2 ? u2.removeAttribute("value") : null != w2 && (w2 !== u2[s2] || "progress" == x2 && !w2 || "option" == x2 && w2 != m2[s2]) && N(u2, s2, w2, m2[s2], o2), s2 = "checked", null != _2 && _2 != u2[s2] && N(u2, s2, _2, m2[s2], o2));
  }
  return u2;
}
function J(n2, u2, t2) {
  try {
    if ("function" == typeof n2) {
      var i2 = "function" == typeof n2.__u;
      i2 && n2.__u(), i2 && null == u2 || (n2.__u = n2(u2));
    } else n2.current = u2;
  } catch (n3) {
    l$2.__e(n3, t2);
  }
}
function K(n2, u2, t2) {
  var i2, r2;
  if (l$2.unmount && l$2.unmount(n2), (i2 = n2.ref) && (i2.current && i2.current != n2.__e || J(i2, null, u2)), null != (i2 = n2.__c)) {
    if (i2.componentWillUnmount) try {
      i2.componentWillUnmount();
    } catch (n3) {
      l$2.__e(n3, u2);
    }
    i2.base = i2.__P = i2.__n = null;
  }
  if (i2 = n2.__k) for (r2 = 0; r2 < i2.length; r2++) i2[r2] && K(i2[r2], u2, t2 || "function" != typeof n2.type);
  t2 || b$2(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
}
function Q(n2, l2, u2) {
  return this.constructor(n2, u2);
}
function R(u2, t2, i2) {
  var r2, o2, e2, f2;
  t2 == document && (t2 = document.documentElement), l$2.__ && l$2.__(u2, t2), o2 = (r2 = false) ? null : t2.__k, e2 = [], f2 = [], q(t2, u2 = t2.__k = k$2(S$1, null, [u2]), o2 || d$2, d$2, t2.namespaceURI, o2 ? null : t2.firstChild ? n$1.call(t2.childNodes) : null, e2, o2 ? o2.__e : t2.firstChild, r2, f2), D$1(e2, u2, f2), u2.props.children = null;
}
n$1 = w$3.slice, l$2 = { __e: function(n2, l2, u2, t2) {
  for (var i2, r2, o2; l2 = l2.__; ) if ((i2 = l2.__c) && !i2.__) try {
    if ((r2 = i2.constructor) && null != r2.getDerivedStateFromError && (i2.setState(r2.getDerivedStateFromError(n2)), o2 = i2.__d), null != i2.componentDidCatch && (i2.componentDidCatch(n2, t2 || {}), o2 = i2.__d), o2) return i2.__E = i2;
  } catch (l3) {
    n2 = l3;
  }
  throw n2;
} }, u$3 = 0, t$2 = function(n2) {
  return null != n2 && void 0 === n2.constructor;
}, C$1.prototype.setState = function(n2, l2) {
  var u2;
  u2 = null != this.__s && this.__s != this.state ? this.__s : this.__s = m$3({}, this.state), "function" == typeof n2 && (n2 = n2(m$3({}, u2), this.props)), n2 && m$3(u2, n2), null != n2 && this.__v && (l2 && this._sb.push(l2), A$2(this));
}, C$1.prototype.forceUpdate = function(n2) {
  this.__v && (this.__e = true, n2 && this.__h.push(n2), A$2(this));
}, C$1.prototype.render = S$1, i$2 = [], o$2 = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e$2 = function(n2, l2) {
  return n2.__v.__b - l2.__v.__b;
}, H.__r = 0, f$3 = Math.random().toString(8), c$2 = "__d" + f$3, a$2 = "__a" + f$3, s$2 = /(PointerCapture)$|Capture$/i, h$3 = 0, p$3 = V(false), v$2 = V(true);
var f$2 = 0;
function u$2(e2, t2, n2, o2, i2, u2) {
  t2 || (t2 = {});
  var a2, c2, p2 = t2;
  if ("ref" in p2) for (c2 in p2 = {}, t2) "ref" == c2 ? a2 = t2[c2] : p2[c2] = t2[c2];
  var l2 = { type: e2, props: p2, key: n2, ref: a2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f$2, __i: -1, __u: 0, __source: i2, __self: u2 };
  if ("function" == typeof e2 && (a2 = e2.defaultProps)) for (c2 in a2) void 0 === p2[c2] && (p2[c2] = a2[c2]);
  return l$2.vnode && l$2.vnode(l2), l2;
}
function ctx() {
  const st = window.SillyTavern;
  if (!st) throw new Error("SillyTavern context not available");
  return st.getContext();
}
const moduleCache = /* @__PURE__ */ new Map();
async function stModule(url) {
  if (!moduleCache.has(url)) {
    moduleCache.set(url, import(
      /* @vite-ignore */
      url
    ).catch((e2) => {
      console.warn("[RedBird] failed to import", url, e2);
      return null;
    }));
  }
  return moduleCache.get(url);
}
const ST_MODULES = {
  openai: "/scripts/openai.js",
  worldInfo: "/scripts/world-info.js",
  extensions: "/scripts/extensions.js",
  regexEngine: "/scripts/extensions/regex/engine.js"
};
const loaded = {};
async function preloadModules() {
  const [openai, worldInfo, extensions, regexEngine] = await Promise.all([
    stModule(ST_MODULES.openai),
    stModule(ST_MODULES.worldInfo),
    stModule(ST_MODULES.extensions),
    stModule(ST_MODULES.regexEngine)
  ]);
  Object.assign(loaded, { openai, worldInfo, extensions, regexEngine });
}
function currentCharacter() {
  const c2 = ctx();
  if (c2.groupId) return null;
  const id = c2.characterId;
  if (id === void 0 || id === null || id === "") return null;
  return c2.characters?.[Number(id)] ?? null;
}
function charaFileName(avatar) {
  return (avatar ?? "").replace(/\.[^/.]+$/, "");
}
function substitute(text) {
  try {
    return ctx().substituteParams(text);
  } catch {
    return text;
  }
}
async function runSlash(command) {
  const c2 = ctx();
  if (typeof c2.executeSlashCommandsWithOptions === "function") {
    await c2.executeSlashCommandsWithOptions(command, { handleParserErrors: true, handleExecutionErrors: true });
  } else {
    await c2.executeSlashCommands(command);
  }
}
function slashQuote(v2) {
  return `"${v2.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
function toast(kind, msg, title = "RedBird 工具箱", opts = {}) {
  window.toastr?.[kind]?.(msg, title, opts);
}
const SETTINGS_KEY = "redbird_tools";
function settings() {
  const es = ctx().extensionSettings;
  if (!es[SETTINGS_KEY]) es[SETTINGS_KEY] = {};
  const s2 = es[SETTINGS_KEY];
  s2.toastOnCardSwitch ??= true;
  s2.profiles ??= {};
  return s2;
}
function saveSettings() {
  ctx().saveSettingsDebounced();
}
var t$1, r$1, u$1, i$1, o$1 = 0, f$1 = [], c$1 = l$2, e$1 = c$1.__b, a$1 = c$1.__r, v$1 = c$1.diffed, l$1 = c$1.__c, m$2 = c$1.unmount, p$2 = c$1.__;
function s$1(n2, t2) {
  c$1.__h && c$1.__h(r$1, n2, o$1 || t2), o$1 = 0;
  var u2 = r$1.__H || (r$1.__H = { __: [], __h: [] });
  return n2 >= u2.__.length && u2.__.push({}), u2.__[n2];
}
function d$1(n2) {
  return o$1 = 1, y$2(D, n2);
}
function y$2(n2, u2, i2) {
  var o2 = s$1(t$1++, 2);
  if (o2.t = n2, !o2.__c && (o2.__ = [D(void 0, u2), function(n3) {
    var t2 = o2.__N ? o2.__N[0] : o2.__[0], r2 = o2.t(t2, n3);
    t2 !== r2 && (o2.__N = [r2, o2.__[1]], o2.__c.setState({}));
  }], o2.__c = r$1, !r$1.__f)) {
    var f2 = function(n3, t2, r2) {
      if (!o2.__c.__H) return true;
      var u3 = false, i3 = o2.__c.props !== n3;
      if (o2.__c.__H.__.some(function(n4) {
        if (n4.__N) {
          u3 = true;
          var t3 = n4.__[0];
          n4.__ = n4.__N, n4.__N = void 0, t3 !== n4.__[0] && (i3 = true);
        }
      }), c2) {
        var f3 = c2.call(this, n3, t2, r2);
        return u3 ? f3 || i3 : f3;
      }
      return !u3 || i3;
    };
    r$1.__f = true;
    var c2 = r$1.shouldComponentUpdate, e2 = r$1.componentWillUpdate;
    r$1.componentWillUpdate = function(n3, t2, r2) {
      if (this.__e) {
        var u3 = c2;
        c2 = void 0, f2(n3, t2, r2), c2 = u3;
      }
      e2 && e2.call(this, n3, t2, r2);
    }, r$1.shouldComponentUpdate = f2;
  }
  return o2.__N || o2.__;
}
function h$2(n2, u2) {
  var i2 = s$1(t$1++, 3);
  !c$1.__s && C(i2.__H, u2) && (i2.__ = n2, i2.u = u2, r$1.__H.__h.push(i2));
}
function A$1(n2) {
  return o$1 = 5, T(function() {
    return { current: n2 };
  }, []);
}
function T(n2, r2) {
  var u2 = s$1(t$1++, 7);
  return C(u2.__H, r2) && (u2.__ = n2(), u2.__H = r2, u2.__h = n2), u2.__;
}
function j$1() {
  for (var n2; n2 = f$1.shift(); ) {
    var t2 = n2.__H;
    if (n2.__P && t2) try {
      t2.__h.some(z), t2.__h.some(B), t2.__h = [];
    } catch (r2) {
      t2.__h = [], c$1.__e(r2, n2.__v);
    }
  }
}
c$1.__b = function(n2) {
  r$1 = null, e$1 && e$1(n2);
}, c$1.__ = function(n2, t2) {
  n2 && t2.__k && t2.__k.__m && (n2.__m = t2.__k.__m), p$2 && p$2(n2, t2);
}, c$1.__r = function(n2) {
  a$1 && a$1(n2), t$1 = 0;
  var i2 = (r$1 = n2.__c).__H;
  i2 && (u$1 === r$1 ? (i2.__h = [], r$1.__h = [], i2.__.some(function(n3) {
    n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
  })) : (i2.__h.some(z), i2.__h.some(B), i2.__h = [], t$1 = 0)), u$1 = r$1;
}, c$1.diffed = function(n2) {
  v$1 && v$1(n2);
  var t2 = n2.__c;
  t2 && t2.__H && (t2.__H.__h.length && (1 !== f$1.push(t2) && i$1 === c$1.requestAnimationFrame || ((i$1 = c$1.requestAnimationFrame) || w$2)(j$1)), t2.__H.__.some(function(n3) {
    n3.u && (n3.__H = n3.u, n3.u = void 0);
  })), u$1 = r$1 = null;
}, c$1.__c = function(n2, t2) {
  t2.some(function(n3) {
    try {
      n3.__h.some(z), n3.__h = n3.__h.filter(function(n4) {
        return !n4.__ || B(n4);
      });
    } catch (r2) {
      t2.some(function(n4) {
        n4.__h && (n4.__h = []);
      }), t2 = [], c$1.__e(r2, n3.__v);
    }
  }), l$1 && l$1(n2, t2);
}, c$1.unmount = function(n2) {
  m$2 && m$2(n2);
  var t2, r2 = n2.__c;
  r2 && r2.__H && (r2.__H.__.some(function(n3) {
    try {
      z(n3);
    } catch (n4) {
      t2 = n4;
    }
  }), r2.__H = void 0, t2 && c$1.__e(t2, r2.__v));
};
var k$1 = "function" == typeof requestAnimationFrame;
function w$2(n2) {
  var t2, r2 = function() {
    clearTimeout(u2), k$1 && cancelAnimationFrame(t2), setTimeout(n2);
  }, u2 = setTimeout(r2, 35);
  k$1 && (t2 = requestAnimationFrame(r2));
}
function z(n2) {
  var t2 = r$1, u2 = n2.__c;
  "function" == typeof u2 && (n2.__c = void 0, u2()), r$1 = t2;
}
function B(n2) {
  var t2 = r$1;
  n2.__c = n2.__(), r$1 = t2;
}
function C(n2, t2) {
  return !n2 || n2.length !== t2.length || t2.some(function(t3, r2) {
    return t3 !== n2[r2];
  });
}
function D(n2, t2) {
  return "function" == typeof t2 ? t2(n2) : t2;
}
var i = Symbol.for("preact-signals");
function t() {
  if (!(v > 1)) {
    var i2, t2 = false;
    !(function() {
      var i3 = c;
      c = void 0;
      while (void 0 !== i3) {
        var t3 = i3.S;
        if (t3.v === i3.v) {
          for (var r3 = t3.t; void 0 !== r3; r3 = r3.x) if (r3.i === i3.i) r3.i = t3.i;
        }
        i3 = i3.o;
      }
    })();
    while (void 0 !== h$1) {
      var r2 = h$1;
      h$1 = void 0;
      s++;
      while (void 0 !== r2) {
        var n2 = r2.u;
        r2.u = void 0;
        r2.f &= -3;
        if (!(8 & r2.f) && w$1(r2)) try {
          r2.c();
        } catch (r3) {
          if (!t2) {
            i2 = r3;
            t2 = true;
          }
        }
        r2 = n2;
      }
    }
    s = 0;
    v--;
    if (t2) throw i2;
  } else v--;
}
function r(i2) {
  if (v > 0) return i2();
  u = ++e;
  v++;
  try {
    return i2();
  } finally {
    t();
  }
}
var n, o = void 0;
function f(i2) {
  var t2 = o, r2 = n;
  o = void 0;
  n = void 0;
  try {
    return i2();
  } finally {
    o = t2;
    n = r2;
  }
}
var h$1 = void 0, v = 0, s = 0, e = 0, u = 0, c = void 0, a = 0;
function d(i2) {
  if (void 0 !== o) {
    var t2 = i2.n;
    if (void 0 === t2 || t2.t !== o) {
      t2 = { i: 0, S: i2, p: o.s, n: void 0, t: o, e: void 0, x: void 0, r: t2 };
      if (void 0 !== o.s) o.s.n = t2;
      o.s = t2;
      i2.n = t2;
      if (32 & o.f) i2.S(t2);
      return t2;
    } else if (-1 === t2.i) {
      t2.i = 0;
      if (void 0 !== t2.n) {
        t2.n.p = t2.p;
        if (void 0 !== t2.p) t2.p.n = t2.n;
        t2.p = o.s;
        t2.n = void 0;
        o.s.n = t2;
        o.s = t2;
      }
      return t2;
    }
  }
}
function l(i2, t2) {
  this.v = i2;
  this.i = 0;
  this.n = void 0;
  this.t = void 0;
  this.l = 0;
  this.W = null == t2 ? void 0 : t2.watched;
  this.Z = null == t2 ? void 0 : t2.unwatched;
  this.name = null == t2 ? void 0 : t2.name;
}
l.prototype.brand = i;
l.prototype.h = function() {
  return true;
};
l.prototype.S = function(i2) {
  var t2 = this, r2 = this.t;
  if (r2 !== i2 && void 0 === i2.e) {
    i2.x = r2;
    this.t = i2;
    if (void 0 !== r2) r2.e = i2;
    else f(function() {
      var i3;
      null == (i3 = t2.W) || i3.call(t2);
    });
  }
};
l.prototype.U = function(i2) {
  var t2 = this;
  if (void 0 !== this.t) {
    var r2 = i2.e, n2 = i2.x;
    if (void 0 !== r2) {
      r2.x = n2;
      i2.e = void 0;
    }
    if (void 0 !== n2) {
      n2.e = r2;
      i2.x = void 0;
    }
    if (i2 === this.t) {
      this.t = n2;
      if (void 0 === n2) f(function() {
        var i3;
        null == (i3 = t2.Z) || i3.call(t2);
      });
    }
  }
};
l.prototype.subscribe = function(i2) {
  var t2 = this;
  return x(function() {
    var r2 = t2.value;
    f(function() {
      return i2(r2);
    });
  }, { name: "sub" });
};
l.prototype.valueOf = function() {
  return this.value;
};
l.prototype.toString = function() {
  return this.value + "";
};
l.prototype.toJSON = function() {
  return this.value;
};
l.prototype.peek = function() {
  var i2 = this;
  return f(function() {
    return i2.value;
  });
};
Object.defineProperty(l.prototype, "value", { get: function() {
  var i2 = d(this);
  if (void 0 !== i2) i2.i = this.i;
  return this.v;
}, set: function(i2) {
  if (i2 !== this.v) {
    if (s > 100) throw new Error("Cycle detected");
    !(function(i3) {
      if (0 !== v && 0 === s) {
        if (i3.l !== u) {
          i3.l = u;
          c = { S: i3, v: i3.v, i: i3.i, o: c };
        }
      }
    })(this);
    this.v = i2;
    this.i++;
    a++;
    v++;
    try {
      for (var r2 = this.t; void 0 !== r2; r2 = r2.x) r2.t.N();
    } finally {
      t();
    }
  }
} });
function y$1(i2, t2) {
  return new l(i2, t2);
}
function w$1(i2) {
  for (var t2 = i2.s; void 0 !== t2; t2 = t2.n) if (t2.S.i !== t2.i || !t2.S.h() || t2.S.i !== t2.i) return true;
  return false;
}
function b$1(i2) {
  for (var t2 = i2.s; void 0 !== t2; t2 = t2.n) {
    var r2 = t2.S.n;
    if (void 0 !== r2) t2.r = r2;
    t2.S.n = t2;
    t2.i = -1;
    if (void 0 === t2.n) {
      i2.s = t2;
      break;
    }
  }
}
function _(i2) {
  var t2 = i2.s, r2 = void 0;
  while (void 0 !== t2) {
    var n2 = t2.p;
    if (-1 === t2.i) {
      t2.S.U(t2);
      if (void 0 !== n2) n2.n = t2.n;
      if (void 0 !== t2.n) t2.n.p = n2;
    } else r2 = t2;
    t2.S.n = t2.r;
    if (void 0 !== t2.r) t2.r = void 0;
    t2 = n2;
  }
  i2.s = r2;
}
function j(i2, t2) {
  l.call(this, void 0, t2);
  this.x = i2;
  this.s = void 0;
  this.g = a - 1;
  this.f = 4;
}
j.prototype = new l();
j.prototype.h = function() {
  this.f &= -3;
  if (1 & this.f) return false;
  if (32 == (36 & this.f)) return true;
  this.f &= -5;
  if (this.g === a) return true;
  this.g = a;
  this.f |= 1;
  if (this.i > 0 && !w$1(this)) {
    this.f &= -2;
    return true;
  }
  var i2 = o;
  try {
    b$1(this);
    o = this;
    var t2 = this.x();
    if (16 & this.f || this.v !== t2 || 0 === this.i) {
      this.v = t2;
      this.f &= -17;
      this.i++;
    }
  } catch (i3) {
    this.v = i3;
    this.f |= 16;
    this.i++;
  }
  o = i2;
  _(this);
  this.f &= -2;
  return true;
};
j.prototype.S = function(i2) {
  if (void 0 === this.t) {
    this.f |= 36;
    for (var t2 = this.s; void 0 !== t2; t2 = t2.n) t2.S.S(t2);
  }
  l.prototype.S.call(this, i2);
};
j.prototype.U = function(i2) {
  if (void 0 !== this.t) {
    l.prototype.U.call(this, i2);
    if (void 0 === this.t) {
      this.f &= -33;
      for (var t2 = this.s; void 0 !== t2; t2 = t2.n) t2.S.U(t2);
    }
  }
};
j.prototype.N = function() {
  if (!(2 & this.f)) {
    this.f |= 6;
    for (var i2 = this.t; void 0 !== i2; i2 = i2.x) i2.t.N();
  }
};
Object.defineProperty(j.prototype, "value", { get: function() {
  if (1 & this.f) throw new Error("Cycle detected");
  var i2 = d(this);
  this.h();
  if (void 0 !== i2) i2.i = this.i;
  if (16 & this.f) throw this.v;
  return this.v;
} });
function O(i2, t2) {
  return new j(i2, t2);
}
function p$1(i2) {
  var r2 = i2.j;
  i2.j = void 0;
  if ("function" == typeof r2) {
    v++;
    var n2 = o;
    o = void 0;
    try {
      r2();
    } catch (t2) {
      i2.f &= -2;
      i2.f |= 8;
      g$1(i2);
      throw t2;
    } finally {
      o = n2;
      t();
    }
  }
}
function g$1(i2) {
  for (var t2 = i2.s; void 0 !== t2; t2 = t2.n) t2.S.U(t2);
  i2.x = void 0;
  i2.s = void 0;
  p$1(i2);
}
function S(i2) {
  if (o !== this) throw new Error("Out-of-order effect");
  _(this);
  o = i2;
  this.f &= -2;
  try {
    if (8 & this.f) g$1(this);
  } finally {
    t();
  }
}
function m$1(i2, t2) {
  this.x = i2;
  this.j = void 0;
  this.s = void 0;
  this.u = void 0;
  this.f = 32;
  this.name = null == t2 ? void 0 : t2.name;
  if (n) n.push(this);
}
m$1.prototype.c = function() {
  var i2 = this.S();
  try {
    if (8 & this.f) return;
    if (void 0 === this.x) return;
    var t2 = this.x();
    if ("function" == typeof t2) this.j = t2;
  } finally {
    i2();
  }
};
m$1.prototype.S = function() {
  if (1 & this.f) throw new Error("Cycle detected");
  this.f |= 1;
  this.f &= -9;
  p$1(this);
  b$1(this);
  v++;
  var i2 = o;
  o = this;
  return S.bind(this, i2);
};
m$1.prototype.N = function() {
  if (!(2 & this.f)) {
    this.f |= 2;
    this.u = h$1;
    h$1 = this;
  }
};
m$1.prototype.d = function() {
  this.f |= 8;
  if (!(1 & this.f)) g$1(this);
};
m$1.prototype.dispose = function() {
  this.d();
};
function x(i2, t2) {
  var r2 = new m$1(i2, t2);
  try {
    r2.c();
  } catch (i3) {
    r2.d();
    throw i3;
  }
  var n2 = r2.d.bind(r2);
  n2[Symbol.dispose] = n2;
  return n2;
}
var h, p, m = "undefined" != typeof window && !!window.__PREACT_SIGNALS_DEVTOOLS__, g = [];
x(function() {
  h = this.N;
})();
function b(i2, n2) {
  l$2[i2] = n2.bind(null, l$2[i2] || function() {
  });
}
function y(i2) {
  if (p) {
    var n2 = p;
    p = void 0;
    n2();
  }
  p = i2 && i2.S();
}
function w(i2) {
  var n2 = this, r2 = i2.data, t2 = useSignal(r2);
  t2.name = "ReactiveDom";
  t2.value = r2;
  var e2 = T(function() {
    var i3 = n2, r3 = n2.__v;
    while (r3 = r3.__) if (r3.__c) {
      r3.__c.__$f |= 4;
      break;
    }
    var o2 = O(function() {
      var i4 = t2.value.value;
      return 0 === i4 ? 0 : true === i4 ? "" : i4 || "";
    }), e3 = O(function() {
      return !Array.isArray(o2.value) && !t$2(o2.value);
    }), u3 = x(function() {
      this.N = M;
      if (e3.value) {
        var n3 = o2.value;
        if (i3.__v && i3.__v.__e && 3 === i3.__v.__e.nodeType) i3.__v.__e.data = n3;
      }
    }), c3 = n2.__$u.d;
    n2.__$u.d = function() {
      u3();
      c3.call(this);
    };
    return [e3, o2];
  }, []), u2 = e2[0], c2 = e2[1];
  return u2.value ? c2.peek() : c2.value;
}
w.displayName = "ReactiveTextNode";
Object.defineProperties(l.prototype, { constructor: { configurable: true, value: k$2(S$1, null).constructor }, type: { configurable: true, value: w }, props: { configurable: true, get: function() {
  var i2 = this;
  return { data: { get value() {
    return i2.value;
  } } };
} }, __b: { configurable: true, value: 1 } });
b("__b", function(i2, n2) {
  y();
  if ("string" == typeof n2.type) {
    var r2, t2 = n2.props;
    for (var f2 in t2) if ("children" !== f2) {
      var o2 = t2[f2];
      if (o2 instanceof l) {
        if (!r2) n2.__np = r2 = {};
        r2[f2] = o2;
        t2[f2] = o2.peek();
      }
    }
  }
  i2(n2);
});
b("__r", function(i2, r2) {
  i2(r2);
  if (r2.type !== S$1) {
    y();
    var t2, f2 = r2.__c;
    if (f2) {
      f2.__$f &= -2;
      if (void 0 === (t2 = f2.__$u)) f2.__$u = t2 = (function(i3, n2) {
        var r3;
        x(function() {
          r3 = this;
        }, { name: n2 });
        r3.c = i3;
        return r3;
      })(/* @__PURE__ */ (function(i3) {
        return function() {
          var n2;
          if (m) null == (n2 = this.y) || n2.call(this);
          i3.__$f |= 1;
          i3.setState({});
        };
      })(f2), "function" == typeof r2.type ? r2.type.displayName || r2.type.name : "");
    }
    y(t2);
  }
});
b("__e", function(i2, n2, r2, t2) {
  y();
  i2(n2, r2, t2);
});
b("diffed", function(i2, n2) {
  y();
  var r2;
  if ("string" == typeof n2.type && (r2 = n2.__e)) {
    var t2 = n2.__np, f2 = n2.props, o2 = r2.U;
    if (o2) for (var e2 in o2) {
      var u2 = o2[e2];
      if (!(void 0 === u2 || t2 && e2 in t2)) {
        u2.d();
        o2[e2] = void 0;
      }
    }
    if (t2) {
      if (!o2) {
        o2 = {};
        r2.U = o2;
      }
      for (var a2 in t2) {
        var c2 = o2[a2], v2 = t2[a2];
        if (void 0 === c2) {
          c2 = k(r2, a2, v2, f2);
          o2[a2] = c2;
        } else c2.o(v2, f2);
      }
    }
  }
  i2(n2);
});
function k(i2, n2, r2, t2) {
  var f2 = n2 in i2 && void 0 === i2.ownerSVGElement, o2 = y$1(r2);
  return { o: function(i3, n3) {
    o2.value = i3;
    t2 = n3;
  }, d: x(function() {
    this.N = M;
    var r3 = o2.value.value;
    if (t2[n2] !== r3) {
      t2[n2] = r3;
      if (f2) i2[n2] = r3;
      else if (null != r3 && (false !== r3 || "-" === n2[4])) i2.setAttribute(n2, r3);
      else i2.removeAttribute(n2);
    }
  }) };
}
b("unmount", function(i2, n2) {
  if ("string" == typeof n2.type) {
    var r2 = n2.__e;
    if (r2) {
      var t2 = r2.U;
      if (t2) {
        r2.U = void 0;
        for (var f2 in t2) {
          var o2 = t2[f2];
          if (o2) o2.d();
        }
      }
    }
    var e2 = n2.__np;
    if (e2) {
      var u2 = n2.props;
      for (var a2 in e2) u2[a2] = e2[a2];
    }
    n2.__np = void 0;
  } else {
    var c2 = n2.__c;
    if (c2) {
      c2.__$f |= 8;
      var v2 = c2.__$u;
      if (v2) {
        c2.__$u = void 0;
        v2.d();
      }
    }
  }
  i2(n2);
});
b("__h", function(i2, n2, r2, t2) {
  if (t2 < 3) n2.__$f |= 2;
  i2(n2, r2, t2);
});
C$1.prototype.shouldComponentUpdate = function(i2, n2) {
  if (this.__R) return true;
  var r2 = this.__$u, t2 = r2 && void 0 !== r2.s;
  for (var f2 in n2) return true;
  if (this.__f || "boolean" == typeof this.u && true === this.u) {
    var o2 = 2 & this.__$f;
    if (!(t2 || o2 || 4 & this.__$f)) return true;
    if (1 & this.__$f) return true;
  } else {
    if (!(t2 || 4 & this.__$f)) return true;
    if (3 & this.__$f) return true;
  }
  for (var e2 in i2) if ("__source" !== e2 && i2[e2] !== this.props[e2]) return true;
  for (var u2 in this.props) if (!(u2 in i2)) return true;
  return false;
};
function useSignal(i2, n2) {
  return T(function() {
    return y$1(i2, n2);
  }, []);
}
var A = function(i2) {
  queueMicrotask(function() {
    queueMicrotask(i2);
  });
};
function F() {
  r(function() {
    var i2;
    while (i2 = g.shift()) h.call(i2);
  });
}
function M() {
  if (1 === g.push(this)) (l$2.requestAnimationFrame || A)(F);
}
function estimateTokens(text) {
  if (!text) return 0;
  let cjk = 0;
  let other = 0;
  for (let i2 = 0; i2 < text.length; i2++) {
    const c2 = text.charCodeAt(i2);
    if (c2 >= 12288 && c2 <= 40959 || c2 >= 44032 && c2 <= 55215 || c2 >= 65280 && c2 <= 65519 || c2 >= 63744 && c2 <= 64255) cjk++;
    else if (c2 > 32) other++;
  }
  return Math.ceil(cjk + other / 3.6);
}
function contentToText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((p2) => typeof p2 === "string" ? p2 : p2 && typeof p2 === "object" && "text" in p2 ? String(p2.text ?? "") : "").join("\n");
  }
  return content == null ? "" : String(content);
}
function looseNormalize(text) {
  return text.replace(/<[^>]{0,200}>/g, "").replace(/\{\{[^}]{0,200}\}\}/g, "").replace(/[\s　]+/g, "").toLowerCase();
}
function nonSpaceLength(text) {
  let n2 = 0;
  for (let i2 = 0; i2 < text.length; i2++) if (text.charCodeAt(i2) > 32) n2++;
  return n2;
}
function truncate(text, max) {
  const t2 = text.replace(/\s+/g, " ").trim();
  return t2.length > max ? `${t2.slice(0, max)}…` : t2;
}
function alignIdentifiers(chat, structured) {
  if (structured.length === chat.length) return structured.map((s2) => s2.identifier);
  const norm = structured.map((s2) => looseNormalize(contentToText(s2.content)).slice(0, 200));
  const out = [];
  let j2 = 0;
  for (const m2 of chat) {
    const target = looseNormalize(contentToText(m2.content)).slice(0, 200);
    let found = -1;
    for (let k2 = j2; k2 < Math.min(structured.length, j2 + 4); k2++) {
      if (norm[k2] === target || target.length > 20 && (norm[k2].startsWith(target.slice(0, 40)) || target.startsWith(norm[k2].slice(0, 40)))) {
        found = k2;
        break;
      }
    }
    if (found >= 0) {
      out.push(structured[found].identifier);
      j2 = found + 1;
    } else out.push(void 0);
  }
  return out;
}
const CATEGORY_META = {
  preset: { label: "预设", color: "#8b7cf6" },
  character: { label: "角色卡", color: "#f0a43a" },
  persona: { label: "用户设定", color: "#38b6e8" },
  wi_character: { label: "世界书·角色", color: "#2fbf8f" },
  wi_chat: { label: "世界书·聊天", color: "#7fd16b" },
  wi_persona: { label: "世界书·用户", color: "#5fc9c0" },
  wi_global: { label: "世界书·全局", color: "#e5484d" },
  wi_other: { label: "世界书·其他", color: "#4a9c7a" },
  chat_user: { label: "聊天·用户", color: "#9aa7b8" },
  chat_char: { label: "聊天·角色", color: "#c3ccd8" },
  extension: { label: "扩展注入", color: "#e86ab0" },
  unknown: { label: "未识别", color: "#666d78" }
};
const CATEGORY_ORDER = [
  "preset",
  "character",
  "persona",
  "wi_character",
  "wi_chat",
  "wi_persona",
  "wi_global",
  "wi_other",
  "extension",
  "chat_user",
  "chat_char",
  "unknown"
];
const ID_INFO = {
  worldInfoBefore: { category: "wi_other", label: "世界书（角色定义前）", kind: "marker" },
  worldInfoAfter: { category: "wi_other", label: "世界书（角色定义后）", kind: "marker" },
  charDescription: { category: "character", label: "角色描述", kind: "marker" },
  charPersonality: { category: "character", label: "角色性格", kind: "marker" },
  scenario: { category: "character", label: "场景", kind: "marker" },
  personaDescription: { category: "persona", label: "用户设定", kind: "marker" },
  newMainChat: { category: "preset", label: "新聊天提示", kind: "utility" },
  newChat: { category: "preset", label: "新示例对话提示", kind: "utility" },
  groupNudge: { category: "preset", label: "群聊提示", kind: "utility" },
  continueNudge: { category: "preset", label: "继续提示", kind: "utility" },
  impersonate: { category: "preset", label: "扮演用户提示", kind: "utility" },
  quietPrompt: { category: "extension", label: "后台生成提示（quiet）", kind: "utility" },
  bias: { category: "preset", label: "回复开头（bias）", kind: "utility" },
  continuePrefill: { category: "chat_char", label: "继续生成的前文", kind: "utility" },
  emptyUserMessageReplacement: { category: "preset", label: "空消息替代", kind: "utility" },
  authorsNote: { category: "extension", label: "作者注释", kind: "extension" },
  summary: { category: "extension", label: "总结（Summarize）", kind: "extension" },
  vectorsMemory: { category: "extension", label: "向量记忆", kind: "extension" },
  vectorsDataBank: { category: "extension", label: "向量资料库", kind: "extension" },
  smartContext: { category: "extension", label: "Smart Context", kind: "extension" }
};
function extensionPromptLabel(key) {
  if (key === "2_floating_prompt") return { category: "extension", label: "作者注释" };
  if (key === "1_memory") return { category: "extension", label: "总结（Summarize）" };
  if (key === "DEPTH_PROMPT") return { category: "character", label: "角色卡深度提示词" };
  if (key === "PERSONA_DESCRIPTION") return { category: "persona", label: "用户设定（按深度）" };
  if (key.startsWith("customDepthWI")) return { category: "wi_other", label: "世界书 @深度" };
  if (/vector/i.test(key)) return { category: "extension", label: `向量 · ${key}` };
  return { category: "extension", label: `扩展 · ${key}` };
}
function findRange(content, text) {
  const t2 = text.trim();
  if (t2.length < 2) return null;
  let i2 = content.indexOf(t2);
  if (i2 >= 0) return [i2, i2 + t2.length];
  if (t2.length > 60) {
    const firstLine = t2.split("\n").map((l2) => l2.trim()).find((l2) => l2.length >= 12 && !/[{<]/.test(l2));
    if (firstLine) {
      i2 = content.indexOf(firstLine);
      if (i2 >= 0) return [i2, Math.min(content.length, i2 + t2.length)];
    }
  }
  return null;
}
function paint(content, knowns) {
  const owner = new Int32Array(content.length).fill(-1);
  const order = knowns.map((k2, i2) => ({ k: k2, i: i2 })).sort((a2, b2) => b2.k.priority - a2.k.priority || b2.k.text.length - a2.k.text.length);
  for (const { k: k2, i: i2 } of order) {
    const r2 = findRange(content, k2.text);
    if (!r2) continue;
    for (let p2 = r2[0]; p2 < r2[1]; p2++) if (owner[p2] === -1) owner[p2] = i2;
  }
  return owner;
}
function segmentsFrom(content, owner, knowns, base) {
  const segs = [];
  let start2 = 0;
  for (let p2 = 1; p2 <= content.length; p2++) {
    if (p2 === content.length || owner[p2] !== owner[start2]) {
      const o2 = owner[start2];
      const k2 = o2 >= 0 ? knowns[o2] : void 0;
      const text = content.slice(start2, p2);
      if (k2 || nonSpaceLength(text) > 0) {
        segs.push({
          start: start2,
          end: p2,
          category: k2?.category ?? base.category,
          label: k2?.label ?? base.label,
          refKey: k2?.refKey ?? base.refKey,
          tokens: estimateTokens(text)
        });
      }
      start2 = p2;
    }
  }
  const merged = [];
  for (const s2 of segs) {
    const last = merged[merged.length - 1];
    if (last && last.label === s2.label && last.category === s2.category && last.refKey === s2.refKey) {
      last.end = s2.end;
      last.tokens += s2.tokens;
    } else merged.push({ ...s2 });
  }
  return merged;
}
function probes(text) {
  const n2 = looseNormalize(text);
  if (n2.length <= 16) return n2.length >= 2 ? [n2] : [];
  const mid = Math.floor(n2.length / 2);
  return [n2.slice(0, 16), n2.slice(mid - 8, mid + 8), n2.slice(-16)];
}
function similar(promptText, chatText) {
  const hay = looseNormalize(promptText);
  return probes(chatText).some((p2) => hay.includes(p2));
}
function attribute(input) {
  const presetById = new Map(input.presetPrompts.map((p2) => [p2.identifier, p2]));
  const knowns = [];
  for (const e2 of input.wiEntries) {
    if (e2.content.trim()) {
      knowns.push({ text: e2.content, category: e2.category, label: `${e2.book} · ${e2.title}`, refKey: e2.key, priority: 3, injection: true });
    }
  }
  for (const ep of input.extensionPrompts) {
    if (!ep.value.trim()) continue;
    if (ep.key.startsWith("customDepthWI")) {
      knowns.push({ text: ep.value, category: "wi_other", label: `世界书 @深度 ${ep.depth}`, priority: 1, injection: true });
      continue;
    }
    const { category, label } = extensionPromptLabel(ep.key);
    knowns.push({ text: ep.value, category, label, priority: 2, injection: ep.inChat });
  }
  for (const p2 of input.presetPrompts) {
    if (p2.absolute && !p2.marker && p2.content.trim()) {
      knowns.push({ text: p2.content, category: "preset", label: `${p2.name}（@深度 ${p2.depth}）`, refKey: p2.identifier, priority: 2, injection: true });
    }
  }
  if (input.card?.depthPrompt?.trim()) {
    knowns.push({ text: input.card.depthPrompt, category: "character", label: "角色卡深度提示词", priority: 2, injection: true });
  }
  if (!input.identifiers) {
    for (const p2 of input.presetPrompts) {
      if (!p2.absolute && !p2.marker && p2.content.trim()) {
        knowns.push({ text: p2.content, category: "preset", label: p2.name, refKey: p2.identifier, priority: 1, injection: false });
      }
    }
    if (input.persona.trim()) knowns.push({ text: input.persona, category: "persona", label: "用户设定", priority: 1, injection: false });
  }
  const draft = input.chat.map((m2, index) => {
    const content = contentToText(m2.content);
    const identifier = input.identifiers?.[index];
    const owner = paint(content, knowns);
    let injected = 0;
    for (let p2 = 0; p2 < content.length; p2++) {
      const o2 = owner[p2];
      if (o2 >= 0 && knowns[o2].injection && content.charCodeAt(p2) > 32) injected++;
    }
    const coverage = injected / Math.max(1, nonSpaceLength(content));
    return { index, role: m2.role, content, identifier, owner, coverage };
  });
  const bases = draft.map((d2) => {
    const id = d2.identifier;
    if (id === void 0) {
      if ((d2.role === "user" || d2.role === "assistant") && d2.coverage < 0.5) return "chat?";
      if (d2.coverage >= 0.5) return { kind: "injection", category: "unknown", label: "注入内容" };
      return { kind: "unknown", category: "unknown", label: "未识别" };
    }
    if (id.startsWith("chatHistory")) {
      const isChatRole = d2.role === "user" || d2.role === "assistant";
      return d2.coverage >= 0.5 || !isChatRole ? { kind: "injection", category: "unknown", label: "深度注入" } : "chat?";
    }
    if (id.startsWith("dialogueExamples")) return { kind: "marker", category: "character", label: "示例对话" };
    if (id === "main" && input.overridden.includes("main")) {
      return { kind: "prompt", category: "character", label: "角色卡系统提示词（覆盖了预设主提示词）" };
    }
    if (id === "jailbreak" && input.overridden.includes("jailbreak")) {
      return { kind: "prompt", category: "character", label: "角色卡后历史指令（覆盖了预设）" };
    }
    if (ID_INFO[id]) return { ...ID_INFO[id] };
    const p2 = presetById.get(id);
    if (p2) return { kind: "prompt", category: "preset", label: p2.name, refKey: p2.identifier };
    const ext = extensionPromptLabel(id);
    return { kind: "extension", category: ext.category, label: ext.label };
  });
  const chatSlots = bases.map((b2, i2) => b2 === "chat?" ? i2 : -1).filter((i2) => i2 >= 0);
  const floorOf = /* @__PURE__ */ new Map();
  const orphanSlots = /* @__PURE__ */ new Set();
  let ptr = input.chatMessages.length - 1;
  for (let s2 = chatSlots.length - 1; s2 >= 0; s2--) {
    const slot = chatSlots[s2];
    if (ptr < 0) {
      orphanSlots.add(slot);
      continue;
    }
    let found = -1;
    for (let k2 = ptr; k2 >= Math.max(0, ptr - 3); k2--) {
      if (similar(draft[slot].content, input.chatMessages[k2].text)) {
        found = k2;
        break;
      }
    }
    if (found < 0 && s2 + 1 > ptr + 1) {
      orphanSlots.add(slot);
      continue;
    }
    const pick = found >= 0 ? found : ptr;
    floorOf.set(slot, input.chatMessages[pick]);
    ptr = pick - 1;
  }
  const messages = draft.map((d2, i2) => {
    let base = bases[i2];
    let chatIndex;
    if (base === "chat?" && orphanSlots.has(i2)) {
      base = { kind: "injection", category: "unknown", label: "没对上楼层的消息" };
    }
    if (base === "chat?") {
      const floor = floorOf.get(i2);
      chatIndex = floor?.index;
      const isUser = floor ? floor.isUser : d2.role === "user";
      base = {
        kind: "chat",
        category: isUser ? "chat_user" : "chat_char",
        label: floor ? `#${floor.index} ${floor.name}` : d2.role === "user" ? "用户消息" : "角色消息"
      };
    }
    const segments = segmentsFrom(d2.content, d2.owner, knowns, base);
    if (base.kind === "injection" && segments.length) {
      const top = [...segments].sort((a2, b2) => b2.tokens - a2.tokens)[0];
      base = { ...base, category: top.category, label: top.label };
    }
    return {
      index: i2,
      role: d2.role,
      content: d2.content,
      identifier: d2.identifier,
      kind: base.kind,
      category: base.category,
      label: base.label,
      chatIndex,
      segments,
      tokens: segments.reduce((n2, s2) => n2 + s2.tokens, 0)
    };
  });
  let after = 0;
  for (let i2 = messages.length - 1; i2 >= 0; i2--) {
    const m2 = messages[i2];
    if (m2.kind === "chat") after++;
    else if (m2.kind === "injection") m2.depth = after;
  }
  const totals = Object.fromEntries(CATEGORY_ORDER.map((c2) => [c2, 0]));
  for (const m2 of messages) for (const s2 of m2.segments) totals[s2.category] += s2.tokens;
  const totalTokens = messages.reduce((n2, m2) => n2 + m2.tokens, 0);
  return { messages, totals, totalTokens, aligned: input.identifiers !== null };
}
const captures = y$1([]);
const MAX_CAPTURES = 40;
let nextId = 1;
let pendingWI = [];
let lastGen = { type: "normal", quiet: false };
const GEN_LABELS = {
  normal: "正常发送",
  swipe: "重新生成（滑动）",
  regenerate: "重新生成",
  continue: "继续",
  impersonate: "扮演用户",
  quiet: "后台生成",
  preview: "预览（未发送）",
  ask_command: "/ask"
};
function currentBookScopes() {
  const c2 = ctx();
  const wi = loaded.worldInfo;
  const char = currentCharacter();
  const character = /* @__PURE__ */ new Set();
  if (char) {
    const linked = char.data?.extensions?.world;
    if (linked) character.add(linked);
    const extra = wi?.world_info?.charLore?.find((e2) => e2.name === charaFileName(char.avatar));
    for (const b2 of extra?.extraBooks ?? []) character.add(b2);
  }
  const chatBook = c2.chatMetadata?.world_info;
  const personaBook = c2.powerUserSettings?.persona_description_lorebook;
  return {
    global: new Set(wi?.selected_world_info ?? []),
    character,
    chat: new Set(chatBook ? [chatBook] : []),
    persona: new Set(personaBook ? [personaBook] : [])
  };
}
function bookCategory(book, scopes) {
  if (scopes.chat.has(book)) return "wi_chat";
  if (scopes.character.has(book)) return "wi_character";
  if (scopes.persona.has(book)) return "wi_persona";
  if (scopes.global.has(book)) return "wi_global";
  return "wi_other";
}
function keyMatches(key, haystack) {
  const m2 = key.match(/^\/([\s\S]+)\/([a-z]*)$/i);
  if (m2) {
    try {
      return new RegExp(m2[1], m2[2].replace(/g/g, "")).test(haystack);
    } catch {
      return false;
    }
  }
  return haystack.toLowerCase().includes(key.toLowerCase());
}
function collectWI(entries, scopes, chat) {
  const depth = Number(loaded.worldInfo?.world_info_depth ?? 2);
  return entries.map((e2) => {
    const scanDepth = typeof e2.scanDepth === "number" ? e2.scanDepth : depth;
    const recent = chat.filter((m2) => !m2.is_system).slice(-Math.max(1, scanDepth)).map((m2) => m2.mes ?? "").join("\n");
    const keys = Array.isArray(e2.key) ? e2.key.filter(Boolean) : [];
    const book = String(e2.world ?? "");
    return {
      key: `${book}:${e2.uid}`,
      uid: String(e2.uid),
      book,
      title: e2.comment || keys.slice(0, 3).join(", ") || `#${e2.uid}`,
      content: substitute(String(e2.content ?? "")),
      category: bookCategory(book, scopes),
      position: typeof e2.position === "number" ? e2.position : void 0,
      depth: typeof e2.depth === "number" ? e2.depth : void 0,
      keys,
      matchedKeys: keys.filter((k2) => keyMatches(k2, recent)),
      constant: !!e2.constant,
      order: Number(e2.order ?? 100)
    };
  });
}
function flattenCollection(coll, out = []) {
  for (const item of coll?.collection ?? []) {
    if (Array.isArray(item?.collection)) flattenCollection(item, out);
    else if (item && (item.content || item.tool_calls)) out.push({ identifier: item.identifier, content: item.content });
  }
  return out;
}
function presetPrompts() {
  const pm = loaded.openai?.promptManager;
  const c2 = ctx();
  const list = c2.chatCompletionSettings?.prompts ?? [];
  const prompts = [];
  for (const p2 of list) {
    if (!p2?.identifier) continue;
    let enabled = true;
    try {
      if (pm?.activeCharacter) enabled = pm.getPromptOrderEntry(pm.activeCharacter, p2.identifier)?.enabled ?? false;
    } catch {
    }
    if (!enabled) continue;
    prompts.push({
      identifier: p2.identifier,
      name: p2.name || p2.identifier,
      content: substitute(String(p2.content ?? "")),
      marker: !!p2.marker,
      absolute: Number(p2.injection_position) === 1,
      depth: Number(p2.injection_depth ?? 4)
    });
  }
  return { prompts, overridden: Array.isArray(pm?.overriddenPrompts) ? pm.overriddenPrompts : [] };
}
function extensionPrompts() {
  const eps = ctx().extensionPrompts ?? {};
  return Object.entries(eps).filter(([, v2]) => v2 && typeof v2.value === "string" && v2.value.trim()).map(([key, v2]) => ({ key, value: substitute(v2.value), inChat: Number(v2.position) === 1, depth: Number(v2.depth ?? 0) }));
}
function presetName() {
  try {
    return ctx().getPresetManager()?.getSelectedPresetName?.() ?? "";
  } catch {
    return "";
  }
}
function buildCapture(chatOut, structured, wiRaw, gen) {
  const c2 = ctx();
  const char = currentCharacter();
  const scopes = currentBookScopes();
  const chat = c2.chat ?? [];
  const wi = collectWI(wiRaw, scopes, chat);
  const { prompts, overridden } = presetPrompts();
  const chatMessages = chat.map((m2, index) => ({ index, isUser: !!m2.is_user, name: String(m2.name ?? ""), text: String(m2.mes ?? ""), sys: !!m2.is_system })).filter((m2) => !m2.sys).map(({ sys: _sys, ...m2 }) => m2);
  const result = attribute({
    chat: chatOut,
    identifiers: structured.length ? alignIdentifiers(chatOut, structured) : null,
    presetPrompts: prompts,
    overridden,
    wiEntries: wi,
    extensionPrompts: extensionPrompts(),
    chatMessages,
    card: char ? { name: char.name, depthPrompt: substitute(char.data?.extensions?.depth_prompt?.prompt ?? "") } : null,
    persona: substitute(c2.powerUserSettings?.persona_description ?? "")
  });
  const type = gen.quiet ? "quiet" : gen.type;
  const targetFloor = type === "quiet" || type === "impersonate" ? null : ["swipe", "regenerate", "continue"].includes(type) ? chat.length - 1 : chat.length;
  return {
    id: nextId++,
    time: /* @__PURE__ */ new Date(),
    chatId: String(c2.getCurrentChatId?.() ?? ""),
    genType: type,
    genTypeLabel: GEN_LABELS[type] ?? type,
    targetFloor,
    presetName: presetName(),
    cardName: char?.name ?? (c2.groupId ? "群聊" : ""),
    result,
    wi,
    rawChat: chatOut.map((m2) => ({ role: String(m2.role), content: contentToText(m2.content) }))
  };
}
let previewing = false;
const previewBusy = y$1(false);
async function previewNextPrompt() {
  if (previewBusy.value) return false;
  previewBusy.value = true;
  previewing = true;
  const before = captures.value[0]?.id;
  try {
    await ctx().generate("normal", {}, true);
    await new Promise((r2) => setTimeout(r2, 50));
    return captures.value[0]?.id !== before;
  } catch (e2) {
    console.error("[RedBird] preview failed", e2);
    return false;
  } finally {
    previewing = false;
    previewBusy.value = false;
  }
}
function installFlowCapture() {
  const c2 = ctx();
  const es = c2.eventSource;
  const et = c2.eventTypes;
  es.on(et.GENERATION_STARTED, (type, params, dryRun) => {
    if (dryRun) return;
    lastGen = { type: type || "normal", quiet: !!params?.quiet_prompt };
    pendingWI = [];
  });
  es.on(et.WORLD_INFO_ACTIVATED, (entries) => {
    pendingWI = Array.isArray(entries) ? [...entries] : [];
  });
  const onPromptReady = (data) => {
    if (!data || !Array.isArray(data.chat)) return;
    if (data.dryRun && !previewing) return;
    const chatOut = data.chat.map((m2) => ({ role: m2.role, content: m2.content }));
    const structured = flattenCollection(loaded.openai?.promptManager?.messages);
    const wiRaw = pendingWI;
    const gen = data.dryRun ? { type: "preview", quiet: false } : lastGen;
    pendingWI = [];
    setTimeout(() => {
      try {
        const cap = buildCapture(chatOut, structured, wiRaw, gen);
        captures.value = [cap, ...captures.value].slice(0, MAX_CAPTURES);
      } catch (e2) {
        console.error("[RedBird] failed to analyse prompt", e2);
      }
    }, 0);
  };
  if (typeof es.makeLast === "function") es.makeLast(et.CHAT_COMPLETION_PROMPT_READY, onPromptReady);
  else es.on(et.CHAT_COMPLETION_PROMPT_READY, onPromptReady);
}
const RX = { GLOBAL: 0, SCOPED: 1, PRESET: 2 };
function regexEffectLabel(r2) {
  return [r2.markdownOnly ? "仅显示" : "", r2.promptOnly ? "仅提示词" : ""].filter(Boolean).join(" + ") || "修改楼层";
}
async function setRegexEnabled(type, id, on) {
  const re = loaded.regexEngine;
  if (!re) throw new Error("regex engine not loaded");
  const list = re.getScriptsByType(type) ?? [];
  if (!list.some((s2) => s2.id === id)) {
    toast("error", '没找到这条正则，可能已经被改名或删除。请点"刷新"。');
    return;
  }
  const next = list.map((s2) => s2.id === id ? { ...s2, disabled: !on } : s2);
  await re.saveScriptsByType(next, type);
  saveSettings();
  if (ctx().getCurrentChatId?.()) await ctx().reloadCurrentChat();
}
async function setRegexGroupAllowed(type, on) {
  const re = loaded.regexEngine;
  if (!re) return;
  if (type === RX.PRESET) {
    const api = re.getCurrentPresetAPI();
    const name = re.getCurrentPresetName();
    if (on) re.allowPresetScripts(api, name);
    else re.disallowPresetScripts(api, name);
  } else if (type === RX.SCOPED) {
    const char = currentCharacter();
    if (on) re.allowScopedScripts(char);
    else re.disallowScopedScripts(char);
  }
  saveSettings();
  if (ctx().getCurrentChatId?.()) await ctx().reloadCurrentChat();
}
function regexSubItems(type, scripts) {
  return scripts.map((r2, i2) => ({
    id: String(r2.id ?? i2),
    name: r2.scriptName || "(未命名正则)",
    detail: regexEffectLabel(r2),
    enabled: !r2.disabled,
    toggle: (on) => setRegexEnabled(type, r2.id, on)
  }));
}
const envReport = y$1(null);
function thScripts(node, out = []) {
  if (!node) return out;
  if (Array.isArray(node) && node.every((x2) => Array.isArray(x2) && x2.length === 2 && typeof x2[0] === "string")) {
    return thScripts(Object.fromEntries(node), out);
  }
  if (Array.isArray(node)) {
    for (const x2 of node) thScripts(x2, out);
    return out;
  }
  if (typeof node !== "object") return out;
  const v2 = node.value && typeof node.value === "object" ? node.value : node;
  if (typeof v2.content === "string" && (typeof v2.name === "string" || node.type === "script")) {
    out.push({ name: v2.name || "(未命名脚本)", enabled: v2.enabled !== false });
    return out;
  }
  for (const key of ["scripts", "value", "children", "items"]) if (key in v2) thScripts(v2[key], out);
  return out;
}
function presetInfo() {
  const re = loaded.regexEngine;
  let api = "";
  let name = "";
  let regex = [];
  let th = null;
  try {
    api = re?.getCurrentPresetAPI?.() ?? ctx().mainApi ?? "";
    name = re?.getCurrentPresetName?.() ?? ctx().getPresetManager()?.getSelectedPresetName?.() ?? "";
    const pm = ctx().getPresetManager();
    regex = pm?.readPresetExtensionField?.({ path: "regex_scripts" }) ?? [];
    th = pm?.readPresetExtensionField?.({ path: "tavern_helper" }) ?? null;
  } catch {
  }
  return { api, name, regex: Array.isArray(regex) ? regex : [], th };
}
function enabledThirdPartyExtensions() {
  const names = loaded.extensions?.extensionNames ?? [];
  const disabled = ctx().extensionSettings?.disabledExtensions ?? [];
  return names.filter((n2) => n2.startsWith("third-party/") && !disabled.includes(n2)).map((n2) => n2.replace("third-party/", ""));
}
function buildEnvReport() {
  const c2 = ctx();
  const es = c2.extensionSettings ?? {};
  const char = currentCharacter();
  const avatar = char?.avatar ?? "";
  const scopes = currentBookScopes();
  const items = [];
  for (const name of scopes.global) {
    items.push({
      id: `wb:g:${name}`,
      scope: "global",
      kind: "worldbook",
      name,
      enabled: true,
      leaks: !scopes.character.has(name) && !scopes.chat.has(name),
      detail: scopes.character.has(name) ? "同时也是这张卡的世界书" : "对所有卡生效",
      toggle: async (on) => runSlash(`/world state=${on ? "on" : "off"} silent=true ${slashQuote(name)}`)
    });
  }
  for (const r2 of es.regex ?? []) {
    items.push({
      id: `rx:g:${r2.id ?? r2.scriptName}`,
      scope: "global",
      kind: "regex",
      name: r2.scriptName || "(未命名正则)",
      enabled: !r2.disabled,
      leaks: !r2.disabled,
      detail: regexEffectLabel(r2),
      toggle: (on) => setRegexEnabled(RX.GLOBAL, r2.id, on)
    });
  }
  const thSettings = es.tavern_helper?.script;
  const thGlobal = thScripts(thSettings?.scripts);
  if (thGlobal.length) {
    const on = thSettings?.enabled?.global !== false;
    items.push({
      id: "th:g",
      scope: "global",
      kind: "script",
      name: `酒馆助手全局脚本 ${thGlobal.length} 个`,
      enabled: on,
      leaks: on && thGlobal.some((s2) => s2.enabled),
      children: thGlobal.map((s2) => `${s2.enabled ? "●" : "○"} ${s2.name}`)
    });
  }
  const exts = enabledThirdPartyExtensions();
  if (exts.length) {
    items.push({
      id: "ext",
      scope: "global",
      kind: "extension",
      name: `已启用的第三方扩展 ${exts.length} 个`,
      enabled: true,
      leaks: false,
      detail: "扩展对所有卡生效，关闭需要刷新页面，这里只做提醒",
      children: exts
    });
  }
  const preset = presetInfo();
  if (preset.name) {
    items.push({ id: "preset", scope: "preset", kind: "preset", name: preset.name, enabled: true, leaks: false, detail: `API：${preset.api}` });
  }
  if (preset.regex.length) {
    const allowed = (es.preset_allowed_regex?.[preset.api] ?? []).includes(preset.name);
    const active = preset.regex.filter((r2) => !r2.disabled);
    items.push({
      id: "rx:p",
      scope: "preset",
      kind: "regex",
      name: `预设正则 ${preset.regex.length} 条（启用 ${active.length}）`,
      enabled: allowed,
      leaks: allowed && active.length > 0,
      detail: allowed ? "只要用这个预设，玩哪张卡都会生效。总开关 = 是否允许这个预设的正则运行" : "这个预设的正则未被允许运行",
      toggle: (on) => setRegexGroupAllowed(RX.PRESET, on),
      subItems: regexSubItems(RX.PRESET, preset.regex)
    });
  }
  const thPreset = thScripts(preset.th);
  if (thPreset.length) {
    const on = (thSettings?.enabled?.presets ?? []).includes(preset.name);
    items.push({
      id: "th:p",
      scope: "preset",
      kind: "script",
      name: `预设脚本（酒馆助手）${thPreset.length} 个`,
      enabled: on,
      leaks: on,
      detail: on ? "只要用这个预设，玩哪张卡都会运行" : "未启用",
      children: thPreset.map((s2) => `${s2.enabled ? "●" : "○"} ${s2.name}`)
    });
  }
  if (char) {
    for (const name of scopes.character) {
      items.push({ id: `wb:c:${name}`, scope: "character", kind: "worldbook", name, enabled: true, leaks: false, detail: name === char.data?.extensions?.world ? "主世界书" : "附加世界书" });
    }
    const cardRegex = char.data?.extensions?.regex_scripts ?? [];
    if (cardRegex.length) {
      const allowed = (es.character_allowed_regex ?? []).includes(avatar);
      const activeCard = cardRegex.filter((r2) => !r2.disabled).length;
      items.push({
        id: "rx:c",
        scope: "character",
        kind: "regex",
        name: `卡内正则 ${cardRegex.length} 条（启用 ${activeCard}）`,
        enabled: allowed,
        leaks: false,
        detail: allowed ? "总开关 = 是否允许这张卡的正则运行" : "未允许运行（卡里的正则不会生效）",
        toggle: (on) => setRegexGroupAllowed(RX.SCOPED, on),
        subItems: regexSubItems(RX.SCOPED, cardRegex)
      });
    }
    const thChar = thScripts(char.data?.extensions?.tavern_helper ?? char.data?.extensions?.TavernHelper_scripts);
    if (thChar.length) {
      const on = (thSettings?.enabled?.characters ?? []).includes(char.name);
      items.push({
        id: "th:c",
        scope: "character",
        kind: "script",
        name: `角色脚本（酒馆助手）${thChar.length} 个`,
        enabled: on,
        leaks: false,
        detail: on ? "已启用" : "未启用（卡里的脚本不会运行）",
        children: thChar.map((s2) => `${s2.enabled ? "●" : "○"} ${s2.name}`)
      });
    }
  }
  for (const name of scopes.chat) items.push({ id: `wb:chat:${name}`, scope: "chat", kind: "worldbook", name, enabled: true, leaks: false, detail: "绑定到当前聊天" });
  for (const name of scopes.persona) items.push({ id: `wb:p:${name}`, scope: "persona", kind: "worldbook", name, enabled: true, leaks: true, detail: "绑定到用户设定，换卡后仍生效" });
  const profile = avatar ? settings().profiles[avatar] : void 0;
  const report = { cardName: char?.name ?? "", avatar, presetApi: preset.api, presetName: preset.name, items, profile, drift: null };
  report.drift = profile ? computeDrift(report, profile) : null;
  return report;
}
function currentSnapshot(report) {
  return {
    globalWorlds: report.items.filter((i2) => i2.scope === "global" && i2.kind === "worldbook").map((i2) => i2.name),
    globalRegexEnabled: report.items.filter((i2) => i2.scope === "global" && i2.kind === "regex" && i2.enabled).map((i2) => i2.name),
    preset: report.presetName ? { api: report.presetApi, name: report.presetName } : void 0
  };
}
function computeDrift(report, profile) {
  const now = currentSnapshot(report);
  const allRegex = new Set(report.items.filter((i2) => i2.scope === "global" && i2.kind === "regex").map((i2) => i2.name));
  const drift = {
    worldsOn: profile.globalWorlds.filter((w2) => !now.globalWorlds.includes(w2)),
    worldsOff: now.globalWorlds.filter((w2) => !profile.globalWorlds.includes(w2)),
    regexOn: profile.globalRegexEnabled.filter((r2) => allRegex.has(r2) && !now.globalRegexEnabled.includes(r2)),
    regexOff: now.globalRegexEnabled.filter((r2) => !profile.globalRegexEnabled.includes(r2)),
    preset: profile.preset && profile.preset.api === report.presetApi && profile.preset.name !== report.presetName ? profile.preset.name : void 0,
    count: 0
  };
  drift.count = drift.worldsOn.length + drift.worldsOff.length + drift.regexOn.length + drift.regexOff.length + (drift.preset ? 1 : 0);
  return drift;
}
function refreshEnv() {
  const r2 = buildEnvReport();
  envReport.value = r2;
  return r2;
}
function rememberProfile() {
  const r2 = buildEnvReport();
  if (!r2.avatar) return;
  settings().profiles[r2.avatar] = { savedAt: (/* @__PURE__ */ new Date()).toISOString(), cardName: r2.cardName, ...currentSnapshot(r2) };
  saveSettings();
  refreshEnv();
  toast("success", `已记住「${r2.cardName}」现在的环境`);
}
function forgetProfile() {
  const r2 = envReport.value;
  if (!r2?.avatar) return;
  delete settings().profiles[r2.avatar];
  saveSettings();
  refreshEnv();
}
async function applyProfile() {
  const r2 = buildEnvReport();
  if (!r2.drift || !r2.profile) return;
  const d2 = r2.drift;
  if (d2.preset) await runSlash(`/preset ${slashQuote(d2.preset)}`);
  for (const w2 of d2.worldsOff) await runSlash(`/world state=off silent=true ${slashQuote(w2)}`);
  for (const w2 of d2.worldsOn) await runSlash(`/world state=on silent=true ${slashQuote(w2)}`);
  if (d2.regexOff.length || d2.regexOn.length) {
    const re = loaded.regexEngine;
    const list = re?.getScriptsByType(RX.GLOBAL) ?? [];
    const next = list.map((s2) => d2.regexOff.includes(s2.scriptName) ? { ...s2, disabled: true } : d2.regexOn.includes(s2.scriptName) ? { ...s2, disabled: false } : s2);
    await re?.saveScriptsByType(next, RX.GLOBAL);
    saveSettings();
    if (ctx().getCurrentChatId?.()) await ctx().reloadCurrentChat();
  }
  const after = refreshEnv();
  if (after.drift?.count) toast("warning", `还有 ${after.drift.count} 项没能恢复，请在面板里检查`);
  else toast("success", `已恢复「${r2.cardName}」记住的环境`);
}
let lastAvatar = null;
function installEnvWatch(openPanel2) {
  const c2 = ctx();
  const es = c2.eventSource;
  const et = c2.eventTypes;
  es.on(et.CHAT_CHANGED, () => {
    setTimeout(() => {
      const r2 = refreshEnv();
      if (!r2.avatar || r2.avatar === lastAvatar) return;
      lastAvatar = r2.avatar;
      if (!settings().toastOnCardSwitch) return;
      const open = { onclick: () => openPanel2("env"), timeOut: 8e3 };
      if (r2.drift?.count) {
        toast("warning", `「${r2.cardName}」的环境和上次记住的不一样（${r2.drift.count} 项）。点这里查看并一键恢复。`, "换卡体检", open);
        return;
      }
      if (r2.profile) return;
      const leaks = r2.items.filter((i2) => i2.leaks);
      if (leaks.length) {
        const books = leaks.filter((i2) => i2.kind === "worldbook").length;
        const rx = leaks.filter((i2) => i2.kind === "regex" && i2.scope === "global").length;
        const parts = [books && `全局世界书 ${books} 本`, rx && `全局正则 ${rx} 条`, leaks.some((i2) => i2.id === "rx:p") && "预设正则", leaks.some((i2) => i2.kind === "script") && "全局/预设脚本"].filter(Boolean);
        toast("info", `这张卡还没记住环境。当前对所有卡都生效的有：${parts.join("、")}。点这里查看。`, "换卡体检", open);
      }
    }, 600);
  });
  for (const ev of [et.WORLDINFO_SETTINGS_UPDATED, et.OAI_PRESET_CHANGED_AFTER, et.PRESET_CHANGED, et.SETTINGS_UPDATED]) {
    if (ev) es.on(ev, () => {
      if (envReport.value) refreshEnv();
    });
  }
}
function isPlainObject(v2) {
  return typeof v2 === "object" && v2 !== null && !Array.isArray(v2);
}
function isMvuPair(v2) {
  return Array.isArray(v2) && v2.length === 2 && typeof v2[1] === "string";
}
function flattenVars(root, prefix = "") {
  const out = /* @__PURE__ */ new Map();
  const rec = (v2, path) => {
    if (isMvuPair(v2)) {
      const [value, desc] = v2;
      if (isPlainObject(value)) rec(value, path);
      else out.set(path, { path, value, desc });
      return;
    }
    if (isPlainObject(v2)) {
      const keys = Object.keys(v2).filter((k2) => k2 !== "$meta");
      if (!keys.length && path) out.set(path, { path, value: {} });
      for (const k2 of keys) rec(v2[k2], path ? `${path}.${k2}` : k2);
      return;
    }
    if (path) out.set(path, { path, value: v2 });
  };
  rec(root, prefix);
  return out;
}
function same(a2, b2) {
  if (a2 === b2) return true;
  try {
    return JSON.stringify(a2) === JSON.stringify(b2);
  } catch {
    return false;
  }
}
function diffVars(before, after) {
  const a2 = flattenVars(before);
  const b2 = flattenVars(after);
  const changes = [];
  for (const [path, leaf] of b2) {
    const old = a2.get(path);
    if (!old) changes.push({ path, kind: "added", after: leaf.value, desc: leaf.desc });
    else if (!same(old.value, leaf.value)) changes.push({ path, kind: "changed", before: old.value, after: leaf.value, desc: leaf.desc ?? old.desc });
  }
  for (const [path, leaf] of a2) {
    if (!b2.has(path)) changes.push({ path, kind: "removed", before: leaf.value, desc: leaf.desc });
  }
  return changes;
}
function formatValue(v2, max = 120) {
  if (v2 === void 0) return "∅";
  if (typeof v2 === "string") return v2.length > max ? `${v2.slice(0, max)}…` : v2;
  let s2;
  try {
    s2 = JSON.stringify(v2);
  } catch {
    s2 = String(v2);
  }
  return s2.length > max ? `${s2.slice(0, max)}…` : s2;
}
function referenceTerms(path) {
  const parts = path.split(".");
  const terms = /* @__PURE__ */ new Set([path]);
  if (parts.length >= 2) terms.add(parts.slice(-2).join("."));
  const leaf = parts[parts.length - 1];
  const cjk = /[㐀-鿿]/.test(leaf);
  if (cjk && leaf.length >= 2 || leaf.length >= 6) terms.add(leaf);
  return [...terms];
}
const varsTick = y$1(0);
function messageVars(m2) {
  const v2 = m2?.variables;
  if (Array.isArray(v2)) {
    const sv = v2[Number(m2.swipe_id ?? 0)];
    return sv && typeof sv === "object" ? sv : null;
  }
  return v2 && typeof v2 === "object" ? v2 : null;
}
function collectFloors() {
  const chat = ctx().chat ?? [];
  const out = [];
  chat.forEach((m2, index) => {
    const vars = messageVars(m2);
    if (!vars || !Object.keys(vars).length) return;
    out.push({
      index,
      name: String(m2.name ?? ""),
      isUser: !!m2.is_user,
      vars,
      statData: vars.stat_data,
      hasDelta: vars.delta_data !== void 0 && vars.delta_data !== null
    });
  });
  return out;
}
function floorDiffs(floors) {
  return floors.map((floor, i2) => {
    const prev = i2 > 0 ? floors[i2 - 1] : null;
    const before = prev ? prev.statData ?? prev.vars : void 0;
    const after = floor.statData ?? floor.vars;
    return { floor, prev, changes: diffVars(before, after) };
  });
}
function chatLocalVars() {
  return ctx().chatMetadata?.variables ?? {};
}
let sourceCache = null;
async function loadTextSources(force = false) {
  const c2 = ctx();
  const chatId = String(c2.getCurrentChatId?.() ?? "");
  if (!force && sourceCache?.chatId === chatId) return sourceCache.sources;
  const scopes = currentBookScopes();
  const books = /* @__PURE__ */ new Set([...scopes.character, ...scopes.chat, ...scopes.persona, ...scopes.global]);
  const sources = [];
  for (const name of books) {
    try {
      const data = await c2.loadWorldInfo(name);
      for (const e2 of Object.values(data?.entries ?? {})) {
        if (e2.disable) continue;
        sources.push({ kind: "lorebook", label: `${name} · ${e2.comment || (e2.key ?? []).join(",") || `#${e2.uid}`}`, content: String(e2.content ?? "") });
      }
    } catch (err) {
      console.warn("[RedBird] loadWorldInfo failed", name, err);
    }
  }
  for (const p2 of c2.chatCompletionSettings?.prompts ?? []) {
    if (p2?.content) sources.push({ kind: "preset", label: `预设 · ${p2.name || p2.identifier}`, content: String(p2.content) });
  }
  sourceCache = { chatId, sources };
  return sources;
}
function findReferences(path, sources) {
  const terms = referenceTerms(path);
  const out = [];
  for (const s2 of sources) {
    const term = terms.find((t2) => s2.content.includes(t2));
    if (term) out.push({ source: s2, term });
  }
  return out;
}
function wholeTreeReaders(sources) {
  return sources.filter((s2) => /stat_data(?![.\w])|getvar\(\s*['"]stat_data['"]\s*\)/.test(s2.content));
}
function installVarsWatch() {
  const c2 = ctx();
  const es = c2.eventSource;
  const et = c2.eventTypes;
  const bump = () => {
    varsTick.value++;
  };
  for (const ev of [et.MESSAGE_RECEIVED, et.MESSAGE_UPDATED, et.MESSAGE_SWIPED, et.MESSAGE_DELETED, et.CHAT_CHANGED, et.MESSAGE_EDITED, et.GENERATION_ENDED]) {
    if (ev) es.on(ev, bump);
  }
  es.on(et.CHAT_CHANGED, () => {
    sourceCache = null;
  });
  for (const ev of ["mag_variable_update_ended", "mag_variable_updated"]) es.on(ev, bump);
}
function Chip(props) {
  return /* @__PURE__ */ u$2("span", { class: `rbt-chip ${props.class ?? ""}`, title: props.title, style: props.color ? { "--chip": props.color } : void 0, children: props.children });
}
function CategoryChip({ category, children }) {
  const meta = CATEGORY_META[category];
  return /* @__PURE__ */ u$2(Chip, { color: meta.color, children: children ?? meta.label });
}
function RoleBadge({ role }) {
  const label = role === "system" ? "SYS" : role === "user" ? "USER" : role === "assistant" ? "AI" : role.toUpperCase();
  return /* @__PURE__ */ u$2("span", { class: `rbt-role rbt-role-${role}`, children: label });
}
function fmtTokens(n2) {
  return n2 >= 1e4 ? `${(n2 / 1e3).toFixed(1)}k` : String(n2);
}
function StackBar({ totals, total }) {
  if (!total) return null;
  return /* @__PURE__ */ u$2("div", { class: "rbt-stackbar", children: CATEGORY_ORDER.filter((c2) => totals[c2] > 0).map((c2) => /* @__PURE__ */ u$2(
    "div",
    {
      class: "rbt-stackbar-seg",
      style: { width: `${totals[c2] / total * 100}%`, background: CATEGORY_META[c2].color },
      title: `${CATEGORY_META[c2].label}：约 ${totals[c2]} tokens（${(totals[c2] / total * 100).toFixed(1)}%）`
    },
    c2
  )) });
}
function Legend({ totals, total }) {
  return /* @__PURE__ */ u$2("div", { class: "rbt-legend", children: CATEGORY_ORDER.filter((c2) => totals[c2] > 0).map((c2) => /* @__PURE__ */ u$2("span", { class: "rbt-legend-item", children: [
    /* @__PURE__ */ u$2("i", { style: { background: CATEGORY_META[c2].color } }),
    CATEGORY_META[c2].label,
    " ",
    /* @__PURE__ */ u$2("b", { children: fmtTokens(totals[c2]) }),
    /* @__PURE__ */ u$2("small", { children: [
      (totals[c2] / total * 100).toFixed(0),
      "%"
    ] })
  ] }, c2)) });
}
function Empty({ children }) {
  return /* @__PURE__ */ u$2("div", { class: "rbt-empty", children });
}
function Toggle({ checked, onChange, title }) {
  return /* @__PURE__ */ u$2("label", { class: "rbt-switch", title, children: [
    /* @__PURE__ */ u$2("input", { type: "checkbox", checked, onChange: (e2) => onChange(e2.currentTarget.checked) }),
    /* @__PURE__ */ u$2("span", {})
  ] });
}
const SCOPES = [
  { scope: "global", title: "全局", hint: "对所有卡都生效，最容易串味" },
  { scope: "preset", title: "预设", hint: "只要用这个预设就生效，换卡不会变" },
  { scope: "persona", title: "用户设定", hint: "跟着你的用户设定走，换卡不会变" },
  { scope: "character", title: "角色卡", hint: "跟着这张卡走，换卡时自动切换" },
  { scope: "chat", title: "聊天", hint: "只在这个聊天里生效" }
];
const KIND_LABEL$1 = {
  worldbook: "世界书",
  regex: "正则",
  script: "脚本",
  extension: "扩展",
  preset: "预设"
};
function ItemRow({ item }) {
  const [busy, setBusy] = d$1(false);
  const onToggle = async (on) => {
    if (!item.toggle) return;
    setBusy(true);
    try {
      await item.toggle(on);
    } finally {
      setBusy(false);
      refreshEnv();
    }
  };
  const body = /* @__PURE__ */ u$2("div", { class: `rbt-env-item ${item.enabled ? "" : "off"}`, children: [
    /* @__PURE__ */ u$2(Chip, { children: KIND_LABEL$1[item.kind] }),
    /* @__PURE__ */ u$2("span", { class: "rbt-env-name", children: item.name }),
    item.leaks && item.enabled && /* @__PURE__ */ u$2(Chip, { color: "#e5484d", title: "换卡后它还会继续生效", children: "会串味" }),
    item.detail && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: item.detail }),
    item.toggle && /* @__PURE__ */ u$2("span", { class: "rbt-env-toggle", children: [
      /* @__PURE__ */ u$2("small", { class: item.enabled ? "rbt-ok" : "rbt-muted", children: busy ? "…" : item.enabled ? "已开启" : "已关闭" }),
      /* @__PURE__ */ u$2(Toggle, { checked: item.enabled, onChange: onToggle, title: "点击开 / 关" })
    ] })
  ] });
  if (item.subItems?.length) {
    return /* @__PURE__ */ u$2("details", { class: "rbt-env-details", children: [
      /* @__PURE__ */ u$2("summary", { children: body }),
      /* @__PURE__ */ u$2(SubItemList, { items: item.subItems, groupOff: !item.enabled })
    ] });
  }
  if (!item.children?.length) return body;
  return /* @__PURE__ */ u$2("details", { class: "rbt-env-details", children: [
    /* @__PURE__ */ u$2("summary", { children: body }),
    /* @__PURE__ */ u$2("div", { class: "rbt-env-children", children: item.children.map((c2, i2) => /* @__PURE__ */ u$2("div", { children: c2 }, i2)) })
  ] });
}
function SubItemRow({ sub }) {
  const [busy, setBusy] = d$1(false);
  const onToggle = async (on) => {
    setBusy(true);
    try {
      await sub.toggle(on);
    } finally {
      setBusy(false);
      refreshEnv();
    }
  };
  return /* @__PURE__ */ u$2("div", { class: `rbt-sub-item ${sub.enabled ? "" : "off"}`, children: [
    /* @__PURE__ */ u$2("span", { class: "rbt-sub-name", children: sub.name }),
    sub.detail && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: sub.detail }),
    /* @__PURE__ */ u$2("span", { class: "rbt-env-toggle", children: [
      /* @__PURE__ */ u$2("small", { class: sub.enabled ? "rbt-ok" : "rbt-muted", children: busy ? "…" : sub.enabled ? "开" : "关" }),
      /* @__PURE__ */ u$2(Toggle, { checked: sub.enabled, onChange: onToggle, title: "点击开 / 关这一条" })
    ] })
  ] });
}
function SubItemList({ items, groupOff }) {
  const [filter, setFilter] = d$1("");
  const [onlyOn, setOnlyOn] = d$1(false);
  const shown = items.filter((s2) => (!filter || s2.name.includes(filter)) && (!onlyOn || s2.enabled));
  return /* @__PURE__ */ u$2("div", { class: "rbt-sub-list", children: [
    groupOff && /* @__PURE__ */ u$2("div", { class: "rbt-hint", children: '总开关是关的，下面这些即使显示"开"也不会运行。' }),
    items.length > 10 && /* @__PURE__ */ u$2("div", { class: "rbt-sub-tools", children: [
      /* @__PURE__ */ u$2("input", { class: "text_pole rbt-input", placeholder: "搜索正则名…", value: filter, onInput: (e2) => setFilter(e2.currentTarget.value) }),
      /* @__PURE__ */ u$2("label", { class: "rbt-check", children: [
        /* @__PURE__ */ u$2("input", { type: "checkbox", checked: onlyOn, onChange: (e2) => setOnlyOn(e2.currentTarget.checked) }),
        "只看开着的"
      ] })
    ] }),
    shown.map((s2) => /* @__PURE__ */ u$2(SubItemRow, { sub: s2 }, s2.id)),
    !shown.length && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "没有匹配的正则" })
  ] });
}
function EnvView() {
  const report = envReport.value;
  const [toastOn, setToastOn] = d$1(settings().toastOnCardSwitch);
  h$2(() => {
    refreshEnv();
  }, []);
  if (!report) return /* @__PURE__ */ u$2(Empty, { children: "正在读取…" });
  const { drift, profile } = report;
  return /* @__PURE__ */ u$2("div", { class: "rbt-env", children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-summary", children: [
      /* @__PURE__ */ u$2("div", { class: "rbt-summary-line", children: [
        "当前卡 ",
        /* @__PURE__ */ u$2("b", { children: report.cardName || "（未选择角色 / 群聊）" }),
        report.presetName && /* @__PURE__ */ u$2(S$1, { children: [
          " · 预设 ",
          /* @__PURE__ */ u$2("b", { children: report.presetName })
        ] }),
        /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small", onClick: () => refreshEnv(), children: "刷新" })
      ] }),
      report.avatar && /* @__PURE__ */ u$2("div", { class: "rbt-profile", children: profile ? /* @__PURE__ */ u$2(S$1, { children: [
        /* @__PURE__ */ u$2("div", { children: [
          "已记住这张卡的环境（",
          new Date(profile.savedAt).toLocaleString(),
          "）。",
          drift?.count ? /* @__PURE__ */ u$2("b", { class: "rbt-danger", children: [
            "和现在有 ",
            drift.count,
            " 处不同："
          ] }) : /* @__PURE__ */ u$2("span", { class: "rbt-ok", children: "和现在一致 ✓" })
        ] }),
        drift && drift.count > 0 && /* @__PURE__ */ u$2("ul", { class: "rbt-drift", children: [
          drift.preset && /* @__PURE__ */ u$2("li", { children: [
            "预设应为 ",
            /* @__PURE__ */ u$2("b", { children: drift.preset })
          ] }),
          drift.worldsOff.map((w2) => /* @__PURE__ */ u$2("li", { children: [
            "关闭全局世界书 ",
            /* @__PURE__ */ u$2("b", { children: w2 })
          ] }, `wo${w2}`)),
          drift.worldsOn.map((w2) => /* @__PURE__ */ u$2("li", { children: [
            "打开全局世界书 ",
            /* @__PURE__ */ u$2("b", { children: w2 })
          ] }, `wn${w2}`)),
          drift.regexOff.map((w2) => /* @__PURE__ */ u$2("li", { children: [
            "关闭全局正则 ",
            /* @__PURE__ */ u$2("b", { children: w2 })
          ] }, `ro${w2}`)),
          drift.regexOn.map((w2) => /* @__PURE__ */ u$2("li", { children: [
            "打开全局正则 ",
            /* @__PURE__ */ u$2("b", { children: w2 })
          ] }, `rn${w2}`))
        ] }),
        /* @__PURE__ */ u$2("div", { class: "rbt-row", children: [
          drift && drift.count > 0 && /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-primary", onClick: () => applyProfile(), children: "一键恢复" }),
          /* @__PURE__ */ u$2("button", { class: "rbt-btn", onClick: () => rememberProfile(), children: "用现在的环境覆盖" }),
          /* @__PURE__ */ u$2("button", { class: "rbt-btn", onClick: () => forgetProfile(), children: "忘掉" })
        ] })
      ] }) : /* @__PURE__ */ u$2(S$1, { children: [
        /* @__PURE__ */ u$2("div", { children: '还没记住这张卡的环境。先把下面的全局世界书、全局正则、预设调成这张卡需要的样子，再点"记住"。以后换回这张卡时，如果不一样会提醒你，并能一键恢复。' }),
        /* @__PURE__ */ u$2("div", { class: "rbt-row", children: /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-primary", onClick: () => rememberProfile(), children: "记住现在的环境" }) })
      ] }) }),
      /* @__PURE__ */ u$2("label", { class: "rbt-check", children: [
        /* @__PURE__ */ u$2("input", { type: "checkbox", checked: toastOn, onChange: (e2) => {
          const v2 = e2.currentTarget.checked;
          settings().toastOnCardSwitch = v2;
          saveSettings();
          setToastOn(v2);
        } }),
        "换卡时弹出提示"
      ] })
    ] }),
    SCOPES.map(({ scope, title, hint }) => {
      const items = report.items.filter((i2) => i2.scope === scope);
      if (!items.length) return null;
      return /* @__PURE__ */ u$2("div", { class: `rbt-env-scope rbt-scope-${scope}`, children: [
        /* @__PURE__ */ u$2("div", { class: "rbt-env-scope-head", children: [
          /* @__PURE__ */ u$2("b", { children: title }),
          " ",
          /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: hint })
        ] }),
        items.map((i2) => /* @__PURE__ */ u$2(ItemRow, { item: i2 }, i2.id))
      ] }, scope);
    })
  ] });
}
function PreviewButton({ onDone }) {
  return /* @__PURE__ */ u$2(
    "button",
    {
      class: "rbt-btn",
      disabled: previewBusy.value,
      title: "按酒馆的方式组装下一轮提示词，但不发送给 AI（不花钱，也不改聊天）",
      onClick: async () => {
        const ok = await previewNextPrompt();
        if (ok) onDone();
        else toast("warning", "没能生成预览。请确认选中了角色并使用 Chat Completion 模式。");
      },
      children: previewBusy.value ? "组装中…" : "预览下一轮（不发送）"
    }
  );
}
const WI_POSITION = {
  0: "角色定义前 ↑Char",
  1: "角色定义后 ↓Char",
  2: "作者注释前 ↑AN",
  3: "作者注释后 ↓AN",
  4: "按深度 @D",
  5: "示例对话前 ↑EM",
  6: "示例对话后 ↓EM",
  7: "出口 Outlet"
};
const KIND_LABEL = {
  prompt: "预设条目",
  marker: "占位符",
  chat: "聊天",
  injection: "深度注入",
  utility: "工具提示",
  extension: "扩展",
  unknown: "?"
};
function captureTitle(c2) {
  const t2 = c2.time.toLocaleTimeString();
  const floor = c2.targetFloor !== null ? `生成 #${c2.targetFloor}` : c2.genTypeLabel;
  return `${t2} · ${floor}${c2.targetFloor !== null && c2.genType !== "normal" ? `（${c2.genTypeLabel}）` : ""} · ~${fmtTokens(c2.result.totalTokens)} tokens`;
}
function SegmentedContent({ msg }) {
  const [full, setFull] = d$1(false);
  const LIMIT = 12e3;
  let used = 0;
  const parts = [];
  for (const [i2, s2] of msg.segments.entries()) {
    if (!full && used >= LIMIT) break;
    let text = msg.content.slice(s2.start, s2.end);
    if (!full && used + text.length > LIMIT) text = `${text.slice(0, LIMIT - used)}…`;
    used += text.length;
    const color = CATEGORY_META[s2.category].color;
    parts.push(
      /* @__PURE__ */ u$2("span", { class: "rbt-seg", style: { "--seg": color }, title: `${s2.label} · ~${s2.tokens} tokens`, children: text }, i2)
    );
  }
  return /* @__PURE__ */ u$2("div", { class: "rbt-content-wrap", children: [
    msg.segments.filter((s2) => s2.tokens > 0).length > 1 && /* @__PURE__ */ u$2("div", { class: "rbt-seglist", children: msg.segments.filter((s2) => s2.tokens > 0).map((s2, i2) => /* @__PURE__ */ u$2(CategoryChip, { category: s2.category, children: [
      s2.label,
      " · ",
      s2.tokens
    ] }, i2)) }),
    /* @__PURE__ */ u$2("pre", { class: "rbt-content", children: parts }),
    !full && msg.content.length > LIMIT && /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small", onClick: () => setFull(true), children: [
      "显示全部（",
      msg.content.length,
      " 字）"
    ] })
  ] });
}
function MessageRow({ msg }) {
  const [open, setOpen] = d$1(false);
  const color = CATEGORY_META[msg.category].color;
  const extraSources = new Set(msg.segments.filter((s2) => s2.tokens > 0).map((s2) => s2.label)).size - 1;
  return /* @__PURE__ */ u$2("div", { class: `rbt-msg ${open ? "open" : ""} rbt-kind-${msg.kind}`, style: { "--cat": color }, children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-msg-head", onClick: () => setOpen(!open), children: [
      /* @__PURE__ */ u$2("span", { class: "rbt-msg-idx", children: msg.index }),
      /* @__PURE__ */ u$2(RoleBadge, { role: msg.role }),
      /* @__PURE__ */ u$2("span", { class: "rbt-msg-label", children: msg.label }),
      msg.kind === "injection" && /* @__PURE__ */ u$2(Chip, { class: "rbt-chip-depth", children: [
        "深度 ",
        msg.depth
      ] }),
      msg.kind !== "chat" && msg.kind !== "injection" && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: KIND_LABEL[msg.kind] }),
      extraSources > 0 && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: [
        "+",
        extraSources,
        " 个来源"
      ] }),
      /* @__PURE__ */ u$2("span", { class: "rbt-msg-tokens", children: fmtTokens(msg.tokens) })
    ] }),
    !open && /* @__PURE__ */ u$2("div", { class: "rbt-msg-preview", children: truncate(msg.content, 140) }),
    open && /* @__PURE__ */ u$2(SegmentedContent, { msg })
  ] });
}
function groupRows(msgs) {
  const rows = [];
  for (const m2 of msgs) {
    const last = rows[rows.length - 1];
    if (m2.kind === "chat") {
      if (last?.type === "chat") last.msgs.push(m2);
      else rows.push({ type: "chat", msgs: [m2] });
    } else rows.push({ type: "msg", msg: m2 });
  }
  return rows;
}
function ChatGroup({ msgs }) {
  const [open, setOpen] = d$1(false);
  const floors = msgs.map((m2) => m2.chatIndex).filter((x2) => x2 !== void 0);
  const tokens = msgs.reduce((n2, m2) => n2 + m2.tokens, 0);
  const range = floors.length ? `#${Math.min(...floors)}–#${Math.max(...floors)}` : "";
  return /* @__PURE__ */ u$2("div", { class: "rbt-chatgroup", children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-chatgroup-head", onClick: () => setOpen(!open), children: [
      /* @__PURE__ */ u$2("span", { class: "rbt-caret", children: open ? "▾" : "▸" }),
      "聊天记录 ",
      range,
      "（",
      msgs.length,
      " 条）",
      /* @__PURE__ */ u$2("span", { class: "rbt-msg-tokens", children: fmtTokens(tokens) })
    ] }),
    open && msgs.map((m2) => /* @__PURE__ */ u$2(MessageRow, { msg: m2 }, m2.index))
  ] });
}
const SCOPE_OF = {
  wi_character: "角色",
  wi_chat: "聊天",
  wi_persona: "用户设定",
  wi_global: "全局",
  wi_other: "其他"
};
function WIList({ wi }) {
  const byBook = T(() => {
    const m2 = /* @__PURE__ */ new Map();
    for (const e2 of wi) m2.set(e2.book, [...m2.get(e2.book) ?? [], e2]);
    return [...m2.entries()];
  }, [wi]);
  if (!wi.length) return /* @__PURE__ */ u$2(Empty, { children: "这一轮没有触发任何世界书条目。" });
  return /* @__PURE__ */ u$2("div", { class: "rbt-wi", children: byBook.map(([book, entries]) => /* @__PURE__ */ u$2("div", { class: "rbt-wi-book", children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-wi-book-head", children: [
      /* @__PURE__ */ u$2(CategoryChip, { category: entries[0].category, children: SCOPE_OF[entries[0].category] }),
      /* @__PURE__ */ u$2("b", { children: book }),
      " ",
      /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: [
        entries.length,
        " 条"
      ] })
    ] }),
    entries.sort((a2, b2) => a2.order - b2.order).map((e2) => /* @__PURE__ */ u$2("details", { class: "rbt-wi-entry", children: [
      /* @__PURE__ */ u$2("summary", { children: [
        /* @__PURE__ */ u$2("span", { class: "rbt-wi-title", children: e2.title }),
        /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: [
          e2.position !== void 0 ? WI_POSITION[e2.position] ?? `位置 ${e2.position}` : "",
          e2.position === 4 ? ` ${e2.depth}` : ""
        ] }),
        e2.constant ? /* @__PURE__ */ u$2(Chip, { color: "#3d8bfd", children: "常驻" }) : e2.matchedKeys.length ? e2.matchedKeys.slice(0, 4).map((k2) => /* @__PURE__ */ u$2(Chip, { color: "#2fbf8f", children: k2 }, k2)) : /* @__PURE__ */ u$2(Chip, { color: "#888", title: "最近消息里没找到它的关键词：可能是递归触发、其他条件，或关键词是正则", children: "递归/其他" })
      ] }),
      /* @__PURE__ */ u$2("pre", { class: "rbt-content", children: e2.content })
    ] }, e2.key))
  ] }, book)) });
}
function FlowView() {
  const list = captures.value;
  const [selectedId, setSelectedId] = d$1(null);
  const [sub, setSub] = d$1("stack");
  const cap = list.find((c2) => c2.id === selectedId) ?? list[0];
  const rows = T(() => cap ? groupRows(cap.result.messages) : [], [cap]);
  if (!cap) {
    return /* @__PURE__ */ u$2(Empty, { children: [
      "还没有捕获到提示词。",
      /* @__PURE__ */ u$2("br", {}),
      "正常发送一条消息（或重新生成），这里就会显示这一轮真正发给 AI 的内容。",
      /* @__PURE__ */ u$2("br", {}),
      "也可以先预览一下，不会发送：",
      /* @__PURE__ */ u$2("br", {}),
      /* @__PURE__ */ u$2(PreviewButton, { onDone: () => setSelectedId(null) }),
      /* @__PURE__ */ u$2("br", {}),
      /* @__PURE__ */ u$2("small", { children: "目前只支持 Chat Completion 模式。" })
    ] });
  }
  const { result } = cap;
  const globalWI = result.totals.wi_global;
  const globalBooks = [...new Set(cap.wi.filter((e2) => e2.category === "wi_global").map((e2) => e2.book))];
  return /* @__PURE__ */ u$2("div", { class: "rbt-flow", children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-toolbar", children: [
      /* @__PURE__ */ u$2("select", { class: "text_pole rbt-select", value: cap.id, onChange: (e2) => setSelectedId(Number(e2.currentTarget.value)), children: list.map((c2) => /* @__PURE__ */ u$2("option", { value: c2.id, children: captureTitle(c2) }, c2.id)) }),
      /* @__PURE__ */ u$2(PreviewButton, { onDone: () => setSelectedId(null) })
    ] }),
    cap.genType === "preview" && /* @__PURE__ */ u$2("div", { class: "rbt-hint", children: "这是预览：没有发送给 AI。预览时酒馆不会报告具体触发了哪些世界书条目，所以世界书内容只显示为整块；真正发送一条消息后能看到逐条来源。" }),
    /* @__PURE__ */ u$2("div", { class: "rbt-summary", children: [
      /* @__PURE__ */ u$2("div", { class: "rbt-summary-line", children: [
        /* @__PURE__ */ u$2("b", { children: result.messages.length }),
        " 条消息 · 约 ",
        /* @__PURE__ */ u$2("b", { children: fmtTokens(result.totalTokens) }),
        " tokens（估算）",
        cap.presetName && /* @__PURE__ */ u$2(S$1, { children: [
          " · 预设 ",
          /* @__PURE__ */ u$2("b", { children: cap.presetName })
        ] }),
        !result.aligned && /* @__PURE__ */ u$2(Chip, { color: "#c98a00", title: "没能从提示词管理器拿到结构信息，来源是按文字匹配推断的", children: "推断模式" })
      ] }),
      /* @__PURE__ */ u$2(StackBar, { totals: result.totals, total: result.totalTokens }),
      /* @__PURE__ */ u$2(Legend, { totals: result.totals, total: result.totalTokens }),
      globalWI > 0 && /* @__PURE__ */ u$2("div", { class: "rbt-warn", children: [
        "⚠ 有约 ",
        globalWI,
        " tokens 来自",
        /* @__PURE__ */ u$2("b", { children: "全局世界书" }),
        "：",
        globalBooks.join("、"),
        '。如果这本书不属于这张卡，就是"串味"了。'
      ] })
    ] }),
    /* @__PURE__ */ u$2("div", { class: "rbt-subtabs", children: [
      /* @__PURE__ */ u$2("button", { class: sub === "stack" ? "active" : "", onClick: () => setSub("stack"), children: "组装顺序" }),
      /* @__PURE__ */ u$2("button", { class: sub === "wi" ? "active" : "", onClick: () => setSub("wi"), children: [
        "触发的世界书（",
        cap.wi.length,
        "）"
      ] })
    ] }),
    sub === "stack" && /* @__PURE__ */ u$2("div", { class: "rbt-stack", children: rows.map((r2, i2) => r2.type === "chat" ? /* @__PURE__ */ u$2(ChatGroup, { msgs: r2.msgs }, `g${i2}`) : /* @__PURE__ */ u$2(MessageRow, { msg: r2.msg }, r2.msg.index)) }),
    sub === "wi" && /* @__PURE__ */ u$2(WIList, { wi: cap.wi })
  ] });
}
const KIND = {
  added: { label: "新增", color: "#2fbf8f" },
  removed: { label: "删除", color: "#e5484d" },
  changed: { label: "修改", color: "#f0a43a" }
};
function ChangeRow({ ch, sources }) {
  const refs = T(() => sources ? findReferences(ch.path, sources) : [], [ch.path, sources]);
  return /* @__PURE__ */ u$2("div", { class: "rbt-var-change", children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-var-head", children: [
      /* @__PURE__ */ u$2(Chip, { color: KIND[ch.kind].color, children: KIND[ch.kind].label }),
      /* @__PURE__ */ u$2("code", { class: "rbt-var-path", children: ch.path })
    ] }),
    /* @__PURE__ */ u$2("div", { class: "rbt-var-values", children: [
      ch.kind !== "added" && /* @__PURE__ */ u$2("span", { class: "rbt-var-before", children: formatValue(ch.before) }),
      ch.kind === "changed" && /* @__PURE__ */ u$2("span", { class: "rbt-arrow", children: "→" }),
      ch.kind !== "removed" && /* @__PURE__ */ u$2("span", { class: "rbt-var-after", children: formatValue(ch.after) })
    ] }),
    ch.desc && /* @__PURE__ */ u$2("div", { class: "rbt-var-desc", children: ch.desc }),
    sources && /* @__PURE__ */ u$2("div", { class: "rbt-var-refs", children: refs.length ? /* @__PURE__ */ u$2(S$1, { children: [
      "被读取：",
      refs.slice(0, 4).map((r2, i2) => /* @__PURE__ */ u$2(Chip, { color: r2.source.kind === "preset" ? "#8b7cf6" : "#2fbf8f", title: `匹配到「${r2.term}」`, children: r2.source.label }, i2)),
      refs.length > 4 && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: [
        " 等 ",
        refs.length,
        " 处"
      ] })
    ] }) : /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "没在世界书/预设里找到直接引用" }) })
  ] });
}
function VarTree({ data, highlight }) {
  const [filter, setFilter] = d$1("");
  const leaves = T(() => [...flattenVars(data).values()], [data]);
  const shown = leaves.filter((l2) => !filter || l2.path.includes(filter) || formatValue(l2.value).includes(filter));
  return /* @__PURE__ */ u$2("div", { class: "rbt-vartree", children: [
    /* @__PURE__ */ u$2("input", { class: "text_pole rbt-input", placeholder: "筛选变量…", value: filter, onInput: (e2) => setFilter(e2.currentTarget.value) }),
    /* @__PURE__ */ u$2("div", { class: "rbt-vartree-list", children: [
      shown.slice(0, 500).map((l2) => /* @__PURE__ */ u$2("div", { class: `rbt-vartree-row ${highlight.has(l2.path) ? "changed" : ""}`, title: l2.desc, children: [
        /* @__PURE__ */ u$2("code", { children: l2.path }),
        /* @__PURE__ */ u$2("span", { children: formatValue(l2.value, 200) })
      ] }, l2.path)),
      shown.length > 500 && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "只显示前 500 项" })
    ] })
  ] });
}
function VarsView() {
  void varsTick.value;
  const floors = collectFloors();
  const diffs = floorDiffs(floors);
  const [selected, setSelected] = d$1(null);
  const [sources, setSources] = d$1(null);
  const local = chatLocalVars();
  h$2(() => {
    let alive = true;
    loadTextSources().then((s2) => {
      if (alive) setSources(s2);
    }).catch(() => setSources([]));
    return () => {
      alive = false;
    };
  }, [floors.length]);
  if (!diffs.length) {
    return /* @__PURE__ */ u$2("div", { class: "rbt-vars", children: [
      /* @__PURE__ */ u$2(Empty, { children: [
        "当前聊天里没有楼层变量。",
        /* @__PURE__ */ u$2("br", {}),
        "用了 MVU 的卡，AI 回复后变量会存在每一楼里，这里就会显示每一轮变了什么。"
      ] }),
      Object.keys(local).length > 0 && /* @__PURE__ */ u$2("details", { class: "rbt-section", open: true, children: [
        /* @__PURE__ */ u$2("summary", { children: [
          "聊天变量（/setvar）",
          Object.keys(local).length,
          " 个"
        ] }),
        /* @__PURE__ */ u$2(VarTree, { data: local, highlight: /* @__PURE__ */ new Set() })
      ] })
    ] });
  }
  const current = diffs.find((d2) => d2.floor.index === selected) ?? diffs[diffs.length - 1];
  const changedPaths = new Set(current.changes.map((c2) => c2.path));
  const readers = sources ? wholeTreeReaders(sources) : [];
  return /* @__PURE__ */ u$2("div", { class: "rbt-vars", children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-toolbar", children: /* @__PURE__ */ u$2("select", { class: "text_pole rbt-select", value: current.floor.index, onChange: (e2) => setSelected(Number(e2.currentTarget.value)), children: [...diffs].reverse().map((d2) => /* @__PURE__ */ u$2("option", { value: d2.floor.index, children: [
      "#",
      d2.floor.index,
      " ",
      d2.floor.name,
      " · ",
      d2.prev ? `${d2.changes.length} 处变化` : "初始值"
    ] }, d2.floor.index)) }) }),
    /* @__PURE__ */ u$2("div", { class: "rbt-summary", children: [
      /* @__PURE__ */ u$2("div", { class: "rbt-summary-line", children: [
        "第 ",
        /* @__PURE__ */ u$2("b", { children: [
          "#",
          current.floor.index
        ] }),
        " 楼",
        current.prev ? /* @__PURE__ */ u$2(S$1, { children: [
          "，对比上一个有变量的楼层 #",
          current.prev.index
        ] }) : "（第一个有变量的楼层，显示的是初始值）",
        "：",
        /* @__PURE__ */ u$2("b", { children: current.changes.length }),
        " 处变化"
      ] }),
      readers.length > 0 && /* @__PURE__ */ u$2("div", { class: "rbt-hint", children: [
        "这些条目会把",
        /* @__PURE__ */ u$2("b", { children: "整个 stat_data" }),
        " 送进提示词，所以任何变量变化都会影响下一轮：",
        readers.slice(0, 5).map((r2, i2) => /* @__PURE__ */ u$2(Chip, { color: "#2fbf8f", children: r2.label }, i2))
      ] })
    ] }),
    /* @__PURE__ */ u$2("div", { class: "rbt-var-changes", children: current.changes.length ? current.changes.map((ch) => /* @__PURE__ */ u$2(ChangeRow, { ch, sources }, ch.path)) : /* @__PURE__ */ u$2(Empty, { children: "这一楼变量没有变化。" }) }),
    /* @__PURE__ */ u$2("details", { class: "rbt-section", children: [
      /* @__PURE__ */ u$2("summary", { children: "这一楼的完整变量" }),
      /* @__PURE__ */ u$2(VarTree, { data: current.floor.statData ?? current.floor.vars, highlight: changedPaths })
    ] }),
    Object.keys(local).length > 0 && /* @__PURE__ */ u$2("details", { class: "rbt-section", children: [
      /* @__PURE__ */ u$2("summary", { children: [
        "聊天变量（/setvar）",
        Object.keys(local).length,
        " 个"
      ] }),
      /* @__PURE__ */ u$2(VarTree, { data: local, highlight: /* @__PURE__ */ new Set() })
    ] })
  ] });
}
const panelOpen = y$1(false);
const activeTab = y$1("flow");
const TABS = [
  { id: "flow", label: "信息流" },
  { id: "vars", label: "变量" },
  { id: "env", label: "换卡体检" }
];
const POS_KEY = "rbt-panel-rect";
const MIN_W = 320;
const MIN_H = 240;
function viewport() {
  const vw = window.innerWidth || document.documentElement.clientWidth || window.screen.width || 1024;
  const vh = window.innerHeight || document.documentElement.clientHeight || window.screen.height || 768;
  return { vw: Math.max(vw, MIN_W), vh: Math.max(vh, MIN_H) };
}
function defaultRect() {
  const { vw, vh } = viewport();
  const w2 = Math.min(560, vw - 20);
  return { x: vw - w2 - 10, y: 50, w: w2, h: Math.min(760, vh - 70) };
}
function loadRect() {
  try {
    const r2 = JSON.parse(localStorage.getItem(POS_KEY) ?? "");
    if (typeof r2?.x === "number" && r2.w >= MIN_W && r2.h >= MIN_H) return r2;
  } catch {
  }
  return defaultRect();
}
function clampRect(r2) {
  const { vw, vh } = viewport();
  const w2 = Math.min(Math.max(MIN_W, r2.w), vw);
  const h2 = Math.min(Math.max(MIN_H, r2.h), vh);
  return {
    w: w2,
    h: h2,
    x: Math.max(0, Math.min(r2.x, vw - Math.min(w2, 120))),
    y: Math.max(0, Math.min(r2.y, vh - 40))
  };
}
function saveRect(el) {
  if (el.offsetWidth < MIN_W || el.offsetHeight < MIN_H) return;
  localStorage.setItem(POS_KEY, JSON.stringify({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }));
}
function applyRect(el, r2) {
  Object.assign(el.style, { left: `${r2.x}px`, top: `${r2.y}px`, width: `${r2.w}px`, height: `${r2.h}px` });
}
function openPanel(tab) {
  if (tab) activeTab.value = tab;
  panelOpen.value = true;
}
function Panel() {
  const ref = A$1(null);
  h$2(() => {
    const el = ref.current;
    if (!el || !panelOpen.value) return;
    applyRect(el, clampRect(loadRect()));
    const ro = new ResizeObserver(() => saveRect(el));
    ro.observe(el);
    const onResize = () => applyRect(el, clampRect({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }));
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onResize);
    };
  }, [panelOpen.value]);
  if (!panelOpen.value) return null;
  const onDragStart = (e2) => {
    const el = ref.current;
    if (!el || e2.target.closest("button")) return;
    const startX = e2.clientX - el.offsetLeft;
    const startY = e2.clientY - el.offsetTop;
    const move = (ev) => {
      const r2 = clampRect({ x: ev.clientX - startX, y: ev.clientY - startY, w: el.offsetWidth, h: el.offsetHeight });
      el.style.left = `${r2.x}px`;
      el.style.top = `${r2.y}px`;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      saveRect(el);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return /* @__PURE__ */ u$2("div", { class: "rbt-panel", ref, children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-header", onPointerDown: onDragStart, children: [
      /* @__PURE__ */ u$2("span", { class: "rbt-title", children: "🐦 RedBird 工具箱" }),
      /* @__PURE__ */ u$2("div", { class: "rbt-tabs", children: TABS.map((t2) => /* @__PURE__ */ u$2("button", { class: activeTab.value === t2.id ? "active" : "", onClick: () => {
        activeTab.value = t2.id;
      }, children: t2.label }, t2.id)) }),
      /* @__PURE__ */ u$2("button", { class: "rbt-close", title: "关闭", onClick: () => {
        panelOpen.value = false;
      }, children: "✕" })
    ] }),
    /* @__PURE__ */ u$2("div", { class: "rbt-body", children: [
      activeTab.value === "flow" && /* @__PURE__ */ u$2(FlowView, {}),
      activeTab.value === "vars" && /* @__PURE__ */ u$2(VarsView, {}),
      activeTab.value === "env" && /* @__PURE__ */ u$2(EnvView, {})
    ] })
  ] });
}
function addMenuButton() {
  const menu = document.getElementById("extensionsMenu");
  if (!menu || document.getElementById("rbt_menu_button")) return;
  const item = document.createElement("div");
  item.id = "rbt_menu_button";
  item.className = "list-group-item flex-container flexGap5 interactable";
  item.tabIndex = 0;
  item.innerHTML = '<div class="fa-solid fa-feather-pointed extensionsMenuExtensionButton"></div><span>RedBird 工具箱</span>';
  item.addEventListener("click", () => {
    panelOpen.value = !panelOpen.value;
  });
  menu.appendChild(item);
}
function addSettingsDrawer() {
  const host = document.getElementById("extensions_settings2") ?? document.getElementById("extensions_settings");
  if (!host || document.getElementById("rbt_settings")) return;
  const wrap = document.createElement("div");
  wrap.id = "rbt_settings";
  wrap.innerHTML = `
    <div class="inline-drawer">
      <div class="inline-drawer-toggle inline-drawer-header">
        <b>RedBird 工具箱</b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
      </div>
      <div class="inline-drawer-content">
        <div class="flex-container flexGap5">
          <div class="menu_button" data-tab="flow">信息流</div>
          <div class="menu_button" data-tab="vars">变量</div>
          <div class="menu_button" data-tab="env">换卡体检</div>
        </div>
        <label class="checkbox_label"><input type="checkbox" id="rbt_toast_switch" /> 换卡时弹出体检提示</label>
        <small>也可以从输入框左边的魔法棒菜单打开，或输入 <code>/rbt</code>。</small>
      </div>
    </div>`;
  host.appendChild(wrap);
  wrap.querySelectorAll("[data-tab]").forEach((b2) => b2.addEventListener("click", () => openPanel(b2.dataset.tab)));
  const cb = wrap.querySelector("#rbt_toast_switch");
  cb.checked = settings().toastOnCardSwitch;
  cb.addEventListener("change", () => {
    settings().toastOnCardSwitch = cb.checked;
    saveSettings();
  });
}
function addSlashCommand() {
  const c2 = ctx();
  try {
    c2.SlashCommandParser.addCommandObject(c2.SlashCommand.fromProps({
      name: "rbt",
      callback: (_args, tab) => {
        const t2 = ["flow", "vars", "env"].find((x2) => x2 === String(tab ?? "").trim());
        if (t2) openPanel(t2);
        else panelOpen.value = !panelOpen.value;
        return "";
      },
      helpString: "打开/关闭 RedBird 工具箱。可加参数 flow / vars / env 直接打开对应页。"
    }));
  } catch (e2) {
    console.warn("[RedBird] slash command registration failed", e2);
  }
}
async function init() {
  await preloadModules();
  installFlowCapture();
  installVarsWatch();
  installEnvWatch((tab) => openPanel(tab));
  const root = document.createElement("div");
  root.id = "rbt-root";
  document.body.appendChild(root);
  R(/* @__PURE__ */ u$2(Panel, {}), root);
  addMenuButton();
  addSettingsDrawer();
  addSlashCommand();
  window.RedBirdTools = { captures, openPanel };
  console.log("[RedBird] 工具箱已加载");
}
const start = () => {
  init().catch((e2) => console.error("[RedBird] init failed", e2));
};
if (window.jQuery) window.jQuery(start);
else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
//# sourceMappingURL=index.js.map
