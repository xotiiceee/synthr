#!/bin/bash
# SSL certificate setup script for synthr on IONOS VPS
# Run after Nginx config is in place and domain points to your VPS

set -e

# Replace with your domain
DOMAIN="your-domain.com"
EMAIL="your-email@example.com"  # For Let's Encrypt notifications

echo "Setting up SSL for $DOMAIN..."

# Check if Certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Check if Nginx config exists for this domain
if [ ! -f "/etc/nginx/sites-available/synthr" ]; then
    echo "ERROR: Nginx config not found at /etc/nginx/sites-available/synthr"
    echo "Please copy deploy/nginx-synthr.conf first and update YOUR_DOMAIN"
    exit 1
fi

# Obtain SSL certificate
echo "Requesting SSL certificate from Let's Encrypt..."
sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email "$EMAIL"

# Test auto-renewal
echo "Testing auto-renewal..."
sudo certbot renew --dry-run

# Ensure auto-renewal timer is active
sudo systemctl enable --now certbot.timer

echo "SSL setup complete! Your site should be accessible at https://$DOMAIN"
