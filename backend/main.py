from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.engine import RebalanceRequest, calculate_portfolio

app = FastAPI(title="PRO FIRE Engine API")

# 開放 CORS 給前端呼叫
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/calculate")
def api_calculate_rebalance(req: RebalanceRequest):
    """接收前端組合資料，回傳再平衡與退休推估結果"""
    result = calculate_portfolio(req)
    return result
