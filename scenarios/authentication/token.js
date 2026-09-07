import http from 'k6/http';
import { check } from 'k6';

import { environments } from '../../config/environments.js';

const env = __ENV.ENV || 'dev';
const config = environments[env];

/**
 * Get the Location header from an HTTP response.
 *
 * Handles both string and array header values.
 *
 * @param {object} response - HTTP response.
 * @returns {string} Redirect location.
 */
export function getLocation(response) {
    const locationHeader =
        response.headers['Location'];

    if (!locationHeader) {
        throw new Error(
            'Response does not contain Location header.'
        );
    }

    return Array.isArray(locationHeader)
        ? locationHeader[0]
        : locationHeader;
}

/**
 * Follow the Identity Provider authorization callback.
 *
 * The login response redirects to the Identity Provider
 * authorization callback. This request then redirects
 * to the QFlow application callback URL containing
 * the authorization code.
 *
 * @param {string} callbackUrl - Authorization callback URL.
 * @returns {object} Authorization callback response.
 */
export function followAuthorizationCallback(callbackUrl) {

    const absoluteUrl =
        callbackUrl.startsWith('http')
            ? callbackUrl
            : `${config.baseUrl}${callbackUrl}`;

    console.log(
        `Following authorization callback: ${absoluteUrl}`
    );

    const response = http.get(
        absoluteUrl,
        {
            redirects: 0,
        }
    );

    console.log(
        `Authorization callback status: ${response.status}`
    );

    console.log(
        `Authorization callback Location: ${
            response.headers['Location'] || 'N/A'
        }`
    );

    check(response, {
        'Authorization callback returns redirect':
            (r) =>
                r.status === 302 ||
                r.status === 303,
    });

    return response;
}

/**
 * Extract the authorization code from the application
 * callback redirect.
 *
 * @param {object} response - Authorization callback response.
 * @returns {object} Authorization code and state.
 */
export function extractAuthorizationCode(response) {

    const location =
        getLocation(response);

    console.log(
        `Application callback Location: ${location}`
    );

    const codeMatch =
        location.match(/[?&]code=([^&]+)/i);

    const stateMatch =
        location.match(/[?&]state=([^&]+)/i);

    if (!codeMatch) {
        throw new Error(
            'Authorization code was not found in application callback.'
        );
    }

    return {
        code: decodeURIComponent(codeMatch[1]),

        state: stateMatch
            ? decodeURIComponent(stateMatch[1])
            : null,
    };
}

/**
 * Exchange the authorization code for an access token.
 *
 * Uses the same PKCE code_verifier generated during
 * the authorization request.
 *
 * @param {string} code - Authorization code.
 * @param {string} codeVerifier - PKCE code verifier.
 * @returns {object} Token endpoint response.
 */
export function exchangeCodeForToken(
    code,
    codeVerifier
) {

    const url =
        `${config.baseUrl}/identityprovider/connect/token`;

    const payload = {
        grant_type: 'authorization_code',

        redirect_uri: config.redirectUri,

        code: code,

        code_verifier: codeVerifier,

        client_id: config.clientId,
    };

    const response = http.post(
        url,
        payload,
        {
            headers: {
                'Content-Type':
                    'application/x-www-form-urlencoded',

                Accept: 'application/json',
            },
        }
    );

    console.log(
        `Token endpoint status: ${response.status}`
    );

    check(response, {
        'Token endpoint returns 200':
            (r) => r.status === 200,
    });

    return response;
}

/**
 * Extract authentication tokens from the token endpoint response.
 *
 * @param {object} response - Token endpoint response.
 * @returns {object} Access token and ID token.
 */
export function extractTokens(response) {

    const body = response.json();

    const accessToken =
        body.access_token;

    const idToken =
        body.id_token;

    check(body, {
        'Access token is returned':
            () => Boolean(accessToken),
    });

    if (!accessToken) {
        throw new Error(
            'Token endpoint returned an empty access_token.'
        );
    }

    console.log(
        `Access Token exists: ${Boolean(accessToken)}`
    );

    console.log(
        `ID Token exists: ${Boolean(idToken)}`
    );

    return {
        accessToken,
        idToken,
    };
}
