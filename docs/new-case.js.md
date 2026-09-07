executeNewCase()
│
├── Scope 1
│   ├── getCaseCreationPage()
│   ├── getCaseInvolvementTypes()
│   ├── getCaseCommunicationTypes()
│   └── getCaseTypes()
│
├── extractCaseType()
│
├── Scope 2
│   ├── getCaseReasons()
│   ├── getCasePriorities()
│   ├── getTaxRegions()
│   └── getTaxOffices()
│
├── Scope 3
│   └── createCase()
│       ├── CaseIdentifier
│       ├── CaseNumber
│       └── CorrelationId
│
└── Scope 4
    ├── getCaseAccess()
    ├── getGeneralInformation()
    └── getCaseRouting()