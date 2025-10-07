#!/bin/bash

# Test Build Script for Allyvia Frontend
# This script serves the built files locally and provides cache-busting

echo "🚀 Starting local test server for built Allyvia frontend..."
echo "📁 Serving from: $(pwd)/dist"
echo ""

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found!"
    echo "Please run 'npm run build' first."
    exit 1
fi

# Display build info
echo "📋 Build Information:"
echo "   Built files: $(ls -1 dist/assets/*.js | wc -l | tr -d ' ') JavaScript files"
echo "   Main file: $(ls dist/assets/index-*.js | head -1 | xargs basename)"
echo "   Size: $(du -sh dist | cut -f1)"
echo ""

# Check for common issues
echo "🔍 Pre-flight checks:"

# Check for localhost references
if grep -r "localhost:8000" dist/ > /dev/null 2>&1; then
    echo "   ⚠️  Warning: Found localhost:8000 references in build"
else
    echo "   ✅ No localhost references found"
fi

# Check main JS file exists
MAIN_JS=$(grep -o '/assets/index-[^"]*\.js' dist/index.html | head -1 | sed 's|/assets/||')
if [ -f "dist/assets/$MAIN_JS" ]; then
    echo "   ✅ Main JavaScript file exists: $MAIN_JS"
else
    echo "   ❌ Main JavaScript file missing: $MAIN_JS"
fi

echo ""
echo "🌐 Starting server on http://localhost:3001"
echo "💡 Tips:"
echo "   - Clear browser cache if you see old files"
echo "   - Use Ctrl+Shift+R for hard refresh"
echo "   - Press Ctrl+C to stop the server"
echo ""

# Start server with proper MIME types
cd dist
python3 -m http.server 3001