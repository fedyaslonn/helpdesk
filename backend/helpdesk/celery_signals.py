import logging

from celery import shared_task
from celery.signals import (
    task_failure,
    task_postrun,
    task_prerun,
    task_retry,
    task_success,
)

logger = logging.getLogger(__name__)


@task_prerun.connect()
def on_task_prerun(sender=None, task_id=None, **kwargs):
    logger.info(f"Task {task_id} ({sender.name}) started execution")


@task_success.connect()
def on_task_success(sender=None, task_id=None, result=None, **kwargs):
    logger.info(f"Task {task_id} ({sender.name}) completed successfully. Result: {result}")


@task_failure.connect()
def on_task_failure(task_id=None, sender=None, reason=None, **kwargs):
    logger.error(f"Task {task_id} ({sender.name}) failed with error: {reason}")


@task_retry.connect()
def on_task_retry(sender=None, task_id=None, reason=None, **kwargs):
    logger.warning(f"Task {task_id} ({sender.name}) retry attempt. Reason: {reason}")


@task_postrun.connect()
def after_task_return(sender=None, task_id=None, state=None, retval=None, **kwargs):
    logger.info(
        f"Task {task_id} ({sender.name}) finished. Status: {state}, Return value: {retval}"
    )
