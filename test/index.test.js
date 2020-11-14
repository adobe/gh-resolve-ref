/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */
/* eslint-disable arrow-body-style */

'use strict';

const assert = require('assert');
const path = require('path');

const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const FSPersister = require('@pollyjs/persister-fs');
const { setupMocha: setupPolly } = require('@pollyjs/core');
const nock = require('nock');

const { resolve, ResolveError, NetworkError } = require('../src/index.js');

const OWNER = 'adobe';
const REPO = 'helix-resolve-git-ref';
const PRIVATE_REPO = 'project-helix';
const SHORT_REF = 'main';
const FULL_REF = 'refs/heads/main';

/**
 * Checks if the specified string is a valid SHA-1 value.
 *
 * @param {string} str
 * @returns {boolean} `true` if `str` represents a valid SHA-1, otherwise `false`
 */
function isValidSha(str) {
  if (typeof str === 'string' && str.length === 40) {
    const res = str.match(/[0-9a-f]/g);
    return res && res.length === 40;
  }
  return false;
}

describe('ResolveError Tests', () => {
  it('ResolveError extends Error', () => {
    const msg = 'error message';
    const err = new ResolveError(msg);
    assert(err instanceof Error);
    assert.strictEqual(err.message, msg);
  });

  it('ResolveError overrides name and toString()', () => {
    const msg = 'error message';
    const statusCode = 599;
    const err = new ResolveError(msg, statusCode);
    assert(err instanceof ResolveError);
    assert.strictEqual(err.name, 'ResolveError');
    assert.strictEqual(err.toString(), `ResolveError: ${msg} (statusCode: ${statusCode})`);
  });

  it('ResolveError has statusCode property', () => {
    const statusCode = 599;
    const err = new ResolveError('foo', statusCode);
    assert.strictEqual(err.statusCode, statusCode);
  });
});

describe('NetworkError Tests', () => {
  it('NetworkError extends Error', () => {
    const msg = 'error message';
    const baseErr = new Error('test');
    const err = new NetworkError(msg, baseErr);
    assert(err instanceof Error);
    assert.strictEqual(err.message, `${msg}: ${baseErr.message}`);
  });

  it('NetworkError overrides name and toString()', () => {
    const msg = 'error message';
    const baseErr = new Error('test');
    const err = new NetworkError(msg, baseErr);
    assert(err instanceof NetworkError);
    assert.strictEqual(err.name, 'NetworkError');
    assert.strictEqual(err.toString(), `NetworkError: ${msg}: ${baseErr.message} ${baseErr}`);
  });

  it('NetworkError has err property', () => {
    const baseErr = new Error();
    const err = new NetworkError('foo', baseErr);
    assert.strictEqual(err.err, baseErr);
  });
});

describe('resolve Tests', () => {
  setupPolly({
    recordFailedRequests: false,
    recordIfMissing: false,
    matchRequestsBy: {
      headers: {
        exclude: ['authorization', 'User-Agent'],
      },
    },
    logging: false,
    adapters: [NodeHttpAdapter],
    persister: FSPersister,
    persisterOptions: {
      fs: {
        recordingsDir: path.resolve(__dirname, 'fixtures/recordings'),
      },
    },
  });

  it('resolve function is present', () => {
    assert(typeof resolve === 'function');
  });

  it('resolve function rejects with TypeError when called with no arguments', () => {
    return resolve()
      .then(() => assert.fail('expected TypeError'))
      .catch((err) => assert(err instanceof TypeError));
  });

  it('resolve function rejects with TypeError for missing owner param', () => {
    return resolve({ repo: REPO, ref: SHORT_REF })
      .then(() => assert.fail('expected TypeError'))
      .catch((err) => assert(err instanceof TypeError));
  });

  it('resolve function rejects with TypeError for missing repo param', () => {
    return resolve({ owner: OWNER, ref: SHORT_REF })
      .then(() => assert.fail('expected TypeError'))
      .catch((err) => assert(err instanceof TypeError));
  });

  it('ref param is optional (fallback: default branch)', async () => {
    const { fqRef } = await resolve({ owner: OWNER, repo: REPO });
    assert.strictEqual(fqRef, 'refs/heads/main');
  });

  it('resolve function returns valid sha format', async () => {
    const { sha } = await resolve({ owner: OWNER, repo: REPO, ref: SHORT_REF });
    assert(isValidSha(sha));
  });

  it('resolve function supports short and full ref names', async () => {
    const { sha: sha1 } = await resolve({ owner: OWNER, repo: REPO, ref: SHORT_REF });
    const { sha: sha2 } = await resolve({ owner: OWNER, repo: REPO, ref: FULL_REF });
    assert.strictEqual(sha1, sha2);
  });

  it('resolve function resolves tag', async () => {
    const ref = 'v1.0.0';
    const { sha: sha1, fqRef } = await resolve({ owner: OWNER, repo: REPO, ref });
    assert.strictEqual(fqRef, `refs/tags/${ref}`);
    const { sha: sha2 } = await resolve({ owner: OWNER, repo: REPO, ref: `refs/tags/${ref}` });
    assert.strictEqual(sha1, sha2);
  });

  it('resolve function returns null for non-existing ref', async () => {
    const result = await resolve({ owner: OWNER, repo: REPO, ref: 'unknown' });
    assert(result === null);
  });

  it('resolve function rejects with ResolveError(statusCode: 404) for non-existing repo', async () => {
    return resolve({ owner: OWNER, repo: 'unknown', ref: SHORT_REF })
      .then(() => assert.fail('expected ResolveError'))
      .catch((err) => {
        assert(err instanceof ResolveError);
        assert.strictEqual(err.statusCode, 404);
      });
  });

  // eslint-disable-next-line func-names
  it('resolve function rejects with ResolveError and propagates status code for 5xx github server errors', async function () {
    const { server } = this.polly;
    server.host('https://github.com', () => {
      server.get('*').intercept((req, res) => {
        res.status(599);
      });
    });

    return resolve({ owner: OWNER, repo: REPO, ref: SHORT_REF })
      .then(() => assert.fail('expected ResolveError'))
      .catch((err) => {
        assert(err instanceof ResolveError);
        assert.strictEqual(err.statusCode, 599);
      });
  });

  it('resolve function works with private GitHub repo (gh token via param)', async () => {
    const { fqRef } = await resolve({
      owner: OWNER,
      repo: PRIVATE_REPO,
      ref: SHORT_REF,
      token: 'undisclosed-github-token',
    });
    assert.strictEqual(fqRef, FULL_REF);
  });
});

describe('network/server error tests', () => {
  it('resolve function rejects with ResolveError(statusCode: 500) for network errors', async () => {
    // nock is also used by PollyJS under the hood.
    // In order to avoid unwanted side effects we have to reset nock.
    nock.cleanAll();
    nock.restore();
    nock.activate();

    // simulate network problem
    nock.disableNetConnect();
    try {
      return resolve({ owner: OWNER, repo: REPO, ref: SHORT_REF })
        .then(() => assert.fail('expected ResolveError'))
        .catch((err) => {
          assert(err instanceof NetworkError);
        });
    } finally {
      nock.cleanAll();
      nock.enableNetConnect();
    }
  });
});
