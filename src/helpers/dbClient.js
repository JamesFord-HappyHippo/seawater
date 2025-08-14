// dbClient.js - Seawater Climate Risk Platform
// PostgreSQL + PostGIS connection management following Tim-Combo patterns

const { Client, Pool } = require('pg');
const { DatabaseError } = require('./errorHandler');

// Debug environment variables
console.log('Seawater DB Environment Variables:', {
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_NAME: process.env.DB_NAME,
    DB_PORT: process.env.DB_PORT,
    DB_SSL: process.env.DB_SSL,
    DB_SSL_type: typeof process.env.DB_SSL,
    SSL_enabled: process.env.DB_SSL === 'true'
});

// Database configuration for PostgreSQL + PostGIS
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    // SSL configuration for RDS connections
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    // Connection pool settings optimized for Lambda
    max: 20, // Maximum number of clients in the pool
    min: 2,  // Minimum number of clients in the pool
    idle: 10000, // Milliseconds a client can be idle before closing
    acquire: 30000, // Milliseconds before timing out when trying to connect
    evict: 30000, // Milliseconds before removing idle clients
    // Statement timeout for climate data queries (can be longer for spatial operations)
    statement_timeout: 30000, // 30 seconds for spatial queries
    // Application name for monitoring
    application_name: process.env.APP_NAME || 'seawater_climate_risk'
};

// Debug SSL configuration
console.log('Seawater Database Config SSL:', {
    ssl_config: dbConfig.ssl,
    ssl_enabled: dbConfig.ssl !== false
});

// Connection pool for better performance in Lambda
let pool = null;

// Initialize connection pool
function initializePool() {
    if (!pool) {
        pool = new Pool(dbConfig);
        
        // Pool event handlers
        pool.on('connect', (client) => {
            console.log('New client connected to PostgreSQL pool');
            
            // Enable PostGIS extension awareness
            client.query('SET search_path TO public, postgis;');
        });

        pool.on('error', (err, client) => {
            console.error('Unexpected error on idle client:', err);
        });

        pool.on('acquire', (client) => {
            console.log('Client acquired from pool');
        });

        pool.on('release', (client) => {
            console.log('Client released back to pool');
        });

        console.log('PostgreSQL connection pool initialized for Seawater platform');
    }
    
    return pool;
}

// Get a database client from the pool
async function getClient() {
    try {
        if (!pool) {
            pool = initializePool();
        }
        
        // Get client from pool
        const client = await pool.connect();
        
        // Add query monitoring to the client
        const originalQuery = client.query.bind(client);
        client.query = async (...args) => {
            const start = process.hrtime();
            try {
                const result = await originalQuery(...args);
                const duration = getDurationMs(start);
                logQuery(args[0], args[1], duration, result.rowCount);
                return result;
            } catch (error) {
                const duration = getDurationMs(start);
                logQueryError(args[0], args[1], error, duration);
                throw error;
            }
        };
        
        return client;
    } catch (error) {
        console.error('Error getting database client from pool:', error);
        throw new DatabaseError('Failed to get database connection from pool', error.code);
    }
}

// Get a direct client connection (for transactions)
async function getDirectClient() {
    try {
        const client = new Client(dbConfig);
        await client.connect();
        
        // Enable PostGIS
        await client.query('SET search_path TO public, postgis;');
        
        console.log('Direct PostgreSQL connection established');
        
        // Add query monitoring
        const originalQuery = client.query.bind(client);
        client.query = async (...args) => {
            const start = process.hrtime();
            try {
                const result = await originalQuery(...args);
                const duration = getDurationMs(start);
                logQuery(args[0], args[1], duration, result.rowCount);
                return result;
            } catch (error) {
                const duration = getDurationMs(start);
                logQueryError(args[0], args[1], error, duration);
                throw error;
            }
        };
        
        return client;
    } catch (error) {
        console.error('Error creating direct database connection:', error);
        throw new DatabaseError('Failed to establish direct database connection', error.code);
    }
}

// Transaction wrapper for multiple operations
async function withTransaction(operations) {
    const client = await getDirectClient();
    
    try {
        await client.query('BEGIN');
        
        const results = [];
        for (const operation of operations) {
            const result = await operation(client);
            results.push(result);
        }
        
        await client.query('COMMIT');
        console.log('Transaction completed successfully');
        
        return results;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction rolled back due to error:', error);
        throw error;
    } finally {
        await client.end();
    }
}

// Pool health check
async function checkPoolHealth() {
    try {
        if (!pool) {
            return { status: 'not_initialized' };
        }
        
        const poolInfo = {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount
        };
        
        // Test a simple query
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT NOW() as current_time, PostGIS_Version() as postgis_version');
            client.release();
            
            return {
                status: 'healthy',
                pool: poolInfo,
                database: {
                    current_time: result.rows[0].current_time,
                    postgis_version: result.rows[0].postgis_version
                }
            };
        } catch (queryError) {
            client.release();
            throw queryError;
        }
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message,
            pool: pool ? {
                totalCount: pool.totalCount,
                idleCount: pool.idleCount,
                waitingCount: pool.waitingCount
            } : null
        };
    }
}

// Helper function to measure query duration
function getDurationMs(start) {
    const [seconds, nanoseconds] = process.hrtime(start);
    return seconds * 1000 + nanoseconds / 1000000;
}

// Helper function to log queries with climate platform context
function logQuery(query, params, duration, rowCount) {
    const queryType = getQueryType(query);
    const isSpatialQuery = query.toLowerCase().includes('st_') || query.toLowerCase().includes('geometry');
    
    console.log({
        timestamp: new Date().toISOString(),
        type: 'query',
        platform: 'seawater-climate-risk',
        query_type: queryType,
        is_spatial: isSpatialQuery,
        query: typeof query === 'string' ? query.substring(0, 200) : query.text?.substring(0, 200),
        param_count: params ? params.length : 0,
        duration_ms: Math.round(duration),
        row_count: rowCount,
        performance_category: duration < 100 ? 'fast' : duration < 1000 ? 'moderate' : 'slow'
    });
}

// Helper function to log query errors
function logQueryError(query, params, error, duration) {
    console.error({
        timestamp: new Date().toISOString(),
        type: 'query_error',
        platform: 'seawater-climate-risk',
        query: typeof query === 'string' ? query.substring(0, 200) : query.text?.substring(0, 200),
        param_count: params ? params.length : 0,
        error: {
            message: error.message,
            code: error.code,
            detail: error.detail,
            constraint: error.constraint
        },
        duration_ms: Math.round(duration)
    });
}

// Determine query type for monitoring
function getQueryType(query) {
    const queryStr = typeof query === 'string' ? query.toLowerCase() : query.text?.toLowerCase() || '';
    
    if (queryStr.includes('select')) return 'SELECT';
    if (queryStr.includes('insert')) return 'INSERT';
    if (queryStr.includes('update')) return 'UPDATE';
    if (queryStr.includes('delete')) return 'DELETE';
    if (queryStr.includes('upsert') || queryStr.includes('on conflict')) return 'UPSERT';
    
    return 'OTHER';
}

// Graceful pool shutdown
async function closePool() {
    if (pool) {
        console.log('Closing PostgreSQL connection pool...');
        await pool.end();
        pool = null;
        console.log('PostgreSQL connection pool closed');
    }
}

// Lambda runtime cleanup
process.on('beforeExit', async () => {
    await closePool();
});

module.exports = { 
    getClient,
    getDirectClient,
    withTransaction,
    checkPoolHealth,
    closePool,
    initializePool
};