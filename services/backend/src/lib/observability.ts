import winston from 'winston';

/**
 * Observability and Logging Infrastructure
 *
 * Provides structured logging with support for external log aggregation services.
 * Can be extended to integrate with:
 * - AWS CloudWatch
 * - Datadog
 * - New Relic
 * - Elasticsearch/Kibana
 * - Splunk
 */

// Custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Custom colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// Custom format for file/external output (structured JSON)
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

// Create transports array
const transports: winston.transport[] = [
  // Console output (development)
  new winston.transports.Console({
    format: consoleFormat,
  }),

  // File output (production backup)
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: jsonFormat,
  }),

  new winston.transports.File({
    filename: 'logs/combined.log',
    format: jsonFormat,
  }),
];

// Add CloudWatch transport if configured
if (process.env.AWS_CLOUDWATCH_LOG_GROUP) {
  try {
    // Note: In production, you would install and configure:
    // npm install winston-cloudwatch
    // import CloudWatchTransport from 'winston-cloudwatch';
    //
    // transports.push(
    //   new CloudWatchTransport({
    //     logGroupName: process.env.AWS_CLOUDWATCH_LOG_GROUP,
    //     logStreamName: `${process.env.NODE_ENV}-${Date.now()}`,
    //     awsRegion: process.env.AWS_REGION || 'us-east-1',
    //     jsonMessage: true,
    //   })
    // );

    console.log('⚠️ CloudWatch logging configured but transport not installed (see observability.ts)');
  } catch (error) {
    console.warn('CloudWatch transport initialization failed:', error);
  }
}

// Add Datadog transport if configured
if (process.env.DATADOG_API_KEY) {
  try {
    // Note: In production, you would install and configure:
    // npm install @datadog/browser-logs
    // Or use HTTP transport to Datadog intake API
    //
    // transports.push(
    //   new winston.transports.Http({
    //     host: 'http-intake.logs.datadoghq.com',
    //     path: `/v1/input/${process.env.DATADOG_API_KEY}`,
    //     ssl: true,
    //   })
    // );

    console.log('⚠️ Datadog logging configured but transport not installed (see observability.ts)');
  } catch (error) {
    console.warn('Datadog transport initialization failed:', error);
  }
}

// Create the main logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports,
  exitOnError: false,
});

/**
 * Performance Metrics Tracker
 *
 * Tracks performance metrics that can be exported to external monitoring systems.
 */
export class MetricsTracker {
  private metrics: Map<string, number[]> = new Map();

  /**
   * Record a metric value
   */
  record(metricName: string, value: number): void {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }
    this.metrics.get(metricName)!.push(value);
  }

  /**
   * Get statistics for a metric
   */
  getStats(metricName: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.metrics.get(metricName);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      count,
      min: sorted[0],
      max: sorted[count - 1],
      avg: sorted.reduce((a, b) => a + b, 0) / count,
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    };
  }

  /**
   * Get all metrics
   */
  getAllStats(): Record<string, any> {
    const allStats: Record<string, any> = {};
    for (const [metricName] of this.metrics) {
      allStats[metricName] = this.getStats(metricName);
    }
    return allStats;
  }

  /**
   * Export metrics in Prometheus format
   * Can be scraped by Prometheus or pushed to pushgateway
   */
  exportPrometheus(): string {
    let output = '';

    for (const [metricName, values] of this.metrics) {
      const stats = this.getStats(metricName);
      if (!stats) continue;

      const sanitizedName = metricName.replace(/[^a-zA-Z0-9_]/g, '_');

      output += `# HELP ${sanitizedName} Performance metric for ${metricName}\n`;
      output += `# TYPE ${sanitizedName} summary\n`;
      output += `${sanitizedName}_count ${stats.count}\n`;
      output += `${sanitizedName}_sum ${stats.avg * stats.count}\n`;
      output += `${sanitizedName}{quantile="0.5"} ${stats.p50}\n`;
      output += `${sanitizedName}{quantile="0.95"} ${stats.p95}\n`;
      output += `${sanitizedName}{quantile="0.99"} ${stats.p99}\n\n`;
    }

    return output;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

// Global metrics tracker instance
export const metrics = new MetricsTracker();

/**
 * Structured logging helpers
 */
export const log = {
  /**
   * Log incident processing event
   */
  incident: (action: string, incidentId: string, metadata?: any) => {
    logger.info(`Incident ${action}`, {
      incident_id: incidentId,
      action,
      ...metadata,
    });
  },

  /**
   * Log batch processing event
   */
  batch: (action: string, batchId: string, metadata?: any) => {
    logger.info(`Batch ${action}`, {
      batch_id: batchId,
      action,
      ...metadata,
    });
  },

  /**
   * Log API request
   */
  request: (method: string, path: string, statusCode: number, duration: number) => {
    logger.http('HTTP Request', {
      method,
      path,
      status_code: statusCode,
      duration_ms: duration,
    });

    // Record metrics
    metrics.record('http_request_duration_ms', duration);
    metrics.record(`http_${method.toLowerCase()}_duration_ms`, duration);
  },

  /**
   * Log performance metric
   */
  performance: (operation: string, durationMs: number, metadata?: any) => {
    logger.debug(`Performance: ${operation}`, {
      operation,
      duration_ms: durationMs,
      ...metadata,
    });

    // Record metric
    metrics.record(operation, durationMs);
  },

  /**
   * Log error with context
   */
  error: (message: string, error: Error, context?: any) => {
    logger.error(message, {
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    });
  },

  /**
   * Log AI model interaction
   */
  aiModel: (model: string, operation: string, metadata?: any) => {
    logger.info(`AI Model: ${model}`, {
      model,
      operation,
      ...metadata,
    });
  },

  /**
   * Log credit transaction
   */
  credit: (action: string, walletAddress: string, amount: number, balance: number) => {
    logger.info(`Credit ${action}`, {
      wallet_address: walletAddress,
      amount,
      balance,
      action,
    });
  },
};

/**
 * Request timing middleware for Express
 */
export const requestTimingMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();

  // Override res.send to capture response
  const originalSend = res.send;
  res.send = function (body: any) {
    const duration = Date.now() - startTime;
    log.request(req.method, req.path, res.statusCode, duration);
    return originalSend.call(this, body);
  };

  next();
};

/**
 * Health check endpoint data
 */
export const getHealthMetrics = () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    metrics: metrics.getAllStats(),
    environment: {
      node_env: process.env.NODE_ENV || 'development',
      node_version: process.version,
    },
  };
};

// Create logs directory if it doesn't exist
import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log initialization
logger.info('Observability system initialized', {
  log_level: process.env.LOG_LEVEL || 'info',
  cloudwatch: !!process.env.AWS_CLOUDWATCH_LOG_GROUP,
  datadog: !!process.env.DATADOG_API_KEY,
});
