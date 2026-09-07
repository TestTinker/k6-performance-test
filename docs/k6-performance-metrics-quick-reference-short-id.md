# k6 Performance Metrics — Quick Reference

## 1. Metrics

| Istilah | Arti sederhana | Contoh / tujuan |
|---|---|---|
| **min** | Request tercepat | Response time terendah yang tercatat |
| **max** | Request terlambat | Response time tertinggi yang tercatat |
| **vus** | Virtual User aktif | Jumlah VU yang sedang berjalan |
| **vus_max** | Maksimum VU | Jumlah maksimum VU yang tersedia untuk test |
| **iterations** | Eksekusi flow lengkap | 1 iteration = 1 kali eksekusi `default()` |
| **http_reqs** | Total HTTP request | Jumlah HTTP request yang dikirim |
| **Throughput / Requests per Second** | HTTP request per detik | `http_reqs / second` |
| **http_req_duration** | Durasi satu HTTP request | Berapa lama satu request berjalan |
| **iteration_duration** | Durasi satu iteration lengkap | Berapa lama seluruh test flow berjalan |
| **http_req_failed** | Rate HTTP request gagal | Persentase/rate HTTP request yang gagal |
| **Checks** | Validasi/assertion fungsional | Apakah kondisi yang diharapkan berhasil atau gagal |

---

## 2. Percentile

| Istilah | Arti mudah | Contoh |
|---|---|---|
| **p50** | **Typical user** / User tipikal | 50% request ≤ 1.0 detik |
| **p90** | **Majority** / Mayoritas | 90% request ≤ 1.2 detik; 10% > 1.2 detik |
| **p95** | **Almost everyone** / Hampir semua user | 95% request ≤ 1.5 detik; 5% > 1.5 detik |
| **p99** | **Tail / Worst 1%** / 1% paling lambat | 99% request ≤ 3.0 detik; 1% > 3.0 detik |

### Cara mudah mengingat

```text
p50 → User tipikal
p90 → Mayoritas
p95 → Hampir semua user
p99 → Tail / 1% paling lambat
```

---

# 3. Hubungan Performance yang Paling Penting

Saat menganalisis load test, jangan melihat satu metric saja.

```text
VUs ↑
  ↓
Traffic / RPS ↑
  ↓
Response Time ↑ ?
  ↓
p90 / p95 / p99 ↑ ?
  ↓
Errors ↑ ?
  ↓
Checks ↓ ?
```

Pertanyaan utamanya:

> **Apa yang terjadi pada response time dan reliability ketika load meningkat?**

---

# 4. Mental Model

```text
             SEBERAPA BESAR LOAD?
                      │
              VUs / RPS / Iterations
                      │
                      ▼
              SEBERAPA CEPAT?
                      │
             p50 / p90 / p95 / p99
                      │
                      ▼
             SEBERAPA RELIABLE?
                      │
                 Errors / Checks
                      │
                      ▼
              APAKAH ACCEPTABLE?
                      │
             ┌────────┴────────┐
             ▼                 ▼
         Threshold          Baseline
             │                 │
             └────────┬────────┘
                      ▼
                  Test Result
```

## One-line memory aid

> **p50 = User tipikal → p90 = Mayoritas → p95 = Hampir semua user → p99 = Tail / 1% paling lambat**
