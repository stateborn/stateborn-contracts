import pretty from 'pino-pretty';
const pino = require('pino');

const logger = pino({
    transport: {
        target: 'pino-pretty'
    },
    level: 'debug'
})

export const LOGGER = logger;

