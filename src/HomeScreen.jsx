import React, { useState, useRef, useEffect } from "react";

export default function HomeScreen({
  onSelectSmileFinder,
  onSelectWordFinder,
  onSelectLinesFinder,
}) {
  // =========================
  //  音楽プレイヤー用の状態
  // =========================

  // 曲リスト（あなた指定の最新版）
  const TRACKS = [
    { title: "やさしいBGM 01", src: "/BGM.mp3" },
    { title: "やさしいBGM 02", src: "/bgm02.mp3" },
    { title: "やさしいBGM 03", src: "/bgm03.mp3" },
    { title: "やさしいBGM 04", src: "/bgm04.mp3" },
    { title: "終わりの静寂", src: "/music01.mp3" },
    { title: "遥かな君へ", src: "/music02.mp3" },
    { title: "エンドロール", src: "/music03.mp3" },
    { title: "夢枕", src: "/music04.mp3" },
    { title: "夕立のあとで", src: "/music05.mp3" },
  ];

  // 再生している曲のindex
  const [trackIndex, setTrackIndex] = useState(0);
  // 再生中かどうか
  const [isPlaying, setIsPlaying] = useState(false);

  // 再生位置(秒)と曲の長さ(秒)
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);
  const currentTrack = TRACKS[trackIndex];

  // mm:ss 表示用
  function toClock(sec) {
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return m.toString() + ":" + ss.toString().padStart(2, "0");
  }

  // 再生/一時停止
  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // iPhoneの「ユーザー操作なし自動再生ブロック」とかで失敗することはある
        });
    }
  }

  // 曲を選び直した時
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

  // シークバーを動かしたとき
  function handleSeekChange(e) {
    const sec = Number(e.target.value);
    if (!audioRef.current) return;
    audioRef.current.currentTime = sec;
    setCurrentTime(sec);
  }

  // 曲のメタ情報/進行状況を監視
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    function onLoadedMeta() {
      setDuration(el.duration || 0);
    }
    function onTimeUpdate() {
      setCurrentTime(el.currentTime || 0);
    }
    function onEnded() {
      setIsPlaying(false); // 自動では次に行かない・ループもしない
    }

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
  //  見た目用のスタイル
  // =========================

  // 画面全体の背景
  const bgStyle = {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 20% 20%, #fffbe6 0%, #e0f7ff 40%, #e8f9f1 70%)",
    backgroundAttachment: "fixed",
    fontFamily: "system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "24px 16px 80px",
    boxSizing: "border-box",
    overflowX: "hidden", // ★ 横ズレ防止
    width: "100%",       // ★ 画面幅にフィット
  };

  // 共通カード
  const cardStyle = {
    backgroundColor: "rgba(255,255,255,0.8)",
    backdropFilter: "blur(4px)",
    border: "1px solid rgba(255,255,255,0.6)",
    borderRadius: "16px",
    boxShadow: "0 16px 40px rgba(0,0,0,0.08)",
    padding: "16px",
    width: "100%",        // ★ 横幅を100%に統一
    maxWidth: "420px",    // ★ スマホに合わせた最大幅
    margin: "0 auto 24px",
    boxSizing: "border-box", // ★ パディング込み幅
  };


  // タイトル（グラデーション文字）
  const titleTextStyle = {
    background:
      "linear-gradient(90deg,#0ea5e9 0%,#38bdf8 30%,#34d399 60%,#fde047 100%)",
    WebkitBackgroundClip: "text",
    color: "transparent",
    fontSize: "22px",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: "12px",
  };

  // サブ説明
  const subTextStyle = {
    color: "#374151",
    fontSize: "14px",
    fontWeight: "500",
    lineHeight: 1.4,
    textAlign: "center",
    marginBottom: "20px",
  };

  // ゲームボタン（青～緑）
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

  // ゲームボタン（黄色～緑）
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

  return (
    <div style={bgStyle}>
      {/* ---------------------------
          カード1: アプリ紹介＋ゲーム3つ
         --------------------------- */}
      <div style={cardStyle}>
        <div style={titleTextStyle}>Positive Playroom</div>

        <div style={subTextStyle}>
          ミニゲームや音楽を通して
          <br />
          心を少し軽くする、やさしい遊び場です。
          <br />
          スキマ時間の気分転換にどうぞ🍀
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          <button
            style={gameButtonStyleMain}
            onClick={onSelectSmileFinder}
          >
            Smile Finder
            <br />
            （笑顔を見つける）
          </button>

          <button
            style={gameButtonStyleAlt}
            onClick={onSelectWordFinder}
          >
            Positive Word Finder
            <br />
            （前向きな言葉を探す）
          </button>

        </div>
      </div>

      {/* ---------------------------
          カード2: 音楽プレイヤー
         --------------------------- */}
      <div style={cardStyle}>
        {/* タイトル */}
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

        {/* 再生/一時停止ボタン */}
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

        {/* 再生位置シークバー */}
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
            style={{
              width: "100%",
              accentColor: "#3b82f6",
            }}
          />
        </div>

        {/* 実際のaudioタグ（UIは自分で作ってるからコントロールは非表示） */}
        <audio ref={audioRef} src={currentTrack.src} />
      </div>
    </div>
  );
}
