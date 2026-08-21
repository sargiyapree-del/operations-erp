import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app.js';

describe('API Health Check', () => {
  it('GET /api/health should return 200', async () => {
    const response = await request(app)
      .get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});

describe('404 Handling', () => {
  it('should return 404 for an unknown route', async () => {
    const response = await request(app)
      .get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Route not found.');
  });
});
