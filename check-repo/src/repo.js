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

class Cherp {
  constructor(opts) {
    this.opts = opts || {'userAgent': 'cherp'}
    this.auth = this.opts.GITHUB_TOKEN || process.env.GITHUB_TOKEN
    this.userAgent = this.opts.userAgent
    this.logger = LOGGER
    this.owner = this.opts.githubOrg || this.opts.owner || process.env.GITHUB_ORG
    this.client = new Octokit({auth: this.auth, userAgent: this.userAgent, logger: this.logger})
  }
  async listAllReposMissingLicense () {
    try {
      var { data }  = await this.client.repos.listForOrg({ org: this.owner })
      console.log('got repos', data.map(r => ({ id: r.id, name: r.name, full_name: r.full_name })));
    } catch (err) {
      this.logger.error('Error listing all repos missing license: ', err)
      process.exit(1)
    }
  }
  _addLicense (_license) {
    let errMsg = `LicenseError: ${_license} is not a valid SPDX license code.
        \nSee: https:\/\/spdx.org/licenses/ for the list of accecpted ids`

    if (!spdxLicenseList.has(_license)) {
      this.logger.error(errMsg)
      process.exit(1)
    }
  }
  createPullRequest(repo) {
  }
  addFile (args) {
    /**
     * open a PR to target repo to add a file.
     * takes some known files via options or a path
     * @param args - Object
     */
    if (args.repo === undefined) {
      this.logger.error('RepoError: no repo name provided.\nUsage:\n\tcherp add-file --repo my-repo')
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
