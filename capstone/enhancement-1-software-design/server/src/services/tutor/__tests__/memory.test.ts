import { isPureAcknowledgment } from '../memory';

describe('isPureAcknowledgment', () => {
  it.each(['ok', 'OK', ' ok ', 'okay', 'thanks', 'Thanks!', "let's go", "let's go!", 'sounds good.'])(
    'treats %j as pure filler',
    (message) => {
      expect(isPureAcknowledgment(message)).toBe(true);
    }
  );

  it.each([
    'I love React',
    'ok but why does this fail on line 3',
    'I want to switch careers into backend development',
    '',
    'okie dokie', // close to filler, but not an exact match — must not be silently skipped
  ])('does not treat %j as filler', (message) => {
    expect(isPureAcknowledgment(message)).toBe(false);
  });
});
