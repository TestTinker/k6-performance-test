// =========================================================
// TEST DATA
// Load external JSON files.
// =========================================================

const users =
    JSON.parse(
        open('../test-data/users.json')
    );

const caseData =
    JSON.parse(
        open('../test-data/new-case.json')
    );


// =========================================================
// USER DATA
// =========================================================

/**
 * Return the configured user for the current VU.
 *
 * Explicit VU assignment is used first.
 * If no assignment exists, round-robin selection
 * is used from the configured user list.
 *
 * @param {number} vuNumber - k6 VU number.
 * @returns {object} User configuration.
 */
export function getUserForVU(
    vuNumber = __VU
) {

    // =========================================================
    // Find explicit VU assignment
    // =========================================================

    const assignment =
        users.vuAssignments.find(
            (item) =>
                item.vu === vuNumber
        );


    if (assignment) {

        const user =
            users.users.find(
                (item) =>
                    item.id ===
                    assignment.userId
            );


        if (!user) {

            throw new Error(
                `User '${assignment.userId}' is not configured.`
            );
        }


        return user;
    }


    // =========================================================
    // Fallback to round-robin user selection
    // =========================================================

    if (
        users.users.length === 0
    ) {

        throw new Error(
            'No users are configured in users.json.'
        );
    }


    return users.users[
        (vuNumber - 1) %
        users.users.length
    ];
}


// =========================================================
// CASE DATA
// =========================================================

/**
 * Return Case test data.
 *
 * Data can be selected using CASE_DATA_ID.
 *
 * Example:
 *
 * -e CASE_DATA_ID=case-data-01
 *
 * If CASE_DATA_ID is not provided, the record is selected
 * based on the current VU and iteration.
 *
 * This allows multiple VUs to consume multiple test-data
 * records without changing the New Case scenario.
 *
 * @returns {object} Case test data.
 */
export function getCaseData() {

    // =========================================================
    // Validate test data
    // =========================================================

    if (
        !caseData.caseData ||
        caseData.caseData.length === 0
    ) {

        throw new Error(
            'No Case test data is configured in new-case.json.'
        );
    }


    // =========================================================
    // Explicit test-data selection
    // =========================================================
    //
    // Example:
    //
    // -e CASE_DATA_ID=case-data-01
    //
    // This is useful when we want to execute
    // a specific test-data record.
    // =========================================================

    const requestedId =
        __ENV.CASE_DATA_ID;


    if (requestedId) {

        const data =
            caseData.caseData.find(
                (item) =>
                    item.id ===
                    requestedId
            );


        if (!data) {

            throw new Error(
                `Case test data '${requestedId}' is not configured in new-case.json.`
            );
        }


        return data;
    }


    // =========================================================
    // Automatic test-data selection
    // =========================================================
    //
    // VU 1 / Iteration 1 → record 1
    // VU 1 / Iteration 2 → record 2
    // VU 2 / Iteration 1 → record 2
    // etc.
    //
    // This becomes useful when multiple records
    // are added later.
    // =========================================================

    const index =
        (
            (__VU - 1) +
            __ITER
        ) %
        caseData.caseData.length;


    return caseData.caseData[index];
}


// =========================================================
// PASSWORD
// =========================================================

/**
 * Resolve password from an environment variable.
 *
 * Password is intentionally NOT stored in users.json.
 *
 * @param {object} user - User configuration.
 * @returns {string} Password.
 */
export function getUserPassword(
    user
) {

    const envName =
        user.passwordEnv;


    if (!envName) {

        throw new Error(
            `passwordEnv is not configured for user '${user.id}'.`
        );
    }


    const password =
        __ENV[envName];


    if (!password) {

        throw new Error(
            `${envName} environment variable is not set for user '${user.id}'.`
        );
    }


    return password;
}