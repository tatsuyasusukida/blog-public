const http = require('http')
const winston = require('winston')
const {App} = require('../app')
const {LoggerMaker} = require('../util/LoggerMaker')

class Main {
  async run () {
    const loggerMaker = new LoggerMaker()

    winston.loggers.add('error', loggerMaker.makeLogger('error', 'json', 'serve-error.log'))
    winston.loggers.add('warn', loggerMaker.makeLogger('warn', 'json', 'serve-warn.log'))
    winston.loggers.add('info', loggerMaker.makeLogger('info', 'json', 'serve-info.log'))
    winston.loggers.add('debug', loggerMaker.makeLogger('debug', 'json', 'serve-debug.log'))
    winston.loggers.add('access', loggerMaker.makeLogger('info', 'raw', 'serve-access.log'))
    winston.loggers.add('query', loggerMaker.makeLogger('info', 'json', 'serve-query.log'))

    this.server = http.createServer()
    this.app = new App()

    this.server.on('listening', this.app.onListening.bind(this.app))
    this.server.on('request', this.app.onRequest.bind(this.app))
    this.server.on('error', this.app.onError.bind(this.app))

    this.server.listen(process.env.PORT)
  }
}

if (require.main === module) {
  main()
}

async function main () {
  try {
    await new Main().run()
  } catch (err) {
    console.error(err.message)
    console.debug(err.stack)
  }
}
