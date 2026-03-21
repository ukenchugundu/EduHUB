import { Pool } from "pg";

interface SystemMetrics {
  timestamp: Date;
  activeUsers: number;
  dbConnections: number;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface PerformanceAlert {
  type: "HIGH_LOAD" | "SLOW_QUERY" | "MEMORY_WARNING" | "DB_CONNECTION_LIMIT";
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timestamp: Date;
}

export class SystemMonitoringService {
  private db: Pool;
  private metrics: SystemMetrics[] = [];
  private alerts: PerformanceAlert[] = [];

  constructor(db: Pool) {
    this.db = db;
    this.startMonitoring();
  }

  private startMonitoring() {
    // Monitor every 30 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 30000);

    // Cleanup old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);
  }

  private async collectMetrics() {
    try {
      const timestamp = new Date();

      // Get active users (in-memory placeholder)
      const activeUsers = await this.getActiveUserCount();

      // Get database metrics
      const dbMetrics = await this.getDatabaseMetrics();

      // Get system metrics
      const systemMetrics = await this.getSystemMetrics();

      const metrics: SystemMetrics = {
        timestamp,
        activeUsers,
        dbConnections: dbMetrics.connections,
        responseTime: dbMetrics.avgResponseTime,
        memoryUsage: systemMetrics.memoryUsage,
        cpuUsage: systemMetrics.cpuUsage,
      };

      this.metrics.push(metrics);

      // Check for alerts
      await this.checkAlerts(metrics);
    } catch (error) {
      console.error("Error collecting metrics:", error);
    }
  }

  private async getActiveUserCount(): Promise<number> {
    return 0;
  }

  private async getDatabaseMetrics(): Promise<{
    connections: number;
    avgResponseTime: number;
  }> {
    const result = await this.db.query(`
      SELECT 
        COUNT(*) as connections,
        AVG(EXTRACT(EPOCH FROM (now() - query_start)) * 1000) as avg_response_time
      FROM pg_stat_activity 
      WHERE state = 'active'
    `);

    return {
      connections: parseInt(result.rows[0].connections) || 0,
      avgResponseTime: parseFloat(result.rows[0].avg_response_time) || 0,
    };
  }

  private async getSystemMetrics(): Promise<{
    memoryUsage: number;
    cpuUsage: number;
  }> {
    // In production, use actual system monitoring
    // For now, return mock data
    return {
      memoryUsage: Math.random() * 100,
      cpuUsage: Math.random() * 100,
    };
  }

  private async checkAlerts(metrics: SystemMetrics) {
    const alerts: PerformanceAlert[] = [];

    // High database connections
    if (metrics.dbConnections > 80) {
      alerts.push({
        type: "DB_CONNECTION_LIMIT",
        message: `High database connections: ${metrics.dbConnections}`,
        severity: metrics.dbConnections > 95 ? "CRITICAL" : "HIGH",
        timestamp: new Date(),
      });
    }

    // Slow response time
    if (metrics.responseTime > 1000) {
      alerts.push({
        type: "SLOW_QUERY",
        message: `Slow response time: ${metrics.responseTime.toFixed(2)}ms`,
        severity: metrics.responseTime > 5000 ? "CRITICAL" : "MEDIUM",
        timestamp: new Date(),
      });
    }

    // High memory usage
    if (metrics.memoryUsage > 85) {
      alerts.push({
        type: "MEMORY_WARNING",
        message: `High memory usage: ${metrics.memoryUsage.toFixed(1)}%`,
        severity: metrics.memoryUsage > 95 ? "CRITICAL" : "HIGH",
        timestamp: new Date(),
      });
    }

    // High CPU usage
    if (metrics.cpuUsage > 80) {
      alerts.push({
        type: "HIGH_LOAD",
        message: `High CPU usage: ${metrics.cpuUsage.toFixed(1)}%`,
        severity: metrics.cpuUsage > 95 ? "CRITICAL" : "HIGH",
        timestamp: new Date(),
      });
    }

    // Store alerts
    for (const alert of alerts) {
      this.alerts.push(alert);
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-100);
      }
    }
  }

  private cleanupOldMetrics() {
    const oneHourAgo = new Date(Date.now() - 3600000);
    this.metrics = this.metrics.filter((m) => m.timestamp > oneHourAgo);
    this.alerts = this.alerts.filter((a) => a.timestamp > oneHourAgo);
  }

  // API methods
  async getCurrentMetrics(): Promise<SystemMetrics | null> {
    return this.metrics.length > 0
      ? this.metrics[this.metrics.length - 1]
      : null;
  }

  async getMetricsHistory(hours: number = 1): Promise<SystemMetrics[]> {
    const since = new Date(Date.now() - hours * 3600000);
    return this.metrics.filter((m) => m.timestamp > since);
  }

  async getRecentAlerts(limit: number = 10): Promise<PerformanceAlert[]> {
    const start = Math.max(0, this.alerts.length - limit);
    return this.alerts.slice(start).reverse();
  }

  // Performance optimization recommendations
  async getOptimizationRecommendations(): Promise<string[]> {
    const metrics = await this.getCurrentMetrics();
    const recommendations: string[] = [];

    if (!metrics) return recommendations;

    if (metrics.dbConnections > 70) {
      recommendations.push(
        "Consider implementing connection pooling or increasing max connections",
      );
    }

    if (metrics.responseTime > 500) {
      recommendations.push(
        "Add database indexes for frequently queried columns",
      );
      recommendations.push("Implement query result caching");
    }

    if (metrics.memoryUsage > 80) {
      recommendations.push("Optimize memory usage or scale horizontally");
    }

    if (metrics.activeUsers > 1000) {
      recommendations.push("Consider implementing load balancing");
      recommendations.push("Use CDN for static assets");
    }

    return recommendations;
  }

  // Database optimization queries
  async getSlowQueries(): Promise<any[]> {
    const result = await this.db.query(`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements 
      WHERE mean_time > 100
      ORDER BY mean_time DESC 
      LIMIT 10
    `);

    return result.rows;
  }

  async getTableSizes(): Promise<any[]> {
    const result = await this.db.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY size_bytes DESC
    `);

    return result.rows;
  }
}
