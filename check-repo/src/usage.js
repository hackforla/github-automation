const LOGGER = require('./logger.js')

module.exports = usage

function usage () {
  LOGGER.error('🐦 cherp 🐦 - a tool for CHecking github RePos')
  LOGGER.error('----------------------------------------------')
  LOGGER.error('Usage: ')
  LOGGER.error(`
    $ cherp -h
      show this help output

    $ cherp add-file --license GPL-2.0 --repo my-repo
      adds add GPL-2.0 license file to "my-repo"
  `)
}
