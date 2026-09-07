import http from 'k6/http';
import { check } from 'k6';

import { environments } from '../../config/environments.js';
import { getIdToken } from '../../utils/auth.js';

const env = __ENV.ENV || 'dev';
const config = environments[env];

/**
 * Extract endSessionId from a response body or URL fragment.
 *
 * @param {string} source - Response body or URL candidate.
 * @returns {string|null} Extracted endSessionId when present.
 */
function extractEndSessionId(source) {
    if (!source) {
        return null;
    }

    const match = source.match(
        /endSessionId(?:=|%3D)([^"'&<>\s]+)/i
    );

    return match
        ? decodeURIComponent(match[1])
        : null;
}

/**
 * Extract a logout callback URL from HTML or script content.
 *
 * @param {string} source - Response body or URL candidate.
 * @returns {string|null} Callback URL when present.
 */
function extractCallbackUrl(source) {
    if (!source) {
        return null;
    }

    const patterns = [
        /https:\/\/qflow-dev\.qce\.co\.id\/identityprovider\/connect\/endsession\/callback\?endSessionId=[^"'&<>\s]+/i,
        /\/identityprovider\/connect\/endsession\/callback\?endSessionId=[^"'&<>\s]+/i,
        /connect\/endsession\/callback\?endSessionId=[^"'&<>\s]+/i,
    ];

    for (const pattern of patterns) {
        const match = source.match(pattern);

        if (match) {
            return match[0];
        }
    }

    return null;
}

/**
 * Normalize a callback URL to an absolute URL.
 *
 * @param {string} callbackUrl - Raw callback URL.
 * @returns {string} Absolute callback URL.
 */
function toAbsoluteCallbackUrl(callbackUrl) {
    if (callbackUrl.startsWith('http')) {
        return callbackUrl;
    }

    if (callbackUrl.startsWith('/')) {
        return `${config.baseUrl}${callbackUrl}`;
    }

    return `${config.baseUrl}/identityprovider/${callbackUrl}`;
}

/**
 * Execute the complete QFlow logout flow.
 *
 * Flow:
 * 1. Call /connect/endsession with id_token_hint.
 * 2. Follow the redirect to Account/Logout.
 * 3. Extract endSessionId from the logout response.
 * 4. Call the final end-session callback.
 *
 * @param {string} [idToken] - ID token obtained during authentication.
 * @returns {boolean} True when logout completes successfully.
 */
export function executeLogout(idToken) {
    console.log('LOGOUT FLOW START');
    console.log('========================================');

    const effectiveIdToken =
        idToken || getIdToken();

    if (!effectiveIdToken) {
        throw new Error('ID Token is required for logout.');
    }

    const postLogoutRedirectUri =
        `${config.baseUrl}/identityprovider`;

    const endSessionUrl =
        `${config.baseUrl}/identityprovider/connect/endsession` +
        `?id_token_hint=${encodeURIComponent(effectiveIdToken)}` +
        `&post_logout_redirect_uri=${encodeURIComponent(
            postLogoutRedirectUri
        )}`;

    console.log('STEP 1: Calling /connect/endsession');
    console.log(`End-session URL: ${endSessionUrl}`);

    const endSessionResponse = http.get(
        endSessionUrl,
        {
            redirects: 0,
        }
    );

    console.log(
        `End-session status: ${endSessionResponse.status}`
    );

    const logoutLocation =
        endSessionResponse.headers.Location;

    console.log(
        `Logout Location: ${logoutLocation || 'N/A'}`
    );

    check(endSessionResponse, {
        'End-session returns 302': (response) =>
            response.status === 302,
        'Logout Location found': () =>
            Boolean(logoutLocation),
    });

    if (!logoutLocation) {
        throw new Error(
            'Logout redirect Location was not found.'
        );
    }

    const logoutUrl =
        logoutLocation.startsWith('http')
            ? logoutLocation
            : `${config.baseUrl}${logoutLocation}`;

    console.log('STEP 2: Calling /Account/Logout');
    console.log(`Account/Logout URL: ${logoutUrl}`);

    const logoutResponse = http.get(
        logoutUrl,
        {
            redirects: 0,
        }
    );

    console.log(
        `Account/Logout response status: ${logoutResponse.status}`
    );

    check(logoutResponse, {
        'Account/Logout returns 200': (response) =>
            response.status === 200,
    });

    console.log(
        `Account/Logout response size: ${logoutResponse.body.length}`
    );

    const callbackHint =
        logoutResponse.headers.Location ||
        logoutResponse.url ||
        '';

    const callbackUrlFromBody =
        extractCallbackUrl(logoutResponse.body);

    const endSessionId =
        extractEndSessionId(callbackHint) ||
        extractEndSessionId(callbackUrlFromBody) ||
        extractEndSessionId(logoutResponse.body);

    console.log(
        `endSessionId found: ${Boolean(endSessionId)}`
    );

    if (!endSessionId) {
        const bodyPreview =
            logoutResponse.body
                .replace(/\s+/g, ' ')
                .slice(0, 1200);

        console.log(
            `Account/Logout preview: ${bodyPreview}`
        );

        throw new Error(
            'endSessionId was not found in Account/Logout response.'
        );
    }

    console.log(
        'STEP 3: Calling /connect/endsession/callback'
    );

    const callbackUrl =
        callbackUrlFromBody
            ? toAbsoluteCallbackUrl(callbackUrlFromBody)
            : `${config.baseUrl}/identityprovider/connect/endsession/callback` +
              `?endSessionId=${encodeURIComponent(endSessionId)}`;

    console.log(`Callback URL: ${callbackUrl}`);

    const callbackResponse = http.get(
        callbackUrl
    );

    console.log(
        `Logout callback status: ${callbackResponse.status}`
    );

    check(callbackResponse, {
        'Logout callback returns 200': (response) =>
            response.status === 200,
    });

    console.log('LOGOUT FLOW COMPLETED');
    console.log('========================================');

    return callbackResponse.status === 200;
}
