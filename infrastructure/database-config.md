# Seawater Database Configuration

## Database Setup Status: ✅ COMPLETE

The Seawater database has been successfully provisioned on the shared HoneyDo PostgreSQL RDS instance.

## Connection Information

### Production Database Connection
```
Host: dev-honeydo-pilot-db.cwkfm0ctmqb3.us-east-2.rds.amazonaws.com
Port: 5432
Database: seawater
Username: seawater_app
Password: SeawaterSecure123!
```

### Admin Connection (for schema changes)
```
Host: dev-honeydo-pilot-db.cwkfm0ctmqb3.us-east-2.rds.amazonaws.com
Port: 5432
Database: seawater
Username: postgres
Password: 123_FUBAR!
```

## PostgreSQL Instance Details

- **Version**: PostgreSQL 15.13
- **Platform**: AWS RDS (aarch64-unknown-linux-gnu)
- **Region**: us-east-2
- **Instance**: Shared with HoneyDo (cost-effective pilot approach)

## Enabled Extensions

| Extension | Version | Purpose |
|-----------|---------|---------|
| PostGIS | 3.4 | Spatial/geographic data operations for climate risk analysis |
| PostGIS Topology | 3.4 | Advanced spatial topology for flood zone mapping |
| UUID-OSSP | 1.1 | UUID generation for unique identifiers |
| PL/pgSQL | 1.0 | Procedural language for stored procedures |

## Database Permissions

The `seawater_app` user has been granted:
- ✅ CONNECT on database `seawater`
- ✅ CREATE on database `seawater`
- ✅ USAGE on schema `public`
- ✅ CREATE on schema `public`
- ✅ ALL PRIVILEGES on all tables (current and future)
- ✅ ALL PRIVILEGES on all sequences (current and future)

## Lambda Function Environment Variables

Add these to your Lambda function configurations:

```json
{
  "DB_HOST": "dev-honeydo-pilot-db.cwkfm0ctmqb3.us-east-2.rds.amazonaws.com",
  "DB_PORT": "5432",
  "DB_NAME": "seawater",
  "DB_USER": "seawater_app",
  "DB_PASSWORD": "SeawaterSecure123!",
  "DB_SSL_MODE": "require"
}
```

## Connection String Examples

### Node.js (pg library)
```javascript
const connectionString = 'postgresql://seawater_app:SeawaterSecure123!@dev-honeydo-pilot-db.cwkfm0ctmqb3.us-east-2.rds.amazonaws.com:5432/seawater?ssl=true';
```

### Python (psycopg2)
```python
conn_string = "host='dev-honeydo-pilot-db.cwkfm0ctmqb3.us-east-2.rds.amazonaws.com' dbname='seawater' user='seawater_app' password='SeawaterSecure123!' port='5432' sslmode='require'"
```

### JDBC URL
```
jdbc:postgresql://dev-honeydo-pilot-db.cwkfm0ctmqb3.us-east-2.rds.amazonaws.com:5432/seawater?user=seawater_app&password=SeawaterSecure123!&ssl=true
```

## Testing Database Connection

### Using psql CLI
```bash
# Application user connection
PGPASSWORD="SeawaterSecure123!" psql \
  -h dev-honeydo-pilot-db.cwkfm0ctmqb3.us-east-2.rds.amazonaws.com \
  -p 5432 \
  -U seawater_app \
  -d seawater \
  -c "SELECT current_database(), current_user, PostGIS_Version();"
```

### Test PostGIS Functionality
```sql
-- Test spatial query capability
SELECT ST_Distance(
  ST_GeomFromText('POINT(-73.9857 40.7484)', 4326),  -- NYC
  ST_GeomFromText('POINT(-80.1918 25.7617)', 4326)   -- Miami
) as distance_degrees;
```

## Database Isolation Architecture

```
┌─────────────────────────────────────────┐
│   RDS PostgreSQL Instance (us-east-2)   │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │   honeydo    │  │   seawater   │   │
│  │   database   │  │   database   │   │
│  │              │  │              │   │
│  │  HoneyDo     │  │  Climate     │   │
│  │  Platform    │  │  Risk API    │   │
│  └──────────────┘  └──────────────┘   │
│                                         │
│  Complete isolation at database level   │
└─────────────────────────────────────────┘
```

## Security Notes

1. **Database Isolation**: Complete separation from HoneyDo data
2. **User Isolation**: seawater_app user has no access to honeydo database
3. **Network Security**: RDS instance is publicly accessible (pilot mode)
4. **SSL/TLS**: Connections should use SSL in production

## Migration & Deployment

### Create Schema
```bash
# Run schema creation script
psql -h dev-honeydo-pilot-db.cwkfm0ctmqb3.us-east-2.rds.amazonaws.com \
     -U seawater_app \
     -d seawater \
     -f schema/create_tables.sql
```

### Deploy Lambda Functions
1. Update Lambda environment variables with connection details
2. Ensure Lambda security group has access to RDS
3. Test connectivity from Lambda to RDS

## Maintenance

### Backup Strategy
- Automated RDS backups (shared with HoneyDo)
- 7-day retention period
- Point-in-time recovery available

### Monitoring
- CloudWatch metrics for RDS instance
- Database connections and performance metrics
- Query performance insights available

## Cost Optimization

✅ **Zero additional infrastructure cost** - Database shares existing HoneyDo RDS instance
- No separate RDS charges
- Minimal storage impact
- Shared backup costs
- Perfect for pilot/MVP phase

## Support & Troubleshooting

### Common Issues

1. **Connection Timeout**: Check security group rules
2. **Authentication Failed**: Verify password and username
3. **SSL Required**: Add `sslmode=require` to connection string
4. **Permission Denied**: Ensure using correct database name

### Database Cleanup (when needed)
```sql
-- To completely remove Seawater database (admin only)
-- Connect as postgres user to postgres database
DROP DATABASE IF EXISTS seawater;
DROP USER IF EXISTS seawater_app;
```

---
**Created**: August 15, 2025  
**Platform**: AWS RDS PostgreSQL 15.13  
**Status**: Ready for Seawater deployment