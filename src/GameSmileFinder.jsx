import { useEffect, useMemo, useRef, useState } from "react";

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
  const raw = typeof window !== "undefined"
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
  const LEVELS = [10, 20, 30, 40, 50];

  // ---- ゲーム状態 ----
  const [gridSize, setGridSize] = useState(10); // 表示人数
  const [grid, setGrid] = useState([]);
  const [targets, setTargets] = useState([]); // 笑顔ターゲットuid
  const [found, setFound] = useState({});
  const [penalties, setPenalties] = useState(0);
  const [wrongFlash, setWrongFlash] = useState({});

  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const [startTime, setStartTime] = useState(null);
  const [pendingStartTime, setPendingStartTime] = useState(null);
  const [now, setNow] = useState(Date.now());

  // チュートリアル（開始前の説明）
  const [showTutorial, setShowTutorial] = useState(false);
  const [fadeOutTutorial, setFadeOutTutorial] = useState(false);
  const [targetCount, setTargetCount] = useState(0);

  // サウンド
  const [showAudioPrompt, setShowAudioPrompt] = useState(true);
  const [bgmVolume, setBgmVolume] = useState(2); // 初期2で統一
  const [sfxVolume, setSfxVolume] = useState(2); // 初期2で統一

  const bgmRef = useRef(null);
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

  // requestAnimationFrame管理
  const rafRef = useRef(null);

  // ---- 計算系 ----
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

  // ---- BGM 初期化 & クリーンアップ ----
  useEffect(() => {
    bgmRef.current = new Audio("/BGM.mp3");
    if (bgmRef.current) {
      bgmRef.current.loop = true;
      bgmRef.current.volume = bgmVolume / 10;
    }
    return () => {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current.currentTime = 0;
        bgmRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // BGM音量反映
  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.volume = bgmVolume / 10;
    }
  }, [bgmVolume]);

  // ---- ゲーム開始 ----
  function startGame() {
    const smileRatio = 0.3; // 30%が笑顔ターゲット
    const smilesNeeded = Math.max(1, Math.round(gridSize * smileRatio));

    // 効果音の準備
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
    setPendingStartTime(t);
    setStartTime(null);
    setNow(t);
    setRunning(false);

    setTargetCount(smileItems.length);

    setShowTutorial(true);
    setFadeOutTutorial(false);
  }

  // チュートリアルOK → 本計測スタート
  function beginAfterTutorial() {
    if (pendingStartTime) {
      setStartTime(pendingStartTime);
      setRunning(true);
    }
    setFadeOutTutorial(true);
    setTimeout(() => {
      setShowTutorial(false);
      setFadeOutTutorial(false);
    }, 300);
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
    setPendingStartTime(null);
    setShowTutorial(false);
    setFadeOutTutorial(false);
  }

  // タップ処理
  function handleClick(item) {
    if (!running || gameOver) return;
    const isTarget = targets.includes(item.uid);

    if (isTarget) {
      if (correctRef.current) {
        correctRef.current.currentTime = 0;
        correctRef.current.volume = sfxVolume / 10;
        correctRef.current.play();
      }
      setFound((prev) => {
        if (prev[item.uid]) return prev;
        return { ...prev, [item.uid]: true };
      });
    } else {
      if (wrongRef.current) {
        wrongRef.current.currentTime = 0;
        wrongRef.current.volume = sfxVolume / 10;
        wrongRef.current.play();
      }
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

      if (clearRef.current) {
        clearRef.current.currentTime = 0;
        clearRef.current.volume = sfxVolume / 10;
        clearRef.current.play();
      }

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
  }, [
    allFound,
    running,
    gameOver,
    startTime,
    penalties,
    gridSize,
    bestTimes,
    sfxVolume,
  ]);

  // サウンド許可ダイアログ
  function handleAudioConsent(allow) {
    if (allow) {
      if (bgmRef.current) {
        bgmRef.current.volume = bgmVolume / 10;
        bgmRef.current.loop = true;
        bgmRef.current.play();
      }
    } else {
      setBgmVolume(0);
      setSfxVolume(0);
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current.currentTime = 0;
      }
    }
    setShowAudioPrompt(false);
  }

  function onChangeBgmVolume(e) {
    const v = Number(e.target.value);
    setBgmVolume(v);
    if (bgmRef.current) {
      bgmRef.current.volume = v / 10;
    }
  }
  function onChangeSfxVolume(e) {
    const v = Number(e.target.value);
    setSfxVolume(v);
  }

  // =============== スタイル共通 ===============
  const appBgStyle = {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #fffbe6 0%, #e0f7ff 60%, #e8f9f1 100%)",
    backgroundAttachment: "fixed",
    fontFamily: "system-ui, sans-serif",
  };

  const outerWrapStyle = {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "16px",
  };

  // 上側（タイトル/ステータス/レベル/サウンド/スタート）まとめブロック
  const controlPanelStyle = {
    backgroundColor: "rgba(255,255,255,0.8)",
    backdropFilter: "blur(4px)",
    border: "1px solid rgba(255,255,255,0.6)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
    borderRadius: "16px",
    padding: "16px",
  };

  // 盤面ブロック
  const boardPanelStyle = {
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(219,234,254,0.8) 100%)",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.6)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
    padding: "8px",
    position: "relative",
    marginTop: "16px",
  };

  const headerRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
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
    fontWeight: "500",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  };

  const statsRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    fontSize: "13px",
    marginBottom: "12px",
  };

  const chipStyle = {
    backgroundColor: "#ffffffcc",
    border: "1px solid #fff",
    borderRadius: "10px",
    padding: "6px 10px",
    lineHeight: 1.2,
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    fontWeight: 500,
  };

  const levelBlockStyle = {
    marginBottom: "12px",
  };

  const levelTitleStyle = {
    fontSize: "14px",
    marginBottom: "8px",
    color: "#1f2937",
    fontWeight: 600,
  };

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
    boxShadow: active
      ? "0 4px 10px rgba(56,189,248,0.4)"
      : "0 2px 4px rgba(0,0,0,0.05)",
    opacity: running ? 0.6 : 1,
    fontWeight: 600,
  });

  // サウンド設定（コンパクト版）
  const soundRowStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(80px,auto) 1fr auto",
    alignItems: "center",
    rowGap: "8px",
    columnGap: "12px",
    fontSize: "13px",
    color: "#374151",
    marginBottom: "12px",
  };

  const soundLabelStyle = {
    fontWeight: 600,
    lineHeight: 1.2,
    color: "#1f2937",
  };

  const soundValueStyle = {
    minWidth: "32px",
    textAlign: "right",
    fontSize: "12px",
    fontWeight: 600,
    color: "#111827",
  };

  // スタート・中止ボタン
  const actionRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  };

  const mainButtonStyle = {
    background:
      "linear-gradient(90deg,#3b82f6 0%,#38bdf8 50%,#34d399 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 16px",
    fontSize: "14px",
    cursor: "pointer",
    fontWeight: "600",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  };

  const stopButtonStyle = {
    background: "linear-gradient(90deg,#6b7280 0%,#9ca3af 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 16px",
    fontSize: "14px",
    cursor: "pointer",
    fontWeight: "500",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  };

  // 盤面グリッド
  const gridAreaStyle = {
    marginTop: "4px",
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)", // スマホでも5列固定
    gap: "8px",
    maxHeight: "70vh",
    overflowY: "auto",
    position: "relative",
    borderRadius: "8px",
  };

  // チュートリアル & リザルト オーバーレイ
  const overlayStyle = {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    textAlign: "center",
    zIndex: 40,
  };

  const overlayInnerStyle = {
    backgroundColor: "rgba(255,255,255,0.95)",
    color: "#1f2937",
    borderRadius: "16px",
    padding: "20px",
    maxWidth: "260px",
    width: "100%",
    boxShadow:
      "0 20px 40px rgba(0,0,0,0.3), 0 0 20px rgba(16,185,129,0.55)",
    border: "2px solid #6ee7b7",
    fontSize: "14px",
    lineHeight: 1.5,
    fontWeight: 500,
  };

  const overlayButtonStyle = {
    background:
      "linear-gradient(90deg,#3b82f6 0%,#38bdf8 50%,#34d399 100%)",
    color: "#fff",
    border: "none",
    width: "100%",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow:
      "0 8px 20px rgba(0,0,0,0.25),0 0 16px rgba(16,185,129,0.6)",
  };

  // サウンド許可モーダル
  const audioPromptOverlayStyle = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 100,
    display: showAudioPrompt ? "flex" : "none",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    color: "#fff",
    textAlign: "center",
  };

  const audioPromptCardStyle = {
    backgroundColor: "#fff",
    color: "#1f2937",
    borderRadius: "16px",
    padding: "20px",
    maxWidth: "300px",
    width: "100%",
    boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
    fontSize: "14px",
    lineHeight: 1.5,
    fontWeight: 500,
  };

  const audioPromptBtnYes = {
    background:
      "linear-gradient(90deg,#3b82f6 0%,#38bdf8 50%,#34d399 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
    boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
  };

  const audioPromptBtnNo = {
    background: "linear-gradient(90deg,#6b7280 0%,#9ca3af 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
    boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
  };

  return (
    <div style={appBgStyle}>
      {/* ---- サウンド許可ダイアログ ---- */}
      <div style={audioPromptOverlayStyle}>
        <div style={audioPromptCardStyle}>
          <div
            style={{
              fontSize: "16px",
              fontWeight: "700",
              color: "#065f46",
              marginBottom: "8px",
              textAlign: "center",
            }}
          >
            サウンドの許可
          </div>
          <div
            style={{
              color: "#1f2937",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            BGMと効果音を再生してもいいですか？
            <br />
            （あとから音量は変えられます）
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => handleAudioConsent(true)}
              style={audioPromptBtnYes}
            >
              はい（音ありで遊ぶ）
            </button>
            <button
              onClick={() => handleAudioConsent(false)}
              style={audioPromptBtnNo}
            >
              いいえ（音なしで遊ぶ）
            </button>
          </div>
        </div>
      </div>

      <div style={outerWrapStyle}>
        {/* ================= 上側まとめブロック ================= */}
        <div style={controlPanelStyle}>
          {/* タイトル＋戻る */}
          <div style={headerRowStyle}>
            <div style={headerTextStyle}>Smile Finder</div>
            <button onClick={onBackToHome} style={backBtnStyle}>
              ← ホームへ
            </button>
          </div>

          {/* ステータス表示 */}
          <div style={statsRowStyle}>
            <div style={chipStyle}>
              <strong>タイム:</strong>{" "}
              {finalScoreMs !== null
                ? msToClock(finalScoreMs)
                : msToClock(elapsedMs)}
            </div>

            <div style={chipStyle}>
              <strong>見つけた笑顔:</strong>{" "}
              {Object.keys(found).length}/{targets.length || "?"}
            </div>

            <div style={chipStyle}>
              <strong>ミス:</strong> {penalties}回 (+{penalties * 3}s)
            </div>

            <div style={chipStyle}>
              <strong>ベスト:</strong>{" "}
              {bestTimes[gridSize] != null
                ? msToClock(bestTimes[gridSize])
                : "–"}
            </div>
          </div>

          {/* レベル選択 */}
          <div style={levelBlockStyle}>
            <div style={levelTitleStyle}>
              レベル（表示人数）：
              <span style={{ marginLeft: "4px", fontWeight: 700 }}>
                {gridSize}人
              </span>
            </div>

            <div style={levelButtonsWrapStyle}>
              {LEVELS.map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    if (!running) setGridSize(num);
                  }}
                  style={levelButtonBase(gridSize === num)}
                  disabled={running}
                >
                  {num}人
                </button>
              ))}
            </div>
          </div>

          {/* サウンド設定（コンパクト） */}
          <div
            style={{
              marginBottom: "12px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#1f2937",
            }}
          >
            サウンド設定
          </div>

          {/* BGM */}
          <div style={soundRowStyle}>
            <div style={soundLabelStyle}>BGM</div>
            <input
              id="bgmRangeSmile"
              type="range"
              min={0}
              max={10}
              value={bgmVolume}
              onChange={onChangeBgmVolume}
              style={{
                width: "100%",
                height: "24px",
                cursor: "pointer",
              }}
            />
            <div style={soundValueStyle}>{bgmVolume}/10</div>
          </div>

          {/* 効果音 */}
          <div style={soundRowStyle}>
            <div style={soundLabelStyle}>効果音</div>
            <input
              id="sfxRangeSmile"
              type="range"
              min={0}
              max={10}
              value={sfxVolume}
              onChange={onChangeSfxVolume}
              style={{
                width: "100%",
                height: "24px",
                cursor: "pointer",
              }}
            />
            <div style={soundValueStyle}>{sfxVolume}/10</div>
          </div>

          {/* スタート・中止 */}
          <div style={actionRowStyle}>
            <button onClick={startGame} style={mainButtonStyle}>
              スタート / もう一回
            </button>

            <button onClick={stopGame} style={stopButtonStyle}>
              中止
            </button>
          </div>
        </div>

        {/* ================= 盤面ブロック ================= */}
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
                  boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                }}
              >
                「スタート / もう一回」を押してゲーム開始！
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
                      boxShadow:
                        "0 4px 8px rgba(0,0,0,0.05), 0 0 12px rgba(16,185,129,0.15)",
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

                    {/* FOUND表示 */}
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
                          textShadow: "0 0 4px #000",
                        }}
                      >
                        FOUND
                      </div>
                    )}

                    {/* MISS表示（×） */}
                    {wasWrong && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          backgroundColor: "rgba(0,0,0,0.4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                          color: "#ff4d4d",
                          fontSize: "28px",
                          textShadow:
                            "0 0 6px rgba(0,0,0,0.8), 0 0 10px rgba(255,0,0,0.8)",
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

          {/* チュートリアルオーバーレイ */}
          {showTutorial && (
            <div
              style={{
                ...overlayStyle,
                opacity: fadeOutTutorial ? 0 : 1,
                transition: "opacity 0.3s ease",
                pointerEvents: fadeOutTutorial ? "none" : "auto",
              }}
            >
              <div style={overlayInnerStyle}>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "#065f46",
                    marginBottom: "8px",
                  }}
                >
                  ルール説明
                </div>
                <div
                  style={{
                    marginBottom: "12px",
                    color: "#064e3b",
                  }}
                >
                  この中に
                  <br />
                  <strong style={{ fontSize: "16px" }}>
                    笑顔の人が {targetCount} 人
                  </strong>
                  <br />
                  います。
                  <br />
                  その人たちだけタップしてね！
                  <br />
                  間違えると+3秒ペナルティ！
                </div>

                <button
                  onClick={beginAfterTutorial}
                  style={overlayButtonStyle}
                >
                  OK！スタート！
                </button>
              </div>
            </div>
          )}

          {/* クリア後オーバーレイ */}
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

                <div
                  style={{
                    marginBottom: "12px",
                    color: "#064e3b",
                  }}
                >
                  記録:{" "}
                  <strong style={{ fontSize: "16px" }}>
                    {finalScoreMs !== null
                      ? msToClock(finalScoreMs)
                      : msToClock(elapsedMs)}
                  </strong>
                  <br />
                  ミス {penalties}回
                  <br />
                  ベスト({gridSize}人):{" "}
                  {bestTimes[gridSize] != null
                    ? msToClock(bestTimes[gridSize])
                    : "–"}
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    lineHeight: 1.4,
                    fontWeight: 500,
                  }}
                >
                  「スタート / もう一回」で
                  くり返しあそべます
                </div>
              </div>
            </div>
          )}
        </div>
        {/* ================= /盤面ブロック ================= */}
      </div>
    </div>
  );
}
