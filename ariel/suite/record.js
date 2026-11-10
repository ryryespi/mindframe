// ariel/suite/record.js — factual accomplishment record for the suite.
// No DOM. The suite page and the node tests both use this file.
// A record of what happened, kept on this device. Not a score and not praise.
//
// ===== TYPES =====
// journal   a saved journal note
// drawing   marks added on a layer
// layer     a layer created
// bridge    an I→O line completed
// loop      a collapse that names the stops between I and O
// kindred   a kindred-mind card the canvas reported
// path      a knowledge-path step the canvas reported
// session   a session finished
// note      something the user wrote themselves
// enough    an idea the user marked as settled
// explore   a fundamental looked at for the joy of it
// story     a story kept from the canvas
// courage   a reach-out the user chose to keep
// gift      a welcome gift the user chose to receive
// sketch    a drawing kept with a thought and its words
"use strict";
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArielRecord = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const KEY = "ariel-record";
  const TYPES = {
    journal: "Journal",
    drawing: "Drawing",
    layer: "Layer",
    bridge: "I→O line",
    loop: "Loop",
    kindred: "Kindred mind",
    path: "Knowledge path",
    session: "Session",
    note: "Note",
    enough: "Enough",
    explore: "Explore",
    story: "Story",
    courage: "Courage",
    gift: "Gift",
    sketch: "Sketches"
  };

  function blank() { return { entries: [] }; }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function marksOf(layer) {
    const L = layer || {};
    return (L.dots || 0) + (L.lines || 0) + (L.circles || 0) + (L.ink || 0);
  }

  function makeId(now, n) {
    return "rec-" + String(now || "t").replace(/[^0-9A-Za-z]/g, "") + "-" + n;
  }

  function add(record, input, now) {
    const src = input || {};
    const text = String(src.text || "").trim();
    if (!text) return record;
    const type = TYPES[src.type] ? src.type : "note";
    const key = src.key ? String(src.key) : "";
    const entries = (record && record.entries) || [];
    if (key && entries.some(e => e.key === key)) return record;
    const entry = {
      id: src.id || makeId(now, entries.length),
      at: src.at || now || new Date().toISOString(),
      type,
      text,
      note: String(src.note || "").trim(),
      href: src.href || "",
      source: src.source === "auto" ? "auto" : "manual",
      key
    };
    if (src.thumb && String(src.thumb).indexOf("data:image/") === 0) entry.thumb = String(src.thumb);
    if (Array.isArray(src.words) && src.words.length) entry.words = src.words.map(String);
    if (src.imageId) entry.imageId = String(src.imageId);
    return { entries: entries.concat([entry]) };
  }

  function edit(record, id, patch) {
    const p = patch || {};
    const entries = ((record && record.entries) || []).map(e => {
      if (e.id !== id) return e;
      const text = p.text != null ? String(p.text).trim() : e.text;
      if (!text) return e;
      const note = p.note != null ? String(p.note).trim() : e.note;
      const next = { id: e.id, at: e.at, type: e.type, text, note, href: e.href, source: e.source, key: e.key, edited: true };
      if (e.thumb) next.thumb = e.thumb;
      if (e.words && e.words.length) next.words = e.words.slice();
      if (e.imageId) next.imageId = e.imageId;
      return next;
    });
    return { entries };
  }

  function remove(record, id) {
    return { entries: ((record && record.entries) || []).filter(e => e.id !== id) };
  }

  function counts(record) {
    const list = (record && record.entries) || [];
    const n = (types) => list.filter(e => types.indexOf(e.type) >= 0).length;
    return {
      ideas: n(["bridge", "loop", "path", "enough"]),
      loops: n(["loop"]),
      drawings: n(["drawing"]),
      journal: n(["journal"])
    };
  }

  function summary(record) {
    const c = counts(record);
    const bit = (num, one, many) => num + " " + (num === 1 ? one : many);
    return [
      bit(c.ideas, "idea finished", "ideas finished"),
      bit(c.loops, "loop closed", "loops closed"),
      bit(c.drawings, "drawing made", "drawings made"),
      bit(c.journal, "journal entry", "journal entries")
    ].join(" · ");
  }

  function filter(record, type) {
    const list = (record && record.entries) || [];
    if (!type || type === "all") return list.slice();
    return list.filter(e => e.type === type);
  }

  function dayParts(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { key: "unknown", label: "Undated" };
    return {
      key: d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()),
      label: d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    };
  }

  function when(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  }

  /** Newest first, grouped by local day. */
  function groupByDay(entries) {
    const sorted = (entries || []).slice().sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    const groups = [];
    sorted.forEach(e => {
      const day = dayParts(e.at);
      let g = groups[groups.length - 1];
      if (!g || g.key !== day.key) {
        g = { key: day.key, label: day.label, entries: [] };
        groups.push(g);
      }
      g.entries.push(e);
    });
    return groups;
  }

  function remember(record, rng) {
    const list = (record && record.entries) || [];
    if (!list.length) return null;
    const roll = typeof rng === "function" ? rng() : Math.random();
    const i = Math.min(list.length - 1, Math.max(0, Math.floor(roll * list.length)));
    return list[i];
  }

  function journalEntry(body, now) {
    const note = String(body || "").trim();
    if (!note) return null;
    const line = note.split(/\n/)[0].trim();
    const short = line.length > 80 ? line.slice(0, 77) + "…" : line;
    return {
      type: "journal",
      text: "Saved a journal note: " + short,
      note,
      href: "#journal",
      source: "auto",
      at: now
    };
  }

  function loopTitle(text) {
    const m = /From I to O:\s*(.+?)(?:\.|, with|$)/.exec(String(text || ""));
    if (!m) return "";
    const body = m[1].trim();
    if (!body || body === "(nothing between)") return "";
    return body;
  }

  /**
   * Changes between two canvas snapshots.
   * The first snapshot (prev == null) is a baseline and logs nothing,
   * so the Nonsense Layer already on screen is not an accomplishment.
   * state: { layers:[{name,role,dots,lines,circles,ink}], collapsed, collapseText, events }
   */
  function diffCanvas(prev, next) {
    if (!prev || !next) return [];
    const actions = [];
    const prevLayers = prev.layers || [];
    const nextLayers = next.layers || [];
    for (let i = 0; i < nextLayers.length; i++) {
      const L = nextLayers[i] || {};
      const P = prevLayers[i];
      const name = L.name || ("Layer " + (i + 1));
      if (!P) {
        if (L.role === "nonsense") continue;
        const first = !prevLayers.some(x => x && x.role !== "nonsense");
        actions.push({
          op: "add", type: "layer", source: "auto", href: "#draw",
          text: (first ? "Created your first layer: " : "Created a layer: ") + name,
          key: "layer:" + i + ":" + name
        });
      }
      if (L.role === "nonsense") continue;
      const before = P ? marksOf(P) : 0;
      const after = marksOf(L);
      if (before === 0 && after > 0) {
        actions.push({
          op: "add", type: "drawing", source: "auto", href: "#draw",
          text: "Drew on " + name,
          note: after + (after === 1 ? " mark" : " marks"),
          key: "draw:" + i + ":" + name + ":open",
          firstHint: "drawing"
        });
      } else if (after > before && before > 0) {
        actions.push({
          op: "touch",
          key: "draw:" + i + ":" + name,
          note: after + " marks",
          fallback: {
            op: "add", type: "drawing", source: "auto", href: "#draw",
            text: "Drew on " + name,
            note: after + " marks",
            key: "draw:" + i + ":" + name + ":open",
            firstHint: "drawing"
          }
        });
      } else if (before > 0 && after === 0) {
        actions.push({ op: "close", key: "draw:" + i + ":" + name + ":open" });
      }
    }
    if (!prev.collapsed && next.collapsed) {
      const titled = loopTitle(next.collapseText);
      if (titled) {
        actions.push({
          op: "add", type: "loop", source: "auto", href: "#draw",
          text: "Closed a loop on " + titled,
          key: "loop:" + titled
        });
      } else {
        actions.push({
          op: "add", type: "bridge", source: "auto", href: "#draw",
          text: "Completed an I→O line",
          key: "bridge:" + String(next.collapseText || "line"),
          firstHint: "bridge"
        });
      }
    }
    (next.events || []).forEach(ev => {
      if (!ev || !ev.type) return;
      if (ev.type === "kindred") {
        const title = ev.title || "untitled";
        actions.push({
          op: "add", type: "kindred", source: "auto", href: ev.href || "",
          text: (ev.saved ? "Saved a kindred mind: " : "Viewed a kindred mind: ") + title,
          key: "kindred:" + (ev.id || title) + ":" + (ev.saved ? "saved" : "viewed")
        });
      } else if (ev.type === "path") {
        const title = ev.title || "a path";
        actions.push({
          op: "add", type: "path", source: "auto", href: ev.href || "",
          text: "Reached " + (ev.step || "a step") + " on " + title,
          key: "path:" + (ev.id || title) + ":" + (ev.step || "step")
        });
      }
    });
    return actions;
  }

  function apply(record, actions, now) {
    let next = record && record.entries ? record : blank();
    (actions || []).forEach(a => {
      if (!a) return;
      if (a.op === "close") {
        next = {
          entries: next.entries.map(e => e.key === a.key ? { id: e.id, at: e.at, type: e.type, text: e.text, note: e.note, href: e.href, source: e.source, key: "", edited: e.edited } : e)
        };
        return;
      }
      if (a.op === "touch") {
        const entries = next.entries.slice();
        let hit = -1;
        for (let i = entries.length - 1; i >= 0; i--) {
          if (entries[i].key && entries[i].key.indexOf(a.key) === 0) { hit = i; break; }
        }
        if (hit >= 0) {
          const e = entries[hit];
          entries[hit] = { id: e.id, at: e.at, type: e.type, text: e.text, note: a.note != null ? a.note : e.note, href: e.href, source: e.source, key: e.key, edited: e.edited };
          next = { entries };
        } else if (a.fallback) {
          next = apply(next, [a.fallback], now);
        }
        return;
      }
      const copy = {
        type: a.type, text: a.text, note: a.note, href: a.href, source: a.source || "auto", key: a.key, at: a.at
      };
      if (a.firstHint === "drawing" && !next.entries.some(e => e.type === "drawing")) {
        copy.text = String(a.text || "").replace("Drew on ", "Drew your first marks on ");
      }
      if (a.firstHint === "bridge" && !next.entries.some(e => e.type === "bridge")) {
        copy.text = "Drew your first I→O bridge";
      }
      next = add(next, copy, now);
    });
    return next;
  }

  function ingest(record, prev, next, now) {
    return apply(record, diffCanvas(prev, next), now);
  }

  function load(storage) {
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return blank();
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.entries)) return blank();
      return {
        entries: data.entries.filter(e => e && e.id && e.text && TYPES[e.type]).map(e => ({
          id: String(e.id),
          at: String(e.at || ""),
          type: e.type,
          text: String(e.text),
          note: String(e.note || ""),
          href: String(e.href || ""),
          source: e.source === "auto" ? "auto" : "manual",
          key: String(e.key || ""),
          edited: !!e.edited,
          thumb: typeof e.thumb === "string" && e.thumb.indexOf("data:image/") === 0 ? e.thumb : "",
          words: Array.isArray(e.words) ? e.words.map(String) : [],
          imageId: e.imageId ? String(e.imageId) : ""
        }))
      };
    } catch (e) {
      return blank();
    }
  }

  function save(storage, record) {
    storage.setItem(KEY, JSON.stringify({ v: 1, entries: (record && record.entries) || [] }));
  }

  function toJSON(record) {
    return JSON.stringify({ v: 1, entries: (record && record.entries) || [] }, null, 1);
  }

  function mergeImport(record, raw) {
    let data;
    try { data = typeof raw === "string" ? JSON.parse(raw) : raw; }
    catch (e) { return { ok: false, record: record || blank() }; }
    if (!data || !Array.isArray(data.entries)) return { ok: false, record: record || blank() };
    const entries = ((record && record.entries) || []).slice();
    const ids = {};
    entries.forEach(e => { ids[e.id] = true; });
    data.entries.forEach(e => {
      if (!e || !e.id || !e.text || !TYPES[e.type] || ids[e.id]) return;
      ids[e.id] = true;
      entries.push({
        id: String(e.id),
        at: String(e.at || ""),
        type: e.type,
        text: String(e.text),
        note: String(e.note || ""),
        href: String(e.href || ""),
        source: e.source === "auto" ? "auto" : "manual",
        key: String(e.key || ""),
        edited: !!e.edited,
        thumb: typeof e.thumb === "string" && e.thumb.indexOf("data:image/") === 0 ? e.thumb : "",
        words: Array.isArray(e.words) ? e.words.map(String) : [],
        imageId: e.imageId ? String(e.imageId) : ""
      });
    });
    return { ok: true, record: { entries } };
  }

  return {
    KEY, TYPES, blank, add, edit, remove, counts, summary, filter, groupByDay, when,
    remember, journalEntry, diffCanvas, ingest, load, save, toJSON, mergeImport
  };
});
