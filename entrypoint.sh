#!/bin/bash

python manage.py makemigrations --noinput
python manage.py migrate --noinput

python manage.py create_superuser_if_not_exists

exec python manage.py runserver 0.0.0.0:8000