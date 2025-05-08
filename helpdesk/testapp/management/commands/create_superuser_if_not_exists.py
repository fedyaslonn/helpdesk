from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from django.core.exceptions import ImproperlyConfigured

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
            logging.error("Пользователь не предоставил креды! Неудачная попытка создания суперюзера!")
            raise ImproperlyConfigured("Пользователь не предоставил креды суперюзера!")

        if User.objects.filter(username=username).exists():
            logging.error("Суперпользователь уже существует!")
            return

        else:
            try:
                User.objects.create_superuser(username=username, email=email, password=password)
                logging.info("Суперпользователь создан удачно!")

            except Exception as e:
                logger.error(f"Неудачная попытка создания пользователя: {str(e)}")
                raise