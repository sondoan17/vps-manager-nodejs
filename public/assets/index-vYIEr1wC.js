function Lx(e, t) {
  for (var n = 0; n < t.length; n++) {
    const r = t[n];
    if (typeof r != "string" && !Array.isArray(r)) {
      for (const o in r)
        if (o !== "default" && !(o in e)) {
          const s = Object.getOwnPropertyDescriptor(r, o);
          s &&
            Object.defineProperty(
              e,
              o,
              s.get ? s : { enumerable: !0, get: () => r[o] },
            );
        }
    }
  }
  return Object.freeze(
    Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }),
  );
}
(function () {
  const t = document.createElement("link").relList;
  if (t && t.supports && t.supports("modulepreload")) return;
  for (const o of document.querySelectorAll('link[rel="modulepreload"]')) r(o);
  new MutationObserver((o) => {
    for (const s of o)
      if (s.type === "childList")
        for (const a of s.addedNodes)
          a.tagName === "LINK" && a.rel === "modulepreload" && r(a);
  }).observe(document, { childList: !0, subtree: !0 });
  function n(o) {
    const s = {};
    return (
      o.integrity && (s.integrity = o.integrity),
      o.referrerPolicy && (s.referrerPolicy = o.referrerPolicy),
      o.crossOrigin === "use-credentials"
        ? (s.credentials = "include")
        : o.crossOrigin === "anonymous"
          ? (s.credentials = "omit")
          : (s.credentials = "same-origin"),
      s
    );
  }
  function r(o) {
    if (o.ep) return;
    o.ep = !0;
    const s = n(o);
    fetch(o.href, s);
  }
})();
function $x(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default")
    ? e.default
    : e;
}
var zp = { exports: {} },
  ra = {},
  Fp = { exports: {} },
  Z = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var us = Symbol.for("react.element"),
  zx = Symbol.for("react.portal"),
  Fx = Symbol.for("react.fragment"),
  Bx = Symbol.for("react.strict_mode"),
  Ux = Symbol.for("react.profiler"),
  Wx = Symbol.for("react.provider"),
  Vx = Symbol.for("react.context"),
  Hx = Symbol.for("react.forward_ref"),
  Kx = Symbol.for("react.suspense"),
  Gx = Symbol.for("react.memo"),
  Yx = Symbol.for("react.lazy"),
  Rd = Symbol.iterator;
function Xx(e) {
  return e === null || typeof e != "object"
    ? null
    : ((e = (Rd && e[Rd]) || e["@@iterator"]),
      typeof e == "function" ? e : null);
}
var Bp = {
    isMounted: function () {
      return !1;
    },
    enqueueForceUpdate: function () {},
    enqueueReplaceState: function () {},
    enqueueSetState: function () {},
  },
  Up = Object.assign,
  Wp = {};
function eo(e, t, n) {
  ((this.props = e),
    (this.context = t),
    (this.refs = Wp),
    (this.updater = n || Bp));
}
eo.prototype.isReactComponent = {};
eo.prototype.setState = function (e, t) {
  if (typeof e != "object" && typeof e != "function" && e != null)
    throw Error(
      "setState(...): takes an object of state variables to update or a function which returns an object of state variables.",
    );
  this.updater.enqueueSetState(this, e, t, "setState");
};
eo.prototype.forceUpdate = function (e) {
  this.updater.enqueueForceUpdate(this, e, "forceUpdate");
};
function Vp() {}
Vp.prototype = eo.prototype;
function Vc(e, t, n) {
  ((this.props = e),
    (this.context = t),
    (this.refs = Wp),
    (this.updater = n || Bp));
}
var Hc = (Vc.prototype = new Vp());
Hc.constructor = Vc;
Up(Hc, eo.prototype);
Hc.isPureReactComponent = !0;
var _d = Array.isArray,
  Hp = Object.prototype.hasOwnProperty,
  Kc = { current: null },
  Kp = { key: !0, ref: !0, __self: !0, __source: !0 };
function Gp(e, t, n) {
  var r,
    o = {},
    s = null,
    a = null;
  if (t != null)
    for (r in (t.ref !== void 0 && (a = t.ref),
    t.key !== void 0 && (s = "" + t.key),
    t))
      Hp.call(t, r) && !Kp.hasOwnProperty(r) && (o[r] = t[r]);
  var i = arguments.length - 2;
  if (i === 1) o.children = n;
  else if (1 < i) {
    for (var c = Array(i), u = 0; u < i; u++) c[u] = arguments[u + 2];
    o.children = c;
  }
  if (e && e.defaultProps)
    for (r in ((i = e.defaultProps), i)) o[r] === void 0 && (o[r] = i[r]);
  return {
    $$typeof: us,
    type: e,
    key: s,
    ref: a,
    props: o,
    _owner: Kc.current,
  };
}
function Qx(e, t) {
  return {
    $$typeof: us,
    type: e.type,
    key: t,
    ref: e.ref,
    props: e.props,
    _owner: e._owner,
  };
}
function Gc(e) {
  return typeof e == "object" && e !== null && e.$$typeof === us;
}
function qx(e) {
  var t = { "=": "=0", ":": "=2" };
  return (
    "$" +
    e.replace(/[=:]/g, function (n) {
      return t[n];
    })
  );
}
var Pd = /\/+/g;
function $a(e, t) {
  return typeof e == "object" && e !== null && e.key != null
    ? qx("" + e.key)
    : t.toString(36);
}
function sl(e, t, n, r, o) {
  var s = typeof e;
  (s === "undefined" || s === "boolean") && (e = null);
  var a = !1;
  if (e === null) a = !0;
  else
    switch (s) {
      case "string":
      case "number":
        a = !0;
        break;
      case "object":
        switch (e.$$typeof) {
          case us:
          case zx:
            a = !0;
        }
    }
  if (a)
    return (
      (a = e),
      (o = o(a)),
      (e = r === "" ? "." + $a(a, 0) : r),
      _d(o)
        ? ((n = ""),
          e != null && (n = e.replace(Pd, "$&/") + "/"),
          sl(o, t, n, "", function (u) {
            return u;
          }))
        : o != null &&
          (Gc(o) &&
            (o = Qx(
              o,
              n +
                (!o.key || (a && a.key === o.key)
                  ? ""
                  : ("" + o.key).replace(Pd, "$&/") + "/") +
                e,
            )),
          t.push(o)),
      1
    );
  if (((a = 0), (r = r === "" ? "." : r + ":"), _d(e)))
    for (var i = 0; i < e.length; i++) {
      s = e[i];
      var c = r + $a(s, i);
      a += sl(s, t, n, c, o);
    }
  else if (((c = Xx(e)), typeof c == "function"))
    for (e = c.call(e), i = 0; !(s = e.next()).done;)
      ((s = s.value), (c = r + $a(s, i++)), (a += sl(s, t, n, c, o)));
  else if (s === "object")
    throw (
      (t = String(e)),
      Error(
        "Objects are not valid as a React child (found: " +
          (t === "[object Object]"
            ? "object with keys {" + Object.keys(e).join(", ") + "}"
            : t) +
          "). If you meant to render a collection of children, use an array instead.",
      )
    );
  return a;
}
function _s(e, t, n) {
  if (e == null) return e;
  var r = [],
    o = 0;
  return (
    sl(e, r, "", "", function (s) {
      return t.call(n, s, o++);
    }),
    r
  );
}
function Jx(e) {
  if (e._status === -1) {
    var t = e._result;
    ((t = t()),
      t.then(
        function (n) {
          (e._status === 0 || e._status === -1) &&
            ((e._status = 1), (e._result = n));
        },
        function (n) {
          (e._status === 0 || e._status === -1) &&
            ((e._status = 2), (e._result = n));
        },
      ),
      e._status === -1 && ((e._status = 0), (e._result = t)));
  }
  if (e._status === 1) return e._result.default;
  throw e._result;
}
var Ve = { current: null },
  ll = { transition: null },
  Zx = {
    ReactCurrentDispatcher: Ve,
    ReactCurrentBatchConfig: ll,
    ReactCurrentOwner: Kc,
  };
function Yp() {
  throw Error("act(...) is not supported in production builds of React.");
}
Z.Children = {
  map: _s,
  forEach: function (e, t, n) {
    _s(
      e,
      function () {
        t.apply(this, arguments);
      },
      n,
    );
  },
  count: function (e) {
    var t = 0;
    return (
      _s(e, function () {
        t++;
      }),
      t
    );
  },
  toArray: function (e) {
    return (
      _s(e, function (t) {
        return t;
      }) || []
    );
  },
  only: function (e) {
    if (!Gc(e))
      throw Error(
        "React.Children.only expected to receive a single React element child.",
      );
    return e;
  },
};
Z.Component = eo;
Z.Fragment = Fx;
Z.Profiler = Ux;
Z.PureComponent = Vc;
Z.StrictMode = Bx;
Z.Suspense = Kx;
Z.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Zx;
Z.act = Yp;
Z.cloneElement = function (e, t, n) {
  if (e == null)
    throw Error(
      "React.cloneElement(...): The argument must be a React element, but you passed " +
        e +
        ".",
    );
  var r = Up({}, e.props),
    o = e.key,
    s = e.ref,
    a = e._owner;
  if (t != null) {
    if (
      (t.ref !== void 0 && ((s = t.ref), (a = Kc.current)),
      t.key !== void 0 && (o = "" + t.key),
      e.type && e.type.defaultProps)
    )
      var i = e.type.defaultProps;
    for (c in t)
      Hp.call(t, c) &&
        !Kp.hasOwnProperty(c) &&
        (r[c] = t[c] === void 0 && i !== void 0 ? i[c] : t[c]);
  }
  var c = arguments.length - 2;
  if (c === 1) r.children = n;
  else if (1 < c) {
    i = Array(c);
    for (var u = 0; u < c; u++) i[u] = arguments[u + 2];
    r.children = i;
  }
  return { $$typeof: us, type: e.type, key: o, ref: s, props: r, _owner: a };
};
Z.createContext = function (e) {
  return (
    (e = {
      $$typeof: Vx,
      _currentValue: e,
      _currentValue2: e,
      _threadCount: 0,
      Provider: null,
      Consumer: null,
      _defaultValue: null,
      _globalName: null,
    }),
    (e.Provider = { $$typeof: Wx, _context: e }),
    (e.Consumer = e)
  );
};
Z.createElement = Gp;
Z.createFactory = function (e) {
  var t = Gp.bind(null, e);
  return ((t.type = e), t);
};
Z.createRef = function () {
  return { current: null };
};
Z.forwardRef = function (e) {
  return { $$typeof: Hx, render: e };
};
Z.isValidElement = Gc;
Z.lazy = function (e) {
  return { $$typeof: Yx, _payload: { _status: -1, _result: e }, _init: Jx };
};
Z.memo = function (e, t) {
  return { $$typeof: Gx, type: e, compare: t === void 0 ? null : t };
};
Z.startTransition = function (e) {
  var t = ll.transition;
  ll.transition = {};
  try {
    e();
  } finally {
    ll.transition = t;
  }
};
Z.unstable_act = Yp;
Z.useCallback = function (e, t) {
  return Ve.current.useCallback(e, t);
};
Z.useContext = function (e) {
  return Ve.current.useContext(e);
};
Z.useDebugValue = function () {};
Z.useDeferredValue = function (e) {
  return Ve.current.useDeferredValue(e);
};
Z.useEffect = function (e, t) {
  return Ve.current.useEffect(e, t);
};
Z.useId = function () {
  return Ve.current.useId();
};
Z.useImperativeHandle = function (e, t, n) {
  return Ve.current.useImperativeHandle(e, t, n);
};
Z.useInsertionEffect = function (e, t) {
  return Ve.current.useInsertionEffect(e, t);
};
Z.useLayoutEffect = function (e, t) {
  return Ve.current.useLayoutEffect(e, t);
};
Z.useMemo = function (e, t) {
  return Ve.current.useMemo(e, t);
};
Z.useReducer = function (e, t, n) {
  return Ve.current.useReducer(e, t, n);
};
Z.useRef = function (e) {
  return Ve.current.useRef(e);
};
Z.useState = function (e) {
  return Ve.current.useState(e);
};
Z.useSyncExternalStore = function (e, t, n) {
  return Ve.current.useSyncExternalStore(e, t, n);
};
Z.useTransition = function () {
  return Ve.current.useTransition();
};
Z.version = "18.3.1";
Fp.exports = Z;
var p = Fp.exports;
const $ = $x(p),
  ds = Lx({ __proto__: null, default: $ }, [p]);
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var ey = p,
  ty = Symbol.for("react.element"),
  ny = Symbol.for("react.fragment"),
  ry = Object.prototype.hasOwnProperty,
  oy = ey.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
  sy = { key: !0, ref: !0, __self: !0, __source: !0 };
function Xp(e, t, n) {
  var r,
    o = {},
    s = null,
    a = null;
  (n !== void 0 && (s = "" + n),
    t.key !== void 0 && (s = "" + t.key),
    t.ref !== void 0 && (a = t.ref));
  for (r in t) ry.call(t, r) && !sy.hasOwnProperty(r) && (o[r] = t[r]);
  if (e && e.defaultProps)
    for (r in ((t = e.defaultProps), t)) o[r] === void 0 && (o[r] = t[r]);
  return {
    $$typeof: ty,
    type: e,
    key: s,
    ref: a,
    props: o,
    _owner: oy.current,
  };
}
ra.Fragment = ny;
ra.jsx = Xp;
ra.jsxs = Xp;
zp.exports = ra;
var l = zp.exports,
  Mi = {},
  Qp = { exports: {} },
  ut = {},
  qp = { exports: {} },
  Jp = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ (function (e) {
  function t(_, P) {
    var I = _.length;
    _.push(P);
    e: for (; 0 < I;) {
      var V = (I - 1) >>> 1,
        J = _[V];
      if (0 < o(J, P)) ((_[V] = P), (_[I] = J), (I = V));
      else break e;
    }
  }
  function n(_) {
    return _.length === 0 ? null : _[0];
  }
  function r(_) {
    if (_.length === 0) return null;
    var P = _[0],
      I = _.pop();
    if (I !== P) {
      _[0] = I;
      e: for (var V = 0, J = _.length, Ne = J >>> 1; V < Ne;) {
        var O = 2 * (V + 1) - 1,
          L = _[O],
          U = O + 1,
          te = _[U];
        if (0 > o(L, I))
          U < J && 0 > o(te, L)
            ? ((_[V] = te), (_[U] = I), (V = U))
            : ((_[V] = L), (_[O] = I), (V = O));
        else if (U < J && 0 > o(te, I)) ((_[V] = te), (_[U] = I), (V = U));
        else break e;
      }
    }
    return P;
  }
  function o(_, P) {
    var I = _.sortIndex - P.sortIndex;
    return I !== 0 ? I : _.id - P.id;
  }
  if (typeof performance == "object" && typeof performance.now == "function") {
    var s = performance;
    e.unstable_now = function () {
      return s.now();
    };
  } else {
    var a = Date,
      i = a.now();
    e.unstable_now = function () {
      return a.now() - i;
    };
  }
  var c = [],
    u = [],
    d = 1,
    f = null,
    m = 3,
    y = !1,
    w = !1,
    x = !1,
    k = typeof setTimeout == "function" ? setTimeout : null,
    h = typeof clearTimeout == "function" ? clearTimeout : null,
    g = typeof setImmediate < "u" ? setImmediate : null;
  typeof navigator < "u" &&
    navigator.scheduling !== void 0 &&
    navigator.scheduling.isInputPending !== void 0 &&
    navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function v(_) {
    for (var P = n(u); P !== null;) {
      if (P.callback === null) r(u);
      else if (P.startTime <= _)
        (r(u), (P.sortIndex = P.expirationTime), t(c, P));
      else break;
      P = n(u);
    }
  }
  function b(_) {
    if (((x = !1), v(_), !w))
      if (n(c) !== null) ((w = !0), F(S));
      else {
        var P = n(u);
        P !== null && K(b, P.startTime - _);
      }
  }
  function S(_, P) {
    ((w = !1), x && ((x = !1), h(E), (E = -1)), (y = !0));
    var I = m;
    try {
      for (
        v(P), f = n(c);
        f !== null && (!(f.expirationTime > P) || (_ && !M()));
      ) {
        var V = f.callback;
        if (typeof V == "function") {
          ((f.callback = null), (m = f.priorityLevel));
          var J = V(f.expirationTime <= P);
          ((P = e.unstable_now()),
            typeof J == "function" ? (f.callback = J) : f === n(c) && r(c),
            v(P));
        } else r(c);
        f = n(c);
      }
      if (f !== null) var Ne = !0;
      else {
        var O = n(u);
        (O !== null && K(b, O.startTime - P), (Ne = !1));
      }
      return Ne;
    } finally {
      ((f = null), (m = I), (y = !1));
    }
  }
  var C = !1,
    N = null,
    E = -1,
    j = 5,
    R = -1;
  function M() {
    return !(e.unstable_now() - R < j);
  }
  function T() {
    if (N !== null) {
      var _ = e.unstable_now();
      R = _;
      var P = !0;
      try {
        P = N(!0, _);
      } finally {
        P ? D() : ((C = !1), (N = null));
      }
    } else C = !1;
  }
  var D;
  if (typeof g == "function")
    D = function () {
      g(T);
    };
  else if (typeof MessageChannel < "u") {
    var B = new MessageChannel(),
      Q = B.port2;
    ((B.port1.onmessage = T),
      (D = function () {
        Q.postMessage(null);
      }));
  } else
    D = function () {
      k(T, 0);
    };
  function F(_) {
    ((N = _), C || ((C = !0), D()));
  }
  function K(_, P) {
    E = k(function () {
      _(e.unstable_now());
    }, P);
  }
  ((e.unstable_IdlePriority = 5),
    (e.unstable_ImmediatePriority = 1),
    (e.unstable_LowPriority = 4),
    (e.unstable_NormalPriority = 3),
    (e.unstable_Profiling = null),
    (e.unstable_UserBlockingPriority = 2),
    (e.unstable_cancelCallback = function (_) {
      _.callback = null;
    }),
    (e.unstable_continueExecution = function () {
      w || y || ((w = !0), F(S));
    }),
    (e.unstable_forceFrameRate = function (_) {
      0 > _ || 125 < _
        ? console.error(
            "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported",
          )
        : (j = 0 < _ ? Math.floor(1e3 / _) : 5);
    }),
    (e.unstable_getCurrentPriorityLevel = function () {
      return m;
    }),
    (e.unstable_getFirstCallbackNode = function () {
      return n(c);
    }),
    (e.unstable_next = function (_) {
      switch (m) {
        case 1:
        case 2:
        case 3:
          var P = 3;
          break;
        default:
          P = m;
      }
      var I = m;
      m = P;
      try {
        return _();
      } finally {
        m = I;
      }
    }),
    (e.unstable_pauseExecution = function () {}),
    (e.unstable_requestPaint = function () {}),
    (e.unstable_runWithPriority = function (_, P) {
      switch (_) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          _ = 3;
      }
      var I = m;
      m = _;
      try {
        return P();
      } finally {
        m = I;
      }
    }),
    (e.unstable_scheduleCallback = function (_, P, I) {
      var V = e.unstable_now();
      switch (
        (typeof I == "object" && I !== null
          ? ((I = I.delay), (I = typeof I == "number" && 0 < I ? V + I : V))
          : (I = V),
        _)
      ) {
        case 1:
          var J = -1;
          break;
        case 2:
          J = 250;
          break;
        case 5:
          J = 1073741823;
          break;
        case 4:
          J = 1e4;
          break;
        default:
          J = 5e3;
      }
      return (
        (J = I + J),
        (_ = {
          id: d++,
          callback: P,
          priorityLevel: _,
          startTime: I,
          expirationTime: J,
          sortIndex: -1,
        }),
        I > V
          ? ((_.sortIndex = I),
            t(u, _),
            n(c) === null &&
              _ === n(u) &&
              (x ? (h(E), (E = -1)) : (x = !0), K(b, I - V)))
          : ((_.sortIndex = J), t(c, _), w || y || ((w = !0), F(S))),
        _
      );
    }),
    (e.unstable_shouldYield = M),
    (e.unstable_wrapCallback = function (_) {
      var P = m;
      return function () {
        var I = m;
        m = P;
        try {
          return _.apply(this, arguments);
        } finally {
          m = I;
        }
      };
    }));
})(Jp);
qp.exports = Jp;
var ly = qp.exports;
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var ay = p,
  ct = ly;
function A(e) {
  for (
    var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1;
    n < arguments.length;
    n++
  )
    t += "&args[]=" + encodeURIComponent(arguments[n]);
  return (
    "Minified React error #" +
    e +
    "; visit " +
    t +
    " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
  );
}
var Zp = new Set(),
  Wo = {};
function dr(e, t) {
  (Ur(e, t), Ur(e + "Capture", t));
}
function Ur(e, t) {
  for (Wo[e] = t, e = 0; e < t.length; e++) Zp.add(t[e]);
}
var ln = !(
    typeof window > "u" ||
    typeof window.document > "u" ||
    typeof window.document.createElement > "u"
  ),
  Ai = Object.prototype.hasOwnProperty,
  iy =
    /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,
  Md = {},
  Ad = {};
function cy(e) {
  return Ai.call(Ad, e)
    ? !0
    : Ai.call(Md, e)
      ? !1
      : iy.test(e)
        ? (Ad[e] = !0)
        : ((Md[e] = !0), !1);
}
function uy(e, t, n, r) {
  if (n !== null && n.type === 0) return !1;
  switch (typeof t) {
    case "function":
    case "symbol":
      return !0;
    case "boolean":
      return r
        ? !1
        : n !== null
          ? !n.acceptsBooleans
          : ((e = e.toLowerCase().slice(0, 5)), e !== "data-" && e !== "aria-");
    default:
      return !1;
  }
}
function dy(e, t, n, r) {
  if (t === null || typeof t > "u" || uy(e, t, n, r)) return !0;
  if (r) return !1;
  if (n !== null)
    switch (n.type) {
      case 3:
        return !t;
      case 4:
        return t === !1;
      case 5:
        return isNaN(t);
      case 6:
        return isNaN(t) || 1 > t;
    }
  return !1;
}
function He(e, t, n, r, o, s, a) {
  ((this.acceptsBooleans = t === 2 || t === 3 || t === 4),
    (this.attributeName = r),
    (this.attributeNamespace = o),
    (this.mustUseProperty = n),
    (this.propertyName = e),
    (this.type = t),
    (this.sanitizeURL = s),
    (this.removeEmptyString = a));
}
var Oe = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style"
  .split(" ")
  .forEach(function (e) {
    Oe[e] = new He(e, 0, !1, e, null, !1, !1);
  });
[
  ["acceptCharset", "accept-charset"],
  ["className", "class"],
  ["htmlFor", "for"],
  ["httpEquiv", "http-equiv"],
].forEach(function (e) {
  var t = e[0];
  Oe[t] = new He(t, 1, !1, e[1], null, !1, !1);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function (e) {
  Oe[e] = new He(e, 2, !1, e.toLowerCase(), null, !1, !1);
});
[
  "autoReverse",
  "externalResourcesRequired",
  "focusable",
  "preserveAlpha",
].forEach(function (e) {
  Oe[e] = new He(e, 2, !1, e, null, !1, !1);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope"
  .split(" ")
  .forEach(function (e) {
    Oe[e] = new He(e, 3, !1, e.toLowerCase(), null, !1, !1);
  });
["checked", "multiple", "muted", "selected"].forEach(function (e) {
  Oe[e] = new He(e, 3, !0, e, null, !1, !1);
});
["capture", "download"].forEach(function (e) {
  Oe[e] = new He(e, 4, !1, e, null, !1, !1);
});
["cols", "rows", "size", "span"].forEach(function (e) {
  Oe[e] = new He(e, 6, !1, e, null, !1, !1);
});
["rowSpan", "start"].forEach(function (e) {
  Oe[e] = new He(e, 5, !1, e.toLowerCase(), null, !1, !1);
});
var Yc = /[\-:]([a-z])/g;
function Xc(e) {
  return e[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height"
  .split(" ")
  .forEach(function (e) {
    var t = e.replace(Yc, Xc);
    Oe[t] = new He(t, 1, !1, e, null, !1, !1);
  });
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type"
  .split(" ")
  .forEach(function (e) {
    var t = e.replace(Yc, Xc);
    Oe[t] = new He(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
  });
["xml:base", "xml:lang", "xml:space"].forEach(function (e) {
  var t = e.replace(Yc, Xc);
  Oe[t] = new He(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
});
["tabIndex", "crossOrigin"].forEach(function (e) {
  Oe[e] = new He(e, 1, !1, e.toLowerCase(), null, !1, !1);
});
Oe.xlinkHref = new He(
  "xlinkHref",
  1,
  !1,
  "xlink:href",
  "http://www.w3.org/1999/xlink",
  !0,
  !1,
);
["src", "href", "action", "formAction"].forEach(function (e) {
  Oe[e] = new He(e, 1, !1, e.toLowerCase(), null, !0, !0);
});
function Qc(e, t, n, r) {
  var o = Oe.hasOwnProperty(t) ? Oe[t] : null;
  (o !== null
    ? o.type !== 0
    : r ||
      !(2 < t.length) ||
      (t[0] !== "o" && t[0] !== "O") ||
      (t[1] !== "n" && t[1] !== "N")) &&
    (dy(t, n, o, r) && (n = null),
    r || o === null
      ? cy(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n))
      : o.mustUseProperty
        ? (e[o.propertyName] = n === null ? (o.type === 3 ? !1 : "") : n)
        : ((t = o.attributeName),
          (r = o.attributeNamespace),
          n === null
            ? e.removeAttribute(t)
            : ((o = o.type),
              (n = o === 3 || (o === 4 && n === !0) ? "" : "" + n),
              r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
}
var pn = ay.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
  Ps = Symbol.for("react.element"),
  yr = Symbol.for("react.portal"),
  wr = Symbol.for("react.fragment"),
  qc = Symbol.for("react.strict_mode"),
  Ti = Symbol.for("react.profiler"),
  em = Symbol.for("react.provider"),
  tm = Symbol.for("react.context"),
  Jc = Symbol.for("react.forward_ref"),
  Di = Symbol.for("react.suspense"),
  Oi = Symbol.for("react.suspense_list"),
  Zc = Symbol.for("react.memo"),
  Cn = Symbol.for("react.lazy"),
  nm = Symbol.for("react.offscreen"),
  Td = Symbol.iterator;
function mo(e) {
  return e === null || typeof e != "object"
    ? null
    : ((e = (Td && e[Td]) || e["@@iterator"]),
      typeof e == "function" ? e : null);
}
var ve = Object.assign,
  za;
function _o(e) {
  if (za === void 0)
    try {
      throw Error();
    } catch (n) {
      var t = n.stack.trim().match(/\n( *(at )?)/);
      za = (t && t[1]) || "";
    }
  return (
    `
` +
    za +
    e
  );
}
var Fa = !1;
function Ba(e, t) {
  if (!e || Fa) return "";
  Fa = !0;
  var n = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    if (t)
      if (
        ((t = function () {
          throw Error();
        }),
        Object.defineProperty(t.prototype, "props", {
          set: function () {
            throw Error();
          },
        }),
        typeof Reflect == "object" && Reflect.construct)
      ) {
        try {
          Reflect.construct(t, []);
        } catch (u) {
          var r = u;
        }
        Reflect.construct(e, [], t);
      } else {
        try {
          t.call();
        } catch (u) {
          r = u;
        }
        e.call(t.prototype);
      }
    else {
      try {
        throw Error();
      } catch (u) {
        r = u;
      }
      e();
    }
  } catch (u) {
    if (u && r && typeof u.stack == "string") {
      for (
        var o = u.stack.split(`
`),
          s = r.stack.split(`
`),
          a = o.length - 1,
          i = s.length - 1;
        1 <= a && 0 <= i && o[a] !== s[i];
      )
        i--;
      for (; 1 <= a && 0 <= i; a--, i--)
        if (o[a] !== s[i]) {
          if (a !== 1 || i !== 1)
            do
              if ((a--, i--, 0 > i || o[a] !== s[i])) {
                var c =
                  `
` + o[a].replace(" at new ", " at ");
                return (
                  e.displayName &&
                    c.includes("<anonymous>") &&
                    (c = c.replace("<anonymous>", e.displayName)),
                  c
                );
              }
            while (1 <= a && 0 <= i);
          break;
        }
    }
  } finally {
    ((Fa = !1), (Error.prepareStackTrace = n));
  }
  return (e = e ? e.displayName || e.name : "") ? _o(e) : "";
}
function fy(e) {
  switch (e.tag) {
    case 5:
      return _o(e.type);
    case 16:
      return _o("Lazy");
    case 13:
      return _o("Suspense");
    case 19:
      return _o("SuspenseList");
    case 0:
    case 2:
    case 15:
      return ((e = Ba(e.type, !1)), e);
    case 11:
      return ((e = Ba(e.type.render, !1)), e);
    case 1:
      return ((e = Ba(e.type, !0)), e);
    default:
      return "";
  }
}
function Ii(e) {
  if (e == null) return null;
  if (typeof e == "function") return e.displayName || e.name || null;
  if (typeof e == "string") return e;
  switch (e) {
    case wr:
      return "Fragment";
    case yr:
      return "Portal";
    case Ti:
      return "Profiler";
    case qc:
      return "StrictMode";
    case Di:
      return "Suspense";
    case Oi:
      return "SuspenseList";
  }
  if (typeof e == "object")
    switch (e.$$typeof) {
      case tm:
        return (e.displayName || "Context") + ".Consumer";
      case em:
        return (e._context.displayName || "Context") + ".Provider";
      case Jc:
        var t = e.render;
        return (
          (e = e.displayName),
          e ||
            ((e = t.displayName || t.name || ""),
            (e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef")),
          e
        );
      case Zc:
        return (
          (t = e.displayName || null),
          t !== null ? t : Ii(e.type) || "Memo"
        );
      case Cn:
        ((t = e._payload), (e = e._init));
        try {
          return Ii(e(t));
        } catch {}
    }
  return null;
}
function py(e) {
  var t = e.type;
  switch (e.tag) {
    case 24:
      return "Cache";
    case 9:
      return (t.displayName || "Context") + ".Consumer";
    case 10:
      return (t._context.displayName || "Context") + ".Provider";
    case 18:
      return "DehydratedFragment";
    case 11:
      return (
        (e = t.render),
        (e = e.displayName || e.name || ""),
        t.displayName || (e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef")
      );
    case 7:
      return "Fragment";
    case 5:
      return t;
    case 4:
      return "Portal";
    case 3:
      return "Root";
    case 6:
      return "Text";
    case 16:
      return Ii(t);
    case 8:
      return t === qc ? "StrictMode" : "Mode";
    case 22:
      return "Offscreen";
    case 12:
      return "Profiler";
    case 21:
      return "Scope";
    case 13:
      return "Suspense";
    case 19:
      return "SuspenseList";
    case 25:
      return "TracingMarker";
    case 1:
    case 0:
    case 17:
    case 2:
    case 14:
    case 15:
      if (typeof t == "function") return t.displayName || t.name || null;
      if (typeof t == "string") return t;
  }
  return null;
}
function Bn(e) {
  switch (typeof e) {
    case "boolean":
    case "number":
    case "string":
    case "undefined":
      return e;
    case "object":
      return e;
    default:
      return "";
  }
}
function rm(e) {
  var t = e.type;
  return (
    (e = e.nodeName) &&
    e.toLowerCase() === "input" &&
    (t === "checkbox" || t === "radio")
  );
}
function my(e) {
  var t = rm(e) ? "checked" : "value",
    n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t),
    r = "" + e[t];
  if (
    !e.hasOwnProperty(t) &&
    typeof n < "u" &&
    typeof n.get == "function" &&
    typeof n.set == "function"
  ) {
    var o = n.get,
      s = n.set;
    return (
      Object.defineProperty(e, t, {
        configurable: !0,
        get: function () {
          return o.call(this);
        },
        set: function (a) {
          ((r = "" + a), s.call(this, a));
        },
      }),
      Object.defineProperty(e, t, { enumerable: n.enumerable }),
      {
        getValue: function () {
          return r;
        },
        setValue: function (a) {
          r = "" + a;
        },
        stopTracking: function () {
          ((e._valueTracker = null), delete e[t]);
        },
      }
    );
  }
}
function Ms(e) {
  e._valueTracker || (e._valueTracker = my(e));
}
function om(e) {
  if (!e) return !1;
  var t = e._valueTracker;
  if (!t) return !0;
  var n = t.getValue(),
    r = "";
  return (
    e && (r = rm(e) ? (e.checked ? "true" : "false") : e.value),
    (e = r),
    e !== n ? (t.setValue(e), !0) : !1
  );
}
function bl(e) {
  if (((e = e || (typeof document < "u" ? document : void 0)), typeof e > "u"))
    return null;
  try {
    return e.activeElement || e.body;
  } catch {
    return e.body;
  }
}
function Li(e, t) {
  var n = t.checked;
  return ve({}, t, {
    defaultChecked: void 0,
    defaultValue: void 0,
    value: void 0,
    checked: n ?? e._wrapperState.initialChecked,
  });
}
function Dd(e, t) {
  var n = t.defaultValue == null ? "" : t.defaultValue,
    r = t.checked != null ? t.checked : t.defaultChecked;
  ((n = Bn(t.value != null ? t.value : n)),
    (e._wrapperState = {
      initialChecked: r,
      initialValue: n,
      controlled:
        t.type === "checkbox" || t.type === "radio"
          ? t.checked != null
          : t.value != null,
    }));
}
function sm(e, t) {
  ((t = t.checked), t != null && Qc(e, "checked", t, !1));
}
function $i(e, t) {
  sm(e, t);
  var n = Bn(t.value),
    r = t.type;
  if (n != null)
    r === "number"
      ? ((n === 0 && e.value === "") || e.value != n) && (e.value = "" + n)
      : e.value !== "" + n && (e.value = "" + n);
  else if (r === "submit" || r === "reset") {
    e.removeAttribute("value");
    return;
  }
  (t.hasOwnProperty("value")
    ? zi(e, t.type, n)
    : t.hasOwnProperty("defaultValue") && zi(e, t.type, Bn(t.defaultValue)),
    t.checked == null &&
      t.defaultChecked != null &&
      (e.defaultChecked = !!t.defaultChecked));
}
function Od(e, t, n) {
  if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
    var r = t.type;
    if (!(
      (r !== "submit" && r !== "reset") ||
      (t.value !== void 0 && t.value !== null)
    ))
      return;
    ((t = "" + e._wrapperState.initialValue),
      n || t === e.value || (e.value = t),
      (e.defaultValue = t));
  }
  ((n = e.name),
    n !== "" && (e.name = ""),
    (e.defaultChecked = !!e._wrapperState.initialChecked),
    n !== "" && (e.name = n));
}
function zi(e, t, n) {
  (t !== "number" || bl(e.ownerDocument) !== e) &&
    (n == null
      ? (e.defaultValue = "" + e._wrapperState.initialValue)
      : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
}
var Po = Array.isArray;
function Ar(e, t, n, r) {
  if (((e = e.options), t)) {
    t = {};
    for (var o = 0; o < n.length; o++) t["$" + n[o]] = !0;
    for (n = 0; n < e.length; n++)
      ((o = t.hasOwnProperty("$" + e[n].value)),
        e[n].selected !== o && (e[n].selected = o),
        o && r && (e[n].defaultSelected = !0));
  } else {
    for (n = "" + Bn(n), t = null, o = 0; o < e.length; o++) {
      if (e[o].value === n) {
        ((e[o].selected = !0), r && (e[o].defaultSelected = !0));
        return;
      }
      t !== null || e[o].disabled || (t = e[o]);
    }
    t !== null && (t.selected = !0);
  }
}
function Fi(e, t) {
  if (t.dangerouslySetInnerHTML != null) throw Error(A(91));
  return ve({}, t, {
    value: void 0,
    defaultValue: void 0,
    children: "" + e._wrapperState.initialValue,
  });
}
function Id(e, t) {
  var n = t.value;
  if (n == null) {
    if (((n = t.children), (t = t.defaultValue), n != null)) {
      if (t != null) throw Error(A(92));
      if (Po(n)) {
        if (1 < n.length) throw Error(A(93));
        n = n[0];
      }
      t = n;
    }
    (t == null && (t = ""), (n = t));
  }
  e._wrapperState = { initialValue: Bn(n) };
}
function lm(e, t) {
  var n = Bn(t.value),
    r = Bn(t.defaultValue);
  (n != null &&
    ((n = "" + n),
    n !== e.value && (e.value = n),
    t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)),
    r != null && (e.defaultValue = "" + r));
}
function Ld(e) {
  var t = e.textContent;
  t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
}
function am(e) {
  switch (e) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function Bi(e, t) {
  return e == null || e === "http://www.w3.org/1999/xhtml"
    ? am(t)
    : e === "http://www.w3.org/2000/svg" && t === "foreignObject"
      ? "http://www.w3.org/1999/xhtml"
      : e;
}
var As,
  im = (function (e) {
    return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction
      ? function (t, n, r, o) {
          MSApp.execUnsafeLocalFunction(function () {
            return e(t, n, r, o);
          });
        }
      : e;
  })(function (e, t) {
    if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e)
      e.innerHTML = t;
    else {
      for (
        As = As || document.createElement("div"),
          As.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>",
          t = As.firstChild;
        e.firstChild;
      )
        e.removeChild(e.firstChild);
      for (; t.firstChild;) e.appendChild(t.firstChild);
    }
  });
function Vo(e, t) {
  if (t) {
    var n = e.firstChild;
    if (n && n === e.lastChild && n.nodeType === 3) {
      n.nodeValue = t;
      return;
    }
  }
  e.textContent = t;
}
var Do = {
    animationIterationCount: !0,
    aspectRatio: !0,
    borderImageOutset: !0,
    borderImageSlice: !0,
    borderImageWidth: !0,
    boxFlex: !0,
    boxFlexGroup: !0,
    boxOrdinalGroup: !0,
    columnCount: !0,
    columns: !0,
    flex: !0,
    flexGrow: !0,
    flexPositive: !0,
    flexShrink: !0,
    flexNegative: !0,
    flexOrder: !0,
    gridArea: !0,
    gridRow: !0,
    gridRowEnd: !0,
    gridRowSpan: !0,
    gridRowStart: !0,
    gridColumn: !0,
    gridColumnEnd: !0,
    gridColumnSpan: !0,
    gridColumnStart: !0,
    fontWeight: !0,
    lineClamp: !0,
    lineHeight: !0,
    opacity: !0,
    order: !0,
    orphans: !0,
    tabSize: !0,
    widows: !0,
    zIndex: !0,
    zoom: !0,
    fillOpacity: !0,
    floodOpacity: !0,
    stopOpacity: !0,
    strokeDasharray: !0,
    strokeDashoffset: !0,
    strokeMiterlimit: !0,
    strokeOpacity: !0,
    strokeWidth: !0,
  },
  hy = ["Webkit", "ms", "Moz", "O"];
Object.keys(Do).forEach(function (e) {
  hy.forEach(function (t) {
    ((t = t + e.charAt(0).toUpperCase() + e.substring(1)), (Do[t] = Do[e]));
  });
});
function cm(e, t, n) {
  return t == null || typeof t == "boolean" || t === ""
    ? ""
    : n || typeof t != "number" || t === 0 || (Do.hasOwnProperty(e) && Do[e])
      ? ("" + t).trim()
      : t + "px";
}
function um(e, t) {
  e = e.style;
  for (var n in t)
    if (t.hasOwnProperty(n)) {
      var r = n.indexOf("--") === 0,
        o = cm(n, t[n], r);
      (n === "float" && (n = "cssFloat"), r ? e.setProperty(n, o) : (e[n] = o));
    }
}
var gy = ve(
  { menuitem: !0 },
  {
    area: !0,
    base: !0,
    br: !0,
    col: !0,
    embed: !0,
    hr: !0,
    img: !0,
    input: !0,
    keygen: !0,
    link: !0,
    meta: !0,
    param: !0,
    source: !0,
    track: !0,
    wbr: !0,
  },
);
function Ui(e, t) {
  if (t) {
    if (gy[e] && (t.children != null || t.dangerouslySetInnerHTML != null))
      throw Error(A(137, e));
    if (t.dangerouslySetInnerHTML != null) {
      if (t.children != null) throw Error(A(60));
      if (
        typeof t.dangerouslySetInnerHTML != "object" ||
        !("__html" in t.dangerouslySetInnerHTML)
      )
        throw Error(A(61));
    }
    if (t.style != null && typeof t.style != "object") throw Error(A(62));
  }
}
function Wi(e, t) {
  if (e.indexOf("-") === -1) return typeof t.is == "string";
  switch (e) {
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      return !1;
    default:
      return !0;
  }
}
var Vi = null;
function eu(e) {
  return (
    (e = e.target || e.srcElement || window),
    e.correspondingUseElement && (e = e.correspondingUseElement),
    e.nodeType === 3 ? e.parentNode : e
  );
}
var Hi = null,
  Tr = null,
  Dr = null;
function $d(e) {
  if ((e = ms(e))) {
    if (typeof Hi != "function") throw Error(A(280));
    var t = e.stateNode;
    t && ((t = ia(t)), Hi(e.stateNode, e.type, t));
  }
}
function dm(e) {
  Tr ? (Dr ? Dr.push(e) : (Dr = [e])) : (Tr = e);
}
function fm() {
  if (Tr) {
    var e = Tr,
      t = Dr;
    if (((Dr = Tr = null), $d(e), t)) for (e = 0; e < t.length; e++) $d(t[e]);
  }
}
function pm(e, t) {
  return e(t);
}
function mm() {}
var Ua = !1;
function hm(e, t, n) {
  if (Ua) return e(t, n);
  Ua = !0;
  try {
    return pm(e, t, n);
  } finally {
    ((Ua = !1), (Tr !== null || Dr !== null) && (mm(), fm()));
  }
}
function Ho(e, t) {
  var n = e.stateNode;
  if (n === null) return null;
  var r = ia(n);
  if (r === null) return null;
  n = r[t];
  e: switch (t) {
    case "onClick":
    case "onClickCapture":
    case "onDoubleClick":
    case "onDoubleClickCapture":
    case "onMouseDown":
    case "onMouseDownCapture":
    case "onMouseMove":
    case "onMouseMoveCapture":
    case "onMouseUp":
    case "onMouseUpCapture":
    case "onMouseEnter":
      ((r = !r.disabled) ||
        ((e = e.type),
        (r = !(
          e === "button" ||
          e === "input" ||
          e === "select" ||
          e === "textarea"
        ))),
        (e = !r));
      break e;
    default:
      e = !1;
  }
  if (e) return null;
  if (n && typeof n != "function") throw Error(A(231, t, typeof n));
  return n;
}
var Ki = !1;
if (ln)
  try {
    var ho = {};
    (Object.defineProperty(ho, "passive", {
      get: function () {
        Ki = !0;
      },
    }),
      window.addEventListener("test", ho, ho),
      window.removeEventListener("test", ho, ho));
  } catch {
    Ki = !1;
  }
function vy(e, t, n, r, o, s, a, i, c) {
  var u = Array.prototype.slice.call(arguments, 3);
  try {
    t.apply(n, u);
  } catch (d) {
    this.onError(d);
  }
}
var Oo = !1,
  Sl = null,
  kl = !1,
  Gi = null,
  xy = {
    onError: function (e) {
      ((Oo = !0), (Sl = e));
    },
  };
function yy(e, t, n, r, o, s, a, i, c) {
  ((Oo = !1), (Sl = null), vy.apply(xy, arguments));
}
function wy(e, t, n, r, o, s, a, i, c) {
  if ((yy.apply(this, arguments), Oo)) {
    if (Oo) {
      var u = Sl;
      ((Oo = !1), (Sl = null));
    } else throw Error(A(198));
    kl || ((kl = !0), (Gi = u));
  }
}
function fr(e) {
  var t = e,
    n = e;
  if (e.alternate) for (; t.return;) t = t.return;
  else {
    e = t;
    do ((t = e), t.flags & 4098 && (n = t.return), (e = t.return));
    while (e);
  }
  return t.tag === 3 ? n : null;
}
function gm(e) {
  if (e.tag === 13) {
    var t = e.memoizedState;
    if (
      (t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)),
      t !== null)
    )
      return t.dehydrated;
  }
  return null;
}
function zd(e) {
  if (fr(e) !== e) throw Error(A(188));
}
function by(e) {
  var t = e.alternate;
  if (!t) {
    if (((t = fr(e)), t === null)) throw Error(A(188));
    return t !== e ? null : e;
  }
  for (var n = e, r = t; ;) {
    var o = n.return;
    if (o === null) break;
    var s = o.alternate;
    if (s === null) {
      if (((r = o.return), r !== null)) {
        n = r;
        continue;
      }
      break;
    }
    if (o.child === s.child) {
      for (s = o.child; s;) {
        if (s === n) return (zd(o), e);
        if (s === r) return (zd(o), t);
        s = s.sibling;
      }
      throw Error(A(188));
    }
    if (n.return !== r.return) ((n = o), (r = s));
    else {
      for (var a = !1, i = o.child; i;) {
        if (i === n) {
          ((a = !0), (n = o), (r = s));
          break;
        }
        if (i === r) {
          ((a = !0), (r = o), (n = s));
          break;
        }
        i = i.sibling;
      }
      if (!a) {
        for (i = s.child; i;) {
          if (i === n) {
            ((a = !0), (n = s), (r = o));
            break;
          }
          if (i === r) {
            ((a = !0), (r = s), (n = o));
            break;
          }
          i = i.sibling;
        }
        if (!a) throw Error(A(189));
      }
    }
    if (n.alternate !== r) throw Error(A(190));
  }
  if (n.tag !== 3) throw Error(A(188));
  return n.stateNode.current === n ? e : t;
}
function vm(e) {
  return ((e = by(e)), e !== null ? xm(e) : null);
}
function xm(e) {
  if (e.tag === 5 || e.tag === 6) return e;
  for (e = e.child; e !== null;) {
    var t = xm(e);
    if (t !== null) return t;
    e = e.sibling;
  }
  return null;
}
var ym = ct.unstable_scheduleCallback,
  Fd = ct.unstable_cancelCallback,
  Sy = ct.unstable_shouldYield,
  ky = ct.unstable_requestPaint,
  we = ct.unstable_now,
  Ny = ct.unstable_getCurrentPriorityLevel,
  tu = ct.unstable_ImmediatePriority,
  wm = ct.unstable_UserBlockingPriority,
  Nl = ct.unstable_NormalPriority,
  Cy = ct.unstable_LowPriority,
  bm = ct.unstable_IdlePriority,
  oa = null,
  Kt = null;
function Ey(e) {
  if (Kt && typeof Kt.onCommitFiberRoot == "function")
    try {
      Kt.onCommitFiberRoot(oa, e, void 0, (e.current.flags & 128) === 128);
    } catch {}
}
var Mt = Math.clz32 ? Math.clz32 : _y,
  jy = Math.log,
  Ry = Math.LN2;
function _y(e) {
  return ((e >>>= 0), e === 0 ? 32 : (31 - ((jy(e) / Ry) | 0)) | 0);
}
var Ts = 64,
  Ds = 4194304;
function Mo(e) {
  switch (e & -e) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 4:
      return 4;
    case 8:
      return 8;
    case 16:
      return 16;
    case 32:
      return 32;
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return e & 4194240;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return e & 130023424;
    case 134217728:
      return 134217728;
    case 268435456:
      return 268435456;
    case 536870912:
      return 536870912;
    case 1073741824:
      return 1073741824;
    default:
      return e;
  }
}
function Cl(e, t) {
  var n = e.pendingLanes;
  if (n === 0) return 0;
  var r = 0,
    o = e.suspendedLanes,
    s = e.pingedLanes,
    a = n & 268435455;
  if (a !== 0) {
    var i = a & ~o;
    i !== 0 ? (r = Mo(i)) : ((s &= a), s !== 0 && (r = Mo(s)));
  } else ((a = n & ~o), a !== 0 ? (r = Mo(a)) : s !== 0 && (r = Mo(s)));
  if (r === 0) return 0;
  if (
    t !== 0 &&
    t !== r &&
    !(t & o) &&
    ((o = r & -r), (s = t & -t), o >= s || (o === 16 && (s & 4194240) !== 0))
  )
    return t;
  if ((r & 4 && (r |= n & 16), (t = e.entangledLanes), t !== 0))
    for (e = e.entanglements, t &= r; 0 < t;)
      ((n = 31 - Mt(t)), (o = 1 << n), (r |= e[n]), (t &= ~o));
  return r;
}
function Py(e, t) {
  switch (e) {
    case 1:
    case 2:
    case 4:
      return t + 250;
    case 8:
    case 16:
    case 32:
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return t + 5e3;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return -1;
    case 134217728:
    case 268435456:
    case 536870912:
    case 1073741824:
      return -1;
    default:
      return -1;
  }
}
function My(e, t) {
  for (
    var n = e.suspendedLanes,
      r = e.pingedLanes,
      o = e.expirationTimes,
      s = e.pendingLanes;
    0 < s;
  ) {
    var a = 31 - Mt(s),
      i = 1 << a,
      c = o[a];
    (c === -1
      ? (!(i & n) || i & r) && (o[a] = Py(i, t))
      : c <= t && (e.expiredLanes |= i),
      (s &= ~i));
  }
}
function Yi(e) {
  return (
    (e = e.pendingLanes & -1073741825),
    e !== 0 ? e : e & 1073741824 ? 1073741824 : 0
  );
}
function Sm() {
  var e = Ts;
  return ((Ts <<= 1), !(Ts & 4194240) && (Ts = 64), e);
}
function Wa(e) {
  for (var t = [], n = 0; 31 > n; n++) t.push(e);
  return t;
}
function fs(e, t, n) {
  ((e.pendingLanes |= t),
    t !== 536870912 && ((e.suspendedLanes = 0), (e.pingedLanes = 0)),
    (e = e.eventTimes),
    (t = 31 - Mt(t)),
    (e[t] = n));
}
function Ay(e, t) {
  var n = e.pendingLanes & ~t;
  ((e.pendingLanes = t),
    (e.suspendedLanes = 0),
    (e.pingedLanes = 0),
    (e.expiredLanes &= t),
    (e.mutableReadLanes &= t),
    (e.entangledLanes &= t),
    (t = e.entanglements));
  var r = e.eventTimes;
  for (e = e.expirationTimes; 0 < n;) {
    var o = 31 - Mt(n),
      s = 1 << o;
    ((t[o] = 0), (r[o] = -1), (e[o] = -1), (n &= ~s));
  }
}
function nu(e, t) {
  var n = (e.entangledLanes |= t);
  for (e = e.entanglements; n;) {
    var r = 31 - Mt(n),
      o = 1 << r;
    ((o & t) | (e[r] & t) && (e[r] |= t), (n &= ~o));
  }
}
var se = 0;
function km(e) {
  return (
    (e &= -e),
    1 < e ? (4 < e ? (e & 268435455 ? 16 : 536870912) : 4) : 1
  );
}
var Nm,
  ru,
  Cm,
  Em,
  jm,
  Xi = !1,
  Os = [],
  An = null,
  Tn = null,
  Dn = null,
  Ko = new Map(),
  Go = new Map(),
  jn = [],
  Ty =
    "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(
      " ",
    );
function Bd(e, t) {
  switch (e) {
    case "focusin":
    case "focusout":
      An = null;
      break;
    case "dragenter":
    case "dragleave":
      Tn = null;
      break;
    case "mouseover":
    case "mouseout":
      Dn = null;
      break;
    case "pointerover":
    case "pointerout":
      Ko.delete(t.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      Go.delete(t.pointerId);
  }
}
function go(e, t, n, r, o, s) {
  return e === null || e.nativeEvent !== s
    ? ((e = {
        blockedOn: t,
        domEventName: n,
        eventSystemFlags: r,
        nativeEvent: s,
        targetContainers: [o],
      }),
      t !== null && ((t = ms(t)), t !== null && ru(t)),
      e)
    : ((e.eventSystemFlags |= r),
      (t = e.targetContainers),
      o !== null && t.indexOf(o) === -1 && t.push(o),
      e);
}
function Dy(e, t, n, r, o) {
  switch (t) {
    case "focusin":
      return ((An = go(An, e, t, n, r, o)), !0);
    case "dragenter":
      return ((Tn = go(Tn, e, t, n, r, o)), !0);
    case "mouseover":
      return ((Dn = go(Dn, e, t, n, r, o)), !0);
    case "pointerover":
      var s = o.pointerId;
      return (Ko.set(s, go(Ko.get(s) || null, e, t, n, r, o)), !0);
    case "gotpointercapture":
      return (
        (s = o.pointerId),
        Go.set(s, go(Go.get(s) || null, e, t, n, r, o)),
        !0
      );
  }
  return !1;
}
function Rm(e) {
  var t = Zn(e.target);
  if (t !== null) {
    var n = fr(t);
    if (n !== null) {
      if (((t = n.tag), t === 13)) {
        if (((t = gm(n)), t !== null)) {
          ((e.blockedOn = t),
            jm(e.priority, function () {
              Cm(n);
            }));
          return;
        }
      } else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
        e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
        return;
      }
    }
  }
  e.blockedOn = null;
}
function al(e) {
  if (e.blockedOn !== null) return !1;
  for (var t = e.targetContainers; 0 < t.length;) {
    var n = Qi(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
    if (n === null) {
      n = e.nativeEvent;
      var r = new n.constructor(n.type, n);
      ((Vi = r), n.target.dispatchEvent(r), (Vi = null));
    } else return ((t = ms(n)), t !== null && ru(t), (e.blockedOn = n), !1);
    t.shift();
  }
  return !0;
}
function Ud(e, t, n) {
  al(e) && n.delete(t);
}
function Oy() {
  ((Xi = !1),
    An !== null && al(An) && (An = null),
    Tn !== null && al(Tn) && (Tn = null),
    Dn !== null && al(Dn) && (Dn = null),
    Ko.forEach(Ud),
    Go.forEach(Ud));
}
function vo(e, t) {
  e.blockedOn === t &&
    ((e.blockedOn = null),
    Xi ||
      ((Xi = !0),
      ct.unstable_scheduleCallback(ct.unstable_NormalPriority, Oy)));
}
function Yo(e) {
  function t(o) {
    return vo(o, e);
  }
  if (0 < Os.length) {
    vo(Os[0], e);
    for (var n = 1; n < Os.length; n++) {
      var r = Os[n];
      r.blockedOn === e && (r.blockedOn = null);
    }
  }
  for (
    An !== null && vo(An, e),
      Tn !== null && vo(Tn, e),
      Dn !== null && vo(Dn, e),
      Ko.forEach(t),
      Go.forEach(t),
      n = 0;
    n < jn.length;
    n++
  )
    ((r = jn[n]), r.blockedOn === e && (r.blockedOn = null));
  for (; 0 < jn.length && ((n = jn[0]), n.blockedOn === null);)
    (Rm(n), n.blockedOn === null && jn.shift());
}
var Or = pn.ReactCurrentBatchConfig,
  El = !0;
function Iy(e, t, n, r) {
  var o = se,
    s = Or.transition;
  Or.transition = null;
  try {
    ((se = 1), ou(e, t, n, r));
  } finally {
    ((se = o), (Or.transition = s));
  }
}
function Ly(e, t, n, r) {
  var o = se,
    s = Or.transition;
  Or.transition = null;
  try {
    ((se = 4), ou(e, t, n, r));
  } finally {
    ((se = o), (Or.transition = s));
  }
}
function ou(e, t, n, r) {
  if (El) {
    var o = Qi(e, t, n, r);
    if (o === null) (Za(e, t, r, jl, n), Bd(e, r));
    else if (Dy(o, e, t, n, r)) r.stopPropagation();
    else if ((Bd(e, r), t & 4 && -1 < Ty.indexOf(e))) {
      for (; o !== null;) {
        var s = ms(o);
        if (
          (s !== null && Nm(s),
          (s = Qi(e, t, n, r)),
          s === null && Za(e, t, r, jl, n),
          s === o)
        )
          break;
        o = s;
      }
      o !== null && r.stopPropagation();
    } else Za(e, t, r, null, n);
  }
}
var jl = null;
function Qi(e, t, n, r) {
  if (((jl = null), (e = eu(r)), (e = Zn(e)), e !== null))
    if (((t = fr(e)), t === null)) e = null;
    else if (((n = t.tag), n === 13)) {
      if (((e = gm(t)), e !== null)) return e;
      e = null;
    } else if (n === 3) {
      if (t.stateNode.current.memoizedState.isDehydrated)
        return t.tag === 3 ? t.stateNode.containerInfo : null;
      e = null;
    } else t !== e && (e = null);
  return ((jl = e), null);
}
function _m(e) {
  switch (e) {
    case "cancel":
    case "click":
    case "close":
    case "contextmenu":
    case "copy":
    case "cut":
    case "auxclick":
    case "dblclick":
    case "dragend":
    case "dragstart":
    case "drop":
    case "focusin":
    case "focusout":
    case "input":
    case "invalid":
    case "keydown":
    case "keypress":
    case "keyup":
    case "mousedown":
    case "mouseup":
    case "paste":
    case "pause":
    case "play":
    case "pointercancel":
    case "pointerdown":
    case "pointerup":
    case "ratechange":
    case "reset":
    case "resize":
    case "seeked":
    case "submit":
    case "touchcancel":
    case "touchend":
    case "touchstart":
    case "volumechange":
    case "change":
    case "selectionchange":
    case "textInput":
    case "compositionstart":
    case "compositionend":
    case "compositionupdate":
    case "beforeblur":
    case "afterblur":
    case "beforeinput":
    case "blur":
    case "fullscreenchange":
    case "focus":
    case "hashchange":
    case "popstate":
    case "select":
    case "selectstart":
      return 1;
    case "drag":
    case "dragenter":
    case "dragexit":
    case "dragleave":
    case "dragover":
    case "mousemove":
    case "mouseout":
    case "mouseover":
    case "pointermove":
    case "pointerout":
    case "pointerover":
    case "scroll":
    case "toggle":
    case "touchmove":
    case "wheel":
    case "mouseenter":
    case "mouseleave":
    case "pointerenter":
    case "pointerleave":
      return 4;
    case "message":
      switch (Ny()) {
        case tu:
          return 1;
        case wm:
          return 4;
        case Nl:
        case Cy:
          return 16;
        case bm:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var Pn = null,
  su = null,
  il = null;
function Pm() {
  if (il) return il;
  var e,
    t = su,
    n = t.length,
    r,
    o = "value" in Pn ? Pn.value : Pn.textContent,
    s = o.length;
  for (e = 0; e < n && t[e] === o[e]; e++);
  var a = n - e;
  for (r = 1; r <= a && t[n - r] === o[s - r]; r++);
  return (il = o.slice(e, 1 < r ? 1 - r : void 0));
}
function cl(e) {
  var t = e.keyCode;
  return (
    "charCode" in e
      ? ((e = e.charCode), e === 0 && t === 13 && (e = 13))
      : (e = t),
    e === 10 && (e = 13),
    32 <= e || e === 13 ? e : 0
  );
}
function Is() {
  return !0;
}
function Wd() {
  return !1;
}
function dt(e) {
  function t(n, r, o, s, a) {
    ((this._reactName = n),
      (this._targetInst = o),
      (this.type = r),
      (this.nativeEvent = s),
      (this.target = a),
      (this.currentTarget = null));
    for (var i in e)
      e.hasOwnProperty(i) && ((n = e[i]), (this[i] = n ? n(s) : s[i]));
    return (
      (this.isDefaultPrevented = (
        s.defaultPrevented != null ? s.defaultPrevented : s.returnValue === !1
      )
        ? Is
        : Wd),
      (this.isPropagationStopped = Wd),
      this
    );
  }
  return (
    ve(t.prototype, {
      preventDefault: function () {
        this.defaultPrevented = !0;
        var n = this.nativeEvent;
        n &&
          (n.preventDefault
            ? n.preventDefault()
            : typeof n.returnValue != "unknown" && (n.returnValue = !1),
          (this.isDefaultPrevented = Is));
      },
      stopPropagation: function () {
        var n = this.nativeEvent;
        n &&
          (n.stopPropagation
            ? n.stopPropagation()
            : typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0),
          (this.isPropagationStopped = Is));
      },
      persist: function () {},
      isPersistent: Is,
    }),
    t
  );
}
var to = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function (e) {
      return e.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0,
  },
  lu = dt(to),
  ps = ve({}, to, { view: 0, detail: 0 }),
  $y = dt(ps),
  Va,
  Ha,
  xo,
  sa = ve({}, ps, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: au,
    button: 0,
    buttons: 0,
    relatedTarget: function (e) {
      return e.relatedTarget === void 0
        ? e.fromElement === e.srcElement
          ? e.toElement
          : e.fromElement
        : e.relatedTarget;
    },
    movementX: function (e) {
      return "movementX" in e
        ? e.movementX
        : (e !== xo &&
            (xo && e.type === "mousemove"
              ? ((Va = e.screenX - xo.screenX), (Ha = e.screenY - xo.screenY))
              : (Ha = Va = 0),
            (xo = e)),
          Va);
    },
    movementY: function (e) {
      return "movementY" in e ? e.movementY : Ha;
    },
  }),
  Vd = dt(sa),
  zy = ve({}, sa, { dataTransfer: 0 }),
  Fy = dt(zy),
  By = ve({}, ps, { relatedTarget: 0 }),
  Ka = dt(By),
  Uy = ve({}, to, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }),
  Wy = dt(Uy),
  Vy = ve({}, to, {
    clipboardData: function (e) {
      return "clipboardData" in e ? e.clipboardData : window.clipboardData;
    },
  }),
  Hy = dt(Vy),
  Ky = ve({}, to, { data: 0 }),
  Hd = dt(Ky),
  Gy = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified",
  },
  Yy = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta",
  },
  Xy = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey",
  };
function Qy(e) {
  var t = this.nativeEvent;
  return t.getModifierState ? t.getModifierState(e) : (e = Xy[e]) ? !!t[e] : !1;
}
function au() {
  return Qy;
}
var qy = ve({}, ps, {
    key: function (e) {
      if (e.key) {
        var t = Gy[e.key] || e.key;
        if (t !== "Unidentified") return t;
      }
      return e.type === "keypress"
        ? ((e = cl(e)), e === 13 ? "Enter" : String.fromCharCode(e))
        : e.type === "keydown" || e.type === "keyup"
          ? Yy[e.keyCode] || "Unidentified"
          : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: au,
    charCode: function (e) {
      return e.type === "keypress" ? cl(e) : 0;
    },
    keyCode: function (e) {
      return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
    },
    which: function (e) {
      return e.type === "keypress"
        ? cl(e)
        : e.type === "keydown" || e.type === "keyup"
          ? e.keyCode
          : 0;
    },
  }),
  Jy = dt(qy),
  Zy = ve({}, sa, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0,
  }),
  Kd = dt(Zy),
  ew = ve({}, ps, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: au,
  }),
  tw = dt(ew),
  nw = ve({}, to, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }),
  rw = dt(nw),
  ow = ve({}, sa, {
    deltaX: function (e) {
      return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
    },
    deltaY: function (e) {
      return "deltaY" in e
        ? e.deltaY
        : "wheelDeltaY" in e
          ? -e.wheelDeltaY
          : "wheelDelta" in e
            ? -e.wheelDelta
            : 0;
    },
    deltaZ: 0,
    deltaMode: 0,
  }),
  sw = dt(ow),
  lw = [9, 13, 27, 32],
  iu = ln && "CompositionEvent" in window,
  Io = null;
ln && "documentMode" in document && (Io = document.documentMode);
var aw = ln && "TextEvent" in window && !Io,
  Mm = ln && (!iu || (Io && 8 < Io && 11 >= Io)),
  Gd = " ",
  Yd = !1;
function Am(e, t) {
  switch (e) {
    case "keyup":
      return lw.indexOf(t.keyCode) !== -1;
    case "keydown":
      return t.keyCode !== 229;
    case "keypress":
    case "mousedown":
    case "focusout":
      return !0;
    default:
      return !1;
  }
}
function Tm(e) {
  return ((e = e.detail), typeof e == "object" && "data" in e ? e.data : null);
}
var br = !1;
function iw(e, t) {
  switch (e) {
    case "compositionend":
      return Tm(t);
    case "keypress":
      return t.which !== 32 ? null : ((Yd = !0), Gd);
    case "textInput":
      return ((e = t.data), e === Gd && Yd ? null : e);
    default:
      return null;
  }
}
function cw(e, t) {
  if (br)
    return e === "compositionend" || (!iu && Am(e, t))
      ? ((e = Pm()), (il = su = Pn = null), (br = !1), e)
      : null;
  switch (e) {
    case "paste":
      return null;
    case "keypress":
      if (!(t.ctrlKey || t.altKey || t.metaKey) || (t.ctrlKey && t.altKey)) {
        if (t.char && 1 < t.char.length) return t.char;
        if (t.which) return String.fromCharCode(t.which);
      }
      return null;
    case "compositionend":
      return Mm && t.locale !== "ko" ? null : t.data;
    default:
      return null;
  }
}
var uw = {
  color: !0,
  date: !0,
  datetime: !0,
  "datetime-local": !0,
  email: !0,
  month: !0,
  number: !0,
  password: !0,
  range: !0,
  search: !0,
  tel: !0,
  text: !0,
  time: !0,
  url: !0,
  week: !0,
};
function Xd(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t === "input" ? !!uw[e.type] : t === "textarea";
}
function Dm(e, t, n, r) {
  (dm(r),
    (t = Rl(t, "onChange")),
    0 < t.length &&
      ((n = new lu("onChange", "change", null, n, r)),
      e.push({ event: n, listeners: t })));
}
var Lo = null,
  Xo = null;
function dw(e) {
  Hm(e, 0);
}
function la(e) {
  var t = Nr(e);
  if (om(t)) return e;
}
function fw(e, t) {
  if (e === "change") return t;
}
var Om = !1;
if (ln) {
  var Ga;
  if (ln) {
    var Ya = "oninput" in document;
    if (!Ya) {
      var Qd = document.createElement("div");
      (Qd.setAttribute("oninput", "return;"),
        (Ya = typeof Qd.oninput == "function"));
    }
    Ga = Ya;
  } else Ga = !1;
  Om = Ga && (!document.documentMode || 9 < document.documentMode);
}
function qd() {
  Lo && (Lo.detachEvent("onpropertychange", Im), (Xo = Lo = null));
}
function Im(e) {
  if (e.propertyName === "value" && la(Xo)) {
    var t = [];
    (Dm(t, Xo, e, eu(e)), hm(dw, t));
  }
}
function pw(e, t, n) {
  e === "focusin"
    ? (qd(), (Lo = t), (Xo = n), Lo.attachEvent("onpropertychange", Im))
    : e === "focusout" && qd();
}
function mw(e) {
  if (e === "selectionchange" || e === "keyup" || e === "keydown")
    return la(Xo);
}
function hw(e, t) {
  if (e === "click") return la(t);
}
function gw(e, t) {
  if (e === "input" || e === "change") return la(t);
}
function vw(e, t) {
  return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
}
var Dt = typeof Object.is == "function" ? Object.is : vw;
function Qo(e, t) {
  if (Dt(e, t)) return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null)
    return !1;
  var n = Object.keys(e),
    r = Object.keys(t);
  if (n.length !== r.length) return !1;
  for (r = 0; r < n.length; r++) {
    var o = n[r];
    if (!Ai.call(t, o) || !Dt(e[o], t[o])) return !1;
  }
  return !0;
}
function Jd(e) {
  for (; e && e.firstChild;) e = e.firstChild;
  return e;
}
function Zd(e, t) {
  var n = Jd(e);
  e = 0;
  for (var r; n;) {
    if (n.nodeType === 3) {
      if (((r = e + n.textContent.length), e <= t && r >= t))
        return { node: n, offset: t - e };
      e = r;
    }
    e: {
      for (; n;) {
        if (n.nextSibling) {
          n = n.nextSibling;
          break e;
        }
        n = n.parentNode;
      }
      n = void 0;
    }
    n = Jd(n);
  }
}
function Lm(e, t) {
  return e && t
    ? e === t
      ? !0
      : e && e.nodeType === 3
        ? !1
        : t && t.nodeType === 3
          ? Lm(e, t.parentNode)
          : "contains" in e
            ? e.contains(t)
            : e.compareDocumentPosition
              ? !!(e.compareDocumentPosition(t) & 16)
              : !1
    : !1;
}
function $m() {
  for (var e = window, t = bl(); t instanceof e.HTMLIFrameElement;) {
    try {
      var n = typeof t.contentWindow.location.href == "string";
    } catch {
      n = !1;
    }
    if (n) e = t.contentWindow;
    else break;
    t = bl(e.document);
  }
  return t;
}
function cu(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return (
    t &&
    ((t === "input" &&
      (e.type === "text" ||
        e.type === "search" ||
        e.type === "tel" ||
        e.type === "url" ||
        e.type === "password")) ||
      t === "textarea" ||
      e.contentEditable === "true")
  );
}
function xw(e) {
  var t = $m(),
    n = e.focusedElem,
    r = e.selectionRange;
  if (
    t !== n &&
    n &&
    n.ownerDocument &&
    Lm(n.ownerDocument.documentElement, n)
  ) {
    if (r !== null && cu(n)) {
      if (
        ((t = r.start),
        (e = r.end),
        e === void 0 && (e = t),
        "selectionStart" in n)
      )
        ((n.selectionStart = t),
          (n.selectionEnd = Math.min(e, n.value.length)));
      else if (
        ((e = ((t = n.ownerDocument || document) && t.defaultView) || window),
        e.getSelection)
      ) {
        e = e.getSelection();
        var o = n.textContent.length,
          s = Math.min(r.start, o);
        ((r = r.end === void 0 ? s : Math.min(r.end, o)),
          !e.extend && s > r && ((o = r), (r = s), (s = o)),
          (o = Zd(n, s)));
        var a = Zd(n, r);
        o &&
          a &&
          (e.rangeCount !== 1 ||
            e.anchorNode !== o.node ||
            e.anchorOffset !== o.offset ||
            e.focusNode !== a.node ||
            e.focusOffset !== a.offset) &&
          ((t = t.createRange()),
          t.setStart(o.node, o.offset),
          e.removeAllRanges(),
          s > r
            ? (e.addRange(t), e.extend(a.node, a.offset))
            : (t.setEnd(a.node, a.offset), e.addRange(t)));
      }
    }
    for (t = [], e = n; (e = e.parentNode);)
      e.nodeType === 1 &&
        t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
    for (typeof n.focus == "function" && n.focus(), n = 0; n < t.length; n++)
      ((e = t[n]),
        (e.element.scrollLeft = e.left),
        (e.element.scrollTop = e.top));
  }
}
var yw = ln && "documentMode" in document && 11 >= document.documentMode,
  Sr = null,
  qi = null,
  $o = null,
  Ji = !1;
function ef(e, t, n) {
  var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
  Ji ||
    Sr == null ||
    Sr !== bl(r) ||
    ((r = Sr),
    "selectionStart" in r && cu(r)
      ? (r = { start: r.selectionStart, end: r.selectionEnd })
      : ((r = (
          (r.ownerDocument && r.ownerDocument.defaultView) ||
          window
        ).getSelection()),
        (r = {
          anchorNode: r.anchorNode,
          anchorOffset: r.anchorOffset,
          focusNode: r.focusNode,
          focusOffset: r.focusOffset,
        })),
    ($o && Qo($o, r)) ||
      (($o = r),
      (r = Rl(qi, "onSelect")),
      0 < r.length &&
        ((t = new lu("onSelect", "select", null, t, n)),
        e.push({ event: t, listeners: r }),
        (t.target = Sr))));
}
function Ls(e, t) {
  var n = {};
  return (
    (n[e.toLowerCase()] = t.toLowerCase()),
    (n["Webkit" + e] = "webkit" + t),
    (n["Moz" + e] = "moz" + t),
    n
  );
}
var kr = {
    animationend: Ls("Animation", "AnimationEnd"),
    animationiteration: Ls("Animation", "AnimationIteration"),
    animationstart: Ls("Animation", "AnimationStart"),
    transitionend: Ls("Transition", "TransitionEnd"),
  },
  Xa = {},
  zm = {};
ln &&
  ((zm = document.createElement("div").style),
  "AnimationEvent" in window ||
    (delete kr.animationend.animation,
    delete kr.animationiteration.animation,
    delete kr.animationstart.animation),
  "TransitionEvent" in window || delete kr.transitionend.transition);
function aa(e) {
  if (Xa[e]) return Xa[e];
  if (!kr[e]) return e;
  var t = kr[e],
    n;
  for (n in t) if (t.hasOwnProperty(n) && n in zm) return (Xa[e] = t[n]);
  return e;
}
var Fm = aa("animationend"),
  Bm = aa("animationiteration"),
  Um = aa("animationstart"),
  Wm = aa("transitionend"),
  Vm = new Map(),
  tf =
    "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
      " ",
    );
function Hn(e, t) {
  (Vm.set(e, t), dr(t, [e]));
}
for (var Qa = 0; Qa < tf.length; Qa++) {
  var qa = tf[Qa],
    ww = qa.toLowerCase(),
    bw = qa[0].toUpperCase() + qa.slice(1);
  Hn(ww, "on" + bw);
}
Hn(Fm, "onAnimationEnd");
Hn(Bm, "onAnimationIteration");
Hn(Um, "onAnimationStart");
Hn("dblclick", "onDoubleClick");
Hn("focusin", "onFocus");
Hn("focusout", "onBlur");
Hn(Wm, "onTransitionEnd");
Ur("onMouseEnter", ["mouseout", "mouseover"]);
Ur("onMouseLeave", ["mouseout", "mouseover"]);
Ur("onPointerEnter", ["pointerout", "pointerover"]);
Ur("onPointerLeave", ["pointerout", "pointerover"]);
dr(
  "onChange",
  "change click focusin focusout input keydown keyup selectionchange".split(
    " ",
  ),
);
dr(
  "onSelect",
  "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
    " ",
  ),
);
dr("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
dr(
  "onCompositionEnd",
  "compositionend focusout keydown keypress keyup mousedown".split(" "),
);
dr(
  "onCompositionStart",
  "compositionstart focusout keydown keypress keyup mousedown".split(" "),
);
dr(
  "onCompositionUpdate",
  "compositionupdate focusout keydown keypress keyup mousedown".split(" "),
);
var Ao =
    "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
      " ",
    ),
  Sw = new Set("cancel close invalid load scroll toggle".split(" ").concat(Ao));
function nf(e, t, n) {
  var r = e.type || "unknown-event";
  ((e.currentTarget = n), wy(r, t, void 0, e), (e.currentTarget = null));
}
function Hm(e, t) {
  t = (t & 4) !== 0;
  for (var n = 0; n < e.length; n++) {
    var r = e[n],
      o = r.event;
    r = r.listeners;
    e: {
      var s = void 0;
      if (t)
        for (var a = r.length - 1; 0 <= a; a--) {
          var i = r[a],
            c = i.instance,
            u = i.currentTarget;
          if (((i = i.listener), c !== s && o.isPropagationStopped())) break e;
          (nf(o, i, u), (s = c));
        }
      else
        for (a = 0; a < r.length; a++) {
          if (
            ((i = r[a]),
            (c = i.instance),
            (u = i.currentTarget),
            (i = i.listener),
            c !== s && o.isPropagationStopped())
          )
            break e;
          (nf(o, i, u), (s = c));
        }
    }
  }
  if (kl) throw ((e = Gi), (kl = !1), (Gi = null), e);
}
function ue(e, t) {
  var n = t[rc];
  n === void 0 && (n = t[rc] = new Set());
  var r = e + "__bubble";
  n.has(r) || (Km(t, e, 2, !1), n.add(r));
}
function Ja(e, t, n) {
  var r = 0;
  (t && (r |= 4), Km(n, e, r, t));
}
var $s = "_reactListening" + Math.random().toString(36).slice(2);
function qo(e) {
  if (!e[$s]) {
    ((e[$s] = !0),
      Zp.forEach(function (n) {
        n !== "selectionchange" && (Sw.has(n) || Ja(n, !1, e), Ja(n, !0, e));
      }));
    var t = e.nodeType === 9 ? e : e.ownerDocument;
    t === null || t[$s] || ((t[$s] = !0), Ja("selectionchange", !1, t));
  }
}
function Km(e, t, n, r) {
  switch (_m(t)) {
    case 1:
      var o = Iy;
      break;
    case 4:
      o = Ly;
      break;
    default:
      o = ou;
  }
  ((n = o.bind(null, t, n, e)),
    (o = void 0),
    !Ki ||
      (t !== "touchstart" && t !== "touchmove" && t !== "wheel") ||
      (o = !0),
    r
      ? o !== void 0
        ? e.addEventListener(t, n, { capture: !0, passive: o })
        : e.addEventListener(t, n, !0)
      : o !== void 0
        ? e.addEventListener(t, n, { passive: o })
        : e.addEventListener(t, n, !1));
}
function Za(e, t, n, r, o) {
  var s = r;
  if (!(t & 1) && !(t & 2) && r !== null)
    e: for (;;) {
      if (r === null) return;
      var a = r.tag;
      if (a === 3 || a === 4) {
        var i = r.stateNode.containerInfo;
        if (i === o || (i.nodeType === 8 && i.parentNode === o)) break;
        if (a === 4)
          for (a = r.return; a !== null;) {
            var c = a.tag;
            if (
              (c === 3 || c === 4) &&
              ((c = a.stateNode.containerInfo),
              c === o || (c.nodeType === 8 && c.parentNode === o))
            )
              return;
            a = a.return;
          }
        for (; i !== null;) {
          if (((a = Zn(i)), a === null)) return;
          if (((c = a.tag), c === 5 || c === 6)) {
            r = s = a;
            continue e;
          }
          i = i.parentNode;
        }
      }
      r = r.return;
    }
  hm(function () {
    var u = s,
      d = eu(n),
      f = [];
    e: {
      var m = Vm.get(e);
      if (m !== void 0) {
        var y = lu,
          w = e;
        switch (e) {
          case "keypress":
            if (cl(n) === 0) break e;
          case "keydown":
          case "keyup":
            y = Jy;
            break;
          case "focusin":
            ((w = "focus"), (y = Ka));
            break;
          case "focusout":
            ((w = "blur"), (y = Ka));
            break;
          case "beforeblur":
          case "afterblur":
            y = Ka;
            break;
          case "click":
            if (n.button === 2) break e;
          case "auxclick":
          case "dblclick":
          case "mousedown":
          case "mousemove":
          case "mouseup":
          case "mouseout":
          case "mouseover":
          case "contextmenu":
            y = Vd;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            y = Fy;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            y = tw;
            break;
          case Fm:
          case Bm:
          case Um:
            y = Wy;
            break;
          case Wm:
            y = rw;
            break;
          case "scroll":
            y = $y;
            break;
          case "wheel":
            y = sw;
            break;
          case "copy":
          case "cut":
          case "paste":
            y = Hy;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            y = Kd;
        }
        var x = (t & 4) !== 0,
          k = !x && e === "scroll",
          h = x ? (m !== null ? m + "Capture" : null) : m;
        x = [];
        for (var g = u, v; g !== null;) {
          v = g;
          var b = v.stateNode;
          if (
            (v.tag === 5 &&
              b !== null &&
              ((v = b),
              h !== null && ((b = Ho(g, h)), b != null && x.push(Jo(g, b, v)))),
            k)
          )
            break;
          g = g.return;
        }
        0 < x.length &&
          ((m = new y(m, w, null, n, d)), f.push({ event: m, listeners: x }));
      }
    }
    if (!(t & 7)) {
      e: {
        if (
          ((m = e === "mouseover" || e === "pointerover"),
          (y = e === "mouseout" || e === "pointerout"),
          m &&
            n !== Vi &&
            (w = n.relatedTarget || n.fromElement) &&
            (Zn(w) || w[an]))
        )
          break e;
        if (
          (y || m) &&
          ((m =
            d.window === d
              ? d
              : (m = d.ownerDocument)
                ? m.defaultView || m.parentWindow
                : window),
          y
            ? ((w = n.relatedTarget || n.toElement),
              (y = u),
              (w = w ? Zn(w) : null),
              w !== null &&
                ((k = fr(w)), w !== k || (w.tag !== 5 && w.tag !== 6)) &&
                (w = null))
            : ((y = null), (w = u)),
          y !== w)
        ) {
          if (
            ((x = Vd),
            (b = "onMouseLeave"),
            (h = "onMouseEnter"),
            (g = "mouse"),
            (e === "pointerout" || e === "pointerover") &&
              ((x = Kd),
              (b = "onPointerLeave"),
              (h = "onPointerEnter"),
              (g = "pointer")),
            (k = y == null ? m : Nr(y)),
            (v = w == null ? m : Nr(w)),
            (m = new x(b, g + "leave", y, n, d)),
            (m.target = k),
            (m.relatedTarget = v),
            (b = null),
            Zn(d) === u &&
              ((x = new x(h, g + "enter", w, n, d)),
              (x.target = v),
              (x.relatedTarget = k),
              (b = x)),
            (k = b),
            y && w)
          )
            t: {
              for (x = y, h = w, g = 0, v = x; v; v = hr(v)) g++;
              for (v = 0, b = h; b; b = hr(b)) v++;
              for (; 0 < g - v;) ((x = hr(x)), g--);
              for (; 0 < v - g;) ((h = hr(h)), v--);
              for (; g--;) {
                if (x === h || (h !== null && x === h.alternate)) break t;
                ((x = hr(x)), (h = hr(h)));
              }
              x = null;
            }
          else x = null;
          (y !== null && rf(f, m, y, x, !1),
            w !== null && k !== null && rf(f, k, w, x, !0));
        }
      }
      e: {
        if (
          ((m = u ? Nr(u) : window),
          (y = m.nodeName && m.nodeName.toLowerCase()),
          y === "select" || (y === "input" && m.type === "file"))
        )
          var S = fw;
        else if (Xd(m))
          if (Om) S = gw;
          else {
            S = mw;
            var C = pw;
          }
        else
          (y = m.nodeName) &&
            y.toLowerCase() === "input" &&
            (m.type === "checkbox" || m.type === "radio") &&
            (S = hw);
        if (S && (S = S(e, u))) {
          Dm(f, S, n, d);
          break e;
        }
        (C && C(e, m, u),
          e === "focusout" &&
            (C = m._wrapperState) &&
            C.controlled &&
            m.type === "number" &&
            zi(m, "number", m.value));
      }
      switch (((C = u ? Nr(u) : window), e)) {
        case "focusin":
          (Xd(C) || C.contentEditable === "true") &&
            ((Sr = C), (qi = u), ($o = null));
          break;
        case "focusout":
          $o = qi = Sr = null;
          break;
        case "mousedown":
          Ji = !0;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          ((Ji = !1), ef(f, n, d));
          break;
        case "selectionchange":
          if (yw) break;
        case "keydown":
        case "keyup":
          ef(f, n, d);
      }
      var N;
      if (iu)
        e: {
          switch (e) {
            case "compositionstart":
              var E = "onCompositionStart";
              break e;
            case "compositionend":
              E = "onCompositionEnd";
              break e;
            case "compositionupdate":
              E = "onCompositionUpdate";
              break e;
          }
          E = void 0;
        }
      else
        br
          ? Am(e, n) && (E = "onCompositionEnd")
          : e === "keydown" && n.keyCode === 229 && (E = "onCompositionStart");
      (E &&
        (Mm &&
          n.locale !== "ko" &&
          (br || E !== "onCompositionStart"
            ? E === "onCompositionEnd" && br && (N = Pm())
            : ((Pn = d),
              (su = "value" in Pn ? Pn.value : Pn.textContent),
              (br = !0))),
        (C = Rl(u, E)),
        0 < C.length &&
          ((E = new Hd(E, e, null, n, d)),
          f.push({ event: E, listeners: C }),
          N ? (E.data = N) : ((N = Tm(n)), N !== null && (E.data = N)))),
        (N = aw ? iw(e, n) : cw(e, n)) &&
          ((u = Rl(u, "onBeforeInput")),
          0 < u.length &&
            ((d = new Hd("onBeforeInput", "beforeinput", null, n, d)),
            f.push({ event: d, listeners: u }),
            (d.data = N))));
    }
    Hm(f, t);
  });
}
function Jo(e, t, n) {
  return { instance: e, listener: t, currentTarget: n };
}
function Rl(e, t) {
  for (var n = t + "Capture", r = []; e !== null;) {
    var o = e,
      s = o.stateNode;
    (o.tag === 5 &&
      s !== null &&
      ((o = s),
      (s = Ho(e, n)),
      s != null && r.unshift(Jo(e, s, o)),
      (s = Ho(e, t)),
      s != null && r.push(Jo(e, s, o))),
      (e = e.return));
  }
  return r;
}
function hr(e) {
  if (e === null) return null;
  do e = e.return;
  while (e && e.tag !== 5);
  return e || null;
}
function rf(e, t, n, r, o) {
  for (var s = t._reactName, a = []; n !== null && n !== r;) {
    var i = n,
      c = i.alternate,
      u = i.stateNode;
    if (c !== null && c === r) break;
    (i.tag === 5 &&
      u !== null &&
      ((i = u),
      o
        ? ((c = Ho(n, s)), c != null && a.unshift(Jo(n, c, i)))
        : o || ((c = Ho(n, s)), c != null && a.push(Jo(n, c, i)))),
      (n = n.return));
  }
  a.length !== 0 && e.push({ event: t, listeners: a });
}
var kw = /\r\n?/g,
  Nw = /\u0000|\uFFFD/g;
function of(e) {
  return (typeof e == "string" ? e : "" + e)
    .replace(
      kw,
      `
`,
    )
    .replace(Nw, "");
}
function zs(e, t, n) {
  if (((t = of(t)), of(e) !== t && n)) throw Error(A(425));
}
function _l() {}
var Zi = null,
  ec = null;
function tc(e, t) {
  return (
    e === "textarea" ||
    e === "noscript" ||
    typeof t.children == "string" ||
    typeof t.children == "number" ||
    (typeof t.dangerouslySetInnerHTML == "object" &&
      t.dangerouslySetInnerHTML !== null &&
      t.dangerouslySetInnerHTML.__html != null)
  );
}
var nc = typeof setTimeout == "function" ? setTimeout : void 0,
  Cw = typeof clearTimeout == "function" ? clearTimeout : void 0,
  sf = typeof Promise == "function" ? Promise : void 0,
  Ew =
    typeof queueMicrotask == "function"
      ? queueMicrotask
      : typeof sf < "u"
        ? function (e) {
            return sf.resolve(null).then(e).catch(jw);
          }
        : nc;
function jw(e) {
  setTimeout(function () {
    throw e;
  });
}
function ei(e, t) {
  var n = t,
    r = 0;
  do {
    var o = n.nextSibling;
    if ((e.removeChild(n), o && o.nodeType === 8))
      if (((n = o.data), n === "/$")) {
        if (r === 0) {
          (e.removeChild(o), Yo(t));
          return;
        }
        r--;
      } else (n !== "$" && n !== "$?" && n !== "$!") || r++;
    n = o;
  } while (n);
  Yo(t);
}
function On(e) {
  for (; e != null; e = e.nextSibling) {
    var t = e.nodeType;
    if (t === 1 || t === 3) break;
    if (t === 8) {
      if (((t = e.data), t === "$" || t === "$!" || t === "$?")) break;
      if (t === "/$") return null;
    }
  }
  return e;
}
function lf(e) {
  e = e.previousSibling;
  for (var t = 0; e;) {
    if (e.nodeType === 8) {
      var n = e.data;
      if (n === "$" || n === "$!" || n === "$?") {
        if (t === 0) return e;
        t--;
      } else n === "/$" && t++;
    }
    e = e.previousSibling;
  }
  return null;
}
var no = Math.random().toString(36).slice(2),
  Wt = "__reactFiber$" + no,
  Zo = "__reactProps$" + no,
  an = "__reactContainer$" + no,
  rc = "__reactEvents$" + no,
  Rw = "__reactListeners$" + no,
  _w = "__reactHandles$" + no;
function Zn(e) {
  var t = e[Wt];
  if (t) return t;
  for (var n = e.parentNode; n;) {
    if ((t = n[an] || n[Wt])) {
      if (
        ((n = t.alternate),
        t.child !== null || (n !== null && n.child !== null))
      )
        for (e = lf(e); e !== null;) {
          if ((n = e[Wt])) return n;
          e = lf(e);
        }
      return t;
    }
    ((e = n), (n = e.parentNode));
  }
  return null;
}
function ms(e) {
  return (
    (e = e[Wt] || e[an]),
    !e || (e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3) ? null : e
  );
}
function Nr(e) {
  if (e.tag === 5 || e.tag === 6) return e.stateNode;
  throw Error(A(33));
}
function ia(e) {
  return e[Zo] || null;
}
var oc = [],
  Cr = -1;
function Kn(e) {
  return { current: e };
}
function de(e) {
  0 > Cr || ((e.current = oc[Cr]), (oc[Cr] = null), Cr--);
}
function ie(e, t) {
  (Cr++, (oc[Cr] = e.current), (e.current = t));
}
var Un = {},
  ze = Kn(Un),
  qe = Kn(!1),
  or = Un;
function Wr(e, t) {
  var n = e.type.contextTypes;
  if (!n) return Un;
  var r = e.stateNode;
  if (r && r.__reactInternalMemoizedUnmaskedChildContext === t)
    return r.__reactInternalMemoizedMaskedChildContext;
  var o = {},
    s;
  for (s in n) o[s] = t[s];
  return (
    r &&
      ((e = e.stateNode),
      (e.__reactInternalMemoizedUnmaskedChildContext = t),
      (e.__reactInternalMemoizedMaskedChildContext = o)),
    o
  );
}
function Je(e) {
  return ((e = e.childContextTypes), e != null);
}
function Pl() {
  (de(qe), de(ze));
}
function af(e, t, n) {
  if (ze.current !== Un) throw Error(A(168));
  (ie(ze, t), ie(qe, n));
}
function Gm(e, t, n) {
  var r = e.stateNode;
  if (((t = t.childContextTypes), typeof r.getChildContext != "function"))
    return n;
  r = r.getChildContext();
  for (var o in r) if (!(o in t)) throw Error(A(108, py(e) || "Unknown", o));
  return ve({}, n, r);
}
function Ml(e) {
  return (
    (e =
      ((e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext) || Un),
    (or = ze.current),
    ie(ze, e),
    ie(qe, qe.current),
    !0
  );
}
function cf(e, t, n) {
  var r = e.stateNode;
  if (!r) throw Error(A(169));
  (n
    ? ((e = Gm(e, t, or)),
      (r.__reactInternalMemoizedMergedChildContext = e),
      de(qe),
      de(ze),
      ie(ze, e))
    : de(qe),
    ie(qe, n));
}
var tn = null,
  ca = !1,
  ti = !1;
function Ym(e) {
  tn === null ? (tn = [e]) : tn.push(e);
}
function Pw(e) {
  ((ca = !0), Ym(e));
}
function Gn() {
  if (!ti && tn !== null) {
    ti = !0;
    var e = 0,
      t = se;
    try {
      var n = tn;
      for (se = 1; e < n.length; e++) {
        var r = n[e];
        do r = r(!0);
        while (r !== null);
      }
      ((tn = null), (ca = !1));
    } catch (o) {
      throw (tn !== null && (tn = tn.slice(e + 1)), ym(tu, Gn), o);
    } finally {
      ((se = t), (ti = !1));
    }
  }
  return null;
}
var Er = [],
  jr = 0,
  Al = null,
  Tl = 0,
  ft = [],
  pt = 0,
  sr = null,
  rn = 1,
  on = "";
function qn(e, t) {
  ((Er[jr++] = Tl), (Er[jr++] = Al), (Al = e), (Tl = t));
}
function Xm(e, t, n) {
  ((ft[pt++] = rn), (ft[pt++] = on), (ft[pt++] = sr), (sr = e));
  var r = rn;
  e = on;
  var o = 32 - Mt(r) - 1;
  ((r &= ~(1 << o)), (n += 1));
  var s = 32 - Mt(t) + o;
  if (30 < s) {
    var a = o - (o % 5);
    ((s = (r & ((1 << a) - 1)).toString(32)),
      (r >>= a),
      (o -= a),
      (rn = (1 << (32 - Mt(t) + o)) | (n << o) | r),
      (on = s + e));
  } else ((rn = (1 << s) | (n << o) | r), (on = e));
}
function uu(e) {
  e.return !== null && (qn(e, 1), Xm(e, 1, 0));
}
function du(e) {
  for (; e === Al;)
    ((Al = Er[--jr]), (Er[jr] = null), (Tl = Er[--jr]), (Er[jr] = null));
  for (; e === sr;)
    ((sr = ft[--pt]),
      (ft[pt] = null),
      (on = ft[--pt]),
      (ft[pt] = null),
      (rn = ft[--pt]),
      (ft[pt] = null));
}
var st = null,
  ot = null,
  fe = !1,
  Rt = null;
function Qm(e, t) {
  var n = mt(5, null, null, 0);
  ((n.elementType = "DELETED"),
    (n.stateNode = t),
    (n.return = e),
    (t = e.deletions),
    t === null ? ((e.deletions = [n]), (e.flags |= 16)) : t.push(n));
}
function uf(e, t) {
  switch (e.tag) {
    case 5:
      var n = e.type;
      return (
        (t =
          t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase()
            ? null
            : t),
        t !== null
          ? ((e.stateNode = t), (st = e), (ot = On(t.firstChild)), !0)
          : !1
      );
    case 6:
      return (
        (t = e.pendingProps === "" || t.nodeType !== 3 ? null : t),
        t !== null ? ((e.stateNode = t), (st = e), (ot = null), !0) : !1
      );
    case 13:
      return (
        (t = t.nodeType !== 8 ? null : t),
        t !== null
          ? ((n = sr !== null ? { id: rn, overflow: on } : null),
            (e.memoizedState = {
              dehydrated: t,
              treeContext: n,
              retryLane: 1073741824,
            }),
            (n = mt(18, null, null, 0)),
            (n.stateNode = t),
            (n.return = e),
            (e.child = n),
            (st = e),
            (ot = null),
            !0)
          : !1
      );
    default:
      return !1;
  }
}
function sc(e) {
  return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
}
function lc(e) {
  if (fe) {
    var t = ot;
    if (t) {
      var n = t;
      if (!uf(e, t)) {
        if (sc(e)) throw Error(A(418));
        t = On(n.nextSibling);
        var r = st;
        t && uf(e, t)
          ? Qm(r, n)
          : ((e.flags = (e.flags & -4097) | 2), (fe = !1), (st = e));
      }
    } else {
      if (sc(e)) throw Error(A(418));
      ((e.flags = (e.flags & -4097) | 2), (fe = !1), (st = e));
    }
  }
}
function df(e) {
  for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13;)
    e = e.return;
  st = e;
}
function Fs(e) {
  if (e !== st) return !1;
  if (!fe) return (df(e), (fe = !0), !1);
  var t;
  if (
    ((t = e.tag !== 3) &&
      !(t = e.tag !== 5) &&
      ((t = e.type),
      (t = t !== "head" && t !== "body" && !tc(e.type, e.memoizedProps))),
    t && (t = ot))
  ) {
    if (sc(e)) throw (qm(), Error(A(418)));
    for (; t;) (Qm(e, t), (t = On(t.nextSibling)));
  }
  if ((df(e), e.tag === 13)) {
    if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e))
      throw Error(A(317));
    e: {
      for (e = e.nextSibling, t = 0; e;) {
        if (e.nodeType === 8) {
          var n = e.data;
          if (n === "/$") {
            if (t === 0) {
              ot = On(e.nextSibling);
              break e;
            }
            t--;
          } else (n !== "$" && n !== "$!" && n !== "$?") || t++;
        }
        e = e.nextSibling;
      }
      ot = null;
    }
  } else ot = st ? On(e.stateNode.nextSibling) : null;
  return !0;
}
function qm() {
  for (var e = ot; e;) e = On(e.nextSibling);
}
function Vr() {
  ((ot = st = null), (fe = !1));
}
function fu(e) {
  Rt === null ? (Rt = [e]) : Rt.push(e);
}
var Mw = pn.ReactCurrentBatchConfig;
function yo(e, t, n) {
  if (
    ((e = n.ref), e !== null && typeof e != "function" && typeof e != "object")
  ) {
    if (n._owner) {
      if (((n = n._owner), n)) {
        if (n.tag !== 1) throw Error(A(309));
        var r = n.stateNode;
      }
      if (!r) throw Error(A(147, e));
      var o = r,
        s = "" + e;
      return t !== null &&
        t.ref !== null &&
        typeof t.ref == "function" &&
        t.ref._stringRef === s
        ? t.ref
        : ((t = function (a) {
            var i = o.refs;
            a === null ? delete i[s] : (i[s] = a);
          }),
          (t._stringRef = s),
          t);
    }
    if (typeof e != "string") throw Error(A(284));
    if (!n._owner) throw Error(A(290, e));
  }
  return e;
}
function Bs(e, t) {
  throw (
    (e = Object.prototype.toString.call(t)),
    Error(
      A(
        31,
        e === "[object Object]"
          ? "object with keys {" + Object.keys(t).join(", ") + "}"
          : e,
      ),
    )
  );
}
function ff(e) {
  var t = e._init;
  return t(e._payload);
}
function Jm(e) {
  function t(h, g) {
    if (e) {
      var v = h.deletions;
      v === null ? ((h.deletions = [g]), (h.flags |= 16)) : v.push(g);
    }
  }
  function n(h, g) {
    if (!e) return null;
    for (; g !== null;) (t(h, g), (g = g.sibling));
    return null;
  }
  function r(h, g) {
    for (h = new Map(); g !== null;)
      (g.key !== null ? h.set(g.key, g) : h.set(g.index, g), (g = g.sibling));
    return h;
  }
  function o(h, g) {
    return ((h = zn(h, g)), (h.index = 0), (h.sibling = null), h);
  }
  function s(h, g, v) {
    return (
      (h.index = v),
      e
        ? ((v = h.alternate),
          v !== null
            ? ((v = v.index), v < g ? ((h.flags |= 2), g) : v)
            : ((h.flags |= 2), g))
        : ((h.flags |= 1048576), g)
    );
  }
  function a(h) {
    return (e && h.alternate === null && (h.flags |= 2), h);
  }
  function i(h, g, v, b) {
    return g === null || g.tag !== 6
      ? ((g = ii(v, h.mode, b)), (g.return = h), g)
      : ((g = o(g, v)), (g.return = h), g);
  }
  function c(h, g, v, b) {
    var S = v.type;
    return S === wr
      ? d(h, g, v.props.children, b, v.key)
      : g !== null &&
          (g.elementType === S ||
            (typeof S == "object" &&
              S !== null &&
              S.$$typeof === Cn &&
              ff(S) === g.type))
        ? ((b = o(g, v.props)), (b.ref = yo(h, g, v)), (b.return = h), b)
        : ((b = gl(v.type, v.key, v.props, null, h.mode, b)),
          (b.ref = yo(h, g, v)),
          (b.return = h),
          b);
  }
  function u(h, g, v, b) {
    return g === null ||
      g.tag !== 4 ||
      g.stateNode.containerInfo !== v.containerInfo ||
      g.stateNode.implementation !== v.implementation
      ? ((g = ci(v, h.mode, b)), (g.return = h), g)
      : ((g = o(g, v.children || [])), (g.return = h), g);
  }
  function d(h, g, v, b, S) {
    return g === null || g.tag !== 7
      ? ((g = rr(v, h.mode, b, S)), (g.return = h), g)
      : ((g = o(g, v)), (g.return = h), g);
  }
  function f(h, g, v) {
    if ((typeof g == "string" && g !== "") || typeof g == "number")
      return ((g = ii("" + g, h.mode, v)), (g.return = h), g);
    if (typeof g == "object" && g !== null) {
      switch (g.$$typeof) {
        case Ps:
          return (
            (v = gl(g.type, g.key, g.props, null, h.mode, v)),
            (v.ref = yo(h, null, g)),
            (v.return = h),
            v
          );
        case yr:
          return ((g = ci(g, h.mode, v)), (g.return = h), g);
        case Cn:
          var b = g._init;
          return f(h, b(g._payload), v);
      }
      if (Po(g) || mo(g))
        return ((g = rr(g, h.mode, v, null)), (g.return = h), g);
      Bs(h, g);
    }
    return null;
  }
  function m(h, g, v, b) {
    var S = g !== null ? g.key : null;
    if ((typeof v == "string" && v !== "") || typeof v == "number")
      return S !== null ? null : i(h, g, "" + v, b);
    if (typeof v == "object" && v !== null) {
      switch (v.$$typeof) {
        case Ps:
          return v.key === S ? c(h, g, v, b) : null;
        case yr:
          return v.key === S ? u(h, g, v, b) : null;
        case Cn:
          return ((S = v._init), m(h, g, S(v._payload), b));
      }
      if (Po(v) || mo(v)) return S !== null ? null : d(h, g, v, b, null);
      Bs(h, v);
    }
    return null;
  }
  function y(h, g, v, b, S) {
    if ((typeof b == "string" && b !== "") || typeof b == "number")
      return ((h = h.get(v) || null), i(g, h, "" + b, S));
    if (typeof b == "object" && b !== null) {
      switch (b.$$typeof) {
        case Ps:
          return (
            (h = h.get(b.key === null ? v : b.key) || null),
            c(g, h, b, S)
          );
        case yr:
          return (
            (h = h.get(b.key === null ? v : b.key) || null),
            u(g, h, b, S)
          );
        case Cn:
          var C = b._init;
          return y(h, g, v, C(b._payload), S);
      }
      if (Po(b) || mo(b)) return ((h = h.get(v) || null), d(g, h, b, S, null));
      Bs(g, b);
    }
    return null;
  }
  function w(h, g, v, b) {
    for (
      var S = null, C = null, N = g, E = (g = 0), j = null;
      N !== null && E < v.length;
      E++
    ) {
      N.index > E ? ((j = N), (N = null)) : (j = N.sibling);
      var R = m(h, N, v[E], b);
      if (R === null) {
        N === null && (N = j);
        break;
      }
      (e && N && R.alternate === null && t(h, N),
        (g = s(R, g, E)),
        C === null ? (S = R) : (C.sibling = R),
        (C = R),
        (N = j));
    }
    if (E === v.length) return (n(h, N), fe && qn(h, E), S);
    if (N === null) {
      for (; E < v.length; E++)
        ((N = f(h, v[E], b)),
          N !== null &&
            ((g = s(N, g, E)),
            C === null ? (S = N) : (C.sibling = N),
            (C = N)));
      return (fe && qn(h, E), S);
    }
    for (N = r(h, N); E < v.length; E++)
      ((j = y(N, h, E, v[E], b)),
        j !== null &&
          (e && j.alternate !== null && N.delete(j.key === null ? E : j.key),
          (g = s(j, g, E)),
          C === null ? (S = j) : (C.sibling = j),
          (C = j)));
    return (
      e &&
        N.forEach(function (M) {
          return t(h, M);
        }),
      fe && qn(h, E),
      S
    );
  }
  function x(h, g, v, b) {
    var S = mo(v);
    if (typeof S != "function") throw Error(A(150));
    if (((v = S.call(v)), v == null)) throw Error(A(151));
    for (
      var C = (S = null), N = g, E = (g = 0), j = null, R = v.next();
      N !== null && !R.done;
      E++, R = v.next()
    ) {
      N.index > E ? ((j = N), (N = null)) : (j = N.sibling);
      var M = m(h, N, R.value, b);
      if (M === null) {
        N === null && (N = j);
        break;
      }
      (e && N && M.alternate === null && t(h, N),
        (g = s(M, g, E)),
        C === null ? (S = M) : (C.sibling = M),
        (C = M),
        (N = j));
    }
    if (R.done) return (n(h, N), fe && qn(h, E), S);
    if (N === null) {
      for (; !R.done; E++, R = v.next())
        ((R = f(h, R.value, b)),
          R !== null &&
            ((g = s(R, g, E)),
            C === null ? (S = R) : (C.sibling = R),
            (C = R)));
      return (fe && qn(h, E), S);
    }
    for (N = r(h, N); !R.done; E++, R = v.next())
      ((R = y(N, h, E, R.value, b)),
        R !== null &&
          (e && R.alternate !== null && N.delete(R.key === null ? E : R.key),
          (g = s(R, g, E)),
          C === null ? (S = R) : (C.sibling = R),
          (C = R)));
    return (
      e &&
        N.forEach(function (T) {
          return t(h, T);
        }),
      fe && qn(h, E),
      S
    );
  }
  function k(h, g, v, b) {
    if (
      (typeof v == "object" &&
        v !== null &&
        v.type === wr &&
        v.key === null &&
        (v = v.props.children),
      typeof v == "object" && v !== null)
    ) {
      switch (v.$$typeof) {
        case Ps:
          e: {
            for (var S = v.key, C = g; C !== null;) {
              if (C.key === S) {
                if (((S = v.type), S === wr)) {
                  if (C.tag === 7) {
                    (n(h, C.sibling),
                      (g = o(C, v.props.children)),
                      (g.return = h),
                      (h = g));
                    break e;
                  }
                } else if (
                  C.elementType === S ||
                  (typeof S == "object" &&
                    S !== null &&
                    S.$$typeof === Cn &&
                    ff(S) === C.type)
                ) {
                  (n(h, C.sibling),
                    (g = o(C, v.props)),
                    (g.ref = yo(h, C, v)),
                    (g.return = h),
                    (h = g));
                  break e;
                }
                n(h, C);
                break;
              } else t(h, C);
              C = C.sibling;
            }
            v.type === wr
              ? ((g = rr(v.props.children, h.mode, b, v.key)),
                (g.return = h),
                (h = g))
              : ((b = gl(v.type, v.key, v.props, null, h.mode, b)),
                (b.ref = yo(h, g, v)),
                (b.return = h),
                (h = b));
          }
          return a(h);
        case yr:
          e: {
            for (C = v.key; g !== null;) {
              if (g.key === C)
                if (
                  g.tag === 4 &&
                  g.stateNode.containerInfo === v.containerInfo &&
                  g.stateNode.implementation === v.implementation
                ) {
                  (n(h, g.sibling),
                    (g = o(g, v.children || [])),
                    (g.return = h),
                    (h = g));
                  break e;
                } else {
                  n(h, g);
                  break;
                }
              else t(h, g);
              g = g.sibling;
            }
            ((g = ci(v, h.mode, b)), (g.return = h), (h = g));
          }
          return a(h);
        case Cn:
          return ((C = v._init), k(h, g, C(v._payload), b));
      }
      if (Po(v)) return w(h, g, v, b);
      if (mo(v)) return x(h, g, v, b);
      Bs(h, v);
    }
    return (typeof v == "string" && v !== "") || typeof v == "number"
      ? ((v = "" + v),
        g !== null && g.tag === 6
          ? (n(h, g.sibling), (g = o(g, v)), (g.return = h), (h = g))
          : (n(h, g), (g = ii(v, h.mode, b)), (g.return = h), (h = g)),
        a(h))
      : n(h, g);
  }
  return k;
}
var Hr = Jm(!0),
  Zm = Jm(!1),
  Dl = Kn(null),
  Ol = null,
  Rr = null,
  pu = null;
function mu() {
  pu = Rr = Ol = null;
}
function hu(e) {
  var t = Dl.current;
  (de(Dl), (e._currentValue = t));
}
function ac(e, t, n) {
  for (; e !== null;) {
    var r = e.alternate;
    if (
      ((e.childLanes & t) !== t
        ? ((e.childLanes |= t), r !== null && (r.childLanes |= t))
        : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t),
      e === n)
    )
      break;
    e = e.return;
  }
}
function Ir(e, t) {
  ((Ol = e),
    (pu = Rr = null),
    (e = e.dependencies),
    e !== null &&
      e.firstContext !== null &&
      (e.lanes & t && (Qe = !0), (e.firstContext = null)));
}
function yt(e) {
  var t = e._currentValue;
  if (pu !== e)
    if (((e = { context: e, memoizedValue: t, next: null }), Rr === null)) {
      if (Ol === null) throw Error(A(308));
      ((Rr = e), (Ol.dependencies = { lanes: 0, firstContext: e }));
    } else Rr = Rr.next = e;
  return t;
}
var er = null;
function gu(e) {
  er === null ? (er = [e]) : er.push(e);
}
function eh(e, t, n, r) {
  var o = t.interleaved;
  return (
    o === null ? ((n.next = n), gu(t)) : ((n.next = o.next), (o.next = n)),
    (t.interleaved = n),
    cn(e, r)
  );
}
function cn(e, t) {
  e.lanes |= t;
  var n = e.alternate;
  for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null;)
    ((e.childLanes |= t),
      (n = e.alternate),
      n !== null && (n.childLanes |= t),
      (n = e),
      (e = e.return));
  return n.tag === 3 ? n.stateNode : null;
}
var En = !1;
function vu(e) {
  e.updateQueue = {
    baseState: e.memoizedState,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: { pending: null, interleaved: null, lanes: 0 },
    effects: null,
  };
}
function th(e, t) {
  ((e = e.updateQueue),
    t.updateQueue === e &&
      (t.updateQueue = {
        baseState: e.baseState,
        firstBaseUpdate: e.firstBaseUpdate,
        lastBaseUpdate: e.lastBaseUpdate,
        shared: e.shared,
        effects: e.effects,
      }));
}
function sn(e, t) {
  return {
    eventTime: e,
    lane: t,
    tag: 0,
    payload: null,
    callback: null,
    next: null,
  };
}
function In(e, t, n) {
  var r = e.updateQueue;
  if (r === null) return null;
  if (((r = r.shared), ne & 2)) {
    var o = r.pending;
    return (
      o === null ? (t.next = t) : ((t.next = o.next), (o.next = t)),
      (r.pending = t),
      cn(e, n)
    );
  }
  return (
    (o = r.interleaved),
    o === null ? ((t.next = t), gu(r)) : ((t.next = o.next), (o.next = t)),
    (r.interleaved = t),
    cn(e, n)
  );
}
function ul(e, t, n) {
  if (
    ((t = t.updateQueue), t !== null && ((t = t.shared), (n & 4194240) !== 0))
  ) {
    var r = t.lanes;
    ((r &= e.pendingLanes), (n |= r), (t.lanes = n), nu(e, n));
  }
}
function pf(e, t) {
  var n = e.updateQueue,
    r = e.alternate;
  if (r !== null && ((r = r.updateQueue), n === r)) {
    var o = null,
      s = null;
    if (((n = n.firstBaseUpdate), n !== null)) {
      do {
        var a = {
          eventTime: n.eventTime,
          lane: n.lane,
          tag: n.tag,
          payload: n.payload,
          callback: n.callback,
          next: null,
        };
        (s === null ? (o = s = a) : (s = s.next = a), (n = n.next));
      } while (n !== null);
      s === null ? (o = s = t) : (s = s.next = t);
    } else o = s = t;
    ((n = {
      baseState: r.baseState,
      firstBaseUpdate: o,
      lastBaseUpdate: s,
      shared: r.shared,
      effects: r.effects,
    }),
      (e.updateQueue = n));
    return;
  }
  ((e = n.lastBaseUpdate),
    e === null ? (n.firstBaseUpdate = t) : (e.next = t),
    (n.lastBaseUpdate = t));
}
function Il(e, t, n, r) {
  var o = e.updateQueue;
  En = !1;
  var s = o.firstBaseUpdate,
    a = o.lastBaseUpdate,
    i = o.shared.pending;
  if (i !== null) {
    o.shared.pending = null;
    var c = i,
      u = c.next;
    ((c.next = null), a === null ? (s = u) : (a.next = u), (a = c));
    var d = e.alternate;
    d !== null &&
      ((d = d.updateQueue),
      (i = d.lastBaseUpdate),
      i !== a &&
        (i === null ? (d.firstBaseUpdate = u) : (i.next = u),
        (d.lastBaseUpdate = c)));
  }
  if (s !== null) {
    var f = o.baseState;
    ((a = 0), (d = u = c = null), (i = s));
    do {
      var m = i.lane,
        y = i.eventTime;
      if ((r & m) === m) {
        d !== null &&
          (d = d.next =
            {
              eventTime: y,
              lane: 0,
              tag: i.tag,
              payload: i.payload,
              callback: i.callback,
              next: null,
            });
        e: {
          var w = e,
            x = i;
          switch (((m = t), (y = n), x.tag)) {
            case 1:
              if (((w = x.payload), typeof w == "function")) {
                f = w.call(y, f, m);
                break e;
              }
              f = w;
              break e;
            case 3:
              w.flags = (w.flags & -65537) | 128;
            case 0:
              if (
                ((w = x.payload),
                (m = typeof w == "function" ? w.call(y, f, m) : w),
                m == null)
              )
                break e;
              f = ve({}, f, m);
              break e;
            case 2:
              En = !0;
          }
        }
        i.callback !== null &&
          i.lane !== 0 &&
          ((e.flags |= 64),
          (m = o.effects),
          m === null ? (o.effects = [i]) : m.push(i));
      } else
        ((y = {
          eventTime: y,
          lane: m,
          tag: i.tag,
          payload: i.payload,
          callback: i.callback,
          next: null,
        }),
          d === null ? ((u = d = y), (c = f)) : (d = d.next = y),
          (a |= m));
      if (((i = i.next), i === null)) {
        if (((i = o.shared.pending), i === null)) break;
        ((m = i),
          (i = m.next),
          (m.next = null),
          (o.lastBaseUpdate = m),
          (o.shared.pending = null));
      }
    } while (!0);
    if (
      (d === null && (c = f),
      (o.baseState = c),
      (o.firstBaseUpdate = u),
      (o.lastBaseUpdate = d),
      (t = o.shared.interleaved),
      t !== null)
    ) {
      o = t;
      do ((a |= o.lane), (o = o.next));
      while (o !== t);
    } else s === null && (o.shared.lanes = 0);
    ((ar |= a), (e.lanes = a), (e.memoizedState = f));
  }
}
function mf(e, t, n) {
  if (((e = t.effects), (t.effects = null), e !== null))
    for (t = 0; t < e.length; t++) {
      var r = e[t],
        o = r.callback;
      if (o !== null) {
        if (((r.callback = null), (r = n), typeof o != "function"))
          throw Error(A(191, o));
        o.call(r);
      }
    }
}
var hs = {},
  Gt = Kn(hs),
  es = Kn(hs),
  ts = Kn(hs);
function tr(e) {
  if (e === hs) throw Error(A(174));
  return e;
}
function xu(e, t) {
  switch ((ie(ts, t), ie(es, e), ie(Gt, hs), (e = t.nodeType), e)) {
    case 9:
    case 11:
      t = (t = t.documentElement) ? t.namespaceURI : Bi(null, "");
      break;
    default:
      ((e = e === 8 ? t.parentNode : t),
        (t = e.namespaceURI || null),
        (e = e.tagName),
        (t = Bi(t, e)));
  }
  (de(Gt), ie(Gt, t));
}
function Kr() {
  (de(Gt), de(es), de(ts));
}
function nh(e) {
  tr(ts.current);
  var t = tr(Gt.current),
    n = Bi(t, e.type);
  t !== n && (ie(es, e), ie(Gt, n));
}
function yu(e) {
  es.current === e && (de(Gt), de(es));
}
var he = Kn(0);
function Ll(e) {
  for (var t = e; t !== null;) {
    if (t.tag === 13) {
      var n = t.memoizedState;
      if (
        n !== null &&
        ((n = n.dehydrated), n === null || n.data === "$?" || n.data === "$!")
      )
        return t;
    } else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
      if (t.flags & 128) return t;
    } else if (t.child !== null) {
      ((t.child.return = t), (t = t.child));
      continue;
    }
    if (t === e) break;
    for (; t.sibling === null;) {
      if (t.return === null || t.return === e) return null;
      t = t.return;
    }
    ((t.sibling.return = t.return), (t = t.sibling));
  }
  return null;
}
var ni = [];
function wu() {
  for (var e = 0; e < ni.length; e++)
    ni[e]._workInProgressVersionPrimary = null;
  ni.length = 0;
}
var dl = pn.ReactCurrentDispatcher,
  ri = pn.ReactCurrentBatchConfig,
  lr = 0,
  ge = null,
  Ee = null,
  _e = null,
  $l = !1,
  zo = !1,
  ns = 0,
  Aw = 0;
function Ie() {
  throw Error(A(321));
}
function bu(e, t) {
  if (t === null) return !1;
  for (var n = 0; n < t.length && n < e.length; n++)
    if (!Dt(e[n], t[n])) return !1;
  return !0;
}
function Su(e, t, n, r, o, s) {
  if (
    ((lr = s),
    (ge = t),
    (t.memoizedState = null),
    (t.updateQueue = null),
    (t.lanes = 0),
    (dl.current = e === null || e.memoizedState === null ? Iw : Lw),
    (e = n(r, o)),
    zo)
  ) {
    s = 0;
    do {
      if (((zo = !1), (ns = 0), 25 <= s)) throw Error(A(301));
      ((s += 1),
        (_e = Ee = null),
        (t.updateQueue = null),
        (dl.current = $w),
        (e = n(r, o)));
    } while (zo);
  }
  if (
    ((dl.current = zl),
    (t = Ee !== null && Ee.next !== null),
    (lr = 0),
    (_e = Ee = ge = null),
    ($l = !1),
    t)
  )
    throw Error(A(300));
  return e;
}
function ku() {
  var e = ns !== 0;
  return ((ns = 0), e);
}
function Ut() {
  var e = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null,
  };
  return (_e === null ? (ge.memoizedState = _e = e) : (_e = _e.next = e), _e);
}
function wt() {
  if (Ee === null) {
    var e = ge.alternate;
    e = e !== null ? e.memoizedState : null;
  } else e = Ee.next;
  var t = _e === null ? ge.memoizedState : _e.next;
  if (t !== null) ((_e = t), (Ee = e));
  else {
    if (e === null) throw Error(A(310));
    ((Ee = e),
      (e = {
        memoizedState: Ee.memoizedState,
        baseState: Ee.baseState,
        baseQueue: Ee.baseQueue,
        queue: Ee.queue,
        next: null,
      }),
      _e === null ? (ge.memoizedState = _e = e) : (_e = _e.next = e));
  }
  return _e;
}
function rs(e, t) {
  return typeof t == "function" ? t(e) : t;
}
function oi(e) {
  var t = wt(),
    n = t.queue;
  if (n === null) throw Error(A(311));
  n.lastRenderedReducer = e;
  var r = Ee,
    o = r.baseQueue,
    s = n.pending;
  if (s !== null) {
    if (o !== null) {
      var a = o.next;
      ((o.next = s.next), (s.next = a));
    }
    ((r.baseQueue = o = s), (n.pending = null));
  }
  if (o !== null) {
    ((s = o.next), (r = r.baseState));
    var i = (a = null),
      c = null,
      u = s;
    do {
      var d = u.lane;
      if ((lr & d) === d)
        (c !== null &&
          (c = c.next =
            {
              lane: 0,
              action: u.action,
              hasEagerState: u.hasEagerState,
              eagerState: u.eagerState,
              next: null,
            }),
          (r = u.hasEagerState ? u.eagerState : e(r, u.action)));
      else {
        var f = {
          lane: d,
          action: u.action,
          hasEagerState: u.hasEagerState,
          eagerState: u.eagerState,
          next: null,
        };
        (c === null ? ((i = c = f), (a = r)) : (c = c.next = f),
          (ge.lanes |= d),
          (ar |= d));
      }
      u = u.next;
    } while (u !== null && u !== s);
    (c === null ? (a = r) : (c.next = i),
      Dt(r, t.memoizedState) || (Qe = !0),
      (t.memoizedState = r),
      (t.baseState = a),
      (t.baseQueue = c),
      (n.lastRenderedState = r));
  }
  if (((e = n.interleaved), e !== null)) {
    o = e;
    do ((s = o.lane), (ge.lanes |= s), (ar |= s), (o = o.next));
    while (o !== e);
  } else o === null && (n.lanes = 0);
  return [t.memoizedState, n.dispatch];
}
function si(e) {
  var t = wt(),
    n = t.queue;
  if (n === null) throw Error(A(311));
  n.lastRenderedReducer = e;
  var r = n.dispatch,
    o = n.pending,
    s = t.memoizedState;
  if (o !== null) {
    n.pending = null;
    var a = (o = o.next);
    do ((s = e(s, a.action)), (a = a.next));
    while (a !== o);
    (Dt(s, t.memoizedState) || (Qe = !0),
      (t.memoizedState = s),
      t.baseQueue === null && (t.baseState = s),
      (n.lastRenderedState = s));
  }
  return [s, r];
}
function rh() {}
function oh(e, t) {
  var n = ge,
    r = wt(),
    o = t(),
    s = !Dt(r.memoizedState, o);
  if (
    (s && ((r.memoizedState = o), (Qe = !0)),
    (r = r.queue),
    Nu(ah.bind(null, n, r, e), [e]),
    r.getSnapshot !== t || s || (_e !== null && _e.memoizedState.tag & 1))
  ) {
    if (
      ((n.flags |= 2048),
      os(9, lh.bind(null, n, r, o, t), void 0, null),
      Me === null)
    )
      throw Error(A(349));
    lr & 30 || sh(n, t, o);
  }
  return o;
}
function sh(e, t, n) {
  ((e.flags |= 16384),
    (e = { getSnapshot: t, value: n }),
    (t = ge.updateQueue),
    t === null
      ? ((t = { lastEffect: null, stores: null }),
        (ge.updateQueue = t),
        (t.stores = [e]))
      : ((n = t.stores), n === null ? (t.stores = [e]) : n.push(e)));
}
function lh(e, t, n, r) {
  ((t.value = n), (t.getSnapshot = r), ih(t) && ch(e));
}
function ah(e, t, n) {
  return n(function () {
    ih(t) && ch(e);
  });
}
function ih(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !Dt(e, n);
  } catch {
    return !0;
  }
}
function ch(e) {
  var t = cn(e, 1);
  t !== null && At(t, e, 1, -1);
}
function hf(e) {
  var t = Ut();
  return (
    typeof e == "function" && (e = e()),
    (t.memoizedState = t.baseState = e),
    (e = {
      pending: null,
      interleaved: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: rs,
      lastRenderedState: e,
    }),
    (t.queue = e),
    (e = e.dispatch = Ow.bind(null, ge, e)),
    [t.memoizedState, e]
  );
}
function os(e, t, n, r) {
  return (
    (e = { tag: e, create: t, destroy: n, deps: r, next: null }),
    (t = ge.updateQueue),
    t === null
      ? ((t = { lastEffect: null, stores: null }),
        (ge.updateQueue = t),
        (t.lastEffect = e.next = e))
      : ((n = t.lastEffect),
        n === null
          ? (t.lastEffect = e.next = e)
          : ((r = n.next), (n.next = e), (e.next = r), (t.lastEffect = e))),
    e
  );
}
function uh() {
  return wt().memoizedState;
}
function fl(e, t, n, r) {
  var o = Ut();
  ((ge.flags |= e),
    (o.memoizedState = os(1 | t, n, void 0, r === void 0 ? null : r)));
}
function ua(e, t, n, r) {
  var o = wt();
  r = r === void 0 ? null : r;
  var s = void 0;
  if (Ee !== null) {
    var a = Ee.memoizedState;
    if (((s = a.destroy), r !== null && bu(r, a.deps))) {
      o.memoizedState = os(t, n, s, r);
      return;
    }
  }
  ((ge.flags |= e), (o.memoizedState = os(1 | t, n, s, r)));
}
function gf(e, t) {
  return fl(8390656, 8, e, t);
}
function Nu(e, t) {
  return ua(2048, 8, e, t);
}
function dh(e, t) {
  return ua(4, 2, e, t);
}
function fh(e, t) {
  return ua(4, 4, e, t);
}
function ph(e, t) {
  if (typeof t == "function")
    return (
      (e = e()),
      t(e),
      function () {
        t(null);
      }
    );
  if (t != null)
    return (
      (e = e()),
      (t.current = e),
      function () {
        t.current = null;
      }
    );
}
function mh(e, t, n) {
  return (
    (n = n != null ? n.concat([e]) : null),
    ua(4, 4, ph.bind(null, t, e), n)
  );
}
function Cu() {}
function hh(e, t) {
  var n = wt();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && bu(t, r[1])
    ? r[0]
    : ((n.memoizedState = [e, t]), e);
}
function gh(e, t) {
  var n = wt();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && bu(t, r[1])
    ? r[0]
    : ((e = e()), (n.memoizedState = [e, t]), e);
}
function vh(e, t, n) {
  return lr & 21
    ? (Dt(n, t) || ((n = Sm()), (ge.lanes |= n), (ar |= n), (e.baseState = !0)),
      t)
    : (e.baseState && ((e.baseState = !1), (Qe = !0)), (e.memoizedState = n));
}
function Tw(e, t) {
  var n = se;
  ((se = n !== 0 && 4 > n ? n : 4), e(!0));
  var r = ri.transition;
  ri.transition = {};
  try {
    (e(!1), t());
  } finally {
    ((se = n), (ri.transition = r));
  }
}
function xh() {
  return wt().memoizedState;
}
function Dw(e, t, n) {
  var r = $n(e);
  if (
    ((n = {
      lane: r,
      action: n,
      hasEagerState: !1,
      eagerState: null,
      next: null,
    }),
    yh(e))
  )
    wh(t, n);
  else if (((n = eh(e, t, n, r)), n !== null)) {
    var o = We();
    (At(n, e, r, o), bh(n, t, r));
  }
}
function Ow(e, t, n) {
  var r = $n(e),
    o = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
  if (yh(e)) wh(t, o);
  else {
    var s = e.alternate;
    if (
      e.lanes === 0 &&
      (s === null || s.lanes === 0) &&
      ((s = t.lastRenderedReducer), s !== null)
    )
      try {
        var a = t.lastRenderedState,
          i = s(a, n);
        if (((o.hasEagerState = !0), (o.eagerState = i), Dt(i, a))) {
          var c = t.interleaved;
          (c === null
            ? ((o.next = o), gu(t))
            : ((o.next = c.next), (c.next = o)),
            (t.interleaved = o));
          return;
        }
      } catch {
      } finally {
      }
    ((n = eh(e, t, o, r)),
      n !== null && ((o = We()), At(n, e, r, o), bh(n, t, r)));
  }
}
function yh(e) {
  var t = e.alternate;
  return e === ge || (t !== null && t === ge);
}
function wh(e, t) {
  zo = $l = !0;
  var n = e.pending;
  (n === null ? (t.next = t) : ((t.next = n.next), (n.next = t)),
    (e.pending = t));
}
function bh(e, t, n) {
  if (n & 4194240) {
    var r = t.lanes;
    ((r &= e.pendingLanes), (n |= r), (t.lanes = n), nu(e, n));
  }
}
var zl = {
    readContext: yt,
    useCallback: Ie,
    useContext: Ie,
    useEffect: Ie,
    useImperativeHandle: Ie,
    useInsertionEffect: Ie,
    useLayoutEffect: Ie,
    useMemo: Ie,
    useReducer: Ie,
    useRef: Ie,
    useState: Ie,
    useDebugValue: Ie,
    useDeferredValue: Ie,
    useTransition: Ie,
    useMutableSource: Ie,
    useSyncExternalStore: Ie,
    useId: Ie,
    unstable_isNewReconciler: !1,
  },
  Iw = {
    readContext: yt,
    useCallback: function (e, t) {
      return ((Ut().memoizedState = [e, t === void 0 ? null : t]), e);
    },
    useContext: yt,
    useEffect: gf,
    useImperativeHandle: function (e, t, n) {
      return (
        (n = n != null ? n.concat([e]) : null),
        fl(4194308, 4, ph.bind(null, t, e), n)
      );
    },
    useLayoutEffect: function (e, t) {
      return fl(4194308, 4, e, t);
    },
    useInsertionEffect: function (e, t) {
      return fl(4, 2, e, t);
    },
    useMemo: function (e, t) {
      var n = Ut();
      return (
        (t = t === void 0 ? null : t),
        (e = e()),
        (n.memoizedState = [e, t]),
        e
      );
    },
    useReducer: function (e, t, n) {
      var r = Ut();
      return (
        (t = n !== void 0 ? n(t) : t),
        (r.memoizedState = r.baseState = t),
        (e = {
          pending: null,
          interleaved: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: e,
          lastRenderedState: t,
        }),
        (r.queue = e),
        (e = e.dispatch = Dw.bind(null, ge, e)),
        [r.memoizedState, e]
      );
    },
    useRef: function (e) {
      var t = Ut();
      return ((e = { current: e }), (t.memoizedState = e));
    },
    useState: hf,
    useDebugValue: Cu,
    useDeferredValue: function (e) {
      return (Ut().memoizedState = e);
    },
    useTransition: function () {
      var e = hf(!1),
        t = e[0];
      return ((e = Tw.bind(null, e[1])), (Ut().memoizedState = e), [t, e]);
    },
    useMutableSource: function () {},
    useSyncExternalStore: function (e, t, n) {
      var r = ge,
        o = Ut();
      if (fe) {
        if (n === void 0) throw Error(A(407));
        n = n();
      } else {
        if (((n = t()), Me === null)) throw Error(A(349));
        lr & 30 || sh(r, t, n);
      }
      o.memoizedState = n;
      var s = { value: n, getSnapshot: t };
      return (
        (o.queue = s),
        gf(ah.bind(null, r, s, e), [e]),
        (r.flags |= 2048),
        os(9, lh.bind(null, r, s, n, t), void 0, null),
        n
      );
    },
    useId: function () {
      var e = Ut(),
        t = Me.identifierPrefix;
      if (fe) {
        var n = on,
          r = rn;
        ((n = (r & ~(1 << (32 - Mt(r) - 1))).toString(32) + n),
          (t = ":" + t + "R" + n),
          (n = ns++),
          0 < n && (t += "H" + n.toString(32)),
          (t += ":"));
      } else ((n = Aw++), (t = ":" + t + "r" + n.toString(32) + ":"));
      return (e.memoizedState = t);
    },
    unstable_isNewReconciler: !1,
  },
  Lw = {
    readContext: yt,
    useCallback: hh,
    useContext: yt,
    useEffect: Nu,
    useImperativeHandle: mh,
    useInsertionEffect: dh,
    useLayoutEffect: fh,
    useMemo: gh,
    useReducer: oi,
    useRef: uh,
    useState: function () {
      return oi(rs);
    },
    useDebugValue: Cu,
    useDeferredValue: function (e) {
      var t = wt();
      return vh(t, Ee.memoizedState, e);
    },
    useTransition: function () {
      var e = oi(rs)[0],
        t = wt().memoizedState;
      return [e, t];
    },
    useMutableSource: rh,
    useSyncExternalStore: oh,
    useId: xh,
    unstable_isNewReconciler: !1,
  },
  $w = {
    readContext: yt,
    useCallback: hh,
    useContext: yt,
    useEffect: Nu,
    useImperativeHandle: mh,
    useInsertionEffect: dh,
    useLayoutEffect: fh,
    useMemo: gh,
    useReducer: si,
    useRef: uh,
    useState: function () {
      return si(rs);
    },
    useDebugValue: Cu,
    useDeferredValue: function (e) {
      var t = wt();
      return Ee === null ? (t.memoizedState = e) : vh(t, Ee.memoizedState, e);
    },
    useTransition: function () {
      var e = si(rs)[0],
        t = wt().memoizedState;
      return [e, t];
    },
    useMutableSource: rh,
    useSyncExternalStore: oh,
    useId: xh,
    unstable_isNewReconciler: !1,
  };
function Et(e, t) {
  if (e && e.defaultProps) {
    ((t = ve({}, t)), (e = e.defaultProps));
    for (var n in e) t[n] === void 0 && (t[n] = e[n]);
    return t;
  }
  return t;
}
function ic(e, t, n, r) {
  ((t = e.memoizedState),
    (n = n(r, t)),
    (n = n == null ? t : ve({}, t, n)),
    (e.memoizedState = n),
    e.lanes === 0 && (e.updateQueue.baseState = n));
}
var da = {
  isMounted: function (e) {
    return (e = e._reactInternals) ? fr(e) === e : !1;
  },
  enqueueSetState: function (e, t, n) {
    e = e._reactInternals;
    var r = We(),
      o = $n(e),
      s = sn(r, o);
    ((s.payload = t),
      n != null && (s.callback = n),
      (t = In(e, s, o)),
      t !== null && (At(t, e, o, r), ul(t, e, o)));
  },
  enqueueReplaceState: function (e, t, n) {
    e = e._reactInternals;
    var r = We(),
      o = $n(e),
      s = sn(r, o);
    ((s.tag = 1),
      (s.payload = t),
      n != null && (s.callback = n),
      (t = In(e, s, o)),
      t !== null && (At(t, e, o, r), ul(t, e, o)));
  },
  enqueueForceUpdate: function (e, t) {
    e = e._reactInternals;
    var n = We(),
      r = $n(e),
      o = sn(n, r);
    ((o.tag = 2),
      t != null && (o.callback = t),
      (t = In(e, o, r)),
      t !== null && (At(t, e, r, n), ul(t, e, r)));
  },
};
function vf(e, t, n, r, o, s, a) {
  return (
    (e = e.stateNode),
    typeof e.shouldComponentUpdate == "function"
      ? e.shouldComponentUpdate(r, s, a)
      : t.prototype && t.prototype.isPureReactComponent
        ? !Qo(n, r) || !Qo(o, s)
        : !0
  );
}
function Sh(e, t, n) {
  var r = !1,
    o = Un,
    s = t.contextType;
  return (
    typeof s == "object" && s !== null
      ? (s = yt(s))
      : ((o = Je(t) ? or : ze.current),
        (r = t.contextTypes),
        (s = (r = r != null) ? Wr(e, o) : Un)),
    (t = new t(n, s)),
    (e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null),
    (t.updater = da),
    (e.stateNode = t),
    (t._reactInternals = e),
    r &&
      ((e = e.stateNode),
      (e.__reactInternalMemoizedUnmaskedChildContext = o),
      (e.__reactInternalMemoizedMaskedChildContext = s)),
    t
  );
}
function xf(e, t, n, r) {
  ((e = t.state),
    typeof t.componentWillReceiveProps == "function" &&
      t.componentWillReceiveProps(n, r),
    typeof t.UNSAFE_componentWillReceiveProps == "function" &&
      t.UNSAFE_componentWillReceiveProps(n, r),
    t.state !== e && da.enqueueReplaceState(t, t.state, null));
}
function cc(e, t, n, r) {
  var o = e.stateNode;
  ((o.props = n), (o.state = e.memoizedState), (o.refs = {}), vu(e));
  var s = t.contextType;
  (typeof s == "object" && s !== null
    ? (o.context = yt(s))
    : ((s = Je(t) ? or : ze.current), (o.context = Wr(e, s))),
    (o.state = e.memoizedState),
    (s = t.getDerivedStateFromProps),
    typeof s == "function" && (ic(e, t, s, n), (o.state = e.memoizedState)),
    typeof t.getDerivedStateFromProps == "function" ||
      typeof o.getSnapshotBeforeUpdate == "function" ||
      (typeof o.UNSAFE_componentWillMount != "function" &&
        typeof o.componentWillMount != "function") ||
      ((t = o.state),
      typeof o.componentWillMount == "function" && o.componentWillMount(),
      typeof o.UNSAFE_componentWillMount == "function" &&
        o.UNSAFE_componentWillMount(),
      t !== o.state && da.enqueueReplaceState(o, o.state, null),
      Il(e, n, o, r),
      (o.state = e.memoizedState)),
    typeof o.componentDidMount == "function" && (e.flags |= 4194308));
}
function Gr(e, t) {
  try {
    var n = "",
      r = t;
    do ((n += fy(r)), (r = r.return));
    while (r);
    var o = n;
  } catch (s) {
    o =
      `
Error generating stack: ` +
      s.message +
      `
` +
      s.stack;
  }
  return { value: e, source: t, stack: o, digest: null };
}
function li(e, t, n) {
  return { value: e, source: null, stack: n ?? null, digest: t ?? null };
}
function uc(e, t) {
  try {
    console.error(t.value);
  } catch (n) {
    setTimeout(function () {
      throw n;
    });
  }
}
var zw = typeof WeakMap == "function" ? WeakMap : Map;
function kh(e, t, n) {
  ((n = sn(-1, n)), (n.tag = 3), (n.payload = { element: null }));
  var r = t.value;
  return (
    (n.callback = function () {
      (Bl || ((Bl = !0), (wc = r)), uc(e, t));
    }),
    n
  );
}
function Nh(e, t, n) {
  ((n = sn(-1, n)), (n.tag = 3));
  var r = e.type.getDerivedStateFromError;
  if (typeof r == "function") {
    var o = t.value;
    ((n.payload = function () {
      return r(o);
    }),
      (n.callback = function () {
        uc(e, t);
      }));
  }
  var s = e.stateNode;
  return (
    s !== null &&
      typeof s.componentDidCatch == "function" &&
      (n.callback = function () {
        (uc(e, t),
          typeof r != "function" &&
            (Ln === null ? (Ln = new Set([this])) : Ln.add(this)));
        var a = t.stack;
        this.componentDidCatch(t.value, {
          componentStack: a !== null ? a : "",
        });
      }),
    n
  );
}
function yf(e, t, n) {
  var r = e.pingCache;
  if (r === null) {
    r = e.pingCache = new zw();
    var o = new Set();
    r.set(t, o);
  } else ((o = r.get(t)), o === void 0 && ((o = new Set()), r.set(t, o)));
  o.has(n) || (o.add(n), (e = Zw.bind(null, e, t, n)), t.then(e, e));
}
function wf(e) {
  do {
    var t;
    if (
      ((t = e.tag === 13) &&
        ((t = e.memoizedState), (t = t !== null ? t.dehydrated !== null : !0)),
      t)
    )
      return e;
    e = e.return;
  } while (e !== null);
  return null;
}
function bf(e, t, n, r, o) {
  return e.mode & 1
    ? ((e.flags |= 65536), (e.lanes = o), e)
    : (e === t
        ? (e.flags |= 65536)
        : ((e.flags |= 128),
          (n.flags |= 131072),
          (n.flags &= -52805),
          n.tag === 1 &&
            (n.alternate === null
              ? (n.tag = 17)
              : ((t = sn(-1, 1)), (t.tag = 2), In(n, t, 1))),
          (n.lanes |= 1)),
      e);
}
var Fw = pn.ReactCurrentOwner,
  Qe = !1;
function Ue(e, t, n, r) {
  t.child = e === null ? Zm(t, null, n, r) : Hr(t, e.child, n, r);
}
function Sf(e, t, n, r, o) {
  n = n.render;
  var s = t.ref;
  return (
    Ir(t, o),
    (r = Su(e, t, n, r, s, o)),
    (n = ku()),
    e !== null && !Qe
      ? ((t.updateQueue = e.updateQueue),
        (t.flags &= -2053),
        (e.lanes &= ~o),
        un(e, t, o))
      : (fe && n && uu(t), (t.flags |= 1), Ue(e, t, r, o), t.child)
  );
}
function kf(e, t, n, r, o) {
  if (e === null) {
    var s = n.type;
    return typeof s == "function" &&
      !Tu(s) &&
      s.defaultProps === void 0 &&
      n.compare === null &&
      n.defaultProps === void 0
      ? ((t.tag = 15), (t.type = s), Ch(e, t, s, r, o))
      : ((e = gl(n.type, null, r, t, t.mode, o)),
        (e.ref = t.ref),
        (e.return = t),
        (t.child = e));
  }
  if (((s = e.child), !(e.lanes & o))) {
    var a = s.memoizedProps;
    if (
      ((n = n.compare), (n = n !== null ? n : Qo), n(a, r) && e.ref === t.ref)
    )
      return un(e, t, o);
  }
  return (
    (t.flags |= 1),
    (e = zn(s, r)),
    (e.ref = t.ref),
    (e.return = t),
    (t.child = e)
  );
}
function Ch(e, t, n, r, o) {
  if (e !== null) {
    var s = e.memoizedProps;
    if (Qo(s, r) && e.ref === t.ref)
      if (((Qe = !1), (t.pendingProps = r = s), (e.lanes & o) !== 0))
        e.flags & 131072 && (Qe = !0);
      else return ((t.lanes = e.lanes), un(e, t, o));
  }
  return dc(e, t, n, r, o);
}
function Eh(e, t, n) {
  var r = t.pendingProps,
    o = r.children,
    s = e !== null ? e.memoizedState : null;
  if (r.mode === "hidden")
    if (!(t.mode & 1))
      ((t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }),
        ie(Pr, nt),
        (nt |= n));
    else {
      if (!(n & 1073741824))
        return (
          (e = s !== null ? s.baseLanes | n : n),
          (t.lanes = t.childLanes = 1073741824),
          (t.memoizedState = {
            baseLanes: e,
            cachePool: null,
            transitions: null,
          }),
          (t.updateQueue = null),
          ie(Pr, nt),
          (nt |= e),
          null
        );
      ((t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }),
        (r = s !== null ? s.baseLanes : n),
        ie(Pr, nt),
        (nt |= r));
    }
  else
    (s !== null ? ((r = s.baseLanes | n), (t.memoizedState = null)) : (r = n),
      ie(Pr, nt),
      (nt |= r));
  return (Ue(e, t, o, n), t.child);
}
function jh(e, t) {
  var n = t.ref;
  ((e === null && n !== null) || (e !== null && e.ref !== n)) &&
    ((t.flags |= 512), (t.flags |= 2097152));
}
function dc(e, t, n, r, o) {
  var s = Je(n) ? or : ze.current;
  return (
    (s = Wr(t, s)),
    Ir(t, o),
    (n = Su(e, t, n, r, s, o)),
    (r = ku()),
    e !== null && !Qe
      ? ((t.updateQueue = e.updateQueue),
        (t.flags &= -2053),
        (e.lanes &= ~o),
        un(e, t, o))
      : (fe && r && uu(t), (t.flags |= 1), Ue(e, t, n, o), t.child)
  );
}
function Nf(e, t, n, r, o) {
  if (Je(n)) {
    var s = !0;
    Ml(t);
  } else s = !1;
  if ((Ir(t, o), t.stateNode === null))
    (pl(e, t), Sh(t, n, r), cc(t, n, r, o), (r = !0));
  else if (e === null) {
    var a = t.stateNode,
      i = t.memoizedProps;
    a.props = i;
    var c = a.context,
      u = n.contextType;
    typeof u == "object" && u !== null
      ? (u = yt(u))
      : ((u = Je(n) ? or : ze.current), (u = Wr(t, u)));
    var d = n.getDerivedStateFromProps,
      f =
        typeof d == "function" ||
        typeof a.getSnapshotBeforeUpdate == "function";
    (f ||
      (typeof a.UNSAFE_componentWillReceiveProps != "function" &&
        typeof a.componentWillReceiveProps != "function") ||
      ((i !== r || c !== u) && xf(t, a, r, u)),
      (En = !1));
    var m = t.memoizedState;
    ((a.state = m),
      Il(t, r, a, o),
      (c = t.memoizedState),
      i !== r || m !== c || qe.current || En
        ? (typeof d == "function" && (ic(t, n, d, r), (c = t.memoizedState)),
          (i = En || vf(t, n, i, r, m, c, u))
            ? (f ||
                (typeof a.UNSAFE_componentWillMount != "function" &&
                  typeof a.componentWillMount != "function") ||
                (typeof a.componentWillMount == "function" &&
                  a.componentWillMount(),
                typeof a.UNSAFE_componentWillMount == "function" &&
                  a.UNSAFE_componentWillMount()),
              typeof a.componentDidMount == "function" && (t.flags |= 4194308))
            : (typeof a.componentDidMount == "function" && (t.flags |= 4194308),
              (t.memoizedProps = r),
              (t.memoizedState = c)),
          (a.props = r),
          (a.state = c),
          (a.context = u),
          (r = i))
        : (typeof a.componentDidMount == "function" && (t.flags |= 4194308),
          (r = !1)));
  } else {
    ((a = t.stateNode),
      th(e, t),
      (i = t.memoizedProps),
      (u = t.type === t.elementType ? i : Et(t.type, i)),
      (a.props = u),
      (f = t.pendingProps),
      (m = a.context),
      (c = n.contextType),
      typeof c == "object" && c !== null
        ? (c = yt(c))
        : ((c = Je(n) ? or : ze.current), (c = Wr(t, c))));
    var y = n.getDerivedStateFromProps;
    ((d =
      typeof y == "function" ||
      typeof a.getSnapshotBeforeUpdate == "function") ||
      (typeof a.UNSAFE_componentWillReceiveProps != "function" &&
        typeof a.componentWillReceiveProps != "function") ||
      ((i !== f || m !== c) && xf(t, a, r, c)),
      (En = !1),
      (m = t.memoizedState),
      (a.state = m),
      Il(t, r, a, o));
    var w = t.memoizedState;
    i !== f || m !== w || qe.current || En
      ? (typeof y == "function" && (ic(t, n, y, r), (w = t.memoizedState)),
        (u = En || vf(t, n, u, r, m, w, c) || !1)
          ? (d ||
              (typeof a.UNSAFE_componentWillUpdate != "function" &&
                typeof a.componentWillUpdate != "function") ||
              (typeof a.componentWillUpdate == "function" &&
                a.componentWillUpdate(r, w, c),
              typeof a.UNSAFE_componentWillUpdate == "function" &&
                a.UNSAFE_componentWillUpdate(r, w, c)),
            typeof a.componentDidUpdate == "function" && (t.flags |= 4),
            typeof a.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024))
          : (typeof a.componentDidUpdate != "function" ||
              (i === e.memoizedProps && m === e.memoizedState) ||
              (t.flags |= 4),
            typeof a.getSnapshotBeforeUpdate != "function" ||
              (i === e.memoizedProps && m === e.memoizedState) ||
              (t.flags |= 1024),
            (t.memoizedProps = r),
            (t.memoizedState = w)),
        (a.props = r),
        (a.state = w),
        (a.context = c),
        (r = u))
      : (typeof a.componentDidUpdate != "function" ||
          (i === e.memoizedProps && m === e.memoizedState) ||
          (t.flags |= 4),
        typeof a.getSnapshotBeforeUpdate != "function" ||
          (i === e.memoizedProps && m === e.memoizedState) ||
          (t.flags |= 1024),
        (r = !1));
  }
  return fc(e, t, n, r, s, o);
}
function fc(e, t, n, r, o, s) {
  jh(e, t);
  var a = (t.flags & 128) !== 0;
  if (!r && !a) return (o && cf(t, n, !1), un(e, t, s));
  ((r = t.stateNode), (Fw.current = t));
  var i =
    a && typeof n.getDerivedStateFromError != "function" ? null : r.render();
  return (
    (t.flags |= 1),
    e !== null && a
      ? ((t.child = Hr(t, e.child, null, s)), (t.child = Hr(t, null, i, s)))
      : Ue(e, t, i, s),
    (t.memoizedState = r.state),
    o && cf(t, n, !0),
    t.child
  );
}
function Rh(e) {
  var t = e.stateNode;
  (t.pendingContext
    ? af(e, t.pendingContext, t.pendingContext !== t.context)
    : t.context && af(e, t.context, !1),
    xu(e, t.containerInfo));
}
function Cf(e, t, n, r, o) {
  return (Vr(), fu(o), (t.flags |= 256), Ue(e, t, n, r), t.child);
}
var pc = { dehydrated: null, treeContext: null, retryLane: 0 };
function mc(e) {
  return { baseLanes: e, cachePool: null, transitions: null };
}
function _h(e, t, n) {
  var r = t.pendingProps,
    o = he.current,
    s = !1,
    a = (t.flags & 128) !== 0,
    i;
  if (
    ((i = a) ||
      (i = e !== null && e.memoizedState === null ? !1 : (o & 2) !== 0),
    i
      ? ((s = !0), (t.flags &= -129))
      : (e === null || e.memoizedState !== null) && (o |= 1),
    ie(he, o & 1),
    e === null)
  )
    return (
      lc(t),
      (e = t.memoizedState),
      e !== null && ((e = e.dehydrated), e !== null)
        ? (t.mode & 1
            ? e.data === "$!"
              ? (t.lanes = 8)
              : (t.lanes = 1073741824)
            : (t.lanes = 1),
          null)
        : ((a = r.children),
          (e = r.fallback),
          s
            ? ((r = t.mode),
              (s = t.child),
              (a = { mode: "hidden", children: a }),
              !(r & 1) && s !== null
                ? ((s.childLanes = 0), (s.pendingProps = a))
                : (s = ma(a, r, 0, null)),
              (e = rr(e, r, n, null)),
              (s.return = t),
              (e.return = t),
              (s.sibling = e),
              (t.child = s),
              (t.child.memoizedState = mc(n)),
              (t.memoizedState = pc),
              e)
            : Eu(t, a))
    );
  if (((o = e.memoizedState), o !== null && ((i = o.dehydrated), i !== null)))
    return Bw(e, t, a, r, i, o, n);
  if (s) {
    ((s = r.fallback), (a = t.mode), (o = e.child), (i = o.sibling));
    var c = { mode: "hidden", children: r.children };
    return (
      !(a & 1) && t.child !== o
        ? ((r = t.child),
          (r.childLanes = 0),
          (r.pendingProps = c),
          (t.deletions = null))
        : ((r = zn(o, c)), (r.subtreeFlags = o.subtreeFlags & 14680064)),
      i !== null ? (s = zn(i, s)) : ((s = rr(s, a, n, null)), (s.flags |= 2)),
      (s.return = t),
      (r.return = t),
      (r.sibling = s),
      (t.child = r),
      (r = s),
      (s = t.child),
      (a = e.child.memoizedState),
      (a =
        a === null
          ? mc(n)
          : {
              baseLanes: a.baseLanes | n,
              cachePool: null,
              transitions: a.transitions,
            }),
      (s.memoizedState = a),
      (s.childLanes = e.childLanes & ~n),
      (t.memoizedState = pc),
      r
    );
  }
  return (
    (s = e.child),
    (e = s.sibling),
    (r = zn(s, { mode: "visible", children: r.children })),
    !(t.mode & 1) && (r.lanes = n),
    (r.return = t),
    (r.sibling = null),
    e !== null &&
      ((n = t.deletions),
      n === null ? ((t.deletions = [e]), (t.flags |= 16)) : n.push(e)),
    (t.child = r),
    (t.memoizedState = null),
    r
  );
}
function Eu(e, t) {
  return (
    (t = ma({ mode: "visible", children: t }, e.mode, 0, null)),
    (t.return = e),
    (e.child = t)
  );
}
function Us(e, t, n, r) {
  return (
    r !== null && fu(r),
    Hr(t, e.child, null, n),
    (e = Eu(t, t.pendingProps.children)),
    (e.flags |= 2),
    (t.memoizedState = null),
    e
  );
}
function Bw(e, t, n, r, o, s, a) {
  if (n)
    return t.flags & 256
      ? ((t.flags &= -257), (r = li(Error(A(422)))), Us(e, t, a, r))
      : t.memoizedState !== null
        ? ((t.child = e.child), (t.flags |= 128), null)
        : ((s = r.fallback),
          (o = t.mode),
          (r = ma({ mode: "visible", children: r.children }, o, 0, null)),
          (s = rr(s, o, a, null)),
          (s.flags |= 2),
          (r.return = t),
          (s.return = t),
          (r.sibling = s),
          (t.child = r),
          t.mode & 1 && Hr(t, e.child, null, a),
          (t.child.memoizedState = mc(a)),
          (t.memoizedState = pc),
          s);
  if (!(t.mode & 1)) return Us(e, t, a, null);
  if (o.data === "$!") {
    if (((r = o.nextSibling && o.nextSibling.dataset), r)) var i = r.dgst;
    return (
      (r = i),
      (s = Error(A(419))),
      (r = li(s, r, void 0)),
      Us(e, t, a, r)
    );
  }
  if (((i = (a & e.childLanes) !== 0), Qe || i)) {
    if (((r = Me), r !== null)) {
      switch (a & -a) {
        case 4:
          o = 2;
          break;
        case 16:
          o = 8;
          break;
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
          o = 32;
          break;
        case 536870912:
          o = 268435456;
          break;
        default:
          o = 0;
      }
      ((o = o & (r.suspendedLanes | a) ? 0 : o),
        o !== 0 &&
          o !== s.retryLane &&
          ((s.retryLane = o), cn(e, o), At(r, e, o, -1)));
    }
    return (Au(), (r = li(Error(A(421)))), Us(e, t, a, r));
  }
  return o.data === "$?"
    ? ((t.flags |= 128),
      (t.child = e.child),
      (t = e1.bind(null, e)),
      (o._reactRetry = t),
      null)
    : ((e = s.treeContext),
      (ot = On(o.nextSibling)),
      (st = t),
      (fe = !0),
      (Rt = null),
      e !== null &&
        ((ft[pt++] = rn),
        (ft[pt++] = on),
        (ft[pt++] = sr),
        (rn = e.id),
        (on = e.overflow),
        (sr = t)),
      (t = Eu(t, r.children)),
      (t.flags |= 4096),
      t);
}
function Ef(e, t, n) {
  e.lanes |= t;
  var r = e.alternate;
  (r !== null && (r.lanes |= t), ac(e.return, t, n));
}
function ai(e, t, n, r, o) {
  var s = e.memoizedState;
  s === null
    ? (e.memoizedState = {
        isBackwards: t,
        rendering: null,
        renderingStartTime: 0,
        last: r,
        tail: n,
        tailMode: o,
      })
    : ((s.isBackwards = t),
      (s.rendering = null),
      (s.renderingStartTime = 0),
      (s.last = r),
      (s.tail = n),
      (s.tailMode = o));
}
function Ph(e, t, n) {
  var r = t.pendingProps,
    o = r.revealOrder,
    s = r.tail;
  if ((Ue(e, t, r.children, n), (r = he.current), r & 2))
    ((r = (r & 1) | 2), (t.flags |= 128));
  else {
    if (e !== null && e.flags & 128)
      e: for (e = t.child; e !== null;) {
        if (e.tag === 13) e.memoizedState !== null && Ef(e, n, t);
        else if (e.tag === 19) Ef(e, n, t);
        else if (e.child !== null) {
          ((e.child.return = e), (e = e.child));
          continue;
        }
        if (e === t) break e;
        for (; e.sibling === null;) {
          if (e.return === null || e.return === t) break e;
          e = e.return;
        }
        ((e.sibling.return = e.return), (e = e.sibling));
      }
    r &= 1;
  }
  if ((ie(he, r), !(t.mode & 1))) t.memoizedState = null;
  else
    switch (o) {
      case "forwards":
        for (n = t.child, o = null; n !== null;)
          ((e = n.alternate),
            e !== null && Ll(e) === null && (o = n),
            (n = n.sibling));
        ((n = o),
          n === null
            ? ((o = t.child), (t.child = null))
            : ((o = n.sibling), (n.sibling = null)),
          ai(t, !1, o, n, s));
        break;
      case "backwards":
        for (n = null, o = t.child, t.child = null; o !== null;) {
          if (((e = o.alternate), e !== null && Ll(e) === null)) {
            t.child = o;
            break;
          }
          ((e = o.sibling), (o.sibling = n), (n = o), (o = e));
        }
        ai(t, !0, n, null, s);
        break;
      case "together":
        ai(t, !1, null, null, void 0);
        break;
      default:
        t.memoizedState = null;
    }
  return t.child;
}
function pl(e, t) {
  !(t.mode & 1) &&
    e !== null &&
    ((e.alternate = null), (t.alternate = null), (t.flags |= 2));
}
function un(e, t, n) {
  if (
    (e !== null && (t.dependencies = e.dependencies),
    (ar |= t.lanes),
    !(n & t.childLanes))
  )
    return null;
  if (e !== null && t.child !== e.child) throw Error(A(153));
  if (t.child !== null) {
    for (
      e = t.child, n = zn(e, e.pendingProps), t.child = n, n.return = t;
      e.sibling !== null;
    )
      ((e = e.sibling),
        (n = n.sibling = zn(e, e.pendingProps)),
        (n.return = t));
    n.sibling = null;
  }
  return t.child;
}
function Uw(e, t, n) {
  switch (t.tag) {
    case 3:
      (Rh(t), Vr());
      break;
    case 5:
      nh(t);
      break;
    case 1:
      Je(t.type) && Ml(t);
      break;
    case 4:
      xu(t, t.stateNode.containerInfo);
      break;
    case 10:
      var r = t.type._context,
        o = t.memoizedProps.value;
      (ie(Dl, r._currentValue), (r._currentValue = o));
      break;
    case 13:
      if (((r = t.memoizedState), r !== null))
        return r.dehydrated !== null
          ? (ie(he, he.current & 1), (t.flags |= 128), null)
          : n & t.child.childLanes
            ? _h(e, t, n)
            : (ie(he, he.current & 1),
              (e = un(e, t, n)),
              e !== null ? e.sibling : null);
      ie(he, he.current & 1);
      break;
    case 19:
      if (((r = (n & t.childLanes) !== 0), e.flags & 128)) {
        if (r) return Ph(e, t, n);
        t.flags |= 128;
      }
      if (
        ((o = t.memoizedState),
        o !== null &&
          ((o.rendering = null), (o.tail = null), (o.lastEffect = null)),
        ie(he, he.current),
        r)
      )
        break;
      return null;
    case 22:
    case 23:
      return ((t.lanes = 0), Eh(e, t, n));
  }
  return un(e, t, n);
}
var Mh, hc, Ah, Th;
Mh = function (e, t) {
  for (var n = t.child; n !== null;) {
    if (n.tag === 5 || n.tag === 6) e.appendChild(n.stateNode);
    else if (n.tag !== 4 && n.child !== null) {
      ((n.child.return = n), (n = n.child));
      continue;
    }
    if (n === t) break;
    for (; n.sibling === null;) {
      if (n.return === null || n.return === t) return;
      n = n.return;
    }
    ((n.sibling.return = n.return), (n = n.sibling));
  }
};
hc = function () {};
Ah = function (e, t, n, r) {
  var o = e.memoizedProps;
  if (o !== r) {
    ((e = t.stateNode), tr(Gt.current));
    var s = null;
    switch (n) {
      case "input":
        ((o = Li(e, o)), (r = Li(e, r)), (s = []));
        break;
      case "select":
        ((o = ve({}, o, { value: void 0 })),
          (r = ve({}, r, { value: void 0 })),
          (s = []));
        break;
      case "textarea":
        ((o = Fi(e, o)), (r = Fi(e, r)), (s = []));
        break;
      default:
        typeof o.onClick != "function" &&
          typeof r.onClick == "function" &&
          (e.onclick = _l);
    }
    Ui(n, r);
    var a;
    n = null;
    for (u in o)
      if (!r.hasOwnProperty(u) && o.hasOwnProperty(u) && o[u] != null)
        if (u === "style") {
          var i = o[u];
          for (a in i) i.hasOwnProperty(a) && (n || (n = {}), (n[a] = ""));
        } else
          u !== "dangerouslySetInnerHTML" &&
            u !== "children" &&
            u !== "suppressContentEditableWarning" &&
            u !== "suppressHydrationWarning" &&
            u !== "autoFocus" &&
            (Wo.hasOwnProperty(u)
              ? s || (s = [])
              : (s = s || []).push(u, null));
    for (u in r) {
      var c = r[u];
      if (
        ((i = o != null ? o[u] : void 0),
        r.hasOwnProperty(u) && c !== i && (c != null || i != null))
      )
        if (u === "style")
          if (i) {
            for (a in i)
              !i.hasOwnProperty(a) ||
                (c && c.hasOwnProperty(a)) ||
                (n || (n = {}), (n[a] = ""));
            for (a in c)
              c.hasOwnProperty(a) &&
                i[a] !== c[a] &&
                (n || (n = {}), (n[a] = c[a]));
          } else (n || (s || (s = []), s.push(u, n)), (n = c));
        else
          u === "dangerouslySetInnerHTML"
            ? ((c = c ? c.__html : void 0),
              (i = i ? i.__html : void 0),
              c != null && i !== c && (s = s || []).push(u, c))
            : u === "children"
              ? (typeof c != "string" && typeof c != "number") ||
                (s = s || []).push(u, "" + c)
              : u !== "suppressContentEditableWarning" &&
                u !== "suppressHydrationWarning" &&
                (Wo.hasOwnProperty(u)
                  ? (c != null && u === "onScroll" && ue("scroll", e),
                    s || i === c || (s = []))
                  : (s = s || []).push(u, c));
    }
    n && (s = s || []).push("style", n);
    var u = s;
    (t.updateQueue = u) && (t.flags |= 4);
  }
};
Th = function (e, t, n, r) {
  n !== r && (t.flags |= 4);
};
function wo(e, t) {
  if (!fe)
    switch (e.tailMode) {
      case "hidden":
        t = e.tail;
        for (var n = null; t !== null;)
          (t.alternate !== null && (n = t), (t = t.sibling));
        n === null ? (e.tail = null) : (n.sibling = null);
        break;
      case "collapsed":
        n = e.tail;
        for (var r = null; n !== null;)
          (n.alternate !== null && (r = n), (n = n.sibling));
        r === null
          ? t || e.tail === null
            ? (e.tail = null)
            : (e.tail.sibling = null)
          : (r.sibling = null);
    }
}
function Le(e) {
  var t = e.alternate !== null && e.alternate.child === e.child,
    n = 0,
    r = 0;
  if (t)
    for (var o = e.child; o !== null;)
      ((n |= o.lanes | o.childLanes),
        (r |= o.subtreeFlags & 14680064),
        (r |= o.flags & 14680064),
        (o.return = e),
        (o = o.sibling));
  else
    for (o = e.child; o !== null;)
      ((n |= o.lanes | o.childLanes),
        (r |= o.subtreeFlags),
        (r |= o.flags),
        (o.return = e),
        (o = o.sibling));
  return ((e.subtreeFlags |= r), (e.childLanes = n), t);
}
function Ww(e, t, n) {
  var r = t.pendingProps;
  switch ((du(t), t.tag)) {
    case 2:
    case 16:
    case 15:
    case 0:
    case 11:
    case 7:
    case 8:
    case 12:
    case 9:
    case 14:
      return (Le(t), null);
    case 1:
      return (Je(t.type) && Pl(), Le(t), null);
    case 3:
      return (
        (r = t.stateNode),
        Kr(),
        de(qe),
        de(ze),
        wu(),
        r.pendingContext &&
          ((r.context = r.pendingContext), (r.pendingContext = null)),
        (e === null || e.child === null) &&
          (Fs(t)
            ? (t.flags |= 4)
            : e === null ||
              (e.memoizedState.isDehydrated && !(t.flags & 256)) ||
              ((t.flags |= 1024), Rt !== null && (kc(Rt), (Rt = null)))),
        hc(e, t),
        Le(t),
        null
      );
    case 5:
      yu(t);
      var o = tr(ts.current);
      if (((n = t.type), e !== null && t.stateNode != null))
        (Ah(e, t, n, r, o),
          e.ref !== t.ref && ((t.flags |= 512), (t.flags |= 2097152)));
      else {
        if (!r) {
          if (t.stateNode === null) throw Error(A(166));
          return (Le(t), null);
        }
        if (((e = tr(Gt.current)), Fs(t))) {
          ((r = t.stateNode), (n = t.type));
          var s = t.memoizedProps;
          switch (((r[Wt] = t), (r[Zo] = s), (e = (t.mode & 1) !== 0), n)) {
            case "dialog":
              (ue("cancel", r), ue("close", r));
              break;
            case "iframe":
            case "object":
            case "embed":
              ue("load", r);
              break;
            case "video":
            case "audio":
              for (o = 0; o < Ao.length; o++) ue(Ao[o], r);
              break;
            case "source":
              ue("error", r);
              break;
            case "img":
            case "image":
            case "link":
              (ue("error", r), ue("load", r));
              break;
            case "details":
              ue("toggle", r);
              break;
            case "input":
              (Dd(r, s), ue("invalid", r));
              break;
            case "select":
              ((r._wrapperState = { wasMultiple: !!s.multiple }),
                ue("invalid", r));
              break;
            case "textarea":
              (Id(r, s), ue("invalid", r));
          }
          (Ui(n, s), (o = null));
          for (var a in s)
            if (s.hasOwnProperty(a)) {
              var i = s[a];
              a === "children"
                ? typeof i == "string"
                  ? r.textContent !== i &&
                    (s.suppressHydrationWarning !== !0 &&
                      zs(r.textContent, i, e),
                    (o = ["children", i]))
                  : typeof i == "number" &&
                    r.textContent !== "" + i &&
                    (s.suppressHydrationWarning !== !0 &&
                      zs(r.textContent, i, e),
                    (o = ["children", "" + i]))
                : Wo.hasOwnProperty(a) &&
                  i != null &&
                  a === "onScroll" &&
                  ue("scroll", r);
            }
          switch (n) {
            case "input":
              (Ms(r), Od(r, s, !0));
              break;
            case "textarea":
              (Ms(r), Ld(r));
              break;
            case "select":
            case "option":
              break;
            default:
              typeof s.onClick == "function" && (r.onclick = _l);
          }
          ((r = o), (t.updateQueue = r), r !== null && (t.flags |= 4));
        } else {
          ((a = o.nodeType === 9 ? o : o.ownerDocument),
            e === "http://www.w3.org/1999/xhtml" && (e = am(n)),
            e === "http://www.w3.org/1999/xhtml"
              ? n === "script"
                ? ((e = a.createElement("div")),
                  (e.innerHTML = "<script><\/script>"),
                  (e = e.removeChild(e.firstChild)))
                : typeof r.is == "string"
                  ? (e = a.createElement(n, { is: r.is }))
                  : ((e = a.createElement(n)),
                    n === "select" &&
                      ((a = e),
                      r.multiple
                        ? (a.multiple = !0)
                        : r.size && (a.size = r.size)))
              : (e = a.createElementNS(e, n)),
            (e[Wt] = t),
            (e[Zo] = r),
            Mh(e, t, !1, !1),
            (t.stateNode = e));
          e: {
            switch (((a = Wi(n, r)), n)) {
              case "dialog":
                (ue("cancel", e), ue("close", e), (o = r));
                break;
              case "iframe":
              case "object":
              case "embed":
                (ue("load", e), (o = r));
                break;
              case "video":
              case "audio":
                for (o = 0; o < Ao.length; o++) ue(Ao[o], e);
                o = r;
                break;
              case "source":
                (ue("error", e), (o = r));
                break;
              case "img":
              case "image":
              case "link":
                (ue("error", e), ue("load", e), (o = r));
                break;
              case "details":
                (ue("toggle", e), (o = r));
                break;
              case "input":
                (Dd(e, r), (o = Li(e, r)), ue("invalid", e));
                break;
              case "option":
                o = r;
                break;
              case "select":
                ((e._wrapperState = { wasMultiple: !!r.multiple }),
                  (o = ve({}, r, { value: void 0 })),
                  ue("invalid", e));
                break;
              case "textarea":
                (Id(e, r), (o = Fi(e, r)), ue("invalid", e));
                break;
              default:
                o = r;
            }
            (Ui(n, o), (i = o));
            for (s in i)
              if (i.hasOwnProperty(s)) {
                var c = i[s];
                s === "style"
                  ? um(e, c)
                  : s === "dangerouslySetInnerHTML"
                    ? ((c = c ? c.__html : void 0), c != null && im(e, c))
                    : s === "children"
                      ? typeof c == "string"
                        ? (n !== "textarea" || c !== "") && Vo(e, c)
                        : typeof c == "number" && Vo(e, "" + c)
                      : s !== "suppressContentEditableWarning" &&
                        s !== "suppressHydrationWarning" &&
                        s !== "autoFocus" &&
                        (Wo.hasOwnProperty(s)
                          ? c != null && s === "onScroll" && ue("scroll", e)
                          : c != null && Qc(e, s, c, a));
              }
            switch (n) {
              case "input":
                (Ms(e), Od(e, r, !1));
                break;
              case "textarea":
                (Ms(e), Ld(e));
                break;
              case "option":
                r.value != null && e.setAttribute("value", "" + Bn(r.value));
                break;
              case "select":
                ((e.multiple = !!r.multiple),
                  (s = r.value),
                  s != null
                    ? Ar(e, !!r.multiple, s, !1)
                    : r.defaultValue != null &&
                      Ar(e, !!r.multiple, r.defaultValue, !0));
                break;
              default:
                typeof o.onClick == "function" && (e.onclick = _l);
            }
            switch (n) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                r = !!r.autoFocus;
                break e;
              case "img":
                r = !0;
                break e;
              default:
                r = !1;
            }
          }
          r && (t.flags |= 4);
        }
        t.ref !== null && ((t.flags |= 512), (t.flags |= 2097152));
      }
      return (Le(t), null);
    case 6:
      if (e && t.stateNode != null) Th(e, t, e.memoizedProps, r);
      else {
        if (typeof r != "string" && t.stateNode === null) throw Error(A(166));
        if (((n = tr(ts.current)), tr(Gt.current), Fs(t))) {
          if (
            ((r = t.stateNode),
            (n = t.memoizedProps),
            (r[Wt] = t),
            (s = r.nodeValue !== n) && ((e = st), e !== null))
          )
            switch (e.tag) {
              case 3:
                zs(r.nodeValue, n, (e.mode & 1) !== 0);
                break;
              case 5:
                e.memoizedProps.suppressHydrationWarning !== !0 &&
                  zs(r.nodeValue, n, (e.mode & 1) !== 0);
            }
          s && (t.flags |= 4);
        } else
          ((r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r)),
            (r[Wt] = t),
            (t.stateNode = r));
      }
      return (Le(t), null);
    case 13:
      if (
        (de(he),
        (r = t.memoizedState),
        e === null ||
          (e.memoizedState !== null && e.memoizedState.dehydrated !== null))
      ) {
        if (fe && ot !== null && t.mode & 1 && !(t.flags & 128))
          (qm(), Vr(), (t.flags |= 98560), (s = !1));
        else if (((s = Fs(t)), r !== null && r.dehydrated !== null)) {
          if (e === null) {
            if (!s) throw Error(A(318));
            if (
              ((s = t.memoizedState),
              (s = s !== null ? s.dehydrated : null),
              !s)
            )
              throw Error(A(317));
            s[Wt] = t;
          } else
            (Vr(),
              !(t.flags & 128) && (t.memoizedState = null),
              (t.flags |= 4));
          (Le(t), (s = !1));
        } else (Rt !== null && (kc(Rt), (Rt = null)), (s = !0));
        if (!s) return t.flags & 65536 ? t : null;
      }
      return t.flags & 128
        ? ((t.lanes = n), t)
        : ((r = r !== null),
          r !== (e !== null && e.memoizedState !== null) &&
            r &&
            ((t.child.flags |= 8192),
            t.mode & 1 &&
              (e === null || he.current & 1 ? je === 0 && (je = 3) : Au())),
          t.updateQueue !== null && (t.flags |= 4),
          Le(t),
          null);
    case 4:
      return (
        Kr(),
        hc(e, t),
        e === null && qo(t.stateNode.containerInfo),
        Le(t),
        null
      );
    case 10:
      return (hu(t.type._context), Le(t), null);
    case 17:
      return (Je(t.type) && Pl(), Le(t), null);
    case 19:
      if ((de(he), (s = t.memoizedState), s === null)) return (Le(t), null);
      if (((r = (t.flags & 128) !== 0), (a = s.rendering), a === null))
        if (r) wo(s, !1);
        else {
          if (je !== 0 || (e !== null && e.flags & 128))
            for (e = t.child; e !== null;) {
              if (((a = Ll(e)), a !== null)) {
                for (
                  t.flags |= 128,
                    wo(s, !1),
                    r = a.updateQueue,
                    r !== null && ((t.updateQueue = r), (t.flags |= 4)),
                    t.subtreeFlags = 0,
                    r = n,
                    n = t.child;
                  n !== null;
                )
                  ((s = n),
                    (e = r),
                    (s.flags &= 14680066),
                    (a = s.alternate),
                    a === null
                      ? ((s.childLanes = 0),
                        (s.lanes = e),
                        (s.child = null),
                        (s.subtreeFlags = 0),
                        (s.memoizedProps = null),
                        (s.memoizedState = null),
                        (s.updateQueue = null),
                        (s.dependencies = null),
                        (s.stateNode = null))
                      : ((s.childLanes = a.childLanes),
                        (s.lanes = a.lanes),
                        (s.child = a.child),
                        (s.subtreeFlags = 0),
                        (s.deletions = null),
                        (s.memoizedProps = a.memoizedProps),
                        (s.memoizedState = a.memoizedState),
                        (s.updateQueue = a.updateQueue),
                        (s.type = a.type),
                        (e = a.dependencies),
                        (s.dependencies =
                          e === null
                            ? null
                            : {
                                lanes: e.lanes,
                                firstContext: e.firstContext,
                              })),
                    (n = n.sibling));
                return (ie(he, (he.current & 1) | 2), t.child);
              }
              e = e.sibling;
            }
          s.tail !== null &&
            we() > Yr &&
            ((t.flags |= 128), (r = !0), wo(s, !1), (t.lanes = 4194304));
        }
      else {
        if (!r)
          if (((e = Ll(a)), e !== null)) {
            if (
              ((t.flags |= 128),
              (r = !0),
              (n = e.updateQueue),
              n !== null && ((t.updateQueue = n), (t.flags |= 4)),
              wo(s, !0),
              s.tail === null && s.tailMode === "hidden" && !a.alternate && !fe)
            )
              return (Le(t), null);
          } else
            2 * we() - s.renderingStartTime > Yr &&
              n !== 1073741824 &&
              ((t.flags |= 128), (r = !0), wo(s, !1), (t.lanes = 4194304));
        s.isBackwards
          ? ((a.sibling = t.child), (t.child = a))
          : ((n = s.last),
            n !== null ? (n.sibling = a) : (t.child = a),
            (s.last = a));
      }
      return s.tail !== null
        ? ((t = s.tail),
          (s.rendering = t),
          (s.tail = t.sibling),
          (s.renderingStartTime = we()),
          (t.sibling = null),
          (n = he.current),
          ie(he, r ? (n & 1) | 2 : n & 1),
          t)
        : (Le(t), null);
    case 22:
    case 23:
      return (
        Mu(),
        (r = t.memoizedState !== null),
        e !== null && (e.memoizedState !== null) !== r && (t.flags |= 8192),
        r && t.mode & 1
          ? nt & 1073741824 && (Le(t), t.subtreeFlags & 6 && (t.flags |= 8192))
          : Le(t),
        null
      );
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(A(156, t.tag));
}
function Vw(e, t) {
  switch ((du(t), t.tag)) {
    case 1:
      return (
        Je(t.type) && Pl(),
        (e = t.flags),
        e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
      );
    case 3:
      return (
        Kr(),
        de(qe),
        de(ze),
        wu(),
        (e = t.flags),
        e & 65536 && !(e & 128) ? ((t.flags = (e & -65537) | 128), t) : null
      );
    case 5:
      return (yu(t), null);
    case 13:
      if (
        (de(he), (e = t.memoizedState), e !== null && e.dehydrated !== null)
      ) {
        if (t.alternate === null) throw Error(A(340));
        Vr();
      }
      return (
        (e = t.flags),
        e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
      );
    case 19:
      return (de(he), null);
    case 4:
      return (Kr(), null);
    case 10:
      return (hu(t.type._context), null);
    case 22:
    case 23:
      return (Mu(), null);
    case 24:
      return null;
    default:
      return null;
  }
}
var Ws = !1,
  $e = !1,
  Hw = typeof WeakSet == "function" ? WeakSet : Set,
  z = null;
function _r(e, t) {
  var n = e.ref;
  if (n !== null)
    if (typeof n == "function")
      try {
        n(null);
      } catch (r) {
        xe(e, t, r);
      }
    else n.current = null;
}
function gc(e, t, n) {
  try {
    n();
  } catch (r) {
    xe(e, t, r);
  }
}
var jf = !1;
function Kw(e, t) {
  if (((Zi = El), (e = $m()), cu(e))) {
    if ("selectionStart" in e)
      var n = { start: e.selectionStart, end: e.selectionEnd };
    else
      e: {
        n = ((n = e.ownerDocument) && n.defaultView) || window;
        var r = n.getSelection && n.getSelection();
        if (r && r.rangeCount !== 0) {
          n = r.anchorNode;
          var o = r.anchorOffset,
            s = r.focusNode;
          r = r.focusOffset;
          try {
            (n.nodeType, s.nodeType);
          } catch {
            n = null;
            break e;
          }
          var a = 0,
            i = -1,
            c = -1,
            u = 0,
            d = 0,
            f = e,
            m = null;
          t: for (;;) {
            for (
              var y;
              f !== n || (o !== 0 && f.nodeType !== 3) || (i = a + o),
                f !== s || (r !== 0 && f.nodeType !== 3) || (c = a + r),
                f.nodeType === 3 && (a += f.nodeValue.length),
                (y = f.firstChild) !== null;
            )
              ((m = f), (f = y));
            for (;;) {
              if (f === e) break t;
              if (
                (m === n && ++u === o && (i = a),
                m === s && ++d === r && (c = a),
                (y = f.nextSibling) !== null)
              )
                break;
              ((f = m), (m = f.parentNode));
            }
            f = y;
          }
          n = i === -1 || c === -1 ? null : { start: i, end: c };
        } else n = null;
      }
    n = n || { start: 0, end: 0 };
  } else n = null;
  for (ec = { focusedElem: e, selectionRange: n }, El = !1, z = t; z !== null;)
    if (((t = z), (e = t.child), (t.subtreeFlags & 1028) !== 0 && e !== null))
      ((e.return = t), (z = e));
    else
      for (; z !== null;) {
        t = z;
        try {
          var w = t.alternate;
          if (t.flags & 1024)
            switch (t.tag) {
              case 0:
              case 11:
              case 15:
                break;
              case 1:
                if (w !== null) {
                  var x = w.memoizedProps,
                    k = w.memoizedState,
                    h = t.stateNode,
                    g = h.getSnapshotBeforeUpdate(
                      t.elementType === t.type ? x : Et(t.type, x),
                      k,
                    );
                  h.__reactInternalSnapshotBeforeUpdate = g;
                }
                break;
              case 3:
                var v = t.stateNode.containerInfo;
                v.nodeType === 1
                  ? (v.textContent = "")
                  : v.nodeType === 9 &&
                    v.documentElement &&
                    v.removeChild(v.documentElement);
                break;
              case 5:
              case 6:
              case 4:
              case 17:
                break;
              default:
                throw Error(A(163));
            }
        } catch (b) {
          xe(t, t.return, b);
        }
        if (((e = t.sibling), e !== null)) {
          ((e.return = t.return), (z = e));
          break;
        }
        z = t.return;
      }
  return ((w = jf), (jf = !1), w);
}
function Fo(e, t, n) {
  var r = t.updateQueue;
  if (((r = r !== null ? r.lastEffect : null), r !== null)) {
    var o = (r = r.next);
    do {
      if ((o.tag & e) === e) {
        var s = o.destroy;
        ((o.destroy = void 0), s !== void 0 && gc(t, n, s));
      }
      o = o.next;
    } while (o !== r);
  }
}
function fa(e, t) {
  if (
    ((t = t.updateQueue), (t = t !== null ? t.lastEffect : null), t !== null)
  ) {
    var n = (t = t.next);
    do {
      if ((n.tag & e) === e) {
        var r = n.create;
        n.destroy = r();
      }
      n = n.next;
    } while (n !== t);
  }
}
function vc(e) {
  var t = e.ref;
  if (t !== null) {
    var n = e.stateNode;
    switch (e.tag) {
      case 5:
        e = n;
        break;
      default:
        e = n;
    }
    typeof t == "function" ? t(e) : (t.current = e);
  }
}
function Dh(e) {
  var t = e.alternate;
  (t !== null && ((e.alternate = null), Dh(t)),
    (e.child = null),
    (e.deletions = null),
    (e.sibling = null),
    e.tag === 5 &&
      ((t = e.stateNode),
      t !== null &&
        (delete t[Wt], delete t[Zo], delete t[rc], delete t[Rw], delete t[_w])),
    (e.stateNode = null),
    (e.return = null),
    (e.dependencies = null),
    (e.memoizedProps = null),
    (e.memoizedState = null),
    (e.pendingProps = null),
    (e.stateNode = null),
    (e.updateQueue = null));
}
function Oh(e) {
  return e.tag === 5 || e.tag === 3 || e.tag === 4;
}
function Rf(e) {
  e: for (;;) {
    for (; e.sibling === null;) {
      if (e.return === null || Oh(e.return)) return null;
      e = e.return;
    }
    for (
      e.sibling.return = e.return, e = e.sibling;
      e.tag !== 5 && e.tag !== 6 && e.tag !== 18;
    ) {
      if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
      ((e.child.return = e), (e = e.child));
    }
    if (!(e.flags & 2)) return e.stateNode;
  }
}
function xc(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6)
    ((e = e.stateNode),
      t
        ? n.nodeType === 8
          ? n.parentNode.insertBefore(e, t)
          : n.insertBefore(e, t)
        : (n.nodeType === 8
            ? ((t = n.parentNode), t.insertBefore(e, n))
            : ((t = n), t.appendChild(e)),
          (n = n._reactRootContainer),
          n != null || t.onclick !== null || (t.onclick = _l)));
  else if (r !== 4 && ((e = e.child), e !== null))
    for (xc(e, t, n), e = e.sibling; e !== null;)
      (xc(e, t, n), (e = e.sibling));
}
function yc(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6)
    ((e = e.stateNode), t ? n.insertBefore(e, t) : n.appendChild(e));
  else if (r !== 4 && ((e = e.child), e !== null))
    for (yc(e, t, n), e = e.sibling; e !== null;)
      (yc(e, t, n), (e = e.sibling));
}
var Te = null,
  jt = !1;
function wn(e, t, n) {
  for (n = n.child; n !== null;) (Ih(e, t, n), (n = n.sibling));
}
function Ih(e, t, n) {
  if (Kt && typeof Kt.onCommitFiberUnmount == "function")
    try {
      Kt.onCommitFiberUnmount(oa, n);
    } catch {}
  switch (n.tag) {
    case 5:
      $e || _r(n, t);
    case 6:
      var r = Te,
        o = jt;
      ((Te = null),
        wn(e, t, n),
        (Te = r),
        (jt = o),
        Te !== null &&
          (jt
            ? ((e = Te),
              (n = n.stateNode),
              e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n))
            : Te.removeChild(n.stateNode)));
      break;
    case 18:
      Te !== null &&
        (jt
          ? ((e = Te),
            (n = n.stateNode),
            e.nodeType === 8
              ? ei(e.parentNode, n)
              : e.nodeType === 1 && ei(e, n),
            Yo(e))
          : ei(Te, n.stateNode));
      break;
    case 4:
      ((r = Te),
        (o = jt),
        (Te = n.stateNode.containerInfo),
        (jt = !0),
        wn(e, t, n),
        (Te = r),
        (jt = o));
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (
        !$e &&
        ((r = n.updateQueue), r !== null && ((r = r.lastEffect), r !== null))
      ) {
        o = r = r.next;
        do {
          var s = o,
            a = s.destroy;
          ((s = s.tag),
            a !== void 0 && (s & 2 || s & 4) && gc(n, t, a),
            (o = o.next));
        } while (o !== r);
      }
      wn(e, t, n);
      break;
    case 1:
      if (
        !$e &&
        (_r(n, t),
        (r = n.stateNode),
        typeof r.componentWillUnmount == "function")
      )
        try {
          ((r.props = n.memoizedProps),
            (r.state = n.memoizedState),
            r.componentWillUnmount());
        } catch (i) {
          xe(n, t, i);
        }
      wn(e, t, n);
      break;
    case 21:
      wn(e, t, n);
      break;
    case 22:
      n.mode & 1
        ? (($e = (r = $e) || n.memoizedState !== null), wn(e, t, n), ($e = r))
        : wn(e, t, n);
      break;
    default:
      wn(e, t, n);
  }
}
function _f(e) {
  var t = e.updateQueue;
  if (t !== null) {
    e.updateQueue = null;
    var n = e.stateNode;
    (n === null && (n = e.stateNode = new Hw()),
      t.forEach(function (r) {
        var o = t1.bind(null, e, r);
        n.has(r) || (n.add(r), r.then(o, o));
      }));
  }
}
function Ct(e, t) {
  var n = t.deletions;
  if (n !== null)
    for (var r = 0; r < n.length; r++) {
      var o = n[r];
      try {
        var s = e,
          a = t,
          i = a;
        e: for (; i !== null;) {
          switch (i.tag) {
            case 5:
              ((Te = i.stateNode), (jt = !1));
              break e;
            case 3:
              ((Te = i.stateNode.containerInfo), (jt = !0));
              break e;
            case 4:
              ((Te = i.stateNode.containerInfo), (jt = !0));
              break e;
          }
          i = i.return;
        }
        if (Te === null) throw Error(A(160));
        (Ih(s, a, o), (Te = null), (jt = !1));
        var c = o.alternate;
        (c !== null && (c.return = null), (o.return = null));
      } catch (u) {
        xe(o, t, u);
      }
    }
  if (t.subtreeFlags & 12854)
    for (t = t.child; t !== null;) (Lh(t, e), (t = t.sibling));
}
function Lh(e, t) {
  var n = e.alternate,
    r = e.flags;
  switch (e.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if ((Ct(t, e), zt(e), r & 4)) {
        try {
          (Fo(3, e, e.return), fa(3, e));
        } catch (x) {
          xe(e, e.return, x);
        }
        try {
          Fo(5, e, e.return);
        } catch (x) {
          xe(e, e.return, x);
        }
      }
      break;
    case 1:
      (Ct(t, e), zt(e), r & 512 && n !== null && _r(n, n.return));
      break;
    case 5:
      if (
        (Ct(t, e),
        zt(e),
        r & 512 && n !== null && _r(n, n.return),
        e.flags & 32)
      ) {
        var o = e.stateNode;
        try {
          Vo(o, "");
        } catch (x) {
          xe(e, e.return, x);
        }
      }
      if (r & 4 && ((o = e.stateNode), o != null)) {
        var s = e.memoizedProps,
          a = n !== null ? n.memoizedProps : s,
          i = e.type,
          c = e.updateQueue;
        if (((e.updateQueue = null), c !== null))
          try {
            (i === "input" && s.type === "radio" && s.name != null && sm(o, s),
              Wi(i, a));
            var u = Wi(i, s);
            for (a = 0; a < c.length; a += 2) {
              var d = c[a],
                f = c[a + 1];
              d === "style"
                ? um(o, f)
                : d === "dangerouslySetInnerHTML"
                  ? im(o, f)
                  : d === "children"
                    ? Vo(o, f)
                    : Qc(o, d, f, u);
            }
            switch (i) {
              case "input":
                $i(o, s);
                break;
              case "textarea":
                lm(o, s);
                break;
              case "select":
                var m = o._wrapperState.wasMultiple;
                o._wrapperState.wasMultiple = !!s.multiple;
                var y = s.value;
                y != null
                  ? Ar(o, !!s.multiple, y, !1)
                  : m !== !!s.multiple &&
                    (s.defaultValue != null
                      ? Ar(o, !!s.multiple, s.defaultValue, !0)
                      : Ar(o, !!s.multiple, s.multiple ? [] : "", !1));
            }
            o[Zo] = s;
          } catch (x) {
            xe(e, e.return, x);
          }
      }
      break;
    case 6:
      if ((Ct(t, e), zt(e), r & 4)) {
        if (e.stateNode === null) throw Error(A(162));
        ((o = e.stateNode), (s = e.memoizedProps));
        try {
          o.nodeValue = s;
        } catch (x) {
          xe(e, e.return, x);
        }
      }
      break;
    case 3:
      if (
        (Ct(t, e), zt(e), r & 4 && n !== null && n.memoizedState.isDehydrated)
      )
        try {
          Yo(t.containerInfo);
        } catch (x) {
          xe(e, e.return, x);
        }
      break;
    case 4:
      (Ct(t, e), zt(e));
      break;
    case 13:
      (Ct(t, e),
        zt(e),
        (o = e.child),
        o.flags & 8192 &&
          ((s = o.memoizedState !== null),
          (o.stateNode.isHidden = s),
          !s ||
            (o.alternate !== null && o.alternate.memoizedState !== null) ||
            (_u = we())),
        r & 4 && _f(e));
      break;
    case 22:
      if (
        ((d = n !== null && n.memoizedState !== null),
        e.mode & 1 ? (($e = (u = $e) || d), Ct(t, e), ($e = u)) : Ct(t, e),
        zt(e),
        r & 8192)
      ) {
        if (
          ((u = e.memoizedState !== null),
          (e.stateNode.isHidden = u) && !d && e.mode & 1)
        )
          for (z = e, d = e.child; d !== null;) {
            for (f = z = d; z !== null;) {
              switch (((m = z), (y = m.child), m.tag)) {
                case 0:
                case 11:
                case 14:
                case 15:
                  Fo(4, m, m.return);
                  break;
                case 1:
                  _r(m, m.return);
                  var w = m.stateNode;
                  if (typeof w.componentWillUnmount == "function") {
                    ((r = m), (n = m.return));
                    try {
                      ((t = r),
                        (w.props = t.memoizedProps),
                        (w.state = t.memoizedState),
                        w.componentWillUnmount());
                    } catch (x) {
                      xe(r, n, x);
                    }
                  }
                  break;
                case 5:
                  _r(m, m.return);
                  break;
                case 22:
                  if (m.memoizedState !== null) {
                    Mf(f);
                    continue;
                  }
              }
              y !== null ? ((y.return = m), (z = y)) : Mf(f);
            }
            d = d.sibling;
          }
        e: for (d = null, f = e; ;) {
          if (f.tag === 5) {
            if (d === null) {
              d = f;
              try {
                ((o = f.stateNode),
                  u
                    ? ((s = o.style),
                      typeof s.setProperty == "function"
                        ? s.setProperty("display", "none", "important")
                        : (s.display = "none"))
                    : ((i = f.stateNode),
                      (c = f.memoizedProps.style),
                      (a =
                        c != null && c.hasOwnProperty("display")
                          ? c.display
                          : null),
                      (i.style.display = cm("display", a))));
              } catch (x) {
                xe(e, e.return, x);
              }
            }
          } else if (f.tag === 6) {
            if (d === null)
              try {
                f.stateNode.nodeValue = u ? "" : f.memoizedProps;
              } catch (x) {
                xe(e, e.return, x);
              }
          } else if (
            ((f.tag !== 22 && f.tag !== 23) ||
              f.memoizedState === null ||
              f === e) &&
            f.child !== null
          ) {
            ((f.child.return = f), (f = f.child));
            continue;
          }
          if (f === e) break e;
          for (; f.sibling === null;) {
            if (f.return === null || f.return === e) break e;
            (d === f && (d = null), (f = f.return));
          }
          (d === f && (d = null),
            (f.sibling.return = f.return),
            (f = f.sibling));
        }
      }
      break;
    case 19:
      (Ct(t, e), zt(e), r & 4 && _f(e));
      break;
    case 21:
      break;
    default:
      (Ct(t, e), zt(e));
  }
}
function zt(e) {
  var t = e.flags;
  if (t & 2) {
    try {
      e: {
        for (var n = e.return; n !== null;) {
          if (Oh(n)) {
            var r = n;
            break e;
          }
          n = n.return;
        }
        throw Error(A(160));
      }
      switch (r.tag) {
        case 5:
          var o = r.stateNode;
          r.flags & 32 && (Vo(o, ""), (r.flags &= -33));
          var s = Rf(e);
          yc(e, s, o);
          break;
        case 3:
        case 4:
          var a = r.stateNode.containerInfo,
            i = Rf(e);
          xc(e, i, a);
          break;
        default:
          throw Error(A(161));
      }
    } catch (c) {
      xe(e, e.return, c);
    }
    e.flags &= -3;
  }
  t & 4096 && (e.flags &= -4097);
}
function Gw(e, t, n) {
  ((z = e), $h(e));
}
function $h(e, t, n) {
  for (var r = (e.mode & 1) !== 0; z !== null;) {
    var o = z,
      s = o.child;
    if (o.tag === 22 && r) {
      var a = o.memoizedState !== null || Ws;
      if (!a) {
        var i = o.alternate,
          c = (i !== null && i.memoizedState !== null) || $e;
        i = Ws;
        var u = $e;
        if (((Ws = a), ($e = c) && !u))
          for (z = o; z !== null;)
            ((a = z),
              (c = a.child),
              a.tag === 22 && a.memoizedState !== null
                ? Af(o)
                : c !== null
                  ? ((c.return = a), (z = c))
                  : Af(o));
        for (; s !== null;) ((z = s), $h(s), (s = s.sibling));
        ((z = o), (Ws = i), ($e = u));
      }
      Pf(e);
    } else
      o.subtreeFlags & 8772 && s !== null ? ((s.return = o), (z = s)) : Pf(e);
  }
}
function Pf(e) {
  for (; z !== null;) {
    var t = z;
    if (t.flags & 8772) {
      var n = t.alternate;
      try {
        if (t.flags & 8772)
          switch (t.tag) {
            case 0:
            case 11:
            case 15:
              $e || fa(5, t);
              break;
            case 1:
              var r = t.stateNode;
              if (t.flags & 4 && !$e)
                if (n === null) r.componentDidMount();
                else {
                  var o =
                    t.elementType === t.type
                      ? n.memoizedProps
                      : Et(t.type, n.memoizedProps);
                  r.componentDidUpdate(
                    o,
                    n.memoizedState,
                    r.__reactInternalSnapshotBeforeUpdate,
                  );
                }
              var s = t.updateQueue;
              s !== null && mf(t, s, r);
              break;
            case 3:
              var a = t.updateQueue;
              if (a !== null) {
                if (((n = null), t.child !== null))
                  switch (t.child.tag) {
                    case 5:
                      n = t.child.stateNode;
                      break;
                    case 1:
                      n = t.child.stateNode;
                  }
                mf(t, a, n);
              }
              break;
            case 5:
              var i = t.stateNode;
              if (n === null && t.flags & 4) {
                n = i;
                var c = t.memoizedProps;
                switch (t.type) {
                  case "button":
                  case "input":
                  case "select":
                  case "textarea":
                    c.autoFocus && n.focus();
                    break;
                  case "img":
                    c.src && (n.src = c.src);
                }
              }
              break;
            case 6:
              break;
            case 4:
              break;
            case 12:
              break;
            case 13:
              if (t.memoizedState === null) {
                var u = t.alternate;
                if (u !== null) {
                  var d = u.memoizedState;
                  if (d !== null) {
                    var f = d.dehydrated;
                    f !== null && Yo(f);
                  }
                }
              }
              break;
            case 19:
            case 17:
            case 21:
            case 22:
            case 23:
            case 25:
              break;
            default:
              throw Error(A(163));
          }
        $e || (t.flags & 512 && vc(t));
      } catch (m) {
        xe(t, t.return, m);
      }
    }
    if (t === e) {
      z = null;
      break;
    }
    if (((n = t.sibling), n !== null)) {
      ((n.return = t.return), (z = n));
      break;
    }
    z = t.return;
  }
}
function Mf(e) {
  for (; z !== null;) {
    var t = z;
    if (t === e) {
      z = null;
      break;
    }
    var n = t.sibling;
    if (n !== null) {
      ((n.return = t.return), (z = n));
      break;
    }
    z = t.return;
  }
}
function Af(e) {
  for (; z !== null;) {
    var t = z;
    try {
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          var n = t.return;
          try {
            fa(4, t);
          } catch (c) {
            xe(t, n, c);
          }
          break;
        case 1:
          var r = t.stateNode;
          if (typeof r.componentDidMount == "function") {
            var o = t.return;
            try {
              r.componentDidMount();
            } catch (c) {
              xe(t, o, c);
            }
          }
          var s = t.return;
          try {
            vc(t);
          } catch (c) {
            xe(t, s, c);
          }
          break;
        case 5:
          var a = t.return;
          try {
            vc(t);
          } catch (c) {
            xe(t, a, c);
          }
      }
    } catch (c) {
      xe(t, t.return, c);
    }
    if (t === e) {
      z = null;
      break;
    }
    var i = t.sibling;
    if (i !== null) {
      ((i.return = t.return), (z = i));
      break;
    }
    z = t.return;
  }
}
var Yw = Math.ceil,
  Fl = pn.ReactCurrentDispatcher,
  ju = pn.ReactCurrentOwner,
  ht = pn.ReactCurrentBatchConfig,
  ne = 0,
  Me = null,
  ke = null,
  De = 0,
  nt = 0,
  Pr = Kn(0),
  je = 0,
  ss = null,
  ar = 0,
  pa = 0,
  Ru = 0,
  Bo = null,
  Ye = null,
  _u = 0,
  Yr = 1 / 0,
  en = null,
  Bl = !1,
  wc = null,
  Ln = null,
  Vs = !1,
  Mn = null,
  Ul = 0,
  Uo = 0,
  bc = null,
  ml = -1,
  hl = 0;
function We() {
  return ne & 6 ? we() : ml !== -1 ? ml : (ml = we());
}
function $n(e) {
  return e.mode & 1
    ? ne & 2 && De !== 0
      ? De & -De
      : Mw.transition !== null
        ? (hl === 0 && (hl = Sm()), hl)
        : ((e = se),
          e !== 0 || ((e = window.event), (e = e === void 0 ? 16 : _m(e.type))),
          e)
    : 1;
}
function At(e, t, n, r) {
  if (50 < Uo) throw ((Uo = 0), (bc = null), Error(A(185)));
  (fs(e, n, r),
    (!(ne & 2) || e !== Me) &&
      (e === Me && (!(ne & 2) && (pa |= n), je === 4 && Rn(e, De)),
      Ze(e, r),
      n === 1 && ne === 0 && !(t.mode & 1) && ((Yr = we() + 500), ca && Gn())));
}
function Ze(e, t) {
  var n = e.callbackNode;
  My(e, t);
  var r = Cl(e, e === Me ? De : 0);
  if (r === 0)
    (n !== null && Fd(n), (e.callbackNode = null), (e.callbackPriority = 0));
  else if (((t = r & -r), e.callbackPriority !== t)) {
    if ((n != null && Fd(n), t === 1))
      (e.tag === 0 ? Pw(Tf.bind(null, e)) : Ym(Tf.bind(null, e)),
        Ew(function () {
          !(ne & 6) && Gn();
        }),
        (n = null));
    else {
      switch (km(r)) {
        case 1:
          n = tu;
          break;
        case 4:
          n = wm;
          break;
        case 16:
          n = Nl;
          break;
        case 536870912:
          n = bm;
          break;
        default:
          n = Nl;
      }
      n = Kh(n, zh.bind(null, e));
    }
    ((e.callbackPriority = t), (e.callbackNode = n));
  }
}
function zh(e, t) {
  if (((ml = -1), (hl = 0), ne & 6)) throw Error(A(327));
  var n = e.callbackNode;
  if (Lr() && e.callbackNode !== n) return null;
  var r = Cl(e, e === Me ? De : 0);
  if (r === 0) return null;
  if (r & 30 || r & e.expiredLanes || t) t = Wl(e, r);
  else {
    t = r;
    var o = ne;
    ne |= 2;
    var s = Bh();
    (Me !== e || De !== t) && ((en = null), (Yr = we() + 500), nr(e, t));
    do
      try {
        qw();
        break;
      } catch (i) {
        Fh(e, i);
      }
    while (!0);
    (mu(),
      (Fl.current = s),
      (ne = o),
      ke !== null ? (t = 0) : ((Me = null), (De = 0), (t = je)));
  }
  if (t !== 0) {
    if (
      (t === 2 && ((o = Yi(e)), o !== 0 && ((r = o), (t = Sc(e, o)))), t === 1)
    )
      throw ((n = ss), nr(e, 0), Rn(e, r), Ze(e, we()), n);
    if (t === 6) Rn(e, r);
    else {
      if (
        ((o = e.current.alternate),
        !(r & 30) &&
          !Xw(o) &&
          ((t = Wl(e, r)),
          t === 2 && ((s = Yi(e)), s !== 0 && ((r = s), (t = Sc(e, s)))),
          t === 1))
      )
        throw ((n = ss), nr(e, 0), Rn(e, r), Ze(e, we()), n);
      switch (((e.finishedWork = o), (e.finishedLanes = r), t)) {
        case 0:
        case 1:
          throw Error(A(345));
        case 2:
          Jn(e, Ye, en);
          break;
        case 3:
          if (
            (Rn(e, r), (r & 130023424) === r && ((t = _u + 500 - we()), 10 < t))
          ) {
            if (Cl(e, 0) !== 0) break;
            if (((o = e.suspendedLanes), (o & r) !== r)) {
              (We(), (e.pingedLanes |= e.suspendedLanes & o));
              break;
            }
            e.timeoutHandle = nc(Jn.bind(null, e, Ye, en), t);
            break;
          }
          Jn(e, Ye, en);
          break;
        case 4:
          if ((Rn(e, r), (r & 4194240) === r)) break;
          for (t = e.eventTimes, o = -1; 0 < r;) {
            var a = 31 - Mt(r);
            ((s = 1 << a), (a = t[a]), a > o && (o = a), (r &= ~s));
          }
          if (
            ((r = o),
            (r = we() - r),
            (r =
              (120 > r
                ? 120
                : 480 > r
                  ? 480
                  : 1080 > r
                    ? 1080
                    : 1920 > r
                      ? 1920
                      : 3e3 > r
                        ? 3e3
                        : 4320 > r
                          ? 4320
                          : 1960 * Yw(r / 1960)) - r),
            10 < r)
          ) {
            e.timeoutHandle = nc(Jn.bind(null, e, Ye, en), r);
            break;
          }
          Jn(e, Ye, en);
          break;
        case 5:
          Jn(e, Ye, en);
          break;
        default:
          throw Error(A(329));
      }
    }
  }
  return (Ze(e, we()), e.callbackNode === n ? zh.bind(null, e) : null);
}
function Sc(e, t) {
  var n = Bo;
  return (
    e.current.memoizedState.isDehydrated && (nr(e, t).flags |= 256),
    (e = Wl(e, t)),
    e !== 2 && ((t = Ye), (Ye = n), t !== null && kc(t)),
    e
  );
}
function kc(e) {
  Ye === null ? (Ye = e) : Ye.push.apply(Ye, e);
}
function Xw(e) {
  for (var t = e; ;) {
    if (t.flags & 16384) {
      var n = t.updateQueue;
      if (n !== null && ((n = n.stores), n !== null))
        for (var r = 0; r < n.length; r++) {
          var o = n[r],
            s = o.getSnapshot;
          o = o.value;
          try {
            if (!Dt(s(), o)) return !1;
          } catch {
            return !1;
          }
        }
    }
    if (((n = t.child), t.subtreeFlags & 16384 && n !== null))
      ((n.return = t), (t = n));
    else {
      if (t === e) break;
      for (; t.sibling === null;) {
        if (t.return === null || t.return === e) return !0;
        t = t.return;
      }
      ((t.sibling.return = t.return), (t = t.sibling));
    }
  }
  return !0;
}
function Rn(e, t) {
  for (
    t &= ~Ru,
      t &= ~pa,
      e.suspendedLanes |= t,
      e.pingedLanes &= ~t,
      e = e.expirationTimes;
    0 < t;
  ) {
    var n = 31 - Mt(t),
      r = 1 << n;
    ((e[n] = -1), (t &= ~r));
  }
}
function Tf(e) {
  if (ne & 6) throw Error(A(327));
  Lr();
  var t = Cl(e, 0);
  if (!(t & 1)) return (Ze(e, we()), null);
  var n = Wl(e, t);
  if (e.tag !== 0 && n === 2) {
    var r = Yi(e);
    r !== 0 && ((t = r), (n = Sc(e, r)));
  }
  if (n === 1) throw ((n = ss), nr(e, 0), Rn(e, t), Ze(e, we()), n);
  if (n === 6) throw Error(A(345));
  return (
    (e.finishedWork = e.current.alternate),
    (e.finishedLanes = t),
    Jn(e, Ye, en),
    Ze(e, we()),
    null
  );
}
function Pu(e, t) {
  var n = ne;
  ne |= 1;
  try {
    return e(t);
  } finally {
    ((ne = n), ne === 0 && ((Yr = we() + 500), ca && Gn()));
  }
}
function ir(e) {
  Mn !== null && Mn.tag === 0 && !(ne & 6) && Lr();
  var t = ne;
  ne |= 1;
  var n = ht.transition,
    r = se;
  try {
    if (((ht.transition = null), (se = 1), e)) return e();
  } finally {
    ((se = r), (ht.transition = n), (ne = t), !(ne & 6) && Gn());
  }
}
function Mu() {
  ((nt = Pr.current), de(Pr));
}
function nr(e, t) {
  ((e.finishedWork = null), (e.finishedLanes = 0));
  var n = e.timeoutHandle;
  if ((n !== -1 && ((e.timeoutHandle = -1), Cw(n)), ke !== null))
    for (n = ke.return; n !== null;) {
      var r = n;
      switch ((du(r), r.tag)) {
        case 1:
          ((r = r.type.childContextTypes), r != null && Pl());
          break;
        case 3:
          (Kr(), de(qe), de(ze), wu());
          break;
        case 5:
          yu(r);
          break;
        case 4:
          Kr();
          break;
        case 13:
          de(he);
          break;
        case 19:
          de(he);
          break;
        case 10:
          hu(r.type._context);
          break;
        case 22:
        case 23:
          Mu();
      }
      n = n.return;
    }
  if (
    ((Me = e),
    (ke = e = zn(e.current, null)),
    (De = nt = t),
    (je = 0),
    (ss = null),
    (Ru = pa = ar = 0),
    (Ye = Bo = null),
    er !== null)
  ) {
    for (t = 0; t < er.length; t++)
      if (((n = er[t]), (r = n.interleaved), r !== null)) {
        n.interleaved = null;
        var o = r.next,
          s = n.pending;
        if (s !== null) {
          var a = s.next;
          ((s.next = o), (r.next = a));
        }
        n.pending = r;
      }
    er = null;
  }
  return e;
}
function Fh(e, t) {
  do {
    var n = ke;
    try {
      if ((mu(), (dl.current = zl), $l)) {
        for (var r = ge.memoizedState; r !== null;) {
          var o = r.queue;
          (o !== null && (o.pending = null), (r = r.next));
        }
        $l = !1;
      }
      if (
        ((lr = 0),
        (_e = Ee = ge = null),
        (zo = !1),
        (ns = 0),
        (ju.current = null),
        n === null || n.return === null)
      ) {
        ((je = 1), (ss = t), (ke = null));
        break;
      }
      e: {
        var s = e,
          a = n.return,
          i = n,
          c = t;
        if (
          ((t = De),
          (i.flags |= 32768),
          c !== null && typeof c == "object" && typeof c.then == "function")
        ) {
          var u = c,
            d = i,
            f = d.tag;
          if (!(d.mode & 1) && (f === 0 || f === 11 || f === 15)) {
            var m = d.alternate;
            m
              ? ((d.updateQueue = m.updateQueue),
                (d.memoizedState = m.memoizedState),
                (d.lanes = m.lanes))
              : ((d.updateQueue = null), (d.memoizedState = null));
          }
          var y = wf(a);
          if (y !== null) {
            ((y.flags &= -257),
              bf(y, a, i, s, t),
              y.mode & 1 && yf(s, u, t),
              (t = y),
              (c = u));
            var w = t.updateQueue;
            if (w === null) {
              var x = new Set();
              (x.add(c), (t.updateQueue = x));
            } else w.add(c);
            break e;
          } else {
            if (!(t & 1)) {
              (yf(s, u, t), Au());
              break e;
            }
            c = Error(A(426));
          }
        } else if (fe && i.mode & 1) {
          var k = wf(a);
          if (k !== null) {
            (!(k.flags & 65536) && (k.flags |= 256),
              bf(k, a, i, s, t),
              fu(Gr(c, i)));
            break e;
          }
        }
        ((s = c = Gr(c, i)),
          je !== 4 && (je = 2),
          Bo === null ? (Bo = [s]) : Bo.push(s),
          (s = a));
        do {
          switch (s.tag) {
            case 3:
              ((s.flags |= 65536), (t &= -t), (s.lanes |= t));
              var h = kh(s, c, t);
              pf(s, h);
              break e;
            case 1:
              i = c;
              var g = s.type,
                v = s.stateNode;
              if (
                !(s.flags & 128) &&
                (typeof g.getDerivedStateFromError == "function" ||
                  (v !== null &&
                    typeof v.componentDidCatch == "function" &&
                    (Ln === null || !Ln.has(v))))
              ) {
                ((s.flags |= 65536), (t &= -t), (s.lanes |= t));
                var b = Nh(s, i, t);
                pf(s, b);
                break e;
              }
          }
          s = s.return;
        } while (s !== null);
      }
      Wh(n);
    } catch (S) {
      ((t = S), ke === n && n !== null && (ke = n = n.return));
      continue;
    }
    break;
  } while (!0);
}
function Bh() {
  var e = Fl.current;
  return ((Fl.current = zl), e === null ? zl : e);
}
function Au() {
  ((je === 0 || je === 3 || je === 2) && (je = 4),
    Me === null || (!(ar & 268435455) && !(pa & 268435455)) || Rn(Me, De));
}
function Wl(e, t) {
  var n = ne;
  ne |= 2;
  var r = Bh();
  (Me !== e || De !== t) && ((en = null), nr(e, t));
  do
    try {
      Qw();
      break;
    } catch (o) {
      Fh(e, o);
    }
  while (!0);
  if ((mu(), (ne = n), (Fl.current = r), ke !== null)) throw Error(A(261));
  return ((Me = null), (De = 0), je);
}
function Qw() {
  for (; ke !== null;) Uh(ke);
}
function qw() {
  for (; ke !== null && !Sy();) Uh(ke);
}
function Uh(e) {
  var t = Hh(e.alternate, e, nt);
  ((e.memoizedProps = e.pendingProps),
    t === null ? Wh(e) : (ke = t),
    (ju.current = null));
}
function Wh(e) {
  var t = e;
  do {
    var n = t.alternate;
    if (((e = t.return), t.flags & 32768)) {
      if (((n = Vw(n, t)), n !== null)) {
        ((n.flags &= 32767), (ke = n));
        return;
      }
      if (e !== null)
        ((e.flags |= 32768), (e.subtreeFlags = 0), (e.deletions = null));
      else {
        ((je = 6), (ke = null));
        return;
      }
    } else if (((n = Ww(n, t, nt)), n !== null)) {
      ke = n;
      return;
    }
    if (((t = t.sibling), t !== null)) {
      ke = t;
      return;
    }
    ke = t = e;
  } while (t !== null);
  je === 0 && (je = 5);
}
function Jn(e, t, n) {
  var r = se,
    o = ht.transition;
  try {
    ((ht.transition = null), (se = 1), Jw(e, t, n, r));
  } finally {
    ((ht.transition = o), (se = r));
  }
  return null;
}
function Jw(e, t, n, r) {
  do Lr();
  while (Mn !== null);
  if (ne & 6) throw Error(A(327));
  n = e.finishedWork;
  var o = e.finishedLanes;
  if (n === null) return null;
  if (((e.finishedWork = null), (e.finishedLanes = 0), n === e.current))
    throw Error(A(177));
  ((e.callbackNode = null), (e.callbackPriority = 0));
  var s = n.lanes | n.childLanes;
  if (
    (Ay(e, s),
    e === Me && ((ke = Me = null), (De = 0)),
    (!(n.subtreeFlags & 2064) && !(n.flags & 2064)) ||
      Vs ||
      ((Vs = !0),
      Kh(Nl, function () {
        return (Lr(), null);
      })),
    (s = (n.flags & 15990) !== 0),
    n.subtreeFlags & 15990 || s)
  ) {
    ((s = ht.transition), (ht.transition = null));
    var a = se;
    se = 1;
    var i = ne;
    ((ne |= 4),
      (ju.current = null),
      Kw(e, n),
      Lh(n, e),
      xw(ec),
      (El = !!Zi),
      (ec = Zi = null),
      (e.current = n),
      Gw(n),
      ky(),
      (ne = i),
      (se = a),
      (ht.transition = s));
  } else e.current = n;
  if (
    (Vs && ((Vs = !1), (Mn = e), (Ul = o)),
    (s = e.pendingLanes),
    s === 0 && (Ln = null),
    Ey(n.stateNode),
    Ze(e, we()),
    t !== null)
  )
    for (r = e.onRecoverableError, n = 0; n < t.length; n++)
      ((o = t[n]), r(o.value, { componentStack: o.stack, digest: o.digest }));
  if (Bl) throw ((Bl = !1), (e = wc), (wc = null), e);
  return (
    Ul & 1 && e.tag !== 0 && Lr(),
    (s = e.pendingLanes),
    s & 1 ? (e === bc ? Uo++ : ((Uo = 0), (bc = e))) : (Uo = 0),
    Gn(),
    null
  );
}
function Lr() {
  if (Mn !== null) {
    var e = km(Ul),
      t = ht.transition,
      n = se;
    try {
      if (((ht.transition = null), (se = 16 > e ? 16 : e), Mn === null))
        var r = !1;
      else {
        if (((e = Mn), (Mn = null), (Ul = 0), ne & 6)) throw Error(A(331));
        var o = ne;
        for (ne |= 4, z = e.current; z !== null;) {
          var s = z,
            a = s.child;
          if (z.flags & 16) {
            var i = s.deletions;
            if (i !== null) {
              for (var c = 0; c < i.length; c++) {
                var u = i[c];
                for (z = u; z !== null;) {
                  var d = z;
                  switch (d.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Fo(8, d, s);
                  }
                  var f = d.child;
                  if (f !== null) ((f.return = d), (z = f));
                  else
                    for (; z !== null;) {
                      d = z;
                      var m = d.sibling,
                        y = d.return;
                      if ((Dh(d), d === u)) {
                        z = null;
                        break;
                      }
                      if (m !== null) {
                        ((m.return = y), (z = m));
                        break;
                      }
                      z = y;
                    }
                }
              }
              var w = s.alternate;
              if (w !== null) {
                var x = w.child;
                if (x !== null) {
                  w.child = null;
                  do {
                    var k = x.sibling;
                    ((x.sibling = null), (x = k));
                  } while (x !== null);
                }
              }
              z = s;
            }
          }
          if (s.subtreeFlags & 2064 && a !== null) ((a.return = s), (z = a));
          else
            e: for (; z !== null;) {
              if (((s = z), s.flags & 2048))
                switch (s.tag) {
                  case 0:
                  case 11:
                  case 15:
                    Fo(9, s, s.return);
                }
              var h = s.sibling;
              if (h !== null) {
                ((h.return = s.return), (z = h));
                break e;
              }
              z = s.return;
            }
        }
        var g = e.current;
        for (z = g; z !== null;) {
          a = z;
          var v = a.child;
          if (a.subtreeFlags & 2064 && v !== null) ((v.return = a), (z = v));
          else
            e: for (a = g; z !== null;) {
              if (((i = z), i.flags & 2048))
                try {
                  switch (i.tag) {
                    case 0:
                    case 11:
                    case 15:
                      fa(9, i);
                  }
                } catch (S) {
                  xe(i, i.return, S);
                }
              if (i === a) {
                z = null;
                break e;
              }
              var b = i.sibling;
              if (b !== null) {
                ((b.return = i.return), (z = b));
                break e;
              }
              z = i.return;
            }
        }
        if (
          ((ne = o), Gn(), Kt && typeof Kt.onPostCommitFiberRoot == "function")
        )
          try {
            Kt.onPostCommitFiberRoot(oa, e);
          } catch {}
        r = !0;
      }
      return r;
    } finally {
      ((se = n), (ht.transition = t));
    }
  }
  return !1;
}
function Df(e, t, n) {
  ((t = Gr(n, t)),
    (t = kh(e, t, 1)),
    (e = In(e, t, 1)),
    (t = We()),
    e !== null && (fs(e, 1, t), Ze(e, t)));
}
function xe(e, t, n) {
  if (e.tag === 3) Df(e, e, n);
  else
    for (; t !== null;) {
      if (t.tag === 3) {
        Df(t, e, n);
        break;
      } else if (t.tag === 1) {
        var r = t.stateNode;
        if (
          typeof t.type.getDerivedStateFromError == "function" ||
          (typeof r.componentDidCatch == "function" &&
            (Ln === null || !Ln.has(r)))
        ) {
          ((e = Gr(n, e)),
            (e = Nh(t, e, 1)),
            (t = In(t, e, 1)),
            (e = We()),
            t !== null && (fs(t, 1, e), Ze(t, e)));
          break;
        }
      }
      t = t.return;
    }
}
function Zw(e, t, n) {
  var r = e.pingCache;
  (r !== null && r.delete(t),
    (t = We()),
    (e.pingedLanes |= e.suspendedLanes & n),
    Me === e &&
      (De & n) === n &&
      (je === 4 || (je === 3 && (De & 130023424) === De && 500 > we() - _u)
        ? nr(e, 0)
        : (Ru |= n)),
    Ze(e, t));
}
function Vh(e, t) {
  t === 0 &&
    (e.mode & 1
      ? ((t = Ds), (Ds <<= 1), !(Ds & 130023424) && (Ds = 4194304))
      : (t = 1));
  var n = We();
  ((e = cn(e, t)), e !== null && (fs(e, t, n), Ze(e, n)));
}
function e1(e) {
  var t = e.memoizedState,
    n = 0;
  (t !== null && (n = t.retryLane), Vh(e, n));
}
function t1(e, t) {
  var n = 0;
  switch (e.tag) {
    case 13:
      var r = e.stateNode,
        o = e.memoizedState;
      o !== null && (n = o.retryLane);
      break;
    case 19:
      r = e.stateNode;
      break;
    default:
      throw Error(A(314));
  }
  (r !== null && r.delete(t), Vh(e, n));
}
var Hh;
Hh = function (e, t, n) {
  if (e !== null)
    if (e.memoizedProps !== t.pendingProps || qe.current) Qe = !0;
    else {
      if (!(e.lanes & n) && !(t.flags & 128)) return ((Qe = !1), Uw(e, t, n));
      Qe = !!(e.flags & 131072);
    }
  else ((Qe = !1), fe && t.flags & 1048576 && Xm(t, Tl, t.index));
  switch (((t.lanes = 0), t.tag)) {
    case 2:
      var r = t.type;
      (pl(e, t), (e = t.pendingProps));
      var o = Wr(t, ze.current);
      (Ir(t, n), (o = Su(null, t, r, e, o, n)));
      var s = ku();
      return (
        (t.flags |= 1),
        typeof o == "object" &&
        o !== null &&
        typeof o.render == "function" &&
        o.$$typeof === void 0
          ? ((t.tag = 1),
            (t.memoizedState = null),
            (t.updateQueue = null),
            Je(r) ? ((s = !0), Ml(t)) : (s = !1),
            (t.memoizedState =
              o.state !== null && o.state !== void 0 ? o.state : null),
            vu(t),
            (o.updater = da),
            (t.stateNode = o),
            (o._reactInternals = t),
            cc(t, r, e, n),
            (t = fc(null, t, r, !0, s, n)))
          : ((t.tag = 0), fe && s && uu(t), Ue(null, t, o, n), (t = t.child)),
        t
      );
    case 16:
      r = t.elementType;
      e: {
        switch (
          (pl(e, t),
          (e = t.pendingProps),
          (o = r._init),
          (r = o(r._payload)),
          (t.type = r),
          (o = t.tag = r1(r)),
          (e = Et(r, e)),
          o)
        ) {
          case 0:
            t = dc(null, t, r, e, n);
            break e;
          case 1:
            t = Nf(null, t, r, e, n);
            break e;
          case 11:
            t = Sf(null, t, r, e, n);
            break e;
          case 14:
            t = kf(null, t, r, Et(r.type, e), n);
            break e;
        }
        throw Error(A(306, r, ""));
      }
      return t;
    case 0:
      return (
        (r = t.type),
        (o = t.pendingProps),
        (o = t.elementType === r ? o : Et(r, o)),
        dc(e, t, r, o, n)
      );
    case 1:
      return (
        (r = t.type),
        (o = t.pendingProps),
        (o = t.elementType === r ? o : Et(r, o)),
        Nf(e, t, r, o, n)
      );
    case 3:
      e: {
        if ((Rh(t), e === null)) throw Error(A(387));
        ((r = t.pendingProps),
          (s = t.memoizedState),
          (o = s.element),
          th(e, t),
          Il(t, r, null, n));
        var a = t.memoizedState;
        if (((r = a.element), s.isDehydrated))
          if (
            ((s = {
              element: r,
              isDehydrated: !1,
              cache: a.cache,
              pendingSuspenseBoundaries: a.pendingSuspenseBoundaries,
              transitions: a.transitions,
            }),
            (t.updateQueue.baseState = s),
            (t.memoizedState = s),
            t.flags & 256)
          ) {
            ((o = Gr(Error(A(423)), t)), (t = Cf(e, t, r, n, o)));
            break e;
          } else if (r !== o) {
            ((o = Gr(Error(A(424)), t)), (t = Cf(e, t, r, n, o)));
            break e;
          } else
            for (
              ot = On(t.stateNode.containerInfo.firstChild),
                st = t,
                fe = !0,
                Rt = null,
                n = Zm(t, null, r, n),
                t.child = n;
              n;
            )
              ((n.flags = (n.flags & -3) | 4096), (n = n.sibling));
        else {
          if ((Vr(), r === o)) {
            t = un(e, t, n);
            break e;
          }
          Ue(e, t, r, n);
        }
        t = t.child;
      }
      return t;
    case 5:
      return (
        nh(t),
        e === null && lc(t),
        (r = t.type),
        (o = t.pendingProps),
        (s = e !== null ? e.memoizedProps : null),
        (a = o.children),
        tc(r, o) ? (a = null) : s !== null && tc(r, s) && (t.flags |= 32),
        jh(e, t),
        Ue(e, t, a, n),
        t.child
      );
    case 6:
      return (e === null && lc(t), null);
    case 13:
      return _h(e, t, n);
    case 4:
      return (
        xu(t, t.stateNode.containerInfo),
        (r = t.pendingProps),
        e === null ? (t.child = Hr(t, null, r, n)) : Ue(e, t, r, n),
        t.child
      );
    case 11:
      return (
        (r = t.type),
        (o = t.pendingProps),
        (o = t.elementType === r ? o : Et(r, o)),
        Sf(e, t, r, o, n)
      );
    case 7:
      return (Ue(e, t, t.pendingProps, n), t.child);
    case 8:
      return (Ue(e, t, t.pendingProps.children, n), t.child);
    case 12:
      return (Ue(e, t, t.pendingProps.children, n), t.child);
    case 10:
      e: {
        if (
          ((r = t.type._context),
          (o = t.pendingProps),
          (s = t.memoizedProps),
          (a = o.value),
          ie(Dl, r._currentValue),
          (r._currentValue = a),
          s !== null)
        )
          if (Dt(s.value, a)) {
            if (s.children === o.children && !qe.current) {
              t = un(e, t, n);
              break e;
            }
          } else
            for (s = t.child, s !== null && (s.return = t); s !== null;) {
              var i = s.dependencies;
              if (i !== null) {
                a = s.child;
                for (var c = i.firstContext; c !== null;) {
                  if (c.context === r) {
                    if (s.tag === 1) {
                      ((c = sn(-1, n & -n)), (c.tag = 2));
                      var u = s.updateQueue;
                      if (u !== null) {
                        u = u.shared;
                        var d = u.pending;
                        (d === null
                          ? (c.next = c)
                          : ((c.next = d.next), (d.next = c)),
                          (u.pending = c));
                      }
                    }
                    ((s.lanes |= n),
                      (c = s.alternate),
                      c !== null && (c.lanes |= n),
                      ac(s.return, n, t),
                      (i.lanes |= n));
                    break;
                  }
                  c = c.next;
                }
              } else if (s.tag === 10) a = s.type === t.type ? null : s.child;
              else if (s.tag === 18) {
                if (((a = s.return), a === null)) throw Error(A(341));
                ((a.lanes |= n),
                  (i = a.alternate),
                  i !== null && (i.lanes |= n),
                  ac(a, n, t),
                  (a = s.sibling));
              } else a = s.child;
              if (a !== null) a.return = s;
              else
                for (a = s; a !== null;) {
                  if (a === t) {
                    a = null;
                    break;
                  }
                  if (((s = a.sibling), s !== null)) {
                    ((s.return = a.return), (a = s));
                    break;
                  }
                  a = a.return;
                }
              s = a;
            }
        (Ue(e, t, o.children, n), (t = t.child));
      }
      return t;
    case 9:
      return (
        (o = t.type),
        (r = t.pendingProps.children),
        Ir(t, n),
        (o = yt(o)),
        (r = r(o)),
        (t.flags |= 1),
        Ue(e, t, r, n),
        t.child
      );
    case 14:
      return (
        (r = t.type),
        (o = Et(r, t.pendingProps)),
        (o = Et(r.type, o)),
        kf(e, t, r, o, n)
      );
    case 15:
      return Ch(e, t, t.type, t.pendingProps, n);
    case 17:
      return (
        (r = t.type),
        (o = t.pendingProps),
        (o = t.elementType === r ? o : Et(r, o)),
        pl(e, t),
        (t.tag = 1),
        Je(r) ? ((e = !0), Ml(t)) : (e = !1),
        Ir(t, n),
        Sh(t, r, o),
        cc(t, r, o, n),
        fc(null, t, r, !0, e, n)
      );
    case 19:
      return Ph(e, t, n);
    case 22:
      return Eh(e, t, n);
  }
  throw Error(A(156, t.tag));
};
function Kh(e, t) {
  return ym(e, t);
}
function n1(e, t, n, r) {
  ((this.tag = e),
    (this.key = n),
    (this.sibling =
      this.child =
      this.return =
      this.stateNode =
      this.type =
      this.elementType =
        null),
    (this.index = 0),
    (this.ref = null),
    (this.pendingProps = t),
    (this.dependencies =
      this.memoizedState =
      this.updateQueue =
      this.memoizedProps =
        null),
    (this.mode = r),
    (this.subtreeFlags = this.flags = 0),
    (this.deletions = null),
    (this.childLanes = this.lanes = 0),
    (this.alternate = null));
}
function mt(e, t, n, r) {
  return new n1(e, t, n, r);
}
function Tu(e) {
  return ((e = e.prototype), !(!e || !e.isReactComponent));
}
function r1(e) {
  if (typeof e == "function") return Tu(e) ? 1 : 0;
  if (e != null) {
    if (((e = e.$$typeof), e === Jc)) return 11;
    if (e === Zc) return 14;
  }
  return 2;
}
function zn(e, t) {
  var n = e.alternate;
  return (
    n === null
      ? ((n = mt(e.tag, t, e.key, e.mode)),
        (n.elementType = e.elementType),
        (n.type = e.type),
        (n.stateNode = e.stateNode),
        (n.alternate = e),
        (e.alternate = n))
      : ((n.pendingProps = t),
        (n.type = e.type),
        (n.flags = 0),
        (n.subtreeFlags = 0),
        (n.deletions = null)),
    (n.flags = e.flags & 14680064),
    (n.childLanes = e.childLanes),
    (n.lanes = e.lanes),
    (n.child = e.child),
    (n.memoizedProps = e.memoizedProps),
    (n.memoizedState = e.memoizedState),
    (n.updateQueue = e.updateQueue),
    (t = e.dependencies),
    (n.dependencies =
      t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }),
    (n.sibling = e.sibling),
    (n.index = e.index),
    (n.ref = e.ref),
    n
  );
}
function gl(e, t, n, r, o, s) {
  var a = 2;
  if (((r = e), typeof e == "function")) Tu(e) && (a = 1);
  else if (typeof e == "string") a = 5;
  else
    e: switch (e) {
      case wr:
        return rr(n.children, o, s, t);
      case qc:
        ((a = 8), (o |= 8));
        break;
      case Ti:
        return (
          (e = mt(12, n, t, o | 2)),
          (e.elementType = Ti),
          (e.lanes = s),
          e
        );
      case Di:
        return ((e = mt(13, n, t, o)), (e.elementType = Di), (e.lanes = s), e);
      case Oi:
        return ((e = mt(19, n, t, o)), (e.elementType = Oi), (e.lanes = s), e);
      case nm:
        return ma(n, o, s, t);
      default:
        if (typeof e == "object" && e !== null)
          switch (e.$$typeof) {
            case em:
              a = 10;
              break e;
            case tm:
              a = 9;
              break e;
            case Jc:
              a = 11;
              break e;
            case Zc:
              a = 14;
              break e;
            case Cn:
              ((a = 16), (r = null));
              break e;
          }
        throw Error(A(130, e == null ? e : typeof e, ""));
    }
  return (
    (t = mt(a, n, t, o)),
    (t.elementType = e),
    (t.type = r),
    (t.lanes = s),
    t
  );
}
function rr(e, t, n, r) {
  return ((e = mt(7, e, r, t)), (e.lanes = n), e);
}
function ma(e, t, n, r) {
  return (
    (e = mt(22, e, r, t)),
    (e.elementType = nm),
    (e.lanes = n),
    (e.stateNode = { isHidden: !1 }),
    e
  );
}
function ii(e, t, n) {
  return ((e = mt(6, e, null, t)), (e.lanes = n), e);
}
function ci(e, t, n) {
  return (
    (t = mt(4, e.children !== null ? e.children : [], e.key, t)),
    (t.lanes = n),
    (t.stateNode = {
      containerInfo: e.containerInfo,
      pendingChildren: null,
      implementation: e.implementation,
    }),
    t
  );
}
function o1(e, t, n, r, o) {
  ((this.tag = t),
    (this.containerInfo = e),
    (this.finishedWork =
      this.pingCache =
      this.current =
      this.pendingChildren =
        null),
    (this.timeoutHandle = -1),
    (this.callbackNode = this.pendingContext = this.context = null),
    (this.callbackPriority = 0),
    (this.eventTimes = Wa(0)),
    (this.expirationTimes = Wa(-1)),
    (this.entangledLanes =
      this.finishedLanes =
      this.mutableReadLanes =
      this.expiredLanes =
      this.pingedLanes =
      this.suspendedLanes =
      this.pendingLanes =
        0),
    (this.entanglements = Wa(0)),
    (this.identifierPrefix = r),
    (this.onRecoverableError = o),
    (this.mutableSourceEagerHydrationData = null));
}
function Du(e, t, n, r, o, s, a, i, c) {
  return (
    (e = new o1(e, t, n, i, c)),
    t === 1 ? ((t = 1), s === !0 && (t |= 8)) : (t = 0),
    (s = mt(3, null, null, t)),
    (e.current = s),
    (s.stateNode = e),
    (s.memoizedState = {
      element: r,
      isDehydrated: n,
      cache: null,
      transitions: null,
      pendingSuspenseBoundaries: null,
    }),
    vu(s),
    e
  );
}
function s1(e, t, n) {
  var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
  return {
    $$typeof: yr,
    key: r == null ? null : "" + r,
    children: e,
    containerInfo: t,
    implementation: n,
  };
}
function Gh(e) {
  if (!e) return Un;
  e = e._reactInternals;
  e: {
    if (fr(e) !== e || e.tag !== 1) throw Error(A(170));
    var t = e;
    do {
      switch (t.tag) {
        case 3:
          t = t.stateNode.context;
          break e;
        case 1:
          if (Je(t.type)) {
            t = t.stateNode.__reactInternalMemoizedMergedChildContext;
            break e;
          }
      }
      t = t.return;
    } while (t !== null);
    throw Error(A(171));
  }
  if (e.tag === 1) {
    var n = e.type;
    if (Je(n)) return Gm(e, n, t);
  }
  return t;
}
function Yh(e, t, n, r, o, s, a, i, c) {
  return (
    (e = Du(n, r, !0, e, o, s, a, i, c)),
    (e.context = Gh(null)),
    (n = e.current),
    (r = We()),
    (o = $n(n)),
    (s = sn(r, o)),
    (s.callback = t ?? null),
    In(n, s, o),
    (e.current.lanes = o),
    fs(e, o, r),
    Ze(e, r),
    e
  );
}
function ha(e, t, n, r) {
  var o = t.current,
    s = We(),
    a = $n(o);
  return (
    (n = Gh(n)),
    t.context === null ? (t.context = n) : (t.pendingContext = n),
    (t = sn(s, a)),
    (t.payload = { element: e }),
    (r = r === void 0 ? null : r),
    r !== null && (t.callback = r),
    (e = In(o, t, a)),
    e !== null && (At(e, o, a, s), ul(e, o, a)),
    a
  );
}
function Vl(e) {
  if (((e = e.current), !e.child)) return null;
  switch (e.child.tag) {
    case 5:
      return e.child.stateNode;
    default:
      return e.child.stateNode;
  }
}
function Of(e, t) {
  if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
    var n = e.retryLane;
    e.retryLane = n !== 0 && n < t ? n : t;
  }
}
function Ou(e, t) {
  (Of(e, t), (e = e.alternate) && Of(e, t));
}
function l1() {
  return null;
}
var Xh =
  typeof reportError == "function"
    ? reportError
    : function (e) {
        console.error(e);
      };
function Iu(e) {
  this._internalRoot = e;
}
ga.prototype.render = Iu.prototype.render = function (e) {
  var t = this._internalRoot;
  if (t === null) throw Error(A(409));
  ha(e, t, null, null);
};
ga.prototype.unmount = Iu.prototype.unmount = function () {
  var e = this._internalRoot;
  if (e !== null) {
    this._internalRoot = null;
    var t = e.containerInfo;
    (ir(function () {
      ha(null, e, null, null);
    }),
      (t[an] = null));
  }
};
function ga(e) {
  this._internalRoot = e;
}
ga.prototype.unstable_scheduleHydration = function (e) {
  if (e) {
    var t = Em();
    e = { blockedOn: null, target: e, priority: t };
    for (var n = 0; n < jn.length && t !== 0 && t < jn[n].priority; n++);
    (jn.splice(n, 0, e), n === 0 && Rm(e));
  }
};
function Lu(e) {
  return !(!e || (e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11));
}
function va(e) {
  return !(
    !e ||
    (e.nodeType !== 1 &&
      e.nodeType !== 9 &&
      e.nodeType !== 11 &&
      (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "))
  );
}
function If() {}
function a1(e, t, n, r, o) {
  if (o) {
    if (typeof r == "function") {
      var s = r;
      r = function () {
        var u = Vl(a);
        s.call(u);
      };
    }
    var a = Yh(t, r, e, 0, null, !1, !1, "", If);
    return (
      (e._reactRootContainer = a),
      (e[an] = a.current),
      qo(e.nodeType === 8 ? e.parentNode : e),
      ir(),
      a
    );
  }
  for (; (o = e.lastChild);) e.removeChild(o);
  if (typeof r == "function") {
    var i = r;
    r = function () {
      var u = Vl(c);
      i.call(u);
    };
  }
  var c = Du(e, 0, !1, null, null, !1, !1, "", If);
  return (
    (e._reactRootContainer = c),
    (e[an] = c.current),
    qo(e.nodeType === 8 ? e.parentNode : e),
    ir(function () {
      ha(t, c, n, r);
    }),
    c
  );
}
function xa(e, t, n, r, o) {
  var s = n._reactRootContainer;
  if (s) {
    var a = s;
    if (typeof o == "function") {
      var i = o;
      o = function () {
        var c = Vl(a);
        i.call(c);
      };
    }
    ha(t, a, e, o);
  } else a = a1(n, t, e, o, r);
  return Vl(a);
}
Nm = function (e) {
  switch (e.tag) {
    case 3:
      var t = e.stateNode;
      if (t.current.memoizedState.isDehydrated) {
        var n = Mo(t.pendingLanes);
        n !== 0 &&
          (nu(t, n | 1), Ze(t, we()), !(ne & 6) && ((Yr = we() + 500), Gn()));
      }
      break;
    case 13:
      (ir(function () {
        var r = cn(e, 1);
        if (r !== null) {
          var o = We();
          At(r, e, 1, o);
        }
      }),
        Ou(e, 1));
  }
};
ru = function (e) {
  if (e.tag === 13) {
    var t = cn(e, 134217728);
    if (t !== null) {
      var n = We();
      At(t, e, 134217728, n);
    }
    Ou(e, 134217728);
  }
};
Cm = function (e) {
  if (e.tag === 13) {
    var t = $n(e),
      n = cn(e, t);
    if (n !== null) {
      var r = We();
      At(n, e, t, r);
    }
    Ou(e, t);
  }
};
Em = function () {
  return se;
};
jm = function (e, t) {
  var n = se;
  try {
    return ((se = e), t());
  } finally {
    se = n;
  }
};
Hi = function (e, t, n) {
  switch (t) {
    case "input":
      if (($i(e, n), (t = n.name), n.type === "radio" && t != null)) {
        for (n = e; n.parentNode;) n = n.parentNode;
        for (
          n = n.querySelectorAll(
            "input[name=" + JSON.stringify("" + t) + '][type="radio"]',
          ),
            t = 0;
          t < n.length;
          t++
        ) {
          var r = n[t];
          if (r !== e && r.form === e.form) {
            var o = ia(r);
            if (!o) throw Error(A(90));
            (om(r), $i(r, o));
          }
        }
      }
      break;
    case "textarea":
      lm(e, n);
      break;
    case "select":
      ((t = n.value), t != null && Ar(e, !!n.multiple, t, !1));
  }
};
pm = Pu;
mm = ir;
var i1 = { usingClientEntryPoint: !1, Events: [ms, Nr, ia, dm, fm, Pu] },
  bo = {
    findFiberByHostInstance: Zn,
    bundleType: 0,
    version: "18.3.1",
    rendererPackageName: "react-dom",
  },
  c1 = {
    bundleType: bo.bundleType,
    version: bo.version,
    rendererPackageName: bo.rendererPackageName,
    rendererConfig: bo.rendererConfig,
    overrideHookState: null,
    overrideHookStateDeletePath: null,
    overrideHookStateRenamePath: null,
    overrideProps: null,
    overridePropsDeletePath: null,
    overridePropsRenamePath: null,
    setErrorHandler: null,
    setSuspenseHandler: null,
    scheduleUpdate: null,
    currentDispatcherRef: pn.ReactCurrentDispatcher,
    findHostInstanceByFiber: function (e) {
      return ((e = vm(e)), e === null ? null : e.stateNode);
    },
    findFiberByHostInstance: bo.findFiberByHostInstance || l1,
    findHostInstancesForRefresh: null,
    scheduleRefresh: null,
    scheduleRoot: null,
    setRefreshHandler: null,
    getCurrentFiber: null,
    reconcilerVersion: "18.3.1-next-f1338f8080-20240426",
  };
if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
  var Hs = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!Hs.isDisabled && Hs.supportsFiber)
    try {
      ((oa = Hs.inject(c1)), (Kt = Hs));
    } catch {}
}
ut.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = i1;
ut.createPortal = function (e, t) {
  var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
  if (!Lu(t)) throw Error(A(200));
  return s1(e, t, null, n);
};
ut.createRoot = function (e, t) {
  if (!Lu(e)) throw Error(A(299));
  var n = !1,
    r = "",
    o = Xh;
  return (
    t != null &&
      (t.unstable_strictMode === !0 && (n = !0),
      t.identifierPrefix !== void 0 && (r = t.identifierPrefix),
      t.onRecoverableError !== void 0 && (o = t.onRecoverableError)),
    (t = Du(e, 1, !1, null, null, n, !1, r, o)),
    (e[an] = t.current),
    qo(e.nodeType === 8 ? e.parentNode : e),
    new Iu(t)
  );
};
ut.findDOMNode = function (e) {
  if (e == null) return null;
  if (e.nodeType === 1) return e;
  var t = e._reactInternals;
  if (t === void 0)
    throw typeof e.render == "function"
      ? Error(A(188))
      : ((e = Object.keys(e).join(",")), Error(A(268, e)));
  return ((e = vm(t)), (e = e === null ? null : e.stateNode), e);
};
ut.flushSync = function (e) {
  return ir(e);
};
ut.hydrate = function (e, t, n) {
  if (!va(t)) throw Error(A(200));
  return xa(null, e, t, !0, n);
};
ut.hydrateRoot = function (e, t, n) {
  if (!Lu(e)) throw Error(A(405));
  var r = (n != null && n.hydratedSources) || null,
    o = !1,
    s = "",
    a = Xh;
  if (
    (n != null &&
      (n.unstable_strictMode === !0 && (o = !0),
      n.identifierPrefix !== void 0 && (s = n.identifierPrefix),
      n.onRecoverableError !== void 0 && (a = n.onRecoverableError)),
    (t = Yh(t, null, e, 1, n ?? null, o, !1, s, a)),
    (e[an] = t.current),
    qo(e),
    r)
  )
    for (e = 0; e < r.length; e++)
      ((n = r[e]),
        (o = n._getVersion),
        (o = o(n._source)),
        t.mutableSourceEagerHydrationData == null
          ? (t.mutableSourceEagerHydrationData = [n, o])
          : t.mutableSourceEagerHydrationData.push(n, o));
  return new ga(t);
};
ut.render = function (e, t, n) {
  if (!va(t)) throw Error(A(200));
  return xa(null, e, t, !1, n);
};
ut.unmountComponentAtNode = function (e) {
  if (!va(e)) throw Error(A(40));
  return e._reactRootContainer
    ? (ir(function () {
        xa(null, null, e, !1, function () {
          ((e._reactRootContainer = null), (e[an] = null));
        });
      }),
      !0)
    : !1;
};
ut.unstable_batchedUpdates = Pu;
ut.unstable_renderSubtreeIntoContainer = function (e, t, n, r) {
  if (!va(n)) throw Error(A(200));
  if (e == null || e._reactInternals === void 0) throw Error(A(38));
  return xa(e, t, n, !1, r);
};
ut.version = "18.3.1-next-f1338f8080-20240426";
function Qh() {
  if (!(
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" ||
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"
  ))
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(Qh);
    } catch (e) {
      console.error(e);
    }
}
(Qh(), (Qp.exports = ut));
var ro = Qp.exports,
  Lf = ro;
((Mi.createRoot = Lf.createRoot), (Mi.hydrateRoot = Lf.hydrateRoot));
function qh(e) {
  var t,
    n,
    r = "";
  if (typeof e == "string" || typeof e == "number") r += e;
  else if (typeof e == "object")
    if (Array.isArray(e)) {
      var o = e.length;
      for (t = 0; t < o; t++)
        e[t] && (n = qh(e[t])) && (r && (r += " "), (r += n));
    } else for (n in e) e[n] && (r && (r += " "), (r += n));
  return r;
}
function Jh() {
  for (var e, t, n = 0, r = "", o = arguments.length; n < o; n++)
    (e = arguments[n]) && (t = qh(e)) && (r && (r += " "), (r += t));
  return r;
}
const $f = (e) => (typeof e == "boolean" ? `${e}` : e === 0 ? "0" : e),
  zf = Jh,
  gs = (e, t) => (n) => {
    var r;
    if ((t == null ? void 0 : t.variants) == null)
      return zf(
        e,
        n == null ? void 0 : n.class,
        n == null ? void 0 : n.className,
      );
    const { variants: o, defaultVariants: s } = t,
      a = Object.keys(o).map((u) => {
        const d = n == null ? void 0 : n[u],
          f = s == null ? void 0 : s[u];
        if (d === null) return null;
        const m = $f(d) || $f(f);
        return o[u][m];
      }),
      i =
        n &&
        Object.entries(n).reduce((u, d) => {
          let [f, m] = d;
          return (m === void 0 || (u[f] = m), u);
        }, {}),
      c =
        t == null || (r = t.compoundVariants) === null || r === void 0
          ? void 0
          : r.reduce((u, d) => {
              let { class: f, className: m, ...y } = d;
              return Object.entries(y).every((w) => {
                let [x, k] = w;
                return Array.isArray(k)
                  ? k.includes({ ...s, ...i }[x])
                  : { ...s, ...i }[x] === k;
              })
                ? [...u, f, m]
                : u;
            }, []);
    return zf(
      e,
      a,
      c,
      n == null ? void 0 : n.class,
      n == null ? void 0 : n.className,
    );
  },
  $u = "-",
  u1 = (e) => {
    const t = f1(e),
      { conflictingClassGroups: n, conflictingClassGroupModifiers: r } = e;
    return {
      getClassGroupId: (a) => {
        const i = a.split($u);
        return (i[0] === "" && i.length !== 1 && i.shift(), Zh(i, t) || d1(a));
      },
      getConflictingClassGroupIds: (a, i) => {
        const c = n[a] || [];
        return i && r[a] ? [...c, ...r[a]] : c;
      },
    };
  },
  Zh = (e, t) => {
    var a;
    if (e.length === 0) return t.classGroupId;
    const n = e[0],
      r = t.nextPart.get(n),
      o = r ? Zh(e.slice(1), r) : void 0;
    if (o) return o;
    if (t.validators.length === 0) return;
    const s = e.join($u);
    return (a = t.validators.find(({ validator: i }) => i(s))) == null
      ? void 0
      : a.classGroupId;
  },
  Ff = /^\[(.+)\]$/,
  d1 = (e) => {
    if (Ff.test(e)) {
      const t = Ff.exec(e)[1],
        n = t == null ? void 0 : t.substring(0, t.indexOf(":"));
      if (n) return "arbitrary.." + n;
    }
  },
  f1 = (e) => {
    const { theme: t, prefix: n } = e,
      r = { nextPart: new Map(), validators: [] };
    return (
      m1(Object.entries(e.classGroups), n).forEach(([s, a]) => {
        Nc(a, r, s, t);
      }),
      r
    );
  },
  Nc = (e, t, n, r) => {
    e.forEach((o) => {
      if (typeof o == "string") {
        const s = o === "" ? t : Bf(t, o);
        s.classGroupId = n;
        return;
      }
      if (typeof o == "function") {
        if (p1(o)) {
          Nc(o(r), t, n, r);
          return;
        }
        t.validators.push({ validator: o, classGroupId: n });
        return;
      }
      Object.entries(o).forEach(([s, a]) => {
        Nc(a, Bf(t, s), n, r);
      });
    });
  },
  Bf = (e, t) => {
    let n = e;
    return (
      t.split($u).forEach((r) => {
        (n.nextPart.has(r) ||
          n.nextPart.set(r, { nextPart: new Map(), validators: [] }),
          (n = n.nextPart.get(r)));
      }),
      n
    );
  },
  p1 = (e) => e.isThemeGetter,
  m1 = (e, t) =>
    t
      ? e.map(([n, r]) => {
          const o = r.map((s) =>
            typeof s == "string"
              ? t + s
              : typeof s == "object"
                ? Object.fromEntries(
                    Object.entries(s).map(([a, i]) => [t + a, i]),
                  )
                : s,
          );
          return [n, o];
        })
      : e,
  h1 = (e) => {
    if (e < 1) return { get: () => {}, set: () => {} };
    let t = 0,
      n = new Map(),
      r = new Map();
    const o = (s, a) => {
      (n.set(s, a), t++, t > e && ((t = 0), (r = n), (n = new Map())));
    };
    return {
      get(s) {
        let a = n.get(s);
        if (a !== void 0) return a;
        if ((a = r.get(s)) !== void 0) return (o(s, a), a);
      },
      set(s, a) {
        n.has(s) ? n.set(s, a) : o(s, a);
      },
    };
  },
  eg = "!",
  g1 = (e) => {
    const { separator: t, experimentalParseClassName: n } = e,
      r = t.length === 1,
      o = t[0],
      s = t.length,
      a = (i) => {
        const c = [];
        let u = 0,
          d = 0,
          f;
        for (let k = 0; k < i.length; k++) {
          let h = i[k];
          if (u === 0) {
            if (h === o && (r || i.slice(k, k + s) === t)) {
              (c.push(i.slice(d, k)), (d = k + s));
              continue;
            }
            if (h === "/") {
              f = k;
              continue;
            }
          }
          h === "[" ? u++ : h === "]" && u--;
        }
        const m = c.length === 0 ? i : i.substring(d),
          y = m.startsWith(eg),
          w = y ? m.substring(1) : m,
          x = f && f > d ? f - d : void 0;
        return {
          modifiers: c,
          hasImportantModifier: y,
          baseClassName: w,
          maybePostfixModifierPosition: x,
        };
      };
    return n ? (i) => n({ className: i, parseClassName: a }) : a;
  },
  v1 = (e) => {
    if (e.length <= 1) return e;
    const t = [];
    let n = [];
    return (
      e.forEach((r) => {
        r[0] === "[" ? (t.push(...n.sort(), r), (n = [])) : n.push(r);
      }),
      t.push(...n.sort()),
      t
    );
  },
  x1 = (e) => ({ cache: h1(e.cacheSize), parseClassName: g1(e), ...u1(e) }),
  y1 = /\s+/,
  w1 = (e, t) => {
    const {
        parseClassName: n,
        getClassGroupId: r,
        getConflictingClassGroupIds: o,
      } = t,
      s = [],
      a = e.trim().split(y1);
    let i = "";
    for (let c = a.length - 1; c >= 0; c -= 1) {
      const u = a[c],
        {
          modifiers: d,
          hasImportantModifier: f,
          baseClassName: m,
          maybePostfixModifierPosition: y,
        } = n(u);
      let w = !!y,
        x = r(w ? m.substring(0, y) : m);
      if (!x) {
        if (!w) {
          i = u + (i.length > 0 ? " " + i : i);
          continue;
        }
        if (((x = r(m)), !x)) {
          i = u + (i.length > 0 ? " " + i : i);
          continue;
        }
        w = !1;
      }
      const k = v1(d).join(":"),
        h = f ? k + eg : k,
        g = h + x;
      if (s.includes(g)) continue;
      s.push(g);
      const v = o(x, w);
      for (let b = 0; b < v.length; ++b) {
        const S = v[b];
        s.push(h + S);
      }
      i = u + (i.length > 0 ? " " + i : i);
    }
    return i;
  };
function b1() {
  let e = 0,
    t,
    n,
    r = "";
  for (; e < arguments.length;)
    (t = arguments[e++]) && (n = tg(t)) && (r && (r += " "), (r += n));
  return r;
}
const tg = (e) => {
  if (typeof e == "string") return e;
  let t,
    n = "";
  for (let r = 0; r < e.length; r++)
    e[r] && (t = tg(e[r])) && (n && (n += " "), (n += t));
  return n;
};
function S1(e, ...t) {
  let n,
    r,
    o,
    s = a;
  function a(c) {
    const u = t.reduce((d, f) => f(d), e());
    return ((n = x1(u)), (r = n.cache.get), (o = n.cache.set), (s = i), i(c));
  }
  function i(c) {
    const u = r(c);
    if (u) return u;
    const d = w1(c, n);
    return (o(c, d), d);
  }
  return function () {
    return s(b1.apply(null, arguments));
  };
}
const ce = (e) => {
    const t = (n) => n[e] || [];
    return ((t.isThemeGetter = !0), t);
  },
  ng = /^\[(?:([a-z-]+):)?(.+)\]$/i,
  k1 = /^\d+\/\d+$/,
  N1 = new Set(["px", "full", "screen"]),
  C1 = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,
  E1 =
    /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,
  j1 = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/,
  R1 = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,
  _1 =
    /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/,
  Zt = (e) => $r(e) || N1.has(e) || k1.test(e),
  bn = (e) => oo(e, "length", L1),
  $r = (e) => !!e && !Number.isNaN(Number(e)),
  ui = (e) => oo(e, "number", $r),
  So = (e) => !!e && Number.isInteger(Number(e)),
  P1 = (e) => e.endsWith("%") && $r(e.slice(0, -1)),
  X = (e) => ng.test(e),
  Sn = (e) => C1.test(e),
  M1 = new Set(["length", "size", "percentage"]),
  A1 = (e) => oo(e, M1, rg),
  T1 = (e) => oo(e, "position", rg),
  D1 = new Set(["image", "url"]),
  O1 = (e) => oo(e, D1, z1),
  I1 = (e) => oo(e, "", $1),
  ko = () => !0,
  oo = (e, t, n) => {
    const r = ng.exec(e);
    return r
      ? r[1]
        ? typeof t == "string"
          ? r[1] === t
          : t.has(r[1])
        : n(r[2])
      : !1;
  },
  L1 = (e) => E1.test(e) && !j1.test(e),
  rg = () => !1,
  $1 = (e) => R1.test(e),
  z1 = (e) => _1.test(e),
  F1 = () => {
    const e = ce("colors"),
      t = ce("spacing"),
      n = ce("blur"),
      r = ce("brightness"),
      o = ce("borderColor"),
      s = ce("borderRadius"),
      a = ce("borderSpacing"),
      i = ce("borderWidth"),
      c = ce("contrast"),
      u = ce("grayscale"),
      d = ce("hueRotate"),
      f = ce("invert"),
      m = ce("gap"),
      y = ce("gradientColorStops"),
      w = ce("gradientColorStopPositions"),
      x = ce("inset"),
      k = ce("margin"),
      h = ce("opacity"),
      g = ce("padding"),
      v = ce("saturate"),
      b = ce("scale"),
      S = ce("sepia"),
      C = ce("skew"),
      N = ce("space"),
      E = ce("translate"),
      j = () => ["auto", "contain", "none"],
      R = () => ["auto", "hidden", "clip", "visible", "scroll"],
      M = () => ["auto", X, t],
      T = () => [X, t],
      D = () => ["", Zt, bn],
      B = () => ["auto", $r, X],
      Q = () => [
        "bottom",
        "center",
        "left",
        "left-bottom",
        "left-top",
        "right",
        "right-bottom",
        "right-top",
        "top",
      ],
      F = () => ["solid", "dashed", "dotted", "double", "none"],
      K = () => [
        "normal",
        "multiply",
        "screen",
        "overlay",
        "darken",
        "lighten",
        "color-dodge",
        "color-burn",
        "hard-light",
        "soft-light",
        "difference",
        "exclusion",
        "hue",
        "saturation",
        "color",
        "luminosity",
      ],
      _ = () => [
        "start",
        "end",
        "center",
        "between",
        "around",
        "evenly",
        "stretch",
      ],
      P = () => ["", "0", X],
      I = () => [
        "auto",
        "avoid",
        "all",
        "avoid-page",
        "page",
        "left",
        "right",
        "column",
      ],
      V = () => [$r, X];
    return {
      cacheSize: 500,
      separator: ":",
      theme: {
        colors: [ko],
        spacing: [Zt, bn],
        blur: ["none", "", Sn, X],
        brightness: V(),
        borderColor: [e],
        borderRadius: ["none", "", "full", Sn, X],
        borderSpacing: T(),
        borderWidth: D(),
        contrast: V(),
        grayscale: P(),
        hueRotate: V(),
        invert: P(),
        gap: T(),
        gradientColorStops: [e],
        gradientColorStopPositions: [P1, bn],
        inset: M(),
        margin: M(),
        opacity: V(),
        padding: T(),
        saturate: V(),
        scale: V(),
        sepia: P(),
        skew: V(),
        space: T(),
        translate: T(),
      },
      classGroups: {
        aspect: [{ aspect: ["auto", "square", "video", X] }],
        container: ["container"],
        columns: [{ columns: [Sn] }],
        "break-after": [{ "break-after": I() }],
        "break-before": [{ "break-before": I() }],
        "break-inside": [
          { "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"] },
        ],
        "box-decoration": [{ "box-decoration": ["slice", "clone"] }],
        box: [{ box: ["border", "content"] }],
        display: [
          "block",
          "inline-block",
          "inline",
          "flex",
          "inline-flex",
          "table",
          "inline-table",
          "table-caption",
          "table-cell",
          "table-column",
          "table-column-group",
          "table-footer-group",
          "table-header-group",
          "table-row-group",
          "table-row",
          "flow-root",
          "grid",
          "inline-grid",
          "contents",
          "list-item",
          "hidden",
        ],
        float: [{ float: ["right", "left", "none", "start", "end"] }],
        clear: [{ clear: ["left", "right", "both", "none", "start", "end"] }],
        isolation: ["isolate", "isolation-auto"],
        "object-fit": [
          { object: ["contain", "cover", "fill", "none", "scale-down"] },
        ],
        "object-position": [{ object: [...Q(), X] }],
        overflow: [{ overflow: R() }],
        "overflow-x": [{ "overflow-x": R() }],
        "overflow-y": [{ "overflow-y": R() }],
        overscroll: [{ overscroll: j() }],
        "overscroll-x": [{ "overscroll-x": j() }],
        "overscroll-y": [{ "overscroll-y": j() }],
        position: ["static", "fixed", "absolute", "relative", "sticky"],
        inset: [{ inset: [x] }],
        "inset-x": [{ "inset-x": [x] }],
        "inset-y": [{ "inset-y": [x] }],
        start: [{ start: [x] }],
        end: [{ end: [x] }],
        top: [{ top: [x] }],
        right: [{ right: [x] }],
        bottom: [{ bottom: [x] }],
        left: [{ left: [x] }],
        visibility: ["visible", "invisible", "collapse"],
        z: [{ z: ["auto", So, X] }],
        basis: [{ basis: M() }],
        "flex-direction": [
          { flex: ["row", "row-reverse", "col", "col-reverse"] },
        ],
        "flex-wrap": [{ flex: ["wrap", "wrap-reverse", "nowrap"] }],
        flex: [{ flex: ["1", "auto", "initial", "none", X] }],
        grow: [{ grow: P() }],
        shrink: [{ shrink: P() }],
        order: [{ order: ["first", "last", "none", So, X] }],
        "grid-cols": [{ "grid-cols": [ko] }],
        "col-start-end": [{ col: ["auto", { span: ["full", So, X] }, X] }],
        "col-start": [{ "col-start": B() }],
        "col-end": [{ "col-end": B() }],
        "grid-rows": [{ "grid-rows": [ko] }],
        "row-start-end": [{ row: ["auto", { span: [So, X] }, X] }],
        "row-start": [{ "row-start": B() }],
        "row-end": [{ "row-end": B() }],
        "grid-flow": [
          { "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"] },
        ],
        "auto-cols": [{ "auto-cols": ["auto", "min", "max", "fr", X] }],
        "auto-rows": [{ "auto-rows": ["auto", "min", "max", "fr", X] }],
        gap: [{ gap: [m] }],
        "gap-x": [{ "gap-x": [m] }],
        "gap-y": [{ "gap-y": [m] }],
        "justify-content": [{ justify: ["normal", ..._()] }],
        "justify-items": [
          { "justify-items": ["start", "end", "center", "stretch"] },
        ],
        "justify-self": [
          { "justify-self": ["auto", "start", "end", "center", "stretch"] },
        ],
        "align-content": [{ content: ["normal", ..._(), "baseline"] }],
        "align-items": [
          { items: ["start", "end", "center", "baseline", "stretch"] },
        ],
        "align-self": [
          { self: ["auto", "start", "end", "center", "stretch", "baseline"] },
        ],
        "place-content": [{ "place-content": [..._(), "baseline"] }],
        "place-items": [
          { "place-items": ["start", "end", "center", "baseline", "stretch"] },
        ],
        "place-self": [
          { "place-self": ["auto", "start", "end", "center", "stretch"] },
        ],
        p: [{ p: [g] }],
        px: [{ px: [g] }],
        py: [{ py: [g] }],
        ps: [{ ps: [g] }],
        pe: [{ pe: [g] }],
        pt: [{ pt: [g] }],
        pr: [{ pr: [g] }],
        pb: [{ pb: [g] }],
        pl: [{ pl: [g] }],
        m: [{ m: [k] }],
        mx: [{ mx: [k] }],
        my: [{ my: [k] }],
        ms: [{ ms: [k] }],
        me: [{ me: [k] }],
        mt: [{ mt: [k] }],
        mr: [{ mr: [k] }],
        mb: [{ mb: [k] }],
        ml: [{ ml: [k] }],
        "space-x": [{ "space-x": [N] }],
        "space-x-reverse": ["space-x-reverse"],
        "space-y": [{ "space-y": [N] }],
        "space-y-reverse": ["space-y-reverse"],
        w: [{ w: ["auto", "min", "max", "fit", "svw", "lvw", "dvw", X, t] }],
        "min-w": [{ "min-w": [X, t, "min", "max", "fit"] }],
        "max-w": [
          {
            "max-w": [
              X,
              t,
              "none",
              "full",
              "min",
              "max",
              "fit",
              "prose",
              { screen: [Sn] },
              Sn,
            ],
          },
        ],
        h: [{ h: [X, t, "auto", "min", "max", "fit", "svh", "lvh", "dvh"] }],
        "min-h": [
          { "min-h": [X, t, "min", "max", "fit", "svh", "lvh", "dvh"] },
        ],
        "max-h": [
          { "max-h": [X, t, "min", "max", "fit", "svh", "lvh", "dvh"] },
        ],
        size: [{ size: [X, t, "auto", "min", "max", "fit"] }],
        "font-size": [{ text: ["base", Sn, bn] }],
        "font-smoothing": ["antialiased", "subpixel-antialiased"],
        "font-style": ["italic", "not-italic"],
        "font-weight": [
          {
            font: [
              "thin",
              "extralight",
              "light",
              "normal",
              "medium",
              "semibold",
              "bold",
              "extrabold",
              "black",
              ui,
            ],
          },
        ],
        "font-family": [{ font: [ko] }],
        "fvn-normal": ["normal-nums"],
        "fvn-ordinal": ["ordinal"],
        "fvn-slashed-zero": ["slashed-zero"],
        "fvn-figure": ["lining-nums", "oldstyle-nums"],
        "fvn-spacing": ["proportional-nums", "tabular-nums"],
        "fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
        tracking: [
          {
            tracking: [
              "tighter",
              "tight",
              "normal",
              "wide",
              "wider",
              "widest",
              X,
            ],
          },
        ],
        "line-clamp": [{ "line-clamp": ["none", $r, ui] }],
        leading: [
          {
            leading: [
              "none",
              "tight",
              "snug",
              "normal",
              "relaxed",
              "loose",
              Zt,
              X,
            ],
          },
        ],
        "list-image": [{ "list-image": ["none", X] }],
        "list-style-type": [{ list: ["none", "disc", "decimal", X] }],
        "list-style-position": [{ list: ["inside", "outside"] }],
        "placeholder-color": [{ placeholder: [e] }],
        "placeholder-opacity": [{ "placeholder-opacity": [h] }],
        "text-alignment": [
          { text: ["left", "center", "right", "justify", "start", "end"] },
        ],
        "text-color": [{ text: [e] }],
        "text-opacity": [{ "text-opacity": [h] }],
        "text-decoration": [
          "underline",
          "overline",
          "line-through",
          "no-underline",
        ],
        "text-decoration-style": [{ decoration: [...F(), "wavy"] }],
        "text-decoration-thickness": [
          { decoration: ["auto", "from-font", Zt, bn] },
        ],
        "underline-offset": [{ "underline-offset": ["auto", Zt, X] }],
        "text-decoration-color": [{ decoration: [e] }],
        "text-transform": [
          "uppercase",
          "lowercase",
          "capitalize",
          "normal-case",
        ],
        "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
        "text-wrap": [{ text: ["wrap", "nowrap", "balance", "pretty"] }],
        indent: [{ indent: T() }],
        "vertical-align": [
          {
            align: [
              "baseline",
              "top",
              "middle",
              "bottom",
              "text-top",
              "text-bottom",
              "sub",
              "super",
              X,
            ],
          },
        ],
        whitespace: [
          {
            whitespace: [
              "normal",
              "nowrap",
              "pre",
              "pre-line",
              "pre-wrap",
              "break-spaces",
            ],
          },
        ],
        break: [{ break: ["normal", "words", "all", "keep"] }],
        hyphens: [{ hyphens: ["none", "manual", "auto"] }],
        content: [{ content: ["none", X] }],
        "bg-attachment": [{ bg: ["fixed", "local", "scroll"] }],
        "bg-clip": [{ "bg-clip": ["border", "padding", "content", "text"] }],
        "bg-opacity": [{ "bg-opacity": [h] }],
        "bg-origin": [{ "bg-origin": ["border", "padding", "content"] }],
        "bg-position": [{ bg: [...Q(), T1] }],
        "bg-repeat": [
          { bg: ["no-repeat", { repeat: ["", "x", "y", "round", "space"] }] },
        ],
        "bg-size": [{ bg: ["auto", "cover", "contain", A1] }],
        "bg-image": [
          {
            bg: [
              "none",
              { "gradient-to": ["t", "tr", "r", "br", "b", "bl", "l", "tl"] },
              O1,
            ],
          },
        ],
        "bg-color": [{ bg: [e] }],
        "gradient-from-pos": [{ from: [w] }],
        "gradient-via-pos": [{ via: [w] }],
        "gradient-to-pos": [{ to: [w] }],
        "gradient-from": [{ from: [y] }],
        "gradient-via": [{ via: [y] }],
        "gradient-to": [{ to: [y] }],
        rounded: [{ rounded: [s] }],
        "rounded-s": [{ "rounded-s": [s] }],
        "rounded-e": [{ "rounded-e": [s] }],
        "rounded-t": [{ "rounded-t": [s] }],
        "rounded-r": [{ "rounded-r": [s] }],
        "rounded-b": [{ "rounded-b": [s] }],
        "rounded-l": [{ "rounded-l": [s] }],
        "rounded-ss": [{ "rounded-ss": [s] }],
        "rounded-se": [{ "rounded-se": [s] }],
        "rounded-ee": [{ "rounded-ee": [s] }],
        "rounded-es": [{ "rounded-es": [s] }],
        "rounded-tl": [{ "rounded-tl": [s] }],
        "rounded-tr": [{ "rounded-tr": [s] }],
        "rounded-br": [{ "rounded-br": [s] }],
        "rounded-bl": [{ "rounded-bl": [s] }],
        "border-w": [{ border: [i] }],
        "border-w-x": [{ "border-x": [i] }],
        "border-w-y": [{ "border-y": [i] }],
        "border-w-s": [{ "border-s": [i] }],
        "border-w-e": [{ "border-e": [i] }],
        "border-w-t": [{ "border-t": [i] }],
        "border-w-r": [{ "border-r": [i] }],
        "border-w-b": [{ "border-b": [i] }],
        "border-w-l": [{ "border-l": [i] }],
        "border-opacity": [{ "border-opacity": [h] }],
        "border-style": [{ border: [...F(), "hidden"] }],
        "divide-x": [{ "divide-x": [i] }],
        "divide-x-reverse": ["divide-x-reverse"],
        "divide-y": [{ "divide-y": [i] }],
        "divide-y-reverse": ["divide-y-reverse"],
        "divide-opacity": [{ "divide-opacity": [h] }],
        "divide-style": [{ divide: F() }],
        "border-color": [{ border: [o] }],
        "border-color-x": [{ "border-x": [o] }],
        "border-color-y": [{ "border-y": [o] }],
        "border-color-s": [{ "border-s": [o] }],
        "border-color-e": [{ "border-e": [o] }],
        "border-color-t": [{ "border-t": [o] }],
        "border-color-r": [{ "border-r": [o] }],
        "border-color-b": [{ "border-b": [o] }],
        "border-color-l": [{ "border-l": [o] }],
        "divide-color": [{ divide: [o] }],
        "outline-style": [{ outline: ["", ...F()] }],
        "outline-offset": [{ "outline-offset": [Zt, X] }],
        "outline-w": [{ outline: [Zt, bn] }],
        "outline-color": [{ outline: [e] }],
        "ring-w": [{ ring: D() }],
        "ring-w-inset": ["ring-inset"],
        "ring-color": [{ ring: [e] }],
        "ring-opacity": [{ "ring-opacity": [h] }],
        "ring-offset-w": [{ "ring-offset": [Zt, bn] }],
        "ring-offset-color": [{ "ring-offset": [e] }],
        shadow: [{ shadow: ["", "inner", "none", Sn, I1] }],
        "shadow-color": [{ shadow: [ko] }],
        opacity: [{ opacity: [h] }],
        "mix-blend": [{ "mix-blend": [...K(), "plus-lighter", "plus-darker"] }],
        "bg-blend": [{ "bg-blend": K() }],
        filter: [{ filter: ["", "none"] }],
        blur: [{ blur: [n] }],
        brightness: [{ brightness: [r] }],
        contrast: [{ contrast: [c] }],
        "drop-shadow": [{ "drop-shadow": ["", "none", Sn, X] }],
        grayscale: [{ grayscale: [u] }],
        "hue-rotate": [{ "hue-rotate": [d] }],
        invert: [{ invert: [f] }],
        saturate: [{ saturate: [v] }],
        sepia: [{ sepia: [S] }],
        "backdrop-filter": [{ "backdrop-filter": ["", "none"] }],
        "backdrop-blur": [{ "backdrop-blur": [n] }],
        "backdrop-brightness": [{ "backdrop-brightness": [r] }],
        "backdrop-contrast": [{ "backdrop-contrast": [c] }],
        "backdrop-grayscale": [{ "backdrop-grayscale": [u] }],
        "backdrop-hue-rotate": [{ "backdrop-hue-rotate": [d] }],
        "backdrop-invert": [{ "backdrop-invert": [f] }],
        "backdrop-opacity": [{ "backdrop-opacity": [h] }],
        "backdrop-saturate": [{ "backdrop-saturate": [v] }],
        "backdrop-sepia": [{ "backdrop-sepia": [S] }],
        "border-collapse": [{ border: ["collapse", "separate"] }],
        "border-spacing": [{ "border-spacing": [a] }],
        "border-spacing-x": [{ "border-spacing-x": [a] }],
        "border-spacing-y": [{ "border-spacing-y": [a] }],
        "table-layout": [{ table: ["auto", "fixed"] }],
        caption: [{ caption: ["top", "bottom"] }],
        transition: [
          {
            transition: [
              "none",
              "all",
              "",
              "colors",
              "opacity",
              "shadow",
              "transform",
              X,
            ],
          },
        ],
        duration: [{ duration: V() }],
        ease: [{ ease: ["linear", "in", "out", "in-out", X] }],
        delay: [{ delay: V() }],
        animate: [{ animate: ["none", "spin", "ping", "pulse", "bounce", X] }],
        transform: [{ transform: ["", "gpu", "none"] }],
        scale: [{ scale: [b] }],
        "scale-x": [{ "scale-x": [b] }],
        "scale-y": [{ "scale-y": [b] }],
        rotate: [{ rotate: [So, X] }],
        "translate-x": [{ "translate-x": [E] }],
        "translate-y": [{ "translate-y": [E] }],
        "skew-x": [{ "skew-x": [C] }],
        "skew-y": [{ "skew-y": [C] }],
        "transform-origin": [
          {
            origin: [
              "center",
              "top",
              "top-right",
              "right",
              "bottom-right",
              "bottom",
              "bottom-left",
              "left",
              "top-left",
              X,
            ],
          },
        ],
        accent: [{ accent: ["auto", e] }],
        appearance: [{ appearance: ["none", "auto"] }],
        cursor: [
          {
            cursor: [
              "auto",
              "default",
              "pointer",
              "wait",
              "text",
              "move",
              "help",
              "not-allowed",
              "none",
              "context-menu",
              "progress",
              "cell",
              "crosshair",
              "vertical-text",
              "alias",
              "copy",
              "no-drop",
              "grab",
              "grabbing",
              "all-scroll",
              "col-resize",
              "row-resize",
              "n-resize",
              "e-resize",
              "s-resize",
              "w-resize",
              "ne-resize",
              "nw-resize",
              "se-resize",
              "sw-resize",
              "ew-resize",
              "ns-resize",
              "nesw-resize",
              "nwse-resize",
              "zoom-in",
              "zoom-out",
              X,
            ],
          },
        ],
        "caret-color": [{ caret: [e] }],
        "pointer-events": [{ "pointer-events": ["none", "auto"] }],
        resize: [{ resize: ["none", "y", "x", ""] }],
        "scroll-behavior": [{ scroll: ["auto", "smooth"] }],
        "scroll-m": [{ "scroll-m": T() }],
        "scroll-mx": [{ "scroll-mx": T() }],
        "scroll-my": [{ "scroll-my": T() }],
        "scroll-ms": [{ "scroll-ms": T() }],
        "scroll-me": [{ "scroll-me": T() }],
        "scroll-mt": [{ "scroll-mt": T() }],
        "scroll-mr": [{ "scroll-mr": T() }],
        "scroll-mb": [{ "scroll-mb": T() }],
        "scroll-ml": [{ "scroll-ml": T() }],
        "scroll-p": [{ "scroll-p": T() }],
        "scroll-px": [{ "scroll-px": T() }],
        "scroll-py": [{ "scroll-py": T() }],
        "scroll-ps": [{ "scroll-ps": T() }],
        "scroll-pe": [{ "scroll-pe": T() }],
        "scroll-pt": [{ "scroll-pt": T() }],
        "scroll-pr": [{ "scroll-pr": T() }],
        "scroll-pb": [{ "scroll-pb": T() }],
        "scroll-pl": [{ "scroll-pl": T() }],
        "snap-align": [{ snap: ["start", "end", "center", "align-none"] }],
        "snap-stop": [{ snap: ["normal", "always"] }],
        "snap-type": [{ snap: ["none", "x", "y", "both"] }],
        "snap-strictness": [{ snap: ["mandatory", "proximity"] }],
        touch: [{ touch: ["auto", "none", "manipulation"] }],
        "touch-x": [{ "touch-pan": ["x", "left", "right"] }],
        "touch-y": [{ "touch-pan": ["y", "up", "down"] }],
        "touch-pz": ["touch-pinch-zoom"],
        select: [{ select: ["none", "text", "all", "auto"] }],
        "will-change": [
          { "will-change": ["auto", "scroll", "contents", "transform", X] },
        ],
        fill: [{ fill: [e, "none"] }],
        "stroke-w": [{ stroke: [Zt, bn, ui] }],
        stroke: [{ stroke: [e, "none"] }],
        sr: ["sr-only", "not-sr-only"],
        "forced-color-adjust": [{ "forced-color-adjust": ["auto", "none"] }],
      },
      conflictingClassGroups: {
        overflow: ["overflow-x", "overflow-y"],
        overscroll: ["overscroll-x", "overscroll-y"],
        inset: [
          "inset-x",
          "inset-y",
          "start",
          "end",
          "top",
          "right",
          "bottom",
          "left",
        ],
        "inset-x": ["right", "left"],
        "inset-y": ["top", "bottom"],
        flex: ["basis", "grow", "shrink"],
        gap: ["gap-x", "gap-y"],
        p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"],
        px: ["pr", "pl"],
        py: ["pt", "pb"],
        m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"],
        mx: ["mr", "ml"],
        my: ["mt", "mb"],
        size: ["w", "h"],
        "font-size": ["leading"],
        "fvn-normal": [
          "fvn-ordinal",
          "fvn-slashed-zero",
          "fvn-figure",
          "fvn-spacing",
          "fvn-fraction",
        ],
        "fvn-ordinal": ["fvn-normal"],
        "fvn-slashed-zero": ["fvn-normal"],
        "fvn-figure": ["fvn-normal"],
        "fvn-spacing": ["fvn-normal"],
        "fvn-fraction": ["fvn-normal"],
        "line-clamp": ["display", "overflow"],
        rounded: [
          "rounded-s",
          "rounded-e",
          "rounded-t",
          "rounded-r",
          "rounded-b",
          "rounded-l",
          "rounded-ss",
          "rounded-se",
          "rounded-ee",
          "rounded-es",
          "rounded-tl",
          "rounded-tr",
          "rounded-br",
          "rounded-bl",
        ],
        "rounded-s": ["rounded-ss", "rounded-es"],
        "rounded-e": ["rounded-se", "rounded-ee"],
        "rounded-t": ["rounded-tl", "rounded-tr"],
        "rounded-r": ["rounded-tr", "rounded-br"],
        "rounded-b": ["rounded-br", "rounded-bl"],
        "rounded-l": ["rounded-tl", "rounded-bl"],
        "border-spacing": ["border-spacing-x", "border-spacing-y"],
        "border-w": [
          "border-w-s",
          "border-w-e",
          "border-w-t",
          "border-w-r",
          "border-w-b",
          "border-w-l",
        ],
        "border-w-x": ["border-w-r", "border-w-l"],
        "border-w-y": ["border-w-t", "border-w-b"],
        "border-color": [
          "border-color-s",
          "border-color-e",
          "border-color-t",
          "border-color-r",
          "border-color-b",
          "border-color-l",
        ],
        "border-color-x": ["border-color-r", "border-color-l"],
        "border-color-y": ["border-color-t", "border-color-b"],
        "scroll-m": [
          "scroll-mx",
          "scroll-my",
          "scroll-ms",
          "scroll-me",
          "scroll-mt",
          "scroll-mr",
          "scroll-mb",
          "scroll-ml",
        ],
        "scroll-mx": ["scroll-mr", "scroll-ml"],
        "scroll-my": ["scroll-mt", "scroll-mb"],
        "scroll-p": [
          "scroll-px",
          "scroll-py",
          "scroll-ps",
          "scroll-pe",
          "scroll-pt",
          "scroll-pr",
          "scroll-pb",
          "scroll-pl",
        ],
        "scroll-px": ["scroll-pr", "scroll-pl"],
        "scroll-py": ["scroll-pt", "scroll-pb"],
        touch: ["touch-x", "touch-y", "touch-pz"],
        "touch-x": ["touch"],
        "touch-y": ["touch"],
        "touch-pz": ["touch"],
      },
      conflictingClassGroupModifiers: { "font-size": ["leading"] },
    };
  },
  B1 = S1(F1);
function H(...e) {
  return B1(Jh(e));
}
const U1 = gs(
    "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
    {
      variants: {
        variant: {
          default: "bg-background text-foreground",
          success:
            "border-emerald-200 bg-emerald-50 text-emerald-900 [&>svg]:text-emerald-700",
          destructive:
            "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        },
      },
      defaultVariants: { variant: "default" },
    },
  ),
  ya = p.forwardRef(({ className: e, variant: t, ...n }, r) =>
    l.jsx("div", {
      ref: r,
      role: "alert",
      className: H(U1({ variant: t }), e),
      ...n,
    }),
  );
ya.displayName = "Alert";
const W1 = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx("h5", {
    ref: n,
    className: H("mb-1 font-medium leading-none tracking-tight", e),
    ...t,
  }),
);
W1.displayName = "AlertTitle";
const V1 = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx("div", {
    ref: n,
    className: H("text-sm [&_p]:leading-relaxed", e),
    ...t,
  }),
);
V1.displayName = "AlertDescription";
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const og = (...e) =>
  e
    .filter((t, n, r) => !!t && t.trim() !== "" && r.indexOf(t) === n)
    .join(" ")
    .trim();
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const H1 = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const K1 = (e) =>
  e.replace(/^([A-Z])|[\s-_]+(\w)/g, (t, n, r) =>
    r ? r.toUpperCase() : n.toLowerCase(),
  );
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Uf = (e) => {
  const t = K1(e);
  return t.charAt(0).toUpperCase() + t.slice(1);
};
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var di = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const G1 = (e) => {
    for (const t in e)
      if (t.startsWith("aria-") || t === "role" || t === "title") return !0;
    return !1;
  },
  Y1 = p.createContext({}),
  X1 = () => p.useContext(Y1),
  Q1 = p.forwardRef(
    (
      {
        color: e,
        size: t,
        strokeWidth: n,
        absoluteStrokeWidth: r,
        className: o = "",
        children: s,
        iconNode: a,
        ...i
      },
      c,
    ) => {
      const {
          size: u = 24,
          strokeWidth: d = 2,
          absoluteStrokeWidth: f = !1,
          color: m = "currentColor",
          className: y = "",
        } = X1() ?? {},
        w = (r ?? f) ? (Number(n ?? d) * 24) / Number(t ?? u) : (n ?? d);
      return p.createElement(
        "svg",
        {
          ref: c,
          ...di,
          width: t ?? u ?? di.width,
          height: t ?? u ?? di.height,
          stroke: e ?? m,
          strokeWidth: w,
          className: og("lucide", y, o),
          ...(!s && !G1(i) && { "aria-hidden": "true" }),
          ...i,
        },
        [
          ...a.map(([x, k]) => p.createElement(x, k)),
          ...(Array.isArray(s) ? s : [s]),
        ],
      );
    },
  );
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const q = (e, t) => {
  const n = p.forwardRef(({ className: r, ...o }, s) =>
    p.createElement(Q1, {
      ref: s,
      iconNode: t,
      className: og(`lucide-${H1(Uf(e))}`, `lucide-${e}`, r),
      ...o,
    }),
  );
  return ((n.displayName = Uf(e)), n);
};
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const q1 = [
    [
      "path",
      {
        d: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
        key: "169zse",
      },
    ],
  ],
  Fn = q("activity", q1);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const J1 = [
    ["path", { d: "M10.268 21a2 2 0 0 0 3.464 0", key: "vwvbt9" }],
    [
      "path",
      {
        d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",
        key: "11g9vi",
      },
    ],
  ],
  Z1 = q("bell", J1);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const eb = [
    ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16", key: "c24i48" }],
    ["path", { d: "M18 17V9", key: "2bz60n" }],
    ["path", { d: "M13 17V5", key: "1frdt8" }],
    ["path", { d: "M8 17v-3", key: "17ska0" }],
  ],
  tb = q("chart-column", eb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const nb = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]],
  rb = q("check", nb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const ob = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]],
  sb = q("chevron-right", ob);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const lb = [
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }],
  ],
  ab = q("circle-check", lb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const ib = [
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
    ["path", { d: "M12 17h.01", key: "p32p05" }],
  ],
  cb = q("circle-question-mark", ib);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const ub = [
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ["circle", { cx: "12", cy: "10", r: "3", key: "ilqhr7" }],
    [
      "path",
      { d: "M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662", key: "154egf" },
    ],
  ],
  db = q("circle-user", ub);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const fb = [["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }]],
  pb = q("circle", fb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const mb = [
    [
      "rect",
      {
        width: "8",
        height: "4",
        x: "8",
        y: "2",
        rx: "1",
        ry: "1",
        key: "tgr4d6",
      },
    ],
    [
      "path",
      {
        d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
        key: "116196",
      },
    ],
    ["path", { d: "M12 11h4", key: "1jrz19" }],
    ["path", { d: "M12 16h4", key: "n85exb" }],
    ["path", { d: "M8 11h.01", key: "1dfujw" }],
    ["path", { d: "M8 16h.01", key: "18s6g9" }],
  ],
  hb = q("clipboard-list", mb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const gb = [
    [
      "rect",
      {
        width: "8",
        height: "4",
        x: "8",
        y: "2",
        rx: "1",
        ry: "1",
        key: "tgr4d6",
      },
    ],
    [
      "path",
      {
        d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
        key: "116196",
      },
    ],
  ],
  Wf = q("clipboard", gb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const vb = [
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ["path", { d: "M12 6v6h4", key: "135r8i" }],
  ],
  sg = q("clock-3", vb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const xb = [
    ["path", { d: "M12 13v8l-4-4", key: "1f5nwf" }],
    ["path", { d: "m12 21 4-4", key: "1lfcce" }],
    [
      "path",
      {
        d: "M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284",
        key: "ui1hmy",
      },
    ],
  ],
  yb = q("cloud-download", xb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const wb = [
    [
      "rect",
      {
        width: "14",
        height: "14",
        x: "8",
        y: "8",
        rx: "2",
        ry: "2",
        key: "17jyea",
      },
    ],
    [
      "path",
      {
        d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
        key: "zix9uf",
      },
    ],
  ],
  Cc = q("copy", wb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const bb = [
    ["path", { d: "M12 20v2", key: "1lh1kg" }],
    ["path", { d: "M12 2v2", key: "tus03m" }],
    ["path", { d: "M17 20v2", key: "1rnc9c" }],
    ["path", { d: "M17 2v2", key: "11trls" }],
    ["path", { d: "M2 12h2", key: "1t8f8n" }],
    ["path", { d: "M2 17h2", key: "7oei6x" }],
    ["path", { d: "M2 7h2", key: "asdhe0" }],
    ["path", { d: "M20 12h2", key: "1q8mjw" }],
    ["path", { d: "M20 17h2", key: "1fpfkl" }],
    ["path", { d: "M20 7h2", key: "1o8tra" }],
    ["path", { d: "M7 20v2", key: "4gnj0m" }],
    ["path", { d: "M7 2v2", key: "1i4yhu" }],
    [
      "rect",
      { x: "4", y: "4", width: "16", height: "16", rx: "2", key: "1vbyd7" },
    ],
    [
      "rect",
      { x: "8", y: "8", width: "8", height: "8", rx: "1", key: "z9xiuo" },
    ],
  ],
  Sb = q("cpu", bb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const kb = [
    ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
    ["circle", { cx: "19", cy: "12", r: "1", key: "1wjl8i" }],
    ["circle", { cx: "5", cy: "12", r: "1", key: "1pcz8c" }],
  ],
  lg = q("ellipsis", kb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Nb = [
    [
      "path",
      {
        d: "M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2",
        key: "18mbvz",
      },
    ],
    ["path", { d: "M6.453 15h11.094", key: "3shlmq" }],
    ["path", { d: "M8.5 2h7", key: "csnxdl" }],
  ],
  Cb = q("flask-conical", Nb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Eb = [
    ["path", { d: "m12 14 4-4", key: "9kzdfg" }],
    ["path", { d: "M3.34 19a10 10 0 1 1 17.32 0", key: "19p75a" }],
  ],
  jb = q("gauge", Eb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Rb = [
    ["path", { d: "M10 16h.01", key: "1bzywj" }],
    [
      "path",
      {
        d: "M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
        key: "18tbho",
      },
    ],
    ["path", { d: "M21.946 12.013H2.054", key: "zqlbp7" }],
    ["path", { d: "M6 16h.01", key: "1pmjb7" }],
  ],
  _b = q("hard-drive", Rb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Pb = [
    [
      "path",
      { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" },
    ],
    ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
    ["path", { d: "M12 7v5l4 2", key: "1fdv2h" }],
  ],
  Mb = q("history", Pb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Ab = [
    [
      "path",
      {
        d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",
        key: "1s6t7t",
      },
    ],
    [
      "circle",
      { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor", key: "w0ekpg" },
    ],
  ],
  vl = q("key-round", Ab);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Tb = [
    ["path", { d: "m16 17 5-5-5-5", key: "1bji2h" }],
    ["path", { d: "M21 12H9", key: "dn1m92" }],
    ["path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", key: "1uf3rs" }],
  ],
  Db = q("log-out", Tb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Ob = [
    [
      "path",
      {
        d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
        key: "1r0f0z",
      },
    ],
    ["circle", { cx: "12", cy: "10", r: "3", key: "ilqhr7" }],
  ],
  Ib = q("map-pin", Ob);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Lb = [
    ["path", { d: "M12 12v-2", key: "fwoke6" }],
    ["path", { d: "M12 18v-2", key: "qj6yno" }],
    ["path", { d: "M16 12v-2", key: "heuere" }],
    ["path", { d: "M16 18v-2", key: "s1ct0w" }],
    ["path", { d: "M2 11h1.5", key: "15p63e" }],
    ["path", { d: "M20 18v-2", key: "12ehxp" }],
    ["path", { d: "M20.5 11H22", key: "khsy7a" }],
    ["path", { d: "M4 18v-2", key: "1c3oqr" }],
    ["path", { d: "M8 12v-2", key: "1mwtfd" }],
    ["path", { d: "M8 18v-2", key: "qcmpov" }],
    [
      "rect",
      { x: "2", y: "6", width: "20", height: "10", rx: "2", key: "1qcswk" },
    ],
  ],
  $b = q("memory-stick", Lb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const zb = [
    ["path", { d: "M4 5h16", key: "1tepv9" }],
    ["path", { d: "M4 12h16", key: "1lakjw" }],
    ["path", { d: "M4 19h16", key: "1djgab" }],
  ],
  Fb = q("menu", zb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Bb = [
    [
      "rect",
      { x: "16", y: "16", width: "6", height: "6", rx: "1", key: "4q2zg0" },
    ],
    [
      "rect",
      { x: "2", y: "16", width: "6", height: "6", rx: "1", key: "8cvhb9" },
    ],
    [
      "rect",
      { x: "9", y: "2", width: "6", height: "6", rx: "1", key: "1egb70" },
    ],
    ["path", { d: "M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3", key: "1jsf9p" }],
    ["path", { d: "M12 12V8", key: "2874zd" }],
  ],
  Ub = q("network", Bb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Wb = [
    ["path", { d: "M13 21h8", key: "1jsn5i" }],
    [
      "path",
      {
        d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
        key: "1a8usu",
      },
    ],
  ],
  Vb = q("pen-line", Wb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Hb = [
    [
      "path",
      {
        d: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z",
        key: "10ikf1",
      },
    ],
  ],
  Kb = q("play", Hb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Gb = [
    [
      "path",
      {
        d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
        key: "v9h5vc",
      },
    ],
    ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
    [
      "path",
      {
        d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
        key: "3uifl3",
      },
    ],
    ["path", { d: "M8 16H3v5", key: "1cv678" }],
  ],
  Yb = q("refresh-cw", Gb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Xb = [
    [
      "path",
      { d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8", key: "1p45f6" },
    ],
    ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
  ],
  Qb = q("rotate-cw", Xb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const qb = [
    ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
    ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ],
  Jb = q("search", qb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Zb = [
    ["path", { d: "m10.852 14.772-.383.923", key: "11vil6" }],
    [
      "path",
      { d: "M13.148 14.772a3 3 0 1 0-2.296-5.544l-.383-.923", key: "1v3clb" },
    ],
    ["path", { d: "m13.148 9.228.383-.923", key: "t2zzyc" }],
    [
      "path",
      { d: "m13.53 15.696-.382-.924a3 3 0 1 1-2.296-5.544", key: "1bxfiv" },
    ],
    ["path", { d: "m14.772 10.852.923-.383", key: "k9m8cz" }],
    ["path", { d: "m14.772 13.148.923.383", key: "1xvhww" }],
    [
      "path",
      {
        d: "M4.5 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-.5",
        key: "tn8das",
      },
    ],
    [
      "path",
      {
        d: "M4.5 14H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-.5",
        key: "1g2pve",
      },
    ],
    ["path", { d: "M6 18h.01", key: "uhywen" }],
    ["path", { d: "M6 6h.01", key: "1utrut" }],
    ["path", { d: "m9.228 10.852-.923-.383", key: "1wtb30" }],
    ["path", { d: "m9.228 13.148-.923.383", key: "1a830x" }],
  ],
  eS = q("server-cog", Zb);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const tS = [
    [
      "rect",
      {
        width: "20",
        height: "8",
        x: "2",
        y: "2",
        rx: "2",
        ry: "2",
        key: "ngkwjq",
      },
    ],
    [
      "rect",
      {
        width: "20",
        height: "8",
        x: "2",
        y: "14",
        rx: "2",
        ry: "2",
        key: "iecqi9",
      },
    ],
    ["line", { x1: "6", x2: "6.01", y1: "6", y2: "6", key: "16zg32" }],
    ["line", { x1: "6", x2: "6.01", y1: "18", y2: "18", key: "nzw8ys" }],
  ],
  Xr = q("server", tS);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const nS = [
    [
      "path",
      {
        d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
        key: "1i5ecw",
      },
    ],
    ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }],
  ],
  ag = q("settings", nS);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const rS = [
    [
      "path",
      {
        d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
        key: "oel41y",
      },
    ],
    ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }],
  ],
  ls = q("shield-check", rS);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const oS = [
    [
      "path",
      {
        d: "M11 22c-3.806-1.45-7-3.966-7-9V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1v4",
        key: "hf1sz5",
      },
    ],
    ["path", { d: "M14.923 16.547 14 16.164", key: "41f878" }],
    ["path", { d: "m14.923 18.843-.923.383", key: "82rvv5" }],
    ["path", { d: "M16.547 14.923 16.164 14", key: "1r7ypn" }],
    ["path", { d: "m16.547 20.467-.383.924", key: "au4kyj" }],
    ["path", { d: "m18.843 14.923.383-.923", key: "1cbrwq" }],
    ["path", { d: "m19.225 21.391-.382-.924", key: "1u2bh9" }],
    ["path", { d: "m20.467 16.547.923-.383", key: "cprboc" }],
    ["path", { d: "m20.467 18.843.923.383", key: "inm8l2" }],
    ["circle", { cx: "17.695", cy: "17.695", r: "3", key: "1i1rmh" }],
  ],
  sS = q("shield-cog-corner", oS);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const lS = [
    ["path", { d: "m7 11 2-2-2-2", key: "1lz0vl" }],
    ["path", { d: "M11 13h4", key: "1p7l4v" }],
    [
      "rect",
      {
        width: "18",
        height: "18",
        x: "3",
        y: "3",
        rx: "2",
        ry: "2",
        key: "1m3agn",
      },
    ],
  ],
  zu = q("square-terminal", lS);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const aS = [
    ["path", { d: "M10 11v6", key: "nco0om" }],
    ["path", { d: "M14 11v6", key: "outv1u" }],
    ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", key: "miytrc" }],
    ["path", { d: "M3 6h18", key: "d0wm0j" }],
    ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", key: "e791ji" }],
  ],
  ig = q("trash-2", aS);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const iS = [
    [
      "path",
      {
        d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
        key: "wmoenq",
      },
    ],
    ["path", { d: "M12 9v4", key: "juzpu7" }],
    ["path", { d: "M12 17h.01", key: "p32p05" }],
  ],
  cg = q("triangle-alert", iS);
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const cS = [
    ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
    ["path", { d: "m6 6 12 12", key: "d8bk6v" }],
  ],
  ug = q("x", cS);
function mn(e, t = []) {
  let n = [];
  function r(s, a) {
    const i = p.createContext(a);
    i.displayName = s + "Context";
    const c = n.length;
    n = [...n, a];
    const u = (f) => {
      var h;
      const { scope: m, children: y, ...w } = f,
        x = ((h = m == null ? void 0 : m[e]) == null ? void 0 : h[c]) || i,
        k = p.useMemo(() => w, Object.values(w));
      return l.jsx(x.Provider, { value: k, children: y });
    };
    u.displayName = s + "Provider";
    function d(f, m) {
      var x;
      const y = ((x = m == null ? void 0 : m[e]) == null ? void 0 : x[c]) || i,
        w = p.useContext(y);
      if (w) return w;
      if (a !== void 0) return a;
      throw new Error(`\`${f}\` must be used within \`${s}\``);
    }
    return [u, d];
  }
  const o = () => {
    const s = n.map((a) => p.createContext(a));
    return function (i) {
      const c = (i == null ? void 0 : i[e]) || s;
      return p.useMemo(() => ({ [`__scope${e}`]: { ...i, [e]: c } }), [i, c]);
    };
  };
  return ((o.scopeName = e), [r, uS(o, ...t)]);
}
function uS(...e) {
  const t = e[0];
  if (e.length === 1) return t;
  const n = () => {
    const r = e.map((o) => ({ useScope: o(), scopeName: o.scopeName }));
    return function (s) {
      const a = r.reduce((i, { useScope: c, scopeName: u }) => {
        const f = c(s)[`__scope${u}`];
        return { ...i, ...f };
      }, {});
      return p.useMemo(() => ({ [`__scope${t.scopeName}`]: a }), [a]);
    };
  };
  return ((n.scopeName = t.scopeName), n);
}
function be(e) {
  const t = p.useRef(e);
  return (
    p.useEffect(() => {
      t.current = e;
    }),
    p.useMemo(
      () =>
        (...n) => {
          var r;
          return (r = t.current) == null ? void 0 : r.call(t, ...n);
        },
      [],
    )
  );
}
var et =
  globalThis != null && globalThis.document ? p.useLayoutEffect : () => {};
function Vf(e, t) {
  if (typeof e == "function") return e(t);
  e != null && (e.current = t);
}
function Fu(...e) {
  return (t) => {
    let n = !1;
    const r = e.map((o) => {
      const s = Vf(o, t);
      return (!n && typeof s == "function" && (n = !0), s);
    });
    if (n)
      return () => {
        for (let o = 0; o < r.length; o++) {
          const s = r[o];
          typeof s == "function" ? s() : Vf(e[o], null);
        }
      };
  };
}
function le(...e) {
  return p.useCallback(Fu(...e), e);
}
function cr(e) {
  const t = p.forwardRef((n, r) => {
    let { children: o, ...s } = n,
      a = null,
      i = !1;
    const c = [];
    (Hf(o) && typeof Ks == "function" && (o = Ks(o._payload)),
      p.Children.forEach(o, (m) => {
        var y;
        if (gS(m)) {
          i = !0;
          const w = m;
          let x = "child" in w.props ? w.props.child : w.props.children;
          (Hf(x) && typeof Ks == "function" && (x = Ks(x._payload)),
            (a = pS(w, x)),
            c.push(
              (y = a == null ? void 0 : a.props) == null ? void 0 : y.children,
            ));
        } else c.push(m);
      }),
      a
        ? (a = p.cloneElement(a, void 0, c))
        : !i && p.Children.count(o) === 1 && p.isValidElement(o) && (a = o));
    const u = a ? hS(a) : void 0,
      d = le(r, u);
    if (!a) {
      if (o || o === 0) throw new Error(i ? wS(e) : yS(e));
      return o;
    }
    const f = mS(s, a.props ?? {});
    return (a.type !== p.Fragment && (f.ref = r ? d : u), p.cloneElement(a, f));
  });
  return ((t.displayName = `${e}.Slot`), t);
}
var dS = cr("Slot"),
  fS = Symbol.for("radix.slottable"),
  pS = (e, t) => {
    if ("child" in e.props) {
      const n = e.props.child;
      return p.isValidElement(n)
        ? p.cloneElement(n, void 0, e.props.children(n.props.children))
        : null;
    }
    return p.isValidElement(t) ? t : null;
  };
function mS(e, t) {
  const n = { ...t };
  for (const r in t) {
    const o = e[r],
      s = t[r];
    /^on[A-Z]/.test(r)
      ? o && s
        ? (n[r] = (...i) => {
            const c = s(...i);
            return (o(...i), c);
          })
        : o && (n[r] = o)
      : r === "style"
        ? (n[r] = { ...o, ...s })
        : r === "className" && (n[r] = [o, s].filter(Boolean).join(" "));
  }
  return { ...e, ...n };
}
function hS(e) {
  var r, o;
  let t =
      (r = Object.getOwnPropertyDescriptor(e.props, "ref")) == null
        ? void 0
        : r.get,
    n = t && "isReactWarning" in t && t.isReactWarning;
  return n
    ? e.ref
    : ((t =
        (o = Object.getOwnPropertyDescriptor(e, "ref")) == null
          ? void 0
          : o.get),
      (n = t && "isReactWarning" in t && t.isReactWarning),
      n ? e.props.ref : e.props.ref || e.ref);
}
function gS(e) {
  return (
    p.isValidElement(e) &&
    typeof e.type == "function" &&
    "__radixId" in e.type &&
    e.type.__radixId === fS
  );
}
var vS = Symbol.for("react.lazy");
function Hf(e) {
  return (
    e != null &&
    typeof e == "object" &&
    "$$typeof" in e &&
    e.$$typeof === vS &&
    "_payload" in e &&
    xS(e._payload)
  );
}
function xS(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
var yS = (e) =>
    `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`,
  wS = (e) =>
    `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`,
  Ks = ds[" use ".trim().toString()],
  bS = [
    "a",
    "button",
    "div",
    "form",
    "h2",
    "h3",
    "img",
    "input",
    "label",
    "li",
    "nav",
    "ol",
    "p",
    "select",
    "span",
    "svg",
    "ul",
  ],
  pe = bS.reduce((e, t) => {
    const n = cr(`Primitive.${t}`),
      r = p.forwardRef((o, s) => {
        const { asChild: a, ...i } = o,
          c = a ? n : t;
        return (
          typeof window < "u" && (window[Symbol.for("radix-ui")] = !0),
          l.jsx(c, { ...i, ref: s })
        );
      });
    return ((r.displayName = `Primitive.${t}`), { ...e, [t]: r });
  }, {});
function dg(e, t) {
  e && ro.flushSync(() => e.dispatchEvent(t));
}
var Bu = "Avatar",
  [SS] = mn(Bu),
  kS = [0, () => {}],
  [NS, fg] = SS(Bu),
  Uu = p.forwardRef((e, t) => {
    const { __scopeAvatar: n, ...r } = e,
      [o, s] = p.useState("idle"),
      [a, i] = ES();
    return l.jsx(NS, {
      scope: n,
      imageLoadingStatus: o,
      setImageLoadingStatus: s,
      imageCount: a,
      setImageCount: i,
      children: l.jsx(pe.span, { ...r, ref: t }),
    });
  });
Uu.displayName = Bu;
var pg = "AvatarImage",
  Wu = p.forwardRef((e, t) => {
    const { __scopeAvatar: n, src: r, onLoadingStatusChange: o, ...s } = e,
      a = fg(pg, n);
    jS(a.setImageCount);
    const i = CS(r, {
        referrerPolicy: s.referrerPolicy,
        crossOrigin: s.crossOrigin,
        loadingStatus: a.imageLoadingStatus,
        setLoadingStatus: a.setImageLoadingStatus,
      }),
      c = be((d) => {
        o == null || o(d);
      }),
      u = p.useRef(i);
    return (
      et(() => {
        const d = u.current;
        ((u.current = i), i !== d && c(i));
      }, [i, c]),
      i === "loaded" ? l.jsx(pe.img, { ...s, ref: t, src: r }) : null
    );
  });
Wu.displayName = pg;
var mg = "AvatarFallback",
  Vu = p.forwardRef((e, t) => {
    const { __scopeAvatar: n, delayMs: r, ...o } = e,
      s = fg(mg, n),
      [a, i] = p.useState(r === void 0);
    return (
      p.useEffect(() => {
        if (r !== void 0) {
          const c = window.setTimeout(() => i(!0), r);
          return () => window.clearTimeout(c);
        }
      }, [r]),
      a && s.imageLoadingStatus !== "loaded"
        ? l.jsx(pe.span, { ...o, ref: t })
        : null
    );
  });
Vu.displayName = mg;
function CS(
  e,
  { loadingStatus: t, setLoadingStatus: n, referrerPolicy: r, crossOrigin: o },
) {
  return (
    et(() => {
      if (!e) {
        n("error");
        return;
      }
      const s = new window.Image(),
        a = (c) => {
          const u = c.currentTarget;
          n(Kf(u));
        },
        i = () => n("error");
      return (
        s.addEventListener("load", a),
        s.addEventListener("error", i),
        r && (s.referrerPolicy = r),
        (s.crossOrigin = o ?? null),
        (s.src = e),
        n(Kf(s)),
        () => {
          (s.removeEventListener("load", a),
            s.removeEventListener("error", i),
            n("idle"));
        }
      );
    }, [e, o, r, n]),
    t
  );
}
function Kf(e) {
  return e.complete ? (e.naturalWidth > 0 ? "loaded" : "error") : "loading";
}
function ES() {
  let e = kS;
  {
    e = p.useState(0);
    const [t] = e,
      n = p.useRef(!1);
    p.useEffect(() => {
      t > 1 &&
        !n.current &&
        ((n.current = !0),
        console.warn(
          "Avatar: Only one `Avatar.Image` component should be rendered per `Avatar.Root`, but multiple were detected. This will lead to unexpected behavior.",
        ));
    }, [t]);
  }
  return e;
}
function jS(e) {
  p.useEffect(
    () => (
      e((t) => t + 1),
      () => {
        e((t) => t - 1);
      }
    ),
    [e],
  );
}
const hg = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx(Uu, {
    ref: n,
    className: H(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      e,
    ),
    ...t,
  }),
);
hg.displayName = Uu.displayName;
const gg = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx(Wu, { ref: n, className: H("aspect-square h-full w-full", e), ...t }),
);
gg.displayName = Wu.displayName;
const vg = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx(Vu, {
    ref: n,
    className: H(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      e,
    ),
    ...t,
  }),
);
vg.displayName = Vu.displayName;
const RS = gs(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#15181e] text-white hover:bg-[#15181e]",
        secondary:
          "border-transparent bg-stone-100 text-secondary-foreground hover:bg-stone-100",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        ready:
          "border-emerald-800/15 bg-[#36c275] text-[#0d0e12] hover:bg-[#36c275]",
        pending:
          "border-amber-800/15 bg-[#ffb000] text-[#0d0e12] hover:bg-[#ffb000]",
        success:
          "border-emerald-800/20 bg-emerald-600 text-white hover:bg-emerald-600",
        warning:
          "border-orange-800/20 bg-orange-500 text-slate-950 hover:bg-orange-500",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
function Pe({ className: e, variant: t, ...n }) {
  return l.jsx("div", { className: H(RS({ variant: t }), e), ...n });
}
function W(e, t, { checkForDefaultPrevented: n = !0 } = {}) {
  return function (o) {
    if ((e == null || e(o), n === !1 || !o.defaultPrevented))
      return t == null ? void 0 : t(o);
  };
}
var Gf = ds[" useEffectEvent ".trim().toString()],
  Yf = ds[" useInsertionEffect ".trim().toString()];
function _S(e) {
  if (typeof Gf == "function") return Gf(e);
  const t = p.useRef(() => {
    throw new Error("Cannot call an event handler while rendering.");
  });
  return (
    typeof Yf == "function"
      ? Yf(() => {
          t.current = e;
        })
      : et(() => {
          t.current = e;
        }),
    p.useMemo(
      () =>
        (...n) => {
          var r;
          return (r = t.current) == null ? void 0 : r.call(t, ...n);
        },
      [],
    )
  );
}
var PS = ds[" useInsertionEffect ".trim().toString()] || et;
function Hu({ prop: e, defaultProp: t, onChange: n = () => {}, caller: r }) {
  const [o, s, a] = MS({ defaultProp: t, onChange: n }),
    i = e !== void 0,
    c = i ? e : o;
  {
    const d = p.useRef(e !== void 0);
    p.useEffect(() => {
      const f = d.current;
      (f !== i &&
        console.warn(
          `${r} is changing from ${f ? "controlled" : "uncontrolled"} to ${i ? "controlled" : "uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`,
        ),
        (d.current = i));
    }, [i, r]);
  }
  const u = p.useCallback(
    (d) => {
      var f;
      if (i) {
        const m = AS(d) ? d(e) : d;
        m !== e && ((f = a.current) == null || f.call(a, m));
      } else s(d);
    },
    [i, e, s, a],
  );
  return [c, u];
}
function MS({ defaultProp: e, onChange: t }) {
  const [n, r] = p.useState(e),
    o = p.useRef(n),
    s = p.useRef(t);
  return (
    PS(() => {
      s.current = t;
    }, [t]),
    p.useEffect(() => {
      var a;
      o.current !== n &&
        ((a = s.current) == null || a.call(s, n), (o.current = n));
    }, [n, o]),
    [n, r, s]
  );
}
function AS(e) {
  return typeof e == "function";
}
function xg(e) {
  const t = e + "CollectionProvider",
    [n, r] = mn(t),
    [o, s] = n(t, { collectionRef: { current: null }, itemMap: new Map() }),
    a = (x) => {
      const { scope: k, children: h } = x,
        g = p.useRef(null),
        v = p.useRef(new Map()).current;
      return l.jsx(o, { scope: k, itemMap: v, collectionRef: g, children: h });
    };
  a.displayName = t;
  const i = e + "CollectionSlot",
    c = cr(i),
    u = p.forwardRef((x, k) => {
      const { scope: h, children: g } = x,
        v = s(i, h),
        b = le(k, v.collectionRef);
      return l.jsx(c, { ref: b, children: g });
    });
  u.displayName = i;
  const d = e + "CollectionItemSlot",
    f = "data-radix-collection-item",
    m = cr(d),
    y = p.forwardRef((x, k) => {
      const { scope: h, children: g, ...v } = x,
        b = p.useRef(null),
        S = le(k, b),
        C = s(d, h);
      return (
        p.useEffect(
          () => (
            C.itemMap.set(b, { ref: b, ...v }),
            () => void C.itemMap.delete(b)
          ),
        ),
        l.jsx(m, { [f]: "", ref: S, children: g })
      );
    });
  y.displayName = d;
  function w(x) {
    const k = s(e + "CollectionConsumer", x);
    return p.useCallback(() => {
      const g = k.collectionRef.current;
      if (!g) return [];
      const v = Array.from(g.querySelectorAll(`[${f}]`));
      return Array.from(k.itemMap.values()).sort(
        (C, N) => v.indexOf(C.ref.current) - v.indexOf(N.ref.current),
      );
    }, [k.collectionRef, k.itemMap]);
  }
  return [{ Provider: a, Slot: u, ItemSlot: y }, w, r];
}
var TS = p.createContext(void 0);
function Ku(e) {
  const t = p.useContext(TS);
  return e || t || "ltr";
}
function DS(e, t = globalThis == null ? void 0 : globalThis.document) {
  const n = be(e);
  p.useEffect(() => {
    const r = (o) => {
      o.key === "Escape" && n(o);
    };
    return (
      t.addEventListener("keydown", r, { capture: !0 }),
      () => t.removeEventListener("keydown", r, { capture: !0 })
    );
  }, [n, t]);
}
var OS = "DismissableLayer",
  Ec = "dismissableLayer.update",
  IS = "dismissableLayer.pointerDownOutside",
  LS = "dismissableLayer.focusOutside",
  Xf,
  yg = p.createContext({
    layers: new Set(),
    layersWithOutsidePointerEventsDisabled: new Set(),
    branches: new Set(),
    dismissableSurfaces: new Set(),
  }),
  wg = p.forwardRef((e, t) => {
    const {
        disableOutsidePointerEvents: n = !1,
        deferPointerDownOutside: r = !1,
        onEscapeKeyDown: o,
        onPointerDownOutside: s,
        onFocusOutside: a,
        onInteractOutside: i,
        onDismiss: c,
        ...u
      } = e,
      d = p.useContext(yg),
      [f, m] = p.useState(null),
      y =
        (f == null ? void 0 : f.ownerDocument) ??
        (globalThis == null ? void 0 : globalThis.document),
      [, w] = p.useState({}),
      x = le(t, (j) => m(j)),
      k = Array.from(d.layers),
      [h] = [...d.layersWithOutsidePointerEventsDisabled].slice(-1),
      g = k.indexOf(h),
      v = f ? k.indexOf(f) : -1,
      b = d.layersWithOutsidePointerEventsDisabled.size > 0,
      S = v >= g,
      C = p.useRef(!1),
      N = FS(
        (j) => {
          const R = j.target;
          if (!(R instanceof Node)) return;
          const M = [...d.branches].some((T) => T.contains(R));
          !S ||
            M ||
            (s == null || s(j),
            i == null || i(j),
            j.defaultPrevented || c == null || c());
        },
        {
          ownerDocument: y,
          deferPointerDownOutside: r,
          isDeferredPointerDownOutsideRef: C,
          dismissableSurfaces: d.dismissableSurfaces,
        },
      ),
      E = BS((j) => {
        if (r && C.current) return;
        const R = j.target;
        [...d.branches].some((T) => T.contains(R)) ||
          (a == null || a(j),
          i == null || i(j),
          j.defaultPrevented || c == null || c());
      }, y);
    return (
      DS((j) => {
        v === d.layers.size - 1 &&
          (o == null || o(j),
          !j.defaultPrevented && c && (j.preventDefault(), c()));
      }, y),
      p.useEffect(() => {
        if (f)
          return (
            n &&
              (d.layersWithOutsidePointerEventsDisabled.size === 0 &&
                ((Xf = y.body.style.pointerEvents),
                (y.body.style.pointerEvents = "none")),
              d.layersWithOutsidePointerEventsDisabled.add(f)),
            d.layers.add(f),
            Qf(),
            () => {
              n &&
                (d.layersWithOutsidePointerEventsDisabled.delete(f),
                d.layersWithOutsidePointerEventsDisabled.size === 0 &&
                  (y.body.style.pointerEvents = Xf));
            }
          );
      }, [f, y, n, d]),
      p.useEffect(
        () => () => {
          f &&
            (d.layers.delete(f),
            d.layersWithOutsidePointerEventsDisabled.delete(f),
            Qf());
        },
        [f, d],
      ),
      p.useEffect(() => {
        const j = () => w({});
        return (
          document.addEventListener(Ec, j),
          () => document.removeEventListener(Ec, j)
        );
      }, []),
      l.jsx(pe.div, {
        ...u,
        ref: x,
        style: {
          pointerEvents: b ? (S ? "auto" : "none") : void 0,
          ...e.style,
        },
        onFocusCapture: W(e.onFocusCapture, E.onFocusCapture),
        onBlurCapture: W(e.onBlurCapture, E.onBlurCapture),
        onPointerDownCapture: W(e.onPointerDownCapture, N.onPointerDownCapture),
      })
    );
  });
wg.displayName = OS;
var $S = "DismissableLayerBranch",
  zS = p.forwardRef((e, t) => {
    const n = p.useContext(yg),
      r = p.useRef(null),
      o = le(t, r);
    return (
      p.useEffect(() => {
        const s = r.current;
        if (s)
          return (
            n.branches.add(s),
            () => {
              n.branches.delete(s);
            }
          );
      }, [n.branches]),
      l.jsx(pe.div, { ...e, ref: o })
    );
  });
zS.displayName = $S;
function FS(e, t) {
  const {
      ownerDocument: n = globalThis == null ? void 0 : globalThis.document,
      deferPointerDownOutside: r = !1,
      isDeferredPointerDownOutsideRef: o,
      dismissableSurfaces: s,
    } = t,
    a = be(e),
    i = p.useRef(!1),
    c = p.useRef(!1),
    u = p.useRef(new Map()),
    d = p.useRef(() => {});
  return (
    p.useEffect(() => {
      function f() {
        ((c.current = !1), (o.current = !1), u.current.clear());
      }
      function m() {
        return Array.from(u.current.values()).some(Boolean);
      }
      function y(g) {
        if (!c.current) return;
        const v = g.target;
        ((v instanceof Node && [...s].some((S) => S.contains(v))) ||
          u.current.set(g.type, !0),
          g.type === "click" &&
            window.setTimeout(() => {
              c.current && d.current();
            }, 0));
      }
      function w(g) {
        c.current && u.current.set(g.type, !1);
      }
      const x = (g) => {
          if (g.target && !i.current) {
            let v = function () {
              n.removeEventListener("click", d.current);
              const S = m();
              (f(), S || bg(IS, a, b, { discrete: !0 }));
            };
            const b = { originalEvent: g };
            ((c.current = !0),
              (o.current = r && g.button === 0),
              u.current.clear(),
              !r || g.button !== 0
                ? v()
                : (n.removeEventListener("click", d.current),
                  (d.current = v),
                  n.addEventListener("click", d.current, { once: !0 })));
          } else (n.removeEventListener("click", d.current), f());
          i.current = !1;
        },
        k = [
          "pointerup",
          "mousedown",
          "mouseup",
          "touchstart",
          "touchend",
          "click",
        ];
      for (const g of k)
        (n.addEventListener(g, y, !0), n.addEventListener(g, w));
      const h = window.setTimeout(() => {
        n.addEventListener("pointerdown", x);
      }, 0);
      return () => {
        (window.clearTimeout(h),
          n.removeEventListener("pointerdown", x),
          n.removeEventListener("click", d.current));
        for (const g of k)
          (n.removeEventListener(g, y, !0), n.removeEventListener(g, w));
      };
    }, [n, a, r, o, s]),
    { onPointerDownCapture: () => (i.current = !0) }
  );
}
function BS(e, t = globalThis == null ? void 0 : globalThis.document) {
  const n = be(e),
    r = p.useRef(!1);
  return (
    p.useEffect(() => {
      const o = (s) => {
        s.target &&
          !r.current &&
          bg(LS, n, { originalEvent: s }, { discrete: !1 });
      };
      return (
        t.addEventListener("focusin", o),
        () => t.removeEventListener("focusin", o)
      );
    }, [t, n]),
    {
      onFocusCapture: () => (r.current = !0),
      onBlurCapture: () => (r.current = !1),
    }
  );
}
function Qf() {
  const e = new CustomEvent(Ec);
  document.dispatchEvent(e);
}
function bg(e, t, n, { discrete: r }) {
  const o = n.originalEvent.target,
    s = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: n });
  (t && o.addEventListener(e, t, { once: !0 }),
    r ? dg(o, s) : o.dispatchEvent(s));
}
var Gs = 0,
  Ft = null;
function Sg() {
  p.useEffect(() => {
    Ft || (Ft = { start: qf(), end: qf() });
    const { start: e, end: t } = Ft;
    return (
      document.body.firstElementChild !== e &&
        document.body.insertAdjacentElement("afterbegin", e),
      document.body.lastElementChild !== t &&
        document.body.insertAdjacentElement("beforeend", t),
      Gs++,
      () => {
        (Gs === 1 &&
          (Ft == null || Ft.start.remove(),
          Ft == null || Ft.end.remove(),
          (Ft = null)),
          (Gs = Math.max(0, Gs - 1)));
      }
    );
  }, []);
}
function qf() {
  const e = document.createElement("span");
  return (
    e.setAttribute("data-radix-focus-guard", ""),
    (e.tabIndex = 0),
    (e.style.outline = "none"),
    (e.style.opacity = "0"),
    (e.style.position = "fixed"),
    (e.style.pointerEvents = "none"),
    e
  );
}
var fi = "focusScope.autoFocusOnMount",
  pi = "focusScope.autoFocusOnUnmount",
  Jf = { bubbles: !1, cancelable: !0 },
  US = "FocusScope",
  kg = p.forwardRef((e, t) => {
    const {
        loop: n = !1,
        trapped: r = !1,
        onMountAutoFocus: o,
        onUnmountAutoFocus: s,
        ...a
      } = e,
      [i, c] = p.useState(null),
      u = be(o),
      d = be(s),
      f = p.useRef(null),
      m = le(t, (x) => c(x)),
      y = p.useRef({
        paused: !1,
        pause() {
          this.paused = !0;
        },
        resume() {
          this.paused = !1;
        },
      }).current;
    (p.useEffect(() => {
      if (r) {
        let x = function (v) {
            if (y.paused || !i) return;
            const b = v.target;
            i.contains(b) ? (f.current = b) : kn(f.current, { select: !0 });
          },
          k = function (v) {
            if (y.paused || !i) return;
            const b = v.relatedTarget;
            b !== null && (i.contains(b) || kn(f.current, { select: !0 }));
          },
          h = function (v) {
            if (document.activeElement === document.body)
              for (const S of v) S.removedNodes.length > 0 && kn(i);
          };
        (document.addEventListener("focusin", x),
          document.addEventListener("focusout", k));
        const g = new MutationObserver(h);
        return (
          i && g.observe(i, { childList: !0, subtree: !0 }),
          () => {
            (document.removeEventListener("focusin", x),
              document.removeEventListener("focusout", k),
              g.disconnect());
          }
        );
      }
    }, [r, i, y.paused]),
      p.useEffect(() => {
        if (i) {
          ep.add(y);
          const x = document.activeElement;
          if (!i.contains(x)) {
            const h = new CustomEvent(fi, Jf);
            (i.addEventListener(fi, u),
              i.dispatchEvent(h),
              h.defaultPrevented ||
                (WS(YS(Ng(i)), { select: !0 }),
                document.activeElement === x && kn(i)));
          }
          return () => {
            (i.removeEventListener(fi, u),
              setTimeout(() => {
                const h = new CustomEvent(pi, Jf);
                (i.addEventListener(pi, d),
                  i.dispatchEvent(h),
                  h.defaultPrevented || kn(x ?? document.body, { select: !0 }),
                  i.removeEventListener(pi, d),
                  ep.remove(y));
              }, 0));
          };
        }
      }, [i, u, d, y]));
    const w = p.useCallback(
      (x) => {
        if ((!n && !r) || y.paused) return;
        const k = x.key === "Tab" && !x.altKey && !x.ctrlKey && !x.metaKey,
          h = document.activeElement;
        if (k && h) {
          const g = x.currentTarget,
            [v, b] = VS(g);
          v && b
            ? !x.shiftKey && h === b
              ? (x.preventDefault(), n && kn(v, { select: !0 }))
              : x.shiftKey &&
                h === v &&
                (x.preventDefault(), n && kn(b, { select: !0 }))
            : h === g && x.preventDefault();
        }
      },
      [n, r, y.paused],
    );
    return l.jsx(pe.div, { tabIndex: -1, ...a, ref: m, onKeyDown: w });
  });
kg.displayName = US;
function WS(e, { select: t = !1 } = {}) {
  const n = document.activeElement;
  for (const r of e)
    if ((kn(r, { select: t }), document.activeElement !== n)) return;
}
function VS(e) {
  const t = Ng(e),
    n = Zf(t, e),
    r = Zf(t.reverse(), e);
  return [n, r];
}
function Ng(e) {
  const t = [],
    n = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (r) => {
        const o = r.tagName === "INPUT" && r.type === "hidden";
        return r.disabled || r.hidden || o
          ? NodeFilter.FILTER_SKIP
          : r.tabIndex >= 0
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
      },
    });
  for (; n.nextNode();) t.push(n.currentNode);
  return t;
}
function Zf(e, t) {
  for (const n of e) if (!HS(n, { upTo: t })) return n;
}
function HS(e, { upTo: t }) {
  if (getComputedStyle(e).visibility === "hidden") return !0;
  for (; e;) {
    if (t !== void 0 && e === t) return !1;
    if (getComputedStyle(e).display === "none") return !0;
    e = e.parentElement;
  }
  return !1;
}
function KS(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
function kn(e, { select: t = !1 } = {}) {
  if (e && e.focus) {
    const n = document.activeElement;
    (e.focus({ preventScroll: !0 }), e !== n && KS(e) && t && e.select());
  }
}
var ep = GS();
function GS() {
  let e = [];
  return {
    add(t) {
      const n = e[0];
      (t !== n && (n == null || n.pause()), (e = tp(e, t)), e.unshift(t));
    },
    remove(t) {
      var n;
      ((e = tp(e, t)), (n = e[0]) == null || n.resume());
    },
  };
}
function tp(e, t) {
  const n = [...e],
    r = n.indexOf(t);
  return (r !== -1 && n.splice(r, 1), n);
}
function YS(e) {
  return e.filter((t) => t.tagName !== "A");
}
var XS = ds[" useId ".trim().toString()] || (() => {}),
  QS = 0;
function zr(e) {
  const [t, n] = p.useState(XS());
  return (
    et(() => {
      n((r) => r ?? String(QS++));
    }, [e]),
    t ? `radix-${t}` : ""
  );
}
const qS = ["top", "right", "bottom", "left"],
  Wn = Math.min,
  rt = Math.max,
  Hl = Math.round,
  Ys = Math.floor,
  Yt = (e) => ({ x: e, y: e }),
  JS = { left: "right", right: "left", bottom: "top", top: "bottom" };
function jc(e, t, n) {
  return rt(e, Wn(t, n));
}
function dn(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function fn(e) {
  return e.split("-")[0];
}
function so(e) {
  return e.split("-")[1];
}
function Gu(e) {
  return e === "x" ? "y" : "x";
}
function Yu(e) {
  return e === "y" ? "height" : "width";
}
function Ht(e) {
  const t = e[0];
  return t === "t" || t === "b" ? "y" : "x";
}
function Xu(e) {
  return Gu(Ht(e));
}
function ZS(e, t, n) {
  n === void 0 && (n = !1);
  const r = so(e),
    o = Xu(e),
    s = Yu(o);
  let a =
    o === "x"
      ? r === (n ? "end" : "start")
        ? "right"
        : "left"
      : r === "start"
        ? "bottom"
        : "top";
  return (t.reference[s] > t.floating[s] && (a = Kl(a)), [a, Kl(a)]);
}
function e2(e) {
  const t = Kl(e);
  return [Rc(e), t, Rc(t)];
}
function Rc(e) {
  return e.includes("start")
    ? e.replace("start", "end")
    : e.replace("end", "start");
}
const np = ["left", "right"],
  rp = ["right", "left"],
  t2 = ["top", "bottom"],
  n2 = ["bottom", "top"];
function r2(e, t, n) {
  switch (e) {
    case "top":
    case "bottom":
      return n ? (t ? rp : np) : t ? np : rp;
    case "left":
    case "right":
      return t ? t2 : n2;
    default:
      return [];
  }
}
function o2(e, t, n, r) {
  const o = so(e);
  let s = r2(fn(e), n === "start", r);
  return (
    o && ((s = s.map((a) => a + "-" + o)), t && (s = s.concat(s.map(Rc)))),
    s
  );
}
function Kl(e) {
  const t = fn(e);
  return JS[t] + e.slice(t.length);
}
function s2(e) {
  return { top: 0, right: 0, bottom: 0, left: 0, ...e };
}
function Cg(e) {
  return typeof e != "number"
    ? s2(e)
    : { top: e, right: e, bottom: e, left: e };
}
function Gl(e) {
  const { x: t, y: n, width: r, height: o } = e;
  return {
    width: r,
    height: o,
    top: n,
    left: t,
    right: t + r,
    bottom: n + o,
    x: t,
    y: n,
  };
}
function op(e, t, n) {
  let { reference: r, floating: o } = e;
  const s = Ht(t),
    a = Xu(t),
    i = Yu(a),
    c = fn(t),
    u = s === "y",
    d = r.x + r.width / 2 - o.width / 2,
    f = r.y + r.height / 2 - o.height / 2,
    m = r[i] / 2 - o[i] / 2;
  let y;
  switch (c) {
    case "top":
      y = { x: d, y: r.y - o.height };
      break;
    case "bottom":
      y = { x: d, y: r.y + r.height };
      break;
    case "right":
      y = { x: r.x + r.width, y: f };
      break;
    case "left":
      y = { x: r.x - o.width, y: f };
      break;
    default:
      y = { x: r.x, y: r.y };
  }
  switch (so(t)) {
    case "start":
      y[a] -= m * (n && u ? -1 : 1);
      break;
    case "end":
      y[a] += m * (n && u ? -1 : 1);
      break;
  }
  return y;
}
async function l2(e, t) {
  var n;
  t === void 0 && (t = {});
  const { x: r, y: o, platform: s, rects: a, elements: i, strategy: c } = e,
    {
      boundary: u = "clippingAncestors",
      rootBoundary: d = "viewport",
      elementContext: f = "floating",
      altBoundary: m = !1,
      padding: y = 0,
    } = dn(t, e),
    w = Cg(y),
    k = i[m ? (f === "floating" ? "reference" : "floating") : f],
    h = Gl(
      await s.getClippingRect({
        element:
          (n = await (s.isElement == null ? void 0 : s.isElement(k))) == null ||
          n
            ? k
            : k.contextElement ||
              (await (s.getDocumentElement == null
                ? void 0
                : s.getDocumentElement(i.floating))),
        boundary: u,
        rootBoundary: d,
        strategy: c,
      }),
    ),
    g =
      f === "floating"
        ? { x: r, y: o, width: a.floating.width, height: a.floating.height }
        : a.reference,
    v = await (s.getOffsetParent == null
      ? void 0
      : s.getOffsetParent(i.floating)),
    b = (await (s.isElement == null ? void 0 : s.isElement(v)))
      ? (await (s.getScale == null ? void 0 : s.getScale(v))) || { x: 1, y: 1 }
      : { x: 1, y: 1 },
    S = Gl(
      s.convertOffsetParentRelativeRectToViewportRelativeRect
        ? await s.convertOffsetParentRelativeRectToViewportRelativeRect({
            elements: i,
            rect: g,
            offsetParent: v,
            strategy: c,
          })
        : g,
    );
  return {
    top: (h.top - S.top + w.top) / b.y,
    bottom: (S.bottom - h.bottom + w.bottom) / b.y,
    left: (h.left - S.left + w.left) / b.x,
    right: (S.right - h.right + w.right) / b.x,
  };
}
const a2 = 50,
  i2 = async (e, t, n) => {
    const {
        placement: r = "bottom",
        strategy: o = "absolute",
        middleware: s = [],
        platform: a,
      } = n,
      i = a.detectOverflow ? a : { ...a, detectOverflow: l2 },
      c = await (a.isRTL == null ? void 0 : a.isRTL(t));
    let u = await a.getElementRects({ reference: e, floating: t, strategy: o }),
      { x: d, y: f } = op(u, r, c),
      m = r,
      y = 0;
    const w = {};
    for (let x = 0; x < s.length; x++) {
      const k = s[x];
      if (!k) continue;
      const { name: h, fn: g } = k,
        {
          x: v,
          y: b,
          data: S,
          reset: C,
        } = await g({
          x: d,
          y: f,
          initialPlacement: r,
          placement: m,
          strategy: o,
          middlewareData: w,
          rects: u,
          platform: i,
          elements: { reference: e, floating: t },
        });
      ((d = v ?? d),
        (f = b ?? f),
        (w[h] = { ...w[h], ...S }),
        C &&
          y < a2 &&
          (y++,
          typeof C == "object" &&
            (C.placement && (m = C.placement),
            C.rects &&
              (u =
                C.rects === !0
                  ? await a.getElementRects({
                      reference: e,
                      floating: t,
                      strategy: o,
                    })
                  : C.rects),
            ({ x: d, y: f } = op(u, m, c))),
          (x = -1)));
    }
    return { x: d, y: f, placement: m, strategy: o, middlewareData: w };
  },
  c2 = (e) => ({
    name: "arrow",
    options: e,
    async fn(t) {
      const {
          x: n,
          y: r,
          placement: o,
          rects: s,
          platform: a,
          elements: i,
          middlewareData: c,
        } = t,
        { element: u, padding: d = 0 } = dn(e, t) || {};
      if (u == null) return {};
      const f = Cg(d),
        m = { x: n, y: r },
        y = Xu(o),
        w = Yu(y),
        x = await a.getDimensions(u),
        k = y === "y",
        h = k ? "top" : "left",
        g = k ? "bottom" : "right",
        v = k ? "clientHeight" : "clientWidth",
        b = s.reference[w] + s.reference[y] - m[y] - s.floating[w],
        S = m[y] - s.reference[y],
        C = await (a.getOffsetParent == null ? void 0 : a.getOffsetParent(u));
      let N = C ? C[v] : 0;
      (!N || !(await (a.isElement == null ? void 0 : a.isElement(C)))) &&
        (N = i.floating[v] || s.floating[w]);
      const E = b / 2 - S / 2,
        j = N / 2 - x[w] / 2 - 1,
        R = Wn(f[h], j),
        M = Wn(f[g], j),
        T = R,
        D = N - x[w] - M,
        B = N / 2 - x[w] / 2 + E,
        Q = jc(T, B, D),
        F =
          !c.arrow &&
          so(o) != null &&
          B !== Q &&
          s.reference[w] / 2 - (B < T ? R : M) - x[w] / 2 < 0,
        K = F ? (B < T ? B - T : B - D) : 0;
      return {
        [y]: m[y] + K,
        data: {
          [y]: Q,
          centerOffset: B - Q - K,
          ...(F && { alignmentOffset: K }),
        },
        reset: F,
      };
    },
  }),
  u2 = function (e) {
    return (
      e === void 0 && (e = {}),
      {
        name: "flip",
        options: e,
        async fn(t) {
          var n, r;
          const {
              placement: o,
              middlewareData: s,
              rects: a,
              initialPlacement: i,
              platform: c,
              elements: u,
            } = t,
            {
              mainAxis: d = !0,
              crossAxis: f = !0,
              fallbackPlacements: m,
              fallbackStrategy: y = "bestFit",
              fallbackAxisSideDirection: w = "none",
              flipAlignment: x = !0,
              ...k
            } = dn(e, t);
          if ((n = s.arrow) != null && n.alignmentOffset) return {};
          const h = fn(o),
            g = Ht(i),
            v = fn(i) === i,
            b = await (c.isRTL == null ? void 0 : c.isRTL(u.floating)),
            S = m || (v || !x ? [Kl(i)] : e2(i)),
            C = w !== "none";
          !m && C && S.push(...o2(i, x, w, b));
          const N = [i, ...S],
            E = await c.detectOverflow(t, k),
            j = [];
          let R = ((r = s.flip) == null ? void 0 : r.overflows) || [];
          if ((d && j.push(E[h]), f)) {
            const B = ZS(o, a, b);
            j.push(E[B[0]], E[B[1]]);
          }
          if (
            ((R = [...R, { placement: o, overflows: j }]),
            !j.every((B) => B <= 0))
          ) {
            var M, T;
            const B = (((M = s.flip) == null ? void 0 : M.index) || 0) + 1,
              Q = N[B];
            if (
              Q &&
              (!(f === "alignment" ? g !== Ht(Q) : !1) ||
                R.every((_) =>
                  Ht(_.placement) === g ? _.overflows[0] > 0 : !0,
                ))
            )
              return {
                data: { index: B, overflows: R },
                reset: { placement: Q },
              };
            let F =
              (T = R.filter((K) => K.overflows[0] <= 0).sort(
                (K, _) => K.overflows[1] - _.overflows[1],
              )[0]) == null
                ? void 0
                : T.placement;
            if (!F)
              switch (y) {
                case "bestFit": {
                  var D;
                  const K =
                    (D = R.filter((_) => {
                      if (C) {
                        const P = Ht(_.placement);
                        return P === g || P === "y";
                      }
                      return !0;
                    })
                      .map((_) => [
                        _.placement,
                        _.overflows
                          .filter((P) => P > 0)
                          .reduce((P, I) => P + I, 0),
                      ])
                      .sort((_, P) => _[1] - P[1])[0]) == null
                      ? void 0
                      : D[0];
                  K && (F = K);
                  break;
                }
                case "initialPlacement":
                  F = i;
                  break;
              }
            if (o !== F) return { reset: { placement: F } };
          }
          return {};
        },
      }
    );
  };
function sp(e, t) {
  return {
    top: e.top - t.height,
    right: e.right - t.width,
    bottom: e.bottom - t.height,
    left: e.left - t.width,
  };
}
function lp(e) {
  return qS.some((t) => e[t] >= 0);
}
const d2 = function (e) {
    return (
      e === void 0 && (e = {}),
      {
        name: "hide",
        options: e,
        async fn(t) {
          const { rects: n, platform: r } = t,
            { strategy: o = "referenceHidden", ...s } = dn(e, t);
          switch (o) {
            case "referenceHidden": {
              const a = await r.detectOverflow(t, {
                  ...s,
                  elementContext: "reference",
                }),
                i = sp(a, n.reference);
              return {
                data: { referenceHiddenOffsets: i, referenceHidden: lp(i) },
              };
            }
            case "escaped": {
              const a = await r.detectOverflow(t, { ...s, altBoundary: !0 }),
                i = sp(a, n.floating);
              return { data: { escapedOffsets: i, escaped: lp(i) } };
            }
            default:
              return {};
          }
        },
      }
    );
  },
  Eg = new Set(["left", "top"]);
async function f2(e, t) {
  const { placement: n, platform: r, elements: o } = e,
    s = await (r.isRTL == null ? void 0 : r.isRTL(o.floating)),
    a = fn(n),
    i = so(n),
    c = Ht(n) === "y",
    u = Eg.has(a) ? -1 : 1,
    d = s && c ? -1 : 1,
    f = dn(t, e);
  let {
    mainAxis: m,
    crossAxis: y,
    alignmentAxis: w,
  } = typeof f == "number"
    ? { mainAxis: f, crossAxis: 0, alignmentAxis: null }
    : {
        mainAxis: f.mainAxis || 0,
        crossAxis: f.crossAxis || 0,
        alignmentAxis: f.alignmentAxis,
      };
  return (
    i && typeof w == "number" && (y = i === "end" ? w * -1 : w),
    c ? { x: y * d, y: m * u } : { x: m * u, y: y * d }
  );
}
const p2 = function (e) {
    return (
      e === void 0 && (e = 0),
      {
        name: "offset",
        options: e,
        async fn(t) {
          var n, r;
          const { x: o, y: s, placement: a, middlewareData: i } = t,
            c = await f2(t, e);
          return a === ((n = i.offset) == null ? void 0 : n.placement) &&
            (r = i.arrow) != null &&
            r.alignmentOffset
            ? {}
            : { x: o + c.x, y: s + c.y, data: { ...c, placement: a } };
        },
      }
    );
  },
  m2 = function (e) {
    return (
      e === void 0 && (e = {}),
      {
        name: "shift",
        options: e,
        async fn(t) {
          const { x: n, y: r, placement: o, platform: s } = t,
            {
              mainAxis: a = !0,
              crossAxis: i = !1,
              limiter: c = {
                fn: (h) => {
                  let { x: g, y: v } = h;
                  return { x: g, y: v };
                },
              },
              ...u
            } = dn(e, t),
            d = { x: n, y: r },
            f = await s.detectOverflow(t, u),
            m = Ht(fn(o)),
            y = Gu(m);
          let w = d[y],
            x = d[m];
          if (a) {
            const h = y === "y" ? "top" : "left",
              g = y === "y" ? "bottom" : "right",
              v = w + f[h],
              b = w - f[g];
            w = jc(v, w, b);
          }
          if (i) {
            const h = m === "y" ? "top" : "left",
              g = m === "y" ? "bottom" : "right",
              v = x + f[h],
              b = x - f[g];
            x = jc(v, x, b);
          }
          const k = c.fn({ ...t, [y]: w, [m]: x });
          return {
            ...k,
            data: { x: k.x - n, y: k.y - r, enabled: { [y]: a, [m]: i } },
          };
        },
      }
    );
  },
  h2 = function (e) {
    return (
      e === void 0 && (e = {}),
      {
        options: e,
        fn(t) {
          const { x: n, y: r, placement: o, rects: s, middlewareData: a } = t,
            { offset: i = 0, mainAxis: c = !0, crossAxis: u = !0 } = dn(e, t),
            d = { x: n, y: r },
            f = Ht(o),
            m = Gu(f);
          let y = d[m],
            w = d[f];
          const x = dn(i, t),
            k =
              typeof x == "number"
                ? { mainAxis: x, crossAxis: 0 }
                : { mainAxis: 0, crossAxis: 0, ...x };
          if (c) {
            const v = m === "y" ? "height" : "width",
              b = s.reference[m] - s.floating[v] + k.mainAxis,
              S = s.reference[m] + s.reference[v] - k.mainAxis;
            y < b ? (y = b) : y > S && (y = S);
          }
          if (u) {
            var h, g;
            const v = m === "y" ? "width" : "height",
              b = Eg.has(fn(o)),
              S =
                s.reference[f] -
                s.floating[v] +
                ((b && ((h = a.offset) == null ? void 0 : h[f])) || 0) +
                (b ? 0 : k.crossAxis),
              C =
                s.reference[f] +
                s.reference[v] +
                (b ? 0 : ((g = a.offset) == null ? void 0 : g[f]) || 0) -
                (b ? k.crossAxis : 0);
            w < S ? (w = S) : w > C && (w = C);
          }
          return { [m]: y, [f]: w };
        },
      }
    );
  },
  g2 = function (e) {
    return (
      e === void 0 && (e = {}),
      {
        name: "size",
        options: e,
        async fn(t) {
          var n, r;
          const { placement: o, rects: s, platform: a, elements: i } = t,
            { apply: c = () => {}, ...u } = dn(e, t),
            d = await a.detectOverflow(t, u),
            f = fn(o),
            m = so(o),
            y = Ht(o) === "y",
            { width: w, height: x } = s.floating;
          let k, h;
          f === "top" || f === "bottom"
            ? ((k = f),
              (h =
                m ===
                ((await (a.isRTL == null ? void 0 : a.isRTL(i.floating)))
                  ? "start"
                  : "end")
                  ? "left"
                  : "right"))
            : ((h = f), (k = m === "end" ? "top" : "bottom"));
          const g = x - d.top - d.bottom,
            v = w - d.left - d.right,
            b = Wn(x - d[k], g),
            S = Wn(w - d[h], v),
            C = !t.middlewareData.shift;
          let N = b,
            E = S;
          if (
            ((n = t.middlewareData.shift) != null && n.enabled.x && (E = v),
            (r = t.middlewareData.shift) != null && r.enabled.y && (N = g),
            C && !m)
          ) {
            const R = rt(d.left, 0),
              M = rt(d.right, 0),
              T = rt(d.top, 0),
              D = rt(d.bottom, 0);
            y
              ? (E = w - 2 * (R !== 0 || M !== 0 ? R + M : rt(d.left, d.right)))
              : (N =
                  x - 2 * (T !== 0 || D !== 0 ? T + D : rt(d.top, d.bottom)));
          }
          await c({ ...t, availableWidth: E, availableHeight: N });
          const j = await a.getDimensions(i.floating);
          return w !== j.width || x !== j.height
            ? { reset: { rects: !0 } }
            : {};
        },
      }
    );
  };
function wa() {
  return typeof window < "u";
}
function lo(e) {
  return jg(e) ? (e.nodeName || "").toLowerCase() : "#document";
}
function lt(e) {
  var t;
  return (
    (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) ||
    window
  );
}
function Xt(e) {
  var t;
  return (t = (jg(e) ? e.ownerDocument : e.document) || window.document) == null
    ? void 0
    : t.documentElement;
}
function jg(e) {
  return wa() ? e instanceof Node || e instanceof lt(e).Node : !1;
}
function Ot(e) {
  return wa() ? e instanceof Element || e instanceof lt(e).Element : !1;
}
function hn(e) {
  return wa() ? e instanceof HTMLElement || e instanceof lt(e).HTMLElement : !1;
}
function ap(e) {
  return !wa() || typeof ShadowRoot > "u"
    ? !1
    : e instanceof ShadowRoot || e instanceof lt(e).ShadowRoot;
}
function vs(e) {
  const { overflow: t, overflowX: n, overflowY: r, display: o } = It(e);
  return (
    /auto|scroll|overlay|hidden|clip/.test(t + r + n) &&
    o !== "inline" &&
    o !== "contents"
  );
}
function v2(e) {
  return /^(table|td|th)$/.test(lo(e));
}
function ba(e) {
  try {
    if (e.matches(":popover-open")) return !0;
  } catch {}
  try {
    return e.matches(":modal");
  } catch {
    return !1;
  }
}
const x2 = /transform|translate|scale|rotate|perspective|filter/,
  y2 = /paint|layout|strict|content/,
  Xn = (e) => !!e && e !== "none";
let mi;
function Qu(e) {
  const t = Ot(e) ? It(e) : e;
  return (
    Xn(t.transform) ||
    Xn(t.translate) ||
    Xn(t.scale) ||
    Xn(t.rotate) ||
    Xn(t.perspective) ||
    (!qu() && (Xn(t.backdropFilter) || Xn(t.filter))) ||
    x2.test(t.willChange || "") ||
    y2.test(t.contain || "")
  );
}
function w2(e) {
  let t = Vn(e);
  for (; hn(t) && !Qr(t);) {
    if (Qu(t)) return t;
    if (ba(t)) return null;
    t = Vn(t);
  }
  return null;
}
function qu() {
  return (
    mi == null &&
      (mi =
        typeof CSS < "u" &&
        CSS.supports &&
        CSS.supports("-webkit-backdrop-filter", "none")),
    mi
  );
}
function Qr(e) {
  return /^(html|body|#document)$/.test(lo(e));
}
function It(e) {
  return lt(e).getComputedStyle(e);
}
function Sa(e) {
  return Ot(e)
    ? { scrollLeft: e.scrollLeft, scrollTop: e.scrollTop }
    : { scrollLeft: e.scrollX, scrollTop: e.scrollY };
}
function Vn(e) {
  if (lo(e) === "html") return e;
  const t = e.assignedSlot || e.parentNode || (ap(e) && e.host) || Xt(e);
  return ap(t) ? t.host : t;
}
function Rg(e) {
  const t = Vn(e);
  return Qr(t)
    ? e.ownerDocument
      ? e.ownerDocument.body
      : e.body
    : hn(t) && vs(t)
      ? t
      : Rg(t);
}
function as(e, t, n) {
  var r;
  (t === void 0 && (t = []), n === void 0 && (n = !0));
  const o = Rg(e),
    s = o === ((r = e.ownerDocument) == null ? void 0 : r.body),
    a = lt(o);
  if (s) {
    const i = _c(a);
    return t.concat(
      a,
      a.visualViewport || [],
      vs(o) ? o : [],
      i && n ? as(i) : [],
    );
  } else return t.concat(o, as(o, [], n));
}
function _c(e) {
  return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
function _g(e) {
  const t = It(e);
  let n = parseFloat(t.width) || 0,
    r = parseFloat(t.height) || 0;
  const o = hn(e),
    s = o ? e.offsetWidth : n,
    a = o ? e.offsetHeight : r,
    i = Hl(n) !== s || Hl(r) !== a;
  return (i && ((n = s), (r = a)), { width: n, height: r, $: i });
}
function Ju(e) {
  return Ot(e) ? e : e.contextElement;
}
function Fr(e) {
  const t = Ju(e);
  if (!hn(t)) return Yt(1);
  const n = t.getBoundingClientRect(),
    { width: r, height: o, $: s } = _g(t);
  let a = (s ? Hl(n.width) : n.width) / r,
    i = (s ? Hl(n.height) : n.height) / o;
  return (
    (!a || !Number.isFinite(a)) && (a = 1),
    (!i || !Number.isFinite(i)) && (i = 1),
    { x: a, y: i }
  );
}
const b2 = Yt(0);
function Pg(e) {
  const t = lt(e);
  return !qu() || !t.visualViewport
    ? b2
    : { x: t.visualViewport.offsetLeft, y: t.visualViewport.offsetTop };
}
function S2(e, t, n) {
  return (t === void 0 && (t = !1), !n || (t && n !== lt(e)) ? !1 : t);
}
function ur(e, t, n, r) {
  (t === void 0 && (t = !1), n === void 0 && (n = !1));
  const o = e.getBoundingClientRect(),
    s = Ju(e);
  let a = Yt(1);
  t && (r ? Ot(r) && (a = Fr(r)) : (a = Fr(e)));
  const i = S2(s, n, r) ? Pg(s) : Yt(0);
  let c = (o.left + i.x) / a.x,
    u = (o.top + i.y) / a.y,
    d = o.width / a.x,
    f = o.height / a.y;
  if (s) {
    const m = lt(s),
      y = r && Ot(r) ? lt(r) : r;
    let w = m,
      x = _c(w);
    for (; x && r && y !== w;) {
      const k = Fr(x),
        h = x.getBoundingClientRect(),
        g = It(x),
        v = h.left + (x.clientLeft + parseFloat(g.paddingLeft)) * k.x,
        b = h.top + (x.clientTop + parseFloat(g.paddingTop)) * k.y;
      ((c *= k.x),
        (u *= k.y),
        (d *= k.x),
        (f *= k.y),
        (c += v),
        (u += b),
        (w = lt(x)),
        (x = _c(w)));
    }
  }
  return Gl({ width: d, height: f, x: c, y: u });
}
function ka(e, t) {
  const n = Sa(e).scrollLeft;
  return t ? t.left + n : ur(Xt(e)).left + n;
}
function Mg(e, t) {
  const n = e.getBoundingClientRect(),
    r = n.left + t.scrollLeft - ka(e, n),
    o = n.top + t.scrollTop;
  return { x: r, y: o };
}
function k2(e) {
  let { elements: t, rect: n, offsetParent: r, strategy: o } = e;
  const s = o === "fixed",
    a = Xt(r),
    i = t ? ba(t.floating) : !1;
  if (r === a || (i && s)) return n;
  let c = { scrollLeft: 0, scrollTop: 0 },
    u = Yt(1);
  const d = Yt(0),
    f = hn(r);
  if ((f || (!f && !s)) && ((lo(r) !== "body" || vs(a)) && (c = Sa(r)), f)) {
    const y = ur(r);
    ((u = Fr(r)), (d.x = y.x + r.clientLeft), (d.y = y.y + r.clientTop));
  }
  const m = a && !f && !s ? Mg(a, c) : Yt(0);
  return {
    width: n.width * u.x,
    height: n.height * u.y,
    x: n.x * u.x - c.scrollLeft * u.x + d.x + m.x,
    y: n.y * u.y - c.scrollTop * u.y + d.y + m.y,
  };
}
function N2(e) {
  return Array.from(e.getClientRects());
}
function C2(e) {
  const t = Xt(e),
    n = Sa(e),
    r = e.ownerDocument.body,
    o = rt(t.scrollWidth, t.clientWidth, r.scrollWidth, r.clientWidth),
    s = rt(t.scrollHeight, t.clientHeight, r.scrollHeight, r.clientHeight);
  let a = -n.scrollLeft + ka(e);
  const i = -n.scrollTop;
  return (
    It(r).direction === "rtl" && (a += rt(t.clientWidth, r.clientWidth) - o),
    { width: o, height: s, x: a, y: i }
  );
}
const ip = 25;
function E2(e, t) {
  const n = lt(e),
    r = Xt(e),
    o = n.visualViewport;
  let s = r.clientWidth,
    a = r.clientHeight,
    i = 0,
    c = 0;
  if (o) {
    ((s = o.width), (a = o.height));
    const d = qu();
    (!d || (d && t === "fixed")) && ((i = o.offsetLeft), (c = o.offsetTop));
  }
  const u = ka(r);
  if (u <= 0) {
    const d = r.ownerDocument,
      f = d.body,
      m = getComputedStyle(f),
      y =
        (d.compatMode === "CSS1Compat" &&
          parseFloat(m.marginLeft) + parseFloat(m.marginRight)) ||
        0,
      w = Math.abs(r.clientWidth - f.clientWidth - y);
    w <= ip && (s -= w);
  } else u <= ip && (s += u);
  return { width: s, height: a, x: i, y: c };
}
function j2(e, t) {
  const n = ur(e, !0, t === "fixed"),
    r = n.top + e.clientTop,
    o = n.left + e.clientLeft,
    s = hn(e) ? Fr(e) : Yt(1),
    a = e.clientWidth * s.x,
    i = e.clientHeight * s.y,
    c = o * s.x,
    u = r * s.y;
  return { width: a, height: i, x: c, y: u };
}
function cp(e, t, n) {
  let r;
  if (t === "viewport") r = E2(e, n);
  else if (t === "document") r = C2(Xt(e));
  else if (Ot(t)) r = j2(t, n);
  else {
    const o = Pg(e);
    r = { x: t.x - o.x, y: t.y - o.y, width: t.width, height: t.height };
  }
  return Gl(r);
}
function Ag(e, t) {
  const n = Vn(e);
  return n === t || !Ot(n) || Qr(n)
    ? !1
    : It(n).position === "fixed" || Ag(n, t);
}
function R2(e, t) {
  const n = t.get(e);
  if (n) return n;
  let r = as(e, [], !1).filter((i) => Ot(i) && lo(i) !== "body"),
    o = null;
  const s = It(e).position === "fixed";
  let a = s ? Vn(e) : e;
  for (; Ot(a) && !Qr(a);) {
    const i = It(a),
      c = Qu(a);
    (!c && i.position === "fixed" && (o = null),
      (
        s
          ? !c && !o
          : (!c &&
              i.position === "static" &&
              !!o &&
              (o.position === "absolute" || o.position === "fixed")) ||
            (vs(a) && !c && Ag(e, a))
      )
        ? (r = r.filter((d) => d !== a))
        : (o = i),
      (a = Vn(a)));
  }
  return (t.set(e, r), r);
}
function _2(e) {
  let { element: t, boundary: n, rootBoundary: r, strategy: o } = e;
  const a = [
      ...(n === "clippingAncestors"
        ? ba(t)
          ? []
          : R2(t, this._c)
        : [].concat(n)),
      r,
    ],
    i = cp(t, a[0], o);
  let c = i.top,
    u = i.right,
    d = i.bottom,
    f = i.left;
  for (let m = 1; m < a.length; m++) {
    const y = cp(t, a[m], o);
    ((c = rt(y.top, c)),
      (u = Wn(y.right, u)),
      (d = Wn(y.bottom, d)),
      (f = rt(y.left, f)));
  }
  return { width: u - f, height: d - c, x: f, y: c };
}
function P2(e) {
  const { width: t, height: n } = _g(e);
  return { width: t, height: n };
}
function M2(e, t, n) {
  const r = hn(t),
    o = Xt(t),
    s = n === "fixed",
    a = ur(e, !0, s, t);
  let i = { scrollLeft: 0, scrollTop: 0 };
  const c = Yt(0);
  function u() {
    c.x = ka(o);
  }
  if (r || (!r && !s))
    if (((lo(t) !== "body" || vs(o)) && (i = Sa(t)), r)) {
      const y = ur(t, !0, s, t);
      ((c.x = y.x + t.clientLeft), (c.y = y.y + t.clientTop));
    } else o && u();
  s && !r && o && u();
  const d = o && !r && !s ? Mg(o, i) : Yt(0),
    f = a.left + i.scrollLeft - c.x - d.x,
    m = a.top + i.scrollTop - c.y - d.y;
  return { x: f, y: m, width: a.width, height: a.height };
}
function hi(e) {
  return It(e).position === "static";
}
function up(e, t) {
  if (!hn(e) || It(e).position === "fixed") return null;
  if (t) return t(e);
  let n = e.offsetParent;
  return (Xt(e) === n && (n = n.ownerDocument.body), n);
}
function Tg(e, t) {
  const n = lt(e);
  if (ba(e)) return n;
  if (!hn(e)) {
    let o = Vn(e);
    for (; o && !Qr(o);) {
      if (Ot(o) && !hi(o)) return o;
      o = Vn(o);
    }
    return n;
  }
  let r = up(e, t);
  for (; r && v2(r) && hi(r);) r = up(r, t);
  return r && Qr(r) && hi(r) && !Qu(r) ? n : r || w2(e) || n;
}
const A2 = async function (e) {
  const t = this.getOffsetParent || Tg,
    n = this.getDimensions,
    r = await n(e.floating);
  return {
    reference: M2(e.reference, await t(e.floating), e.strategy),
    floating: { x: 0, y: 0, width: r.width, height: r.height },
  };
};
function T2(e) {
  return It(e).direction === "rtl";
}
const D2 = {
  convertOffsetParentRelativeRectToViewportRelativeRect: k2,
  getDocumentElement: Xt,
  getClippingRect: _2,
  getOffsetParent: Tg,
  getElementRects: A2,
  getClientRects: N2,
  getDimensions: P2,
  getScale: Fr,
  isElement: Ot,
  isRTL: T2,
};
function Dg(e, t) {
  return (
    e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height
  );
}
function O2(e, t) {
  let n = null,
    r;
  const o = Xt(e);
  function s() {
    var i;
    (clearTimeout(r), (i = n) == null || i.disconnect(), (n = null));
  }
  function a(i, c) {
    (i === void 0 && (i = !1), c === void 0 && (c = 1), s());
    const u = e.getBoundingClientRect(),
      { left: d, top: f, width: m, height: y } = u;
    if ((i || t(), !m || !y)) return;
    const w = Ys(f),
      x = Ys(o.clientWidth - (d + m)),
      k = Ys(o.clientHeight - (f + y)),
      h = Ys(d),
      v = {
        rootMargin: -w + "px " + -x + "px " + -k + "px " + -h + "px",
        threshold: rt(0, Wn(1, c)) || 1,
      };
    let b = !0;
    function S(C) {
      const N = C[0].intersectionRatio;
      if (N !== c) {
        if (!b) return a();
        N
          ? a(!1, N)
          : (r = setTimeout(() => {
              a(!1, 1e-7);
            }, 1e3));
      }
      (N === 1 && !Dg(u, e.getBoundingClientRect()) && a(), (b = !1));
    }
    try {
      n = new IntersectionObserver(S, { ...v, root: o.ownerDocument });
    } catch {
      n = new IntersectionObserver(S, v);
    }
    n.observe(e);
  }
  return (a(!0), s);
}
function I2(e, t, n, r) {
  r === void 0 && (r = {});
  const {
      ancestorScroll: o = !0,
      ancestorResize: s = !0,
      elementResize: a = typeof ResizeObserver == "function",
      layoutShift: i = typeof IntersectionObserver == "function",
      animationFrame: c = !1,
    } = r,
    u = Ju(e),
    d = o || s ? [...(u ? as(u) : []), ...(t ? as(t) : [])] : [];
  d.forEach((h) => {
    (o && h.addEventListener("scroll", n, { passive: !0 }),
      s && h.addEventListener("resize", n));
  });
  const f = u && i ? O2(u, n) : null;
  let m = -1,
    y = null;
  a &&
    ((y = new ResizeObserver((h) => {
      let [g] = h;
      (g &&
        g.target === u &&
        y &&
        t &&
        (y.unobserve(t),
        cancelAnimationFrame(m),
        (m = requestAnimationFrame(() => {
          var v;
          (v = y) == null || v.observe(t);
        }))),
        n());
    })),
    u && !c && y.observe(u),
    t && y.observe(t));
  let w,
    x = c ? ur(e) : null;
  c && k();
  function k() {
    const h = ur(e);
    (x && !Dg(x, h) && n(), (x = h), (w = requestAnimationFrame(k)));
  }
  return (
    n(),
    () => {
      var h;
      (d.forEach((g) => {
        (o && g.removeEventListener("scroll", n),
          s && g.removeEventListener("resize", n));
      }),
        f == null || f(),
        (h = y) == null || h.disconnect(),
        (y = null),
        c && cancelAnimationFrame(w));
    }
  );
}
const L2 = p2,
  $2 = m2,
  z2 = u2,
  F2 = g2,
  B2 = d2,
  dp = c2,
  U2 = h2,
  W2 = (e, t, n) => {
    const r = new Map(),
      o = { platform: D2, ...n },
      s = { ...o.platform, _c: r };
    return i2(e, t, { ...o, platform: s });
  };
var V2 = typeof document < "u",
  H2 = function () {},
  xl = V2 ? p.useLayoutEffect : H2;
function Yl(e, t) {
  if (e === t) return !0;
  if (typeof e != typeof t) return !1;
  if (typeof e == "function" && e.toString() === t.toString()) return !0;
  let n, r, o;
  if (e && t && typeof e == "object") {
    if (Array.isArray(e)) {
      if (((n = e.length), n !== t.length)) return !1;
      for (r = n; r-- !== 0;) if (!Yl(e[r], t[r])) return !1;
      return !0;
    }
    if (((o = Object.keys(e)), (n = o.length), n !== Object.keys(t).length))
      return !1;
    for (r = n; r-- !== 0;) if (!{}.hasOwnProperty.call(t, o[r])) return !1;
    for (r = n; r-- !== 0;) {
      const s = o[r];
      if (!(s === "_owner" && e.$$typeof) && !Yl(e[s], t[s])) return !1;
    }
    return !0;
  }
  return e !== e && t !== t;
}
function Og(e) {
  return typeof window > "u"
    ? 1
    : (e.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function fp(e, t) {
  const n = Og(e);
  return Math.round(t * n) / n;
}
function gi(e) {
  const t = p.useRef(e);
  return (
    xl(() => {
      t.current = e;
    }),
    t
  );
}
function K2(e) {
  e === void 0 && (e = {});
  const {
      placement: t = "bottom",
      strategy: n = "absolute",
      middleware: r = [],
      platform: o,
      elements: { reference: s, floating: a } = {},
      transform: i = !0,
      whileElementsMounted: c,
      open: u,
    } = e,
    [d, f] = p.useState({
      x: 0,
      y: 0,
      strategy: n,
      placement: t,
      middlewareData: {},
      isPositioned: !1,
    }),
    [m, y] = p.useState(r);
  Yl(m, r) || y(r);
  const [w, x] = p.useState(null),
    [k, h] = p.useState(null),
    g = p.useCallback((_) => {
      _ !== C.current && ((C.current = _), x(_));
    }, []),
    v = p.useCallback((_) => {
      _ !== N.current && ((N.current = _), h(_));
    }, []),
    b = s || w,
    S = a || k,
    C = p.useRef(null),
    N = p.useRef(null),
    E = p.useRef(d),
    j = c != null,
    R = gi(c),
    M = gi(o),
    T = gi(u),
    D = p.useCallback(() => {
      if (!C.current || !N.current) return;
      const _ = { placement: t, strategy: n, middleware: m };
      (M.current && (_.platform = M.current),
        W2(C.current, N.current, _).then((P) => {
          const I = { ...P, isPositioned: T.current !== !1 };
          B.current &&
            !Yl(E.current, I) &&
            ((E.current = I),
            ro.flushSync(() => {
              f(I);
            }));
        }));
    }, [m, t, n, M, T]);
  xl(() => {
    u === !1 &&
      E.current.isPositioned &&
      ((E.current.isPositioned = !1), f((_) => ({ ..._, isPositioned: !1 })));
  }, [u]);
  const B = p.useRef(!1);
  (xl(
    () => (
      (B.current = !0),
      () => {
        B.current = !1;
      }
    ),
    [],
  ),
    xl(() => {
      if ((b && (C.current = b), S && (N.current = S), b && S)) {
        if (R.current) return R.current(b, S, D);
        D();
      }
    }, [b, S, D, R, j]));
  const Q = p.useMemo(
      () => ({ reference: C, floating: N, setReference: g, setFloating: v }),
      [g, v],
    ),
    F = p.useMemo(() => ({ reference: b, floating: S }), [b, S]),
    K = p.useMemo(() => {
      const _ = { position: n, left: 0, top: 0 };
      if (!F.floating) return _;
      const P = fp(F.floating, d.x),
        I = fp(F.floating, d.y);
      return i
        ? {
            ..._,
            transform: "translate(" + P + "px, " + I + "px)",
            ...(Og(F.floating) >= 1.5 && { willChange: "transform" }),
          }
        : { position: n, left: P, top: I };
    }, [n, i, F.floating, d.x, d.y]);
  return p.useMemo(
    () => ({ ...d, update: D, refs: Q, elements: F, floatingStyles: K }),
    [d, D, Q, F, K],
  );
}
const G2 = (e) => {
    function t(n) {
      return {}.hasOwnProperty.call(n, "current");
    }
    return {
      name: "arrow",
      options: e,
      fn(n) {
        const { element: r, padding: o } = typeof e == "function" ? e(n) : e;
        return r && t(r)
          ? r.current != null
            ? dp({ element: r.current, padding: o }).fn(n)
            : {}
          : r
            ? dp({ element: r, padding: o }).fn(n)
            : {};
      },
    };
  },
  Y2 = (e, t) => {
    const n = L2(e);
    return { name: n.name, fn: n.fn, options: [e, t] };
  },
  X2 = (e, t) => {
    const n = $2(e);
    return { name: n.name, fn: n.fn, options: [e, t] };
  },
  Q2 = (e, t) => ({ fn: U2(e).fn, options: [e, t] }),
  q2 = (e, t) => {
    const n = z2(e);
    return { name: n.name, fn: n.fn, options: [e, t] };
  },
  J2 = (e, t) => {
    const n = F2(e);
    return { name: n.name, fn: n.fn, options: [e, t] };
  },
  Z2 = (e, t) => {
    const n = B2(e);
    return { name: n.name, fn: n.fn, options: [e, t] };
  },
  ek = (e, t) => {
    const n = G2(e);
    return { name: n.name, fn: n.fn, options: [e, t] };
  };
var tk = "Arrow",
  Ig = p.forwardRef((e, t) => {
    const { children: n, width: r = 10, height: o = 5, ...s } = e;
    return l.jsx(pe.svg, {
      ...s,
      ref: t,
      width: r,
      height: o,
      viewBox: "0 0 30 10",
      preserveAspectRatio: "none",
      children: e.asChild ? n : l.jsx("polygon", { points: "0,0 30,0 15,10" }),
    });
  });
Ig.displayName = tk;
var nk = Ig;
function rk(e) {
  const [t, n] = p.useState(void 0);
  return (
    et(() => {
      if (e) {
        n({ width: e.offsetWidth, height: e.offsetHeight });
        const r = new ResizeObserver((o) => {
          if (!Array.isArray(o) || !o.length) return;
          const s = o[0];
          let a, i;
          if ("borderBoxSize" in s) {
            const c = s.borderBoxSize,
              u = Array.isArray(c) ? c[0] : c;
            ((a = u.inlineSize), (i = u.blockSize));
          } else ((a = e.offsetWidth), (i = e.offsetHeight));
          n({ width: a, height: i });
        });
        return (r.observe(e, { box: "border-box" }), () => r.unobserve(e));
      } else n(void 0);
    }, [e]),
    t
  );
}
var Zu = "Popper",
  [Lg, $g] = mn(Zu),
  [ok, zg] = Lg(Zu),
  Fg = (e) => {
    const { __scopePopper: t, children: n } = e,
      [r, o] = p.useState(null),
      [s, a] = p.useState(void 0);
    return l.jsx(ok, {
      scope: t,
      anchor: r,
      onAnchorChange: o,
      placementState: s,
      setPlacementState: a,
      children: n,
    });
  };
Fg.displayName = Zu;
var Bg = "PopperAnchor",
  Ug = p.forwardRef((e, t) => {
    const { __scopePopper: n, virtualRef: r, ...o } = e,
      s = zg(Bg, n),
      a = p.useRef(null),
      i = s.onAnchorChange,
      c = p.useCallback(
        (w) => {
          ((a.current = w), w && i(w));
        },
        [i],
      ),
      u = le(t, c),
      d = p.useRef(null);
    p.useEffect(() => {
      if (!r) return;
      const w = d.current;
      ((d.current = r.current), w !== d.current && i(d.current));
    });
    const f = s.placementState && td(s.placementState),
      m = f == null ? void 0 : f[0],
      y = f == null ? void 0 : f[1];
    return r
      ? null
      : l.jsx(pe.div, {
          "data-radix-popper-side": m,
          "data-radix-popper-align": y,
          ...o,
          ref: u,
        });
  });
Ug.displayName = Bg;
var ed = "PopperContent",
  [sk, lk] = Lg(ed),
  Wg = p.forwardRef((e, t) => {
    var Fe, Re, Ae, Jt, ao, io;
    const {
        __scopePopper: n,
        side: r = "bottom",
        sideOffset: o = 0,
        align: s = "center",
        alignOffset: a = 0,
        arrowPadding: i = 0,
        avoidCollisions: c = !0,
        collisionBoundary: u = [],
        collisionPadding: d = 0,
        sticky: f = "partial",
        hideWhenDetached: m = !1,
        updatePositionStrategy: y = "optimized",
        onPlaced: w,
        ...x
      } = e,
      k = zg(ed, n),
      [h, g] = p.useState(null),
      v = le(t, (Y) => g(Y)),
      [b, S] = p.useState(null),
      C = rk(b),
      N = (C == null ? void 0 : C.width) ?? 0,
      E = (C == null ? void 0 : C.height) ?? 0,
      j = r + (s !== "center" ? "-" + s : ""),
      R =
        typeof d == "number"
          ? d
          : { top: 0, right: 0, bottom: 0, left: 0, ...d },
      M = Array.isArray(u) ? u : [u],
      T = M.length > 0,
      D = { padding: R, boundary: M.filter(ik), altBoundary: T },
      {
        refs: B,
        floatingStyles: Q,
        placement: F,
        isPositioned: K,
        middlewareData: _,
      } = K2({
        strategy: "fixed",
        placement: j,
        whileElementsMounted: (...Y) =>
          I2(...Y, { animationFrame: y === "always" }),
        elements: { reference: k.anchor },
        middleware: [
          Y2({ mainAxis: o + E, alignmentAxis: a }),
          c &&
            X2({
              mainAxis: !0,
              crossAxis: !1,
              limiter: f === "partial" ? Q2() : void 0,
              ...D,
            }),
          c && q2({ ...D }),
          J2({
            ...D,
            apply: ({
              elements: Y,
              rects: co,
              availableWidth: Es,
              availableHeight: uo,
            }) => {
              const { width: Ia, height: La } = co.reference,
                kt = Y.floating.style;
              (kt.setProperty("--radix-popper-available-width", `${Es}px`),
                kt.setProperty("--radix-popper-available-height", `${uo}px`),
                kt.setProperty("--radix-popper-anchor-width", `${Ia}px`),
                kt.setProperty("--radix-popper-anchor-height", `${La}px`));
            },
          }),
          b && ek({ element: b, padding: i }),
          ck({ arrowWidth: N, arrowHeight: E }),
          m &&
            Z2({
              strategy: "referenceHidden",
              ...D,
              boundary: T ? D.boundary : void 0,
            }),
        ],
      }),
      P = k.setPlacementState;
    et(
      () => (
        P(F),
        () => {
          P(void 0);
        }
      ),
      [F, P],
    );
    const [I, V] = td(F),
      J = be(w);
    et(() => {
      K && (J == null || J());
    }, [K, J]);
    const Ne = (Fe = _.arrow) == null ? void 0 : Fe.x,
      O = (Re = _.arrow) == null ? void 0 : Re.y,
      L = ((Ae = _.arrow) == null ? void 0 : Ae.centerOffset) !== 0,
      [U, te] = p.useState();
    return (
      et(() => {
        h && te(window.getComputedStyle(h).zIndex);
      }, [h]),
      l.jsx("div", {
        ref: B.setFloating,
        "data-radix-popper-content-wrapper": "",
        style: {
          ...Q,
          transform: K ? Q.transform : "translate(0, -200%)",
          minWidth: "max-content",
          zIndex: U,
          "--radix-popper-transform-origin": [
            (Jt = _.transformOrigin) == null ? void 0 : Jt.x,
            (ao = _.transformOrigin) == null ? void 0 : ao.y,
          ].join(" "),
          ...(((io = _.hide) == null ? void 0 : io.referenceHidden) && {
            visibility: "hidden",
            pointerEvents: "none",
          }),
        },
        dir: e.dir,
        children: l.jsx(sk, {
          scope: n,
          placedSide: I,
          placedAlign: V,
          onArrowChange: S,
          arrowX: Ne,
          arrowY: O,
          shouldHideArrow: L,
          children: l.jsx(pe.div, {
            "data-side": I,
            "data-align": V,
            ...x,
            ref: v,
            style: { ...x.style, animation: K ? void 0 : "none" },
          }),
        }),
      })
    );
  });
Wg.displayName = ed;
var Vg = "PopperArrow",
  ak = { top: "bottom", right: "left", bottom: "top", left: "right" },
  Hg = p.forwardRef(function (t, n) {
    const { __scopePopper: r, ...o } = t,
      s = lk(Vg, r),
      a = ak[s.placedSide];
    return l.jsx("span", {
      ref: s.onArrowChange,
      style: {
        position: "absolute",
        left: s.arrowX,
        top: s.arrowY,
        [a]: 0,
        transformOrigin: {
          top: "",
          right: "0 0",
          bottom: "center 0",
          left: "100% 0",
        }[s.placedSide],
        transform: {
          top: "translateY(100%)",
          right: "translateY(50%) rotate(90deg) translateX(-50%)",
          bottom: "rotate(180deg)",
          left: "translateY(50%) rotate(-90deg) translateX(50%)",
        }[s.placedSide],
        visibility: s.shouldHideArrow ? "hidden" : void 0,
      },
      children: l.jsx(nk, {
        ...o,
        ref: n,
        style: { ...o.style, display: "block" },
      }),
    });
  });
Hg.displayName = Vg;
function ik(e) {
  return e !== null;
}
var ck = (e) => ({
  name: "transformOrigin",
  options: e,
  fn(t) {
    var k, h, g;
    const { placement: n, rects: r, middlewareData: o } = t,
      a = ((k = o.arrow) == null ? void 0 : k.centerOffset) !== 0,
      i = a ? 0 : e.arrowWidth,
      c = a ? 0 : e.arrowHeight,
      [u, d] = td(n),
      f = { start: "0%", center: "50%", end: "100%" }[d],
      m = (((h = o.arrow) == null ? void 0 : h.x) ?? 0) + i / 2,
      y = (((g = o.arrow) == null ? void 0 : g.y) ?? 0) + c / 2;
    let w = "",
      x = "";
    return (
      u === "bottom"
        ? ((w = a ? f : `${m}px`), (x = `${-c}px`))
        : u === "top"
          ? ((w = a ? f : `${m}px`), (x = `${r.floating.height + c}px`))
          : u === "right"
            ? ((w = `${-c}px`), (x = a ? f : `${y}px`))
            : u === "left" &&
              ((w = `${r.floating.width + c}px`), (x = a ? f : `${y}px`)),
      { data: { x: w, y: x } }
    );
  },
});
function td(e) {
  const [t, n = "center"] = e.split("-");
  return [t, n];
}
var uk = Fg,
  dk = Ug,
  fk = Wg,
  pk = Hg,
  mk = "Portal",
  Kg = p.forwardRef((e, t) => {
    var i;
    const { container: n, ...r } = e,
      [o, s] = p.useState(!1);
    et(() => s(!0), []);
    const a =
      n ||
      (o &&
        ((i = globalThis == null ? void 0 : globalThis.document) == null
          ? void 0
          : i.body));
    return a ? ro.createPortal(l.jsx(pe.div, { ...r, ref: t }), a) : null;
  });
Kg.displayName = mk;
function hk(e, t) {
  return p.useReducer((n, r) => t[n][r] ?? n, e);
}
var bt = (e) => {
  const { present: t, children: n } = e,
    r = gk(t),
    o =
      typeof n == "function" ? n({ present: r.isPresent }) : p.Children.only(n),
    s = vk(r.ref, xk(o));
  return typeof n == "function" || r.isPresent
    ? p.cloneElement(o, { ref: s })
    : null;
};
bt.displayName = "Presence";
function gk(e) {
  const [t, n] = p.useState(),
    r = p.useRef(null),
    o = p.useRef(e),
    s = p.useRef("none"),
    a = e ? "mounted" : "unmounted",
    [i, c] = hk(a, {
      mounted: { UNMOUNT: "unmounted", ANIMATION_OUT: "unmountSuspended" },
      unmountSuspended: { MOUNT: "mounted", ANIMATION_END: "unmounted" },
      unmounted: { MOUNT: "mounted" },
    });
  return (
    p.useEffect(() => {
      const u = Xs(r.current);
      s.current = i === "mounted" ? u : "none";
    }, [i]),
    et(() => {
      const u = r.current,
        d = o.current;
      if (d !== e) {
        const m = s.current,
          y = Xs(u);
        (e
          ? c("MOUNT")
          : y === "none" || (u == null ? void 0 : u.display) === "none"
            ? c("UNMOUNT")
            : c(d && m !== y ? "ANIMATION_OUT" : "UNMOUNT"),
          (o.current = e));
      }
    }, [e, c]),
    et(() => {
      if (t) {
        let u;
        const d = t.ownerDocument.defaultView ?? window,
          f = (y) => {
            const x = Xs(r.current).includes(CSS.escape(y.animationName));
            if (y.target === t && x && (c("ANIMATION_END"), !o.current)) {
              const k = t.style.animationFillMode;
              ((t.style.animationFillMode = "forwards"),
                (u = d.setTimeout(() => {
                  t.style.animationFillMode === "forwards" &&
                    (t.style.animationFillMode = k);
                })));
            }
          },
          m = (y) => {
            y.target === t && (s.current = Xs(r.current));
          };
        return (
          t.addEventListener("animationstart", m),
          t.addEventListener("animationcancel", f),
          t.addEventListener("animationend", f),
          () => {
            (d.clearTimeout(u),
              t.removeEventListener("animationstart", m),
              t.removeEventListener("animationcancel", f),
              t.removeEventListener("animationend", f));
          }
        );
      } else c("ANIMATION_END");
    }, [t, c]),
    {
      isPresent: ["mounted", "unmountSuspended"].includes(i),
      ref: p.useCallback((u) => {
        ((r.current = u ? getComputedStyle(u) : null), n(u));
      }, []),
    }
  );
}
function pp(e, t) {
  if (typeof e == "function") return e(t);
  e != null && (e.current = t);
}
function vk(...e) {
  const t = p.useRef(e);
  return (
    (t.current = e),
    p.useCallback((n) => {
      const r = t.current;
      let o = !1;
      const s = r.map((a) => {
        const i = pp(a, n);
        return (!o && typeof i == "function" && (o = !0), i);
      });
      if (o)
        return () => {
          for (let a = 0; a < s.length; a++) {
            const i = s[a];
            typeof i == "function" ? i() : pp(r[a], null);
          }
        };
    }, [])
  );
}
function Xs(e) {
  return (e == null ? void 0 : e.animationName) || "none";
}
function xk(e) {
  var r, o;
  let t =
      (r = Object.getOwnPropertyDescriptor(e.props, "ref")) == null
        ? void 0
        : r.get,
    n = t && "isReactWarning" in t && t.isReactWarning;
  return n
    ? e.ref
    : ((t =
        (o = Object.getOwnPropertyDescriptor(e, "ref")) == null
          ? void 0
          : o.get),
      (n = t && "isReactWarning" in t && t.isReactWarning),
      n ? e.props.ref : e.props.ref || e.ref);
}
var vi = "rovingFocusGroup.onEntryFocus",
  yk = { bubbles: !1, cancelable: !0 },
  xs = "RovingFocusGroup",
  [Pc, Gg, wk] = xg(xs),
  [bk, Yg] = mn(xs, [wk]),
  [Sk, kk] = bk(xs),
  Xg = p.forwardRef((e, t) =>
    l.jsx(Pc.Provider, {
      scope: e.__scopeRovingFocusGroup,
      children: l.jsx(Pc.Slot, {
        scope: e.__scopeRovingFocusGroup,
        children: l.jsx(Nk, { ...e, ref: t }),
      }),
    }),
  );
Xg.displayName = xs;
var Nk = p.forwardRef((e, t) => {
    const {
        __scopeRovingFocusGroup: n,
        orientation: r,
        loop: o = !1,
        dir: s,
        currentTabStopId: a,
        defaultCurrentTabStopId: i,
        onCurrentTabStopIdChange: c,
        onEntryFocus: u,
        preventScrollOnEntryFocus: d = !1,
        ...f
      } = e,
      m = p.useRef(null),
      y = le(t, m),
      w = Ku(s),
      [x, k] = Hu({ prop: a, defaultProp: i ?? null, onChange: c, caller: xs }),
      [h, g] = p.useState(!1),
      v = be(u),
      b = Gg(n),
      S = p.useRef(!1),
      [C, N] = p.useState(0);
    return (
      p.useEffect(() => {
        const E = m.current;
        if (E)
          return (
            E.addEventListener(vi, v),
            () => E.removeEventListener(vi, v)
          );
      }, [v]),
      l.jsx(Sk, {
        scope: n,
        orientation: r,
        dir: w,
        loop: o,
        currentTabStopId: x,
        onItemFocus: p.useCallback((E) => k(E), [k]),
        onItemShiftTab: p.useCallback(() => g(!0), []),
        onFocusableItemAdd: p.useCallback(() => N((E) => E + 1), []),
        onFocusableItemRemove: p.useCallback(() => N((E) => E - 1), []),
        children: l.jsx(pe.div, {
          tabIndex: h || C === 0 ? -1 : 0,
          "data-orientation": r,
          ...f,
          ref: y,
          style: { outline: "none", ...e.style },
          onMouseDown: W(e.onMouseDown, () => {
            S.current = !0;
          }),
          onFocus: W(e.onFocus, (E) => {
            const j = !S.current;
            if (E.target === E.currentTarget && j && !h) {
              const R = new CustomEvent(vi, yk);
              if ((E.currentTarget.dispatchEvent(R), !R.defaultPrevented)) {
                const M = b().filter((F) => F.focusable),
                  T = M.find((F) => F.active),
                  D = M.find((F) => F.id === x),
                  Q = [T, D, ...M].filter(Boolean).map((F) => F.ref.current);
                Jg(Q, d);
              }
            }
            S.current = !1;
          }),
          onBlur: W(e.onBlur, () => g(!1)),
        }),
      })
    );
  }),
  Qg = "RovingFocusGroupItem",
  qg = p.forwardRef((e, t) => {
    const {
        __scopeRovingFocusGroup: n,
        focusable: r = !0,
        active: o = !1,
        tabStopId: s,
        children: a,
        ...i
      } = e,
      c = zr(),
      u = s || c,
      d = kk(Qg, n),
      f = d.currentTabStopId === u,
      m = Gg(n),
      {
        onFocusableItemAdd: y,
        onFocusableItemRemove: w,
        currentTabStopId: x,
      } = d;
    return (
      p.useEffect(() => {
        if (r) return (y(), () => w());
      }, [r, y, w]),
      l.jsx(Pc.ItemSlot, {
        scope: n,
        id: u,
        focusable: r,
        active: o,
        children: l.jsx(pe.span, {
          tabIndex: f ? 0 : -1,
          "data-orientation": d.orientation,
          ...i,
          ref: t,
          onMouseDown: W(e.onMouseDown, (k) => {
            r ? d.onItemFocus(u) : k.preventDefault();
          }),
          onFocus: W(e.onFocus, () => d.onItemFocus(u)),
          onKeyDown: W(e.onKeyDown, (k) => {
            if (k.key === "Tab" && k.shiftKey) {
              d.onItemShiftTab();
              return;
            }
            if (k.target !== k.currentTarget) return;
            const h = jk(k, d.orientation, d.dir);
            if (h !== void 0) {
              if (k.metaKey || k.ctrlKey || k.altKey || k.shiftKey) return;
              k.preventDefault();
              let v = m()
                .filter((b) => b.focusable)
                .map((b) => b.ref.current);
              if (h === "last") v.reverse();
              else if (h === "prev" || h === "next") {
                h === "prev" && v.reverse();
                const b = v.indexOf(k.currentTarget);
                v = d.loop ? Rk(v, b + 1) : v.slice(b + 1);
              }
              setTimeout(() => Jg(v));
            }
          }),
          children:
            typeof a == "function"
              ? a({ isCurrentTabStop: f, hasTabStop: x != null })
              : a,
        }),
      })
    );
  });
qg.displayName = Qg;
var Ck = {
  ArrowLeft: "prev",
  ArrowUp: "prev",
  ArrowRight: "next",
  ArrowDown: "next",
  PageUp: "first",
  Home: "first",
  PageDown: "last",
  End: "last",
};
function Ek(e, t) {
  return t !== "rtl"
    ? e
    : e === "ArrowLeft"
      ? "ArrowRight"
      : e === "ArrowRight"
        ? "ArrowLeft"
        : e;
}
function jk(e, t, n) {
  const r = Ek(e.key, n);
  if (
    !(t === "vertical" && ["ArrowLeft", "ArrowRight"].includes(r)) &&
    !(t === "horizontal" && ["ArrowUp", "ArrowDown"].includes(r))
  )
    return Ck[r];
}
function Jg(e, t = !1) {
  const n = document.activeElement;
  for (const r of e)
    if (
      r === n ||
      (r.focus({ preventScroll: t }), document.activeElement !== n)
    )
      return;
}
function Rk(e, t) {
  return e.map((n, r) => e[(t + r) % e.length]);
}
var _k = Xg,
  Pk = qg,
  Mk = function (e) {
    if (typeof document > "u") return null;
    var t = Array.isArray(e) ? e[0] : e;
    return t.ownerDocument.body;
  },
  gr = new WeakMap(),
  Qs = new WeakMap(),
  qs = {},
  xi = 0,
  Zg = function (e) {
    return e && (e.host || Zg(e.parentNode));
  },
  Ak = function (e, t) {
    return t
      .map(function (n) {
        if (e.contains(n)) return n;
        var r = Zg(n);
        return r && e.contains(r)
          ? r
          : (console.error(
              "aria-hidden",
              n,
              "in not contained inside",
              e,
              ". Doing nothing",
            ),
            null);
      })
      .filter(function (n) {
        return !!n;
      });
  },
  Tk = function (e, t, n, r) {
    var o = Ak(t, Array.isArray(e) ? e : [e]);
    qs[n] || (qs[n] = new WeakMap());
    var s = qs[n],
      a = [],
      i = new Set(),
      c = new Set(o),
      u = function (f) {
        !f || i.has(f) || (i.add(f), u(f.parentNode));
      };
    o.forEach(u);
    var d = function (f) {
      !f ||
        c.has(f) ||
        Array.prototype.forEach.call(f.children, function (m) {
          if (i.has(m)) d(m);
          else
            try {
              var y = m.getAttribute(r),
                w = y !== null && y !== "false",
                x = (gr.get(m) || 0) + 1,
                k = (s.get(m) || 0) + 1;
              (gr.set(m, x),
                s.set(m, k),
                a.push(m),
                x === 1 && w && Qs.set(m, !0),
                k === 1 && m.setAttribute(n, "true"),
                w || m.setAttribute(r, "true"));
            } catch (h) {
              console.error("aria-hidden: cannot operate on ", m, h);
            }
        });
    };
    return (
      d(t),
      i.clear(),
      xi++,
      function () {
        (a.forEach(function (f) {
          var m = gr.get(f) - 1,
            y = s.get(f) - 1;
          (gr.set(f, m),
            s.set(f, y),
            m || (Qs.has(f) || f.removeAttribute(r), Qs.delete(f)),
            y || f.removeAttribute(n));
        }),
          xi--,
          xi ||
            ((gr = new WeakMap()),
            (gr = new WeakMap()),
            (Qs = new WeakMap()),
            (qs = {})));
      }
    );
  },
  ev = function (e, t, n) {
    n === void 0 && (n = "data-aria-hidden");
    var r = Array.from(Array.isArray(e) ? e : [e]),
      o = Mk(e);
    return o
      ? (r.push.apply(r, Array.from(o.querySelectorAll("[aria-live], script"))),
        Tk(r, o, n, "aria-hidden"))
      : function () {
          return null;
        };
  },
  Vt = function () {
    return (
      (Vt =
        Object.assign ||
        function (t) {
          for (var n, r = 1, o = arguments.length; r < o; r++) {
            n = arguments[r];
            for (var s in n)
              Object.prototype.hasOwnProperty.call(n, s) && (t[s] = n[s]);
          }
          return t;
        }),
      Vt.apply(this, arguments)
    );
  };
function tv(e, t) {
  var n = {};
  for (var r in e)
    Object.prototype.hasOwnProperty.call(e, r) &&
      t.indexOf(r) < 0 &&
      (n[r] = e[r]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var o = 0, r = Object.getOwnPropertySymbols(e); o < r.length; o++)
      t.indexOf(r[o]) < 0 &&
        Object.prototype.propertyIsEnumerable.call(e, r[o]) &&
        (n[r[o]] = e[r[o]]);
  return n;
}
function Dk(e, t, n) {
  if (n || arguments.length === 2)
    for (var r = 0, o = t.length, s; r < o; r++)
      (s || !(r in t)) &&
        (s || (s = Array.prototype.slice.call(t, 0, r)), (s[r] = t[r]));
  return e.concat(s || Array.prototype.slice.call(t));
}
var yl = "right-scroll-bar-position",
  wl = "width-before-scroll-bar",
  Ok = "with-scroll-bars-hidden",
  Ik = "--removed-body-scroll-bar-size";
function yi(e, t) {
  return (typeof e == "function" ? e(t) : e && (e.current = t), e);
}
function Lk(e, t) {
  var n = p.useState(function () {
    return {
      value: e,
      callback: t,
      facade: {
        get current() {
          return n.value;
        },
        set current(r) {
          var o = n.value;
          o !== r && ((n.value = r), n.callback(r, o));
        },
      },
    };
  })[0];
  return ((n.callback = t), n.facade);
}
var $k = typeof window < "u" ? p.useLayoutEffect : p.useEffect,
  mp = new WeakMap();
function zk(e, t) {
  var n = Lk(null, function (r) {
    return e.forEach(function (o) {
      return yi(o, r);
    });
  });
  return (
    $k(
      function () {
        var r = mp.get(n);
        if (r) {
          var o = new Set(r),
            s = new Set(e),
            a = n.current;
          (o.forEach(function (i) {
            s.has(i) || yi(i, null);
          }),
            s.forEach(function (i) {
              o.has(i) || yi(i, a);
            }));
        }
        mp.set(n, e);
      },
      [e],
    ),
    n
  );
}
function Fk(e) {
  return e;
}
function Bk(e, t) {
  t === void 0 && (t = Fk);
  var n = [],
    r = !1,
    o = {
      read: function () {
        if (r)
          throw new Error(
            "Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.",
          );
        return n.length ? n[n.length - 1] : e;
      },
      useMedium: function (s) {
        var a = t(s, r);
        return (
          n.push(a),
          function () {
            n = n.filter(function (i) {
              return i !== a;
            });
          }
        );
      },
      assignSyncMedium: function (s) {
        for (r = !0; n.length;) {
          var a = n;
          ((n = []), a.forEach(s));
        }
        n = {
          push: function (i) {
            return s(i);
          },
          filter: function () {
            return n;
          },
        };
      },
      assignMedium: function (s) {
        r = !0;
        var a = [];
        if (n.length) {
          var i = n;
          ((n = []), i.forEach(s), (a = n));
        }
        var c = function () {
            var d = a;
            ((a = []), d.forEach(s));
          },
          u = function () {
            return Promise.resolve().then(c);
          };
        (u(),
          (n = {
            push: function (d) {
              (a.push(d), u());
            },
            filter: function (d) {
              return ((a = a.filter(d)), n);
            },
          }));
      },
    };
  return o;
}
function Uk(e) {
  e === void 0 && (e = {});
  var t = Bk(null);
  return ((t.options = Vt({ async: !0, ssr: !1 }, e)), t);
}
var nv = function (e) {
  var t = e.sideCar,
    n = tv(e, ["sideCar"]);
  if (!t)
    throw new Error(
      "Sidecar: please provide `sideCar` property to import the right car",
    );
  var r = t.read();
  if (!r) throw new Error("Sidecar medium not found");
  return p.createElement(r, Vt({}, n));
};
nv.isSideCarExport = !0;
function Wk(e, t) {
  return (e.useMedium(t), nv);
}
var rv = Uk(),
  wi = function () {},
  Na = p.forwardRef(function (e, t) {
    var n = p.useRef(null),
      r = p.useState({
        onScrollCapture: wi,
        onWheelCapture: wi,
        onTouchMoveCapture: wi,
      }),
      o = r[0],
      s = r[1],
      a = e.forwardProps,
      i = e.children,
      c = e.className,
      u = e.removeScrollBar,
      d = e.enabled,
      f = e.shards,
      m = e.sideCar,
      y = e.noRelative,
      w = e.noIsolation,
      x = e.inert,
      k = e.allowPinchZoom,
      h = e.as,
      g = h === void 0 ? "div" : h,
      v = e.gapMode,
      b = tv(e, [
        "forwardProps",
        "children",
        "className",
        "removeScrollBar",
        "enabled",
        "shards",
        "sideCar",
        "noRelative",
        "noIsolation",
        "inert",
        "allowPinchZoom",
        "as",
        "gapMode",
      ]),
      S = m,
      C = zk([n, t]),
      N = Vt(Vt({}, b), o);
    return p.createElement(
      p.Fragment,
      null,
      d &&
        p.createElement(S, {
          sideCar: rv,
          removeScrollBar: u,
          shards: f,
          noRelative: y,
          noIsolation: w,
          inert: x,
          setCallbacks: s,
          allowPinchZoom: !!k,
          lockRef: n,
          gapMode: v,
        }),
      a
        ? p.cloneElement(p.Children.only(i), Vt(Vt({}, N), { ref: C }))
        : p.createElement(g, Vt({}, N, { className: c, ref: C }), i),
    );
  });
Na.defaultProps = { enabled: !0, removeScrollBar: !0, inert: !1 };
Na.classNames = { fullWidth: wl, zeroRight: yl };
var Vk = function () {
  if (typeof __webpack_nonce__ < "u") return __webpack_nonce__;
};
function Hk() {
  if (!document) return null;
  var e = document.createElement("style");
  e.type = "text/css";
  var t = Vk();
  return (t && e.setAttribute("nonce", t), e);
}
function Kk(e, t) {
  e.styleSheet
    ? (e.styleSheet.cssText = t)
    : e.appendChild(document.createTextNode(t));
}
function Gk(e) {
  var t = document.head || document.getElementsByTagName("head")[0];
  t.appendChild(e);
}
var Yk = function () {
    var e = 0,
      t = null;
    return {
      add: function (n) {
        (e == 0 && (t = Hk()) && (Kk(t, n), Gk(t)), e++);
      },
      remove: function () {
        (e--,
          !e && t && (t.parentNode && t.parentNode.removeChild(t), (t = null)));
      },
    };
  },
  Xk = function () {
    var e = Yk();
    return function (t, n) {
      p.useEffect(
        function () {
          return (
            e.add(t),
            function () {
              e.remove();
            }
          );
        },
        [t && n],
      );
    };
  },
  ov = function () {
    var e = Xk(),
      t = function (n) {
        var r = n.styles,
          o = n.dynamic;
        return (e(r, o), null);
      };
    return t;
  },
  Qk = { left: 0, top: 0, right: 0, gap: 0 },
  bi = function (e) {
    return parseInt(e || "", 10) || 0;
  },
  qk = function (e) {
    var t = window.getComputedStyle(document.body),
      n = t[e === "padding" ? "paddingLeft" : "marginLeft"],
      r = t[e === "padding" ? "paddingTop" : "marginTop"],
      o = t[e === "padding" ? "paddingRight" : "marginRight"];
    return [bi(n), bi(r), bi(o)];
  },
  Jk = function (e) {
    if ((e === void 0 && (e = "margin"), typeof window > "u")) return Qk;
    var t = qk(e),
      n = document.documentElement.clientWidth,
      r = window.innerWidth;
    return {
      left: t[0],
      top: t[1],
      right: t[2],
      gap: Math.max(0, r - n + t[2] - t[0]),
    };
  },
  Zk = ov(),
  Br = "data-scroll-locked",
  eN = function (e, t, n, r) {
    var o = e.left,
      s = e.top,
      a = e.right,
      i = e.gap;
    return (
      n === void 0 && (n = "margin"),
      `
  .`
        .concat(
          Ok,
          ` {
   overflow: hidden `,
        )
        .concat(
          r,
          `;
   padding-right: `,
        )
        .concat(i, "px ")
        .concat(
          r,
          `;
  }
  body[`,
        )
        .concat(
          Br,
          `] {
    overflow: hidden `,
        )
        .concat(
          r,
          `;
    overscroll-behavior: contain;
    `,
        )
        .concat(
          [
            t && "position: relative ".concat(r, ";"),
            n === "margin" &&
              `
    padding-left: `
                .concat(
                  o,
                  `px;
    padding-top: `,
                )
                .concat(
                  s,
                  `px;
    padding-right: `,
                )
                .concat(
                  a,
                  `px;
    margin-left:0;
    margin-top:0;
    margin-right: `,
                )
                .concat(i, "px ")
                .concat(
                  r,
                  `;
    `,
                ),
            n === "padding" &&
              "padding-right: ".concat(i, "px ").concat(r, ";"),
          ]
            .filter(Boolean)
            .join(""),
          `
  }
  
  .`,
        )
        .concat(
          yl,
          ` {
    right: `,
        )
        .concat(i, "px ")
        .concat(
          r,
          `;
  }
  
  .`,
        )
        .concat(
          wl,
          ` {
    margin-right: `,
        )
        .concat(i, "px ")
        .concat(
          r,
          `;
  }
  
  .`,
        )
        .concat(yl, " .")
        .concat(
          yl,
          ` {
    right: 0 `,
        )
        .concat(
          r,
          `;
  }
  
  .`,
        )
        .concat(wl, " .")
        .concat(
          wl,
          ` {
    margin-right: 0 `,
        )
        .concat(
          r,
          `;
  }
  
  body[`,
        )
        .concat(
          Br,
          `] {
    `,
        )
        .concat(Ik, ": ")
        .concat(
          i,
          `px;
  }
`,
        )
    );
  },
  hp = function () {
    var e = parseInt(document.body.getAttribute(Br) || "0", 10);
    return isFinite(e) ? e : 0;
  },
  tN = function () {
    p.useEffect(function () {
      return (
        document.body.setAttribute(Br, (hp() + 1).toString()),
        function () {
          var e = hp() - 1;
          e <= 0
            ? document.body.removeAttribute(Br)
            : document.body.setAttribute(Br, e.toString());
        }
      );
    }, []);
  },
  nN = function (e) {
    var t = e.noRelative,
      n = e.noImportant,
      r = e.gapMode,
      o = r === void 0 ? "margin" : r;
    tN();
    var s = p.useMemo(
      function () {
        return Jk(o);
      },
      [o],
    );
    return p.createElement(Zk, { styles: eN(s, !t, o, n ? "" : "!important") });
  },
  Mc = !1;
if (typeof window < "u")
  try {
    var Js = Object.defineProperty({}, "passive", {
      get: function () {
        return ((Mc = !0), !0);
      },
    });
    (window.addEventListener("test", Js, Js),
      window.removeEventListener("test", Js, Js));
  } catch {
    Mc = !1;
  }
var vr = Mc ? { passive: !1 } : !1,
  rN = function (e) {
    return e.tagName === "TEXTAREA";
  },
  sv = function (e, t) {
    if (!(e instanceof Element)) return !1;
    var n = window.getComputedStyle(e);
    return (
      n[t] !== "hidden" &&
      !(n.overflowY === n.overflowX && !rN(e) && n[t] === "visible")
    );
  },
  oN = function (e) {
    return sv(e, "overflowY");
  },
  sN = function (e) {
    return sv(e, "overflowX");
  },
  gp = function (e, t) {
    var n = t.ownerDocument,
      r = t;
    do {
      typeof ShadowRoot < "u" && r instanceof ShadowRoot && (r = r.host);
      var o = lv(e, r);
      if (o) {
        var s = av(e, r),
          a = s[1],
          i = s[2];
        if (a > i) return !0;
      }
      r = r.parentNode;
    } while (r && r !== n.body);
    return !1;
  },
  lN = function (e) {
    var t = e.scrollTop,
      n = e.scrollHeight,
      r = e.clientHeight;
    return [t, n, r];
  },
  aN = function (e) {
    var t = e.scrollLeft,
      n = e.scrollWidth,
      r = e.clientWidth;
    return [t, n, r];
  },
  lv = function (e, t) {
    return e === "v" ? oN(t) : sN(t);
  },
  av = function (e, t) {
    return e === "v" ? lN(t) : aN(t);
  },
  iN = function (e, t) {
    return e === "h" && t === "rtl" ? -1 : 1;
  },
  cN = function (e, t, n, r, o) {
    var s = iN(e, window.getComputedStyle(t).direction),
      a = s * r,
      i = n.target,
      c = t.contains(i),
      u = !1,
      d = a > 0,
      f = 0,
      m = 0;
    do {
      if (!i) break;
      var y = av(e, i),
        w = y[0],
        x = y[1],
        k = y[2],
        h = x - k - s * w;
      (w || h) && lv(e, i) && ((f += h), (m += w));
      var g = i.parentNode;
      i = g && g.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? g.host : g;
    } while ((!c && i !== document.body) || (c && (t.contains(i) || t === i)));
    return (((d && Math.abs(f) < 1) || (!d && Math.abs(m) < 1)) && (u = !0), u);
  },
  Zs = function (e) {
    return "changedTouches" in e
      ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY]
      : [0, 0];
  },
  vp = function (e) {
    return [e.deltaX, e.deltaY];
  },
  xp = function (e) {
    return e && "current" in e ? e.current : e;
  },
  uN = function (e, t) {
    return e[0] === t[0] && e[1] === t[1];
  },
  dN = function (e) {
    return `
  .block-interactivity-`
      .concat(
        e,
        ` {pointer-events: none;}
  .allow-interactivity-`,
      )
      .concat(
        e,
        ` {pointer-events: all;}
`,
      );
  },
  fN = 0,
  xr = [];
function pN(e) {
  var t = p.useRef([]),
    n = p.useRef([0, 0]),
    r = p.useRef(),
    o = p.useState(fN++)[0],
    s = p.useState(ov)[0],
    a = p.useRef(e);
  (p.useEffect(
    function () {
      a.current = e;
    },
    [e],
  ),
    p.useEffect(
      function () {
        if (e.inert) {
          document.body.classList.add("block-interactivity-".concat(o));
          var x = Dk([e.lockRef.current], (e.shards || []).map(xp), !0).filter(
            Boolean,
          );
          return (
            x.forEach(function (k) {
              return k.classList.add("allow-interactivity-".concat(o));
            }),
            function () {
              (document.body.classList.remove("block-interactivity-".concat(o)),
                x.forEach(function (k) {
                  return k.classList.remove("allow-interactivity-".concat(o));
                }));
            }
          );
        }
      },
      [e.inert, e.lockRef.current, e.shards],
    ));
  var i = p.useCallback(function (x, k) {
      if (
        ("touches" in x && x.touches.length === 2) ||
        (x.type === "wheel" && x.ctrlKey)
      )
        return !a.current.allowPinchZoom;
      var h = Zs(x),
        g = n.current,
        v = "deltaX" in x ? x.deltaX : g[0] - h[0],
        b = "deltaY" in x ? x.deltaY : g[1] - h[1],
        S,
        C = x.target,
        N = Math.abs(v) > Math.abs(b) ? "h" : "v";
      if ("touches" in x && N === "h" && C.type === "range") return !1;
      var E = window.getSelection(),
        j = E && E.anchorNode,
        R = j ? j === C || j.contains(C) : !1;
      if (R) return !1;
      var M = gp(N, C);
      if (!M) return !0;
      if ((M ? (S = N) : ((S = N === "v" ? "h" : "v"), (M = gp(N, C))), !M))
        return !1;
      if (
        (!r.current && "changedTouches" in x && (v || b) && (r.current = S), !S)
      )
        return !0;
      var T = r.current || S;
      return cN(T, k, x, T === "h" ? v : b);
    }, []),
    c = p.useCallback(function (x) {
      var k = x;
      if (!(!xr.length || xr[xr.length - 1] !== s)) {
        var h = "deltaY" in k ? vp(k) : Zs(k),
          g = t.current.filter(function (S) {
            return (
              S.name === k.type &&
              (S.target === k.target || k.target === S.shadowParent) &&
              uN(S.delta, h)
            );
          })[0];
        if (g && g.should) {
          k.cancelable && k.preventDefault();
          return;
        }
        if (!g) {
          var v = (a.current.shards || [])
              .map(xp)
              .filter(Boolean)
              .filter(function (S) {
                return S.contains(k.target);
              }),
            b = v.length > 0 ? i(k, v[0]) : !a.current.noIsolation;
          b && k.cancelable && k.preventDefault();
        }
      }
    }, []),
    u = p.useCallback(function (x, k, h, g) {
      var v = { name: x, delta: k, target: h, should: g, shadowParent: mN(h) };
      (t.current.push(v),
        setTimeout(function () {
          t.current = t.current.filter(function (b) {
            return b !== v;
          });
        }, 1));
    }, []),
    d = p.useCallback(function (x) {
      ((n.current = Zs(x)), (r.current = void 0));
    }, []),
    f = p.useCallback(function (x) {
      u(x.type, vp(x), x.target, i(x, e.lockRef.current));
    }, []),
    m = p.useCallback(function (x) {
      u(x.type, Zs(x), x.target, i(x, e.lockRef.current));
    }, []);
  p.useEffect(function () {
    return (
      xr.push(s),
      e.setCallbacks({
        onScrollCapture: f,
        onWheelCapture: f,
        onTouchMoveCapture: m,
      }),
      document.addEventListener("wheel", c, vr),
      document.addEventListener("touchmove", c, vr),
      document.addEventListener("touchstart", d, vr),
      function () {
        ((xr = xr.filter(function (x) {
          return x !== s;
        })),
          document.removeEventListener("wheel", c, vr),
          document.removeEventListener("touchmove", c, vr),
          document.removeEventListener("touchstart", d, vr));
      }
    );
  }, []);
  var y = e.removeScrollBar,
    w = e.inert;
  return p.createElement(
    p.Fragment,
    null,
    w ? p.createElement(s, { styles: dN(o) }) : null,
    y
      ? p.createElement(nN, { noRelative: e.noRelative, gapMode: e.gapMode })
      : null,
  );
}
function mN(e) {
  for (var t = null; e !== null;)
    (e instanceof ShadowRoot && ((t = e.host), (e = e.host)),
      (e = e.parentNode));
  return t;
}
const hN = Wk(rv, pN);
var nd = p.forwardRef(function (e, t) {
  return p.createElement(Na, Vt({}, e, { ref: t, sideCar: hN }));
});
nd.classNames = Na.classNames;
var Ac = ["Enter", " "],
  gN = ["ArrowDown", "PageUp", "Home"],
  iv = ["ArrowUp", "PageDown", "End"],
  vN = [...gN, ...iv],
  xN = { ltr: [...Ac, "ArrowRight"], rtl: [...Ac, "ArrowLeft"] },
  yN = { ltr: ["ArrowLeft"], rtl: ["ArrowRight"] },
  ys = "Menu",
  [is, wN, bN] = xg(ys),
  [pr, cv] = mn(ys, [bN, $g, Yg]),
  Ca = $g(),
  uv = Yg(),
  [SN, mr] = pr(ys),
  [kN, ws] = pr(ys),
  dv = (e) => {
    const {
        __scopeMenu: t,
        open: n = !1,
        children: r,
        dir: o,
        onOpenChange: s,
        modal: a = !0,
      } = e,
      i = Ca(t),
      [c, u] = p.useState(null),
      d = p.useRef(!1),
      f = be(s),
      m = Ku(o);
    return (
      p.useEffect(() => {
        const y = () => {
            ((d.current = !0),
              document.addEventListener("pointerdown", w, {
                capture: !0,
                once: !0,
              }),
              document.addEventListener("pointermove", w, {
                capture: !0,
                once: !0,
              }));
          },
          w = () => (d.current = !1);
        return (
          document.addEventListener("keydown", y, { capture: !0 }),
          () => {
            (document.removeEventListener("keydown", y, { capture: !0 }),
              document.removeEventListener("pointerdown", w, { capture: !0 }),
              document.removeEventListener("pointermove", w, { capture: !0 }));
          }
        );
      }, []),
      p.useEffect(() => {
        if (!n) return;
        const y = () => f(!1);
        return (
          window.addEventListener("blur", y),
          () => window.removeEventListener("blur", y)
        );
      }, [n, f]),
      l.jsx(uk, {
        ...i,
        children: l.jsx(SN, {
          scope: t,
          open: n,
          onOpenChange: f,
          content: c,
          onContentChange: u,
          children: l.jsx(kN, {
            scope: t,
            onClose: p.useCallback(() => f(!1), [f]),
            isUsingKeyboardRef: d,
            dir: m,
            modal: a,
            children: r,
          }),
        }),
      })
    );
  };
dv.displayName = ys;
var NN = "MenuAnchor",
  rd = p.forwardRef((e, t) => {
    const { __scopeMenu: n, ...r } = e,
      o = Ca(n);
    return l.jsx(dk, { ...o, ...r, ref: t });
  });
rd.displayName = NN;
var od = "MenuPortal",
  [CN, fv] = pr(od, { forceMount: void 0 }),
  pv = (e) => {
    const { __scopeMenu: t, forceMount: n, children: r, container: o } = e,
      s = mr(od, t);
    return l.jsx(CN, {
      scope: t,
      forceMount: n,
      children: l.jsx(bt, {
        present: n || s.open,
        children: l.jsx(Kg, { asChild: !0, container: o, children: r }),
      }),
    });
  };
pv.displayName = od;
var gt = "MenuContent",
  [EN, sd] = pr(gt),
  mv = p.forwardRef((e, t) => {
    const n = fv(gt, e.__scopeMenu),
      { forceMount: r = n.forceMount, ...o } = e,
      s = mr(gt, e.__scopeMenu),
      a = ws(gt, e.__scopeMenu);
    return l.jsx(is.Provider, {
      scope: e.__scopeMenu,
      children: l.jsx(bt, {
        present: r || s.open,
        children: l.jsx(is.Slot, {
          scope: e.__scopeMenu,
          children: a.modal
            ? l.jsx(jN, { ...o, ref: t })
            : l.jsx(RN, { ...o, ref: t }),
        }),
      }),
    });
  }),
  jN = p.forwardRef((e, t) => {
    const n = mr(gt, e.__scopeMenu),
      r = p.useRef(null),
      o = le(t, r);
    return (
      p.useEffect(() => {
        const s = r.current;
        if (s) return ev(s);
      }, []),
      l.jsx(ld, {
        ...e,
        ref: o,
        trapFocus: n.open,
        disableOutsidePointerEvents: n.open,
        disableOutsideScroll: !0,
        onFocusOutside: W(e.onFocusOutside, (s) => s.preventDefault(), {
          checkForDefaultPrevented: !1,
        }),
        onDismiss: () => n.onOpenChange(!1),
      })
    );
  }),
  RN = p.forwardRef((e, t) => {
    const n = mr(gt, e.__scopeMenu);
    return l.jsx(ld, {
      ...e,
      ref: t,
      trapFocus: !1,
      disableOutsidePointerEvents: !1,
      disableOutsideScroll: !1,
      onDismiss: () => n.onOpenChange(!1),
    });
  }),
  _N = cr("MenuContent.ScrollLock"),
  ld = p.forwardRef((e, t) => {
    const {
        __scopeMenu: n,
        loop: r = !1,
        trapFocus: o,
        onOpenAutoFocus: s,
        onCloseAutoFocus: a,
        disableOutsidePointerEvents: i,
        onEntryFocus: c,
        onEscapeKeyDown: u,
        onPointerDownOutside: d,
        onFocusOutside: f,
        onInteractOutside: m,
        onDismiss: y,
        disableOutsideScroll: w,
        ...x
      } = e,
      k = mr(gt, n),
      h = ws(gt, n),
      g = Ca(n),
      v = uv(n),
      b = wN(n),
      [S, C] = p.useState(null),
      N = p.useRef(null),
      E = le(t, N, k.onContentChange),
      j = p.useRef(0),
      R = p.useRef(""),
      M = p.useRef(0),
      T = p.useRef(null),
      D = p.useRef("right"),
      B = p.useRef(0),
      Q = w ? nd : p.Fragment,
      F = w ? { as: _N, allowPinchZoom: !0 } : void 0,
      K = (P) => {
        var te, Fe;
        const I = R.current + P,
          V = b().filter((Re) => !Re.disabled),
          J = document.activeElement,
          Ne =
            (te = V.find((Re) => Re.ref.current === J)) == null
              ? void 0
              : te.textValue,
          O = V.map((Re) => Re.textValue),
          L = BN(O, I, Ne),
          U =
            (Fe = V.find((Re) => Re.textValue === L)) == null
              ? void 0
              : Fe.ref.current;
        ((function Re(Ae) {
          ((R.current = Ae),
            window.clearTimeout(j.current),
            Ae !== "" && (j.current = window.setTimeout(() => Re(""), 1e3)));
        })(I),
          U && setTimeout(() => U.focus()));
      };
    (p.useEffect(() => () => window.clearTimeout(j.current), []), Sg());
    const _ = p.useCallback((P) => {
      var V, J;
      return (
        D.current === ((V = T.current) == null ? void 0 : V.side) &&
        WN(P, (J = T.current) == null ? void 0 : J.area)
      );
    }, []);
    return l.jsx(EN, {
      scope: n,
      searchRef: R,
      onItemEnter: p.useCallback(
        (P) => {
          _(P) && P.preventDefault();
        },
        [_],
      ),
      onItemLeave: p.useCallback(
        (P) => {
          var I;
          _(P) || ((I = N.current) == null || I.focus(), C(null));
        },
        [_],
      ),
      onTriggerLeave: p.useCallback(
        (P) => {
          _(P) && P.preventDefault();
        },
        [_],
      ),
      pointerGraceTimerRef: M,
      onPointerGraceIntentChange: p.useCallback((P) => {
        T.current = P;
      }, []),
      children: l.jsx(Q, {
        ...F,
        children: l.jsx(kg, {
          asChild: !0,
          trapped: o,
          onMountAutoFocus: W(s, (P) => {
            var I;
            (P.preventDefault(),
              (I = N.current) == null || I.focus({ preventScroll: !0 }));
          }),
          onUnmountAutoFocus: a,
          children: l.jsx(wg, {
            asChild: !0,
            disableOutsidePointerEvents: i,
            onEscapeKeyDown: u,
            onPointerDownOutside: d,
            onFocusOutside: f,
            onInteractOutside: m,
            onDismiss: y,
            children: l.jsx(_k, {
              asChild: !0,
              ...v,
              dir: h.dir,
              orientation: "vertical",
              loop: r,
              currentTabStopId: S,
              onCurrentTabStopIdChange: C,
              onEntryFocus: W(c, (P) => {
                h.isUsingKeyboardRef.current || P.preventDefault();
              }),
              preventScrollOnEntryFocus: !0,
              children: l.jsx(fk, {
                role: "menu",
                "aria-orientation": "vertical",
                "data-state": Pv(k.open),
                "data-radix-menu-content": "",
                dir: h.dir,
                ...g,
                ...x,
                ref: E,
                style: { outline: "none", ...x.style },
                onKeyDown: W(x.onKeyDown, (P) => {
                  const V =
                      P.target.closest("[data-radix-menu-content]") ===
                      P.currentTarget,
                    J = P.ctrlKey || P.altKey || P.metaKey,
                    Ne = P.key.length === 1;
                  V &&
                    (P.key === "Tab" && P.preventDefault(),
                    !J && Ne && K(P.key));
                  const O = N.current;
                  if (P.target !== O || !vN.includes(P.key)) return;
                  P.preventDefault();
                  const U = b()
                    .filter((te) => !te.disabled)
                    .map((te) => te.ref.current);
                  (iv.includes(P.key) && U.reverse(), zN(U));
                }),
                onBlur: W(e.onBlur, (P) => {
                  P.currentTarget.contains(P.target) ||
                    (window.clearTimeout(j.current), (R.current = ""));
                }),
                onPointerMove: W(
                  e.onPointerMove,
                  cs((P) => {
                    const I = P.target,
                      V = B.current !== P.clientX;
                    if (P.currentTarget.contains(I) && V) {
                      const J = P.clientX > B.current ? "right" : "left";
                      ((D.current = J), (B.current = P.clientX));
                    }
                  }),
                ),
              }),
            }),
          }),
        }),
      }),
    });
  });
mv.displayName = gt;
var PN = "MenuGroup",
  ad = p.forwardRef((e, t) => {
    const { __scopeMenu: n, ...r } = e;
    return l.jsx(pe.div, { role: "group", ...r, ref: t });
  });
ad.displayName = PN;
var MN = "MenuLabel",
  hv = p.forwardRef((e, t) => {
    const { __scopeMenu: n, ...r } = e;
    return l.jsx(pe.div, { ...r, ref: t });
  });
hv.displayName = MN;
var Xl = "MenuItem",
  yp = "menu.itemSelect",
  Ea = p.forwardRef((e, t) => {
    const { disabled: n = !1, onSelect: r, ...o } = e,
      s = p.useRef(null),
      a = ws(Xl, e.__scopeMenu),
      i = sd(Xl, e.__scopeMenu),
      c = le(t, s),
      u = p.useRef(!1),
      d = () => {
        const f = s.current;
        if (!n && f) {
          const m = new CustomEvent(yp, { bubbles: !0, cancelable: !0 });
          (f.addEventListener(yp, (y) => (r == null ? void 0 : r(y)), {
            once: !0,
          }),
            dg(f, m),
            m.defaultPrevented ? (u.current = !1) : a.onClose());
        }
      };
    return l.jsx(gv, {
      ...o,
      ref: c,
      disabled: n,
      onClick: W(e.onClick, d),
      onPointerDown: (f) => {
        var m;
        ((m = e.onPointerDown) == null || m.call(e, f), (u.current = !0));
      },
      onPointerUp: W(e.onPointerUp, (f) => {
        var m;
        u.current || (m = f.currentTarget) == null || m.click();
      }),
      onKeyDown: W(e.onKeyDown, (f) => {
        const m = i.searchRef.current !== "";
        n ||
          (m && f.key === " ") ||
          (Ac.includes(f.key) && (f.currentTarget.click(), f.preventDefault()));
      }),
    });
  });
Ea.displayName = Xl;
var gv = p.forwardRef((e, t) => {
    const { __scopeMenu: n, disabled: r = !1, textValue: o, ...s } = e,
      a = sd(Xl, n),
      i = uv(n),
      c = p.useRef(null),
      u = le(t, c),
      [d, f] = p.useState(!1),
      [m, y] = p.useState("");
    return (
      p.useEffect(() => {
        const w = c.current;
        w && y((w.textContent ?? "").trim());
      }, [s.children]),
      l.jsx(is.ItemSlot, {
        scope: n,
        disabled: r,
        textValue: o ?? m,
        children: l.jsx(Pk, {
          asChild: !0,
          ...i,
          focusable: !r,
          children: l.jsx(pe.div, {
            role: "menuitem",
            "data-highlighted": d ? "" : void 0,
            "aria-disabled": r || void 0,
            "data-disabled": r ? "" : void 0,
            ...s,
            ref: u,
            onPointerMove: W(
              e.onPointerMove,
              cs((w) => {
                r
                  ? a.onItemLeave(w)
                  : (a.onItemEnter(w),
                    w.defaultPrevented ||
                      w.currentTarget.focus({ preventScroll: !0 }));
              }),
            ),
            onPointerLeave: W(
              e.onPointerLeave,
              cs((w) => a.onItemLeave(w)),
            ),
            onFocus: W(e.onFocus, () => f(!0)),
            onBlur: W(e.onBlur, () => f(!1)),
          }),
        }),
      })
    );
  }),
  AN = "MenuCheckboxItem",
  vv = p.forwardRef((e, t) => {
    const { checked: n = !1, onCheckedChange: r, ...o } = e;
    return l.jsx(Sv, {
      scope: e.__scopeMenu,
      checked: n,
      children: l.jsx(Ea, {
        role: "menuitemcheckbox",
        "aria-checked": Ql(n) ? "mixed" : n,
        ...o,
        ref: t,
        "data-state": cd(n),
        onSelect: W(
          o.onSelect,
          () => (r == null ? void 0 : r(Ql(n) ? !0 : !n)),
          { checkForDefaultPrevented: !1 },
        ),
      }),
    });
  });
vv.displayName = AN;
var xv = "MenuRadioGroup",
  [TN, DN] = pr(xv, { value: void 0, onValueChange: () => {} }),
  yv = p.forwardRef((e, t) => {
    const { value: n, onValueChange: r, ...o } = e,
      s = be(r);
    return l.jsx(TN, {
      scope: e.__scopeMenu,
      value: n,
      onValueChange: s,
      children: l.jsx(ad, { ...o, ref: t }),
    });
  });
yv.displayName = xv;
var wv = "MenuRadioItem",
  bv = p.forwardRef((e, t) => {
    const { value: n, ...r } = e,
      o = DN(wv, e.__scopeMenu),
      s = n === o.value;
    return l.jsx(Sv, {
      scope: e.__scopeMenu,
      checked: s,
      children: l.jsx(Ea, {
        role: "menuitemradio",
        "aria-checked": s,
        ...r,
        ref: t,
        "data-state": cd(s),
        onSelect: W(
          r.onSelect,
          () => {
            var a;
            return (a = o.onValueChange) == null ? void 0 : a.call(o, n);
          },
          { checkForDefaultPrevented: !1 },
        ),
      }),
    });
  });
bv.displayName = wv;
var id = "MenuItemIndicator",
  [Sv, ON] = pr(id, { checked: !1 }),
  kv = p.forwardRef((e, t) => {
    const { __scopeMenu: n, forceMount: r, ...o } = e,
      s = ON(id, n);
    return l.jsx(bt, {
      present: r || Ql(s.checked) || s.checked === !0,
      children: l.jsx(pe.span, { ...o, ref: t, "data-state": cd(s.checked) }),
    });
  });
kv.displayName = id;
var IN = "MenuSeparator",
  Nv = p.forwardRef((e, t) => {
    const { __scopeMenu: n, ...r } = e;
    return l.jsx(pe.div, {
      role: "separator",
      "aria-orientation": "horizontal",
      ...r,
      ref: t,
    });
  });
Nv.displayName = IN;
var LN = "MenuArrow",
  Cv = p.forwardRef((e, t) => {
    const { __scopeMenu: n, ...r } = e,
      o = Ca(n);
    return l.jsx(pk, { ...o, ...r, ref: t });
  });
Cv.displayName = LN;
var $N = "MenuSub",
  [sR, Ev] = pr($N),
  To = "MenuSubTrigger",
  jv = p.forwardRef((e, t) => {
    const n = mr(To, e.__scopeMenu),
      r = ws(To, e.__scopeMenu),
      o = Ev(To, e.__scopeMenu),
      s = sd(To, e.__scopeMenu),
      a = p.useRef(null),
      { pointerGraceTimerRef: i, onPointerGraceIntentChange: c } = s,
      u = { __scopeMenu: e.__scopeMenu },
      d = p.useCallback(() => {
        (a.current && window.clearTimeout(a.current), (a.current = null));
      }, []);
    return (
      p.useEffect(() => d, [d]),
      p.useEffect(() => {
        const f = i.current;
        return () => {
          (window.clearTimeout(f), c(null));
        };
      }, [i, c]),
      l.jsx(rd, {
        asChild: !0,
        ...u,
        children: l.jsx(gv, {
          id: o.triggerId,
          "aria-haspopup": "menu",
          "aria-expanded": n.open,
          "aria-controls": n.open ? o.contentId : void 0,
          "data-state": Pv(n.open),
          ...e,
          ref: Fu(t, o.onTriggerChange),
          onClick: (f) => {
            var m;
            ((m = e.onClick) == null || m.call(e, f),
              !(e.disabled || f.defaultPrevented) &&
                (f.currentTarget.focus(), n.open || n.onOpenChange(!0)));
          },
          onPointerMove: W(
            e.onPointerMove,
            cs((f) => {
              (s.onItemEnter(f),
                !f.defaultPrevented &&
                  !e.disabled &&
                  !n.open &&
                  !a.current &&
                  (s.onPointerGraceIntentChange(null),
                  (a.current = window.setTimeout(() => {
                    (n.onOpenChange(!0), d());
                  }, 100))));
            }),
          ),
          onPointerLeave: W(
            e.onPointerLeave,
            cs((f) => {
              var y, w;
              d();
              const m =
                (y = n.content) == null ? void 0 : y.getBoundingClientRect();
              if (m) {
                const x = (w = n.content) == null ? void 0 : w.dataset.side,
                  k = x === "right",
                  h = k ? -5 : 5,
                  g = m[k ? "left" : "right"],
                  v = m[k ? "right" : "left"];
                (s.onPointerGraceIntentChange({
                  area: [
                    { x: f.clientX + h, y: f.clientY },
                    { x: g, y: m.top },
                    { x: v, y: m.top },
                    { x: v, y: m.bottom },
                    { x: g, y: m.bottom },
                  ],
                  side: x,
                }),
                  window.clearTimeout(i.current),
                  (i.current = window.setTimeout(
                    () => s.onPointerGraceIntentChange(null),
                    300,
                  )));
              } else {
                if ((s.onTriggerLeave(f), f.defaultPrevented)) return;
                s.onPointerGraceIntentChange(null);
              }
            }),
          ),
          onKeyDown: W(e.onKeyDown, (f) => {
            var y;
            const m = s.searchRef.current !== "";
            e.disabled ||
              (m && f.key === " ") ||
              (xN[r.dir].includes(f.key) &&
                (n.onOpenChange(!0),
                (y = n.content) == null || y.focus(),
                f.preventDefault()));
          }),
        }),
      })
    );
  });
jv.displayName = To;
var Rv = "MenuSubContent",
  _v = p.forwardRef((e, t) => {
    const n = fv(gt, e.__scopeMenu),
      { forceMount: r = n.forceMount, align: o = "start", ...s } = e,
      a = mr(gt, e.__scopeMenu),
      i = ws(gt, e.__scopeMenu),
      c = Ev(Rv, e.__scopeMenu),
      u = p.useRef(null),
      d = le(t, u);
    return l.jsx(is.Provider, {
      scope: e.__scopeMenu,
      children: l.jsx(bt, {
        present: r || a.open,
        children: l.jsx(is.Slot, {
          scope: e.__scopeMenu,
          children: l.jsx(ld, {
            id: c.contentId,
            "aria-labelledby": c.triggerId,
            ...s,
            ref: d,
            align: o,
            side: i.dir === "rtl" ? "left" : "right",
            disableOutsidePointerEvents: !1,
            disableOutsideScroll: !1,
            trapFocus: !1,
            onOpenAutoFocus: (f) => {
              var m;
              (i.isUsingKeyboardRef.current &&
                ((m = u.current) == null || m.focus()),
                f.preventDefault());
            },
            onCloseAutoFocus: (f) => f.preventDefault(),
            onFocusOutside: W(e.onFocusOutside, (f) => {
              f.target !== c.trigger && a.onOpenChange(!1);
            }),
            onEscapeKeyDown: W(e.onEscapeKeyDown, (f) => {
              (i.onClose(), f.preventDefault());
            }),
            onKeyDown: W(e.onKeyDown, (f) => {
              var w;
              const m = f.currentTarget.contains(f.target),
                y = yN[i.dir].includes(f.key);
              m &&
                y &&
                (a.onOpenChange(!1),
                (w = c.trigger) == null || w.focus(),
                f.preventDefault());
            }),
          }),
        }),
      }),
    });
  });
_v.displayName = Rv;
function Pv(e) {
  return e ? "open" : "closed";
}
function Ql(e) {
  return e === "indeterminate";
}
function cd(e) {
  return Ql(e) ? "indeterminate" : e ? "checked" : "unchecked";
}
function zN(e) {
  const t = document.activeElement;
  for (const n of e)
    if (n === t || (n.focus(), document.activeElement !== t)) return;
}
function FN(e, t) {
  return e.map((n, r) => e[(t + r) % e.length]);
}
function BN(e, t, n) {
  const o = t.length > 1 && Array.from(t).every((u) => u === t[0]) ? t[0] : t,
    s = n ? e.indexOf(n) : -1;
  let a = FN(e, Math.max(s, 0));
  o.length === 1 && (a = a.filter((u) => u !== n));
  const c = a.find((u) => u.toLowerCase().startsWith(o.toLowerCase()));
  return c !== n ? c : void 0;
}
function UN(e, t) {
  const { x: n, y: r } = e;
  let o = !1;
  for (let s = 0, a = t.length - 1; s < t.length; a = s++) {
    const i = t[s],
      c = t[a],
      u = i.x,
      d = i.y,
      f = c.x,
      m = c.y;
    d > r != m > r && n < ((f - u) * (r - d)) / (m - d) + u && (o = !o);
  }
  return o;
}
function WN(e, t) {
  if (!t) return !1;
  const n = { x: e.clientX, y: e.clientY };
  return UN(n, t);
}
function cs(e) {
  return (t) => (t.pointerType === "mouse" ? e(t) : void 0);
}
var VN = dv,
  HN = rd,
  KN = pv,
  GN = mv,
  YN = ad,
  XN = hv,
  QN = Ea,
  qN = vv,
  JN = yv,
  ZN = bv,
  eC = kv,
  tC = Nv,
  nC = Cv,
  rC = jv,
  oC = _v,
  ja = "DropdownMenu",
  [sC] = mn(ja, [cv]),
  Ke = cv(),
  [lC, Mv] = sC(ja),
  Av = (e) => {
    const {
        __scopeDropdownMenu: t,
        children: n,
        dir: r,
        open: o,
        defaultOpen: s,
        onOpenChange: a,
        modal: i = !0,
      } = e,
      c = Ke(t),
      u = p.useRef(null),
      [d, f] = Hu({ prop: o, defaultProp: s ?? !1, onChange: a, caller: ja });
    return l.jsx(lC, {
      scope: t,
      triggerId: zr(),
      triggerRef: u,
      contentId: zr(),
      open: d,
      onOpenChange: f,
      onOpenToggle: p.useCallback(() => f((m) => !m), [f]),
      modal: i,
      children: l.jsx(VN, {
        ...c,
        open: d,
        onOpenChange: f,
        dir: r,
        modal: i,
        children: n,
      }),
    });
  };
Av.displayName = ja;
var Tv = "DropdownMenuTrigger",
  Dv = p.forwardRef((e, t) => {
    const { __scopeDropdownMenu: n, disabled: r = !1, ...o } = e,
      s = Mv(Tv, n),
      a = Ke(n);
    return l.jsx(HN, {
      asChild: !0,
      ...a,
      children: l.jsx(pe.button, {
        type: "button",
        id: s.triggerId,
        "aria-haspopup": "menu",
        "aria-expanded": s.open,
        "aria-controls": s.open ? s.contentId : void 0,
        "data-state": s.open ? "open" : "closed",
        "data-disabled": r ? "" : void 0,
        disabled: r,
        ...o,
        ref: Fu(t, s.triggerRef),
        onPointerDown: W(e.onPointerDown, (i) => {
          !r &&
            i.button === 0 &&
            i.ctrlKey === !1 &&
            (s.onOpenToggle(), s.open || i.preventDefault());
        }),
        onKeyDown: W(e.onKeyDown, (i) => {
          r ||
            (["Enter", " "].includes(i.key) && s.onOpenToggle(),
            i.key === "ArrowDown" && s.onOpenChange(!0),
            ["Enter", " ", "ArrowDown"].includes(i.key) && i.preventDefault());
        }),
      }),
    });
  });
Dv.displayName = Tv;
var aC = "DropdownMenuPortal",
  Ov = (e) => {
    const { __scopeDropdownMenu: t, ...n } = e,
      r = Ke(t);
    return l.jsx(KN, { ...r, ...n });
  };
Ov.displayName = aC;
var Iv = "DropdownMenuContent",
  Lv = p.forwardRef((e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e,
      o = Mv(Iv, n),
      s = Ke(n),
      a = p.useRef(!1);
    return l.jsx(GN, {
      id: o.contentId,
      "aria-labelledby": o.triggerId,
      ...s,
      ...r,
      ref: t,
      onCloseAutoFocus: W(e.onCloseAutoFocus, (i) => {
        var c;
        (a.current || (c = o.triggerRef.current) == null || c.focus(),
          (a.current = !1),
          i.preventDefault());
      }),
      onInteractOutside: W(e.onInteractOutside, (i) => {
        const c = i.detail.originalEvent,
          u = c.button === 0 && c.ctrlKey === !0,
          d = c.button === 2 || u;
        (!o.modal || d) && (a.current = !0);
      }),
      style: {
        ...e.style,
        "--radix-dropdown-menu-content-transform-origin":
          "var(--radix-popper-transform-origin)",
        "--radix-dropdown-menu-content-available-width":
          "var(--radix-popper-available-width)",
        "--radix-dropdown-menu-content-available-height":
          "var(--radix-popper-available-height)",
        "--radix-dropdown-menu-trigger-width":
          "var(--radix-popper-anchor-width)",
        "--radix-dropdown-menu-trigger-height":
          "var(--radix-popper-anchor-height)",
      },
    });
  });
Lv.displayName = Iv;
var iC = "DropdownMenuGroup",
  $v = p.forwardRef((e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e,
      o = Ke(n);
    return l.jsx(YN, { ...o, ...r, ref: t });
  });
$v.displayName = iC;
var cC = "DropdownMenuLabel",
  zv = p.forwardRef((e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e,
      o = Ke(n);
    return l.jsx(XN, { ...o, ...r, ref: t });
  });
zv.displayName = cC;
var uC = "DropdownMenuItem",
  Fv = p.forwardRef((e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e,
      o = Ke(n);
    return l.jsx(QN, { ...o, ...r, ref: t });
  });
Fv.displayName = uC;
var dC = "DropdownMenuCheckboxItem",
  Bv = p.forwardRef((e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e,
      o = Ke(n);
    return l.jsx(qN, { ...o, ...r, ref: t });
  });
Bv.displayName = dC;
var fC = "DropdownMenuRadioGroup",
  pC = p.forwardRef((e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e,
      o = Ke(n);
    return l.jsx(JN, { ...o, ...r, ref: t });
  });
pC.displayName = fC;
var mC = "DropdownMenuRadioItem",
  Uv = p.forwardRef((e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e,
      o = Ke(n);
    return l.jsx(ZN, { ...o, ...r, ref: t });
  });
Uv.displayName = mC;
var hC = "DropdownMenuItemIndicator",
  Wv = p.forwardRef((e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e,
      o = Ke(n);
    return l.jsx(eC, { ...o, ...r, ref: t });
  });
Wv.displayName = hC;
var gC = "DropdownMenuSeparator",
  Vv = p.forwardRef((e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e,
      o = Ke(n);
    return l.jsx(tC, { ...o, ...r, ref: t });
  });
Vv.displayName = gC;
var vC = "DropdownMenuArrow",
  xC = p.forwardRef((e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e,
      o = Ke(n);
    return l.jsx(nC, { ...o, ...r, ref: t });
  });
xC.displayName = vC;
var yC = "DropdownMenuSubTrigger",
  Hv = p.forwardRef((e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e,
      o = Ke(n);
    return l.jsx(rC, { ...o, ...r, ref: t });
  });
Hv.displayName = yC;
var wC = "DropdownMenuSubContent",
  Kv = p.forwardRef((e, t) => {
    const { __scopeDropdownMenu: n, ...r } = e,
      o = Ke(n);
    return l.jsx(oC, {
      ...o,
      ...r,
      ref: t,
      style: {
        ...e.style,
        "--radix-dropdown-menu-content-transform-origin":
          "var(--radix-popper-transform-origin)",
        "--radix-dropdown-menu-content-available-width":
          "var(--radix-popper-available-width)",
        "--radix-dropdown-menu-content-available-height":
          "var(--radix-popper-available-height)",
        "--radix-dropdown-menu-trigger-width":
          "var(--radix-popper-anchor-width)",
        "--radix-dropdown-menu-trigger-height":
          "var(--radix-popper-anchor-height)",
      },
    });
  });
Kv.displayName = wC;
var bC = Av,
  SC = Dv,
  kC = Ov,
  Gv = Lv,
  NC = $v,
  Yv = zv,
  Xv = Fv,
  Qv = Bv,
  qv = Uv,
  Jv = Wv,
  Zv = Vv,
  e0 = Hv,
  t0 = Kv;
const ud = bC,
  dd = SC,
  CC = NC,
  EC = p.forwardRef(({ className: e, inset: t, children: n, ...r }, o) =>
    l.jsxs(e0, {
      ref: o,
      className: H(
        "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        t && "pl-8",
        e,
      ),
      ...r,
      children: [n, l.jsx(sb, { className: "ml-auto" })],
    }),
  );
EC.displayName = e0.displayName;
const jC = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx(t0, {
    ref: n,
    className: H(
      "z-[80] min-w-[8rem] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 text-slate-900 shadow-2xl shadow-slate-950/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]",
      e,
    ),
    ...t,
  }),
);
jC.displayName = t0.displayName;
const Ra = p.forwardRef(({ className: e, sideOffset: t = 8, ...n }, r) =>
  l.jsx(kC, {
    children: l.jsx(Gv, {
      ref: r,
      sideOffset: t,
      className: H(
        "z-[80] max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white p-1 text-slate-900 shadow-2xl shadow-slate-950/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]",
        e,
      ),
      ...n,
    }),
  }),
);
Ra.displayName = Gv.displayName;
const Xe = p.forwardRef(({ className: e, inset: t, ...n }, r) =>
  l.jsx(Xv, {
    ref: r,
    className: H(
      "relative flex cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold outline-none transition-colors focus:bg-slate-100 focus:text-slate-950 data-[disabled]:pointer-events-none data-[disabled]:text-slate-400 data-[disabled]:opacity-55 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      t && "pl-8",
      e,
    ),
    ...n,
  }),
);
Xe.displayName = Xv.displayName;
const RC = p.forwardRef(({ className: e, children: t, checked: n, ...r }, o) =>
  l.jsxs(Qv, {
    ref: o,
    className: H(
      "relative flex cursor-default select-none items-center rounded-lg py-2 pl-8 pr-2.5 text-sm font-semibold outline-none transition-colors focus:bg-slate-100 focus:text-slate-950 data-[disabled]:pointer-events-none data-[disabled]:text-slate-400 data-[disabled]:opacity-55",
      e,
    ),
    checked: n,
    ...r,
    children: [
      l.jsx("span", {
        className:
          "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
        children: l.jsx(Jv, { children: l.jsx(rb, { className: "h-4 w-4" }) }),
      }),
      t,
    ],
  }),
);
RC.displayName = Qv.displayName;
const _C = p.forwardRef(({ className: e, children: t, ...n }, r) =>
  l.jsxs(qv, {
    ref: r,
    className: H(
      "relative flex cursor-default select-none items-center rounded-lg py-2 pl-8 pr-2.5 text-sm font-semibold outline-none transition-colors focus:bg-slate-100 focus:text-slate-950 data-[disabled]:pointer-events-none data-[disabled]:text-slate-400 data-[disabled]:opacity-55",
      e,
    ),
    ...n,
    children: [
      l.jsx("span", {
        className:
          "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
        children: l.jsx(Jv, {
          children: l.jsx(pb, { className: "h-2 w-2 fill-current" }),
        }),
      }),
      t,
    ],
  }),
);
_C.displayName = qv.displayName;
const n0 = p.forwardRef(({ className: e, inset: t, ...n }, r) =>
  l.jsx(Yv, {
    ref: r,
    className: H("px-2 py-1.5 text-sm font-semibold", t && "pl-8", e),
    ...n,
  }),
);
n0.displayName = Yv.displayName;
const ql = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx(Zv, { ref: n, className: H("-mx-1 my-1 h-px bg-muted", e), ...t }),
);
ql.displayName = Zv.displayName;
const Tc = ({ className: e, ...t }) =>
  l.jsx("span", {
    className: H("ml-auto text-xs tracking-widest opacity-60", e),
    ...t,
  });
Tc.displayName = "DropdownMenuShortcut";
var PC = [
    "a",
    "button",
    "div",
    "form",
    "h2",
    "h3",
    "img",
    "input",
    "label",
    "li",
    "nav",
    "ol",
    "p",
    "select",
    "span",
    "svg",
    "ul",
  ],
  gn = PC.reduce((e, t) => {
    const n = cr(`Primitive.${t}`),
      r = p.forwardRef((o, s) => {
        const { asChild: a, ...i } = o,
          c = a ? n : t;
        return (
          typeof window < "u" && (window[Symbol.for("radix-ui")] = !0),
          l.jsx(c, { ...i, ref: s })
        );
      });
    return ((r.displayName = `Primitive.${t}`), { ...e, [t]: r });
  }, {});
function MC(e, t) {
  e && ro.flushSync(() => e.dispatchEvent(t));
}
var AC = "DismissableLayer",
  Dc = "dismissableLayer.update",
  TC = "dismissableLayer.pointerDownOutside",
  DC = "dismissableLayer.focusOutside",
  wp,
  fd = p.createContext({
    layers: new Set(),
    layersWithOutsidePointerEventsDisabled: new Set(),
    branches: new Set(),
    dismissableSurfaces: new Set(),
  }),
  r0 = p.forwardRef((e, t) => {
    const {
        disableOutsidePointerEvents: n = !1,
        deferPointerDownOutside: r = !1,
        onEscapeKeyDown: o,
        onPointerDownOutside: s,
        onFocusOutside: a,
        onInteractOutside: i,
        onDismiss: c,
        ...u
      } = e,
      d = p.useContext(fd),
      [f, m] = p.useState(null),
      y =
        (f == null ? void 0 : f.ownerDocument) ??
        (globalThis == null ? void 0 : globalThis.document),
      [, w] = p.useState({}),
      x = le(t, m),
      k = Array.from(d.layers),
      [h] = [...d.layersWithOutsidePointerEventsDisabled].slice(-1),
      g = k.indexOf(h),
      v = f ? k.indexOf(f) : -1,
      b = d.layersWithOutsidePointerEventsDisabled.size > 0,
      S = v >= g,
      C = p.useRef(!1),
      N = $C(
        (M) => {
          const T = M.target;
          if (!(T instanceof Node)) return;
          const D = [...d.branches].some((B) => B.contains(T));
          !S ||
            D ||
            (s == null || s(M),
            i == null || i(M),
            M.defaultPrevented || c == null || c());
        },
        {
          ownerDocument: y,
          deferPointerDownOutside: r,
          isDeferredPointerDownOutsideRef: C,
          dismissableSurfaces: d.dismissableSurfaces,
        },
      ),
      E = zC((M) => {
        if (r && C.current) return;
        const T = M.target;
        [...d.branches].some((B) => B.contains(T)) ||
          (a == null || a(M),
          i == null || i(M),
          M.defaultPrevented || c == null || c());
      }, y),
      j = f ? v === k.length - 1 : !1,
      R = _S((M) => {
        M.key === "Escape" &&
          (o == null || o(M),
          !M.defaultPrevented && c && (M.preventDefault(), c()));
      });
    return (
      p.useEffect(() => {
        if (j)
          return (
            y.addEventListener("keydown", R, { capture: !0 }),
            () => y.removeEventListener("keydown", R, { capture: !0 })
          );
      }, [y, j]),
      p.useEffect(() => {
        if (f)
          return (
            n &&
              (d.layersWithOutsidePointerEventsDisabled.size === 0 &&
                ((wp = y.body.style.pointerEvents),
                (y.body.style.pointerEvents = "none")),
              d.layersWithOutsidePointerEventsDisabled.add(f)),
            d.layers.add(f),
            bp(),
            () => {
              n &&
                (d.layersWithOutsidePointerEventsDisabled.delete(f),
                d.layersWithOutsidePointerEventsDisabled.size === 0 &&
                  (y.body.style.pointerEvents = wp));
            }
          );
      }, [f, y, n, d]),
      p.useEffect(
        () => () => {
          f &&
            (d.layers.delete(f),
            d.layersWithOutsidePointerEventsDisabled.delete(f),
            bp());
        },
        [f, d],
      ),
      p.useEffect(() => {
        const M = () => w({});
        return (
          document.addEventListener(Dc, M),
          () => document.removeEventListener(Dc, M)
        );
      }, []),
      l.jsx(gn.div, {
        ...u,
        ref: x,
        style: {
          pointerEvents: b ? (S ? "auto" : "none") : void 0,
          ...e.style,
        },
        onFocusCapture: W(e.onFocusCapture, E.onFocusCapture),
        onBlurCapture: W(e.onBlurCapture, E.onBlurCapture),
        onPointerDownCapture: W(e.onPointerDownCapture, N.onPointerDownCapture),
      })
    );
  });
r0.displayName = AC;
var OC = "DismissableLayerBranch",
  IC = p.forwardRef((e, t) => {
    const n = p.useContext(fd),
      r = p.useRef(null),
      o = le(t, r);
    return (
      p.useEffect(() => {
        const s = r.current;
        if (s)
          return (
            n.branches.add(s),
            () => {
              n.branches.delete(s);
            }
          );
      }, [n.branches]),
      l.jsx(gn.div, { ...e, ref: o })
    );
  });
IC.displayName = OC;
function LC() {
  const e = p.useContext(fd),
    [t, n] = p.useState(null);
  return (
    p.useEffect(() => {
      if (t)
        return (
          e.dismissableSurfaces.add(t),
          () => {
            e.dismissableSurfaces.delete(t);
          }
        );
    }, [t, e.dismissableSurfaces]),
    n
  );
}
function $C(e, t) {
  const {
      ownerDocument: n = globalThis == null ? void 0 : globalThis.document,
      deferPointerDownOutside: r = !1,
      isDeferredPointerDownOutsideRef: o,
      dismissableSurfaces: s,
    } = t,
    a = be(e),
    i = p.useRef(!1),
    c = p.useRef(!1),
    u = p.useRef(new Map()),
    d = p.useRef(() => {});
  return (
    p.useEffect(() => {
      function f() {
        ((c.current = !1), (o.current = !1), u.current.clear());
      }
      function m() {
        return Array.from(u.current.values()).some(Boolean);
      }
      function y(g) {
        if (!c.current) return;
        const v = g.target;
        ((v instanceof Node && [...s].some((S) => S.contains(v))) ||
          u.current.set(g.type, !0),
          g.type === "click" &&
            window.setTimeout(() => {
              c.current && d.current();
            }, 0));
      }
      function w(g) {
        c.current && u.current.set(g.type, !1);
      }
      const x = (g) => {
          if (g.target && !i.current) {
            let v = function () {
              n.removeEventListener("click", d.current);
              const S = m();
              (f(), S || o0(TC, a, b, { discrete: !0 }));
            };
            const b = { originalEvent: g };
            ((c.current = !0),
              (o.current = r && g.button === 0),
              u.current.clear(),
              !r || g.button !== 0
                ? v()
                : (n.removeEventListener("click", d.current),
                  (d.current = v),
                  n.addEventListener("click", d.current, { once: !0 })));
          } else (n.removeEventListener("click", d.current), f());
          i.current = !1;
        },
        k = [
          "pointerup",
          "mousedown",
          "mouseup",
          "touchstart",
          "touchend",
          "click",
        ];
      for (const g of k)
        (n.addEventListener(g, y, !0), n.addEventListener(g, w));
      const h = window.setTimeout(() => {
        n.addEventListener("pointerdown", x);
      }, 0);
      return () => {
        (window.clearTimeout(h),
          n.removeEventListener("pointerdown", x),
          n.removeEventListener("click", d.current));
        for (const g of k)
          (n.removeEventListener(g, y, !0), n.removeEventListener(g, w));
      };
    }, [n, a, r, o, s]),
    { onPointerDownCapture: () => (i.current = !0) }
  );
}
function zC(e, t = globalThis == null ? void 0 : globalThis.document) {
  const n = be(e),
    r = p.useRef(!1);
  return (
    p.useEffect(() => {
      const o = (s) => {
        s.target &&
          !r.current &&
          o0(DC, n, { originalEvent: s }, { discrete: !1 });
      };
      return (
        t.addEventListener("focusin", o),
        () => t.removeEventListener("focusin", o)
      );
    }, [t, n]),
    {
      onFocusCapture: () => (r.current = !0),
      onBlurCapture: () => (r.current = !1),
    }
  );
}
function bp() {
  const e = new CustomEvent(Dc);
  document.dispatchEvent(e);
}
function o0(e, t, n, { discrete: r }) {
  const o = n.originalEvent.target,
    s = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: n });
  (t && o.addEventListener(e, t, { once: !0 }),
    r ? MC(o, s) : o.dispatchEvent(s));
}
var Si = "focusScope.autoFocusOnMount",
  ki = "focusScope.autoFocusOnUnmount",
  Sp = { bubbles: !1, cancelable: !0 },
  FC = "FocusScope",
  s0 = p.forwardRef((e, t) => {
    const {
        loop: n = !1,
        trapped: r = !1,
        onMountAutoFocus: o,
        onUnmountAutoFocus: s,
        ...a
      } = e,
      [i, c] = p.useState(null),
      u = be(o),
      d = be(s),
      f = p.useRef(null),
      m = le(t, c),
      y = p.useRef({
        paused: !1,
        pause() {
          this.paused = !0;
        },
        resume() {
          this.paused = !1;
        },
      }).current;
    (p.useEffect(() => {
      if (r) {
        let x = function (v) {
            if (y.paused || !i) return;
            const b = v.target;
            i.contains(b) ? (f.current = b) : Nn(f.current, { select: !0 });
          },
          k = function (v) {
            if (y.paused || !i) return;
            const b = v.relatedTarget;
            b !== null && (i.contains(b) || Nn(f.current, { select: !0 }));
          },
          h = function (v) {
            if (document.activeElement === document.body)
              for (const S of v) S.removedNodes.length > 0 && Nn(i);
          };
        (document.addEventListener("focusin", x),
          document.addEventListener("focusout", k));
        const g = new MutationObserver(h);
        return (
          i && g.observe(i, { childList: !0, subtree: !0 }),
          () => {
            (document.removeEventListener("focusin", x),
              document.removeEventListener("focusout", k),
              g.disconnect());
          }
        );
      }
    }, [r, i, y.paused]),
      p.useEffect(() => {
        if (i) {
          Np.add(y);
          const x = document.activeElement;
          if (!i.contains(x)) {
            const h = new CustomEvent(Si, Sp);
            (i.addEventListener(Si, u),
              i.dispatchEvent(h),
              h.defaultPrevented ||
                (BC(KC(l0(i)), { select: !0 }),
                document.activeElement === x && Nn(i)));
          }
          return () => {
            (i.removeEventListener(Si, u),
              setTimeout(() => {
                const h = new CustomEvent(ki, Sp);
                (i.addEventListener(ki, d),
                  i.dispatchEvent(h),
                  h.defaultPrevented || Nn(x ?? document.body, { select: !0 }),
                  i.removeEventListener(ki, d),
                  Np.remove(y));
              }, 0));
          };
        }
      }, [i, u, d, y]));
    const w = p.useCallback(
      (x) => {
        if ((!n && !r) || y.paused) return;
        const k = x.key === "Tab" && !x.altKey && !x.ctrlKey && !x.metaKey,
          h = document.activeElement;
        if (k && h) {
          const g = x.currentTarget,
            [v, b] = UC(g);
          v && b
            ? !x.shiftKey && h === b
              ? (x.preventDefault(), n && Nn(v, { select: !0 }))
              : x.shiftKey &&
                h === v &&
                (x.preventDefault(), n && Nn(b, { select: !0 }))
            : h === g && x.preventDefault();
        }
      },
      [n, r, y.paused],
    );
    return l.jsx(gn.div, { tabIndex: -1, ...a, ref: m, onKeyDown: w });
  });
s0.displayName = FC;
function BC(e, { select: t = !1 } = {}) {
  const n = document.activeElement;
  for (const r of e)
    if ((Nn(r, { select: t }), document.activeElement !== n)) return;
}
function UC(e) {
  const t = l0(e),
    n = kp(t, e),
    r = kp(t.reverse(), e);
  return [n, r];
}
function l0(e) {
  const t = [],
    n = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (r) => {
        const o = r.tagName === "INPUT" && r.type === "hidden";
        return r.disabled || r.hidden || o
          ? NodeFilter.FILTER_SKIP
          : r.tabIndex >= 0
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
      },
    });
  for (; n.nextNode();) t.push(n.currentNode);
  return t;
}
function kp(e, t) {
  for (const n of e) if (!WC(n, { upTo: t })) return n;
}
function WC(e, { upTo: t }) {
  if (getComputedStyle(e).visibility === "hidden") return !0;
  for (; e;) {
    if (t !== void 0 && e === t) return !1;
    if (getComputedStyle(e).display === "none") return !0;
    e = e.parentElement;
  }
  return !1;
}
function VC(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
function Nn(e, { select: t = !1 } = {}) {
  if (e && e.focus) {
    const n = document.activeElement;
    (e.focus({ preventScroll: !0 }), e !== n && VC(e) && t && e.select());
  }
}
var Np = HC();
function HC() {
  let e = [];
  return {
    add(t) {
      const n = e[0];
      (t !== n && (n == null || n.pause()), (e = Cp(e, t)), e.unshift(t));
    },
    remove(t) {
      var n;
      ((e = Cp(e, t)), (n = e[0]) == null || n.resume());
    },
  };
}
function Cp(e, t) {
  const n = [...e],
    r = n.indexOf(t);
  return (r !== -1 && n.splice(r, 1), n);
}
function KC(e) {
  return e.filter((t) => t.tagName !== "A");
}
var GC = "Portal",
  a0 = p.forwardRef((e, t) => {
    var i;
    const { container: n, ...r } = e,
      [o, s] = p.useState(!1);
    et(() => s(!0), []);
    const a =
      n ||
      (o &&
        ((i = globalThis == null ? void 0 : globalThis.document) == null
          ? void 0
          : i.body));
    return a ? ro.createPortal(l.jsx(gn.div, { ...r, ref: t }), a) : null;
  });
a0.displayName = GC;
var _a = "Dialog",
  [i0, c0] = mn(_a),
  [YC, Lt] = i0(_a),
  Pa = (e) => {
    const {
        __scopeDialog: t,
        children: n,
        open: r,
        defaultOpen: o,
        onOpenChange: s,
        modal: a = !0,
      } = e,
      i = p.useRef(null),
      c = p.useRef(null),
      [u, d] = Hu({ prop: r, defaultProp: o ?? !1, onChange: s, caller: _a });
    return l.jsx(YC, {
      scope: t,
      triggerRef: i,
      contentRef: c,
      contentId: zr(),
      titleId: zr(),
      descriptionId: zr(),
      open: u,
      onOpenChange: d,
      onOpenToggle: p.useCallback(() => d((f) => !f), [d]),
      modal: a,
      children: n,
    });
  };
Pa.displayName = _a;
var u0 = "DialogTrigger",
  pd = p.forwardRef((e, t) => {
    const { __scopeDialog: n, ...r } = e,
      o = Lt(u0, n),
      s = le(t, o.triggerRef);
    return l.jsx(gn.button, {
      type: "button",
      "aria-haspopup": "dialog",
      "aria-expanded": o.open,
      "aria-controls": o.open ? o.contentId : void 0,
      "data-state": hd(o.open),
      ...r,
      ref: s,
      onClick: W(e.onClick, o.onOpenToggle),
    });
  });
pd.displayName = u0;
var md = "DialogPortal",
  [XC, d0] = i0(md, { forceMount: void 0 }),
  Ma = (e) => {
    const { __scopeDialog: t, forceMount: n, children: r, container: o } = e,
      s = Lt(md, t);
    return l.jsx(XC, {
      scope: t,
      forceMount: n,
      children: p.Children.map(r, (a) =>
        l.jsx(bt, {
          present: n || s.open,
          children: l.jsx(a0, { asChild: !0, container: o, children: a }),
        }),
      ),
    });
  };
Ma.displayName = md;
var Jl = "DialogOverlay",
  bs = p.forwardRef((e, t) => {
    const n = d0(Jl, e.__scopeDialog),
      { forceMount: r = n.forceMount, ...o } = e,
      s = Lt(Jl, e.__scopeDialog);
    return s.modal
      ? l.jsx(bt, {
          present: r || s.open,
          children: l.jsx(qC, { ...o, ref: t }),
        })
      : null;
  });
bs.displayName = Jl;
var QC = cr("DialogOverlay.RemoveScroll"),
  qC = p.forwardRef((e, t) => {
    const { __scopeDialog: n, ...r } = e,
      o = Lt(Jl, n),
      s = LC(),
      a = le(t, s);
    return l.jsx(nd, {
      as: QC,
      allowPinchZoom: !0,
      shards: [o.contentRef],
      children: l.jsx(gn.div, {
        "data-state": hd(o.open),
        ...r,
        ref: a,
        style: { pointerEvents: "auto", ...r.style },
      }),
    });
  }),
  qr = "DialogContent",
  Ss = p.forwardRef((e, t) => {
    const n = d0(qr, e.__scopeDialog),
      { forceMount: r = n.forceMount, ...o } = e,
      s = Lt(qr, e.__scopeDialog);
    return l.jsx(bt, {
      present: r || s.open,
      children: s.modal
        ? l.jsx(JC, { ...o, ref: t })
        : l.jsx(ZC, { ...o, ref: t }),
    });
  });
Ss.displayName = qr;
var JC = p.forwardRef((e, t) => {
    const n = Lt(qr, e.__scopeDialog),
      r = p.useRef(null),
      o = le(t, n.contentRef, r);
    return (
      p.useEffect(() => {
        const s = r.current;
        if (s) return ev(s);
      }, []),
      l.jsx(f0, {
        ...e,
        ref: o,
        trapFocus: n.open,
        disableOutsidePointerEvents: n.open,
        onCloseAutoFocus: W(e.onCloseAutoFocus, (s) => {
          var a;
          (s.preventDefault(), (a = n.triggerRef.current) == null || a.focus());
        }),
        onPointerDownOutside: W(e.onPointerDownOutside, (s) => {
          const a = s.detail.originalEvent,
            i = a.button === 0 && a.ctrlKey === !0;
          (a.button === 2 || i) && s.preventDefault();
        }),
        onFocusOutside: W(e.onFocusOutside, (s) => s.preventDefault()),
      })
    );
  }),
  ZC = p.forwardRef((e, t) => {
    const n = Lt(qr, e.__scopeDialog),
      r = p.useRef(!1),
      o = p.useRef(!1);
    return l.jsx(f0, {
      ...e,
      ref: t,
      trapFocus: !1,
      disableOutsidePointerEvents: !1,
      onCloseAutoFocus: (s) => {
        var a, i;
        ((a = e.onCloseAutoFocus) == null || a.call(e, s),
          s.defaultPrevented ||
            (r.current || (i = n.triggerRef.current) == null || i.focus(),
            s.preventDefault()),
          (r.current = !1),
          (o.current = !1));
      },
      onInteractOutside: (s) => {
        var c, u;
        ((c = e.onInteractOutside) == null || c.call(e, s),
          s.defaultPrevented ||
            ((r.current = !0),
            s.detail.originalEvent.type === "pointerdown" && (o.current = !0)));
        const a = s.target;
        (((u = n.triggerRef.current) == null ? void 0 : u.contains(a)) &&
          s.preventDefault(),
          s.detail.originalEvent.type === "focusin" &&
            o.current &&
            s.preventDefault());
      },
    });
  }),
  f0 = p.forwardRef((e, t) => {
    const {
        __scopeDialog: n,
        trapFocus: r,
        onOpenAutoFocus: o,
        onCloseAutoFocus: s,
        ...a
      } = e,
      i = Lt(qr, n);
    return (
      Sg(),
      l.jsx(l.Fragment, {
        children: l.jsx(s0, {
          asChild: !0,
          loop: !0,
          trapped: r,
          onMountAutoFocus: o,
          onUnmountAutoFocus: s,
          children: l.jsx(r0, {
            role: "dialog",
            id: i.contentId,
            "aria-describedby": i.descriptionId,
            "aria-labelledby": i.titleId,
            "data-state": hd(i.open),
            ...a,
            ref: t,
            deferPointerDownOutside: !0,
            onDismiss: () => i.onOpenChange(!1),
          }),
        }),
      })
    );
  }),
  p0 = "DialogTitle",
  ks = p.forwardRef((e, t) => {
    const { __scopeDialog: n, ...r } = e,
      o = Lt(p0, n);
    return l.jsx(gn.h2, { id: o.titleId, ...r, ref: t });
  });
ks.displayName = p0;
var m0 = "DialogDescription",
  Ns = p.forwardRef((e, t) => {
    const { __scopeDialog: n, ...r } = e,
      o = Lt(m0, n);
    return l.jsx(gn.p, { id: o.descriptionId, ...r, ref: t });
  });
Ns.displayName = m0;
var h0 = "DialogClose",
  Aa = p.forwardRef((e, t) => {
    const { __scopeDialog: n, ...r } = e,
      o = Lt(h0, n);
    return l.jsx(gn.button, {
      type: "button",
      ...r,
      ref: t,
      onClick: W(e.onClick, () => o.onOpenChange(!1)),
    });
  });
Aa.displayName = h0;
function hd(e) {
  return e ? "open" : "closed";
}
const eE = Pa,
  tE = pd,
  nE = Ma,
  g0 = p.forwardRef(({ className: e, ...t }, n) =>
    l.jsx(bs, {
      className: H(
        "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        e,
      ),
      ...t,
      ref: n,
    }),
  );
g0.displayName = bs.displayName;
const rE = gs(
    "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
    {
      variants: {
        side: {
          top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          bottom:
            "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
          right:
            "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
        },
      },
      defaultVariants: { side: "right" },
    },
  ),
  v0 = p.forwardRef(
    ({ side: e = "right", className: t, children: n, ...r }, o) =>
      l.jsxs(nE, {
        children: [
          l.jsx(g0, {}),
          l.jsxs(Ss, {
            ref: o,
            className: H(rE({ side: e }), t),
            ...r,
            children: [
              n,
              l.jsxs(Aa, {
                className:
                  "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
                children: [
                  l.jsx(ug, { className: "h-4 w-4" }),
                  l.jsx("span", { className: "sr-only", children: "Close" }),
                ],
              }),
            ],
          }),
        ],
      }),
  );
v0.displayName = Ss.displayName;
const x0 = ({ className: e, ...t }) =>
  l.jsx("div", {
    className: H("flex flex-col space-y-2 text-center sm:text-left", e),
    ...t,
  });
x0.displayName = "SheetHeader";
const y0 = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx(ks, {
    ref: n,
    className: H("text-lg font-semibold text-foreground", e),
    ...t,
  }),
);
y0.displayName = ks.displayName;
const w0 = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx(Ns, { ref: n, className: H("text-sm text-muted-foreground", e), ...t }),
);
w0.displayName = Ns.displayName;
const Ni = [
  { id: "overview", label: "Overview", icon: jb },
  { id: "servers", label: "Servers", icon: Xr },
  { id: "jobs", label: "Jobs", icon: hb },
  { id: "metrics", label: "Metrics", icon: tb },
  { id: "audit", label: "Audit", icon: Fn },
  { id: "terminal", label: "Terminal", icon: zu },
  { id: "settings", label: "Settings", icon: ag },
];
function oE({
  activeView: e,
  onViewChange: t,
  mode: n,
  busy: r,
  liveState: o,
  onRefresh: s,
  onLogout: a,
  children: i,
}) {
  var w;
  const c =
      ((w = Ni.find((x) => x.id === e)) == null ? void 0 : w.label) ||
      "Overview",
    u = n === "demo" ? "Demo terminal" : "Terminal",
    d =
      n === "demo"
        ? "Preview command output without opening real SSH sessions."
        : "Run safe read-only commands and inspect server output.",
    [f, m] = p.useState(!1);
  function y(x) {
    (t(x), m(!1));
  }
  return l.jsx("main", {
    className: "min-h-screen w-full max-w-full overflow-x-clip bg-background",
    children: l.jsxs("div", {
      className:
        "grid min-h-screen w-full min-w-0 xl:grid-cols-[17rem_minmax(0,1fr)]",
      children: [
        l.jsxs("aside", {
          className:
            "hidden min-h-screen w-[17rem] shrink-0 border-r border-white/10 bg-[#0d0e12] px-4 py-5 text-white shadow-[12px_0_44px_rgba(13,14,18,0.08)] xl:flex xl:flex-col",
          children: [
            l.jsxs("div", {
              className: "mb-7 flex items-center gap-3 px-1",
              children: [
                l.jsx("span", {
                  className:
                    "grid h-10 w-10 place-items-center rounded-md bg-[#844fba] text-white shadow-[0_12px_30px_rgba(132,79,186,0.25)]",
                  children: l.jsx(Xr, { size: 19 }),
                }),
                l.jsxs("div", {
                  className: "min-w-0",
                  children: [
                    l.jsx("p", {
                      className:
                        "truncate font-display text-base font-extrabold tracking-tight text-white",
                      children: "VPS Ops",
                    }),
                    l.jsx("p", {
                      className:
                        "text-[10px] font-bold uppercase tracking-[0.18em] text-white/45",
                      children: "Operations console",
                    }),
                  ],
                }),
              ],
            }),
            l.jsx("nav", {
              "aria-label": "Dashboard sidebar sections",
              className: "grid w-full gap-2",
              children: Ni.map((x) =>
                l.jsx(
                  jp,
                  {
                    active: e === x.id,
                    icon: x.icon,
                    onClick: () => t(x.id),
                    children: x.label,
                  },
                  x.id,
                ),
              ),
            }),
            l.jsxs("div", {
              className:
                "mt-auto flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-white/55",
              children: [
                l.jsx(cb, { className: "mt-0.5 shrink-0", size: 15 }),
                l.jsx("p", {
                  className: "text-[13px] font-semibold leading-5",
                  children:
                    "Passwords are sent only for one-time key provisioning and are not stored in browser storage.",
                }),
              ],
            }),
          ],
        }),
        l.jsxs("section", {
          className: "min-w-0 max-w-full overflow-hidden",
          children: [
            l.jsxs("div", {
              className:
                "relative min-h-[12.5rem] max-w-full overflow-hidden bg-[#15181e] sm:min-h-[14rem] xl:min-h-[15.5rem]",
              children: [
                l.jsx("div", {
                  className:
                    "absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(132,79,186,0.38),transparent_26%),radial-gradient(circle_at_86%_12%,rgba(21,149,136,0.24),transparent_28%),linear-gradient(120deg,rgba(255,255,255,0.08),transparent_40%)]",
                }),
                l.jsx("div", {
                  className:
                    "absolute inset-0 opacity-[0.13] [background-image:linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:42px_42px]",
                }),
                l.jsx("div", {
                  className:
                    "absolute -right-16 top-0 h-44 w-44 rounded-full bg-[#844fba]/25 blur-3xl",
                }),
                l.jsx("div", {
                  className:
                    "relative px-3 py-2 text-white sm:px-4 xl:px-6 xl:py-3",
                  children: l.jsxs("div", {
                    className:
                      "rounded-xl border border-white/10 bg-[#0d0e12]/70 p-2.5 shadow-[0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-md sm:p-3",
                    children: [
                      l.jsxs("div", {
                        className:
                          "flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between",
                        children: [
                          l.jsxs("label", {
                            className: "relative min-w-0 max-w-full xl:w-80",
                            children: [
                              l.jsx(Jb, {
                                className:
                                  "absolute left-4 top-1/2 -translate-y-1/2 text-white/55",
                                size: 17,
                              }),
                              l.jsx("input", {
                                "aria-label": "Global server search",
                                placeholder: "Search servers...",
                                className:
                                  "h-10 w-full rounded-md border-0 bg-white/[0.07] pl-11 pr-4 text-sm font-semibold text-white outline-none ring-1 ring-white/15 placeholder:text-white/45 focus:bg-white/[0.1] focus:ring-4 focus:ring-[#844fba]/30",
                              }),
                            ],
                          }),
                          l.jsxs("div", {
                            className:
                              "flex min-w-0 flex-wrap items-center gap-2",
                            children: [
                              l.jsx(sE, { mode: n }),
                              l.jsx(lE, { state: o }),
                              l.jsx(Ep, {
                                label: "Alerts",
                                children: l.jsx(Z1, { size: 18 }),
                              }),
                              l.jsx(Ep, {
                                label: "Refresh",
                                disabled: r,
                                onClick: s,
                                children: l.jsx(Yb, { size: 18 }),
                              }),
                              l.jsx(aE, { onLogout: a }),
                            ],
                          }),
                        ],
                      }),
                      l.jsx("nav", {
                        "aria-label": "Dashboard sections",
                        className: "relative mt-2 xl:hidden",
                        children: l.jsxs(eE, {
                          open: f,
                          onOpenChange: m,
                          children: [
                            l.jsxs("div", {
                              className:
                                "flex items-center justify-between gap-3 rounded-lg bg-white/95 p-2 text-sm font-black text-primary sm:p-3",
                              children: [
                                l.jsxs("div", {
                                  className: "hidden min-w-0 md:block",
                                  children: [
                                    l.jsx("p", {
                                      className:
                                        "text-xs uppercase tracking-[0.16em] text-muted-foreground",
                                      children: "Current section",
                                    }),
                                    l.jsx("p", {
                                      className: "truncate",
                                      children: c,
                                    }),
                                  ],
                                }),
                                l.jsx("p", {
                                  className:
                                    "min-w-0 truncate text-sm md:hidden",
                                  children: c,
                                }),
                                l.jsx(tE, {
                                  asChild: !0,
                                  children: l.jsx("button", {
                                    type: "button",
                                    "aria-label": "Open dashboard menu",
                                    className:
                                      "grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#844fba] text-white shadow-sm transition hover:bg-[#6f43a0] sm:h-11 sm:w-11",
                                    children: l.jsx(Fb, { size: 20 }),
                                  }),
                                }),
                              ],
                            }),
                            l.jsxs(v0, {
                              side: "right",
                              className:
                                "w-[88vw] max-w-sm border-0 bg-white p-5",
                              children: [
                                l.jsxs(x0, {
                                  className: "mb-5 text-left",
                                  children: [
                                    l.jsx(y0, { children: "Dashboard menu" }),
                                    l.jsx(w0, {
                                      children:
                                        "Switch between VPS operations sections.",
                                    }),
                                  ],
                                }),
                                l.jsx("div", {
                                  className: "grid gap-2",
                                  children: Ni.map((x) =>
                                    l.jsx(
                                      jp,
                                      {
                                        active: e === x.id,
                                        icon: x.icon,
                                        onClick: () => y(x.id),
                                        children: x.label,
                                      },
                                      x.id,
                                    ),
                                  ),
                                }),
                              ],
                            }),
                          ],
                        }),
                      }),
                    ],
                  }),
                }),
                l.jsx("div", {
                  className: H(
                    "relative flex min-w-0 max-w-full items-start px-4 text-white sm:px-8 xl:px-10",
                    e === "servers"
                      ? "pb-5 pt-0 sm:pb-7 sm:pt-1"
                      : "pb-8 pt-0 sm:pb-14 sm:pt-3",
                  ),
                  children: l.jsxs("div", {
                    className: "min-w-0 max-w-3xl",
                    children: [
                      l.jsx("p", {
                        className:
                          "text-[10px] font-black uppercase tracking-[0.24em] text-white/50 sm:text-xs",
                        children: "VPS command center",
                      }),
                      l.jsx("h1", {
                        className:
                          "mt-2 break-words font-display text-2xl font-extrabold leading-none tracking-[-0.04em] sm:text-4xl",
                        children:
                          e === "servers"
                            ? "Servers"
                            : e === "jobs"
                              ? "Jobs"
                              : e === "metrics"
                                ? "Metrics"
                                : e === "audit"
                                  ? "Audit"
                                  : e === "terminal"
                                    ? u
                                    : "Operations dashboard",
                      }),
                      e === "servers"
                        ? l.jsx("p", {
                            className:
                              "mt-1 max-w-2xl text-xs font-semibold leading-4 text-white/70 sm:mt-1.5 sm:text-sm sm:leading-5",
                            children:
                              "Manage VPS access, SSH keys, health checks, and provisioning.",
                          })
                        : null,
                      e === "jobs"
                        ? l.jsx("p", {
                            className:
                              "mt-1 max-w-2xl text-xs font-semibold leading-4 text-white/70 sm:mt-1.5 sm:text-sm sm:leading-5",
                            children:
                              "Track provisioning, metrics collection, key verification, and background tasks.",
                          })
                        : null,
                      e === "metrics"
                        ? l.jsx("p", {
                            className:
                              "mt-1 max-w-2xl text-xs font-semibold leading-4 text-white/70 sm:mt-1.5 sm:text-sm sm:leading-5",
                            children:
                              "Monitor CPU, memory, disk, load, and telemetry freshness across servers.",
                          })
                        : null,
                      e === "audit"
                        ? l.jsx("p", {
                            className:
                              "mt-1 max-w-2xl text-xs font-semibold leading-4 text-white/70 sm:mt-1.5 sm:text-sm sm:leading-5",
                            children:
                              "Review operational events, security actions, SSH access, and job activity.",
                          })
                        : null,
                      e === "terminal"
                        ? l.jsx("p", {
                            className:
                              "mt-1 max-w-2xl text-xs font-semibold leading-4 text-white/70 sm:mt-1.5 sm:text-sm sm:leading-5",
                            children: d,
                          })
                        : null,
                    ],
                  }),
                }),
              ],
            }),
            l.jsx("div", {
              className: H(
                "relative min-w-0 max-w-full overflow-hidden px-3 pb-8 sm:px-5 xl:px-8",
                e === "overview"
                  ? "-mt-10 pt-0 sm:-mt-12"
                  : e === "servers"
                    ? "pt-3"
                    : "pt-5",
              ),
              children: i,
            }),
          ],
        }),
      ],
    }),
  });
}
function sE({ mode: e }) {
  const t = e === "demo" ? "demo" : "ready",
    r = { demo: Cb, pending: sS, ready: ls }[t];
  return l.jsxs(Pe, {
    variant: t === "ready" ? "ready" : "pending",
    className: "gap-1.5 uppercase",
    children: [l.jsx(r, { size: 14 }), e],
  });
}
function lE({ state: e }) {
  const t =
      e.status === "connecting"
        ? "Connecting"
        : e.status === "live"
          ? "Live"
          : e.status === "reconnecting"
            ? "Reconnecting"
            : "Stale",
    n =
      e.status === "connecting"
        ? "bg-amber-400"
        : e.status === "live"
          ? "bg-emerald-400"
          : e.status === "reconnecting"
            ? "bg-amber-400"
            : "bg-red-400",
    r =
      e.status === "live"
        ? "ready"
        : e.status === "connecting"
          ? "pending"
          : "destructive";
  return l.jsxs(Pe, {
    variant: r,
    className: "gap-1.5 text-[11px] uppercase",
    children: [
      l.jsx("span", { className: `h-1.5 w-1.5 rounded-full ${n}` }),
      t,
      e.status !== "connecting" && "latestEventAt" in e && e.latestEventAt
        ? l.jsx("span", {
            className: "ml-1 text-[10px] font-normal opacity-70",
            children: new Date(e.latestEventAt).toLocaleTimeString(),
          })
        : null,
    ],
  });
}
function aE({ onLogout: e }) {
  return l.jsxs(ud, {
    children: [
      l.jsx(dd, {
        asChild: !0,
        children: l.jsx("button", {
          type: "button",
          className:
            "inline-flex h-10 w-10 shrink-0 items-center rounded-md text-sm font-black text-primary transition hover:bg-white/25",
          "aria-label": "Open user menu",
          children: l.jsxs(hg, {
            className: "h-10 w-10",
            children: [
              l.jsx(gg, {
                src: "https://github.com/shadcn.png",
                alt: "Local admin",
                className: "grayscale",
              }),
              l.jsx(vg, { children: "LA" }),
            ],
          }),
        }),
      }),
      l.jsxs(Ra, {
        className: "w-56 rounded-lg",
        align: "end",
        children: [
          l.jsx(n0, {
            children: l.jsxs("div", {
              className: "grid gap-1",
              children: [
                l.jsx("span", { children: "Local admin" }),
                l.jsx("span", {
                  className: "text-xs font-normal text-muted-foreground",
                  children: "VPS operations workspace",
                }),
              ],
            }),
          }),
          l.jsx(ql, {}),
          l.jsxs(CC, {
            children: [
              l.jsxs(Xe, {
                children: [
                  l.jsx(db, { size: 16 }),
                  "Profile",
                  l.jsx(Tc, { children: "⌘P" }),
                ],
              }),
              l.jsxs(Xe, {
                children: [
                  l.jsx(ag, { size: 16 }),
                  "Settings",
                  l.jsx(Tc, { children: "⌘S" }),
                ],
              }),
              l.jsxs(Xe, {
                children: [l.jsx(ls, { size: 16 }), "Security notes"],
              }),
            ],
          }),
          l.jsx(ql, {}),
          l.jsxs(Xe, {
            className: e ? "text-red-600" : "text-muted-foreground",
            onSelect: e,
            disabled: !e,
            children: [
              l.jsx(Db, { size: 16 }),
              e ? "Log out" : "Log out unavailable",
            ],
          }),
        ],
      }),
    ],
  });
}
function Ep({ label: e, children: t, ...n }) {
  return l.jsx("button", {
    type: "button",
    "aria-label": e,
    className:
      "grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white/90 text-primary shadow-sm transition hover:bg-white",
    ...n,
    children: t,
  });
}
function jp({
  active: e,
  className: t,
  icon: n,
  mobile: r = !1,
  children: o,
  ...s
}) {
  return l.jsxs("button", {
    type: "button",
    className: H(
      "inline-flex min-w-0 items-center gap-3 rounded-md px-3 py-2.5 text-left text-[12px] font-extrabold uppercase tracking-[0.08em] transition",
      r ? "w-auto shrink-0 bg-white" : "w-full",
      e
        ? "bg-white text-[#0d0e12] shadow-[0_10px_28px_rgba(255,255,255,0.08)]"
        : r
          ? "text-primary hover:bg-secondary"
          : "text-white/58 hover:bg-white/[0.07] hover:text-white",
      t,
    ),
    ...s,
    children: [
      l.jsx("span", {
        className: H(
          "grid h-8 w-8 shrink-0 place-items-center rounded-md",
          e
            ? "bg-[#844fba]/12 text-[#844fba]"
            : "bg-white/[0.06] text-white/55",
        ),
        children: l.jsx(n, { size: 16 }),
      }),
      l.jsx("span", { className: "truncate", children: o }),
    ],
  });
}
const at = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx("div", {
    ref: n,
    className: H(
      "rounded-xl border bg-card text-card-foreground shadow-panel",
      e,
    ),
    ...t,
  }),
);
at.displayName = "Card";
const vt = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx("div", {
    ref: n,
    className: H("flex flex-col space-y-1.5 p-6", e),
    ...t,
  }),
);
vt.displayName = "CardHeader";
const xt = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx("div", {
    ref: n,
    className: H("text-2xl font-extrabold leading-none tracking-[-0.035em]", e),
    ...t,
  }),
);
xt.displayName = "CardTitle";
const Tt = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx("div", {
    ref: n,
    className: H("text-sm text-muted-foreground", e),
    ...t,
  }),
);
Tt.displayName = "CardDescription";
const it = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx("div", { ref: n, className: H("p-6 pt-0", e), ...t }),
);
it.displayName = "CardContent";
const iE = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx("div", { ref: n, className: H("flex items-center p-6 pt-0", e), ...t }),
);
iE.displayName = "CardFooter";
function Zl(e) {
  return e >= 1e6
    ? `${(e / 1e6).toFixed(1)}M`
    : e >= 1e3
      ? `${Math.round(e / 1e3)}K`
      : String(e);
}
const gd = gs(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-bold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
      variants: {
        variant: {
          default:
            "bg-[#844fba] text-white shadow-[0_8px_18px_rgba(132,79,186,0.16)] hover:bg-[#6f43a0]",
          destructive:
            "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          outline:
            "border border-input bg-white hover:border-[#844fba]/40 hover:bg-[#f8f6fb] hover:text-[#15181e]",
          secondary:
            "bg-stone-100 text-secondary-foreground hover:bg-stone-200",
          ghost: "hover:bg-accent hover:text-accent-foreground",
          link: "text-primary underline-offset-4 hover:underline",
        },
        size: {
          default: "h-10 px-4 py-2",
          sm: "h-9 rounded-md px-3",
          lg: "h-11 rounded-md px-8",
          icon: "h-10 w-10",
        },
      },
      defaultVariants: { variant: "default", size: "default" },
    },
  ),
  ee = p.forwardRef(
    ({ className: e, variant: t, size: n, asChild: r = !1, ...o }, s) => {
      const a = r ? dS : "button";
      return l.jsx(a, {
        className: H(gd({ variant: t, size: n, className: e })),
        ref: s,
        ...o,
      });
    },
  );
ee.displayName = "Button";
const Pt = p.forwardRef(({ className: e, type: t, ...n }, r) =>
  l.jsx("input", {
    type: t,
    className: H(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      e,
    ),
    ref: r,
    ...n,
  }),
);
Pt.displayName = "Input";
function cE(e) {
  if (typeof document > "u") return;
  let t = document.head || document.getElementsByTagName("head")[0],
    n = document.createElement("style");
  ((n.type = "text/css"),
    t.appendChild(n),
    n.styleSheet
      ? (n.styleSheet.cssText = e)
      : n.appendChild(document.createTextNode(e)));
}
const b0 = $.createContext({
    drawerRef: { current: null },
    overlayRef: { current: null },
    onPress: () => {},
    onRelease: () => {},
    onDrag: () => {},
    onNestedDrag: () => {},
    onNestedOpenChange: () => {},
    onNestedRelease: () => {},
    openProp: void 0,
    dismissible: !1,
    isOpen: !1,
    isDragging: !1,
    keyboardIsOpen: { current: !1 },
    snapPointsOffset: null,
    snapPoints: null,
    handleOnly: !1,
    modal: !1,
    shouldFade: !1,
    activeSnapPoint: null,
    onOpenChange: () => {},
    setActiveSnapPoint: () => {},
    closeDrawer: () => {},
    direction: "bottom",
    shouldAnimate: { current: !0 },
    shouldScaleBackground: !1,
    setBackgroundColorOnScale: !0,
    noBodyStyles: !1,
    container: null,
    autoFocus: !1,
  }),
  Cs = () => {
    const e = $.useContext(b0);
    if (!e)
      throw new Error("useDrawerContext must be used within a Drawer.Root");
    return e;
  };
cE(`[data-vaul-drawer]{touch-action:none;will-change:transform;transition:transform .5s cubic-bezier(.32, .72, 0, 1);animation-duration:.5s;animation-timing-function:cubic-bezier(0.32,0.72,0,1)}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=bottom][data-state=open]{animation-name:slideFromBottom}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=bottom][data-state=closed]{animation-name:slideToBottom}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=top][data-state=open]{animation-name:slideFromTop}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=top][data-state=closed]{animation-name:slideToTop}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=left][data-state=open]{animation-name:slideFromLeft}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=left][data-state=closed]{animation-name:slideToLeft}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=right][data-state=open]{animation-name:slideFromRight}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=right][data-state=closed]{animation-name:slideToRight}[data-vaul-drawer][data-vaul-snap-points=true][data-vaul-drawer-direction=bottom]{transform:translate3d(0,var(--initial-transform,100%),0)}[data-vaul-drawer][data-vaul-snap-points=true][data-vaul-drawer-direction=top]{transform:translate3d(0,calc(var(--initial-transform,100%) * -1),0)}[data-vaul-drawer][data-vaul-snap-points=true][data-vaul-drawer-direction=left]{transform:translate3d(calc(var(--initial-transform,100%) * -1),0,0)}[data-vaul-drawer][data-vaul-snap-points=true][data-vaul-drawer-direction=right]{transform:translate3d(var(--initial-transform,100%),0,0)}[data-vaul-drawer][data-vaul-delayed-snap-points=true][data-vaul-drawer-direction=top]{transform:translate3d(0,var(--snap-point-height,0),0)}[data-vaul-drawer][data-vaul-delayed-snap-points=true][data-vaul-drawer-direction=bottom]{transform:translate3d(0,var(--snap-point-height,0),0)}[data-vaul-drawer][data-vaul-delayed-snap-points=true][data-vaul-drawer-direction=left]{transform:translate3d(var(--snap-point-height,0),0,0)}[data-vaul-drawer][data-vaul-delayed-snap-points=true][data-vaul-drawer-direction=right]{transform:translate3d(var(--snap-point-height,0),0,0)}[data-vaul-overlay][data-vaul-snap-points=false]{animation-duration:.5s;animation-timing-function:cubic-bezier(0.32,0.72,0,1)}[data-vaul-overlay][data-vaul-snap-points=false][data-state=open]{animation-name:fadeIn}[data-vaul-overlay][data-state=closed]{animation-name:fadeOut}[data-vaul-animate=false]{animation:none!important}[data-vaul-overlay][data-vaul-snap-points=true]{opacity:0;transition:opacity .5s cubic-bezier(.32, .72, 0, 1)}[data-vaul-overlay][data-vaul-snap-points=true]{opacity:1}[data-vaul-drawer]:not([data-vaul-custom-container=true])::after{content:'';position:absolute;background:inherit;background-color:inherit}[data-vaul-drawer][data-vaul-drawer-direction=top]::after{top:initial;bottom:100%;left:0;right:0;height:200%}[data-vaul-drawer][data-vaul-drawer-direction=bottom]::after{top:100%;bottom:initial;left:0;right:0;height:200%}[data-vaul-drawer][data-vaul-drawer-direction=left]::after{left:initial;right:100%;top:0;bottom:0;width:200%}[data-vaul-drawer][data-vaul-drawer-direction=right]::after{left:100%;right:initial;top:0;bottom:0;width:200%}[data-vaul-overlay][data-vaul-snap-points=true]:not([data-vaul-snap-points-overlay=true]):not(
[data-state=closed]
){opacity:0}[data-vaul-overlay][data-vaul-snap-points-overlay=true]{opacity:1}[data-vaul-handle]{display:block;position:relative;opacity:.7;background:#e2e2e4;margin-left:auto;margin-right:auto;height:5px;width:32px;border-radius:1rem;touch-action:pan-y}[data-vaul-handle]:active,[data-vaul-handle]:hover{opacity:1}[data-vaul-handle-hitarea]{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:max(100%,2.75rem);height:max(100%,2.75rem);touch-action:inherit}@media (hover:hover) and (pointer:fine){[data-vaul-drawer]{user-select:none}}@media (pointer:fine){[data-vaul-handle-hitarea]:{width:100%;height:100%}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes fadeOut{to{opacity:0}}@keyframes slideFromBottom{from{transform:translate3d(0,var(--initial-transform,100%),0)}to{transform:translate3d(0,0,0)}}@keyframes slideToBottom{to{transform:translate3d(0,var(--initial-transform,100%),0)}}@keyframes slideFromTop{from{transform:translate3d(0,calc(var(--initial-transform,100%) * -1),0)}to{transform:translate3d(0,0,0)}}@keyframes slideToTop{to{transform:translate3d(0,calc(var(--initial-transform,100%) * -1),0)}}@keyframes slideFromLeft{from{transform:translate3d(calc(var(--initial-transform,100%) * -1),0,0)}to{transform:translate3d(0,0,0)}}@keyframes slideToLeft{to{transform:translate3d(calc(var(--initial-transform,100%) * -1),0,0)}}@keyframes slideFromRight{from{transform:translate3d(var(--initial-transform,100%),0,0)}to{transform:translate3d(0,0,0)}}@keyframes slideToRight{to{transform:translate3d(var(--initial-transform,100%),0,0)}}`);
function uE() {
  const e = navigator.userAgent;
  return (
    typeof window < "u" &&
    ((/Firefox/.test(e) && /Mobile/.test(e)) || /FxiOS/.test(e))
  );
}
function dE() {
  return vd(/^Mac/);
}
function fE() {
  return vd(/^iPhone/);
}
function Rp() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}
function pE() {
  return vd(/^iPad/) || (dE() && navigator.maxTouchPoints > 1);
}
function S0() {
  return fE() || pE();
}
function vd(e) {
  return typeof window < "u" && window.navigator != null
    ? e.test(window.navigator.platform)
    : void 0;
}
const mE = 24,
  hE = typeof window < "u" ? p.useLayoutEffect : p.useEffect;
function _p(...e) {
  return (...t) => {
    for (let n of e) typeof n == "function" && n(...t);
  };
}
const Ci = typeof document < "u" && window.visualViewport;
function Pp(e) {
  let t = window.getComputedStyle(e);
  return /(auto|scroll)/.test(t.overflow + t.overflowX + t.overflowY);
}
function k0(e) {
  for (Pp(e) && (e = e.parentElement); e && !Pp(e);) e = e.parentElement;
  return e || document.scrollingElement || document.documentElement;
}
const gE = new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image",
  "button",
  "submit",
  "reset",
]);
let el = 0,
  Ei;
function vE(e = {}) {
  let { isDisabled: t } = e;
  hE(() => {
    if (!t)
      return (
        el++,
        el === 1 && S0() && (Ei = xE()),
        () => {
          (el--, el === 0 && (Ei == null || Ei()));
        }
      );
  }, [t]);
}
function xE() {
  let e,
    t = 0,
    n = (f) => {
      ((e = k0(f.target)),
        !(e === document.documentElement && e === document.body) &&
          (t = f.changedTouches[0].pageY));
    },
    r = (f) => {
      if (!e || e === document.documentElement || e === document.body) {
        f.preventDefault();
        return;
      }
      let m = f.changedTouches[0].pageY,
        y = e.scrollTop,
        w = e.scrollHeight - e.clientHeight;
      w !== 0 &&
        (((y <= 0 && m > t) || (y >= w && m < t)) && f.preventDefault(),
        (t = m));
    },
    o = (f) => {
      let m = f.target;
      Oc(m) &&
        m !== document.activeElement &&
        (f.preventDefault(),
        (m.style.transform = "translateY(-2000px)"),
        m.focus(),
        requestAnimationFrame(() => {
          m.style.transform = "";
        }));
    },
    s = (f) => {
      let m = f.target;
      Oc(m) &&
        ((m.style.transform = "translateY(-2000px)"),
        requestAnimationFrame(() => {
          ((m.style.transform = ""),
            Ci &&
              (Ci.height < window.innerHeight
                ? requestAnimationFrame(() => {
                    Mp(m);
                  })
                : Ci.addEventListener("resize", () => Mp(m), { once: !0 })));
        }));
    },
    a = () => {
      window.scrollTo(0, 0);
    },
    i = window.pageXOffset,
    c = window.pageYOffset,
    u = _p(
      yE(
        document.documentElement,
        "paddingRight",
        `${window.innerWidth - document.documentElement.clientWidth}px`,
      ),
    );
  window.scrollTo(0, 0);
  let d = _p(
    No(document, "touchstart", n, { passive: !1, capture: !0 }),
    No(document, "touchmove", r, { passive: !1, capture: !0 }),
    No(document, "touchend", o, { passive: !1, capture: !0 }),
    No(document, "focus", s, !0),
    No(window, "scroll", a),
  );
  return () => {
    (u(), d(), window.scrollTo(i, c));
  };
}
function yE(e, t, n) {
  let r = e.style[t];
  return (
    (e.style[t] = n),
    () => {
      e.style[t] = r;
    }
  );
}
function No(e, t, n, r) {
  return (
    e.addEventListener(t, n, r),
    () => {
      e.removeEventListener(t, n, r);
    }
  );
}
function Mp(e) {
  let t = document.scrollingElement || document.documentElement;
  for (; e && e !== t;) {
    let n = k0(e);
    if (n !== document.documentElement && n !== document.body && n !== e) {
      let r = n.getBoundingClientRect().top,
        o = e.getBoundingClientRect().top,
        s = e.getBoundingClientRect().bottom;
      const a = n.getBoundingClientRect().bottom + mE;
      s > a && (n.scrollTop += o - r);
    }
    e = n.parentElement;
  }
}
function Oc(e) {
  return (
    (e instanceof HTMLInputElement && !gE.has(e.type)) ||
    e instanceof HTMLTextAreaElement ||
    (e instanceof HTMLElement && e.isContentEditable)
  );
}
function wE(e, t) {
  typeof e == "function" ? e(t) : e != null && (e.current = t);
}
function bE(...e) {
  return (t) => e.forEach((n) => wE(n, t));
}
function N0(...e) {
  return p.useCallback(bE(...e), e);
}
const C0 = new WeakMap();
function Ce(e, t, n = !1) {
  if (!e || !(e instanceof HTMLElement)) return;
  let r = {};
  (Object.entries(t).forEach(([o, s]) => {
    if (o.startsWith("--")) {
      e.style.setProperty(o, s);
      return;
    }
    ((r[o] = e.style[o]), (e.style[o] = s));
  }),
    !n && C0.set(e, r));
}
function SE(e, t) {
  if (!e || !(e instanceof HTMLElement)) return;
  let n = C0.get(e);
  n && (e.style[t] = n[t]);
}
const Se = (e) => {
  switch (e) {
    case "top":
    case "bottom":
      return !0;
    case "left":
    case "right":
      return !1;
    default:
      return e;
  }
};
function tl(e, t) {
  if (!e) return null;
  const n = window.getComputedStyle(e),
    r = n.transform || n.webkitTransform || n.mozTransform;
  let o = r.match(/^matrix3d\((.+)\)$/);
  return o
    ? parseFloat(o[1].split(", ")[Se(t) ? 13 : 12])
    : ((o = r.match(/^matrix\((.+)\)$/)),
      o ? parseFloat(o[1].split(", ")[Se(t) ? 5 : 4]) : null);
}
function kE(e) {
  return 8 * (Math.log(e + 1) - 2);
}
function ji(e, t) {
  if (!e) return () => {};
  const n = e.style.cssText;
  return (
    Object.assign(e.style, t),
    () => {
      e.style.cssText = n;
    }
  );
}
function NE(...e) {
  return (...t) => {
    for (const n of e) typeof n == "function" && n(...t);
  };
}
const me = { DURATION: 0.5, EASE: [0.32, 0.72, 0, 1] },
  E0 = 0.4,
  CE = 0.25,
  EE = 100,
  j0 = 8,
  Qn = 16,
  Ic = 26,
  Ri = "vaul-dragging";
function R0(e) {
  const t = $.useRef(e);
  return (
    $.useEffect(() => {
      t.current = e;
    }),
    $.useMemo(
      () =>
        (...n) =>
          t.current == null ? void 0 : t.current.call(t, ...n),
      [],
    )
  );
}
function jE({ defaultProp: e, onChange: t }) {
  const n = $.useState(e),
    [r] = n,
    o = $.useRef(r),
    s = R0(t);
  return (
    $.useEffect(() => {
      o.current !== r && (s(r), (o.current = r));
    }, [r, o, s]),
    n
  );
}
function _0({ prop: e, defaultProp: t, onChange: n = () => {} }) {
  const [r, o] = jE({ defaultProp: t, onChange: n }),
    s = e !== void 0,
    a = s ? e : r,
    i = R0(n),
    c = $.useCallback(
      (u) => {
        if (s) {
          const f = typeof u == "function" ? u(e) : u;
          f !== e && i(f);
        } else o(u);
      },
      [s, e, o, i],
    );
  return [a, c];
}
function RE({
  activeSnapPointProp: e,
  setActiveSnapPointProp: t,
  snapPoints: n,
  drawerRef: r,
  overlayRef: o,
  fadeFromIndex: s,
  onSnapPointChange: a,
  direction: i = "bottom",
  container: c,
  snapToSequentialPoint: u,
}) {
  const [d, f] = _0({
      prop: e,
      defaultProp: n == null ? void 0 : n[0],
      onChange: t,
    }),
    [m, y] = $.useState(
      typeof window < "u"
        ? { innerWidth: window.innerWidth, innerHeight: window.innerHeight }
        : void 0,
    );
  $.useEffect(() => {
    function N() {
      y({ innerWidth: window.innerWidth, innerHeight: window.innerHeight });
    }
    return (
      window.addEventListener("resize", N),
      () => window.removeEventListener("resize", N)
    );
  }, []);
  const w = $.useMemo(
      () => d === (n == null ? void 0 : n[n.length - 1]) || null,
      [n, d],
    ),
    x = $.useMemo(() => {
      var N;
      return (N = n == null ? void 0 : n.findIndex((E) => E === d)) != null
        ? N
        : null;
    }, [n, d]),
    k =
      (n && n.length > 0 && (s || s === 0) && !Number.isNaN(s) && n[s] === d) ||
      !n,
    h = $.useMemo(() => {
      const N = c
        ? {
            width: c.getBoundingClientRect().width,
            height: c.getBoundingClientRect().height,
          }
        : typeof window < "u"
          ? { width: window.innerWidth, height: window.innerHeight }
          : { width: 0, height: 0 };
      var E;
      return (E =
        n == null
          ? void 0
          : n.map((j) => {
              const R = typeof j == "string";
              let M = 0;
              if ((R && (M = parseInt(j, 10)), Se(i))) {
                const D = R ? M : m ? j * N.height : 0;
                return m ? (i === "bottom" ? N.height - D : -N.height + D) : D;
              }
              const T = R ? M : m ? j * N.width : 0;
              return m ? (i === "right" ? N.width - T : -N.width + T) : T;
            })) != null
        ? E
        : [];
    }, [n, m, c]),
    g = $.useMemo(
      () => (x !== null ? (h == null ? void 0 : h[x]) : null),
      [h, x],
    ),
    v = $.useCallback(
      (N) => {
        var E;
        const j =
          (E = h == null ? void 0 : h.findIndex((R) => R === N)) != null
            ? E
            : null;
        (a(j),
          Ce(r.current, {
            transition: `transform ${me.DURATION}s cubic-bezier(${me.EASE.join(",")})`,
            transform: Se(i)
              ? `translate3d(0, ${N}px, 0)`
              : `translate3d(${N}px, 0, 0)`,
          }),
          h && j !== h.length - 1 && s !== void 0 && j !== s && j < s
            ? Ce(o.current, {
                transition: `opacity ${me.DURATION}s cubic-bezier(${me.EASE.join(",")})`,
                opacity: "0",
              })
            : Ce(o.current, {
                transition: `opacity ${me.DURATION}s cubic-bezier(${me.EASE.join(",")})`,
                opacity: "1",
              }),
          f(n == null ? void 0 : n[Math.max(j, 0)]));
      },
      [r.current, n, h, s, o, f],
    );
  $.useEffect(() => {
    if (d || e) {
      var N;
      const E =
        (N = n == null ? void 0 : n.findIndex((j) => j === e || j === d)) !=
        null
          ? N
          : -1;
      h && E !== -1 && typeof h[E] == "number" && v(h[E]);
    }
  }, [d, e, n, h, v]);
  function b({
    draggedDistance: N,
    closeDrawer: E,
    velocity: j,
    dismissible: R,
  }) {
    if (s === void 0) return;
    const M = i === "bottom" || i === "right" ? (g ?? 0) - N : (g ?? 0) + N,
      T = x === s - 1,
      D = x === 0,
      B = N > 0;
    if (
      (T &&
        Ce(o.current, {
          transition: `opacity ${me.DURATION}s cubic-bezier(${me.EASE.join(",")})`,
        }),
      !u && j > 2 && !B)
    ) {
      R ? E() : v(h[0]);
      return;
    }
    if (!u && j > 2 && B && h && n) {
      v(h[n.length - 1]);
      return;
    }
    const Q =
        h == null
          ? void 0
          : h.reduce((K, _) =>
              typeof K != "number" || typeof _ != "number"
                ? K
                : Math.abs(_ - M) < Math.abs(K - M)
                  ? _
                  : K,
            ),
      F = Se(i) ? window.innerHeight : window.innerWidth;
    if (j > E0 && Math.abs(N) < F * 0.4) {
      const K = B ? 1 : -1;
      if (K > 0 && w && n) {
        v(h[n.length - 1]);
        return;
      }
      if ((D && K < 0 && R && E(), x === null)) return;
      v(h[x + K]);
      return;
    }
    v(Q);
  }
  function S({ draggedDistance: N }) {
    if (g === null) return;
    const E = i === "bottom" || i === "right" ? g - N : g + N;
    ((i === "bottom" || i === "right") && E < h[h.length - 1]) ||
      ((i === "top" || i === "left") && E > h[h.length - 1]) ||
      Ce(r.current, {
        transform: Se(i)
          ? `translate3d(0, ${E}px, 0)`
          : `translate3d(${E}px, 0, 0)`,
      });
  }
  function C(N, E) {
    if (!n || typeof x != "number" || !h || s === void 0) return null;
    const j = x === s - 1;
    if (x >= s && E) return 0;
    if (j && !E) return 1;
    if (!k && !j) return null;
    const M = j ? x + 1 : x - 1,
      T = j ? h[M] - h[M - 1] : h[M + 1] - h[M],
      D = N / Math.abs(T);
    return j ? 1 - D : D;
  }
  return {
    isLastSnapPoint: w,
    activeSnapPoint: d,
    shouldFade: k,
    getPercentageDragged: C,
    setActiveSnapPoint: f,
    activeSnapPointIndex: x,
    onRelease: b,
    onDrag: S,
    snapPointsOffset: h,
  };
}
const _E = () => () => {};
function PE() {
  const {
      direction: e,
      isOpen: t,
      shouldScaleBackground: n,
      setBackgroundColorOnScale: r,
      noBodyStyles: o,
    } = Cs(),
    s = $.useRef(null),
    a = p.useMemo(() => document.body.style.backgroundColor, []);
  function i() {
    return (window.innerWidth - Ic) / window.innerWidth;
  }
  $.useEffect(() => {
    if (t && n) {
      s.current && clearTimeout(s.current);
      const c =
        document.querySelector("[data-vaul-drawer-wrapper]") ||
        document.querySelector("[vaul-drawer-wrapper]");
      if (!c) return;
      NE(
        r && !o ? ji(document.body, { background: "black" }) : _E,
        ji(c, {
          transformOrigin: Se(e) ? "top" : "left",
          transitionProperty: "transform, border-radius",
          transitionDuration: `${me.DURATION}s`,
          transitionTimingFunction: `cubic-bezier(${me.EASE.join(",")})`,
        }),
      );
      const u = ji(c, {
        borderRadius: `${j0}px`,
        overflow: "hidden",
        ...(Se(e)
          ? {
              transform: `scale(${i()}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`,
            }
          : {
              transform: `scale(${i()}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)`,
            }),
      });
      return () => {
        (u(),
          (s.current = window.setTimeout(() => {
            a
              ? (document.body.style.background = a)
              : document.body.style.removeProperty("background");
          }, me.DURATION * 1e3)));
      };
    }
  }, [t, n, a]);
}
let Co = null;
function ME({
  isOpen: e,
  modal: t,
  nested: n,
  hasBeenOpened: r,
  preventScrollRestoration: o,
  noBodyStyles: s,
}) {
  const [a, i] = $.useState(() =>
      typeof window < "u" ? window.location.href : "",
    ),
    c = $.useRef(0),
    u = $.useCallback(() => {
      if (Rp() && Co === null && e && !s) {
        Co = {
          position: document.body.style.position,
          top: document.body.style.top,
          left: document.body.style.left,
          height: document.body.style.height,
          right: "unset",
        };
        const { scrollX: f, innerHeight: m } = window;
        (document.body.style.setProperty("position", "fixed", "important"),
          Object.assign(document.body.style, {
            top: `${-c.current}px`,
            left: `${-f}px`,
            right: "0px",
            height: "auto",
          }),
          window.setTimeout(
            () =>
              window.requestAnimationFrame(() => {
                const y = m - window.innerHeight;
                y &&
                  c.current >= m &&
                  (document.body.style.top = `${-(c.current + y)}px`);
              }),
            300,
          ));
      }
    }, [e]),
    d = $.useCallback(() => {
      if (Rp() && Co !== null && !s) {
        const f = -parseInt(document.body.style.top, 10),
          m = -parseInt(document.body.style.left, 10);
        (Object.assign(document.body.style, Co),
          window.requestAnimationFrame(() => {
            if (o && a !== window.location.href) {
              i(window.location.href);
              return;
            }
            window.scrollTo(m, f);
          }),
          (Co = null));
      }
    }, [a]);
  return (
    $.useEffect(() => {
      function f() {
        c.current = window.scrollY;
      }
      return (
        f(),
        window.addEventListener("scroll", f),
        () => {
          window.removeEventListener("scroll", f);
        }
      );
    }, []),
    $.useEffect(() => {
      if (t)
        return () => {
          typeof document > "u" ||
            document.querySelector("[data-vaul-drawer]") ||
            d();
        };
    }, [t, d]),
    $.useEffect(() => {
      n ||
        !r ||
        (e
          ? (!window.matchMedia("(display-mode: standalone)").matches && u(),
            t ||
              window.setTimeout(() => {
                d();
              }, 500))
          : d());
    }, [e, r, a, t, n, u, d]),
    { restorePositionSetting: d }
  );
}
function AE({
  open: e,
  onOpenChange: t,
  children: n,
  onDrag: r,
  onRelease: o,
  snapPoints: s,
  shouldScaleBackground: a = !1,
  setBackgroundColorOnScale: i = !0,
  closeThreshold: c = CE,
  scrollLockTimeout: u = EE,
  dismissible: d = !0,
  handleOnly: f = !1,
  fadeFromIndex: m = s && s.length - 1,
  activeSnapPoint: y,
  setActiveSnapPoint: w,
  fixed: x,
  modal: k = !0,
  onClose: h,
  nested: g,
  noBodyStyles: v = !1,
  direction: b = "bottom",
  defaultOpen: S = !1,
  disablePreventScroll: C = !0,
  snapToSequentialPoint: N = !1,
  preventScrollRestoration: E = !1,
  repositionInputs: j = !0,
  onAnimationEnd: R,
  container: M,
  autoFocus: T = !1,
}) {
  var D, B;
  const [Q = !1, F] = _0({
      defaultProp: S,
      prop: e,
      onChange: (G) => {
        (t == null || t(G),
          !G && !g && _x(),
          setTimeout(() => {
            R == null || R(G);
          }, me.DURATION * 1e3),
          G &&
            !k &&
            typeof window < "u" &&
            window.requestAnimationFrame(() => {
              document.body.style.pointerEvents = "auto";
            }),
          G || (document.body.style.pointerEvents = "auto"));
      },
    }),
    [K, _] = $.useState(!1),
    [P, I] = $.useState(!1),
    [V, J] = $.useState(!1),
    Ne = $.useRef(null),
    O = $.useRef(null),
    L = $.useRef(null),
    U = $.useRef(null),
    te = $.useRef(null),
    Fe = $.useRef(!1),
    Re = $.useRef(null),
    Ae = $.useRef(0),
    Jt = $.useRef(!1),
    ao = $.useRef(!S),
    io = $.useRef(0),
    Y = $.useRef(null),
    co = $.useRef(
      ((D = Y.current) == null ? void 0 : D.getBoundingClientRect().height) ||
        0,
    ),
    Es = $.useRef(
      ((B = Y.current) == null ? void 0 : B.getBoundingClientRect().width) || 0,
    ),
    uo = $.useRef(0),
    Ia = $.useCallback((G) => {
      s && G === fo.length - 1 && (O.current = new Date());
    }, []),
    {
      activeSnapPoint: La,
      activeSnapPointIndex: kt,
      setActiveSnapPoint: kd,
      onRelease: Ex,
      snapPointsOffset: fo,
      onDrag: jx,
      shouldFade: Nd,
      getPercentageDragged: Rx,
    } = RE({
      snapPoints: s,
      activeSnapPointProp: y,
      setActiveSnapPointProp: w,
      drawerRef: Y,
      fadeFromIndex: m,
      overlayRef: Ne,
      onSnapPointChange: Ia,
      direction: b,
      container: M,
      snapToSequentialPoint: N,
    });
  vE({ isDisabled: !Q || P || !k || V || !K || !j || !C });
  const { restorePositionSetting: _x } = ME({
    isOpen: Q,
    modal: k,
    nested: g ?? !1,
    hasBeenOpened: K,
    preventScrollRestoration: E,
    noBodyStyles: v,
  });
  function js() {
    return (window.innerWidth - Ic) / window.innerWidth;
  }
  function Px(G) {
    var oe, ae;
    (!d && !s) ||
      (Y.current && !Y.current.contains(G.target)) ||
      ((co.current =
        ((oe = Y.current) == null
          ? void 0
          : oe.getBoundingClientRect().height) || 0),
      (Es.current =
        ((ae = Y.current) == null
          ? void 0
          : ae.getBoundingClientRect().width) || 0),
      I(!0),
      (L.current = new Date()),
      S0() &&
        window.addEventListener("touchend", () => (Fe.current = !1), {
          once: !0,
        }),
      G.target.setPointerCapture(G.pointerId),
      (Ae.current = Se(b) ? G.pageY : G.pageX));
  }
  function Cd(G, oe) {
    var ae;
    let re = G;
    const ye = (ae = window.getSelection()) == null ? void 0 : ae.toString(),
      Ge = Y.current ? tl(Y.current, b) : null,
      Be = new Date();
    if (
      re.tagName === "SELECT" ||
      re.hasAttribute("data-vaul-no-drag") ||
      re.closest("[data-vaul-no-drag]")
    )
      return !1;
    if (b === "right" || b === "left") return !0;
    if (O.current && Be.getTime() - O.current.getTime() < 500) return !1;
    if (Ge !== null && (b === "bottom" ? Ge > 0 : Ge < 0)) return !0;
    if (ye && ye.length > 0) return !1;
    if (
      (te.current && Be.getTime() - te.current.getTime() < u && Ge === 0) ||
      oe
    )
      return ((te.current = Be), !1);
    for (; re;) {
      if (re.scrollHeight > re.clientHeight) {
        if (re.scrollTop !== 0) return ((te.current = new Date()), !1);
        if (re.getAttribute("role") === "dialog") return !0;
      }
      re = re.parentNode;
    }
    return !0;
  }
  function Mx(G) {
    if (Y.current && P) {
      const oe = b === "bottom" || b === "right" ? 1 : -1,
        ae = (Ae.current - (Se(b) ? G.pageY : G.pageX)) * oe,
        re = ae > 0,
        ye = s && !d && !re;
      if (ye && kt === 0) return;
      const Ge = Math.abs(ae),
        Be = document.querySelector("[data-vaul-drawer-wrapper]"),
        xn = b === "bottom" || b === "top" ? co.current : Es.current;
      let Nt = Ge / xn;
      const Yn = Rx(Ge, re);
      if (
        (Yn !== null && (Nt = Yn),
        (ye && Nt >= 1) || (!Fe.current && !Cd(G.target, re)))
      )
        return;
      if (
        (Y.current.classList.add(Ri),
        (Fe.current = !0),
        Ce(Y.current, { transition: "none" }),
        Ce(Ne.current, { transition: "none" }),
        s && jx({ draggedDistance: ae }),
        re && !s)
      ) {
        const $t = kE(ae),
          Rs = Math.min($t * -1, 0) * oe;
        Ce(Y.current, {
          transform: Se(b)
            ? `translate3d(0, ${Rs}px, 0)`
            : `translate3d(${Rs}px, 0, 0)`,
        });
        return;
      }
      const yn = 1 - Nt;
      if (
        ((Nd || (m && kt === m - 1)) &&
          (r == null || r(G, Nt),
          Ce(Ne.current, { opacity: `${yn}`, transition: "none" }, !0)),
        Be && Ne.current && a)
      ) {
        const $t = Math.min(js() + Nt * (1 - js()), 1),
          Rs = 8 - Nt * 8,
          jd = Math.max(0, 14 - Nt * 14);
        Ce(
          Be,
          {
            borderRadius: `${Rs}px`,
            transform: Se(b)
              ? `scale(${$t}) translate3d(0, ${jd}px, 0)`
              : `scale(${$t}) translate3d(${jd}px, 0, 0)`,
            transition: "none",
          },
          !0,
        );
      }
      if (!s) {
        const $t = Ge * oe;
        Ce(Y.current, {
          transform: Se(b)
            ? `translate3d(0, ${$t}px, 0)`
            : `translate3d(${$t}px, 0, 0)`,
        });
      }
    }
  }
  ($.useEffect(() => {
    window.requestAnimationFrame(() => {
      ao.current = !0;
    });
  }, []),
    $.useEffect(() => {
      var G;
      function oe() {
        if (!Y.current || !j) return;
        const ae = document.activeElement;
        if (Oc(ae) || Jt.current) {
          var re;
          const ye =
              ((re = window.visualViewport) == null ? void 0 : re.height) || 0,
            Ge = window.innerHeight;
          let Be = Ge - ye;
          const xn = Y.current.getBoundingClientRect().height || 0,
            Nt = xn > Ge * 0.8;
          uo.current || (uo.current = xn);
          const Yn = Y.current.getBoundingClientRect().top;
          if (
            (Math.abs(io.current - Be) > 60 && (Jt.current = !Jt.current),
            s && s.length > 0 && fo && kt)
          ) {
            const yn = fo[kt] || 0;
            Be += yn;
          }
          if (((io.current = Be), xn > ye || Jt.current)) {
            const yn = Y.current.getBoundingClientRect().height;
            let $t = yn;
            (yn > ye && ($t = ye - (Nt ? Yn : Ic)),
              x
                ? (Y.current.style.height = `${yn - Math.max(Be, 0)}px`)
                : (Y.current.style.height = `${Math.max($t, ye - Yn)}px`));
          } else uE() || (Y.current.style.height = `${uo.current}px`);
          s && s.length > 0 && !Jt.current
            ? (Y.current.style.bottom = "0px")
            : (Y.current.style.bottom = `${Math.max(Be, 0)}px`);
        }
      }
      return (
        (G = window.visualViewport) == null || G.addEventListener("resize", oe),
        () => {
          var ae;
          return (ae = window.visualViewport) == null
            ? void 0
            : ae.removeEventListener("resize", oe);
        }
      );
    }, [kt, s, fo]));
  function po(G) {
    (Ax(),
      h == null || h(),
      G || F(!1),
      setTimeout(() => {
        s && kd(s[0]);
      }, me.DURATION * 1e3));
  }
  function Ed() {
    if (!Y.current) return;
    const G = document.querySelector("[data-vaul-drawer-wrapper]"),
      oe = tl(Y.current, b);
    (Ce(Y.current, {
      transform: "translate3d(0, 0, 0)",
      transition: `transform ${me.DURATION}s cubic-bezier(${me.EASE.join(",")})`,
    }),
      Ce(Ne.current, {
        transition: `opacity ${me.DURATION}s cubic-bezier(${me.EASE.join(",")})`,
        opacity: "1",
      }),
      a &&
        oe &&
        oe > 0 &&
        Q &&
        Ce(
          G,
          {
            borderRadius: `${j0}px`,
            overflow: "hidden",
            ...(Se(b)
              ? {
                  transform: `scale(${js()}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`,
                  transformOrigin: "top",
                }
              : {
                  transform: `scale(${js()}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)`,
                  transformOrigin: "left",
                }),
            transitionProperty: "transform, border-radius",
            transitionDuration: `${me.DURATION}s`,
            transitionTimingFunction: `cubic-bezier(${me.EASE.join(",")})`,
          },
          !0,
        ));
  }
  function Ax() {
    !P ||
      !Y.current ||
      (Y.current.classList.remove(Ri),
      (Fe.current = !1),
      I(!1),
      (U.current = new Date()));
  }
  function Tx(G) {
    if (!P || !Y.current) return;
    (Y.current.classList.remove(Ri),
      (Fe.current = !1),
      I(!1),
      (U.current = new Date()));
    const oe = tl(Y.current, b);
    if (
      !G ||
      !Cd(G.target, !1) ||
      !oe ||
      Number.isNaN(oe) ||
      L.current === null
    )
      return;
    const ae = U.current.getTime() - L.current.getTime(),
      re = Ae.current - (Se(b) ? G.pageY : G.pageX),
      ye = Math.abs(re) / ae;
    if (
      (ye > 0.05 &&
        (J(!0),
        setTimeout(() => {
          J(!1);
        }, 200)),
      s)
    ) {
      (Ex({
        draggedDistance: re * (b === "bottom" || b === "right" ? 1 : -1),
        closeDrawer: po,
        velocity: ye,
        dismissible: d,
      }),
        o == null || o(G, !0));
      return;
    }
    if (b === "bottom" || b === "right" ? re > 0 : re < 0) {
      (Ed(), o == null || o(G, !0));
      return;
    }
    if (ye > E0) {
      (po(), o == null || o(G, !1));
      return;
    }
    var Ge;
    const Be = Math.min(
      (Ge = Y.current.getBoundingClientRect().height) != null ? Ge : 0,
      window.innerHeight,
    );
    var xn;
    const Nt = Math.min(
        (xn = Y.current.getBoundingClientRect().width) != null ? xn : 0,
        window.innerWidth,
      ),
      Yn = b === "left" || b === "right";
    if (Math.abs(oe) >= (Yn ? Nt : Be) * c) {
      (po(), o == null || o(G, !1));
      return;
    }
    (o == null || o(G, !0), Ed());
  }
  $.useEffect(
    () => (
      Q &&
        (Ce(document.documentElement, { scrollBehavior: "auto" }),
        (O.current = new Date())),
      () => {
        SE(document.documentElement, "scrollBehavior");
      }
    ),
    [Q],
  );
  function Dx(G) {
    const oe = G ? (window.innerWidth - Qn) / window.innerWidth : 1,
      ae = G ? -Qn : 0;
    (Re.current && window.clearTimeout(Re.current),
      Ce(Y.current, {
        transition: `transform ${me.DURATION}s cubic-bezier(${me.EASE.join(",")})`,
        transform: Se(b)
          ? `scale(${oe}) translate3d(0, ${ae}px, 0)`
          : `scale(${oe}) translate3d(${ae}px, 0, 0)`,
      }),
      !G &&
        Y.current &&
        (Re.current = setTimeout(() => {
          const re = tl(Y.current, b);
          Ce(Y.current, {
            transition: "none",
            transform: Se(b)
              ? `translate3d(0, ${re}px, 0)`
              : `translate3d(${re}px, 0, 0)`,
          });
        }, 500)));
  }
  function Ox(G, oe) {
    if (oe < 0) return;
    const ae = (window.innerWidth - Qn) / window.innerWidth,
      re = ae + oe * (1 - ae),
      ye = -Qn + oe * Qn;
    Ce(Y.current, {
      transform: Se(b)
        ? `scale(${re}) translate3d(0, ${ye}px, 0)`
        : `scale(${re}) translate3d(${ye}px, 0, 0)`,
      transition: "none",
    });
  }
  function Ix(G, oe) {
    const ae = Se(b) ? window.innerHeight : window.innerWidth,
      re = oe ? (ae - Qn) / ae : 1,
      ye = oe ? -Qn : 0;
    oe &&
      Ce(Y.current, {
        transition: `transform ${me.DURATION}s cubic-bezier(${me.EASE.join(",")})`,
        transform: Se(b)
          ? `scale(${re}) translate3d(0, ${ye}px, 0)`
          : `scale(${re}) translate3d(${ye}px, 0, 0)`,
      });
  }
  return (
    $.useEffect(() => {
      k ||
        window.requestAnimationFrame(() => {
          document.body.style.pointerEvents = "auto";
        });
    }, [k]),
    $.createElement(
      Pa,
      {
        defaultOpen: S,
        onOpenChange: (G) => {
          (!d && !G) || (G ? _(!0) : po(!0), F(G));
        },
        open: Q,
      },
      $.createElement(
        b0.Provider,
        {
          value: {
            activeSnapPoint: La,
            snapPoints: s,
            setActiveSnapPoint: kd,
            drawerRef: Y,
            overlayRef: Ne,
            onOpenChange: t,
            onPress: Px,
            onRelease: Tx,
            onDrag: Mx,
            dismissible: d,
            shouldAnimate: ao,
            handleOnly: f,
            isOpen: Q,
            isDragging: P,
            shouldFade: Nd,
            closeDrawer: po,
            onNestedDrag: Ox,
            onNestedOpenChange: Dx,
            onNestedRelease: Ix,
            keyboardIsOpen: Jt,
            modal: k,
            snapPointsOffset: fo,
            activeSnapPointIndex: kt,
            direction: b,
            shouldScaleBackground: a,
            setBackgroundColorOnScale: i,
            noBodyStyles: v,
            container: M,
            autoFocus: T,
          },
        },
        n,
      ),
    )
  );
}
const P0 = $.forwardRef(function ({ ...e }, t) {
  const {
      overlayRef: n,
      snapPoints: r,
      onRelease: o,
      shouldFade: s,
      isOpen: a,
      modal: i,
      shouldAnimate: c,
    } = Cs(),
    u = N0(t, n),
    d = r && r.length > 0;
  if (!i) return null;
  const f = $.useCallback((m) => o(m), [o]);
  return $.createElement(bs, {
    onMouseUp: f,
    ref: u,
    "data-vaul-overlay": "",
    "data-vaul-snap-points": a && d ? "true" : "false",
    "data-vaul-snap-points-overlay": a && s ? "true" : "false",
    "data-vaul-animate": c != null && c.current ? "true" : "false",
    ...e,
  });
});
P0.displayName = "Drawer.Overlay";
const M0 = $.forwardRef(function (
  { onPointerDownOutside: e, style: t, onOpenAutoFocus: n, ...r },
  o,
) {
  const {
      drawerRef: s,
      onPress: a,
      onRelease: i,
      onDrag: c,
      keyboardIsOpen: u,
      snapPointsOffset: d,
      activeSnapPointIndex: f,
      modal: m,
      isOpen: y,
      direction: w,
      snapPoints: x,
      container: k,
      handleOnly: h,
      shouldAnimate: g,
      autoFocus: v,
    } = Cs(),
    [b, S] = $.useState(!1),
    C = N0(o, s),
    N = $.useRef(null),
    E = $.useRef(null),
    j = $.useRef(!1),
    R = x && x.length > 0;
  PE();
  const M = (D, B, Q = 0) => {
    if (j.current) return !0;
    const F = Math.abs(D.y),
      K = Math.abs(D.x),
      _ = K > F,
      P = ["bottom", "right"].includes(B) ? 1 : -1;
    if (B === "left" || B === "right") {
      if (!(D.x * P < 0) && K >= 0 && K <= Q) return _;
    } else if (!(D.y * P < 0) && F >= 0 && F <= Q) return !_;
    return ((j.current = !0), !0);
  };
  $.useEffect(() => {
    R &&
      window.requestAnimationFrame(() => {
        S(!0);
      });
  }, []);
  function T(D) {
    ((N.current = null), (j.current = !1), i(D));
  }
  return $.createElement(Ss, {
    "data-vaul-drawer-direction": w,
    "data-vaul-drawer": "",
    "data-vaul-delayed-snap-points": b ? "true" : "false",
    "data-vaul-snap-points": y && R ? "true" : "false",
    "data-vaul-custom-container": k ? "true" : "false",
    "data-vaul-animate": g != null && g.current ? "true" : "false",
    ...r,
    ref: C,
    style:
      d && d.length > 0 ? { "--snap-point-height": `${d[f ?? 0]}px`, ...t } : t,
    onPointerDown: (D) => {
      h ||
        (r.onPointerDown == null || r.onPointerDown.call(r, D),
        (N.current = { x: D.pageX, y: D.pageY }),
        a(D));
    },
    onOpenAutoFocus: (D) => {
      (n == null || n(D), v || D.preventDefault());
    },
    onPointerDownOutside: (D) => {
      if ((e == null || e(D), !m || D.defaultPrevented)) {
        D.preventDefault();
        return;
      }
      u.current && (u.current = !1);
    },
    onFocusOutside: (D) => {
      if (!m) {
        D.preventDefault();
        return;
      }
    },
    onPointerMove: (D) => {
      if (
        ((E.current = D),
        h ||
          (r.onPointerMove == null || r.onPointerMove.call(r, D), !N.current))
      )
        return;
      const B = D.pageY - N.current.y,
        Q = D.pageX - N.current.x,
        F = D.pointerType === "touch" ? 10 : 2;
      M({ x: Q, y: B }, w, F)
        ? c(D)
        : (Math.abs(Q) > F || Math.abs(B) > F) && (N.current = null);
    },
    onPointerUp: (D) => {
      (r.onPointerUp == null || r.onPointerUp.call(r, D),
        (N.current = null),
        (j.current = !1),
        i(D));
    },
    onPointerOut: (D) => {
      (r.onPointerOut == null || r.onPointerOut.call(r, D), T(E.current));
    },
    onContextMenu: (D) => {
      (r.onContextMenu == null || r.onContextMenu.call(r, D),
        E.current && T(E.current));
    },
  });
});
M0.displayName = "Drawer.Content";
const TE = 250,
  DE = 120,
  A0 = $.forwardRef(function ({ preventCycle: e = !1, children: t, ...n }, r) {
    const {
        closeDrawer: o,
        isDragging: s,
        snapPoints: a,
        activeSnapPoint: i,
        setActiveSnapPoint: c,
        dismissible: u,
        handleOnly: d,
        isOpen: f,
        onPress: m,
        onDrag: y,
      } = Cs(),
      w = $.useRef(null),
      x = $.useRef(!1);
    function k() {
      if (x.current) {
        v();
        return;
      }
      window.setTimeout(() => {
        h();
      }, DE);
    }
    function h() {
      if (s || e || x.current) {
        v();
        return;
      }
      if ((v(), !a || a.length === 0)) {
        u || o();
        return;
      }
      if (i === a[a.length - 1] && u) {
        o();
        return;
      }
      const S = a.findIndex((N) => N === i);
      if (S === -1) return;
      const C = a[S + 1];
      c(C);
    }
    function g() {
      w.current = window.setTimeout(() => {
        x.current = !0;
      }, TE);
    }
    function v() {
      (w.current && window.clearTimeout(w.current), (x.current = !1));
    }
    return $.createElement(
      "div",
      {
        onClick: k,
        onPointerCancel: v,
        onPointerDown: (b) => {
          (d && m(b), g());
        },
        onPointerMove: (b) => {
          d && y(b);
        },
        ref: r,
        "data-vaul-drawer-visible": f ? "true" : "false",
        "data-vaul-handle": "",
        "aria-hidden": "true",
        ...n,
      },
      $.createElement(
        "span",
        { "data-vaul-handle-hitarea": "", "aria-hidden": "true" },
        t,
      ),
    );
  });
A0.displayName = "Drawer.Handle";
function OE(e) {
  const t = Cs(),
    { container: n = t.container, ...r } = e;
  return $.createElement(Ma, { container: n, ...r });
}
const Qt = {
    Root: AE,
    Content: M0,
    Overlay: P0,
    Portal: OE,
    Handle: A0,
    Title: ks,
    Description: Ns,
  },
  T0 = ({ shouldScaleBackground: e = !0, ...t }) =>
    l.jsx(Qt.Root, { shouldScaleBackground: e, ...t });
T0.displayName = "Drawer";
const IE = Qt.Portal,
  LE = Qt.Handle,
  D0 = p.forwardRef(({ className: e, ...t }, n) =>
    l.jsx(Qt.Overlay, {
      ref: n,
      className: H("fixed inset-0 z-50 bg-black/80", e),
      ...t,
    }),
  );
D0.displayName = Qt.Overlay.displayName;
const O0 = p.forwardRef(
  ({ className: e, children: t, showHandle: n = !0, ...r }, o) =>
    l.jsxs(IE, {
      children: [
        l.jsx(D0, {}),
        l.jsxs(Qt.Content, {
          ref: o,
          className: H(
            "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
            e,
          ),
          ...r,
          children: [
            n
              ? l.jsx(LE, {
                  className: "mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted",
                })
              : null,
            t,
          ],
        }),
      ],
    }),
);
O0.displayName = "DrawerContent";
const I0 = ({ className: e, ...t }) =>
  l.jsx("div", {
    className: H("grid gap-1.5 p-4 text-center sm:text-left", e),
    ...t,
  });
I0.displayName = "DrawerHeader";
const L0 = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx(Qt.Title, {
    ref: n,
    className: H("text-lg font-semibold leading-none tracking-tight", e),
    ...t,
  }),
);
L0.displayName = Qt.Title.displayName;
const $0 = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx(Qt.Description, {
    ref: n,
    className: H("text-sm text-muted-foreground", e),
    ...t,
  }),
);
$0.displayName = Qt.Description.displayName;
function $E(e, [t, n]) {
  return Math.min(n, Math.max(t, e));
}
function zE(e, t) {
  return p.useReducer((n, r) => t[n][r] ?? n, e);
}
var xd = "ScrollArea",
  [z0] = mn(xd),
  [FE, St] = z0(xd),
  F0 = p.forwardRef((e, t) => {
    const {
        __scopeScrollArea: n,
        type: r = "hover",
        dir: o,
        scrollHideDelay: s = 600,
        ...a
      } = e,
      [i, c] = p.useState(null),
      [u, d] = p.useState(null),
      [f, m] = p.useState(null),
      [y, w] = p.useState(null),
      [x, k] = p.useState(null),
      [h, g] = p.useState(0),
      [v, b] = p.useState(0),
      [S, C] = p.useState(!1),
      [N, E] = p.useState(!1),
      j = le(t, (M) => c(M)),
      R = Ku(o);
    return l.jsx(FE, {
      scope: n,
      type: r,
      dir: R,
      scrollHideDelay: s,
      scrollArea: i,
      viewport: u,
      onViewportChange: d,
      content: f,
      onContentChange: m,
      scrollbarX: y,
      onScrollbarXChange: w,
      scrollbarXEnabled: S,
      onScrollbarXEnabledChange: C,
      scrollbarY: x,
      onScrollbarYChange: k,
      scrollbarYEnabled: N,
      onScrollbarYEnabledChange: E,
      onCornerWidthChange: g,
      onCornerHeightChange: b,
      children: l.jsx(pe.div, {
        dir: R,
        ...a,
        ref: j,
        style: {
          position: "relative",
          "--radix-scroll-area-corner-width": h + "px",
          "--radix-scroll-area-corner-height": v + "px",
          ...e.style,
        },
      }),
    });
  });
F0.displayName = xd;
var B0 = "ScrollAreaViewport",
  U0 = p.forwardRef((e, t) => {
    const { __scopeScrollArea: n, children: r, nonce: o, ...s } = e,
      a = St(B0, n),
      i = p.useRef(null),
      c = le(t, i, a.onViewportChange);
    return l.jsxs(l.Fragment, {
      children: [
        l.jsx(BE, { nonce: o }),
        l.jsx(pe.div, {
          "data-radix-scroll-area-viewport": "",
          ...s,
          ref: c,
          style: {
            overflowX: a.scrollbarXEnabled ? "scroll" : "hidden",
            overflowY: a.scrollbarYEnabled ? "scroll" : "hidden",
            ...e.style,
          },
          children: l.jsx("div", {
            ref: a.onContentChange,
            style: { minWidth: "100%", display: "table" },
            children: r,
          }),
        }),
      ],
    });
  });
U0.displayName = B0;
var BE = p.memo(
    ({ nonce: e }) =>
      l.jsx("style", {
        dangerouslySetInnerHTML: {
          __html:
            "[data-radix-scroll-area-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-scroll-area-viewport]::-webkit-scrollbar{display:none}",
        },
        nonce: e,
      }),
    (e, t) => e.nonce === t.nonce,
  ),
  qt = "ScrollAreaScrollbar",
  yd = p.forwardRef((e, t) => {
    const { forceMount: n, ...r } = e,
      o = St(qt, e.__scopeScrollArea),
      { onScrollbarXEnabledChange: s, onScrollbarYEnabledChange: a } = o,
      i = e.orientation === "horizontal";
    return (
      p.useEffect(
        () => (
          i ? s(!0) : a(!0),
          () => {
            i ? s(!1) : a(!1);
          }
        ),
        [i, s, a],
      ),
      o.type === "hover"
        ? l.jsx(UE, { ...r, ref: t, forceMount: n })
        : o.type === "scroll"
          ? l.jsx(WE, { ...r, ref: t, forceMount: n })
          : o.type === "auto"
            ? l.jsx(W0, { ...r, ref: t, forceMount: n })
            : o.type === "always"
              ? l.jsx(wd, { ...r, ref: t, "data-state": "visible" })
              : null
    );
  });
yd.displayName = qt;
var UE = p.forwardRef((e, t) => {
    const { forceMount: n, ...r } = e,
      o = St(qt, e.__scopeScrollArea),
      [s, a] = p.useState(!1);
    return (
      p.useEffect(() => {
        const i = o.scrollArea;
        let c = 0;
        if (i) {
          const u = () => {
              (window.clearTimeout(c), a(!0));
            },
            d = () => {
              c = window.setTimeout(() => a(!1), o.scrollHideDelay);
            };
          return (
            i.addEventListener("pointerenter", u),
            i.addEventListener("pointerleave", d),
            () => {
              (window.clearTimeout(c),
                i.removeEventListener("pointerenter", u),
                i.removeEventListener("pointerleave", d));
            }
          );
        }
      }, [o.scrollArea, o.scrollHideDelay]),
      l.jsx(bt, {
        present: n || s,
        children: l.jsx(W0, {
          "data-state": s ? "visible" : "hidden",
          ...r,
          ref: t,
        }),
      })
    );
  }),
  WE = p.forwardRef((e, t) => {
    const { forceMount: n, ...r } = e,
      o = St(qt, e.__scopeScrollArea),
      s = e.orientation === "horizontal",
      a = Da(() => c("SCROLL_END"), 100),
      [i, c] = zE("hidden", {
        hidden: { SCROLL: "scrolling" },
        scrolling: { SCROLL_END: "idle", POINTER_ENTER: "interacting" },
        interacting: { SCROLL: "interacting", POINTER_LEAVE: "idle" },
        idle: {
          HIDE: "hidden",
          SCROLL: "scrolling",
          POINTER_ENTER: "interacting",
        },
      });
    return (
      p.useEffect(() => {
        if (i === "idle") {
          const u = window.setTimeout(() => c("HIDE"), o.scrollHideDelay);
          return () => window.clearTimeout(u);
        }
      }, [i, o.scrollHideDelay, c]),
      p.useEffect(() => {
        const u = o.viewport,
          d = s ? "scrollLeft" : "scrollTop";
        if (u) {
          let f = u[d];
          const m = () => {
            const y = u[d];
            (f !== y && (c("SCROLL"), a()), (f = y));
          };
          return (
            u.addEventListener("scroll", m),
            () => u.removeEventListener("scroll", m)
          );
        }
      }, [o.viewport, s, c, a]),
      l.jsx(bt, {
        present: n || i !== "hidden",
        children: l.jsx(wd, {
          "data-state": i === "hidden" ? "hidden" : "visible",
          ...r,
          ref: t,
          onPointerEnter: W(e.onPointerEnter, () => c("POINTER_ENTER")),
          onPointerLeave: W(e.onPointerLeave, () => c("POINTER_LEAVE")),
        }),
      })
    );
  }),
  W0 = p.forwardRef((e, t) => {
    const n = St(qt, e.__scopeScrollArea),
      { forceMount: r, ...o } = e,
      [s, a] = p.useState(!1),
      i = e.orientation === "horizontal",
      c = Da(() => {
        if (n.viewport) {
          const u = n.viewport.offsetWidth < n.viewport.scrollWidth,
            d = n.viewport.offsetHeight < n.viewport.scrollHeight;
          a(i ? u : d);
        }
      }, 10);
    return (
      Jr(n.viewport, c),
      Jr(n.content, c),
      l.jsx(bt, {
        present: r || s,
        children: l.jsx(wd, {
          "data-state": s ? "visible" : "hidden",
          ...o,
          ref: t,
        }),
      })
    );
  }),
  wd = p.forwardRef((e, t) => {
    const { orientation: n = "vertical", ...r } = e,
      o = St(qt, e.__scopeScrollArea),
      s = p.useRef(null),
      a = p.useRef(0),
      [i, c] = p.useState({
        content: 0,
        viewport: 0,
        scrollbar: { size: 0, paddingStart: 0, paddingEnd: 0 },
      }),
      u = Y0(i.viewport, i.content),
      d = {
        ...r,
        sizes: i,
        onSizesChange: c,
        hasThumb: u > 0 && u < 1,
        onThumbChange: (m) => (s.current = m),
        onThumbPointerUp: () => (a.current = 0),
        onThumbPointerDown: (m) => (a.current = m),
      };
    function f(m, y) {
      return XE(m, a.current, i, y);
    }
    return n === "horizontal"
      ? l.jsx(VE, {
          ...d,
          ref: t,
          onThumbPositionChange: () => {
            if (o.viewport && s.current) {
              const m = o.viewport.scrollLeft,
                y = Ap(m, i, o.dir);
              s.current.style.transform = `translate3d(${y}px, 0, 0)`;
            }
          },
          onWheelScroll: (m) => {
            o.viewport && (o.viewport.scrollLeft = m);
          },
          onDragScroll: (m) => {
            o.viewport && (o.viewport.scrollLeft = f(m, o.dir));
          },
        })
      : n === "vertical"
        ? l.jsx(HE, {
            ...d,
            ref: t,
            onThumbPositionChange: () => {
              if (o.viewport && s.current) {
                const m = o.viewport.scrollTop,
                  y = Ap(m, i);
                s.current.style.transform = `translate3d(0, ${y}px, 0)`;
              }
            },
            onWheelScroll: (m) => {
              o.viewport && (o.viewport.scrollTop = m);
            },
            onDragScroll: (m) => {
              o.viewport && (o.viewport.scrollTop = f(m));
            },
          })
        : null;
  }),
  VE = p.forwardRef((e, t) => {
    const { sizes: n, onSizesChange: r, ...o } = e,
      s = St(qt, e.__scopeScrollArea),
      [a, i] = p.useState(),
      c = p.useRef(null),
      u = le(t, c, s.onScrollbarXChange);
    return (
      p.useEffect(() => {
        c.current && i(getComputedStyle(c.current));
      }, [c]),
      l.jsx(H0, {
        "data-orientation": "horizontal",
        ...o,
        ref: u,
        sizes: n,
        style: {
          bottom: 0,
          left: s.dir === "rtl" ? "var(--radix-scroll-area-corner-width)" : 0,
          right: s.dir === "ltr" ? "var(--radix-scroll-area-corner-width)" : 0,
          "--radix-scroll-area-thumb-width": Ta(n) + "px",
          ...e.style,
        },
        onThumbPointerDown: (d) => e.onThumbPointerDown(d.x),
        onDragScroll: (d) => e.onDragScroll(d.x),
        onWheelScroll: (d, f) => {
          if (s.viewport) {
            const m = s.viewport.scrollLeft + d.deltaX;
            (e.onWheelScroll(m), Q0(m, f) && d.preventDefault());
          }
        },
        onResize: () => {
          c.current &&
            s.viewport &&
            a &&
            r({
              content: s.viewport.scrollWidth,
              viewport: s.viewport.offsetWidth,
              scrollbar: {
                size: c.current.clientWidth,
                paddingStart: ta(a.paddingLeft),
                paddingEnd: ta(a.paddingRight),
              },
            });
        },
      })
    );
  }),
  HE = p.forwardRef((e, t) => {
    const { sizes: n, onSizesChange: r, ...o } = e,
      s = St(qt, e.__scopeScrollArea),
      [a, i] = p.useState(),
      c = p.useRef(null),
      u = le(t, c, s.onScrollbarYChange);
    return (
      p.useEffect(() => {
        c.current && i(getComputedStyle(c.current));
      }, [c]),
      l.jsx(H0, {
        "data-orientation": "vertical",
        ...o,
        ref: u,
        sizes: n,
        style: {
          top: 0,
          right: s.dir === "ltr" ? 0 : void 0,
          left: s.dir === "rtl" ? 0 : void 0,
          bottom: "var(--radix-scroll-area-corner-height)",
          "--radix-scroll-area-thumb-height": Ta(n) + "px",
          ...e.style,
        },
        onThumbPointerDown: (d) => e.onThumbPointerDown(d.y),
        onDragScroll: (d) => e.onDragScroll(d.y),
        onWheelScroll: (d, f) => {
          if (s.viewport) {
            const m = s.viewport.scrollTop + d.deltaY;
            (e.onWheelScroll(m), Q0(m, f) && d.preventDefault());
          }
        },
        onResize: () => {
          c.current &&
            s.viewport &&
            a &&
            r({
              content: s.viewport.scrollHeight,
              viewport: s.viewport.offsetHeight,
              scrollbar: {
                size: c.current.clientHeight,
                paddingStart: ta(a.paddingTop),
                paddingEnd: ta(a.paddingBottom),
              },
            });
        },
      })
    );
  }),
  [KE, V0] = z0(qt),
  H0 = p.forwardRef((e, t) => {
    const {
        __scopeScrollArea: n,
        sizes: r,
        hasThumb: o,
        onThumbChange: s,
        onThumbPointerUp: a,
        onThumbPointerDown: i,
        onThumbPositionChange: c,
        onDragScroll: u,
        onWheelScroll: d,
        onResize: f,
        ...m
      } = e,
      y = St(qt, n),
      [w, x] = p.useState(null),
      k = le(t, (j) => x(j)),
      h = p.useRef(null),
      g = p.useRef(""),
      v = y.viewport,
      b = r.content - r.viewport,
      S = be(d),
      C = be(c),
      N = Da(f, 10);
    function E(j) {
      if (h.current) {
        const R = j.clientX - h.current.left,
          M = j.clientY - h.current.top;
        u({ x: R, y: M });
      }
    }
    return (
      p.useEffect(() => {
        const j = (R) => {
          const M = R.target;
          (w == null ? void 0 : w.contains(M)) && S(R, b);
        };
        return (
          document.addEventListener("wheel", j, { passive: !1 }),
          () => document.removeEventListener("wheel", j, { passive: !1 })
        );
      }, [v, w, b, S]),
      p.useEffect(C, [r, C]),
      Jr(w, N),
      Jr(y.content, N),
      l.jsx(KE, {
        scope: n,
        scrollbar: w,
        hasThumb: o,
        onThumbChange: be(s),
        onThumbPointerUp: be(a),
        onThumbPositionChange: C,
        onThumbPointerDown: be(i),
        children: l.jsx(pe.div, {
          ...m,
          ref: k,
          style: { position: "absolute", ...m.style },
          onPointerDown: W(e.onPointerDown, (j) => {
            j.button === 0 &&
              (j.target.setPointerCapture(j.pointerId),
              (h.current = w.getBoundingClientRect()),
              (g.current = document.body.style.webkitUserSelect),
              (document.body.style.webkitUserSelect = "none"),
              y.viewport && (y.viewport.style.scrollBehavior = "auto"),
              E(j));
          }),
          onPointerMove: W(e.onPointerMove, E),
          onPointerUp: W(e.onPointerUp, (j) => {
            const R = j.target;
            (R.hasPointerCapture(j.pointerId) &&
              R.releasePointerCapture(j.pointerId),
              (document.body.style.webkitUserSelect = g.current),
              y.viewport && (y.viewport.style.scrollBehavior = ""),
              (h.current = null));
          }),
        }),
      })
    );
  }),
  ea = "ScrollAreaThumb",
  K0 = p.forwardRef((e, t) => {
    const { forceMount: n, ...r } = e,
      o = V0(ea, e.__scopeScrollArea);
    return l.jsx(bt, {
      present: n || o.hasThumb,
      children: l.jsx(GE, { ref: t, ...r }),
    });
  }),
  GE = p.forwardRef((e, t) => {
    const { __scopeScrollArea: n, style: r, ...o } = e,
      s = St(ea, n),
      a = V0(ea, n),
      { onThumbPositionChange: i } = a,
      c = le(t, (f) => a.onThumbChange(f)),
      u = p.useRef(void 0),
      d = Da(() => {
        u.current && (u.current(), (u.current = void 0));
      }, 100);
    return (
      p.useEffect(() => {
        const f = s.viewport;
        if (f) {
          const m = () => {
            if ((d(), !u.current)) {
              const y = QE(f, i);
              ((u.current = y), i());
            }
          };
          return (
            i(),
            f.addEventListener("scroll", m),
            () => f.removeEventListener("scroll", m)
          );
        }
      }, [s.viewport, d, i]),
      l.jsx(pe.div, {
        "data-state": a.hasThumb ? "visible" : "hidden",
        ...o,
        ref: c,
        style: {
          width: "var(--radix-scroll-area-thumb-width)",
          height: "var(--radix-scroll-area-thumb-height)",
          ...r,
        },
        onPointerDownCapture: W(e.onPointerDownCapture, (f) => {
          const y = f.target.getBoundingClientRect(),
            w = f.clientX - y.left,
            x = f.clientY - y.top;
          a.onThumbPointerDown({ x: w, y: x });
        }),
        onPointerUp: W(e.onPointerUp, a.onThumbPointerUp),
      })
    );
  });
K0.displayName = ea;
var bd = "ScrollAreaCorner",
  G0 = p.forwardRef((e, t) => {
    const n = St(bd, e.__scopeScrollArea),
      r = !!(n.scrollbarX && n.scrollbarY);
    return n.type !== "scroll" && r ? l.jsx(YE, { ...e, ref: t }) : null;
  });
G0.displayName = bd;
var YE = p.forwardRef((e, t) => {
  const { __scopeScrollArea: n, ...r } = e,
    o = St(bd, n),
    [s, a] = p.useState(0),
    [i, c] = p.useState(0),
    u = !!(s && i);
  return (
    Jr(o.scrollbarX, () => {
      var f;
      const d = ((f = o.scrollbarX) == null ? void 0 : f.offsetHeight) || 0;
      (o.onCornerHeightChange(d), c(d));
    }),
    Jr(o.scrollbarY, () => {
      var f;
      const d = ((f = o.scrollbarY) == null ? void 0 : f.offsetWidth) || 0;
      (o.onCornerWidthChange(d), a(d));
    }),
    u
      ? l.jsx(pe.div, {
          ...r,
          ref: t,
          style: {
            width: s,
            height: i,
            position: "absolute",
            right: o.dir === "ltr" ? 0 : void 0,
            left: o.dir === "rtl" ? 0 : void 0,
            bottom: 0,
            ...e.style,
          },
        })
      : null
  );
});
function ta(e) {
  return e ? parseInt(e, 10) : 0;
}
function Y0(e, t) {
  const n = e / t;
  return isNaN(n) ? 0 : n;
}
function Ta(e) {
  const t = Y0(e.viewport, e.content),
    n = e.scrollbar.paddingStart + e.scrollbar.paddingEnd,
    r = (e.scrollbar.size - n) * t;
  return Math.max(r, 18);
}
function XE(e, t, n, r = "ltr") {
  const o = Ta(n),
    s = o / 2,
    a = t || s,
    i = o - a,
    c = n.scrollbar.paddingStart + a,
    u = n.scrollbar.size - n.scrollbar.paddingEnd - i,
    d = n.content - n.viewport,
    f = r === "ltr" ? [0, d] : [d * -1, 0];
  return X0([c, u], f)(e);
}
function Ap(e, t, n = "ltr") {
  const r = Ta(t),
    o = t.scrollbar.paddingStart + t.scrollbar.paddingEnd,
    s = t.scrollbar.size - o,
    a = t.content - t.viewport,
    i = s - r,
    c = n === "ltr" ? [0, a] : [a * -1, 0],
    u = $E(e, c);
  return X0([0, a], [0, i])(u);
}
function X0(e, t) {
  return (n) => {
    if (e[0] === e[1] || t[0] === t[1]) return t[0];
    const r = (t[1] - t[0]) / (e[1] - e[0]);
    return t[0] + r * (n - e[0]);
  };
}
function Q0(e, t) {
  return e > 0 && e < t;
}
var QE = (e, t = () => {}) => {
  let n = { left: e.scrollLeft, top: e.scrollTop },
    r = 0;
  return (
    (function o() {
      const s = { left: e.scrollLeft, top: e.scrollTop },
        a = n.left !== s.left,
        i = n.top !== s.top;
      ((a || i) && t(), (n = s), (r = window.requestAnimationFrame(o)));
    })(),
    () => window.cancelAnimationFrame(r)
  );
};
function Da(e, t) {
  const n = be(e),
    r = p.useRef(0);
  return (
    p.useEffect(() => () => window.clearTimeout(r.current), []),
    p.useCallback(() => {
      (window.clearTimeout(r.current), (r.current = window.setTimeout(n, t)));
    }, [n, t])
  );
}
function Jr(e, t) {
  const n = be(t);
  et(() => {
    let r = 0;
    if (e) {
      const o = new ResizeObserver(() => {
        (cancelAnimationFrame(r), (r = window.requestAnimationFrame(n)));
      });
      return (
        o.observe(e),
        () => {
          (window.cancelAnimationFrame(r), o.unobserve(e));
        }
      );
    }
  }, [e, n]);
}
var q0 = F0,
  qE = U0,
  JE = G0;
const na = p.forwardRef(({ className: e, children: t, ...n }, r) =>
  l.jsxs(q0, {
    ref: r,
    className: H("relative overflow-hidden", e),
    ...n,
    children: [
      l.jsx(qE, { className: "h-full w-full rounded-[inherit]", children: t }),
      l.jsx(J0, {}),
      l.jsx(JE, {}),
    ],
  }),
);
na.displayName = q0.displayName;
const J0 = p.forwardRef(
  ({ className: e, orientation: t = "vertical", ...n }, r) =>
    l.jsx(yd, {
      ref: r,
      orientation: t,
      className: H(
        "flex touch-none select-none transition-colors",
        t === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent p-[1px]",
        t === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent p-[1px]",
        e,
      ),
      ...n,
      children: l.jsx(K0, {
        className: "relative flex-1 rounded-full bg-border",
      }),
    }),
);
J0.displayName = yd.displayName;
function ZE(e) {
  return e === "healthy"
    ? "Healthy"
    : e === "warning"
      ? "Warning"
      : e === "unreachable"
        ? "Down"
        : "Unknown";
}
function Oa(e) {
  return ["healthy", "fresh", "succeeded", "success", "ready"].includes(e || "")
    ? "ready"
    : ["unreachable", "failed", "failure", "blocked", "destructive"].includes(
          e || "",
        )
      ? "destructive"
      : !e || e === "unknown"
        ? "outline"
        : "pending";
}
function Sd(e) {
  return e ? new Date(e).toLocaleString() : "Not reported";
}
function _t(e) {
  if (!e) return "No timestamp";
  const t = Math.max(0, Math.round((Date.now() - new Date(e).getTime()) / 6e4));
  return t < 1
    ? "just now"
    : t < 60
      ? `${t}m ago`
      : `${Math.round(t / 60)}h ago`;
}
function Zr({ children: e }) {
  return l.jsx("div", {
    className:
      "rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground",
    children: e,
  });
}
function Z0({ events: e, compact: t = !1 }) {
  const [n, r] = p.useState(""),
    [o, s] = p.useState("all"),
    [a, i] = p.useState("all"),
    [c, u] = p.useState("all"),
    [d, f] = p.useState("all"),
    [m, y] = p.useState("all"),
    [w, x] = p.useState(null),
    k = Array.from(new Set(e.map((S) => S.actor || "system"))),
    h = Array.from(
      new Set(e.map((S) => S.serverLabel || S.resourceId).filter(Boolean)),
    ),
    g = e.filter((S) => {
      const C = S.severity || (S.result === "success" ? "info" : "warning"),
        N = S.serverLabel || S.resourceId || S.resourceType || "dashboard",
        E = [
          S.actionLabel,
          S.eventCode,
          S.action,
          S.actor,
          N,
          S.result,
          S.sourceIp,
          S.requestId,
          S.reason,
          S.jobId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
        j =
          m === "all" ||
          (m === "critical" && C === "critical") ||
          (m === "failures" && S.result === "failure") ||
          (m === "security" &&
            (S.action.includes("ssh") ||
              S.resourceType === "vps" ||
              S.authMethod)) ||
          (m === "terminal" && S.resourceType === "terminal");
      return (
        E.includes(n.trim().toLowerCase()) &&
        (o === "all" || C === o) &&
        (a === "all" || S.result === a) &&
        (c === "all" || (S.actor || "system") === c) &&
        (d === "all" || N === d) &&
        j
      );
    }),
    v = {
      total: e.length,
      critical: e.filter((S) => S.severity === "critical").length,
      blocked: e.filter((S) => S.result === "blocked").length,
      failures: e.filter(
        (S) => S.result === "failure" || S.action.includes("job.failed"),
      ).length,
      terminal: e.filter((S) => S.resourceType === "terminal").length,
    },
    b = t ? e.slice(0, 5) : g;
  return l.jsxs(at, {
    className:
      "min-w-0 max-w-full overflow-hidden border-slate-200 bg-white shadow-sm",
    children: [
      l.jsx(vt, {
        className: "min-w-0 p-4 pb-3 sm:p-5 sm:pb-4",
        children: l.jsxs("div", {
          className: "flex flex-wrap items-start justify-between gap-3",
          children: [
            l.jsxs("div", {
              children: [
                l.jsx(xt, {
                  className: "truncate text-xl font-black",
                  children: t ? "Recent audit" : "Audit",
                }),
                l.jsx(Tt, {
                  children: t
                    ? "Latest security and operations events."
                    : "Review security, SSH access, jobs, and terminal activity.",
                }),
              ],
            }),
            t
              ? null
              : l.jsxs(Pe, {
                  variant: v.critical ? "destructive" : "secondary",
                  children: [v.critical, " critical"],
                }),
          ],
        }),
      }),
      l.jsxs(it, {
        className:
          "min-w-0 max-w-full space-y-4 overflow-hidden p-4 pt-0 sm:p-5 sm:pt-0",
        children: [
          t
            ? null
            : l.jsxs(l.Fragment, {
                children: [
                  l.jsxs("section", {
                    className:
                      "grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 xl:grid-cols-[minmax(0,1fr)_155px_145px_145px_165px_130px]",
                    children: [
                      l.jsx(Pt, {
                        "aria-label": "Search audit events",
                        placeholder: "Search events...",
                        value: n,
                        onChange: (S) => r(S.target.value),
                      }),
                      l.jsxs("select", {
                        "aria-label": "Filter severity",
                        className:
                          "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700",
                        value: o,
                        onChange: (S) => s(S.target.value),
                        children: [
                          l.jsx("option", {
                            value: "all",
                            children: "All severities",
                          }),
                          l.jsx("option", {
                            value: "critical",
                            children: "Critical",
                          }),
                          l.jsx("option", {
                            value: "warning",
                            children: "Warning",
                          }),
                          l.jsx("option", { value: "info", children: "Info" }),
                        ],
                      }),
                      l.jsxs("select", {
                        "aria-label": "Filter status",
                        className:
                          "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700",
                        value: a,
                        onChange: (S) => i(S.target.value),
                        children: [
                          l.jsx("option", {
                            value: "all",
                            children: "All statuses",
                          }),
                          l.jsx("option", {
                            value: "success",
                            children: "Success",
                          }),
                          l.jsx("option", {
                            value: "failure",
                            children: "Failure",
                          }),
                          l.jsx("option", {
                            value: "blocked",
                            children: "Blocked",
                          }),
                        ],
                      }),
                      l.jsxs("select", {
                        "aria-label": "Filter actor",
                        className:
                          "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700",
                        value: c,
                        onChange: (S) => u(S.target.value),
                        children: [
                          l.jsx("option", {
                            value: "all",
                            children: "All actors",
                          }),
                          k.map((S) =>
                            l.jsx("option", { value: S, children: S }, S),
                          ),
                        ],
                      }),
                      l.jsxs("select", {
                        "aria-label": "Filter server",
                        className:
                          "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700",
                        value: d,
                        onChange: (S) => f(S.target.value),
                        children: [
                          l.jsx("option", {
                            value: "all",
                            children: "All servers",
                          }),
                          h.map((S) =>
                            l.jsx("option", { value: S, children: S }, S),
                          ),
                        ],
                      }),
                      l.jsxs("select", {
                        "aria-label": "Filter time range",
                        className:
                          "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700",
                        defaultValue: "24h",
                        children: [
                          l.jsx("option", {
                            value: "24h",
                            children: "Last 24h",
                          }),
                          l.jsx("option", { value: "7d", children: "Last 7d" }),
                        ],
                      }),
                    ],
                  }),
                  l.jsx("section", {
                    className: "flex flex-wrap gap-2",
                    children: [
                      ["all", "All events"],
                      ["critical", "Critical only"],
                      ["failures", "Failures"],
                      ["security", "SSH/security"],
                      ["terminal", "Terminal sessions"],
                    ].map(([S, C]) =>
                      l.jsx(
                        ee,
                        {
                          type: "button",
                          variant: m === S ? "default" : "outline",
                          size: "sm",
                          className: `rounded-xl text-xs font-black ${m === S ? "bg-slate-950 text-white shadow-sm hover:bg-slate-800" : "bg-white"}`,
                          onClick: () => y(S),
                          children: C,
                        },
                        S,
                      ),
                    ),
                  }),
                  l.jsxs("section", {
                    className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-5",
                    children: [
                      l.jsx(Eo, { label: "Total events", value: v.total }),
                      l.jsx(Eo, {
                        label: "Critical",
                        value: v.critical,
                        tone: "red",
                      }),
                      l.jsx(Eo, {
                        label: "Failures",
                        value: v.failures,
                        tone: "amber",
                      }),
                      l.jsx(Eo, {
                        label: "Blocked",
                        value: v.blocked,
                        tone: "red",
                      }),
                      l.jsx(Eo, {
                        label: "Terminal sessions",
                        value: v.terminal,
                      }),
                    ],
                  }),
                ],
              }),
          b.length
            ? l.jsxs("div", {
                className:
                  "min-w-0 overflow-hidden rounded-xl border border-slate-200",
                children: [
                  l.jsxs("div", {
                    className:
                      "hidden grid-cols-[1fr_1.55fr_0.8fr_1fr_0.8fr_0.8fr_1fr_0.8fr] gap-3 bg-slate-100 px-3 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-slate-500 lg:grid",
                    children: [
                      l.jsx("span", { children: "Time" }),
                      l.jsx("span", { children: "Event" }),
                      l.jsx("span", { children: "Actor" }),
                      l.jsx("span", { children: "Server" }),
                      l.jsx("span", { children: "Severity" }),
                      l.jsx("span", { children: "Status" }),
                      l.jsx("span", { children: "Source/IP" }),
                      l.jsx("span", { children: "Action" }),
                    ],
                  }),
                  l.jsx("div", {
                    className: "divide-y divide-slate-200",
                    children: b.map((S, C) => {
                      const N =
                          S.serverLabel ||
                          [S.resourceType, S.resourceId]
                            .filter(Boolean)
                            .join("/") ||
                          "dashboard",
                        E =
                          S.severity ||
                          (S.result === "success" ? "info" : "warning"),
                        j = E === "critical",
                        R =
                          S.reason ||
                          S.jobId ||
                          S.requestId ||
                          S.authMethod ||
                          S.client;
                      return l.jsxs(
                        "article",
                        {
                          className: `grid min-w-0 gap-2 border-l-4 px-3 py-4 text-sm font-semibold leading-6 text-slate-600 transition hover:bg-cyan-50/60 lg:grid-cols-[1fr_1.55fr_0.8fr_1fr_0.8fr_0.8fr_1fr_0.8fr] lg:items-center ${j ? "border-l-red-500 bg-red-50/70" : C % 2 ? "border-l-transparent bg-slate-50/60" : "border-l-transparent bg-white"}`,
                          children: [
                            l.jsx("span", {
                              className: "font-bold text-slate-600",
                              children: Sd(S.timestamp),
                            }),
                            l.jsxs("span", {
                              className:
                                "flex min-w-0 items-start gap-2 text-slate-950",
                              children: [
                                l.jsx("span", {
                                  className: `mt-1 shrink-0 ${j ? "text-red-600" : "text-slate-500"}`,
                                  children: j
                                    ? l.jsx(cg, { size: 16 })
                                    : l.jsx(Fn, { size: 16 }),
                                }),
                                l.jsxs("span", {
                                  className: "min-w-0",
                                  children: [
                                    l.jsx("span", {
                                      className: "block truncate font-black",
                                      children: S.actionLabel || S.action,
                                    }),
                                    l.jsx("span", {
                                      className:
                                        "block truncate font-mono text-[11px] font-bold text-slate-400",
                                      children: S.actionLabel
                                        ? S.eventCode || S.action
                                        : "",
                                    }),
                                    R
                                      ? l.jsx("span", {
                                          className:
                                            "block truncate text-xs font-semibold text-slate-400",
                                          children: S.reason
                                            ? `Reason: ${S.reason}`
                                            : String(R),
                                        })
                                      : null,
                                  ],
                                }),
                              ],
                            }),
                            l.jsx("span", {
                              className: "truncate",
                              children: S.actor || "system",
                            }),
                            l.jsx("span", {
                              className:
                                "w-fit max-w-full truncate rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-black text-slate-600",
                              children: N,
                            }),
                            l.jsx(Pe, {
                              className: "w-fit uppercase",
                              variant:
                                E === "warning"
                                  ? "warning"
                                  : E === "critical"
                                    ? "destructive"
                                    : "secondary",
                              children: E,
                            }),
                            l.jsx(Pe, {
                              className: "w-fit uppercase",
                              variant:
                                S.result === "success"
                                  ? "ready"
                                  : "destructive",
                              children: S.result,
                            }),
                            l.jsxs("span", {
                              className: "min-w-0",
                              children: [
                                l.jsx("span", {
                                  className:
                                    "block truncate text-xs font-black text-slate-700",
                                  children: S.sourceIp || S.client || "n/a",
                                }),
                                S.requestId
                                  ? l.jsx("span", {
                                      className:
                                        "block truncate font-mono text-[10px] text-slate-400",
                                      children: S.requestId,
                                    })
                                  : null,
                              ],
                            }),
                            l.jsx(ee, {
                              size: "sm",
                              variant: "outline",
                              className: `h-8 w-fit rounded-lg border-slate-300 bg-white px-2 text-xs font-black shadow-sm ${j ? "border-red-300 text-red-700 hover:bg-red-50" : "text-slate-700"}`,
                              onClick: () => x(S),
                              children: "Details",
                            }),
                          ],
                        },
                        S.id,
                      );
                    }),
                  }),
                ],
              })
            : l.jsx(Zr, { children: "No audit events match these filters." }),
          w ? l.jsx(ej, { event: w, onClose: () => x(null) }) : null,
        ],
      }),
    ],
  });
}
function Eo({ label: e, value: t, tone: n = "default" }) {
  const r =
    n === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : n === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-white text-slate-900";
  return l.jsxs("div", {
    className: `rounded-xl border p-4 shadow-sm ${r}`,
    children: [
      l.jsx("p", {
        className: "text-xs font-black uppercase tracking-[0.12em] opacity-70",
        children: e,
      }),
      l.jsx("strong", {
        className: "mt-1 block text-3xl font-black leading-none",
        children: t,
      }),
    ],
  });
}
function ej({ event: e, onClose: t }) {
  const n = e.severity || (e.result === "success" ? "info" : "warning"),
    r =
      e.serverLabel ||
      [e.resourceType, e.resourceId].filter(Boolean).join("/") ||
      "dashboard",
    o = JSON.stringify(e, null, 2),
    s = (a) => {
      var i;
      return (i = navigator.clipboard) == null
        ? void 0
        : i.writeText(a).catch(() => {});
    };
  return l.jsx(T0, {
    open: !0,
    handleOnly: !0,
    onOpenChange: (a) => {
      a || t();
    },
    direction: "right",
    children: l.jsxs(O0, {
      showHandle: !1,
      className:
        "inset-y-0 bottom-auto left-auto right-0 mt-0 h-full w-full max-w-2xl select-text rounded-none border-l border-slate-200 bg-white shadow-2xl after:hidden",
      children: [
        l.jsx(I0, {
          className: "border-b border-slate-200 p-5 text-left",
          children: l.jsxs("div", {
            className: "flex items-start justify-between gap-4",
            children: [
              l.jsxs("div", {
                className: "min-w-0",
                children: [
                  l.jsx("p", {
                    className:
                      "text-xs font-black uppercase tracking-[0.18em] text-slate-500",
                    children: "Audit event details",
                  }),
                  l.jsx(L0, {
                    className:
                      "mt-2 break-words text-2xl font-black text-slate-950",
                    children: e.actionLabel || e.action,
                  }),
                  l.jsx($0, {
                    className: "font-mono text-sm font-bold text-slate-500",
                    children: e.eventCode || e.action,
                  }),
                ],
              }),
              l.jsx(ee, {
                type: "button",
                variant: "outline",
                size: "icon",
                className:
                  "h-9 w-9 shrink-0 border-slate-300 bg-white text-slate-800 shadow-sm",
                "aria-label": "Close audit details",
                onClick: t,
                children: l.jsx(ug, { size: 16 }),
              }),
            ],
          }),
        }),
        l.jsx(na, {
          className: "min-h-0 flex-1",
          children: l.jsxs("div", {
            className: "p-5",
            children: [
              l.jsxs("div", {
                className:
                  "mb-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3",
                children: [
                  l.jsxs(ee, {
                    type: "button",
                    variant: "outline",
                    size: "sm",
                    className: "rounded-lg bg-white text-xs font-black",
                    onClick: () => s(o),
                    children: [l.jsx(Cc, { size: 14 }), "Copy payload"],
                  }),
                  e.requestId
                    ? l.jsxs(ee, {
                        type: "button",
                        variant: "outline",
                        size: "sm",
                        className: "rounded-lg bg-white text-xs font-black",
                        onClick: () => s(e.requestId || ""),
                        children: [l.jsx(Cc, { size: 14 }), "Copy request ID"],
                      })
                    : null,
                  e.serverLabel || e.resourceId
                    ? l.jsx(ee, {
                        type: "button",
                        variant: "outline",
                        size: "sm",
                        className: "rounded-lg bg-white text-xs font-black",
                        disabled: !0,
                        title: "Coming soon",
                        children: "Open server",
                      })
                    : null,
                  e.jobId
                    ? l.jsx(ee, {
                        type: "button",
                        variant: "outline",
                        size: "sm",
                        className: "rounded-lg bg-white text-xs font-black",
                        disabled: !0,
                        title: "Coming soon",
                        children: "View related job",
                      })
                    : null,
                ],
              }),
              l.jsxs("div", {
                className: "grid gap-3 sm:grid-cols-2",
                children: [
                  l.jsx(Bt, { label: "Actor", value: e.actor || "system" }),
                  l.jsx(Bt, { label: "Server", value: r }),
                  l.jsx(Bt, { label: "Severity", value: n }),
                  l.jsx(Bt, { label: "Status", value: e.result }),
                  l.jsx(Bt, { label: "Time", value: Sd(e.timestamp) }),
                  l.jsx(Bt, {
                    label: "Source/IP",
                    value: e.sourceIp || e.client || "n/a",
                  }),
                  l.jsx(Bt, {
                    label: "Request ID",
                    value: e.requestId || "n/a",
                  }),
                  l.jsx(Bt, { label: "Related job", value: e.jobId || "n/a" }),
                  l.jsx(Bt, {
                    label: "Auth method",
                    value: e.authMethod || "n/a",
                  }),
                  l.jsx(Bt, {
                    label: "Duration",
                    value: e.durationMs
                      ? `${Math.round(e.durationMs / 1e3)}s`
                      : "n/a",
                  }),
                ],
              }),
              e.reason
                ? l.jsxs("div", {
                    className:
                      "mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700",
                    children: [
                      l.jsx("span", {
                        className:
                          "block text-xs font-black uppercase tracking-[0.12em] text-red-500",
                        children: "Reason",
                      }),
                      e.reason,
                    ],
                  })
                : null,
              l.jsxs("div", {
                className:
                  "mt-4 rounded-xl border border-slate-200 bg-slate-950 p-4",
                children: [
                  l.jsx("p", {
                    className:
                      "text-xs font-black uppercase tracking-[0.12em] text-slate-400",
                    children: "Raw payload",
                  }),
                  l.jsx(na, {
                    className: "mt-3 h-96 rounded-lg",
                    children: l.jsx("pre", {
                      className:
                        "whitespace-pre-wrap break-words pr-4 text-xs font-semibold leading-5 text-slate-100",
                      children: o,
                    }),
                  }),
                ],
              }),
              l.jsx("div", {
                className: "mt-4 flex justify-end",
                children: l.jsx(ee, {
                  type: "button",
                  variant: "outline",
                  size: "sm",
                  onClick: t,
                  children: "Close",
                }),
              }),
            ],
          }),
        }),
      ],
    }),
  });
}
function Bt({ label: e, value: t }) {
  return l.jsxs("div", {
    className: "rounded-xl border border-slate-200 bg-slate-50 p-3",
    children: [
      l.jsx("p", {
        className:
          "text-xs font-black uppercase tracking-[0.12em] text-slate-500",
        children: e,
      }),
      l.jsx("p", {
        className: "mt-1 break-words text-sm font-black text-slate-900",
        children: t,
      }),
    ],
  });
}
function nn({ label: e, value: t, tone: n = "default" }) {
  return l.jsxs("div", {
    className: `min-w-0 rounded-xl border px-3.5 py-3 shadow-sm ${n === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-700"}`,
    children: [
      l.jsx("p", {
        className:
          "text-[11px] font-black uppercase tracking-[0.12em] opacity-75",
        children: e,
      }),
      l.jsx("p", {
        className:
          "mt-1 whitespace-normal break-words text-[15px] font-black leading-5",
        title: t,
        children: t,
      }),
    ],
  });
}
function ex({ jobs: e, compact: t = !1 }) {
  const [n, r] = p.useState(""),
    [o, s] = p.useState("all"),
    [a, i] = p.useState("all"),
    [c, u] = p.useState("compact"),
    d = e.filter((v) => v.status === "running").length,
    f = e.filter((v) => v.status === "failed").length,
    m = e.filter((v) => v.status === "queued").length,
    y = new Set(e.map((v) => v.workerId).filter(Boolean)).size,
    w = e.filter(
      (v) => v.status === "succeeded" || v.status === "failed",
    ).length,
    x = e.filter((v) => v.status === "succeeded").length,
    k = w ? Math.round((x / w) * 100) : 0,
    h = Array.from(new Set(e.map((v) => v.type))).sort(),
    g = e.filter(
      (v) =>
        [
          v.type,
          v.id,
          v.vpsId,
          v.workerId,
          v.status,
          v.errorMessage,
          v.outputPreview,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(n.trim().toLowerCase()) &&
        (o === "all" || v.status === o) &&
        (a === "all" || v.type === a),
    );
  return t
    ? l.jsxs(at, {
        className: "min-w-0 max-w-full overflow-hidden border-slate-200",
        children: [
          l.jsx(vt, {
            className: "min-w-0 p-4 pb-3 sm:p-5 sm:pb-4",
            children: l.jsxs("div", {
              className: "flex items-center justify-between gap-3",
              children: [
                l.jsx(xt, {
                  className: "truncate text-xl font-black",
                  children: "Recent jobs",
                }),
                l.jsxs(Pe, {
                  variant: f ? "destructive" : d ? "pending" : "outline",
                  children: [d, " running"],
                }),
              ],
            }),
          }),
          l.jsx(it, {
            className:
              "grid min-w-0 max-w-full gap-3 overflow-hidden p-4 pt-0 sm:p-5 sm:pt-0",
            children: e.length
              ? e.slice(0, 5).map((v) => l.jsx(tj, { job: v }, v.id))
              : l.jsx(Zr, { children: "No jobs yet." }),
          }),
        ],
      })
    : l.jsxs(at, {
        className:
          "min-w-0 max-w-full overflow-hidden border-slate-200 bg-white shadow-sm",
        children: [
          l.jsx(vt, {
            className: "min-w-0 p-4 pb-3 sm:p-5 sm:pb-4",
            children: l.jsxs("div", {
              className: "flex flex-wrap items-start justify-between gap-3",
              children: [
                l.jsxs("div", {
                  className: "min-w-0",
                  children: [
                    l.jsx(xt, {
                      className: "truncate text-xl font-black",
                      children: "Jobs",
                    }),
                    l.jsx(Tt, {
                      children:
                        "Background work across provisioning, metrics, and key checks.",
                    }),
                  ],
                }),
                l.jsxs("div", {
                  className: "flex shrink-0 items-center gap-2",
                  children: [
                    l.jsxs("div", {
                      className:
                        "flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1 shadow-inner",
                      children: [
                        l.jsx(ee, {
                          type: "button",
                          variant: c === "compact" ? "secondary" : "ghost",
                          size: "sm",
                          className: "h-9 rounded-xl px-3 text-xs font-black",
                          onClick: () => u("compact"),
                          children: "Compact view",
                        }),
                        l.jsx(ee, {
                          type: "button",
                          variant: c === "detailed" ? "secondary" : "ghost",
                          size: "sm",
                          className: "h-9 rounded-xl px-3 text-xs font-black",
                          onClick: () => u("detailed"),
                          children: "Detailed view",
                        }),
                      ],
                    }),
                    l.jsx(ee, {
                      type: "button",
                      variant: "outline",
                      size: "sm",
                      className:
                        "ml-1 rounded-xl border-slate-300 bg-white text-sm font-black shadow-sm",
                      children: "Logs",
                    }),
                  ],
                }),
              ],
            }),
          }),
          l.jsxs(it, {
            className:
              "grid min-w-0 max-w-full gap-4 overflow-hidden p-4 pt-0 sm:p-5 sm:pt-0",
            children: [
              l.jsxs("section", {
                className:
                  "grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_170px_190px]",
                "aria-label": "Jobs filters",
                children: [
                  l.jsx(Pt, {
                    "aria-label": "Search jobs",
                    placeholder: "Search jobs...",
                    value: n,
                    onChange: (v) => r(v.target.value),
                  }),
                  l.jsxs("select", {
                    "aria-label": "Filter job status",
                    className:
                      "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-ring",
                    value: o,
                    onChange: (v) => s(v.target.value),
                    children: [
                      l.jsx("option", {
                        value: "all",
                        children: "All statuses",
                      }),
                      l.jsx("option", { value: "queued", children: "Queued" }),
                      l.jsx("option", {
                        value: "running",
                        children: "Running",
                      }),
                      l.jsx("option", {
                        value: "succeeded",
                        children: "Succeeded",
                      }),
                      l.jsx("option", { value: "failed", children: "Failed" }),
                    ],
                  }),
                  l.jsxs("select", {
                    "aria-label": "Filter job type",
                    className:
                      "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-ring",
                    value: a,
                    onChange: (v) => i(v.target.value),
                    children: [
                      l.jsx("option", { value: "all", children: "All types" }),
                      h.map((v) =>
                        l.jsx("option", { value: v, children: v }, v),
                      ),
                    ],
                  }),
                ],
              }),
              g.length
                ? l.jsx("div", {
                    className: "grid gap-2",
                    children: g.map((v) =>
                      c === "compact"
                        ? l.jsx(nj, { job: v }, v.id)
                        : l.jsx(rj, { job: v }, v.id),
                    ),
                  })
                : l.jsx(Zr, { children: "No jobs match these filters." }),
              l.jsxs("section", {
                className:
                  "grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 xl:grid-cols-5",
                "aria-label": "Jobs summary",
                children: [
                  l.jsx(nn, { label: "Workers", value: `${y || 0}` }),
                  l.jsx(nn, { label: "Running", value: `${d}` }),
                  l.jsx(nn, { label: "Queued", value: `${m}` }),
                  l.jsx(nn, {
                    label: "Failed",
                    value: `${f}`,
                    tone: f ? "red" : "default",
                  }),
                  l.jsx(nn, {
                    label: "Success rate",
                    value: w ? `${k}%` : "n/a",
                  }),
                ],
              }),
            ],
          }),
        ],
      });
}
function tj({ job: e }) {
  const t = Math.min(100, Math.max(0, e.progress));
  return l.jsxs("article", {
    className:
      "grid min-w-0 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm",
    children: [
      l.jsxs("div", {
        className: "flex min-w-0 items-start justify-between gap-3",
        children: [
          l.jsxs("div", {
            className: "min-w-0",
            children: [
              l.jsx("strong", {
                className:
                  "block truncate text-[17px] font-black leading-6 text-slate-950",
                title: e.type,
                children: e.type,
              }),
              l.jsxs("p", {
                className:
                  "mt-1 truncate text-[15px] font-semibold leading-6 text-slate-500",
                title: `${e.vpsId} · ${t}% progress`,
                children: [
                  e.vpsId,
                  " · ",
                  e.workerId || "Worker n/a",
                  " · ",
                  t,
                  "% progress",
                ],
              }),
            ],
          }),
          l.jsx(Pe, {
            className: "shrink-0 uppercase",
            variant: Oa(e.status),
            children: e.status,
          }),
        ],
      }),
      l.jsx("div", {
        className: "h-2 overflow-hidden rounded-full bg-slate-100",
        children: l.jsx("div", {
          className: "h-full rounded-full bg-cyan-600",
          style: { width: `${t}%` },
        }),
      }),
    ],
  });
}
function nj({ job: e }) {
  const t = Math.min(100, Math.max(0, e.progress)),
    n = e.status === "failed",
    r = e.status === "running",
    o = e.status === "queued",
    s =
      e.durationMs != null
        ? `${(e.durationMs / 1e3).toFixed(0)}s`
        : "duration n/a",
    a = [
      e.vpsId,
      e.workerId || "worker n/a",
      s,
      `${e.retryCount ?? 0} retries`,
      e.startedAt ? `started ${_t(e.startedAt)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  return l.jsxs("article", {
    className: `grid min-w-0 gap-2 rounded-xl border px-3 py-2.5 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${n ? "border-red-200 bg-red-50/70" : r ? "border-cyan-200 bg-cyan-50/40 ring-1 ring-cyan-100" : "border-slate-200 bg-white"}`,
    children: [
      l.jsxs("div", {
        className: "min-w-0",
        children: [
          l.jsxs("div", {
            className: "flex flex-wrap items-center gap-2",
            children: [
              l.jsx("strong", {
                className: "truncate text-[15px] font-black text-slate-950",
                title: e.type,
                children: e.type,
              }),
              l.jsx(tx, { status: e.status }),
              l.jsx("span", {
                className:
                  "truncate font-mono text-[11px] font-bold text-slate-400",
                children: e.id,
              }),
            ],
          }),
          l.jsx("p", {
            className: "mt-1 truncate text-xs font-bold text-slate-500",
            title: a,
            children: a,
          }),
          o
            ? l.jsxs("p", {
                className: "mt-1 text-xs font-bold text-slate-500",
                children: [
                  "Queued / ",
                  e.outputPreview || "Waiting for an available worker.",
                ],
              })
            : null,
          n && e.errorMessage
            ? l.jsx("p", {
                className: "mt-1 line-clamp-2 text-xs font-bold text-red-700",
                children: e.errorMessage,
              })
            : null,
          o
            ? null
            : l.jsx("div", {
                className:
                  "mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100",
                children: l.jsx("div", {
                  className: `h-full rounded-full ${n ? "bg-red-500" : r ? "bg-cyan-500" : "bg-slate-400"}`,
                  style: { width: `${t}%` },
                }),
              }),
        ],
      }),
      l.jsxs("div", {
        className: "flex flex-wrap items-center gap-2 md:justify-end",
        children: [
          o
            ? null
            : l.jsxs("span", {
                className:
                  "min-w-12 text-right text-xs font-black text-slate-500",
                children: [t, "%"],
              }),
          e.errorLogUrl
            ? l.jsx(ee, {
                type: "button",
                asChild: !0,
                variant: n ? "destructive" : r ? "secondary" : "outline",
                size: "sm",
                className: `h-8 rounded-lg text-xs font-black ${r ? "border border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100" : ""}`,
                children: l.jsx("a", {
                  href: e.errorLogUrl,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  children: "View log",
                }),
              })
            : null,
          r
            ? l.jsx(ee, {
                type: "button",
                variant: "outline",
                size: "sm",
                className: "h-8 rounded-lg text-xs font-black",
                disabled: !0,
                children: "Cancel",
              })
            : null,
          n
            ? l.jsx(ee, {
                type: "button",
                variant: "outline",
                size: "sm",
                className:
                  "h-8 rounded-lg border-red-200 text-xs font-black text-red-700",
                disabled: !0,
                children: "Retry",
              })
            : null,
          l.jsx(nx, { job: e }),
        ],
      }),
    ],
  });
}
function rj({ job: e }) {
  const t = Math.min(100, Math.max(0, e.progress)),
    n =
      e.durationMs != null
        ? `${(e.durationMs / 1e3).toFixed(0)}s`
        : "Duration n/a",
    r = `${e.retryCount ?? 0} retries`,
    o = [
      e.startedAt ? `Started ${_t(e.startedAt)}` : null,
      e.finishedAt ? `Finished ${_t(e.finishedAt)}` : null,
    ].filter(Boolean),
    s = e.status === "failed",
    a = e.status === "running",
    i = e.status === "queued",
    c = [e.vpsId, e.workerId || "Worker n/a", n, r, ...o].join(" · ");
  return l.jsxs("article", {
    className: `grid min-w-0 gap-3 rounded-xl border p-4 shadow-sm ${s ? "border-red-200 bg-red-50/60 ring-1 ring-red-100" : "border-slate-200 bg-white"}`,
    children: [
      l.jsxs("div", {
        className: "grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]",
        children: [
          l.jsxs("div", {
            className: "min-w-0",
            children: [
              l.jsxs("div", {
                className: "flex flex-wrap items-center gap-2",
                children: [
                  l.jsx("strong", {
                    className:
                      "truncate text-lg font-black leading-6 text-slate-950",
                    title: e.type,
                    children: e.type,
                  }),
                  l.jsx(tx, { status: e.status }),
                ],
              }),
              l.jsx("p", {
                className:
                  "mt-1 break-all font-mono text-xs font-bold text-slate-500",
                children: e.id,
              }),
              l.jsx("p", {
                className: "mt-2 text-sm font-bold leading-5 text-slate-600",
                children: c,
              }),
            ],
          }),
          l.jsxs("div", {
            className: "flex flex-wrap items-center gap-2 xl:justify-end",
            children: [
              e.errorLogUrl
                ? l.jsx(ee, {
                    type: "button",
                    asChild: !0,
                    variant: s ? "destructive" : a ? "secondary" : "outline",
                    size: "sm",
                    className: `rounded-xl ${a ? "border border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100" : ""}`,
                    children: l.jsx("a", {
                      href: e.errorLogUrl,
                      target: "_blank",
                      rel: "noopener noreferrer",
                      children: "View log",
                    }),
                  })
                : l.jsx(ee, {
                    type: "button",
                    variant: "outline",
                    size: "sm",
                    className: "rounded-xl",
                    disabled: !0,
                    children: "View log",
                  }),
              a
                ? l.jsx(ee, {
                    type: "button",
                    variant: "outline",
                    size: "sm",
                    className: "rounded-xl",
                    disabled: !0,
                    title: "Cancel is not wired to an API yet",
                    children: "Cancel",
                  })
                : null,
              s
                ? l.jsx(ee, {
                    type: "button",
                    variant: "outline",
                    size: "sm",
                    className:
                      "rounded-xl border-red-200 text-red-700 hover:bg-red-50",
                    disabled: !0,
                    title: "Retry is not wired to an API yet",
                    children: "Retry",
                  })
                : null,
              l.jsx(nx, { job: e }),
            ],
          }),
        ],
      }),
      i
        ? l.jsxs("p", {
            className:
              "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold leading-5 text-slate-600",
            children: [
              "Queued / ",
              e.outputPreview || "Waiting for an available worker.",
            ],
          })
        : l.jsxs("div", {
            children: [
              l.jsxs("div", {
                className:
                  "flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500",
                children: [
                  l.jsx("span", { children: "Progress" }),
                  l.jsxs("span", { children: [t, "%"] }),
                ],
              }),
              l.jsx("div", {
                className:
                  "mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100",
                children: l.jsx("div", {
                  className: `h-full rounded-full ${s ? "bg-red-500" : a ? "bg-cyan-500" : "bg-cyan-600"}`,
                  style: { width: `${t}%` },
                }),
              }),
            ],
          }),
      e.errorMessage
        ? l.jsx("p", {
            className:
              "rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-bold leading-5 text-red-700",
            children: e.errorMessage,
          })
        : e.outputPreview && !i
          ? l.jsx("p", {
              className:
                "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold leading-5 text-slate-600",
              children: e.outputPreview,
            })
          : null,
    ],
  });
}
function tx({ status: e }) {
  return e === "running"
    ? l.jsxs("span", {
        className:
          "inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-100 px-2 py-0.5 text-xs font-black uppercase text-cyan-800",
        children: [
          l.jsx("span", {
            className: "h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-600",
          }),
          "Running",
        ],
      })
    : l.jsx(Pe, { className: "uppercase", variant: Oa(e), children: e });
}
function nx({ job: e }) {
  return l.jsxs(ud, {
    children: [
      l.jsx(dd, {
        asChild: !0,
        children: l.jsx(ee, {
          type: "button",
          variant: "outline",
          size: "sm",
          className: "h-8 rounded-lg px-2",
          "aria-label": `More actions for ${e.id}`,
          children: l.jsx(lg, { size: 15 }),
        }),
      }),
      l.jsxs(Ra, {
        align: "end",
        className:
          "z-[80] w-44 rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20",
        children: [
          l.jsx(Xe, {
            disabled: !0,
            className: "opacity-45",
            children: "Restart worker",
          }),
          l.jsx(Xe, {
            disabled: !0,
            className: "opacity-45",
            children: "Open server",
          }),
          l.jsx(Xe, {
            onClick: () => {
              var t;
              return (t = navigator.clipboard) == null
                ? void 0
                : t.writeText(e.id);
            },
            children: "Copy job id",
          }),
        ],
      }),
    ],
  });
}
function oj({ overview: e }) {
  return e.banner
    ? l.jsx(ya, {
        className:
          "mb-4 rounded-2xl border-0 bg-white/75 text-primary shadow-sm ring-1 ring-primary/10",
        children: e.banner,
      })
    : null;
}
function sj({ overview: e }) {
  const t = (d) =>
      e.metrics.length
        ? Math.round(e.metrics.reduce((f, m) => f + m[d], 0) / e.metrics.length)
        : 0,
    n = e.metrics.length
      ? Math.round(
          e.metrics.reduce((d, f) => d + f.networkRx, 0) / e.metrics.length,
        )
      : 0,
    r = e.metrics.length
      ? Math.round(
          e.metrics.reduce((d, f) => d + f.networkTx, 0) / e.metrics.length,
        )
      : 0,
    o = e.summary.warningServers + e.summary.unreachableServers;
  function s(d) {
    var f;
    return (
      ((f = e.metrics.find((m) => {
        var y;
        return ((y = m.trend) == null ? void 0 : y.unit) === d;
      })) == null
        ? void 0
        : f.trend) ?? null
    );
  }
  const a = s("cpu"),
    i = s("memory"),
    c = s("disk"),
    u = s("network") || s();
  return l.jsxs("div", {
    className: "min-w-0 space-y-5 overflow-visible",
    children: [
      l.jsxs("section", {
        className: "grid min-w-0 gap-3 xl:grid-cols-3",
        "aria-label": "Operations overview",
        children: [
          l.jsx(_i, {
            tone: "healthy",
            label: "Fleet health",
            title: `${e.summary.healthyServers} healthy`,
            detail: `${e.summary.totalServers} total · ${o} need attention`,
            icon: Xr,
          }),
          l.jsx(_i, {
            tone: "work",
            label: "Key & job status",
            title: `${e.summary.runningJobs} running`,
            detail: "Provisioning and verification queue",
            icon: vl,
          }),
          l.jsx(_i, {
            tone: "load",
            label: "Resource balance",
            title: `${t("cpu")}% CPU`,
            detail: `${t("memory")}% RAM · ${t("disk")}% disk`,
            icon: Fn,
          }),
        ],
      }),
      l.jsx(oj, { overview: e }),
      l.jsxs("section", {
        className: "grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-4",
        children: [
          l.jsx(nl, {
            label: "CPU load",
            value: `${t("cpu")}%`,
            detail: a
              ? `${a.range} · min ${a.min}% max ${a.max}%`
              : `${e.metrics.length} backend samples`,
            icon: Sb,
            tone: "cyan",
            trend: a,
          }),
          l.jsx(nl, {
            label: "Memory pressure",
            value: `${t("memory")}%`,
            detail: i
              ? `${i.range} · min ${i.min}% max ${i.max}%`
              : "No backend trend",
            icon: $b,
            tone: "violet",
            trend: i,
          }),
          l.jsx(nl, {
            label: "Disk usage",
            value: `${t("disk")}%`,
            detail: c
              ? `${c.range} · min ${c.min}% max ${c.max}%`
              : `across ${e.metrics.length} servers`,
            icon: _b,
            tone: "amber",
            trend: c,
          }),
          l.jsx(nl, {
            label: "Network in/out",
            value: `${Zl(n)}/${Zl(r)}`,
            detail: u
              ? `${u.range} · min ${u.min}${u.unit || ""} max ${u.max}${u.unit || ""}`
              : "No backend trend",
            icon: Ub,
            tone: "slate",
            trend: u,
          }),
        ],
      }),
      l.jsxs("div", {
        className:
          "grid min-w-0 max-w-full gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]",
        children: [
          l.jsx(Z0, { events: e.auditEvents.slice(0, 5), compact: !0 }),
          l.jsx(ex, { jobs: e.jobs.slice(0, 5), compact: !0 }),
        ],
      }),
    ],
  });
}
function _i({ tone: e, label: t, title: n, detail: r, icon: o }) {
  const s = {
    healthy:
      "border-white/10 bg-[#15181e] text-white before:bg-[#36c275] text-emerald-100",
    work: "border-white/10 bg-[#15181e] text-white before:bg-[#ffb000] text-amber-100",
    load: "border-white/10 bg-[#15181e] text-white before:bg-[#844fba] text-violet-100",
  };
  return l.jsxs("article", {
    className: `${s[e]} before:absolute before:inset-x-0 before:top-0 before:h-1 relative min-h-28 min-w-0 overflow-hidden rounded-xl border p-4 pt-5 shadow-panel transition duration-300 hover:-translate-y-0.5 sm:min-h-32`,
    children: [
      l.jsx("div", {
        className:
          "absolute -right-10 -top-12 h-24 w-24 rounded-full bg-current/10 blur-2xl",
      }),
      l.jsxs("div", {
        className: "relative flex min-w-0 items-start justify-between gap-3",
        children: [
          l.jsxs("div", {
            className: "min-w-0",
            children: [
              l.jsx("p", {
                className:
                  "truncate text-[11px] font-black uppercase tracking-[0.2em] text-white/45",
                children: t,
              }),
              l.jsx("h2", {
                className:
                  "mt-2 truncate font-display text-2xl font-extrabold tracking-[-0.04em] text-white sm:text-[1.8rem]",
                children: n,
              }),
              l.jsx("p", {
                className:
                  "mt-1 truncate text-[14px] font-semibold leading-6 text-white/58",
                children: r,
              }),
            ],
          }),
          l.jsx("span", {
            className:
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10 text-current",
            children: l.jsx(o, { size: 20 }),
          }),
        ],
      }),
    ],
  });
}
function nl({ label: e, value: t, detail: n, icon: r, trend: o, tone: s }) {
  const a = {
      cyan: "#06b6d4",
      violet: "#6366f1",
      amber: "#d97706",
      slate: "#334155",
    }[s],
    c = ((o == null ? void 0 : o.points) ?? []).map((x) =>
      Math.min(92, Math.max(8, x)),
    ),
    u = c
      .map(
        (x, k) =>
          `${c.length > 1 ? (k / (c.length - 1)) * 100 : 50},${54 - x / 2}`,
      )
      .join(" "),
    d = (o == null ? void 0 : o.max) ?? null,
    f = (o == null ? void 0 : o.min) ?? null,
    m = (o == null ? void 0 : o.threshold) ?? null,
    y = (o == null ? void 0 : o.range) ?? null,
    w = d != null && m != null ? d >= m : !1;
  return l.jsx(at, {
    className: `min-w-0 overflow-hidden rounded-xl border-stone-200/80 bg-white/95 shadow-panel backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(13,14,18,0.08)] ${w ? "ring-2 ring-orange-200" : ""}`,
    children: l.jsxs(it, {
      className: "p-4",
      children: [
        l.jsxs("div", {
          className: "flex min-w-0 items-start justify-between gap-3",
          children: [
            l.jsxs("div", {
              className: "min-w-0",
              children: [
                l.jsx("p", {
                  className:
                    "truncate text-xs font-black uppercase tracking-[0.14em] text-slate-500",
                  children: e,
                }),
                l.jsx("strong", {
                  className:
                    "mt-1 block truncate text-2xl font-black text-slate-950",
                  children: t,
                }),
                l.jsx("p", {
                  className:
                    "mt-1 truncate text-[15px] font-semibold leading-6 text-slate-500",
                  children: n,
                }),
              ],
            }),
            l.jsx("span", {
              className:
                "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm",
              children: l.jsx(r, { size: 18 }),
            }),
          ],
        }),
        o
          ? l.jsxs(l.Fragment, {
              children: [
                l.jsxs("div", {
                  className:
                    "mt-3 flex items-center justify-between gap-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500",
                  children: [
                    l.jsxs("span", { children: ["Last ", y] }),
                    l.jsxs("span", {
                      className: w ? "text-orange-600" : "text-slate-500",
                      children: ["threshold ", m, "%"],
                    }),
                  ],
                }),
                l.jsxs("svg", {
                  className: "mt-2 h-14 w-full overflow-visible",
                  viewBox: "0 0 100 56",
                  preserveAspectRatio: "none",
                  "aria-hidden": "true",
                  children: [
                    l.jsx("line", {
                      x1: "0",
                      y1: "14",
                      x2: "100",
                      y2: "14",
                      stroke: w ? "#f97316" : "#cbd5e1",
                      strokeDasharray: "4 4",
                    }),
                    l.jsx("polyline", {
                      points: u,
                      fill: "none",
                      stroke: w ? "#f97316" : a,
                      strokeWidth: "3",
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                    }),
                    l.jsx("line", {
                      x1: "0",
                      y1: "44",
                      x2: "100",
                      y2: "44",
                      stroke: "#e2e8f0",
                      strokeDasharray: "4 4",
                    }),
                  ],
                }),
                l.jsxs("div", {
                  className:
                    "mt-1 flex items-center justify-between text-sm font-bold leading-6 text-slate-500",
                  children: [
                    l.jsxs("span", { children: ["min ", f, "%"] }),
                    l.jsxs("span", { children: ["max ", d, "%"] }),
                  ],
                }),
              ],
            })
          : l.jsx("div", {
              className:
                "mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm font-bold text-slate-400",
              children: "No backend trend data",
            }),
      ],
    }),
  });
}
var lj = "Label",
  rx = p.forwardRef((e, t) =>
    l.jsx(pe.label, {
      ...e,
      ref: t,
      onMouseDown: (n) => {
        var o;
        n.target.closest("button, input, select, textarea") ||
          ((o = e.onMouseDown) == null || o.call(e, n),
          !n.defaultPrevented && n.detail > 1 && n.preventDefault());
      },
    }),
  );
rx.displayName = lj;
var ox = rx;
const aj = gs(
    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  ),
  _n = p.forwardRef(({ className: e, ...t }, n) =>
    l.jsx(ox, { ref: n, className: H(aj(), e), ...t }),
  );
_n.displayName = ox.displayName;
var sx = "AlertDialog",
  [ij] = mn(sx, [c0]),
  vn = c0(),
  lx = (e) => {
    const { __scopeAlertDialog: t, ...n } = e,
      r = vn(t);
    return l.jsx(Pa, { ...r, ...n, modal: !0 });
  };
lx.displayName = sx;
var cj = "AlertDialogTrigger",
  ax = p.forwardRef((e, t) => {
    const { __scopeAlertDialog: n, ...r } = e,
      o = vn(n);
    return l.jsx(pd, { ...o, ...r, ref: t });
  });
ax.displayName = cj;
var uj = "AlertDialogPortal",
  ix = (e) => {
    const { __scopeAlertDialog: t, ...n } = e,
      r = vn(t);
    return l.jsx(Ma, { ...r, ...n });
  };
ix.displayName = uj;
var dj = "AlertDialogOverlay",
  cx = p.forwardRef((e, t) => {
    const { __scopeAlertDialog: n, ...r } = e,
      o = vn(n);
    return l.jsx(bs, { ...o, ...r, ref: t });
  });
cx.displayName = dj;
var ux = "AlertDialogContent",
  [fj, pj] = ij(ux),
  dx = p.forwardRef((e, t) => {
    const { __scopeAlertDialog: n, children: r, ...o } = e,
      s = vn(n),
      a = p.useRef(null),
      i = le(t, a),
      c = p.useRef(null);
    return l.jsx(fj, {
      scope: n,
      cancelRef: c,
      children: l.jsx(Ss, {
        role: "alertdialog",
        ...s,
        ...o,
        ref: i,
        onOpenAutoFocus: W(o.onOpenAutoFocus, (u) => {
          var d;
          (u.preventDefault(),
            (d = c.current) == null || d.focus({ preventScroll: !0 }));
        }),
        onPointerDownOutside: (u) => u.preventDefault(),
        onInteractOutside: (u) => u.preventDefault(),
        children: r,
      }),
    });
  });
dx.displayName = ux;
var mj = "AlertDialogTitle",
  fx = p.forwardRef((e, t) => {
    const { __scopeAlertDialog: n, ...r } = e,
      o = vn(n);
    return l.jsx(ks, { ...o, ...r, ref: t });
  });
fx.displayName = mj;
var hj = "AlertDialogDescription",
  px = p.forwardRef((e, t) => {
    const { __scopeAlertDialog: n, ...r } = e,
      o = vn(n);
    return l.jsx(Ns, { ...o, ...r, ref: t });
  });
px.displayName = hj;
var gj = "AlertDialogAction",
  mx = p.forwardRef((e, t) => {
    const { __scopeAlertDialog: n, ...r } = e,
      o = vn(n);
    return l.jsx(Aa, { ...o, ...r, ref: t });
  });
mx.displayName = gj;
var hx = "AlertDialogCancel",
  gx = p.forwardRef((e, t) => {
    const { __scopeAlertDialog: n, ...r } = e,
      { cancelRef: o } = pj(hx, n),
      s = vn(n),
      a = le(t, o);
    return l.jsx(Aa, { ...s, ...r, ref: a });
  });
gx.displayName = hx;
var vj = lx,
  xj = ax,
  yj = ix,
  vx = cx,
  xx = dx,
  yx = mx,
  wx = gx,
  bx = fx,
  Sx = px;
function wj() {
  typeof window > "u" ||
    window.setTimeout(() => {
      document.body.style.pointerEvents === "none" &&
        (document.body.style.pointerEvents = "");
    }, 0);
}
function Tp({ onOpenChange: e, ...t }) {
  return l.jsx(vj, {
    ...t,
    onOpenChange: (n) => {
      (e == null || e(n), n || wj());
    },
  });
}
const bj = xj,
  Sj = yj,
  kx = p.forwardRef(({ className: e, ...t }, n) =>
    l.jsx(vx, {
      className: H(
        "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        e,
      ),
      ...t,
      ref: n,
    }),
  );
kx.displayName = vx.displayName;
const Lc = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsxs(Sj, {
    children: [
      l.jsx(kx, {}),
      l.jsx(xx, {
        ref: n,
        className: H(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          e,
        ),
        ...t,
      }),
    ],
  }),
);
Lc.displayName = xx.displayName;
const $c = ({ className: e, ...t }) =>
  l.jsx("div", {
    className: H("flex flex-col space-y-2 text-center sm:text-left", e),
    ...t,
  });
$c.displayName = "AlertDialogHeader";
const zc = ({ className: e, ...t }) =>
  l.jsx("div", {
    className: H(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      e,
    ),
    ...t,
  });
zc.displayName = "AlertDialogFooter";
const Fc = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx(bx, { ref: n, className: H("text-lg font-semibold", e), ...t }),
);
Fc.displayName = bx.displayName;
const Bc = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx(Sx, { ref: n, className: H("text-sm text-muted-foreground", e), ...t }),
);
Bc.displayName = Sx.displayName;
const Uc = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx(yx, { ref: n, className: H(gd(), e), ...t }),
);
Uc.displayName = yx.displayName;
const Wc = p.forwardRef(({ className: e, ...t }, n) =>
  l.jsx(wx, {
    ref: n,
    className: H(gd({ variant: "outline" }), "mt-2 sm:mt-0", e),
    ...t,
  }),
);
Wc.displayName = wx.displayName;
function Nx(e) {
  const t = Math.floor(e / 86400);
  if (t >= 1) return `${t}d`;
  const n = Math.floor(e / 3600);
  return n >= 1 ? `${n}h` : `${Math.max(0, Math.floor(e / 60))}m`;
}
function kj(e) {
  const t = new Map(e.metrics.map((o) => [o.vpsId, o])),
    n = new Map((e.systemInfo ?? []).map((o) => [o.vpsId, o])),
    r = new Map((e.dockerMetrics ?? []).map((o) => [o.vpsId, o]));
  return l.jsxs("div", {
    className:
      "grid min-w-0 max-w-full gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]",
    children: [
      l.jsx("section", {
        className: "min-w-0 space-y-4",
        children: l.jsxs(at, {
          className:
            "min-w-0 overflow-hidden border border-stone-200/80 bg-white/95 shadow-panel backdrop-blur",
          children: [
            l.jsxs(vt, {
              className:
                "min-w-0 border-b border-stone-200/70 bg-[#f6f3ec] pb-4",
              children: [
                l.jsx("p", {
                  className:
                    "truncate text-[11px] font-black uppercase tracking-[0.2em] text-[#844fba]",
                  children: "Fleet inventory",
                }),
                l.jsx(xt, {
                  className: "truncate text-[#15181e]",
                  children: "Servers",
                }),
                l.jsx(Tt, {
                  children: "Search, filter, install keys, and verify access.",
                }),
              ],
            }),
            l.jsxs(it, {
              className: "min-w-0 space-y-4",
              children: [
                l.jsxs("div", {
                  className:
                    "grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_180px]",
                  children: [
                    l.jsx(Pt, {
                      "aria-label": "Search servers",
                      placeholder: "Search name, host, provider, tag...",
                      value: e.serverSearch,
                      onChange: (o) => e.onSearchChange(o.target.value),
                    }),
                    l.jsxs("select", {
                      "aria-label": "Filter status",
                      className:
                        "h-10 min-w-0 w-full rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/20",
                      value: e.statusFilter,
                      onChange: (o) => e.onStatusFilterChange(o.target.value),
                      children: [
                        l.jsx("option", {
                          value: "all",
                          children: "All states",
                        }),
                        l.jsx("option", {
                          value: "healthy",
                          children: "Healthy",
                        }),
                        l.jsx("option", {
                          value: "warning",
                          children: "Warning",
                        }),
                        l.jsx("option", {
                          value: "unreachable",
                          children: "Down",
                        }),
                        l.jsx("option", {
                          value: "ready",
                          children: "Key ready",
                        }),
                        l.jsx("option", {
                          value: "pending",
                          children: "Needs password",
                        }),
                      ],
                    }),
                  ],
                }),
                e.statusMessage,
                e.records.length === 0
                  ? l.jsx(Zr, {
                      children:
                        "No VPS servers yet. Add your first server with the form beside this list.",
                    })
                  : e.visibleRecords.length === 0
                    ? l.jsx(Zr, { children: "No servers match this filter." })
                    : l.jsx("div", {
                        className: "grid min-w-0 gap-2",
                        children: e.visibleRecords.map((o) =>
                          l.jsx(
                            Cj,
                            {
                              vps: o,
                              metric: t.get(o.id),
                              systemInfo: n.get(o.id),
                              dockerMetrics: r.get(o.id),
                              jobs: e.jobs.filter((s) => s.vpsId === o.id),
                              busy: e.busy,
                              password: e.provisionPasswords[o.id] || "",
                              onPasswordChange: e.onPasswordChange,
                              onProvision: e.onProvision,
                              onVerify: e.onVerify,
                              onInstallAgent: e.onInstallAgent,
                              onToggleDockerMetrics: e.onToggleDockerMetrics,
                              onDelete: e.onDelete,
                            },
                            o.id,
                          ),
                        ),
                      }),
                l.jsx(Aj, { records: e.records, metrics: e.metrics }),
              ],
            }),
          ],
        }),
      }),
      l.jsx(Nj, { ...e }),
    ],
  });
}
function Nj({ createForm: e, busy: t, onCreate: n, onCreateFormChange: r }) {
  return l.jsxs(at, {
    className:
      "h-fit min-w-0 overflow-hidden border border-stone-200/80 bg-white/95 shadow-panel backdrop-blur xl:sticky xl:top-5",
    children: [
      l.jsxs(vt, {
        className:
          "min-w-0 border-b border-stone-200 bg-[#15181e] pb-4 text-white",
        children: [
          l.jsx("p", {
            className:
              "truncate text-[11px] font-black uppercase tracking-[0.2em] text-[#ffb000]",
            children: "Add server",
          }),
          l.jsx(xt, { className: "truncate text-white", children: "New VPS" }),
          l.jsx(Tt, {
            className: "text-white/58",
            children: "Password is optional and never stored.",
          }),
        ],
      }),
      l.jsx(it, {
        children: l.jsxs("form", {
          onSubmit: n,
          autoComplete: "off",
          className: "grid min-w-0 gap-4",
          children: [
            l.jsxs("fieldset", {
              className: "grid gap-3",
              children: [
                l.jsx("legend", {
                  className:
                    "mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500",
                  children: "Basic info",
                }),
                l.jsxs(_n, {
                  children: [
                    "Name",
                    l.jsx(Pt, {
                      required: !0,
                      maxLength: 120,
                      placeholder: "prod-sgp-01",
                      value: e.name,
                      onChange: (o) => r({ ...e, name: o.target.value }),
                    }),
                  ],
                }),
                l.jsxs(_n, {
                  children: [
                    "Host / IP",
                    l.jsx(Pt, {
                      required: !0,
                      maxLength: 255,
                      placeholder: "203.0.113.20",
                      value: e.host,
                      onChange: (o) => r({ ...e, host: o.target.value }),
                    }),
                  ],
                }),
              ],
            }),
            l.jsxs("fieldset", {
              className: "grid gap-3",
              children: [
                l.jsx("legend", {
                  className:
                    "mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500",
                  children: "SSH access",
                }),
                l.jsxs("div", {
                  className: "grid min-w-0 gap-3 sm:grid-cols-2",
                  children: [
                    l.jsxs(_n, {
                      children: [
                        "Port",
                        l.jsx(Pt, {
                          required: !0,
                          type: "number",
                          min: 1,
                          max: 65535,
                          value: e.port,
                          onChange: (o) => r({ ...e, port: o.target.value }),
                        }),
                      ],
                    }),
                    l.jsxs(_n, {
                      children: [
                        "Username",
                        l.jsx(Pt, {
                          required: !0,
                          maxLength: 64,
                          placeholder: "root",
                          value: e.username,
                          onChange: (o) =>
                            r({ ...e, username: o.target.value }),
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            l.jsxs("fieldset", {
              className: "grid gap-3",
              children: [
                l.jsx("legend", {
                  className:
                    "mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500",
                  children: "Key provisioning",
                }),
                l.jsxs(_n, {
                  children: [
                    "Optional password",
                    l.jsx(Pt, {
                      type: "password",
                      maxLength: 4096,
                      autoComplete: "new-password",
                      placeholder: "One-time key install",
                      value: e.password,
                      onChange: (o) => r({ ...e, password: o.target.value }),
                    }),
                  ],
                }),
              ],
            }),
            l.jsxs(ee, {
              type: "submit",
              disabled: t,
              className: "min-w-0 rounded-xl",
              children: [
                l.jsx(Xr, { size: 18 }),
                l.jsx("span", {
                  className: "truncate",
                  children: "Create VPS",
                }),
              ],
            }),
          ],
        }),
      }),
    ],
  });
}
function Cj({
  vps: e,
  metric: t,
  systemInfo: n,
  dockerMetrics: r,
  jobs: o,
  busy: s,
  password: a,
  onPasswordChange: i,
  onProvision: c,
  onVerify: u,
  onInstallAgent: d,
  onToggleDockerMetrics: f,
  onDelete: m,
}) {
  var j;
  const y = e.kind === "local" || e.managedBy === "system",
    w = y || !!e.keyProvisionedAt,
    x = e.status === "unreachable",
    [k, h] = p.useState(!1),
    [g, v] = p.useState(!1),
    [b, S] = p.useState(""),
    [C, N] = p.useState(null),
    E = (R) => {
      if (R.key === "Enter") {
        if ((R.preventDefault(), !a.trim())) {
          S("Password cannot be empty");
          return;
        }
        (S(""), v(!0));
      }
    };
  return l.jsxs("article", {
    className: `min-w-0 rounded-xl border px-4 py-4 shadow-[0_10px_28px_rgba(13,14,18,0.04)] transition duration-300 ${x ? "border-red-200 bg-red-50/70 shadow-red-950/5 ring-1 ring-red-100" : "border-stone-200/90 bg-white hover:-translate-y-0.5 hover:border-[#844fba]/30 hover:shadow-[0_18px_38px_rgba(13,14,18,0.08)]"}`,
    children: [
      l.jsxs("div", {
        className: `grid gap-4 xl:grid-cols-[minmax(320px,1.25fr)_minmax(230px,0.8fr)_minmax(220px,0.55fr)_auto] xl:items-center ${x ? "border-l-4 border-red-500 pl-3" : ""}`,
        children: [
          l.jsxs("div", {
            className: "min-w-0",
            children: [
              l.jsxs("div", {
                className: "flex flex-wrap items-center gap-2",
                children: [
                  l.jsx("h3", {
                    className:
                      "truncate text-[17px] font-extrabold tracking-[-0.03em] text-[#15181e]",
                    children: e.name,
                  }),
                  x
                    ? l.jsxs("span", {
                        className:
                          "inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-black uppercase text-red-700",
                        children: [l.jsx(cg, { size: 13 }), "Down"],
                      })
                    : l.jsx(Pe, {
                        variant: Oa(e.status),
                        children: ZE(e.status),
                      }),
                  l.jsx(Pe, {
                    variant: w ? "ready" : "pending",
                    children: y
                      ? "Local agent"
                      : w
                        ? "Key ready"
                        : "Needs password",
                  }),
                ],
              }),
              l.jsxs("p", {
                className:
                  "mt-1 break-all text-sm font-semibold leading-6 text-slate-600",
                children: [e.username, "@", e.host, ":", e.port],
              }),
              l.jsxs("p", {
                className:
                  "mt-1 break-all font-mono text-xs font-bold text-slate-500",
                children: ["ID: ", e.id],
              }),
              l.jsxs("div", {
                className:
                  "mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] font-bold text-slate-500",
                children: [
                  l.jsxs("span", {
                    className: "flex items-center gap-1.5",
                    children: [
                      l.jsx(eS, { size: 14 }),
                      e.provider || "Provider not set",
                    ],
                  }),
                  l.jsx("span", { className: "text-slate-300", children: "/" }),
                  l.jsxs("span", {
                    className: "flex items-center gap-1.5",
                    children: [
                      l.jsx(Ib, { size: 14 }),
                      e.region || "Region not set",
                    ],
                  }),
                  l.jsx("span", { className: "text-slate-300", children: "/" }),
                  l.jsxs("span", {
                    className: "flex items-center gap-1.5",
                    children: [
                      l.jsx(sg, { size: 14 }),
                      "Seen ",
                      Sd(e.lastSeenAt),
                    ],
                  }),
                ],
              }),
              (j = e.tags) != null && j.length
                ? l.jsxs("p", {
                    className: "mt-2 truncate text-xs font-bold text-slate-500",
                    title: `Tags: ${e.tags.join(", ")}`,
                    children: [
                      l.jsx("span", {
                        className:
                          "font-black uppercase tracking-[0.08em] text-slate-400",
                        children: "Tags:",
                      }),
                      " ",
                      e.tags.join(", "),
                    ],
                  })
                : null,
              e.notes
                ? l.jsx("p", {
                    className:
                      "mt-2 line-clamp-2 text-sm leading-5 text-slate-500",
                    children: e.notes,
                  })
                : null,
              l.jsx(jj, { systemInfo: n }),
            ],
          }),
          l.jsx(Ej, { metric: t, systemInfo: n, jobs: o }),
          l.jsx(Pj, { metric: t }),
          l.jsx(_j, { vps: e, dockerMetrics: r, busy: s, onToggle: f }),
          l.jsxs("div", {
            className:
              "flex min-w-0 flex-wrap items-start justify-start gap-2 xl:justify-end",
            children: [
              y
                ? l.jsxs(l.Fragment, {
                    children: [
                      l.jsxs(ee, {
                        type: "button",
                        size: "sm",
                        variant: "secondary",
                        className:
                          "border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm hover:bg-emerald-50 disabled:opacity-100",
                        disabled: !0,
                        children: [l.jsx(Fn, { size: 16 }), "Managed locally"],
                      }),
                      l.jsxs(ee, {
                        type: "button",
                        size: "sm",
                        variant: "secondary",
                        className:
                          "border border-slate-300 bg-white text-slate-900 shadow-sm hover:bg-slate-100 disabled:opacity-100",
                        disabled: !0,
                        children: [l.jsx(Fn, { size: 16 }), "Metrics"],
                      }),
                    ],
                  })
                : w
                  ? l.jsxs(l.Fragment, {
                      children: [
                        l.jsxs(ee, {
                          type: "button",
                          size: "sm",
                          variant: "outline",
                          disabled: s,
                          onClick: () => u(e),
                          children: [l.jsx(ls, { size: 16 }), "Verify access"],
                        }),
                        l.jsxs(ee, {
                          type: "button",
                          size: "sm",
                          variant: "secondary",
                          disabled: s,
                          onClick: () => h((R) => !R),
                          children: [l.jsx(vl, { size: 16 }), "Reinstall key"],
                        }),
                        l.jsxs(ee, {
                          type: "button",
                          size: "sm",
                          variant: "default",
                          disabled: s,
                          onClick: () => d(e),
                          children: [l.jsx(yb, { size: 16 }), "Install agent"],
                        }),
                        l.jsxs(ee, {
                          type: "button",
                          size: "sm",
                          variant: "secondary",
                          className:
                            "border border-slate-300 bg-white text-slate-900 shadow-sm hover:bg-slate-100 disabled:opacity-100",
                          disabled: !0,
                          children: [l.jsx(Fn, { size: 16 }), "Metrics"],
                        }),
                      ],
                    })
                  : l.jsxs(l.Fragment, {
                      children: [
                        l.jsxs(ee, {
                          type: "button",
                          size: "sm",
                          variant: "secondary",
                          disabled: s,
                          onClick: () => h((R) => !R),
                          children: [l.jsx(vl, { size: 16 }), "Install key"],
                        }),
                        l.jsxs(ee, {
                          type: "button",
                          size: "sm",
                          variant: "outline",
                          disabled: s,
                          onClick: () => u(e),
                          children: [l.jsx(ls, { size: 16 }), "Verify access"],
                        }),
                      ],
                    }),
              l.jsx(Mj, {
                vps: e,
                busy: s,
                isLocalHost: y,
                onRotate: () => h(!0),
                onRequestDelete: () => {
                  window.setTimeout(() => N(e), 0);
                },
              }),
            ],
          }),
        ],
      }),
      l.jsx(Tp, {
        open: (C == null ? void 0 : C.id) === e.id,
        onOpenChange: (R) => {
          R || N(null);
        },
        children: l.jsxs(Lc, {
          children: [
            l.jsxs($c, {
              children: [
                l.jsxs(Fc, { children: ["Delete ", e.name, "?"] }),
                l.jsxs(Bc, {
                  children: [
                    "This permanently removes the server record for ",
                    e.username,
                    "@",
                    e.host,
                    ":",
                    e.port,
                    ". This cannot be undone.",
                  ],
                }),
              ],
            }),
            l.jsxs(zc, {
              children: [
                l.jsx(Wc, { children: "Cancel" }),
                l.jsx(Uc, {
                  className:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                  onClick: () => {
                    m(e);
                  },
                  children: "Delete server",
                }),
              ],
            }),
          ],
        }),
      }),
      k && !y
        ? l.jsxs("form", {
            onSubmit: (R) => R.preventDefault(),
            autoComplete: "off",
            className:
              "mt-3 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-[minmax(0,1fr)_auto]",
            children: [
              l.jsxs(_n, {
                children: [
                  w ? "One-time password for rotation" : "One-time password",
                  l.jsx(Pt, {
                    type: "password",
                    maxLength: 4096,
                    autoComplete: "new-password",
                    placeholder: "Used once to install or rotate the key",
                    value: a,
                    onChange: (R) => {
                      (i(e.id, R.target.value), b && S(""));
                    },
                    onKeyDown: E,
                  }),
                  b
                    ? l.jsx("p", {
                        className: "mt-1 text-xs font-semibold text-red-600",
                        children: b,
                      })
                    : null,
                ],
              }),
              l.jsxs(Tp, {
                open: g,
                onOpenChange: v,
                children: [
                  l.jsx(bj, {
                    asChild: !0,
                    children: l.jsxs(ee, {
                      type: "button",
                      size: "sm",
                      disabled: s || !a.trim(),
                      className: "self-end rounded-xl",
                      children: [
                        l.jsx(vl, { size: 16 }),
                        w ? "Rotate key" : "Install key",
                      ],
                    }),
                  }),
                  l.jsxs(Lc, {
                    children: [
                      l.jsxs($c, {
                        children: [
                          l.jsx(Fc, {
                            children: w
                              ? "Rotate SSH key?"
                              : "Install SSH key?",
                          }),
                          l.jsxs(Bc, {
                            children: [
                              "This will connect to ",
                              e.name,
                              " and update authorized SSH access using the one-time password. The password will not be stored.",
                            ],
                          }),
                        ],
                      }),
                      l.jsxs(zc, {
                        children: [
                          l.jsx(Wc, { children: "Cancel" }),
                          l.jsx(Uc, {
                            onClick: () => {
                              c(e);
                            },
                            children: w ? "Rotate key" : "Install key",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
        : null,
    ],
  });
}
function Ej({ metric: e, systemInfo: t, jobs: n }) {
  const r = n.filter((s) => s.status === "running").length,
    o = [
      t != null && t.agentVersion ? `Agent ${t.agentVersion}` : null,
      e ? `Uptime ${Nx(e.uptime)}` : null,
      e ? `Last check ${_t(e.collectedAt)}` : null,
      `${r} running job${r === 1 ? "" : "s"}`,
    ].filter(Boolean);
  return l.jsx("div", {
    className:
      "min-w-0 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-[12px] font-bold leading-5 text-slate-600 shadow-sm",
    children: l.jsx("p", {
      className: "truncate",
      title: o.join(" / "),
      children: o.join(" / "),
    }),
  });
}
function jj({ systemInfo: e }) {
  var a, i, c, u, d, f, m, y, w;
  if (!e)
    return l.jsx("div", {
      className:
        "mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-400",
      children: "System info not reported yet.",
    });
  const t =
      ((a = e.os) == null ? void 0 : a.prettyName) ||
      ((i = e.os) == null ? void 0 : i.name) ||
      ((c = e.os) == null ? void 0 : c.family) ||
      "OS n/a",
    n = [
      (u = e.kernel) == null ? void 0 : u.release,
      (d = e.kernel) == null ? void 0 : d.arch,
    ].filter(Boolean),
    r =
      [
        (f = e.cpu) != null && f.cores ? `${e.cpu.cores} cores` : null,
        (m = e.cpu) == null ? void 0 : m.model,
      ]
        .filter(Boolean)
        .join(" · ") || "CPU n/a",
    o =
      (y = e.memory) != null && y.totalBytes
        ? `${Mr(e.memory.totalBytes)} RAM`
        : "RAM n/a",
    s =
      (w = e.rootDisk) != null && w.totalBytes
        ? `${Mr(e.rootDisk.totalBytes)} disk${e.rootDisk.fsType ? ` · ${e.rootDisk.fsType}` : ""}`
        : "Disk n/a";
  return l.jsxs("div", {
    className:
      "mt-3 grid gap-2 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-3 py-2 text-xs text-slate-600 shadow-sm",
    children: [
      l.jsx("p", {
        className: "truncate font-black text-slate-800",
        title: t,
        children: t,
      }),
      l.jsxs("div", {
        className: "flex flex-wrap gap-x-2 gap-y-1 font-bold",
        children: [
          l.jsx("span", {
            className: "truncate",
            title: n.join(" · ") || void 0,
            children: n.length ? n.join(" · ") : "Kernel n/a",
          }),
          l.jsx("span", { className: "text-slate-300", children: "/" }),
          l.jsx("span", { className: "truncate", title: r, children: r }),
          l.jsx("span", { className: "text-slate-300", children: "/" }),
          l.jsx("span", { children: o }),
          l.jsx("span", { className: "text-slate-300", children: "/" }),
          l.jsx("span", { children: s }),
        ],
      }),
    ],
  });
}
function Mr(e) {
  if (!Number.isFinite(e) || e <= 0) return "n/a";
  const t = ["B", "KB", "MB", "GB", "TB"];
  let n = e,
    r = 0;
  for (; n >= 1024 && r < t.length - 1;) ((n /= 1024), (r += 1));
  return `${n >= 10 || r === 0 ? n.toFixed(0) : n.toFixed(1)} ${t[r]}`;
}
function Rj(e) {
  return (
    {
      socket_missing: "Docker socket missing",
      permission_denied: "Permission denied",
      timeout: "Docker timed out",
      daemon_unreachable: "Docker daemon unreachable",
      unsupported_os: "Unsupported OS",
      bad_response: "Bad Docker response",
    }[e || ""] || "Docker unavailable"
  );
}
function _j({ vps: e, dockerMetrics: t, busy: n, onToggle: r }) {
  const o = e.dockerMetricsEnabled === !0,
    s = ((t == null ? void 0 : t.containers) ?? [])
      .slice()
      .sort((i, c) => c.cpuPercent - i.cpuPercent)
      .slice(0, 3);
  let a;
  return (
    o
      ? t
        ? t.available
          ? (a = l.jsxs("div", {
              className: "space-y-2",
              children: [
                l.jsxs("div", {
                  className:
                    "flex flex-wrap gap-1.5 text-[11px] font-black text-slate-700",
                  children: [
                    l.jsxs("span", {
                      className: "rounded-full bg-white px-2 py-0.5 shadow-sm",
                      children: [
                        t.containerRunning,
                        "/",
                        t.containerTotal,
                        " running",
                      ],
                    }),
                    l.jsxs("span", {
                      className: "rounded-full bg-white px-2 py-0.5 shadow-sm",
                      children: ["CPU ", t.cpuPercent.toFixed(1), "%"],
                    }),
                    l.jsxs("span", {
                      className: "rounded-full bg-white px-2 py-0.5 shadow-sm",
                      children: ["RAM ", Mr(t.memoryUsageBytes)],
                    }),
                    l.jsxs("span", {
                      className: "rounded-full bg-white px-2 py-0.5 shadow-sm",
                      children: [
                        "Net ",
                        Mr(t.networkRxBytes + t.networkTxBytes),
                      ],
                    }),
                    l.jsxs("span", {
                      className: "rounded-full bg-white px-2 py-0.5 shadow-sm",
                      children: [
                        "IO ",
                        Mr(t.blockReadBytes + t.blockWriteBytes),
                      ],
                    }),
                  ],
                }),
                s.length
                  ? l.jsx("div", {
                      className: "grid gap-1",
                      children: s.map((i) =>
                        l.jsxs(
                          "p",
                          {
                            className:
                              "truncate text-[11px] font-bold text-slate-600",
                            title: `${i.name} · ${i.image} · ${i.status}`,
                            children: [
                              l.jsx("span", {
                                className: "text-slate-900",
                                children: i.name,
                              }),
                              " · ",
                              i.state,
                              " · ",
                              i.cpuPercent.toFixed(1),
                              "% · ",
                              Mr(i.memoryUsageBytes),
                            ],
                          },
                          i.id,
                        ),
                      ),
                    })
                  : null,
              ],
            }))
          : (a = l.jsxs("div", {
              className: "space-y-1",
              children: [
                l.jsx("p", {
                  className: "text-xs font-black text-amber-800",
                  children: Rj(t.errorCode),
                }),
                l.jsx("p", {
                  className: "text-[11px] font-semibold text-slate-500",
                  children: "Check Docker socket access for the agent.",
                }),
              ],
            }))
        : (a = l.jsx("p", {
            className: "text-xs font-bold text-amber-700",
            children: "Waiting for Docker-capable agent.",
          }))
      : (a = l.jsx("p", {
          className: "text-xs font-bold text-slate-500",
          children: "Docker metrics off.",
        })),
    l.jsxs("div", {
      className:
        "rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-sm",
      children: [
        l.jsxs("div", {
          className: "mb-1.5 flex items-center justify-between gap-2",
          children: [
            l.jsx("span", {
              className:
                "text-[11px] font-black uppercase tracking-[0.12em] text-slate-500",
              children: "Docker",
            }),
            l.jsx(ee, {
              type: "button",
              size: "sm",
              variant: o ? "secondary" : "outline",
              className: "h-7 rounded-lg px-2 text-[11px]",
              disabled: n,
              "aria-pressed": o,
              "aria-label": `${o ? "Disable" : "Enable"} Docker metrics for ${e.name}`,
              onClick: () => r(e),
              children: o ? "On" : "Off",
            }),
          ],
        }),
        a,
      ],
    })
  );
}
function Pj({ metric: e }) {
  const t =
    "rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-black text-slate-800 shadow-[0_1px_0_rgba(15,23,42,0.03)]";
  return e
    ? l.jsxs("div", {
        className: "flex flex-wrap items-center gap-1.5 xl:justify-end",
        children: [
          l.jsxs("span", {
            className: t,
            children: [
              l.jsx("span", { className: "text-slate-500", children: "CPU" }),
              " ",
              e.cpu,
              "%",
            ],
          }),
          l.jsxs("span", {
            className: t,
            children: [
              l.jsx("span", { className: "text-slate-500", children: "RAM" }),
              " ",
              e.memory,
              "%",
            ],
          }),
          l.jsxs("span", {
            className: t,
            children: [
              l.jsx("span", { className: "text-slate-500", children: "Disk" }),
              " ",
              e.disk,
              "%",
            ],
          }),
          l.jsxs("span", {
            className: t,
            children: [
              l.jsx("span", { className: "text-slate-500", children: "Load" }),
              " ",
              e.loadAverage,
            ],
          }),
        ],
      })
    : l.jsxs("div", {
        className: "flex flex-wrap items-center gap-1.5 xl:justify-end",
        children: [
          l.jsx("span", { className: t, children: "CPU n/a" }),
          l.jsx("span", { className: t, children: "RAM n/a" }),
          l.jsx("span", { className: t, children: "Disk n/a" }),
          l.jsx("span", { className: t, children: "Load n/a" }),
        ],
      });
}
function Mj({
  vps: e,
  busy: t,
  isLocalHost: n,
  onRotate: r,
  onRequestDelete: o,
}) {
  return l.jsxs(ud, {
    children: [
      l.jsx(dd, {
        asChild: !0,
        children: l.jsx(ee, {
          type: "button",
          size: "sm",
          variant: "outline",
          "aria-label": `More actions for ${e.name}`,
          children: l.jsx(lg, { size: 16 }),
        }),
      }),
      l.jsxs(Ra, {
        align: "end",
        className: "w-48 rounded-xl",
        children: [
          l.jsxs(Xe, {
            disabled: !0,
            children: [l.jsx(zu, { size: 15 }), "Open terminal"],
          }),
          l.jsxs(Xe, {
            disabled: !0,
            children: [l.jsx(Fn, { size: 15 }), "View metrics"],
          }),
          n
            ? l.jsxs(Xe, {
                disabled: !0,
                children: [l.jsx(Fn, { size: 15 }), "Managed by local agent"],
              })
            : l.jsxs(Xe, {
                onClick: r,
                disabled: t,
                children: [
                  l.jsx(Qb, { size: 15 }),
                  e.keyProvisionedAt ? "Rotate key" : "Install key",
                ],
              }),
          l.jsxs(Xe, {
            disabled: !0,
            children: [l.jsx(Vb, { size: 15 }), "Edit server"],
          }),
          l.jsx(ql, {}),
          l.jsxs(Xe, {
            className: "text-destructive focus:text-destructive",
            disabled: t || n,
            onClick: o,
            children: [l.jsx(ig, { size: 15 }), "Delete server"],
          }),
        ],
      }),
    ],
  });
}
function Aj({ records: e, metrics: t }) {
  const n = e.filter(
      (i) =>
        i.kind === "local" || i.managedBy === "system" || i.keyProvisionedAt,
    ).length,
    r = e.filter((i) => i.status === "unreachable").length,
    o = e.reduce((i, c) => {
      const u = c.region || "Unassigned";
      return ((i[u] = (i[u] || 0) + 1), i);
    }, {}),
    s =
      Object.entries(o)
        .slice(0, 3)
        .map(([i, c]) => `${i} ${c}`)
        .join(" · ") || "None",
    a = t.length ? [...t].sort((i, c) => c.cpu - i.cpu)[0] : null;
  return l.jsxs("section", {
    className:
      "grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 xl:grid-cols-4",
    "aria-label": "Server operations summary",
    children: [
      l.jsx(nn, { label: "SSH keys", value: `${n}/${e.length} ready` }),
      l.jsx(nn, { label: "Down", value: `${r}`, tone: r ? "red" : "default" }),
      l.jsx(nn, { label: "Regions", value: s }),
      l.jsx(nn, {
        label: "Hottest CPU",
        value: a ? `${a.vpsId} ${a.cpu}%` : "No metrics",
      }),
    ],
  });
}
function Tj({ metrics: e }) {
  const [t, n] = p.useState("all"),
    [r, o] = p.useState("all"),
    s = Array.from(new Set(e.map((w) => w.vpsId))).sort(),
    a = e.filter((w) => t === "all" || w.vpsId === t),
    i = e.filter((w) => w.freshness === "fresh").length,
    c = e.filter((w) => w.freshness === "stale").length,
    u = Pi(e, "cpu"),
    d = Pi(e, "disk"),
    f = Pi(e, "memory"),
    m = e.length
      ? [...e].sort((w, x) => x.loadAverage - w.loadAverage)[0]
      : null,
    y = Oj(e);
  return l.jsxs(at, {
    className: "min-w-0 overflow-hidden border-slate-200 bg-white shadow-sm",
    children: [
      l.jsx(vt, {
        className: "p-4 pb-3 sm:p-5 sm:pb-4",
        children: l.jsxs("div", {
          className: "flex flex-wrap items-start justify-between gap-3",
          children: [
            l.jsxs("div", {
              children: [
                l.jsx(xt, {
                  className: "text-xl font-black",
                  children: "Metrics",
                }),
                l.jsx(Tt, {
                  children: "Telemetry freshness and resource usage by server.",
                }),
              ],
            }),
            l.jsxs(Pe, {
              variant: c ? "pending" : "ready",
              children: [i, "/", e.length, " fresh"],
            }),
          ],
        }),
      }),
      l.jsxs(it, {
        className: "grid gap-4 p-4 pt-0 sm:p-5 sm:pt-0",
        children: [
          l.jsxs("section", {
            className:
              "grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_190px]",
            "aria-label": "Metrics filters",
            children: [
              l.jsxs("select", {
                "aria-label": "Filter metrics server",
                className:
                  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-ring",
                value: t,
                onChange: (w) => n(w.target.value),
                children: [
                  l.jsx("option", { value: "all", children: "All servers" }),
                  s.map((w) => l.jsx("option", { value: w, children: w }, w)),
                ],
              }),
              l.jsxs("select", {
                "aria-label": "Filter metric type",
                className:
                  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-ring",
                value: r,
                onChange: (w) => o(w.target.value),
                children: [
                  l.jsx("option", { value: "all", children: "All metrics" }),
                  l.jsx("option", { value: "cpu", children: "CPU" }),
                  l.jsx("option", { value: "memory", children: "Memory" }),
                  l.jsx("option", { value: "disk", children: "Disk" }),
                  l.jsx("option", { value: "load", children: "Load" }),
                  l.jsx("option", { value: "network", children: "Network" }),
                ],
              }),
            ],
          }),
          l.jsxs("section", {
            className: "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5",
            "aria-label": "Metrics summary",
            children: [
              l.jsx(jo, {
                label: "Fresh servers",
                server: "Telemetry",
                value: `${i}/${e.length}`,
              }),
              l.jsx(jo, {
                label: "Stale metrics",
                server: "Attention",
                value: `${c}`,
                tone: c ? "red" : "default",
              }),
              l.jsx(jo, {
                label: "Highest CPU",
                server: (u == null ? void 0 : u.vpsId) || "n/a",
                value: u ? `${u.cpu}%` : "n/a",
              }),
              l.jsx(jo, {
                label: "Highest disk",
                server: (d == null ? void 0 : d.vpsId) || "n/a",
                value: d ? `${d.disk}%` : "n/a",
              }),
              l.jsx(jo, {
                label: "Peak load",
                server: (m == null ? void 0 : m.vpsId) || "n/a",
                value: m ? String(m.loadAverage) : "n/a",
              }),
            ],
          }),
          a.length
            ? l.jsx("section", {
                className: "grid gap-3",
                "aria-label": "Server metrics",
                children: a.map((w) =>
                  l.jsx(Dj, { metric: w, focus: r }, w.vpsId),
                ),
              })
            : l.jsx(Zr, { children: "No metrics match these filters." }),
          l.jsxs("section", {
            className:
              "grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-4",
            "aria-label": "Metric trends",
            children: [
              l.jsx(rl, { metric: u, label: "CPU trend", unit: "%" }),
              l.jsx(rl, { metric: f, label: "Memory trend", unit: "%" }),
              l.jsx(rl, { metric: d, label: "Disk trend", unit: "%" }),
              l.jsx(rl, {
                metric:
                  e.find((w) => {
                    var x;
                    return (
                      ((x = w.trend) == null ? void 0 : x.unit) === "network"
                    );
                  }) || e[0],
                label: "Network trend",
                unit: "",
              }),
            ],
          }),
          l.jsxs("section", {
            className: "rounded-xl border border-slate-200 bg-white p-4",
            "aria-label": "Recent metric alerts",
            children: [
              l.jsxs("div", {
                className: "flex items-center justify-between gap-3",
                children: [
                  l.jsx("h3", {
                    className: "font-black text-slate-950",
                    children: "Recent metric alerts",
                  }),
                  l.jsxs(Pe, {
                    variant: y.length ? "pending" : "ready",
                    children: [y.length, " alerts"],
                  }),
                ],
              }),
              y.length
                ? l.jsxs("div", {
                    className:
                      "mt-3 overflow-hidden rounded-xl border border-slate-200",
                    children: [
                      l.jsxs("div", {
                        className:
                          "hidden grid-cols-[0.8fr_1fr_minmax(0,1.5fr)_0.8fr_auto] gap-3 bg-slate-100 px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500 md:grid",
                        children: [
                          l.jsx("span", { children: "Severity" }),
                          l.jsx("span", { children: "Server" }),
                          l.jsx("span", { children: "Message" }),
                          l.jsx("span", { children: "Last check" }),
                          l.jsx("span", { children: "Action" }),
                        ],
                      }),
                      l.jsx("div", {
                        className: "divide-y divide-slate-200",
                        children: y.map((w) =>
                          l.jsxs(
                            "article",
                            {
                              className:
                                "grid gap-2 px-3 py-2 text-sm font-bold text-slate-600 md:grid-cols-[0.8fr_1fr_minmax(0,1.5fr)_0.8fr_auto] md:items-center",
                              children: [
                                l.jsx(Pe, {
                                  className: "w-fit uppercase",
                                  variant:
                                    w.severity === "critical"
                                      ? "destructive"
                                      : "pending",
                                  children: w.severity,
                                }),
                                l.jsx("span", {
                                  className:
                                    "truncate font-black text-slate-800",
                                  title: w.vpsId,
                                  children: w.vpsId,
                                }),
                                l.jsx("span", {
                                  className: "min-w-0 text-slate-600",
                                  children: w.message,
                                }),
                                l.jsx("span", {
                                  className:
                                    "text-xs font-black text-slate-500",
                                  children: w.time,
                                }),
                                l.jsx(ee, {
                                  type: "button",
                                  variant: "outline",
                                  size: "sm",
                                  className:
                                    "w-fit rounded-xl text-xs font-bold",
                                  disabled: !0,
                                  title: "Coming soon",
                                  children: "View metric",
                                }),
                              ],
                            },
                            `${w.vpsId}-${w.message}`,
                          ),
                        ),
                      }),
                    ],
                  })
                : l.jsx("p", {
                    className: "mt-3 text-sm font-bold text-slate-500",
                    children: "No resource warnings from current metrics.",
                  }),
            ],
          }),
        ],
      }),
    ],
  });
}
function Pi(e, t) {
  return e.length ? [...e].sort((n, r) => r[t] - n[t])[0] : null;
}
function jo({ label: e, server: t, value: n, tone: r = "default" }) {
  return l.jsxs("div", {
    className: `min-w-0 rounded-xl border px-3.5 py-3 shadow-sm ${r === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-700"}`,
    children: [
      l.jsx("p", {
        className:
          "text-[11px] font-black uppercase tracking-[0.12em] opacity-75",
        children: e,
      }),
      l.jsx("p", {
        className: "mt-1 truncate text-xs font-bold opacity-70",
        title: t,
        children: t,
      }),
      l.jsx("p", {
        className: "mt-1 text-2xl font-black leading-none",
        children: n,
      }),
    ],
  });
}
function Dj({ metric: e, focus: t }) {
  const n = e.freshness === "stale",
    r = [
      e.cpu >= 85 ? "High CPU" : null,
      e.memory >= 80 ? "Memory pressure" : null,
      e.disk >= 85 ? "Disk near limit" : null,
      n ? "Stale telemetry" : null,
    ].filter(Boolean);
  return l.jsxs("article", {
    className: `grid min-w-0 gap-3 rounded-xl border p-4 shadow-sm xl:grid-cols-[minmax(220px,1fr)_minmax(360px,1.4fr)_auto] xl:items-center ${n ? "border-amber-200 bg-amber-50/60 ring-1 ring-amber-100" : "border-slate-200 bg-white"}`,
    children: [
      l.jsxs("div", {
        className: "min-w-0",
        children: [
          l.jsxs("div", {
            className: "flex flex-wrap items-center gap-2",
            children: [
              l.jsx("strong", {
                className: "truncate text-lg font-black text-slate-950",
                children: e.vpsId,
              }),
              l.jsx(Pe, {
                className: "uppercase",
                variant: Oa(e.freshness),
                children: e.freshness,
              }),
            ],
          }),
          l.jsxs("p", {
            className: "mt-1 text-sm font-bold text-slate-500",
            children: [
              "Collected ",
              _t(e.collectedAt),
              " · Uptime",
              " ",
              Nx(e.uptime),
            ],
          }),
          r.length
            ? l.jsx("p", {
                className:
                  "mt-2 text-xs font-black uppercase tracking-[0.08em] text-amber-700",
                children: r.join(" · "),
              })
            : null,
        ],
      }),
      l.jsxs("div", {
        className: "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5",
        children: [
          l.jsx(Ro, {
            label: "CPU",
            value: `${e.cpu}%`,
            hot: e.cpu >= 85 || t === "cpu",
          }),
          l.jsx(Ro, {
            label: "RAM",
            value: `${e.memory}%`,
            hot: e.memory >= 80 || t === "memory",
          }),
          l.jsx(Ro, {
            label: "Disk",
            value: `${e.disk}%`,
            hot: e.disk >= 85 || t === "disk",
          }),
          l.jsx(Ro, {
            label: "Load",
            value: String(e.loadAverage),
            hot: t === "load",
          }),
          l.jsx(Ro, {
            label: "Net",
            value: `${Zl(e.networkRx)}/${Zl(e.networkTx)}`,
            hot: t === "network",
          }),
        ],
      }),
      l.jsxs("div", {
        className: "flex flex-wrap gap-2 xl:justify-end",
        children: [
          l.jsx(ee, {
            type: "button",
            variant: "outline",
            size: "sm",
            className: "rounded-xl text-xs font-bold",
            disabled: !0,
            title: "Coming soon",
            children: "View details",
          }),
          l.jsx(ee, {
            type: "button",
            variant: "outline",
            size: "sm",
            className: "rounded-xl text-xs font-bold",
            disabled: !0,
            title: "Coming soon",
            children: "Open server",
          }),
        ],
      }),
    ],
  });
}
function Ro({ label: e, value: t, hot: n = !1 }) {
  return l.jsxs("div", {
    className: `min-w-0 rounded-lg border px-3 py-2 ${n ? "border-cyan-200 bg-cyan-50 text-cyan-900" : "border-slate-200 bg-slate-50 text-slate-700"}`,
    children: [
      l.jsx("p", {
        className:
          "text-[10px] font-black uppercase tracking-[0.1em] opacity-70",
        children: e,
      }),
      l.jsx("p", {
        className: "mt-0.5 truncate text-sm font-black",
        title: t,
        children: t,
      }),
    ],
  });
}
function rl({ metric: e, label: t, unit: n }) {
  if (!(e != null && e.trend))
    return l.jsxs("div", {
      className:
        "rounded-lg border border-dashed border-slate-200 bg-white p-3 text-sm font-bold text-slate-400",
      children: [t, ": no trend"],
    });
  const r = e.trend.points,
    o = Math.max(...r, 1),
    s = r
      .map(
        (i, c) =>
          `${(c / Math.max(r.length - 1, 1)) * 100},${48 - (i / o) * 38}`,
      )
      .join(" "),
    a = 48 - (e.trend.threshold / Math.max(o, e.trend.threshold)) * 38;
  return l.jsxs("div", {
    className: "rounded-lg border border-slate-200 bg-white p-3 shadow-sm",
    children: [
      l.jsxs("div", {
        className: "flex items-start justify-between gap-3",
        children: [
          l.jsxs("div", {
            children: [
              l.jsx("p", {
                className:
                  "text-xs font-black uppercase tracking-[0.1em] text-slate-500",
                children: t,
              }),
              l.jsxs("p", {
                className: "mt-1 text-sm font-bold text-slate-500",
                children: [e.vpsId, " · ", e.trend.range],
              }),
            ],
          }),
          l.jsxs("div", {
            className: "text-right text-xs font-black text-slate-500",
            children: [
              l.jsxs("p", { children: ["max ", e.trend.max, n] }),
              l.jsxs("p", { children: ["min ", e.trend.min, n] }),
            ],
          }),
        ],
      }),
      l.jsxs("svg", {
        className: "mt-3 h-28 w-full overflow-visible",
        viewBox: "0 0 100 56",
        preserveAspectRatio: "none",
        "aria-hidden": "true",
        children: [
          l.jsx("line", {
            x1: "0",
            x2: "100",
            y1: a,
            y2: a,
            stroke: "#f97316",
            strokeDasharray: "4 4",
            strokeWidth: "1.5",
          }),
          l.jsx("polyline", {
            points: s,
            fill: "none",
            stroke: "#06b6d4",
            strokeWidth: "3",
            strokeLinecap: "round",
            strokeLinejoin: "round",
          }),
          l.jsx("line", {
            x1: "0",
            x2: "100",
            y1: "50",
            y2: "50",
            stroke: "#e2e8f0",
          }),
        ],
      }),
      l.jsxs("div", {
        className:
          "mt-1 flex justify-between text-[10px] font-black uppercase tracking-[0.08em] text-slate-400",
        children: [
          l.jsx("span", { children: e.trend.range }),
          l.jsx("span", { children: "30m" }),
          l.jsx("span", { children: "15m" }),
          l.jsx("span", { children: "now" }),
        ],
      }),
    ],
  });
}
function Oj(e) {
  return e.flatMap((t) =>
    [
      t.freshness === "stale"
        ? {
            vpsId: t.vpsId,
            severity: "stale",
            message: "Telemetry is stale",
            time: _t(t.collectedAt),
          }
        : null,
      t.memory >= 80
        ? {
            vpsId: t.vpsId,
            severity: "critical",
            message: `Memory pressure at ${t.memory}%`,
            time: _t(t.collectedAt),
          }
        : t.memory >= 75
          ? {
              vpsId: t.vpsId,
              severity: "warning",
              message: `Memory nearing threshold at ${t.memory}%`,
              time: _t(t.collectedAt),
            }
          : null,
      t.disk >= 85
        ? {
            vpsId: t.vpsId,
            severity: "critical",
            message: `Disk near limit at ${t.disk}%`,
            time: _t(t.collectedAt),
          }
        : t.disk >= 75
          ? {
              vpsId: t.vpsId,
              severity: "warning",
              message: `Disk usage warning at ${t.disk}%`,
              time: _t(t.collectedAt),
            }
          : null,
      t.cpu >= 85
        ? {
            vpsId: t.vpsId,
            severity: "critical",
            message: `High CPU at ${t.cpu}%`,
            time: _t(t.collectedAt),
          }
        : null,
    ].filter(Boolean),
  );
}
const Dp = [
  "uptime",
  "df -h",
  "free -m",
  "systemctl status nginx",
  "journalctl -n 20",
];
function Ij({ terminal: e }) {
  var c;
  const t = ((c = e.sessions[0]) == null ? void 0 : c.command) || Dp[0],
    n = e.commands.length ? e.commands : Dp,
    r = "Not tracked",
    o = "Not tracked",
    s = e.sessions.length ? "Recorded" : "Not tracked",
    a = "Not available",
    i = e.sessions.length ? "connected · recorded output" : "idle · no output";
  return l.jsxs("div", {
    className: "grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]",
    children: [
      l.jsxs(at, {
        className:
          "min-w-0 overflow-hidden border-slate-800 bg-[#020617] text-slate-100 shadow-2xl shadow-slate-950/20",
        children: [
          l.jsx(vt, {
            className: "border-b border-slate-800 bg-[#0f172a]",
            children: l.jsxs("div", {
              className:
                "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between",
              children: [
                l.jsxs("div", {
                  className: "min-w-0",
                  children: [
                    l.jsxs("div", {
                      className:
                        "mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300",
                      children: [
                        l.jsx(ls, { size: 14 }),
                        " Read-only whitelist",
                      ],
                    }),
                    l.jsxs(xt, {
                      className:
                        "flex items-center gap-2 font-mono text-xl text-white",
                      children: [
                        l.jsx(zu, { className: "text-cyan-300", size: 22 }),
                        e.label,
                      ],
                    }),
                    l.jsxs(Tt, {
                      className: "mt-2 max-w-2xl text-slate-400",
                      children: [
                        "Safe commands only: ",
                        n.join(", "),
                        ". No stored password and no write, restart, install, or shell escape access.",
                      ],
                    }),
                  ],
                }),
                l.jsxs("div", {
                  className:
                    "rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 font-mono text-xs text-slate-300",
                  children: [
                    l.jsx("p", {
                      className: "text-slate-500",
                      children: "session",
                    }),
                    l.jsx("p", {
                      className: "mt-1 text-emerald-300",
                      children: i,
                    }),
                    l.jsx("p", {
                      className: "mt-1 text-slate-400",
                      children: "server metadata not tracked",
                    }),
                  ],
                }),
              ],
            }),
          }),
          l.jsxs(it, {
            className: "space-y-4 p-4 sm:p-5",
            children: [
              l.jsxs("div", {
                className:
                  "grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 lg:grid-cols-[13rem_minmax(0,1fr)_auto] lg:items-end",
                children: [
                  l.jsxs("label", {
                    className:
                      "grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500",
                    children: [
                      "Server",
                      l.jsxs("div", {
                        className:
                          "flex h-11 items-center gap-2 rounded-xl border border-slate-700 bg-[#020617] px-3 font-mono text-sm normal-case tracking-normal text-slate-100",
                        children: [
                          l.jsx(Xr, { size: 15, className: "text-cyan-300" }),
                          r,
                        ],
                      }),
                    ],
                  }),
                  l.jsxs("label", {
                    className:
                      "grid min-w-0 gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500",
                    children: [
                      "Command preset / input",
                      l.jsxs("div", {
                        className:
                          "flex h-11 min-w-0 items-center rounded-xl border border-slate-700 bg-[#020617] px-3 font-mono text-sm text-slate-100 ring-1 ring-cyan-300/10",
                        children: [
                          l.jsx("span", {
                            className: "mr-2 text-emerald-300",
                            children: "$",
                          }),
                          l.jsx("span", { className: "truncate", children: t }),
                        ],
                      }),
                    ],
                  }),
                  l.jsxs("div", {
                    className: "flex flex-wrap gap-2",
                    children: [
                      l.jsxs("button", {
                        className:
                          "inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-xl bg-cyan-800 px-4 text-sm font-black text-slate-400 opacity-60",
                        type: "button",
                        disabled: !0,
                        title: "Run is not available in read-only mode",
                        children: [l.jsx(Kb, { size: 15 }), " Run"],
                      }),
                      l.jsxs("button", {
                        className:
                          "inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-xl border border-slate-700 px-3 text-sm font-bold text-slate-500 opacity-60",
                        type: "button",
                        disabled: !0,
                        title:
                          "Output clearing is not available in read-only mode",
                        children: [l.jsx(ig, { size: 15 }), " Clear output"],
                      }),
                      l.jsxs("button", {
                        className:
                          "inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-xl border border-slate-700 px-3 text-sm font-bold text-slate-500 opacity-60",
                        type: "button",
                        disabled: !0,
                        title:
                          "Output copying is not available in read-only mode",
                        children: [l.jsx(Cc, { size: 15 }), " Copy output"],
                      }),
                    ],
                  }),
                ],
              }),
              l.jsx("div", {
                className: "flex flex-wrap gap-2",
                children: n.map((u) =>
                  l.jsx(
                    "span",
                    {
                      className:
                        "rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-300",
                      children: u,
                    },
                    u,
                  ),
                ),
              }),
              l.jsxs(na, {
                className:
                  "h-[34rem] max-w-full rounded-2xl border border-slate-800 bg-[#020617] shadow-inner",
                children: [
                  l.jsxs("div", {
                    className:
                      "flex items-center justify-between border-b border-slate-800 bg-[#0f172a] px-4 py-2 font-mono text-xs text-slate-400",
                    children: [
                      l.jsx("span", { children: "output.log" }),
                      l.jsxs("span", {
                        children: [
                          e.sessions.length,
                          " session",
                          e.sessions.length === 1 ? "" : "s",
                          " · no audit reference",
                        ],
                      }),
                    ],
                  }),
                  l.jsxs("pre", {
                    className:
                      "whitespace-pre-wrap break-words p-4 pr-5 font-mono text-[13px] leading-6 text-slate-300",
                    children: [
                      e.sessions
                        .map(
                          (u) => `$ ${u.command}
${u.output}

`,
                        )
                        .join(""),
                      l.jsx("span", {
                        className: "text-emerald-300",
                        children: "$",
                      }),
                      l.jsx("span", {
                        className: "text-slate-500",
                        children: " waiting for whitelisted command",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      l.jsxs("aside", {
        className: "grid gap-4",
        children: [
          l.jsxs(at, {
            className: "border-slate-200",
            children: [
              l.jsxs(vt, {
                children: [
                  l.jsxs(xt, {
                    className: "flex items-center gap-2 text-base",
                    children: [l.jsx(Mb, { size: 17 }), " Command history"],
                  }),
                  l.jsx(Tt, { children: "Recent read-only terminal runs." }),
                ],
              }),
              l.jsx(it, {
                className: "space-y-2",
                children: n
                  .slice(0, 5)
                  .map((u) =>
                    l.jsxs(
                      "div",
                      {
                        className:
                          "rounded-xl bg-slate-100 p-3 font-mono text-xs text-slate-700",
                        children: ["$ ", u],
                      },
                      u,
                    ),
                  ),
              }),
            ],
          }),
          l.jsxs(at, {
            className: "border-emerald-200 bg-emerald-50",
            children: [
              l.jsxs(vt, {
                children: [
                  l.jsxs(xt, {
                    className:
                      "flex items-center gap-2 text-base text-emerald-950",
                    children: [l.jsx(Wf, { size: 17 }), " Audit trail"],
                  }),
                  l.jsx(Tt, {
                    className: "text-emerald-800/75",
                    children: "Session metadata is not tracked in this view.",
                  }),
                ],
              }),
              l.jsxs(it, {
                className: "space-y-3 text-sm text-emerald-950",
                children: [
                  l.jsx(ol, {
                    icon: l.jsx(Xr, { size: 15 }),
                    label: "Server",
                    value: r,
                  }),
                  l.jsx(ol, {
                    icon: l.jsx(ab, { size: 15 }),
                    label: "Actor",
                    value: o,
                  }),
                  l.jsx(ol, {
                    icon: l.jsx(sg, { size: 15 }),
                    label: "Duration",
                    value: s,
                  }),
                  l.jsx(ol, {
                    icon: l.jsx(Wf, { size: 15 }),
                    label: "Request id",
                    value: a,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
function ol({ icon: e, label: t, value: n }) {
  return l.jsxs("div", {
    className:
      "flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2",
    children: [
      l.jsxs("span", {
        className: "inline-flex items-center gap-2 font-bold text-emerald-800",
        children: [e, t],
      }),
      l.jsx("span", { className: "truncate font-mono text-xs", children: n }),
    ],
  });
}
function Lj({ overview: e }) {
  return l.jsxs("div", {
    className: "grid gap-4",
    children: [
      l.jsxs(at, {
        children: [
          l.jsxs(vt, {
            children: [
              l.jsx(xt, { children: "Settings" }),
              l.jsx(Tt, { children: "Runtime safety posture." }),
            ],
          }),
          l.jsxs(it, {
            className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
            children: [
              l.jsxs(Pe, {
                variant: "outline",
                children: ["APP_MODE=", e.settings.appMode],
              }),
              l.jsxs(Pe, {
                variant: "outline",
                children: [
                  "web terminal",
                  " ",
                  e.settings.webTerminalEnabled ? "enabled" : "disabled",
                ],
              }),
              l.jsxs(Pe, {
                variant: "outline",
                children: [
                  "real SSH ",
                  e.settings.realSshEnabled ? "enabled" : "disabled",
                ],
              }),
              l.jsxs(Pe, {
                variant: "outline",
                children: [
                  "local auth",
                  " ",
                  e.settings.authRequiredInLocalMode ? "required" : "off",
                ],
              }),
            ],
          }),
        ],
      }),
      l.jsxs(at, {
        children: [
          l.jsxs(vt, {
            children: [
              l.jsx(xt, { children: "Dashboard access" }),
              l.jsx(Tt, {
                children:
                  "Local mode uses a secure HttpOnly cookie session. Dashboard passwords are verified server-side against the stored credential and are never saved in browser storage.",
              }),
            ],
          }),
          l.jsx(it, {
            children: l.jsx("p", {
              className:
                "text-sm font-semibold leading-6 text-muted-foreground",
              children:
                "Use the account menu in the top bar to log out and revoke the current session.",
            }),
          }),
        ],
      }),
    ],
  });
}
const $j = 45e3;
async function tt(e, t = {}) {
  var i;
  const n = new Headers(t.headers);
  t.body && !n.has("Content-Type") && n.set("Content-Type", "application/json");
  const r = new AbortController(),
    o = setTimeout(() => r.abort(), $j);
  let s;
  try {
    s = await fetch(e, {
      ...t,
      credentials: t.credentials || "same-origin",
      headers: n,
      signal: t.signal || r.signal,
    });
  } catch (c) {
    throw c instanceof DOMException && c.name === "AbortError"
      ? new Error("Request timed out. Check backend connectivity and retry.")
      : c;
  } finally {
    clearTimeout(o);
  }
  if (s.status === 204) return null;
  const a = await s.json().catch(() => ({}));
  if (!s.ok)
    throw new Error(
      ((i = a.error) == null ? void 0 : i.message) || "Request failed",
    );
  return a.data;
}
function zj() {
  return tt("/api/auth/me");
}
function Fj(e) {
  return tt("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ password: e }),
  });
}
function Bj() {
  return tt("/api/auth/logout", { method: "POST" });
}
function Uj() {
  return tt("/api/vps");
}
function Wj() {
  return tt("/api/dashboard");
}
function Vj() {
  return tt("/api/jobs");
}
function Hj() {
  return tt("/api/metrics");
}
function Kj() {
  return tt("/api/audit");
}
function Gj(e) {
  return tt("/api/vps", { method: "POST", body: JSON.stringify(e) });
}
function Yj(e, t) {
  return tt(`/api/vps/${e}`, { method: "PATCH", body: JSON.stringify(t) });
}
function Op(e, t) {
  return tt(`/api/vps/${e}/provision-key`, {
    method: "POST",
    body: JSON.stringify({ password: t }),
  });
}
function Xj(e) {
  return tt(`/api/vps/${e}/verify-key`, { method: "POST" });
}
function Qj(e, t) {
  return tt(`/api/vps/${e}/install-agent`, {
    method: "POST",
    body: JSON.stringify(t ? { password: t } : {}),
  });
}
function qj(e) {
  return tt(`/api/vps/${e}`, { method: "DELETE" });
}
function Jj(e) {
  let t = null,
    n = 0;
  function r() {
    var o;
    (t && t.close(),
      (o = e.onConnectionChange) == null || o.call(e, { status: "connecting" }),
      (t = new EventSource("/api/monitoring/stream")),
      t.addEventListener("monitoring.hello", (s) => {
        var a, i;
        try {
          const c = JSON.parse(s.data);
          if (c.schemaVersion !== 1) return;
          ((a = e.onHello) == null || a.call(e, c.payload),
            (i = e.onConnectionChange) == null ||
              i.call(e, { status: "live", latestEventAt: c.emittedAt }),
            (n = 0));
        } catch {}
      }),
      t.addEventListener("monitoring.snapshot", (s) => {
        var a, i;
        try {
          const c = JSON.parse(s.data);
          if (c.schemaVersion !== 1) return;
          ((a = e.onSnapshot) == null || a.call(e, c.payload),
            (i = e.onConnectionChange) == null ||
              i.call(e, { status: "live", latestEventAt: c.emittedAt }),
            (n = 0));
        } catch {}
      }),
      t.addEventListener("metrics.updated", (s) => {
        var a, i;
        try {
          const c = JSON.parse(s.data);
          if (c.schemaVersion !== 1) return;
          ((a = e.onMetricsUpdated) == null || a.call(e, c.payload),
            (i = e.onConnectionChange) == null ||
              i.call(e, { status: "live", latestEventAt: c.emittedAt }),
            (n = 0));
        } catch {}
      }),
      t.addEventListener("monitoring.heartbeat", (s) => {
        var a, i;
        try {
          const c = JSON.parse(s.data);
          if (c.schemaVersion !== 1) return;
          ((a = e.onHeartbeat) == null || a.call(e, c.payload),
            (i = e.onConnectionChange) == null ||
              i.call(e, { status: "live", latestEventAt: c.emittedAt }),
            (n = 0));
        } catch {}
      }),
      t.addEventListener("monitoring.error", (s) => {
        var a, i;
        try {
          const c = JSON.parse(s.data);
          if (c.schemaVersion !== 1) return;
          ((a = e.onError) == null || a.call(e, c.payload),
            (i = e.onConnectionChange) == null ||
              i.call(e, { status: "stale", latestEventAt: c.emittedAt }));
        } catch {}
      }),
      (t.onerror = () => {
        var s, a;
        (n++,
          n <= 1
            ? (s = e.onConnectionChange) == null ||
              s.call(e, { status: "reconnecting" })
            : (a = e.onConnectionChange) == null ||
              a.call(e, { status: "stale" }));
      }));
  }
  return (
    r(),
    () => {
      t && (t.close(), (t = null));
    }
  );
}
const Ip = { name: "", host: "", port: "22", username: "", password: "" },
  Cx = {
    overview: "/overview",
    servers: "/servers",
    jobs: "/jobs",
    metrics: "/metrics",
    audit: "/audit",
    terminal: "/terminal",
    settings: "/settings",
  },
  Zj = Object.fromEntries(Object.entries(Cx).map(([e, t]) => [t, e]));
function Lp(e) {
  return e === "/" ? "overview" : Zj[e] || "overview";
}
function eR(e, t) {
  const n = new Map(t.map((s) => [s.vpsId, s])),
    r = new Set(),
    o = e.map((s) => {
      const a = n.get(s.vpsId);
      return a ? (r.add(s.vpsId), a) : s;
    });
  for (const s of t) r.has(s.vpsId) || (o.push(s), r.add(s.vpsId));
  return o;
}
function tR(e) {
  return e.kind === "local" || e.managedBy === "system";
}
const $p = {
  mode: "local",
  summary: {
    totalServers: 0,
    healthyServers: 0,
    warningServers: 0,
    unreachableServers: 0,
    runningJobs: 0,
  },
  servers: [],
  metrics: [],
  systemInfo: [],
  dockerMetrics: [],
  jobs: [],
  auditEvents: [],
  terminal: {
    label: "Terminal",
    networkAccess: "disabled",
    commands: [],
    sessions: [],
  },
  settings: {
    appMode: "local",
    webTerminalEnabled: !1,
    realSshEnabled: !1,
    authRequiredInLocalMode: !0,
  },
};
function nR() {
  const [e, t] = p.useState([]),
    [n, r] = p.useState($p),
    [o, s] = p.useState(Ip),
    [a, i] = p.useState({}),
    [c, u] = p.useState(""),
    [d, f] = p.useState("all"),
    [m, y] = p.useState(() => Lp(window.location.pathname)),
    [w, x] = p.useState(!1),
    [k, h] = p.useState({ message: "Loading VPS list...", kind: "default" }),
    [g, v] = p.useState({ status: "checking" }),
    [b, S] = p.useState(""),
    [C, N] = p.useState(!1),
    [E, j] = p.useState({ status: "connecting" }),
    R = p.useRef(null);
  async function M(O = "VPS list refreshed.") {
    const [L, U, te, Fe, Re] = await Promise.all([
      Wj(),
      Uj(),
      Vj(),
      Hj(),
      Kj(),
    ]);
    (r({
      ...L,
      servers: U,
      jobs: te,
      metrics: Fe,
      systemInfo: L.systemInfo ?? [],
      dockerMetrics: L.dockerMetrics ?? [],
      auditEvents: Re,
      summary: {
        ...L.summary,
        totalServers: U.length,
        healthyServers: U.filter((Ae) => Ae.status === "healthy").length,
        warningServers: U.filter((Ae) => Ae.status === "warning").length,
        unreachableServers: U.filter((Ae) => Ae.status === "unreachable")
          .length,
        runningJobs: te.filter((Ae) => Ae.status === "running").length,
      },
    }),
      t(U),
      h({ message: O, kind: "success" }));
  }
  async function T(O, L) {
    if (!w) {
      (x(!0), h({ message: O, kind: "default" }));
      try {
        (await L(), await M("Dashboard state synced."));
      } catch (U) {
        h({
          message: U instanceof Error ? U.message : "Request failed",
          kind: "destructive",
        });
      } finally {
        x(!1);
      }
    }
  }
  (p.useEffect(() => {
    let O = !1;
    return (
      zj()
        .then(async (L) => {
          if (!O) {
            if (!L.authRequired || L.authenticated) {
              (v({
                status: "open",
                mode: L.mode,
                authRequired: L.authRequired,
              }),
                await M());
              return;
            }
            (v({ status: "locked", mode: L.mode }),
              h({ message: "Dashboard password required.", kind: "default" }));
          }
        })
        .catch((L) => {
          O ||
            v({
              status: "locked",
              mode: "local",
              message:
                L instanceof Error
                  ? L.message
                  : "Unable to verify dashboard access.",
            });
        }),
      () => {
        O = !0;
      }
    );
  }, []),
    p.useEffect(() => {
      if (g.status !== "open") return;
      const O = Jj({
        onSnapshot: (L) => {
          (r((U) => ({
            ...U,
            ...L.overview,
            servers: L.servers,
            jobs: L.jobs,
            metrics: L.metrics,
            systemInfo: L.overview.systemInfo ?? [],
            dockerMetrics: L.overview.dockerMetrics ?? [],
            auditEvents: L.auditEvents,
          })),
            t(L.servers));
        },
        onMetricsUpdated: (L) => {
          r((U) => {
            const te = eR(U.metrics, L.metrics),
              Fe =
                L.dockerMetrics !== void 0
                  ? L.dockerMetrics
                  : (U.dockerMetrics ?? []);
            return {
              ...U,
              metrics: te,
              dockerMetrics: Fe,
              systemInfo: L.systemInfo ?? U.systemInfo,
            };
          });
        },
        onHeartbeat: (L) => {},
        onError: (L) => {
          j({ status: "stale", latestEventAt: void 0 });
        },
        onConnectionChange: (L) => {
          j(L);
        },
      });
      return (
        (R.current = O),
        () => {
          (O(), (R.current = null));
        }
      );
    }, [g.status]),
    p.useEffect(() => {
      function O() {
        y(Lp(window.location.pathname));
      }
      return (
        window.addEventListener("popstate", O),
        () => window.removeEventListener("popstate", O)
      );
    }, []));
  function D(O) {
    y(O);
    const L = Cx[O];
    window.location.pathname !== L && window.history.pushState({}, "", L);
  }
  async function B(O) {
    O.preventDefault();
    const L = b.trim();
    if (!L) {
      v({
        status: "locked",
        mode: "local",
        message: "Enter the dashboard password to continue.",
      });
      return;
    }
    N(!0);
    try {
      const U = await Fj(L);
      (S(""),
        v({ status: "open", mode: U.mode, authRequired: U.authRequired }),
        await M("Access verified. Dashboard loaded."));
    } catch (U) {
      v({
        status: "locked",
        mode: "local",
        message:
          U instanceof Error
            ? U.message
            : "Login failed. Check the password and try again.",
      });
    } finally {
      N(!1);
    }
  }
  async function Q() {
    var O;
    ((O = R.current) == null || O.call(R),
      (R.current = null),
      j({ status: "connecting" }));
    try {
      await Bj();
    } finally {
      (t([]),
        r($p),
        v({ status: "locked", mode: "local" }),
        h({
          message: "Signed out. Enter the dashboard password to return.",
          kind: "default",
        }));
    }
  }
  async function F(O) {
    O.preventDefault();
    const L = o.password,
      U = {
        name: o.name.trim(),
        host: o.host.trim(),
        port: Number(o.port || 22),
        username: o.username.trim(),
      };
    await T("Creating VPS...", async () => {
      const te = await Gj(U);
      (L
        ? (h({
            message: `Created ${te.name}. Installing SSH key...`,
            kind: "default",
          }),
          await Op(te.id, L),
          h({
            message: `Created VPS and installed key for ${te.name}. Password was not stored.`,
            kind: "success",
          }))
        : h({
            message: `Created VPS ${te.name}. You can install the key from the list.`,
            kind: "success",
          }),
        s(Ip));
    });
  }
  async function K(O) {
    const L = a[O.id] || "";
    if (!L) {
      h({
        message: "Enter the one-time password to install the SSH key.",
        kind: "destructive",
      });
      return;
    }
    await T(`Installing key for ${O.name}...`, async () => {
      (await Op(O.id, L),
        i((U) => ({ ...U, [O.id]: "" })),
        h({
          message: `Installed SSH key for ${O.name}. Password was not stored.`,
          kind: "success",
        }));
    });
  }
  async function _(O) {
    await T(`Verifying key for ${O.name}...`, async () => {
      (await Xj(O.id),
        h({ message: `Key verified for ${O.name}.`, kind: "success" }));
    });
  }
  async function P(O) {
    const L = a[O.id] || "";
    await T(`Starting agent install for ${O.name}...`, async () => {
      const U = await Qj(O.id, L || void 0);
      (L && i((te) => ({ ...te, [O.id]: "" })),
        h({
          message: `Agent install queued for ${O.name}. Job ${U.jobId} is running in the background.`,
          kind: "success",
        }));
    });
  }
  async function I(O) {
    const L = !O.dockerMetricsEnabled;
    (L &&
      !window.confirm(
        "Enable Docker metrics for this server? The agent will collect container names, images, status, and resource usage. It will not collect env vars, labels, mounts, logs, or commands.",
      )) ||
      (await T(
        `${L ? "Enabling" : "Disabling"} Docker metrics for ${O.name}...`,
        async () => {
          (await Yj(O.id, { dockerMetricsEnabled: L }),
            h({
              message: `Docker metrics ${L ? "enabled" : "disabled"} for ${O.name}.`,
              kind: "success",
            }));
        },
      ));
  }
  async function V(O) {
    await T(`Deleting ${O.name}...`, async () => {
      (await qj(O.id), h({ message: `Deleted ${O.name}.`, kind: "success" }));
    });
  }
  const J = e.filter((O) => {
      const U = [
          O.name,
          O.host,
          O.username,
          O.provider,
          O.region,
          O.notes,
          ...(O.tags || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(c.trim().toLowerCase()),
        te = tR(O) || O.keyProvisionedAt ? "ready" : "pending";
      return U && (d === "all" || O.status === d || te === d);
    }),
    Ne = l.jsx(ya, {
      variant: k.kind,
      className: "rounded-xl px-3 py-2 text-sm font-semibold",
      children: k.message,
    });
  return g.status === "checking"
    ? l.jsx(rR, {})
    : g.status === "locked"
      ? l.jsx(oR, {
          password: b,
          busy: C,
          message: g.message,
          onPasswordChange: S,
          onSubmit: B,
        })
      : l.jsxs(oE, {
          activeView: m,
          onViewChange: D,
          mode: n.mode,
          busy: w,
          liveState: E,
          onRefresh: () => T("Refreshing VPS list...", () => M()),
          onLogout: g.authRequired ? Q : void 0,
          children: [
            m === "overview" ? l.jsx(sj, { overview: n }) : null,
            m === "servers"
              ? l.jsx(kj, {
                  records: e,
                  visibleRecords: J,
                  statusMessage: Ne,
                  serverSearch: c,
                  statusFilter: d,
                  busy: w,
                  provisionPasswords: a,
                  createForm: o,
                  metrics: n.metrics,
                  systemInfo: n.systemInfo,
                  dockerMetrics: n.dockerMetrics,
                  jobs: n.jobs,
                  onSearchChange: u,
                  onStatusFilterChange: f,
                  onCreateFormChange: s,
                  onCreate: F,
                  onPasswordChange: (O, L) => i((U) => ({ ...U, [O]: L })),
                  onProvision: K,
                  onVerify: _,
                  onInstallAgent: P,
                  onToggleDockerMetrics: I,
                  onDelete: V,
                })
              : null,
            m === "jobs" ? l.jsx(ex, { jobs: n.jobs }) : null,
            m === "metrics" ? l.jsx(Tj, { metrics: n.metrics }) : null,
            m === "audit" ? l.jsx(Z0, { events: n.auditEvents }) : null,
            m === "terminal" ? l.jsx(Ij, { terminal: n.terminal }) : null,
            m === "settings" ? l.jsx(Lj, { overview: n }) : null,
          ],
        });
}
function rR() {
  return l.jsx("main", {
    className: "grid min-h-screen place-items-center bg-[#0d0e12] text-white",
    children: l.jsx("div", {
      className:
        "rounded-xl border border-white/10 bg-white/[0.06] px-6 py-5 font-semibold shadow-[0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur",
      children: "Checking dashboard access...",
    }),
  });
}
function oR({
  password: e,
  busy: t,
  message: n,
  onPasswordChange: r,
  onSubmit: o,
}) {
  return l.jsxs("main", {
    className:
      "relative grid min-h-screen overflow-hidden bg-[#0d0e12] px-4 py-8 text-white",
    children: [
      l.jsx("div", {
        className:
          "absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(132,79,186,0.34),transparent_28%),radial-gradient(circle_at_90%_4%,rgba(21,149,136,0.22),transparent_28%)]",
      }),
      l.jsx("div", {
        className:
          "absolute inset-0 opacity-[0.12] [background-image:linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:42px_42px]",
      }),
      l.jsxs("section", {
        className:
          "relative m-auto w-full max-w-md rounded-xl border border-white/12 bg-[#15181e]/90 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8",
        children: [
          l.jsxs("div", {
            className: "mb-6",
            children: [
              l.jsx("p", {
                className:
                  "text-xs font-black uppercase tracking-[0.24em] text-[#ffb000]",
                children: "Secure local console",
              }),
              l.jsx("h1", {
                className:
                  "mt-2 font-display text-4xl font-extrabold leading-tight tracking-[-0.05em]",
                children: "Unlock VPS Ops",
              }),
              l.jsx("p", {
                className: "mt-3 text-sm font-semibold leading-6 text-white/70",
                children:
                  "Enter the dashboard password. The password is verified server-side against the stored credential and is never stored in browser storage.",
              }),
            ],
          }),
          l.jsxs("form", {
            className: "grid gap-4",
            onSubmit: o,
            children: [
              l.jsxs("div", {
                className: "grid gap-2",
                children: [
                  l.jsx(_n, {
                    htmlFor: "dashboard-password",
                    className: "text-white",
                    children: "Dashboard password",
                  }),
                  l.jsx(Pt, {
                    id: "dashboard-password",
                    type: "password",
                    autoComplete: "current-password",
                    value: e,
                    onChange: (s) => r(s.target.value),
                    className:
                      "h-12 rounded-md border-white/15 bg-[#0d0e12]/75 text-white placeholder:text-white/40",
                    placeholder: "Enter password",
                    autoFocus: !0,
                  }),
                ],
              }),
              n
                ? l.jsx(ya, {
                    variant: "destructive",
                    className: "rounded-xl px-3 py-2 text-sm font-semibold",
                    children: n,
                  })
                : null,
              l.jsx(ee, {
                type: "submit",
                disabled: t,
                className:
                  "h-12 rounded-md bg-[#844fba] font-black text-white hover:bg-[#6f43a0]",
                children: t ? "Verifying..." : "Enter dashboard",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
Mi.createRoot(document.getElementById("root")).render(
  l.jsx($.StrictMode, { children: l.jsx(nR, {}) }),
);
