// src/utils/debug.js
class MIPTechDebugger {
  constructor() {
    this.enabled = process.env.REACT_APP_DEBUG_MODE === 'true';
    this.logLevel = process.env.REACT_APP_LOG_LEVEL || 'info';
  }

  log(level, message, data = {}) {
    if (!this.enabled) return;

    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex >= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      console[level](`[${timestamp}] [MIPTech] ${message}`, data);
    }
  }

  debug(message, data) { this.log('debug', message, data); }
  info(message, data) { this.log('info', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  error(message, data) { this.log('error', message, data); }
}

export const debugger = new MIPTechDebugger();