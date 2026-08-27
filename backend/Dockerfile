FROM php:8.4-apache
RUN docker-php-ext-install pdo pdo_mysql
RUN a2enmod rewrite
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
RUN echo "display_errors = Off" >> $PHP_INI_DIR/php.ini && \
    echo "log_errors = On" >> $PHP_INI_DIR/php.ini && \
    echo "opcache.memory_consumption = 16" >> $PHP_INI_DIR/php.ini && \
    echo "opcache.interned_strings_buffer = 4" >> $PHP_INI_DIR/php.ini && \
    echo "opcache.jit_buffer_size = 0" >> $PHP_INI_DIR/php.ini
RUN sed -i 's/StartServers.*/StartServers 1/' /etc/apache2/mods-available/mpm_prefork.conf && \
    sed -i 's/MinSpareServers.*/MinSpareServers 1/' /etc/apache2/mods-available/mpm_prefork.conf && \
    sed -i 's/MaxSpareServers.*/MaxSpareServers 2/' /etc/apache2/mods-available/mpm_prefork.conf && \
    sed -i 's/MaxRequestWorkers.*/MaxRequestWorkers 10/' /etc/apache2/mods-available/mpm_prefork.conf && \
    sed -i 's/MaxConnectionsPerChild.*/MaxConnectionsPerChild 100/' /etc/apache2/mods-available/mpm_prefork.conf
WORKDIR /var/www/html
EXPOSE 80



# Copy backend files to the container
COPY . /var/www/html/

# Create uploads directory if it doesn't exist and set permissions
RUN mkdir -p /var/www/html/uploads &&     chown -R www-data:www-data /var/www/html &&     chmod -R 755 /var/www/html/uploads


