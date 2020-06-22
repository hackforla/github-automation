const { Octokit } = require('@octokit/rest')
const spdxLicenseList = require('spdx-license-list/simple');
const LOGGER = {
  debug: console.dir,
  info: console.log,
  warn: console.warn,
  error: console.error
}

const client = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'cherp',
  log: LOGGER
})

async function main () {
  try {
    var {data} = await client.licenses.getForRepo({ owner: 'hackforla', repo: 'food-oasis'})
    console.log(data);
  } catch (e) {
    if (e.status === 404) {
      /* they do not have a LICENSE file..
       * -- create a pull request
       */
    } else {
      LOGGER.error(e)
      process.exit(1)
    }
  }
}

async function license () {
  var {data} = await client.licenses.get({ license: 'GPL-2.0' });
  console.log(data)
}

/**
 * list commits on a repo
 */
async function commit () {
  var {data} = await client.repos.listCommits({ owner: 'hackforla', repo: 'food-oasis', per_page: 3 });
  let res = data.map(d => ({sha: d.sha, tree: d.commit.tree.sha }))
  console.log(res)
}

class Cherp extends Octokit {
  constructor(opts) {
    super({
      auth: opts.GITHUB_TOKEN || process.env.GITHUB_TOKEN,
      userAgent: opts.userAgent || 'cherp',
      logger: opts.logger || LOGGER,
      ...opts
    })
    this.opts = opts
    this.owner = this.opts.githubOrg || this.opts.owner || process.env.GITHUB_ORG
  }
  async listAllReposMissingLicense () {
    try {
      var { data }  = await this.repos.listForOrg({ org: this.owner })
      LOGGER.info('got repos', data.map(r => ({ id: r.id, name: r.name, full_name: r.full_name })));
    } catch (err) {
      LOGGER.error('Error listing all repos missing license: ', err)
      process.exit(1)
    }
  }
  _addLicense (_license) {
    let errMsg = `LicenseError: ${_license} is not a valid SPDX license code.
        \nSee: https:\/\/spdx.org/licenses/ for the list of accecpted ids`

    if (!spdxLicenseList.has(_license)) {
      LOGGER.error(errMsg)
      process.exit(1)
    }
  }
  async _createBlob (repo, file) {
    try {
      $
    } catch (err) {
      /* handle error */
    }
  }
  async _createCommit (repo) {
  }
  async _createRef (repo) {
    /** _createRef
     * create a git ref on a repo
     */
    try { 
      let { sha } = await this._createCommit(repo)
      const { data } = await this.git.createRef({ owner: this.owner, repo: repo, ref: 'refs/heads/cherp-add-file' })
    } catch (err) {
    }
  }
  async createPullRequest(repo) {
    try {
      var { ref } = await this._createRef(repo)

      var { data } = await this.pulls.create({
        owner: this.owner,
        repo: repo,
        title: 'Adding a file to this repo :bird:',
      })
    } catch (err) {
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
      return this._addLicense(args.license)
    } else {
      throw Error('NotImplemented')
    }
  }
}

module.exports = function (opts) { return new Cherp(opts) }
