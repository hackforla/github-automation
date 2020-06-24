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

// async function main () {
//   try {
//     var {data} = await client.licenses.getForRepo({ owner: 'hackforla', repo: 'food-oasis'})
//     console.log(data);
//   } catch (e) {
//     if (e.status === 404) {
//       /* they do not have a LICENSE file..
//        * -- create a pull request
//        */
//     } else {
//       LOGGER.error(e)
//       process.exit(1)
//     }
//   }
// }

// async function license () {
//   var {data} = await client.licenses.get({ license: 'GPL-2.0' });
//   console.log(data)
// }

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
  async getLatestCommit (repo) {
    /**
    * list commits on a repo
    */
    var { data } = await client.repos.listCommits({ owner: this.owner, repo: repo, per_page: 3 });
    let res = data.map(d => ({sha: d.sha, tree: d.commit.tree.sha }))
    return res[0]
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
  async _addLicense (repo, _license) {
    let errMsg = `LicenseError: ${_license} is not a valid SPDX license code.
        \nSee: https:\/\/spdx.org/licenses/ for the list of accecpted ids`

    if (!spdxLicenseList.has(_license)) {
      LOGGER.error(errMsg)
      return process.exit(1)
    }
    try {
      /** todo
       * get the license body
       * make blob
       * get tree the latest commit on default branch
       * create a ref
       * create a commit
       * create a pull request
       */

      // get the license body
      let licenseBlob = await this.licenses.get({ license: _license })
      LOGGER.info(`adding license file for ${licenseBlob.data.key}`)

      // make a blob
      let { sha } = await this._createBlob(repo, licenseBlob.data.body)
      LOGGER.debug(`created blob from license file; sha: ${sha}`)

      // make a tree 
      let treeResponse = await this.createTree(repo, 'LICENSE', sha) 

      // commit it
      let commitResponse = await this._createCommit(repo, treeResponse.sha)

      // create a ref
      let refResponse = await this._createRef(repo, commitResponse.sha)

      // open a PR
      let res = await this.createPullRequest(repo, refResponse.data.ref)
    } catch (err) {
      LOGGER.error('Error adding license:', err)
    }
  }

  async _createBlob (repo, file) {
    try {
      LOGGER.info(`creating blob on owner: ${this.owner}, repo: ${repo}, file ${file.slice(0, 15)}`)
      let response = await this.git.createBlob({
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
     */
    let { data } = await this.git.createTree({
      owner: this.owner,
      repo: repo,
      tree: [
        { path: repoFilePath, mode: '100644', type: 'blob', sha: blobSha }
      ]
    })
    LOGGER.info(`Created tree with sha ${data.sha}, filename: ${repoFilePath}, blob: ${blobSha}`);
    return data
  }

  async _createCommit (repo, treeSha, msg) {
    /** create a commit object from the tree SHA
     */
    try {
      let { data } = await this.git.createCommit({
        owner: this.owner, 
        repo: repo,
        message: msg || 'bot user: automated commit',
        tree: treeSha,
        parents: [], // omit parents for now to create a root commit...
        author: {
          name: 'cherp',
          email:'automation@beepboop.org',
        },
        commiter: {
          name: 'cherp',
          email:'automation@beepboop.org',
        }
      })
      return data
    } catch (err) {
      LOGGER.error("Create Commit error: ", err)
    }
  }
  async _createRef (repo, branchSha = '') {
    /** _createRef
     * create a git ref on a repo from an optional branch SHA. Default to cutting from HEAD
     */

    // hardcoded branch name for branches made by Cherp
    const cherpRef = 'heads/cherp-add-file' 
    try { 
      let refSha = ''
      if (branchSha === '') {
        // we should just get the latest commit on HEAD to create ref from
        let latestCommit = await this.getLatestCommit(repo)
        refSha = latestCommit.sha
      } else {
        refSha = branchSha
      }

      const data  = await this.git.createRef({
        owner: this.owner,
        repo: repo,
        ref: `refs/${cherpRef}`,
        sha: refSha
      })
      LOGGER.info('Create Ref success: ', data)
      return data
    } catch (err) {
      if (err.status === 422) {
        LOGGER.info(`Create Ref error; status: ${err.status}, type: ${err.name}, trying again...`)
        // the ref already exists
        // delete it and try again
        let deleteRef = await this.git.deleteRef({ owner: this.owner, repo: repo, ref: cherpRef })
        return this._createRef(repo, branchSha)
        // LOGGER.debug(err)
      }
      LOGGER.error("Create Ref Error: ", err)
    }
  }
  async createPullRequest(repo, refBranch) {
    try {
      var { data } = await this.pulls.create({
        owner: this.owner,
        repo: repo,
        title: 'Adding a file to this repo :bird:',
        head: refBranch,
        base: 'master',
        body: `# summary\n hello :wave:. I am opening this PR to add a file that's good to have in a repo. Please feel free to ignore this. I'm just a script so if I am broken please open an issue in [hackforla/github-automation](https://github.com/hackforla/github-automation).`
      })

      LOGGER.debug(`created a PR for pull request: ${data.url}, #${data.number}`)

    } catch (err) {
      LOGGER.error(err)
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

module.exports = function (opts) { return new Cherp(opts) }
