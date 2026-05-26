#!/bin/bash

python manage.py makemigrations --noinput
python manage.py migrate --noinput

python manage.py create_superuser_if_not_exists

python seed_data.py

python seed_mongo_rules.py

exec python manage.py runserver 0.0.0.0:8000
