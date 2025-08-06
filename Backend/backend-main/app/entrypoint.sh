#!/bin/sh

# Wait for database to be ready (if using PostgreSQL)
if [ "$USE_POSTGRES" = "True" ]; then
    echo "Waiting for PostgreSQL database at $DB_HOST:$DB_PORT..."
    
    # Wait for PostgreSQL to be ready
    # Install netcat if needed
    apt-get update && apt-get install -y netcat-openbsd
    
    # Wait for PostgreSQL
    while ! nc -z $DB_HOST $DB_PORT; do
      echo "Waiting for PostgreSQL to be ready..."
      sleep 2
    done
    
    echo "PostgreSQL is ready!"
fi

# Collect static files
python manage.py collectstatic --noinput

# Apply database migrations
python manage.py migrate

# Create superuser if DJANGO_SUPERUSER_* env vars are set
if [ "$DJANGO_SUPERUSER_USERNAME" != "" ] && [ "$DJANGO_SUPERUSER_PASSWORD" != "" ] && [ "$DJANGO_SUPERUSER_EMAIL" != "" ]; then
    python manage.py createsuperuser --noinput
fi

# Start server
if [ "$DJANGO_ENVIRONMENT" = "dev" ]; then
    echo "Starting development server..."
    python manage.py runserver 0.0.0.0:8000
else
    echo "Starting production server with gunicorn..."
    gunicorn allyvia.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120
fi
