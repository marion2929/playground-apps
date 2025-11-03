import { useEffect, useMemo, useRef, useState } from "react";

/* ============== ユーティリティ ============== */
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

/* ============== データセット ============== */
// 正解：やさしいニュアンス
const SOFT_LINES = [
  "無理しなくていいよ。今のままで十分がんばってるから。",
  "大丈夫、ちゃんと味方いるから心配しなくていいよ。",
  "ゆっくりでいいよ。急がなくて大丈夫。",
  "今日は休もう？それも立派な前進だよ。",
  "うまく言えなくても伝わってるよ。ちゃんと見てるから。",
  "あなたがいてくれるだけで助かってるよ、ほんとに。",
  "できない日があっても普通だよ。人間だもん。",
  "しんどいって言ってくれてありがとう。言えたのえらいよ。",
  "大丈夫、一緒に考えよ。ひとりで抱えなくていいから。",
  "それはちゃんと頑張った証拠だよ。胸張っていいやつ。",
  "泣きたいときは泣いていいんだよ？我慢しなくていいよ。",
  "ちゃんと生きてるだけでえらいんだからね？",
  "失敗じゃないよ。今わかったってことが成長なんだよ。",
  "安心して。嫌いになったりしないから。",
  "ちょっと休憩しよ。お茶いれてくるね。",
  "今日はここまででよくない？十分やったよ。",
  "それはあなたが優しいから悩むんだよ。悪いことじゃないよ。",
  "心配させてくれてありがとう、ちゃんと話してくれてうれしい。",
  "ちゃんと助けを求められるの、すごい力だからね？",
  "よしよし、がんばったね。ほんとに偉いよ。",
  "ちゃんとここにいるよ、ひとりじゃないからね。",
  "失敗しても大丈夫、ちゃんと前に進んでる証拠だよ。",
  "頑張らなくても、あなたの存在だけで十分だよ。",
  "そんな日もあるよ、無理せずいこう。",
  "あなたのペースで大丈夫、焦らなくていいよ。",
  "ちゃんと頑張ってるの知ってるよ。",
  "言葉にできなくても、気持ちはちゃんと伝わってるよ。",
  "今できることをしてる、それだけでえらいよ。",
  "どんなあなたも大切だよ。",
  "無理に笑わなくてもいいよ、ちゃんと受け止めるからね。",
  "泣いた分だけ、少しずつ優しくなれるよ。",
  "いつも頑張ってるの見てるよ、すごいと思う。",
  "ゆっくり休んでね、ちゃんと自分を労ってあげて。",
  "大丈夫、ちゃんと乗り越えられる力があるよ。",
  "そんなに完璧じゃなくていいよ。",
  "それでも前を向いてるあなたが素敵だよ。",
  "ちゃんと頑張ってるって、みんなわかってるよ。",
  "何もしない時間も、大事な時間だよ。",
  "今日は生きてるだけでえらい日だよ。",
  "弱音を吐けるあなたは強いよ。",
  "やめたっていいよ、また始めたくなったら戻ればいいよ。",
  "あなたの存在が、ちゃんと誰かの支えになってるよ。",
  "何もできない日があっても、それでいいんだよ。",
  "ちゃんと息してるだけで、もう十分だよ。",
  "少しずつでも、確実に進んでるよ。",
  "あなたが笑える日がまた来るからね。",
  "そのままのあなたで大丈夫だよ。",
  "ちゃんと優しさが伝わってるよ。",
  "いつも頑張ってる自分を褒めてあげてね。",
  "今までよく頑張ったね、ほんとにえらいよ。",
];

// 不正解：きついニュアンス
const HARD_LINES = [
  "それくらいで弱音吐くのは甘えなんじゃない？",
  "いやいや、それはさすがにサボりでしょ。",
  "泣いたって状況は変わらないよ？やるしかないんだからさ。",
  "それができないと正直、今後キツいと思うよ。",
  "みんなやってるよ？あなただけ特別じゃないからね。",
  "まだ言い訳するの？いつまでそのままでいるつもり？",
  "その程度で褒めてほしい感じ？",
  "自分で決めたんだから責任取るのは当たり前でしょ。",
  "何回同じこと言わせるの？",
  "もっと頑張らないと信用なくすよ？",
  "正直そこは気持ちの問題でしょ。",
  "そんなの普通は相談しないで自分でなんとかするよ。",
  "傷ついたとか言われても困るんだけど。",
  "それが限界って言うならこの先もっと無理だよ。",
  "まだ本気じゃないでしょ？だからそうなるんだよ。",
  "素直にやればいいだけでしょ？なんで逆らうの？",
  "甘えてるの気づいてる？",
  "鬱っぽいとか言って逃げたいだけでしょ？",
  "面倒くさいからちゃんとして。",
  "そんなの聞いてる暇ない。自分でやって。",
  "努力が足りないだけじゃない？",
  "それで本気って言えるの？",
  "結局やる気がないんでしょ。",
  "人のせいにしてるうちは変わらないよ。",
  "また同じミス？さすがに学んでよ。",
  "なんでそんな簡単なこともできないの？",
  "甘えてるの見え見えだよ。",
  "いつまでその話してるの？",
  "そんなこと言ってる暇あるの？",
  "結果出してから言ってよ。",
  "逃げてるだけに見えるよ。",
  "やる気ないならやめたら？",
  "それで満足してるの？",
  "努力してる人に失礼だよ。",
  "期待して損した。",
  "もうちょっと考えてから発言して。",
  "言い訳ばっかりだね。",
  "自分が悪いのに気づいてないの？",
  "正直、見ててイライラする。",
  "もう少し現実見たほうがいいよ。",
  "口だけだよね、いつも。",
  "責任感なさすぎじゃない？",
  "そんな考えじゃ通用しないよ。",
  "何度も注意されてるよね？",
  "やるって言ったのに結局やってないじゃん。",
  "いい加減、甘えすぎ。",
  "本気ならもっと行動してるはず。",
  "その程度で満足してるの？",
  "自分勝手すぎない？",
  "周りのこと全然見えてないね。",
  "聞いてる？返事くらいして。",
  "努力してるつもりなんでしょ？",
  "いつまで他人と比べてるの？",
  "言われなきゃできないの？",
  "やる気あるように見えないけど。",
  "もう何回目？",
  "わかってないね、ほんと。",
  "その態度、どうかと思うよ。",
  "もう少し責任持ってくれない？",
  "自分が何言ってるか理解してる？",
  "周りに迷惑かけてるの気づいてる？",
  "適当すぎるよ。",
  "正直、見てて痛い。",
  "なんでも人任せだね。",
  "頑張ってるって言い訳でしょ。",
  "結局何も変わってないよね。",
  "なんでそんなに他人事なの？",
  "全部他人のせいにするのやめなよ。",
  "それで満足してるならもういいけど。",
  "言葉だけで動かないね。",
  "失敗を人のせいにするのやめて。",
  "正直、期待してなかったけどね。",
  "その程度の努力じゃ意味ないよ。",
  "やる気が見えない。",
  "感情的すぎて話にならない。",
  "そんな甘い考えじゃ通用しないよ。",
  "何回説明したらわかるの？",
  "口では立派なこと言うね。",
  "自分でまいた種でしょ。",
  "こっちの気持ちも考えてよ。",
  "結局、やる気ないだけでしょ。",
  "いつまで逃げるつもり？",
  "もう少し自分で考えて。",
];

/* プール構築 */
function buildLinePool() {
  const softObjs = SOFT_LINES.map((line, idx) => ({
    baseId: `good${idx + 1}`,
    text: line,
    isSoft: true,
  }));
  const hardObjs = HARD_LINES.map((line, idx) => ({
    baseId: `hard${idx + 1}`,
    text: line,
    isSoft: false,
  }));
  return [...softObjs, ...hardObjs];
}

/* ============== ベストタイム（localStorage） ============== */
function bestTimeKeyLines(size) {
  return `bestTimeLines_${size}`;
}
function loadBestTimeLines(size) {
  const raw =
    typeof window !== "undefined"
      ? localStorage.getItem(bestTimeKeyLines(size))
      : null;
  if (!raw) return null;
  const num = Number(raw);
  if (Number.isNaN(num)) return null;
  return num;
}
function saveBestTimeLines(size, ms) {
  localStorage.setItem(bestTimeKeyLines(size), String(ms));
}

/* ============== 本体コンポーネント ============== */
export default function GameLinesFinder({ onBackToHome }) {
  const LEVELS = [10, 20, 30, 40, 50];

  // 状態
  const [gridSize, setGridSize] = useState(10);
  const [grid, setGrid] = useState([]);
  const [targets, setTargets] = useState([]);
  const [found, setFound] = useState({});
  const [penalties, setPenalties] = useState(0);
  const [wrongFlash, setWrongFlash] = useState({});

  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // タイマー
  const [startTime, setStartTime] = useState(null);
  const [pendingStartTime, setPendingStartTime] = useState(null);
  const [now, setNow] = useState(Date.now());
  const rafRef = useRef(null);

  // チュートリアル
  const [showTutorial, setShowTutorial] = useState(false);
  const [fadeOutTutorial, setFadeOutTutorial] = useState(false);
  const [targetCount, setTargetCount] = useState(0);

  // 効果音のみ
  const correctRef = useRef(null);
  const wrongRef = useRef(null);
  const clearRef = useRef(null);

  // ベストタイム
  const [bestTimes, setBestTimes] = useState(() => {
    const init = {};
    LEVELS.forEach((lvl) => {
      init[lvl] = loadBestTimeLines(lvl);
    });
    return init;
  });

  // 計算
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

  // タイマー駆動
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

  // ゲーム開始
  function startGame() {
    const softRatio = 0.3; // やさしい系30%
    const needSoft = Math.max(1, Math.round(gridSize * softRatio));

    // 効果音
    correctRef.current = new Audio("/correct.mp3");
    wrongRef.current = new Audio("/wrong.mp3");
    clearRef.current = new Audio("/clear.mp3");

    // デッキ構築
    const POOL = shuffle(buildLinePool());
    const softPool = POOL.filter((p) => p.isSoft);
    const hardPool = POOL.filter((p) => !p.isSoft);

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

    const softItems = takeRandom(softPool, needSoft);
    const hardItems = takeRandom(hardPool, gridSize - softItems.length);
    const merged = shuffle([...softItems, ...hardItems]);

    setGrid(merged);
    setTargets(softItems.map((it) => it.uid));
    setFound({});
    setWrongFlash({});
    setPenalties(0);
    setGameOver(false);

    const t = Date.now();
    setPendingStartTime(t);
    setStartTime(null);
    setNow(t);
    setRunning(false);

    setTargetCount(softItems.length);
    setShowTutorial(true);
    setFadeOutTutorial(false);
  }

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

  // クリック処理
  function handleClick(item) {
    if (!running || gameOver) return;
    const isTarget = targets.includes(item.uid);

    if (isTarget) {
      if (correctRef.current) {
        correctRef.current.currentTime = 0;
        correctRef.current.play().catch(() => {});
      }
      setFound((prev) => {
        if (prev[item.uid]) return prev;
        return { ...prev, [item.uid]: true };
      });
    } else {
      if (wrongRef.current) {
        wrongRef.current.currentTime = 0;
        wrongRef.current.play().catch(() => {});
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
        clearRef.current.play().catch(() => {});
      }

      const thisRun = Date.now() - startTime + penalties * 3000;
      const prevBest = bestTimes[gridSize];

      if (prevBest == null || thisRun < prevBest) {
        saveBestTimeLines(gridSize, thisRun);
        setBestTimes((old) => ({
          ...old,
          [gridSize]: thisRun,
        }));
      }
    }
  }, [allFound, running, gameOver, startTime, penalties, gridSize, bestTimes]);

  /* ============== スタイル ============== */
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

  const controlPanelStyle = {
    backgroundColor: "rgba(255,255,255,0.8)",
    backdropFilter: "blur(4px)",
    border: "1px solid rgba(255,255,255,0.6)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
    borderRadius: "16px",
    padding: "16px",
  };

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

  // ★ ステータス 2列×2段（タイム表示のブレ防止）
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
    opacity: running ? 0.6 : 1,
    fontWeight: 600,
    boxShadow: active
      ? "0 4px 10px rgba(56,189,248,0.4)"
      : "0 2px 4px rgba(0,0,0,0.05)",
  });

  // 盤面（セリフは長いので2列）
  const gridAreaStyle = {
    marginTop: "4px",
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "8px",
    maxHeight: "70vh",
    overflowY: "auto",
    position: "relative",
    borderRadius: "8px",
  };

  const lineCardStyle = (alreadyFound) => ({
    position: "relative",
    borderRadius: "10px",
    border: "1px solid #c7d2fe",
    padding: "10px 12px",
    cursor: "pointer",
    overflow: "hidden",
    background:
      "linear-gradient(135deg, #eef2ff 0%, #dbeafe 50%, #bfdbfe 100%)",
    minHeight: "80px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow:
      "0 4px 8px rgba(147,197,253,0.3), 0 0 12px rgba(99,102,241,0.25)",
    textAlign: "center",
    fontSize: "13px",
    fontWeight: "600",
    lineHeight: 1.5,
    color: alreadyFound ? "#6b7280" : "#1e3a8a",
    filter: alreadyFound ? "grayscale(100%) blur(1px)" : "none",
    opacity: alreadyFound ? 0.6 : 1,
  });

  // オーバーレイ（チュートリアル＆クリア）
  // 背景をブロックしないため pointerEvents: "none"
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
    pointerEvents: "none",
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
    pointerEvents: "auto", // 中身はクリック可
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

  /* ============== JSX ============== */
  return (
    <div style={appBgStyle}>
      <div style={outerWrapStyle}>
        {/* ===== 上側まとめブロック ===== */}
        <div style={controlPanelStyle}>
          {/* タイトル＋戻る */}
          <div style={headerRowStyle}>
            <div style={headerTextStyle}>Positive Lines Finder</div>
            <button onClick={onBackToHome} style={backBtnStyle}>
              ← ホームへ
            </button>
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
              レベル（表示セリフ数）： <span style={{ fontWeight: 700 }}>{gridSize}本</span>
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
                  {num}本
                </button>
              ))}
            </div>
          </div>

          {/* スタート・中止 */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={startGame} style={{
              background: "linear-gradient(90deg,#3b82f6 0%,#38bdf8 50%,#34d399 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 16px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
              スタート / もう一回
            </button>
            <button onClick={stopGame} style={{
              background: "linear-gradient(90deg,#6b7280 0%,#9ca3af 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 16px",
              fontWeight: "500",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
              中止
            </button>
          </div>
        </div>

        {/* ===== 盤面 ===== */}
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
                    style={lineCardStyle(alreadyFound)}
                  >
                    <div
                      style={{
                        padding: "4px 6px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        textAlign: "left",
                        fontSize: "13px",
                        lineHeight: 1.5,
                        maxWidth: "100%",
                      }}
                    >
                      {item.text}
                    </div>

                    {/* FOUND */}
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

                    {/* MISS */}
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

                <div style={{ marginBottom: "12px", color: "#064e3b" }}>
                  この中に
                  <br />
                  <strong style={{ fontSize: "16px" }}>
                    やさしいニュアンスのセリフが {targetCount} 個
                  </strong>
                  <br />
                  あります。
                  <br />
                  そのセリフだけタップしてね！
                  <br />
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

                <div style={{ marginBottom: "12px", color: "#064e3b" }}>
                  記録:{" "}
                  <strong style={{ fontSize: "16px" }}>
                    {finalScoreMs ? msToClock(finalScoreMs) : msToClock(elapsedMs)}
                  </strong>
                  <br />
                  ミス {penalties}回
                  <br />
                  ベスト({gridSize}本):{" "}
                  {bestTimes[gridSize] ? msToClock(bestTimes[gridSize]) : "–"}
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    lineHeight: 1.4,
                    fontWeight: 500,
                  }}
                >
                  「スタート / もう一回」で再挑戦！
                </div>
              </div>
            </div>
          )}
        </div>
        {/* ===== /盤面 ===== */}
      </div>
    </div>
  );
}
