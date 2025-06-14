from celery import shared_task
from celery.signals import (
    task_prerun,
    task_success,
    task_failure,
    task_retry,
    task_postrun,
)

import logging

logger = logging.getLogger(__name__)


@task_prerun.connect()
def on_task_prerun(sender=None, task_id=None, **kwargs):
    logger.info(f"Таска {task_id}, {sender.name} начала выполняться")


@task_success.connect()
def on_task_success(sender=None, task_id=None, result=None, **kwargs):
    logger.info(f"Таска {task_id}, {sender.name} завершена с результатом: {result}")


@task_failure.connect()
def on_task_failure(task_id=None, sender=None, reason=None, **kwargs):
    logger.info(f"Таска {task_id}, {sender.name} завершена с ошибкой: {reason}")


@task_retry.connect()
def on_task_retry(sender=None, task_id=None, reason=None, **kwargs):
    logger.info(f"Повтор задачи {task_id}, {sender.name}. Причина: {reason}")


@task_postrun.connect()
def after_task_return(sender=None, task_id=None, state=None, retval=None, **kwargs):
    logger.info(
        f"Задача {task_id}, {sender.name} завершена. Статус: {state}, результат: {retval}"
    )
