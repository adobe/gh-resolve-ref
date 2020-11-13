# Resolve GitHub Reference

> Resolves a refrence (a branch or tag name) of a GitHub repository to the SHA-1 of the corresponding commit.

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/gh-resolve-ref.svg)](https://codecov.io/gh/adobe/gh-resolve-ref)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/gh-resolve-ref.svg)](https://circleci.com/gh/adobe/gh-resolve-ref)
[![GitHub license](https://img.shields.io/github/license/adobe/gh-resolve-ref.svg)](https://github.com/adobe/gh-resolve-ref/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/gh-resolve-ref.svg)](https://github.com/adobe/gh-resolve-ref/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/gh-resolve-ref.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/gh-resolve-ref)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Installation

```bash
$ npm install @adobe/gh-resolve-ref
```

## Usage

See the [API documentation](docs/API.md).

### Code examples

```js
const { resolve, ResolveError } = require('@adobe/gh-resolve-ref');

const owner = 'adobe';
const repo = 'gh-resolve-ref';
let ref;

let result;

(async () => {
  // resolving an existing ref returns { sha, fqRef }
  ref = 'main'; // 'main' branch
  result = await resolve({ owner, repo, ref });
  console.log(`${owner}/${repo} ref: ${ref} => sha: ${result.sha}, fqRef: ${result.fqRef}`);
  // => adobe/gh-resolve-ref ref: main => sha: 6374...8c26, fqRef: refs/heads/main


  // resolving an unkown ref returns null
  ref = 'doesnotexist'; // non-existing branch or tag
  result = await resolve({ owner, repo, ref });
  if (!result) {
    console.log(`${owner}/${repo} ref: ${ref} => not found`);
    // => adobe/gh-resolve-ref ref: doesnotexist => not found
  }

  // if no ref is specified: ref defaults to the default branch
  result = await resolve({ owner, repo });
  console.log(`${owner}/${repo} => default branch: ${result.fqRef}, HEAD: ${result.sha}`);
  // => adobe/gh-resolve-ref => default branch: refs/heads/main, HEAD: 6374...8c26


  try {
    // calling without owner or repo -> TypeError
    result = await resolve({ owner, ref: 'main' });
  } catch (err) {
    console.log(err);
    // => TypeError: owner and repo are mandatory parameters
  }

  try {
    // in case of a GitHub error -> ResolveError
    result = await resolve({ owner, repo: 'unknown', ref: 'main' });
  } catch (err) {
    if (err instanceof ResolveError) {
      console.log(`${err.name}: ${err.message}, statusCode: ${err.statusCode}`);
      // => ResolveError: repository not found: adobe/unknown, statusCode: 404
    }
  }
})();
```


## Development

### Build

```bash
$ npm install
```

### Test

```bash
$ npm test
```

### Lint

```bash
$ npm run lint
```
