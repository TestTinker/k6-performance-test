import { Trend } from 'k6/metrics';

/**
 * Business-level performance metrics.
 *
 * Values are recorded in milliseconds.
 */

export const casePreparationDuration = new Trend(
    'case_preparation_duration'
);

export const caseTypeLoadingDuration = new Trend(
    'case_type_loading_duration'
);

export const caseCreationDuration = new Trend(
    'case_creation_duration'
);

export const caseDetailLoadingDuration = new Trend(
    'case_detail_loading_duration'
);

export const newCaseDuration = new Trend(
    'new_case_duration'
);