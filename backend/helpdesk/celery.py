import logging
import os

from celery import Celery
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "helpdesk.settings")

app = Celery("helpdesk")


app.config_from_object("django.conf:settings", namespace="CELERY")

import helpdesk.celery_signals

app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    logger.info(f"Request: {self.request!r}")
