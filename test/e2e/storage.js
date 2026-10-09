const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');

/**
 * End-to-end tests: a Carbone EE server loads this plugin and stores templates and renders in S3Mock.
 * Requires Docker, no Carbone license is needed.
 * Set KEEP_STACK=1 to leave the stack running after the tests.
 */

const CARBONE_PORT = process.env.CARBONE_PORT || '4201';
const S3MOCK_PORT = process.env.S3MOCK_PORT || '9190';
const carboneUrl = `http://127.0.0.1:${CARBONE_PORT}`;
const s3Url = `http://127.0.0.1:${S3MOCK_PORT}`;

const _templatesBucket = 'templates';
const _rendersBucket = 'renders';

const _template = 'Invoice {d.id} for {d.client}\n';
const _data = { id: 'INV-E2E-042', client: 'Acme Corp' };
const _expectedRender = 'Invoice INV-E2E-042 for Acme Corp\n';

function compose (...args) {
  return execFileSync('docker', ['compose', '-f', path.join(__dirname, 'compose.yml'), '-p', 'carbone-plugin-s3-e2e', ...args], {
    encoding: 'utf8',
    env: { ...process.env, CARBONE_PORT, S3MOCK_PORT },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry an async assertion, the plugin deletes some files without waiting for S3
 */
async function eventually (fn, timeoutMs = 5000) {
  const _end = Date.now() + timeoutMs;
  for (;;) {
    try {
      return await fn();
    }
    catch (e) {
      if (Date.now() > _end) {
        throw e;
      }
      await sleep(250);
    }
  }
}

async function listBucket (bucket) {
  const res = await fetch(`${s3Url}/${bucket}`);
  assert.strictEqual(res.status, 200);
  const _xml = await res.text();
  return [..._xml.matchAll(/<Key>([^<]*)<\/Key>/g)].map((m) => m[1]);
}

async function getObject (bucket, key) {
  const res = await fetch(`${s3Url}/${bucket}/${encodeURIComponent(key)}`);
  assert.strictEqual(res.status, 200, `${bucket}/${key} should exist in S3`);
  return res.text();
}

async function uploadTemplate (content, filename) {
  const _form = new FormData();
  _form.append('template', new Blob([content]), filename);
  const res = await fetch(`${carboneUrl}/template`, { method: 'POST', body: _form });
  const _body = await res.json();
  assert.strictEqual(_body.success, true, JSON.stringify(_body));
  return _body.data.templateId;
}

async function render (templateId, options = {}) {
  const res = await fetch(`${carboneUrl}/render/${templateId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: _data, convertTo: 'txt', ...options })
  });
  const _body = await res.json();
  assert.strictEqual(_body.success, true, JSON.stringify(_body));
  return _body.data.renderId;
}

async function downloadRender (renderId) {
  const res = await fetch(`${carboneUrl}/render/${renderId}`);
  return { status: res.status, body: await res.text() };
}

/**
 * Remove a file from the Carbone local cache, to force the plugin to download it from S3
 */
function removeFromLocalCache (dir, filename) {
  compose('exec', '-T', 'carbone', 'rm', '-f', `/app/${dir}/${filename}`);
}

describe('E2E - Carbone EE with the S3 plugin', function () {
  this.timeout(30000);

  let templateId = null;

  before(async function () {
    this.timeout(600000);
    /** The repository is mounted with its node_modules: they must match package.json */
    const _expectedVersion = require('../../package.json').dependencies['tiny-storage-client'].replace(/^=/, '');
    const _installedVersion = require('tiny-storage-client/package.json').version;
    if (_installedVersion !== _expectedVersion) {
      throw new Error(`tiny-storage-client ${_installedVersion} is installed instead of ${_expectedVersion}, run "npm ci"`);
    }
    /** The plugin checks the buckets at startup: S3Mock must be listening before Carbone starts */
    compose('up', '-d', '--quiet-pull', 's3mock');
    await eventually(() => listBucket(_templatesBucket), 60000);
    compose('up', '-d', '--quiet-pull', 'carbone');
    for (let i = 0; i < 90; i++) {
      try {
        if ((await fetch(`${carboneUrl}/status`)).ok) {
          return;
        }
      }
      catch (e) {
        // not started yet
      }
      await sleep(1000);
    }
    throw new Error('Carbone server did not start\n' + compose('logs', 'carbone'));
  });

  afterEach(function () {
    if (this.currentTest.state === 'failed') {
      console.log(compose('logs', '--tail', '50', 'carbone'));
    }
  });

  after(function () {
    this.timeout(60000);
    if (!process.env.KEEP_STACK) {
      compose('down', '-v', '--remove-orphans');
    }
  });

  it('should connect to both buckets at startup', async function () {
    /** The bucket checks are asynchronous, the server can be up before they are logged */
    await eventually(async () => {
      const _logs = compose('logs', 'carbone');
      assert.strictEqual(_logs.includes(`Templates S3 Bucket Connected | ${_templatesBucket} | Status 200`), true, _logs);
      assert.strictEqual(_logs.includes(`Renders S3 Bucket Connected | ${_rendersBucket} | Status 200`), true, _logs);
    }, 10000);
  });

  it('should store an uploaded template in the templates bucket', async function () {
    templateId = await uploadTemplate(_template, 'invoice.txt');
    assert.strictEqual((await listBucket(_templatesBucket)).includes(templateId), true);
    assert.strictEqual(await getObject(_templatesBucket, templateId), _template);
  });

  it('should render a template which is only stored in S3', async function () {
    removeFromLocalCache('template', templateId);
    const _renderId = await render(templateId);
    const _res = await downloadRender(_renderId);
    assert.strictEqual(_res.status, 200);
    assert.strictEqual(_res.body, _expectedRender);
  });

  it('should store the render in the renders bucket and delete it once downloaded', async function () {
    const _renderId = await render(templateId);
    assert.strictEqual(await getObject(_rendersBucket, _renderId), _expectedRender);

    const _res = await downloadRender(_renderId);
    assert.strictEqual(_res.status, 200);
    assert.strictEqual(_res.body, _expectedRender);

    await eventually(async () => {
      assert.strictEqual((await listBucket(_rendersBucket)).includes(_renderId), false);
    });
  });

  it('should download a render from S3 when it is not in the local cache, then delete it from S3', async function () {
    const _renderId = await render(templateId);
    removeFromLocalCache('render', _renderId);

    const _res = await downloadRender(_renderId);
    assert.strictEqual(_res.status, 200);
    assert.strictEqual(_res.body, _expectedRender);
    assert.strictEqual((await listBucket(_rendersBucket)).includes(_renderId), false);
  });

  it('should download a render generated with a reportName when it is not in the local cache', async function () {
    const _renderId = await render(templateId, { reportName: 'invoice-{d.id}.txt' });
    removeFromLocalCache('render', _renderId);

    const _res = await downloadRender(_renderId);
    assert.strictEqual(_res.status, 200, _res.body);
    assert.strictEqual(_res.body, _expectedRender);
  });

  it('should delete the template from the templates bucket', async function () {
    const res = await fetch(`${carboneUrl}/template/${templateId}`, { method: 'DELETE' });
    assert.strictEqual(res.status, 200);
    await eventually(async () => {
      assert.strictEqual((await listBucket(_templatesBucket)).includes(templateId), false);
    });

    const _renderRes = await fetch(`${carboneUrl}/render/${templateId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: _data, convertTo: 'txt' })
    });
    assert.strictEqual((await _renderRes.json()).success, false);
  });
});
