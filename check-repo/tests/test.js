const test = require('tape')
const sinon = require('sinon')

const Cherp = require('../src/repo')


test('it should boot', (t) => {
  t.plan(1)

  var cherp = new Cherp({githubOrg: 'testcherp'})
  t.ok(cherp instanceof Cherp, 'isntance of cherp')
})

test('it should add a license', async function (t) {
  /*
   * test adds license
   * - stub out all the github api calls
   * - assert that can create a license 
   * - assert invalid license fails
   */
  var cherp = new Cherp({githubOrg: 'testcherp'})

  var stubGetLicense = sinon.stub(cherp.licenses, 'get') 
  stubGetLicense.returns(require('./stubs/get-license.json'))

  var stubCreateBlob = sinon.stub(cherp.git, 'createBlob')
  stubCreateBlob.returns(require('./stubs/create-blob.json'))

  var stubCreateTree = sinon.stub(cherp.git, 'createTree')
  stubCreateTree.returns(require('./stubs/create-tree.json'))

  var stubCreateCommit = sinon.stub(cherp.git, 'createCommit')
  stubCreateCommit.returns(require('./stubs/create-commit.json'))

  var stubCreateRef = sinon.stub(cherp.git, 'createRef')
  stubCreateRef.returns(require('./stubs/create-ref.json'))

  var stubCreatePullRequest = sinon.stub(cherp.pulls, 'create')
  stubCreatePullRequest.returns(require('./stubs/create-pull-request.json'))

  var stubGetLatestCommits = sinon.stub(cherp.repos, 'listCommits')
  stubGetLatestCommits.returns(require('./stubs/get-latest-commits.json'))

  var res = await cherp._addLicense('test', 'GPL-2.0')
  t.ok(res, 'it adds a license for valid SPDX license key')

  var res = await cherp._addLicense('test', 'unrecognized-license-key')
  t.notOk(res, 'should exit with error on unrecognized license')
  t.end()
})
