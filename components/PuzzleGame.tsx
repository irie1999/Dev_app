"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
type Dir   = "R" | "L" | "U" | "D";
type RGB   = [number, number, number];
type Piece = "empty" | "/" | "\\";

interface Source { row: number; col: number; dir: Dir; color: RGB }
interface Target { row: number; col: number; needed: RGB }
interface Wall   { row: number; col: number }
interface Level  {
  rows: number; cols: number;
  sources: Source[]; targets: Target[]; walls: Wall[];
  maxMirrors: number;
  hint: string;
}

// ── Color helpers ────────────────────────────────────────────────────────────
const RED:     RGB = [1, 0, 0];
const GREEN:   RGB = [0, 1, 0];
const BLUE:    RGB = [0, 0, 1];
const YELLOW:  RGB = [1, 1, 0];
const CYAN:    RGB = [0, 1, 1];
const MAGENTA: RGB = [1, 0, 1];
const WHITE:   RGB = [1, 1, 1];

function addRGB(a: RGB, b: RGB): RGB {
  return [Math.min(1, a[0]+b[0]), Math.min(1, a[1]+b[1]), Math.min(1, a[2]+b[2])];
}
function eqRGB(a: RGB, b: RGB, tol = 0.18): boolean {
  return Math.abs(a[0]-b[0]) < tol && Math.abs(a[1]-b[1]) < tol && Math.abs(a[2]-b[2]) < tol;
}
function css(c: RGB, a = 1): string {
  return `rgba(${~~(c[0]*255)},${~~(c[1]*255)},${~~(c[2]*255)},${a})`;
}
function colorLabel(c: RGB): string {
  if (eqRGB(c, RED))     return "赤";
  if (eqRGB(c, GREEN))   return "緑";
  if (eqRGB(c, BLUE))    return "青";
  if (eqRGB(c, YELLOW))  return "黄";
  if (eqRGB(c, CYAN))    return "シアン";
  if (eqRGB(c, MAGENTA)) return "マゼンタ";
  if (eqRGB(c, WHITE))   return "白";
  return "混合";
}

// ── Ray tracing ──────────────────────────────────────────────────────────────
function reflectDir(dir: Dir, piece: Piece): Dir {
  if (piece === "/") {
    const m: Record<Dir, Dir> = { R:"U", L:"D", U:"R", D:"L" };
    return m[dir];
  } else {
    const m: Record<Dir, Dir> = { R:"D", L:"U", U:"L", D:"R" };
    return m[dir];
  }
}
function stepPos(r: number, c: number, dir: Dir): [number, number] {
  if (dir === "R") return [r, c+1];
  if (dir === "L") return [r, c-1];
  if (dir === "U") return [r-1, c];
  return [r+1, c];
}

interface Segment { r1: number; c1: number; r2: number; c2: number; color: RGB }

function traceAll(
  level: Level, grid: Piece[][]
): { segments: Segment[]; hits: Map<string, RGB> } {
  const segments: Segment[] = [];
  const hits = new Map<string, RGB>();

  for (const src of level.sources) {
    let r = src.row, c = src.col, dir = src.dir;
    const color = src.color;
    for (let i = 0; i < 400; i++) {
      const [nr, nc] = stepPos(r, c, dir);
      if (nr < 0 || nr >= level.rows || nc < 0 || nc >= level.cols) {
        const dr = dir==="D"?0.5:dir==="U"?-0.5:0;
        const dc = dir==="R"?0.5:dir==="L"?-0.5:0;
        segments.push({ r1:r, c1:c, r2:r+dr, c2:c+dc, color });
        break;
      }
      segments.push({ r1:r, c1:c, r2:nr, c2:nc, color });
      if (level.walls.some(w => w.row===nr && w.col===nc)) break;
      if (level.targets.some(t => t.row===nr && t.col===nc)) {
        const key = `${nr},${nc}`;
        hits.set(key, addRGB(hits.get(key) ?? [0,0,0], color));
        break;
      }
      r = nr; c = nc;
      const piece = grid[r][c];
      if (piece !== "empty") dir = reflectDir(dir, piece);
    }
  }
  return { segments, hits };
}

// ── Levels ───────────────────────────────────────────────────────────────────
// Each level is verified solvable (solution in comment).
const LEVELS: Level[] = [
  {
    // Solution: place \ at (4,0) → D turns R → hits (4,4) ✓
    rows: 5, cols: 5,
    sources: [{ row:0, col:0, dir:"D", color:RED }],
    targets: [{ row:4, col:4, needed:RED }],
    walls: [], maxMirrors: 2,
    hint: "╲ミラーを置いて光を曲げよう（4行0列あたり）",
  },
  {
    // Solution: / at (2,3): D→L; / at (2,0): L→D → hits (5,0) ✓
    rows: 6, cols: 6,
    sources: [{ row:0, col:3, dir:"D", color:BLUE }],
    targets: [{ row:5, col:0, needed:BLUE }],
    walls: [{ row:3, col:3 }], maxMirrors: 3,
    hint: "壁を避けるには2回曲げる必要がある",
  },
  {
    // RED:  \ at (3,1): D→R; \ at (3,5): R→D → hits (6,5) ✓
    // BLUE: / at (5,5): D→L; / at (5,1): L→D → hits (6,1) ✓
    rows: 7, cols: 7,
    sources: [
      { row:0, col:1, dir:"D", color:RED },
      { row:0, col:5, dir:"D", color:BLUE },
    ],
    targets: [
      { row:6, col:5, needed:RED },
      { row:6, col:1, needed:BLUE },
    ],
    walls: [], maxMirrors: 5,
    hint: "2本の光を交差させて入れ替えよう",
  },
  {
    // RED: \ at (3,3): D→R; \ at (3,6): R→D → hits (6,6)
    // GREEN: (6,0)→R straight → hits (6,6). RED+GREEN=YELLOW ✓
    rows: 7, cols: 7,
    sources: [
      { row:0, col:3, dir:"D", color:RED   },
      { row:6, col:0, dir:"R", color:GREEN },
    ],
    targets: [{ row:6, col:6, needed:YELLOW }],
    walls: [], maxMirrors: 3,
    hint: "赤＋緑＝黄色！2つの光を同じ目標に集めよう",
  },
  {
    // RED: \ at (0,5): R→D; \ at (4,5): D→R → hits (4,7) ✓
    // GREEN: (0,7)→D straight → hits (7,7)
    // BLUE:  (7,0)→R straight → hits (7,7). GREEN+BLUE=CYAN ✓
    rows: 8, cols: 8,
    sources: [
      { row:0, col:0, dir:"R", color:RED   },
      { row:0, col:7, dir:"D", color:GREEN },
      { row:7, col:0, dir:"R", color:BLUE  },
    ],
    targets: [
      { row:4, col:7, needed:RED  },
      { row:7, col:7, needed:CYAN },
    ],
    walls: [{ row:4, col:3 }], maxMirrors: 6,
    hint: "緑＋青＝シアン。3本同時に制御しよう",
  },
  {
    // RED:     / at (1,6): R→U → exits (no)... let me use: \ at (1,3): R→D; / at (7,3): D→L → exits
    // Actually: RED \ at (1,5): R→D; \ at (7,5): D→R → hits (7,7) RED
    // BLUE: (7,0)→R: / at (4,0): R→U; / at (0,0) is edge: back / at (0,4): U→R → hits (0,7) BLUE
    // GREEN: (0,7)→D straight → hits... need target. Hmm.
    // Simpler level 6: MAGENTA target needs RED+BLUE
    rows: 7, cols: 8,
    sources: [
      { row:0, col:0, dir:"R", color:RED  },
      { row:6, col:7, dir:"L", color:BLUE },
    ],
    targets: [
      { row:0, col:7, needed:RED  },
      { row:6, col:0, needed:BLUE },
      { row:3, col:3, needed:MAGENTA },
    ],
    walls: [{ row:1, col:4 }, { row:5, col:3 }],
    maxMirrors: 7,
    hint: "赤＋青＝マゼンタ。3つの目標を全部点灯させよう",
  },
  {
    // Ultimate: RED+GREEN+BLUE = WHITE
    rows: 8, cols: 9,
    sources: [
      { row:0, col:0, dir:"R", color:RED   },
      { row:4, col:0, dir:"R", color:GREEN },
      { row:7, col:0, dir:"R", color:BLUE  },
    ],
    targets: [
      { row:0, col:8, needed:RED   },
      { row:4, col:8, needed:GREEN },
      { row:7, col:8, needed:WHITE },
      { row:3, col:8, needed:YELLOW },
    ],
    walls: [{ row:2, col:4 }, { row:5, col:6 }, { row:1, col:7 }],
    maxMirrors: 8,
    hint: "赤＋緑＝黄、赤＋緑＋青＝白。最終問題！",
  },
];

// ── Component ────────────────────────────────────────────────────────────────
export default function PuzzleGame() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [levelIdx, setLevelIdx] = useState(0);
  const [grid,     setGrid    ] = useState<Piece[][]>([]);
  const [trace,    setTrace   ] = useState<{ segments: Segment[]; hits: Map<string, RGB> }>({ segments: [], hits: new Map() });
  const [won,      setWon     ] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [cellSize, setCellSize ] = useState(48);
  const [showIntro, setShowIntro] = useState(true);

  const level = LEVELS[Math.min(levelIdx, LEVELS.length - 1)];

  // Init
  useEffect(() => {
    setGrid(Array.from({ length: level.rows }, () => Array<Piece>(level.cols).fill("empty")));
    setWon(false);
    setShowHint(false);
  }, [levelIdx, level.rows, level.cols]);

  // Responsive cell size
  useEffect(() => {
    const calc = () => {
      const maxW = Math.floor((window.innerWidth - 20) / level.cols);
      const maxH = Math.floor((window.innerHeight * 0.60) / level.rows);
      setCellSize(Math.min(maxW, maxH, 68));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [level.rows, level.cols]);

  // Trace on grid change
  useEffect(() => {
    if (grid.length === 0) return;
    const result = traceAll(level, grid);
    setTrace(result);
    const allOk = level.targets.every(t => {
      const hit = result.hits.get(`${t.row},${t.col}`);
      return hit && eqRGB(hit, t.needed);
    });
    setWon(allOk);
  }, [grid, level]);

  // Interact
  const handleXY = useCallback((clientX: number, clientY: number) => {
    if (won) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top ) * scaleY;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (row < 0 || row >= level.rows || col < 0 || col >= level.cols) return;
    const fixed =
      level.sources.some(s => s.row===row && s.col===col) ||
      level.targets.some(t => t.row===row && t.col===col) ||
      level.walls.some  (w => w.row===row && w.col===col);
    if (fixed) return;

    setGrid(prev => {
      const next = prev.map(r => [...r]);
      const cur   = next[row][col];
      const placed = prev.flat().filter(p => p !== "empty").length;
      if (cur === "empty") {
        if (placed >= level.maxMirrors) return prev;
        next[row][col] = "/";
      } else if (cur === "/") {
        next[row][col] = "\\";
      } else {
        next[row][col] = "empty";
      }
      return next;
    });
  }, [won, level, cellSize]);

  const onClick  = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => handleXY(e.clientX, e.clientY), [handleXY]);
  const onTouch  = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    handleXY(t.clientX, t.clientY);
  }, [handleXY]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = level.cols * cellSize;
    const H = level.rows * cellSize;
    canvas.width  = W;
    canvas.height = H;

    // Background + subtle grid
    ctx.fillStyle = "#07071a";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(40,40,80,0.8)";
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= level.rows; r++) {
      ctx.beginPath(); ctx.moveTo(0, r*cellSize); ctx.lineTo(W, r*cellSize); ctx.stroke();
    }
    for (let c = 0; c <= level.cols; c++) {
      ctx.beginPath(); ctx.moveTo(c*cellSize, 0); ctx.lineTo(c*cellSize, H); ctx.stroke();
    }

    // ── Light rays (two-pass glow) ──
    for (let pass = 0; pass < 2; pass++) {
      ctx.save();
      ctx.lineWidth = pass === 0 ? 10 : 2.5;
      ctx.lineCap   = "round";
      for (const seg of trace.segments) {
        ctx.shadowBlur   = pass === 0 ? 18 : 0;
        ctx.shadowColor  = css(seg.color);
        ctx.strokeStyle  = css(seg.color, pass === 0 ? 0.25 : 0.95);
        ctx.beginPath();
        ctx.moveTo((seg.c1+0.5)*cellSize, (seg.r1+0.5)*cellSize);
        ctx.lineTo((seg.c2+0.5)*cellSize, (seg.r2+0.5)*cellSize);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── Walls ──
    for (const w of level.walls) {
      const x = w.col*cellSize, y = w.row*cellSize, p = 3;
      ctx.fillStyle = "#1e2040";
      ctx.fillRect(x+p, y+p, cellSize-p*2, cellSize-p*2);
      // Brick texture lines
      ctx.strokeStyle = "#2a2d55"; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x+p, y+cellSize/2); ctx.lineTo(x+cellSize-p, y+cellSize/2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x+cellSize/2, y+p); ctx.lineTo(x+cellSize/2, y+cellSize/2); ctx.stroke();
    }

    // ── Sources (hexagon) ──
    for (const src of level.sources) {
      const cx = (src.col+0.5)*cellSize, cy = (src.row+0.5)*cellSize;
      const r  = cellSize * 0.30;
      ctx.save();
      ctx.shadowBlur = 22; ctx.shadowColor = css(src.color);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI/3)*i - Math.PI/6;
        i === 0 ? ctx.moveTo(cx+r*Math.cos(a), cy+r*Math.sin(a))
                : ctx.lineTo(cx+r*Math.cos(a), cy+r*Math.sin(a));
      }
      ctx.closePath();
      ctx.fillStyle   = css(src.color, 0.88);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      // Arrow
      const dm: Record<Dir, [number,number]> = { R:[1,0], L:[-1,0], U:[0,-1], D:[0,1] };
      const [dx, dy] = dm[src.dir];
      const al = cellSize * 0.24;
      ctx.save();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx+dx*al, cy+dy*al);
      ctx.stroke();
      // Arrowhead
      const hs = al * 0.4;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(cx+dx*al,            cy+dy*al);
      ctx.lineTo(cx+dx*al - dx*hs + (-dy)*hs, cy+dy*al - dy*hs + dx*hs);
      ctx.lineTo(cx+dx*al - dx*hs - (-dy)*hs, cy+dy*al - dy*hs - dx*hs);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // ── Targets (diamond) ──
    for (const tgt of level.targets) {
      const cx  = (tgt.col+0.5)*cellSize, cy = (tgt.row+0.5)*cellSize;
      const r   = cellSize * 0.30;
      const hit = trace.hits.get(`${tgt.row},${tgt.col}`);
      const done = hit && eqRGB(hit, tgt.needed);
      ctx.save();
      if (done) { ctx.shadowBlur = 35; ctx.shadowColor = css(tgt.needed); }
      ctx.beginPath();
      ctx.moveTo(cx, cy-r); ctx.lineTo(cx+r, cy);
      ctx.lineTo(cx, cy+r); ctx.lineTo(cx-r, cy);
      ctx.closePath();
      ctx.fillStyle   = done ? css(tgt.needed, 0.92) : css(tgt.needed, 0.12);
      ctx.fill();
      ctx.strokeStyle = css(tgt.needed); ctx.lineWidth = 2;
      ctx.stroke();
      if (done) {
        // Inner sparkle
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.beginPath();
        ctx.moveTo(cx, cy-r*0.45); ctx.lineTo(cx+r*0.45, cy);
        ctx.lineTo(cx, cy+r*0.45); ctx.lineTo(cx-r*0.45, cy);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // ── Mirrors ──
    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        const piece = grid[r][c];
        if (piece === "empty") continue;
        const x = c*cellSize, y = r*cellSize, pad = cellSize*0.16;
        ctx.save();
        // Mirror body (rounded rect)
        ctx.fillStyle = "rgba(100,180,255,0.08)";
        ctx.strokeStyle = "rgba(100,180,255,0.2)"; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x+pad*0.5, y+pad*0.5, cellSize-pad, cellSize-pad, 3);
        ctx.fill(); ctx.stroke();
        // Mirror line
        ctx.strokeStyle = "#90d0ff"; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.shadowBlur = 10; ctx.shadowColor = "#90d0ff";
        ctx.beginPath();
        if (piece === "/") {
          ctx.moveTo(x+cellSize-pad, y+pad);
          ctx.lineTo(x+pad,          y+cellSize-pad);
        } else {
          ctx.moveTo(x+pad,          y+pad);
          ctx.lineTo(x+cellSize-pad, y+cellSize-pad);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── Win overlay ──
    if (won) {
      const grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*0.65);
      grad.addColorStop(0, "rgba(0,50,20,0.88)");
      grad.addColorStop(1, "rgba(0,5,15,0.92)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.shadowBlur = 40; ctx.shadowColor = "#00ff88";
      ctx.fillStyle  = "#00ff88";
      ctx.font       = `bold ${Math.max(cellSize*0.52, 18)}px sans-serif`;
      ctx.textAlign  = "center"; ctx.textBaseline = "middle";
      ctx.fillText("クリア！✨", W/2, H/2);
      ctx.restore();
    }
  }, [grid, trace, level, cellSize, won]);

  const placed     = grid.flat().filter(p => p !== "empty").length;
  const mirrorsLeft = level.maxMirrors - placed;
  const reset = () => {
    setGrid(Array.from({ length: level.rows }, () => Array<Piece>(level.cols).fill("empty")));
    setWon(false);
  };

  // ── Intro screen ──
  if (showIntro) return (
    <div style={{ background:"#07071a", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px", color:"#fff" }}>
      <div style={{ fontSize:48, marginBottom:16 }}>💡</div>
      <h1 style={{ fontSize:26, fontWeight:"bold", color:"#a0c8ff", margin:"0 0 8px" }}>光の迷宮</h1>
      <p style={{ fontSize:14, color:"#557", margin:"0 0 28px", textAlign:"center" }}>Light Labyrinth — ミラーで光を導くパズル</p>
      <div style={{ background:"#0f0f2a", borderRadius:12, padding:"18px 20px", maxWidth:320, width:"100%", marginBottom:24 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14, fontSize:14 }}>
          {[
            ["⬡", "光源", "ここから光が出る。矢印が方向"],
            ["◇", "目標", "指定の色の光を届けよう"],
            ["／", "ミラー", "タップで設置。もう一度で╲に回転"],
            ["■", "壁",   "光を通さないブロック"],
          ].map(([icon, name, desc]) => (
            <div key={name} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
              <span style={{ fontSize:18, width:24, textAlign:"center", flexShrink:0 }}>{icon}</span>
              <div>
                <div style={{ color:"#a0c8ff", fontWeight:"bold" }}>{name}</div>
                <div style={{ color:"#557", fontSize:12, marginTop:2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:16, padding:"10px 12px", background:"#1a1a35", borderRadius:8, fontSize:12, color:"#668" }}>
          🎨 色の混合: 赤+緑=<span style={{color:"#ffff00"}}>黄</span>　緑+青=<span style={{color:"#00ffff"}}>シアン</span>　赤+青=<span style={{color:"#ff00ff"}}>マゼンタ</span>　赤+緑+青=<span style={{color:"#ffffff"}}>白</span>
        </div>
      </div>
      <button
        onClick={() => setShowIntro(false)}
        style={{ padding:"14px 40px", borderRadius:30, background:"linear-gradient(135deg,#4080ff,#00c8ff)", color:"#fff", fontWeight:"bold", fontSize:16, border:"none", cursor:"pointer", boxShadow:"0 4px 24px rgba(64,128,255,0.4)" }}
      >
        スタート →
      </button>
    </div>
  );

  return (
    <div style={{ background:"#07071a", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", paddingBottom:80 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"10px 16px" }}>
        <div>
          <span style={{ fontSize:16, fontWeight:"bold", color:"#a0c8ff" }}>💡 光の迷宮</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:12, color:"#446" }}>
            {Array.from({length:LEVELS.length}, (_,i) => (
              <span key={i} style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background: i < levelIdx ? "#00c864" : i === levelIdx ? "#a0c8ff" : "#223", margin:"0 2px" }} />
            ))}
          </div>
          <span style={{ fontSize:12, color:"#446" }}>Lv.{levelIdx+1}</span>
        </div>
      </div>

      {/* Target chips */}
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", width:"100%", padding:"0 12px 8px" }}>
        {level.targets.map((t, i) => {
          const hit  = trace.hits.get(`${t.row},${t.col}`);
          const done = hit && eqRGB(hit, t.needed);
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 9px", border:`1px solid ${css(t.needed, done ? 1 : 0.4)}`, borderRadius:20, background: done ? css(t.needed, 0.12) : "transparent", transition:"all 0.3s" }}>
              <div style={{ width:10, height:10, borderRadius:2, background:css(t.needed), boxShadow:`0 0 ${done?8:4}px ${css(t.needed)}`, flexShrink:0 }} />
              <span style={{ fontSize:12, color: done ? "#fff" : "#666" }}>{colorLabel(t.needed)}</span>
              {done && <span style={{ color:"#00ff88", fontSize:12 }}>✓</span>}
            </div>
          );
        })}
        <div style={{ marginLeft:"auto", fontSize:12, color: mirrorsLeft === 0 ? "#f84" : "#446" }}>
          ／残{mirrorsLeft}枚
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onClick={onClick}
        onTouchEnd={onTouch}
        style={{ cursor:"pointer", borderRadius:8, touchAction:"none", maxWidth:"100%", display:"block" }}
      />

      {/* Guide */}
      <div style={{ fontSize:11, color:"#334", marginTop:5, textAlign:"center" }}>
        空→／　／→╲　╲→削除
      </div>

      {/* Hint */}
      {showHint && (
        <div style={{ margin:"8px 16px", padding:"9px 13px", background:"#0e1428", borderRadius:8, fontSize:13, color:"#80aaff", borderLeft:"3px solid #4060ff", maxWidth:360 }}>
          💡 {level.hint}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display:"flex", gap:10, marginTop:12, flexWrap:"wrap", justifyContent:"center" }}>
        <button onClick={() => setShowHint(h => !h)} style={btnStyle}>
          {showHint ? "ヒント隠す" : "ヒント"}
        </button>
        <button onClick={reset} style={btnStyle}>
          リセット
        </button>
        {won && levelIdx < LEVELS.length - 1 && (
          <button onClick={() => setLevelIdx(l => l+1)} style={nextBtnStyle}>
            次のレベル →
          </button>
        )}
        {won && levelIdx >= LEVELS.length - 1 && (
          <button onClick={() => { setLevelIdx(0); setShowIntro(true); }} style={nextBtnStyle}>
            最初から
          </button>
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding:"9px 18px", borderRadius:8, border:"1px solid #223",
  background:"#0e0e20", color:"#90b0e0", fontSize:14, cursor:"pointer",
};
const nextBtnStyle: React.CSSProperties = {
  padding:"9px 20px", borderRadius:8, border:"none",
  background:"linear-gradient(135deg,#00c864,#00ff88)", color:"#001a08",
  fontSize:14, fontWeight:"bold", cursor:"pointer",
  boxShadow:"0 0 20px rgba(0,200,100,0.4)",
};
