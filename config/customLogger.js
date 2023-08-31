const { createLogger, format, transports } = require('winston');
const winston = require('winston');
const { combine, timestamp, label, prettyPrint } = format;

const customLogger = createLogger({
    format: combine(
      label({ label: 'right meow!' }),
      timestamp(),
      prettyPrint(),
      
    ),
    transports: [new transports.Console(),
        new winston.transports.File({ filename: './logs/combined.log'})]
  })

  module.exports = customLogger