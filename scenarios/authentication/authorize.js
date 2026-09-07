import http from 'k6/http';
import { check } from 'k6';

import { environments } from '../../config/environments.js';

import {
    generateCodeVerifier,
    generateCodeChallenge,
    generateState,
} from '../../utils/pkce.js';

const env = __ENV.ENV || 'dev';
const config = environments[env];

/**
 * Start the QFlow OpenID Connect authorization flow.
 *
 * Generates dynamic PKCE values and sends the authorization
 * request with the required query parameters.
 *
 * @returns {object} Authorization response and PKCE context.
 */
export function authorize() {

    // Generate PKCE values.
    const codeVerifier = generateCodeVerifier();

    const codeChallenge =
        generateCodeChallenge(codeVerifier);

    // Generate OAuth state.
    const state = generateState();

    // Build authorization endpoint.
    const authorizationUrl =
        `${config.baseUrl}/identityprovider/connect/authorize`;

    // Build query string.
    const query =
        `client_id=${encodeURIComponent(config.clientId)}` +
        `&redirect_uri=${encodeURIComponent(config.redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(config.scope)}` +
        `&state=${encodeURIComponent(state)}` +
        `&code_challenge=${encodeURIComponent(codeChallenge)}` +
        `&code_challenge_method=S256` +
        `&response_mode=query` +
        `&client=${encodeURIComponent(config.clientId)}`;

    // Build the complete authorization URL.
    const url =
        `${authorizationUrl}?${query}`;

    console.log(`Authorization URL: ${url}`);

    // Send authorization request.
    //
    // redirects: 0 is important because we need to
    // capture the Location header ourselves.
    const response = http.get(url, {
        redirects: 0,
    });

    console.log(
        `Authorization status: ${response.status}`
    );

    console.log(
        `Authorization Location: ${
            response.headers['Location'] || 'N/A'
        }`
    );

    check(response, {
        'Authorization returns redirect': (r) =>
            r.status === 302 ||
            r.status === 303,
    });

    return {
        response,
        codeVerifier,
        codeChallenge,
        state,
    };
}