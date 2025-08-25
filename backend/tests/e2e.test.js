const { test, expect } = require('vitest');
const { request } = require('@playwright/test');
const nock = require('nock');
const http = require('http');
const app = require('../server');

test('converts DWG to STL', async () => {
  process.env.APS_CLIENT_ID = 'id';
  process.env.APS_CLIENT_SECRET = 'secret';
  process.env.APS_BUCKET = 'bucket';

  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  nock('https://developer.api.autodesk.com')
    .post('/authentication/v1/authenticate')
    .reply(200, { access_token: 'token' })
    .get(/\/oss\/v2\/buckets\/[^/]+\/details/)
    .reply(200, {})
    .put(/\/oss\/v2\/buckets\/[^/]+\/objects\/.+/)
    .reply(200, {})
    .post('/modelderivative/v2/designdata/job')
    .reply(200, {})
    .get(/\/modelderivative\/v2\/designdata\/.*\/manifest/)
    .reply(200, { status: 'success', derivatives: [{ outputType: 'stl', children: [{ urn: 'deriv' }] }] });

  const ctx = await request.newContext();
  const response = await ctx.post(`http://localhost:${port}/api/convert`, {
    multipart: {
      file: { name: 'test.dwg', mimeType: 'application/acad', buffer: Buffer.from('dummy') },
      format: 'binary',
      unit: 'mm'
    }
  });
  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.url).toContain('/api/download/');
  await ctx.dispose();
  await new Promise((res) => server.close(res));
});
