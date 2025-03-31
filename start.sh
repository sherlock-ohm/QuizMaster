#!/bin/bash

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js to run this application."
    echo "Visit https://nodejs.org/ for installation instructions."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm to run this application."
    echo "It usually comes with Node.js installation."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Create quizzes directory if it doesn't exist
if [ ! -d "quizzes" ]; then
    mkdir quizzes
    echo "Created quizzes directory."
fi

# Create uploads directory if it doesn't exist
if [ ! -d "uploads" ]; then
    mkdir uploads
    echo "Created uploads directory."
fi

# Copy sample quiz to quizzes directory if it doesn't exist there
if [ -f "sample-quiz.json" ] && [ ! -f "quizzes/sample-quiz.json" ]; then
    cp sample-quiz.json quizzes/1617293847.json
    echo "Added sample quiz to quizzes directory."
fi

# Parse command line arguments
ALL_INTERFACES=false
CUSTOM_PORT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --all-interfaces)
            ALL_INTERFACES=true
            shift
            ;;
        -p|--port)
            if [[ $2 =~ ^[0-9]+$ ]]; then
                CUSTOM_PORT="$2"
                shift 2
            else
                echo "Error: Port must be a number"
                exit 1
            fi
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: ./start.sh [--all-interfaces] [-p|--port PORT]"
            exit 1
            ;;
    esac
done

# Start the application
echo "Starting Quizmaster application..."

# Build the command with the appropriate options
CMD="npm start --"
if [ "$ALL_INTERFACES" = true ]; then
    CMD="$CMD --all-interfaces"
    if [ -n "$CUSTOM_PORT" ]; then
        echo "Listening on all network interfaces on port $CUSTOM_PORT"
        echo "Access the application from other devices using http://YOUR_IP_ADDRESS:$CUSTOM_PORT"
        CMD="$CMD -p $CUSTOM_PORT"
    else
        echo "Listening on all network interfaces on port 3000"
        echo "Access the application from other devices using http://YOUR_IP_ADDRESS:3000"
    fi
else
    if [ -n "$CUSTOM_PORT" ]; then
        echo "Listening on localhost only on port $CUSTOM_PORT"
        echo "Open your browser and navigate to http://localhost:$CUSTOM_PORT"
        CMD="$CMD -p $CUSTOM_PORT"
    else
        echo "Listening on localhost only on port 3000"
        echo "Open your browser and navigate to http://localhost:3000"
    fi
fi

# Execute the command
$CMD