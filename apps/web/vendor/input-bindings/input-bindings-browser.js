//#region ../input-bindings/dist/index.js
var e = { op: "always" };
function t(e) {
	return "key" in e;
}
function n(e) {
	return t(e) ? "keyboard" : e.device === "mouseButton" || e.device === "wheel" ? "mouse" : e.device === "gesture" ? "pointer" : "gamepad";
}
function r(e) {
	return !t(e) && e.device === "gesture";
}
function i(e) {
	switch (e.kind) {
		case "tap":
		case "hold": return e.kind;
		case "drag":
		case "swipe":
		case "slash":
		case "pinch":
		case "twoFingerSwipe": return [e.kind, e.direction ?? "any"].join(":");
		case "circle":
		case "rotate": return [e.kind, e.orientation ?? "any"].join(":");
		case "symbol": return [e.kind, e.id].join(":");
	}
}
function a(e, t) {
	return i(e) === i(t);
}
function o(e) {
	if (t(e)) return [
		"keyboard",
		e.key.kind,
		e.key.value
	].join(":");
	switch (e.device) {
		case "mouseButton": return ["mouseButton", e.button].join(":");
		case "wheel": return ["wheel", e.direction].join(":");
		case "gamepadButton": return [
			"gamepadButton",
			e.gamepad ?? "any",
			e.button,
			e.threshold
		].join(":");
		case "gamepadAxis": return [
			"gamepadAxis",
			e.gamepad ?? "any",
			e.axis,
			e.direction,
			e.threshold,
			e.deadzone
		].join(":");
		case "gesture": return ["gesture", i(e.gesture)].join(":");
	}
}
function s(t, n) {
	let r = t ?? e;
	switch (r.op) {
		case "always": return !0;
		case "context": return n.has(r.id);
		case "not": return !s(r.expr, n);
		case "all": return r.exprs.every((e) => s(e, n));
		case "any": return r.exprs.some((e) => s(e, n));
	}
}
function c(t) {
	let n = t ?? e;
	switch (n.op) {
		case "always": return 0;
		case "context": return 1;
		case "not": return c(n.expr);
		case "all": return n.exprs.reduce((e, t) => e + c(t), 0);
		case "any": return n.exprs.length === 0 ? 0 : Math.min(...n.exprs.map((e) => c(e)));
	}
}
function l(e, t, n) {
	if (t.length === 0) return { kind: "none" };
	let r = [], i = [];
	for (let a of e) !s(a.when, n) || t.length > a.sequence.length || t.every((e, t) => a.sequence[t] !== void 0 && _(e, a.sequence[t])) && (t.length === a.sequence.length ? r.push(a) : i.push(a));
	if (i.length > 0) return {
		kind: "pending",
		exactBindingIds: r.map((e) => e.id).sort(),
		continuationBindingIds: i.map((e) => e.id).sort()
	};
	if (r.length === 0) return { kind: "none" };
	let a = r.map(b).sort(ee)[0];
	if (!a) return { kind: "none" };
	let o = r.filter((e) => x(b(e), a)).sort((e, t) => e.id.localeCompare(t.id));
	if (new Set(o.map((e) => e.action)).size > 1) return {
		kind: "ambiguous",
		bindingIds: o.map((e) => e.id)
	};
	let c = o[0];
	return c ? {
		kind: "resolved",
		bindingId: c.id,
		action: c.action
	} : { kind: "none" };
}
function u(e) {
	let t = [];
	for (let [n, r] of d(e)) {
		let i = e[n], a = e[r];
		if (!i || !a) throw Error("Conflict candidate index is outside the binding registry.");
		let o = te(i.sequence, a.sequence);
		if (o === "separate") continue;
		let s = ne(i.when, a.when);
		if (s.kind === "disjoint") continue;
		let c;
		c = s.kind === "unknown" ? o === "exact" ? "potentialExact" : "potentialPrefix" : o === "prefix" ? "chordPrefix" : i.action === a.action && re(i.when, a.when) && (i.priority ?? 0) === (a.priority ?? 0) ? "duplicate" : x(b(i), b(a)) ? "ambiguousExact" : "overrideExact";
		let l = {
			leftBindingId: i.id,
			rightBindingId: a.id,
			kind: c
		};
		s.kind === "overlap" && s.witnessContexts.length > 0 && (l.witnessContexts = s.witnessContexts), t.push(l);
	}
	return t;
}
function d(e) {
	let t = m(), n = [];
	return e.forEach((e, r) => {
		for (let i of f(t, e.sequence)) n.push([i, r]);
		p(t, e.sequence, r);
	}), n.sort(([e, t], [n, r]) => e - n || t - r), n;
}
function f(e, t) {
	let n = /* @__PURE__ */ new Set(), r = e;
	if (t.length === 0) {
		for (let t of e.subtreeIndices) n.add(t);
		return n;
	}
	for (let t of e.terminalIndices) n.add(t);
	for (let [e, i] of t.entries()) {
		let a = r.children.get(h(i));
		if (!a) return n;
		r = a;
		let o = e === t.length - 1 ? r.subtreeIndices : r.terminalIndices;
		for (let e of o) n.add(e);
	}
	return n;
}
function p(e, t, n) {
	let r = e;
	r.subtreeIndices.push(n);
	for (let e of t) {
		let t = h(e), i = r.children.get(t);
		i || (i = m(), r.children.set(t, i)), r = i, r.subtreeIndices.push(n);
	}
	r.terminalIndices.push(n);
}
function m() {
	return {
		children: /* @__PURE__ */ new Map(),
		terminalIndices: [],
		subtreeIndices: []
	};
}
function h(e) {
	if (t(e)) return JSON.stringify([
		"keyboard",
		e.key.kind,
		e.key.value,
		!!e.modifiers?.ctrl,
		!!e.modifiers?.alt,
		!!e.modifiers?.shift,
		!!e.modifiers?.meta,
		!!e.modifiers?.altGraph
	]);
	switch (e.device) {
		case "mouseButton": return JSON.stringify([
			"mouseButton",
			e.button,
			!!e.modifiers?.ctrl,
			!!e.modifiers?.alt,
			!!e.modifiers?.shift,
			!!e.modifiers?.meta,
			!!e.modifiers?.altGraph
		]);
		case "wheel": return JSON.stringify([
			"wheel",
			e.direction,
			!!e.modifiers?.ctrl,
			!!e.modifiers?.alt,
			!!e.modifiers?.shift,
			!!e.modifiers?.meta,
			!!e.modifiers?.altGraph
		]);
		case "gamepadButton": return JSON.stringify([
			"gamepadButton",
			e.gamepad ?? null,
			e.button,
			e.threshold
		]);
		case "gamepadAxis": return JSON.stringify([
			"gamepadAxis",
			e.gamepad ?? null,
			e.axis,
			e.direction,
			e.threshold,
			e.deadzone
		]);
		case "gesture": return JSON.stringify(["gesture", i(e.gesture)]);
	}
}
function g(e, t) {
	let n = new Map(e.map((e) => [e.id, structuredClone(e)])), r = [];
	return t.patches.forEach((e, t) => {
		switch (e.op) {
			case "add":
				n.has(e.binding.id) ? r.push({
					patchIndex: t,
					kind: "addCollision",
					bindingId: e.binding.id
				}) : n.set(e.binding.id, structuredClone(e.binding));
				break;
			case "remove":
				n.delete(e.bindingId) || r.push({
					patchIndex: t,
					kind: "missingBinding",
					bindingId: e.bindingId
				});
				break;
			case "replace": e.binding.id === e.bindingId ? n.has(e.bindingId) ? n.set(e.bindingId, structuredClone(e.binding)) : r.push({
				patchIndex: t,
				kind: "missingBinding",
				bindingId: e.bindingId
			}) : r.push({
				patchIndex: t,
				kind: "replacementIdMismatch",
				bindingId: e.bindingId
			});
		}
	}), {
		bindings: [...n.values()].sort((e, t) => e.id.localeCompare(t.id)),
		diagnostics: r
	};
}
function _(e, n) {
	if (t(e) || t(n)) return t(e) && t(n) && v(e, n);
	if (e.device !== n.device) return !1;
	switch (e.device) {
		case "mouseButton": return n.device === "mouseButton" && e.button === n.button && y(e.modifiers, n.modifiers);
		case "wheel": return n.device === "wheel" && e.direction === n.direction && y(e.modifiers, n.modifiers);
		case "gamepadButton": return n.device === "gamepadButton" && e.button === n.button && e.threshold === n.threshold && e.gamepad === n.gamepad;
		case "gamepadAxis": return n.device === "gamepadAxis" && e.axis === n.axis && e.direction === n.direction && e.threshold === n.threshold && e.deadzone === n.deadzone && e.gamepad === n.gamepad;
		case "gesture": return n.device === "gesture" && a(e.gesture, n.gesture);
	}
}
function v(e, t) {
	return e.key.kind === t.key.kind && e.key.value === t.key.value && y(e.modifiers, t.modifiers);
}
function y(e, t) {
	return !!e?.ctrl == !!t?.ctrl && !!e?.alt == !!t?.alt && !!e?.shift == !!t?.shift && !!e?.meta == !!t?.meta && !!e?.altGraph == !!t?.altGraph;
}
function b(e) {
	return [e.priority ?? 0, c(e.when)];
}
function x(e, t) {
	return e[0] === t[0] && e[1] === t[1];
}
function ee(e, t) {
	return t[0] - e[0] || t[1] - e[1];
}
function te(e, t) {
	if (e.length === t.length && e.every((e, n) => t[n] !== void 0 && _(e, t[n]))) return "exact";
	let n = Math.min(e.length, t.length);
	return Array.from({ length: n }, (e, t) => t).every((n) => e[n] !== void 0 && t[n] !== void 0 && _(e[n], t[n])) ? "prefix" : "separate";
}
function ne(e, t) {
	let n = [.../* @__PURE__ */ new Set([...S(e), ...S(t)])].sort();
	if (n.length > 16) return {
		kind: "unknown",
		contextCount: n.length
	};
	let r = 2 ** n.length;
	for (let i = 0; i < r; i += 1) {
		let r = /* @__PURE__ */ new Set();
		if (n.forEach((e, t) => {
			i & 2 ** t && r.add(e);
		}), s(e, r) && s(t, r)) return {
			kind: "overlap",
			witnessContexts: [...r].sort()
		};
	}
	return { kind: "disjoint" };
}
function S(t) {
	let n = t ?? e;
	switch (n.op) {
		case "always": return [];
		case "context": return [n.id];
		case "not": return S(n.expr);
		case "all":
		case "any": return n.exprs.flatMap(S);
	}
}
function re(t, n) {
	return JSON.stringify(t ?? e) === JSON.stringify(n ?? e);
}
//#endregion
//#region ../input-bindings/dist/context-stack.js
function ie(e, t, n, r) {
	return ae(e, t, n, r).resolution;
}
function ae(e, t, n, r) {
	let { contexts: i, depthByContext: a, barrier: o } = oe(n, r), u = {
		activeContexts: [...i].sort(),
		contextStack: r.map(le),
		...o ? { barrier: o } : {}
	};
	if (t.length === 0) return {
		resolution: { kind: "none" },
		...u,
		candidates: []
	};
	let d = [], f = [], p = [...e].sort((e, t) => e.id.localeCompare(t.id));
	for (let e of p) {
		let n = {
			bindingId: e.id,
			action: e.action,
			priority: e.priority ?? 0,
			specificity: c(e.when)
		};
		if (!s(e.when, i)) {
			d.push({
				...n,
				match: "none",
				status: "inactiveContext"
			});
			continue;
		}
		if (t.length > e.sequence.length) {
			d.push({
				...n,
				match: "none",
				status: "inputLongerThanBinding"
			});
			continue;
		}
		if (!t.every((t, n) => e.sequence[n] !== void 0 && _(t, e.sequence[n]))) {
			d.push({
				...n,
				match: "none",
				status: "sequenceMismatch"
			});
			continue;
		}
		let r = C(e.when, a), l = t.length === e.sequence.length ? "exact" : "continuation";
		if (o && r < o.depth) {
			d.push({
				...n,
				match: l,
				status: "blockedByModal",
				ownerDepth: r
			});
			continue;
		}
		let u = d.length;
		d.push({
			...n,
			match: l,
			status: "lowerContextLayer",
			ownerDepth: r
		}), f.push({
			binding: e,
			traceIndex: u,
			depth: r,
			match: l
		});
	}
	if (f.length === 0) return {
		resolution: { kind: "none" },
		...u,
		candidates: d
	};
	let m = Math.max(...f.map((e) => e.depth)), h = f.filter((e) => e.depth === m), g = h.map((e) => e.binding), v = l(g, t, i);
	for (let e of h) {
		let t = d[e.traceIndex];
		if (!t) throw Error("Resolution candidate trace is missing.");
		switch (v.kind) {
			case "pending":
				t.status = e.match === "exact" ? "pendingExact" : "pendingContinuation";
				break;
			case "ambiguous":
				t.status = v.bindingIds.includes(e.binding.id) ? "ambiguousWinner" : "lowerRank";
				break;
			case "resolved": {
				if (e.binding.id === v.bindingId) {
					t.status = "winner";
					break;
				}
				let n = g.find((e) => e.id === v.bindingId);
				t.status = n && se(e.binding, n) && e.binding.action === n.action ? "equivalentWinner" : "lowerRank";
				break;
			}
			case "none": t.status = "lowerRank";
		}
	}
	return {
		resolution: v,
		...u,
		candidates: d
	};
}
function oe(e, t) {
	let n = new Set(e), r = /* @__PURE__ */ new Map(), i;
	return t.forEach((e, t) => {
		n.add(e.id), r.set(e.id, t), e.blocksLower && (i = {
			id: e.id,
			depth: t
		});
	}), {
		contexts: n,
		depthByContext: r,
		...i ? { barrier: i } : {}
	};
}
function se(e, t) {
	return (e.priority ?? 0) === (t.priority ?? 0) && c(e.when) === c(t.when);
}
function C(e, t, n = !0) {
	let r = e ?? { op: "always" };
	switch (r.op) {
		case "always": return -1;
		case "context": return n ? t.get(r.id) ?? -1 : -1;
		case "not": return C(r.expr, t, !n);
		case "all":
		case "any": return r.exprs.reduce((e, r) => Math.max(e, C(r, t, n)), -1);
	}
}
function ce(e) {
	return e.blocksLower ? {
		id: e.id,
		blocksLower: !0
	} : { id: e.id };
}
function le(e) {
	return ce(e);
}
//#endregion
//#region ../input-bindings/dist/gesture.js
function ue(e) {
	let t = [], n = /* @__PURE__ */ new Set();
	for (let r of e) for (let e of [r, fe(r)]) {
		if (!e) continue;
		let r = JSON.stringify(w(e));
		n.has(r) || (n.add(r), t.push(w(e)));
	}
	return t;
}
function de(e, t) {
	let n = ue(e);
	for (let e of n) {
		let r = t(e);
		if (r.kind !== "none") return {
			resolution: r,
			matched: e,
			candidates: n
		};
	}
	return {
		resolution: { kind: "none" },
		candidates: n
	};
}
function fe(e) {
	switch (e.kind) {
		case "drag":
		case "swipe":
		case "slash":
		case "pinch":
		case "twoFingerSwipe": return e.direction ? { kind: e.kind } : void 0;
		case "circle":
		case "rotate": return e.orientation ? { kind: e.kind } : void 0;
		case "tap":
		case "hold":
		case "symbol": return;
	}
}
function w(e) {
	switch (e.kind) {
		case "drag":
		case "swipe":
		case "slash": return e.direction ? {
			kind: e.kind,
			direction: e.direction
		} : { kind: e.kind };
		case "twoFingerSwipe": return e.direction ? {
			kind: "twoFingerSwipe",
			direction: e.direction
		} : { kind: "twoFingerSwipe" };
		case "pinch": return e.direction ? {
			kind: "pinch",
			direction: e.direction
		} : { kind: "pinch" };
		case "circle":
		case "rotate": return e.orientation ? {
			kind: e.kind,
			orientation: e.orientation
		} : { kind: e.kind };
		case "tap":
		case "hold": return { kind: e.kind };
		case "symbol": return {
			kind: "symbol",
			id: e.id
		};
	}
}
//#endregion
//#region ../input-bindings/dist/registry.js
function T(e) {
	let t = e.actions.map((e) => structuredClone(e)).sort((e, t) => P(e.id, t.id) || P(e.title, t.title)), n = new Set(t.map((e) => e.id)), r = new Map(t.map((e) => [e.id, [...e.allowedDevices ?? []]])), i = [];
	for (let [e, n] of D(t.map((e) => e.id))) n > 1 && i.push({
		kind: "duplicateActionId",
		actionId: e
	});
	let a = t.flatMap((e) => [...e.defaults ?? []].sort((e, t) => P(e.id, t.id)));
	for (let [e, t] of D(a.map((e) => e.id))) t > 1 && i.push({
		kind: "duplicateBindingId",
		bindingId: e
	});
	for (let e of t) {
		let t = [...e.defaults ?? []].sort((e, t) => P(e.id, t.id));
		e.id.length === 0 && i.push({
			kind: "emptyActionId",
			actionId: e.id
		});
		for (let a of t) a.action !== e.id && i.push({
			kind: "defaultActionMismatch",
			actionId: e.id,
			bindingId: a.id
		}), O(a, n, r, void 0, i);
	}
	let o = /* @__PURE__ */ new Map();
	for (let e of a) o.has(e.id) || o.set(e.id, structuredClone(e));
	let s = [...o.values()].sort((e, t) => P(e.id, t.id));
	return {
		baseBindings: s,
		diagnostics: i,
		conflicts: u(s.filter((e) => A(e, n))),
		knownActions: n,
		allowedDevicesByAction: r
	};
}
function E(e, t) {
	let n = e.diagnostics.map(me);
	if (!t || t.patches.length === 0) {
		let t = e.baseBindings.map((e) => structuredClone(e));
		return {
			valid: n.length === 0,
			effectiveBindings: t,
			diagnostics: n,
			conflicts: e.conflicts.map(he)
		};
	}
	let r = g(e.baseBindings, t), i = r.bindings, a = r.diagnostics.map((e) => ({
		kind: ye(e.kind),
		bindingId: e.bindingId,
		patchIndex: e.patchIndex
	}));
	t.patches.forEach((t, n) => {
		(t.op === "add" || t.op === "replace") && O(t.binding, e.knownActions, e.allowedDevicesByAction, n, a);
	}), a.sort((e, t) => (e.patchIndex ?? 2 ** 53 - 1) - (t.patchIndex ?? 2 ** 53 - 1)), n.push(...a);
	let o = u(i.filter((t) => A(t, e.knownActions)));
	return {
		valid: n.length === 0,
		effectiveBindings: i,
		diagnostics: n,
		conflicts: o
	};
}
function pe(e, t) {
	return E(T(e), t);
}
function D(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) t.set(n, (t.get(n) ?? 0) + 1);
	return [...t.entries()].sort(([e], [t]) => P(e, t));
}
function O(e, t, i, a, o) {
	let s = {
		actionId: e.action,
		bindingId: e.id,
		...a === void 0 ? {} : { patchIndex: a }
	};
	e.id.length === 0 && o.push({
		kind: "emptyBindingId",
		...s
	}), t.has(e.action) || o.push({
		kind: "unknownAction",
		...s
	}), e.sequence.length === 0 && o.push({
		kind: "emptySequence",
		...s
	});
	let c = i.get(e.action) ?? [];
	e.sequence.forEach((t, i) => {
		c.includes(n(t)) || o.push({
			kind: "defaultDeviceNotAllowed",
			...s,
			strokeIndex: i
		}), r(t) && e.sequence.length > 1 && o.push({
			kind: "invalidGestureSequence",
			...s,
			strokeIndex: i
		});
		let a = k(t);
		a && o.push({
			kind: a,
			...s,
			strokeIndex: i
		});
	});
}
function me(e) {
	return { ...e };
}
function he(e) {
	return e.witnessContexts ? {
		...e,
		witnessContexts: [...e.witnessContexts]
	} : { ...e };
}
function k(e) {
	if (t(e)) return e.key.kind === "logical" && !ge(e.key.value) ? "invalidLogicalKey" : e.key.kind === "physical" && !ve(e.key.value) ? "invalidPhysicalKey" : void 0;
	switch (e.device) {
		case "mouseButton": return j(e.button, 0, 31) ? void 0 : "invalidMouseButton";
		case "wheel": return [
			"up",
			"down",
			"left",
			"right"
		].includes(e.direction) ? void 0 : "invalidWheelDirection";
		case "gamepadButton": return N(e.gamepad) ? j(e.button, 0, 255) ? M(e.threshold, 1, 100) ? void 0 : "invalidThreshold" : "invalidGamepadButton" : "invalidGamepadIndex";
		case "gamepadAxis": return N(e.gamepad) ? j(e.axis, 0, 31) ? M(e.threshold, 1, 100) ? !M(e.deadzone, 0, 99) || e.deadzone >= e.threshold ? "invalidDeadzone" : void 0 : "invalidThreshold" : "invalidGamepadAxis" : "invalidGamepadIndex";
		case "gesture": return e.gesture.kind === "symbol" && !_e(e.gesture.id) ? "invalidGestureSymbol" : void 0;
	}
}
function A(e, t) {
	return e.id.length > 0 && t.has(e.action) && e.sequence.length > 0 && (e.sequence.length === 1 || !e.sequence.some(r)) && e.sequence.every((e) => k(e) === void 0);
}
function ge(e) {
	return e.length > 0 && e !== "Unidentified" && !/[\u0000-\u001F\u007F]/u.test(e);
}
function _e(e) {
	return e.trim().length > 0 && !/\p{Cc}/u.test(e);
}
function ve(e) {
	return e !== "Unidentified" && /^[A-Za-z][A-Za-z0-9]*$/u.test(e);
}
function j(e, t, n) {
	return Number.isInteger(e) && e >= t && e <= n;
}
function M(e, t, n) {
	return j(e, t, n);
}
function N(e) {
	return e === void 0 || j(e, 0, 15);
}
function P(e, t) {
	return e < t ? -1 : +(e > t);
}
function ye(e) {
	switch (e) {
		case "addCollision": return "profileAddCollision";
		case "missingBinding": return "profileMissingBinding";
		case "replacementIdMismatch": return "profileReplacementIdMismatch";
	}
}
//#endregion
//#region ../input-bindings-runtime/dist/analog.js
var F = {
	x: 0,
	y: 0
}, be = class {
	actions;
	onDispatch;
	contributions = /* @__PURE__ */ new Map();
	lastValues = /* @__PURE__ */ new Map();
	constructor(e) {
		let t = /* @__PURE__ */ new Map();
		for (let n of e.actions) {
			if (!n.id.trim()) throw Error("Analog action ids must not be empty");
			if (t.has(n.id)) throw Error(`Duplicate analog action id: ${n.id}`);
			t.set(n.id, structuredClone(n));
		}
		this.actions = t, this.onDispatch = e.onDispatch;
	}
	setAxis1D(e, t, n) {
		return this.assertSourceId(e), this.assertActionKind(t, "axis1D"), this.contributions.set(B(e, t), {
			sourceId: e,
			action: t,
			kind: "axis1D",
			value: I(n)
		}), this.emitIfChanged(t, "update");
	}
	setAxis2D(e, t, n) {
		return this.assertSourceId(e), this.assertActionKind(t, "axis2D"), this.contributions.set(B(e, t), {
			sourceId: e,
			action: t,
			kind: "axis2D",
			value: L(n)
		}), this.emitIfChanged(t, "update");
	}
	clearSource(e, t) {
		this.assertSourceId(e);
		let n = /* @__PURE__ */ new Set();
		for (let [r, i] of this.contributions) i.sourceId === e && (t === void 0 || i.action === t) && (this.contributions.delete(r), n.add(i.action));
		return [...n].sort().flatMap((e) => {
			let t = this.emitIfChanged(e, "release");
			return t ? [t] : [];
		});
	}
	reset() {
		let e = [...new Set([...this.contributions.values()].map((e) => e.action))].sort();
		return this.contributions.clear(), e.flatMap((e) => {
			let t = this.emitIfChanged(e, "reset");
			return t ? [t] : [];
		});
	}
	value(e) {
		let t = this.actions.get(e);
		if (!t) throw Error(`Unknown analog action: ${e}`);
		return structuredClone(this.aggregate(e, t.kind).value);
	}
	assertSourceId(e) {
		if (!e.trim()) throw Error("Analog source ids must not be empty");
	}
	assertActionKind(e, t) {
		let n = this.actions.get(e);
		if (!n) throw Error(`Unknown analog action: ${e}`);
		if (n.kind !== t) throw Error(`Analog action ${e} expects ${n.kind}, received ${t}`);
	}
	emitIfChanged(e, t) {
		let n = this.actions.get(e);
		if (!n) return;
		let r = this.aggregate(e, n.kind), i = this.lastValues.get(e);
		if (i !== void 0 && Ce(i, r.value)) return;
		this.lastValues.set(e, structuredClone(r.value));
		let a = n.kind === "axis1D" ? {
			action: e,
			kind: "axis1D",
			value: r.value,
			sourceIds: r.sourceIds,
			reason: t
		} : {
			action: e,
			kind: "axis2D",
			value: r.value,
			sourceIds: r.sourceIds,
			reason: t
		};
		return this.onDispatch?.(structuredClone(a)), a;
	}
	aggregate(e, t) {
		let n = [...this.contributions.values()].filter((n) => n.action === e && n.kind === t).sort((e, t) => e.sourceId.localeCompare(t.sourceId)), r = n.filter((e) => !we(e.value)).map((e) => e.sourceId);
		return t === "axis1D" ? {
			value: I(n.reduce((e, t) => e + t.value, 0)),
			sourceIds: r
		} : {
			value: L(n.reduce((e, t) => ({
				x: e.x + t.value.x,
				y: e.y + t.value.y
			}), { ...F })),
			sourceIds: r
		};
	}
};
function I(e) {
	return Number.isFinite(e) ? V(e, -1, 1) : 0;
}
function L(e) {
	let t = Number.isFinite(e.x) ? e.x : 0, n = Number.isFinite(e.y) ? e.y : 0, r = Math.hypot(t, n);
	return r <= 1 || r === 0 ? {
		x: t,
		y: n
	} : {
		x: t / r,
		y: n / r
	};
}
function R(e, t) {
	let n = L(e), r = Math.hypot(n.x, n.y), i = V(t, 0, .999999);
	if (r <= i || r === 0) return { ...F };
	let a = (r - i) / (1 - i);
	return {
		x: n.x / r * a,
		y: n.y / r * a
	};
}
function z(e, t) {
	let n = Number.isFinite(t) ? t : 1;
	return L({
		x: e.x * n,
		y: e.y * n
	});
}
function xe(e, t, n) {
	let r = V(n, 0, 1);
	return L({
		x: e.x + (t.x - e.x) * r,
		y: e.y + (t.y - e.y) * r
	});
}
function Se(e, t) {
	if (!Number.isFinite(t)) return L(e);
	let n = t * Math.PI / 180, r = Math.cos(n), i = Math.sin(n);
	return L({
		x: e.x * r - e.y * i,
		y: e.x * i + e.y * r
	});
}
function B(e, t) {
	return `${e}\u0000${t}`;
}
function Ce(e, t) {
	return typeof e == "number" || typeof t == "number" ? typeof e == "number" && typeof t == "number" && Object.is(e, t) : Object.is(e.x, t.x) && Object.is(e.y, t.y);
}
function we(e) {
	return typeof e == "number" ? Object.is(e, 0) || Object.is(e, -0) : (Object.is(e.x, 0) || Object.is(e.x, -0)) && (Object.is(e.y, 0) || Object.is(e.y, -0));
}
function V(e, t, n) {
	return Math.min(Math.max(e, t), n);
}
Object.freeze({
	stationaryMaxTravelPx: 10,
	tapMaxDurationMs: 250,
	holdMinDurationMs: 500,
	swipeMinDistancePx: 40,
	swipeMaxDurationMs: 400,
	swipeMinStraightness: .9,
	swipeMinAverageSpeed: .3,
	slashMinDistancePx: 80,
	slashMinStraightness: .8,
	slashMinPeakSpeed: .8,
	circleMinTurningDeg: 300,
	circleMaxClosureRatio: .3,
	circleMinAspectRatio: .5,
	circleMinDiagonalPx: 40,
	mediumSpeed: .3,
	fastSpeed: 1
}), (Math.sqrt(5) - 1) / 2;
//#endregion
//#region ../input-bindings-runtime/dist/pointer-stroke.js
var H = class {
	sourceId;
	maxActiveStrokes;
	onStroke;
	active = /* @__PURE__ */ new Map();
	nextSequence = 1;
	constructor(e) {
		if (!e.sourceId.trim()) throw Error("Pointer stroke source ids must not be empty");
		this.sourceId = e.sourceId, this.maxActiveStrokes = Math.max(1, Math.floor(e.maxActiveStrokes ?? 1)), this.onStroke = e.onStroke;
	}
	begin(e, t) {
		let n = [], r = this.cancel(e.pointerId, "superseded");
		if (r && n.push(r), this.active.size >= this.maxActiveStrokes) return n;
		let i = this.nextSequence++, a = {
			id: `${this.sourceId}:${i}`,
			sourceId: this.sourceId,
			sequence: i,
			pointerId: e.pointerId,
			pointerType: U(e.pointerType),
			surface: { ...t },
			status: "active",
			samples: [G(e, t, void 0)]
		};
		return this.active.set(e.pointerId, a), n.push(this.emit("start", a)), n;
	}
	move(e) {
		let t = Array.isArray(e) ? e : [e], n = t[0];
		if (!n) return;
		let r = this.active.get(n.pointerId);
		if (r) {
			for (let e of t) e.pointerId === r.pointerId && r.samples.push(G(e, r.surface, r.samples.at(-1)));
			return this.emit("update", r);
		}
	}
	end(e) {
		let t = this.active.get(e.pointerId);
		if (t) return t.samples.push(G(e, t.surface, t.samples.at(-1))), this.finish(t, "completed");
	}
	cancel(e, t) {
		let n = this.active.get(e);
		if (n) return this.finish(n, "cancelled", t);
	}
	cancelAll(e) {
		return [...this.active.values()].sort((e, t) => e.sequence - t.sequence).map((t) => this.finish(t, "cancelled", e));
	}
	isActive(e) {
		return this.active.has(e);
	}
	activeStrokes() {
		return [...this.active.values()].sort((e, t) => e.sequence - t.sequence).map((e) => W(e));
	}
	finish(e, t, n) {
		return this.active.delete(e.pointerId), e.status = t, n && (e.cancelReason = n), Object.freeze(e.samples), this.emit(t === "completed" ? "complete" : "cancel", e);
	}
	emit(e, t) {
		let n = {
			phase: e,
			stroke: W(t)
		};
		return this.onStroke?.(n), n;
	}
};
function U(e) {
	switch (e) {
		case "mouse":
		case "touch":
		case "pen": return e;
		default: return "unknown";
	}
}
function W(e) {
	return {
		...e,
		surface: { ...e.surface }
	};
}
function G(e, t, n) {
	let r = Number.isFinite(e.timeStamp) ? e.timeStamp : n?.timeStamp ?? 0, i = n ? Math.max(0, r - n.timeStamp) : 0, a = {
		x: e.clientX - t.left,
		y: e.clientY - t.top,
		clientX: e.clientX,
		clientY: e.clientY,
		t: n ? n.t + i : 0,
		dt: i,
		timeStamp: n ? Math.max(n.timeStamp, r) : r,
		buttons: e.buttons ?? 0
	};
	return K(e.pressure) && (a.pressure = e.pressure), K(e.tiltX) && (a.tiltX = e.tiltX), K(e.tiltY) && (a.tiltY = e.tiltY), a;
}
function K(e) {
	return typeof e == "number" && Number.isFinite(e);
}
Object.freeze({
	pinch: {
		activate: .2,
		deactivate: .1
	},
	rotate: {
		activate: 25,
		deactivate: 12
	},
	pan: {
		activate: 50,
		deactivate: 25
	}
});
//#endregion
//#region ../input-bindings-runtime/dist/index.js
var Te = {
	setTimeout(e, t) {
		return globalThis.setTimeout(e, t);
	},
	clearTimeout(e) {
		globalThis.clearTimeout(e);
	}
}, Ee = class {
	registry;
	compiledRegistry;
	profile;
	report;
	getActiveContexts;
	getContextStack;
	chordTimeoutMs;
	consumePolicy;
	retryOnChordMismatch;
	scheduler;
	onDispatch;
	onDecision;
	pending = [];
	pendingExactBindingIds = [];
	timer;
	active = /* @__PURE__ */ new Map();
	pressedInputs = /* @__PURE__ */ new Set();
	constructor(e) {
		this.registry = structuredClone(e.registry), this.compiledRegistry = T(this.registry), this.profile = e.profile ? structuredClone(e.profile) : void 0, this.getActiveContexts = e.getActiveContexts, this.getContextStack = e.getContextStack, this.chordTimeoutMs = e.chordTimeoutMs ?? 1e3, this.consumePolicy = e.consumePolicy ?? "matched", this.retryOnChordMismatch = e.retryOnChordMismatch ?? !0, this.scheduler = e.scheduler ?? Te, this.onDispatch = e.onDispatch, this.onDecision = e.onDecision, this.report = E(this.compiledRegistry, this.profile);
	}
	get validationReport() {
		return structuredClone(this.report);
	}
	get effectiveBindings() {
		return structuredClone(this.report.effectiveBindings);
	}
	get pendingSequence() {
		return structuredClone(this.pending);
	}
	get hasPendingChord() {
		return this.pending.length > 0;
	}
	updateConfiguration(e, t) {
		let n = this.reset("configurationChanged");
		return this.registry = structuredClone(e), this.compiledRegistry = T(this.registry), this.profile = t ? structuredClone(t) : void 0, this.report = E(this.compiledRegistry, this.profile), n;
	}
	updateProfile(e) {
		let t = this.reset("profileChanged");
		return this.profile = e ? structuredClone(e) : void 0, this.report = E(this.compiledRegistry, this.profile), t;
	}
	handleKeyDown(e, t = {}) {
		return this.handleInputDown(e, t);
	}
	handleInputDown(e, t = {}) {
		let n = t.repeat ?? !1, r = o(e);
		this.pressedInputs.add(r);
		let i = this.contextStack(), a = this.contexts(i);
		if (!this.report.valid) return this.emit(this.decision("invalidConfiguration", [e], a, [], !1, { reason: "invalidConfiguration" }));
		if (n && this.pending.length > 0) return this.emit(this.decision("repeatSuppressed", structuredClone(this.pending), a, [], this.shouldConsume(!0, !1), { reason: "repeatSuppressed" }));
		let s = [...this.pending, structuredClone(e)], c = this.resolve(s, a, i);
		if (c.kind === "none" && this.pending.length > 0) {
			let t = structuredClone(this.pending);
			return this.clearPending(), this.retryOnChordMismatch ? this.processFreshStroke(e, n, a, i, t) : this.emit(this.decision("cancelled", s, a, [], this.shouldConsume(!0, !1), {
				reason: "chordMismatch",
				cancelledSequence: t
			}, c));
		}
		return this.finishInputDown(s, e, n, a, c);
	}
	handleKeyUp(e) {
		return this.handleInputUp(e);
	}
	handleInputUp(e) {
		let t = this.contexts(this.contextStack()), n = o(e);
		if (this.pressedInputs.delete(n), !this.report.valid) return this.emit(this.decision("invalidConfiguration", [e], t, [], !1, { reason: "invalidConfiguration" }));
		let r = this.active.get(n) ?? [];
		if (this.active.delete(n), r.length === 0) return this.emit(this.decision("none", [e], t, [], !1, { reason: "unmatched" }));
		let i = r.slice().sort((e, t) => e.bindingId.localeCompare(t.bindingId)).map((e) => ({
			action: e.action,
			bindingId: e.bindingId,
			phase: "release",
			repeat: !1,
			reason: "keyUp",
			sequence: structuredClone(e.sequence),
			activeContexts: t
		}));
		return this.emit(this.decision("released", [e], t, i, this.shouldConsume(!0, !0), {
			reason: "keyReleased",
			bindingIds: i.map((e) => e.bindingId)
		}));
	}
	handleGesture(e) {
		let t = [...new Set(e.contexts ?? [])], n = this.contextStack(), r = n ? [...n, ...t.map((e) => ({ id: e }))] : void 0, i = [.../* @__PURE__ */ new Set([...this.contexts(n), ...t])].sort();
		if (!this.report.valid) return this.emit(this.decision("invalidConfiguration", [], i, [], !1, { reason: "invalidConfiguration" }));
		this.pending.length > 0 && this.cancelChord("gesture");
		let { resolution: a, matched: o, candidates: s } = de(e.matches, (e) => this.resolve([q(e)], i, r)), c = o ? [q(o)] : [];
		if (!o || a.kind === "none" || a.kind === "pending") return this.emit(this.decision("none", c, i, [], !1, {
			reason: "unmatched",
			gestureCandidates: s
		}, a));
		if (a.kind === "ambiguous") return this.emit(this.decision("ambiguous", c, i, [], this.shouldConsume(!0, !1), {
			reason: "ambiguous",
			bindingIds: a.bindingIds,
			gestureCandidates: s
		}, a));
		let l = e.evidence === void 0 ? { match: o } : {
			match: o,
			evidence: e.evidence
		}, u = (e) => ({
			action: a.action,
			bindingId: a.bindingId,
			phase: e,
			repeat: !1,
			reason: "gesture",
			sequence: structuredClone(c),
			activeContexts: i,
			gesture: l
		}), d = this.emit(this.decision("dispatched", c, i, [u("press")], this.shouldConsume(!0, !0), {
			reason: "resolved",
			bindingIds: [a.bindingId],
			gestureCandidates: s
		}, a));
		return this.emit(this.decision("released", c, i, [u("release")], this.shouldConsume(!0, !0), {
			reason: "keyReleased",
			bindingIds: [a.bindingId]
		})), d;
	}
	cancelChord(e = "explicit") {
		let t = this.contexts(this.contextStack()), n = structuredClone(this.pending);
		return this.clearPending(), this.emit(this.decision("cancelled", n, t, [], !1, {
			reason: "chordCancelled",
			cancelledSequence: n,
			resetReason: e
		}));
	}
	reset(e = "explicit") {
		let t = this.contexts(this.contextStack()), n = structuredClone(this.pending);
		this.clearPending(), this.pressedInputs.clear();
		let r = [...this.active.values()].flat().sort((e, t) => e.bindingId.localeCompare(t.bindingId)).map((e) => ({
			action: e.action,
			bindingId: e.bindingId,
			phase: "release",
			repeat: !1,
			reason: "reset",
			sequence: structuredClone(e.sequence),
			activeContexts: t
		}));
		return this.active.clear(), this.emit(this.decision("reset", n, t, r, !1, {
			reason: "reset",
			resetReason: e
		}));
	}
	processFreshStroke(e, t, n, r, i) {
		let a = [structuredClone(e)], o = this.resolve(a, n, r);
		return this.finishInputDown(a, e, t, n, o, i);
	}
	finishInputDown(e, t, n, r, i, a) {
		if (i.kind === "none") return this.clearPending(), this.emit(this.decision("none", e, r, [], !1, {
			reason: a ? "chordMismatch" : "unmatched",
			...a ? { cancelledSequence: a } : {}
		}, i));
		if (i.kind === "pending") return this.pending = structuredClone(e), this.pendingExactBindingIds = [...i.exactBindingIds], this.scheduleTimeout(), this.emit(this.decision("pending", e, r, [], this.shouldConsume(!0, !1), {
			reason: "pendingChord",
			bindingIds: i.exactBindingIds,
			continuationBindingIds: i.continuationBindingIds,
			...a ? { cancelledSequence: a } : {}
		}, i));
		if (this.clearPending(), i.kind === "ambiguous") return this.emit(this.decision("ambiguous", e, r, [], this.shouldConsume(!0, !1), {
			reason: "ambiguous",
			bindingIds: i.bindingIds,
			...a ? { cancelledSequence: a } : {}
		}, i));
		let o = this.registry.actions.find((e) => e.id === i.action)?.repeatPolicy ?? "never";
		if (n && o !== "allow") return this.emit(this.decision("repeatSuppressed", e, r, [], this.shouldConsume(!0, !1), {
			reason: "repeatSuppressed",
			bindingIds: [i.bindingId],
			...a ? { cancelledSequence: a } : {}
		}, i));
		let s = {
			action: i.action,
			bindingId: i.bindingId,
			phase: n ? "repeat" : "press",
			repeat: n,
			reason: e.length > 1 ? "chord" : "direct",
			sequence: structuredClone(e),
			activeContexts: r
		};
		return n || this.activate(s, t), this.emit(this.decision("dispatched", e, r, [s], this.shouldConsume(!0, !0), {
			reason: "resolved",
			bindingIds: [i.bindingId],
			...a ? { cancelledSequence: a } : {}
		}, i));
	}
	scheduleTimeout() {
		this.timer !== void 0 && this.scheduler.clearTimeout(this.timer), this.timer = this.scheduler.setTimeout(() => {
			this.timer = void 0, this.flushPendingTimeout();
		}, this.chordTimeoutMs);
	}
	flushPendingTimeout() {
		if (this.pending.length === 0 || !this.report.valid) return;
		let e = structuredClone(this.pending), t = new Set(this.pendingExactBindingIds);
		this.pending = [], this.pendingExactBindingIds = [];
		let n = this.contextStack(), r = this.contexts(n), i = this.report.effectiveBindings.filter((n) => t.has(n.id) && n.sequence.length === e.length), a = this.resolve(e, r, n, i);
		if (a.kind === "resolved") {
			let t = {
				action: a.action,
				bindingId: a.bindingId,
				phase: "press",
				repeat: !1,
				reason: "timeout",
				sequence: e,
				activeContexts: r
			}, n = e.at(-1);
			n && this.pressedInputs.has(o(n)) && this.activate(t, n), this.emit(this.decision("dispatched", e, r, [t], !1, {
				reason: "timeoutResolved",
				bindingIds: [a.bindingId]
			}, a));
			return;
		}
		if (a.kind === "ambiguous") {
			this.emit(this.decision("ambiguous", e, r, [], !1, {
				reason: "timeoutAmbiguous",
				bindingIds: a.bindingIds
			}, a));
			return;
		}
		this.emit(this.decision("cancelled", e, r, [], !1, {
			reason: "timeoutExpired",
			cancelledSequence: e
		}, a));
	}
	resolve(e, t, n, r = this.report.effectiveBindings) {
		let i = new Set(t);
		return n ? ie(r, e, i, n) : l(r, e, i);
	}
	activate(e, t) {
		let n = o(t), r = this.active.get(n) ?? [];
		r.some((t) => t.bindingId === e.bindingId) || (r.push({
			action: e.action,
			bindingId: e.bindingId,
			sequence: structuredClone(e.sequence),
			triggerKey: n,
			activeContexts: [...e.activeContexts]
		}), this.active.set(n, r));
	}
	contextStack() {
		return this.getContextStack?.().map((e) => e.blocksLower ? {
			id: e.id,
			blocksLower: !0
		} : { id: e.id });
	}
	contexts(e) {
		let t = new Set(this.getActiveContexts());
		for (let n of e ?? []) t.add(n.id);
		return [...t].sort();
	}
	clearPending() {
		this.pending = [], this.pendingExactBindingIds = [], this.timer !== void 0 && (this.scheduler.clearTimeout(this.timer), this.timer = void 0);
	}
	shouldConsume(e, t) {
		switch (this.consumePolicy) {
			case "never": return !1;
			case "matched": return e;
			case "dispatched": return t;
		}
	}
	decision(e, t, n, r, i, a, o) {
		return {
			kind: e,
			sequence: structuredClone(t),
			activeContexts: [...n],
			...o ? { resolution: structuredClone(o) } : {},
			dispatches: structuredClone(r),
			consumed: i,
			explanation: structuredClone(a)
		};
	}
	emit(e) {
		for (let t of e.dispatches) this.onDispatch?.(structuredClone(t));
		return this.onDecision?.(structuredClone(e)), e;
	}
};
function q(e) {
	return {
		device: "gesture",
		gesture: e
	};
}
//#endregion
//#region ../input-bindings-web/dist/analog.js
function De(e, t) {
	let n = t.sourceId ?? `virtual-stick:${t.action}`, r, i = (r) => {
		let i = Ne(t.target, r, t);
		e.setAxis2D(n, t.action, i), (t.preventDefault ?? !0) && r.preventDefault?.();
	}, a = (e) => {
		let n = e;
		r === void 0 && (r = n.pointerId, t.target.setPointerCapture?.(n.pointerId), i(n));
	}, o = (e) => {
		let t = e;
		t.pointerId === r && i(t);
	}, s = (i, a = !0) => {
		let o = i;
		o.pointerId === r && (r = void 0, a && t.target.releasePointerCapture?.(o.pointerId), e.clearSource(n, t.action), (t.preventDefault ?? !0) && o.preventDefault?.());
	}, c = (e) => s(e, !1);
	return t.target.addEventListener("pointerdown", a), t.target.addEventListener("pointermove", o), t.target.addEventListener("pointerup", s), t.target.addEventListener("pointercancel", s), t.target.addEventListener("lostpointercapture", c), () => {
		t.target.removeEventListener("pointerdown", a), t.target.removeEventListener("pointermove", o), t.target.removeEventListener("pointerup", s), t.target.removeEventListener("pointercancel", s), t.target.removeEventListener("lostpointercapture", c), e.clearSource(n, t.action);
	};
}
function Oe(e, t) {
	let n = t.sourceId ?? `touch-look:${t.action}`, r, i, a = (r) => {
		if (!i) return;
		let a = Me(t.target, r, i, t);
		e.setAxis2D(n, t.action, a), (t.preventDefault ?? !0) && r.preventDefault?.();
	}, o = (a) => {
		let o = a;
		r === void 0 && (r = o.pointerId, i = {
			x: o.clientX,
			y: o.clientY
		}, t.target.setPointerCapture?.(o.pointerId), e.setAxis2D(n, t.action, {
			x: 0,
			y: 0
		}), (t.preventDefault ?? !0) && o.preventDefault?.());
	}, s = (e) => {
		let t = e;
		t.pointerId === r && a(t);
	}, c = (a, o = !0) => {
		let s = a;
		s.pointerId === r && (r = void 0, i = void 0, o && t.target.releasePointerCapture?.(s.pointerId), e.clearSource(n, t.action), (t.preventDefault ?? !0) && s.preventDefault?.());
	}, l = (e) => c(e, !1);
	return t.target.addEventListener("pointerdown", o), t.target.addEventListener("pointermove", s), t.target.addEventListener("pointerup", c), t.target.addEventListener("pointercancel", c), t.target.addEventListener("lostpointercapture", l), () => {
		t.target.removeEventListener("pointerdown", o), t.target.removeEventListener("pointermove", s), t.target.removeEventListener("pointerup", c), t.target.removeEventListener("pointercancel", c), t.target.removeEventListener("lostpointercapture", l), e.clearSource(n, t.action);
	};
}
function ke(e, t) {
	let n = globalThis, r = t.target ?? n.window;
	if (!r) throw Error("attachGyroscopeAnalog requires a target outside a browser environment");
	let i = t.sourceId ?? `gyroscope:${t.action}`, a = Pe(t.smoothing ?? .3, 0, 1), o = {
		x: 0,
		y: 0
	}, s = t.getScreenOrientationDegrees ?? (() => n.screen?.orientation?.angle ?? n.window?.orientation ?? 0), c = (n) => {
		let r = Ae(n, {
			maxRateDegPerSec: t.maxRateDegPerSec,
			deadzone: t.deadzone,
			sensitivity: t.sensitivity,
			invertX: t.invertX,
			invertY: t.invertY,
			screenOrientationDegrees: s()
		});
		o = xe(o, r, a), e.setAxis2D(i, t.action, o);
	};
	return r.addEventListener("devicemotion", c), () => {
		r.removeEventListener("devicemotion", c), o = {
			x: 0,
			y: 0
		}, e.clearSource(i, t.action);
	};
}
function Ae(e, t = {}) {
	let n = e.rotationRate;
	if (!n) return {
		x: 0,
		y: 0
	};
	let r = Math.max(1, Y(t.maxRateDegPerSec, 180)), i = Y(n.gamma, 0), a = Y(n.beta, 0), o = {
		x: i / r,
		y: a / r
	};
	return t.invertX && (o.x *= -1), t.invertY && (o.y *= -1), o = Se(o, -(t.screenOrientationDegrees ?? 0)), o = R(o, t.deadzone ?? .03), z(o, t.sensitivity ?? 1);
}
async function je() {
	let e = globalThis.DeviceMotionEvent;
	if (!e?.requestPermission) return e ? "granted" : "unsupported";
	try {
		return await e.requestPermission() === "granted" ? "granted" : "denied";
	} catch {
		return "denied";
	}
}
function Me(e, t, n, r = {}) {
	let i = e.getBoundingClientRect(), a = Math.max(1, Math.min(i.width, i.height) / 3), o = Math.max(1, r.maxTravelPx ?? a);
	return J({
		x: (t.clientX - n.x) / o,
		y: (t.clientY - n.y) / o
	}, r);
}
function Ne(e, t, n = {}) {
	let r = e.getBoundingClientRect(), i = Math.max(1, r.width / 2), a = Math.max(1, r.height / 2);
	return J({
		x: (t.clientX - (r.left + i)) / i,
		y: (t.clientY - (r.top + a)) / a
	}, n);
}
function J(e, t) {
	return z(R({
		x: t.invertX ? -e.x : e.x,
		y: t.invertY ? -e.y : e.y
	}, t.deadzone ?? .08), t.sensitivity ?? 1);
}
function Y(e, t) {
	return typeof e == "number" && Number.isFinite(e) ? e : t;
}
function Pe(e, t, n) {
	return Math.min(Math.max(e, t), n);
}
//#endregion
//#region ../input-bindings-web/dist/pointer-stroke.js
function Fe(e) {
	let t = globalThis, { target: n } = e, r = e.focusTarget ?? t.window, i = e.visibilityTarget ?? t.document, a = new Set(e.pointerTypes ?? [
		"mouse",
		"touch",
		"pen",
		"unknown"
	]), o = new Set(e.mouseButtons ?? [0]), s = e.coalesced ?? "ignore", c = e.capturePointer ?? !0, l = e.preventDefault ?? !0, u = new H({
		sourceId: e.sourceId ?? "pointer",
		maxActiveStrokes: e.maxActiveStrokes,
		onStroke: e.onStroke
	}), d = (e) => {
		l && e.preventDefault?.();
	}, f = (t) => {
		let r = t, i = U(r.pointerType);
		if (!a.has(i) || i === "mouse" && !o.has(r.button ?? 0)) return;
		if (e.cancelOnAdditionalPointer && u.activeStrokes().length > 0 && !u.isActive(r.pointerId)) {
			u.cancelAll("multiPointer");
			return;
		}
		let s = n.getBoundingClientRect();
		u.begin(X(r), {
			left: s.left,
			top: s.top,
			width: s.width,
			height: s.height
		}), u.isActive(r.pointerId) && (c && n.setPointerCapture?.(r.pointerId), d(r));
	}, p = (e) => {
		let t = e;
		u.isActive(t.pointerId) && (u.move(Ie(t, s)), d(t));
	}, m = (e) => {
		let t = e;
		u.isActive(t.pointerId) && (u.end(X(t)), c && n.releasePointerCapture?.(t.pointerId), d(t));
	}, h = (e, t) => {
		u.cancel(e.pointerId, t);
	}, g = (e) => h(e, "pointerCancel"), _ = (e) => h(e, "lostPointerCapture"), v = () => u.cancelAll("blur"), y = () => {
		(i?.hidden === !0 || i?.visibilityState === "hidden") && u.cancelAll("hidden");
	};
	return n.addEventListener("pointerdown", f), n.addEventListener("pointermove", p), n.addEventListener("pointerup", m), n.addEventListener("pointercancel", g), n.addEventListener("lostpointercapture", _), r?.addEventListener("blur", v), i?.addEventListener("visibilitychange", y), () => {
		n.removeEventListener("pointerdown", f), n.removeEventListener("pointermove", p), n.removeEventListener("pointerup", m), n.removeEventListener("pointercancel", g), n.removeEventListener("lostpointercapture", _), r?.removeEventListener("blur", v), i?.removeEventListener("visibilitychange", y);
		for (let e of u.cancelAll("detach")) c && n.releasePointerCapture?.(e.stroke.pointerId);
	};
}
function Ie(e, t) {
	if (t === "include") {
		let t = e.getCoalescedEvents?.() ?? [];
		if (t.length > 0) return t.map((t) => X(t, e.pointerId));
	}
	return [X(e)];
}
function X(e, t = e.pointerId) {
	return {
		pointerId: t,
		pointerType: e.pointerType,
		clientX: e.clientX,
		clientY: e.clientY,
		timeStamp: e.timeStamp,
		buttons: e.buttons,
		pressure: e.pressure,
		tiltX: e.tiltX,
		tiltY: e.tiltY
	};
}
//#endregion
//#region ../input-bindings-web/dist/index.js
var Le = /* @__PURE__ */ new Set([
	"Alt",
	"AltGraph",
	"Control",
	"Meta",
	"Shift"
]), Re = /* @__PURE__ */ new Set([
	"Alt",
	"AltLeft",
	"AltRight",
	"Control",
	"ControlLeft",
	"ControlRight",
	"Meta",
	"MetaLeft",
	"MetaRight",
	"Shift",
	"ShiftLeft",
	"ShiftRight"
]);
function ze(e, t = "logical") {
	return t === "physical" ? Re.has(e) : Le.has(e);
}
function Z(e, t = {}) {
	let { mode: n = "logical", altGraph: r = "distinct", ignoreComposing: i = !0, ignoreModifierOnly: a = !0, respectDefaultPrevented: o = !0 } = t;
	if (i && e.isComposing || o && e.defaultPrevented || a && ze(e.key) || e.key === "Unidentified" || e.key === "Process") return null;
	let s = e.getModifierState?.("AltGraph") ?? e.key === "AltGraph", c = {
		ctrl: e.ctrlKey,
		alt: e.altKey,
		shift: e.shiftKey,
		meta: e.metaKey,
		altGraph: s
	};
	return s && r === "distinct" && (c.ctrl = !1, c.alt = !1), {
		key: n === "physical" ? {
			kind: "physical",
			value: e.code
		} : {
			kind: "logical",
			value: Ve(e.key)
		},
		modifiers: c
	};
}
function Q(e) {
	return e.defaultPrevented || !Number.isInteger(e.button) || e.button < 0 ? null : {
		device: "mouseButton",
		button: e.button,
		modifiers: Je(e)
	};
}
function Be(e) {
	if (e.defaultPrevented) return null;
	let t = Math.abs(e.deltaX), n = Math.abs(e.deltaY);
	if (t === 0 && n === 0) return null;
	let r;
	return r = n >= t ? e.deltaY < 0 ? "up" : "down" : e.deltaX < 0 ? "left" : "right", {
		device: "wheel",
		direction: r,
		modifiers: Je(e)
	};
}
function Ve(e) {
	return e === " " ? "Space" : e === "Esc" ? "Escape" : e.length === 1 ? e.toLowerCase() : e;
}
function $(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e, n = t.tagName?.toUpperCase();
	if (n === "INPUT" || n === "TEXTAREA" || n === "SELECT" || t.isContentEditable) return !0;
	let r = t.role ?? t.getAttribute?.("role");
	return r === "textbox" || r === "searchbox" || r === "combobox";
}
function He(e, t = {}) {
	let n = globalThis, r = t.keyTarget ?? n.window;
	if (!r) throw Error("attachKeyboardRuntime requires a keyTarget outside a browser environment");
	let i = t.focusTarget ?? n.window, a = t.visibilityTarget ?? n.document, o = t.ignoreTextEntry ?? !1, s = t.resetOnBlur ?? !0, c = t.resetOnHidden ?? !0, l = t.resetOnDetach ?? !0, u = /* @__PURE__ */ new Map(), d = (e, n) => {
		n.consumed && (e.preventDefault?.(), t.stopPropagation && e.stopPropagation?.());
	}, f = () => typeof t.mode == "function" ? t.mode() : t.mode ?? "logical", p = (e, n = {}) => Z(e, {
		...t.keyboardOptions,
		mode: f(),
		...n
	}), m = (e) => e.code || e.key, h = (t) => {
		let n = t;
		if (o && $(n.target)) return;
		let r = m(n), i = u.get(r), a = i ?? p(n);
		if (!a) return;
		i || u.set(r, structuredClone(a));
		let s = e.handleKeyDown(a, { repeat: !!n.repeat });
		d(n, s);
	}, g = (t) => {
		let n = t, r = m(n), i = u.get(r);
		u.delete(r);
		let a = i ?? p(n, {
			ignoreComposing: !1,
			respectDefaultPrevented: !1
		});
		if (!a) return;
		let o = e.handleKeyUp(a);
		d(n, o);
	}, _ = (t) => {
		u.clear(), e.reset(t);
	}, v = () => {
		s && _("blur");
	}, y = () => {
		c && (a?.hidden === !0 || a?.visibilityState === "hidden") && _("hidden");
	};
	return r.addEventListener("keydown", h), r.addEventListener("keyup", g), i?.addEventListener("blur", v), a?.addEventListener("visibilitychange", y), () => {
		r.removeEventListener("keydown", h), r.removeEventListener("keyup", g), i?.removeEventListener("blur", v), a?.removeEventListener("visibilitychange", y), u.clear(), l && e.reset("detached");
	};
}
function Ue(e, t = {}) {
	let n = globalThis, r = t.target ?? n.window;
	if (!r) throw Error("attachMouseRuntime requires a target outside a browser environment");
	let i = t.ignoreTextEntry ?? !1, a = t.resetOnDetach ?? !0, o = /* @__PURE__ */ new Map(), s = (e, n) => {
		n.consumed && (e.preventDefault?.(), t.stopPropagation && e.stopPropagation?.());
	}, c = (n) => {
		let r = n;
		if (i && $(r.target) || (t.respectDefaultPrevented ?? !0) && r.defaultPrevented) return;
		let a = Q({
			...r,
			defaultPrevented: !1
		});
		a && (o.set(r.button, structuredClone(a)), s(r, e.handleInputDown(a)));
	}, l = (t) => {
		let n = t, r = o.get(n.button) ?? Q({
			...n,
			defaultPrevented: !1
		});
		o.delete(n.button), r && s(n, e.handleInputUp(r));
	}, u = (n) => {
		let r = n;
		if (i && $(r.target) || (t.respectDefaultPrevented ?? !0) && r.defaultPrevented) return;
		let a = Be({
			...r,
			defaultPrevented: !1
		});
		if (!a) return;
		let o = e.handleInputDown(a);
		e.handleInputUp(a), s(r, o);
	};
	return r.addEventListener("mousedown", c), r.addEventListener("mouseup", l), r.addEventListener("wheel", u, { passive: !1 }), () => {
		r.removeEventListener("mousedown", c), r.removeEventListener("mouseup", l), r.removeEventListener("wheel", u, { passive: !1 }), o.clear(), a && e.reset("mouseDetached");
	};
}
function We(e, t = {}) {
	let n = globalThis, r = t.getGamepads ?? (() => n.navigator?.getGamepads?.() ?? []), i = t.scheduler ?? qe(n), a = t.resetOnDetach ?? !0, s = Ke(e.effectiveBindings), c = /* @__PURE__ */ new Map(), l = !1, u, d = () => {
		if (l) return;
		let t = r();
		for (let n of s) {
			let r = o(n), i = c.has(r), a = Ge(n, t, i);
			if (!i && a) c.set(r, structuredClone(n)), e.handleInputDown(n);
			else if (i && !a) {
				let t = c.get(r);
				c.delete(r), t && e.handleInputUp(t);
			}
		}
		u = i.requestFrame(d);
	};
	return u = i.requestFrame(d), () => {
		l = !0, u !== void 0 && i.cancelFrame(u);
		for (let t of c.values()) e.handleInputUp(t);
		c.clear(), a && e.reset("gamepadDetached");
	};
}
function Ge(e, t, n = !1) {
	let r = t.filter((t) => t !== null && t.connected !== !1 && (e.gamepad === void 0 || t.index === e.gamepad));
	return e.device === "gamepadButton" ? r.some((t) => {
		let n = t.buttons[e.button];
		return n !== void 0 && (n.pressed === !0 || n.value * 100 >= e.threshold);
	}) : r.some((t) => {
		let r = t.axes[e.axis];
		if (r === void 0 || !Number.isFinite(r) || !(e.direction === "positive" ? r > 0 : r < 0)) return !1;
		let i = Math.abs(r) * 100;
		return n ? i > e.deadzone : i >= e.threshold;
	});
}
function Ke(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) for (let e of n.sequence) "device" in e && (e.device === "gamepadButton" || e.device === "gamepadAxis") && t.set(o(e), structuredClone(e));
	return [...t.values()].sort((e, t) => o(e).localeCompare(o(t)));
}
function qe(e) {
	return e.requestAnimationFrame && e.cancelAnimationFrame ? {
		requestFrame: (t) => e.requestAnimationFrame(t),
		cancelFrame: (t) => e.cancelAnimationFrame(t)
	} : {
		requestFrame: (e) => globalThis.setTimeout(e, 16),
		cancelFrame: (e) => globalThis.clearTimeout(e)
	};
}
function Je(e) {
	let t = e.getModifierState?.("AltGraph") ?? !1;
	return {
		ctrl: !t && e.ctrlKey,
		alt: !t && e.altKey,
		shift: e.shiftKey,
		meta: e.metaKey,
		altGraph: t
	};
}
//#endregion
export { be as AnalogInputController, Ee as InputRuntimeController, H as PointerStrokeTracker, u as analyzeConflicts, g as applyProfile, We as attachGamepadRuntime, ke as attachGyroscopeAnalog, He as attachKeyboardRuntime, Ue as attachMouseRuntime, Fe as attachPointerStrokeCapture, Oe as attachTouchLookAnalog, De as attachVirtualStickAnalog, Z as keyboardEventToStroke, je as requestDeviceMotionPermission, pe as validateRegistry };
