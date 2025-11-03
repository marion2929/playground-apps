import { useEffect, useMemo, useRef, useState } from "react";

/* ================= SFX（Web Audio API）共通ユーティリティ ================= */
const SFX_FILES = {
  correct: "/correct.mp3",
  wrong: "/wrong.mp3",
  clear: "/clear.mp3",
};
// 端末の本体音量に従う前提で、アプリ側のベース音量は常に25%
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

/* ================= データ（単語リスト） ================= */
// 正解ワード（ポジティブ）
const POSITIVE_WORDS = [
  "明るい","希望","幸せ","輝く","未来","前進","チャレンジ","成長","可能性","夢",
  "穏やか","安らぎ","温もり","優しさ","感謝","微笑み","平和","癒し","安心","和やか",
  "努力","自信","根気","継続","勇気","挑戦","諦めない","本気","強さ","目標",
  "自分らしい","大丈夫","誇り","愛されている","ありのまま","受け入れる","信じる","心豊か","感動","喜び",
  "始まり","チャンス","新鮮","発見","変化","創造","冒険","学び","旅立ち","転機",
  "笑顔","絆","仲間","協力","支え合い","思いやり","信頼","助け合い","感動を共有","ハーモニー",
  "幸運","奇跡","チャンス","喜び","愛","成功","繁栄","感謝の連鎖","祝福","豊かさ",
  "謙虚","真心","誠実","優雅","清らか","純粋","素直","思慮深い","正直","愛情深い",
];
// 不正解ワード（ネガティブ）
const NEGATIVE_WORDS = [
  "悲しい","寂しい","虚しい","苦しい","辛い","不安","恐い","怒り","憎い","憂うつ",
  "絶望","後悔","嫉妬","失望","疲れた","無気力","不満","退屈","いらだち","焦り",
  "恥ずかしい","罪悪感","孤独","不信","困惑","不快","怯え","緊張","無関心","屈辱",
  "罪深い","無力","無価値","怒鳴る","泣きたい","迷い","不穏","後ろめたい","疑念","不義理",
  "悲観的","消極的","否定的","頑固","諦め","儚い","無理","無駄","不可能","鈍感",
  "愚か","狭量","独善的","自己中心的","固執","無関心","不寛容","批判的","疑り深い","偏見",
  "意地悪","執念深い","短絡的","投げやり","不合理","わがまま","冷たい","不誠実","残酷","嘘つき",
  "ごまかし","皮肉","嘲笑","狡猾","無責任","悪意","不正直","計算高い","優柔不断","卑屈",
  "逃げる","さぼる","責任転嫁","言い訳","文句","批判","嘘をつく","約束を破る","裏切る","不平を言う",
  "攻撃的","無視する","ぶっきらぼう","暴言","無礼","偉そう","乱暴","不注意","怠慢","投げやり",
  "逃避","開き直る","傲慢","見下す","嫌味","愚痴","嫌がらせ","誹謗中傷","非協力的","嘲る",
  "無頓着","だらしない","無関心","無神経","騙す","利己的","自暴自棄","ふてくされる","無愛想","やる気がない",
  "失敗","損失","不景気","混乱","崩壊","破滅","災難","トラブル","事故","問題",
  "不具合","故障","中止","停止","渋滞","行き詰まり","落胆","暴落","失職","貧困",
  "不調","疾病","けが","怪我","破産","倒産","遅延","欠陥","誤解","不仲",
  "破局","離別","喧嘩","孤立","崩れる","絶たれる","滅びる","奪われる","壊れる","終わり",
];

function buildWordPool() {
  const positives = POSITIVE_WORDS.map((text, idx) => ({
    baseId: `p${idx + 1}`,
    text,
    isPositive: true,
  }));
  const negatives = NEGATIVE_WORDS.map((text, idx) => ({
    baseId: `n${idx + 1}`,
    text,
    isPositive: false,
  }));
  return [...positives, ...negatives];
}

/* ================= ベストタイム（localStorage） ================= */
function bestTimeKeyWord(size) { return `bestTimeWord_${size}`; }
function loadBestTimeWord(size) {
  const raw = typeof window !== "undefined" ? localStorage.getItem(bestTimeKeyWord(size)) : null;
  if (!raw) return null;
  const num = Number(raw);
  if (Number.isNaN(num)) return null;
  return num;
}
function saveBestTimeWord(size, ms) {
  localStorage.setItem(bestTimeKeyWord(size), String(ms));
}

/* ================= コンポーネント本体 ================= */
export default function GameWordFinder({ onBackToHome }) {
  const { initSfx, playSfx } = useSfx();

  const LEVELS = [10, 20, 30, 40, 50];
  const [gridSize, setGridSize] = useState(10);
  const [grid, setGrid] = useState([]);
  const [targets, setTargets] = useState([]);     // 正解uid
  const [found, setFound] = useState({});
  const [penalties, setPenalties] = useState(0);
  const [wrongFlash, setWrongFlash] = useState({});

  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const [startTime, setStartTime] = useState(null);
  const [pendingStartTime, setPendingStartTime] = useState(null);
  const [now, setNow] = useState(Date.now());

  // チュートリアル
  const [showTutorial, setShowTutorial] = useState(false);
  const [fadeOutTutorial, setFadeOutTutorial] = useState(false);
  const [targetCount, setTargetCount] = useState(0);

  // ベストタイム
  const [bestTimes, setBestTimes] = useState(() => {
    const init = {};
    LEVELS.forEach((lvl) => { init[lvl] = loadBestTimeWord(lvl); });
    return init;
  });

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

  // ゲーム開始
  function startGame() {
    // 初回ユーザー操作でSFX初期化＆プリロード
    initSfx();

    const positiveRatio = 0.3; // 30%が正解
    const needPositives = Math.max(1, Math.round(gridSize * positiveRatio));

    const POOL = shuffle(buildWordPool());
    const posPool = POOL.filter((p) => p.isPositive);
    const negPool = POOL.filter((p) => !p.isPositive);

    function takeRandomWords(pool, count) {
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

    const posItems = takeRandomWords(posPool, needPositives);
    const negItems = takeRandomWords(negPool, gridSize - posItems.length);
    const merged = shuffle([...posItems, ...negItems]);

    setGrid(merged);
    setTargets(posItems.map((it) => it.uid));
    setFound({});
    setWrongFlash({});
    setPenalties(0);
    setGameOver(false);

    const t = Date.now();
    setPendingStartTime(t);
    setStartTime(null);
    setNow(t);
    setRunning(false);

    setTargetCount(posItems.length);
    setShowTutorial(true);
    setFadeOutTutorial(false);
  }

  // チュートリアルOK → 本計測開始
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

  // タップ
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

  // クリア判定
  useEffect(() => {
    if (running && allFound && !gameOver) {
      setRunning(false);
      setGameOver(true);

      playSfx("clear");

      const thisRun = Date.now() - startTime + penalties * 3000;
      const prevBest = bestTimes[gridSize];

      if (prevBest == null || thisRun < prevBest) {
        saveBestTimeWord(gridSize, thisRun);
        setBestTimes((old) => ({ ...old, [gridSize]: thisRun }));
      }
    }
  }, [allFound, running, gameOver, startTime, penalties, gridSize, bestTimes, playSfx]);

  /* ================= スタイル ================= */
  const appBgStyle = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #fffbe6 0%, #e0f7ff 60%, #e8f9f1 100%)",
    backgroundAttachment: "fixed",
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
  const headerRowStyle = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: "12px", flexWrap: "wrap", gap: "8px",
  };
  const headerTextStyle = {
    background: "linear-gradient(90deg, #0ea5e9 0%, #38bdf8 30%, #34d399 60%, #fde047 100%)",
    WebkitBackgroundClip: "text", color: "transparent", fontWeight: "700", fontSize: "20px",
  };
  const backBtnStyle = {
    background: "linear-gradient(90deg,#6b7280 0%,#9ca3af 100%)",
    color: "#fff", border: "none", borderRadius: "10px", padding: "8px 12px",
    fontSize: "14px", cursor: "pointer", fontWeight: "500",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  };
  const statsGridStyle = {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px",
    fontSize: "13px", marginBottom: "12px",
  };
  const chipStyle = {
    backgroundColor: "#ffffffcc", border: "1px solid #fff", borderRadius: "10px",
    padding: "6px 10px", lineHeight: 1.3, boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    fontWeight: 500, textAlign: "center",
  };
  const levelBlockStyle = { marginBottom: "12px" };
  const levelTitleStyle = { fontSize: "14px", marginBottom: "8px", color: "#1f2937", fontWeight: 600 };
  const levelButtonsWrapStyle = { display: "flex", flexWrap: "wrap", gap: "8px" };
  const levelButtonBase = (active) => ({
    border: active ? "2px solid #38bdf8" : "1px solid #ccc",
    background: active ? "linear-gradient(90deg,#bae6fd,#d9f99d)" : "#fff",
    borderRadius: "8px", padding: "8px 12px", fontSize: "14px",
    cursor: running ? "not-allowed" : "pointer", opacity: running ? 0.6 : 1,
    fontWeight: 600, boxShadow: active ? "0 4px 10px rgba(56,189,248,0.4)" : "0 2px 4px rgba(0,0,0,0.05)",
  });
  const actionRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };
  const mainButtonStyle = {
    background: "linear-gradient(90deg,#3b82f6 0%,#38bdf8 50%,#34d399 100%)",
    color: "#fff", border: "none", borderRadius: "10px", padding: "10px 16px",
    fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  };
  const stopButtonStyle = {
    background: "linear-gradient(90deg,#6b7280 0%,#9ca3af 100%)",
    color: "#fff", border: "none", borderRadius: "10px", padding: "10px 16px",
    fontWeight: "500", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  };
  const boardPanelStyle = {
    background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(219,234,254,0.8) 100%)",
    borderRadius: "16px", border: "1px solid rgba(255,255,255,0.6)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.05)", padding: "8px", position: "relative", marginTop: "16px",
  };
  const gridAreaStyle = {
    marginTop: "4px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
    gap: "8px", maxHeight: "70vh", overflowY: "auto",
  };
  const wordCardStyle = (alreadyFound) => ({
    position: "relative", borderRadius: "10px", border: "1px solid #fcd34d",
    padding: "8px", cursor: "pointer", overflow: "hidden",
    background: "linear-gradient(135deg, #fff7ed 0%, #fde68a 50%, #fdba74 100%)",
    minHeight: "60px", aspectRatio: "1 / 1", display: "flex",
    alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 8px rgba(253,186,116,0.3), 0 0 12px rgba(255,161,64,0.2)",
    textAlign: "center", fontSize: "14px", fontWeight: "600", lineHeight: 1.4,
    color: alreadyFound ? "#6b7280" : "#78350f",
    filter: alreadyFound ? "grayscale(100%) blur(1px)" : "none",
    opacity: alreadyFound ? 0.6 : 1,
  });
  const overlayStyle = {
    position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "16px", textAlign: "center", zIndex: 40, pointerEvents: "none",
  };
  const overlayInnerStyle = {
    backgroundColor: "rgba(255,255,255,0.95)", color: "#1f2937",
    borderRadius: "16px", padding: "20px", maxWidth: "260px", width: "100%",
    boxShadow: "0 20px 40px rgba(0,0,0,0.3), 0 0 20px rgba(16,185,129,0.55)",
    border: "2px solid #6ee7b7", fontSize: "14px", lineHeight: 1.5, fontWeight: 500,
    pointerEvents: "auto",
  };
  const overlayButtonStyle = {
    background: "linear-gradient(90deg,#3b82f6 0%,#38bdf8 50%,#34d399 100%)",
    color: "#fff", border: "none", width: "100%", borderRadius: "10px",
    padding: "10px 12px", fontSize: "14px", fontWeight: "600", cursor: "pointer",
    boxShadow: "0 8px 20px rgba(0,0,0,0.25),0 0 16px rgba(16,185,129,0.6)",
  };

  return (
    <div style={appBgStyle}>
      <div style={outerWrapStyle}>
        {/* ====== 上側UIブロック ====== */}
        <div style={controlPanelStyle}>
          {/* タイトル＋戻る */}
          <div style={headerRowStyle}>
            <div style={headerTextStyle}>Positive Word Finder</div>
            <button onClick={onBackToHome} style={backBtnStyle}>← ホームへ</button>
          </div>

          {/* ステータス（2列×2段 固定） */}
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

          {/* レベル選択 */}
          <div style={levelBlockStyle}>
            <div style={levelTitleStyle}>
              レベル（表示ワード数）： <span style={{ fontWeight: 700 }}>{gridSize}個</span>
            </div>
            <div style={levelButtonsWrapStyle}>
              {LEVELS.map((num) => (
                <button
                  key={num}
                  onClick={() => { if (!running) setGridSize(num); }}
                  style={levelButtonBase(gridSize === num)}
                  disabled={running}
                >
                  {num}個
                </button>
              ))}
            </div>
          </div>

          {/* スタート・中止 */}
          <div style={actionRowStyle}>
            <button onClick={startGame} style={mainButtonStyle}>スタート / もう一回</button>
            <button onClick={stopGame} style={stopButtonStyle}>中止</button>
          </div>
        </div>

        {/* ====== ゲーム盤面 ====== */}
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
                    style={wordCardStyle(alreadyFound)}
                  >
                    <div style={{ padding: "4px 6px", wordBreak: "keep-all" }}>
                      {item.text}
                    </div>

                    {alreadyFound && (
                      <div
                        style={{
                          position: "absolute", inset: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontWeight: "bold", fontSize: "12px",
                          backgroundColor: "rgba(0,0,0,0.4)", textShadow: "0 0 4px #000",
                        }}
                      >
                        FOUND
                      </div>
                    )}

                    {wasWrong && (
                      <div
                        style={{
                          position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#ff4d4d", fontSize: "28px", fontWeight: "bold",
                          textShadow: "0 0 6px rgba(0,0,0,0.8), 0 0 10px rgba(255,0,0,0.8)",
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

          {/* チュートリアル */}
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
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#065f46", marginBottom: "8px" }}>
                  ルール説明
                </div>
                <div style={{ marginBottom: "12px", color: "#064e3b" }}>
                  この中に<br />
                  <strong style={{ fontSize: "16px" }}>
                    やさしい・安心できる言葉が {targetCount} 個
                  </strong><br />
                  あります。<br />
                  その言葉だけタップしてね！<br />
                  間違えると+3秒ペナルティ！
                </div>
                <button onClick={beginAfterTutorial} style={overlayButtonStyle}>
                  OK！スタート！
                </button>
              </div>
            </div>
          )}

          {/* クリア後 */}
          {gameOver && (
            <div style={overlayStyle}>
              <div style={overlayInnerStyle}>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#065f46", marginBottom: "8px" }}>
                  クリアおめでとう！ 🎉
                </div>
                <div style={{ marginBottom: "12px", color: "#064e3b" }}>
                  記録:{" "}
                  <strong style={{ fontSize: "16px" }}>
                    {finalScoreMs ? msToClock(finalScoreMs) : msToClock(elapsedMs)}
                  </strong>
                  <br />
                  ミス {penalties}回
                  <br />
                  ベスト({gridSize}個):{" "}
                  {bestTimes[gridSize] ? msToClock(bestTimes[gridSize]) : "–"}
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.4, fontWeight: 500 }}>
                  「スタート / もう一回」で再挑戦！
                </div>
              </div>
            </div>
          )}
        </div>
        {/* ====== /ゲーム盤面 ====== */}
      </div>
    </div>
  );
}
