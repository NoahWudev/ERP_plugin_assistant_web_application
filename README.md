# ERP 報價快速打單助手 (ERP Quotation Assistant)

為業務量身打造的輕量化、高效報價單管理系統。本專案能免去傳統 ERP 繁重、卡頓且難以登入的痛點，支援離線自動存檔、品項動態增減與即時金額計算，並可一鍵匯出符合企業規格的專業 Excel 表格與列印/儲存為 PDF。

---

## 🚀 核心功能 (Core Features)

1. **極速打單面板**：
   - 即時編輯報價單號、日期、有效天數、業務資訊。
   - 客戶資料快速代入與發票/營業地址設定。
   - 支援選擇 **應稅 (5%)**、**免稅** 與 **零稅率** 營業稅計算，自動扣除折扣並計算總計。

2. **常用預設管理 (Presets)**：
   - **常用客戶名單**：快速搜尋並代入採購客戶資訊。
   - **常用產品與服務**：可調整數量後一鍵加入報價單品項。
   - 支援直接在介面上新增或刪除自訂預設資料。

3. **動態品項清單編輯**：
   - 支援一鍵新增空白品項。
   - 可即時修改品名、規格、數量、單位與單價，系統自動重算小計。
   - 支援品項排序調整（上移/下移）與快速刪除。

4. **暫存草稿箱與歷史存檔**：
   - **本地自動存檔**：編輯中的進度會即時自動同步至瀏覽器 `localStorage`，防呆防斷電。
   - **草稿箱**：手動暫存多個不同版本的報價單。
   - **歷史單據管理**：內建 KPI 指標面板（統計總報價數、總金額、交涉中、已結案數），並支援舊單一鍵「載入調整」、更新單據狀態（草稿/已發送/客戶接受/作廢）與直接刪除。

5. **專業匯出與列印**：
   - **一鍵 Excel 匯出**：生成包含合併儲存格、自動寬度調整與完整欄位排版的 `.xlsx` 報價單。
   - **PDF/列印專用版面**：內建精心設計的紙張列印版面，點選「PDF / 列印」即可喚起系統列印視窗，附帶業務、核決主管與客戶簽章欄位。

---

## 🛠️ 技術棧 (Technology Stack)

- **核心框架**：React 19 + TypeScript + Vite 6
- **樣式設計**：Tailwind CSS v4 (採用 `@tailwindcss/vite` 進行編譯)
- **試算表處理**：SheetJS (`xlsx`)
- **圖示庫**：Lucide React
- **動畫**：Motion (Framer Motion v12)

---

## 📦 本地開發與運行 (Local Development)

### 1. 先決條件
- **Node.js**：`v20.0.0` 或更高版本（專案根目錄含 `.nvmrc`，建議使用 nvm）
- **npm**：Node.js 隨附之套件管理器

### 2. 安裝步驟
在專案根目錄下依序執行：

```bash
nvm use
npm install
```

### 3. 啟動開發伺服器
```bash
npm run dev
```
啟動後在瀏覽器中開啟 [http://localhost:3000](http://localhost:3000) 即可開始使用。

---

## 📂 專案目錄結構 (Folder Directory)

```text
erp-assistant/
├── .env.example         # 環境變數配置範本
├── .gitignore           # Git 忽略檔案設定
├── index.html           # 應用程式入口 HTML
├── vite.config.ts       # Vite 配置檔 (包含 Tailwind CSS v4 插件)
├── tsconfig.json        # TypeScript 配置檔
├── package.json         # 套件依賴與腳本定義
├── src/
│   ├── main.tsx         # React 入口點
│   ├── App.tsx          # 主頁面佈局與狀態管理核心
│   ├── index.css        # 全域樣式與 Tailwind CSS v4 配置
│   ├── types.ts         # 全域 TypeScript 介面定義
│   ├── components/      # UI 元件目錄
│   │   ├── CustomerPresetManager.tsx   # 常用客戶管理面板
│   │   ├── ProductPresetManager.tsx    # 常用產品管理面板
│   │   ├── DraftList.tsx               # 暫存草稿箱元件
│   │   ├── QuotationHistory.tsx        # 歷史單據列表與 KPI 指標
│   │   └── QuotationPrint.tsx          # 列印專用報價單版面
│   └── utils/           # 工具函式目錄
│       ├── excel.ts     # 報價金額重算與 Excel 匯出邏輯
│       └── presets.ts   # 系統初始化預設資料與單號產生器
```

---

## 🤝 協作開發與永續維護

本專案已建立 Cursor 專案規則（`.cursor/rules/`），欲與 AI 助手一同進行功能迭代或 Debug，請確保規則已啟用，以維持一致的代碼風格、Git 規範與作業標準。

| 規則檔 | 用途 |
| :--- | :--- |
| `project-context.mdc` | 專案背景、現況技術棧、未來 Python + MSSQL 後端方向 |
| `typescript-react.mdc` | `src/` 下 TypeScript / React 編寫規範 |
| `git-conventions.mdc` | Conventional Commits 提交格式 |
| `security-gitignore.mdc` | 敏感資訊與 `.gitignore` 保護規範 |

> 舊版 Antigravity 規範見 [`ANTIGRAVITY.md`](ANTIGRAVITY.md)（已 deprecated，僅供參考）。

