FROM php:8.4-apache
RUN docker-php-ext-install pdo pdo_mysql
RUN a2enmod rewrite
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
RUN echo "display_errors = Off" >> $PHP_INI_DIR/php.ini && \
    echo "log_errors = On" >> $PHP_INI_DIR/php.ini
WORKDIR /var/www/html
EXPOSE 80



# Copy backend files to the container
COPY . /var/www/html/

# Create uploads directory if it doesn't exist and set permissions
RUN mkdir -p /var/www/html/uploads &&     chown -R www-data:www-data /var/www/html &&     chmod -R 755 /var/www/html/uploads


