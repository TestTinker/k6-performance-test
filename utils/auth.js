let accessToken = null;
let idToken = null;


/**
 * Store the access token for the current k6 VU.
 *
 * @param {string} token - Access token.
 */
export function setToken(token) {
    accessToken = token;
}


/**
 * Store the ID token for the current k6 VU.
 *
 * @param {string} token - ID token.
 */
export function setIdToken(token) {
    idToken = token;
}


/**
 * Get the access token for the current k6 VU.
 *
 * @returns {string|null} Access token.
 */
export function getToken() {
    return accessToken;
}


/**
 * Get the ID token for the current k6 VU.
 *
 * @returns {string|null} ID token.
 */
export function getIdToken() {
    return idToken;
}


/**
 * Check whether an access token is available.
 *
 * @returns {boolean} True when token exists.
 */
export function hasToken() {
    return Boolean(accessToken);
}


/**
 * Return authorization headers using the current access token.
 *
 * @returns {object} HTTP authorization headers.
 */
export function getAuthHeaders() {

    if (!accessToken) {

        throw new Error(
            'Access token is not available.'
        );
    }

    return {
        Authorization:
            `Bearer ${accessToken}`,
    };
}


/**
 * Clear the stored access token and ID token.
 */
export function clearToken() {
    accessToken = null;
    idToken = null;
}