import { useState } from "react";
import HomeScreen from "./HomeScreen.jsx";
import GameSmileFinder from "./GameSmileFinder.jsx";
import GameWordFinder from "./GameWordFinder.jsx";
import GameLinesFinder from "./GameLinesFinder.jsx";

export default function App() {
  // 画面切り替え用
  // "home" | "smile" | "word" | "lines"
  const [screen, setScreen] = useState("home");

  // ここに「今後追加予定のアプリ」一覧とかを集約しておけばOK
  const comingSoonApps = [
    // { title: "集中タイマー", desc: "25分集中＋5分休憩", status: "設計中" },
  ];

  if (screen === "smile") {
    return (
      <GameSmileFinder
        onBackToHome={() => {
          setScreen("home");
        }}
      />
    );
  }

  if (screen === "word") {
    return (
      <GameWordFinder
        onBackToHome={() => {
          setScreen("home");
        }}
      />
    );
  }

  if (screen === "lines") {
    return (
      <GameLinesFinder
        onBackToHome={() => {
          setScreen("home");
        }}
      />
    );
  }

  // ここまで来たら "home"
  return (
    <HomeScreen
      onSelectSmileFinder={() => {
        setScreen("smile");
      }}
      onSelectWordFinder={() => {
        setScreen("word");
      }}
      onSelectLinesFinder={() => {
        setScreen("lines");
      }}
      comingSoonApps={comingSoonApps}
    />
  );
}
