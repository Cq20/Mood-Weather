import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { seedDemoData } from "./lib/demo-data";

// 演示模式：URL 带 ?demo=1 时，在 React 挂载前注入一组示例记录，
// 让浏览者（无需登录、无需后端）直接看到完整的洞察能力。
// 每次带 demo=1 都会重新注入，保证演示时数据是新鲜的。
if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "1") {
    seedDemoData();
  }
}

createRoot(document.getElementById("root")!).render(<App />);
