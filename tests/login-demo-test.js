import { options } from '../config/config.js';

import { executeLogin } from '../scenarios/authentication/login.js';
import { executeLogout } from '../scenarios/authentication/logout.js';

export { options };

/**
 * Login load scenario.
 *
 * This function is called by the k6 scenario
 * defined in config.js.
 */
export function loginLoad() {

    // Step 1: Execute login and obtain authentication tokens.
    executeLogin();

    // Step 2: New Case will be added here.
    // executeNewCase();

    // Step 3: Execute logout.
    // executeLogout();

}