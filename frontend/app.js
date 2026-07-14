const API_URL = 'http://127.0.0.1:8000/api/calculate';

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 預設填入討論好的 50/50 投資組合配置
    addAssetRow('0050.TW', '50000', '50', 'TWD');
    addAssetRow('VOO', '600', '50', 'USD');

    // 綁定按鈕事件
    document.getElementById('btn-add-asset').addEventListener('click', () => addAssetRow());
    document.getElementById('btn-run-engine').addEventListener('click', runEngine);
    
    // 綁定頁籤切換
    document.querySelectorAll('.tab-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target));
    });
});

function addAssetRow(ticker='', shares='', weight='', currency='TWD') {
    const container = document.getElementById('asset-inputs');
    const row = document.createElement('div');
    row.className = "grid grid-cols-2 gap-2 bg-slate-900 p-3 rounded border border-slate-700 asset-row";
    row.innerHTML = `
        <input type="text" placeholder="代號 (如 0050.TW)" value="${ticker}" class="t_ticker w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white px-2">
        <select class="t_currency w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white px-2">
            <option value="TWD" ${currency==='TWD'?'selected':''}>TWD</option>
            <option value="USD" ${currency==='USD'?'selected':''}>USD</option>
        </select>
        <input type="number" placeholder="股數" value="${shares}" class="t_shares w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white px-2">
        <input type="number" placeholder="目標佔比(%)" value="${weight}" class="t_weight w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white px-2">
    `;
    container.appendChild(row);
}

async function runEngine() {
    const btn = document.getElementById('btn-run-engine');
    const statusText = document.getElementById('kpi-status');
    
    btn.innerHTML = "⏳ 運算中(抓取報價)...";
    statusText.innerHTML = "⏳ API 處理中...";
    
    const rows = document.querySelectorAll('.asset-row');
    let assets = [];
    
    rows.forEach(row => {
        const ticker = row.querySelector('.t_ticker').value.trim();
        if(!ticker) return;
        assets.push({
            ticker: ticker,
            shares: parseFloat(row.querySelector('.t_shares').value) || 0,
            target_weight: (parseFloat(row.querySelector('.t_weight').value) || 0) / 100,
            currency: row.querySelector('.t_currency').value
        });
    });

    const payload = {
        assets: assets,
        tolerance: parseFloat(document.getElementById('param-tolerance').value) / 100,
        withdrawal_rate: parseFloat(document.getElementById('param-withdrawal').value) / 100
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        updateDashboard(data);
        
        btn.innerHTML = "⚡ 執行引擎計算";
        statusText.innerHTML = "🟢 運算完成";
    } catch (error) {
        console.error('API 錯誤:', error);
        btn.innerHTML = "⚡ 執行引擎計算";
        statusText.innerHTML = "🔴 連線失敗，請確認 FastAPI 運行中";
    }
}

function updateDashboard(data) {
    document.getElementById('fx-display').innerText = data.fx_rate;
    document.getElementById('kpi-total').innerText = "$" + data.total_value_twd.toLocaleString();
    document.getElementById('kpi-withdraw').innerText = "$" + data.retirement_plan.target_withdrawal.toLocaleString();
    
    const tbody = document.getElementById('table-assets');
    tbody.innerHTML = "";
    
    data.assets.forEach(a => {
        let ytdColor = a.ytd_growth >= 0 ? 'text-green-400' : 'text-red-400';
        let alertColor = a.alert.includes('🔴') ? 'text-orange-400 font-bold' : 'text-gray-300';
        
        tbody.innerHTML += `
            <tr class="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                <td class="py-3 font-bold">${a.ticker}</td>
                <td class="py-3">${a.shares.toLocaleString()}</td>
                <td class="py-3">$${a.price} ${a.currency}</td>
                <td class="py-3">${(a.current_weight * 100).toFixed(1)}%</td>
                <td class="py-3 text-cyan-400">${(a.target_weight * 100).toFixed(1)}%</td>
                <td class="py-3 ${ytdColor}">${a.ytd_growth > 0 ? '+':''}${a.ytd_growth}%</td>
                <td class="py-3 ${alertColor}">${a.alert}</td>
            </tr>
        `;
    });

    const actionList = document.getElementById('action-list');
    actionList.innerHTML = data.actions.length === 0 
        ? "<li>✅ 所有資產均在容錯率範圍內，無需動作。</li>" 
        : data.actions.map(act => `<li>${act}</li>`).join("");

    document.getElementById('ret-dividend').innerText = "$" + data.retirement_plan.covered_by_dividend.toLocaleString();
    document.getElementById('ret-shortfall').innerText = "$" + data.retirement_plan.shortfall_to_sell.toLocaleString();
}

function switchTab(clickedBtn) {
    const targetId = clickedBtn.getAttribute('data-target');
    
    // 隱藏所有內容與重設按鈕樣式
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    document.querySelectorAll('.tab-trigger').forEach(btn => {
        btn.className = "px-6 py-3 font-semibold text-gray-400 hover:text-white transition tab-trigger";
    });

    // 顯示目標內容與設定按鈕活躍樣式
    document.getElementById(targetId).classList.remove('hidden');
    clickedBtn.className = "px-6 py-3 font-semibold text-cyan-400 border-b-2 border-cyan-400 tab-trigger";
}
