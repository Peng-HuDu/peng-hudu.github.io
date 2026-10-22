/** Direct GitHub storage. Tokens stay in memory and are sent only to api.github.com. */
export class GitHubError extends Error {
  constructor(message, code = 0) { super(message); this.name = 'GitHubError'; this.code = code; }
}
export function decodeBase64UTF8(value) {
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(value.replace(/\s/g, '')), c => c.charCodeAt(0)));
}
export async function gitBlobSHA(text) {
  const body = new TextEncoder().encode(text);
  const prefix = new TextEncoder().encode(`blob ${body.length}\0`);
  const input = new Uint8Array(prefix.length + body.length); input.set(prefix); input.set(body, prefix.length);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', input)), b => b.toString(16).padStart(2, '0')).join('');
}
export class GitHubStore {
  #token = ''; #fetch; #verified = false;
  constructor(config, fetchImpl = globalThis.fetch.bind(globalThis)) {
    if (!/^[A-Za-z0-9-]+$/.test(config.owner) || !/^[A-Za-z0-9_.-]+$/.test(config.repo) || !/^[A-Za-z0-9_.-]+$/.test(config.branch)) throw new GitHubError('Invalid repository configuration.');
    this.config = Object.freeze({ ...config }); this.#fetch = fetchImpl;
    this.base = `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
  }
  get connected() { return this.#verified; }
  disconnect() { this.#token = ''; this.#verified = false; }
  async request(method, path, body) {
    // Never accept arbitrary URLs or forward credentials through redirects.
    if (!(path === '/user' || path === this.base || path.startsWith(this.base + '/'))) throw new GitHubError('Blocked API path.');
    const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10' };
    if (this.#token) headers.Authorization = `Bearer ${this.#token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 25000);
    let res;
    try {
      res = await this.#fetch('https://api.github.com' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal });
    } catch {
      throw new GitHubError('Network request could not be confirmed. Reload from GitHub before retrying a save; do not assume it failed.');
    } finally { clearTimeout(timer); }
    if (!res.ok) {
      const messages = {
        401: 'GitHub rejected the token. Reconnect with a valid, unexpired fine-grained token.',
        403: 'GitHub denied the request. Check token repository selection, Contents write permission, and API rate limits.',
        404: 'Repository, branch, or file was not found. Check the repository name and token access.',
        409: 'GitHub reported a conflict. Reload the latest version before saving again.',
        422: 'GitHub rejected the update. The branch may have changed or be protected. Reload before retrying.',
        429: 'GitHub rate limit reached. Keep this tab open and try again later.'
      };
      throw new GitHubError(messages[res.status] || `GitHub returned HTTP ${res.status}. No successful save has been confirmed.`, res.status);
    }
    return res.status === 204 ? null : await res.json();
  }
  async connect(token) {
    this.disconnect();
    if (!/^github_pat_[A-Za-z0-9_]+$/.test(token.trim())) throw new GitHubError('Use a fine-grained GitHub token beginning with github_pat_. Never enter your GitHub password.');
    this.#token = token.trim();
    try {
      const user = await this.request('GET', '/user');
      if (user.login.toLowerCase() !== this.config.owner.toLowerCase()) throw new GitHubError('This editor is restricted to the configured repository owner.');
      const repo = await this.request('GET', this.base);
      if (repo.full_name.toLowerCase() !== `${this.config.owner}/${this.config.repo}`.toLowerCase() || !repo.permissions?.push) throw new GitHubError('The authenticated account does not have write access to the configured repository.');
      this.#verified = true;
      return { login: user.login, repository: repo.full_name };
    } catch (err) { this.disconnect(); throw err; }
  }
  async head() {
    const ref = await this.request('GET', this.base + '/git/ref/heads/' + this.config.branch);
    const commit = await this.request('GET', this.base + '/git/commits/' + ref.object.sha);
    return { head: ref.object.sha, tree: commit.tree.sha };
  }
  async snapshot() {
    const head = await this.head();
    const file = await this.request('GET', this.base + '/contents/content/profile.json?ref=' + encodeURIComponent(head.head));
    if (file.type !== 'file' || file.encoding !== 'base64' || typeof file.content !== 'string') throw new GitHubError('Profile must be a regular JSON file smaller than 1 MB.');
    let profile;
    try { profile = JSON.parse(decodeBase64UTF8(file.content)); } catch { throw new GitHubError('GitHub profile.json is not valid UTF-8 JSON.'); }
    return { ...head, fileSHA: file.sha, profile };
  }
  async writeAtHead(files, head, message) {
    if (!this.connected) throw new GitHubError('Connect to GitHub before publishing.');
    if (!Array.isArray(files) || !files.length || files.some(f => !f.path || typeof f.content !== 'string' || f.path.startsWith('/') || f.path.split('/').some(x => x === '..' || !x))) throw new GitHubError('Invalid file set.');
    if (new Set(files.map(f => f.path)).size !== files.length) throw new GitHubError('Duplicate file paths.');
    const tree = await this.request('POST', this.base + '/git/trees', { base_tree: head.tree, tree: files.map(f => ({ path: f.path, mode: '100644', type: 'blob', content: f.content })) });
    const commit = await this.request('POST', this.base + '/git/commits', { message, tree: tree.sha, parents: [head.head] });
    // The non-force update protects concurrent changes; never force-push.
    await this.request('PATCH', this.base + '/git/refs/heads/' + this.config.branch, { sha: commit.sha, force: false });
    return { commitSHA: commit.sha, commitURL: `https://github.com/${this.config.owner}/${this.config.repo}/commit/${commit.sha}` };
  }
  async publish(files, expectedFileSHA) {
    const allowed = ['content/profile.json'];
    if (files.length !== allowed.length || files.some(f => !allowed.includes(f.path))) throw new GitHubError('Only the private profile JSON can be saved here.');
    const snapshot = await this.snapshot();
    if (!expectedFileSHA || snapshot.fileSHA !== expectedFileSHA) throw new GitHubError('The profile changed on GitHub. Your edits have not been overwritten. Export a backup, then reload and reconcile the changes.', 409);
    const result = await this.writeAtHead(files, snapshot, 'Update private academic profile');
    return { ...result, fileSHA: await gitBlobSHA(files.find(f => f.path === 'content/profile.json').content) };
  }
  async install(files) {
    if (!this.connected) throw new GitHubError('Connect to GitHub before installing.');
    const head = await this.head();
    const tree = await this.request('GET', this.base + '/git/trees/' + head.tree + '?recursive=1');
    if (tree.truncated) throw new GitHubError('Refusing installation into a large or incompletely listed repository.');
    const existing = tree.tree.filter(x => x.type === 'blob').map(x => x.path);
    if (existing.some(x => !/^(README(?:\.md|\.txt)?|LICENSE(?:\.md|\.txt)?|\.gitignore)$/i.test(x))) throw new GitHubError('Installation is restricted to a new repository containing only README, LICENSE and/or .gitignore. Existing websites will not be overwritten.');
    return await this.writeAtHead(files, head, 'Publish academic homepage and browser-based profile editor');
  }
}
