export const ATTEMPT_TIMEOUT_QUEUE = 'attempt-timeout';
export const TIMEOUT_ATTEMPT_JOB = 'timeout-attempt';

export interface AttemptTimeoutJobData {
  attemptId: string;
}
