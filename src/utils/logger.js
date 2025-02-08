const logLevels = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
  };
  
  class Logger {
    static log = (level, component, message, data = null) => {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        component,
        message,
        data
      };
  
      // Log to console with appropriate styling
      const logStyle = this.getLogStyle(level);
      console.log(
        `%c${timestamp} [${level}] ${component}: ${message}`,
        logStyle
      );
      
      if (data) {
        console.log('Additional data:', data);
      }
  
      // Save logs to localStorage
      this.saveLogs(logEntry);
    };
  
    static error = (component, message, error = null) => {
      const errorData = error ? {
        message: error.message,
        stack: error.stack,
        ...(error.response ? { response: error.response } : {})
      } : null;
      
      this.log(logLevels.ERROR, component, message, errorData);
    };
  
    static warn = (component, message, data = null) => {
      this.log(logLevels.WARN, component, message, data);
    };
  
    static info = (component, message, data = null) => {
      this.log(logLevels.INFO, component, message, data);
    };
  
    static debug = (component, message, data = null) => {
      this.log(logLevels.DEBUG, component, message, data);
    };
  
    static getLogStyle = (level) => {
      switch (level) {
        case logLevels.ERROR:
          return 'color: #ef4444; font-weight: bold;';
        case logLevels.WARN:
          return 'color: #f59e0b; font-weight: bold;';
        case logLevels.INFO:
          return 'color: #3b82f6;';
        case logLevels.DEBUG:
          return 'color: #6b7280;';
        default:
          return '';
      }
    };
  
    static saveLogs = (logEntry) => {
      try {
        // Get existing logs from localStorage
        const existingLogs = JSON.parse(localStorage.getItem('appLogs') || '[]');
        
        // Add new log entry
        existingLogs.push(logEntry);
        
        // Keep only last 1000 logs to prevent storage issues
        const trimmedLogs = existingLogs.slice(-1000);
        
        // Save back to localStorage
        localStorage.setItem('appLogs', JSON.stringify(trimmedLogs));
      } catch (error) {
        console.error('Failed to save logs to localStorage:', error);
      }
    };
  
    static getLogs = () => {
      try {
        return JSON.parse(localStorage.getItem('appLogs') || '[]');
      } catch (error) {
        console.error('Failed to retrieve logs from localStorage:', error);
        return [];
      }
    };
  
    static clearLogs = () => {
      try {
        localStorage.removeItem('appLogs');
      } catch (error) {
        console.error('Failed to clear logs from localStorage:', error);
      }
    };
  
    static getLogsByComponent = (component) => {
      return this.getLogs().filter(log => log.component === component);
    };
  
    static getLogsByLevel = (level) => {
      return this.getLogs().filter(log => log.level === level);
    };
  
    static getRecentLogs = (minutes = 5) => {
      const cutoff = new Date(Date.now() - minutes * 60000);
      return this.getLogs().filter(log => new Date(log.timestamp) > cutoff);
    };
  
    // Helper method to format error objects for logging
    static formatError = (error) => {
      if (!error) return null;
      
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
        ...(error.response ? { 
          response: {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          }
        } : {})
      };
    };
  
    // Export the log levels so they can be used elsewhere
    static get levels() {
      return logLevels;
    }
  }
  
  export default Logger;