import { useEffect, useMemo, useRef, useState } from "react";

// ✅ 画像リスト（public フォルダに置く）
const SMILE_IMAGES = Array.from({ length: 80 }, (_, i) => `/smile_${String(i + 1).padStart(2, "0")}.png`);
const NEUTRAL_IMAGES = [
  ...Array.from({ length: 80 }, (_, i) => `/sad_${String(i + 1).padStart(2, "0")}.png`),
  ...Array.from({ length: 80 }, (_, i) => `/angry_${String(i + 1).padStart(2, "0")}.png`),
];

// ✅ プールを作る関数
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

// ✅ シャッフル関数
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ✅ タイマー表記 mm:ss.cc
function msToClock(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${centis
    .toString()
    .padStart(2, "0")}`;
}

export default function App() {
  const [gridSize, setGridSize] = useState(9);
  const [grid, setGrid] = useState([]);
  const [targets, setTargets] = useState([]);
  const [found, setFound] = useState({});
  const [penalties, setPenalties] = useState(0);

  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [now, setNow] = useState(Date.now());
  const rafRef = useRef(null);

  // ✅ 列数をサイズで変える
  function calcColumns(size) {
    if (size <= 9) return 3;
    if (size <= 16) return 4;
    if (size <= 25) return 5;
    return 10;
  }

  // ✅ 全部見つけたか
  const allFound = useMemo(() => {
    if (!targets.length) return false;
    return targets.every((id) => found[id]);
  }, [targets, found]);

  // ✅ 経過時間
  const elapsedMs = running && startTime ? now - startTime : 0;

  // ✅ 最終スコア
  const finalScoreMs = useMemo(() => {
    if (!allFound || !startTime) return null;
    const base = now - startTime;
    return base + penalties * 3000;
  }, [allFound, startTime, now, penalties]);

  // ✅ タイマー進行
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

  // ✅ ゲーム開始
  function startGame() {
    const smileRatio = 0.3;
    const smilesNeeded = Math.max(1, Math.round(gridSize * smileRatio));

    // 🎵 効果音を初期化
    window.correctSound = new Audio("/correct.mp3");
    window.correctSound.volume = 0.6;
    window.wrongSound = new Audio("/wrong.mp3");
    window.wrongSound.volume = 0.6;
    window.clearSound = new Audio("/clear.mp3"); // ← クリア音を追加（ファンファーレなどを入れる）

    const POOL = shuffle(buildImagePool());
    const smilesPool = shuffle(POOL.filter((p) => p.isSmile));
    const nonPool = shuffle(POOL.filter((p) => !p.isSmile));

    function takeFromPool(pool, count) {
      if (pool.length === 0) return [];
      const shuffled = shuffle(pool);
      const result = [];
      for (let i = 0; i < count; i++) {
        const base = shuffled[i % shuffled.length];
        result.push({
          ...base,
          uid: base.baseId + "#" + Math.random().toString(36).slice(2),
        });
      }
      return result;
    }

    const smileItems = takeFromPool(smilesPool, smilesNeeded);
    const nonItems = takeFromPool(nonPool, gridSize - smileItems.length);
    const merged = shuffle([...smileItems, ...nonItems]);

    setGrid(merged);
    setTargets(smileItems.map((it) => it.uid));
    setFound({});
    setPenalties(0);

    setRunning(true);
    const t = Date.now();
    setStartTime(t);
    setNow(t);
  }

  // ✅ クリック処理
  function handleClick(item) {
    if (!running) return;
    if (allFound) return;

    const isTarget = targets.includes(item.uid);

    if (isTarget) {
      if (window.correctSound) {
        window.correctSound.currentTime = 0;
        window.correctSound.play();
      }
      setFound((prev) => {
        if (prev[item.uid]) return prev;
        return { ...prev, [item.uid]: true };
      });
    } else {
      if (window.wrongSound) {
        window.wrongSound.currentTime = 0;
        window.wrongSound.play();
      }
      setPenalties((p) => p + 1);
    }
  }

  // ✅ 終了検知＋音
  useEffect(() => {
    if (allFound && running) {
      setRunning(false);
      if (window.clearSound) {
        window.clearSound.currentTime = 0;
        window.clearSound.play();
      }
    }
  }, [allFound, running]);

  // ✅ 画面描画
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "16px",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "20px", fontWeight: "bold" }}>Smile Hunt 😁</h1>
      <p style={{ fontSize: "14px", lineHeight: 1.4 }}>
        笑顔の人だけタップしてください。間違えると+3秒ペナルティ！
      </p>

      {/* ステータス表示 */}
      <div
        style={{
          marginTop: "12px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          fontSize: "14px",
        }}
      >
        <div>
          <strong>タイム:</strong>{" "}
          {finalScoreMs !== null ? msToClock(finalScoreMs) : msToClock(elapsedMs)}
        </div>
        <div>
          <strong>見つけた笑顔:</strong> {Object.keys(found).length}/{targets.length || "?"}
        </div>
        <div>
          <strong>ミス:</strong> {penalties}回 (+{penalties * 3}s)
        </div>
      </div>

      {/* レベル選択 */}
      <div style={{ marginTop: "12px" }}>
        <div style={{ fontSize: "14px", marginBottom: "8px" }}>
          <strong>レベル選択：</strong>
          <span style={{ marginLeft: "4px" }}>現在 {gridSize} 枚</span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {[9, 16, 25, 50].map((num) => (
            <button
              key={num}
              onClick={() => setGridSize(num)}
              style={{
                border: "1px solid #ccc",
                borderRadius: "6px",
                padding: "6px 10px",
                fontSize: "14px",
                cursor: "pointer",
                background: gridSize === num ? "#dbeafe" : "#fff",
              }}
            >
              {num}枚
            </button>
          ))}
        </div>
      </div>

      {/* スタートボタン */}
      <div style={{ marginTop: "12px" }}>
        <button
          onClick={startGame}
          style={{
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          スタート / もう一回
        </button>
      </div>

      {/* グリッド */}
      <div
        style={{
          marginTop: "20px",
          display: "grid",
          gridTemplateColumns: `repeat(${calcColumns(gridSize)}, 1fr)`,
          gap: "12px",
          position: "relative",
        }}
      >
        {grid.length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              fontSize: "14px",
              color: "#666",
              border: "2px dashed #ccc",
              borderRadius: "8px",
              padding: "24px",
              textAlign: "center",
            }}
          >
            「スタート / もう一回」を押すと顔が並びます
          </div>
        ) : (
          grid.map((item) => {
            const isTarget = targets.includes(item.uid);
            const alreadyFound = !!found[item.uid];
            return (
              <button
                key={item.uid}
                onClick={() => handleClick(item)}
                style={{
                  position: "relative",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  padding: 0,
                  cursor: "pointer",
                  overflow: "hidden",
                }}
              >
                <img
                  src={item.url}
                  alt="face"
                  style={{
                    width: "100%",
                    height: "120px",
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
                      fontSize: "14px",
                      backgroundColor: "rgba(0,0,0,0.4)",
                      textShadow: "0 0 4px #000",
                    }}
                  >
                    FOUND
                  </div>
                )}
              </button>
            );
          })
        )}

        {/* 🎉 クリアオーバーレイ */}
        {finalScoreMs !== null && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              color: "#fff",
              fontSize: "40px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "8px",
              zIndex: 5,
              animation: "fadeIn 0.5s ease",
            }}
          >
            🎉 CLEAR! 🎉
          </div>
        )}
      </div>

      {/* 結果表示 */}
      {finalScoreMs !== null && (
        <div
          style={{
            marginTop: "20px",
            padding: "12px",
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: "8px",
            fontSize: "14px",
            lineHeight: 1.4,
          }}
        >
          <div style={{ fontWeight: "bold" }}>クリア！🎉</div>
          <div>最終記録（ペナルティ込み）: {msToClock(finalScoreMs)}</div>
          <div>ミス回数: {penalties} 回</div>
        </div>
      )}
    </div>
  );
}
