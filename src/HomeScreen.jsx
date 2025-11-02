import React, { useState, useRef, useEffect } from "react";

export default function HomeScreen({
  onSelectSmileFinder,
  onSelectWordFinder,
  onSelectLinesFinder,
}) {
  // =========================
  // 曲リスト（あなた指定の最新版）
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

  // 再生状態
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 音量（0～10）
  const [volume, setVolume] = useState(5);

  // 再生位置
  const [currentTime, setCurrentTime] = useState(0); // 秒
  const [duration, setDuration] = useState(0); // 秒

  const audioRef = useRef(null);
  const currentTrack = TRACKS[trackIndex];

  // mm:ss に整形
  function toClock(sec) {
    const s = Math.floor(sec);
    const mPart = Math.floor(s / 60);
    const sPart = s % 60;
    return mPart.toString() + ":" + sPart.toString().padStart(2, "0");
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
        .then(() => setIsPlaying(true))
        .catch(() => {
          // モバイルの自動再生ブロックなどで失敗することはある
        });
    }
  }

  // 曲を選んだ時
  function handleSelectTrack(e) {
    const idx = Number(e.target.value);
    if (idx === trackIndex) return;
    setTrackIndex(idx);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }

  // 音量スライダー
  function handleVolumeChange(e) {
    const v = Number(e.target.value);
    setVolume(v);
  }

  // シークバー（再生位置）
  function handleSeekChange(e) {
    const sec = Number(e.target.value);
    if (!audioRef.current) return;
    audioRef.current.currentTime = sec;
    setCurrentTime(sec);
  }

  // 音量を常に同期
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 10; // 0.0〜1.0
    }
  }, [volume]);

  // audioイベント監視
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    function onLoadedMeta() {
      setDuration(audioEl.duration || 0);
    }
    function onTimeUpdate() {
      setCurrentTime(audioEl.currentTime || 0);
    }
    function onEnded() {
      setIsPlaying(false); // ループしない、止めるだけ
    }

    audioEl.addEventListener("loadedmetadata", onLoadedMeta);
    audioEl.addEventListener("timeupdate", onTimeUpdate);
    audioEl.addEventListener("ended", onEnded);

    return () => {
      audioEl.removeEventListener("loadedmetadata", onLoadedMeta);
      audioEl.removeEventListener("timeupdate", onTimeUpdate);
      audioEl.removeEventListener("ended", onEnded);
    };
  }, [trackIndex]);

  // トラック切り替え時にaudio差し替え
  useEffect(() => {
    if (!audioRef.current) return;
    const el = audioRef.current;
    el.pause();
    el.currentTime = 0;
    setCurrentTime(0);
    setDuration(0);

    if (isPlaying) {
      // すぐplayしようとするとブラウザが嫌がることあるのでちょい遅らせる
      setTimeout(() => {
        el
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }, 50);
    }
  }, [trackIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // =========================
  // スタイル
  // =========================

  // 画面全体（背景グラデ）
  const bgStyle = {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 20% 20%, #fffbe6 0%, #e0f7ff 40%, #e8f9f1 70%)",
    backgroundAttachment: "fixed",
    fontFamily: "system-ui, sans-serif",
    padding: "24px 16px 80px",
    boxSizing: "border-box",
    maxWidth: "100%",
    overflowX: "hidden",
    display: "flex",
    justifyContent: "flex-start",
  };

  // ← NEW: 中身をまとめる共通ラッパ
  // これで中のカード群が常に同じ幅(最大360pxとか)で揃うので
  // スマホでも「はみ出してるように見える」現象を防ぐ
  const innerWrapStyle = {
    width: "100%",
    maxWidth: "360px", // ここが「見せたい幅」
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    margin: "0 auto", // 画面中央に寄せる
  };

  // 白カード（ゲーム選択／プレイヤー）共通
  const baseCard = {
    backgroundColor: "rgba(255,255,255,0.8)",
    backdropFilter: "blur(4px)",
    border: "1px solid rgba(255,255,255,0.6)",
    borderRadius: "16px",
    boxShadow: "0 16px 40px rgba(0,0,0,0.08)",
    padding: "16px",
    boxSizing: "border-box",
    width: "100%", // innerWrapの幅にフィット
  };

  // タイトル(Positive Playroom)
  const titleTextStyle = {
    background:
      "linear-gradient(90deg,#0ea5e9 0%,#38bdf8 30%,#34d399 60%,#fde047 100%)",
    WebkitBackgroundClip: "text",
    color: "transparent",
    fontSize: "20px",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: "12px",
  };

  // サブテキスト
  const subTextStyle = {
    color: "#374151",
    fontSize: "14px",
    fontWeight: "500",
    lineHeight: 1.4,
    textAlign: "center",
    marginBottom: "20px",
  };

  // ボタンたち
  const mainBtnStyle = {
    background: "linear-gradient(90deg,#3b82f6 0%,#38bdf8 50%,#34d399 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "15px",
    padding: "12px 14px",
    width: "100%",
    cursor: "pointer",
    textAlign: "center",
    boxShadow: "0 10px 24px rgba(0,0,0,0.15)",
  };

  const altBtnStyle = {
    background: "linear-gradient(90deg,#facc15 0%,#fcd34d 30%,#86efac 100%)",
    color: "#1f2937",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "15px",
    padding: "12px 14px",
    width: "100%",
    cursor: "pointer",
    textAlign: "center",
    boxShadow: "0 10px 24px rgba(0,0,0,0.15)",
  };

  // プレイヤー見出し
  const playerHeaderStyle = {
    fontWeight: "700",
    fontSize: "15px",
    color: "#0ea5e9",
    textAlign: "center",
    marginBottom: "12px",
  };

  // セレクトボックス＋ボタンの並び
  const selectStyle = {
    width: "100%",
    fontSize: "14px",
    borderRadius: "6px",
    border: "1px solid #9ca3af",
    padding: "8px",
    boxSizing: "border-box",
    marginBottom: "12px",
    backgroundColor: "#fff",
  };

  const playButtonStyle = {
    width: "100%",
    background:
      "linear-gradient(90deg,#2563eb 0%,#3b82f6 40%,#1d4ed8 100%)",
    color: "#fff",
    fontWeight: "600",
    fontSize: "14px",
    border: "1px solid #1e40af",
    borderRadius: "6px",
    padding: "10px",
    marginBottom: "16px",
    cursor: "pointer",
    boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
  };

  // ラベル＋スライダー
  const sliderLabelStyle = {
    fontSize: "12px",
    fontWeight: "600",
    color: "#374151",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "4px",
  };

  const sliderInputStyle = {
    width: "100%",
    marginBottom: "12px",
  };

  const timeRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    color: "#4b5563",
    marginTop: "-8px",
    marginBottom: "16px",
  };

  // =========================
  // JSX
  // =========================
  return (
    <div style={bgStyle}>
      {/* 中身を中央にまとめるラッパ */}
      <div style={innerWrapStyle}>
        {/* --- ゲーム選択カード --- */}
        <div style={baseCard}>
          <div style={titleTextStyle}>Positive Playroom</div>

          <div style={subTextStyle}>
            ミニゲームや音楽を通して
            <br />
            心を少し軽くする、やさしい遊び場です。
            <br />
            スキマ時間の気分転換にどうぞ🍀
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <button
              style={mainBtnStyle}
              onClick={onSelectSmileFinder}
            >
              Smile Finder（表情を見分ける）
            </button>

            <button
              style={altBtnStyle}
              onClick={onSelectWordFinder}
            >
              Positive Word Finder（ことばを見分ける）
            </button>

            <button
              style={altBtnStyle}
              onClick={onSelectLinesFinder}
            >
              Positive Lines Finder（伝え方を見分ける）
            </button>
          </div>
        </div>

        {/* --- 音楽プレイヤーカード --- */}
        <div style={baseCard}>
          <div style={playerHeaderStyle}>音楽プレイヤー</div>

          {/* 曲を選ぶ */}
          <label
            style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "#374151",
              display: "block",
              marginBottom: "4px",
            }}
          >
            曲を選ぶ
          </label>
          <select
            style={selectStyle}
            value={trackIndex}
            onChange={handleSelectTrack}
          >
            {TRACKS.map((t, i) => (
              <option key={i} value={i}>
                {t.title}
              </option>
            ))}
          </select>

          {/* 再生・一時停止 */}
          <button style={playButtonStyle} onClick={togglePlay}>
            {isPlaying ? "一時停止" : "再生"}
          </button>

          {/* 音量スライダー */}
          <div style={sliderLabelStyle}>
            <span>音量: {volume}/10</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            value={volume}
            onChange={handleVolumeChange}
            style={sliderInputStyle}
          />

          {/* 再生位置スライダー */}
          <div style={sliderLabelStyle}>
            <span>再生位置</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeekChange}
            style={sliderInputStyle}
          />
          <div style={timeRowStyle}>
            <span>{toClock(currentTime)}</span>
            <span>{toClock(duration)}</span>
          </div>

          {/* 実際のaudio要素（画面に見せない） */}
          <audio
            ref={audioRef}
            src={currentTrack.src}
            preload="metadata"
          />
        </div>
      </div>
    </div>
  );
}
