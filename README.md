# 🚀 PRO FIRE 動態退休與再平衡推估引擎

這是一個專為台灣美股投資人設計的動態資產再平衡與退休提領試算工具。結合 `yfinance` 即時報價，能自動化試算投資組合的容錯率，並產出再平衡行動清單與 4% 法則的提領路徑。

## 🛠️ 技術架構
* **前端 (Frontend):** 純 HTML5, JavaScript (ES6), Tailwind CSS (CDN)
* **後端 (Backend):** Python 3, FastAPI, yfinance, Pydantic

## 🚀 如何在本地端啟動

1. **安裝後端依賴套件**
   ```bash
   pip install -r requirements.txt

啟動 FastAPI 後端伺服器
請在專案根目錄下執行：

Bash
uvicorn backend.main:app --reload
伺服器將運行於 http://127.0.0.1:8000

開啟前端頁面
直接用瀏覽器打開 frontend/index.html 即可開始使用。

