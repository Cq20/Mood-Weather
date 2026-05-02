import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// 1. 提前判断环境
const isProduction = process.env.NODE_ENV === "production";
const isReplit = process.env.REPL_ID !== undefined;

// 2. 定义插件数组（在返回对象之前处理好异步加载）
// 这样 vite 接收到的就是一个完全确定的标准对象
let customPlugins = [];

// --- 仅在开发环境尝试加载本地调试插件 ---
if (!isProduction) {
  // 安全加载 mockupPreviewPlugin
  try {
    // 使用动态 import 替代 require，确保兼容性
    const mPlugin = await import("./mockupPreviewPlugin");
    if (mPlugin && mPlugin.mockupPreviewPlugin) {
      customPlugins.push(mPlugin.mockupPreviewPlugin());
    }
  } catch (e) {
    console.log("Dev plugin 'mockupPreviewPlugin' not found, skipping.");
  }

  // 仅在 Replit 环境下加载运行时错误弹窗
  if (isReplit) {
    try {
      const errorModal = await import("@replit/vite-plugin-runtime-error-modal");
      if (errorModal.default) {
        customPlugins.push(errorModal.default());
      }
    } catch (e) {
      console.log("Dev plugin 'runtimeErrorOverlay' not found, skipping.");
    }
  }
}

// --- 处理 Replit Cartographer 插件 ---
if (isReplit && !isProduction) {
  try {
    const cartographer = await import("@replit/vite-plugin-cartographer");
    if (cartographer.cartographer) {
      customPlugins.push(
        cartographer.cartographer({
          root: path.resolve(import.meta.dirname, ".."),
        })
      );
    }
  } catch (e) {
    // 忽略错误
  }
}

// 3. 导出配置
export default defineConfig({
  // 🔑 Vercel 核心配置：根路径
  base: "/",

  // 合并所有插件
  plugins: [...customPlugins, react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },

  root: path.resolve(import.meta.dirname),

  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    target: "esnext",
    sourcemap: false,
  },

  server: {
    port: Number(process.env.PORT) || 5173,
    host: true,
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },

  preview: {
    port: Number(process.env.PORT) || 4173,
    host: true,
    allowedHosts: true,
  },
});
