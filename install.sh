#!/bin/bash

echo "========================================="
echo "Carousel Advertorial Editor - Setup"
echo "========================================="
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    echo "Please install Node.js and npm from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js and npm found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ Installation Complete!"
    echo "========================================="
    echo ""
    echo "To start the editor:"
    echo "  npm run dev"
    echo ""
    echo "The editor will open at http://localhost:3000"
    echo ""
    echo "📚 Documentation:"
    echo "  - QUICK_START.md - Get started in 5 minutes"
    echo "  - README.md - Complete documentation"
    echo "  - SYSTEM_OVERVIEW.md - Technical details"
    echo "  - DEPLOYMENT_CHECKLIST.md - Deployment guide"
    echo ""
else
    echo ""
    echo "❌ Installation failed"
    echo "Please check the error messages above"
    exit 1
fi
