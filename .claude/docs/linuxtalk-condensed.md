# SpacetimeDB Oracle Linux Server - Reference Guide

## Server Information
- **Username**: ubuntu
- **IP Address**: 64.181.202.3
- **SpacetimeDB Path**: `/home/ubuntu/.cargo/bin/spacetimedb-standalone`
- **Data Directory**: `/home/ubuntu/.local/share/spacetime/data`
- **JWT Key Directory**: `/home/ubuntu/.config/spacetime/`

## Key Commands

### Checking SpacetimeDB Status
```bash
# Check if SpacetimeDB is running
ps aux | grep spacetime

# Check SpacetimeDB data directory
ls -la ~/.local/share/spacetime/data
```

### Starting SpacetimeDB
```bash
# Start SpacetimeDB in the background
/home/ubuntu/.cargo/bin/spacetimedb-standalone start --data-dir /home/ubuntu/.local/share/spacetime/data --jwt-key-dir /home/ubuntu/.config/spacetime/
```

### SSL Certificate Management
```bash
# Generate SSL certificates using DNS challenge
sudo certbot certonly --manual --preferred-challenges dns -d api.fractaloutlook.com

# Check certificates
sudo ls -la /etc/letsencrypt/live/api.fractaloutlook.com/
```

### Nginx Configuration
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/spacetimedb.conf

# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/spacetimedb.conf /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Nginx Configuration Template
```nginx
server {
    listen 80;
    server_name api.fractaloutlook.com;
    
    # Redirect all HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name api.fractaloutlook.com;
    
    # SSL certificate paths
    ssl_certificate /etc/letsencrypt/live/api.fractaloutlook.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.fractaloutlook.com/privkey.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    # WebSocket proxy configuration
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range';
    }
}
```

## Module Deployment
```bash
# Publishing a module
cd ~/status-module
/home/ubuntu/.cargo/bin/spacetimedb-standalone publish --project-path . status-module

# List all published modules
spacetime modules
```

## Accessing Server from Windows
```powershell
# SSH access from Windows PowerShell
ssh -i "C:\Users\USER\My Documents\oracle\ssh-key-2025-03-12 (1).key" ubuntu@149.130.211.144

# Using PuTTY
plink ubuntu@149.130.211.144 -no-antispoof -i "C:\Users\USER\My Documents\oracle\oracle_private2.ppk"
```

## Auto-Start Configuration (Systemd Service)
```bash
# Create systemd service file
mkdir -p ~/.config/systemd/user/
nano ~/.config/systemd/user/spacetimedb.service

# Enable and start the service
systemctl --user daemon-reload
systemctl --user enable spacetimedb.service
systemctl --user start spacetimedb.service
```

### Systemd Service Template
```ini
[Unit]
Description=SpacetimeDB Standalone Server
After=network.target

[Service]
Type=simple
ExecStart=/home/ubuntu/.cargo/bin/spacetimedb-standalone start --data-dir /home/ubuntu/.local/share/spacetime/data --jwt-key-dir /home/ubuntu/.config/spacetime/
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=default.target
```

## Oracle Cloud Operations
- When rebooting the system, verify SpacetimeDB restarts properly
- Create backups of boot volumes before major changes
- Ensure firewall settings allow port 80, 443 (HTTPS) and 3000 (SpacetimeDB)
