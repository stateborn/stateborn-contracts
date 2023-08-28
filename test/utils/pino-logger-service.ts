import pretty from 'pino-pretty';
const pino = require('pino');

const logger = pino(pretty({ sync: false }));
logger.level = 'debug';

export const LOGGER = logger;
