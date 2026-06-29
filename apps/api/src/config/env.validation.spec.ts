import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('applies defaults when optional vars are absent', () => {
    const env = validateEnv({});
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000']);
  });

  it('parses CORS_ORIGINS into a trimmed list', () => {
    const env = validateEnv({ CORS_ORIGINS: 'http://a.com, http://b.com ' });
    expect(env.CORS_ORIGINS).toEqual(['http://a.com', 'http://b.com']);
  });

  it('coerces PORT from a string', () => {
    const env = validateEnv({ PORT: '5050' });
    expect(env.PORT).toBe(5050);
  });

  it('throws on an invalid NODE_ENV', () => {
    expect(() => validateEnv({ NODE_ENV: 'staging' })).toThrow(/Invalid environment configuration/);
  });
});
