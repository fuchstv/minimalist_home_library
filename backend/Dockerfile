FROM php:8.4-apache

# Install PDO MySQL extension
RUN docker-php-ext-install pdo pdo_mysql

# Enable Apache rewrite module
RUN a2enmod rewrite

# Copy backend files to the container
COPY . /var/www/html/

# Create uploads directory if it doesn't exist and set permissions
RUN mkdir -p /var/www/html/uploads &&     chown -R www-data:www-data /var/www/html &&     chmod -R 755 /var/www/html/uploads

# Set working directory
WORKDIR /var/www/html

# Expose port 80
EXPOSE 80
