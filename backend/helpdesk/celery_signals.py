import logging
import time

from celery import shared_task
from celery.signals import (
    task_failure,
    task_postrun,
    task_prerun,
    task_retry,
    task_success,
)

# Импортируем метрики (убедись, что путь импорта правильный для твоего проекта)
from core.metrics import CELERY_TASK_STATUS, CELERY_TASK_EXECUTION_TIME

logger = logging.getLogger(__name__)

# Временное хранилище для таймеров задач
task_start_times = {}


@task_prerun.connect()
def on_task_prerun(sender=None, task_id=None, **kwargs):
    logger.info(f"Таска {task_id}, {sender.name} начала выполняться")
    
    # Запускаем таймер для метрик
    task_start_times[task_id] = time.time()


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
    
    # Извлекаем имя задачи (sender.name) с защитой от пустых значений
    task_name = getattr(sender, 'name', 'unknown_task')
    
    # 1. Инкрементируем счетчик статусов в Prometheus (SUCCESS, FAILURE, RETRY)
    CELERY_TASK_STATUS.labels(task=task_name, state=state).inc()
    
    # 2. Вычисляем и записываем время выполнения в гистограмму
    start_time = task_start_times.pop(task_id, None)
    if start_time:
        duration = time.time() - start_time
        CELERY_TASK_EXECUTION_TIME.labels(task=task_name).observe(duration)
