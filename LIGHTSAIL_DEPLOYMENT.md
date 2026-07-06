# Deployment on Amazon Lightsail

This guide covers two ways to deploy the Digital Home Library on Amazon Lightsail.

## Option 1: Lightsail Containers (Recommended)

Lightsail Containers is a serverless way to run Docker containers.

### 1. Build and Push Images
You can use the AWS CLI with the Lightsail Control Plugin to push your images.

```bash
# Build frontend
docker build -t library-frontend ./frontend

# Build backend
docker build -t library-backend ./backend

# Push to Lightsail (replace <service-name> with your Lightsail Container Service name)
aws lightsail push-container-image --service-name <service-name> --label frontend --image library-frontend
aws lightsail push-container-image --service-name <service-name> --label backend --image library-backend
```

### 2. Configure Database
Use a **Lightsail Managed Database** (MySQL 8.0) for better reliability and automatic backups.
- Note the Endpoint, Username, and Password.

### 3. Create Deployment
In the Lightsail console, create a new deployment for your Container Service:

#### Container: `backend`
- **Image**: Select the pushed backend image.
- **Environment Variables**:
  - `DB_HOST`: Your Lightsail DB Endpoint.
  - `DB_USER`: Your Lightsail DB Username.
  - `DB_PASS`: Your Lightsail DB Password.
  - `DB_NAME`: `library_db` (or your chosen name).
  - `ALLOWED_ORIGINS`: The public domain of your container service.

#### Container: `frontend`
- **Image**: Select the pushed frontend image.
- **Port**: 80 (HTTP)
- **Public Endpoint**: Set this container as the public endpoint.

---

## Option 2: Lightsail Instance (VPS with Docker Compose)

This is more cost-effective as it runs everything (including the database) on a single virtual machine.

### 1. Create a Lightsail Instance
- **Blueprint**: OS Only -> Ubuntu 22.04 LTS (or similar).
- **Plan**: At least 1 GB RAM (2 GB recommended for MySQL + Node build).

### 2. Setup Docker
SSH into your instance and install Docker and Docker Compose:
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo usermod -aG docker $USER
# Logout and log back in
```

### 3. Deploy
Clone the repository and start the production setup:
```bash
git clone <your-repo-url>
cd <repo-dir>

# Create .env file with production secrets
cat <<EOT > .env
MYSQL_USER=library_prod_user
MYSQL_PASSWORD=ZFMwWwWoQ52qJrii
MYSQL_DATABASE=library_db
MYSQL_ROOT_PASSWORD=AljO2D1aBnyb4sQ0
ALLOWED_ORIGINS=http://<your-instance-ip>,https://<your-domain>
VITE_API_URL=
EOT

docker-compose -f docker-compose.prod.yml up -d
```

### 4. Firewall
In the Lightsail console under **Networking**, ensure port 80 (HTTP) and 443 (HTTPS) are open.

## Troubleshooting: Database User Issues
If you are re-deploying or changing the `.env` file after the database volume has already been initialized, the MySQL container will **not** automatically create the new user or change the password. This is because the initialization scripts only run on an empty volume.

To fix this, you must manually create the user via the MySQL console:
```bash
# Enter the database container
docker exec -it <container_id_or_name> mysql -u root -p

# Inside MySQL:
CREATE USER 'library_prod_user'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON library_db.* TO 'library_prod_user'@'%';
FLUSH PRIVILEGES;
```

## Persistent Data
- **Uploads**: The `uploads_data` volume in `docker-compose.prod.yml` ensures that book covers are not lost when the backend container restarts.
- **Database**: The `db_data` volume persists the MySQL data. If using Lightsail Containers, use a Managed Database instead of a containerized DB for production.
