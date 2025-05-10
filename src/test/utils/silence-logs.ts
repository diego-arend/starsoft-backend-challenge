import { Logger } from '@nestjs/common';

// Salvar as implementações originais
const originalLoggerFunctions = {
  debug: Logger.prototype.debug,
  log: Logger.prototype.log,
  error: Logger.prototype.error,
  warn: Logger.prototype.warn,
  verbose: Logger.prototype.verbose,
};

// Função para desativar todos os logs
export function silenceLogs(): void {
  Logger.prototype.debug = jest.fn();
  Logger.prototype.log = jest.fn();
  Logger.prototype.error = jest.fn();
  Logger.prototype.warn = jest.fn();
  Logger.prototype.verbose = jest.fn();
  
  // Silenciar também o console padrão
  global.console.log = jest.fn();
  global.console.error = jest.fn();
  global.console.warn = jest.fn();
  global.console.info = jest.fn();
  global.console.debug = jest.fn();
}

// Função para restaurar logs
export function restoreLogs(): void {
  Logger.prototype.debug = originalLoggerFunctions.debug;
  Logger.prototype.log = originalLoggerFunctions.log;
  Logger.prototype.error = originalLoggerFunctions.error;
  Logger.prototype.warn = originalLoggerFunctions.warn;
  Logger.prototype.verbose = originalLoggerFunctions.verbose;
  
  // Restaurar console padrão
  global.console.log = console.log;
  global.console.error = console.error;
  global.console.warn = console.warn;
  global.console.info = console.info;
  global.console.debug = console.debug;
}