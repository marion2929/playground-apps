import React, { useState, useRef, useEffect } from "react";

export default function HomeScreen({
  onSelectSmileFinder, // にこぽち
  onSelectWordFinder,  // ぽじたん
}) {
  // =========================
  //  音楽プレイヤー用の状態
  // =========================

  const TRACKS = [
    { title: "ピアノ曲 01", src: "/BGM.mp3" },
    { title: "ピアノ曲 02", src: "/bgm02.mp3" },
    { title: "ピアノ曲 03", src: "/bgm03.mp3" },
    { title: "ピアノ曲 04", src: "/bgm04.mp3" },
    { title: "1 終わりの静寂", src: "/music01.mp3" },
    { title: "2 遥かな君へ", src: "/music02.mp3" },
    { title: "3 エンドロール", src: "/music03.mp3" },
    { title: "4 夢枕", src: "/music04.mp3" },
    { title: "5 夕立のあとで", src: "/music05.mp3" },
    { title: "6 猫みたいな君", src: "/music06.mp3" },
    { title: "7 あかきゆめみし", src: "/music07.mp3" },
  ];

  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);
  const currentTrack = TRACKS[trackIndex];

  function toClock(sec) {
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return m.toString() + ":" + ss.toString().padStart(2, "0");
    }

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }

  function handleSelectTrack(e) {
    const idx = Number(e.target.value);
    if (idx === trackIndex) return;
    setTrackIndex(idx);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }

  function handleSeekChange(e) {
    const sec = Number(e.target.value);
    if (!audioRef.current) return;
    audioRef.current.currentTime = sec;
    setCurrentTime(sec);
  }

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    function onLoadedMeta() { setDuration(el.duration || 0); }
    function onTimeUpdate() { setCurrentTime(el.currentTime || 0); }
    function onEnded() { setIsPlaying(false); }

    el.addEventListener("loadedmetadata", onLoadedMeta);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMeta);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("ended", onEnded);
    };
  }, [trackIndex]);

  // =========================
  //  スタイル
  // =========================

  // 画面全体（横余白対策済）
  const bgStyle = {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 20% 20%, #fffbe6 0%, #e0f7ff 40%, #e8f9f1 70%)",
    backgroundAttachment: "fixed",
    backgroundPosition: "center center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",

    fontFamily: "system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "24px 16px 80px",
    boxSizing: "border-box",

    width: "100vw",
    maxWidth: "100vw",
    minWidth: "100vw",
    overflowX: "hidden",

    position: "relative",
    left: "50%",
    right: "50%",
    marginLeft: "-50vw",
    marginRight: "-50vw",
  };

  // 共通カード
  const cardStyle = {
    backgroundColor: "rgba(255,255,255,0.8)",
    backdropFilter: "blur(4px)",
    border: "1px solid rgba(255,255,255,0.6)",
    borderRadius: "16px",
    boxShadow: "0 16px 40px rgba(0,0,0,0.08)",
    padding: "16px",
    width: "100%",
    maxWidth: "420px",
    margin: "0 auto 24px",
    boxSizing: "border-box",
  };

  // タイトル
  const titleTextStyle = {
    background:
      "linear-gradient(90deg,#0ea5e9 0%,#38bdf8 30%,#34d399 60%,#fde047 100%)",
    WebkitBackgroundClip: "text",
    color: "transparent",
    fontSize: "22px",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: "8px",
  };

  // サブ説明（タグライン）
  const subTextStyle = {
    color: "#374151",
    fontSize: "14px",
    fontWeight: "600",
    lineHeight: 1.4,
    textAlign: "center",
    marginBottom: "20px",
  };

  // ゲームボタン
  const gameButtonStyleMain = {
    background:
      "linear-gradient(90deg,#3b82f6 0%,#38bdf8 50%,#34d399 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    boxShadow: "0 16px 32px rgba(0,0,0,0.15)",
    fontWeight: "600",
    fontSize: "16px",
    padding: "14px 16px",
    width: "100%",
    cursor: "pointer",
    textAlign: "center",
  };
  const gameButtonStyleAlt = {
    background:
      "linear-gradient(90deg,#facc15 0%,#fcd34d 30%,#86efac 100%)",
    color: "#1f2937",
    border: "none",
    borderRadius: "12px",
    boxShadow: "0 16px 32px rgba(0,0,0,0.15)",
    fontWeight: "600",
    fontSize: "16px",
    padding: "14px 16px",
    width: "100%",
    cursor: "pointer",
    textAlign: "center",
  };

  // サイト説明カード（下部に新設）
  const aboutCardStyle = {
    ...cardStyle,
    maxWidth: "720px",
  };
  const faintRuleStyle = {
    textAlign: "center",
    color: "#94a3b8",
    letterSpacing: "0.3em",
    margin: "8px 0",
    userSelect: "none",
  };

  return (
    <div style={bgStyle}>
      {/* カード1：サイト名＋ゲーム2つ */}
      <div style={cardStyle}>
        <div style={titleTextStyle}>こころびひろば</div>
        <div style={subTextStyle}>ほっとひといき、まえをむくためのひろば。</div>

        <div style={{ display: "grid", gap: "12px" }}>
          <button style={gameButtonStyleMain} onClick={onSelectSmileFinder}>
            にこぽち
            <br />
            （色んな表情から笑顔をみつける）
          </button>

          <button style={gameButtonStyleAlt} onClick={onSelectWordFinder}>
            ぽじたん
            <br />
            （ポジティブな言葉をえらぶ）
          </button>
        </div>
      </div>

      {/* カード2：音楽プレイヤー（既存のまま） */}
      <div style={cardStyle}>
        <div
          style={{
            fontWeight: "700",
            fontSize: "16px",
            color: "#0ea5e9",
            textAlign: "center",
            marginBottom: "12px",
          }}
        >
          音楽プレイヤー
        </div>

        {/* 曲選択 */}
        <div style={{ marginBottom: "12px" }}>
          <label
            htmlFor="trackSelect"
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "4px",
            }}
          >
            曲を選ぶ
          </label>
          <select
            id="trackSelect"
            value={trackIndex}
            onChange={handleSelectTrack}
            style={{
              width: "100%",
              fontSize: "14px",
              borderRadius: "8px",
              border: "1px solid #93c5fd",
              padding: "8px",
              backgroundColor: "#fff",
              color: "#1f2937",
            }}
          >
            {TRACKS.map((t, i) => (
              <option key={i} value={i}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* 再生/一時停止 */}
        <div style={{ marginBottom: "16px", textAlign: "center" }}>
          <button
            onClick={togglePlay}
            style={{
              background:
                "linear-gradient(90deg,#3b82f6 0%,#38bdf8 50%,#34d399 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontWeight: "600",
              fontSize: "16px",
              padding: "12px 16px",
              width: "100%",
              maxWidth: "240px",
              boxShadow: "0 16px 32px rgba(0,0,0,0.15)",
            }}
          >
            {isPlaying ? "⏸ 一時停止" : "▶ 再生"}
          </button>
        </div>

        {/* 進行表示＋シーク */}
        <div style={{ marginBottom: "8px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#6b7280",
              marginBottom: "4px",
            }}
          >
            <span>{toClock(currentTime)}</span>
            <span>{toClock(duration)}</span>
          </div>

          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={currentTime}
            onChange={handleSeekChange}
            style={{ width: "100%", accentColor: "#3b82f6" }}
          />
        </div>

        <audio ref={audioRef} src={currentTrack.src} />
      </div>

      {/* カード3：サイト説明（新規追加／あなたの原稿そのまま） */}
      <div style={aboutCardStyle} aria-label="こころびひろばの説明">
        <div style={{ fontSize: "16px", fontWeight: 800, marginBottom: 8 }}>
          🌸 こころびひろば
        </div>

        <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
          ― 心に灯りを。心と対話を。心に喜びを。―
        </div>

        <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.8 }}>
          <strong>「こころび」</strong>とは、
          心にそっと灯りをともす「心灯（こころび）」、
          自分の心と向き合う日「心日（こころび）」、
          そして、心に喜びを届ける「心＋喜び」。<br />
          そんな想いを込めた、<strong>“心を整えるためのやさしいひろば”</strong>です。
        </div>

        <div style={faintRuleStyle}>⸻</div>

        <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.8 }}>
          <strong>🎮 遊びながらポジティブに</strong><br />
          ここでは、心理学に基づいた「注意バイアス修正訓練」をもとにした、
          ポジティブな意識を育てるミニゲームを体験できます。<br />
          笑顔の写真を見つけたり、前向きな言葉を選んだりするうちに、
          自然と心の焦点が明るい方へ向かっていきます。
          遊びながら“前向きな気づき”を育てる、そんな優しいトレーニングです。
        </div>

        <div style={faintRuleStyle}>⸻</div>

        <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.8 }}>
          <strong>🎹 ピアノの音で、心にやすらぎを</strong><br />
          サイトでは、静かに流れるピアノの調べがあなたを包みます。
          日々の疲れをほぐすように、心に穏やかな波を広げてくれる音たち。<br />
          そして、これまでに私が紡いできた想いをのせた音楽作品も聴くことができます。
          言葉とメロディがそっと寄り添い、心にやさしい余韻を残します。
        </div>

        <div style={faintRuleStyle}>⸻</div>

        <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.8 }}>
          <strong>☀️ 自分のペースで、心を整える場所</strong><br />
          「こころびひろば」は、誰かに評価されるための場所ではありません。
          頑張らなくていい、比べなくていい。<br />
          ただ、遊んで、聴いて、少し微笑む——それだけで十分です。<br />
          このひろばが、あなたの心に小さな灯りをともすきっかけになりますように。
        </div>
      </div>
    </div>
  );
}
