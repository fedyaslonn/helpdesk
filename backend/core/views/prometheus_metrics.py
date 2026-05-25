import os
import redis
from django.db.models import Count
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from prometheus_client import generate_latest, REGISTRY

from core.models import Ticket, SupportEngineer, User
from core.metrics import (
    TICKETS_TOTAL as TICKETS_BY_STATUS,  # Переименовываем при импорте для совместимости с кодом
    ENGINEER_LOAD, 
    CELERY_QUEUE_LENGTH, 
    TOTAL_USERS, 
    TOTAL_TICKETS, 
    OPEN_TICKETS as ACTIVE_TICKETS       # Переименовываем OPEN_TICKETS в ACTIVE_TICKETS
)
from rest_framework.decorators import api_view, authentication_classes, permission_classes

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


@api_view(['GET'])
@authentication_classes([])  # Отключаем глобальные фильтры аутентификации DRF
@permission_classes([])  # Отключаем глобальные проверки прав
def prometheus_metrics_view(request):
    """
    Эндпоинт сбора метрик. Поддерживает аутентификацию по Bearer токену
    для агента Prometheus, а также аутентификацию по JWT токену для Администраторов.
    """
    # --- БЛОК БЕЗОПАСНОСТИ И ПРОВЕРКИ ДОСТУПА ---
    auth_header = request.headers.get('Authorization', '')
    prometheus_token = os.getenv('PROMETHEUS_SCRAPE_TOKEN', 'secret-scrape-token')

    # Проверка 1: Это запрос от самого сервиса Prometheus?
    is_prometheus = auth_header == f"Bearer {prometheus_token}"

    # Проверка 2: Если это не Prometheus, проверяем, Администратор ли это из React?
    is_admin = False
    if not is_prometheus:
        try:
            jwt_authenticator = JWTAuthentication()
            auth_result = jwt_authenticator.authenticate(request)
            if auth_result is not None:
                user, token = auth_result
                # Проверяем роль пользователя (строка 'admin' или через Enums)
                if user.is_authenticated and getattr(user, 'role', '') == 'admin':
                    is_admin = True
        except AuthenticationFailed:
            pass  # Токен невалиден или просрочен

    # Если запрос не от Prometheus и не от Администратора платформы — возвращаем 403
    if not (is_admin or is_prometheus):
        return HttpResponse("Доступ запрещен", status=403)

    # =========================================================================
    #  СБОР ДАННЫХ ИЗ БАЗЫ ДАННЫХ (POSTGRESQL)
    # =========================================================================

    # Шаг 1: Подсчет глобальных счетчиков (простые запросы SELECT COUNT(*))
    TOTAL_USERS.set(User.objects.count())
    TOTAL_TICKETS.set(Ticket.objects.count())

    # Исключаем статус 'resolved' (или 'closed' в зависимости от вашей модели)
    ACTIVE_TICKETS.set(Ticket.objects.exclude(status='resolved').count())

    # Шаг 2: Распределение по статусам (Группировка на уровне СУБД)
    status_counts = Ticket.objects.values('status').annotate(count=Count('id'))

    # Инициализируем все доступные статусы нулями, чтобы графики в Grafana не ломались
    for choice in Ticket.Status.choices:
        TICKETS_BY_STATUS.labels(status=choice[0]).set(0)

    # Заполняем метрики реальными агрегированными данными из СУБД
    for item in status_counts:
        TICKETS_BY_STATUS.labels(status=item['status']).set(item['count'])

    # Шаг 3: Подсчет нагрузки на активных (дежурных) инженеров
    active_engineers = SupportEngineer.objects.filter(is_on_duty=True).select_related('user')

    # Сбрасываем старые значения (на случай, если инженер ушел со смены)
    # Prometheus кэширует метрики, поэтому обнуление/сброс — хорошая практика
    ENGINEER_LOAD.clear()

    for eng in active_engineers:
        # Считаем только те тикеты инженера, которые сейчас находятся в активной работе
        load = eng.assigned_tickets.filter(
            status__in=['open', 'in_progress']  # Скорректируйте строки под ваши статусы
        ).count()
        ENGINEER_LOAD.labels(engineer=eng.user.username).set(load)

    # =========================================================================
    #  СБОР ДАННЫХ ИЗ БРОКЕРА ЗАДАЧ (REDIS / CELERY)
    # =========================================================================
    try:
        redis_url = os.getenv('CELERY_BROKER_URL', 'redis://redis:6379/0')
        redis_client = redis.Redis.from_url(redis_url)
        # Получаем длину списка (очереди) с именем 'celery'
        queue_len = redis_client.llen('celery')
        CELERY_QUEUE_LENGTH.labels(queue_name='celery').set(queue_len)
    except Exception:
        # Если Redis временно недоступен — пишем в метрику 0, чтобы не ронять весь эндпоинт
        CELERY_QUEUE_LENGTH.labels(queue_name='celery').set(0)

    # =========================================================================
    #  ФОРМИРОВАНИЕ И ОТПРАВКА ОТВЕТА В ФОРМАТЕ PROMETHEUS
    # =========================================================================
    metrics_data = generate_latest(REGISTRY)
    return HttpResponse(metrics_data, content_type='text/plain; version=0.0.4')
