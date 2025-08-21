# Lambda Build Standards for Seawater Platform

## Overview

Lambda functions in the Seawater platform follow Tim-Combo patterns with specific requirements to avoid directory traversal issues in the AWS Lambda runtime environment.

## Build Architecture

### Directory Structure
```
src/backend/dist/
├── functionName/
│   ├── index.js          # Main handler (bundled)
│   ├── lambdaWrapper.js  # Helper (copied)
│   ├── dbOperations.js   # Helper (copied)
│   ├── responseUtil.js   # Helper (copied)
│   ├── errorHandler.js   # Helper (copied)
│   └── [other helpers]   # All helpers copied locally
```

### Build Process

1. **Source Code Location**: All handlers in `/src/handlers/` and `/src/backend/src/handlers/`
2. **Helper Files**: Located in `/src/helpers/`
3. **Build Output**: Each function gets its own directory in `/dist/`
4. **Helper Distribution**: All helper files copied to each function directory

### Import Pattern

**❌ WRONG - Directory Traversal**:
```javascript
const { wrapHandler } = require('../helpers/lambdaWrapper');
const { executeQuery } = require('../../helpers/dbOperations');
```

**✅ CORRECT - Local Imports**:
```javascript
const { wrapHandler } = require('./lambdaWrapper');
const { executeQuery } = require('./dbOperations');
const { createSuccessResponse } = require('./responseUtil');
```

## Build Script Configuration

### Function Definition Pattern
```javascript
const lambdaFunctions = [
  {
    name: 'functionName',
    entryPoint: 'path/to/handler.js',
    outdir: 'dist/functionName',        // Function directory
    outfile: 'dist/functionName/index.js'  // Main handler file
  }
];
```

### Helper Files List
```javascript
const helperFiles = [
  'lambdaWrapper.js',
  'validationUtil.js', 
  'dbOperations.js',
  'responseUtil.js',
  'errorHandler.js',
  'dbClient.js',
  'eventParser.js',
  'httpClient.js',
  'cacheManager.js',
  'geocodingService.js',
  'spatialQueries.js',
  'climateDataAggregator.js'
];
```

## SAM Template Configuration

### CodeUri Pattern
```yaml
FunctionName:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: ../src/backend/dist/functionName/  # Directory path
    Handler: index.handler                      # Always index.handler
```

## Development Workflow

1. **Create Handler**: Place in appropriate `/src/handlers/` subdirectory
2. **Use Local Imports**: Always import helpers from `'./'`
3. **Update Build Script**: Add function to `lambdaFunctions` array
4. **Update SAM Template**: Use correct `CodeUri` directory path
5. **Build**: Run `npm run build` to bundle and copy helpers
6. **Deploy**: Use SAM CLI with updated template

## Why This Pattern?

- **AWS Lambda Constraints**: Directory traversal (`../`) doesn't work reliably in Lambda runtime
- **Bundle Size Optimization**: Each function only includes needed dependencies
- **Deployment Reliability**: Self-contained function packages
- **Security**: Prevents path traversal vulnerabilities
- **Performance**: Faster cold starts with smaller bundles

## Adding New Functions

1. Create handler file with local imports:
```javascript
const { wrapHandler } = require('./lambdaWrapper');
const { executeQuery } = require('./dbOperations');

const myHandler = async (event) => {
  // Handler logic
};

exports.handler = wrapHandler(myHandler);
```

2. Add to build script:
```javascript
{
  name: 'myNewFunction',
  entryPoint: 'path/to/myHandler.js',
  outdir: 'dist/myNewFunction',
  outfile: 'dist/myNewFunction/index.js'
}
```

3. Add to SAM template:
```yaml
MyNewFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: ../src/backend/dist/myNewFunction/
    Handler: index.handler
```

## Verification

After building, verify structure:
```bash
ls -la src/backend/dist/functionName/
# Should show index.js and all helper files
```

This pattern ensures consistent, reliable Lambda deployments following AWS best practices and Tim-Combo standards.