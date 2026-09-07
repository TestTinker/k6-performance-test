let caseTypeIdentifier = null;
let caseNumber = null;
let correlationId = null;
let caseIdentifier = null;

/**
 * Store the Case Type Identifier for the current k6 VU.
 *
 * @param {string} identifier - Case Type Aggregate Identifier.
 */
export function setCaseTypeIdentifier(identifier) {
    caseTypeIdentifier = identifier;
}

/**
 * Get the Case Type Identifier for the current k6 VU.
 *
 * @returns {string|null} Case Type Identifier.
 */
export function getCaseTypeIdentifier() {
    return caseTypeIdentifier;
}

/**
 * Check whether a Case Type Identifier is available.
 *
 * @returns {boolean} True when identifier exists.
 */
export function hasCaseTypeIdentifier() {
    return Boolean(caseTypeIdentifier);
}

/**
 * Store the Case Number for the current k6 VU.
 *
 * @param {string} value - Generated Case Number.
 */
export function setCaseNumber(value) {
    caseNumber = value;
}

/**
 * Get the Case Number for the current k6 VU.
 *
 * @returns {string|null} Case Number.
 */
export function getCaseNumber() {
    return caseNumber;
}

/**
 * Store the Correlation ID for the current k6 VU.
 *
 * @param {string} value - Correlation ID.
 */
export function setCorrelationId(value) {
    correlationId = value;
}

/**
 * Get the Correlation ID for the current k6 VU.
 *
 * @returns {string|null} Correlation ID.
 */
export function getCorrelationId() {
    return correlationId;
}

/**
 * Store the Case Identifier for the current k6 VU.
 *
 * @param {string} value - Case Identifier.
 */
export function setCaseIdentifier(value) {
    caseIdentifier = value;
}

/**
 * Get the Case Identifier for the current k6 VU.
 *
 * @returns {string|null} Case Identifier.
 */
export function getCaseIdentifier() {
    return caseIdentifier;
}

/**
 * Clear all stored Case Management data.
 */
export function clearCaseData() {
    caseTypeIdentifier = null;
    caseNumber = null;
    correlationId = null;
    caseIdentifier = null;
}