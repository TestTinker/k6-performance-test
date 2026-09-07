# Plan 2 — Custom Performance Metrics & New Case Flow Implementation

## Status

**Completed — Full flow validated successfully**

Plan 2 implements the New Case performance-test flow after Plan 1 scope definition.

Login is executed once per VU and is excluded from the New Case duration.

## 1. Objective

Implement the New Case flow using the scopes defined in Plan 1 and add business-level k6 Trend metrics.

```text
Login once per VU
    |
    v
Case Preparation
    |
    v
Case Type Dependent Data
    |
    v
Case Creation
    |
    v
Case Detail Loading
    |
    v
Logout
```

## 2. Scope Implementation

### Scope 1 — Case Preparation

Implemented:

- `GET /case-management/en-US/case-creation`
- `POST /casemanagement/api/caseinvolvementtype/list`
- `POST /casemanagement/api/casecommunicationtype/list`
- `POST /casemanagement/api/casetype/getCaseTypesForCaseInitiation`

The Case Type response is processed to find the configured Case Type and obtain its `AggregateIdentifier`.

Metric:

```text
case_preparation_duration
```

### Scope 2 — Case Type Dependent Data

Implemented dependent requests for:

- Case Reason
- Case Priority
- Tax Region
- Tax Office

The selected Case Type Identifier from Scope 1 is passed to the dependent requests.

Metric:

```text
case_type_loading_duration
```

### Scope 3 — Case Creation

Implemented:

```text
POST /casemanagement/api/casecreation
```

The response is validated and these values are captured:

```text
CaseNumber
CorrelationId
CaseIdentifier
```

Metric:

```text
case_creation_duration
```

### Scope 4 — Case Detail Loading

Implemented post-creation requests for:

- Case Access
- General Information
- Case Routing

The `CaseIdentifier` returned by Case Creation is passed to the subsequent requests.

Metric:

```text
case_detail_loading_duration
```

## 3. End-to-End Metric

The complete New Case journey is measured with:

```text
new_case_duration
```

This starts when New Case processing begins and ends after the configured Case Detail Loading scope.

Login is intentionally excluded because authentication is performed once per VU.

## 4. Custom Metrics

| Metric | Scope |
|---|---|
| `case_preparation_duration` | Case Preparation |
| `case_type_loading_duration` | Case Type Dependent Data |
| `case_creation_duration` | Case Creation |
| `case_detail_loading_duration` | Case Detail Loading |
| `new_case_duration` | Complete New Case flow |

All custom metrics use k6 `Trend` and are recorded in milliseconds.

## 5. Validation Result

Development validation completed successfully.

```text
checks_total.......: 417
checks_succeeded...: 100.00%
checks_failed......: 0.00%
```

All implemented Case flow checks passed, including:

- Case Creation page
- Case Involvement Type
- Case Communication Type
- Case Type
- Case Type Identifier
- Case Reason
- Case Priority
- Tax Region
- Tax Office
- Case Creation
- Case Identifier
- Case Number
- Correlation ID
- Case Access
- General Information
- Case Routing

Login checks also passed.

### HTTP

```text
http_req_failed: 0.00%
http_reqs: 262
```

No HTTP request failures were observed during validation.

## 6. Validation Metrics

| Metric | Avg | Min | Median | Max | p90 | p95 |
|---|---:|---:|---:|---:|---:|---:|
| `case_creation_duration` | 215.57 ms | 180 ms | 216 ms | 249 ms | 233 ms | 234 ms |
| `case_detail_loading_duration` | 154.76 ms | 127 ms | 153 ms | 184 ms | 182 ms | 182 ms |
| `case_preparation_duration` | 327.71 ms | 259 ms | 321 ms | 491 ms | 384 ms | 397 ms |
| `case_type_loading_duration` | 240.52 ms | 178 ms | 224 ms | 370 ms | 312 ms | 352 ms |
| `login_duration` | 399.50 ms | 360 ms | 399.5 ms | 439 ms | 431.1 ms | 435.05 ms |
| `new_case_duration` | 952 ms | 810 ms | 922 ms | 1390 ms | 1043 ms | 1075 ms |

These values are **development validation results**, not baseline performance results. The run is too small to establish reliable performance thresholds.

## 7. Important Implementation Decisions

### Login once per VU

The intended execution model is:

```text
VU starts
   |
   +--> Login
   |
   +--> New Case
   |      +--> Case Preparation
   |      +--> Case Type Dependent Data
   |      +--> Case Creation
   |      +--> Case Detail Loading
   |
   +--> Logout
```

This prevents authentication from being repeated for every Case.

### Case Identifier chaining

The flow uses response data as dependencies:

```text
Case Type
   |
   +--> AggregateIdentifier
           |
           v
   Case Type Dependent Data
           |
           v
      Case Creation
           |
           +--> CaseIdentifier
                   |
                   v
            Case Detail Loading
```

### Test data is not externalized yet

Test data remains in the current implementation.

External test-data management is deferred to **Plan 3**.

Future test data should support:

- multiple users
- different roles
- Case Type
- New Case form field values

## 8. Plan 2 Output

Implemented/updated:

```text
utils/metrics.js
scenarios/case-management/new-case.js
tests/new-case-test.js
```

The existing project structure is retained.

## 9. Completion Criteria

| Criteria | Status |
|---|---|
| Case Preparation implemented | ✅ |
| Case Type dependent requests implemented | ✅ |
| Case Creation implemented | ✅ |
| CaseIdentifier captured | ✅ |
| CaseNumber captured | ✅ |
| CorrelationId captured | ✅ |
| Case Detail Loading implemented | ✅ |
| Custom Trends implemented | ✅ |
| Login once per VU | ✅ |
| Full flow executed successfully | ✅ |
| HTTP failures = 0% | ✅ |
| Checks passed = 100% | ✅ |

## 10. Next Plan

**Plan 3 — External Test Data**

Planned objectives:

1. Create an external test-data source.
2. Define user data structure.
3. Support multiple users and roles.
4. Externalize Case Type.
5. Externalize New Case form field values.
6. Make the New Case scenario consume external test data.
7. Prepare the structure for future parameterization without changing the scenario flow.

The choice between JSON and Excel should be finalized in Plan 3 based on k6 compatibility, maintainability, and the intended execution model.
