FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=allyvia.settings

# Set work directory
WORKDIR /app

# Copy project
COPY * .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Run entrypoint script
RUN ["chmod", "+x", "/app/entrypoint.sh"]
ENTRYPOINT ["sh", "/app/entrypoint.sh"]
