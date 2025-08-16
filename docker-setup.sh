#!/bin/bash

echo "🚀 HeyReach Docker Setup"
echo "=========================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs screenshots

# Build and start services
echo "🐳 Building and starting HeyReach services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service status
echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "🎉 HeyReach is now running!"
echo ""
echo "📊 Service URLs:"
echo "   - HeyReach App: http://localhost:5001"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis: localhost:6379"
echo ""
echo "📋 Useful commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop services: docker-compose down"
echo "   - Restart services: docker-compose restart"
echo "   - Update and restart: docker-compose up --build -d"
echo ""
echo "🧪 Test the system:"
echo "   curl http://localhost:5001/api/health"
echo ""
echo "📚 For more information, see HEYREACH-GUIDE.md"
