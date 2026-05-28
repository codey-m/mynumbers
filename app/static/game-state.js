console.log("game-state.js loaded");

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let puzzle = null;

// Rush mode state
let gameMode = "practice";
let rushTimer = null;
let timeRemaining = 0;
let puzzlesSolved = 0;
let currentDifficulty = 1;
let maxDifficultyReached = 1;
let rushIntroPlaying = false;
let skipIntroAnimation = false;
let rushStarted = false;

// Share state (captured at end of rush, before Tim is hidden)
let currentShareBlob = null;
let currentShareBlobURL = null;

// Lightboard
let lightboardZoneIndex = 0;
let lightboardShuffledZones = [];
let lightboardEqEls = [];

// 4 rows × 3 columns of pre-defined positions (left%, top%)
// Shuffled at the start of each rush so the fill pattern is different every game
const LIGHTBOARD_ZONES = [
  [2, 5],  [34, 5],  [67, 5],
  [2, 32], [34, 32], [67, 32],
  [2, 59], [34, 59], [67, 59],
  [2, 79], [34, 79], [67, 79],
];

const LIGHTBOARD_COLORS = [
  { color: "#ff6ec7", glow: "rgba(255,110,199,0.5)" }, // neon pink
  { color: "#39ff14", glow: "rgba(57,255,20,0.5)"   }, // neon green
  { color: "#ffe033", glow: "rgba(255,224,51,0.5)"  }, // neon yellow
  { color: "#00d4ff", glow: "rgba(0,212,255,0.5)"   }, // neon cyan
  { color: "#ff9d00", glow: "rgba(255,157,0,0.5)"   }, // neon orange
  { color: "#c77dff", glow: "rgba(199,125,255,0.5)" }, // neon purple
];

// Drag/drop constants
const SNAP_THRESHOLD = 120;
const SNAP_ANIM_MS = 180;
const TAP_MOVE_PX = 18;
const CLICK_SUPPRESS_MS = 1200;

const GAME_URL = "https://mynumbers.onrender.com/";

let suppressClickUntil = 0;
let pointerState = null;
let scrollLocked = false;

let autoCheckTimeout = null;
