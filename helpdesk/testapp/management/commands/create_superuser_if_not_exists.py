from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from django.core.exceptions import ImproperlyConfigured
from django.db import IntegrityError
from django.core.exceptions import ValidationError

import os
from dotenv import load_dotenv
load_dotenv()

import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def handle(self, *args, **options):
        User = get_user_model()

        username = os.environ.get('DJANGO_SUPERUSER_USERNAME')
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

        if not all([username, email, password]):
            logging.error("User did not did not provides superuser's credentials! Failed attempt to create superuser!")
            raise ImproperlyConfigured("User did not did not provides superuser's credentials!")

        if User.objects.filter(username=username).exists():
            logging.error("Superuser already exists!")
            return

        else:
            try:
                User.objects.create_superuser(username=username, email=email, password=password)
                logging.info("Superuser created successfully!")

            except (ValidationError, IntegrityError) as e:
                logger.error(f"Failed to create superuser: {str(e)}")
                raise

