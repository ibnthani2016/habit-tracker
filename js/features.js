/**
 * Feature flags for habit tracker.
 * Stored in localStorage so they survive reloads.
 * For a static site with no backend, this is the simplest mechanism.
 *
 * To enable a flag in the browser console:
 *   localStorage.setItem('ht:flag:ENABLE_ADD_HABIT', 'true')
 *   location.reload()
 *
 * To disable:
 *   localStorage.removeItem('ht:flag:ENABLE_ADD_HABIT')
 *   location.reload()
 */

const FLAG_PREFIX = 'ht:flag:';

export const FLAGS = {
  ENABLE_ADD_HABIT: 'ENABLE_ADD_HABIT',
};

/**
 * Check if a feature flag is enabled.
 * @param {string} flagName — one of FLAGS
 * @returns {boolean}
 */
export function isFeatureEnabled(flagName) {
  try {
    return localStorage.getItem(`${FLAG_PREFIX}${flagName}`) === 'true';
  } catch {
    return false;
  }
}

/**
 * Enable a feature flag.
 * @param {string} flagName
 */
export function enableFeature(flagName) {
  try {
    localStorage.setItem(`${FLAG_PREFIX}${flagName}`, 'true');
  } catch {
    // Quota exceeded or private browsing — silently fail
  }
}

/**
 * Disable a feature flag.
 * @param {string} flagName
 */
export function disableFeature(flagName) {
  try {
    localStorage.removeItem(`${FLAG_PREFIX}${flagName}`);
  } catch {
    // Ignore
  }
}
