import crypto from 'k6/crypto';
import encoding from 'k6/encoding';

/**
 * Generate a PKCE code verifier.
 *
 * @returns {string} Code verifier.
 */
export function generateCodeVerifier() {
    const randomBytes = crypto.randomBytes(32);

    return encoding.b64encode(
        randomBytes,
        'rawurl'
    );
}

/**
 * Generate a SHA-256 PKCE code challenge.
 *
 * @param {string} codeVerifier - Code verifier.
 * @returns {string} Code challenge.
 */
export function generateCodeChallenge(codeVerifier) {
    return crypto.sha256(
        codeVerifier,
        'base64rawurl'
    );
}

/**
 * Generate a unique OAuth state value.
 *
 * @returns {string} State value.
 */
export function generateState() {
    const randomBytes = crypto.randomBytes(16);

    return encoding.b64encode(
        randomBytes,
        'rawurl'
    );
}