import { useEffect, useMemo, useRef, useState } from "react";

/* ================= SFX（Web Audio API）共通ユーティリティ ================= */
const SFX_FILES = {
  correct: "/correct.mp3",
  wrong: "/wrong.mp3",
  clear: "/clear.mp3",
};
// 端末の本体音量に従わせつつ、アプリ側は常に25%
const BASE_SFX_GAIN = 0.25;

function useSfx() {
  const audioCtxRef = useRef(null);
  const gainRef = useRef(null);
  const buffersRef = useRef({});
  const readyRef = useRef(false);

  async function ensureContext() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      try { await audioCtxRef.current.resume(); } catch (_) {}
    }
    if (!gainRef.current) {
      const g = audioCtxRef.current.createGain();
      g.gain.value = BASE_SFX_GAIN;
      g.connect(audioCtxRef.current.destination);
      gainRef.current = g;
    }
  }

  async function loadBuffers() {
    if (readyRef.current) return;
    const ctx = audioCtxRef.current;
    const loaded = {};
    await Promise.all(Object.entries(SFX_FILES).map(async ([key, url]) => {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      loaded[key] = await ctx.decodeAudioData(arr);
    }));
    buffersRef.current = loaded;
    readyRef.current = true;
  }

  // 初期化（ユーザー操作起点で呼ぶ）
  async function initSfx() {
    await ensureContext();
    await loadBuffers();
  }

  // 再生
  function playSfx(name) {
    const ctx = audioCtxRef.current;
    const g = gainRef.current;
    const buf = buffersRef.current[name];
    if (!ctx || !g || !buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(g);
    try { src.start(0); } catch (_) {}
  }

  return { initSfx, playSfx };
}

/* ================= ユーティリティ ================= */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function msToClock(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return (
    minutes +
    ":" +
    seconds.toString().padStart(2, "0") +
    "." +
    centis.toString().padStart(2, "0")
  );
}

/* ================= データ（画像） ================= */
const SMILE_IMAGES = Array.from(
  { length: 80 },
  (_, i) => `/smile_${String(i + 1).padStart(2, "0")}.png`
);
const NEUTRAL_IMAGES = [
  ...Array.from({ length: 80 }, (_, i) => `/sad_${String(i + 1).padStart(2, "0")}.png`),
  ...Array.from({ length: 80 }, (_, i) => `/angry_${String(i + 1).padStart(2, "0")}.png`),
];

function buildImagePool() {
  const smiles = SMILE_IMAGES.map((url, idx) => ({ baseId: `s${idx + 1}`, url, isSmile: true }));
  const neutrals = NEUTRAL_IMAGES.map((url, idx) => ({ baseId: `n${idx + 1}`, url, isSmile: false }));
  return [...smiles, ...neutrals];
}

/* ================= にこぽち日記（ローカル保存） ================= */
// "YYYY-MM-DD" 形式
function ymd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const DIARY_KEY = "nikopoji_diary"; // { "YYYY-MM-DD": total }

function loadDiary() {
  try {
    const raw = localStorage.getItem(DIARY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveDiary(obj) {
  localStorage.setItem(DIARY_KEY, JSON.stringify(obj));
}
// 当日の合計を加算
function addTodayCount(inc) {
  const d = loadDiary();
  const key = ymd();
  d[key] = (d[key] || 0) + inc;
  saveDiary(d);
  return d; // ついでに返す
}

/* ================= 今月カレンダー UI ================= */
function CalendarThisMonth({ diary }) {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-11
  const title = `${y}年 ${m + 1}月`;

  // 月情報
  const first = new Date(y, m, 1);
  const startWeekday = first.getDay(); // 0:日
  const lastDate = new Date(y, m + 1, 0).getDate();

  // セル配列（先頭の空白 + 1..末日）
  const cells = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: lastDate }, (_, i) => i + 1),
  ];

  const wrapStyle = {
    backgroundColor: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(4px)",
    border: "1px solid rgba(255,255,255,0.6)",
    borderRadius: "16px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    padding: "16px",
    width: "100%",
    maxWidth: "420px",
    margin: "16px auto 0",
    boxSizing: "border-box",
  };
  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  };
  const titleStyle = {
    fontWeight: 700,
    fontSize: "16px",
    color: "#0ea5e9",
  };
  const dowStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "6px",
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "6px",
    textAlign: "center",
  };
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(40px, 1fr))",
    gap: "6px",
  };
  const cellStyle = {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    minHeight: "64px",
    padding: "6px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  };
  const dayNumStyle = { fontSize: "12px", color: "#6b7280", fontWeight: 600 };
  const badgeStyle = (isToday) => ({
    alignSelf: "flex-end",
    fontSize: "12px",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "9999px",
    background: isToday ? "linear-gradient(90deg,#3b82f6,#34d399)" : "#f3f4f6",
    color: isToday ? "#fff" : "#374151",
  });
  const summaryStyle = { marginTop: "8px", fontSize: "12px", color: "#374151", textAlign: "right" };

  // 合計（今月）
  const mm = String(m + 1).padStart(2, "0");
  const monthTotal = Object.entries(diary).reduce((acc, [k, v]) => {
    return k.startsWith(`${y}-${mm}-`) ? acc + (Number(v) || 0) : acc;
  }, 0);

  return (
    <div style={wrapStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>🗓 今月のにこぽち記録 — {title}</div>
      </div>

      <div style={dowStyle}>
        <div>日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div>土</div>
      </div>

      <div style={gridStyle}>
        {cells.map((d, idx) => {
          if (d == null) return <div key={`e-${idx}`} />;
          const key = `${y}-${mm}-${String(d).padStart(2, "0")}`;
          const total = diary[key] || 0;
          const isToday = key === ymd();
          return (
            <div key={key} style={cellStyle}>
              <div style={dayNumStyle}>{d}</div>
              <div style={badgeStyle(isToday)}>{total} 人</div>
            </div>
          );
        })}
      </div>

      <div style={summaryStyle}>今月の合計：<strong>{monthTotal}</strong> 人</div>
    </div>
  );
}

/* ================= ベストタイム（localStorage） ================= */
function bestTimeKeySmile(size) { return `bestTimeSmile_${size}`; }
function loadBestTimeSmile(size) {
  const raw = typeof window !== "undefined" ? localStorage.getItem(bestTimeKeySmile(size)) : null;
  if (!raw) return null;
  const num = Number(raw);
  if (Number.isNaN(num)) return null;
  return num;
}
function saveBestTimeSmile(size, ms) {
  localStorage.setItem(bestTimeKeySmile(size), String(ms));
}

/* ================= コンポーネント本体 ================= */
export default function GameSmileFinder({ onBackToHome }) {
  const { initSfx, playSfx } = useSfx();

  // ★ レベルは 8/16/24/32/40（4列固定運用に合わせやすい）
  const LEVELS = [8, 16, 24, 32, 40];

  // ---- ゲーム状態 ----
  const [gridSize, setGridSize] = useState(8);
  const [grid, setGrid] = useState([]);
  const [targets, setTargets] = useState([]);
  const [found, setFound] = useState({});
  const [penalties, setPenalties] = useState(0);
  const [wrongFlash, setWrongFlash] = useState({});
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [now, setNow] = useState(Date.now());

  // にこぽち日記（今月カレンダー用）
  const [diary, setDiary] = useState(() => loadDiary());

  // ハイスコア
  const [bestTimes, setBestTimes] = useState(() => {
    const init = {};
    LEVELS.forEach((lvl) => { init[lvl] = loadBestTimeSmile(lvl); });
    return init;
  });

  // requestAnimationFrame
  const rafRef = useRef(null);

  // 計算系
  const allFound = useMemo(() => {
    if (!targets.length) return false;
    return targets.every((id) => found[id]);
  }, [targets, found]);

  const elapsedMs = running && startTime ? now - startTime : 0;

  const finalScoreMs = useMemo(() => {
    if (!gameOver || !startTime) return null;
    const base = now - startTime;
    return base + penalties * 3000;
  }, [gameOver, startTime, now, penalties]);

  // タイマー
  useEffect(() => {
    if (!running) return;
    function tick() {
      setNow(Date.now());
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running]);

  // ---- ゲーム開始（ユーザー操作で呼ばれる）----
  function startGame() {
    // 効果音初期化＆プリロード（自動再生制限を回避）
    initSfx();

    // 正解は「合計の 1/4 固定」：8→2, 16→4, ... 40→10
    const smilesNeeded = Math.max(1, Math.round(gridSize / 4));

    // プール生成（同じ顔が一度のゲームに出ないよう baseId 単位で unique 抽出）
    const POOL = shuffle(buildImagePool());
    const smilesPool = POOL.filter((p) => p.isSmile);
    const nonPool = POOL.filter((p) => !p.isSmile);

    function takeUnique(pool, count) {
      const seen = new Set();
      const result = [];
      for (let i = 0; i < pool.length && result.length < count; i++) {
        const base = pool[i];
        if (seen.has(base.baseId)) continue;
        seen.add(base.baseId);
        result.push({
          ...base,
          uid: base.baseId + "#" + Math.random().toString(36).slice(2),
        });
      }
      return result;
    }

    const smileItems = takeUnique(smilesPool, smilesNeeded);
    const nonItems = takeUnique(nonPool, gridSize - smileItems.length);
    const merged = shuffle([...smileItems, ...nonItems]);

    setGrid(merged);
    setTargets(smileItems.map((it) => it.uid));
    setFound({});
    setWrongFlash({});
    setPenalties(0);
    setGameOver(false);

    const t = Date.now();
    setStartTime(t);
    setNow(t);
    setRunning(true);
  }

  // 中止
  function stopGame() {
    setRunning(false);
    setGameOver(false);
    setGrid([]);
    setTargets([]);
    setFound({});
    setWrongFlash({});
    setPenalties(0);
    setStartTime(null);
  }

  // タップ処理
  function handleClick(item) {
    if (!running || gameOver) return;
    const isTarget = targets.includes(item.uid);

    if (isTarget) {
      playSfx("correct");
      setFound((prev) => {
        if (prev[item.uid]) return prev;
        return { ...prev, [item.uid]: true };
      });
    } else {
      playSfx("wrong");
      setPenalties((p) => p + 1);
      setWrongFlash((prev) => ({ ...prev, [item.uid]: true }));
      setTimeout(() => {
        setWrongFlash((prev) => {
          const copy = { ...prev };
          delete copy[item.uid];
          return copy;
        });
      }, 1000);
    }
  }

  // クリア判定（クリア時に“その日の合計”へ加算・保存）
  useEffect(() => {
    if (running && allFound && !gameOver) {
      setRunning(false);
      setGameOver(true);

      playSfx("clear");

      const thisRun = Date.now() - startTime + penalties * 3000;
      const prevBest = bestTimes[gridSize];
      if (prevBest == null || thisRun < prevBest) {
        saveBestTimeSmile(gridSize, thisRun);
        setBestTimes((old) => ({ ...old, [gridSize]: thisRun }));
      }

      // ★ その日の合計に「今回の正解数」を加算
      const correctCount = targets.length;
      const updated = addTodayCount(correctCount);
      setDiary(updated); // カレンダーを即時更新
    }
  }, [allFound, running, gameOver, startTime, penalties, gridSize, bestTimes, playSfx, targets.length]);

  /* ================= スタイル ================= */
  const appBgStyle = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #fffbe6 0%, #e0f7ff 60%, #e8f9f1 100%)",
    fontFamily: "system-ui, sans-serif",
  };
  const outerWrapStyle = { maxWidth: "900px", margin: "0 auto", padding: "16px" };
  const controlPanelStyle = {
    backgroundColor: "rgba(255,255,255,0.8)",
    backdropFilter: "blur(4px)",
    border: "1px solid rgba(255,255,255,0.6)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
    borderRadius: "16px",
    padding: "16px",
  };
  const headerRowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" };
  const headerTextStyle = {
    background: "linear-gradient(90deg, #0ea5e9 0%, #38bdf8 30%, #34d399 60%, #fde047 100%)",
    WebkitBackgroundClip: "text", color: "transparent", fontWeight: "700", fontSize: "20px",
  };
  const backBtnStyle = {
    background: "linear-gradient(90deg,#6b7280 0%,#9ca3af 100%)", color: "#fff",
    border: "none", borderRadius: "10px", padding: "8px 12px", fontSize: "14px", cursor: "pointer",
  };
  const statsGridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px", marginBottom: "12px" };
  const chipStyle = {
    backgroundColor: "#ffffffcc", border: "1px solid #fff", borderRadius: "10px", padding: "6px 10px",
    lineHeight: 1.3, boxShadow: "0 2px 4px rgba(0,0,0,0.05)", fontWeight: 500, textAlign: "center",
  };
  const levelBlockStyle = { marginBottom: "12px" };
  const levelButtonsWrapStyle = { display: "flex", flexWrap: "wrap", gap: "8px" };
  const levelButtonBase = (active) => ({
    border: active ? "2px solid #38bdf8" : "1px solid #ccc",
    background: active ? "linear-gradient(90deg,#bae6fd,#d9f99d)" : "#fff",
    borderRadius: "8px", padding: "8px 12px", fontSize: "14px",
    cursor: running ? "not-allowed" : "pointer", opacity: running ? 0.6 : 1, fontWeight: 600,
  });
  const actionRowStyle = { display: "flex", gap: "8px" };
  const mainButtonStyle = {
    background: "linear-gradient(90deg,#3b82f6 0%,#38bdf8 50%,#34d399 100%)",
    color: "#fff", border: "none", borderRadius: "10px", padding: "10px 16px", fontWeight: "600", cursor: "pointer",
  };
  const stopButtonStyle = {
    background: "linear-gradient(90deg,#6b7280 0%,#9ca3af 100%)",
    color: "#fff", border: "none", borderRadius: "10px", padding: "10px 16px", cursor: "pointer",
  };
  const boardPanelStyle = {
    background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(219,234,254,0.8) 100%)",
    borderRadius: "16px", padding: "8px", marginTop: "16px", position: "relative",
  };
  const gridAreaStyle = {
    // ★ 4列固定（最小80pxを確保）
    marginTop: "4px",
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(80px, 1fr))",
    gap: "8px",
    maxHeight: "70vh",
    overflowY: "auto",
  };

  return (
    <div style={appBgStyle}>
      <div style={outerWrapStyle}>
        <div style={controlPanelStyle}>
          <div style={headerRowStyle}>
            <div style={headerTextStyle}>にこぽち</div>
            <button onClick={onBackToHome} style={backBtnStyle}>← ホームへ</button>
          </div>

          {/* ステータス */}
          <div style={statsGridStyle}>
            <div style={chipStyle}>
              <strong>タイム:</strong>{" "}
              {finalScoreMs ? msToClock(finalScoreMs) : msToClock(elapsedMs)}
            </div>
            <div style={chipStyle}>
              <strong>見つけた:</strong>{" "}
              {Object.keys(found).length}/{targets.length || "?"}
            </div>
            <div style={chipStyle}>
              <strong>ミス:</strong> {penalties}回 (+{penalties * 3}s)
            </div>
            <div style={chipStyle}>
              <strong>ベスト:</strong>{" "}
              {bestTimes[gridSize] ? msToClock(bestTimes[gridSize]) : "–"}
            </div>
          </div>

          {/* レベル */}
          <div style={levelBlockStyle}>
            <div style={{ fontWeight: 600, marginBottom: "8px" }}>
              レベル（人数）: {gridSize}人
            </div>
            <div style={levelButtonsWrapStyle}>
              {LEVELS.map((num) => (
                <button
                  key={num}
                  onClick={() => !running && setGridSize(num)}
                  style={levelButtonBase(gridSize === num)}
                  disabled={running}
                >
                  {num}人
                </button>
              ))}
            </div>
          </div>

          {/* 操作 */}
          <div style={actionRowStyle}>
            <button onClick={startGame} style={mainButtonStyle}>スタート / もう一回</button>
            <button onClick={stopGame} style={stopButtonStyle}>中止</button>
          </div>
        </div>

        {/* 盤面 */}
        <div style={boardPanelStyle}>
          <div style={gridAreaStyle}>
            {grid.length === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  fontSize: "14px",
                  color: "#4b5563",
                  border: "2px dashed #93c5fd",
                  borderRadius: "8px",
                  padding: "24px",
                  textAlign: "center",
                  backgroundColor: "#fff",
                }}
              >
                「スタート / もう一回」でゲーム開始！
              </div>
            ) : (
              grid.map((item) => {
                const alreadyFound = !!found[item.uid];
                const wasWrong = !!wrongFlash[item.uid];
                return (
                  <button
                    key={item.uid}
                    onClick={() => handleClick(item)}
                    style={{
                      position: "relative",
                      borderRadius: "10px",
                      border: "1px solid #d1d5db",
                      padding: 0,
                      cursor: "pointer",
                      overflow: "hidden",
                      backgroundColor: "#fff",
                    }}
                  >
                    <img
                      src={item.url}
                      alt="face"
                      style={{
                        width: "100%",
                        height: "auto",
                        aspectRatio: "1 / 1",
                        objectFit: "cover",
                        display: "block",
                        filter: alreadyFound ? "grayscale(100%) blur(1px)" : "none",
                        opacity: alreadyFound ? 0.6 : 1,
                      }}
                    />

                    {alreadyFound && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontWeight: "bold",
                          fontSize: "12px",
                          backgroundColor: "rgba(0,0,0,0.4)",
                        }}
                      >
                        FOUND
                      </div>
                    )}

                    {wasWrong && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          backgroundColor: "rgba(0,0,0,0.4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ff4d4d",
                          fontSize: "28px",
                          fontWeight: "bold",
                        }}
                      >
                        ✖
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* クリア表示 */}
          {gameOver && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.6)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                textAlign: "center",
                zIndex: 40,
              }}
            >
              <div
                style={{
                  backgroundColor: "rgba(255,255,255,0.95)",
                  color: "#1f2937",
                  borderRadius: "16px",
                  padding: "20px",
                  maxWidth: "260px",
                  width: "100%",
                  border: "2px solid #6ee7b7",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#065f46", marginBottom: "8px" }}>
                  クリアおめでとう！ 🎉
                </div>
                <div style={{ marginBottom: "12px" }}>
                  記録:{" "}
                  <strong style={{ fontSize: "16px" }}>
                    {finalScoreMs ? msToClock(finalScoreMs) : msToClock(elapsedMs)}
                  </strong>
                  <br />
                  ミス {penalties}回
                  <br />
                  ベスト({gridSize}人):{" "}
                  {bestTimes[gridSize] ? msToClock(bestTimes[gridSize]) : "–"}
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  「スタート / もう一回」で再挑戦！
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ★ 今月カレンダー（盤面の下に表示） */}
        <CalendarThisMonth diary={diary} />
      </div>
    </div>
  );
}
