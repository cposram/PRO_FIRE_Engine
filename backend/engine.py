import yfinance as yf
from pydantic import BaseModel
from typing import List

# ==========================================
# 1. 定義資料結構 (Data Models)
# ==========================================
class AssetInput(BaseModel):
    ticker: str
    shares: float
    target_weight: float
    currency: str

class RebalanceRequest(BaseModel):
    assets: List[AssetInput]
    tolerance: float
    withdrawal_rate: float

# ==========================================
# 2. 核心財務運算邏輯 (Business Logic)
# ==========================================
def get_current_fx_rate() -> float:
    """獲取 USD/TWD 即時匯率"""
    try:
        tkr = yf.Ticker("USDTWD=X")
        hist = tkr.history(period="1d")
        if not hist.empty:
            return float(hist['Close'].iloc[-1])
    except Exception as e:
        print(f"匯率抓取失敗: {e}")
    return 32.5  # 備用安全預設值

def calculate_portfolio(req: RebalanceRequest) -> dict:
    fx_rate_usd_twd = get_current_fx_rate()
    results = []
    total_value_twd = 0.0
    
    # 階段一：抓取報價與計算總市值
    for asset in req.assets:
        current_price, ytd_growth = 0.0, 0.0
        try:
            tkr = yf.Ticker(asset.ticker)
            hist = tkr.history(period="ytd")
            if not hist.empty:
                current_price = float(hist['Close'].iloc[-1])
                jan1_price = float(hist['Close'].iloc[0])
                ytd_growth = ((current_price - jan1_price) / jan1_price) * 100
        except Exception as e:
            print(f"報價抓取失敗 ({asset.ticker}): {e}")
            
        value_local = current_price * asset.shares
        value_twd = value_local * fx_rate_usd_twd if asset.currency == "USD" else value_local
        total_value_twd += value_twd
        
        # 預設殖利率假設：台股 3%，美股 1.5%
        dividend_yield = 0.03 if asset.currency == "TWD" else 0.015
        expected_dividend_twd = value_twd * dividend_yield

        results.append({
            "ticker": asset.ticker,
            "shares": asset.shares,
            "price": round(current_price, 2),
            "currency": asset.currency,
            "value_twd": value_twd,
            "ytd_growth": round(ytd_growth, 2),
            "target_weight": asset.target_weight,
            "expected_dividend_twd": expected_dividend_twd
        })

    # 階段二：計算再平衡差距與產出行動清單
    actions = []
    total_dividend = 0.0
    
    for r in results:
        current_weight = r["value_twd"] / total_value_twd if total_value_twd > 0 else 0
        r["current_weight"] = round(current_weight, 4)
        total_dividend += r["expected_dividend_twd"]
        
        weight_diff = current_weight - r["target_weight"]
        
        # 觸發容錯率示警
        if abs(weight_diff) > req.tolerance:
            r["alert"] = "🔴 需再平衡"
            target_value_twd = total_value_twd * r["target_weight"]
            diff_twd = r["value_twd"] - target_value_twd
            
            diff_local = diff_twd / fx_rate_usd_twd if r["currency"] == "USD" else diff_twd
            shares_to_action = diff_local / r["price"] if r["price"] > 0 else 0
            
            action_type = "賣出" if shares_to_action > 0 else "買入"
            actions.append(f"{action_type} {r['ticker']} 約 {abs(int(shares_to_action))} 股以符合目標 {(r['target_weight']*100):.1f}%")
        else:
            r["alert"] = "🟢 正常範圍"

    # 階段三：退休提領路徑 (配息優先抵扣)
    target_withdrawal_twd = total_value_twd * req.withdrawal_rate
    shortfall_twd = target_withdrawal_twd - total_dividend
    
    retirement_plan = {
        "target_withdrawal": round(target_withdrawal_twd),
        "covered_by_dividend": round(total_dividend),
        "shortfall_to_sell": round(shortfall_twd) if shortfall_twd > 0 else 0
    }

    return {
        "fx_rate": round(fx_rate_usd_twd, 2),
        "total_value_twd": round(total_value_twd),
        "assets": results,
        "actions": actions,
        "retirement_plan": retirement_plan
    }
