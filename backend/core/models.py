import uuid
from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.core.validators import MinLengthValidator, MinValueValidator, MaxValueValidator
from django.db import models, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.db.models import Count, Q


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Дата создания"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Дата обновления"))

    class Meta:
        abstract = True


class Priority(models.Model):
    """Уровень приоритета"""
    name = models.CharField(max_length=50, unique=True, verbose_name=_("Название"))
    level = models.PositiveIntegerField(unique=True, verbose_name=_("Числовой уровень"))

    class Meta:
        verbose_name = _("Приоритет")
        verbose_name_plural = _("Приоритеты")
        ordering = ["level"]

    def __str__(self):
        return f"{self.name} (Ур. {self.level})"


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", _("Администратор")
        ENGINEER = "engineer", _("Инженер поддержки")
        CLIENT = "client", _("Клиент")

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CLIENT,
        verbose_name=_("Роль в системе")
    )
    email = models.EmailField(max_length=254, unique=True, verbose_name=_("Email"))
    username = models.CharField(
        max_length=150, unique=True, validators=[MinLengthValidator(3)], verbose_name=_("Логин")
    )
    full_name = models.CharField(max_length=255, blank=True, verbose_name=_("ФИО"))
    contact_phone = models.CharField(max_length=20, blank=True, verbose_name=_("Телефон"))
    is_verified = models.BooleanField(default=False, verbose_name=_("Верифицирован админом"))
    date_birth = models.DateField(null=True, blank=True, verbose_name=_("Дата рождения"))

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    class Meta:
        verbose_name = _("Пользователь")
        verbose_name_plural = _("Пользователи")
        db_table = "users"

    def save(self, *args, **kwargs):
        # Автоматически даём доступ к Django Admin для администраторов
        if self.role == self.Role.ADMIN:
            self.is_staff = True
        super().save(*args, **kwargs)

    @property
    def is_admin(self) -> bool:
        return self.role == self.Role.ADMIN

    @property
    def is_engineer(self) -> bool:
        return self.role == self.Role.ENGINEER

    @property
    def is_client(self) -> bool:
        return self.role == self.Role.CLIENT

    def can_manage_users(self) -> bool:
        return self.is_admin

    def can_assign_tickets(self) -> bool:
        return self.is_admin or self.is_engineer

    def __str__(self):
        return self.full_name or self.username


class Client(TimestampedModel):
    """Таблица 2.1 – Клиенты"""
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="client_profile",
        verbose_name=_("Пользователь")
    )
    account_id = models.CharField(max_length=50, unique=True, blank=True, null=True,
                                  verbose_name=_("ID учетной записи"))
    position = models.CharField(max_length=100, blank=True, verbose_name=_("Должность"))
    status = models.CharField(
        max_length=15,
        choices=[("active", "Активна"), ("archived", "Архив")],
        default="active",
        verbose_name=_("Статус")
    )

    class Meta:
        verbose_name = _("Клиент")
        verbose_name_plural = _("Клиенты")
        db_table = "clients"

    def clean(self):
        if self.user.role != User.Role.CLIENT:
            raise models.ValidationError("Профиль клиента может быть привязан только к пользователю с ролью CLIENT")

    def __str__(self):
        return f"{self.user.full_name} ({self.account_id or 'Без ID'})"


class SupportEngineer(TimestampedModel):
    """Таблица 2.2 – Инженеры поддержки"""
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="engineer_profile",
        verbose_name=_("Пользователь")
    )
    max_concurrent_tickets = models.PositiveIntegerField(default=3, verbose_name=_("Макс. заявок в работе"))
    is_on_duty = models.BooleanField(default=False, verbose_name=_("На дежурстве"))
    last_ticket_resolved_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Последнее решение"))

    class Meta:
        verbose_name = _("Инженер поддержки")
        verbose_name_plural = _("Инженеры поддержки")
        db_table = "support_engineers"

    def clean(self):
        if self.user.role != User.Role.ENGINEER:
            raise models.ValidationError("Профиль инженера может быть привязан только к пользователю с ролью ENGINEER")

    @property
    def is_active_on_shift(self) -> bool:
        """Проверяет, находится ли инженер сейчас в активной смене"""
        now = timezone.localtime(timezone.now())
        return (
                self.is_on_duty and
                self.shifts.filter(
                    shift_date=now.date(),
                    is_active=True,
                    shift_start__lte=now.time(),
                    shift_end__gte=now.time()
                ).exists()
        )

    def __str__(self):
        return f"{self.user.full_name} ({self.user.username})"


class ShiftSchedule(TimestampedModel):
    """Таблица 2.3 – Расписание смен"""
    engineer = models.ForeignKey(SupportEngineer, on_delete=models.CASCADE, related_name="shifts",
                                 verbose_name=_("Инженер"))
    shift_date = models.DateField(verbose_name=_("Дата смены"))
    shift_start = models.TimeField(verbose_name=_("Начало"))
    shift_end = models.TimeField(verbose_name=_("Окончание"))
    is_active = models.BooleanField(default=True, verbose_name=_("Активна"))

    class Meta:
        verbose_name = _("Смена")
        verbose_name_plural = _("Расписание смен")
        db_table = "shift_schedules"
        constraints = [
            models.UniqueConstraint(fields=["engineer", "shift_date"], name="unique_shift_per_day")
        ]

    def __str__(self):
        return f"{self.engineer.user.full_name} | {self.shift_date} {self.shift_start}-{self.shift_end}"


class Category(TimestampedModel):
    """Таблица 2.6 – Категории проблем"""
    name = models.CharField(max_length=100, verbose_name=_("Название"))
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="children", verbose_name=_("Родительская категория")
    )
    description = models.TextField(blank=True, verbose_name=_("Описание"))
    default_priority = models.ForeignKey(Priority, on_delete=models.SET_NULL, null=True, blank=True,
                                         verbose_name=_("Приоритет по умолчанию"))
    knowledge_base_link = models.URLField(blank=True, verbose_name=_("Ссылка на БЗ"))

    class Meta:
        verbose_name = _("Категория проблемы")
        verbose_name_plural = _("Категории проблем")
        db_table = "categories"

    def __str__(self):
        return self.name


class SLAParameter(TimestampedModel):
    """Таблица 2.4 – Параметры SLA"""
    priority = models.ForeignKey(Priority, on_delete=models.CASCADE, verbose_name=_("Приоритет"))
    category = models.ForeignKey(Category, on_delete=models.CASCADE, verbose_name=_("Категория"))
    response_time_min = models.PositiveIntegerField(verbose_name=_("Время реакции (мин)"))
    resolution_time_min = models.PositiveIntegerField(verbose_name=_("Время решения (мин)"))
    comment = models.TextField(blank=True, verbose_name=_("Комментарий"))

    class Meta:
        verbose_name = _("Параметр SLA")
        verbose_name_plural = _("Параметры SLA")
        db_table = "sla_parameters"
        constraints = [
            models.UniqueConstraint(fields=["priority", "category"], name="unique_sla_rule")
        ]

    def __str__(self):
        return f"{self.priority.name} | {self.category.name}"


# --- Менеджер определяется до модели, чтобы избежать CircularImport, но использует self.model ---
class TicketManager(models.Manager):
    def get_active_engineers_on_shift(self):
        """Инженеры, находящиеся сейчас в активной смене"""
        now = timezone.localtime(timezone.now())
        current_date = now.date()
        current_time = now.time()

        return SupportEngineer.objects.filter(
            user__is_active=True,
            is_on_duty=True,
            shifts__shift_date=current_date,
            shifts__is_active=True
        ).annotate(
            shift_start=models.F("shifts__shift_start"),
            shift_end=models.F("shifts__shift_end"),
            active_tickets=models.Count(
                "assigned_tickets",
                filter=models.Q(
                    assigned_tickets__status__in=[
                        self.model.Status.OPEN,
                        self.model.Status.IN_PROGRESS,
                        self.model.Status.WAITING,
                    ]
                )
            )
        ).filter(
            models.Q(shift_start__lte=current_time, shift_end__gte=current_time) |
            models.Q(shift_start__gt=models.F("shift_end"))
        ).filter(
            active_tickets__lt=models.F("max_concurrent_tickets")
        ).distinct().order_by("active_tickets", "last_ticket_resolved_at")

    def auto_assign(self, ticket):
        """Автоматическое назначение свободного инженера с отладочными принтами"""
        with transaction.atomic():
            now = timezone.localtime(timezone.now())
            print(f"\n--- НАЧАЛО АВТО-НАЗНАЧЕНИЯ ДЛЯ ТИКЕТА {ticket.ticket_number} ---")
            print(f"Текущее время сервера: {now.date()} {now.time()}")

            # 1. Проверяем, есть ли вообще инженеры в базе
            total_engineers = SupportEngineer.objects.count()
            print(f"1. Всего инженеров в базе: {total_engineers}")

            # 2. Проверяем, кто на дежурстве (is_on_duty=True)
            on_duty_engineers = SupportEngineer.objects.filter(user__is_active=True, is_on_duty=True)
            print(f"2. Активных инженеров с галочкой 'На дежурстве': {on_duty_engineers.count()}")

            # Детальный разбор каждого дежурного инженера
            for eng in on_duty_engineers:
                print(f"  -> Проверяем инженера: {eng.user.username} (ID: {eng.id})")
                
                # Проверка смен
                shifts_today = eng.shifts.filter(shift_date=now.date(), is_active=True)
                if not shifts_today.exists():
                    print(f"     [X] ОТКЛОНЕН: Нет активной смены на сегодня ({now.date()})")
                else:
                    shift = shifts_today.first()
                    is_time_match = (shift.shift_start <= now.time() <= shift.shift_end) or (shift.shift_start > shift.shift_end)
                    if not is_time_match:
                        print(f"     [X] ОТКЛОНЕН: Нерабочее время. Смена с {shift.shift_start} до {shift.shift_end}, а сейчас {now.time()}")
                    else:
                        print(f"     [V] Смена подходит ({shift.shift_start} - {shift.shift_end})")

                # Проверка лимитов тикетов
                active_t_count = eng.assigned_tickets.filter(status__in=['OP', 'IP', 'WR']).count()
                limit = eng.max_concurrent_tickets
                if active_t_count >= limit:
                    print(f"     [X] ОТКЛОНЕН: Превышен лимит заявок. В работе: {active_t_count}, Лимит: {limit}")
                else:
                    print(f"     [V] Лимит в норме: В работе {active_t_count} из {limit}")

            # Итоговый запуск штатного метода поиска
            engineers = self.get_active_engineers_on_shift()
            
            if not engineers.exists():
                print(f"--- ИТОГ: ПОДХОДЯЩИХ ИНЖЕНЕРОВ НЕ НАЙДЕНО ---\n")
                return ticket

            best_candidate = engineers.first()
            print(f"--- ИТОГ: НАЗНАЧЕН ИНЖЕНЕР {best_candidate.user.username} ---\n")
            
            ticket.assigned_engineer = best_candidate
            ticket.status = self.model.Status.IN_PROGRESS
            ticket.save(update_fields=["assigned_engineer", "status", "updated_at"])
            return ticket

    def get_sla_breached_tickets(self):
        """Возвращает заявки, просрочившие SLA"""
        return self.filter(
            sla_deadline__isnull=False,
            sla_deadline__lt=timezone.now(),
            status__in=[self.model.Status.OPEN, self.model.Status.IN_PROGRESS]
        )


class Ticket(TimestampedModel):
    """Таблица 2.5 – Заявки"""

    class Status(models.TextChoices):
        OPEN = "OP", _("Открыта")
        IN_PROGRESS = "IP", _("В работе")
        RESOLVED = "RS", _("Решена")
        WAITING = "WR", _("Ожидание заказчика")
        CLOSED = "CL", _("Закрыта")

    ticket_number = models.CharField(max_length=20, unique=True, editable=False, verbose_name=_("Номер заявки"))
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tickets", verbose_name=_("Автор"))
    category = models.ForeignKey(Category, on_delete=models.PROTECT, verbose_name=_("Категория"))
    priority = models.ForeignKey(
        Priority,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        verbose_name=_("Приоритет"),
    )
    assigned_engineer = models.ForeignKey(
        SupportEngineer, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="assigned_tickets", verbose_name=_("Назначенный инженер")
    )
    sla_deadline = models.DateTimeField(null=True, blank=True, verbose_name=_("SLA дедлайн"))
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Фактическое время решения"))
    status = models.CharField(max_length=2, choices=Status.choices, default=Status.OPEN, verbose_name=_("Статус"))
    description = models.TextField(validators=[MinLengthValidator(8)], verbose_name=_("Описание проблемы"))

    objects = TicketManager()

    class Meta:
        verbose_name = _("Заявка")
        verbose_name_plural = _("Заявки")
        db_table = "tickets"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if not self.ticket_number:
            self.ticket_number = f"TK-{uuid.uuid4().hex[:8].upper()}"
            
        # 🔥 ДОБАВЛЯЕМ ЛОГИКУ ФИКСАЦИИ ВРЕМЕНИ РЕШЕНИЯ
        if self.status in [self.Status.WAITING, self.Status.RESOLVED] and not self.resolved_at:
            from django.utils import timezone
            self.resolved_at = timezone.now()
        
        # Если тикет вернули в работу (например, клиент нажал "Проблема не решена")
        elif self.status in [self.Status.OPEN, self.Status.IN_PROGRESS]:
            self.resolved_at = None 

        super().save(*args, **kwargs)
    def _calculate_sla_deadline(self):
        effective_priority = self.priority or self.category.default_priority
        if not effective_priority:
            return
        sla = SLAParameter.objects.filter(
            priority=effective_priority,
            category=self.category
        ).first()
        if sla:
            # 🔥 ИСПРАВЛЕНИЕ: Если заявка только создается и created_at еще None, 
            # используем текущее время (timezone.now())
            from django.utils import timezone
            base_time = self.created_at or timezone.now()
            self.sla_deadline = base_time + timedelta(minutes=sla.resolution_time_min)
    def assign_engineer(self, engineer: SupportEngineer, assigned_by: User):
        """Ручное назначение инженера (доступно Админу и Инженеру)"""
        if not assigned_by.can_assign_tickets():
            raise PermissionError("Недостаточно прав для назначения инженера")
        if engineer.user.role != User.Role.ENGINEER:
            raise ValueError("Указанный пользователь не является инженером поддержки")

        self.assigned_engineer = engineer
        self.status = self.Status.IN_PROGRESS
        self.save(update_fields=["assigned_engineer", "status", "updated_at"])
        return self

    def __str__(self):
        return f"{self.ticket_number} | {self.description[:30]}"


class Comment(TimestampedModel):
    """Таблица 2.8 – Комментарии и ответы"""
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="comments", verbose_name=_("Заявка"))
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="comments", verbose_name=_("Автор"))
    content = models.TextField(validators=[MinLengthValidator(2)], verbose_name=_("Текст комментария"))

    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, 
        related_name="replies", verbose_name="Родительский комментарий"
    )

    class Meta:
        verbose_name = _("Комментарий")
        verbose_name_plural = _("Комментарии")
        db_table = "comments"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Комментарий от {self.author} к {self.ticket.ticket_number}"


class SupportSession(TimestampedModel):
    """Таблица 2.7 – Сессии поддержки"""
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="sessions", verbose_name=_("Заявка"))
    engineer = models.ForeignKey(SupportEngineer, on_delete=models.SET_NULL, null=True, verbose_name=_("Инженер"))
    session_start = models.DateTimeField(verbose_name=_("Начало сессии"))
    session_end = models.DateTimeField(null=True, blank=True, verbose_name=_("Завершение сессии"))
    time_spent_min = models.PositiveIntegerField(default=0, verbose_name=_("Затрачено минут"))
    actions_performed = models.TextField(verbose_name=_("Выполненные действия"))
    user_satisfaction = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name=_("Оценка удовлетворенности (1-5)")
    )

    class Meta:
        verbose_name = _("Сессия поддержки")
        verbose_name_plural = _("Сессии поддержки")
        db_table = "support_sessions"

    def __str__(self):
        return f"Сессия по {self.ticket.ticket_number} | {self.time_spent_min} мин"


class ResolutionResult(TimestampedModel):
    """Таблица 2.9 – Результаты обработки"""

    class ResolutionType(models.TextChoices):
        FIXED = "fixed", _("Исправлено")
        WORKAROUND = "workaround", _("Временное решение")
        NOT_REPRODUCED = "not_reproduced", _("Не воспроизведено")
        WONT_FIX = "wont_fix", _("Не будет исправлено")

    ticket = models.OneToOneField(Ticket, on_delete=models.CASCADE, related_name="resolution", verbose_name=_("Заявка"))
    resolution_type = models.CharField(max_length=20, choices=ResolutionType.choices, verbose_name=_("Тип решения"))
    root_cause = models.TextField(blank=True, verbose_name=_("Корневая причина"))
    solution_description = models.TextField(verbose_name=_("Описание решения"))
    prevention_notes = models.TextField(blank=True, verbose_name=_("Рекомендации по предотвращению"))
    is_sla_met = models.BooleanField(default=True, verbose_name=_("SLA соблюден"))

    class Meta:
        verbose_name = _("Результат обработки")
        verbose_name_plural = _("Результаты обработки")
        db_table = "resolution_results"

    def __str__(self):
        return f"Результат по {self.ticket.ticket_number} ({self.get_resolution_type_display()})"


class KnowledgeBaseArticle(TimestampedModel):
    """Таблица 2.10 – База знаний"""
    title = models.CharField(max_length=255, verbose_name=_("Заголовок"))
    content = models.TextField(verbose_name=_("Содержание"))
    search_vector = SearchVectorField(null=True, editable=False)
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="articles", verbose_name=_("Категория")
    )
    tags = models.CharField(max_length=500, blank=True, help_text=_("Ключевые слова через запятую"),
                            verbose_name=_("Теги"))
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="kb_articles",
                               verbose_name=_("Автор"))
    is_published = models.BooleanField(default=False, verbose_name=_("Опубликовано"))
    view_count = models.PositiveIntegerField(default=0, verbose_name=_("Просмотры"))
    helpful_count = models.PositiveIntegerField(default=0, verbose_name=_("Полезные отметки"))

    class Meta:
        verbose_name = _("Статья БЗ")
        verbose_name_plural = _("База знаний")
        db_table = "knowledge_base"
        ordering = ["-updated_at"]
        indexes = [
            GinIndex(fields=["search_vector"], name="kb_article_search_gin"),
        ]

    def __str__(self):
        return self.title


class Notification(TimestampedModel):
    """Таблица 2.11 – Уведомления"""

    class Type(models.TextChoices):
        TICKET_CREATED = "ticket_created", _("Создана заявка")
        ASSIGNED = "assigned", _("Назначен инженер")
        STATUS_CHANGED = "status_changed", _("Изменен статус")
        SLA_BREACHED = "sla_breached", _("Нарушен SLA")
        COMMENT_ADDED = "comment_added", _("Новый комментарий")

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications", verbose_name=_("Получатель"))
    ticket = models.ForeignKey(Ticket, on_delete=models.SET_NULL, null=True, blank=True, related_name="notifications",
                               verbose_name=_("Заявка"))
    message = models.TextField(verbose_name=_("Текст уведомления"))
    notification_type = models.CharField(max_length=30, choices=Type.choices, verbose_name=_("Тип"))
    is_read = models.BooleanField(default=False, verbose_name=_("Прочитано"))

    class Meta:
        verbose_name = _("Уведомление")
        verbose_name_plural = _("Уведомления")
        db_table = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.get_notification_type_display()}] для {self.user.username}"
