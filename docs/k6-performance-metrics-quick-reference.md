# k6 Performance Metrics — Quick Reference

## 1. The Core Idea

Performance testing answers three main questions:

1. How much load are we giving the system?
2. How fast does the system respond?
3. Does the system remain reliable under load?

```text
LOAD
 ↓
VUs / Iterations / Requests
 ↓
RESPONSE TIME
 ↓
p50 / p90 / p95 / p99
 ↓
RELIABILITY
 ↓
Errors / Checks
```

---

# 2. Percentiles: p50, p90, p95, p99

## The easiest way to remember

| Metric | Easy Meaning | Interpretation |
|---|---|---|
| **p50** | **Typical user** | 50% of requests are at or below this time |
| **p90** | **Majority** | 90% of requests are at or below this time |
| **p95** | **Almost everyone** | 95% of requests are at or below this time |
| **p99** | **Tail / Worst 1%** | 99% of requests are at or below this time; ~1% are slower |

### Memory trick

```text
p50 → Typical user
p90 → Majority
p95 → Almost everyone
p99 → Tail / Worst 1%
```

The higher the percentile, the more we are looking toward the slow end of the distribution.

---

# 3. What Does "p95 = 1.2 sec" Mean?

It means:

```text
95% of requests ≤ 1.2 seconds
5% of requests  > 1.2 seconds
```

It does **NOT** mean:

> 95% of requests take exactly 1.2 seconds.

Example: if 1,000 requests produce `p95 = 1.2 sec`, approximately 950 requests are at or below 1.2 seconds and 50 are slower.

---

# 4. Why Do We Need Percentiles?

Average alone can hide slow users.

Example:

```text
100
100
100
100
100
100
100
100
100
5000
```

Average:

```text
590 ms
```

The average looks reasonable, but one request took 5 seconds.

Percentiles expose this "long tail".

Example:

```text
Average = 450 ms
p50     = 300 ms
p90     = 850 ms
p95     = 1.2 sec
p99     = 4.8 sec
max     = 12 sec
```

Interpretation:

```text
Typical user       → ≤ 300 ms
Majority            → ≤ 850 ms
Almost everyone     → ≤ 1.2 sec
Worst 1% / tail     → > 4.8 sec
Extreme outlier     → 12 sec
```

---

# 5. p50 — Typical User

**p50 = median**

Meaning:

> 50% of requests complete at or below this value.

Example:

```text
p50 = 300 ms
```

```text
50% requests ≤ 300 ms
50% requests > 300 ms
```

### Purpose

Understand the experience of a typical request/user.

### Remember

> **p50 = Typical user**

---

# 6. p90 — Majority

Meaning:

> 90% of requests complete at or below this value.

Example:

```text
p90 = 850 ms
```

```text
90% requests ≤ 850 ms
10% requests > 850 ms
```

### Purpose

Shows the experience of the large majority of users while still revealing slower requests.

### Remember

> **p90 = Majority**

---

# 7. p95 — Almost Everyone

Meaning:

> 95% of requests complete at or below this value.

Example:

```text
p95 = 1.2 sec
```

```text
95% requests ≤ 1.2 sec
5% requests > 1.2 sec
```

### Purpose

Very useful for performance targets/SLOs because it focuses on the experience of almost all users while allowing a small tail.

### Remember

> **p95 = Almost everyone**

---

# 8. p99 — Tail / Worst 1%

Meaning:

> 99% of requests complete at or below this value.

Example:

```text
p99 = 4.8 sec
```

```text
99% requests ≤ 4.8 sec
1% requests > 4.8 sec
```

### Why is 1% important?

Because 1% becomes a large number at high traffic.

```text
1,000 requests       → 10 slow requests
100,000 requests     → 1,000 slow requests
1,000,000 requests   → 10,000 slow requests
```

### Purpose

Find tail latency and problems affecting a smaller portion of users.

### Remember

> **p99 = Tail / Worst 1%**

---

# 9. Average vs Percentiles

Do not use average alone.

```text
Test A
Average = 500 ms
p95     = 600 ms
p99     = 800 ms

Test B
Average = 400 ms
p95     = 1.8 sec
p99     = 8 sec
```

Although Test B has a better average, its tail latency is much worse.

### Rule of thumb

```text
Average → general overview
p50     → typical user
p90     → majority
p95     → almost everyone
p99     → tail / worst 1%
max     → extreme outlier
```

---

# 10. Min and Max

## min

Fastest observed request.

```text
min = 80 ms
```

Useful for understanding the best observed case, but not a primary performance target.

## max

Slowest observed request.

```text
max = 12 sec
```

Useful for detecting extreme latency, timeout behavior, backend stalls, connection problems, and unusual outliers.

Max can be dominated by one abnormal request.

---

# 11. k6 Load Metrics

## VU — Virtual User

`vus` = number of currently active virtual users.

Example:

```text
10 VUs
```

means approximately 10 concurrent virtual users are executing the workload.

> **VU = How many virtual users are active?**

## vus_max

Maximum VU capacity allocated/available for the test.

```text
vus     = 20
vus_max = 100
```

does not mean 100 VUs are active.

> **vus = current**
>
> **vus_max = maximum available**

---

# 12. Iterations

An **iteration** is one complete execution of the k6 `default` function.

If:

```javascript
export default function () {
    executeLogin();
}
```

then conceptually:

```text
1 iteration = 1 login flow
```

> **Iteration = How many times did the test flow run?**

Important:

> Iteration ≠ VU

Example:

```text
10 VUs
100 iterations
```

means the flow ran 100 times in total, not 1,000 times.

---

# 13. http_reqs

Number of HTTP requests generated by k6.

Example Login flow:

```text
GET  /connect/authorize
GET  /Account/Login
POST /Account/Login
GET  /connect/authorize/callback
GET  /home/id-ID/auth-callback
POST /connect/token
```

Approximately:

```text
1 login iteration ≈ 6 HTTP requests
```

Therefore:

```text
1,000 iterations
≈ 6,000 HTTP requests
```

> **Iterations = business/test flows**
>
> **http_reqs = actual HTTP requests**

---

# 14. Throughput / Requests per Second

Often represented as:

```text
http_reqs / second
```

Example:

```text
29 req/s
```

means k6 is generating approximately 29 HTTP requests per second.

> **RPS = How much HTTP traffic per second?**

---

# 15. http_req_duration

Time spent on an individual HTTP request.

Example:

```text
POST /connect/token
http_req_duration = 300 ms
```

That individual HTTP request took approximately 300 ms.

This is different from the time for the entire Login flow.

---

# 16. iteration_duration

Time spent executing one complete k6 iteration.

If:

```javascript
export default function () {
    executeLogin();
}
```

then:

```text
iteration_duration
≈ complete Login flow duration
```

Example:

```text
authorize          100 ms
login page         200 ms
submit login       500 ms
callback           100 ms
token exchange     300 ms
--------------------------------
Total              ≈ 1.2 sec
```

> **http_req_duration = one HTTP request**
>
> **iteration_duration = one complete test flow**

For QFlow Login, `iteration_duration` is particularly useful because it answers:

> "How long does the complete login flow take?"

---

# 17. http_req_failed

Percentage/rate of HTTP requests that failed.

Example:

```text
10,000 requests
50 failed
```

```text
failure rate = 50 / 10,000
             = 0.5%
```

Typical failures include:

```text
500
502
503
504
timeout
```

> **http_req_failed = Did the HTTP request fail?**

---

# 18. Checks

Checks are functional assertions.

Example:

```javascript
check(response, {
    'Token endpoint returns 200': (r) =>
        r.status === 200,

    'Access token is returned': () =>
        Boolean(accessToken),
});
```

A request can return HTTP 200 but still fail a functional check.

Example:

```json
{
    "success": false
}
```

So:

```text
HTTP status = 200
Functional result = FAIL
```

> **HTTP metrics tell us what happened at HTTP level.**
>
> **Checks tell us whether the expected behavior happened.**

---

# 19. Important Difference

## HTTP Failure

```text
POST /connect/token
→ 504
```

Likely contributes to:

```text
http_req_failed
```

## Functional Failure

```text
POST /connect/token
→ 200

But:
access_token = missing
```

HTTP may be considered successful, but:

```text
check = FAILED
```

Therefore, use **both**.

---

# 20. The Most Important Performance Relationship

When analyzing a load test, don't look at one metric alone.

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

The key question is:

> **What happens to latency and reliability when load increases?**

That is the core of performance testing.

---

# 21. Example: QFlow Login

Suppose we test:

```text
20 VUs
5 minutes
```

Result:

```text
VUs             = 20
Iterations      = 1,245
HTTP Requests   = 8,715
RPS             = 29

Response Time:
avg             = 450 ms
p50             = 300 ms
p90             = 850 ms
p95             = 1.2 sec
p99             = 4.8 sec
max             = 12 sec

Reliability:
HTTP Error      = 0.12%
Checks          = 99.8%
```

Interpretation:

```text
p50 = 300 ms
→ Typical user is fast

p90 = 850 ms
→ Majority is still fast

p95 = 1.2 sec
→ Almost everyone is within 1.2 sec

p99 = 4.8 sec
→ Tail latency is high

max = 12 sec
→ There is an extreme outlier

Error = 0.12%
→ Small percentage of HTTP requests failed

Checks = 99.8%
→ Almost all expected functional conditions passed
```

The important observation:

> The average may look good while p99 reveals a significant tail-latency problem.

---

# 22. Quick Cheat Sheet

```text
┌─────────────────────────────────────────────────────┐
│                 RESPONSE TIME                        │
├──────────┬──────────────────────────────────────────┤
│ p50      │ Typical user                             │
│ p90      │ Majority                                 │
│ p95      │ Almost everyone                          │
│ p99      │ Tail / Worst 1%                          │
│ min      │ Fastest request                          │
│ avg      │ Overall average                          │
│ max      │ Slowest / extreme outlier               │
└──────────┴──────────────────────────────────────────┘
```

```text
┌─────────────────────────────────────────────────────┐
│                    LOAD                             │
├──────────┬──────────────────────────────────────────┤
│ vus      │ Current active Virtual Users             │
│ vus_max  │ Maximum VU capacity                      │
│ iteration│ Complete execution of default()         │
│ http_reqs│ Total HTTP requests                      │
│ RPS      │ HTTP requests per second                 │
└──────────┴──────────────────────────────────────────┘
```

```text
┌─────────────────────────────────────────────────────┐
│                  RELIABILITY                         │
├──────────────────┬──────────────────────────────────┤
│ http_req_failed  │ HTTP request failures            │
│ checks           │ Functional assertions            │
└──────────────────┴──────────────────────────────────┘
```

---

# 23. The 5 Metrics to Remember First

If you forget everything else, remember these:

### 1. VUs
> How many virtual users are active?

### 2. RPS / http_reqs
> How much traffic are we generating?

### 3. p50
> **Typical user**

### 4. p95
> **Almost everyone**

### 5. p99
> **Tail / Worst 1%**

Then add:

```text
Error rate → Is the system failing?
Checks     → Is the expected behavior still correct?
```

---

# 24. Final Mental Model

```text
             HOW MUCH LOAD?
                   │
            VUs / RPS / Iterations
                   │
                   ▼
             HOW FAST?
                   │
        p50 / p90 / p95 / p99
                   │
                   ▼
            HOW RELIABLE?
                   │
          Errors / Checks
                   │
                   ▼
          IS IT ACCEPTABLE?
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

> **p50 = Typical user → p90 = Majority → p95 = Almost everyone → p99 = Tail / Worst 1%**

For performance testing, **p95 and p99 are especially useful because they reveal slow-user experience that an average can hide.**
