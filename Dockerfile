FROM php:8.3-apache

WORKDIR /var/www/html

COPY --chown=www-data:www-data index.php config.php ./
COPY --chown=www-data:www-data api/ ./api/
COPY --chown=www-data:www-data assets/ ./assets/

EXPOSE 80
