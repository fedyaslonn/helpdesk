import os
import redis
from django.db.models import Count
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from prometheus_client import generate_latest, REGISTRY

from core.models import Ticket, SupportEngineer, User
from core.metrics import TICKETS_TOTAL, ENGINEER_LOAD, CELERY_QUEUE_LENGTH
from rest_framework.decorators import api_view, authentication_classes, permission_classes


@api_view(['GET'])
@authentication_classes([]) # 👈 Отключаем попытки DRF расшифровать это как JWT
@permission_classes([])
def prometheus_metrics_view(request):
    # --- БЛОК БЕЗОПАСНОСТИ ---
    # Пускаем либо админа (из React), либо Prometheus (по секретному токену)
    auth_header = request.headers.get('Authorization', '')
    prometheus_token = os.getenv('PROMETHEUS_SCRAPE_TOKEN', 'secret-scrape-token')
    
    is_admin = request.user.is_authenticated and getattr(request.user, 'role', '') == User.Role.ADMIN
    is_prometheus = auth_header == f"Bearer {prometheus_token}"
    
    if not (is_admin or is_prometheus):
        return HttpResponse("Доступ запрещен", status=403)
        
    # --- БЛОК ОБНОВЛЕНИЯ ДИНАМИЧЕСКИХ МЕТРИК (Gauges) ---
    
    # 1. Актуальные статусы тикетов
    status_counts = Ticket.objects.values('status').annotate(count=Count('id'))
    
    # Сначала обнуляем все возможные статусы (чтобы не зависли старые данные)
    for choice in Ticket.Status.choices:
        TICKETS_TOTAL.labels(status=choice[0]).set(0)
        
    for item in status_counts:
        TICKETS_TOTAL.labels(status=item['status']).set(item['count'])

    # 2. Нагрузка на инженеров
    active_engineers = SupportEngineer.objects.filter(is_on_duty=True).select_related('user')
    for eng in active_engineers:
        # У тебя уже есть метод eng.get_active_tickets_count()
        load = eng.assigned_tickets.filter(status__in=[Ticket.Status.OPEN, Ticket.Status.IN_PROGRESS]).count()
        ENGINEER_LOAD.labels(engineer=eng.user.username).set(load)

    # 3. Длина очереди Celery в Redis
    try:
        redis_client = redis.Redis.from_url(os.getenv('CELERY_BROKER_URL', 'redis://redis:6379/0'))
        # Celery хранит задачи в списке (list) с названием 'celery'
        queue_len = redis_client.llen('celery')
        CELERY_QUEUE_LENGTH.labels(queue_name='celery').set(queue_len)
    except Exception:
        CELERY_QUEUE_LENGTH.labels(queue_name='celery').set(0)

    # --- ОТДАЧА РЕЗУЛЬТАТА ---
    # Генерируем текст в правильном формате Prometheus
    metrics_data = generate_latest(REGISTRY)
    return HttpResponse(metrics_data, content_type='text/plain; version=0.0.4')
