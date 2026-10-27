# AniCur — DIY Animated Cursor Editor（起步版 v0）

浏览器里画像素光标、多帧动画，最终导出 Windows `.ani` / 网页用 sprite。
纯静态页面：无框架、无构建，`index.html` + ES modules 即全部。

## 怎么跑

1. VS Code 打开本文件夹，装 **Live Server** 扩展；
2. 右键 `index.html` → *Open with Live Server*；
3. 浏览器自动打开——画点、切帧、Save、▶ Loop 预览都已可用。

（没有 Live Server 的话：`npx serve .` 或任何静态服务器都行。
注意不能直接双击 index.html——ES module 在 `file://` 下会被浏览器拦。）

## 结构（谁管什么）

| 文件 | 职责 |
|---|---|
| `js/state.js` | **唯一数据源**：帧数组、当前帧、颜色、工具。所有面板只读写它、订阅它的事件 |
| `js/canvas-panel.js` | 像素画布：渲染、Pointer Events 画/取色、PAINT/PICK/Transp/Solid |
| `js/frames.js` | 帧导航：◀ ▶ ＋ ⧉ ✕ |
| `js/colors-panel.js` | 色板 + hex 输入（色轮待做） |
| `js/preview-panel.js` | 循环播放预览（onion skin 叠影待做） |
| `js/main.js` | 启动、顶栏 Save/New |

**铁律：面板模块之间不互相 import。** 要通信就写 state、听事件。

## 已完成 / 待做

- [x] 32×32 画布、画点/擦除/取色、棋盘透明底
- [x] 多帧：增/复制/删/切换
- [x] 固定色板 + hex
- [x] 循环预览（ms/帧 可调）
- [x] localStorage Save/恢复
- [ ] `js/encoder/cur.js` — 单帧 .cur 字节打包（6+16+40 字节头 + BGRA 下→上 + AND 掩码）
- [ ] `js/encoder/ani.js` — RIFF `ACON` 打包多帧
- [ ] `js/export.js` — Blob 下载出口（.cur / .ani / sprite sheet）
- [ ] hotspot 选取 UI（点击画布设热点）
- [ ] 色轮、onion skin 叠影、Guide 面板内容
