# AWS Deployment Guide - Quiz Tuition Application

This guide provides step-by-step instructions to deploy the Quiz Tuition application on AWS. The backend runs on EC2 with Docker Compose, and the frontend is deployed on AWS Amplify.

**Architecture:**

- **Backend**: EC2 (free tier) running Docker Compose with API server and workers
- **Database**: RDS PostgreSQL (free tier)
- **Redis**: Running in Docker on EC2
- **Frontend**: AWS Amplify (managed Next.js hosting)
- **Storage**: S3 bucket for uploads
- **Region**: ap-south-1 (Mumbai)

---

## Phase 1: AWS Infrastructure Setup

### Task 1: Create VPC with Public and Private Subnets

1. Log in to AWS Console and navigate to **VPC Dashboard**
2. Click **"Create VPC"**
3. Select **"VPC and more"** option
4. Configure:
   - **Name tag**: `quiz-tuition-vpc`
   - **IPv4 CIDR block**: `10.0.0.0/16`
   - **Number of Availability Zones**: `2`
   - **Number of public subnets**: `2`
   - **Number of private subnets**: `2`
   - **NAT gateways**: `1` (in 1 AZ for cost savings)
   - **VPC endpoints**: Leave default
   - **DNS hostnames**: `Enable`
   - **DNS resolution**: `Enable`
5. Click **"Create VPC"**
6. Wait for creation to complete (2-3 minutes)

**Note**: This creates a VPC with 2 public subnets (for EC2) and 2 private subnets (for RDS). NAT gateway is optional but needed if private subnets require internet access.

---

### Task 2: Create Internet Gateway and Attach to VPC

1. In VPC Dashboard, go to **Internet Gateways**
2. If not automatically created, click **"Create internet gateway"**
3. Name: `quiz-tuition-igw`
4. Click **"Create internet gateway"**
5. Select the newly created gateway, click **"Actions" → "Attach to VPC"**
6. Select your VPC (`quiz-tuition-vpc`)
7. Click **"Attach internet gateway"**

**Note**: Internet Gateway allows resources in public subnets to access the internet.

---

### Task 3: Configure Route Tables for Public Subnet

1. Go to **Route Tables** in VPC Dashboard
2. Find the public route table (should be named `quiz-tuition-vpc-public-*`)
3. Click on it, then click **"Routes"** tab
4. Verify it has a route:
   - Destination: `0.0.0.0/0`
   - Target: Your Internet Gateway
5. If missing, click **"Edit routes" → "Add route"**:
   - Destination: `0.0.0.0/0`
   - Target: Select your Internet Gateway
   - Click **"Save changes"**
6. Go to **"Subnet associations"** tab
7. Ensure both public subnets are associated with this route table
8. If not, click **"Edit subnet associations"** and select both public subnets

**Note**: This ensures public subnets can route traffic to/from the internet.

---

### Task 4: Create Security Groups

Create security groups for different components:

#### Security Group 1: EC2 (Backend Server)

1. Go to **Security Groups** in VPC Dashboard
2. Click **"Create security group"**
3. Configure:
   - **Name**: `quiz-tuition-ec2-sg`
   - **Description**: `Security group for EC2 backend server`
   - **VPC**: Select `quiz-tuition-vpc`
4. **Inbound rules** - Click **"Add rule"**:
   - Type: `SSH`, Port: `22`, Source: `My IP` (or `0.0.0.0/0` if needed)
   - Type: `HTTP`, Port: `80`, Source: `0.0.0.0/0`
   - Type: `HTTPS`, Port: `443`, Source: `0.0.0.0/0`
   - Type: `Custom TCP`, Port: `4080`, Source: `0.0.0.0/0` (for API)
5. **Outbound rules**: Leave default (all traffic allowed)
6. Click **"Create security group"**

#### Security Group 2: RDS (Database)

1. Click **"Create security group"** again
2. Configure:
   - **Name**: `quiz-tuition-rds-sg`
   - **Description**: `Security group for RDS PostgreSQL`
   - **VPC**: Select `quiz-tuition-vpc`
3. **Inbound rules**:
   - Type: `PostgreSQL`, Port: `5432`, Source: Select `quiz-tuition-ec2-sg` (this allows EC2 to connect)
4. **Outbound rules**: Leave default
5. Click **"Create security group"**

**Note**: Security groups control inbound/outbound traffic. RDS only allows connections from EC2.

---

### Task 5: Create RDS PostgreSQL Instance

1. Navigate to **RDS Dashboard** in AWS Console
2. Click **"Create database"**
3. Select **"Standard create"**
4. **Engine options**:
   - Engine type: `PostgreSQL`
   - Version: `15.x` or latest stable
5. **Templates**: Select **"Free tier"**
6. **Settings**:
   - **DB instance identifier**: `quiz-tuition-db`
   - **Master username**: `postgres` (or your preferred username)
   - **Master password**: Create a strong password (save it securely!)
   - **Confirm password**: Re-enter password
7. **Instance configuration**:
   - **DB instance class**: `db.t3.micro` (free tier)
8. **Storage**:
   - Storage type: `General Purpose SSD (gp3)`
   - Allocated storage: `20 GB` (free tier limit)
   - Storage autoscaling: `Disable` (to stay in free tier)
9. **Connectivity**:
   - **VPC**: Select `quiz-tuition-vpc`
   - **Subnet group**: Use default or create new (must use private subnets)
   - **Public access**: `No` (private subnet only)
   - **VPC security group**: Select existing `quiz-tuition-rds-sg`
   - **Availability Zone**: Leave default or choose `ap-south-1a`
10. **Database authentication**: `Password authentication`
11. **Additional configuration**:
    - **Initial database name**: `quiz_tuition` (optional, can create later)
    - **Backup retention period**: `7 days` (per requirements)
    - **Backup window**: Leave default
    - **Enable encryption**: `Enable` (free, good practice)
    - **Monitoring**: `Disable` (to avoid costs)
    - **Performance Insights**: `Disable`
    - **Deletion protection**: `Enable` (prevents accidental deletion)
12. Click **"Create database"**
13. Wait for database to become available (5-10 minutes)

**Note**: RDS free tier includes 750 hours/month of `db.t3.micro` and 20 GB storage.

---

### Task 6: Get RDS Endpoint and Connection Details

1. In RDS Dashboard, click on your database (`quiz-tuition-db`)
2. Under **"Connectivity & security"** tab, note:
   - **Endpoint**: e.g., `quiz-tuition-db.xxxxxxxxx.ap-south-1.rds.amazonaws.com`
   - **Port**: `5432`
3. Under **"Configuration"** tab, note:
   - **DB instance class**: `db.t3.micro`
   - **Master username**: The username you set (e.g., `postgres`)
4. Save these details in a secure location. You'll need:
   - **Endpoint**: `quiz-tuition-db.xxxxxxxxx.ap-south-1.rds.amazonaws.com`
   - **Port**: `5432`
   - **Username**: `postgres`
   - **Password**: The password you set
   - **Database name**: `quiz_tuition` (or default `postgres`)

**Format for connection string (save this):**

```
postgresql://postgres:YOUR_PASSWORD@quiz-tuition-db.xxxxxxxxx.ap-south-1.rds.amazonaws.com:5432/quiz_tuition
```

---

### Task 7: Create/Verify S3 Bucket for Uploads

1. Navigate to **S3 Dashboard** in AWS Console
2. If you already have a bucket, skip to verification. Otherwise:

   - Click **"Create bucket"**
   - **Bucket name**: `quiz-tuition-uploads-prod` (must be globally unique)
   - **AWS Region**: `ap-south-1`
   - **Object Ownership**: `ACLs enabled` or `Bucket owner enforced`
   - **Block Public Access settings**: Leave defaults (all blocked)
   - **Bucket Versioning**: `Enable` (for backup safety)
   - **Default encryption**: `Enable` → `SSE-S3`
   - **Advanced settings**: Leave defaults
   - Click **"Create bucket"**

3. **Verify bucket**:
   - Click on your bucket name
   - Go to **"Permissions"** tab
   - Under **"Bucket policy"**, note that it's empty (we'll configure IAM roles for access)
   - Go to **"Properties"** tab
   - Note the **"Bucket ARN"**: e.g., `arn:aws:s3:::quiz-tuition-uploads-prod`

**Note**: S3 free tier includes 5 GB storage, 20,000 GET requests, and 2,000 PUT requests per month.

---

### Task 8: Configure S3 Bucket CORS Policy

1. In your S3 bucket (`quiz-tuition-uploads-prod`), go to **"Permissions"** tab
2. Scroll to **"Cross-origin resource sharing (CORS)"**
3. Click **"Edit"**
4. Add this CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

5. Click **"Save changes"**

**Note**: CORS allows your frontend (Amplify) to request presigned URLs from your API. You can restrict `AllowedOrigins` to your domain later.

---

### Task 9: Create EC2 Instance

1. Navigate to **EC2 Dashboard** in AWS Console
2. Click **"Launch instance"**
3. **Name**: `quiz-tuition-backend`
4. **Application and OS Images (Amazon Machine Image)**:
   - Select **"Amazon Linux 2023 AMI"** (free tier eligible)
   - Architecture: `64-bit (x86)`
5. **Instance type**:
   - Select **"t2.micro"** or **"t3.micro"** (free tier eligible)
   - vCPUs: 1-2, RAM: 1 GB (sufficient for Docker Compose)
6. **Key pair (login)**:
   - If you have a key pair: Select it from dropdown
   - If not: Click **"Create new key pair"**
     - Name: `quiz-tuition-key`
     - Key pair type: `RSA`
     - Private key file format: `.pem` (for Linux/Mac) or `.ppk` (for Windows PuTTY)
     - Click **"Create key pair"**
     - **Important**: Download and save the `.pem` file securely. You won't be able to download it again.
7. **Network settings**:
   - **VPC**: Select `quiz-tuition-vpc`
   - **Subnet**: Select one of the public subnets (e.g., `quiz-tuition-vpc-public-1-ap-south-1a`)
   - **Auto-assign Public IP**: `Enable`
   - **Firewall (security groups)**: Select `quiz-tuition-ec2-sg`
8. **Configure storage**:
   - Size: `8 GB` (free tier includes 30 GB EBS, but 8 GB is sufficient)
   - Volume type: `gp3` (default)
   - Delete on termination: `Unchecked` (keep data if instance is terminated)
9. **Advanced details** (optional):
   - **IAM instance profile**: Leave default (we'll use IAM user credentials)
   - **User data**: Leave empty (we'll install manually)
10. Click **"Launch instance"**
11. Wait for instance to become **"Running"** (1-2 minutes)
12. Click on instance ID to view details

**Note**: EC2 free tier includes 750 hours/month of `t2.micro` or `t3.micro` and 30 GB EBS storage.

---

### Task 10: Allocate Elastic IP and Attach to EC2

1. In EC2 Dashboard, go to **"Elastic IPs"** (left sidebar)
2. Click **"Allocate Elastic IP address"**
3. Configure:
   - **Network border group**: Select your region (`ap-south-1`)
   - **Public IPv4 address pool**: `Amazon's pool of IP addresses`
4. Click **"Allocate"**
5. Select the newly allocated Elastic IP
6. Click **"Actions" → "Associate Elastic IP address"**
7. Configure:
   - **Resource type**: `Instance`
   - **Instance**: Select `quiz-tuition-backend`
   - **Private IP address**: Select the private IP of your instance
8. Click **"Associate"**
9. **Note the Elastic IP address**: e.g., `13.127.xxx.xxx` (save this for DNS configuration)

**Note**: Elastic IP is free when attached to a running instance. If instance stops, you may incur charges.

---

### Task 11: Configure EC2 Security Group (Verify)

1. In EC2 Dashboard, go to **"Security Groups"**
2. Select `quiz-tuition-ec2-sg`
3. Go to **"Inbound rules"** tab
4. Verify these rules exist:
   - SSH (22) from your IP or 0.0.0.0/0
   - HTTP (80) from 0.0.0.0/0
   - HTTPS (443) from 0.0.0.0/0
   - Custom TCP (4080) from 0.0.0.0/0
5. If any are missing, click **"Edit inbound rules" → "Add rule"** and add them
6. Click **"Save rules"**

**Note**: Port 4080 is for direct API access. Nginx will proxy this to port 80/443 later.

---

### Task 12: Update RDS Security Group to Allow EC2

1. In **RDS Dashboard**, select your database (`quiz-tuition-db`)
2. Go to **"Connectivity & security"** tab
3. Under **"Security"**, click on the security group link (e.g., `sg-xxxxx`)
4. This opens the VPC Security Groups page
5. Go to **"Inbound rules"** tab
6. Verify rule exists:
   - Type: `PostgreSQL`
   - Port: `5432`
   - Source: `quiz-tuition-ec2-sg` (or the security group ID)
7. If missing, click **"Edit inbound rules" → "Add rule"**:
   - Type: `PostgreSQL`
   - Port: `5432`
   - Source: Select `quiz-tuition-ec2-sg` from dropdown
8. Click **"Save rules"**

**Note**: This allows your EC2 instance to connect to RDS. Only EC2 can connect (private subnet).

---

### Task 13: Create CloudWatch Log Groups (Optional)

1. Navigate to **CloudWatch Dashboard** → **"Logs" → "Log groups"**
2. Click **"Create log group"**
3. Create these log groups (repeat for each):
   - **Log group name**: `/quiz-tuition/api`
     - Retention: `7 days` (free tier)
   - **Log group name**: `/quiz-tuition/rasterize-worker`
     - Retention: `7 days`
   - **Log group name**: `/quiz-tuition/llm-worker`
     - Retention: `7 days`
4. Click **"Create"** for each

**Note**: CloudWatch Logs free tier includes 5 GB ingestion, 5 GB storage, and 10 million API requests per month. 7-day retention is free.

---

## Phase 2: EC2 Server Setup

### Task 14: SSH into EC2 Instance

**For Linux/Mac:**

```bash
# Navigate to where you saved the .pem file
cd ~/Downloads  # or wherever your key is

# Set correct permissions
chmod 400 quiz-tuition-key.pem

# SSH into instance
# Replace with your EC2 instance's public IP or Elastic IP
ssh -i quiz-tuition-key.pem ec2-user@YOUR_EC2_IP_ADDRESS

# Example:
# ssh -i quiz-tuition-key.pem ec2-user@13.127.xxx.xxx
```

**For Windows (using PuTTY):**

1. Download PuTTY and PuTTYgen from https://www.putty.org/
2. Convert `.pem` to `.ppk`:
   - Open PuTTYgen
   - Click **"Load"** → Select your `.pem` file
   - Click **"Save private key"** → Save as `.ppk`
3. Open PuTTY:
   - Host Name: `ec2-user@YOUR_EC2_IP_ADDRESS`
   - Connection type: `SSH`
   - Under **"SSH" → "Auth"**, browse and select your `.ppk` file
   - Under **"Session"**, enter a name and click **"Save"**
   - Click **"Open"** to connect

**Note**: `ec2-user` is the default username for Amazon Linux. For Ubuntu, use `ubuntu`.

---

### Task 15: Update System Packages

Once connected via SSH, run:

```bash
# Update package list and upgrade system
sudo yum update -y

# Install essential utilities
sudo yum install -y git wget curl unzip
```

**Note**: This ensures your system has the latest security patches and necessary tools.

---

### Task 16: Install Docker

```bash
# Install Docker
sudo yum install -y docker

# Start Docker service
sudo systemctl start docker

# Enable Docker to start on boot
sudo systemctl enable docker

# Add ec2-user to docker group (so you can run docker without sudo)
sudo usermod -aG docker ec2-user

# Verify Docker installation
docker --version

# Note: You may need to log out and log back in for group changes to take effect
# Or run: newgrp docker
```

**Verify Docker is running:**

```bash
sudo systemctl status docker
# Should show "active (running)"
```

**Note**: Docker is used to run your application containers.

---

### Task 17: Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Create symbolic link
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Verify installation
docker-compose --version
```

**Alternative method (if above doesn't work):**

```bash
# Install via pip
sudo yum install -y python3-pip
sudo pip3 install docker-compose
```

**Note**: Docker Compose orchestrates multiple containers (API, workers, Redis).

---

### Task 18: Install Nginx (for Reverse Proxy/SSL)

```bash
# Install Nginx
sudo yum install -y nginx

# Start Nginx
sudo systemctl start nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Check Nginx status
sudo systemctl status nginx

# Verify Nginx is accessible
curl http://localhost
# Should return HTML (Nginx welcome page)
```

**Note**: Nginx will serve as a reverse proxy and handle SSL/TLS termination.

---

### Task 19: Install Certbot (for Let's Encrypt SSL)

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

**Note**: Certbot automatically obtains and renews SSL certificates from Let's Encrypt (free).

---

### Task 20: Clone GitHub Repository

```bash
# Navigate to home directory
cd ~

# Clone your repository
# Replace with your actual GitHub repository URL
git clone https://github.com/YOUR_USERNAME/quiz-tuition.git

# Navigate into project directory
cd quiz-tuition

# Verify you're in the right place
ls -la
# Should see: apps/, plan.md, requirements.md, etc.

# Switch to main/master branch
git checkout main
# or: git checkout master
```

**Note**: Make sure your repository is public or you have SSH keys configured for private repos.

---

### Task 21: Install Node.js and npm (for Prisma CLI)

```bash
# Install Node.js 20.x (LTS)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x

# Install Prisma CLI globally (optional, but helpful)
sudo npm install -g prisma
```

**Note**: Node.js is needed to run Prisma CLI for migrations. You can also use it from Docker containers.

---

### Task 22: Create Application Directory Structure

```bash
# Navigate to project root
cd ~/quiz-tuition

# Create directory for environment files
mkdir -p ~/quiz-tuition-deploy

# Create directory for logs
sudo mkdir -p /var/log/quiz-tuition

# Set permissions
sudo chown ec2-user:ec2-user /var/log/quiz-tuition
```

**Note**: We'll store production environment files separately from the repository.

---

## Phase 3: Backend Configuration

### Task 23: Create .env File on EC2

```bash
# Navigate to deployment directory
cd ~/quiz-tuition-deploy

# Create .env file
nano .env
# or use: vi .env
```

**Add the following content (replace placeholders with actual values):**

```bash
# Database
DATABASE_URL=postgresql://postgres:YOUR_RDS_PASSWORD@YOUR_RDS_ENDPOINT:5432/quiz_tuition
SHADOW_DATABASE_URL=postgresql://postgres:YOUR_RDS_PASSWORD@YOUR_RDS_ENDPOINT:5432/quiz_tuition_shadow

# Redis (running in Docker, accessible via localhost)
REDIS_URL=redis://localhost:6379

# AWS Configuration
AWS_REGION=ap-south-1
S3_BUCKET_UPLOADS=quiz-tuition-uploads-prod
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY

# JWT Secrets (generate strong random strings)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars-long
JWT_COOKIE_NAME_ACCESS=access_token
JWT_COOKIE_NAME_REFRESH=refresh_token

# Google GenAI
GOOGLE_GENAI_API_KEY=your-google-genai-api-key
GENAI_MODEL_FLASH=gemini-2.5-flash
GENAI_MODEL_FLASH_LITE=gemini-2.5-flash-lite
GENAI_MODEL_2_0=gemini-2.0-flash
GENAI_MODEL_PRO=gemini-2.5-pro

# LLM Scheduler
LLM_SAFETY_FACTOR=1.2
LLM_MIN_TOKENS_PER_REQ=1500
WORKER_CONCURRENCY=5
PROMPT_VERSION=v1

# Server
PORT=4080
NODE_ENV=production
CORS_ORIGIN=https://api.yourdomain.com

# Email (AWS SES - optional for now)
AWS_SES_REGION=ap-south-1
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

**To save and exit:**

- In `nano`: Press `Ctrl+X`, then `Y`, then `Enter`
- In `vi`: Press `Esc`, type `:wq`, press `Enter`

**Important**:

- Replace `YOUR_RDS_PASSWORD` with your RDS master password
- Replace `YOUR_RDS_ENDPOINT` with your RDS endpoint (from Task 6)
- Replace AWS credentials (see Task 24)
- Generate JWT secrets (see below)

**Generate JWT secrets (run on your local machine or EC2):**

```bash
# Generate random secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
```

**Set file permissions:**

```bash
chmod 600 ~/quiz-tuition-deploy/.env
```

---

### Task 24: Get AWS Credentials (Access Key ID and Secret)

**Option 1: Use IAM User (Recommended for EC2)**

1. Navigate to **IAM Dashboard** → **Users**
2. Click **"Create user"**
3. Username: `quiz-tuition-ec2-user`
4. Click **"Next"**
5. Under **"Set permissions"**, select **"Attach policies directly"**
6. Click **"Create policy"** (opens in new tab)
7. Select **"JSON"** tab, paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::quiz-tuition-uploads-prod",
        "arn:aws:s3:::quiz-tuition-uploads-prod/*"
      ]
    }
  ]
}
```

8. Name: `quiz-tuition-s3-access`
9. Click **"Create policy"**
10. Go back to user creation tab, refresh policies, search for `quiz-tuition-s3-access`, select it
11. Click **"Next" → "Create user"**
12. Click on the newly created user
13. Go to **"Security credentials"** tab
14. Click **"Create access key"**
15. Select **"Application running outside AWS"**
16. Click **"Next" → "Create access key"**
17. **IMPORTANT**: Copy and save:
    - **Access key ID**
    - **Secret access key** (shown only once!)
18. Update your `.env` file with these values

**Option 2: Use IAM Instance Role (More Secure)**

- This requires additional configuration but avoids storing credentials in `.env`
- For simplicity, use Option 1 for now

---

### Task 25: Configure Redis Connection

Redis will run in Docker, so the connection URL in `.env` should be:

```bash
REDIS_URL=redis://localhost:6379
```

**Verify this is correct in your `.env` file** (from Task 23).

**Note**: When Redis runs in Docker, it's accessible via `localhost:6379` from other containers in the same Docker network.

---

### Task 26: Set AWS Credentials in .env

1. Open your `.env` file:

```bash
nano ~/quiz-tuition-deploy/.env
```

2. Update these lines with values from Task 24:

```bash
AWS_ACCESS_KEY_ID=AKIA...  # From Task 24
AWS_SECRET_ACCESS_KEY=...  # From Task 24
S3_BUCKET_UPLOADS=quiz-tuition-uploads-prod  # From Task 7
AWS_REGION=ap-south-1
```

3. Save and exit (`Ctrl+X`, `Y`, `Enter` in nano)

---

### Task 27: Set JWT Secrets in .env

1. Generate secrets (if not already done):

```bash
openssl rand -base64 32
openssl rand -base64 32
```

2. Open `.env` file:

```bash
nano ~/quiz-tuition-deploy/.env
```

3. Update:

```bash
JWT_SECRET=<paste-first-generated-secret>
JWT_REFRESH_SECRET=<paste-second-generated-secret>
```

4. Save and exit

---

### Task 28: Set Google GenAI API Keys

1. If you don't have a Google GenAI API key:

   - Go to https://aistudio.google.com/
   - Sign in with Google account
   - Navigate to API keys section
   - Create a new API key

2. Open `.env` file:

```bash
nano ~/quiz-tuition-deploy/.env
```

3. Update:

```bash
GOOGLE_GENAI_API_KEY=your-actual-api-key-here
```

4. Save and exit

---

### Task 29: Create docker-compose.yml

```bash
# Navigate to project directory
cd ~/quiz-tuition/apps/api

# Create docker-compose.yml
nano docker-compose.prod.yml
```

**Add this content:**

```yaml
version: "3.8"

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: ["redis-server", "--save", "", "--appendonly", "no"]
    restart: unless-stopped
    networks:
      - quiz-tuition-network

  api-server:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "4080:4080"
    env_file:
      - /home/ec2-user/quiz-tuition-deploy/.env
    depends_on:
      - redis
    restart: unless-stopped
    networks:
      - quiz-tuition-network
    volumes:
      - /var/log/quiz-tuition:/app/logs

  rasterize-worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
      args:
        WORKER_TYPE: rasterize
    env_file:
      - /home/ec2-user/quiz-tuition-deploy/.env
    depends_on:
      - redis
    restart: unless-stopped
    networks:
      - quiz-tuition-network
    volumes:
      - /var/log/quiz-tuition:/app/logs

  llm-worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
      args:
        WORKER_TYPE: llm
    env_file:
      - /home/ec2-user/quiz-tuition-deploy/.env
    depends_on:
      - redis
    restart: unless-stopped
    networks:
      - quiz-tuition-network
    volumes:
      - /var/log/quiz-tuition:/app/logs

networks:
  quiz-tuition-network:
    driver: bridge
```

**Save and exit.**

**Note**: We'll create the Dockerfiles in the next tasks. This compose file defines all services (API, workers, Redis).

---

### Task 30: Create Production Dockerfile for API Server

```bash
# Navigate to API directory
cd ~/quiz-tuition/apps/api

# Create Dockerfile.prod
nano Dockerfile.prod
```

**Add this content:**

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

FROM node:20-alpine AS runner

# Install runtime dependencies for poppler and sharp
RUN apk add --no-cache \
    poppler \
    poppler-utils \
    vips-dev \
    python3 \
    make \
    g++

WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 4080

CMD ["node", "dist/server.js"]
```

**Save and exit.**

---

### Task 31: Create Worker Dockerfile

```bash
# Still in apps/api directory
nano Dockerfile.worker
```

**Add this content:**

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

RUN apk add --no-cache \
    poppler \
    poppler-utils \
    vips-dev \
    python3 \
    make \
    g++

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

RUN npx prisma generate

# Worker type passed as build arg
ARG WORKER_TYPE
CMD ["node", "dist/jobs/${WORKER_TYPE}.worker.js"]
```

**Save and exit.**

---

### Task 32: Build Docker Images

```bash
# Navigate to API directory
cd ~/quiz-tuition/apps/api

# Build API server image
docker build -f Dockerfile.prod -t quiz-tuition-api:latest .

# Build rasterize worker image
docker build -f Dockerfile.worker --build-arg WORKER_TYPE=rasterize -t quiz-tuition-rasterize:latest .

# Build LLM worker image
docker build -f Dockerfile.worker --build-arg WORKER_TYPE=llm -t quiz-tuition-llm:latest .

# Verify images are created
docker images
# Should show: quiz-tuition-api, quiz-tuition-rasterize, quiz-tuition-llm
```

**Note**: This builds optimized multi-stage Docker images for production.

---

### Task 33: Run Prisma Migrations on RDS Database

```bash
# Navigate to API directory
cd ~/quiz-tuition/apps/api

# Make sure .env is accessible (we'll use it via docker-compose)
# First, create a temporary container to run migrations
docker run --rm \
  --env-file /home/ec2-user/quiz-tuition-deploy/.env \
  -v $(pwd)/prisma:/app/prisma \
  -w /app \
  node:20-alpine sh -c "
    apk add --no-cache python3 make g++ &&
    npm install -g prisma &&
    cd /app &&
    npx prisma migrate deploy
  "

# Alternatively, install Prisma locally and run:
# npx prisma migrate deploy --schema=./prisma/schema.prisma
```

**Better approach - use a migration container:**

```bash
# Create a simple migration script
cat > ~/quiz-tuition/apps/api/run-migrations.sh << 'EOF'
#!/bin/bash
cd /app
npx prisma migrate deploy
npx prisma generate
EOF

chmod +x ~/quiz-tuition/apps/api/run-migrations.sh

# Run migrations using Docker
docker run --rm \
  --env-file /home/ec2-user/quiz-tuition-deploy/.env \
  -v ~/quiz-tuition/apps/api:/app \
  -w /app \
  node:20-alpine sh -c "
    apk add --no-cache python3 make g++ &&
    npm install &&
    npx prisma migrate deploy
  "
```

**Verify migration succeeded:**

- Check RDS connection (we'll test in next tasks)
- Or check Prisma Studio (optional): `npx prisma studio`

---

### Task 34: Seed Database

```bash
# Navigate to API directory
cd ~/quiz-tuition/apps/api

# Run seed script
docker run --rm \
  --env-file /home/ec2-user/quiz-tuition-deploy/.env \
  -v ~/quiz-tuition/apps/api:/app \
  -w /app \
  node:20-alpine sh -c "
    apk add --no-cache python3 make g++ &&
    npm install &&
    node prisma/seed.js
  "
```

**Expected output:**

- Admin user created
- Class 6 subjects and chapters created
- Success messages

**Note**: This creates the initial admin user and taxonomy data.

---

### Task 35: Start All Docker Containers

```bash
# Navigate to API directory
cd ~/quiz-tuition/apps/api

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Verify all containers are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
# Press Ctrl+C to exit log view
```

**Expected output:**

- All 4 services (redis, api-server, rasterize-worker, llm-worker) should show "Up"

**Note**: `-d` flag runs containers in detached mode (background).

---

### Task 36: Verify Containers are Running

```bash
# Check container status
docker ps

# Should show 4 containers:
# - quiz-tuition-api-server-1
# - quiz-tuition-rasterize-worker-1
# - quiz-tuition-llm-worker-1
# - quiz-tuition-redis-1

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs api-server
docker-compose -f docker-compose.prod.yml logs rasterize-worker
docker-compose -f docker-compose.prod.yml logs llm-worker

# Check if API is responding
curl http://localhost:4080/healthz
# Or check a real endpoint:
curl http://localhost:4080/api/v1/health
```

**If containers are not running, check logs:**

```bash
docker-compose -f docker-compose.prod.yml logs
```

---

### Task 37: Test API Health Endpoint

```bash
# Test from EC2
curl http://localhost:4080/api/v1/health

# If you have a /healthz endpoint:
curl http://localhost:4080/healthz

# Test from your local machine (replace with your EC2 Elastic IP):
curl http://YOUR_EC2_ELASTIC_IP:4080/api/v1/health
```

**Expected response:**

- JSON response with status: `{"status": "ok"}` or similar

**If connection fails:**

- Check security group (port 4080 open)
- Check container logs: `docker-compose logs api-server`

---

## Phase 4: Nginx & SSL Configuration

### Task 38: Configure Nginx as Reverse Proxy

```bash
# Backup default config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Create custom configuration
sudo nano /etc/nginx/conf.d/quiz-tuition.conf
```

**Add this configuration:**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com YOUR_EC2_ELASTIC_IP;

    # Logging
    access_log /var/log/nginx/quiz-tuition-access.log;
    error_log /var/log/nginx/quiz-tuition-error.log;

    # Proxy to API server
    location / {
        proxy_pass http://localhost:4080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (optional)
    location /healthz {
        proxy_pass http://localhost:4080/healthz;
        access_log off;
    }
}
```

**Replace `api.yourdomain.com` with your actual subdomain.**

**Save and exit.**

**Test Nginx configuration:**

```bash
sudo nginx -t
# Should show: "syntax is ok" and "test is successful"
```

---

### Task 39: Setup SSL Certificate Using Let's Encrypt

**Before running Certbot, ensure:**

1. Your domain DNS points to EC2 Elastic IP (from Task 10)
2. Port 80 is open in security group
3. Nginx is running

```bash
# Obtain SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Follow prompts:
# - Email address: Enter your email
# - Agree to terms: Type 'A' and press Enter
# - Share email: Type 'N' (optional)
# - Certbot will automatically configure Nginx
```

**Note**: DNS propagation may take 5-30 minutes. If certbot fails, wait and try again.

**Verify certificate:**

```bash
sudo certbot certificates
# Should list your certificate
```

---

### Task 40: Configure Nginx SSL Redirects

Certbot should have automatically updated your Nginx config. Verify:

```bash
# View updated config
sudo cat /etc/nginx/conf.d/quiz-tuition.conf

# Should show:
# - listen 443 ssl;
# - ssl_certificate paths
# - Redirect from port 80 to 443
```

**If not auto-configured, manually update:**

```bash
sudo nano /etc/nginx/conf.d/quiz-tuition.conf
```

**Update to:**

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL certificates (added by certbot)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logging
    access_log /var/log/nginx/quiz-tuition-access.log;
    error_log /var/log/nginx/quiz-tuition-error.log;

    # Proxy to API server
    location / {
        proxy_pass http://localhost:4080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /healthz {
        proxy_pass http://localhost:4080/healthz;
        access_log off;
    }
}
```

**Test and reload:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### Task 41: Configure SSL Auto-Renewal

Let's Encrypt certificates expire in 90 days. Certbot sets up auto-renewal automatically.

**Verify auto-renewal is configured:**

```bash
# Check certbot timer
sudo systemctl status certbot.timer

# Should show "active"

# Test renewal (dry run)
sudo certbot renew --dry-run

# Should show success message
```

**Note**: Certbot runs renewal twice daily and reloads Nginx automatically.

---

### Task 42: Test HTTPS Endpoint

```bash
# Test from EC2
curl https://api.yourdomain.com/healthz
# or
curl https://api.yourdomain.com/api/v1/health

# Test from your local machine
curl https://api.yourdomain.com/api/v1/health
```

**Expected response:**

- JSON response (SSL certificate valid)

**If SSL errors occur:**

- Check DNS propagation: `nslookup api.yourdomain.com`
- Wait for DNS to update (up to 30 minutes)
- Verify port 443 is open in security group

---

## Phase 5: Frontend AWS Amplify Setup

### Task 43: Open AWS Amplify Console

1. Navigate to **AWS Amplify Dashboard** in AWS Console
2. Click **"New app" → "Host web app"**

**Note**: If you don't see Amplify, search for it in AWS services.

---

### Task 44: Connect GitHub Repository

1. In Amplify setup, select **"GitHub"** as source
2. Click **"Authorize"** if prompted (grants Amplify access to GitHub)
3. Select your repository: `quiz-tuition`
4. Select branch: `main` (or `master`)
5. Click **"Next"**

**Note**: Your repository must be public or you must grant Amplify access to your private repos.

---

### Task 45: Configure Build Settings

Amplify should auto-detect Next.js. Verify/configure:

**App directory**: `apps/web`

**Build settings** (YAML format):

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd apps/web
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: apps/web/.next
    files:
      - "**/*"
  cache:
    paths:
      - apps/web/node_modules/**/*
      - apps/web/.next/cache/**/*
```

**Or use Amplify's auto-detection** (usually works for Next.js).

**Environment variables** (click "Environment variables"):

- `NEXT_PUBLIC_API_URL`: `https://api.yourdomain.com`

Click **"Next"**

---

### Task 46: Set Amplify Environment Variables

In the build settings page, add environment variables:

1. Click **"Environment variables"** section
2. Add variable:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://api.yourdomain.com` (your API endpoint from Task 42)
3. Click **"Save"**

**Note**: `NEXT_PUBLIC_*` variables are exposed to the browser in Next.js.

---

### Task 47: Review and Save Configuration

1. Review build settings
2. Review environment variables
3. Click **"Save and deploy"**

**Amplify will now:**

- Install dependencies
- Build your Next.js app
- Deploy to CloudFront

**Wait for deployment to complete (5-15 minutes)**

---

### Task 48: Start Initial Deployment

1. After clicking "Save and deploy", Amplify starts building
2. Monitor build logs in the Amplify console
3. Wait for build to complete (status: "Deployed")

**Common issues:**

- Build failures: Check logs for missing dependencies or TypeScript errors
- Environment variables: Ensure `NEXT_PUBLIC_API_URL` is set

**Build takes 5-15 minutes depending on dependencies.**

---

### Task 49: Wait for Build to Complete

1. In Amplify console, go to your app
2. Click on the deployment (under "All apps" → your app)
3. Monitor **"Build"** phase:
   - Installing dependencies
   - Building Next.js app
   - Deploying to CloudFront

**When status shows "Deployed":**

- Your app is live!
- Note the Amplify domain (e.g., `main.d1234abcd.amplifyapp.com`)

---

### Task 50: Note Amplify App URL

1. After deployment completes, you'll see:
   - **App URL**: `https://main.d1234abcd.amplifyapp.com`
2. Click the URL to test your frontend
3. Save this URL (you can add custom domain later)

**Test the frontend:**

- Open the URL in browser
- Try logging in (use admin credentials from seed)
- Verify API calls are working

**Note**: This is your Amplify-provided domain. You can add a custom domain in Amplify settings.

---

## Phase 6: DNS Configuration

### Task 51: Get EC2 Elastic IP Address

1. In **EC2 Dashboard**, go to **"Elastic IPs"** (left sidebar)
2. Find the Elastic IP associated with your `quiz-tuition-backend` instance
3. **Note the IP address**: e.g., `13.127.xxx.xxx`
4. Save this IP address - you'll need it for DNS configuration

**Verify it's associated:**

- Check the **"Instance"** column - should show `quiz-tuition-backend`
- If not associated, see Task 10 to associate it

**Note**: This is the IP address your domain will point to.

---

### Task 52: Get AWS Amplify Domain URL

1. Navigate to **AWS Amplify Console**
2. Click on your app (`quiz-tuition`)
3. In the left sidebar, click **"Domain management"** (optional, for custom domains)
4. Under **"App settings" → "General"**, note the **"App URL"**
   - Format: `https://main.d1234abcd.amplifyapp.com`
   - Or: `https://master.d1234abcd.amplifyapp.com` (if using master branch)

**Alternatively:**

- In the Amplify app overview, the **"App URL"** is displayed at the top
- Copy this URL and save it

**Note**: This is the Amplify-provided domain. You can optionally set up a custom domain later.

---

### Task 53: Configure DNS in Hostinger for API Subdomain

**Prerequisites:**

- You have access to your Hostinger domain control panel
- You know your subdomain (e.g., `api.yourdomain.com`)

**Steps:**

1. **Log in to Hostinger** control panel (hpanel.hostinger.com)
2. Navigate to **"Domains" → "DNS / Zone Editor"** (or similar)
3. Select your domain
4. **Add A Record** for API subdomain:
   - Click **"Add record"** or **"+"** button
   - **Type**: `A`
   - **Name/Host**: `api` (or your subdomain prefix)
   - **Points to/Value**: Your EC2 Elastic IP from Task 51 (e.g., `13.127.xxx.xxx`)
   - **TTL**: `3600` (or leave default)
   - Click **"Add"** or **"Save"**

**Example:**

- If your domain is `example.com` and you want `api.example.com`:
  - Name: `api`
  - Points to: `13.127.xxx.xxx`

**Verify the record:**

- Wait 5-10 minutes for DNS propagation
- Test with: `nslookup api.yourdomain.com` (should return your Elastic IP)

**Note**: DNS propagation can take 5-30 minutes. Don't proceed to SSL setup until DNS is resolved.

---

### Task 54: (Optional) Configure DNS for Frontend Subdomain

**If you want a custom domain for your frontend** (instead of Amplify's default URL):

1. In Hostinger DNS settings, add a **CNAME record**:

   - **Type**: `CNAME`
   - **Name/Host**: `app` (or `www`, or your preferred subdomain)
   - **Points to/Value**: Your Amplify domain from Task 52
     - Format: `main.d1234abcd.amplifyapp.com` (without `https://`)
   - **TTL**: `3600`
   - Click **"Add"** or **"Save"**

2. **In AWS Amplify Console**:
   - Go to your app → **"Domain management"**
   - Click **"Add domain"**
   - Enter your custom domain: `app.yourdomain.com`
   - Follow Amplify's instructions to verify domain ownership
   - Amplify will provide DNS records to add (CNAME records)
   - Add those records to Hostinger DNS

**Note**: This is optional. The Amplify-provided URL works fine for production.

---

### Task 55: Wait for DNS Propagation and Verify

**Check DNS propagation:**

1. **From your local machine or EC2**, test DNS resolution:

```bash
# Test API subdomain
nslookup api.yourdomain.com
# or
dig api.yourdomain.com

# Should return your EC2 Elastic IP (from Task 51)
```

2. **Verify DNS is pointing correctly:**

   - The A record should resolve to your Elastic IP
   - If not resolved, wait 10-15 minutes and try again

3. **Test HTTP connection** (before SSL is fully configured):

```bash
# From EC2 or your local machine
curl -I http://api.yourdomain.com
# Should return HTTP 301 (redirect to HTTPS) or 200 (if Nginx is configured)
```

4. **Verify frontend DNS** (if you set up custom domain):

```bash
nslookup app.yourdomain.com
# Should return Amplify CloudFront IPs or CNAME target
```

**Troubleshooting:**

- **DNS not resolving**: Wait longer (up to 30 minutes), check Hostinger DNS settings
- **Wrong IP**: Verify A record points to correct Elastic IP
- **CNAME issues**: Ensure CNAME points to Amplify domain without `https://`

**Once DNS is resolved**, you can proceed with SSL certificate setup (if not already done in Task 39).

**Note**: DNS propagation typically takes 5-30 minutes but can take up to 48 hours in rare cases.

---

## Phase 7: Database & Application Verification

### Task 56: Verify RDS Database is Accessible from EC2

**Test database connection:**

1. **SSH into your EC2 instance** (from Task 14)
2. **Install PostgreSQL client** (if not already installed):

```bash
sudo yum install -y postgresql15
# or for older versions:
# sudo yum install -y postgresql
```

3. **Test connection using psql**:

```bash
# Get connection details from your .env file
# DATABASE_URL=postgresql://postgres:PASSWORD@ENDPOINT:5432/quiz_tuition

# Test connection (replace with your actual values)
psql -h YOUR_RDS_ENDPOINT -U postgres -d quiz_tuition -p 5432

# When prompted, enter your RDS password
# If connection succeeds, you'll see: quiz_tuition=>
```

**If connection fails:**

- Check security group: RDS security group must allow EC2 security group on port 5432
- Verify RDS endpoint is correct
- Check RDS instance is running (status: Available)
- Verify password is correct

**Test with a simple query:**

```sql
-- Once connected via psql
SELECT version();
SELECT current_database();
\dt  -- List tables
\q   -- Quit psql
```

**Alternative: Test from Docker container:**

```bash
# From EC2, test using a temporary container
docker run --rm \
  --env-file /home/ec2-user/quiz-tuition-deploy/.env \
  -w /app \
  node:20-alpine sh -c "
    apk add --no-cache postgresql-client &&
    psql \$DATABASE_URL -c 'SELECT version();'
  "
```

**Expected output**: PostgreSQL version information and successful connection.

---

### Task 57: Test Database Connection from Application

**Verify your application can connect to RDS:**

1. **Check application logs** for database connection:

```bash
# View API server logs
docker-compose -f docker-compose.prod.yml logs api-server | grep -i "database\|prisma\|error"

# Should show connection successful messages or no connection errors
```

2. **Test via API health endpoint** (if it includes DB check):

```bash
# From EC2
curl http://localhost:4080/api/v1/health
# or
curl https://api.yourdomain.com/api/v1/health

# Check response includes database status
```

3. **Run a simple Prisma query test**:

```bash
# Create a test script
cat > /tmp/test-db.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database connection successful!', result);
    await prisma.$disconnect();
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

test();
EOF

# Run test in Docker container
docker run --rm \
  --env-file /home/ec2-user/quiz-tuition-deploy/.env \
  -v /tmp/test-db.js:/app/test.js \
  -v ~/quiz-tuition/apps/api/prisma:/app/prisma \
  -w /app \
  node:20-alpine sh -c "
    apk add --no-cache python3 make g++ &&
    npm install @prisma/client &&
    npx prisma generate &&
    node test.js
  "
```

**Expected output**: "Database connection successful!"

**If connection fails:**

- Check `.env` file has correct `DATABASE_URL`
- Verify RDS security group allows EC2
- Check RDS instance is in "Available" state
- Review error messages in logs

---

### Task 58: Verify Redis is Running in Docker Container

**Check Redis container status:**

```bash
# From EC2, check Redis container
docker ps | grep redis
# Should show quiz-tuition-redis container running

# Check Redis logs
docker-compose -f docker-compose.prod.yml logs redis
# Should show Redis server started successfully
```

**Test Redis connection:**

```bash
# Connect to Redis container and test
docker exec -it quiz-tuition-redis-1 redis-cli ping
# Should return: PONG

# Test set/get
docker exec -it quiz-tuition-redis-1 redis-cli set test "hello"
docker exec -it quiz-tuition-redis-1 redis-cli get test
# Should return: "hello"
```

**Verify Redis is accessible from application:**

```bash
# Check application logs for Redis connection
docker-compose -f docker-compose.prod.yml logs api-server | grep -i "redis\|queue"

# Check BullMQ queue status (if your app logs queue info)
docker-compose -f docker-compose.prod.yml logs api-server | grep -i "bull\|queue"
```

**Test Redis connection string:**

```bash
# Verify REDIS_URL in .env
cat ~/quiz-tuition-deploy/.env | grep REDIS_URL
# Should show: REDIS_URL=redis://localhost:6379
```

**If Redis is not accessible:**

- Check container is running: `docker ps`
- Verify network: Containers should be on `quiz-tuition-network`
- Check Redis logs: `docker-compose logs redis`
- Restart containers: `docker-compose -f docker-compose.prod.yml restart`

**Note**: Redis should be accessible at `redis://localhost:6379` from other containers on the same Docker network.

---

### Task 59: Test API Endpoints via HTTPS

**Test from EC2:**

```bash
# Test health endpoint
curl https://api.yourdomain.com/api/v1/health
# or
curl https://api.yourdomain.com/healthz

# Test with verbose output to see SSL
curl -v https://api.yourdomain.com/api/v1/health
```

**Test from your local machine:**

```bash
# Replace with your actual domain
curl https://api.yourdomain.com/api/v1/health

# Test authentication endpoint (should return 401 without credentials)
curl https://api.yourdomain.com/api/v1/auth/login -X POST -H "Content-Type: application/json" -d '{}'
```

**Test specific endpoints:**

```bash
# Public endpoints (should work)
curl https://api.yourdomain.com/api/v1/health

# Protected endpoints (should return 401)
curl https://api.yourdomain.com/api/v1/users/me
# Should return: {"error": "Unauthorized"} or similar
```

**Verify SSL certificate:**

```bash
# Check SSL certificate details
openssl s_client -connect api.yourdomain.com:443 -servername api.yourdomain.com < /dev/null

# Should show:
# - Certificate chain
# - Valid certificate (Issuer: Let's Encrypt)
# - Expiration date (90 days from now)
```

**Common issues:**

- **SSL errors**: DNS may not be fully propagated, wait 15-30 minutes
- **Connection refused**: Check security group (port 443 open), Nginx running
- **502 Bad Gateway**: API container not running, check `docker ps`
- **504 Gateway Timeout**: Check Nginx proxy timeout settings

**Note**: All API endpoints should be accessible via HTTPS now.

---

### Task 60: Verify S3 Bucket Access from EC2

**Test S3 access from application:**

1. **Check AWS credentials** are set correctly:

```bash
# Verify credentials in .env
cat ~/quiz-tuition-deploy/.env | grep AWS
# Should show:
# AWS_REGION=ap-south-1
# S3_BUCKET_UPLOADS=quiz-tuition-uploads-prod
# AWS_ACCESS_KEY_ID=AKIA...
# AWS_SECRET_ACCESS_KEY=...
```

2. **Test S3 access using AWS CLI** (install if needed):

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo yum install -y unzip
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI with credentials
aws configure
# Enter:
# AWS Access Key ID: [from .env]
# AWS Secret Access Key: [from .env]
# Default region: ap-south-1
# Default output format: json
```

3. **Test S3 bucket access:**

```bash
# List bucket contents
aws s3 ls s3://quiz-tuition-uploads-prod/

# Create a test file
echo "test" > /tmp/test-upload.txt

# Upload test file
aws s3 cp /tmp/test-upload.txt s3://quiz-tuition-uploads-prod/test/

# Verify upload
aws s3 ls s3://quiz-tuition-uploads-prod/test/

# Delete test file
aws s3 rm s3://quiz-tuition-uploads-prod/test/test-upload.txt
```

4. **Test S3 access from application container:**

```bash
# Check application logs for S3 operations
docker-compose -f docker-compose.prod.yml logs api-server | grep -i "s3\|aws"

# Test upload endpoint (if available)
curl -X POST https://api.yourdomain.com/api/v1/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/tmp/test-file.pdf" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Common issues:**

- **Access Denied**: Check IAM user permissions (S3 bucket policy)
- **Bucket not found**: Verify bucket name matches in `.env`
- **Region mismatch**: Ensure `AWS_REGION` is `ap-south-1`
- **Credentials invalid**: Verify access key ID and secret key are correct

**Verify S3 presigned URLs work** (if your app uses them):

```bash
# Test getting presigned URL (via API if endpoint exists)
curl https://api.yourdomain.com/api/v1/upload/presigned-url \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return a presigned URL
```

**Note**: S3 access is critical for file uploads. Verify it works before proceeding to worker verification.

---

### Task 61: Verify Database Tables and Seeded Data

**Check that all tables exist and have correct schema:**

1. **Connect to RDS database** (from Task 56):

```bash
# SSH into EC2
psql -h YOUR_RDS_ENDPOINT -U postgres -d quiz_tuition -p 5432
```

2. **List all tables**:

```sql
-- List all tables
\dt

-- Should show tables like:
-- users, classes, subjects, chapters, uploads, pages, questions,
-- question_bank, page_generation_attempts, llm_usage_events, etc.
```

3. **Verify seeded data exists**:

```sql
-- Check admin user exists
SELECT id, email, role, "isActive" FROM users WHERE role = 'admin';
-- Should return at least one admin user

-- Check class 6 exists
SELECT id, "displayName", "classLevel" FROM classes WHERE "classLevel" = 6;
-- Should return class with id = 6

-- Check subjects for class 6
SELECT id, name, code, "classId" FROM subjects WHERE "classId" = 6;
-- Should return: Bangla (BA), English (EN), Math (MA)

-- Check chapters for class 6 subjects
SELECT c.id, c.name, c.ordinal, s.name as subject_name
FROM chapters c
JOIN subjects s ON c."subjectId" = s.id
WHERE s."classId" = 6
ORDER BY s.name, c.ordinal;
-- Should return 3 chapters per subject (Chapter 1, 2, 3)

-- Exit psql
\q
```

4. **Verify Prisma schema matches database**:

```bash
# From EC2, in project directory
cd ~/quiz-tuition/apps/api

# Check Prisma can connect and validate schema
docker run --rm \
  --env-file /home/ec2-user/quiz-tuition-deploy/.env \
  -v ~/quiz-tuition/apps/api:/app \
  -w /app \
  node:20-alpine sh -c "
    apk add --no-cache python3 make g++ &&
    npm install &&
    npx prisma validate
  "
# Should show: "The schema.prisma file is valid"
```

**If tables are missing:**

- Run migrations again: `npx prisma migrate deploy`
- Check Prisma schema file for table definitions

**If seeded data is missing:**

- Run seed script again: `node prisma/seed.js`
- Check seed script logs for errors

**Note**: Verify critical tables (users, classes, subjects, chapters) exist with expected data before proceeding.

---

## Phase 8: Worker Verification

### Task 62: Verify Rasterize Worker Container is Processing Jobs

**Check rasterize worker is running:**

```bash
# From EC2, check container status
docker ps | grep rasterize
# Should show: quiz-tuition-rasterize-worker-1

# Check worker logs
docker-compose -f docker-compose.prod.yml logs rasterize-worker --tail 50
# Should show worker started and waiting for jobs
```

**Test rasterize worker with a job:**

1. **Check if there are any pending rasterize jobs** (if you have uploads):

```bash
# Connect to Redis and check queue
docker exec -it quiz-tuition-redis-1 redis-cli

# Inside Redis CLI, check for rasterize jobs
KEYS bull:rasterize:*
# or
KEYS *rasterize*

# Exit Redis CLI
exit
```

2. **Create a test upload via API** (if upload endpoint is available):

```bash
# Get admin token first (if you have login endpoint)
TOKEN=$(curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"enayetflweb@gmail.com","password":"Ab123456@"}' \
  | jq -r '.data.accessToken')

# Upload a test PDF (replace with actual file)
curl -X POST https://api.yourdomain.com/api/v1/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/test.pdf" \
  -F "classId=6" \
  -F "subjectId=YOUR_SUBJECT_ID" \
  -F "chapterId=YOUR_CHAPTER_ID"

# This should trigger rasterize jobs
```

3. **Monitor rasterize worker logs**:

```bash
# Watch logs in real-time
docker-compose -f docker-compose.prod.yml logs -f rasterize-worker

# You should see:
# - Job received
# - PDF processing started
# - Pages rasterized
# - Images uploaded to S3
# - Job completed
```

**Verify worker processes jobs correctly:**

```bash
# Check for completed rasterize jobs in database
# (If your app tracks job status)
psql -h YOUR_RDS_ENDPOINT -U postgres -d quiz_tuition -c \
  "SELECT COUNT(*) FROM pages WHERE status = 'queued' OR status = 'complete';"
```

**Common issues:**

- **Worker not processing**: Check Redis connection, verify queue name matches
- **Jobs stuck**: Check worker logs for errors, verify S3 access
- **Container not running**: Restart with `docker-compose restart rasterize-worker`

**Note**: Rasterize worker should process PDF pages and create PNG images in S3.

---

### Task 63: Verify LLM Worker Container is Processing Jobs

**Check LLM worker is running:**

```bash
# From EC2, check container status
docker ps | grep llm-worker
# Should show: quiz-tuition-llm-worker-1

# Check worker logs
docker-compose -f docker-compose.prod.yml logs llm-worker --tail 50
# Should show worker started and waiting for jobs
```

**Test LLM worker with a job:**

1. **Check for pending LLM generation jobs**:

```bash
# Connect to Redis
docker exec -it quiz-tuition-redis-1 redis-cli

# Check for LLM/generation jobs
KEYS bull:generation:*
KEYS *llm*

# Exit
exit
```

2. **If you have pages queued for generation**, trigger generation:

```bash
# Option 1: Via API (if regenerate endpoint exists)
curl -X POST https://api.yourdomain.com/api/v1/generation/requeue \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pageId": "YOUR_PAGE_ID"}'

# Option 2: Jobs should auto-queue after rasterization completes
```

3. **Monitor LLM worker logs**:

```bash
# Watch logs in real-time
docker-compose -f docker-compose.prod.yml logs -f llm-worker

# You should see:
# - Job received
# - Model selected (e.g., g2.5-flash)
# - Token buckets acquired
# - Gemini API call started
# - Response received
# - Questions validated
# - Questions saved to database
# - Job completed
```

**Verify questions are created:**

```bash
# Check questions table
psql -h YOUR_RDS_ENDPOINT -U postgres -d quiz_tuition -c \
  "SELECT COUNT(*), status FROM questions GROUP BY status;"

# Should show questions with status = 'not_checked'

# Check generation attempts
psql -h YOUR_RDS_ENDPOINT -U postgres -d quiz_tuition -c \
  "SELECT COUNT(*), status FROM page_generation_attempts GROUP BY status;"
```

**Verify LLM usage events are recorded:**

```bash
# Check LLM usage tracking
psql -h YOUR_RDS_ENDPOINT -U postgres -d quiz_tuition -c \
  "SELECT COUNT(*), model FROM llm_usage_events GROUP BY model;"

# Should show usage events with model names (g2.5-flash, etc.)
```

**Common issues:**

- **Worker not processing**: Check Google GenAI API key in `.env`, verify scheduler is working
- **API errors**: Check Gemini API key, verify model names are correct
- **Validation errors**: Check LLM response format, verify Zod schema matches
- **Token bucket errors**: Check scheduler logs, verify token bucket configuration

**Note**: LLM worker should process page jobs, call Gemini API, validate responses, and save questions to database.

---

### Task 64: Check BullMQ Queue Status

**Verify queues are properly configured:**

1. **List all BullMQ queues in Redis**:

```bash
# Connect to Redis
docker exec -it quiz-tuition-redis-1 redis-cli

# List all keys (BullMQ uses specific key patterns)
KEYS bull:*

# Common queue names:
# bull:rasterize:*
# bull:generation:*
# bull:llm:*

# Exit
exit
```

2. **Check queue job counts** (if you have a queue monitoring tool or API):

```bash
# Check queue stats via your API (if you have an admin endpoint)
curl https://api.yourdomain.com/api/v1/admin/queues/stats \
  -H "Authorization: Bearer $TOKEN"

# Or manually check Redis
docker exec -it quiz-tuition-redis-1 redis-cli

# Check waiting jobs
LLEN bull:rasterize:waiting
LLEN bull:generation:waiting

# Check active jobs
LLEN bull:rasterize:active
LLEN bull:generation:active

# Check completed jobs (if stored)
LLEN bull:rasterize:completed

# Exit
exit
```

3. **Verify workers are connected to queues**:

```bash
# Check worker logs for queue connection
docker-compose -f docker-compose.prod.yml logs rasterize-worker | grep -i "queue\|connected\|listening"
docker-compose -f docker-compose.prod.yml logs llm-worker | grep -i "queue\|connected\|listening"

# Should show messages like:
# "Worker connected to queue"
# "Waiting for jobs"
```

**Test queue enqueueing** (if you have test data):

```bash
# Create a test job manually (for testing)
# This depends on your application's queue structure
# Usually done via API endpoints that enqueue jobs
```

**Verify job retry mechanism:**

```bash
# Check BullMQ retry configuration
# Review your queue setup code (usually in queue.ts or similar)
# Verify:
# - attempts: 3
# - backoff strategy configured
# - retry delays set correctly
```

**Common issues:**

- **Queue not found**: Check queue name matches between enqueue and worker
- **Jobs not processing**: Verify workers are running, check Redis connection
- **Jobs failing**: Check worker logs for error messages
- **Retry not working**: Verify retry configuration in queue setup

**Note**: BullMQ queues manage job distribution. Verify both rasterize and generation queues are working.

---

### Task 65: Test End-to-End Flow: Upload → Rasterization → Question Generation

**Complete workflow test:**

1. **Step 1: Upload a PDF**:

```bash
# Get admin token
TOKEN=$(curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"enayetflweb@gmail.com","password":"Ab123456@"}' \
  | jq -r '.data.accessToken')

# Get subject and chapter IDs first
SUBJECT_ID=$(curl https://api.yourdomain.com/api/v1/taxonomy/subjects?classId=6 \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.data[0].id')

CHAPTER_ID=$(curl "https://api.yourdomain.com/api/v1/taxonomy/chapters?subjectId=$SUBJECT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.data[0].id')

# Upload PDF
UPLOAD_RESPONSE=$(curl -X POST https://api.yourdomain.com/api/v1/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/test.pdf" \
  -F "classId=6" \
  -F "subjectId=$SUBJECT_ID" \
  -F "chapterId=$CHAPTER_ID")

UPLOAD_ID=$(echo $UPLOAD_RESPONSE | jq -r '.data.id')
echo "Upload ID: $UPLOAD_ID"
```

2. **Step 2: Monitor Rasterization**:

```bash
# Watch rasterize worker logs
docker-compose -f docker-compose.prod.yml logs -f rasterize-worker

# In another terminal, check upload status
curl https://api.yourdomain.com/api/v1/upload/$UPLOAD_ID \
  -H "Authorization: Bearer $TOKEN"

# Wait for pages to be rasterized (status: queued or complete)
# Check pages were created
curl "https://api.yourdomain.com/api/v1/upload/$UPLOAD_ID/pages" \
  -H "Authorization: Bearer $TOKEN"
```

3. **Step 3: Monitor Question Generation**:

```bash
# Watch LLM worker logs
docker-compose -f docker-compose.prod.yml logs -f llm-worker

# Check if questions are being generated
# Wait a few minutes for LLM processing

# Check questions for a specific page
PAGE_ID=$(curl "https://api.yourdomain.com/api/v1/upload/$UPLOAD_ID/pages" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.data[0].id')

curl "https://api.yourdomain.com/api/v1/questions?pageId=$PAGE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

4. **Step 4: Verify Complete Flow**:

```bash
# Check database for complete workflow
psql -h YOUR_RDS_ENDPOINT -U postgres -d quiz_tuition << EOF
-- Check upload exists
SELECT id, "createdAt", "pageCount" FROM uploads WHERE id = '$UPLOAD_ID';

-- Check pages were created
SELECT id, "pageNumber", status, "s3PngKey" IS NOT NULL as has_image
FROM pages WHERE "uploadId" = '$UPLOAD_ID'
ORDER BY "pageNumber";

-- Check questions were generated
SELECT COUNT(*), status
FROM questions q
JOIN pages p ON q."pageId" = p.id
WHERE p."uploadId" = '$UPLOAD_ID'
GROUP BY status;

-- Check generation attempts
SELECT COUNT(*), status
FROM page_generation_attempts pga
JOIN pages p ON pga."pageId" = p.id
WHERE p."uploadId" = '$UPLOAD_ID'
GROUP BY status;
EOF
```

**Expected results:**

- ✅ Upload created with correct metadata
- ✅ Pages created (one per PDF page)
- ✅ Pages rasterized (S3 keys populated, status = 'complete' or 'queued')
- ✅ Questions generated (at least some questions with status = 'not_checked')
- ✅ Generation attempts logged (successful or failed attempts recorded)
- ✅ LLM usage events tracked (token usage and costs recorded)

**Troubleshooting:**

- **Upload fails**: Check S3 access, file size limits
- **Rasterization fails**: Check poppler installation, S3 write permissions
- **Generation fails**: Check Gemini API key, verify LLM worker logs
- **Questions not created**: Check validation errors in LLM worker logs

**Note**: This end-to-end test verifies the complete workflow. All components should work together.

---

## Phase 9: Monitoring Setup

### Task 66: Configure CloudWatch Agent on EC2 (Optional)

**CloudWatch agent allows logging and metrics collection:**

1. **Install CloudWatch agent**:

```bash
# Download CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm

# Install
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Verify installation
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -h
```

2. **Create CloudWatch agent configuration**:

```bash
# Create config file
sudo nano /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

**Add this configuration:**

```json
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/quiz-tuition/*.log",
            "log_group_name": "/quiz-tuition/application",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 7
          },
          {
            "file_path": "/var/log/nginx/quiz-tuition-access.log",
            "log_group_name": "/quiz-tuition/nginx-access",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 7
          },
          {
            "file_path": "/var/log/nginx/quiz-tuition-error.log",
            "log_group_name": "/quiz-tuition/nginx-error",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 7
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "QuizTuition",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_USAGE_IDLE",
            "unit": "Percent"
          },
          {
            "name": "cpu_usage_iowait",
            "rename": "CPU_USAGE_IOWAIT",
            "unit": "Percent"
          },
          {
            "name": "cpu_usage_user",
            "rename": "CPU_USAGE_USER",
            "unit": "Percent"
          },
          {
            "name": "cpu_usage_system",
            "rename": "CPU_USAGE_SYSTEM",
            "unit": "Percent"
          }
        ],
        "totalcpu": false
      },
      "disk": {
        "measurement": [
          {
            "name": "used_percent",
            "rename": "DISK_USED_PERCENT",
            "unit": "Percent"
          }
        ],
        "resources": ["*"]
      },
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MEM_USED_PERCENT",
            "unit": "Percent"
          }
        ]
      }
    }
  }
}
```

3. **Start CloudWatch agent**:

```bash
# Start agent with configuration
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s

# Check agent status
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -m ec2 -a status
# Should show: "running"
```

**Note**: CloudWatch agent is optional. Free tier includes basic EC2 metrics automatically.

---

### Task 67: Setup CloudWatch Log Groups

**Verify log groups exist (created in Task 13):**

1. **Navigate to CloudWatch Console** → **"Logs" → "Log groups"**
2. **Verify these log groups exist**:

   - `/quiz-tuition/api`
   - `/quiz-tuition/rasterize-worker`
   - `/quiz-tuition/llm-worker`
   - `/quiz-tuition/application` (if using CloudWatch agent)
   - `/quiz-tuition/nginx-access` (if using CloudWatch agent)
   - `/quiz-tuition/nginx-error` (if using CloudWatch agent)

3. **If log groups are missing, create them**:

```bash
# Via AWS CLI (if installed)
aws logs create-log-group --log-group-name /quiz-tuition/api --region ap-south-1
aws logs create-log-group --log-group-name /quiz-tuition/rasterize-worker --region ap-south-1
aws logs create-log-group --log-group-name /quiz-tuition/llm-worker --region ap-south-1

# Set retention (7 days, within free tier)
aws logs put-retention-policy --log-group-name /quiz-tuition/api --retention-in-days 7 --region ap-south-1
aws logs put-retention-policy --log-group-name /quiz-tuition/rasterize-worker --retention-in-days 7 --region ap-south-1
aws logs put-retention-policy --log-group-name /quiz-tuition/llm-worker --retention-in-days 7 --region ap-south-1
```

**Verify logs are being written**:

1. **In CloudWatch Console**, click on a log group (e.g., `/quiz-tuition/api`)
2. **Check for log streams**:
   - Should see log streams appearing (if application is writing logs)
   - Click on a stream to view logs
3. **If no logs appear**:
   - Verify application is configured to write to CloudWatch
   - Check CloudWatch agent is running (if using agent)
   - Verify IAM permissions for log writing

**Note**: CloudWatch Logs free tier includes 5 GB ingestion, 5 GB storage, and 10 million API requests per month.

---

### Task 68: Create Basic CloudWatch Alarms (Optional)

**Create alarms for critical metrics:**

1. **Navigate to CloudWatch Console** → **"Alarms" → "All alarms"**
2. **Click "Create alarm"**

**Alarm 1: High CPU Utilization**

1. **Metric**: Select **"EC2" → "Per-Instance Metrics"**
2. **Metric name**: `CPUUtilization`
3. **Instance**: Select your `quiz-tuition-backend` instance
4. **Statistic**: `Average`
5. **Period**: `5 minutes`
6. **Threshold**: `>= 80` for 2 consecutive periods
7. **Actions**: Create SNS topic or email notification (optional)
8. **Alarm name**: `quiz-tuition-high-cpu`
9. Click **"Create alarm"**

**Alarm 2: Low Disk Space**

1. **Metric**: Create custom metric via CloudWatch agent or use EBS metrics
2. **Metric name**: `QuizTuition/DISK_USED_PERCENT` (if using agent)
3. **Or use**: `VolumeIdleTime` from EBS metrics
4. **Threshold**: `DISK_USED_PERCENT >= 85` for 2 periods
5. **Alarm name**: `quiz-tuition-low-disk-space`
6. Click **"Create alarm"**

**Alarm 3: Application Container Not Running** (custom check)

1. **Create a custom metric** (requires application code to push metrics):
   - Application should send heartbeat metric to CloudWatch
   - Or use a Lambda function to check container status
2. **Threshold**: Metric missing for 5 minutes
3. **Alarm name**: `quiz-tuition-container-down`

**Note**: CloudWatch alarms have a free tier, but SNS notifications may incur small costs.

**Alternative: Simple Health Check Alarm**

```bash
# Create a simple script that checks health endpoint
cat > /home/ec2-user/health-check.sh << 'EOF'
#!/bin/bash
if ! curl -f https://api.yourdomain.com/healthz > /dev/null 2>&1; then
  echo "Health check failed"
  exit 1
fi
EOF

chmod +x /home/ec2-user/health-check.sh

# Add to crontab to run every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/ec2-user/health-check.sh || echo 'Health check failed' | mail -s 'API Health Check Failed' your-email@example.com") | crontab -
```

**Note**: For production, use CloudWatch alarms. Simple scripts are good for MVP.

---

### Task 69: Verify Logs are Appearing in CloudWatch

**Check application logs:**

1. **In CloudWatch Console**, go to **"Logs" → "Log groups"**
2. **Click on `/quiz-tuition/api`** (or your log group)
3. **Verify log streams exist**:
   - Should see streams with instance ID or container name
   - Click on a stream to view recent logs
4. **Check log content**:
   - Should see application logs (INFO, ERROR, etc.)
   - Verify timestamps are recent
   - Check for any ERROR entries

**If logs are not appearing:**

1. **Check CloudWatch agent status**:

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -m ec2 -a status
```

2. **Check application log configuration**:

   - Verify application writes to `/var/log/quiz-tuition/`
   - Check log file permissions
   - Verify Docker volume mounts are correct

3. **Check IAM permissions**:
   - EC2 instance role needs `logs:CreateLogStream`, `logs:PutLogEvents`
   - Or IAM user credentials need same permissions

**Check Nginx logs** (if configured):

```bash
# View Nginx logs locally
sudo tail -f /var/log/nginx/quiz-tuition-access.log
sudo tail -f /var/log/nginx/quiz-tuition-error.log

# Verify logs are being written
ls -lh /var/log/nginx/quiz-tuition-*.log
```

**Test log ingestion**:

```bash
# Manually write a test log
echo "$(date) - Test log entry" | sudo tee -a /var/log/quiz-tuition/test.log

# Wait 1-2 minutes, then check CloudWatch
# Should appear in /quiz-tuition/application log group
```

**Note**: Logs may take 1-5 minutes to appear in CloudWatch after being written to disk.

---

## Phase 10: Post-Deployment Verification

### Task 70: Access Frontend via Amplify URL or Custom Domain

**Test frontend deployment:**

1. **Open frontend URL in browser**:

   - **Amplify URL**: `https://main.d1234abcd.amplifyapp.com` (from Task 50)
   - **Or custom domain**: `https://app.yourdomain.com` (if configured in Task 54)

2. **Verify frontend loads correctly**:

   - Page should load without errors
   - Check browser console (F12) for JavaScript errors
   - Verify API calls are being made (Network tab)

3. **Check API connection**:
   - Frontend should connect to `https://api.yourdomain.com`
   - Verify `NEXT_PUBLIC_API_URL` is set correctly in Amplify
   - Check browser console for API errors

**Test login functionality:**

1. **Navigate to login page**:

   - URL: `https://your-frontend-url/login`
   - Should show login form

2. **Test login with admin credentials**:

   - Email: `enayetflweb@gmail.com`
   - Password: `Ab123456@`
   - Click "Login"

3. **Verify successful login**:
   - Should redirect to home/dashboard
   - Check browser localStorage/sessionStorage for tokens
   - Verify user data is displayed (email, role)

**Verify API calls from frontend:**

1. **Open browser DevTools** (F12) → **Network tab**
2. **Reload page and observe API calls**:
   - Should see calls to `https://api.yourdomain.com/api/v1/*`
   - Check responses are 200 OK (or appropriate status codes)
   - Verify no CORS errors

**Test major features:**

1. **Navigation**:

   - Click through main navigation links
   - Verify routes work (Taxonomy, Uploads, Questions, etc.)

2. **Taxonomy Management** (if accessible):

   - View classes, subjects, chapters
   - Verify data from seed is displayed

3. **Uploads** (if accessible):

   - Navigate to uploads page
   - Verify upload form is accessible

4. **Questions Review** (if accessible):
   - View questions list
   - Verify questions from test upload are displayed

**Common issues:**

- **Frontend not loading**: Check Amplify build status, verify deployment completed
- **API connection errors**: Check `NEXT_PUBLIC_API_URL` environment variable
- **CORS errors**: Verify CORS configuration in API (Task 8, CORS policy)
- **Login fails**: Check API is accessible, verify credentials
- **404 errors**: Check Next.js routing, verify all pages are built

**Note**: Frontend should be fully functional and connected to backend API.

---

### Task 71: Test Login Functionality

**Verify authentication works end-to-end:**

1. **Test login from frontend**:

   - Navigate to `https://your-frontend-url/login`
   - Enter admin credentials:
     - Email: `enayetflweb@gmail.com`
     - Password: `Ab123456@`
   - Click "Login"
   - Should redirect to home/dashboard on success

2. **Verify tokens are stored**:

   - Open browser DevTools → **Application** tab → **Local Storage**
   - Should see access token and refresh token (or in cookies)
   - Verify tokens are not expired

3. **Test protected routes**:

   - Navigate to protected pages (e.g., `/admin`, `/questions`)
   - Should be accessible when logged in
   - Logout, then try accessing protected route
   - Should redirect to login

4. **Test logout**:

   - Click logout button
   - Verify tokens are cleared
   - Verify redirect to login page

5. **Test API authentication directly**:

```bash
# Login via API
LOGIN_RESPONSE=$(curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"enayetflweb@gmail.com","password":"Ab123456@"}')

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')

# Test protected endpoint
curl https://api.yourdomain.com/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"

# Should return user data (email, role, etc.)
```

**Common issues:**

- **Login fails**: Check database has admin user, verify password hash is correct
- **Token not working**: Check JWT secrets match, verify token expiration
- **CORS errors**: Check CORS configuration allows frontend domain

**Note**: Authentication is critical. Verify it works before proceeding.

---

### Task 72: Verify PDF Upload Flow

**Test complete upload workflow:**

1. **Prepare a test PDF**:

   - Create or download a simple PDF file (preferably academic content)
   - File size should be < 20 MB
   - Number of pages < 100

2. **Upload via frontend**:

   - Navigate to `/uploads/new` (or upload page)
   - Fill form:
     - Class: 6
     - Subject: Bangla/English/Math (from seed)
     - Chapter: Chapter 1 (from seed)
     - File: Select your test PDF
   - Click "Upload"
   - Wait for upload to complete

3. **Monitor upload progress**:

   - Check upload status on frontend
   - Watch backend logs for rasterization:
     ```bash
     docker-compose -f docker-compose.prod.yml logs -f rasterize-worker
     ```

4. **Verify upload was successful**:

   - Check upload appears in uploads list
   - Click on upload to view details
   - Verify pages were created
   - Check page images are visible (thumbnails)

5. **Test upload via API directly**:

```bash
# Get token (from Task 71)
TOKEN="your-access-token"

# Get subject and chapter IDs
SUBJECT_ID=$(curl "https://api.yourdomain.com/api/v1/taxonomy/subjects?classId=6" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id')

CHAPTER_ID=$(curl "https://api.yourdomain.com/api/v1/taxonomy/chapters?subjectId=$SUBJECT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id')

# Upload PDF
curl -X POST https://api.yourdomain.com/api/v1/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/test.pdf" \
  -F "classId=6" \
  -F "subjectId=$SUBJECT_ID" \
  -F "chapterId=$CHAPTER_ID"

# Should return upload ID and metadata
```

**Verify in database:**

```bash
# Check upload was created
psql -h YOUR_RDS_ENDPOINT -U postgres -d quiz_tuition -c \
  "SELECT id, \"pageCount\", \"createdAt\" FROM uploads ORDER BY \"createdAt\" DESC LIMIT 1;"

# Check pages were created
psql -h YOUR_RDS_ENDPOINT -U postgres -d quiz_tuition -c \
  "SELECT COUNT(*) as page_count FROM pages WHERE \"uploadId\" = (SELECT id FROM uploads ORDER BY \"createdAt\" DESC LIMIT 1);"
```

**Note**: Upload flow should work end-to-end. Verify before testing question generation.

---

### Task 73: Verify Question Generation is Working

**Test LLM generation pipeline:**

1. **Ensure you have a completed upload** (from Task 72):

   - Upload should have pages with status `complete` (rasterized)

2. **Wait for question generation**:

   - LLM worker should automatically process pages after rasterization
   - Monitor LLM worker logs:
     ```bash
     docker-compose -f docker-compose.prod.yml logs -f llm-worker
     ```

3. **Check questions were generated**:

```bash
# Get upload ID from previous task
UPLOAD_ID="your-upload-id"

# Check questions via API
curl "https://api.yourdomain.com/api/v1/questions?uploadId=$UPLOAD_ID" \
  -H "Authorization: Bearer $TOKEN"

# Should return list of questions with status 'not_checked'
```

4. **Verify questions in database**:

```bash
# Check questions exist
psql -h YOUR_RDS_ENDPOINT -U postgres -d quiz_tuition << EOF
SELECT COUNT(*) as total_questions,
       COUNT(CASE WHEN status = 'not_checked' THEN 1 END) as unchecked,
       COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
FROM questions q
JOIN pages p ON q."pageId" = p.id
WHERE p."uploadId" = '$UPLOAD_ID';
EOF
```

5. **Check generation attempts**:

```bash
# Verify attempts were logged
psql -h YOUR_RDS_ENDPOINT -U postgres -d quiz_tuition -c \
  "SELECT COUNT(*), status FROM page_generation_attempts GROUP BY status;"

# Check LLM usage events
psql -h YOUR_RDS_ENDPOINT -U postgres -d quiz_tuition -c \
  "SELECT model, COUNT(*) as attempts, SUM(\"tokensIn\") as total_input_tokens, SUM(\"tokensOut\") as total_output_tokens FROM llm_usage_events GROUP BY model;"
```

6. **View questions in frontend**:
   - Navigate to `/questions` page
   - Filter by upload or page
   - Verify questions are displayed with correct metadata
   - Check question content (stem, options, correct answer)

**Common issues:**

- **No questions generated**: Check LLM worker logs for errors, verify Gemini API key
- **Questions incomplete**: Check validation errors, verify LLM response format
- **Generation stuck**: Check Redis queue, verify workers are processing

**Note**: Question generation is the core feature. Verify it works correctly.

---

### Task 74: Test All Major Features End-to-End

**Comprehensive feature testing:**

1. **Taxonomy Management**:

   - View classes (should see Class 6)
   - View subjects for Class 6 (should see Bangla, English, Math)
   - View chapters (should see Chapter 1, 2, 3 for each subject)
   - Test creating new class/subject/chapter (if you have permissions)
   - Verify data persists after refresh

2. **Uploads Management**:

   - View uploads list
   - View upload details
   - Check page gallery (should show rasterized images)
   - Test filtering and pagination
   - Verify upload status updates correctly

3. **Questions Review**:

   - View questions list
   - Filter by class, subject, chapter, status
   - Open question detail modal
   - Test editing a question
   - Test approving/rejecting questions
   - Verify status changes persist

4. **Question Bank**:

   - Navigate to question bank
   - View published questions
   - Test filtering and search
   - Verify question codes are generated correctly

5. **Admin Dashboard** (if admin user):
   - View dashboard statistics
   - Check generation attempts tab
   - View LLM usage events
   - Check pages information
   - Verify data is displayed correctly

**Test error handling:**

1. **Invalid login**:

   - Try wrong password
   - Should show error message
   - Should not redirect

2. **Unauthorized access**:

   - Try accessing admin routes without admin role
   - Should be blocked or redirected

3. **Invalid upload**:

   - Try uploading non-PDF file
   - Should show validation error

4. **API errors**:
   - Disconnect internet briefly
   - Verify error messages are shown
   - Check logs for proper error handling

**Performance testing:**

1. **Page load times**:

   - Check initial page load (< 3 seconds)
   - Verify API responses are reasonable (< 1 second for most endpoints)

2. **Large dataset handling**:
   - Test with many questions (if you have test data)
   - Verify pagination works
   - Check performance is acceptable

**Note**: All major features should work correctly. Document any issues found.

---

### Task 75: Verify System Health and Performance

**Check overall system health:**

1. **Check container health**:

```bash
# From EC2, check all containers are running
docker ps
# Should show: api-server, rasterize-worker, llm-worker, redis (all Up)

# Check container resource usage
docker stats --no-stream
# Monitor CPU, memory usage
# Verify no container is using excessive resources
```

2. **Check database health**:

```bash
# Check RDS instance status in AWS Console
# Navigate to RDS Dashboard → Your database
# Verify status: Available
# Check connections: Should show active connections
# Check storage: Verify sufficient space

# Check database performance
psql -h YOUR_RDS_ENDPOINT -U postgres -d quiz_tuition -c \
  "SELECT count(*) as connection_count FROM pg_stat_activity WHERE datname = 'quiz_tuition';"
```

3. **Check Redis health**:

```bash
# Test Redis connectivity
docker exec -it quiz-tuition-redis-1 redis-cli ping
# Should return: PONG

# Check Redis memory usage
docker exec -it quiz-tuition-redis-1 redis-cli INFO memory
# Check used_memory_human (should be reasonable)
```

4. **Check S3 bucket**:

```bash
# List bucket contents
aws s3 ls s3://quiz-tuition-uploads-prod/ --recursive | head -20

# Check bucket size
aws s3 ls s3://quiz-tuition-uploads-prod/ --recursive --summarize
# Verify size is within free tier (5 GB)
```

5. **Check API response times**:

```bash
# Test health endpoint response time
time curl -s https://api.yourdomain.com/api/v1/health

# Test multiple endpoints
for endpoint in health users/me taxonomy/classes; do
  echo "Testing $endpoint..."
  time curl -s -w "\nTime: %{time_total}s\n" \
    https://api.yourdomain.com/api/v1/$endpoint \
    -H "Authorization: Bearer $TOKEN" > /dev/null
done
```

6. **Check system resources on EC2**:

```bash
# Check disk usage
df -h
# Verify / has sufficient space (should be > 20% free)

# Check memory usage
free -h
# Verify sufficient free memory

# Check CPU usage
top -bn1 | head -20
# Verify CPU is not maxed out
```

**Monitor for issues:**

- High CPU usage: May indicate worker is processing many jobs
- High memory: Check for memory leaks in containers
- Disk space: Ensure logs are rotated, old files cleaned
- Database connections: Verify connection pooling is working

**Note**: System should be healthy and performant. Address any issues found.

---

## Phase 11: Security & Optimization

### Task 76: Disable Unnecessary Ports on EC2 Security Group

**Review and tighten security group rules:**

1. **Navigate to EC2 Dashboard** → **Security Groups**
2. **Select `quiz-tuition-ec2-sg`**
3. **Review inbound rules**:

   - **SSH (22)**: Should only allow your IP, not `0.0.0.0/0`
     - Click **"Edit inbound rules"**
     - Change SSH source from `0.0.0.0/0` to `My IP` (or specific IP)
     - Click **"Save rules"**
   - **HTTP (80)**: Keep open (needed for Let's Encrypt)
   - **HTTPS (443)**: Keep open (needed for API)
   - **Custom TCP (4080)**: Can be removed if not needed (Nginx handles routing)

4. **Remove port 4080** (if not needed):

   - Click **"Edit inbound rules"**
   - Delete rule for port 4080
   - Click **"Save rules"**

5. **Verify outbound rules**:
   - Should allow all outbound traffic (for API calls, package updates)
   - If needed, restrict to specific ports (more secure but complex)

**Update RDS security group:**

1. **Select `quiz-tuition-rds-sg`**
2. **Verify inbound rule**:
   - Only allow PostgreSQL (5432) from `quiz-tuition-ec2-sg`
   - No other rules should exist

**Note**: Minimize open ports to reduce attack surface.

---

### Task 77: Configure Automatic Security Updates on EC2

**Enable automatic security updates:**

```bash
# SSH into EC2
# Install unattended-upgrades equivalent for Amazon Linux
sudo yum install -y yum-cron

# Configure automatic updates
sudo nano /etc/yum/yum-cron.conf

# Update settings:
# update_cmd = security
# apply_updates = yes
# download_updates = yes

# Enable yum-cron service
sudo systemctl enable yum-cron
sudo systemctl start yum-cron

# Verify service is running
sudo systemctl status yum-cron
```

**Alternative: Manual update schedule**

```bash
# Add cron job for weekly updates
sudo crontab -e

# Add this line (updates every Sunday at 3 AM):
0 3 * * 0 yum update -y --security && systemctl restart docker
```

**Set up automatic Docker container restarts**:

```bash
# Docker Compose already has restart: unless-stopped
# Verify in docker-compose.prod.yml

# But ensure Docker service starts on boot
sudo systemctl enable docker
sudo systemctl is-enabled docker
# Should show: enabled
```

**Note**: Security updates are critical. Automate them to stay protected.

---

### Task 78: Setup Automated Database Backups

**RDS automated backups are already configured** (from Task 5):

1. **Verify backup settings**:

   - Navigate to **RDS Dashboard** → Your database
   - Go to **"Maintenance & backups"** tab
   - Check **"Automated backups"**:
     - Backup retention: 7 days (as configured)
     - Backup window: Should be set (e.g., 03:00-04:00 UTC)
     - Copy tags to snapshots: Enabled (optional)

2. **Test manual snapshot** (optional):

```bash
# Create manual snapshot via AWS CLI
aws rds create-db-snapshot \
  --db-instance-identifier quiz-tuition-db \
  --db-snapshot-identifier quiz-tuition-manual-snapshot-$(date +%Y%m%d) \
  --region ap-south-1

# Verify snapshot creation
aws rds describe-db-snapshots \
  --db-instance-identifier quiz-tuition-db \
  --region ap-south-1
```

3. **Verify backup storage**:
   - In RDS dashboard, check storage metrics
   - Verify backup storage is within free tier limits
   - Free tier includes 20 GB storage and backups

**Note**: Automated backups run daily during the backup window. Retention is 7 days per requirements.

---

### Task 79: Verify SSL Certificate Auto-Renewal

**Let's Encrypt certificates expire in 90 days. Verify auto-renewal:**

1. **Check certbot timer status**:

```bash
# SSH into EC2
sudo systemctl status certbot.timer
# Should show: active (running)

# List timer
systemctl list-timers | grep certbot
# Should show certbot renewal schedule
```

2. **Test renewal (dry run)**:

```bash
sudo certbot renew --dry-run
# Should show success message
# This tests renewal without actually renewing
```

3. **Check renewal script**:

```bash
# Verify renewal hook is configured
sudo cat /etc/letsencrypt/renewal/api.yourdomain.com.conf
# Should show renew hook for Nginx reload
```

4. **Set up email notifications** (optional):

```bash
# Certbot already has your email from initial setup
# But you can verify:
sudo certbot certificates
# Should show your email address
```

**Manual renewal test** (if needed):

```bash
# Force renewal (for testing - don't run unless needed)
sudo certbot renew --force-renewal
sudo systemctl reload nginx

# Verify new certificate
sudo certbot certificates
# Check expiration date
```

**Note**: Certbot automatically renews certificates twice daily. Verify it's working.

---

### Task 80: Review and Tighten Security Group Rules

**Final security review:**

1. **EC2 Security Group** (`quiz-tuition-ec2-sg`):

**Current rules (verify these are correct):**

- SSH (22): Only from your IP ✅
- HTTP (80): From 0.0.0.0/0 (needed for Let's Encrypt) ✅
- HTTPS (443): From 0.0.0.0/0 (needed for API) ✅
- Port 4080: Removed (not needed, Nginx handles routing) ✅

**Optional: Further hardening**:

- If you have a static IP, restrict HTTP/HTTPS to specific IPs (more secure but less flexible)

2. **RDS Security Group** (`quiz-tuition-rds-sg`):

**Current rules (verify):**

- PostgreSQL (5432): Only from `quiz-tuition-ec2-sg` ✅
- No other rules ✅

3. **Review IAM permissions**:

```bash
# Check IAM user permissions (from Task 24)
# Navigate to IAM Dashboard → Users → quiz-tuition-ec2-user

# Verify user only has S3 access (as configured)
# Should not have admin or overly broad permissions
```

4. **Review environment variables security**:

```bash
# Ensure .env file has correct permissions
ls -la ~/quiz-tuition-deploy/.env
# Should show: -rw------- (600) - only owner can read/write

# Verify no sensitive data in git
cd ~/quiz-tuition
grep -r "password\|secret\|key" apps/api/src/ --exclude-dir=node_modules | grep -v "process.env"
# Should not show hardcoded secrets
```

5. **Check Docker container security**:

```bash
# Verify containers are running with non-root user (if configured)
docker exec quiz-tuition-api-server-1 id
# Should not be root (uid 0)

# Check container resource limits (if set)
docker stats --no-stream
# Monitor resource usage
```

**Security checklist:**

- ✅ SSH restricted to your IP
- ✅ Database only accessible from EC2
- ✅ HTTPS enabled (SSL certificate valid)
- ✅ IAM user has minimal permissions
- ✅ Environment variables secured (600 permissions)
- ✅ No hardcoded secrets in code
- ✅ Security updates automated

**Note**: Security is ongoing. Regularly review and update security measures.

---

## Phase 12: Documentation & Handoff

### Task 81: Document All Environment Variables

**Create a reference document:**

```bash
# On EC2, create environment variables documentation
cat > ~/DEPLOYMENT_ENV_VARS.md << 'EOF'
# Environment Variables Reference

## Backend (.env file location: ~/quiz-tuition-deploy/.env)

### Database
- DATABASE_URL: PostgreSQL connection string for RDS
- SHADOW_DATABASE_URL: Shadow database for Prisma migrations

### Redis
- REDIS_URL: Redis connection (localhost:6379 in Docker)

### AWS Configuration
- AWS_REGION: ap-south-1
- S3_BUCKET_UPLOADS: quiz-tuition-uploads-prod
- AWS_ACCESS_KEY_ID: IAM user access key
- AWS_SECRET_ACCESS_KEY: IAM user secret key

### JWT Secrets
- JWT_SECRET: Secret for access tokens (32+ characters)
- JWT_REFRESH_SECRET: Secret for refresh tokens (32+ characters)

### Google GenAI
- GOOGLE_GENAI_API_KEY: Gemini API key
- GENAI_MODEL_FLASH: gemini-2.5-flash
- GENAI_MODEL_FLASH_LITE: gemini-2.5-flash-lite
- GENAI_MODEL_2_0: gemini-2.0-flash
- GENAI_MODEL_PRO: gemini-2.5-pro

### LLM Scheduler
- LLM_SAFETY_FACTOR: 1.2
- LLM_MIN_TOKENS_PER_REQ: 1500
- WORKER_CONCURRENCY: 5

### Server
- PORT: 4080
- NODE_ENV: production
- CORS_ORIGIN: https://api.yourdomain.com

## Frontend (AWS Amplify Environment Variables)

### Next.js
- NEXT_PUBLIC_API_URL: https://api.yourdomain.com

## AWS Resources

### EC2
- Instance ID: [your-instance-id]
- Elastic IP: [your-elastic-ip]
- Key Pair: quiz-tuition-key.pem

### RDS
- Endpoint: [your-rds-endpoint]
- Port: 5432
- Database: quiz_tuition
- Username: postgres

### S3
- Bucket: quiz-tuition-uploads-prod
- Region: ap-south-1

### Amplify
- App URL: [your-amplify-url]
- App ID: [your-amplify-app-id]
EOF

# Make it readable
chmod 644 ~/DEPLOYMENT_ENV_VARS.md
```

**Save this document securely** (not in git, but accessible to team).

---

### Task 82: Document EC2 SSH Access Method

**Create SSH access guide:**

````bash
# Create SSH access documentation
cat > ~/SSH_ACCESS.md << 'EOF'
# EC2 SSH Access Guide

## Prerequisites
- Key pair file: quiz-tuition-key.pem (downloaded from AWS)
- EC2 Elastic IP: [your-elastic-ip]

## SSH Access (Linux/Mac)

```bash
# Set permissions
chmod 400 quiz-tuition-key.pem

# SSH into instance
ssh -i quiz-tuition-key.pem ec2-user@[your-elastic-ip]
````

## SSH Access (Windows - PuTTY)

1. Convert .pem to .ppk using PuTTYgen
2. Open PuTTY
3. Host: ec2-user@[your-elastic-ip]
4. Load .ppk file in SSH → Auth
5. Connect

## Once Connected

### Check Docker containers

```bash
docker ps
docker-compose -f ~/quiz-tuition/apps/api/docker-compose.prod.yml ps
```

### View logs

```bash
cd ~/quiz-tuition/apps/api
docker-compose -f docker-compose.prod.yml logs -f [service-name]
```

### Restart services

```bash
cd ~/quiz-tuition/apps/api
docker-compose -f docker-compose.prod.yml restart [service-name]
```

### Update application

```bash
cd ~/quiz-tuition
git pull
cd apps/api
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

## Important Files

- Environment variables: ~/quiz-tuition-deploy/.env
- Docker Compose: ~/quiz-tuition/apps/api/docker-compose.prod.yml
- Application logs: /var/log/quiz-tuition/
- Nginx logs: /var/log/nginx/
  EOF

chmod 644 ~/SSH_ACCESS.md

````

**Save key pair securely** (never commit to git).

---

### Task 83: Create Runbook for Common Operations

**Create operations runbook:**

```bash
# Create runbook
cat > ~/OPERATIONS_RUNBOOK.md << 'EOF'
# Operations Runbook - Quiz Tuition Application

## Starting Services

### Start all containers
```bash
cd ~/quiz-tuition/apps/api
docker-compose -f docker-compose.prod.yml up -d
````

### Start specific service

```bash
docker-compose -f docker-compose.prod.yml up -d [service-name]
```

## Stopping Services

### Stop all containers

```bash
docker-compose -f docker-compose.prod.yml down
```

### Stop specific service

```bash
docker-compose -f docker-compose.prod.yml stop [service-name]
```

## Viewing Logs

### All services

```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Specific service

```bash
docker-compose -f docker-compose.prod.yml logs -f [service-name]
```

### Last 100 lines

```bash
docker-compose -f docker-compose.prod.yml logs --tail 100 [service-name]
```

## Restarting Services

### Restart all

```bash
docker-compose -f docker-compose.prod.yml restart
```

### Restart specific service

```bash
docker-compose -f docker-compose.prod.yml restart [service-name]
```

## Database Operations

### Run migrations

```bash
cd ~/quiz-tuition/apps/api
docker run --rm \
  --env-file /home/ec2-user/quiz-tuition-deploy/.env \
  -v ~/quiz-tuition/apps/api:/app \
  -w /app \
  node:20-alpine sh -c "
    apk add --no-cache python3 make g++ &&
    npm install &&
    npx prisma migrate deploy
  "
```

### Seed database

```bash
docker run --rm \
  --env-file /home/ec2-user/quiz-tuition-deploy/.env \
  -v ~/quiz-tuition/apps/api:/app \
  -w /app \
  node:20-alpine sh -c "
    apk add --no-cache python3 make g++ &&
    npm install &&
    node prisma/seed.js
  "
```

### Backup database (manual snapshot)

```bash
aws rds create-db-snapshot \
  --db-instance-identifier quiz-tuition-db \
  --db-snapshot-identifier quiz-tuition-manual-$(date +%Y%m%d-%H%M%S) \
  --region ap-south-1
```

## Updating Application

### Pull latest code

```bash
cd ~/quiz-tuition
git pull origin main
```

### Rebuild and restart

```bash
cd ~/quiz-tuition/apps/api
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Run migrations (if schema changed)

# See Database Operations above

## Monitoring

### Check container status

```bash
docker ps
docker stats --no-stream
```

### Check disk space

```bash
df -h
du -sh /var/log/*
```

### Check memory

```bash
free -h
```

### Check database connections

```bash
psql -h [RDS_ENDPOINT] -U postgres -d quiz_tuition -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname = 'quiz_tuition';"
```

## Troubleshooting

### Container won't start

1. Check logs: `docker-compose logs [service-name]`
2. Check environment variables: `cat ~/quiz-tuition-deploy/.env`
3. Verify Docker is running: `sudo systemctl status docker`

### Database connection fails

1. Check RDS status in AWS Console
2. Verify security group allows EC2
3. Test connection: `psql -h [ENDPOINT] -U postgres -d quiz_tuition`

### Workers not processing jobs

1. Check Redis: `docker exec -it quiz-tuition-redis-1 redis-cli ping`
2. Check worker logs: `docker-compose logs [worker-name]`
3. Check queue: `docker exec -it quiz-tuition-redis-1 redis-cli KEYS bull:*`

### SSL certificate renewal fails

1. Check certbot: `sudo certbot certificates`
2. Test renewal: `sudo certbot renew --dry-run`
3. Verify DNS: `nslookup api.yourdomain.com`
   EOF

chmod 644 ~/OPERATIONS_RUNBOOK.md

````

**Note**: This runbook helps with day-to-day operations. Keep it updated.

---

### Task 84: Document Backup and Restore Procedures

**Create backup/restore documentation:**

```bash
# Create backup/restore guide
cat > ~/BACKUP_RESTORE.md << 'EOF'
# Backup and Restore Procedures

## Automated Backups

### RDS Automated Backups
- **Frequency**: Daily during backup window (03:00-04:00 UTC)
- **Retention**: 7 days
- **Location**: Same region (ap-south-1)
- **Access**: Via AWS Console → RDS → Snapshots

### S3 Versioning
- **Enabled**: Yes
- **Location**: quiz-tuition-uploads-prod bucket
- **Access**: Via AWS Console → S3

## Manual Backups

### RDS Manual Snapshot
```bash
# Create snapshot
aws rds create-db-snapshot \
  --db-instance-identifier quiz-tuition-db \
  --db-snapshot-identifier quiz-tuition-manual-$(date +%Y%m%d) \
  --region ap-south-1

# List snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier quiz-tuition-db \
  --region ap-south-1
````

### Application Files Backup

```bash
# Backup environment variables
cp ~/quiz-tuition-deploy/.env ~/backup/.env.$(date +%Y%m%d)

# Backup docker-compose files
cp ~/quiz-tuition/apps/api/docker-compose.prod.yml ~/backup/
```

## Restore Procedures

### Restore RDS from Snapshot

1. Navigate to RDS Dashboard → Snapshots
2. Select snapshot to restore
3. Click "Restore snapshot"
4. Configure new instance:
   - DB instance identifier: quiz-tuition-db-restored
   - Instance class: db.t3.micro
   - VPC: quiz-tuition-vpc
   - Security group: quiz-tuition-rds-sg
5. Update DATABASE_URL in .env file
6. Test connection before switching

### Restore S3 Files

```bash
# List versions
aws s3api list-object-versions \
  --bucket quiz-tuition-uploads-prod \
  --prefix uploads/

# Restore specific version
aws s3api restore-object \
  --bucket quiz-tuition-uploads-prod \
  --key uploads/file.pdf \
  --version-id [version-id]
```

### Restore Application Files

```bash
# Restore .env
cp ~/backup/.env.[date] ~/quiz-tuition-deploy/.env

# Restart containers to apply changes
docker-compose -f docker-compose.prod.yml restart
```

## Disaster Recovery Plan

### If EC2 instance is lost:

1. Launch new EC2 instance (t2.micro)
2. Install Docker, Docker Compose, Nginx, Certbot
3. Clone repository: `git clone [repo-url]`
4. Restore .env file from backup
5. Restore SSL certificate or obtain new one
6. Start containers: `docker-compose up -d`
7. Verify all services are running

### If RDS database is lost:

1. Restore from latest snapshot (see Restore RDS above)
2. Update DATABASE_URL in .env
3. Restart containers

### If S3 bucket data is lost:

1. Check versioning for deleted files
2. Restore from versions (see Restore S3 above)
3. If versioning doesn't help, check backups in different region (if configured)

## Backup Verification

### Test backup restore (quarterly)

1. Create test RDS instance from snapshot
2. Test database connection
3. Verify data integrity
4. Delete test instance

### Backup monitoring

- Check RDS backup status weekly in AWS Console
- Monitor S3 bucket size and versioning status
- Verify automated backups are completing successfully
  EOF

chmod 644 ~/BACKUP_RESTORE.md

````

**Note**: Regular backups are critical. Test restore procedures periodically.

---

### Task 85: Create Monitoring Checklist

**Create monitoring and maintenance checklist:**

```bash
# Create monitoring checklist
cat > ~/MONITORING_CHECKLIST.md << 'EOF'
# Monitoring and Maintenance Checklist

## Daily Checks (Automated where possible)

- [ ] Application is accessible (frontend loads)
- [ ] API health endpoint responds
- [ ] Workers are processing jobs (check logs)
- [ ] No critical errors in logs

## Weekly Checks

### System Health
- [ ] EC2 instance is running
- [ ] RDS database is available
- [ ] Containers are running (all 4: api, rasterize, llm, redis)
- [ ] Disk space is adequate (> 20% free)
- [ ] Memory usage is reasonable
- [ ] CPU usage is normal

### Application Health
- [ ] No failed generation attempts spike
- [ ] Queue depths are reasonable
- [ ] LLM usage is within limits
- [ ] S3 bucket size is within limits

### Security
- [ ] SSL certificate is valid (expires in > 30 days)
- [ ] Security group rules are appropriate
- [ ] No unauthorized access attempts (check CloudWatch logs)

## Monthly Checks

### Performance
- [ ] Review CloudWatch metrics trends
- [ ] Check database connection pool usage
- [ ] Review API response times
- [ ] Check queue processing times

### Costs
- [ ] Review AWS billing dashboard
- [ ] Verify services are within free tier
- [ ] Check for unexpected charges
- [ ] Review S3 storage costs

### Backups
- [ ] Verify RDS automated backups are running
- [ ] Test restore from backup (quarterly)
- [ ] Check S3 versioning is enabled
- [ ] Verify backup retention policies

### Updates
- [ ] Check for security updates (system packages)
- [ ] Review application dependencies for updates
- [ ] Update Docker images if needed
- [ ] Review and apply security patches

## Quarterly Checks

### Disaster Recovery
- [ ] Test full backup restore procedure
- [ ] Verify disaster recovery plan is up to date
- [ ] Review and update runbooks
- [ ] Test failover procedures (if applicable)

### Security Audit
- [ ] Review IAM user permissions
- [ ] Check for unused security groups
- [ ] Review access logs
- [ ] Update SSL certificates (if needed)

### Performance Optimization
- [ ] Review slow queries (if database has query logs)
- [ ] Check for optimization opportunities
- [ ] Review container resource limits
- [ ] Consider scaling if needed

## Alerts to Configure (if not already done)

- [ ] High CPU usage (> 80%)
- [ ] Low disk space (< 20%)
- [ ] High memory usage (> 90%)
- [ ] Database connection errors
- [ ] Container failures
- [ ] SSL certificate expiration (< 30 days)
- [ ] API health check failures

## Maintenance Windows

Schedule maintenance during low-traffic periods:
- Application updates: Sunday 2:00 AM UTC
- Database maintenance: Sunday 3:00 AM UTC (backup window)
- Security updates: Automatic (or Sunday 4:00 AM UTC)

## Contact Information

- AWS Account: [your-account-id]
- Support: [your-support-email]
- Emergency contact: [emergency-contact]
EOF

chmod 644 ~/MONITORING_CHECKLIST.md
````

**Note**: Regular monitoring prevents issues. Follow this checklist to maintain system health.

---

## Deployment Complete! 🎉

You have successfully completed all 85 deployment tasks. Your Quiz Tuition application should now be:

✅ **Deployed and Running**

- Backend on EC2 with Docker Compose
- Frontend on AWS Amplify
- Database on RDS PostgreSQL
- Redis running in Docker
- S3 bucket configured

✅ **Secure and Optimized**

- SSL certificates configured
- Security groups tightened
- Automated updates enabled
- Backups configured

✅ **Documented**

- Environment variables documented
- SSH access documented
- Runbook created
- Backup/restore procedures documented
- Monitoring checklist created

## Next Steps

1. **Test thoroughly**: Use the application regularly and monitor for issues
2. **Monitor costs**: Keep an eye on AWS billing to ensure you stay within free tier
3. **Regular maintenance**: Follow the monitoring checklist
4. **Scale when needed**: When outgrowing free tier, plan for scaling
5. **Keep updated**: Regularly update dependencies and security patches

## Support Resources

- **AWS Console**: https://console.aws.amazon.com
- **Documentation**: See files created in `~` directory on EC2
- **Logs**: Check CloudWatch or local log files
- **This Guide**: Refer back to `deployment.md` for detailed steps

**Congratulations on completing your deployment!** 🚀
