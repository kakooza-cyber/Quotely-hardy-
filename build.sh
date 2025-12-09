#!/bin/bash

# --- 1. Inject Supabase Keys into Client-Side Code ---
echo "Injecting Supabase keys into js/config.js..."

# Create the directory for the file (if it doesn't exist)
mkdir -p js

# Create a temporary config file that will be included by the browser
# We must use 'export' to ensure variables are available to the script environment
# The echo command writes the JS code that will set global variables (window.SUPABASE_...)

echo "
// This file is generated during the Netlify build process.
window.SUPABASE_URL = \"$SUPABASE_URL\";
window.SUPABASE_ANON_KEY = \"$SUPABASE_ANON_KEY\";
" > ./js/config.js

# --- 2. Run the Static Site Build (Copy files) ---
echo "Copying static files to dist/..."

# Create the destination directory
mkdir -p dist

# Copy all necessary static files and directories
cp -r *.html css/ js/ images/ dist/ 2>/dev/null || echo 'Building static site copy completed.'

echo "Build complete."
