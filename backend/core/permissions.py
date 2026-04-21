from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from django.utils.translation import gettext_lazy as _


class IsAdmin(permissions.BasePermission):
    """Доступ только для администраторов"""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class IsAdminOrEngineer(permissions.BasePermission):
    """Доступ для администраторов и инженеров поддержки"""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ["admin", "engineer"]


class IsTicketOwner(permissions.BasePermission):
    """Доступ только владельцу тикета (клиенту)"""

    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id


class IsAdminOrTicketAssignee(permissions.BasePermission):
    """
    Эквивалент старого IsAdminOrAssignee.
    Разрешает: Админу ИЛИ инженеру, на которого назначен тикет.
    """

    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True

        # Проверяем, назначен ли текущий инженер на этот тикет
        if obj.assigned_engineer_id is not None and obj.assigned_engineer.user_id == request.user.id:
            return True
        return False


class CanInteractWithTicket(permissions.BasePermission):
    """
    Универсальный пермишен для доступа к тикетам, комментариям и сессиям.
    Аналог старого HasPermissionToTicketComments.
    Разрешает: Админу, Инженеру (назначенному ИЛИ в активной смене), Клиенту (автору).
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        ticket_pk = view.kwargs.get("ticket_pk") or view.kwargs.get("pk")
        if not ticket_pk:
            return False

        try:
            from .models import Ticket
            ticket = Ticket.objects.get(pk=ticket_pk)
        except Ticket.DoesNotExist:
            return False

        return self._check_access(request.user, ticket)

    def has_object_permission(self, request, view, obj):
        # Если obj - это Comment/Session, берём связанный тикет
        ticket = getattr(obj, "ticket", obj)
        return self._check_access(request.user, ticket)

    def _check_access(self, user, ticket):
        # 1. Администратор
        if user.role == "admin":
            return True

        # 2. Назначенный инженер
        if ticket.assigned_engineer_id is not None and ticket.assigned_engineer.user_id == user.id:
            return True

        # 3. Инженер в активной смене (может брать заявки, даже если ещё не назначен)
        if user.role == "engineer":
            try:
                return user.engineer_profile.is_active_on_shift
            except user.engineer_profile.RelatedObjectDoesNotExist:
                pass

        # 4. Автор заявки
        if ticket.user_id == user.id:
            return True

        return False

class IsAdminOrSelf(permissions.BasePermission):
    """
    Разрешает:
    - Админу: полный доступ ко всем профилям
    - Пользователю: доступ только к своему профилю
    """
    def has_object_permission(self, request, view, obj):
        # obj может быть User, Client или SupportEngineer
        user = getattr(obj, 'user', obj)  # Если obj - профиль, берём связанного пользователя
        return request.user.role == 'admin' or user.id == request.user.id


class IsAdminOrEngineerSelf(permissions.BasePermission):
    """
    Специфично для инженеров:
    - Админ: полный доступ
    - Инженер: только свой профиль
    - Клиенты: нет доступа
    """
    def has_object_permission(self, request, view, obj):
        user = getattr(obj, 'user', obj)
        if request.user.role == 'admin':
            return True
        if request.user.role == 'engineer' and user.id == request.user.id:
            return True
        return False


class CanManageRole(permissions.BasePermission):
    """
    Проверка прав на смену роли пользователя.
    Только админ может менять роли.
    """
    def has_permission(self, request, view):
        return request.user.role == 'admin'

