#!/bin/sh
set -e

# Substitute only BACKEND_URL in nginx config, preserving other nginx variables like $uri
envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Start Nginx
exec nginx -g 'daemon off;'
