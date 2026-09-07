import { options } from '../config/config.js';

import { executeLogin } from '../scenarios/authentication/login.js';

import {
    executeNewCase,
} from '../scenarios/case-management/new-case.js';

export { options };

let loggedIn = false;

/**
 * Execute the QFlow New Case load scenario.
 *
 * Each VU logs in once and then repeatedly
 * creates new cases using the same authentication token.
 */
export function createNewCase() {
// export default function(){
    // Step 1: Login once for the current VU.
    if (!loggedIn) {

        executeLogin();

        loggedIn = true;

        console.log(
            'VU logged in successfully.'
        );
    }

    // Step 2: Create a new case.
    executeNewCase();
}