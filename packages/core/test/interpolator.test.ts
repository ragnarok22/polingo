import { describe, it, expect } from 'vitest';
import { interpolate } from '../src/interpolator';

describe('interpolate', () => {
  it('should interpolate single variable', () => {
    const result = interpolate('Hello, {name}!', { name: 'Juan' });
    expect(result).toBe('Hello, Juan!');
  });

  it('should interpolate multiple variables', () => {
    const result = interpolate('Hello, {firstName} {lastName}!', {
      firstName: 'John',
      lastName: 'Doe',
    });
    expect(result).toBe('Hello, John Doe!');
  });

  it('should handle numeric variables', () => {
    const result = interpolate('You have {count} messages', { count: 5 });
    expect(result).toBe('You have 5 messages');
  });

  it('should handle zero as a valid number', () => {
    const result = interpolate('You have {count} messages', { count: 0 });
    expect(result).toBe('You have 0 messages');
  });

  it('should leave undefined variables as is', () => {
    const result = interpolate('Hello, {name}!', {});
    expect(result).toBe('Hello, {name}!');
  });

  it('should handle partial variables', () => {
    const result = interpolate('Hello, {name} from {city}!', { name: 'Juan' });
    expect(result).toBe('Hello, Juan from {city}!');
  });

  it('should return original text when no variables provided', () => {
    const result = interpolate('Hello, world!');
    expect(result).toBe('Hello, world!');
  });

  it('should return original text when empty variables object', () => {
    const result = interpolate('Hello, {name}!', {});
    expect(result).toBe('Hello, {name}!');
  });

  it('should handle text without placeholders', () => {
    const result = interpolate('Hello, world!', { name: 'Juan' });
    expect(result).toBe('Hello, world!');
  });

  it('should handle multiple occurrences of same variable', () => {
    const result = interpolate('{name} says: Hello, {name}!', { name: 'Juan' });
    expect(result).toBe('Juan says: Hello, Juan!');
  });

  it('should handle empty string values', () => {
    const result = interpolate('Hello, {name}!', { name: '' });
    expect(result).toBe('Hello, !');
  });

  it('should handle complex placeholders with underscores', () => {
    const result = interpolate('User {user_id} logged in', { user_id: 123 });
    expect(result).toBe('User 123 logged in');
  });

  it('should not interpolate malformed placeholders', () => {
    const result = interpolate('Hello, {name!', { name: 'Juan' });
    expect(result).toBe('Hello, {name!');
  });
});
