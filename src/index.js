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
/* eslint-disable max-classes-per-file */

'use strict';

const https = require('https');

const DEFAULT_BRANCH_RE = /symref=HEAD:(\S+)/;

/**
 * ResolveError is thrown if the request to `github.com` failed with an HTTP error status.
 */
class ResolveError extends Error {
  /**
   * @constructor
   * @param {string} message error message
   * @param {number} statusCode HTTP status code
   */
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
  }

  get name() {
    return this.constructor.name;
  }

  toString() {
    return `${super.toString()} (statusCode: ${this.statusCode})`;
  }
}

/**
 * NetworkError is thrown if the request to `github.com` failed due to a network error.
 */
class NetworkError extends Error {
  /**
   * @constructor
   * @param {string} message error message
   * @param {Error} err underlying error
   */
  constructor(message, err) {
    super(`${message}: ${err.message}`);
    this.err = err;
  }

  get name() {
    return this.constructor.name;
  }

  toString() {
    return `${super.toString()} ${this.err}`;
  }
}

/**
 * @typedef Result
 * @property {string} sha the SHA-1 of the commit at `ref`
 * @property {string} fqRef the fully qualified name of `ref`
 *                          (e.g. `refs/heads/<branch>` or `refs/tags/<tag>`)
 */

/**
 * @typedef Params
 * @param {string} owner GitHub organization or user
 * @param {string} repo GitHub repository name
 * @param {string} [ref=<default branch>] git reference (branch or tag name)
 * @param {string} [token] GitHub access token (only required if the specified
 *                         repository is private).
 */

/**
 * Resolves the specified reference to the SHA-1 of the commit at `ref`:
 * - If `ref` denotes a branch the SHA-1 of the last (i.e. HEAD) commit at `ref` is returned.
 * - If `ref` denotes a tag the SHA-1 of the specific commit referred to by `ref` is returned.
 *
 * If the specified repository is private you have to provide a valid GitHub access token.
 *
 * @name resolve
 * @param {Params} params
 * @returns {Promise<Result|null>} Promise resolving to result with `sha` and `fqRef`
 *                                 or `null` if the `ref` was not found.
 * @throws {TypeError} if `owner` and/or `repo` have not been specified.
 * @throws {ResolveError} if the request to `github.com` failed with an HTTP error status.
 * @throws {NetworkError} if the request to `github.com` failed due to a network error.
 */
function resolveRef({
  owner,
  repo,
  ref,
  token,
} = {}) {
  return new Promise((resolve, reject) => {
    if (!owner || !repo) {
      reject(new TypeError('owner and repo are mandatory parameters'));
      return;
    }

    const options = {
      host: 'github.com',
      path: `/${owner}/${repo}.git/info/refs?service=git-upload-pack`,
    };
    if (token) {
      // the git transfer protocol supports basic auth with any user name and the token as password
      options.auth = `any_user:${token}`;
    }

    https.get(options, (res) => {
      const { statusCode, statusMessage } = res;
      if (statusCode !== 200) {
        // consume response data to free up memory
        res.resume();
        if ((statusCode === 401 && !token)
          || (statusCode === 404)) {
          reject(new ResolveError(`repository not found: ${owner}/${repo}`, 404));
          return;
        }
        reject(new ResolveError(
          `failed to fetch git repo info (statusCode: ${statusCode}, statusMessage: ${statusMessage})`,
          statusCode,
        ));
        return;
      }
      res.setEncoding('utf8');
      const searchTerms = [];
      if (ref) {
        if (ref.startsWith('refs/')) {
          // full ref name (e.g. 'refs/tags/v0.1.2')
          searchTerms.push(ref);
        } else {
          // short ref name, potentially ambiguous (e.g. 'main', 'v0.1.2')
          searchTerms.push(`refs/heads/${ref}`);
          searchTerms.push(`refs/tags/${ref}`);
        }
      }
      let resolved = false;
      let truncatedLine = '';
      // header consists of the first 2 lines in the payload
      const header = [];
      let processedHeader = false;
      const dataHandler = (chunk) => {
        const data = truncatedLine + chunk;
        const lines = data.split('\n');
        // remember last (truncated) line; will be '' if chunk ends with '\n'
        truncatedLine = lines.pop();
        while (header.length < 2 && lines.length) {
          header.push(lines.shift());
        }
        /* istanbul ignore if */
        if (header.length < 2) {
          // need to read past initial 2 header lines
          // wait for next chunk
          return;
        }
        /* istanbul ignore else */
        if (!processedHeader) {
          // need to do this only once
          processedHeader = true;
          if (!ref) {
            // extract default branch from 2nd header line
            searchTerms.push(header[1].match(DEFAULT_BRANCH_RE)[1]);
          }
        }
        const result = lines.filter((row) => {
          const parts = row.split(' ');
          return parts.length === 2 && searchTerms.includes(parts[1]);
        }).map((row) => row.substr(4).split(' ')); // skip leading pkt-len (4 bytes) (https://git-scm.com/docs/protocol-common#_pkt_line_format)
        if (result.length) {
          resolve({
            sha: result[0][0],
            fqRef: result[0][1],
          });
          resolved = true;
          res.off('data', dataHandler);
        }
      };
      res.on('data', dataHandler);
      res.on('end', () => {
        if (!resolved) {
          // ref not found
          resolve(null);
        }
      });
    }).on('error', (err) => {
      // (temporary?) network issue
      reject(new NetworkError(
        `failed to fetch git repo info:\n${String(err.stack)}`,
        err,
      ));
    });
  });
}

module.exports = { resolve: resolveRef, ResolveError, NetworkError };
