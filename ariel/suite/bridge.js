// ariel/suite/bridge.js — shared state between the AutoCAD canvas and the suite tabs.
// No DOM. The suite page and the node tests both use this file.
//
// ===== PARAMS =====
// v0, r0     resting threat and control before the canvas speaks
// kV, kR     how hard a doubt circle (ρ) raises threat and lowers control
// yMax       slider range of the bridge (the I→O span, 0..1, times this)
//
// ===== EQUATIONS =====
// v = clamp01(v0 + kV · ρ)                         threat rises with doubt
// r = clamp01(r0 − kR · ρ)                         control falls with doubt
// y = clamp(bridge · yMax, 0, yMax)                I→O span sets the bridge
// g = clamp(0.05 + 0.95 · (0.2 + 0.8 · r) · (1 − 0.3 · v), 0.05, 1)
// yOut = clamp((y / yMax) · g · (1 − 0.4 · v) · 0.5, 0, 0.6)
// The gate scales signal transfer: Kᵢ,eff = Kᵢ · g
"use strict";
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArielBridge = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PARAMS = { v0: 0.35, r0: 0.75, kV: 0.55, kR: 0.5, yMax: 6.4 };

  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function clamp01(x) { return clamp(x, 0, 1); }

  /** Gate opening from control r and threat v. Same shape as the suite engine. */
  function gate(v, r) {
    return clamp(0.05 + 0.95 * (0.2 + 0.8 * r) * (1 - 0.3 * v), 0.05, 1);
  }

  /** Transfer along the line, scaled by the gate. */
  function transfer(yBridge, g, v) {
    return clamp((yBridge / PARAMS.yMax) * g * (1 - 0.4 * v) * 0.5, 0, 0.6);
  }

  /**
   * One shared reading of the canvas.
   * state: { doubtRho, bridge, layers: [{name, role, domain, dots, lines, circles, doubts, ink}] }
   */
  function fromAriel(state) {
    const s = state || {};
    const rho = clamp01(Number(s.doubtRho) || 0);
    const v = clamp01(PARAMS.v0 + PARAMS.kV * rho);
    const r = clamp01(PARAMS.r0 - PARAMS.kR * rho);
    const bridge = clamp01(Number(s.bridge) || 0);
    const y = bridge * PARAMS.yMax;
    const g = gate(v, r);
    const yOut = transfer(y, g, v);
    const nodes = [];
    (s.layers || []).forEach(L => {
      const bits = (L.dots || 0) + (L.lines || 0) + (L.circles || 0) + (L.ink || 0);
      const kind = L.role === "nonsense" ? "Support" : (L.doubts ? "Threat" : "Transfer");
      nodes.push({
        kind,
        label: L.name || "Layer",
        detail: (L.domain || "custom") + " · " + bits + " marks" + (L.doubts ? " · doubt " + L.doubts : "")
      });
    });
    if (s.collapse) nodes.push({ kind: "Line", label: "I → O", detail: String(s.collapse).slice(0, 180) });
    return { rho, v, r, y, g, yOut, signalScale: g, nodes };
  }

  return { PARAMS, gate, transfer, fromAriel };
});
