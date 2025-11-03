import { useEffect, useMemo, useRef, useState } from "react";

// ===== SFX（Web Audio API）共通ユーティリティ =====
const SFX_FILES = {
  correct: "/correct.mp3",
  wrong: "/wrong.mp3",
  clear: "/clear.mp3",
};

// ベース音量を常に 25% に固定（本体の音量ボタンはこの後段に掛かる）
const BASE_SFX_GAIN = 0.25;

function useSfx() {
  const audioCtxRef = useRef(null);
  const gainRef = useRef(null);
  const buffersRef = useRef({}); // { correct: AudioBuffer, ... }
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
      g.gain.value = BASE_SFX_GAIN; // ここで常に 1/4
      g.connect(audioCtxRef.current.destination);
      gainRef.current = g;
    }
  }

  async function loadBuffers() {
    if (readyRef.current) return;
    const ctx = audioCtxRef.current;
    const entries = Object.entries(SFX_FILES);

    const loaded = {};
    await Promise.all(entries.map(async ([key, url]) => {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      loaded[key] = await ctx.decodeAudioData(arr);
    }));

    buffersRef.current = loaded;
    readyRef.current = true;
  }

  // ユーザー操作のときに呼ぶ（初期化＋プリロード）
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


// =============== ユーティリティ ===============
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

// =============== データ準備（画像） ===============
const SMILE_IMAGES = Array.from(
  { length: 80 },
  (_, i) => `/smile_${String(i + 1).padStart(2, "0")}.png`
);

const NEUTRAL_IMAGES = [
  ...Array.from(
    { length: 80 },
    (_, i) => `/sad_${String(i + 1).padStart(2, "0")}.png`
  ),
  ...Array.from(
    { length: 80 },
    (_, i) => `/angry_${String(i + 1).padStart(2, "0")}.png`
  ),
];

function buildImagePool() {
  const smiles = SMILE_IMAGES.map((url, idx) => ({
    baseId: `s${idx + 1}`,
    url,
    isSmile: true,
  }));
  const neutrals = NEUTRAL_IMAGES.map((url, idx) => ({
    baseId: `n${idx + 1}`,
    url,
    isSmile: false,
  }));
  return [...smiles, ...neutrals];
}

// =============== ローカルストレージ系（ベストタイム） ===============
function bestTimeKeySmile(size) {
  return `bestTimeSmile_${size}`;
}
function loadBestTimeSmile(size) {
  const raw =
    typeof window !== "undefined"
      ? localStorage.getItem(bestTimeKeySmile(size))
      : null;
  if (!raw) return null;
  const num = Number(raw);
  if (Number.isNaN(num)) return null;
  return num;
}
function saveBestTimeSmile(size, ms) {
  localStorage.setItem(bestTimeKeySmile(size), String(ms));
}

// =============== コンポーネント本体 ===============
export default function GameSmileFinder({ onBackToHome }) {
  const { initSfx, playSfx } = useSfx();  // ← これを追加
  const LEVELS = [10, 20, 30, 40, 50];

  // ---- ゲーム状態 ----
  const [gridSize, setGridSize] = useState(10);
  const [grid, setGrid] = useState([]);
  const [targets, setTargets] = useState([]);
  const [found, setFound] = useState({});
  const [penalties, setPenalties] = useState(0);
  const [wrongFlash, setWrongFlash] = useState({});
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [now, setNow] = useState(Date.now());

  // 効果音
  const correctRef = useRef(null);
  const wrongRef = useRef(null);
  const clearRef = useRef(null);

  // ハイスコア
  const [bestTimes, setBestTimes] = useState(() => {
    const init = {};
    LEVELS.forEach((lvl) => {
      init[lvl] = loadBestTimeSmile(lvl);
    });
    return init;
  });

  // requestAnimationFrame
  const rafRef = useRef(null);

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

  // ---- タイマー ----
  useEffect(() => {
    if (!running) return;
    function tick() {
      setNow(Date.now());
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running]);

  // ---- ゲーム開始 ----
  function startGame() {
    initSfx(); // ← 追加（await不要）
    // ...今の startGame の中身はそのまま
  }

    const smileRatio = 0.3;
    const smilesNeeded = Math.max(1, Math.round(gridSize * smileRatio));

    // 効果音準備
    correctRef.current = new Audio("/correct.mp3");
    wrongRef.current = new Audio("/wrong.mp3");
    clearRef.current = new Audio("/clear.mp3");

    const POOL = shuffle(buildImagePool());
    const smilesPool = POOL.filter((p) => p.isSmile);
    const nonPool = POOL.filter((p) => !p.isSmile);

    function takeRandom(pool, count) {
      const result = [];
      for (let i = 0; i < count; i++) {
        const base = pool[Math.floor(Math.random() * pool.length)];
        result.push({
          ...base,
          uid: base.baseId + "#" + Math.random().toString(36).slice(2),
        });
      }
      return result;
    }

    const smileItems = takeRandom(smilesPool, smilesNeeded);
    const nonItems = takeRandom(nonPool, gridSize - smileItems.length);
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
      correctRef.current?.play();
      setFound((prev) => ({ ...prev, [item.uid]: true }));
    } else {
      wrongRef.current?.play();
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

  // クリア判定
  useEffect(() => {
    if (running && allFound && !gameOver) {
      setRunning(false);
      setGameOver(true);
      clearRef.current?.play();

      const thisRun = Date.now() - startTime + penalties * 3000;
      const prevBest = bestTimes[gridSize];

      if (prevBest == null || thisRun < prevBest) {
        saveBestTimeSmile(gridSize, thisRun);
        setBestTimes((old) => ({
          ...old,
          [gridSize]: thisRun,
        }));
      }
    }
  }, [allFound, running, gameOver, startTime, penalties, gridSize, bestTimes]);

  // =============== スタイル ===============
  const appBgStyle = {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #fffbe6 0%, #e0f7ff 60%, #e8f9f1 100%)",
    fontFamily: "system-ui, sans-serif",
  };

  const outerWrapStyle = {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "16px",
  };

  const controlPanelStyle = {
    backgroundColor: "rgba(255,255,255,0.8)",
    backdropFilter: "blur(4px)",
    border: "1px solid rgba(255,255,255,0.6)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
    borderRadius: "16px",
    padding: "16px",
  };

  const headerRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  };

  const headerTextStyle = {
    background:
      "linear-gradient(90deg, #0ea5e9 0%, #38bdf8 30%, #34d399 60%, #fde047 100%)",
    WebkitBackgroundClip: "text",
    color: "transparent",
    fontWeight: "700",
    fontSize: "20px",
  };

  const backBtnStyle = {
    background: "linear-gradient(90deg,#6b7280 0%,#9ca3af 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "8px 12px",
    fontSize: "14px",
    cursor: "pointer",
  };

  // --- タイム表示エリアを2列×2段に調整 ---
  const statsGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    fontSize: "13px",
    marginBottom: "12px",
  };

  const chipStyle = {
    backgroundColor: "#ffffffcc",
    border: "1px solid #fff",
    borderRadius: "10px",
    padding: "6px 10px",
    lineHeight: 1.3,
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    fontWeight: 500,
    textAlign: "center",
  };

  const levelBlockStyle = { marginBottom: "12px" };
  const levelButtonsWrapStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  };

  const levelButtonBase = (active) => ({
    border: active ? "2px solid #38bdf8" : "1px solid #ccc",
    background: active
      ? "linear-gradient(90deg,#bae6fd,#d9f99d)"
      : "#fff",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "14px",
    cursor: running ? "not-allowed" : "pointer",
    opacity: running ? 0.6 : 1,
    fontWeight: 600,
  });

  const actionRowStyle = {
    display: "flex",
    gap: "8px",
  };

  const mainButtonStyle = {
    background:
      "linear-gradient(90deg,#3b82f6 0%,#38bdf8 50%,#34d399 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 16px",
    fontWeight: "600",
    cursor: "pointer",
  };

  const stopButtonStyle = {
    background: "linear-gradient(90deg,#6b7280 0%,#9ca3af 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 16px",
    cursor: "pointer",
  };

  const boardPanelStyle = {
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(219,234,254,0.8) 100%)",
    borderRadius: "16px",
    padding: "8px",
    marginTop: "16px",
    position: "relative",
  };

  const gridAreaStyle = {
    marginTop: "4px",
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "8px",
    maxHeight: "70vh",
    overflowY: "auto",
  };

  const overlayStyle = {
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
    pointerEvents: "none", // ← 背景クリック透過
  };

  const overlayInnerStyle = {
    backgroundColor: "rgba(255,255,255,0.95)",
    color: "#1f2937",
    borderRadius: "16px",
    padding: "20px",
    maxWidth: "260px",
    width: "100%",
    border: "2px solid #6ee7b7",
    fontSize: "14px",
    fontWeight: 500,
    pointerEvents: "auto", // ← テキストだけ受け付ける
  };

  // =============== JSX ===============
  return (
    <div style={appBgStyle}>
      <div style={outerWrapStyle}>
        <div style={controlPanelStyle}>
          <div style={headerRowStyle}>
            <div style={headerTextStyle}>Smile Finder</div>
            <button onClick={onBackToHome} style={backBtnStyle}>
              ← ホームへ
            </button>
          </div>

          {/* --- タイムなど4項目を2列で固定表示 --- */}
          <div style={statsGridStyle}>
            <div style={chipStyle}>
              <strong>タイム:</strong>{" "}
              {finalScoreMs
                ? msToClock(finalScoreMs)
                : msToClock(elapsedMs)}
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
              {bestTimes[gridSize]
                ? msToClock(bestTimes[gridSize])
                : "–"}
            </div>
          </div>

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

          <div style={actionRowStyle}>
            <button onClick={startGame} style={mainButtonStyle}>
              スタート / もう一回
            </button>
            <button onClick={stopGame} style={stopButtonStyle}>
              中止
            </button>
          </div>
        </div>

        {/* ============ 盤面 ============ */}
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
                        filter: alreadyFound
                          ? "grayscale(100%) blur(1px)"
                          : "none",
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

          {/* クリア時オーバーレイ */}
          {gameOver && (
            <div style={overlayStyle}>
              <div style={overlayInnerStyle}>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "#065f46",
                    marginBottom: "8px",
                  }}
                >
                  クリアおめでとう！ 🎉
                </div>
                <div style={{ marginBottom: "12px" }}>
                  記録:{" "}
                  <strong style={{ fontSize: "16px" }}>
                    {finalScoreMs
                      ? msToClock(finalScoreMs)
                      : msToClock(elapsedMs)}
                  </strong>
                  <br />
                  ミス {penalties}回
                  <br />
                  ベスト({gridSize}人):{" "}
                  {bestTimes[gridSize]
                    ? msToClock(bestTimes[gridSize])
                    : "–"}
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  「スタート / もう一回」で再挑戦！
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
