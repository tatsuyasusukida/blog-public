const path = require('path')
const winston = require('winston')

class LoggerMaker {
  makeLogger (level, format, file) {
    return {
      level: level,
      format: this.makeFormat(format),
      transports: [
        this.makeTransportFile(file),
        ...(process.env.LOG_CONSOLE === '1' ? [this.makeTransportConsole()] : [])
      ],
    }
  }

  makeFormat (format) {
    if (format === 'json') {
      return this.makeFormatJson()
    } else if (format === 'raw') {
      return this.makeFormatRaw()
    } else {
      throw new TypeError(`invalid format: '${format}'`)
    }
  }

  makeFormatJson (level, file, format) {
    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    )
  }

  makeFormatRaw (level, file, format) {
    return winston.format.printf(({message}) => message)
  }

  makeTransportFile (filename) {
    const dirname = process.env.LOG_DIRNAME || path.join(__dirname, '../log')

    if (process.env.LOG_ROTATION === '1') {
      return new winston.transports.File({
        dirname,
        filename,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 10,
        tailable: true,
      }) 
    } else {
      return new winston.transports.File({
        dirname,
        filename,
      }) 
    }
  }

  makeTransportConsole () {
    return new winston.transports.Console({
      format: this.makeFormatRaw(),
    })
  }
}

module.exports.LoggerMaker = LoggerMaker
