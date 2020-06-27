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

module.exports = LOGGER
