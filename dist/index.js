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
function thCharacterScriptsEnabled(es, char) {
  const list = es?.tavern_helper?.script?.enabled?.characters ?? [];
  return !!char && (list.includes(char.avatar) || list.includes(char.name));
}
const SETTINGS_KEY = "redbird_tools";
function settings() {
  const es = ctx().extensionSettings;
  if (!es[SETTINGS_KEY]) es[SETTINGS_KEY] = {};
  const s2 = es[SETTINGS_KEY];
  s2.toastOnCardSwitch ??= true;
  s2.shellEnabled ??= true;
  s2.autoApplyEnv ??= true;
  s2.profiles ??= {};
  s2.cards ??= {};
  s2.regexOwners ??= {};
  s2.autoImportWorld ??= true;
  s2.worldBackups ??= [];
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
const recentChats = y$1([]);
const recentLoading = y$1(false);
function pinnedState() {
  try {
    const raw = ctx().accountStorage?.getItem("pinnedChats");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function pinKey(c2) {
  return `${c2.group ? `group_${c2.group}` : ""}${c2.avatar ? `char_${c2.avatar}` : ""}_${c2.file_name}`;
}
function cleanPreview(text) {
  const t2 = String(text ?? "").replace(/<(thinking|think|reasoning|status_[a-z_]*|UpdateVariable|StatusPlaceHolderImpl)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]{1,200}>/g, " ").replace(/^:::.*$/gm, " ").replace(/```[\s\S]*?```/g, " ").replace(/[*_#>`~|]+/g, "").replace(/\s+/g, " ").trim();
  return t2.length > 120 ? `${t2.slice(0, 120)}…` : t2;
}
function parseTime(v2) {
  if (typeof v2 === "number") return v2;
  const s2 = String(v2 ?? "");
  const n2 = Date.parse(s2);
  if (!Number.isNaN(n2)) return n2;
  const m2 = s2.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s*@\s*(\d{1,2})h\s*(\d{1,2})m(?:\s*(\d{1,2})s)?/);
  if (m2) return new Date(+m2[1], +m2[2] - 1, +m2[3], +m2[4], +m2[5], +(m2[6] ?? 0)).getTime();
  return 0;
}
async function loadRecentChats() {
  const c2 = ctx();
  recentLoading.value = true;
  try {
    const pins = pinnedState();
    const res = await fetch("/api/chats/recent", {
      method: "POST",
      headers: c2.getRequestHeaders(),
      body: JSON.stringify({ max: 200, pinned: Object.values(pins) }),
      cache: "no-cache"
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const out = [];
    for (const r2 of Array.isArray(data) ? data : []) {
      const character = r2.avatar ? c2.characters.find((x2) => x2.avatar === r2.avatar) : null;
      const group = r2.group ? c2.groups?.find((x2) => x2.id === r2.group) : null;
      if (!character && !group) continue;
      const fileName = String(r2.file_name ?? "");
      out.push({
        key: pinKey(r2),
        avatar: r2.avatar ?? "",
        group: r2.group ?? "",
        fileName,
        chatId: fileName.replace(/\.jsonl$/, ""),
        name: character?.name ?? group?.name ?? "",
        thumb: character ? c2.getThumbnailUrl("avatar", character.avatar) : "img/five.png",
        preview: cleanPreview(r2.mes ?? ""),
        time: parseTime(r2.last_mes),
        pinned: pinKey(r2) in pins,
        messages: Number(r2.chat_items ?? 0)
      });
    }
    out.sort((a2, b2) => Number(b2.pinned) - Number(a2.pinned) || b2.time - a2.time);
    recentChats.value = out;
  } catch (e2) {
    console.warn("[RedBird] loading recent chats failed", e2);
  } finally {
    recentLoading.value = false;
  }
}
function isCurrentChat(r2) {
  const c2 = ctx();
  const id = String(c2.getCurrentChatId?.() ?? "");
  if (!id || id !== r2.chatId) return false;
  if (r2.group) return c2.groupId === r2.group;
  return currentCharacter()?.avatar === r2.avatar;
}
async function openRecentChat(r2) {
  const c2 = ctx();
  try {
    if (r2.group) {
      await c2.openGroupChat(r2.group, r2.chatId);
      return;
    }
    const idx = c2.characters.findIndex((x2) => x2.avatar === r2.avatar);
    if (idx < 0) throw new Error("角色不存在");
    if (String(c2.characterId) !== String(idx)) await c2.selectCharacterById(idx);
    if (String(ctx().getCurrentChatId?.() ?? "") !== r2.chatId) await ctx().openCharacterChat(r2.chatId);
  } catch (e2) {
    console.error("[RedBird] open chat failed", e2);
    toast("error", `打开聊天失败：${String(e2)}`);
  }
}
function timeGroup(r2, now = Date.now()) {
  if (r2.pinned) return "置顶";
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const t0 = startOfToday.getTime();
  if (r2.time >= t0) return "今天";
  if (r2.time >= t0 - 864e5) return "昨天";
  if (r2.time >= t0 - 6 * 864e5) return "7 天内";
  if (r2.time >= t0 - 29 * 864e5) return "30 天内";
  return "更早";
}
function shortTime(t2, now = Date.now()) {
  if (!t2) return "";
  const d2 = new Date(t2);
  const today = new Date(now);
  const p2 = (n2) => String(n2).padStart(2, "0");
  if (d2.toDateString() === today.toDateString()) return `${p2(d2.getHours())}:${p2(d2.getMinutes())}`;
  if (d2.getFullYear() === today.getFullYear()) return `${d2.getMonth() + 1}/${d2.getDate()}`;
  return `${d2.getFullYear()}/${d2.getMonth() + 1}/${d2.getDate()}`;
}
function prettyChatName(chatId, charName) {
  let s2 = chatId;
  if (charName && s2.startsWith(`${charName} - `)) s2 = s2.slice(charName.length + 3);
  const m2 = s2.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s*@\s*(\d{1,2})h\s*(\d{1,2})m/);
  if (m2) {
    const p2 = (n2) => n2.padStart(2, "0");
    return `${m2[1]}-${p2(m2[2])}-${p2(m2[3])} ${p2(m2[4])}:${p2(m2[5])}`;
  }
  return s2;
}
let timer;
function refreshRecentSoon(delay = 1200) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    void loadRecentChats();
  }, delay);
}
function installRecentWatch() {
  const c2 = ctx();
  const es = c2.eventSource;
  const et = c2.eventTypes;
  for (const ev of [et.APP_READY, et.CHARACTER_PAGE_LOADED]) {
    if (ev) es.on(ev, () => refreshRecentSoon(200));
  }
  for (const ev of [et.CHAT_CHANGED, et.CHAT_CREATED, et.CHAT_DELETED, et.GROUP_CHAT_DELETED, et.CHARACTER_RENAMED, et.CHARACTER_DELETED]) {
    if (ev) es.on(ev, () => refreshRecentSoon(300));
  }
  for (const ev of [et.MESSAGE_RECEIVED, et.MESSAGE_SENT, et.MESSAGE_DELETED]) {
    if (ev) es.on(ev, () => refreshRecentSoon(1500));
  }
}
const DRAWERS = [
  { key: "preset", id: "left-nav-panel", holder: "ai-config-button", label: "预设", icon: "fa-sliders", size: "wide" },
  { key: "api", id: "rm_api_block", holder: "sys-settings-button", label: "API", icon: "fa-plug", size: "form" },
  { key: "persona", id: "PersonaManagement", holder: "persona-management-button", label: "人设", icon: "fa-face-smile", size: "wide" },
  { key: "extensions", id: "rm_extensions_block", holder: "extensions-settings-button", label: "扩展·正则", icon: "fa-cubes", size: "wide" },
  { key: "settings", id: "user-settings-block", holder: "user-settings-button", label: "设置", icon: "fa-user-cog", size: "wide" },
  { key: "backgrounds", id: "Backgrounds", holder: "backgrounds-button", label: "背景", icon: "fa-panorama", size: "wide" },
  { key: "formatting", id: "AdvancedFormatting", holder: "advanced-formatting-button", label: "格式化", icon: "fa-font", size: "wide" },
  { key: "characters", id: "right-nav-panel", holder: "rightNavHolder", label: "角色", icon: "fa-address-card", size: "wide" },
  { key: "worldinfo", id: "WorldInfo", holder: "WI-SP-button", label: "世界书", icon: "fa-book-atlas", size: "wide" }
];
const drawerByKey = Object.fromEntries(DRAWERS.map((d2) => [d2.key, d2]));
const openDrawers = y$1([]);
function el(d2) {
  return document.getElementById(d2.id);
}
function isOpen(key) {
  return !!el(drawerByKey[key])?.classList.contains("openDrawer");
}
function clickToggle(d2) {
  const toggle = document.querySelector(`#${d2.holder} > .drawer-toggle`);
  if (!toggle) return;
  const $2 = window.jQuery;
  if ($2) $2(toggle).trigger("click");
  else toggle.click();
}
function openDrawer(key) {
  if (!isOpen(key)) clickToggle(drawerByKey[key]);
}
function closeDrawer(key) {
  if (isOpen(key)) clickToggle(drawerByKey[key]);
}
const wasOpen = /* @__PURE__ */ new Map();
function drawerButtonHandlers(key) {
  return {
    onPointerDown: () => {
      wasOpen.set(key, isOpen(key));
    },
    onClick: () => {
      const was = wasOpen.get(key) ?? isOpen(key);
      wasOpen.delete(key);
      if (was) closeDrawer(key);
      else openDrawer(key);
    }
  };
}
function injectHeaders() {
  for (const d2 of DRAWERS) {
    const node = el(d2);
    if (!node || node.querySelector(":scope > .rbt-sheet-head")) continue;
    const head = document.createElement("div");
    head.className = "rbt-sheet-head";
    head.innerHTML = `<span class="rbt-sheet-title"><i class="fa-solid ${d2.icon} fa-fw"></i>${d2.label}</span><span class="rbt-sheet-note"></span><button type="button" class="rbt-sheet-close" title="关闭（Esc）" aria-label="关闭">✕</button>`;
    head.querySelector("button").addEventListener("click", () => closeDrawer(d2.key));
    node.prepend(head);
  }
}
function syncOpenState() {
  const open = DRAWERS.filter((d2) => el(d2)?.classList.contains("openDrawer")).map((d2) => d2.key);
  const prev = openDrawers.value;
  if (open.length !== prev.length || open.some((k2, i2) => k2 !== prev[i2])) openDrawers.value = open;
  document.body.classList.toggle("rbt-open-modal", open.length > 0);
}
function onKeyDown(e2) {
  if (e2.key !== "Escape" || !document.body.classList.contains("rbt-shell")) return;
  if (document.querySelector('dialog[open], .popup.open, #shadow_popup[style*="block"]')) return;
  const open = openDrawers.value;
  if (!open.length) return;
  closeDrawer(open[open.length - 1]);
  e2.preventDefault();
}
function onBackdropDown(e2) {
  if (!document.body.classList.contains("rbt-shell") || !document.body.classList.contains("rbt-open-modal")) return;
  if (e2.target !== document.body && e2.target !== document.documentElement) return;
  setTimeout(() => {
    for (const k2 of openDrawers.value) closeDrawer(k2);
  }, 0);
}
function sheetNoteElement(key) {
  return el(drawerByKey[key])?.querySelector(":scope > .rbt-sheet-head .rbt-sheet-note") ?? null;
}
let installed = false;
function installDrawers() {
  if (installed) return;
  installed = true;
  injectHeaders();
  syncOpenState();
  const mo = new MutationObserver(syncOpenState);
  for (const d2 of DRAWERS) {
    const node = el(d2);
    if (node) mo.observe(node, { attributes: true, attributeFilter: ["class"] });
  }
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("mousedown", onBackdropDown);
}
function emptyRecord(cardName) {
  return { cardName, links: [], notes: "", extensions: [], updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
}
function isRecordEmpty(r2) {
  return !r2 || !r2.links.length && !r2.notes.trim() && !r2.extensions.length;
}
const SEP = String.raw`\s*[:：@＠]?\s*`;
function detectContacts(text) {
  if (!text) return [];
  const out = [];
  const push = (kind, value) => {
    const v2 = value.trim().replace(/[)）\]】,，。;；]+$/, "");
    if (v2 && !out.some((c2) => c2.kind === kind && c2.value === v2)) out.push({ kind, value: v2 });
  };
  for (const url of extractUrls(text)) push("url", url);
  const noUrls = text.replace(URL_RE, " ");
  for (const m2 of noUrls.matchAll(new RegExp(String.raw`(?:dis[a-z]{0,3}rd|discord旅程|\bdc)${SEP}([A-Za-z0-9_.]{2,32})`, "gi"))) push("discord", m2[1]);
  for (const m2 of noUrls.matchAll(new RegExp(String.raw`(?:qq群|q群|群号?)${SEP}(\d{5,12})`, "gi"))) push("qqgroup", m2[1]);
  for (const m2 of noUrls.matchAll(new RegExp(String.raw`qq(?!群)${SEP}(\d{5,12})`, "gi"))) push("qq", m2[1]);
  return out;
}
const URL_RE = /https?:\/\/[^\s<>"'`，。、！？）)】\]]+/gi;
function extractUrls(text) {
  return [...new Set(text.match(URL_RE) ?? [])];
}
function splitLinks(text) {
  const parts = [];
  let last = 0;
  for (const m2 of text.matchAll(URL_RE)) {
    if (m2.index > last) parts.push({ text: text.slice(last, m2.index) });
    parts.push({ url: m2[0] });
    last = m2.index + m2[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
function isHttpUrl(s2) {
  try {
    const u2 = new URL(s2.trim());
    return u2.protocol === "http:" || u2.protocol === "https:";
  } catch {
    return false;
  }
}
function autoSourceUrl(ext) {
  const e2 = ext ?? {};
  if (e2.chub?.full_path) return `https://chub.ai/characters/${e2.chub.full_path}`;
  if (e2.pygmalion_id) return `https://pygmalion.chat/${e2.pygmalion_id}`;
  if (e2.github_repo) return `https://github.com/${e2.github_repo}`;
  if (typeof e2.source_url === "string" && e2.source_url) return e2.source_url;
  const risu = e2.risuai?.source;
  if (Array.isArray(risu) && typeof risu[0] === "string" && risu[0].startsWith("risurealm:")) {
    return `https://realm.risuai.net/character/${risu[0].split(":")[1]}`;
  }
  if (e2.perchance_data?.slug) return `https://perchance.org/ai-character-chat?data=${e2.perchance_data.slug}`;
  return "";
}
const norm = (s2) => (s2 ?? "").replace(/\r\n/g, "\n").trim();
function cardBookEntries(book) {
  return (book?.entries ?? []).map((e2) => ({ content: norm(e2.content), comment: e2.comment ?? e2.name ?? "", keys: e2.keys ?? [] }));
}
function worldBookEntries(world) {
  return Object.values(world?.entries ?? {}).map((e2) => ({ content: norm(e2.content), comment: e2.comment ?? "", keys: e2.key ?? [] }));
}
function diffBooks(card, world) {
  const pool = /* @__PURE__ */ new Map();
  for (const w2 of world) pool.set(w2.content, (pool.get(w2.content) ?? 0) + 1);
  const onlyCard = [];
  let same2 = 0;
  for (const c2 of card) {
    const n2 = pool.get(c2.content) ?? 0;
    if (n2 > 0) {
      same2++;
      pool.set(c2.content, n2 - 1);
    } else onlyCard.push(c2);
  }
  const onlyWorld = [];
  for (const w2 of world) {
    const n2 = pool.get(w2.content) ?? 0;
    if (n2 > 0) {
      onlyWorld.push(w2);
      pool.set(w2.content, n2 - 1);
    }
  }
  return { card: card.length, world: world.length, same: same2, onlyCard, onlyWorld };
}
function backupFileName(world, at) {
  const ascii = world.normalize("NFKD").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  let h2 = 0;
  for (const ch of world) h2 = h2 * 31 + ch.codePointAt(0) >>> 0;
  const stamp2 = at.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
  return `rbt-world-backup-${stamp2}-${ascii ? `${ascii}-` : ""}${h2.toString(36)}.json`;
}
function acronym(name) {
  return (name.match(/[A-Z]/g) ?? []).join("");
}
function guessRegexExtension(scriptName, extensions) {
  const name = scriptName.trim();
  const lower = name.toLowerCase();
  let best = null;
  for (const ext of extensions) {
    const e2 = ext.toLowerCase();
    if (e2.length >= 3 && lower.startsWith(e2) && (!best || e2.length > best.length)) best = ext;
  }
  if (best) return best;
  const head = name.match(/^[A-Za-z][A-Za-z0-9]*/)?.[0];
  if (!head) return null;
  const hits = extensions.filter((ext) => {
    const a2 = acronym(ext);
    return a2.length >= 2 && a2 === head.toUpperCase() && head === head.toUpperCase() || head.length >= 3 && ext.toLowerCase().startsWith(head.toLowerCase());
  });
  return hits.length === 1 ? hits[0] : null;
}
function findOrphans(records, chars) {
  const avatars = new Set(chars.map((c2) => c2.avatar));
  const out = [];
  for (const [avatar, r2] of Object.entries(records)) {
    if (avatars.has(avatar)) continue;
    const candidates = chars.filter((c2) => c2.name === r2.cardName && !(c2.avatar in records)).map((c2) => c2.avatar);
    out.push({ avatar, cardName: r2.cardName, candidates });
  }
  return out;
}
const ARCHIVE_FORMAT = "redbird-tools-card-archive";
function parseArchive(text) {
  const j2 = JSON.parse(text);
  if (j2?.format !== ARCHIVE_FORMAT) throw new Error("这不是 RedBird 工具箱导出的角色档案文件");
  return { ...j2, cards: j2.cards ?? {}, profiles: j2.profiles ?? {}, regexOwners: j2.regexOwners ?? {} };
}
function mergeRecords(cur, incoming, mode, stamp2 = () => "") {
  if (mode === "overwrite") return { ...incoming };
  const out = { ...cur };
  for (const [k2, v2] of Object.entries(incoming)) {
    if (!(k2 in out) || stamp2(v2) > stamp2(out[k2])) out[k2] = v2;
  }
  return out;
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
  const norm2 = structured.map((s2) => looseNormalize(contentToText(s2.content)).slice(0, 200));
  const out = [];
  let j2 = 0;
  for (const m2 of chat) {
    const target = looseNormalize(contentToText(m2.content)).slice(0, 200);
    let found = -1;
    for (let k2 = j2; k2 < Math.min(structured.length, j2 + 4); k2++) {
      if (norm2[k2] === target || target.length > 20 && (norm2[k2].startsWith(target.slice(0, 40)) || target.startsWith(norm2[k2].slice(0, 40)))) {
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
  preview: "预览",
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
  return [r2.markdownOnly ? "只改显示" : "", r2.promptOnly ? "只改发给 AI 的" : ""].filter(Boolean).join("、") || "改消息原文";
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
  const preset = presetInfo();
  const owners = settings().regexOwners;
  for (const name of scopes.global) {
    items.push({
      id: `wb:g:${name}`,
      scope: "global",
      kind: "worldbook",
      name,
      enabled: true,
      leaks: !scopes.character.has(name) && !scopes.chat.has(name),
      detail: scopes.character.has(name) ? "也绑在当前卡上" : "对所有卡生效",
      toggle: async (on) => runSlash(`/world state=${on ? "on" : "off"} silent=true ${slashQuote(name)}`)
    });
  }
  for (const r2 of es.regex ?? []) {
    const owner = owners[r2.id];
    const ownerText = owner ? `属于${owner.kind === "extension" ? "插件" : owner.kind === "card" ? "角色卡" : "预设"}「${owner.label}」` : "";
    const elsewhere = owner && (owner.kind === "card" && owner.key !== avatar || owner.kind === "preset" && owner.key !== preset.name);
    items.push({
      id: `rx:g:${r2.id ?? r2.scriptName}`,
      scope: "global",
      kind: "regex",
      name: r2.scriptName || "(未命名正则)",
      enabled: !r2.disabled,
      leaks: !r2.disabled,
      misplaced: elsewhere && !r2.disabled ? ownerText : void 0,
      detail: [regexEffectLabel(r2), ownerText].filter(Boolean).join(" · "),
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
      name: `已启用的插件 ${exts.length} 个`,
      enabled: true,
      leaks: false,
      detail: "对所有卡生效",
      children: exts
    });
  }
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
      name: `预设里的正则 ${preset.regex.length} 条，开着 ${active.length} 条`,
      enabled: allowed,
      leaks: allowed && active.length > 0,
      detail: allowed ? "用这个预设时对所有卡生效。右边的开关决定是否允许运行" : "未允许运行，打开右边的开关才会生效",
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
      name: `预设里的酒馆助手脚本 ${thPreset.length} 个`,
      enabled: on,
      leaks: on,
      detail: on ? "用这个预设时对所有卡生效" : "未启用",
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
        name: `卡里的正则 ${cardRegex.length} 条，开着 ${activeCard} 条`,
        enabled: allowed,
        leaks: false,
        detail: allowed ? "右边的开关决定是否允许运行" : "未允许运行，卡里的正则不会生效",
        toggle: (on) => setRegexGroupAllowed(RX.SCOPED, on),
        subItems: regexSubItems(RX.SCOPED, cardRegex)
      });
    }
    const thChar = thScripts(char.data?.extensions?.tavern_helper ?? char.data?.extensions?.TavernHelper_scripts);
    if (thChar.length) {
      const on = thCharacterScriptsEnabled(es, char);
      items.push({
        id: "th:c",
        scope: "character",
        kind: "script",
        name: `角色脚本（酒馆助手）${thChar.length} 个`,
        enabled: on,
        leaks: false,
        detail: on ? "已启用" : "未启用，卡里的脚本不会运行",
        children: thChar.map((s2) => `${s2.enabled ? "●" : "○"} ${s2.name}`)
      });
    }
  }
  for (const name of scopes.chat) items.push({ id: `wb:chat:${name}`, scope: "chat", kind: "worldbook", name, enabled: true, leaks: false, detail: "绑在当前聊天上" });
  for (const name of scopes.persona) items.push({ id: `wb:p:${name}`, scope: "persona", kind: "worldbook", name, enabled: true, leaks: true, detail: "绑在用户设定上，换卡后仍然生效" });
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
  const nowWorlds = now.globalWorlds ?? [];
  const nowRegex = now.globalRegexEnabled ?? [];
  const pw = profile.globalWorlds;
  const pr = profile.globalRegexEnabled;
  const drift = {
    // Parts the profile did not record (e.g. only a recommended preset) are not compared.
    worldsOn: pw ? pw.filter((w2) => !nowWorlds.includes(w2)) : [],
    worldsOff: pw ? nowWorlds.filter((w2) => !pw.includes(w2)) : [],
    regexOn: pr ? pr.filter((r2) => allRegex.has(r2) && !nowRegex.includes(r2)) : [],
    regexOff: pr ? nowRegex.filter((r2) => !pr.includes(r2)) : [],
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
let lastAvatar$2 = null;
function installEnvWatch(openPanel2) {
  const c2 = ctx();
  const es = c2.eventSource;
  const et = c2.eventTypes;
  es.on(et.CHAT_CHANGED, () => {
    setTimeout(() => {
      const r2 = refreshEnv();
      if (!r2.avatar || r2.avatar === lastAvatar$2) return;
      lastAvatar$2 = r2.avatar;
      if (settings().autoApplyEnv) return;
      const open = { onclick: () => openPanel2("env"), timeOut: 8e3 };
      const misplaced = r2.items.filter((i2) => i2.misplaced);
      if (misplaced.length) {
        toast("warning", `${misplaced.map((i2) => `全局正则「${i2.name}」${i2.misplaced}`).join("；")}，但现在还开着。点这里查看。`, "换卡提醒", open);
      }
      if (r2.drift?.count) {
        toast("warning", `「${r2.cardName}」的环境和上次记住的不一样（${r2.drift.count} 项）。点这里查看并一键恢复。`, "换卡提醒", open);
        return;
      }
      if (r2.profile) return;
      const leaks = r2.items.filter((i2) => i2.leaks);
      if (leaks.length) {
        const books = leaks.filter((i2) => i2.kind === "worldbook").length;
        const rx = leaks.filter((i2) => i2.kind === "regex" && i2.scope === "global").length;
        const parts = [books && `全局世界书 ${books} 本`, rx && `全局正则 ${rx} 条`, leaks.some((i2) => i2.id === "rx:p") && "预设正则", leaks.some((i2) => i2.kind === "script") && "全局/预设脚本"].filter(Boolean);
        toast("info", `这张卡还没记住环境。当前对所有卡都生效的有：${parts.join("、")}。点这里查看。`, "换卡提醒", open);
      }
    }, 600);
  });
  for (const ev of [et.WORLDINFO_SETTINGS_UPDATED, et.OAI_PRESET_CHANGED_AFTER, et.PRESET_CHANGED, et.SETTINGS_UPDATED]) {
    if (ev) es.on(ev, () => {
      if (envReport.value) refreshEnv();
    });
  }
}
const archiveTarget = y$1(null);
const archiveVersion = y$1(0);
const bump = () => {
  archiveVersion.value++;
};
function allCharacters() {
  return (ctx().characters ?? []).filter((c2) => c2?.avatar);
}
function findChar(avatar) {
  const list = ctx().characters ?? [];
  const chid = list.findIndex((c2) => c2?.avatar === avatar);
  return chid >= 0 ? { char: list[chid], chid } : null;
}
async function ensureFullCharacter(avatar) {
  const f2 = findChar(avatar);
  if (f2?.char?.shallow && typeof ctx().unshallowCharacter === "function") {
    await ctx().unshallowCharacter(f2.chid);
    bump();
  }
}
function thumbnailUrl(avatar) {
  return `/thumbnail?type=avatar&file=${encodeURIComponent(avatar)}`;
}
function installedExtensions() {
  const names = loaded.extensions?.extensionNames ?? [];
  const disabled = ctx().extensionSettings?.disabledExtensions ?? [];
  return names.filter((n2) => n2.startsWith("third-party/")).map((n2) => {
    const id = n2.replace("third-party/", "");
    let name = id;
    try {
      name = loaded.extensions?.getExtensionManifest?.(n2)?.display_name || id;
    } catch {
    }
    return { id, name, enabled: !disabled.includes(n2) };
  });
}
const loose = (s2) => s2.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, "");
function matchExtension(req, installed2) {
  const k2 = loose(req.name);
  if (!k2) return void 0;
  return installed2.find((e2) => loose(e2.id) === k2 || loose(e2.name) === k2) ?? installed2.find((e2) => loose(e2.id).includes(k2) || loose(e2.name).includes(k2) || loose(e2.id).length >= 4 && k2.includes(loose(e2.id)));
}
function extStatus(req, installed2 = installedExtensions()) {
  const match = matchExtension(req, installed2);
  return { status: !match ? "missing" : match.enabled ? "enabled" : "disabled", match };
}
const TAVERN_HELPER = { name: "JS-Slash-Runner", url: "https://github.com/N0VI028/JS-Slash-Runner" };
function worldNames() {
  return loaded.worldInfo?.world_names ?? [];
}
function cardInfo(char) {
  const d2 = char.data ?? {};
  const ext = d2.extensions ?? {};
  const es = ctx().extensionSettings ?? {};
  const names = worldNames();
  const bound = ext.world ?? "";
  const book = d2.character_book;
  const state = bound ? names.includes(bound) ? "ok" : "missing" : book?.entries?.length ? "unbound" : "none";
  const extra = loaded.worldInfo?.world_info?.charLore?.find((e2) => e2.name === charaFileName(char.avatar))?.extraBooks ?? [];
  const cardRegex = ext.regex_scripts ?? [];
  const th = thScripts(ext.tavern_helper ?? ext.TavernHelper_scripts);
  const autoExts = [];
  if (th.length) autoExts.push({ req: TAVERN_HELPER, reason: `卡里有 ${th.length} 个酒馆助手脚本` });
  const cur = currentCharacter();
  return {
    avatar: char.avatar,
    name: char.name ?? d2.name ?? "",
    isCurrent: !!cur && cur.avatar === char.avatar,
    shallow: !!char.shallow,
    creator: d2.creator ?? char.creator ?? "",
    version: d2.character_version ?? "",
    creatorNotes: d2.creator_notes ?? char.creatorcomment ?? "",
    tags: d2.tags ?? char.tags ?? [],
    contacts: detectContacts(`${d2.creator ?? ""}
${d2.creator_notes ?? ""}`),
    autoSource: autoSourceUrl(ext),
    world: {
      name: bound,
      state,
      embedded: book?.entries ? book.entries.length : null,
      extra,
      importName: bound || book?.name || `${char.name}'s Lorebook`
    },
    regex: {
      total: cardRegex.length,
      enabled: cardRegex.filter((r2) => !r2.disabled).length,
      allowed: (es.character_allowed_regex ?? []).includes(char.avatar)
    },
    scripts: {
      total: th.length,
      enabled: thCharacterScriptsEnabled(es, char),
      names: th.map((s2) => s2.name)
    },
    autoExts,
    record: settings().cards[char.avatar],
    preset: settings().profiles[char.avatar]?.preset
  };
}
function requiredExtensions(info) {
  const manual = (info.record?.extensions ?? []).map((req) => ({ req, auto: false }));
  const installed2 = installedExtensions();
  const manualIds = new Set(manual.map((m2) => matchExtension(m2.req, installed2)?.id ?? loose(m2.req.name)));
  const auto = info.autoExts.filter((a2) => !manualIds.has(matchExtension(a2.req, installed2)?.id ?? loose(a2.req.name))).map((a2) => ({ ...a2, auto: true }));
  return [...manual, ...auto];
}
function updateRecord(avatar, cardName, patch) {
  const s2 = settings();
  const next = { ...s2.cards[avatar] ?? emptyRecord(cardName), ...patch, cardName, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  if (isRecordEmpty(next)) delete s2.cards[avatar];
  else s2.cards[avatar] = next;
  saveSettings();
  bump();
}
function presetApi() {
  try {
    return loaded.regexEngine?.getCurrentPresetAPI?.() ?? ctx().mainApi ?? "";
  } catch {
    return ctx().mainApi ?? "";
  }
}
function currentPresetName() {
  try {
    return ctx().getPresetManager()?.getSelectedPresetName?.() ?? "";
  } catch {
    return "";
  }
}
function presetNames() {
  try {
    return ctx().getPresetManager()?.getAllPresets?.() ?? [];
  } catch {
    return [];
  }
}
function presetRegexCount(name) {
  try {
    const p2 = ctx().getPresetManager()?.getCompletionPresetByName?.(name);
    return (p2?.extensions?.regex_scripts ?? []).length;
  } catch {
    return 0;
  }
}
function setRecommendedPreset(avatar, cardName, name) {
  const s2 = settings();
  const p2 = s2.profiles[avatar] ?? { savedAt: (/* @__PURE__ */ new Date()).toISOString(), cardName };
  if (name) p2.preset = { api: presetApi(), name };
  else delete p2.preset;
  p2.cardName = cardName;
  if (!p2.preset && !p2.globalWorlds && !p2.globalRegexEnabled) delete s2.profiles[avatar];
  else s2.profiles[avatar] = p2;
  saveSettings();
  refreshEnv();
  bump();
}
async function switchPreset(name) {
  await runSlash(`/preset ${slashQuote(name)}`);
  refreshEnv();
  bump();
}
async function checkWorld(info) {
  if (info.world.state !== "ok" || info.world.embedded === null) return null;
  const f2 = findChar(info.avatar);
  const data = await loaded.worldInfo?.loadWorldInfo?.(info.world.name);
  if (!f2 || !data) return null;
  return diffBooks(cardBookEntries(f2.char.data?.character_book), worldBookEntries(data));
}
function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i2 = 0; i2 < bytes.length; i2 += 32768) bin += String.fromCharCode(...bytes.subarray(i2, i2 + 32768));
  return btoa(bin);
}
async function backupWorld(name) {
  const data = await loaded.worldInfo?.loadWorldInfo?.(name);
  if (!data) throw new Error(`读不到世界书「${name}」`);
  const file = backupFileName(name, /* @__PURE__ */ new Date());
  const res = await fetch("/api/files/upload", {
    method: "POST",
    headers: ctx().getRequestHeaders(),
    body: JSON.stringify({ name: file, data: toBase64(JSON.stringify({ ...data, rbtBackupOf: name }, null, 2)) })
  });
  if (!res.ok) throw new Error(`备份失败：${res.status} ${await res.text()}`);
  settings().worldBackups.push({ file, world: name, at: (/* @__PURE__ */ new Date()).toISOString() });
  saveSettings();
  return file;
}
async function importCardWorld(avatar, { overwrite = false, quiet = false } = {}) {
  const f2 = findChar(avatar);
  const wi = loaded.worldInfo;
  const book = f2?.char?.data?.character_book;
  if (!f2 || !wi || !book?.entries?.length) return "nobook";
  const info = cardInfo(f2.char);
  const name = info.world.importName;
  const exists = worldNames().includes(name);
  if (exists && !overwrite) return "exists";
  try {
    let backup = "";
    if (exists) backup = await backupWorld(name);
    await wi.saveWorldInfo(name, wi.convertCharacterBook(structuredClone(book)), true);
    await wi.updateWorldInfoList();
    if (f2.char.data?.extensions?.world !== name) await ctx().writeExtensionField(f2.chid, "world", name);
    try {
      ctx().accountStorage?.setItem(`AlertWI_${avatar}`, "true");
    } catch {
    }
    if (!quiet) {
      toast("success", exists ? `已用卡里的版本覆盖世界书「${name}」，旧版本已备份。` : `已从卡里导入世界书「${name}」并绑定到「${f2.char.name}」`, "角色档案");
    }
    refreshEnv();
    bump();
    return exists ? "overwritten" : "imported";
  } catch (e2) {
    console.error("[RedBird] world import failed", e2);
    toast("error", `导入世界书「${name}」失败：${e2.message}`, "角色档案");
    return "failed";
  }
}
function cardsMissingWorld() {
  const names = worldNames();
  return allCharacters().map(cardInfo).filter((i2) => i2.world.embedded && (i2.world.state === "missing" || i2.world.state === "unbound" && !names.includes(i2.world.importName)));
}
async function importAllMissingWorlds() {
  let n2 = 0;
  for (const i2 of cardsMissingWorld()) if (await importCardWorld(i2.avatar, { quiet: true }) === "imported") n2++;
  toast("success", `已从卡里导入 ${n2} 本世界书`, "角色档案");
  return n2;
}
function globalRegexScripts() {
  return ctx().extensionSettings?.regex ?? [];
}
function setRegexOwner(id, owner) {
  const s2 = settings();
  if (owner) s2.regexOwners[id] = owner;
  else delete s2.regexOwners[id];
  saveSettings();
  refreshEnv();
  bump();
}
function guessRegexOwner(script) {
  const exts = installedExtensions();
  const id = guessRegexExtension(script.scriptName ?? "", exts.map((e2) => e2.id));
  if (!id) return null;
  return { kind: "extension", key: id, label: exts.find((e2) => e2.id === id)?.name ?? id };
}
function buildOverview() {
  const chars = allCharacters();
  const cards = chars.map(cardInfo).sort((a2, b2) => a2.name.localeCompare(b2.name, "zh"));
  const byPreset = /* @__PURE__ */ new Map();
  const byWorld = /* @__PURE__ */ new Map();
  for (const c2 of cards) {
    if (c2.preset) byPreset.set(c2.preset.name, [...byPreset.get(c2.preset.name) ?? [], c2]);
    for (const w2 of [c2.world.name, ...c2.world.extra].filter(Boolean)) byWorld.set(w2, [...byWorld.get(w2) ?? [], c2]);
  }
  const selected = loaded.worldInfo?.selected_world_info ?? [];
  const unusedWorlds = worldNames().filter((w2) => !byWorld.has(w2)).map((name) => ({ name, global: selected.includes(name) }));
  const s2 = settings();
  const recordKeys = {};
  for (const [k2, v2] of Object.entries(s2.cards)) recordKeys[k2] = v2;
  for (const [k2, v2] of Object.entries(s2.profiles)) recordKeys[k2] ??= v2;
  const orphans = findOrphans(recordKeys, chars.map((c2) => ({ avatar: c2.avatar, name: c2.name })));
  return { cards, byPreset, byWorld, unusedWorlds, orphans };
}
function relink(oldAvatar, newAvatar) {
  const s2 = settings();
  const f2 = findChar(newAvatar);
  if (s2.cards[oldAvatar]) {
    s2.cards[newAvatar] = { ...s2.cards[oldAvatar], cardName: f2?.char?.name ?? s2.cards[oldAvatar].cardName };
    delete s2.cards[oldAvatar];
  }
  if (s2.profiles[oldAvatar]) {
    s2.profiles[newAvatar] = s2.profiles[oldAvatar];
    delete s2.profiles[oldAvatar];
  }
  for (const o2 of Object.values(s2.regexOwners)) if (o2.kind === "card" && o2.key === oldAvatar) o2.key = newAvatar;
  saveSettings();
  refreshEnv();
  bump();
}
function dropRecord(avatar) {
  const s2 = settings();
  delete s2.cards[avatar];
  delete s2.profiles[avatar];
  saveSettings();
  refreshEnv();
  bump();
}
function exportArchive() {
  const s2 = settings();
  const file = {
    format: ARCHIVE_FORMAT,
    version: 1,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    cards: s2.cards,
    profiles: s2.profiles,
    regexOwners: s2.regexOwners
  };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const a2 = document.createElement("a");
  a2.href = URL.createObjectURL(blob);
  a2.download = `RedBird-角色档案-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a2);
  a2.click();
  a2.remove();
  setTimeout(() => URL.revokeObjectURL(a2.href), 1e3);
}
async function importArchive(text, mode) {
  const inc = parseArchive(text);
  const s2 = settings();
  if (mode === "overwrite") {
    const ok = await ctx().Popup?.show?.confirm?.("覆盖导入", "会用文件里的内容替换现在所有的角色档案、记住的环境和正则归属。确定吗？");
    if (!ok) return;
  }
  s2.cards = mergeRecords(s2.cards, inc.cards, mode, (v2) => v2.updatedAt ?? "");
  s2.profiles = mergeRecords(s2.profiles, inc.profiles, mode, (v2) => v2.savedAt ?? "");
  s2.regexOwners = mergeRecords(s2.regexOwners, inc.regexOwners, mode);
  saveSettings();
  refreshEnv();
  bump();
  toast("success", `已导入 ${Object.keys(inc.cards).length} 张卡的档案（${mode === "merge" ? "合并" : "覆盖"}）`, "角色档案");
}
let lastAvatar$1 = null;
function installCardsWatch(openPanel2) {
  const c2 = ctx();
  c2.eventSource.on(c2.eventTypes.CHAT_CHANGED, () => {
    archiveTarget.value = null;
    bump();
    setTimeout(async () => {
      const char = currentCharacter();
      if (!char?.avatar || char.avatar === lastAvatar$1) return;
      lastAvatar$1 = char.avatar;
      const info = cardInfo(char);
      if (settings().autoImportWorld && info.world.embedded && (info.world.state === "missing" || info.world.state === "unbound")) {
        await importCardWorld(char.avatar);
      }
      if (settings().autoApplyEnv) return;
      const installed2 = installedExtensions();
      const bad = requiredExtensions(info).map((r2) => ({ ...r2, ...extStatus(r2.req, installed2) })).filter((r2) => r2.status !== "enabled");
      if (bad.length) {
        const text = bad.map((b2) => `${b2.match?.name ?? b2.req.name}${b2.status === "missing" ? "（未安装）" : "（未启用）"}`).join("、");
        toast("warning", `「${info.name}」需要的插件：${text}。点这里查看。`, "角色档案", { onclick: () => openPanel2("cards"), timeOut: 8e3 });
      }
    }, 300);
  });
  for (const ev of [c2.eventTypes.SETTINGS_UPDATED, c2.eventTypes.WORLDINFO_SETTINGS_UPDATED, c2.eventTypes.OAI_PRESET_CHANGED_AFTER, c2.eventTypes.CHARACTER_EDITED]) {
    if (ev) c2.eventSource.on(ev, bump);
  }
}
const charsTick = y$1(0);
function toTime(v2) {
  if (typeof v2 === "number") return v2;
  const n2 = Date.parse(String(v2 ?? ""));
  return Number.isNaN(n2) ? 0 : n2;
}
function isFav(ch) {
  const v2 = ch?.fav ?? ch?.data?.extensions?.fav;
  return v2 === true || v2 === "true";
}
function tagsFor(key) {
  const c2 = ctx();
  const ids = c2.tagMap?.[key] ?? [];
  const all = c2.tags ?? [];
  return ids.map((id) => all.find((t2) => t2.id === id)).filter(Boolean).map((t2) => ({ id: t2.id, name: t2.name, color: t2.color || void 0 }));
}
function listCharacters() {
  const c2 = ctx();
  const installed2 = installedExtensions();
  const s2 = c2.extensionSettings?.redbird_tools ?? {};
  const chars = (c2.characters ?? []).map((ch, i2) => {
    const info = cardInfo(ch);
    const problems = [];
    if (info.world.state === "missing") problems.push("世界书缺文件");
    if (info.world.state === "unbound") problems.push("世界书没导入");
    if (info.regex.total > 0 && !info.regex.allowed) problems.push("正则未允许运行");
    if (info.scripts.total > 0 && !info.scripts.enabled) problems.push("脚本未启用");
    if (requiredExtensions(info).some((e2) => extStatus(e2.req, installed2).status !== "enabled")) problems.push("缺插件");
    const notes = cleanPreview(ch.data?.creator_notes ?? ch.creatorcomment ?? "");
    return {
      kind: "character",
      ref: String(i2),
      key: `c:${ch.avatar}`,
      name: String(ch.name ?? ""),
      thumb: c2.getThumbnailUrl("avatar", ch.avatar),
      fav: isFav(ch),
      note: notes,
      version: String(ch.data?.character_version ?? ""),
      tags: tagsFor(ch.avatar),
      lastChat: toTime(ch.date_last_chat),
      added: toTime(ch.date_added ?? ch.create_date),
      problems,
      hasLinks: !!s2.cards?.[ch.avatar]?.links?.length
    };
  });
  const groups = (c2.groups ?? []).map((g2) => ({
    kind: "group",
    ref: String(g2.id),
    key: `g:${g2.id}`,
    name: String(g2.name ?? ""),
    thumb: g2.avatar_url || "img/five.png",
    fav: g2.fav === true || g2.fav === "true",
    note: `群组 · ${(g2.members ?? []).length} 个角色`,
    version: "",
    tags: tagsFor(g2.id),
    lastChat: toTime(g2.date_last_chat),
    added: toTime(g2.date_added ?? g2.create_date),
    problems: [],
    hasLinks: false
  }));
  return [...chars, ...groups];
}
function sortCharacters(items, sort) {
  const out = [...items];
  if (sort === "name") out.sort((a2, b2) => a2.name.localeCompare(b2.name, "zh-Hans-CN"));
  else if (sort === "added") out.sort((a2, b2) => b2.added - a2.added);
  else out.sort((a2, b2) => b2.lastChat - a2.lastChat);
  return out.sort((a2, b2) => Number(b2.fav) - Number(a2.fav));
}
function allTags(items) {
  const m2 = /* @__PURE__ */ new Map();
  for (const it of items) for (const t2 of it.tags) {
    const e2 = m2.get(t2.id) ?? { tag: t2, count: 0 };
    e2.count++;
    m2.set(t2.id, e2);
  }
  return [...m2.values()].sort((a2, b2) => b2.count - a2.count || a2.tag.name.localeCompare(b2.tag.name));
}
async function openCharacter(it) {
  const c2 = ctx();
  try {
    if (it.kind === "group") {
      const g2 = c2.groups?.find((x2) => String(x2.id) === it.ref);
      await c2.openGroupChat(it.ref, g2?.chat_id);
    } else if (String(c2.characterId) !== it.ref || c2.groupId) {
      await c2.selectCharacterById(Number(it.ref));
    }
  } catch (e2) {
    console.error("[RedBird] open character failed", e2);
    toast("error", `打开失败：${String(e2)}`);
  }
}
async function editCharacter(it) {
  await openCharacter(it);
  openDrawer("characters");
}
async function toggleFavorite(it) {
  if (it.kind !== "character") return;
  const c2 = ctx();
  const ch = c2.characters?.[Number(it.ref)];
  if (!ch) return;
  const next = !isFav(ch);
  const res = await fetch("/api/characters/merge-attributes", {
    method: "POST",
    headers: c2.getRequestHeaders(),
    body: JSON.stringify({ avatar: ch.avatar, fav: next, data: { extensions: { fav: next } } })
  });
  if (!res.ok) {
    toast("error", `收藏没保存上：${res.status}`);
    return;
  }
  ch.fav = next;
  ch.data ??= {};
  ch.data.extensions ??= {};
  ch.data.extensions.fav = next;
  charsTick.value++;
}
function clickSt(selector) {
  const $2 = window.jQuery;
  if ($2) $2(selector).first().trigger("click");
  else document.querySelector(selector)?.click();
}
function createCharacter() {
  openDrawer("characters");
  setTimeout(() => clickSt("#rm_button_create"), 250);
}
function importCharacterFile() {
  clickSt("#character_import_button");
}
function importCharacterUrl() {
  clickSt("#external_import_button");
}
function createGroup() {
  openDrawer("characters");
  setTimeout(() => clickSt("#rm_button_group_chats"), 250);
}
function installCharactersWatch() {
  const c2 = ctx();
  const bump2 = () => {
    charsTick.value++;
  };
  for (const ev of [
    c2.eventTypes.CHARACTER_PAGE_LOADED,
    c2.eventTypes.CHARACTER_EDITED,
    c2.eventTypes.CHARACTER_DELETED,
    c2.eventTypes.CHARACTER_RENAMED,
    c2.eventTypes.CHAT_CHANGED,
    c2.eventTypes.GROUP_UPDATED,
    c2.eventTypes.APP_READY
  ]) {
    if (ev) c2.eventSource.on(ev, bump2);
  }
}
function editorSelect() {
  return document.getElementById("world_editor_select");
}
function selectedBook() {
  const sel = editorSelect();
  return sel && sel.value !== "" ? sel.selectedOptions[0]?.textContent ?? "" : "";
}
function openBookInEditor(name) {
  const sel = editorSelect();
  if (!sel) return;
  const opt = [...sel.options].find((o2) => o2.value !== "" && o2.textContent === name);
  if (!opt || sel.value === opt.value) return;
  sel.value = opt.value;
  const $2 = window.jQuery;
  if ($2) $2(sel).trigger("change");
  else sel.dispatchEvent(new Event("change", { bubbles: true }));
}
function loadedGroups() {
  const s2 = currentBookScopes();
  return [
    { label: "这张卡", books: [...s2.character] },
    { label: "这个聊天", books: [...s2.chat] },
    { label: "用户设定", books: [...s2.persona] },
    { label: "全局", books: [...s2.global] }
  ].filter((g2) => g2.books.length);
}
function render() {
  const note = sheetNoteElement("worldinfo");
  if (!note) return;
  note.textContent = "";
  const groups = loadedGroups();
  if (!groups.length) {
    note.textContent = "现在没有加载任何世界书";
    return;
  }
  const current = selectedBook();
  note.append("已加载 — ");
  groups.forEach((g2, gi) => {
    if (gi) note.append("；");
    note.append(`${g2.label}：`);
    g2.books.forEach((b2, bi) => {
      if (bi) note.append("、");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `rbt-note-book${b2 === current ? " active" : ""}`;
      btn.textContent = b2;
      btn.title = b2 === current ? "编辑器里正在显示这本" : "在编辑器里打开这本";
      btn.addEventListener("click", () => {
        openBookInEditor(b2);
        render();
      });
      note.append(btn);
    });
  });
  note.title = groups.map((g2) => `${g2.label}：${g2.books.join("、")}`).join("；");
}
let autoDoneFor = "";
function autoSelect() {
  const chatId = String(ctx().getCurrentChatId?.() ?? "");
  if (!chatId || autoDoneFor === chatId) return;
  autoDoneFor = chatId;
  const groups = loadedGroups();
  const loaded2 = groups.flatMap((g2) => g2.books);
  const preferred = groups.find((g2) => g2.label === "这张卡")?.books[0] ?? groups.find((g2) => g2.label === "这个聊天")?.books[0];
  if (!preferred) return;
  const current = selectedBook();
  if (!current || !loaded2.includes(current)) openBookInEditor(preferred);
}
function installWorldNote() {
  openDrawers.subscribe((open) => {
    if (!open.includes("worldinfo")) return;
    autoSelect();
    render();
  });
  document.addEventListener("change", (e2) => {
    if (e2.target?.id === "world_editor_select") render();
  });
}
function Chip(props) {
  return /* @__PURE__ */ u$2("span", { class: `rbt-chip ${props.color ? "has-color" : ""} ${props.class ?? ""}`, title: props.title, style: props.color ? { "--chip": props.color } : void 0, children: props.children });
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
function SwitchRow({ label, detail, checked, onChange }) {
  return /* @__PURE__ */ u$2("div", { class: "rbt-switch-row", children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-switch-text", children: [
      /* @__PURE__ */ u$2("span", { children: label }),
      detail && /* @__PURE__ */ u$2("small", { children: detail })
    ] }),
    /* @__PURE__ */ u$2(Toggle, { checked, onChange })
  ] });
}
const OK = "#2fbf8f";
const WARN = "#f0a43a";
const BAD = "#e5484d";
function LinkText({ text }) {
  return /* @__PURE__ */ u$2(S$1, { children: splitLinks(text).map((p2, i2) => "url" in p2 ? /* @__PURE__ */ u$2("a", { href: p2.url, target: "_blank", rel: "noopener noreferrer", children: p2.url }, i2) : /* @__PURE__ */ u$2("span", { children: p2.text }, i2)) });
}
function LongText({ text, limit = 400 }) {
  const [open, setOpen] = d$1(false);
  const long = text.length > limit;
  return /* @__PURE__ */ u$2("div", { class: "rbt-pre", children: [
    /* @__PURE__ */ u$2(LinkText, { text: long && !open ? `${text.slice(0, limit)}…` : text }),
    long && /* @__PURE__ */ u$2("div", { children: /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small", onClick: () => setOpen(!open), children: open ? "收起" : "展开全部" }) })
  ] });
}
function Section({ title, hint, children }) {
  return /* @__PURE__ */ u$2("div", { class: "rbt-card-section", children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-card-section-head", children: [
      /* @__PURE__ */ u$2("b", { children: title }),
      hint && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: [
        " ",
        hint
      ] })
    ] }),
    children
  ] });
}
const STATUS_CHIP = {
  enabled: { color: OK, text: "已启用" },
  disabled: { color: WARN, text: "已装，未启用" },
  missing: { color: BAD, text: "未安装" }
};
const CONTACT_LABEL = { discord: "Discord", qq: "QQ", qqgroup: "QQ 群", url: "链接" };
function inputValue(e2) {
  return e2.currentTarget.value;
}
function CardHeader({ info }) {
  const [firstLine, ...rest] = info.version.split(/\r?\n/);
  return /* @__PURE__ */ u$2("div", { class: "rbt-card-head", children: [
    /* @__PURE__ */ u$2("img", { class: "rbt-avatar", src: thumbnailUrl(info.avatar), alt: "", loading: "lazy" }),
    /* @__PURE__ */ u$2("div", { class: "rbt-card-head-main", children: [
      /* @__PURE__ */ u$2("div", { class: "rbt-card-title", children: [
        /* @__PURE__ */ u$2("b", { children: info.name }),
        !info.isCurrent && /* @__PURE__ */ u$2(Chip, { color: WARN, children: "不是正在玩的卡" })
      ] }),
      info.creator && /* @__PURE__ */ u$2("div", { class: "rbt-muted rbt-pre-line", children: [
        "作者：",
        info.creator
      ] }),
      firstLine && (rest.length ? /* @__PURE__ */ u$2("details", { class: "rbt-inline-details", children: [
        /* @__PURE__ */ u$2("summary", { class: "rbt-muted", children: [
          "版本：",
          firstLine,
          "（还有 ",
          rest.length,
          " 行更新记录）"
        ] }),
        /* @__PURE__ */ u$2("div", { class: "rbt-pre", children: rest.join("\n") })
      ] }) : /* @__PURE__ */ u$2("div", { class: "rbt-muted", children: [
        "版本：",
        firstLine
      ] })),
      info.tags.length > 0 && /* @__PURE__ */ u$2("div", { class: "rbt-chips", children: info.tags.map((t2) => /* @__PURE__ */ u$2(Chip, { children: t2 }, t2)) })
    ] }),
    !info.isCurrent && currentCharacter() && /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small", onClick: () => {
      archiveTarget.value = null;
    }, children: "回到当前卡" })
  ] });
}
function SourceSection({ info }) {
  const rec = info.record;
  const links = rec?.links ?? [];
  const [label, setLabel] = d$1("");
  const [url, setUrl] = d$1("");
  const [editing, setEditing] = d$1(false);
  const [draft, setDraft] = d$1("");
  const urlOk = isHttpUrl(url);
  const addLink = () => {
    if (!urlOk) return;
    updateRecord(info.avatar, info.name, { links: [...links, { label: label.trim() || "链接", url: url.trim() }] });
    setLabel("");
    setUrl("");
  };
  return /* @__PURE__ */ u$2(Section, { title: "来源与作者说明", children: [
    (info.contacts.length > 0 || info.autoSource) && /* @__PURE__ */ u$2("div", { class: "rbt-card-sub", children: [
      /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "卡里写的来源和联系方式：" }),
      /* @__PURE__ */ u$2("div", { class: "rbt-chips", children: [
        info.contacts.map((c2, i2) => c2.kind === "url" ? /* @__PURE__ */ u$2("a", { href: c2.value, target: "_blank", rel: "noopener noreferrer", children: c2.value }, i2) : /* @__PURE__ */ u$2(Chip, { title: "从卡的作者信息里找到的", children: [
          CONTACT_LABEL[c2.kind],
          " ",
          c2.value
        ] }, i2)),
        info.autoSource && /* @__PURE__ */ u$2("a", { href: info.autoSource, target: "_blank", rel: "noopener noreferrer", children: info.autoSource })
      ] })
    ] }),
    info.creatorNotes.trim() && /* @__PURE__ */ u$2("div", { class: "rbt-card-sub", children: [
      /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "作者写在卡里的备注：" }),
      /* @__PURE__ */ u$2(LongText, { text: info.creatorNotes })
    ] }),
    /* @__PURE__ */ u$2("div", { class: "rbt-card-sub", children: [
      /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "相关链接，比如发布帖、更新帖、教程：" }),
      links.map((l2, i2) => /* @__PURE__ */ u$2("div", { class: "rbt-link-row", children: [
        /* @__PURE__ */ u$2("a", { href: l2.url, target: "_blank", rel: "noopener noreferrer", title: l2.url, children: l2.label }),
        /* @__PURE__ */ u$2("small", { class: "rbt-muted rbt-ellipsis", children: l2.url }),
        /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small", title: "删除这条链接", onClick: () => updateRecord(info.avatar, info.name, { links: links.filter((_2, j2) => j2 !== i2) }), children: "✕" })
      ] }, i2)),
      /* @__PURE__ */ u$2("div", { class: "rbt-form-row", children: [
        /* @__PURE__ */ u$2("input", { class: "text_pole rbt-input rbt-w-label", placeholder: "名称，如：发布帖", value: label, onInput: (e2) => setLabel(inputValue(e2)) }),
        /* @__PURE__ */ u$2("input", { class: "text_pole rbt-input", placeholder: "https://…", value: url, onInput: (e2) => setUrl(inputValue(e2)), onKeyDown: (e2) => {
          if (e2.key === "Enter") addLink();
        } }),
        /* @__PURE__ */ u$2("button", { class: "rbt-btn", disabled: !urlOk, onClick: addLink, children: "添加" })
      ] })
    ] }),
    /* @__PURE__ */ u$2("div", { class: "rbt-card-sub", children: [
      /* @__PURE__ */ u$2("div", { class: "rbt-row-between", children: [
        /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "作者说明：" }),
        !editing && /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small", onClick: () => {
          setDraft(rec?.notes ?? "");
          setEditing(true);
        }, children: rec?.notes ? "编辑" : "填写" })
      ] }),
      editing ? /* @__PURE__ */ u$2(S$1, { children: [
        /* @__PURE__ */ u$2("textarea", { class: "text_pole rbt-textarea", rows: 10, value: draft, placeholder: "把发布帖里的推荐设置、玩法和注意事项粘进来。网址会自动变成链接。", onInput: (e2) => setDraft(e2.currentTarget.value) }),
        /* @__PURE__ */ u$2("div", { class: "rbt-row", children: [
          /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-primary", onClick: () => {
            updateRecord(info.avatar, info.name, { notes: draft });
            setEditing(false);
          }, children: "保存" }),
          /* @__PURE__ */ u$2("button", { class: "rbt-btn", onClick: () => setEditing(false), children: "取消" })
        ] })
      ] }) : rec?.notes ? /* @__PURE__ */ u$2(LongText, { text: rec.notes, limit: 600 }) : /* @__PURE__ */ u$2("div", { class: "rbt-muted", children: "还没填写。可以把发布帖里的推荐设置和玩法粘进来。" })
    ] })
  ] });
}
function PresetSection({ info }) {
  const names = presetNames();
  const rec = info.preset;
  const current = currentPresetName();
  const otherApi = rec && rec.api !== presetApi();
  return /* @__PURE__ */ u$2(Section, { title: "推荐预设", hint: "切到这张卡时自动换上", children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-form-row", children: [
      /* @__PURE__ */ u$2("select", { class: "text_pole rbt-select", value: rec?.name ?? "", onChange: (e2) => setRecommendedPreset(info.avatar, info.name, e2.currentTarget.value || null), children: [
        /* @__PURE__ */ u$2("option", { value: "", children: "不指定" }),
        rec && !names.includes(rec.name) && /* @__PURE__ */ u$2("option", { value: rec.name, children: [
          rec.name,
          "（已不存在）"
        ] }),
        names.map((n2) => /* @__PURE__ */ u$2("option", { value: n2, children: n2 }, n2))
      ] }),
      !rec && info.isCurrent && current && /* @__PURE__ */ u$2("button", { class: "rbt-btn", onClick: () => setRecommendedPreset(info.avatar, info.name, current), children: "用现在这个" })
    ] }),
    otherApi && /* @__PURE__ */ u$2("div", { class: "rbt-hint", children: [
      "这个推荐是在「",
      rec.api,
      "」下设的，和现在用的 API 不同，所以不会自动换。"
    ] }),
    rec && info.isCurrent && !otherApi && rec.name !== current && /* @__PURE__ */ u$2("div", { class: "rbt-warn rbt-row-between", children: [
      /* @__PURE__ */ u$2("span", { children: [
        "现在用的是「",
        current,
        "」，推荐的是「",
        rec.name,
        "」。"
      ] }),
      /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-primary rbt-btn-small", onClick: () => switchPreset(rec.name), children: "换上推荐的" })
    ] })
  ] });
}
function ExtSection({ info }) {
  const installed2 = installedExtensions();
  const list = requiredExtensions(info);
  const manual = info.record?.extensions ?? [];
  const [pick, setPick] = d$1("");
  const [name, setName] = d$1("");
  const [url, setUrl] = d$1("");
  const listed = new Set(list.map((l2) => extStatus(l2.req, installed2).match?.id).filter(Boolean));
  const add = () => {
    const req = pick === "__other" ? { name: name.trim(), url: isHttpUrl(url) ? url.trim() : void 0 } : { name: pick };
    if (!req.name) return;
    updateRecord(info.avatar, info.name, { extensions: [...manual, req] });
    setPick("");
    setName("");
    setUrl("");
  };
  return /* @__PURE__ */ u$2(Section, { title: "需要的插件", children: [
    !list.length && /* @__PURE__ */ u$2("div", { class: "rbt-muted", children: "还没登记。从下面选一个已装的插件，或手动填一个没装的。" }),
    list.map((l2, i2) => {
      const st = extStatus(l2.req, installed2);
      const chip = STATUS_CHIP[st.status];
      return /* @__PURE__ */ u$2("div", { class: "rbt-link-row", children: [
        /* @__PURE__ */ u$2(Chip, { color: chip.color, children: chip.text }),
        /* @__PURE__ */ u$2("span", { class: "rbt-env-name", children: st.match?.name ?? l2.req.name }),
        l2.auto && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: l2.reason }),
        st.status === "missing" && l2.req.url && /* @__PURE__ */ u$2("a", { href: l2.req.url, target: "_blank", rel: "noopener noreferrer", children: "安装地址" }),
        !l2.auto && /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small rbt-push", title: "从列表里删除", onClick: () => updateRecord(info.avatar, info.name, { extensions: manual.filter((m2) => m2 !== l2.req) }), children: "✕" })
      ] }, `${l2.req.name}${i2}`);
    }),
    /* @__PURE__ */ u$2("div", { class: "rbt-form-row", children: [
      /* @__PURE__ */ u$2("select", { class: "text_pole rbt-select", value: pick, onChange: (e2) => setPick(e2.currentTarget.value), children: [
        /* @__PURE__ */ u$2("option", { value: "", children: "添加插件…" }),
        installed2.filter((e2) => !listed.has(e2.id)).map((e2) => /* @__PURE__ */ u$2("option", { value: e2.id, children: [
          e2.name,
          e2.enabled ? "" : "（未启用）"
        ] }, e2.id)),
        /* @__PURE__ */ u$2("option", { value: "__other", children: "没装的插件，手动填写…" })
      ] }),
      pick && pick !== "__other" && /* @__PURE__ */ u$2("button", { class: "rbt-btn", onClick: add, children: "添加" })
    ] }),
    pick === "__other" && /* @__PURE__ */ u$2("div", { class: "rbt-form-row", children: [
      /* @__PURE__ */ u$2("input", { class: "text_pole rbt-input rbt-w-label", placeholder: "插件名", value: name, onInput: (e2) => setName(inputValue(e2)) }),
      /* @__PURE__ */ u$2("input", { class: "text_pole rbt-input", placeholder: "安装地址（选填）", value: url, onInput: (e2) => setUrl(inputValue(e2)) }),
      /* @__PURE__ */ u$2("button", { class: "rbt-btn", disabled: !name.trim(), onClick: add, children: "添加" })
    ] })
  ] });
}
function DiffList({ title, entries }) {
  if (!entries.length) return null;
  return /* @__PURE__ */ u$2("details", { class: "rbt-inline-details", children: [
    /* @__PURE__ */ u$2("summary", { children: [
      title,
      " ",
      entries.length,
      " 条"
    ] }),
    /* @__PURE__ */ u$2("ul", { class: "rbt-diff-list", children: [
      entries.slice(0, 30).map((e2, i2) => /* @__PURE__ */ u$2("li", { children: [
        /* @__PURE__ */ u$2("b", { children: e2.comment || "（无标题）" }),
        " ",
        /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: e2.content.slice(0, 60) })
      ] }, i2)),
      entries.length > 30 && /* @__PURE__ */ u$2("li", { class: "rbt-muted", children: [
        "…还有 ",
        entries.length - 30,
        " 条"
      ] })
    ] })
  ] });
}
function WorldSection({ info }) {
  const [diff, setDiff] = d$1("loading");
  const [busy, setBusy] = d$1(false);
  const w2 = info.world;
  h$2(() => {
    let alive = true;
    setDiff("loading");
    checkWorld(info).then((d2) => {
      if (alive) setDiff(d2);
    }).catch(() => {
      if (alive) setDiff(null);
    });
    return () => {
      alive = false;
    };
  }, [info.avatar, w2.name, w2.state, archiveVersion.value]);
  const run = async (overwrite) => {
    if (overwrite) {
      const ok = await ctx().Popup?.show?.confirm?.(
        "用卡里的版本覆盖？",
        `世界书「${w2.importName}」会换成卡里自带的版本，只在现有世界书里的条目会丢失（可能是你或脚本加的）。覆盖前会自动备份。`
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      await importCardWorld(info.avatar, { overwrite });
    } finally {
      setBusy(false);
    }
  };
  const nameTaken = worldNames().includes(w2.importName);
  return /* @__PURE__ */ u$2(Section, { title: "世界书", children: [
    w2.state === "none" && /* @__PURE__ */ u$2("div", { class: "rbt-muted", children: "这张卡没有世界书。" }),
    w2.state !== "none" && /* @__PURE__ */ u$2("div", { class: "rbt-link-row", children: [
      /* @__PURE__ */ u$2("span", { class: "rbt-env-name", children: w2.name || w2.importName }),
      w2.state === "ok" && /* @__PURE__ */ u$2(Chip, { color: OK, children: "已绑定" }),
      w2.state === "missing" && /* @__PURE__ */ u$2(Chip, { color: BAD, children: "找不到这本世界书" }),
      w2.state === "unbound" && /* @__PURE__ */ u$2(Chip, { color: WARN, children: "还没导入" }),
      w2.embedded !== null && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: [
        "卡里自带 ",
        w2.embedded,
        " 条"
      ] })
    ] }),
    (w2.state === "missing" || w2.state === "unbound") && w2.embedded !== null && (nameTaken ? /* @__PURE__ */ u$2("div", { class: "rbt-warn rbt-row-between", children: [
      /* @__PURE__ */ u$2("span", { children: [
        "已有一本同名世界书「",
        w2.importName,
        "」，所以没有自动导入。"
      ] }),
      /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small", disabled: busy, onClick: () => run(true), children: "用卡里的版本覆盖" })
    ] }) : /* @__PURE__ */ u$2("div", { class: "rbt-row", children: /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-primary", disabled: busy, onClick: () => run(false), children: busy ? "正在导入…" : "导入并绑定" }) })),
    w2.state === "ok" && w2.embedded !== null && (diff === "loading" ? /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "正在对比…" }) : diff && (diff.onlyCard.length || diff.onlyWorld.length) ? /* @__PURE__ */ u$2("div", { class: "rbt-warn", children: [
      /* @__PURE__ */ u$2("div", { children: [
        "卡里自带的和现在用的不一样：卡里 ",
        diff.card,
        " 条，现在 ",
        diff.world,
        " 条，其中 ",
        diff.same,
        " 条相同。"
      ] }),
      /* @__PURE__ */ u$2("small", { children: "只在现在这本里的，可能是你或脚本加的；只在卡里的，多半是作者更新了卡。" }),
      /* @__PURE__ */ u$2(DiffList, { title: "只在卡里", entries: diff.onlyCard }),
      /* @__PURE__ */ u$2(DiffList, { title: "只在现在这本里", entries: diff.onlyWorld }),
      /* @__PURE__ */ u$2("div", { class: "rbt-row", children: /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small", disabled: busy, onClick: () => run(true), children: "用卡里的版本覆盖" }) })
    ] }) : diff ? /* @__PURE__ */ u$2("small", { class: "rbt-ok", children: "和卡里自带的一致 ✓" }) : null),
    w2.extra.length > 0 && /* @__PURE__ */ u$2("div", { class: "rbt-card-sub", children: [
      /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "附加世界书：" }),
      w2.extra.map((b2) => /* @__PURE__ */ u$2(Chip, { children: b2 }, b2))
    ] })
  ] });
}
function RegexSection({ info }) {
  const owned = globalRegexScripts().filter((r2) => {
    const o2 = settings().regexOwners[r2.id];
    return o2?.kind === "card" && o2.key === info.avatar;
  });
  const preset = info.isCurrent ? currentPresetName() : "";
  const presetRx = preset ? presetRegexCount(preset) : 0;
  return /* @__PURE__ */ u$2(Section, { title: "正则与脚本", children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-link-row", children: [
      /* @__PURE__ */ u$2("span", { children: [
        "卡里的正则 ",
        /* @__PURE__ */ u$2("b", { children: info.regex.total }),
        " 条",
        info.regex.total > 0 && `，开着 ${info.regex.enabled} 条`
      ] }),
      info.regex.total > 0 && (info.regex.allowed ? /* @__PURE__ */ u$2(Chip, { color: OK, children: "已允许运行" }) : /* @__PURE__ */ u$2(Chip, { color: BAD, children: "未允许运行" }))
    ] }),
    /* @__PURE__ */ u$2("div", { class: "rbt-link-row", children: [
      /* @__PURE__ */ u$2("span", { children: [
        "酒馆助手角色脚本 ",
        /* @__PURE__ */ u$2("b", { children: info.scripts.total }),
        " 个"
      ] }),
      info.scripts.total > 0 && (info.scripts.enabled ? /* @__PURE__ */ u$2(Chip, { color: OK, children: "已启用" }) : /* @__PURE__ */ u$2(Chip, { color: BAD, children: "未启用" }))
    ] }),
    info.scripts.names.length > 0 && /* @__PURE__ */ u$2("div", { class: "rbt-chips", children: info.scripts.names.map((n2, i2) => /* @__PURE__ */ u$2(Chip, { children: n2 }, i2)) }),
    owned.length > 0 && /* @__PURE__ */ u$2("div", { class: "rbt-card-sub", children: [
      /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "标为属于这张卡的全局正则：" }),
      owned.map((r2) => /* @__PURE__ */ u$2("div", { class: "rbt-link-row", children: [
        /* @__PURE__ */ u$2("span", { children: r2.scriptName }),
        r2.disabled ? /* @__PURE__ */ u$2(Chip, { children: "关" }) : /* @__PURE__ */ u$2(Chip, { color: OK, children: "开" })
      ] }, r2.id))
    ] }),
    preset && presetRx > 0 && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: [
      "另外，正在用的预设「",
      preset,
      "」带了 ",
      presetRx,
      " 条正则，对所有卡生效。"
    ] }),
    /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "全局正则在左栏「全局工具箱」里逐条开关。" })
  ] });
}
const KIND_LABEL$1 = {
  worldbook: "世界书",
  regex: "正则",
  script: "脚本",
  extension: "插件",
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
    item.misplaced && /* @__PURE__ */ u$2(Chip, { color: "#f0a43a", title: `标为${item.misplaced}`, children: "不属于这张卡" }),
    item.detail && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: item.detail }),
    item.toggle && /* @__PURE__ */ u$2("span", { class: "rbt-env-toggle", children: [
      busy && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "…" }),
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
      busy && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "…" }),
      /* @__PURE__ */ u$2(Toggle, { checked: sub.enabled, onChange: onToggle, title: "点击开 / 关这一条" })
    ] })
  ] });
}
function SubItemList({ items, groupOff }) {
  const [filter, setFilter] = d$1("");
  const [onlyOn, setOnlyOn] = d$1(false);
  const shown = items.filter((s2) => (!filter || s2.name.includes(filter)) && (!onlyOn || s2.enabled));
  return /* @__PURE__ */ u$2("div", { class: "rbt-sub-list", children: [
    groupOff && /* @__PURE__ */ u$2("div", { class: "rbt-hint", children: "上面的总开关关着，所以下面这些都不会运行。" }),
    items.length > 10 && /* @__PURE__ */ u$2("div", { class: "rbt-sub-tools", children: [
      /* @__PURE__ */ u$2("input", { class: "text_pole rbt-input", placeholder: "搜索正则…", value: filter, onInput: (e2) => setFilter(e2.currentTarget.value) }),
      /* @__PURE__ */ u$2("label", { class: "rbt-check", children: [
        /* @__PURE__ */ u$2("input", { type: "checkbox", checked: onlyOn, onChange: (e2) => setOnlyOn(e2.currentTarget.checked) }),
        "只看开着的"
      ] })
    ] }),
    shown.map((s2) => /* @__PURE__ */ u$2(SubItemRow, { sub: s2 }, s2.id)),
    !shown.length && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "没有匹配的正则" })
  ] });
}
function ownerValue(o2) {
  return o2 ? `${o2.kind}:${o2.key}` : "";
}
function GlobalRegexList({ items }) {
  void archiveVersion.value;
  const scripts = globalRegexScripts();
  const owners = settings().regexOwners;
  const exts = installedExtensions();
  const presets = presetNames();
  const chars = allCharacters();
  const byId = new Map(items.map((i2) => [i2.id, i2]));
  const guesses = scripts.map((r2) => ({ r: r2, g: owners[r2.id] ? null : guessRegexOwner(r2) })).filter((x2) => x2.g);
  const onPick = (id, v2) => {
    if (!v2) return setRegexOwner(id, null);
    const i2 = v2.indexOf(":");
    const kind = v2.slice(0, i2);
    const key = v2.slice(i2 + 1);
    const label = kind === "extension" ? exts.find((e2) => e2.id === key)?.name ?? key : kind === "card" ? findChar(key)?.char?.name ?? key : key;
    setRegexOwner(id, { kind, key, label });
  };
  if (!scripts.length) return /* @__PURE__ */ u$2("div", { class: "rbt-muted", children: "没有全局正则。" });
  return /* @__PURE__ */ u$2(S$1, { children: [
    /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "给正则选好「属于」，换卡时就会自动开关：属于当前的卡或预设就打开，属于别的就关掉。" }),
    guesses.length > 1 && /* @__PURE__ */ u$2("div", { class: "rbt-row", children: /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small", onClick: () => {
      for (const { r: r2, g: g2 } of guesses) setRegexOwner(r2.id, g2);
    }, children: [
      "按名字自动选好 ",
      guesses.length,
      " 条"
    ] }) }),
    scripts.map((r2) => {
      const item = byId.get(`rx:g:${r2.id ?? r2.scriptName}`);
      const g2 = owners[r2.id] ? null : guessRegexOwner(r2);
      return /* @__PURE__ */ u$2("div", { class: "rbt-owner-row", children: [
        item ? /* @__PURE__ */ u$2(ItemRow, { item }) : /* @__PURE__ */ u$2("div", { class: "rbt-env-item", children: /* @__PURE__ */ u$2("span", { class: "rbt-env-name", children: r2.scriptName }) }),
        /* @__PURE__ */ u$2("div", { class: "rbt-form-row rbt-owner-pick", children: [
          /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "属于" }),
          /* @__PURE__ */ u$2("select", { class: "text_pole rbt-select", value: ownerValue(owners[r2.id]), onChange: (e2) => onPick(r2.id, e2.currentTarget.value), children: [
            /* @__PURE__ */ u$2("option", { value: "", children: "没选（换卡时不动它）" }),
            /* @__PURE__ */ u$2("optgroup", { label: "插件", children: exts.map((e2) => /* @__PURE__ */ u$2("option", { value: `extension:${e2.id}`, children: e2.name }, e2.id)) }),
            /* @__PURE__ */ u$2("optgroup", { label: "预设", children: presets.map((p2) => /* @__PURE__ */ u$2("option", { value: `preset:${p2}`, children: p2 }, p2)) }),
            /* @__PURE__ */ u$2("optgroup", { label: "角色卡", children: chars.map((c2) => /* @__PURE__ */ u$2("option", { value: `card:${c2.avatar}`, children: c2.name }, c2.avatar)) })
          ] }),
          g2 && /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small", title: "按名字猜的，点一下就选上", onClick: () => setRegexOwner(r2.id, g2), children: [
            "可能是 ",
            g2.label
          ] })
        ] })
      ] }, r2.id);
    })
  ] });
}
function openRegexManager() {
  openDrawer("extensions");
  setTimeout(() => {
    const box = document.querySelector(".regex_settings");
    const content = box?.querySelector(".inline-drawer-content");
    if (content && getComputedStyle(content).display === "none") box?.querySelector(".inline-drawer-toggle")?.click();
    box?.scrollIntoView({ block: "start" });
  }, 350);
}
function AddGlobalWorld() {
  const scopes = currentBookScopes();
  const options = worldNames().filter((w2) => !scopes.global.has(w2)).sort((x2, y2) => x2.localeCompare(y2, "zh-Hans-CN"));
  const [busy, setBusy] = d$1(false);
  if (!options.length) return null;
  return /* @__PURE__ */ u$2("div", { class: "rbt-form-row", children: /* @__PURE__ */ u$2("select", { class: "text_pole rbt-select", value: "", disabled: busy, onChange: async (e2) => {
    const name = e2.currentTarget.value;
    if (!name) return;
    setBusy(true);
    try {
      await runSlash(`/world state=on silent=true ${slashQuote(name)}`);
    } finally {
      setBusy(false);
      refreshEnv();
    }
  }, children: [
    /* @__PURE__ */ u$2("option", { value: "", children: "打开一本全局世界书…" }),
    options.map((w2) => /* @__PURE__ */ u$2("option", { value: w2, children: [
      w2,
      scopes.character.has(w2) ? "（已绑在当前卡上）" : ""
    ] }, w2))
  ] }) });
}
function PresetPicker() {
  const names = presetNames();
  const cur = currentPresetName();
  const [busy, setBusy] = d$1(false);
  return /* @__PURE__ */ u$2("div", { class: "rbt-form-row", children: [
    /* @__PURE__ */ u$2("select", { class: "text_pole rbt-select", value: cur, disabled: busy, onChange: async (e2) => {
      const name = e2.currentTarget.value;
      if (!name || name === cur) return;
      setBusy(true);
      try {
        await switchPreset(name);
      } finally {
        setBusy(false);
        refreshEnv();
      }
    }, children: names.map((n2) => /* @__PURE__ */ u$2("option", { value: n2, children: n2 }, n2)) }),
    /* @__PURE__ */ u$2("button", { class: "rbt-btn", onClick: () => openDrawer("preset"), children: "编辑预设" })
  ] });
}
function PluginList() {
  const list = installedExtensions().sort((x2, y2) => Number(y2.enabled) - Number(x2.enabled) || x2.name.localeCompare(y2.name));
  const [want, setWant] = d$1({});
  const [busy, setBusy] = d$1(false);
  const changed = list.filter((e2) => e2.id in want && want[e2.id] !== e2.enabled);
  const apply = async () => {
    const ext = loaded.extensions;
    if (!ext) return;
    setBusy(true);
    for (const e2 of changed) {
      const name = `third-party/${e2.id}`;
      if (want[e2.id]) await ext.enableExtension(name, false);
      else await ext.disableExtension(name, false);
    }
    location.reload();
  };
  return /* @__PURE__ */ u$2(S$1, { children: [
    list.map((e2) => {
      const on = e2.id in want ? want[e2.id] : e2.enabled;
      return /* @__PURE__ */ u$2("div", { class: `rbt-env-item ${on ? "" : "off"}`, children: [
        /* @__PURE__ */ u$2("span", { class: "rbt-env-name", children: e2.name }),
        e2.name !== e2.id && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: e2.id }),
        e2.id in want && want[e2.id] !== e2.enabled && /* @__PURE__ */ u$2(Chip, { color: "#f0a43a", children: "刷新后生效" }),
        /* @__PURE__ */ u$2("span", { class: "rbt-env-toggle", children: /* @__PURE__ */ u$2(Toggle, { checked: on, onChange: (v2) => setWant({ ...want, [e2.id]: v2 }), title: "启用 / 停用这个插件" }) })
      ] }, e2.id);
    }),
    changed.length > 0 && /* @__PURE__ */ u$2("div", { class: "rbt-warn rbt-row-between", children: [
      /* @__PURE__ */ u$2("span", { children: [
        "改了 ",
        changed.length,
        " 个插件，刷新页面后生效。"
      ] }),
      /* @__PURE__ */ u$2("span", { class: "rbt-row", children: [
        /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small", disabled: busy, onClick: () => setWant({}), children: "还原" }),
        /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small rbt-btn-primary", disabled: busy, onClick: apply, children: "保存并刷新" })
      ] })
    ] })
  ] });
}
function GlobalPage() {
  const report = envReport.value;
  h$2(() => {
    refreshEnv();
  }, []);
  void archiveVersion.value;
  if (!report) return null;
  const pick = (f2) => report.items.filter(f2);
  const worlds = pick((i2) => i2.kind === "worldbook" && (i2.scope === "global" || i2.scope === "persona"));
  const regex = pick((i2) => i2.scope === "global" && i2.kind === "regex");
  const presetRx = pick((i2) => i2.scope === "preset" && i2.kind !== "preset");
  const scripts = pick((i2) => i2.scope === "global" && i2.kind === "script");
  return /* @__PURE__ */ u$2("div", { class: "rbt-page", children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-page-lead", children: "这里的设置对所有卡都生效，换卡时不会跟着变。只给某张卡用的东西，最好绑到那张卡上。" }),
    /* @__PURE__ */ u$2("div", { class: "rbt-page-cols", children: [
      /* @__PURE__ */ u$2("div", { class: "rbt-page-group", children: [
        /* @__PURE__ */ u$2(Section, { title: "全局世界书", hint: "打开后对所有卡生效", children: [
          worlds.map((i2) => /* @__PURE__ */ u$2(ItemRow, { item: i2 }, i2.id)),
          !worlds.length && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "没有开着的全局世界书。" }),
          /* @__PURE__ */ u$2(AddGlobalWorld, {})
        ] }),
        /* @__PURE__ */ u$2(Section, { title: "全局正则", children: [
          /* @__PURE__ */ u$2(GlobalRegexList, { items: regex }),
          /* @__PURE__ */ u$2("div", { class: "rbt-row", children: /* @__PURE__ */ u$2("button", { class: "rbt-btn", onClick: openRegexManager, children: "新建、编辑或导入正则" }) })
        ] }),
        scripts.length > 0 && /* @__PURE__ */ u$2(Section, { title: "酒馆助手全局脚本", children: scripts.map((i2) => /* @__PURE__ */ u$2(ItemRow, { item: i2 }, i2.id)) })
      ] }),
      /* @__PURE__ */ u$2("div", { class: "rbt-page-group", children: [
        /* @__PURE__ */ u$2(Section, { title: "预设", hint: "切到有推荐预设的卡时会自动换", children: [
          /* @__PURE__ */ u$2(PresetPicker, {}),
          presetRx.map((i2) => /* @__PURE__ */ u$2(ItemRow, { item: i2 }, i2.id)),
          !presetRx.length && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "这个预设没有自带正则或脚本。" })
        ] }),
        /* @__PURE__ */ u$2(Section, { title: "插件", hint: "对所有卡生效", children: /* @__PURE__ */ u$2(PluginList, {}) })
      ] })
    ] })
  ] });
}
const VIEW_LABELS = {
  flow: "信息流",
  vars: "变量",
  card: "角色档案",
  global: "全局",
  maintain: "维护"
};
const SHEET_IDS = ["global", "maintain"];
const sheetView = y$1(null);
const shellActive = y$1(false);
let openInDock = () => {
};
let beforeSheet = () => {
};
function configureViews(opts) {
  openInDock = opts.openInDock;
  beforeSheet = opts.beforeSheet;
}
function isSheet(v2) {
  return SHEET_IDS.includes(v2);
}
function openView(view) {
  if (isSheet(view) && shellActive.value) {
    beforeSheet();
    sheetView.value = view;
    return;
  }
  if (sheetView.value) sheetView.value = null;
  openInDock(view);
}
function closeSheet$1() {
  sheetView.value = null;
}
function openCard(avatar) {
  archiveTarget.value = avatar;
  openView("card");
}
function CardLink({ info }) {
  return /* @__PURE__ */ u$2("a", { class: "rbt-card-link", onClick: () => openCard(info.avatar), children: info.name });
}
function BackupBox() {
  const [auto, setAuto] = d$1(settings().autoImportWorld);
  const fileRef = A$1(null);
  const [mode, setMode] = d$1("merge");
  const s2 = settings();
  const backups = s2.worldBackups.slice(-5).reverse();
  const pickFile = (m2) => {
    setMode(m2);
    fileRef.current?.click();
  };
  const onFile = async (e2) => {
    const input = e2.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    try {
      await importArchive(await file.text(), mode);
    } catch (err) {
      window.toastr?.error?.(err.message, "导入失败");
    }
  };
  return /* @__PURE__ */ u$2(Section, { title: "设置与备份", children: [
    /* @__PURE__ */ u$2(
      SwitchRow,
      {
        label: "自动导入卡里的世界书",
        detail: "打开一张卡时，如果它自带的世界书还没导入，就自动导入并绑定。不会覆盖已有的同名世界书。",
        checked: auto,
        onChange: (v2) => {
          s2.autoImportWorld = v2;
          saveSettings();
          setAuto(v2);
        }
      }
    ),
    /* @__PURE__ */ u$2("div", { class: "rbt-card-sub", children: [
      /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "你填的来源、说明、推荐预设和记住的配置，都和酒馆设置存在一起。换电脑或想留个底时，可以导出成一个文件。" }),
      /* @__PURE__ */ u$2("div", { class: "rbt-row", children: [
        /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-primary", onClick: () => exportArchive(), children: "导出档案" }),
        /* @__PURE__ */ u$2("button", { class: "rbt-btn", onClick: () => pickFile("merge"), children: "导入并合并" }),
        /* @__PURE__ */ u$2("button", { class: "rbt-btn", onClick: () => pickFile("overwrite"), children: "导入并覆盖" }),
        /* @__PURE__ */ u$2("input", { ref: fileRef, type: "file", accept: ".json,application/json", style: { display: "none" }, onChange: onFile })
      ] }),
      /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "合并：同一张卡留下较新的那份。覆盖：全部换成文件里的。" })
    ] }),
    backups.length > 0 && /* @__PURE__ */ u$2("div", { class: "rbt-card-sub", children: [
      /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "覆盖世界书前自动做的备份：" }),
      backups.map((b2) => /* @__PURE__ */ u$2("div", { title: `酒馆的 user/files 文件夹里：${b2.file}`, children: /* @__PURE__ */ u$2("small", { children: [
        new Date(b2.at).toLocaleString(),
        " 「",
        b2.world,
        "」"
      ] }) }, b2.file))
    ] })
  ] });
}
function MaintainPage() {
  void archiveVersion.value;
  const [busy, setBusy] = d$1(false);
  const ov = buildOverview();
  const missing = cardsMissingWorld();
  const sharedWorlds = [...ov.byWorld.entries()].filter(([, cs]) => cs.length > 1);
  const presetRx = presetNames().map((p2) => ({ p: p2, n: presetRegexCount(p2) })).filter((x2) => x2.n > 0);
  const cardRx = allCharacters().map(cardInfo).filter((c2) => c2.regex.total > 0).sort((a2, b2) => b2.regex.total - a2.regex.total);
  const curPreset = currentPresetName();
  return /* @__PURE__ */ u$2("div", { class: "rbt-page", children: /* @__PURE__ */ u$2("div", { class: "rbt-page-cols", children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-page-group", children: [
      /* @__PURE__ */ u$2(Section, { title: "待处理", children: [
        !missing.length && !ov.orphans.length && /* @__PURE__ */ u$2("div", { class: "rbt-ok", children: "一切正常" }),
        missing.length > 0 && /* @__PURE__ */ u$2("div", { class: "rbt-warn rbt-row-between", children: [
          /* @__PURE__ */ u$2("span", { children: [
            missing.length,
            " 张卡自带的世界书还没导入：",
            missing.map((m2) => m2.name).join("、")
          ] }),
          /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-primary rbt-btn-small", disabled: busy, onClick: async () => {
            setBusy(true);
            try {
              await importAllMissingWorlds();
            } finally {
              setBusy(false);
            }
          }, children: "全部导入" })
        ] }),
        ov.orphans.length > 0 && /* @__PURE__ */ u$2("div", { class: "rbt-warn", children: [
          /* @__PURE__ */ u$2("div", { children: [
            ov.orphans.length,
            " 份档案找不到对应的卡。卡可能被删了，或重新导入后换了文件名。"
          ] }),
          ov.orphans.map((o2) => /* @__PURE__ */ u$2("div", { class: "rbt-link-row", children: [
            /* @__PURE__ */ u$2("span", { children: [
              "「",
              o2.cardName,
              "」",
              /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: o2.avatar })
            ] }),
            o2.candidates.map((c2) => /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small", onClick: () => relink(o2.avatar, c2), children: [
              "转给「",
              c2,
              "」"
            ] }, c2)),
            /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small", onClick: async () => {
              if (await ctx().Popup?.show?.confirm?.("删除这份档案？", `「${o2.cardName}」的来源、说明和记住的配置都会删除。`)) dropRecord(o2.avatar);
            }, children: "删除" })
          ] }, o2.avatar))
        ] })
      ] }),
      /* @__PURE__ */ u$2(Section, { title: "推荐预设", hint: "哪些卡推荐了哪个预设，点卡名查看", children: [
        !ov.byPreset.size && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "还没有卡设了推荐预设。" }),
        [...ov.byPreset.entries()].map(([p2, cs]) => /* @__PURE__ */ u$2("div", { class: "rbt-lookup-row", children: [
          /* @__PURE__ */ u$2("b", { children: p2 }),
          "：",
          cs.map((c2, i2) => /* @__PURE__ */ u$2("span", { children: [
            i2 > 0 && "、",
            /* @__PURE__ */ u$2(CardLink, { info: c2 })
          ] }, c2.avatar))
        ] }, p2))
      ] }),
      /* @__PURE__ */ u$2(Section, { title: "多张卡共用的世界书", hint: sharedWorlds.length ? `${sharedWorlds.length} 本` : void 0, children: [
        !sharedWorlds.length && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "没有。" }),
        sharedWorlds.map(([w2, cs]) => /* @__PURE__ */ u$2("div", { class: "rbt-lookup-row", children: [
          /* @__PURE__ */ u$2("b", { children: w2 }),
          "：",
          cs.map((c2, i2) => /* @__PURE__ */ u$2("span", { children: [
            i2 > 0 && "、",
            /* @__PURE__ */ u$2(CardLink, { info: c2 })
          ] }, c2.avatar))
        ] }, w2))
      ] }),
      /* @__PURE__ */ u$2(Section, { title: "没有卡在用的世界书", hint: ov.unusedWorlds.length ? `${ov.unusedWorlds.length} 本` : void 0, children: [
        !ov.unusedWorlds.length && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "没有。" }),
        ov.unusedWorlds.map((w2) => /* @__PURE__ */ u$2("div", { class: "rbt-lookup-row", children: [
          w2.name,
          " ",
          w2.global && /* @__PURE__ */ u$2(Chip, { color: BAD, title: "作为全局世界书开着，对所有卡生效", children: "全局开着" })
        ] }, w2.name))
      ] })
    ] }),
    /* @__PURE__ */ u$2("div", { class: "rbt-page-group", children: [
      /* @__PURE__ */ u$2(Section, { title: "带正则的预设", hint: "只在用这个预设时生效", children: [
        !presetRx.length && /* @__PURE__ */ u$2("div", { class: "rbt-muted", children: "没有。" }),
        presetRx.map(({ p: p2, n: n2 }) => /* @__PURE__ */ u$2("div", { class: "rbt-link-row", children: [
          /* @__PURE__ */ u$2("span", { children: p2 }),
          /* @__PURE__ */ u$2("b", { children: [
            n2,
            " 条"
          ] }),
          p2 === curPreset && /* @__PURE__ */ u$2(Chip, { color: "#3d8bfd", children: "正在用" })
        ] }, p2))
      ] }),
      /* @__PURE__ */ u$2(Section, { title: "带正则的卡", hint: "只对那张卡生效，点卡名查看", children: [
        !cardRx.length && /* @__PURE__ */ u$2("div", { class: "rbt-muted", children: "没有。" }),
        cardRx.map((c2) => /* @__PURE__ */ u$2("div", { class: "rbt-link-row", children: [
          /* @__PURE__ */ u$2(CardLink, { info: c2 }),
          /* @__PURE__ */ u$2("b", { children: [
            c2.regex.total,
            " 条"
          ] }),
          !c2.regex.allowed && /* @__PURE__ */ u$2(Chip, { color: BAD, children: "未允许运行" })
        ] }, c2.avatar))
      ] }),
      /* @__PURE__ */ u$2(BackupBox, {})
    ] })
  ] }) });
}
const TABS = ["global", "maintain"];
function closeSheet() {
  closeSheet$1();
  archiveTarget.value = null;
}
function SheetHost() {
  const v2 = sheetView.value;
  h$2(() => {
    if (!v2) return;
    const onKey = (e2) => {
      if (e2.key !== "Escape") return;
      if (document.querySelector("dialog[open]")) return;
      closeSheet();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [v2]);
  if (!v2) return null;
  const title = "全局工具箱";
  return /* @__PURE__ */ u$2(S$1, { children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-sheet-backdrop", onMouseDown: () => closeSheet() }),
    /* @__PURE__ */ u$2("section", { class: "rbt-sheet rbt-scope", role: "dialog", "aria-label": title, children: [
      /* @__PURE__ */ u$2("header", { class: "rbt-sheet-bar", children: [
        /* @__PURE__ */ u$2("span", { class: "rbt-sheet-title", children: [
          /* @__PURE__ */ u$2("i", { class: "fa-solid fa-globe fa-fw" }),
          title
        ] }),
        /* @__PURE__ */ u$2("div", { class: "rbt-sheet-tabs", role: "tablist", children: TABS.map((t2) => /* @__PURE__ */ u$2("button", { type: "button", role: "tab", class: v2 === t2 ? "active" : "", onClick: () => {
          sheetView.value = t2;
        }, children: VIEW_LABELS[t2] }, t2)) }),
        /* @__PURE__ */ u$2("button", { type: "button", class: "rbt-sheet-close", title: "关闭（Esc）", "aria-label": "关闭", onClick: () => closeSheet(), children: "✕" })
      ] }),
      /* @__PURE__ */ u$2("div", { class: "rbt-sheet-body", children: [
        v2 === "global" && /* @__PURE__ */ u$2(GlobalPage, {}),
        v2 === "maintain" && /* @__PURE__ */ u$2(MaintainPage, {})
      ] })
    ] })
  ] });
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
  const bump2 = () => {
    varsTick.value++;
  };
  for (const ev of [et.MESSAGE_RECEIVED, et.MESSAGE_UPDATED, et.MESSAGE_SWIPED, et.MESSAGE_DELETED, et.CHAT_CHANGED, et.MESSAGE_EDITED, et.GENERATION_ENDED]) {
    if (ev) es.on(ev, bump2);
  }
  es.on(et.CHAT_CHANGED, () => {
    sourceCache = null;
  });
  for (const ev of ["mag_variable_update_ended", "mag_variable_updated"]) es.on(ev, bump2);
}
function toBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  const CHUNK = 32768;
  for (let i2 = 0; i2 < bytes.length; i2 += CHUNK) bin += String.fromCharCode(...bytes.subarray(i2, i2 + CHUNK));
  return btoa(bin);
}
function stamp() {
  const d2 = /* @__PURE__ */ new Date();
  const p2 = (n2) => String(n2).padStart(2, "0");
  return `${d2.getFullYear()}${p2(d2.getMonth() + 1)}${p2(d2.getDate())}-${p2(d2.getHours())}${p2(d2.getMinutes())}${p2(d2.getSeconds())}`;
}
function buildDiagnostics() {
  const c2 = ctx();
  const char = currentCharacter();
  let env = null;
  try {
    const r2 = buildEnvReport();
    env = { ...r2, items: r2.items.map(({ toggle: _t, subItems, ...rest }) => ({ ...rest, subItems: subItems?.map(({ toggle: _s, ...s2 }) => s2) })) };
  } catch (e2) {
    env = { error: String(e2) };
  }
  let vars = null;
  try {
    vars = floorDiffs(collectFloors()).map((d2) => ({ floor: d2.floor.index, prev: d2.prev?.index ?? null, changes: d2.changes }));
  } catch (e2) {
    vars = { error: String(e2) };
  }
  return {
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    tool: "RedBird 工具箱",
    chatId: c2.getCurrentChatId?.() ?? null,
    card: char?.name ?? null,
    mainApi: c2.mainApi,
    chatLength: c2.chat?.length ?? 0,
    captures: captures.value.map(({ rawChat: _raw, ...cap }) => cap),
    vars,
    env
  };
}
async function exportDiagnostics() {
  try {
    const name = `redbird-diagnostics-${stamp()}.json`;
    const body = JSON.stringify({ name, data: toBase64Utf8(JSON.stringify(buildDiagnostics(), null, 1)) });
    const res = await fetch("/api/files/upload", { method: "POST", headers: ctx().getRequestHeaders(), body });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const { path } = await res.json();
    toast("success", `诊断数据已保存：${path}`);
    return path;
  } catch (e2) {
    console.error("[RedBird] export failed", e2);
    toast("error", `导出失败：${String(e2)}`);
    return null;
  }
}
function PreviewButton({ onDone }) {
  return /* @__PURE__ */ u$2(
    "button",
    {
      class: "rbt-btn",
      disabled: previewBusy.value,
      title: "把下一轮要发给 AI 的内容先拼出来看看，不会真的发送，不花钱，也不改动聊天",
      onClick: async () => {
        const ok = await previewNextPrompt();
        if (ok) onDone();
        else toast("warning", "没能预览。请先打开一个角色，并使用 Chat Completion。");
      },
      children: previewBusy.value ? "正在预览…" : "预览下一轮"
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
  if (!wi.length) return /* @__PURE__ */ u$2(Empty, { children: "这一轮没有触发世界书条目。" });
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
        e2.constant ? /* @__PURE__ */ u$2(Chip, { color: "#3d8bfd", children: "常驻" }) : e2.matchedKeys.length ? e2.matchedKeys.slice(0, 4).map((k2) => /* @__PURE__ */ u$2(Chip, { color: "#2fbf8f", children: k2 }, k2)) : /* @__PURE__ */ u$2(Chip, { color: "#888", title: "最近的消息里没有它的关键词。可能是被别的条目带出来的，或关键词是正则", children: "其他方式触发" })
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
      "发一条消息或重新生成后，这里会显示这一轮实际发给 AI 的全部内容。",
      /* @__PURE__ */ u$2("br", {}),
      "也可以先预览，不会发送：",
      /* @__PURE__ */ u$2("br", {}),
      /* @__PURE__ */ u$2(PreviewButton, { onDone: () => setSelectedId(null) }),
      /* @__PURE__ */ u$2("br", {}),
      /* @__PURE__ */ u$2("small", { children: "仅支持 Chat Completion。" })
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
    cap.genType === "preview" && /* @__PURE__ */ u$2("div", { class: "rbt-hint", children: "这是预览，没有发给 AI。预览时看不到具体触发了哪些世界书条目，发一条消息后就能看到。" }),
    /* @__PURE__ */ u$2("div", { class: "rbt-summary", children: [
      /* @__PURE__ */ u$2("div", { class: "rbt-summary-line", children: [
        /* @__PURE__ */ u$2("b", { children: result.messages.length }),
        " 条消息 · 约 ",
        /* @__PURE__ */ u$2("b", { children: fmtTokens(result.totalTokens) }),
        " tokens",
        cap.presetName && /* @__PURE__ */ u$2(S$1, { children: [
          " · 预设 ",
          /* @__PURE__ */ u$2("b", { children: cap.presetName })
        ] }),
        !result.aligned && /* @__PURE__ */ u$2(Chip, { color: "#c98a00", title: "拿不到预设的结构，来源是按文字推测的", children: "推测" })
      ] }),
      /* @__PURE__ */ u$2(StackBar, { totals: result.totals, total: result.totalTokens }),
      /* @__PURE__ */ u$2(Legend, { totals: result.totals, total: result.totalTokens }),
      globalWI > 0 && /* @__PURE__ */ u$2("div", { class: "rbt-warn", children: [
        "约 ",
        globalWI,
        " tokens 来自全局世界书「",
        globalBooks.join("、"),
        "」。如果它不属于这张卡，别的设定就混进来了。"
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
const GLOBAL = 0;
const lastApplied = y$1(null);
function globalWorlds() {
  return [...loaded.worldInfo?.selected_world_info ?? []];
}
function globalRegex() {
  return loaded.regexEngine?.getScriptsByType?.(GLOBAL) ?? [];
}
function booksOfOtherCards(avatar) {
  const out = /* @__PURE__ */ new Set();
  for (const ch of ctx().characters ?? []) {
    if (ch.avatar === avatar) continue;
    const w2 = ch.data?.extensions?.world;
    if (w2) out.add(w2);
  }
  for (const e2 of loaded.worldInfo?.world_info?.charLore ?? []) {
    if (e2.name === charaFileName(avatar)) continue;
    for (const b2 of e2.extraBooks ?? []) out.add(b2);
  }
  return out;
}
function ownBooks(char) {
  const out = /* @__PURE__ */ new Set();
  const w2 = char.data?.extensions?.world;
  if (w2) out.add(w2);
  const extra = loaded.worldInfo?.world_info?.charLore?.find((e2) => e2.name === charaFileName(char.avatar))?.extraBooks ?? [];
  for (const b2 of extra) out.add(b2);
  return out;
}
function planFor(char) {
  const avatar = char.avatar;
  const s2 = settings();
  const profile = s2.profiles[avatar];
  const owners = s2.regexOwners ?? {};
  const api = presetApi();
  const cur = currentPresetName();
  const plan = { avatar, cardName: char.name, worldsOn: [], worldsOff: [], regexOn: [], regexOff: [], plugins: [] };
  if (profile?.preset && profile.preset.api === api && profile.preset.name !== cur && presetNames().includes(profile.preset.name)) {
    plan.preset = profile.preset.name;
  }
  const targetPreset = plan.preset ?? cur;
  const now = globalWorlds();
  const existing = new Set(loaded.worldInfo?.world_names ?? []);
  if (profile?.globalWorlds) {
    plan.worldsOn = profile.globalWorlds.filter((w2) => !now.includes(w2) && existing.has(w2));
    plan.worldsOff = now.filter((w2) => !profile.globalWorlds.includes(w2));
  } else {
    const others = booksOfOtherCards(avatar);
    const mine = ownBooks(char);
    plan.worldsOff = now.filter((w2) => others.has(w2) && !mine.has(w2));
  }
  for (const r2 of globalRegex()) {
    let want;
    if (profile?.globalRegexEnabled) want = profile.globalRegexEnabled.includes(r2.scriptName);
    else {
      const o2 = owners[r2.id];
      if (o2?.kind === "card") want = o2.key === avatar;
      else if (o2?.kind === "preset") want = o2.key === targetPreset;
    }
    if (want === void 0) continue;
    const on = !r2.disabled;
    if (want && !on) plan.regexOn.push({ id: r2.id, name: r2.scriptName });
    if (!want && on) plan.regexOff.push({ id: r2.id, name: r2.scriptName });
  }
  const installed2 = installedExtensions();
  for (const r2 of requiredExtensions(cardInfo(char))) {
    const st = extStatus(r2.req, installed2);
    if (st.status === "disabled" && st.match) plan.plugins.push({ id: st.match.id, name: st.match.name, status: "disabled" });
    if (st.status === "missing") plan.plugins.push({ id: "", name: r2.req.name, status: "missing" });
  }
  return plan;
}
function planHasChanges(p2) {
  return !!p2.preset || p2.worldsOn.length > 0 || p2.worldsOff.length > 0 || p2.regexOn.length > 0 || p2.regexOff.length > 0;
}
async function setRegexStates(changes) {
  const re = loaded.regexEngine;
  if (!re || !Object.keys(changes).length) return;
  const next = globalRegex().map((r2) => r2.id in changes ? { ...r2, disabled: changes[r2.id] } : r2);
  await re.saveScriptsByType(next, GLOBAL);
  saveSettings();
  if (ctx().getCurrentChatId?.()) await ctx().reloadCurrentChat();
}
async function setWorlds(on, off) {
  for (const w2 of off) await runSlash(`/world state=off silent=true ${slashQuote(w2)}`);
  for (const w2 of on) await runSlash(`/world state=on silent=true ${slashQuote(w2)}`);
}
async function applyPlan(plan) {
  const snapshot = {
    preset: currentPresetName(),
    globalWorlds: globalWorlds(),
    regexDisabled: Object.fromEntries(globalRegex().map((r2) => [r2.id, !!r2.disabled]))
  };
  const changes = [];
  if (plan.preset) {
    await switchPreset(plan.preset);
    changes.push(`预设换成「${plan.preset}」`);
  }
  if (plan.worldsOn.length || plan.worldsOff.length) {
    await setWorlds(plan.worldsOn, plan.worldsOff);
    for (const w2 of plan.worldsOff) changes.push(`关掉全局世界书「${w2}」`);
    for (const w2 of plan.worldsOn) changes.push(`打开全局世界书「${w2}」`);
  }
  const rx = {};
  for (const r2 of plan.regexOff) {
    rx[r2.id] = true;
    changes.push(`关掉全局正则「${r2.name}」`);
  }
  for (const r2 of plan.regexOn) {
    rx[r2.id] = false;
    changes.push(`打开全局正则「${r2.name}」`);
  }
  await setRegexStates(rx);
  if (changes.length) lastApplied.value = { avatar: plan.avatar, cardName: plan.cardName, at: Date.now(), changes, snapshot };
  refreshEnv();
  return changes;
}
async function undoLastApply() {
  const a2 = lastApplied.value;
  if (!a2 || a2.undone) return;
  const s2 = a2.snapshot;
  if (s2.preset && s2.preset !== currentPresetName()) await switchPreset(s2.preset);
  const now = globalWorlds();
  await setWorlds(s2.globalWorlds.filter((w2) => !now.includes(w2)), now.filter((w2) => !s2.globalWorlds.includes(w2)));
  const rx = {};
  for (const r2 of globalRegex()) {
    if (r2.id in s2.regexDisabled && s2.regexDisabled[r2.id] !== !!r2.disabled) rx[r2.id] = s2.regexDisabled[r2.id];
  }
  await setRegexStates(rx);
  lastApplied.value = { ...a2, undone: true };
  refreshEnv();
  toast("success", "已撤销刚才的自动切换");
}
async function enablePluginsAndReload(ids) {
  const ext = loaded.extensions;
  if (!ext?.enableExtension || !ids.length) return;
  for (const id of ids) await ext.enableExtension(id.startsWith("third-party/") ? id : `third-party/${id}`, false);
  location.reload();
}
let lastAvatar = null;
async function autoApplyOnSwitch(openStatus) {
  const c2 = ctx();
  if (c2.groupId) return;
  const char = c2.characters?.[Number(c2.characterId)];
  if (!char?.avatar || char.avatar === lastAvatar) return;
  lastAvatar = char.avatar;
  if (!settings().autoApplyEnv) return;
  const imported = [];
  const w2 = cardInfo(char).world;
  if (settings().autoImportWorld && w2.embedded && (w2.state === "missing" || w2.state === "unbound")) {
    if (await importCardWorld(char.avatar, { quiet: true }) === "imported") imported.push(`从卡里导入并绑定了世界书「${w2.importName}」`);
  }
  const plan = planFor(char);
  if (planHasChanges(plan) || imported.length) {
    const changes = [...imported, ...planHasChanges(plan) ? await applyPlan(plan) : []];
    if (changes.length) {
      toast("success", `已换成「${char.name}」的配置：${changes.join("；")}。点这里查看或撤销。`, "自动切换", { onclick: openStatus, timeOut: 9e3 });
    }
  }
  const disabled = plan.plugins.filter((p2) => p2.status === "disabled");
  const missing = plan.plugins.filter((p2) => p2.status === "missing");
  if (disabled.length || missing.length) {
    const parts = [
      disabled.length && `未启用：${disabled.map((p2) => p2.name).join("、")}`,
      missing.length && `未安装：${missing.map((p2) => p2.name).join("、")}`
    ].filter(Boolean);
    toast("warning", `「${char.name}」需要的插件${parts.join("；")}。点这里处理。`, "自动切换", { onclick: openStatus, timeOut: 9e3 });
  }
}
const statusTick = y$1(0);
function hasMvu(char) {
  const ext = char.data?.extensions ?? {};
  try {
    return /MagVarUpdate/i.test(JSON.stringify(ext.tavern_helper ?? ext.TavernHelper_scripts ?? ""));
  } catch {
    return false;
  }
}
function buildSections(char) {
  const info = cardInfo(char);
  const scopes = currentBookScopes();
  const report = buildEnvReport();
  const plan = planFor(char);
  const sections = [];
  const bump2 = () => {
    statusTick.value++;
  };
  const wb = [];
  const w2 = info.world;
  if (w2.state === "ok") wb.push({ level: "ok", text: `「${w2.name}」已加载`, detail: "绑在角色卡上，这张卡的所有存档都会自动用它" });
  else if (w2.state === "missing") {
    wb.push({
      level: "warn",
      text: `找不到世界书「${w2.name}」`,
      detail: "卡绑定了它，但它已经不在了",
      action: info.world.embedded ? { label: "从卡里导入", run: async () => {
        await importCardWorld(info.avatar);
        bump2();
      } } : void 0
    });
  } else if (w2.state === "unbound") {
    wb.push({ level: "warn", text: `卡里自带的世界书还没导入`, detail: `${w2.embedded} 条`, action: { label: "导入并绑定", run: async () => {
      await importCardWorld(info.avatar);
      bump2();
    } } });
  } else wb.push({ level: "info", text: "这张卡没有绑定世界书" });
  for (const b2 of w2.extra) wb.push({ level: "ok", text: `「${b2}」已加载`, detail: "附加世界书，也绑在这张卡上" });
  for (const b2 of scopes.chat) wb.push({ level: "ok", text: `「${b2}」已加载`, detail: "绑在当前这个聊天上" });
  for (const b2 of scopes.persona) wb.push({ level: "info", text: `「${b2}」`, detail: "绑在你的用户设定上，所有卡都会用" });
  for (const b2 of scopes.global) {
    const off = plan.worldsOff.includes(b2);
    wb.push({ level: off ? "warn" : "info", text: `全局世界书「${b2}」开着`, detail: off ? "它属于别的卡，或不在这张卡记住的配置里" : "对所有卡生效" });
  }
  sections.push({ title: "世界书", lines: wb });
  const pr = [];
  const cur = currentPresetName();
  const rec = info.preset;
  if (rec && rec.api === presetApi()) {
    if (rec.name === cur) pr.push({ level: "ok", text: `「${cur}」`, detail: "就是这张卡的推荐预设" });
    else pr.push({ level: "warn", text: `现在用的是「${cur}」`, detail: `这张卡推荐「${rec.name}」`, action: { label: "换上推荐的", run: async () => {
      await switchPreset(rec.name);
      bump2();
    } } });
  } else {
    pr.push({
      level: "info",
      text: `「${cur}」`,
      detail: "这张卡还没设推荐预设",
      action: { label: "设为推荐", run: () => {
        setRecommendedPreset(info.avatar, info.name, cur);
        bump2();
      } }
    });
  }
  const presetRx = report.items.find((i2) => i2.id === "rx:p");
  if (presetRx) pr.push({ level: "info", text: presetRx.name, detail: "预设自带的正则，跟着预设走" });
  sections.push({ title: "预设", lines: pr });
  const rx = [];
  if (info.regex.total) {
    rx.push(info.regex.allowed ? { level: "ok", text: `卡里的 ${info.regex.total} 条正则已允许运行` } : {
      level: "warn",
      text: `卡里的 ${info.regex.total} 条正则未允许运行`,
      detail: "状态栏、界面美化这类效果不会出现",
      action: { label: "允许运行", run: async () => {
        loaded.regexEngine?.allowScopedScripts?.(char);
        saveSettings();
        if (ctx().getCurrentChatId?.()) await ctx().reloadCurrentChat();
      } }
    });
  } else rx.push({ level: "info", text: "这张卡没有自带正则" });
  const globalOn = report.items.filter((i2) => i2.scope === "global" && i2.kind === "regex" && i2.enabled);
  for (const g2 of globalOn) {
    const bad = plan.regexOff.some((r2) => r2.name === g2.name);
    rx.push({ level: bad ? "warn" : "info", text: `全局正则「${g2.name}」开着`, detail: bad ? "它被标为属于别的卡或预设" : g2.detail ?? "对所有卡生效" });
  }
  sections.push({ title: "正则", lines: rx });
  const sc = [];
  if (info.scripts.total) {
    sc.push(info.scripts.enabled ? { level: "ok", text: `酒馆助手角色脚本 ${info.scripts.total} 个已启用`, detail: info.scripts.names.slice(0, 4).join("、") } : { level: "warn", text: `酒馆助手角色脚本未启用（${info.scripts.total} 个）`, detail: "在「扩展·正则 › 酒馆助手 › 脚本库」里打开" });
    if (hasMvu(char)) sc.push({ level: info.scripts.enabled ? "ok" : "warn", text: info.scripts.enabled ? "MVU 变量正常更新" : "MVU 变量不会更新", detail: info.scripts.enabled ? "随角色脚本一起运行" : "因为角色脚本未启用" });
  } else sc.push({ level: "info", text: "这张卡没有酒馆助手脚本" });
  sections.push({ title: "脚本", lines: sc });
  const pl = [];
  const disabled = plan.plugins.filter((p2) => p2.status === "disabled");
  for (const p2 of plan.plugins) {
    pl.push({ level: "warn", text: `插件「${p2.name}」${p2.status === "missing" ? "未安装" : "未启用"}` });
  }
  if (disabled.length) {
    pl.push({ level: "info", text: `启用 ${disabled.length} 个插件后要刷新页面`, action: { label: "启用并刷新", run: () => enablePluginsAndReload(disabled.map((p2) => p2.id)) } });
  }
  if (!plan.plugins.length) pl.push({ level: "ok", text: "需要的插件都已启用" });
  sections.push({ title: "插件", lines: pl });
  const issues = sections.reduce((n2, s2) => n2 + s2.lines.filter((l2) => l2.level === "warn").length, 0);
  return { sections, issues };
}
const LEVEL_ICON = { ok: "fa-circle-check", warn: "fa-circle-exclamation" };
function cardIssues(char) {
  return buildSections(char).sections.flatMap((s2) => s2.lines.filter((l2) => l2.level === "warn").map((line) => ({ section: s2.title, line })));
}
function ToolboxButton() {
  void statusTick.value;
  void chatTick.value;
  const char = currentCharacter();
  const issues = char ? buildSections(char).issues : 0;
  return /* @__PURE__ */ u$2(
    "button",
    {
      type: "button",
      class: `rbt-gbtn compact ${panelOpen.value ? "active" : ""}`,
      title: issues ? `聊天工具箱：角色档案里有 ${issues} 项需要注意` : "聊天工具箱：角色档案、信息流、变量",
      onClick: () => {
        panelOpen.value = !panelOpen.value;
      },
      children: [
        /* @__PURE__ */ u$2("i", { class: "fa-solid fa-feather-pointed fa-fw" }),
        /* @__PURE__ */ u$2("span", { children: "聊天工具箱" }),
        issues > 0 && /* @__PURE__ */ u$2("span", { class: "rbt-dot" })
      ]
    }
  );
}
function AttentionBox({ char }) {
  void statusTick.value;
  const [busy, setBusy] = d$1(false);
  const issues = cardIssues(char);
  if (!issues.length) return /* @__PURE__ */ u$2("div", { class: "rbt-attn ok", children: [
    /* @__PURE__ */ u$2("i", { class: `fa-solid ${LEVEL_ICON.ok}` }),
    " 这张卡需要的都已就位"
  ] });
  return /* @__PURE__ */ u$2("div", { class: "rbt-attn", children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-attn-title", children: [
      issues.length,
      " 项需要注意"
    ] }),
    issues.map(({ section, line }, i2) => /* @__PURE__ */ u$2("div", { class: "rbt-attn-line", children: [
      /* @__PURE__ */ u$2("i", { class: `fa-solid ${LEVEL_ICON.warn}` }),
      /* @__PURE__ */ u$2("span", { class: "rbt-attn-text", children: [
        /* @__PURE__ */ u$2("small", { children: section }),
        " ",
        line.text,
        line.detail && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: [
          " · ",
          line.detail
        ] })
      ] }),
      line.action && /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small", disabled: busy, onClick: async () => {
        setBusy(true);
        try {
          await line.action.run();
        } finally {
          setBusy(false);
          statusTick.value++;
          archiveVersion.value++;
        }
      }, children: line.action.label })
    ] }, i2))
  ] });
}
function SwitchSection({ avatar, isCurrent }) {
  void statusTick.value;
  const [auto, setAuto] = d$1(settings().autoApplyEnv);
  const [busy, setBusy] = d$1(false);
  const profile = settings().profiles[avatar];
  const report = isCurrent ? buildEnvReport() : null;
  const drift = report?.drift;
  const applied = lastApplied.value?.avatar === avatar ? lastApplied.value : null;
  const run = async (f2) => {
    setBusy(true);
    try {
      await f2();
    } finally {
      setBusy(false);
      statusTick.value++;
      archiveVersion.value++;
    }
  };
  const remembered = profile && (profile.globalWorlds || profile.globalRegexEnabled);
  return /* @__PURE__ */ u$2(Section, { title: "换卡时", hint: "切到这张卡时，把世界书、正则和预设换成它的配置", children: [
    /* @__PURE__ */ u$2(
      SwitchRow,
      {
        label: "自动切换",
        detail: "对所有卡生效。关掉后只提醒，不会自动改。",
        checked: auto,
        onChange: (v2) => {
          settings().autoApplyEnv = v2;
          saveSettings();
          setAuto(v2);
        }
      }
    ),
    applied && /* @__PURE__ */ u$2("div", { class: "rbt-card-sub", children: [
      /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: applied.undone ? "已撤销刚才的自动切换：" : `${new Date(applied.at).toLocaleTimeString()} 切到这张卡时，自动做了这些：` }),
      /* @__PURE__ */ u$2("ul", { class: "rbt-drift", children: applied.changes.map((t2, i2) => /* @__PURE__ */ u$2("li", { children: t2 }, i2)) }),
      !applied.undone && /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small", disabled: busy, onClick: () => run(undoLastApply), children: "撤销" })
    ] }),
    /* @__PURE__ */ u$2("div", { class: "rbt-card-sub", children: remembered ? /* @__PURE__ */ u$2(S$1, { children: [
      /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: [
        "记住的配置（",
        new Date(profile.savedAt).toLocaleString(),
        "）："
      ] }),
      /* @__PURE__ */ u$2("ul", { class: "rbt-drift", children: [
        /* @__PURE__ */ u$2("li", { children: [
          "全局世界书：",
          profile.globalWorlds?.length ? profile.globalWorlds.join("、") : "全部关"
        ] }),
        /* @__PURE__ */ u$2("li", { children: [
          "全局正则：",
          profile.globalRegexEnabled?.length ? `开 ${profile.globalRegexEnabled.length} 条` : "全部关"
        ] }),
        profile.preset && /* @__PURE__ */ u$2("li", { children: [
          "预设：",
          profile.preset.name
        ] })
      ] }),
      isCurrent && (drift?.count ? /* @__PURE__ */ u$2("div", { class: "rbt-warn rbt-row-between", children: [
        /* @__PURE__ */ u$2("span", { children: [
          "现在的设置和记住的有 ",
          drift.count,
          " 处不同。"
        ] }),
        /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-small rbt-btn-primary", disabled: busy, onClick: () => run(applyProfile), children: "恢复记住的" })
      ] }) : /* @__PURE__ */ u$2("small", { class: "rbt-ok", children: "和现在的设置一致 ✓" })),
      isCurrent && /* @__PURE__ */ u$2("div", { class: "rbt-row", children: [
        /* @__PURE__ */ u$2("button", { class: "rbt-btn", disabled: busy, onClick: () => run(rememberProfile), children: "改为记住现在的" }),
        /* @__PURE__ */ u$2("button", { class: "rbt-btn", disabled: busy, onClick: () => run(forgetProfile), children: "不再记住" })
      ] })
    ] }) : /* @__PURE__ */ u$2(S$1, { children: [
      /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "还没记住这张卡的配置。现在切到这张卡时，只会关掉别的卡的世界书和正则，并换上推荐预设。" }),
      isCurrent ? /* @__PURE__ */ u$2("div", { class: "rbt-row", children: /* @__PURE__ */ u$2("button", { class: "rbt-btn rbt-btn-primary", disabled: busy, onClick: () => run(rememberProfile), children: "记住现在的配置" }) }) : /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "打开这张卡后才能记住它的配置。" })
    ] }) })
  ] });
}
function CardPage() {
  void archiveVersion.value;
  void statusTick.value;
  const cur = currentCharacter();
  const avatar = archiveTarget.value ?? cur?.avatar;
  h$2(() => {
    if (avatar) void ensureFullCharacter(avatar);
  }, [avatar]);
  const f2 = avatar ? findChar(avatar) : null;
  if (!f2) return /* @__PURE__ */ u$2(Empty, { children: "没有打开单人角色卡。在左栏「角色」里点一张卡，就能看到它的档案。" });
  const info = cardInfo(f2.char);
  return /* @__PURE__ */ u$2("div", { class: "rbt-page", children: [
    /* @__PURE__ */ u$2(CardHeader, { info }),
    info.isCurrent && /* @__PURE__ */ u$2(AttentionBox, { char: f2.char }),
    /* @__PURE__ */ u$2("div", { class: "rbt-page-cols", children: [
      /* @__PURE__ */ u$2("div", { class: "rbt-page-group", children: [
        /* @__PURE__ */ u$2("div", { class: "rbt-page-group-title", children: "配套环境" }),
        /* @__PURE__ */ u$2(WorldSection, { info }),
        /* @__PURE__ */ u$2(PresetSection, { info }),
        /* @__PURE__ */ u$2(RegexSection, { info }),
        /* @__PURE__ */ u$2(ExtSection, { info })
      ] }),
      /* @__PURE__ */ u$2("div", { class: "rbt-page-group", children: [
        /* @__PURE__ */ u$2(SourceSection, { info }),
        /* @__PURE__ */ u$2(SwitchSection, { avatar: info.avatar, isCurrent: info.isCurrent })
      ] })
    ] })
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
      "用到它的：",
      refs.slice(0, 4).map((r2, i2) => /* @__PURE__ */ u$2(Chip, { color: r2.source.kind === "preset" ? "#8b7cf6" : "#2fbf8f", title: `里面写了「${r2.term}」`, children: r2.source.label }, i2)),
      refs.length > 4 && /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: [
        " 等 ",
        refs.length,
        " 处"
      ] })
    ] }) : /* @__PURE__ */ u$2("small", { class: "rbt-muted", children: "世界书和预设里没有直接用到它" }) })
  ] });
}
function VarTree({ data, highlight }) {
  const [filter, setFilter] = d$1("");
  const leaves = T(() => [...flattenVars(data).values()], [data]);
  const shown = leaves.filter((l2) => !filter || l2.path.includes(filter) || formatValue(l2.value).includes(filter));
  return /* @__PURE__ */ u$2("div", { class: "rbt-vartree", children: [
    /* @__PURE__ */ u$2("input", { class: "text_pole rbt-input", placeholder: "搜索变量…", value: filter, onInput: (e2) => setFilter(e2.currentTarget.value) }),
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
        "这个聊天还没有变量。",
        /* @__PURE__ */ u$2("br", {}),
        "用 MVU 的卡在 AI 回复后会把变量存进每一楼，这里会显示每一轮变了什么。"
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
      /* @__PURE__ */ u$2("div", { class: "rbt-summary-line", children: current.prev ? /* @__PURE__ */ u$2(S$1, { children: [
        "第 ",
        /* @__PURE__ */ u$2("b", { children: current.floor.index }),
        " 楼比第 ",
        current.prev.index,
        " 楼：",
        /* @__PURE__ */ u$2("b", { children: current.changes.length }),
        " 处变化"
      ] }) : /* @__PURE__ */ u$2(S$1, { children: [
        "第 ",
        /* @__PURE__ */ u$2("b", { children: current.floor.index }),
        " 楼是第一个有变量的楼层，下面是初始值"
      ] }) }),
      readers.length > 0 && /* @__PURE__ */ u$2("div", { class: "rbt-hint", children: [
        "这些条目会把全部变量发给 AI，所以任何变化都会影响下一轮：",
        readers.slice(0, 5).map((r2, i2) => /* @__PURE__ */ u$2(Chip, { color: "#2fbf8f", children: r2.label }, i2))
      ] })
    ] }),
    current.changes.length > 0 && /* @__PURE__ */ u$2("div", { class: "rbt-var-changes", children: current.changes.map((ch) => /* @__PURE__ */ u$2(ChangeRow, { ch, sources }, ch.path)) }),
    /* @__PURE__ */ u$2("details", { class: "rbt-section", open: current.changes.length === 0, children: [
      /* @__PURE__ */ u$2("summary", { children: "这一楼的全部变量" }),
      /* @__PURE__ */ u$2(VarTree, { data: current.floor.statData ?? current.floor.vars, highlight: changedPaths })
    ] }, `full-${current.floor.index}`),
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
function tabsNow() {
  return shellActive.value ? ["card", "flow", "vars"] : ["card", "flow", "vars", "global", "maintain"];
}
const WIDTH_KEY = "rbt-dock-width";
const MIN_W = 320;
const DEFAULT_W = 440;
function maxWidth() {
  const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
  return Math.max(MIN_W, Math.floor(vw * 0.5));
}
function clampWidth(w2) {
  return Math.round(Math.min(Math.max(MIN_W, w2), maxWidth()));
}
function loadWidth() {
  const saved = Number(localStorage.getItem(WIDTH_KEY));
  return clampWidth(Number.isFinite(saved) && saved > 0 ? saved : DEFAULT_W);
}
function setDockWidth(w2) {
  document.body.style.setProperty("--rbt-dock-w", `${w2}px`);
}
function detectThemeLayout() {
  const themed = getComputedStyle(document.documentElement).getPropertyValue("--rbd-panel-w").trim() !== "";
  document.body.classList.toggle("rbt-theme-layout", themed);
}
function openPanel(tab) {
  if (tab) activeTab.value = tab;
  panelOpen.value = true;
}
function Panel() {
  const open = panelOpen.value;
  if (!tabsNow().includes(activeTab.value)) activeTab.value = "flow";
  h$2(() => {
    document.body.classList.toggle("rbt-docked", open);
    if (!open) return;
    detectThemeLayout();
    setDockWidth(loadWidth());
    const onResize = () => {
      detectThemeLayout();
      setDockWidth(loadWidth());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);
  if (!open) return null;
  const onResizeStart = (e2) => {
    e2.preventDefault();
    const handle = e2.currentTarget;
    handle.setPointerCapture(e2.pointerId);
    document.body.classList.add("rbt-resizing");
    const move = (ev) => setDockWidth(clampWidth(window.innerWidth - ev.clientX));
    const up = (ev) => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      document.body.classList.remove("rbt-resizing");
      const w2 = clampWidth(window.innerWidth - ev.clientX);
      localStorage.setItem(WIDTH_KEY, String(w2));
      setDockWidth(w2);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  };
  return /* @__PURE__ */ u$2("aside", { class: "rbt-panel rbt-dock", children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-resize-handle", title: "拖动调整宽度", onPointerDown: onResizeStart }),
    /* @__PURE__ */ u$2("div", { class: "rbt-header", children: [
      /* @__PURE__ */ u$2("span", { class: "rbt-title", title: shellActive.value ? "聊天工具箱" : "RedBird 工具箱", children: [
        "🐦",
        /* @__PURE__ */ u$2("span", { class: "rbt-title-text", children: shellActive.value ? " 聊天工具箱" : " RedBird 工具箱" })
      ] }),
      /* @__PURE__ */ u$2("div", { class: "rbt-tabs", children: tabsNow().map((id) => /* @__PURE__ */ u$2("button", { class: activeTab.value === id ? "active" : "", onClick: () => {
        activeTab.value = id;
      }, children: VIEW_LABELS[id] }, id)) }),
      /* @__PURE__ */ u$2("button", { class: "rbt-close", title: "导出诊断文件，用来排查问题", onClick: () => {
        void exportDiagnostics();
      }, children: "⤓" }),
      /* @__PURE__ */ u$2("button", { class: "rbt-close", title: "关闭", onClick: () => {
        panelOpen.value = false;
      }, children: "✕" })
    ] }),
    /* @__PURE__ */ u$2("div", { class: "rbt-body", children: [
      activeTab.value === "flow" && /* @__PURE__ */ u$2(FlowView, {}),
      activeTab.value === "vars" && /* @__PURE__ */ u$2(VarsView, {}),
      activeTab.value === "card" && /* @__PURE__ */ u$2(CardPage, {}),
      activeTab.value === "global" && /* @__PURE__ */ u$2(GlobalPage, {}),
      activeTab.value === "maintain" && /* @__PURE__ */ u$2(MaintainPage, {})
    ] })
  ] });
}
const SORT_KEY = "rbt-shell-char-sort";
const tints = /* @__PURE__ */ new Map();
function toneDown(r2, g2, b2) {
  r2 /= 255;
  g2 /= 255;
  b2 /= 255;
  const max = Math.max(r2, g2, b2);
  const min = Math.min(r2, g2, b2);
  let h2 = 0;
  let s2 = 0;
  const l2 = (max + min) / 2;
  if (max !== min) {
    const d2 = max - min;
    s2 = l2 > 0.5 ? d2 / (2 - max - min) : d2 / (max + min);
    h2 = max === r2 ? (g2 - b2) / d2 + (g2 < b2 ? 6 : 0) : max === g2 ? (b2 - r2) / d2 + 2 : (r2 - g2) / d2 + 4;
    h2 /= 6;
  }
  return `hsl(${Math.round(h2 * 360)} ${Math.round(Math.min(s2, 0.45) * 100)}% ${Math.round(Math.min(Math.max(l2, 0.14), 0.26) * 100)}%)`;
}
function sampleTint(img) {
  try {
    const c2 = document.createElement("canvas");
    c2.width = 12;
    c2.height = 12;
    const g2 = c2.getContext("2d", { willReadFrequently: true });
    if (!g2 || !img.naturalWidth) return null;
    const sy = img.naturalHeight * 0.55;
    g2.drawImage(img, 0, sy, img.naturalWidth, img.naturalHeight - sy, 0, 0, 12, 12);
    const d2 = g2.getImageData(0, 0, 12, 12).data;
    let r2 = 0;
    let gg = 0;
    let b2 = 0;
    for (let i2 = 0; i2 < d2.length; i2 += 4) {
      r2 += d2[i2];
      gg += d2[i2 + 1];
      b2 += d2[i2 + 2];
    }
    const n2 = d2.length / 4;
    return toneDown(r2 / n2, gg / n2, b2 / n2);
  } catch {
    return null;
  }
}
function fullImage(it) {
  return it.kind === "character" ? `/characters/${encodeURIComponent(it.key.slice(2))}` : it.thumb;
}
function lastChatText(t2, now = Date.now()) {
  if (!t2) return "还没聊过";
  const day = 864e5;
  const start2 = new Date(now).setHours(0, 0, 0, 0);
  if (t2 >= start2) return "今天聊过";
  if (t2 >= start2 - day) return "昨天聊过";
  const days = Math.floor((start2 - t2) / day) + 1;
  if (days < 7) return `${days} 天前聊过`;
  const d2 = new Date(t2);
  return d2.getFullYear() === new Date(now).getFullYear() ? `${d2.getMonth() + 1} 月 ${d2.getDate()} 日聊过` : `${d2.getFullYear()} 年 ${d2.getMonth() + 1} 月聊过`;
}
function Card({ it }) {
  const src = fullImage(it);
  const [tint, setTint] = d$1(tints.get(src) ?? "");
  const [broken, setBroken] = d$1(false);
  const onLoad = (e2) => {
    if (tints.has(src)) return;
    const t2 = sampleTint(e2.currentTarget);
    if (t2) {
      tints.set(src, t2);
      setTint(t2);
    }
  };
  return /* @__PURE__ */ u$2("article", { class: "rbt-hcard", style: tint ? { "--tint": tint } : void 0, children: [
    /* @__PURE__ */ u$2("button", { type: "button", class: "rbt-hcard-hit", title: `和「${it.name}」聊天`, onClick: () => {
      void openCharacter(it);
    }, children: [
      !broken ? /* @__PURE__ */ u$2("img", { class: "rbt-hcard-img", src, alt: "", loading: "lazy", decoding: "async", onLoad, onError: () => setBroken(true) }) : /* @__PURE__ */ u$2("img", { class: "rbt-hcard-img", src: it.thumb, alt: "" }),
      /* @__PURE__ */ u$2("span", { class: "rbt-hcard-shade" }),
      it.problems.length > 0 ? /* @__PURE__ */ u$2("span", { class: "rbt-hcard-pill warn", title: it.problems.join("、"), children: [
        /* @__PURE__ */ u$2("i", {}),
        " ",
        it.problems.length > 1 ? `${it.problems.length} 项待处理` : it.problems[0]
      ] }) : it.kind === "group" && /* @__PURE__ */ u$2("span", { class: "rbt-hcard-pill", children: [
        /* @__PURE__ */ u$2("i", { class: "fa-solid fa-users" }),
        " 群组"
      ] }),
      /* @__PURE__ */ u$2("span", { class: "rbt-hcard-text", children: [
        /* @__PURE__ */ u$2("span", { class: "rbt-hcard-name", children: it.name }),
        /* @__PURE__ */ u$2("span", { class: "rbt-hcard-meta", children: it.kind === "group" ? it.note : lastChatText(it.lastChat) }),
        it.tags.length > 0 && /* @__PURE__ */ u$2("span", { class: "rbt-hcard-meta", children: it.tags.slice(0, 3).map((t2) => t2.name).join(" · ") })
      ] })
    ] }),
    /* @__PURE__ */ u$2("span", { class: "rbt-hcard-acts", children: [
      it.kind === "character" && /* @__PURE__ */ u$2("button", { type: "button", class: "rbt-hcard-act" + (it.fav ? " on" : ""), title: it.fav ? "取消收藏" : "收藏", onClick: () => {
        void toggleFavorite(it);
      }, children: /* @__PURE__ */ u$2("i", { class: (it.fav ? "fa-solid" : "fa-regular") + " fa-star" }) }),
      /* @__PURE__ */ u$2("button", { type: "button", class: "rbt-hcard-act", title: "编辑角色卡", onClick: () => {
        void editCharacter(it);
      }, children: /* @__PURE__ */ u$2("i", { class: "fa-solid fa-pen" }) })
    ] }),
    it.fav && /* @__PURE__ */ u$2("span", { class: "rbt-hcard-favmark", title: "已收藏", children: /* @__PURE__ */ u$2("i", { class: "fa-solid fa-star" }) })
  ] });
}
function HomeGallery() {
  void charsTick.value;
  const [q2, setQ] = d$1("");
  const [filter, setFilter] = d$1("all");
  const [sort, setSortState] = d$1(() => {
    try {
      return localStorage.getItem(SORT_KEY) || "recent";
    } catch {
      return "recent";
    }
  });
  const setSort = (v2) => {
    setSortState(v2);
    try {
      localStorage.setItem(SORT_KEY, v2);
    } catch {
    }
  };
  const all = listCharacters();
  const tags = T(() => allTags(all), [all.length, charsTick.value]);
  const query = q2.trim().toLowerCase();
  const shown = sortCharacters(all.filter((it) => {
    if (filter === "fav" && !it.fav) return false;
    if (filter === "group" && it.kind !== "group") return false;
    if (filter === "problem" && !it.problems.length) return false;
    if (filter.startsWith("tag:") && !it.tags.some((t2) => t2.id === filter.slice(4))) return false;
    if (query && !(it.name.toLowerCase().includes(query) || it.note.toLowerCase().includes(query) || it.tags.some((t2) => t2.name.toLowerCase().includes(query)))) return false;
    return true;
  }), sort);
  const nFav = all.filter((x2) => x2.fav).length;
  const nProblem = all.filter((x2) => x2.problems.length).length;
  const nGroup = all.filter((x2) => x2.kind === "group").length;
  const tagValue = filter.startsWith("tag:") ? filter : "";
  const Pill = ({ v: v2, label }) => /* @__PURE__ */ u$2("button", { type: "button", class: filter === v2 ? "active" : "", onClick: () => setFilter(v2), children: label });
  return /* @__PURE__ */ u$2("main", { class: "rbt-home-gallery", "aria-label": "角色", children: [
    /* @__PURE__ */ u$2("header", { class: "rbt-home-head", children: [
      /* @__PURE__ */ u$2("h1", { children: [
        "角色 ",
        /* @__PURE__ */ u$2("small", { children: all.length })
      ] }),
      /* @__PURE__ */ u$2("label", { class: "rbt-search rbt-home-search", children: [
        /* @__PURE__ */ u$2("i", { class: "fa-solid fa-magnifying-glass" }),
        /* @__PURE__ */ u$2("input", { type: "search", placeholder: "搜索角色、备注、标签", value: q2, onInput: (e2) => setQ(e2.currentTarget.value) })
      ] }),
      /* @__PURE__ */ u$2("div", { class: "rbt-home-actions", children: [
        /* @__PURE__ */ u$2("button", { type: "button", class: "rbt-home-btn primary", onClick: createCharacter, children: [
          /* @__PURE__ */ u$2("i", { class: "fa-solid fa-user-plus" }),
          " 新建角色"
        ] }),
        /* @__PURE__ */ u$2("button", { type: "button", class: "rbt-home-btn", onClick: importCharacterFile, children: [
          /* @__PURE__ */ u$2("i", { class: "fa-solid fa-file-import" }),
          " 导入"
        ] }),
        /* @__PURE__ */ u$2("button", { type: "button", class: "rbt-home-btn", onClick: importCharacterUrl, children: [
          /* @__PURE__ */ u$2("i", { class: "fa-solid fa-link" }),
          " 从链接导入"
        ] }),
        /* @__PURE__ */ u$2("button", { type: "button", class: "rbt-home-btn", onClick: createGroup, children: [
          /* @__PURE__ */ u$2("i", { class: "fa-solid fa-users" }),
          " 新建群组"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ u$2("div", { class: "rbt-home-filters", children: [
      /* @__PURE__ */ u$2("div", { class: "rbt-home-pills", role: "tablist", children: [
        /* @__PURE__ */ u$2(Pill, { v: "all", label: "全部" }),
        nFav > 0 && /* @__PURE__ */ u$2(Pill, { v: "fav", label: `收藏 ${nFav}` }),
        nProblem > 0 && /* @__PURE__ */ u$2(Pill, { v: "problem", label: `待处理 ${nProblem}` }),
        nGroup > 0 && /* @__PURE__ */ u$2(Pill, { v: "group", label: `群组 ${nGroup}` }),
        tags.length > 0 && /* @__PURE__ */ u$2("select", { class: "rbt-home-select" + (tagValue ? " active" : ""), value: tagValue, onChange: (e2) => {
          const v2 = e2.currentTarget.value;
          setFilter(v2 || "all");
        }, children: [
          /* @__PURE__ */ u$2("option", { value: "", children: "按标签…" }),
          tags.map(({ tag, count }) => /* @__PURE__ */ u$2("option", { value: "tag:" + tag.id, children: [
            tag.name,
            "（",
            count,
            "）"
          ] }, tag.id))
        ] })
      ] }),
      /* @__PURE__ */ u$2("select", { class: "rbt-home-select", value: sort, title: "排序", onChange: (e2) => setSort(e2.currentTarget.value), children: [
        /* @__PURE__ */ u$2("option", { value: "recent", children: "最近聊过" }),
        /* @__PURE__ */ u$2("option", { value: "name", children: "按名称" }),
        /* @__PURE__ */ u$2("option", { value: "added", children: "最近添加" })
      ] })
    ] }),
    filter === "problem" && /* @__PURE__ */ u$2("div", { class: "rbt-home-note", children: [
      "这些卡缺世界书、插件，或者正则 / 脚本没开。点进去后，在「聊天工具箱 › 角色档案」里一键处理；要批量处理，去",
      /* @__PURE__ */ u$2("button", { type: "button", class: "rbt-linkbtn", onClick: () => openView("maintain"), children: "全局工具箱 › 维护" }),
      "。"
    ] }),
    /* @__PURE__ */ u$2("div", { class: "rbt-home-grid", children: shown.map((it) => /* @__PURE__ */ u$2(Card, { it }, it.key)) }),
    !shown.length && /* @__PURE__ */ u$2("div", { class: "rbt-home-empty", children: query || filter !== "all" ? "没有符合条件的角色。" : "还没有角色。点「新建角色」或「导入」开始。" })
  ] });
}
const shellOn = y$1(false);
const leftCollapsed = y$1(false);
const chatTick = y$1(0);
const COLLAPSE_KEY = "rbt-shell-left-collapsed";
const ST_KEYS = ["preset", "extensions", "api", "persona", "settings", "backgrounds", "formatting"];
const apiOnline = y$1(true);
const homeActive = y$1(false);
function readOnline() {
  const st = String(ctx().onlineStatus ?? "");
  apiOnline.value = !!st && st !== "no_connection";
}
function applyBodyClasses() {
  const b2 = document.body.classList;
  b2.toggle("rbt-shell", shellOn.value);
  b2.toggle("rbt-shell-lcollapsed", leftCollapsed.value);
  const c2 = ctx();
  const home = (c2.characterId === void 0 || c2.characterId === null) && !c2.groupId;
  b2.toggle("rbt-home", home);
  homeActive.value = home;
  shellActive.value = shellOn.value && (window.innerWidth || 1280) > 1e3;
}
function setShellEnabled(on) {
  shellOn.value = on;
  settings().shellEnabled = on;
  saveSettings();
  applyBodyClasses();
}
function setCollapsed(v2) {
  leftCollapsed.value = v2;
  try {
    localStorage.setItem(COLLAPSE_KEY, v2 ? "1" : "0");
  } catch {
  }
  applyBodyClasses();
}
function trigger(selector) {
  const $2 = window.jQuery;
  if ($2) $2(selector).first().trigger("click");
  else document.querySelector(selector)?.click();
}
function inChat() {
  const c2 = ctx();
  return c2.characterId !== void 0 && c2.characterId !== null || !!c2.groupId;
}
function goHome() {
  if (inChat()) trigger("#option_close_chat");
}
function newChat() {
  if (inChat()) trigger("#option_start_new_chat");
}
function DrawerButton({ k: k2, compact, label, title, dot }) {
  const d2 = DRAWERS.find((x2) => x2.key === k2);
  const active = openDrawers.value.includes(k2);
  return /* @__PURE__ */ u$2("button", { type: "button", class: `rbt-gbtn ${active ? "active" : ""} ${compact ? "compact" : ""}`, title: title ?? d2.label, ...drawerButtonHandlers(k2), children: [
    /* @__PURE__ */ u$2("i", { class: `fa-solid ${d2.icon} fa-fw` }),
    /* @__PURE__ */ u$2("span", { children: label ?? d2.label }),
    dot && /* @__PURE__ */ u$2("span", { class: "rbt-dot", title: dot })
  ] });
}
function GlobalButton() {
  return /* @__PURE__ */ u$2("button", { type: "button", class: `rbt-gtool ${sheetView.value ? "active" : ""}`, title: "全局工具箱：对所有卡都生效的世界书、正则、预设、插件，以及维护", onClick: () => openView("global"), children: [
    /* @__PURE__ */ u$2("i", { class: "fa-solid fa-globe fa-fw" }),
    /* @__PURE__ */ u$2("span", { children: "全局工具箱" })
  ] });
}
function RecentRow({ r: r2 }) {
  const current = isCurrentChat(r2);
  return /* @__PURE__ */ u$2("button", { type: "button", class: `rbt-recent-row ${current ? "current" : ""}`, onClick: () => {
    void openRecentChat(r2);
  }, title: `${r2.name} · ${r2.chatId}`, children: [
    /* @__PURE__ */ u$2("img", { class: "rbt-recent-avatar", src: r2.thumb, alt: "", loading: "lazy" }),
    /* @__PURE__ */ u$2("span", { class: "rbt-recent-main", children: [
      /* @__PURE__ */ u$2("span", { class: "rbt-recent-line1", children: [
        /* @__PURE__ */ u$2("span", { class: "rbt-recent-name", children: r2.name }),
        /* @__PURE__ */ u$2("span", { class: "rbt-recent-time", children: shortTime(r2.time) })
      ] }),
      /* @__PURE__ */ u$2("span", { class: "rbt-recent-preview", children: r2.preview || prettyChatName(r2.chatId, r2.name) })
    ] })
  ] });
}
function ChatList({ q: q2 }) {
  void chatTick.value;
  h$2(() => {
    if (!recentChats.value.length) void loadRecentChats();
  }, []);
  const groups = T(() => {
    const query = q2.trim().toLowerCase();
    const list = recentChats.value.filter((r2) => !query || r2.name.toLowerCase().includes(query) || r2.preview.toLowerCase().includes(query) || r2.chatId.toLowerCase().includes(query));
    const out = [];
    for (const r2 of list) {
      const label = timeGroup(r2);
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push(r2);
      else out.push({ label, items: [r2] });
    }
    return out;
  }, [recentChats.value, q2]);
  return /* @__PURE__ */ u$2("div", { class: "rbt-recent", children: [
    groups.map((g2) => /* @__PURE__ */ u$2("section", { class: "rbt-recent-group", children: [
      /* @__PURE__ */ u$2("h4", { children: g2.label }),
      g2.items.map((r2) => /* @__PURE__ */ u$2(RecentRow, { r: r2 }, r2.key))
    ] }, g2.label)),
    !groups.length && /* @__PURE__ */ u$2("div", { class: "rbt-recent-empty", children: recentLoading.value ? "读取中…" : q2 ? "没有匹配的聊天" : "还没有聊天" })
  ] });
}
function openTemporaryChat() {
  const click = () => trigger(".openTemporaryChat");
  if (!inChat()) {
    click();
    return;
  }
  goHome();
  let n2 = 0;
  const wait = () => {
    if (document.querySelector(".openTemporaryChat")) click();
    else if (n2++ < 30) setTimeout(wait, 100);
  };
  setTimeout(wait, 100);
}
async function leaveShell() {
  const ok = await ctx().Popup?.show?.confirm?.("切回原版界面？", "想回到现在的三栏界面时，在输入框里发送 /rbt shell，或者在「扩展 › RedBird 工具箱」里勾选「三栏外壳」。");
  if (ok) setShellEnabled(false);
}
const stVersion = y$1("");
function loadVersion() {
  fetch("/version").then((r2) => r2.json()).then((v2) => {
    if (v2?.pkgVersion) stVersion.value = v2.pkgVersion;
  }).catch(() => {
  });
}
function LeftColumn() {
  const [q2, setQ] = d$1("");
  const version = stVersion.value;
  return /* @__PURE__ */ u$2("aside", { class: "rbt-left", "aria-label": "RedBird 左栏", children: [
    /* @__PURE__ */ u$2("div", { class: "rbt-left-head", children: [
      /* @__PURE__ */ u$2("button", { type: "button", class: "rbt-brand", title: "回到首页", onClick: goHome, children: [
        /* @__PURE__ */ u$2("span", { class: "rbt-brand-mark", children: "🐦" }),
        /* @__PURE__ */ u$2("span", { children: "首页" })
      ] }),
      /* @__PURE__ */ u$2("button", { type: "button", class: "rbt-icon-btn", title: "收起左栏", onClick: () => setCollapsed(true), children: /* @__PURE__ */ u$2("i", { class: "fa-solid fa-angles-left" }) })
    ] }),
    /* @__PURE__ */ u$2("div", { class: "rbt-gtool-row", children: /* @__PURE__ */ u$2(GlobalButton, {}) }),
    /* @__PURE__ */ u$2("nav", { class: "rbt-globals", "aria-label": "酒馆设定", children: ST_KEYS.map((k2) => /* @__PURE__ */ u$2(DrawerButton, { k: k2, title: k2 === "api" && !apiOnline.value ? "API（没连上）" : void 0, dot: k2 === "api" && !apiOnline.value ? "没连上 API" : void 0 }, k2)) }),
    /* @__PURE__ */ u$2("div", { class: "rbt-left-actions", children: [
      /* @__PURE__ */ u$2("div", { class: "rbt-left-title", children: "最近的聊天" }),
      /* @__PURE__ */ u$2("label", { class: "rbt-search", children: [
        /* @__PURE__ */ u$2("i", { class: "fa-solid fa-magnifying-glass" }),
        /* @__PURE__ */ u$2("input", { type: "search", placeholder: "搜索聊天", value: q2, onInput: (e2) => setQ(e2.currentTarget.value) })
      ] })
    ] }),
    /* @__PURE__ */ u$2(ChatList, { q: q2 }),
    /* @__PURE__ */ u$2("div", { class: "rbt-left-foot", children: [
      /* @__PURE__ */ u$2("button", { type: "button", class: "rbt-foot-btn", title: "和酒馆助手临时聊几句，不会保存", onClick: openTemporaryChat, children: [
        /* @__PURE__ */ u$2("i", { class: "fa-solid fa-comment-dots fa-fw" }),
        " 临时聊天"
      ] }),
      /* @__PURE__ */ u$2("div", { class: "rbt-foot-links", children: [
        /* @__PURE__ */ u$2("a", { href: "https://docs.sillytavern.app/", target: "_blank", rel: "noopener", children: [
          /* @__PURE__ */ u$2("i", { class: "fa-solid fa-circle-question" }),
          " 文档"
        ] }),
        /* @__PURE__ */ u$2("a", { href: "https://github.com/SillyTavern/SillyTavern", target: "_blank", rel: "noopener", children: [
          /* @__PURE__ */ u$2("i", { class: "fa-brands fa-github" }),
          " GitHub"
        ] }),
        /* @__PURE__ */ u$2("a", { href: "https://discord.gg/sillytavern", target: "_blank", rel: "noopener", children: [
          /* @__PURE__ */ u$2("i", { class: "fa-brands fa-discord" }),
          " Discord"
        ] })
      ] }),
      /* @__PURE__ */ u$2("div", { class: "rbt-foot-row", children: [
        /* @__PURE__ */ u$2("button", { type: "button", class: "rbt-foot-btn", title: "关掉三栏外壳，回到酒馆原来的界面", onClick: () => {
          void leaveShell();
        }, children: [
          /* @__PURE__ */ u$2("i", { class: "fa-solid fa-table-columns fa-fw" }),
          " 原版界面"
        ] }),
        version && /* @__PURE__ */ u$2("span", { class: "rbt-foot-version", children: [
          "SillyTavern ",
          version
        ] })
      ] })
    ] })
  ] });
}
function NavBar() {
  void chatTick.value;
  const c2 = ctx();
  const char = currentCharacter();
  const group = c2.groupId ? c2.groups?.find((g2) => g2.id === c2.groupId) : null;
  const chatId = String(c2.getCurrentChatId?.() ?? "");
  const home = !char && !group;
  const name = char?.name ?? group?.name ?? "";
  return /* @__PURE__ */ u$2("header", { class: "rbt-nav", children: [
    leftCollapsed.value && /* @__PURE__ */ u$2("button", { type: "button", class: "rbt-icon-btn", title: "展开左栏", onClick: () => setCollapsed(false), children: /* @__PURE__ */ u$2("i", { class: "fa-solid fa-angles-right" }) }),
    /* @__PURE__ */ u$2("div", { class: "rbt-nav-title", children: home ? /* @__PURE__ */ u$2("span", { class: "rbt-nav-name", children: "首页" }) : /* @__PURE__ */ u$2(S$1, { children: [
      char && /* @__PURE__ */ u$2("img", { class: "rbt-nav-avatar", src: c2.getThumbnailUrl("avatar", char.avatar), alt: "" }),
      /* @__PURE__ */ u$2("span", { class: "rbt-nav-name", children: name }),
      chatId && /* @__PURE__ */ u$2("button", { type: "button", class: "rbt-nav-save", title: "切换 / 管理这个角色的存档", onClick: () => trigger("#option_select_chat"), children: [
        prettyChatName(chatId, name),
        " ",
        /* @__PURE__ */ u$2("i", { class: "fa-solid fa-chevron-down" })
      ] }),
      /* @__PURE__ */ u$2("button", { type: "button", class: "rbt-gbtn compact rbt-nav-new", title: `给「${name}」开一个新存档`, onClick: newChat, children: [
        /* @__PURE__ */ u$2("i", { class: "fa-solid fa-plus fa-fw" }),
        /* @__PURE__ */ u$2("span", { children: "新聊天" })
      ] })
    ] }) }),
    /* @__PURE__ */ u$2("div", { class: "rbt-nav-actions", children: [
      !home && /* @__PURE__ */ u$2(DrawerButton, { k: "characters", compact: true, label: "编辑卡片", title: "打开酒馆的角色卡编辑页" }),
      !home && /* @__PURE__ */ u$2(DrawerButton, { k: "worldinfo", compact: true }),
      !home && /* @__PURE__ */ u$2(ToolboxButton, {})
    ] })
  ] });
}
function Shell() {
  if (!shellOn.value) return null;
  return /* @__PURE__ */ u$2(S$1, { children: [
    !leftCollapsed.value && /* @__PURE__ */ u$2(LeftColumn, {}),
    /* @__PURE__ */ u$2(NavBar, {}),
    homeActive.value && shellActive.value && /* @__PURE__ */ u$2(HomeGallery, {})
  ] });
}
function initShellState() {
  shellOn.value = settings().shellEnabled;
  try {
    leftCollapsed.value = localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
  }
  applyBodyClasses();
  window.addEventListener("resize", applyBodyClasses);
  setTimeout(() => document.body.classList.add("rbt-shell-ready"), 800);
  const c2 = ctx();
  const bump2 = () => {
    chatTick.value++;
    applyBodyClasses();
    if (shellActive.value && document.body.classList.contains("rbt-home")) panelOpen.value = false;
  };
  for (const ev of [c2.eventTypes.CHAT_CHANGED, c2.eventTypes.CHARACTER_RENAMED, c2.eventTypes.CHAT_RENAMED]) {
    if (ev) c2.eventSource.on(ev, bump2);
  }
  readOnline();
  loadVersion();
  for (const ev of [c2.eventTypes.ONLINE_STATUS_CHANGED, c2.eventTypes.MAIN_API_CHANGED, c2.eventTypes.CHATCOMPLETION_SOURCE_CHANGED, c2.eventTypes.CONNECTION_PROFILE_LOADED]) {
    if (ev) c2.eventSource.on(ev, () => setTimeout(readOnline, 0));
  }
}
const VIEW_IDS = Object.keys(VIEW_LABELS);
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
          ${VIEW_IDS.map((v2) => `<div class="menu_button" data-view="${v2}">${VIEW_LABELS[v2]}</div>`).join("")}
        </div>
        <label class="checkbox_label"><input type="checkbox" id="rbt_shell_switch" /> 三栏界面（电脑上用左栏和导航条代替酒馆原来的顶栏）</label>
        <label class="checkbox_label"><input type="checkbox" id="rbt_auto_switch" /> 换卡时自动切换世界书、正则和预设（关掉后只提醒）</label>
        <label class="checkbox_label"><input type="checkbox" id="rbt_auto_world" /> 卡里自带的世界书还没导入时，自动导入并绑定</label>
        <small>也可以从输入框左边的魔法棒菜单打开，或发送 <code>/rbt</code>。发送 <code>/rbt shell</code> 开关三栏界面。</small>
      </div>
    </div>`;
  host.appendChild(wrap);
  wrap.querySelectorAll("[data-view]").forEach((b2) => b2.addEventListener("click", () => openView(b2.dataset.view)));
  const bind = (id, get, set) => {
    const cb = wrap.querySelector(`#${id}`);
    cb.checked = get();
    cb.addEventListener("change", () => set(cb.checked));
    return cb;
  };
  const shellCb = bind("rbt_shell_switch", () => shellOn.value, (v2) => setShellEnabled(v2));
  shellOn.subscribe((v2) => {
    shellCb.checked = v2;
  });
  bind("rbt_auto_switch", () => settings().autoApplyEnv, (v2) => {
    settings().autoApplyEnv = v2;
    saveSettings();
  });
  bind("rbt_auto_world", () => settings().autoImportWorld, (v2) => {
    settings().autoImportWorld = v2;
    saveSettings();
  });
}
function addSlashCommand() {
  const c2 = ctx();
  try {
    c2.SlashCommandParser.addCommandObject(c2.SlashCommand.fromProps({
      name: "rbt",
      callback: (_args, tab) => {
        const arg = String(tab ?? "").trim();
        if (arg === "shell") {
          setShellEnabled(!shellOn.value);
          return "";
        }
        const v2 = VIEW_IDS.find((x2) => x2 === arg);
        if (v2) openView(v2);
        else panelOpen.value = !panelOpen.value;
        return "";
      },
      helpString: "打开/关闭 RedBird 工具箱。参数：flow（信息流）/ vars（变量）/ card（角色档案）/ global（全局）/ maintain（维护）；/rbt shell 开关三栏外壳。"
    }));
  } catch (e2) {
    console.warn("[RedBird] slash command registration failed", e2);
  }
}
async function init() {
  await preloadModules();
  configureViews({
    openInDock: (v2) => openPanel(v2),
    beforeSheet: () => {
      for (const k2 of openDrawers.value) closeDrawer(k2);
    }
  });
  const legacy = (tab) => openView(tab === "env" || tab === "cards" ? "card" : tab);
  installFlowCapture();
  installVarsWatch();
  installEnvWatch(legacy);
  installCardsWatch(legacy);
  const root = document.createElement("div");
  root.id = "rbt-root";
  document.body.appendChild(root);
  R(/* @__PURE__ */ u$2(Panel, {}), root);
  installDrawers();
  installRecentWatch();
  installCharactersWatch();
  openDrawers.subscribe((open) => {
    if (open.length && sheetView.value) closeSheet$1();
  });
  const onSwitch = async () => {
    try {
      await autoApplyOnSwitch(() => openView("card"));
    } catch (e2) {
      console.error("[RedBird] auto apply failed", e2);
    }
  };
  const es = ctx().eventSource;
  if (typeof es.makeFirst === "function") es.makeFirst(ctx().eventTypes.CHAT_CHANGED, onSwitch);
  else es.on(ctx().eventTypes.CHAT_CHANGED, onSwitch);
  installWorldNote();
  initShellState();
  const shellRoot = document.createElement("div");
  shellRoot.id = "rbt-shell-root";
  document.body.appendChild(shellRoot);
  R(/* @__PURE__ */ u$2(S$1, { children: [
    /* @__PURE__ */ u$2(Shell, {}),
    /* @__PURE__ */ u$2(SheetHost, {})
  ] }), shellRoot);
  addMenuButton();
  addSettingsDrawer();
  addSlashCommand();
  window.RedBirdTools = { captures, openPanel, openView, setShellEnabled };
  console.log("[RedBird] 工具箱已加载");
}
const start = () => {
  init().catch((e2) => console.error("[RedBird] init failed", e2));
};
if (window.jQuery) window.jQuery(start);
else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
//# sourceMappingURL=index.js.map
