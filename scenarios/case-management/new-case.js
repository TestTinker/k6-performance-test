// =========================================================
// NEW CASE PERFORMANCE SCENARIO
// =========================================================
//
// Scope:
//
// 1. Case Preparation
// 2. Case Type Dependent Data
// 3. Case Creation
// 4. Case Detail Loading
//
// Login is executed once per VU outside this scenario.
//
// Case correlation:
//
// Case Type API
//      |
//      +--> AggregateIdentifier
//      |
//      +--> CaseTypeIdentifier
//                  |
//                  v
//           Case Type Dependent Data
//                  |
//                  v
//             Case Creation
//                  |
//                  +--> CaseIdentifier
//                  +--> CaseNumber
//                  +--> CorrelationId
//                           |
//                           v
//                    Case Detail Loading
//
// =========================================================


import http from 'k6/http';
import { check } from 'k6';

import {
    environments,
} from '../../config/environments.js';

import {
    getAuthHeaders,
} from '../../utils/auth.js';

import {
    getCaseData,
} from '../../utils/test-data.js';

import {
    casePreparationDuration,
    caseTypeLoadingDuration,
    caseCreationDuration,
    caseDetailLoadingDuration,
    newCaseDuration,
} from '../../utils/metrics.js';


// =========================================================
// ENVIRONMENT
// =========================================================

const environmentName =
    __ENV.ENV || 'dev';


const environment =
    environments[environmentName];


if (!environment) {

    throw new Error(
        `Unknown environment '${environmentName}'.`
    );
}


const baseUrl =
    environment.baseUrl;


// =========================================================
// MAIN ENTRY POINT
// =========================================================

export function executeNewCase() {

    // =========================================================
    // New Case total duration
    // =========================================================

    const newCaseStart =
        Date.now();


    // =========================================================
    // TEST DATA
    // =========================================================

    const caseData =
        getCaseData();


    const caseTypeName =
        caseData.caseType.name;


    // =========================================================
    // SCOPE 1
    // CASE PREPARATION
    // =========================================================

    const preparationStart =
        Date.now();


    getCaseCreationPage();

    getCaseInvolvementTypes();

    getCaseCommunicationTypes();

    const caseTypeResponse =
        getCaseTypes();


    // ---------------------------------------------------------
    // Extract configured Case Type.
    //
    // Selection:
    //
    // CaseTypeCode ==
    // "Absolute and Optional Data Quality"
    //
    // Extract:
    //
    // AggregateIdentifier
    //
    // Use as:
    //
    // CaseTypeIdentifier
    // ---------------------------------------------------------

    const caseType =
        extractCaseType(
            caseTypeResponse,
            caseTypeName
        );


    casePreparationDuration.add(
        Date.now() -
        preparationStart
    );


    // =========================================================
    // SCOPE 2
    // CASE TYPE DEPENDENT DATA
    // =========================================================

    const caseTypeLoadingStart =
        Date.now();


    getCaseReasons(
        caseType.AggregateIdentifier
    );


    getCasePriorities(
        caseType.AggregateIdentifier
    );


    getTaxRegions(
        caseType.AggregateIdentifier
    );


    getTaxOffices(
        caseType.AggregateIdentifier
    );


    caseTypeLoadingDuration.add(
        Date.now() -
        caseTypeLoadingStart
    );


    // =========================================================
    // SCOPE 3
    // CASE CREATION
    // =========================================================

    const caseCreationStart =
        Date.now();


    const creationResponse =
        createCase(
            caseType,
            caseData
        );


    caseCreationDuration.add(
        Date.now() -
        caseCreationStart
    );


    // ---------------------------------------------------------
    // Extract:
    //
    // CaseIdentifier
    // CaseNumber
    // CorrelationId
    // ---------------------------------------------------------

    const creationResult =
        extractCaseCreationResult(
            creationResponse
        );


    // =========================================================
    // SCOPE 4
    // CASE DETAIL LOADING
    // =========================================================

    const caseDetailLoadingStart =
        Date.now();


    getCaseAccess(
        creationResult.caseIdentifier
    );


    getGeneralInformation(
        creationResult.caseIdentifier,
        creationResult.caseNumber
    );


    getCaseRouting(
        creationResult.caseIdentifier
    );


    caseDetailLoadingDuration.add(
        Date.now() -
        caseDetailLoadingStart
    );


    // =========================================================
    // NEW CASE TOTAL
    // =========================================================

    newCaseDuration.add(
        Date.now() -
        newCaseStart
    );


    // =========================================================
    // LOG
    // =========================================================

    console.log(
        `CaseNumber=${creationResult.caseNumber}, ` +
        `CaseIdentifier=${creationResult.caseIdentifier}, ` +
        `CorrelationId=${creationResult.correlationId}`
    );


    return creationResult;
}


// =========================================================
// SCOPE 1
// CASE CREATION PAGE
// =========================================================

function getCaseCreationPage() {

    const response =
        http.get(
            `${baseUrl}/case-management/en-US/case-creation`,
            {
                headers: {
                    ...getAuthHeaders(),
                },
            }
        );


    check(response, {

        'Case Creation page status is 200':
            (r) =>
                r.status === 200,

    });


    return response;
}


// =========================================================
// CASE INVOLVEMENT TYPE
// =========================================================

function getCaseInvolvementTypes() {

    const response =
        http.post(

            `${baseUrl}/casemanagement/api/caseinvolvementtype/list`,

            JSON.stringify({}),

            {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type':
                        'application/json',
                },
            }
        );


    check(response, {

        'Case Involvement Type request successful':
            (r) =>
                r.status >= 200 &&
                r.status < 300,

        'Case Involvement Type IsSuccessful':
            (r) =>
                r.json('IsSuccessful') === true,

    });


    return response;
}


// =========================================================
// CASE COMMUNICATION TYPE
// =========================================================

function getCaseCommunicationTypes() {

    const response =
        http.post(

            `${baseUrl}/casemanagement/api/casecommunicationtype/list`,

            JSON.stringify({}),

            {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type':
                        'application/json',
                },
            }
        );


    check(response, {

        'Case Communication Type request successful':
            (r) =>
                r.status >= 200 &&
                r.status < 300,

        'Case Communication Type IsSuccessful':
            (r) =>
                r.json('IsSuccessful') === true,

    });


    return response;
}


// =========================================================
// CASE TYPE LIST
// =========================================================

function getCaseTypes() {

    const payload = {

        First: 0,

        Rows: 10000,

        Filters: [],

        LanguageId: 'en-US',

    };


    const response =
        http.post(

            `${baseUrl}/casemanagement/api/casetype/getCaseTypesForCaseInitiation`,

            JSON.stringify(payload),

            {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type':
                        'application/json',
                },
            }
        );


    check(response, {

        'Case Type request successful':
            (r) =>
                r.status >= 200 &&
                r.status < 300,

        'Case Type IsSuccessful':
            (r) =>
                r.json('IsSuccessful') === true,

        'Case Type data exists':
            (r) => {

                const payload =
                    r.json('Payload');

                return (
                    payload &&
                    Array.isArray(payload.Data) &&
                    payload.Data.length > 0
                );
            },

    });


    return response;
}


// =========================================================
// EXTRACT CASE TYPE
// =========================================================

function extractCaseType(
    response,
    caseTypeName
) {

    const payload =
        response.json('Payload');


    if (
        !payload ||
        !Array.isArray(payload.Data)
    ) {

        throw new Error(
            'Case Type response does not contain Payload.Data.'
        );
    }


    const caseType =
        payload.Data.find(
            (item) =>
                item.CaseTypeCode ===
                caseTypeName
        );


    check(response, {

        'Configured Case Type found':
            () =>
                !!caseType,

        'Case Type AggregateIdentifier exists':
            () =>
                !!(
                    caseType &&
                    caseType.AggregateIdentifier
                ),

    });


    if (!caseType) {

        throw new Error(
            `Case Type '${caseTypeName}' was not found.`
        );
    }


    if (!caseType.AggregateIdentifier) {

        throw new Error(
            `AggregateIdentifier is missing for Case Type '${caseTypeName}'.`
        );
    }


    return caseType;
}


// =========================================================
// SCOPE 2
// CASE REASON
// =========================================================

function getCaseReasons(
    caseTypeIdentifier
) {

    validateCaseTypeIdentifier(
        caseTypeIdentifier
    );


    const payload = {

        CaseTypeIdentifier:
            caseTypeIdentifier,

    };


    const response =
        http.post(

            `${baseUrl}/casemanagement/api/casetypecasereasontype/list`,

            JSON.stringify(payload),

            {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type':
                        'application/json',
                },
            }
        );


    check(response, {

        'Case Reason request successful':
            (r) =>
                r.status >= 200 &&
                r.status < 300,

        'Case Reason IsSuccessful':
            (r) =>
                r.json('IsSuccessful') === true,

    });


    return response;
}


// =========================================================
// CASE PRIORITY
// =========================================================

function getCasePriorities(
    caseTypeIdentifier
) {

    validateCaseTypeIdentifier(
        caseTypeIdentifier
    );


    const payload = {

        CaseTypeIdentifier:
            caseTypeIdentifier,

    };


    const response =
        http.post(

            `${baseUrl}/casemanagement/api/casetypecaseprioritytype/list`,

            JSON.stringify(payload),

            {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type':
                        'application/json',
                },
            }
        );


    check(response, {

        'Case Priority request successful':
            (r) =>
                r.status >= 200 &&
                r.status < 300,

        'Case Priority IsSuccessful':
            (r) =>
                r.json('IsSuccessful') === true,

    });


    return response;
}


// =========================================================
// TAX REGION
// =========================================================

function getTaxRegions(
    caseTypeIdentifier
) {

    validateCaseTypeIdentifier(
        caseTypeIdentifier
    );


    const payload = {

        CaseTypeIdentifier:
            caseTypeIdentifier,

    };


    const response =
        http.post(

            `${baseUrl}/casemanagement/api/casetaxregion/list`,

            JSON.stringify(payload),

            {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type':
                        'application/json',
                },
            }
        );


    check(response, {

        'Tax Region request successful':
            (r) =>
                r.status >= 200 &&
                r.status < 300,

        'Tax Region IsSuccessful':
            (r) =>
                r.json('IsSuccessful') === true,

    });


    return response;
}


// =========================================================
// TAX OFFICE
// =========================================================

function getTaxOffices(
    caseTypeIdentifier
) {

    validateCaseTypeIdentifier(
        caseTypeIdentifier
    );


    const payload = {

        CaseTypeIdentifier:
            caseTypeIdentifier,

    };


    const response =
        http.post(

            `${baseUrl}/casemanagement/api/casetaxoffice/list`,

            JSON.stringify(payload),

            {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type':
                        'application/json',
                },
            }
        );


    check(response, {

        'Tax Office request successful':
            (r) =>
                r.status >= 200 &&
                r.status < 300,

        'Tax Office IsSuccessful':
            (r) =>
                r.json('IsSuccessful') === true,

    });


    return response;
}


// =========================================================
// SCOPE 3
// CASE CREATION
// =========================================================

function createCase(
    caseType,
    caseData
) {

    // =========================================================
    // IMPORTANT
    //
    // CaseTypeIdentifier is NOT taken from test data.
    //
    // It is dynamically obtained from:
    //
    // getCaseTypesForCaseInitiation
    //        |
    //        v
    // AggregateIdentifier
    //
    // =========================================================

    const payload = {

        CaseTypeIdentifier:
            caseType.AggregateIdentifier,

        CaseTypeCode:
            caseType.CaseTypeCode,

        CaseReasonCode:
            caseData.caseReasonCode,

        CasePriorityCode:
            caseData.casePriorityCode,

        TaxpayerIdentifier:
            caseData.taxpayerIdentifier,

        CaseInvolvementTypeCode:
            caseData.caseInvolvementTypeCode,

        StartDate:
            new Date().toISOString(),

        PreviousCaseIdentifier:
            caseData.previousCaseIdentifier,

        PreviousCaseName:
            caseData.previousCaseName,

        CommunicationTypeCode:
            caseData.communicationTypeCode,

        CaseConfidentialityLevel:
            caseData.caseConfidentialityLevel,

        ConfidentialityComment:
            caseData.confidentialityComment,

        Comments:
            caseData.comments,

        TaxRegionCode:
            caseData.taxRegionCode,

        TaxOfficeCode:
            caseData.taxOfficeCode,

        ProtocolNumber:
            caseData.protocolNumber,

        ProtocolDate:
            caseData.protocolDate,

        ConfidentialityLevel:
            caseData.confidentialityLevel,

    };


    const response =
        http.post(

            `${baseUrl}/casemanagement/api/casecreation`,

            JSON.stringify(payload),

            {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type':
                        'application/json',
                },
            }
        );


    check(response, {

        'Case Creation request successful':
            (r) =>
                r.status >= 200 &&
                r.status < 300,

        'Case Creation IsSuccessful':
            (r) =>
                r.json('IsSuccessful') === true,

        'Case Creation ErrorCode is 0':
            (r) =>
                r.json('ErrorCode') === 0,

        'Case Identifier returned':
            (r) =>
                !!r.json('CaseIdentifier'),

        'Case Number returned':
            (r) =>
                !!r.json('CaseNumber'),

        'CorrelationId returned':
            (r) =>
                !!r.json('CorrelationId'),

    });


    return response;
}


// =========================================================
// EXTRACT CASE CREATION RESULT
// =========================================================

function extractCaseCreationResult(
    response
) {

    const caseIdentifier =
        response.json('CaseIdentifier');


    const caseNumber =
        response.json('CaseNumber');


    const correlationId =
        response.json('CorrelationId');


    if (!caseIdentifier) {

        throw new Error(
            'CaseIdentifier was not returned by Case Creation.'
        );
    }


    if (!caseNumber) {

        throw new Error(
            'CaseNumber was not returned by Case Creation.'
        );
    }


    if (!correlationId) {

        throw new Error(
            'CorrelationId was not returned by Case Creation.'
        );
    }


    return {

        caseIdentifier,

        caseNumber,

        correlationId,

    };
}


// =========================================================
// SCOPE 4
// CASE ACCESS
// =========================================================

function getCaseAccess(
    caseIdentifier
) {

    validateCaseIdentifier(
        caseIdentifier
    );


    const payload = {

        CaseIdentifier:
            caseIdentifier,

    };


    const response =
        http.post(

            `${baseUrl}/casemanagement/api/caseaccess`,

            JSON.stringify(payload),

            {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type':
                        'application/json',
                },
            }
        );


    check(response, {

        'Case Access request successful':
            (r) =>
                r.status >= 200 &&
                r.status < 300,

        'Case Access IsSuccessful':
            (r) =>
                r.json('IsSuccessful') === true,

    });


    return response;
}


// =========================================================
// GENERAL INFORMATION
// =========================================================

function getGeneralInformation(
    caseIdentifier,
    expectedCaseNumber
) {

    validateCaseIdentifier(
        caseIdentifier
    );


    const payload = {

        AggregateIdentifier:
            caseIdentifier,

        LanguageId:
            'en-US',

    };


    const response =
        http.post(

            `${baseUrl}/casemanagement/api/generalinformation/view`,

            JSON.stringify(payload),

            {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type':
                        'application/json',
                },
            }
        );


    check(response, {

        'General Information request successful':
            (r) =>
                r.status >= 200 &&
                r.status < 300,

        'General Information IsSuccessful':
            (r) =>
                r.json('IsSuccessful') === true,

        'General Information Case Number matches':
            (r) => {

                const returnedCaseNumber =
                    r.json(
                        'Payload.CaseNumber'
                    );


                return (
                    returnedCaseNumber ===
                    expectedCaseNumber
                );
            },

    });


    return response;
}


// =========================================================
// CASE ROUTING
// =========================================================

function getCaseRouting(
    caseIdentifier
) {

    validateCaseIdentifier(
        caseIdentifier
    );


    const payload = {

        AggregateIdentifier:
            caseIdentifier,

        LanguageId:
            'en-US',

    };


    const response =
        http.post(

            `${baseUrl}/casemanagement/api/caserouting/view`,

            JSON.stringify(payload),

            {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type':
                        'application/json',
                },
            }
        );


    check(response, {

        'Case Routing request successful':
            (r) =>
                r.status >= 200 &&
                r.status < 300,

        'Case Routing IsSuccessful':
            (r) =>
                r.json('IsSuccessful') === true,

    });


    return response;
}


// =========================================================
// VALIDATION
// =========================================================

function validateCaseTypeIdentifier(
    caseTypeIdentifier
) {

    if (!caseTypeIdentifier) {

        throw new Error(
            'CaseTypeIdentifier is missing. ' +
            'Dependent request will not be executed.'
        );
    }
}


function validateCaseIdentifier(
    caseIdentifier
) {

    if (!caseIdentifier) {

        throw new Error(
            'CaseIdentifier is missing. ' +
            'Case Detail request will not be executed.'
        );
    }
}