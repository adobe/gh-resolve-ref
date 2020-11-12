## Classes

<dl>
<dt><a href="#ResolveError">ResolveError</a></dt>
<dd><p>ResolveError is thrown if the request to <code>github.com</code> failed.</p>
</dd>
</dl>

## Members

<dl>
<dt><a href="#resolve">resolve</a> ⇒ <code>Promise.&lt;(Result|null)&gt;</code></dt>
<dd><p>Resolves the specified reference to the SHA-1 of the commit at <code>ref</code>:</p>
<ul>
<li>If <code>ref</code> denotes a branch the SHA-1 of the last (i.e. HEAD) commit at <code>ref</code> is returned.</li>
<li>If <code>ref</code> denotes a tag the SHA-1 of the specific commit referred to by <code>ref</code> is returned.</li>
</ul>
<p>If the specified repository is private you have to provide a valid GitHub access token.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#Result">Result</a></dt>
<dd></dd>
<dt><a href="#Params">Params</a></dt>
<dd></dd>
</dl>

<a name="ResolveError"></a>

## ResolveError
ResolveError is thrown if the request to `github.com` failed.

**Kind**: global class  
<a name="new_ResolveError_new"></a>

### new ResolveError(message, statusCode, [err])

| Param | Type | Description |
| --- | --- | --- |
| message | <code>string</code> | error message |
| statusCode | <code>number</code> | HTTP status code |
| [err] | <code>Error</code> | underlying error (optional) |

<a name="resolve"></a>

## resolve ⇒ <code>Promise.&lt;(Result\|null)&gt;</code>
Resolves the specified reference to the SHA-1 of the commit at `ref`:
- If `ref` denotes a branch the SHA-1 of the last (i.e. HEAD) commit at `ref` is returned.
- If `ref` denotes a tag the SHA-1 of the specific commit referred to by `ref` is returned.

If the specified repository is private you have to provide a valid GitHub access token.

**Kind**: global variable  
**Returns**: <code>Promise.&lt;(Result\|null)&gt;</code> - Promise resolving to result with `sha` and `fqRef`
                                or `null` if the `ref` was not found.  
**Throws**:

- <code>TypeError</code> if `owner` and/or `repo` have not been specified.
- [<code>ResolveError</code>](#ResolveError) if the request to `github.com` failed.


| Param | Type |
| --- | --- |
| params | [<code>Params</code>](#Params) | 

<a name="Result"></a>

## Result
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| sha | <code>string</code> | the SHA-1 of the commit at `ref` |
| fqRef | <code>string</code> | the fully qualified name of `ref`                          (e.g. `refs/heads/<branch>` or `refs/tags/<tag>`) |

<a name="Params"></a>

## Params
**Kind**: global typedef  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| owner | <code>string</code> |  | GitHub organization or user |
| repo | <code>string</code> |  | GitHub repository name |
| [ref] | <code>string</code> | <code>&quot;&lt;default branch&gt;&quot;</code> | git reference (branch or tag name) |
| [token] | <code>string</code> |  | GitHub access token (only required if the specified                         repository is private). |

