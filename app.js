// 初始化畫面載入
document.addEventListener('DOMContentLoaded', () => {
    // 預設給予 0050 與 VOO 範例
    addAssetRow('0050.TW', '50000', '195', '50', 'TWD');
    addAssetRow('VOO', '600', '520', '50', 'USD');

    // 綁定按鈕事件
    document.getElementById('btn-add-asset').addEventListener('click', () => addAssetRow());
    document.getElementById('btn-run-engine').addEventListener('click', runEngine);
    
    // 綁定頁籤切換
    document.querySelectorAll('.tab-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target));
    });
});

// 新增資產列的函數 (升級排版與加入明確標籤)
function addAssetRow(ticker='', shares='', price='', weight='', currency='TWD') {
    const container = document.getElementById('asset-inputs');
    const row = document.createElement('div');
    
    // 升級外框樣式：增加內距、稍微提亮背景、加入陰影
    row.className = "bg-slate-800/80 p-4 rounded-xl border border-slate-600 relative asset-row shadow-md mb-4 transition-all hover:border-cyan-700";
    
    row.innerHTML = `
        <button class="absolute top-2 right-3 text-gray-500 hover:text-red-400 transition text-xl font-bold btn-remove" title="移除此標的">×</button>
        
        <div class="grid grid-cols-2 gap-3 mb-4 pr-6">
            <div>
                <label class="block text-xs text-gray-400 mb-1.5 tracking-wide">標的代號</label>
                <input type="text" placeholder="如 0050.TW" value="${ticker}" class="t_ticker w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition">
            </div>
            <div>
                <label class="block text-xs text-gray-400 mb-1.5 tracking-wide">計價幣別</label>
                <select class="t_currency w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition">
                    <option value="TWD" ${currency==='TWD'?'selected':''}>TWD (台幣)</option>
                    <option value="USD" ${currency==='USD'?'selected':''}>USD (美金)</option>
                </select>
            </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
            <div>
                <label class="block text-xs text-gray-400 mb-1.5 tracking-wide">持有股數</label>
                <input type="number" placeholder="數量" value="${shares}" class="t_shares w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition">
            </div>
            <div>
                <label class="block text-xs text-gray-400 mb-1.5 tracking-wide">目前單價</label>
                <input type="number" placeholder="價格" value="${price}" class="t_price w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition">
            </div>
            <div>
                <label class="block text-xs text-gray-400 mb-1.5 tracking-wide">目標佔比(%)</label>
                <input type="number" placeholder="%" value="${weight}" class="t_weight w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-cyan-300 font-semibold focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition">
            </div>
        </div>
    `;
    
    // 綁定刪除按鈕
    row.querySelector('.btn-remove').addEventListener('click', function() {
        row.remove();
    });

    container.appendChild(row);
}

// 執行核心運算
function runEngine() {
    const btn = document.getElementById('btn-run-engine');
    btn.innerHTML = "⏳ 運算中...";

    // 取得全局參數
    const fxRate = parseFloat(document.getElementById('param-fx').value) || 32.5;
    const tolerance = (parseFloat(document.getElementById('param-tolerance').value) || 5) / 100;
    const withdrawalRate = (parseFloat(document.getElementById('param-withdrawal').value) || 4) / 100;

    // 收集所有輸入的資產
    const rows = document.querySelectorAll('.asset-row');
    let assets = [];
    let totalValueTWD = 0;
    let expectedDividendTWD = 0;

    rows.forEach(row => {
        const ticker = row.querySelector('.t_ticker').value.trim();
        if(!ticker) return;

        const shares = parseFloat(row.querySelector('.t_shares').value) || 0;
        const price = parseFloat(row.querySelector('.t_price').value) || 0;
        const targetWeight = (parseFloat(row.querySelector('.t_weight').value) || 0) / 100;
        const currency = row.querySelector('.t_currency').value;

        // 計算該資產的台幣市值
        const valueLocal = shares * price;
        const valueTWD = currency === 'USD' ? valueLocal * fxRate : valueLocal;
        
        // 預估股息 (TWD抓3%, USD抓1.5%)
        const dividendYield = currency === 'TWD' ? 0.03 : 0.015;
        const divTWD = valueTWD * dividendYield;

        totalValueTWD += valueTWD;
        expectedDividendTWD += divTWD;

        assets.push({ ticker, shares, price, currency, valueTWD, targetWeight, divTWD });
    });

    // 產生再平衡行動清單與狀態警示
    let actions = [];
    assets.forEach(a => {
        a.currentWeight = totalValueTWD > 0 ? (a.valueTWD / totalValueTWD) : 0;
        const weightDiff = a.currentWeight - a.targetWeight;

        if (Math.abs(weightDiff) > tolerance) {
            a.alert = "🔴 需再平衡";
            const targetValueTWD = totalValueTWD * a.targetWeight;
            const diffTWD = a.valueTWD - targetValueTWD;
            const diffLocal = a.currency === 'USD' ? diffTWD / fxRate : diffTWD;
            const sharesToAction = a.price > 0 ? (diffLocal / a.price) : 0;
            
            const actionType = sharesToAction > 0 ? "賣出" : "買入";
            actions.push(`${actionType} ${a.ticker} 約 ${Math.abs(Math.round(sharesToAction)).toLocaleString()} 股以符合目標 ${(a.targetWeight*100).toFixed(1)}%`);
        } else {
            a.alert = "🟢 正常範圍";
        }
    });

    // 計算退休提領路徑
    const targetWithdrawalTWD = totalValueTWD * withdrawalRate;
    const shortfallTWD = targetWithdrawalTWD - expectedDividendTWD;

    const data = {
        totalValueTWD: Math.round(totalValueTWD),
        assets: assets,
        actions: actions,
        retirementPlan: {
            targetWithdrawal: Math.round(targetWithdrawalTWD),
            coveredByDividend: Math.round(expectedDividendTWD),
            shortfallToSell: shortfallTWD > 0 ? Math.round(shortfallTWD) : 0
        }
    };

    updateDashboard(data);
    btn.innerHTML = "⚡ 執行引擎計算";
}

// 更新畫面
function updateDashboard(data) {
    // 渲染 KPI
    document.getElementById('kpi-total').innerText = "$" + data.totalValueTWD.toLocaleString();
    document.getElementById('kpi-withdraw').innerText = "$" + data.retirementPlan.targetWithdrawal.toLocaleString();
    
    // 渲染表格
    const tbody = document.getElementById('table-assets');
    tbody.innerHTML = "";
    
    data.assets.forEach(a => {
        let alertColor = a.alert.includes('🔴') ? 'text-orange-400 font-bold' : 'text-gray-300';
        tbody.innerHTML += `
            <tr class="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                <td class="py-3 font-bold">${a.ticker}</td>
                <td class="py-3">${a.shares.toLocaleString()}</td>
                <td class="py-3">$${a.price.toLocaleString()} ${a.currency}</td>
                <td class="py-3">${(a.currentWeight * 100).toFixed(1)}%</td>
                <td class="py-3 text-cyan-400">${(a.targetWeight * 100).toFixed(1)}%</td>
                <td class="py-3 ${alertColor}">${a.alert}</td>
            </tr>
        `;
    });

    // 渲染行動清單
    const actionList = document.getElementById('action-list');
    actionList.innerHTML = data.actions.length === 0 
        ? "<li>✅ 所有資產均在容錯率範圍內，無需動作。</li>" 
        : data.actions.map(act => `<li>${act}</li>`).join("");

    // 渲染退休現金流
    document.getElementById('ret-dividend').innerText = "$" + data.retirementPlan.coveredByDividend.toLocaleString();
    document.getElementById('ret-shortfall').innerText = "$" + data.retirementPlan.shortfallToSell.toLocaleString();
}

// 處理頁籤切換
function switchTab(clickedBtn) {
    const targetId = clickedBtn.getAttribute('data-target');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    document.querySelectorAll('.tab-trigger').forEach(btn => {
        btn.className = "px-6 py-3 font-semibold text-gray-400 hover:text-white transition tab-trigger";
    });

    document.getElementById(targetId).classList.remove('hidden');
    clickedBtn.className = "px-6 py-3 font-semibold text-cyan-400 border-b-2 border-cyan-400 tab-trigger";
}
