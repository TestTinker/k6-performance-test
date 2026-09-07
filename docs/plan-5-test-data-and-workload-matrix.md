# Plan 5 — Test Data Parameterization & Workload Matrix

## Objective

Memisahkan **test data** dari **workload configuration**, sehingga data Case dan jumlah VU dapat diubah tanpa mengubah business flow.

---

## 5.1 Test Data Parameterization

Test data New Case disimpan di:

```text
test-data/new-case.json
```

Data Case berisi field yang digunakan untuk membentuk payload `casecreation`.

Contoh struktur:

```json
{
    "caseData": [
        {
            "id": "case-data-01",
            "caseType": {
                "name": "Absolute and Optional Data Quality"
            },
            "caseReasonCode": "ADHOC",
            "casePriorityCode": "MEDIUM",
            "comments": "Performance Test 01"
        }
    ]
}
```

### Prinsip penting

`CaseTypeIdentifier` **tidak disimpan secara hard-code di test data**.

Flow-nya:

```text
Case Type Name
      ↓
getCaseTypesForCaseInitiation
      ↓
AggregateIdentifier
      ↓
CaseTypeIdentifier
      ↓
casecreation
```

Dengan demikian identifier tetap mengikuti response aktual dari application.

---

## 5.2 Test Data Utility

File:

```text
utils/test-data.js
```

Utility bertanggung jawab untuk:

- membaca `users.json`
- membaca `new-case.json`
- memilih user berdasarkan VU
- memilih Case test data
- mendukung explicit test-data selection melalui `CASE_DATA_ID`
- melakukan fallback selection berdasarkan VU dan iteration
- mengambil password dari environment variable

Password **tidak disimpan di `users.json`**.

Contoh:

```powershell
-e CASE_DATA_ID=case-data-01
```

Jika `CASE_DATA_ID` tidak diberikan, test data dipilih secara otomatis berdasarkan VU dan iteration.

---

## 5.3 Workload Configuration

Workload dipisahkan ke:

```text
config/workloads.js
```

Workload yang disiapkan:

### Development

```text
Target: 1 VU
```

Digunakan untuk validasi dasar flow.

### Small

```text
10s → 5 VUs
30s → 5 VUs
10s → 0 VUs
```

Digunakan untuk eksplorasi concurrency kecil.

### Medium

```text
1m → 10 VUs
5m → 10 VUs
1m → 0 VUs
```

Digunakan untuk eksplorasi awal pada load yang lebih tinggi.

> Workload di atas adalah konfigurasi eksplorasi, bukan acceptance criteria dan bukan baseline.

---

## 5.4 Workload Selection

Workload dapat dipilih melalui environment variable:

```powershell
-e WORKLOAD=development
```

atau:

```powershell
-e WORKLOAD=small
```

atau:

```powershell
-e WORKLOAD=medium
```

Dengan demikian `config.js` tidak perlu diubah setiap kali workload diganti.

---

## 5.5 Performance Test Matrix

Matrix awal:

| Test | Workload | Target VU | Tujuan |
|---|---|---:|---|
| Validation | development | 1 | Memastikan flow berjalan |
| Low Load | small | 5 | Melihat behaviour concurrency |
| Medium | medium | 10 | Eksplorasi awal |

Angka workload masih bersifat exploratory karena sistem masih dalam tahap development dan baseline belum ditetapkan.

---

## 5.6 Execution Validation

### Development / 1 VU

Flow berhasil dijalankan dengan:

```text
1 VU
```

dan menghasilkan completed iterations tanpa interruption.

### Small / 5 VUs

Workload 5 VU juga berhasil dijalankan:

```text
Duration : ~50 seconds
Max VUs  : 5
Iterations: 88
Interrupted: 0
```

Hasil tersebut menunjukkan workload configuration dapat menjalankan New Case flow secara concurrent.

Pada run tersebut:

```text
HTTP requests       : 1669
HTTP RPS             : 32.90/s
HTTP failed          : 0.00%
Checks                : 100%
New Case avg         : 1.505s
New Case p90         : 2.103s
New Case p95         : 2.208s
```

Hasil ini digunakan sebagai **exploration result**, bukan baseline.

---

## 5.7 Architecture

```text
                    k6
                     │
                     ▼
              new-case-test.js
                     │
                     ▼
             executeNewCase()
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
    Test Data     Workload      Metrics
        │            │            │
        ▼            ▼            ▼
new-case.json   workloads.js    Trends
users.json
        │
        ▼
      Login
        │
        ▼
   New Case Flow
        │
   ┌────┴─────┐
   ▼          ▼
Preparation  Case Type
   │          │
   └────┬─────┘
        ▼
   Case Creation
        │
        ▼
   CaseIdentifier
        │
        ▼
   Case Details
```

---

## 5.8 Separation of Concerns

### Test Data

Menjawab:

> **What data does the user submit?**

```text
test-data/
├── users.json
└── new-case.json
```

### Workload

Menjawab:

> **How many users execute the flow?**

```text
config/
└── workloads.js
```

### Scenario

Menjawab:

> **What does the user actually do?**

```text
scenarios/
└── case-management/
    └── new-case.js
```

### Test Entry Point

Menjawab:

> **Which scenario is executed?**

```text
tests/
└── new-case-test.js
```

---

## 5.9 Current Status

```text
Plan 5
│
├── Parameterized new-case.json       ✅
├── Test-data utility                 ✅
├── Dynamic CaseTypeIdentifier        ✅
├── Dynamic CaseIdentifier            ✅
├── Login once per VU                 ✅
├── Workload configuration             ✅
├── Development workload              ✅
├── Small workload (5 VUs)            ✅
├── Workload selection via ENV        ✅
└── Execution validation              ✅
```

**Plan 5 — Test Data Parameterization & Workload Matrix: COMPLETED**

---

## Important Notes

1. Parameterization saat ini baru mencakup data yang sudah tersedia dan tervalidasi.
2. Jangan menambahkan nilai Case Type atau field lain secara asumtif.
3. `CaseTypeIdentifier` harus tetap diperoleh secara dynamic dari Case Type API.
4. Workload numbers saat ini hanya untuk exploration.
5. Baseline dan threshold belum ditetapkan karena application masih dalam tahap development.
6. Infrastructure monitoring belum termasuk dalam Plan 5.
