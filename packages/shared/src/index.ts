/**
 * @leadarrow/shared — domain types shared across the API, web dashboard,
 * and Chrome extension. Keep this package free of runtime dependencies.
 */

export * from './enums';
export * from './events';

/** App-wide constants referenced by multiple packages. */
export const APP_NAME = 'LeadArrow';

/** Default trial length, in days, for new company sign-ups. */
export const DEFAULT_TRIAL_DAYS = 30;

/**
 * A rep is considered "busy on a call" only once they've been connected for
 * longer than this many seconds — used by routing eligibility checks.
 */
export const ACTIVE_CALL_THRESHOLD_SECONDS = 30;
