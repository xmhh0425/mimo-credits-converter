(function () {
  'use strict';

  var CREDITS_PER_YUAN = 100_000_000;

  // --- Styles ---
  var styleEl = document.createElement('style');
  styleEl.textContent = [
    '.mimo-yuan-converted{color:#ff6900 !important;text-decoration:underline;text-decoration-style:dashed;text-decoration-color:#ff6900 !important;cursor:pointer}',
    '.mimo-yuan-converted::after{content:" [点击切换]";font-size:10px;color:#8f959e;font-weight:normal}',
    '.mimo-usage-wrap{min-width:0;display:flex;flex-direction:column;gap:6px;border-radius:8px;background:#f6f6f8;padding:12px 16px;margin-top:10px}',
    '.mimo-usage-title{font-size:13px;font-weight:500;line-height:18px;color:#1f2329;margin:0}',
    '.mimo-usage-subtitle{font-size:12px;color:#8f959e;margin:4px 0 2px}',
    '.mimo-stats-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:0}',
    '.mimo-stats-table th,.mimo-stats-table td{padding:5px 10px;text-align:right;border-bottom:1px solid #e8e8e8}',
    '.mimo-stats-table th:first-child,.mimo-stats-table td:first-child{text-align:left}',
    '.mimo-stats-table thead th{font-weight:600;color:#646a73;font-size:12px}',
    '.mimo-stats-total td{border-top:2px solid #1f2329;border-bottom:none;padding-top:6px}',
    '.mimo-stats-hint{font-size:10px;color:#b0b5bd;margin-top:6px;text-align:right;font-style:italic}',
    '.mimo-stats-empty{font-size:12px;color:#8f959e;padding:8px 0 4px}',
    '.mimo-models-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px}',
    '.mimo-model-col{display:flex;flex-direction:column;min-width:0}'
  ].join('\n');
  document.head.appendChild(styleEl);

  // --- Model pricing: RMB per million tokens ---
  var MODEL_RATES = {
    'mimo-v2.5':     { cacheHit: 0.02,  cacheMiss: 1.00, output: 2.00 },
    'mimo-v2.5-pro': { cacheHit: 0.025, cacheMiss: 3.00, output: 6.00 },
  };
  var DEFAULT_RATE = MODEL_RATES['mimo-v2.5'];

  // --- Utilities ---
  function parseCredits(str) {
    var n = parseInt(str.replace(/,/g, ''), 10);
    return isNaN(n) ? null : n;
  }

  function creditsToYuanStr(creditsStr) {
    var credits = parseCredits(creditsStr);
    if (credits === null) return null;
    return (credits / CREDITS_PER_YUAN).toFixed(2);
  }

  function fmtNum(n) {
    return (n / 1_000_000).toFixed(2) + 'M';
  }

  function fmtRMB(yuan) {
    return '¥' + yuan.toFixed(2);
  }

  function fmtDate(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function getPlatformPh() {
    var m = document.cookie.match(/api-platform_ph="?([^";]+)"?/);
    return m ? m[1] : '';
  }

  function buildModelTable(modelName, cacheHitToken, cacheMissToken, outputToken) {
    var totalToken = cacheHitToken + cacheMissToken + outputToken;
    var rates = MODEL_RATES[modelName] || DEFAULT_RATE;

    var table = document.createElement('table');
    table.className = 'mimo-stats-table';

    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>类型</th><th>Token 数</th><th>估算金额</th></tr>';
    table.appendChild(thead);

    var tbody = document.createElement('tbody');

    var rows = [
      ['输入（命中缓存）', cacheHitToken,   rates.cacheHit],
      ['输入（未命中缓存）', cacheMissToken, rates.cacheMiss],
      ['输出',             outputToken,     rates.output],
    ];

    var totalRMB = 0;

    rows.forEach(function (r) {
      var label = r[0], tokens = r[1], rmbRate = r[2];
      var rmb = tokens / 1_000_000 * rmbRate;
      totalRMB += rmb;

      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + label + '</td>' +
        '<td>' + fmtNum(tokens) + '</td>' +
        '<td>' + fmtRMB(rmb) + '</td>';
      tbody.appendChild(tr);
    });

    var trTotal = document.createElement('tr');
    trTotal.className = 'mimo-stats-total';
    trTotal.innerHTML =
      '<td><strong>合计</strong></td>' +
      '<td><strong>' + fmtNum(totalToken) + '</strong></td>' +
      '<td><strong>' + fmtRMB(totalRMB) + '</strong></td>';
    tbody.appendChild(trTotal);

    table.appendChild(tbody);
    return table;
  }

  function buildEmptyMsg() {
    var p = document.createElement('div');
    p.className = 'mimo-stats-empty';
    p.textContent = '暂无消耗数据';
    return p;
  }

  function buildStatsSection(grouped) {
    var frag = document.createDocumentFragment();
    var modelNames = Object.keys(grouped);

    if (modelNames.length === 0) {
      frag.appendChild(buildEmptyMsg());
      return frag;
    }

    // 2-column grid for model tables
    var grid = document.createElement('div');
    grid.className = 'mimo-models-grid';
    if (modelNames.length === 1) grid.style.gridTemplateColumns = '1fr';

    modelNames.forEach(function (model) {
      var d = grouped[model];
      var col = document.createElement('div');
      col.className = 'mimo-model-col';

      var subtitle = document.createElement('p');
      subtitle.className = 'mimo-usage-subtitle';
      subtitle.textContent = model + '（请求 ' + d.requestCount + ' 次）';
      col.appendChild(subtitle);
      col.appendChild(buildModelTable(model, d.cacheHitToken, d.cacheMissToken, d.outputToken));
      grid.appendChild(col);
    });

    frag.appendChild(grid);

    // Grand total - compact single line
    if (modelNames.length > 1) {
      var totalTokens = 0, totalRMB = 0, totalRequests = 0;
      modelNames.forEach(function (m) {
        var d = grouped[m], rates = MODEL_RATES[m] || DEFAULT_RATE;
        totalTokens += d.cacheHitToken + d.cacheMissToken + d.outputToken;
        totalRMB += d.cacheHitToken / 1e6 * rates.cacheHit
                  + d.cacheMissToken / 1e6 * rates.cacheMiss
                  + d.outputToken / 1e6 * rates.output;
        totalRequests += d.requestCount;
      });

      var summary = document.createElement('div');
      summary.style.cssText = 'margin:8px 0 0;border-top:1px solid #d0d3d6;padding-top:8px;display:flex;align-items:baseline;gap:8px';
      summary.innerHTML =
        '<span class="mimo-usage-subtitle" style="margin:0">全部合计</span>' +
        '<span style="font-size:12px;color:#646a73">' + fmtNum(totalTokens) + ' tokens / ' + totalRequests + ' 次请求</span>' +
        '<span style="margin-left:auto;font-size:15px;font-weight:600;color:#ff6900">' + fmtRMB(totalRMB) + '</span>';
      frag.appendChild(summary);
    }

    return frag;
  }

  // --- Credits -> RMB replacement ---
  function processUsageFigures() {
    var figures = document.querySelectorAll('[class*="Part1_usageFigure__"]');
    figures.forEach(function (fig) {
      if (fig.dataset.mimoDone) return;
      var title = fig.getAttribute('title');
      if (!title) return;
      var m = title.match(/([\d,]+)\s*\/\s*([\d,]+)/);
      if (!m) return;
      var usedYuan = creditsToYuanStr(m[1]);
      var totalYuan = creditsToYuanStr(m[2]);
      if (usedYuan === null || totalYuan === null) return;
      fig.dataset.mimoOriginal = title;
      fig.textContent = usedYuan + ' / ' + totalYuan + ' 元';
      fig.dataset.mimoConverted = fig.textContent;
      fig.classList.add('mimo-yuan-converted');
      fig.dataset.mimoDone = '1';
    });
  }

  function processPlanBenefits() {
    var allP = document.querySelectorAll('p');
    allP.forEach(function (keyEl) {
      if (keyEl.dataset.mimoBenefitDone) return;
      if (keyEl.textContent.trim() !== '额度') return;
      var valEl = keyEl.nextElementSibling;
      if (!valEl || valEl.tagName !== 'P') return;
      var m = valEl.textContent.match(/([\d,]+)\s*Credits/);
      if (!m) return;
      var yuan = creditsToYuanStr(m[1]);
      if (!yuan) return;
      valEl.dataset.mimoOriginal = valEl.textContent.trim();
      valEl.textContent = yuan + ' 元';
      valEl.dataset.mimoConverted = valEl.textContent;
      valEl.classList.add('mimo-yuan-converted');
      keyEl.dataset.mimoBenefitDone = '1';
    });
  }

  // --- API calls ---
  async function fetchUsageData(year, month) {
    var ph = getPlatformPh();
    var url = '/api/v1/usage/token-plan/list';
    if (ph) url += '?api-platform_ph=' + encodeURIComponent(ph);
    var resp = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: year, month: month })
    });
    var json = await resp.json();
    if (json.code !== 0 || !json.data) return [];
    return json.data;
  }

  function groupByModel(dataList, fromDate, toDate) {
    var groups = {};
    dataList.forEach(function (item) {
      if (item.date < fromDate || item.date > toDate) return;
      var model = item.model || 'unknown';
      if (!groups[model]) {
        groups[model] = { cacheHitToken: 0, cacheMissToken: 0, outputToken: 0, requestCount: 0 };
      }
      groups[model].cacheHitToken  += item.inputHitToken  || 0;
      groups[model].cacheMissToken += item.inputMissToken  || 0;
      groups[model].outputToken    += item.outputToken     || 0;
      groups[model].requestCount   += item.requestCount    || 0;
    });
    return groups;
  }

  // --- Find anchor ---
  function findPlanRow() {
    var allP = document.querySelectorAll('p');
    for (var i = 0; i < allP.length; i++) {
      if (allP[i].textContent.trim() === '当前套餐用量') {
        var wrap = allP[i].parentElement;
        return wrap ? wrap.parentElement : null;
      }
    }
    return null;
  }

  // --- Render today usage (always shows) ---
  var todayRendered = false;

  async function renderTodayUsage(planRow) {
    if (todayRendered || !planRow) return;
    todayRendered = true;
    if (document.querySelector('.mimo-today-wrap')) return;

    try {
      var now = new Date();
      var data = await fetchUsageData(now.getFullYear(), now.getMonth() + 1);
      var todayStr = fmtDate(now);
      var grouped = groupByModel(data, todayStr, todayStr);

      var wrap = document.createElement('div');
      wrap.className = 'mimo-usage-wrap mimo-today-wrap';

      var title = document.createElement('p');
      title.className = 'mimo-usage-title';
      title.textContent = '今日消耗（' + todayStr + '）';
      wrap.appendChild(title);
      wrap.appendChild(buildStatsSection(grouped));

      planRow.insertAdjacentElement('afterend', wrap);
    } catch (e) {
      console.error('MiMo today usage:', e);
      todayRendered = false;
    }
  }

  // --- Render monthly usage ---
  var monthlyRendered = false;

  async function renderMonthlyUsage(planRow) {
    if (monthlyRendered || !planRow) return;
    monthlyRendered = true;
    if (document.querySelector('.mimo-monthly-wrap')) return;

    try {
      var detailResp = await fetch('/api/v1/tokenPlan/detail', { credentials: 'include' });
      var detailJson = await detailResp.json();
      if (detailJson.code !== 0 || !detailJson.data) { monthlyRendered = false; return; }
      var periodEndStr = detailJson.data.currentPeriodEnd;
      if (!periodEndStr) { monthlyRendered = false; return; }

      var endDate = new Date(periodEndStr.replace(' ', 'T'));
      var startDate = new Date(endDate.getTime() - 31 * 24 * 60 * 60 * 1000);
      var startStr = fmtDate(startDate);
      var endStr   = fmtDate(endDate);

      var months = [];
      var cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (cur <= endDate) {
        months.push({ year: cur.getFullYear(), month: cur.getMonth() + 1 });
        cur.setMonth(cur.getMonth() + 1);
      }

      var allData = [];
      for (var i = 0; i < months.length; i++) {
        var m = months[i];
        var d = await fetchUsageData(m.year, m.month);
        allData = allData.concat(d);
      }

      var grouped = groupByModel(allData, startStr, endStr);

      var wrap = document.createElement('div');
      wrap.className = 'mimo-usage-wrap mimo-monthly-wrap';

      var title = document.createElement('p');
      title.className = 'mimo-usage-title';
      title.textContent = '月度消耗（' + startStr + ' ~ ' + endStr + '）';
      wrap.appendChild(title);
      wrap.appendChild(buildStatsSection(grouped));

      var todayWrap = document.querySelector('.mimo-today-wrap');
      if (todayWrap) {
        todayWrap.insertAdjacentElement('afterend', wrap);
      } else {
        planRow.insertAdjacentElement('afterend', wrap);
      }

      var hint = document.createElement('div');
      hint.className = 'mimo-stats-hint';
      hint.textContent = '* 金额按各模型费率估算，实际以平台计费为准';
      wrap.insertAdjacentElement('afterend', hint);
    } catch (e) {
      console.error('MiMo monthly usage:', e);
      monthlyRendered = false;
    }
  }

  // --- Click to toggle original/converted value ---
  document.body.addEventListener('click', function (e) {
    var el = e.target.closest('.mimo-yuan-converted');
    if (!el || !el.dataset.mimoOriginal) return;
    e.stopPropagation();
    var current = el.textContent;
    if (current === el.dataset.mimoConverted) {
      el.textContent = el.dataset.mimoOriginal;
    } else {
      el.textContent = el.dataset.mimoConverted;
    }
  }, true);

  // --- Main ---
  function run() {
    processUsageFigures();
    processPlanBenefits();

    var planRow = findPlanRow();
    if (planRow) {
      renderTodayUsage(planRow);
      renderMonthlyUsage(planRow);
    }
  }

  var target = document.getElementById('root') || document.body;
  var debounceTimer;
  var obs = new MutationObserver(function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(run, 200);
  });
  obs.observe(target, { childList: true, subtree: true });

  setTimeout(run, 1500);
  setTimeout(run, 4000);
})();
