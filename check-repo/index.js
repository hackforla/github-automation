#! /usr/bin/env node

require('dotenv').config()

const argv = require('minimist')(process.argv.slice(2))
const cherp = require('./src/repo.js')({ userAgent: 'foo', githubOrg: 'boopstep' })

function main () {
  if (argv._[0] === 'license') {
    cherp.listAllReposMissingLicense()
  } else if (argv._[0] === 'add-file') {
    cherp.addFile(argv)
  }
}

main()
