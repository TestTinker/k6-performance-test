#!/usr/bin/env node
/**
 * generate-report.js
 *
 * Membaca output k6:
 *   - result JSON (NDJSON, dari --out json=..., boleh .json atau .json.gz)
 *   - summary JSON (dari --summary-export=...)
 * lalu menghasilkan satu file HTML dashboard mandiri (self-contained,
 * tidak butuh internet kecuali untuk memuat Chart.js dari CDN).
 *
 * Pemakaian:
 *   node scripts/generate-report.js <result.json[.gz]> <summary.json> [outputDir]
 *
 * Contoh:
 *   node scripts/generate-report.js results/json/result_20260824_171520.json.gz \
 *        results/summary/summary_20260824_171520.json \
 *        results/report
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');

const SLOW_REQUEST_TOP_N = 5;
const SUB_METRICS = [
  'http_req_blocked',
  'http_req_connecting',
  'http_req_tls_handshaking',
  'http_req_sending',
  'http_req_waiting',
  'http_req_receiving',
];

function fail(msg) {
  console.error('generate-report: ' + msg);
  process.exit(1);
}

const [, , resultPathArg, summaryPathArg, outDirArg] = process.argv;
if (!resultPathArg || !summaryPathArg) {
  fail('usage: node generate-report.js <result.json[.gz]> <summary.json> [outputDir]');
}

const resultPath = path.resolve(resultPathArg);
const summaryPath = path.resolve(summaryPathArg);
const outDir = path.resolve(outDirArg || 'results/report');

if (!fs.existsSync(resultPath)) fail(`result file not found: ${resultPath}`);
if (!fs.existsSync(summaryPath)) fail(`summary file not found: ${summaryPath}`);

function openLineStream(filePath) {
  const raw = fs.createReadStream(filePath);
  const input = filePath.endsWith('.gz') ? raw.pipe(zlib.createGunzip()) : raw;
  return readline.createInterface({ input, crlfDelay: Infinity });
}

// ---------- pass 1: build per-second timeline + collect all http_req_duration points ----------
async function pass1() {
  const reqsBySec = new Map();
  const durBySec = new Map();
  const vusBySec = new Map();
  const allDurations = []; // {time, value, tags}
  let firstTime = null;
  let lastTime = null;

  const rl = openLineStream(resultPath);
  for await (const line of rl) {
    if (!line) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch (e) {
      continue;
    }
    if (obj.type !== 'Point') continue;
    const { metric } = obj;
    const data = obj.data || {};
    const t = data.time;
    if (!t) continue;
    const ms = Date.parse(t);
    if (Number.isNaN(ms)) continue;
    if (firstTime === null || ms < firstTime) firstTime = ms;
    if (lastTime === null || ms > lastTime) lastTime = ms;
    const secKey = Math.floor(ms / 1000);

    if (metric === 'http_reqs') {
      reqsBySec.set(secKey, (reqsBySec.get(secKey) || 0) + 1);
    } else if (metric === 'vus') {
      vusBySec.set(secKey, data.value);
    } else if (metric === 'http_req_duration') {
      if (!durBySec.has(secKey)) durBySec.set(secKey, []);
      durBySec.get(secKey).push(data.value);
      allDurations.push({ time: t, value: data.value, tags: data.tags || {} });
    }
  }

  return { reqsBySec, durBySec, vusBySec, allDurations, firstTime, lastTime };
}

// ---------- pass 2: fetch sub-metric breakdown for the slowest N requests ----------
async function pass2(targetTimes) {
  const breakdown = new Map(); // time -> { metric: value }
  if (targetTimes.size === 0) return breakdown;

  const rl = openLineStream(resultPath);
  for await (const line of rl) {
    if (!line) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch (e) {
      continue;
    }
    if (obj.type !== 'Point') continue;
    if (!SUB_METRICS.includes(obj.metric)) continue;
    const data = obj.data || {};
    const t = data.time;
    if (!targetTimes.has(t)) continue;
    if (!breakdown.has(t)) breakdown.set(t, {});
    breakdown.get(t)[obj.metric] = data.value;
  }
  return breakdown;
}

function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return null;
  const idx = Math.min(sortedArr.length - 1, Math.floor(sortedArr.length * p));
  return sortedArr[idx];
}

function round(n, d = 2) {
  if (n === null || n === undefined) return null;
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

function fmtBytes(n) {
  if (n >= 1e6) return round(n / 1e6, 2) + ' MB';
  if (n >= 1e3) return round(n / 1e3, 2) + ' kB';
  return round(n, 0) + ' B';
}

function shortenUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch (e) {
    return url.length > 70 ? url.slice(0, 70) + '...' : url;
  }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function main() {
  const summaryRaw = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const metrics = summaryRaw.metrics || {};
  const rootChecks = (summaryRaw.root_group && summaryRaw.root_group.checks) || {};

  const { reqsBySec, durBySec, vusBySec, allDurations, firstTime, lastTime } = await pass1();

  // slow requests (top N by duration)
  const sortedDurations = [...allDurations].sort((a, b) => b.value - a.value);
  const topSlow = sortedDurations.slice(0, SLOW_REQUEST_TOP_N);
  const targetTimes = new Set(topSlow.map((d) => d.time));
  const breakdown = await pass2(targetTimes);

  const slowRequests = topSlow.map((d) => {
    const b = breakdown.get(d.time) || {};
    return {
      time: d.time,
      value: round(d.value, 2),
      method: d.tags.method || '',
      status: d.tags.status || '',
      url: shortenUrl(d.tags.url || d.tags.name || ''),
      blocked: round(b.http_req_blocked, 3),
      connecting: round(b.http_req_connecting, 3),
      tls: round(b.http_req_tls_handshaking, 3),
      sending: round(b.http_req_sending, 3),
      waiting: round(b.http_req_waiting, 3),
      receiving: round(b.http_req_receiving, 3),
    };
  });

  // build timeline seconds (relative to firstTime)
  const secondsSet = new Set([...reqsBySec.keys(), ...durBySec.keys(), ...vusBySec.keys()]);
  const secKeys = [...secondsSet].sort((a, b) => a - b);
  const baseSec = secKeys.length ? secKeys[0] : 0;

  let lastKnownVus = null;
  const timeline = secKeys.map((secKey) => {
    const durs = (durBySec.get(secKey) || []).slice().sort((a, b) => a - b);
    const avg = durs.length ? durs.reduce((s, v) => s + v, 0) / durs.length : null;
    const p95 = percentile(durs, 0.95);
    if (vusBySec.has(secKey)) lastKnownVus = vusBySec.get(secKey);
    return {
      label: (secKey - baseSec) + 's',
      reqs: reqsBySec.get(secKey) || 0,
      avg_dur: round(avg, 2),
      p95_dur: round(p95, 2),
      vus: lastKnownVus,
    };
  });

  const durationSec = firstTime !== null && lastTime !== null
    ? round((lastTime - firstTime) / 1000, 1)
    : null;

  const httpDur = metrics.http_req_duration || {};
  const httpReqs = metrics.http_reqs || {};
  const httpFailed = metrics.http_req_failed || {};
  const checksM = metrics.checks || {};
  const iterations = metrics.iterations || {};
  const vusM = metrics.vus || {};
  const vusMax = metrics.vus_max || {};
  const dataSent = metrics.data_sent || {};
  const dataReceived = metrics.data_received || {};

  const checksTotal = (checksM.passes || 0) + (checksM.fails || 0);
  const checksPassRate = checksTotal ? round(((checksM.passes || 0) / checksTotal) * 100, 2) : null;
  const failRatePct = round((httpFailed.value || 0) * 100, 2);

  const checkRows = Object.values(rootChecks).map((c) => ({
    name: c.name,
    passes: c.passes,
    fails: c.fails,
  }));

  const generatedAt = new Date().toISOString();

  const data = {
    generatedAt,
    resultFile: path.basename(resultPath),
    summaryFile: path.basename(summaryPath),
    durationSec,
    stats: {
      totalRequests: httpReqs.count ?? null,
      reqRate: round(httpReqs.rate, 2),
      iterations: iterations.count ?? null,
      iterRate: round(iterations.rate, 2),
      failRatePct,
      checksPassRate,
      checksPasses: checksM.passes ?? null,
      checksTotal,
      vusMin: vusM.min ?? null,
      vusMax: vusMax.max ?? null,
      min: round(httpDur.min, 2),
      med: round(httpDur.med, 2),
      avg: round(httpDur.avg, 2),
      p90: round(httpDur['p(90)'], 2),
      p95: round(httpDur['p(95)'], 2),
      max: round(httpDur.max, 2),
      dataSent: dataSent.count ?? null,
      dataSentRate: dataSent.rate ?? null,
      dataReceived: dataReceived.count ?? null,
      dataReceivedRate: dataReceived.rate ?? null,
    },
    timeline,
    slowRequests,
    checkRows,
  };

  const html = renderHtml(data);

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const ts = (path.basename(resultPath).match(/(\d{8}_\d{6})/) || [])[1]
    || new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(outDir, `report_${ts}.html`);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log('Report generated: ' + outPath);
}

function renderHtml(data) {
  const s = data.stats;
  const labels = JSON.stringify(data.timeline.map((t) => t.label));
  const reqsArr = JSON.stringify(data.timeline.map((t) => t.reqs));
  const vusArr = JSON.stringify(data.timeline.map((t) => t.vus));
  const p95Arr = JSON.stringify(data.timeline.map((t) => t.p95_dur));
  const spikeThreshold = Math.max(1000, (s.p95 || 0) * 3);

  const slowRows = data.slowRequests.map((r) => `
    <tr>
      <td>${esc(r.time.replace('T', ' ').replace(/\+.*/, ''))}</td>
      <td>${esc(r.method)} ${esc(r.url)}</td>
      <td>${esc(r.status)}</td>
      <td class="num warn">${r.value} ms</td>
      <td class="num">${r.waiting ?? '-'} ms</td>
      <td class="num">${r.sending ?? '-'} ms</td>
      <td class="num">${r.blocked ?? '-'} ms</td>
    </tr>`).join('');

  const checkRows = data.checkRows.map((c) => {
    const total = c.passes + c.fails;
    const pct = total ? round((c.passes / total) * 100, 1) : 0;
    const ok = c.fails === 0;
    return `
    <tr>
      <td>${esc(c.name)}</td>
      <td class="num ${ok ? 'ok' : 'bad'}">${c.passes} / ${total}</td>
      <td class="num ${ok ? 'ok' : 'bad'}">${pct}%</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<title>k6 load test report</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root {
    --bg: #101114; --panel: #17181c; --border: #2a2b30; --border-strong: #3a3b42;
    --text: #e8e8ea; --text-muted: #9a9ba3; --text-dim: #6b6c74;
    --blue: #3987e5; --green: #1baf7a; --orange: #eb6834; --red: #e34948; --amber: #eda100;
  }
  * { box-sizing: border-box; }
  body {
    background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    margin: 0; padding: 24px; font-size: 14px; line-height: 1.5;
  }
  h1 { font-size: 20px; font-weight: 600; margin: 0 0 4px; }
  .meta { color: var(--text-dim); font-size: 12px; margin-bottom: 20px; }
  .grid { display: grid; gap: 10px; margin-bottom: 10px; }
  .cols-4 { grid-template-columns: repeat(4, 1fr); }
  .cols-6 { grid-template-columns: repeat(6, 1fr); }
  .cols-2 { grid-template-columns: 1fr 1fr; }
  .panel {
    background: var(--panel); border: 1px solid var(--border); border-radius: 6px; padding: 12px 14px;
  }
  .panel-title {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-dim);
    margin: 0 0 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border);
  }
  .stat-value { font-family: ui-monospace, monospace; font-size: 22px; font-weight: 600; margin: 0; }
  .stat-sub { font-size: 11px; color: var(--text-dim); margin: 3px 0 0; }
  .ok { color: var(--green); } .bad { color: var(--red); } .warn { color: var(--amber); }
  canvas { max-width: 100%; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; color: var(--text-dim); font-weight: 500; font-size: 11px; text-transform: uppercase;
       letter-spacing: 0.3px; padding: 6px 8px; border-bottom: 1px solid var(--border-strong); }
  td { padding: 6px 8px; border-bottom: 1px solid var(--border); }
  td.num { text-align: right; font-family: ui-monospace, monospace; }
  .alert { background: rgba(227,73,72,0.08); border: 1px solid rgba(227,73,72,0.35); border-radius: 6px; padding: 10px 14px; margin-bottom: 10px; }
  .alert-title { color: var(--red); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin: 0 0 8px; }
  .footer { color: var(--text-dim); font-size: 11px; margin-top: 24px; }
</style>
</head>
<body>
  <h1>k6 load test report</h1>
  <p class="meta">Dibuat otomatis ${esc(data.generatedAt)} &middot; sumber: ${esc(data.resultFile)}, ${esc(data.summaryFile)} &middot; durasi test: ${data.durationSec ?? '-'}s</p>

  <div class="grid cols-4">
    <div class="panel">
      <p class="panel-title">Total requests</p>
      <p class="stat-value">${s.totalRequests ?? '-'}</p>
      <p class="stat-sub">${s.reqRate ?? '-'}/s</p>
    </div>
    <div class="panel">
      <p class="panel-title">Iterations</p>
      <p class="stat-value">${s.iterations ?? '-'}</p>
      <p class="stat-sub">${s.iterRate ?? '-'}/s</p>
    </div>
    <div class="panel">
      <p class="panel-title">Http req failed</p>
      <p class="stat-value ${s.failRatePct > 0 ? 'bad' : 'ok'}">${s.failRatePct ?? '-'}%</p>
      <p class="stat-sub">VUs ${s.vusMin ?? '-'}&ndash;${s.vusMax ?? '-'}</p>
    </div>
    <div class="panel">
      <p class="panel-title">Checks pass rate</p>
      <p class="stat-value ${s.checksPassRate === 100 ? 'ok' : 'bad'}">${s.checksPassRate ?? '-'}%</p>
      <p class="stat-sub">${s.checksPasses ?? '-'} / ${s.checksTotal ?? '-'}</p>
    </div>
  </div>

  <div class="panel" style="margin-bottom:10px;">
    <p class="panel-title">Virtual users (per detik)</p>
    <div style="position:relative; height:110px;"><canvas id="vuChart"></canvas></div>
  </div>

  <div class="panel" style="margin-bottom:10px;">
    <p class="panel-title">Requests per second</p>
    <div style="position:relative; height:150px;"><canvas id="rpsChart"></canvas></div>
  </div>

  <div class="panel" style="margin-bottom:4px;">
    <p class="panel-title">P95 response time per detik (ms)</p>
    <div style="position:relative; height:170px;"><canvas id="p95Chart"></canvas></div>
  </div>

  ${data.slowRequests.length ? `
  <div class="alert">
    <p class="alert-title">Request paling lambat (top ${data.slowRequests.length})</p>
    <table>
      <thead><tr><th>Waktu</th><th>Endpoint</th><th>Status</th><th class="num">Duration</th><th class="num">Waiting</th><th class="num">Sending</th><th class="num">Blocked</th></tr></thead>
      <tbody>${slowRows}</tbody>
    </table>
  </div>` : ''}

  <div class="grid cols-6" style="margin-bottom:10px;">
    <div class="panel"><p class="panel-title">Min</p><p class="stat-value" style="font-size:16px;">${s.min ?? '-'} ms</p></div>
    <div class="panel"><p class="panel-title">Med</p><p class="stat-value" style="font-size:16px;">${s.med ?? '-'} ms</p></div>
    <div class="panel"><p class="panel-title">Avg</p><p class="stat-value" style="font-size:16px;">${s.avg ?? '-'} ms</p></div>
    <div class="panel"><p class="panel-title">P90</p><p class="stat-value" style="font-size:16px;">${s.p90 ?? '-'} ms</p></div>
    <div class="panel"><p class="panel-title">P95</p><p class="stat-value" style="font-size:16px;">${s.p95 ?? '-'} ms</p></div>
    <div class="panel"><p class="panel-title">Max</p><p class="stat-value warn" style="font-size:16px;">${s.max ?? '-'} ms</p></div>
  </div>

  <div class="grid cols-2" style="margin-bottom:10px;">
    <div class="panel">
      <p class="panel-title">Data received</p>
      <p class="stat-value" style="font-size:18px;">${s.dataReceived != null ? fmtBytes(s.dataReceived) : '-'}</p>
      <p class="stat-sub">${s.dataReceivedRate != null ? fmtBytes(s.dataReceivedRate) + '/s' : '-'}</p>
    </div>
    <div class="panel">
      <p class="panel-title">Data sent</p>
      <p class="stat-value" style="font-size:18px;">${s.dataSent != null ? fmtBytes(s.dataSent) : '-'}</p>
      <p class="stat-sub">${s.dataSentRate != null ? fmtBytes(s.dataSentRate) + '/s' : '-'}</p>
    </div>
  </div>

  ${data.checkRows.length ? `
  <div class="panel">
    <p class="panel-title">Checks detail</p>
    <table>
      <thead><tr><th>Check</th><th class="num">Pass / total</th><th class="num">%</th></tr></thead>
      <tbody>${checkRows}</tbody>
    </table>
  </div>` : ''}

  <p class="footer">Digenerate oleh scripts/generate-report.js</p>

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script>
  const labels = ${labels};
  const vus = ${vusArr};
  const reqs = ${reqsArr};
  const p95 = ${p95Arr};
  const spikeThreshold = ${spikeThreshold};

  Chart.defaults.color = '#9a9ba3';
  Chart.defaults.borderColor = '#2a2b30';

  new Chart(document.getElementById('vuChart'), {
    type: 'line',
    data: { labels, datasets: [{ data: vus, borderColor: '#3987e5', backgroundColor: 'rgba(57,135,229,0.12)', borderWidth: 2, pointRadius: 0, stepped: true, fill: true, spanGaps: true }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });

  new Chart(document.getElementById('rpsChart'), {
    type: 'bar',
    data: { labels, datasets: [{ data: reqs, backgroundColor: '#1baf7a', borderRadius: 3 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { title: { display: true, text: 'req/s' } } } }
  });

  new Chart(document.getElementById('p95Chart'), {
    type: 'line',
    data: { labels, datasets: [{
      data: p95, borderColor: '#eb6834', backgroundColor: 'rgba(235,104,52,0.12)', borderWidth: 2,
      pointRadius: p95.map(v => v > spikeThreshold ? 6 : 3),
      pointBackgroundColor: p95.map(v => v > spikeThreshold ? '#e34948' : '#eb6834'),
      tension: 0.2, fill: true, spanGaps: true
    }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { title: { display: true, text: 'ms' } } } }
  });
</script>
</body>
</html>`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
