/**
 * Système de logging centralisé pour l'application Sentiers 974
 * Remplace les console.log dispersés par un système configurable
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
  component?: string;
}

class Logger {
  private currentLevel: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.ERROR;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Limite pour éviter les fuites mémoire

  setLevel(level: LogLevel) {
    this.currentLevel = level;
  }

  private log(level: LogLevel, message: string, data?: any, component?: string) {
    if (level < this.currentLevel) return;

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date(),
      component
    };

    // Ajouter au tableau de logs avec rotation
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs * 0.8); // Garder 80%
    }

    // Affichage console avec couleurs
    const prefix = this.getPrefix(level, component);
    const logMethod = this.getConsoleMethod(level);
    
    if (data !== undefined) {
      logMethod(`${prefix} ${message}`, data);
    } else {
      logMethod(`${prefix} ${message}`);
    }
  }

  private getPrefix(level: LogLevel, component?: string): string {
    const levelIcons: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
      [LogLevel.NONE]: '📝'
    };
    
    const icon = levelIcons[level] || '📝';
    const comp = component ? `[${component}]` : '';
    return `${icon}${comp}`;
  }

  private getConsoleMethod(level: LogLevel) {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.log;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }

  // Méthodes publiques
  debug(message: string, data?: any, component?: string) {
    this.log(LogLevel.DEBUG, message, data, component);
  }

  info(message: string, data?: any, component?: string) {
    this.log(LogLevel.INFO, message, data, component);
  }

  warn(message: string, data?: any, component?: string) {
    this.log(LogLevel.WARN, message, data, component);
  }

  error(message: string, data?: any, component?: string) {
    this.log(LogLevel.ERROR, message, data, component);
  }

  // Méthodes spécifiques à l'app
  gps(message: string, data?: any) {
    this.debug(`📍 GPS: ${message}`, data, 'GPS');
  }

  tracking(message: string, data?: any) {
    this.info(`🏃 Tracking: ${message}`, data, 'TRACKING');
  }

  photos(message: string, data?: any) {
    this.debug(`📸 Photos: ${message}`, data, 'PHOTOS');
  }

  performance(message: string, data?: any) {
    this.info(`⚡ Perf: ${message}`, data, 'PERF');
  }

  // Utilitaires
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return this.logs.map(log => 
      `[${log.timestamp.toISOString()}] ${LogLevel[log.level]} ${log.component || ''}: ${log.message}${log.data ? ' ' + JSON.stringify(log.data) : ''}`
    ).join('\n');
  }
}

// Instance singleton
export const logger = new Logger();

// Export des méthodes pour faciliter l'usage
export const { debug, info, warn, error, gps, tracking, photos, performance } = logger;

// Configuration par défaut
if (__DEV__) {
  logger.setLevel(LogLevel.DEBUG);
} else {
  logger.setLevel(LogLevel.ERROR);
}