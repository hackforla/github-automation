const { Octokit } = require('@octokit/rest')
const spdxLicenseList = require('spdx-license-list/simple')

/** logger
 * run with DEBUG or INFO logs by setting an enviroment variable of LOG_LEVEL=50, 40, 30 respectively
 */
const noop = function () {}
const LOGGER = {
  debug: (msg) => parseInt(process.env.LOG_LEVEL, 10) >= 50 ? console.dir(msg) : noop(),
  info: (msg) => parseInt(process.env.LOG_LEVEL, 10) >= 40 ? console.log(msg) : noop(),
  warn: (msg) => parseInt(process.env.LOG_LEVEL, 10) >= 30 ? console.warn(msg) : noop(),
  error: console.error
}

/** Cherp
 * Extends the Github API client octokit/rest.js
 * with some helper methods
 *
 * @param {Object} opts -
 *    opts.userAgent: string - the user agent string included in API calls; default "cherp"
 *    opts.githubOrg: string - the github org of repos being operated on. Overrides opts.owner
 *    opts.owner: string - the github owner of the repo being operated on. Is overridden by opts.owner
 */
class Cherp extends Octokit {
  constructor (opts) {
    super({
      auth: opts.GITHUB_TOKEN || process.env.GITHUB_TOKEN,
      userAgent: opts.userAgent || 'cherp',
      logger: LOGGER,
      ...opts
    })
    this.opts = opts
    this.owner = this.opts.githubOrg || this.opts.owner || process.env.GITHUB_ORG
  }

  async getLatestCommit (repo) {
    /**
     * getLatestCommit
    * lists commits on a repo
    * @params {String} repo - the name of the repo to list commits on
    * @returns {String} the most recent commit SHA from the repo
    */
    try {
      var { data } = await this.repos.listCommits({ owner: this.owner, repo: repo, per_page: 3 })
      const res = data.map(d => ({ sha: d.sha, tree: d.commit.tree.sha }))
      LOGGER.info(`Get Latest Commit: on ${repo}, commit: ${JSON.stringify(res[0])}`)
      return res[0]
    } catch (err) {
      LOGGER.error('getLatestCommit error: ', err)
    }
  }

  async listAllReposMissingLicense (org = '') {
    /**
     * listAllReposMissingLicense
     * lists all repos belonging to an org
     * @params {String} org; optional - the org to list repos for
     * @returns {Array} list of repos data
     */
    try {
      const _org = org || this.owner
      var { data } = await this.repos.listForOrg({ org: _org })
      LOGGER.info('got repos', data.map(r => ({ id: r.id, name: r.name, full_name: r.full_name })))
      return data
    } catch (err) {
      LOGGER.error('Error listing all repos missing license: ', err)
    }
  }

  async _addLicense (repo, _license) {
    /**
     * _addLicense
     * private method for adding a license file to a repo
     *
     * @params {String} repo - the repo being added to
     * @params {String} _license - the SPDX license key id for the license to add
     * @returns {Object} the successful pull request data
     */
    const errMsg = `LicenseError: ${_license} is not a valid SPDX license code.
        \nSee: https://spdx.org/licenses/ for the list of accecpted ids`

    // check we are given a recongized SPDX license id
    // and throw if not.
    if (!spdxLicenseList.has(_license)) {
      LOGGER.error(errMsg)
      return
    }
    try {
      // get the license body
      const licenseBlob = await this.licenses.get({ license: _license })
      LOGGER.info(`adding license file for ${licenseBlob.data.key}`)

      // make a blob
      const { sha } = await this._createBlob(repo, licenseBlob.data.body)
      LOGGER.debug(`created blob from license file; sha: ${sha}`)

      // make a tree
      const treeResponse = await this.createTree(repo, 'LICENSE', sha)

      // commit it
      const commitResponse = await this._createCommit(repo, treeResponse.sha)

      // create a branch
      const refResponse = await this._createRef(repo, commitResponse.sha)

      // open a PR from that branch
      const res = await this.createPullRequest(repo, refResponse.data.ref)
      return res
    } catch (err) {
      LOGGER.error('Error adding license:', err)
    }
  }

  async _createBlob (repo, file) {
    /**
     * _createBlob
     * @param {String} repo - the repo to create a blob on
     * @param {File} file - the file object that we create a blob from
     * @returns {Object} the create blob api response
     */
    try {
      LOGGER.info(`creating blob on owner: ${this.owner}, repo: ${repo}, file ${file.slice(0, 15)}`)
      const response = await this.git.createBlob({
        owner: this.owner,
        repo,
        content: file,
        encoding: 'utf-8'
      })
      LOGGER.debug(`Created blob with sha: ${response.data.sha}`)
      return response.data
    } catch (err) {
      LOGGER.error('Create Blob Error: ', err)
      return err
    }
  }

  async createTree (repo, repoFilePath, blobSha) {
    /** create a git tree from a git blob object contents
     * see: https://git-scm.com/book/en/v2/Git-Internals-Git-Objects#_tree_objects
     *
     * @params {String} repo - the repo
     * @params {String} repoFilePath - the file path to where in the repo the tree should point to.
     * @params {String} blobSha - the SHA of the git blob we create a tree from
     * @returns {Object} the api response from git create tree
     */
    try {
      const parents = await this.getLatestCommit(repo)
      const { data } = await this.git.createTree({
        owner: this.owner,
        repo: repo,
        tree: [
          { path: repoFilePath, mode: '100644', type: 'blob', sha: blobSha }
        ],
        base_tree: parents.sha
      })
      LOGGER.info(`Created tree with sha ${data.sha}, filename: ${repoFilePath}, blob: ${blobSha}`)
      return data
    } catch (err) {
      LOGGER.error('createTree error: ', err)
    }
  }

  async _createCommit (repo, treeSha, msg) {
    /**
     * create a commit object from the tree SHA
     * @params {String} repo - the repo to commit to
     * @params {String} the SHA of the tree created and returned by _createTree
     * @params {String} msg; optional - optional commit message; defaults to a preset generic message
     * @returns {Object} response of API call to create commit
     */
    const parents = await this.getLatestCommit(repo)
    LOGGER.info(`createCommit from parents commit object: ${JSON.stringify(parents)}`)
    try {
      const { data } = await this.git.createCommit({
        owner: this.owner,
        repo: repo,
        message: msg || 'bot user: automated commit',
        tree: treeSha,
        parents: [parents.sha],
        author: {
          name: 'cherp',
          email: 'automation@beepboop.org'
        },
        commiter: {
          name: 'cherp',
          email: 'automation@beepboop.org'
        }
      })
      return data
    } catch (err) {
      LOGGER.error('Create Commit error: ', err)
    }
  }

  async _createRef (repo, branchSha = '') {
    /** _createRef
     * create a git ref on a repo from an optional branch SHA. Default to cutting from HEAD
     * @params {String} repo - the repo we create a branch on
     * @params {String} branchSha; optional - a specific branch SHA to cut from; defaults to latest HEAD commit on repo
     * @returns {Object} the api response
     */

    // hardcoded branch name for branches made by Cherp
    // in case we need to check or clean them later
    const cherpRef = 'heads/cherp-add-file'
    try {
      let refSha = ''
      if (branchSha === '') {
        // we should just get the latest commit on HEAD to create ref from
        const latestCommit = await this.getLatestCommit(repo)
        refSha = latestCommit.sha
      } else {
        refSha = branchSha
      }

      const res = await this.git.createRef({
        owner: this.owner,
        repo: repo,
        ref: `refs/${cherpRef}`,
        sha: refSha
      })
      LOGGER.info(`success: createRef, ref_url: ${res.data.object.url}`)
      return res
    } catch (err) {
      if (err.status === 422) {
        LOGGER.info(err)
        LOGGER.warn(`Create Ref error; status: ${err.status}, type: ${err.name}, trying again...`)
        // the ref already exists
        // delete it and try again
        await this.git.deleteRef({ owner: this.owner, repo: repo, ref: cherpRef })
        return this._createRef(repo, branchSha)
      }
      LOGGER.error('Create Ref Error: ', err)
    }
  }

  async createPullRequest (repo, refBranch, msg = '') {
    /**
     * creates a pull request to repo from a branch
     * @param {String} repo - the name of the github repo being targeted for PR
     * @param {String} refBranch - the name of the ref
     * @returns {Object} - the api response of the pull request
     */
    try {
      var { data } = await this.pulls.create({
        owner: this.owner,
        repo: repo,
        title: '🐦 Adding a file to this repo 🐦',
        head: refBranch,
        base: 'master',
        body: '# summary\n hello :wave:. I am opening this PR to add a file that\'s good to have in a repo. Please feel free to ignore this.\nI\'m just a script so if I am broken please open an issue in [hackforla/github-automation](https://github.com/hackforla/github-automation).'
      })

      LOGGER.debug(`created a PR for pull request: ${data.url}, #${data.number}`)
      return data
    } catch (err) {
      LOGGER.error('error: createPullRequest, ', err)
    }
  }

  addFile (args) {
    /**
     * open a PR to target repo to add a file.
     * takes some known files via options or a path
     * @param args - Object
     */
    if (args.repo === undefined) {
      LOGGER.error('RepoError: no repo name provided.\nUsage:\n\tcherp add-file --repo my-repo')
      process.exit(1)
    }
    if (args.license !== undefined) {
      return this._addLicense(args.repo, args.license)
    } else {
      throw Error('NotImplemented')
    }
  }
}

module.exports = Cherp
