import http from 'k6/http';
import { check } from 'k6';

import {
    getUserForVU,
    getUserPassword,
} from '../../utils/test-data.js';

import { environments } from '../../config/environments.js';

import { authorize } from './authorize.js';

import {
    getLocation,
    followAuthorizationCallback,
    extractAuthorizationCode,
    exchangeCodeForToken,
    extractTokens,
} from './token.js';

import {
    setToken,
    setIdToken,
    hasToken,
} from '../../utils/auth.js';

import { Trend } from 'k6/metrics';

const env = __ENV.ENV || 'dev';
const config = environments[env];

const user =
    getUserForVU();

const username =
    user.username;

const password =
    getUserPassword(user);

export const loginDuration = new Trend(
    'login_duration'
);

/**
 * Open the Identity Provider login page.
 *
 * @param {string} loginUrl - Login URL from authorization response.
 * @returns {object} Login page response.
 */
export function openLoginPage(loginUrl) {
    const response = http.get(loginUrl, {
        redirects: 0,
    });

    check(response, {
        'Login page returns 200': (r) =>
            r.status === 200,
    });

    return response;
}

/**
 * Extract the ASP.NET Request Verification Token
 * from the login page HTML.
 *
 * @param {string} html - Login page HTML.
 * @returns {string|null} Verification token.
 */
export function extractRequestVerificationToken(html) {
    const inputRegex =
        /<input\b[^>]*name=["']__RequestVerificationToken["'][^>]*>/i;

    const inputMatch = html.match(inputRegex);

    if (!inputMatch) {
        return null;
    }

    const valueRegex =
        /value=["']([^"']+)["']/i;

    const valueMatch =
        inputMatch[0].match(valueRegex);

    return valueMatch
        ? valueMatch[1]
        : null;
}

/**
 * Extract the ReturnUrl from the Identity Provider login URL.
 *
 * @param {string} loginUrl - Login page URL.
 * @returns {string} Decoded ReturnUrl.
 */
export function extractReturnUrl(loginUrl) {
    const match =
        loginUrl.match(/[?&]ReturnUrl=([^&]+)/i);

    if (!match) {
        throw new Error(
            'ReturnUrl was not found in login URL.'
        );
    }

    return decodeURIComponent(match[1]);
}

/**
 * Submit username and password to the Identity Provider.
 *
 * @param {string} returnUrl - OAuth ReturnUrl.
 * @param {string} requestVerificationToken - CSRF token.
 * @returns {object} Login response.
 */
export function submitLogin(
    returnUrl,
    requestVerificationToken
) {
    const url = `${config.baseUrl}/identityprovider/Account/Login`;

    if (!username) {
        throw new Error(
            'USERNAME environment variable is not set.'
        );
    }

    if (!password) {
        throw new Error(
            'PASSWORD environment variable is not set.'
        );
    }

    const payload = {
        ReturnUrl: returnUrl,
        Username: username,
        Password: password,
        LanguageValue: '1',
        button: 'login',
        __RequestVerificationToken:
            requestVerificationToken,
        RememberLogin: 'false',
    };

    const response = http.post(url, payload, {
        headers: {
            'Content-Type':
                'application/x-www-form-urlencoded',

            Accept:
                'text/html,application/xhtml+xml,application/xml',
        },

        // VERY IMPORTANT.
        // Do not automatically follow the redirect yet.
        redirects: 0,
    });

    check(response, {
        'Login request returns expected response': (r) =>
            r.status === 200 ||
            r.status === 302 ||
            r.status === 303,
    });

    return response;
}

/**
 * Execute the complete QFlow login flow.
 *
 * Flow:
 * 1. Start authorization.
 * 2. Open login page.
 * 3. Extract Request Verification Token.
 * 4. Extract ReturnUrl.
 * 5. Submit credentials.
 * 6. Follow authorization callback.
 * 7. Extract authorization code.
 * 8. Exchange authorization code for tokens.
 * 9. Store access token and ID token.
 *
 * @returns {object} Authentication result containing access token and ID token.
 */
export function executeLogin() {

    console.log('========================================');
    console.log('LOGIN FLOW START');
    console.log('========================================');

    const startTime = Date.now();

    // Step 1: Start authorization.
    const authorization = authorize();

    const loginUrl =
        authorization.response.headers['Location'];

    if (!loginUrl) {
        throw new Error(
            'Authorization did not return a login URL.'
        );
    }

    console.log(
        `Login URL received: ${loginUrl}`
    );

    // Step 2: Open login page.
    const loginPage =
        openLoginPage(loginUrl);

    // Step 3: Extract Request Verification Token.
    const requestVerificationToken =
        extractRequestVerificationToken(
            loginPage.body
        );

    check(null, {
        'Request Verification Token found':
            () => Boolean(requestVerificationToken),
    });

    if (!requestVerificationToken) {
        throw new Error(
            'Request Verification Token was not found.'
        );
    }

    console.log(
        'Request Verification Token extracted.'
    );

    // Step 4: Extract ReturnUrl.
    const returnUrl =
        extractReturnUrl(loginUrl);

    console.log(
        `ReturnUrl: ${returnUrl}`
    );

    // Step 5: Submit credentials.
    const loginResponse =
        submitLogin(
            returnUrl,
            requestVerificationToken
        );

    console.log(
        `Login response status: ${loginResponse.status}`
    );

    console.log(
        `Login response URL: ${loginResponse.url}`
    );

    check(loginResponse, {
        'Login request completed':
            (r) =>
                r.status === 302 ||
                r.status === 303,
    });

    // Step 6: Get authorization callback URL.
    const authorizationCallbackUrl =
        getLocation(loginResponse);

    console.log(
        `Authorization callback URL: ${authorizationCallbackUrl}`
    );

    // Step 7: Follow authorization callback.
    const authorizationCallbackResponse =
        followAuthorizationCallback(
            authorizationCallbackUrl
        );

    // Step 8: Extract authorization code.
    const authorizationCode =
        extractAuthorizationCode(
            authorizationCallbackResponse
        );

    console.log(
        'Authorization code extracted successfully.'
    );

    // Step 9: Exchange authorization code for tokens.
    const tokenResponse =
        exchangeCodeForToken(
            authorizationCode.code,
            authorization.codeVerifier
        );

    const {
        accessToken,
        idToken,
    } = extractTokens(tokenResponse);

    // Step 10: Store authentication tokens.
    setToken(accessToken);
    setIdToken(idToken);

    check(null, {
        'Access token is stored': () =>
            hasToken(),
    });

    console.log(
        `Access Token stored: ${Boolean(accessToken)}`
    );

    console.log(
        `ID Token stored: ${Boolean(idToken)}`
    );

    const duration = Date.now() - startTime;

    loginDuration.add(duration);

    console.log(
        `Login flow duration: ${duration} ms`
    );

    console.log('LOGIN FLOW COMPLETED');
    console.log('========================================');

    return {
        accessToken,
        idToken,
    };
}