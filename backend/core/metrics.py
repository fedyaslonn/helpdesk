from prometheus_client import Counter, Gauge, Histogram

# --- БИЗНЕС-МЕТРИКИ (Helpdesk & SLA) ---
# Gauge используем для того, что может увеличиваться и уменьшаться
TICKETS_TOTAL = Gauge('helpdesk_tickets_total', 'Текущее количество заявок', ['status'])
ENGINEER_LOAD = Gauge('helpdesk_engineer_load', 'Нагрузка на инженера', ['engineer'])
CELERY_QUEUE_LENGTH = Gauge('celery_queue_length', 'Длина очереди Celery', ['queue_name'])

# Counter используем для того, что только растет
SLA_BREACHES_TOTAL = Counter('helpdesk_sla_breaches_total', 'Количество нарушений SLA')

# Histogram автоматически считает среднее время и распределение
RESOLUTION_TIME = Histogram('helpdesk_resolution_time_seconds', 'Время решения заявки')

# --- МЕТРИКИ ИСКУССТВЕННОГО ИНТЕЛЛЕКТА (Ollama) ---
AI_CLASSIFICATION_DURATION = Histogram('ai_classification_duration_seconds', 'Время классификации ИИ')
AI_CLASSIFICATION_REQUESTS = Counter('ai_classification_requests_total', 'Статусы запросов к ИИ', ['status'])
AI_PRIORITY_ASSIGNED = Counter('ai_priority_assigned_total', 'Распределение приоритетов ИИ', ['priority'])

# --- МЕТРИКИ CELERY ---
CELERY_TASK_STATUS = Counter('celery_task_status_total', 'Статусы выполнения задач Celery', ['task', 'state'])
CELERY_TASK_EXECUTION_TIME = Histogram('celery_task_execution_time_seconds', 'Время выполнения Celery', ['task'])

TOTAL_USERS = Gauge('helpdesk_total_users', 'Общее количество зарегистрированных пользователей')
TOTAL_TICKETS = Gauge('helpdesk_total_tickets', 'Общее количество созданных заявок за все время')
OPEN_TICKETS = Gauge('helpdesk_active_tickets', 'Количество заявок в работе (не закрытых)')
