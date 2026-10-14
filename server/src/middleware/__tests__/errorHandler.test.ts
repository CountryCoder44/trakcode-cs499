import { z } from 'zod';
import { Response } from 'express';
import { errorHandler } from '../errorHandler';
import { AppError, NotFoundError } from '../../errors/AppError';

function fakeRes(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('errorHandler', () => {
  it('maps a ZodError to 400 with field-level details', () => {
    const res = fakeRes();
    const schema = z.object({ email: z.string().email() });
    const zodErr = schema.safeParse({ email: 'not-an-email' }).error!;

    errorHandler(zodErr, {} as never, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Validation failed' }));
  });

  it('maps an AppError subclass to its own statusCode and message', () => {
    const res = fakeRes();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(new NotFoundError('Problem not found for this tutor session'), {} as never, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Problem not found for this tutor session' });
    consoleSpy.mockRestore();
  });

  it('includes AppError.details when present', () => {
    const res = fakeRes();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(new AppError('bad thing', 422, { field: 'x' }), {} as never, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: 'bad thing', details: { field: 'x' } });
    consoleSpy.mockRestore();
  });

  it('gives a known Mongo duplicate-key field a friendly message', () => {
    const res = fakeRes();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mongoErr = { code: 11000, keyValue: { 'profile.slug': 'ryan' } };

    errorHandler(mongoErr, {} as never, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'That profile link is already taken. Try another one.' });
    consoleSpy.mockRestore();
  });

  it('falls back to a generic message for an unrecognized duplicate-key field', () => {
    const res = fakeRes();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mongoErr = { code: 11000, keyValue: { someOtherField: 'x' } };

    errorHandler(mongoErr, {} as never, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'A record with that value already exists' });
    consoleSpy.mockRestore();
  });

  // These two need `isProduction`/`isCapstoneSubmission` set differently than
  // this process's real env — jest.isolateModules gives errorHandler.ts (and
  // only errorHandler.ts, required fresh inside the callback) a private
  // module registry for just this one test, so it picks up the mocked
  // ../../config/env without affecting any other test in this file. Using
  // require() here deliberately, not the top-level `import`, is what makes
  // the isolation actually take effect.
  it('falls back to a plain 500 for an unrecognized error, hiding the stack in production', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.isolateModules(() => {
      jest.doMock('../../config/env', () => ({ isProduction: true, isCapstoneSubmission: false }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { errorHandler: isolatedHandler } = require('../errorHandler');
      const res = fakeRes();

      isolatedHandler(new Error('something broke'), {} as never, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      const payload = (res.json as jest.Mock).mock.calls[0][0];
      expect(payload.error).toBe('something broke');
      expect(payload.stack).toBeUndefined();
    });
    consoleSpy.mockRestore();
  });

  it('includes the stack outside production/capstone-submission', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.isolateModules(() => {
      jest.doMock('../../config/env', () => ({ isProduction: false, isCapstoneSubmission: false }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { errorHandler: isolatedHandler } = require('../errorHandler');
      const res = fakeRes();

      isolatedHandler(new Error('dev-mode error'), {} as never, res, jest.fn());

      const payload = (res.json as jest.Mock).mock.calls[0][0];
      expect(payload.stack).toBeDefined();
    });
    consoleSpy.mockRestore();
  });
});
