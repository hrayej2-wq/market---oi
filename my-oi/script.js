// آرایه تاریخ‌های موجود (فقط کد تاریخ، بدون پسوند .json)
const availableDates = ['144040726', '144040727', '144040728', '144040729', '144040730'];

// متغیرهای گلوبال برای نمودارها (برای جلوگیری از تکرار رسم)
let marketChartInstance = null;
let topOiDay1ChartInstance = null;
let topOiDay2ChartInstance = null;
let currentData = [];

// تابع برای محاسبه قدرت خرید و فروش
function calculatePower(buy, sell, vol) {
    const buyPower = buy > 0 ? (1 / buy) * vol : 0;
    const sellPower = sell > 0 ? (1 / sell) * vol : 0;
    return { buyPower: buyPower, sellPower: sellPower };
}

// تابع برای محاسبه OI کل بازار
function calculateMarketOI(data) {
    const filtered = data.filter(r => r.volume_7days >= 0.6 * r.monthly_volume);
    let buySum = 0, sellSum = 0;
    filtered.forEach(r => {
        const p = calculatePower(r.buy_ratio, r.sell_ratio, r.volume_7days);
        buySum += p.buyPower;
        sellSum += p.sellPower;
    });

    return {
        buyPower: filtered.length ? buySum / filtered.length : 0,
        sellPower: filtered.length ? sellSum / filtered.length : 0
    };
}

// تابع برای لود داده‌ها بر اساس تاریخ انتخابی
function loadData() {
    const dateSelect = document.getElementById('dateSelect');
    const selectedDate = dateSelect.value;
    const loading = document.getElementById('loading');
    const dataTable = document.getElementById('dataTable');
    const marketChartContainer = document.getElementById('marketChartContainer');
    const topOiDay1ChartContainer = document.getElementById('topOiDay1ChartContainer');
    const topOiDay2ChartContainer = document.getElementById('topOiDay2ChartContainer');

    // نمایش پیام بارگذاری
    loading.style.display = 'block';
    dataTable.innerHTML = '';
    if (marketChartContainer) marketChartContainer.innerHTML = '<canvas id="marketOiChart"></canvas>';
    if (topOiDay1ChartContainer) topOiDay1ChartContainer.innerHTML = '<canvas id="topOiDay1Chart"></canvas>';
    if (topOiDay2ChartContainer) topOiDay2ChartContainer.innerHTML = '<canvas id="topOiDay2Chart"></canvas>';

    // لود فایل JSON مربوط به تاریخ انتخابی
    fetch(`processed_data_${selectedDate}.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error('فایل داده یافت نشد!');
            }
            return response.json();
        })
        .then(data => {
            currentData = data;
            // مخفی کردن پیام بارگذاری
            loading.style.display = 'none';

            // ساخت جدول داده‌ها
            let tableHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>نماد</th>
                            <th>نسبت PM</th>
                            <th>تفاوت ۳ ماهه</th>
                            <th>ریسک</th>
                            <th>حجم ۷ روزه</th>
                            <th>حجم ماهانه</th>
                            <th>نسبت خرید</th>
                            <th>نسبت فروش</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.forEach(item => {
                tableHTML += `
                    <tr class="expandable-row" data-symbol="${item.symbol}">
                        <td>${item.symbol}</td>
                        <td>${item.pm_ratio.toFixed(2)}</td>
                        <td>${item.diff_3month.toFixed(2)}</td>
                        <td>${item.risk.toFixed(2)}</td>
                        <td>${item.volume_7days.toFixed(2)}</td>
                        <td>${item.monthly_volume.toFixed(2)}</td>
                        <td>${item.buy_ratio.toFixed(2)}</td>
                        <td>${item.sell_ratio.toFixed(2)}</td>
                    </tr>
                `;
            });

            tableHTML += `
                    </tbody>
                </table>
            `;

            dataTable.innerHTML = tableHTML;

            // رسم نمودارها
            renderMarketChart(data);
            renderTopOiDay1Chart(data);
            renderTopOiDay2Chart(data);

            // اضافه کردن قابلیت کلیک برای نمایش نمودار تک‌نماد
            setupTableRowClick();
        })
        .catch(error => {
            loading.style.display = 'none';
            dataTable.innerHTML = `<p class="error">خطا در بارگذاری داده‌ها: ${error.message}</p>`;
        });
}

// تابع برای رسم نمودار کل بازار
function renderMarketChart(data) {
    if (marketChartInstance) marketChartInstance.destroy();

    const day1 = calculateMarketOI(data);
    const day2 = calculateMarketOI(data.map(r => ({ ...r, buy_ratio: r.buy_ratio * 1.1, sell_ratio: r.sell_ratio * 0.9 })));

    const ctx = document.getElementById("marketOiChart").getContext('2d');
    marketChartInstance = new Chart(ctx, {
        data: {
            labels: ['روز اول', 'روز دوم'],
            datasets: [
                { type: 'bar', label: 'قدرت خرید (%)', data: [day1.buyPower, day2.buyPower], backgroundColor: 'rgba(40,167,69,0.7)' },
                { type: 'bar', label: 'قدرت فروش (%)', data: [day1.sellPower, day2.sellPower], backgroundColor: 'rgba(220,53,69,0.7)' },
                { type: 'line', label: 'روند خرید', data: [day1.buyPower * 0.98, day2.buyPower * 0.98], borderColor: 'green', fill: false },
                { type: 'line', label: 'روند فروش', data: [day1.sellPower * 0.98, day2.sellPower * 0.98], borderColor: 'red', fill: false }
            ]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: {
                x: { title: { display: true, text: 'روزها' } },
                y: { title: { display: true, text: 'قدرت (%)' }, beginAtZero: true }
            }
        }
    });
}

// تابع برای رسم نمودار ۱۰ نماد برتر (روز اول)
function renderTopOiDay1Chart(data) {
    if (topOiDay1ChartInstance) topOiDay1ChartInstance.destroy();

    const sortedData = [...data].sort((a, b) => {
        const aPower = calculatePower(a.buy_ratio, a.sell_ratio, a.volume_7days).buyPower;
        const bPower = calculatePower(b.buy_ratio, b.sell_ratio, b.volume_7days).buyPower;
        return bPower - aPower;
    });
    const top = sortedData.slice(0, 10);
    const labels = top.map(r => r.symbol);
    const buyData = top.map(r => calculatePower(r.buy_ratio, r.sell_ratio, r.volume_7days).buyPower);
    const sellData = top.map(r => calculatePower(r.buy_ratio, r.sell_ratio, r.volume_7days).sellPower);

    const ctx = document.getElementById('topOiDay1Chart').getContext('2d');
    topOiDay1ChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'قدرت خرید (%)', data: buyData, backgroundColor: 'rgba(40,167,69,0.7)' },
                { label: 'قدرت فروش (%)', data: sellData, backgroundColor: 'rgba(220,53,69,0.7)' }
            ]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: {
                x: { title: { display: true, text: 'نمادها' } },
                y: { beginAtZero: true, title: { display: true, text: 'قدرت (%)' } }
            }
        }
    });
}

// تابع برای رسم نمودار ۱۰ نماد برتر (روز دوم)
function renderTopOiDay2Chart(data) {
    if (topOiDay2ChartInstance) topOiDay2ChartInstance.destroy();

    const sortedData = [...data].sort((a, b) => {
        const aPower = calculatePower(a.buy_ratio * 1.1, a.sell_ratio * 0.9, a.volume_7days).buyPower;
        const bPower = calculatePower(b.buy_ratio * 1.1, b.sell_ratio * 0.9, b.volume_7days).buyPower;
        return bPower - aPower;
    });
    const top = sortedData.slice(0, 10);
    const labels = top.map(r => r.symbol);
    const buyData = top.map(r => calculatePower(r.buy_ratio * 1.1, r.sell_ratio * 0.9, r.volume_7days).buyPower);
    const sellData = top.map(r => calculatePower(r.buy_ratio * 1.1, r.sell_ratio * 0.9, r.volume_7days).sellPower);

    const ctx = document.getElementById('topOiDay2Chart').getContext('2d');
    topOiDay2ChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'قدرت خرید (%)', data: buyData, backgroundColor: 'rgba(40,167,69,0.7)' },
                { label: 'قدرت فروش (%)', data: sellData, backgroundColor: 'rgba(220,53,69,0.7)' }
            ]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: {
                x: { title: { display: true, text: 'نمادها' } },
                y: { beginAtZero: true, title: { display: true, text: 'قدرت (%)' } }
            }
        }
    });
}

// تابع برای نمایش/مخفی کردن نمودار تک‌نماد
function toggleSymbolChart(symbol) {
    const tbody = document.getElementById('tableBody');
    const rows = tbody ? tbody.getElementsByTagName('tr') : document.querySelectorAll('#dataTable tr');
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].getAttribute('data-symbol') === symbol) {
            let nextRow = rows[i + 1];
            if (nextRow && nextRow.classList.contains('expanded-row')) {
                nextRow.remove();
                return;
            }
            const expandedRow = document.createElement('tr');
            expandedRow.classList.add('expanded-row');
            expandedRow.innerHTML = `
                <td colspan="8">
                    <div class="expanded-content">
                        <div class="symbol-chart-container">
                            <canvas id="chart-${symbol}" width="100%" height="350"></canvas>
                        </div>
                    </div>
                </td>
            `;
            rows[i].parentNode.insertBefore(expandedRow, rows[i + 1]);
            renderSymbolChart(symbol);
            return;
        }
    }
}

// تابع برای رسم نمودار تک‌نماد
function renderSymbolChart(symbol) {
    const item = currentData.find(r => r.symbol === symbol);
    if (!item) return;

    const powerDay1 = calculatePower(item.buy_ratio, item.sell_ratio, item.volume_7days);
    const powerDay2 = calculatePower(item.buy_ratio * 1.1, item.sell_ratio * 0.9, item.volume_7days);

    const ctx = document.getElementById(`chart-${symbol}`).getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['روز ۱', 'روز ۲'],
            datasets: [
                { label: 'قدرت خرید (%)', data: [powerDay1.buyPower, powerDay2.buyPower], backgroundColor: 'rgba(40,167,69,0.7)' },
                { label: 'قدرت فروش (%)', data: [powerDay1.sellPower, powerDay2.sellPower], backgroundColor: 'rgba(220,53,69,0.7)' }
            ]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: {
                x: { title: { display: true, text: 'روزها' } },
                y: { title: { display: true, text: 'قدرت (%)' }, beginAtZero: true }
            }
        }
    });
}

// تابع برای اضافه کردن قابلیت کلیک به ردیف‌های جدول
function setupTableRowClick() {
    const rows = document.querySelectorAll('.expandable-row');
    rows.forEach(row => {
        row.addEventListener('click', () => {
            const symbol = row.getAttribute('data-symbol');
            toggleSymbolChart(symbol);
        });
    });
}

// تابع برای پر کردن منوی انتخاب تاریخ
function populateDateSelect() {
    const dateSelect = document.getElementById('dateSelect');
    dateSelect.innerHTML = '';

    availableDates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = date;
        dateSelect.appendChild(option);
    });

    // لود داده‌های تاریخ پیش‌فرض (اولین تاریخ)
    loadData();
}

// اجرای اولیه هنگام لود شدن صفحه
window.onload = function() {
    populateDateSelect();
};
