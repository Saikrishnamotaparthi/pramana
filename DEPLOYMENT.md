# Deployment Guide for Payment Web Application (Ubuntu 22.04 LTS)

This guide provides step-by-step instructions to deploy the application on an **Ubuntu 22.04 LTS** server with **50GB Disk**, **8GB RAM**, and **2 vCPUs**.

## 1. Initial Server Setup & Prerequisites

Connect to your server via SSH and run the following commands to update the system and install necessary tools.

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install curl, git, and build essentials
sudo apt install -y curl git build-essential unzip
```

### Install Node.js 20 (LTS)
We will use NodeSource to install the latest LTS version of Node.js.

```bash
# Download and setup Node.js 20.x repo
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node -v
npm -v
```

### Install PM2 (Process Manager)
PM2 is used to keep the application running in the background.

```bash
sudo npm install -g pm2
```

### Install Nginx (Web Server)
Nginx will act as a reverse proxy to forward traffic from port 80 (HTTP) to our app on port 3000.

```bash
sudo apt install -y nginx
```

---

## 2. Application Setup

### Step 1: Upload or Clone the Code
Navigate to the web root directory.

```bash
cd /var/www
```

**Option A: Git Clone (Recommended)**
```bash
# Replace with your actual repository URL
sudo git clone https://github.com/Saikrishnamotaparthi/pramana.git payment-web
cd payment-web
```

**Option B: File Upload (Zip)**
If you are uploading a zip file (e.g., via FileZilla or SCP):
1.  Upload `payment-web.zip` to `/var/www/`.
2.  Unzip it:
    ```bash
    sudo unzip payment-web.zip -d payment-web
    cd payment-web
    ```

### Step 2: Set Permissions
Ensure the current user has permission to manage the files.
```bash
sudo chown -R $USER:$USER /var/www/payment-web
```

### Step 3: Install Dependencies
```bash
# Install production dependencies
npm ci

# Recommended: Upgrade npm if needed
sudo npm install -g npm@latest
```

---

## 3. Configuration

### Step 1: Environment Variables
Create the production environment file.

```bash
nano .env.local
```

**Paste your environment variables here.** These MUST be provided by the development team.

```ini
NEXT_PUBLIC_FIREBASE_API_KEY=AIzr...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Backend Secrets
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

Press `Ctrl+O`, `Enter` to save, and `Ctrl+X` to exit.

### Step 2: Build the Application
Compile the Next.js application for production.

```bash
npm run build
```
*Note: This may take a few minutes. Ensure no errors occur.*

---

## 4. Running the Application with PM2

We have included an `ecosystem.config.js` file for easy management.

```bash
# Start the application using PM2
pm2 start ecosystem.config.js

# Save the PM2 list so it restarts on reboot
pm2 save

# Generate startup script (Follow the command output instructions)
pm2 startup
```
*Run the command output by `pm2 startup` (it usually starts with `sudo env PATH...`).*

---

## 5. Nginx Reverse Proxy Configuration

Configure Nginx to enforce HTTP/HTTPS and route traffic to the app.

### Step 1: Create Config File
```bash
sudo nano /etc/nginx/sites-available/payment-web
```

### Step 2: Paste Configuration
Replace `your-domain.com` with your actual domain or server IP.

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com; # Or use text: _ for default

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 3: Enable Site & Restart Nginx
```bash
# Link the config to sites-enabled
sudo ln -s /etc/nginx/sites-available/payment-web /etc/nginx/sites-enabled/

# Remove default site (optional, to avoid conflicts)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 4: Maintenance Page Configuration (Optional)
To serve a maintenance page when the application is stopped (e.g., during updates), add this to your Nginx configuration inside the `server` block:

```nginx
    # Serve maintenance page when the app is down (502 Bad Gateway)
    error_page 502 =502 /maintenance.html;

    location = /maintenance.html {
        root /var/www/payment-web/public;
        internal;
    }
```

This ensures that whenever PM2 stops the app (causing a 502 error from Nginx), the user sees the `maintenance.html` page instead of the default Nginx error page.


---

## 6. (Optional) SSL Certificate with Certbot

If you have a domain name, secure it with a free SSL certificate.

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 7. Troubleshooting & Maintenance

- **View App Logs:**
  ```bash
  pm2 logs payment-web
  ```

- **Restart App:**
  ```bash
  pm2 restart payment-web
  ```

- **Update App:**
  ```bash
  cd /var/www/payment-web
  git pull
  npm ci
  npm run build
  pm2 restart payment-web
  ```

## 8. Quick Guide: Start & Stop the Website

Here are the direct commands to start and stop the website.

### ➤ How to START the Website
If the server was rebooted or the app is stopped, run:

```bash
# 1. Start the app
pm2 start payment-web

# 2. Save the state (so it starts automatically next time)
pm2 save

# 3. Check if it is running
pm2 status
```
*If this is the **first time**, use `pm2 start ecosystem.config.js` instead of `pm2 start payment-web`.*

### ➤ How to STOP (Down) the Deployment
To take the website offline:

```bash
# 1. Stop the application
pm2 stop payment-web

# 2. (Optional) Stop the web server completely
sudo systemctl stop nginx
```

### ➤ Maintenance Mode
If you have configured the **Maintenance Page** (Step 4 in Configuration), follow these steps to toggle maintenance mode.

**To Enable Maintenance Mode:**
Stopping the app will automatically show the maintenance page.
```bash
pm2 stop payment-web
```

**To Disable Maintenance Mode (Go Live):**
Starting the app will remove the maintenance page and show the actual website.
```bash
pm2 start payment-web
```


### ➤ How to RESTART (Update)
If you made code changes or the site is stuck:

```bash
pm2 restart payment-web
```
git pull
npm install
npm run build
pm2 restart payment-web

1. VPN Access has been provided, and details are as follows: -

      Username:   pramana.hyd@gitam.edu
      Password:    h4ObBVYE0xPbJs#X

      Procedure to connect VPN on the home PC/laptop:
      * Browse "vpn.gitam.edu"
      * Log in with credentials and download and install the Cisco AnyConnect VPN client.
      * Open Cisco AnyConnect VPN client, enter vpn.gitam.edu
      * Select group "GITAM-CUSTOM-VPN" and enter the credentials, and click on connect.
      * Enter a 6-digit code that you received on your mobile phone ( 7995988480 ).
      * After the VPN connection is established, you can connect to the server through the PuTTY/Mobaxterm applications.

2. A new instance has been created, and the credentials are as follows:-
      
      Server IP: 172.17.84.11
      Username: pramana
      Password: xVUEzvKX$M9TyJNi
      SSH Port: 2022
      URL: https://pramana.gitam.edu


cd /var/www
cd /var/www/payment-web
git pull
npm install
npm run build
pm2 restart payment-web

Saikrishnamotaparthi
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