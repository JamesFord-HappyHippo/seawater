#!/bin/bash

# package-lambdas.sh - Package Lambda functions for Seawater deployment
# Following Tim-Combo deployment patterns

set -e

echo "🚀 Packaging Seawater Lambda functions..."

# Create temp directory for packaging
TEMP_DIR=$(mktemp -d)
echo "Using temp directory: $TEMP_DIR"

# Function to package a Lambda function
package_lambda() {
    local function_name=$1
    local source_path=$2
    local zip_name=$3
    
    echo "📦 Packaging $function_name..."
    
    # Create function directory
    local func_dir="$TEMP_DIR/$function_name"
    mkdir -p "$func_dir"
    
    # Copy source files
    cp -r src/helpers "$func_dir/"
    cp "$source_path" "$func_dir/"
    
    # Copy package.json if it exists
    if [ -f "package.json" ]; then
        cp package.json "$func_dir/"
    fi
    
    # Create a minimal package.json if it doesn't exist
    if [ ! -f "$func_dir/package.json" ]; then
        cat > "$func_dir/package.json" << EOF
{
  "name": "seawater-$function_name",
  "version": "1.0.0",
  "description": "Seawater Climate Risk Platform - $function_name",
  "main": "$(basename $source_path)",
  "dependencies": {
    "pg": "^8.11.3"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF
    fi
    
    # Install dependencies in function directory
    cd "$func_dir"
    npm install --production --no-package-lock
    
    # Create ZIP file
    zip -r "../$zip_name" . -x "*.git*" "node_modules/.cache/*" "*.DS_Store*"
    
    cd - > /dev/null
    
    echo "✅ Created $zip_name"
}

# Create deployment directory
mkdir -p dist/

# Package each Lambda function
package_lambda "healthCheck" "src/handlers/healthCheck.js" "healthCheck.zip"
package_lambda "getPropertyRisk" "src/handlers/climate/getPropertyRisk.js" "getPropertyRisk.zip"
package_lambda "compareProperties" "src/handlers/climate/compareProperties.js" "compareProperties.zip"
package_lambda "getGeographicRisk" "src/handlers/climate/getGeographicRisk.js" "getGeographicRisk.zip"

# Move ZIP files to dist directory
mv "$TEMP_DIR"/*.zip dist/

# Clean up temp directory
rm -rf "$TEMP_DIR"

echo "📋 Lambda packages created:"
ls -la dist/*.zip

echo "✅ Lambda packaging complete!"
echo ""
echo "Next steps:"
echo "1. Upload ZIP files to S3 bucket: seawater-dev-lambda"
echo "2. Deploy with: sam deploy --template-file IAC/phase1-simple.yaml"