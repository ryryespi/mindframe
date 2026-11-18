/* MindFrame Log: tiny dependency-free SVG chart builders (return SVG strings). */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.MF_CHARTS = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fin(v) { return typeof v === "number" && isFinite(v); }
  var COLORS = ["var(--accent)", "var(--warm)", "var(--soft)", "var(--muted)"];

  /* series: [{name, values:[num|null], color, dash, width, area}] ; labels: x labels (sparse ok) */
  function line(o) {
    var W = o.width || 600, H = o.height || 200, P = { l: 30, r: 10, t: 12, b: 26 };
    var n = Math.max.apply(null, o.series.map(function (s) { return s.values.length; }));
    var min = o.min != null ? o.min : 0, max = o.max != null ? o.max : 10;
    var x = function (i) { return P.l + (n <= 1 ? 0 : i * (W - P.l - P.r) / (n - 1)); };
    var y = function (v) { return P.t + (H - P.t - P.b) * (1 - (v - min) / (max - min || 1)); };
    var g = ['<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(o.title || "chart") + '" preserveAspectRatio="none">'];
    (o.bands || []).forEach(function (b) { g.push('<rect x="' + x(b.from) + '" y="' + P.t + '" width="' + Math.max(1, x(b.to) - x(b.from)) + '" height="' + (H - P.t - P.b) + '" fill="' + (b.color || "var(--line)") + '" opacity="' + (b.opacity || 0.5) + '"/>'); });
    var ticks = o.ticks || [min, (min + max) / 2, max];
    ticks.forEach(function (t) { g.push('<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="var(--line)" stroke-width="1"/><text x="' + (P.l - 5) + '" y="' + (y(t) + 4) + '" text-anchor="end" class="ax">' + t + "</text>"); });
    (o.labels || []).forEach(function (lb, i) { if (lb) g.push('<text x="' + x(i) + '" y="' + (H - 7) + '" text-anchor="middle" class="ax">' + esc(lb) + "</text>"); });
    o.series.forEach(function (s, si) {
      var col = s.color || COLORS[si % COLORS.length], d = "", pen = false, area = "";
      s.values.forEach(function (v, i) {
        if (!fin(v)) { pen = false; return; }
        d += (pen ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1) + " "; pen = true;
      });
      if (s.area) {
        var pts = s.values.map(function (v, i) { return fin(v) ? x(i).toFixed(1) + "," + y(v).toFixed(1) : null; }).filter(Boolean);
        if (pts.length) area = '<polygon points="' + x(0) + "," + y(min) + " " + pts.join(" ") + " " + x(n - 1) + "," + y(min) + '" fill="' + col + '" opacity="0.18"/>';
        g.push(area);
      }
      if (s.dots) s.values.forEach(function (v, i) { if (fin(v)) g.push('<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="2.2" fill="' + col + '" opacity="0.55"/>'); });
      if (d && !s.noLine) g.push('<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + (s.width || 2) + '"' + (s.dash ? ' stroke-dasharray="' + s.dash + '"' : "") + ' stroke-linejoin="round" stroke-linecap="round"/>');
    });
    if (o.marker != null) g.push('<line class="marker" x1="' + x(o.marker) + '" x2="' + x(o.marker) + '" y1="' + P.t + '" y2="' + (H - P.b) + '" stroke="var(--ink)" stroke-width="1.5"/>');
    g.push("</svg>");
    return g.join("") + legend(o.series.filter(function (s) { return s.name; }));
  }
  function legend(series) {
    if (!series.length) return "";
    return '<div class="legend">' + series.map(function (s, i) {
      return '<span><i style="background:' + (s.color || COLORS[i % COLORS.length]) + (s.dash ? ";opacity:.6" : "") + '"></i>' + esc(s.name) + "</span>"; }).join("") + "</div>";
  }
  /* Horizontal bars. items: [{label, value, note}] ; value may be negative. */
  function bars(o) {
    var items = o.items, W = o.width || 600, row = 30, H = Math.max(40, items.length * row + 10), L = o.labelWidth || 170;
    var vals = items.map(function (i) { return fin(i.value) ? i.value : 0; });
    var min = Math.min(0, o.min != null ? o.min : Math.min.apply(null, vals)), max = Math.max(o.max != null ? o.max : 0, Math.max.apply(null, vals.concat([0.0001])));
    var x = function (v) { return L + (W - L - 60) * (v - min) / (max - min || 1); };
    var g = ['<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(o.title || "bars") + '">'];
    g.push('<line x1="' + x(0) + '" x2="' + x(0) + '" y1="2" y2="' + (H - 4) + '" stroke="var(--line)"/>');
    items.forEach(function (it, i) {
      var yy = 6 + i * row, v = fin(it.value) ? it.value : 0, x0 = x(Math.min(0, v)), w = Math.abs(x(v) - x(0));
      g.push('<text x="' + (L - 8) + '" y="' + (yy + 15) + '" text-anchor="end" class="lb">' + esc(it.label) + "</text>");
      g.push('<rect x="' + x0 + '" y="' + yy + '" width="' + Math.max(w, 1) + '" height="20" rx="4" fill="' + (v < 0 ? "var(--warm)" : (it.color || "var(--accent)")) + '" opacity="' + (fin(it.value) ? 0.85 : 0.2) + '"/>');
      g.push('<text x="' + (Math.max(x(v), x(0)) + 6) + '" y="' + (yy + 15) + '" class="ax">' + esc(it.note != null ? it.note : fin(it.value) ? it.value.toFixed(1) : "–") + "</text>");
    });
    g.push("</svg>");
    return g.join("");
  }
  /* 4x4 State Finder grid: rows energy 4..1, columns stress 1..4. */
  function heatmap(counts, names, energyLabels, stressLabels) {
    var max = Math.max.apply(null, Object.keys(counts).map(function (k) { return counts[k]; }).concat([1]));
    var h = ['<table class="heat"><thead><tr><th scope="col"><span class="sr">Energy \\ Stress</span></th>'];
    for (var s = 1; s <= 4; s++) h.push('<th scope="col">' + esc(stressLabels[s]) + "</th>");
    h.push("</tr></thead><tbody>");
    for (var e = 4; e >= 1; e--) {
      h.push('<tr><th scope="row">' + esc(energyLabels[e]) + "</th>");
      for (s = 1; s <= 4; s++) {
        var k = e + "-" + s, c = counts[k] || 0, a = c ? 0.15 + 0.75 * c / max : 0;
        h.push('<td title="' + esc(names[k]) + ": " + c + '" style="--a:' + a.toFixed(2) + '"><span>' + c + "</span><small>" + esc(names[k]) + "</small></td>");
      }
      h.push("</tr>");
    }
    h.push("</tbody></table>");
    return h.join("");
  }
  return { line: line, bars: bars, heatmap: heatmap, esc: esc };
});
