// Database configuration and connection utility
import { Pool } from 'pg'
import mysql from 'mysql2/promise'

// Database configuration based on environment
const DB_CONFIG = {
  // PostgreSQL configuration (recommended for production)
  postgres: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'echart_trading',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  // MySQL configuration (alternative)
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'echart_trading',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    connectionLimit: 20,
    acquireTimeout: 60000,
    timeout: 60000,
  }
}

// Database connection pools
let pgPool: Pool | null = null
let mysqlPool: mysql.Pool | null = null

// Initialize PostgreSQL connection
export function initializePostgres(): Pool {
  if (!pgPool) {
    pgPool = new Pool(DB_CONFIG.postgres)
    
    pgPool.on('error', (err: Error) => {
      console.error('Unexpected error on idle PostgreSQL client', err)
    })
    
    console.log('PostgreSQL connection pool initialized')
  }
  return pgPool
}

// Initialize MySQL connection
export function initializeMySQL(): mysql.Pool {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool(DB_CONFIG.mysql)
    console.log('MySQL connection pool initialized')
  }
  return mysqlPool
}

// Database interface for FII DII operations
export interface FIIDIIRecord {
  id?: number
  date: string
  dayOfWeek: number
  fiiBuyAmount: number
  fiiSellAmount: number
  fiiNetAmount: number
  diiBuyAmount: number
  diiSellAmount: number
  diiNetAmount: number
  totalNetFlow: number
  dataSource: string
  isVerified: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface FetchLog {
  id?: number
  scheduledTime: Date
  executionTime: Date
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL'
  recordsProcessed: number
  errorMessage?: string
  dataSource: string
  executionDurationMs: number
}

// Database operations class
export class FIIDIIDatabase {
  private usePostgres: boolean
  
  constructor(usePostgres = true) {
    this.usePostgres = usePostgres
    if (usePostgres) {
      initializePostgres()
    } else {
      initializeMySQL()
    }
  }
  
  // Insert or update FII DII data
  async upsertFIIDIIData(data: FIIDIIRecord): Promise<FIIDIIRecord> {
    const query = this.usePostgres ? this.getPostgresUpsertQuery() : this.getMySQLUpsertQuery()
    
    try {
      if (this.usePostgres && pgPool) {
        const values = [
          data.date, data.dayOfWeek, data.fiiBuyAmount, data.fiiSellAmount, data.fiiNetAmount,
          data.diiBuyAmount, data.diiSellAmount, data.diiNetAmount, data.totalNetFlow,
          data.dataSource, data.isVerified
        ]
        const result = await pgPool.query(query, values)
        return result.rows[0]
      } else if (mysqlPool) {
        const values = [
          data.date, data.dayOfWeek, data.fiiBuyAmount, data.fiiSellAmount, data.fiiNetAmount,
          data.diiBuyAmount, data.diiSellAmount, data.diiNetAmount, data.totalNetFlow,
          data.dataSource, data.isVerified
        ]
        const [result] = await mysqlPool.execute(query, values)
        return data // MySQL doesn't return the inserted row directly
      }
      throw new Error('No database connection available')
    } catch (error) {
      console.error('Error upserting FII DII data:', error)
      throw error
    }
  }
  
  // Get FII DII data for a specific period
  async getFIIDIIData(startDate: string, endDate: string): Promise<FIIDIIRecord[]> {
    const query = `
      SELECT 
        id, date, day_of_week as "dayOfWeek",
        fii_buy_amount as "fiiBuyAmount", fii_sell_amount as "fiiSellAmount", fii_net_amount as "fiiNetAmount",
        dii_buy_amount as "diiBuyAmount", dii_sell_amount as "diiSellAmount", dii_net_amount as "diiNetAmount",
        total_net_flow as "totalNetFlow", data_source as "dataSource", is_verified as "isVerified",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM fii_dii_data 
      WHERE date BETWEEN $1 AND $2 
      ORDER BY date DESC
    `
    
    try {
      if (this.usePostgres && pgPool) {
        const result = await pgPool.query(query, [startDate, endDate])
        return result.rows
      } else if (mysqlPool) {
        const mysqlQuery = query.replace(/\$(\d+)/g, '?')
        const [rows] = await mysqlPool.execute(mysqlQuery, [startDate, endDate])
        return rows as FIIDIIRecord[]
      }
      throw new Error('No database connection available')
    } catch (error) {
      console.error('Error fetching FII DII data:', error)
      throw error
    }
  }
  
  // Log fetch operation
  async logFetchOperation(log: FetchLog): Promise<void> {
    const query = `
      INSERT INTO fii_dii_fetch_logs 
      (scheduled_time, execution_time, status, records_processed, error_message, data_source, execution_duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `
    
    try {
      if (this.usePostgres && pgPool) {
        await pgPool.query(query, [
          log.scheduledTime, log.executionTime, log.status, log.recordsProcessed,
          log.errorMessage, log.dataSource, log.executionDurationMs
        ])
      } else if (mysqlPool) {
        const mysqlQuery = query.replace(/\$(\d+)/g, '?')
        await mysqlPool.execute(mysqlQuery, [
          log.scheduledTime, log.executionTime, log.status, log.recordsProcessed,
          log.errorMessage, log.dataSource, log.executionDurationMs
        ])
      }
    } catch (error) {
      console.error('Error logging fetch operation:', error)
      // Don't throw here to avoid breaking the main flow
    }
  }
  
  private getPostgresUpsertQuery(): string {
    return `
      INSERT INTO fii_dii_data 
      (date, day_of_week, fii_buy_amount, fii_sell_amount, fii_net_amount, 
       dii_buy_amount, dii_sell_amount, dii_net_amount, total_net_flow, 
       data_source, is_verified, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      ON CONFLICT (date) 
      DO UPDATE SET 
        fii_buy_amount = EXCLUDED.fii_buy_amount,
        fii_sell_amount = EXCLUDED.fii_sell_amount,
        fii_net_amount = EXCLUDED.fii_net_amount,
        dii_buy_amount = EXCLUDED.dii_buy_amount,
        dii_sell_amount = EXCLUDED.dii_sell_amount,
        dii_net_amount = EXCLUDED.dii_net_amount,
        total_net_flow = EXCLUDED.total_net_flow,
        data_source = EXCLUDED.data_source,
        is_verified = EXCLUDED.is_verified,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `
  }
  
  private getMySQLUpsertQuery(): string {
    return `
      INSERT INTO fii_dii_data 
      (date, day_of_week, fii_buy_amount, fii_sell_amount, fii_net_amount, 
       dii_buy_amount, dii_sell_amount, dii_net_amount, total_net_flow, 
       data_source, is_verified, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE 
        fii_buy_amount = VALUES(fii_buy_amount),
        fii_sell_amount = VALUES(fii_sell_amount),
        fii_net_amount = VALUES(fii_net_amount),
        dii_buy_amount = VALUES(dii_buy_amount),
        dii_sell_amount = VALUES(dii_sell_amount),
        dii_net_amount = VALUES(dii_net_amount),
        total_net_flow = VALUES(total_net_flow),
        data_source = VALUES(data_source),
        is_verified = VALUES(is_verified),
        updated_at = CURRENT_TIMESTAMP
    `
  }
}