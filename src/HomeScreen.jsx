// src/HomeScreen.jsx
import React, { useState, useRef, useEffect } from "react";

export default function HomeScreen({
  onSelectSmileFinder,
  onSelectWordFinder,
  onSelectLinesFinder,
}) {
  // =========================
  // 楽曲リスト（あなたの指定）
  // =========================
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

  // =========================
  // オーディオ関連の状態
  // =========================
  const [selectedSrc, setSelectedSrc] = useState(TRACKS[0].src);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume10, setVolume10] = useState(5);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    audioEl.src = selectedSrc;
    audioEl.currentTime = 0;
    setCurrentTime(0);
    setDuration(0);
    if (isPlaying) {
      audioEl.play().catch(() => {});
    }
  }, [selectedSrc, isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume10 / 10;
  }, [volume10]);

  const handlePlayPause = () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    if (isPlaying) {
      audioEl.pause();
      setIsPlaying(false);
    } else {
      audioEl.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e) => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    const newTime = Number(e.target.value);
    audioEl.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime || 0);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration || 0);
  };

  const handleEnded = () => setIsPlaying(false);

  const formatTime = (sec) => {
    if (!isFinite(sec)) return "0:00";
    const s = Math.floor(sec);
    const mPart = Math.floor(s / 60);
    const sPart = s % 60;
    return `${mPart}:${sPart.toString().padStart(2, "0")}`;
  };

  // =========================
  // スタイル
  // =========================
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
  };

  const cardStyle = {
    backgroundColor: "rgba(255,255,255,0.8)",
    backdropFilter: "blur(4px)",
    border: "1px solid rgba(255,255,255,0.6)",
    borderRadius: "16px",
    boxShadow: "0 16px 40px rgba(0,0,0,0.08)",
    padding: "16px",
    width: "100%",
    maxWidth: "380px",
    margin: "0 auto 24px",
  };

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

  const subTextStyle = {
    color: "#374151",
    fontSize: "14px",
    fontWeight: "500",
    lineHeight: 1.4,
    textAlign: "center",
    marginBottom: "20px",
  };

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

  const musicTitleStyle = {
    fontWeight: "700",
    fontSize: "16px",
    color: "#0ea5e9",
    textAlign: "center",
    marginBottom: "12px",
  };

  const rowStyle = {
    marginBottom: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  };

  const labelStyle = {
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
  };

  const selectStyle = {
    width: "100%",
    borderRadius: "8px",
    border: "1px solid #93c5fd",
    padding: "8px",
    fontSize: "14px",
    backgroundColor: "#fff",
    color: "#1f2937",
    fontWeight: "500",
  };

  const playButtonStyle = {
    backgroundColor: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
    minWidth: "80px",
    textAlign: "center",
  };

  const sliderStyle = { width: "100%" };
  const timeRowStyle = {
    fontSize: "12px",
    color: "#6b7280",
    display: "flex",
    justifyContent: "space-between",
    fontFamily: "monospace",
  };

  // =========================
  // JSX
  // =========================
  return (
    <div style={bgStyle}>
      {/* --- メインカード：説明＋ゲームボタン --- */}
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
            Smile Finder（表情を見分ける）
          </button>
          <button
            style={gameButtonStyleAlt}
            onClick={onSelectWordFinder}
          >
            Positive Word Finder（ことばを見分ける）
          </button>
          <button
            style={gameButtonStyleAlt}
            onClick={onSelectLinesFinder}
          >
            Positive Lines Finder（伝え方を見分ける）
          </button>
        </div>
      </div>

      {/* --- 音楽プレイヤー --- */}
      <div style={cardStyle}>
        <div style={musicTitleStyle}>音楽プレイヤー</div>

        {/* 曲選択 */}
        <div style={rowStyle}>
          <div style={labelStyle}>曲を選ぶ</div>
          <select
            style={selectStyle}
            value={selectedSrc}
            onChange={(e) => setSelectedSrc(e.target.value)}
          >
            {TRACKS.map((track, i) => (
              <option key={i} value={track.src}>
                {track.title}
              </option>
            ))}
          </select>
        </div>

        {/* 再生/音量 */}
        <div style={rowStyle}>
          <button style={playButtonStyle} onClick={handlePlayPause}>
            {isPlaying ? "一時停止" : "再生"}
          </button>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>
            音量: {volume10}/10
          </div>
          <input
            style={sliderStyle}
            type="range"
            min={0}
            max={10}
            value={volume10}
            onChange={(e) => setVolume10(Number(e.target.value))}
          />
        </div>

        {/* シークバー */}
        <div style={rowStyle}>
          <div style={labelStyle}>再生位置</div>
          <input
            style={sliderStyle}
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
          />
          <div style={timeRowStyle}>
            <div>{formatTime(currentTime)}</div>
            <div>{formatTime(duration)}</div>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={selectedSrc}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      </div>
    </div>
  );
}
