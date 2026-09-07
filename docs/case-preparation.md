# Case Preparation – Performance Test Plan 1

## 1. Document Information

| Item | Value |
|---|---|
| Document | `case-preparation.md` |
| Plan | Plan 1 – Request Inventory & Performance Scope |
| Source | Generated Grafana k6 Studio recording + updated request/response inventory |
| Recording version | Grafana k6 Studio 2.1.0 |
| Recording date | 2026-08-28 |
| Application flow | Login → Create Case → Save Case → Case Overview |
| Login | **Excluded** – already covered by the previous performance-test scope |
| `/casemanagement/api/casetimer/list` | **Excluded** |
| Status | **LOCKED** |

---

## 2. Objective

Define the API requests that should be included in the performance test for the **New Case / Save Case** flow after login.

The updated inventory now includes the observed **Content/Response**, content description, dependency, decision, and custom metric for each request.

The resulting performance scope is divided into four logical scopes:

1. Case Preparation
2. Case Type Dependent Data
3. Case Creation
4. Case Detail Loading

A fifth logical view, **Full New Case Journey**, combines the four scopes for end-to-end measurement.

---

## 3. Final Scope

```text
Scope 1 – Case Preparation
        |
        v
Scope 2 – Case Type Dependent Data
        |
        v
Scope 3 – Case Creation
        |
        | CaseIdentifier / AggregateIdentifier
        v
Scope 4 – Case Detail Loading
```

| Scope | Purpose | Custom Metric |
|---|---|---|
| Case Preparation | Prepare the Create Case form and load initial reference data | `case_preparation_duration` |
| Case Type Dependent Data | Load data associated with the selected Case Type | `case_type_loading_duration` |
| Case Creation | Execute the New Case creation transaction | `case_creation_duration` |
| Case Detail Loading | Load the newly created Case Overview data | `case_detail_loading_duration` |
| Full New Case Journey | End-to-end journey across all four scopes | `new_case_duration` |

---

# 4. Scope 1 – Case Preparation

## 4.1 Request Inventory

| # | Request URL | Method | Payload | Content / Response | Content Description | Dependency | Decision | Custom Metric |
|---:|---|---|---|---|---|---|---|---|
| 1 | `/case-management/en-US/case-creation` | GET | — | HTML Create Case page | HTML Create Case page | Login/token/session | Include | `case_preparation_duration` |
| 2 | `/casemanagement/api/caseinvolvementtype/list` | POST | `{}` | `IsSuccessful: true`; `Payload` contains CASE_INVOLVEMENT_TYPE reference data, including `REQUESTVIATAXCOURT`, `SUBJECTOFFIELDAUDIT`, `SUBJECTOFAUDIT`, `INFORMANT`, `FILEDREQUEST`, `SUBJECTOFCASE` | Load Case Involvement options | Authentication | Include | `case_preparation_duration` |
| 3 | `/casemanagement/api/casecommunicationtype/list` | POST | `{}` | `IsSuccessful: true`; `Payload` contains COMMUNICATION_TYPE reference data including `EMAIL`, `Informative_Visit`, `Notification_Letter`, `PHONECALL`, `VISITOFFICE` | Load Communication Channel options | Authentication | Include | `case_preparation_duration` |
| 4 | `/casemanagement/api/casetype/getCaseTypesForCaseInitiation` | POST | `{"First":0,"Rows":10000,"Filters":[],"LanguageId":"en-US"}` | `IsSuccessful: true`; `Payload.TotalRecords: 477`; `Payload.Data` contains Case Type records including `AggregateIdentifier`, `CaseTypeCode`, group, organisation level, tax-region/tax-office requirements, visibility rules, and other Case Type configuration | Load Case Type list | Authentication | Include | `case_preparation_duration` |

### Important Case Type response

The response contains **477 records**.

For the selected test Case Type:

```text
CaseTypeCode:        Absolute and Optional Data Quality
AggregateIdentifier: 06cf8824-d358-4d54-9686-49de7c7b8ba8
CaseTypeGroupCode:   Data Quality Management
OrganisationLevelCode: HQ
RequiresTaxpayer:    false
RequiresTaxOffice:   false
CanBeStartedInCore:  true
AllowMultipleOpenCasesPerTaxpayer: false
AllowHeadquarterOnCaseCreation: true
StarterSwimlane:     TAXOFFICER
```

Therefore, `AggregateIdentifier` from this response is the value that must be correlated as the selected `CaseTypeIdentifier` for the dependent requests and Case Creation.

### Notes

- The Case Type request uses `Rows: 10000` in the recording.
- The response contains substantially more records than the selected test case; do not hard-code the first returned record.
- The selected Case Type should be identified by a stable test-data rule, e.g. `CaseTypeCode == "Absolute and Optional Data Quality"`.
- The Bearer token must be dynamic and must not be hard-coded into the final performance script.

---

# 5. Scope 2 – Case Type Dependent Data

The following requests use the selected `CaseTypeIdentifier`.

## 5.1 Request Inventory

| # | Request URL | Method | Payload | Content / Response | Content Description | Dependency | Decision | Custom Metric |
|---:|---|---|---|---|---|---|---|---|
| 1 | `/casemanagement/api/casetypecasereasontype/list` | POST | `{"CaseTypeIdentifier":"..."}` | `IsSuccessful: true`; `TotalRecords: 1`; `CaseReasonTypeCode: ADHOC` | Load Case Reason | `CaseTypeIdentifier` | Include | `case_type_loading_duration` |
| 2 | `/casemanagement/api/casetypecaseprioritytype/list` | POST | `{"CaseTypeIdentifier":"..."}` | `IsSuccessful: true`; `TotalRecords: 3`; available priorities: `MEDIUM`, `LOW`, `HIGH` | Load Case Priority | `CaseTypeIdentifier` | Include | `case_type_loading_duration` |
| 3 | `/casemanagement/api/casetaxregion/list` | POST | `{"CaseTypeIdentifier":"..."}` | `IsSuccessful: true`; `Payload` contains TAX_REGION reference data | Load Tax Region | `CaseTypeIdentifier` | Include | `case_type_loading_duration` |
| 4 | `/casemanagement/api/casetaxoffice/list` | POST | `{"CaseTypeIdentifier":"..."}` | `IsSuccessful: true`; `Payload` contains TAX_OFFICE reference data and `ParameterDataList` | Load Tax Office | `CaseTypeIdentifier` | Include | `case_type_loading_duration` |

### Dependency

```text
getCaseTypesForCaseInitiation
            |
            v
     CaseTypeIdentifier
            |
      +-----+-----+-----+
      |           |     |
      v           v     v
    Reason     Priority  Tax Region
                           |
                           v
                       Tax Office
```

### Selected Case Type – observed dependent data

```text
CaseTypeIdentifier:
06cf8824-d358-4d54-9686-49de7c7b8ba8

Case Reason:
ADHOC

Case Priority:
MEDIUM

Recorded Case Creation:
TaxRegionCode = 180
TaxOfficeCode  = 524
```

The response values must be used as the source for valid test data rather than assuming that arbitrary values are valid.

---

# 6. Scope 3 – Case Creation

This is the **primary business transaction** and the highest-priority performance target.

## 6.1 Request Inventory

| # | Request URL | Method | Payload | Content / Response | Content Description | Dependency | Decision | Custom Metric |
|---:|---|---|---|---|---|---|---|---|
| 1 | `/casemanagement/api/casecreation` | POST | See below | `IsSuccessful: true`; `ErrorCode: 0`; `CaseNumber` returned; `CorrelationId` returned; `CaseIdentifier` returned | Create new case | `CaseTypeIdentifier` + form data | **MUST TEST** | `case_creation_duration` |

## 6.2 Recorded Payload

```json
{
  "CaseTypeIdentifier": "06cf8824-d358-4d54-9686-49de7c7b8ba8",
  "CaseTypeCode": "Absolute and Optional Data Quality",
  "CaseReasonCode": "ADHOC",
  "CasePriorityCode": "MEDIUM",
  "TaxpayerIdentifier": null,
  "CaseInvolvementTypeCode": null,
  "StartDate": "2026-08-28T14:42:57+07:00",
  "PreviousCaseIdentifier": null,
  "PreviousCaseName": null,
  "CommunicationTypeCode": null,
  "CaseConfidentialityLevel": null,
  "ConfidentialityComment": null,
  "Comments": "Remarks",
  "TaxRegionCode": "180",
  "TaxOfficeCode": "524",
  "ProtocolNumber": null,
  "ProtocolDate": null,
  "ConfidentialityLevel": null
}
```

## 6.3 Recorded Response

```json
{
  "ErrorMessage": null,
  "IsSuccessful": true,
  "Message": null,
  "Type": null,
  "ErrorCode": 0,
  "Payload": null,
  "CaseNumber": "C000000000000068",
  "CorrelationId": "6545104e-f8b6-4ab2-82ae-50eff0e98363",
  "ReferenceDataItems": null,
  "CaseIdentifier": "5d1ccc5f-6b7d-4c91-908b-8960e3015203"
}
```

### Critical correlation

`casecreation` is the point where the new Case identifier is returned.

```text
casecreation response
        |
        +--> CaseNumber
        |
        +--> CorrelationId
        |
        +--> CaseIdentifier
                  |
                  +--> caseaccess
                  |
                  +--> generalinformation/view
                  |
                  +--> caserouting/view
```

The final k6 script must extract `CaseIdentifier` dynamically from the `casecreation` response.

`CaseNumber` should also be captured for validation/reporting.

---

# 7. Scope 4 – Case Detail Loading

After successful Case Creation, the application loads the Case Overview.

## 7.1 Request Inventory

| # | Request URL | Method | Payload | Content / Response | Content Description | Dependency | Decision | Custom Metric |
|---:|---|---|---|---|---|---|---|---|
| 1 | `/casemanagement/api/caseaccess` | POST | `{"CaseIdentifier":"..."}` | `IsSuccessful: true`; `Payload` contains case access/permission flags such as `IsUserInvolvedInCase`, `CanEditCaseDetails`, `CanViewTaxOfficers`, `CanViewTaxpayers`, `CanViewActivities`, `CanViewComments`, `CanViewDocuments`, etc. | Check case access | `CaseIdentifier` | Include | `case_detail_loading_duration` |
| 2 | `/casemanagement/api/generalinformation/view` | POST | `{"AggregateIdentifier":"...","LanguageId":"en-US"}` | `IsSuccessful: true`; `Payload` contains Case Number, Case Type, Case Type Identifier, Root Case Identifier, Workflow Identifier and general Case information | Load General Information | `CaseIdentifier` | Include | `case_detail_loading_duration` |
| 3 | `/casemanagement/api/caserouting/view` | POST | `{"AggregateIdentifier":"...","LanguageId":"en-US"}` | `IsSuccessful: true`; `Payload` contains workflow/routing information, current workflow step, workflow identifiers and workflow step list | Load Routing information | `CaseIdentifier` | Include | `case_detail_loading_duration` |

## 7.2 Case Access Response – Relevant Result

The response is successful and provides authorization/visibility flags for the newly created case.

Relevant observed flags include:

```text
IsUserInvolvedInCase:       true
CanEditCaseDetails:         true
CanViewTaxOfficers:         true
CanAdministerTaxOfficers:   true
CanViewTaxpayers:           true
CanViewTaxTypes:             true
CanViewActivities:          true
CanAddActivities:            true
CanViewComments:             true
CanAddComments:              true
CanViewDocuments:            true
CanAddDocuments:             true
```

The complete response should not be unnecessarily asserted field-by-field in the performance test unless those permissions are part of the business acceptance criteria.

## 7.3 General Information Response – Relevant Result

The response contains:

```text
CaseNumber:          C000000000000068
CaseTypeCode:        Absolute and Optional Data Quality
CaseTypeIdentifier:  06cf8824-d358-4d54-9686-49de7c7b8ba8
RootCaseIdentifier:  5d1ccc5f-6b7d-4c91-908b-8960e3015203
WorkflowIdentifier:  30114459-7028-4ed9-b8cf-d685e51113e7
```

This response can be used to validate that the Case Overview corresponds to the case created by the previous request.

## 7.4 Case Routing Response – Relevant Result

The response contains workflow/routing information including:

```text
CaseTypeIdentifier:   06cf8824-d358-4d54-9686-49de7c7b8ba8
WorkflowCode:         Absolute and Optional Data Quality
CurrentWorkflowStep:  START
WorkflowIdentifier:   30114459-7028-4ed9-b8cf-d685e51113e7
```

The response also contains a `WorkflowStepList` with workflow-step configuration.

---

# 8. Explicit Exclusion

```text
/casemanagement/api/casetimer/list
```

is **EXCLUDED** from Plan 1 and from the final Case Detail Loading scope.

It must not be added back into the k6 transaction sequence unless the performance objective is explicitly changed.

---

# 9. Full New Case Journey

```text
[Scope 1]
Case Preparation
       |
       | case_preparation_duration
       v
[Scope 2]
Case Type Dependent Data
       |
       | case_type_loading_duration
       v
[Scope 3]
Case Creation
       |
       | case_creation_duration
       | CaseIdentifier
       v
[Scope 4]
Case Detail Loading
       |
       | case_detail_loading_duration
       v
     END
```

## Proposed custom metrics

| Metric | Measurement |
|---|---|
| `case_preparation_duration` | Scope 1 duration |
| `case_type_loading_duration` | Scope 2 duration |
| `case_creation_duration` | Scope 3 duration |
| `case_detail_loading_duration` | Scope 4 duration |
| `new_case_duration` | End-to-end Scope 1 + Scope 2 + Scope 3 + Scope 4 |

The actual k6 `Trend` implementation belongs to Plan 2.

---

# 10. Excluded Requests

| Request / Category | Decision | Reason |
|---|---|---|
| Login / authentication flow | EXCLUDE | Login performance test already completed |
| `/cdn-cgi/rum` | EXCLUDE | Browser/application telemetry |
| `/_version/...` | EXCLUDE | Application version checking |
| `/referencedata/...` background checks | EXCLUDE | Background/reference-data initialization |
| `/notification/api/coreunreadinbox/count` | EXCLUDE | Not part of New Case business transaction; recording contains a 404 response |
| Static JS/CSS/image requests | EXCLUDE | Not API business transaction |
| `/casemanagement/api/casetimer/list` | **EXCLUDE** | Explicit final decision |
| Duplicate `caseaccess` requests | Do not automatically duplicate | Recording contains repeated calls; logical transaction should be represented once unless normal application behavior is confirmed to require multiple calls |
| Duplicate `generalinformation/view` requests | Do not automatically duplicate | Same rule as above |

---

# 11. Correlation & Parameterization Rules

The updated response data establishes the following correlation chain:

### 11.1 Case Type

Extract from:

```text
/casemanagement/api/casetype/getCaseTypesForCaseInitiation
```

Selection rule for the recorded scenario:

```text
CaseTypeCode == "Absolute and Optional Data Quality"
```

Extract:

```text
AggregateIdentifier
```

Use it as:

```text
CaseTypeIdentifier
```

### 11.2 Case Reason

From:

```text
/casemanagement/api/casetypecasereasontype/list
```

Observed valid value:

```text
ADHOC
```

### 11.3 Case Priority

From:

```text
/casemanagement/api/casetypecaseprioritytype/list
```

Observed valid values:

```text
MEDIUM
LOW
HIGH
```

Recorded scenario uses:

```text
MEDIUM
```

### 11.4 Case Identifier

Extract from:

```text
/casemanagement/api/casecreation
```

Response:

```text
CaseIdentifier
```

Use the extracted value for:

```text
/casemanagement/api/caseaccess
/casemanagement/api/generalinformation/view
/casemanagement/api/caserouting/view
```

### 11.5 Case Number

Also extract:

```text
CaseNumber
```

from `casecreation`.

Use it for validation/reporting where required.

---

# 12. Headers Strategy

The recording contains a Bearer token and browser-generated headers.

## Required / likely required

```text
Authorization: Bearer <dynamic-token>
Content-Type: application/json
languageid: en-US
x-dgt-code: <request-specific value>
```

## Conditional

```text
Accept
referer
request_from
```

These should only be retained when required by the API/application.

### Security rule

The Bearer token captured during recording must **not** be committed as a static token in the final performance-test script.

---

# 13. Plan 1 Exit Criteria

Plan 1 is considered **LOCKED / COMPLETE** when:

- [x] Login excluded
- [x] `/casemanagement/api/casetimer/list` excluded
- [x] Four performance scopes defined
- [x] Business-relevant API requests identified
- [x] Background/telemetry requests excluded
- [x] Request URL documented
- [x] HTTP method documented
- [x] Payload documented
- [x] Content/Response reviewed and incorporated
- [x] Content description documented
- [x] Dependency documented
- [x] Decision documented
- [x] Custom metric assigned
- [x] `CaseTypeIdentifier` correlation identified
- [x] `CaseIdentifier` correlation identified
- [x] `CaseNumber` capture identified
- [x] End-to-end New Case journey defined

**Plan 1 status: LOCKED**

---

# 14. Next Plan

## Plan 2 – Custom Trend & Correlation Design

The updated response data is now sufficient to start Plan 2.

Plan 2 should cover:

1. Response extraction / correlation
2. `CaseTypeIdentifier` extraction from Case Type response
3. `CaseIdentifier` extraction from Case Creation response
4. `CaseNumber` extraction and validation
5. Custom k6 `Trend` metrics
6. Business-level checks
7. Test-data parameterization
8. Final request sequencing
9. Separation of preparation vs transaction metrics
10. Error handling for failed Case Creation / missing `CaseIdentifier`

No static recorded `CaseIdentifier` should be used for the post-creation requests in the final performance script.
