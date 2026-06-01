import styled, { createGlobalStyle, keyframes } from "styled-components"

const tkFade = keyframes`
  from { opacity: 0; transform: translateY(-2px); }
  to { opacity: 1; transform: none; }
`

const treeTap = keyframes`
  0%   { r: 22; }
  60%  { r: 28; }
  100% { r: 22; }
`

const treeEval = keyframes`
  0%   { r: 22; }
  35%  { r: 30; stroke: #ffb300; stroke-width: 6; }
  100% { r: 22; }
`

const jumpPulse = keyframes`
  0%   { box-shadow: inset 0 0 0 0 transparent; }
  20%  { box-shadow: inset 0 0 0 4px color-mix(in srgb, var(--tone, var(--mit-red)) 50%, transparent); }
  100% { box-shadow: inset 0 0 0 0 transparent; }
`

export const ExplainerGlobalStyles = createGlobalStyle`
  body.explainer-mode {
    background: #e8e8e8;
  }
`

export const ExplainerContainer = styled.div`
  --mit-red: #750014;
  --mit-red-2: #A31F34;
  --ink: #0f172a;
  --ink-soft: #374151;
  --line: #d0d0d0;
  --bg-soft: #f5f5f5;
  --bg-softer: #f0f0f0;
  --c-tree: #1f7a3a;
  --c-tree-bg: #e6f4ec;
  --c-prob: #1E63D8;
  --c-prob-bg: #e7eefc;
  --c-search: #a16207;
  --c-search-bg: #fef9c3;
  --c-set: #6e35b8;
  --c-set-bg: #ede4fa;
  --shadow-card: 0 6px 20px rgba(15, 23, 42, 0.07);
  --radius: 10px;

  max-width: 1040px;
  margin: 24px auto;
  padding: 16px 18px 22px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(2, 6, 23, 0.08);

  /* ── Top bar ── */
  .ex-topbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 2px 10px;
  }

  .ex-back {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--bg-soft);
    color: var(--ink);
    text-decoration: none;
    font-weight: 700;
    font-size: 18px;
    border: none;
    cursor: pointer;
    transition: background 150ms;
    &:hover { background: #e5e7eb; }
  }

  .ex-title-block { flex: 1; }
  .ex-title {
    font-family: 'Fredoka One', system-ui, sans-serif;
    font-size: 20px;
    letter-spacing: 0.5px;
    color: var(--ink);
    line-height: 1;
  }
  .ex-brand { color: var(--mit-red); }
  .ex-subtitle {
    margin-top: 4px;
    font-size: 13px;
    color: var(--ink-soft);
    line-height: 1.2;
  }

  .ex-counter {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    color: var(--ink-soft);
    background: var(--bg-soft);
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 13px;
  }

  /* ── Progress bar ── */
  .ex-progress {
    height: 4px;
    background: #ececec;
    border-radius: 99px;
    overflow: hidden;
    margin-bottom: 12px;
  }
  .ex-progress-fill {
    height: 100%;
    width: 14.2857%;
    background: linear-gradient(90deg, var(--mit-red), var(--mit-red-2));
    transition: width 320ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* ── Puzzle strip ── */
  .ex-puzzle-strip {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    grid-template-areas:
      "target template"
      "target bank";
    column-gap: 14px;
    row-gap: 10px;
    align-items: center;
    padding: 10px 14px;
    margin-bottom: 14px;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: var(--shadow-card);
  }

  .ex-mini-target {
    grid-area: target;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 14px;
    min-width: 92px;
    background: linear-gradient(135deg, #750014 0%, #A31F34 100%);
    border-radius: 8px;
    color: #fff;
  }
  .ex-mini-label {
    font-size: 10px;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    opacity: 0.85;
    font-weight: 700;
  }
  .ex-mini-target-val {
    font-family: 'Fredoka One', sans-serif;
    font-size: 34px;
    line-height: 1;
    margin-top: 2px;
  }

  .ex-mini-template {
    grid-area: template;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 8px;
    background: var(--bg-soft);
    border: 1px solid var(--line);
    border-radius: 8px;
    font-weight: 700;
    color: var(--ink);
    font-size: 18px;
  }
  .ex-tok { display: inline-block; padding: 0 2px; }
  .ex-tok-paren { color: #6b7280; font-weight: 600; }
  .ex-tok-op { color: var(--ink); font-weight: 800; }
  .ex-mini-slot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 30px;
    height: 30px;
    border-radius: 6px;
    background: linear-gradient(180deg, #f5f5f5, #e0e0e0);
    box-shadow: inset 0 -2px 0 rgba(255, 255, 255, 0.6);
    font-weight: 700;
    color: var(--ink);
    font-size: 14px;
    letter-spacing: 1px;
  }

  .ex-mini-bank {
    grid-area: bank;
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    padding: 6px 8px;
    background: var(--bg-softer);
    border-radius: 8px;
  }
  .ex-mini-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 30px;
    height: 30px;
    padding: 0 8px;
    background: var(--mit-red);
    color: #fff;
    font-weight: 700;
    font-size: 14px;
    border-radius: 6px;
    box-shadow: 0 3px 8px rgba(30, 30, 30, 0.18);
  }

  /* ── Carousel viewport ── */
  .ex-viewport {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius);
    outline: none;
    &:focus-visible {
      box-shadow: 0 0 0 3px rgba(163, 31, 52, 0.25);
    }
  }

  .ex-track {
    display: flex;
    transition: transform 320ms cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform;
  }

  .ex-slide {
    flex: 0 0 100%;
    min-width: 100%;
    box-sizing: border-box;
    padding: 18px 6px 8px;
  }

  .ex-slide[data-tone="tree"]   { --tone: var(--c-tree); --tone-bg: var(--c-tree-bg); }
  .ex-slide[data-tone="prob"]   { --tone: var(--c-prob); --tone-bg: var(--c-prob-bg); }
  .ex-slide[data-tone="search"] { --tone: var(--c-search); --tone-bg: var(--c-search-bg); }
  .ex-slide[data-tone="set"]    { --tone: var(--c-set); --tone-bg: var(--c-set-bg); }
  .ex-slide[data-tone="neutral"]{ --tone: var(--mit-red); --tone-bg: #f5e9eb; }

  .ex-h {
    margin: 0 0 6px;
    font-size: 22px;
    color: var(--ink);
    line-height: 1.25;
    font-family: 'Fredoka One', system-ui, sans-serif;
    font-weight: 400;
  }
  .ex-sub {
    margin: 0 0 14px;
    color: var(--ink-soft);
    font-size: 14px;
  }
  .ex-row-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
  }
  .ex-course-tag {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    padding: 4px 8px;
    border-radius: 999px;
    background: var(--tone-bg);
    color: var(--tone);
    border: 1px solid color-mix(in srgb, var(--tone) 25%, transparent);
  }

  /* ── Pipeline (slide 1) ── */
  .ex-pipeline {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: 4px;
    padding: 8px 4px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }

  .ex-stage {
    flex: 1 1 0;
    min-width: 110px;
    background: #fff;
    border: 2px solid var(--line);
    border-radius: 12px;
    padding: 12px 8px 10px;
    text-align: center;
    cursor: pointer;
    transition: transform 220ms, box-shadow 220ms, border-color 220ms;
    font: inherit;
    color: var(--ink);
  }

  .ex-stage[data-tone="tree"]   { border-color: color-mix(in srgb, var(--c-tree) 35%, var(--line)); }
  .ex-stage[data-tone="prob"]   { border-color: color-mix(in srgb, var(--c-prob) 35%, var(--line)); }
  .ex-stage[data-tone="search"] { border-color: color-mix(in srgb, var(--c-search) 35%, var(--line)); }
  .ex-stage[data-tone="set"]    { border-color: color-mix(in srgb, var(--c-set) 35%, var(--line)); }
  .ex-stage[data-tone="connect"]{ border-color: color-mix(in srgb, var(--mit-red) 35%, var(--line)); }

  .ex-stage:hover, .ex-stage:focus-visible {
    transform: translateY(-2px);
    box-shadow: var(--shadow-card);
    outline: none;
  }

  .ex-stage-name {
    font-weight: 700;
    margin-top: 4px;
    font-size: 14px;
  }
  .ex-stage-tag {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--ink-soft);
    margin-top: 2px;
  }

  .ex-stage-mini {
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .ex-mini-node {
    width: 10px; height: 10px;
    background: var(--c-tree);
    border-radius: 50%;
    display: inline-block;
  }
  .ex-mini-edge {
    width: 14px; height: 2px;
    background: #c8d2c0;
    display: inline-block;
  }

  .ex-mini-x  { color: #b03a3a; font-weight: 800; opacity: 0.35; transition: opacity 280ms; }
  .ex-mini-ok { color: var(--c-tree); font-weight: 800; opacity: 0; transition: opacity 280ms; }
  .ex-mini-node, .ex-mini-edge { opacity: 0.45; transition: opacity 280ms; }
  [data-stage="play"] .ex-mini-chip { opacity: 0.45; transition: opacity 280ms; }

  .ex-stage:hover [data-stage="build"] > *:nth-child(1) { opacity: 1; transition-delay:  60ms; }
  .ex-stage:hover [data-stage="build"] > *:nth-child(2) { opacity: 1; transition-delay: 120ms; }
  .ex-stage:hover [data-stage="build"] > *:nth-child(3) { opacity: 1; transition-delay: 180ms; }
  .ex-stage:hover [data-stage="build"] > *:nth-child(4) { opacity: 1; transition-delay: 240ms; }
  .ex-stage:hover [data-stage="build"] > *:nth-child(5) { opacity: 1; transition-delay: 300ms; }
  .ex-stage:hover [data-stage="build"] .ex-mini-ok      { opacity: 1; transition-delay: 420ms; }

  .ex-stage:hover [data-stage="filter"] .ex-mini-x:nth-child(1) { opacity: 1; transition-delay:  60ms; }
  .ex-stage:hover [data-stage="filter"] .ex-mini-x:nth-child(2) { opacity: 1; transition-delay: 160ms; }
  .ex-stage:hover [data-stage="filter"] .ex-mini-x:nth-child(3) { opacity: 1; transition-delay: 260ms; }
  .ex-stage:hover [data-stage="filter"] .ex-mini-ok             { opacity: 1; transition-delay: 380ms; }

  .ex-stage:hover [data-stage="verify"] .ex-mini-ok { opacity: 1; transition-delay: 380ms; }

  .ex-stage:hover [data-stage="play"] .ex-mini-chip:nth-child(1) { opacity: 1; transition-delay:  60ms; }
  .ex-stage:hover [data-stage="play"] .ex-mini-chip:nth-child(2) { opacity: 1; transition-delay: 160ms; }
  .ex-stage:hover [data-stage="play"] .ex-mini-ok                { opacity: 1; transition-delay: 280ms; }

  .ex-mini-perm {
    width: 14px; height: 8px;
    background: var(--c-search);
    border-radius: 2px;
    opacity: 0.5;
    transition: opacity 220ms;
  }
  .ex-stage:hover .ex-mini-perm:nth-child(1) { opacity: 1; transition-delay: 60ms; }
  .ex-stage:hover .ex-mini-perm:nth-child(2) { opacity: 1; transition-delay: 160ms; }
  .ex-stage:hover .ex-mini-perm:nth-child(3) { opacity: 1; transition-delay: 260ms; }

  .ex-mini-blank {
    display: inline-block;
    font-weight: 800;
    letter-spacing: 1px;
    color: var(--ink-soft);
    border-bottom: 2px solid var(--c-tree);
    min-width: 16px;
  }
  .ex-mini-op { color: var(--ink); font-weight: 800; }

  .ex-pipe-arrow {
    align-self: center;
    color: #9ca3af;
    font-size: 18px;
    font-weight: 700;
  }

  /* ── "Go deeper" drawer ── */
  .ex-deeper {
    margin-top: 10px;
    background: transparent;
    border: 1px dashed color-mix(in srgb, var(--tone, var(--mit-red)) 40%, transparent);
    color: var(--tone, var(--mit-red));
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    &:hover { background: var(--tone-bg, var(--bg-soft)); }
  }
  .ex-drawer {
    margin-top: 10px;
    padding: 12px 14px;
    background: var(--tone-bg, var(--bg-soft));
    border-radius: 8px;
    border-left: 3px solid var(--tone, var(--mit-red));
    font-size: 13.5px;
    line-height: 1.5;
    color: var(--ink-soft);
  }
  .ex-drawer code {
    font-family: ui-monospace, monospace;
    background: rgba(0,0,0,0.06);
    padding: 1px 5px;
    border-radius: 3px;
  }

  /* ── Tabs ── */
  .ex-tabs {
    display: flex;
    gap: 4px;
    background: var(--bg-softer);
    padding: 4px;
    border-radius: 8px;
    margin-bottom: 12px;
    width: fit-content;
  }
  .ex-tab {
    padding: 6px 14px;
    border: none;
    background: transparent;
    color: var(--ink-soft);
    border-radius: 6px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: background 150ms, color 150ms;
  }
  .ex-tab.is-active {
    background: #fff;
    color: var(--tone, var(--ink));
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  /* ── Tree (slide 2) ── */
  .ex-tree-wrap {
    width: 100%;
  }
  .ex-tree-svg {
    width: 100%;
    height: auto;
    background: var(--c-tree-bg);
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--c-tree) 22%, var(--line));
  }

  .tree-edge {
    stroke: #98b7a3;
    stroke-width: 2;
    transition: stroke 200ms, stroke-width 200ms;
  }
  .tree-edge.is-hi { stroke: var(--c-tree); stroke-width: 4; }

  .tree-node { cursor: pointer; }
  .tree-node circle {
    fill: #fff;
    stroke: var(--c-tree);
    stroke-width: 2;
    transition: fill 180ms, stroke-width 180ms, r 180ms;
  }
  .tree-node.is-leaf circle { fill: #fff; stroke: var(--c-tree); }
  .tree-node.is-op circle   { fill: var(--c-tree); }
  .tree-node text {
    font-family: 'Fredoka One', sans-serif;
    font-size: 18px;
    text-anchor: middle;
    dominant-baseline: central;
    pointer-events: none;
    user-select: none;
    transition: font-size 180ms;
  }
  .tree-node.is-op text { fill: #fff; }
  .tree-node.is-leaf text { fill: var(--c-tree); }

  .tree-node:hover circle { stroke-width: 3.5; }
  .tree-node:hover.is-leaf circle { fill: #fffde6; }

  .tree-node.is-hi circle {
    stroke-width: 5;
    stroke: #ffb300;
    filter: drop-shadow(0 0 4px rgba(255, 179, 0, 0.6));
  }
  .tree-node.is-hi.is-leaf circle { fill: #fff3a8; }
  .tree-node.is-hi.is-op circle { fill: #2a8a4a; }

  .tree-node.tap-pulse circle {
    animation: ${treeTap} 320ms ease-out;
  }

  .tree-node.eval-pulse circle {
    animation: ${treeEval} 700ms ease;
  }

  .tree-badge-bg {
    fill: #ffd200;
    stroke: #c98800;
    stroke-width: 1.5;
    opacity: 0;
    transition: opacity 280ms;
  }
  .tree-badge-text {
    font-family: 'Fredoka One', sans-serif;
    font-size: 14px;
    fill: #1a1a1a;
    text-anchor: middle;
    dominant-baseline: central;
    opacity: 0;
    transition: opacity 280ms;
    pointer-events: none;
  }
  .tree-node.has-val .tree-badge-bg,
  .tree-node.has-val .tree-badge-text {
    opacity: 1;
  }

  .ex-tree-readout {
    margin-top: 12px;
    background: var(--bg-soft);
    border-radius: 8px;
    padding: 10px 12px;
  }
  .ex-readout-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--ink-soft);
    font-weight: 700;
    margin-bottom: 6px;
  }
  .ex-readout-line {
    display: flex;
    gap: 14px;
    align-items: baseline;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }
  .ex-readout-expr {
    font-family: ui-monospace, monospace;
    font-size: 16px;
    color: var(--ink);
    flex: 1;
    min-width: 200px;
    word-break: break-word;
  }
  .ex-readout-val {
    font-weight: 700;
    color: var(--c-tree);
    font-size: 16px;
    font-family: 'Fredoka One', sans-serif;
  }

  .ex-tree-layout {
    display: grid;
    grid-template-columns: minmax(0, 2.1fr) minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }
  .ex-tree-col-visual,
  .ex-tree-col-readout {
    min-width: 0;
  }
  .ex-tree-col-readout .ex-tree-readout {
    margin-top: 0;
  }

  /* ── Sampler (slide 3) ── */
  .ex-sampler {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 14px;
    align-items: stretch;
  }
  .ex-sampler-controls {
    background: var(--c-prob-bg);
    border: 1px solid color-mix(in srgb, var(--c-prob) 25%, var(--line));
    border-radius: 10px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ex-control {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .ex-control label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--c-prob); }
  .ex-control select {
    padding: 6px 8px;
    border: 1px solid color-mix(in srgb, var(--c-prob) 30%, var(--line));
    border-radius: 6px;
    background: #fff;
    font-size: 13px;
    font-weight: 600;
  }

  .ex-sampler-out {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .ex-stream {
    min-height: 200px;
    max-height: 260px;
    overflow-y: auto;
    padding: 8px 10px;
    background: #0f172a;
    color: #d1d5db;
    border-radius: 8px;
    font-family: ui-monospace, monospace;
    font-size: 13px;
    line-height: 1.55;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ex-attempt {
    display: grid;
    grid-template-columns: 38px 1fr 90px 1fr;
    gap: 8px;
    align-items: center;
    padding: 2px 6px;
    border-radius: 4px;
    animation: ${tkFade} 260ms ease both;
  }
  .ex-attempt.is-ok  { background: rgba(52, 211, 153, 0.16); color: #d1fae5; }
  .ex-attempt.is-bad { color: #9ca3af; }
  .ex-attempt-num { color: #6b7280; font-size: 11px; text-align: right; }
  .ex-attempt-expr { color: #e5e7eb; }
  .ex-attempt.is-ok .ex-attempt-expr { color: #ecfdf5; font-weight: 700; }
  .ex-attempt-val { color: #ffd200; font-weight: 700; text-align: right; }
  .ex-attempt.is-ok .ex-attempt-val { color: #6ee7b7; }
  .ex-attempt-reason { color: #94a3b8; font-size: 11.5px; }
  .ex-attempt.is-ok .ex-attempt-reason { color: #6ee7b7; font-weight: 700; }

  .ex-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .ex-stat-card {
    padding: 8px 10px;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 8px;
    text-align: center;
  }
  .ex-stat-name {
    font-size: 11px;
    color: var(--ink-soft);
    font-weight: 600;
  }
  .ex-stat-val {
    font-family: 'Fredoka One', sans-serif;
    color: var(--c-prob);
    font-size: 18px;
    margin-top: 2px;
  }

  .ex-mini-btn {
    padding: 8px 12px;
    border: none;
    background: #111827;
    color: #fff;
    border-radius: 7px;
    font-weight: 700;
    cursor: pointer;
    font-size: 13px;
    transition: transform 100ms, background 150ms;
    &:hover { background: #1f2937; }
    &:active { transform: scale(0.98); }
  }
  .ex-mini-btn-primary { background: var(--mit-red); }
  .ex-mini-btn-primary:hover { background: var(--mit-red-2); }

  .ex-tip {
    font-size: 12px;
    color: var(--ink-soft);
    margin: 8px 0 0;
  }

  /* ── Permutation enumerator (slide 4) ── */
  .ex-perm {
    display: grid;
    gap: 12px;
  }
  .ex-perm-board {
    font-size: 22px;
    font-family: 'Fredoka One', sans-serif;
    padding: 16px 14px;
    background: var(--c-search-bg);
    border: 1px solid color-mix(in srgb, var(--c-search) 25%, var(--line));
    border-radius: 10px;
    text-align: center;
    letter-spacing: 1px;
  }
  .ex-pslot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 38px;
    height: 38px;
    margin: 0 2px;
    background: #fff;
    border: 2px dashed var(--c-search);
    color: var(--c-search);
    border-radius: 8px;
    font-size: 18px;
    transition: background 220ms, color 220ms, transform 220ms;
  }
  .ex-pslot.is-filled {
    background: var(--c-search);
    color: #fff;
    border-style: solid;
  }
  .ex-pslot.is-pulse { transform: scale(1.08); }

  .ex-eq {
    margin: 0 6px 0 10px;
    color: var(--ink-soft);
    opacity: 0;
    transition: opacity 200ms ease;
  }
  .ex-result {
    display: inline-block;
    min-width: 48px;
    color: var(--c-search);
    opacity: 0;
    transition: opacity 200ms ease;
  }
  .ex-perm-board.has-result .ex-eq,
  .ex-perm-board.has-result .ex-result {
    opacity: 1;
  }
  .ex-result-check {
    display: inline-block;
    margin-left: 6px;
    color: #16a34a;
    opacity: 0;
    transform: scale(0.6);
    transition: opacity 220ms ease, transform 220ms ease;
  }
  .ex-result-check.is-visible {
    opacity: 1;
    transform: scale(1.05);
  }

  .ex-perm-controls {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
  }
  .ex-counter-card {
    background: var(--bg-soft);
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: var(--ink);
  }

  .ex-formula-card {
    background: #fff;
    border: 1px solid var(--line);
    border-left: 3px solid var(--c-search);
    border-radius: 8px;
    padding: 10px 14px;
    font-family: ui-monospace, monospace;
  }
  .ex-formula-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--ink-soft);
    font-weight: 700;
    margin-bottom: 2px;
    font-family: system-ui, sans-serif;
  }
  .ex-formula { font-size: 14px; color: var(--ink); }
  .ex-formula strong { color: var(--c-search); }

  /* ── Courses (slide 5) ── */
  .ex-courses {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 14px;
  }
  .ex-course-card {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 16px;
    position: relative;
    transition: box-shadow 200ms, transform 200ms;
    &:hover { box-shadow: var(--shadow-card); transform: translateY(-2px); }
  }
  .ex-course-flag {
    position: absolute;
    top: -10px; left: 14px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.7px;
    padding: 3px 8px;
    border-radius: 99px;
    text-transform: uppercase;
  }
  .ex-course-primary { border-color: color-mix(in srgb, var(--c-prob) 30%, var(--line)); }
  .ex-course-primary .ex-course-flag { background: var(--c-prob); color: #fff; }
  .ex-course-secondary { border-color: color-mix(in srgb, var(--c-tree) 30%, var(--line)); }
  .ex-course-secondary .ex-course-flag { background: var(--c-tree); color: #fff; }

  .ex-course-card h3 {
    margin: 6px 0 6px;
    font-size: 16px;
    color: var(--ink);
  }
  .ex-course-blurb {
    margin: 0 0 8px;
    font-size: 13px;
    color: var(--ink-soft);
  }
  .ex-course-card ul {
    margin: 0 0 8px;
    padding-left: 18px;
    font-size: 13px;
    color: var(--ink);
  }
  .ex-course-card li { margin-bottom: 2px; }
  .ex-course-cta {
    font-weight: 700;
    text-decoration: none;
    font-size: 13px;
    color: var(--c-prob);
  }
  .ex-course-secondary .ex-course-cta { color: var(--c-tree); }

  .ex-concepts {
    margin-bottom: 14px;
  }
  .ex-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }
  .ex-concept-chip {
    padding: 6px 12px;
    background: #fff;
    border: 1px solid var(--line);
    color: var(--ink);
    border-radius: 99px;
    font-weight: 600;
    font-size: 12.5px;
    cursor: pointer;
    transition: background 150ms, border-color 150ms;
    &:hover { background: var(--bg-soft); border-color: #9ca3af; }
  }

  .ex-final-cta {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 10px;
  }
  .ex-cta {
    padding: 12px 22px;
    border-radius: 8px;
    font-weight: 700;
    text-decoration: none;
    font-size: 14px;
    border: none;
    cursor: pointer;
  }
  .ex-cta-primary {
    background: var(--mit-red);
    color: #fff;
    &:hover { background: var(--mit-red-2); }
  }
  .ex-cta-secondary {
    background: #fff;
    color: var(--mit-red);
    border: 2px solid var(--mit-red);
  }

  /* ── Bottom nav ── */
  .ex-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
  }
  .ex-nav-btn {
    padding: 9px 16px;
    border: none;
    background: var(--bg-soft);
    color: var(--ink);
    border-radius: 8px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    transition: background 150ms, color 150ms, opacity 150ms;
    &:hover { background: #e5e7eb; }
    &:disabled { opacity: 0.35; cursor: not-allowed; }
  }
  .ex-nav-btn-primary { background: var(--mit-red); color: #fff; }
  .ex-nav-btn-primary:hover { background: var(--mit-red-2); }

  .ex-dots {
    display: flex;
    gap: 6px;
  }
  .ex-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: none;
    background: #d1d5db;
    cursor: pointer;
    padding: 0;
    transition: background 150ms, transform 150ms;
    &:hover { background: #9ca3af; }
    &.is-active { background: var(--mit-red); transform: scale(1.25); }
  }

  .ex-slide.is-jumped {
    animation: ${jumpPulse} 1.6s ease;
  }

  /* ── Reduced motion ── */
  @media (prefers-reduced-motion: reduce) {
    .ex-track,
    .ex-progress-fill,
    .ex-stage,
    .ex-course-card,
    .tree-edge,
    .tree-node circle,
    .ex-pslot {
      transition: none !important;
    }
    .ex-stream .tk-pulse,
    .tree-node.eval-pulse circle,
    .ex-slide.is-jumped {
      animation: none !important;
    }
  }

  /* ── Responsive ── */
  @media (max-width: 800px) {
    .ex-puzzle-strip {
      grid-template-columns: auto 1fr;
      gap: 8px;
      text-align: left;
    }
    .ex-bank-row { justify-content: flex-start; }
    .ex-tree-layout,
    .ex-tree-wrap,
    .ex-sampler,
    .ex-filters-wrap,
    .ex-multi,
    .ex-courses {
      grid-template-columns: 1fr;
    }
    .ex-stats { grid-template-columns: repeat(3, 1fr); }
    .ex-stage { min-width: 90px; }
  }

  @media (max-width: 540px) {
    .ex-h { font-size: 18px; }
    .ex-stats { grid-template-columns: 1fr 1fr 1fr; gap: 4px; }
    .ex-stat-val { font-size: 14px; }
    .ex-perm-board { font-size: 16px; padding: 10px; letter-spacing: 0; }
    .ex-pslot { min-width: 28px; height: 28px; font-size: 14px; }
    .ex-pipeline { gap: 2px; }
    .ex-pipe-arrow { display: none; }
  }
`
