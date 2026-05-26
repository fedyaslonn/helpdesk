import os
import django
from datetime import time

# Укажи правильный путь к settings, если он отличается
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'helpdesk.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from core.models import (
    Client, SupportEngineer, Priority, Category, 
    SLAParameter, Ticket, ShiftSchedule, KnowledgeBaseArticle,
    ResolutionResult
)

User = get_user_model()

def clear_db():
    print("Очистка старых данных...")
    Ticket.objects.all().delete()
    KnowledgeBaseArticle.objects.all().delete()
    SLAParameter.objects.all().delete()
    Category.objects.all().delete()
    Priority.objects.all().delete()
    User.objects.exclude(is_superuser=True).delete()

def seed():
    clear_db()
    now = timezone.localtime(timezone.now())
    
    print("Создаем администратора...")
    admin_user, _ = User.objects.get_or_create(
        username="admin_boss",
        defaults={"role": User.Role.ADMIN, "email": "admin@gmail.com", "full_name": "Босс Админов", "is_verified": True}
    )
    admin_user.set_password("admin123")
    admin_user.save()

    # --- ИНЖЕНЕРЫ И ИХ СМЕНЫ ---
    print("Создаем 5 инженеров и их расписание на сегодня...")
    engineers_data = [
        # Логин, ФИО, Email, Макс. тикетов, На дежурстве, Начало смены, Конец смены
        ("eng_petrov", "Петр Петров", "petrov@gmail.com", 5, True, time(8, 0), time(20, 0)),
        ("eng_sidorov", "Сидор Сидоров", "sidorov@gmail.com", 3, False, time(20, 0), time(8, 0)),
        ("eng_smirnov", "Алексей Смирнов", "smirnov@gmail.com", 4, True, time(9, 0), time(18, 0)),
        ("eng_volkov", "Илья Волков", "volkov@gmail.com", 5, True, time(10, 0), time(19, 0)),
        ("eng_zaitsev", "Николай Зайцев", "zaitsev@gmail.com", 3, False, time(12, 0), time(20, 0)),
    ]
    
    eng_dict = {}
    for username, full_name, email, max_t, is_duty, start_t, end_t in engineers_data:
        # 1. Создаем базового юзера
        u, _ = User.objects.get_or_create(
            username=username, 
            defaults={"role": User.Role.ENGINEER, "email": email, "full_name": full_name, "is_verified": True}
        )
        u.set_password("eng123")
        u.save()
        
        # 2. Создаем профиль инженера
        eng, _ = SupportEngineer.objects.get_or_create(
            user=u, defaults={"max_concurrent_tickets": max_t, "is_on_duty": is_duty}
        )
        eng_dict[username] = eng
        
        # 3. Создаем смену на сегодня
        ShiftSchedule.objects.get_or_create(
            engineer=eng,
            shift_date=now.date(),
            defaults={"shift_start": start_t, "shift_end": end_t, "is_active": True}
        )

    # --- КЛИЕНТЫ ---
    print("Создаем 5 клиентов...")
    clients_data = [
        # Логин, ФИО, Email, ID учетки, Должность
        ("client_ivanov", "Иван Иванов", "ivanov@gmail.com", "ACC-001", "Бухгалтер"),
        ("client_smirnova", "Анна Смирнова", "smirnova@gmail.com", "ACC-002", "Менеджер"),
        ("client_kuznetsov", "Сергей Кузнецов", "kuznetsov@gmail.com", "ACC-003", "Директор"),
        ("client_popova", "Мария Попова", "popova@gmail.com", "ACC-004", "HR-специалист"),
        ("client_sokolov", "Алексей Соколов", "sokolov@gmail.com", "ACC-005", "Маркетолог"),
    ]
    
    client_dict = {}
    for username, full_name, email, acc_id, pos in clients_data:
        u, _ = User.objects.get_or_create(
            username=username, 
            defaults={"role": User.Role.CLIENT, "email": email, "full_name": full_name, "is_verified": True}
        )
        u.set_password("client123")
        u.save()
        
        Client.objects.get_or_create(
            user=u, defaults={"account_id": acc_id, "position": pos}
        )
        client_dict[username] = u

    # --- СПРАВОЧНИКИ И БЗ ---
    print("Создаем приоритеты...")
    low, _ = Priority.objects.get_or_create(name="Низкий", defaults={"level": 1})
    med, _ = Priority.objects.get_or_create(name="Средний", defaults={"level": 2})
    high, _ = Priority.objects.get_or_create(name="Высокий", defaults={"level": 3})
    crit, _ = Priority.objects.get_or_create(name="Критический", defaults={"level": 4})

    print("Создаем категории...")
    hw, _ = Category.objects.get_or_create(name="Оборудование", defaults={"description": "Принтеры, мышки, мониторы", "default_priority": low})
    access, _ = Category.objects.get_or_create(name="Доступы", defaults={"description": "Пароли, VPN, Учетки", "default_priority": med})
    net, _ = Category.objects.get_or_create(name="Сеть", defaults={"description": "Интернет, Wi-Fi, свитчи", "default_priority": crit})

    print("Создаем параметры SLA...")
    SLAParameter.objects.get_or_create(priority=low, category=hw, defaults={"response_time_min": 120, "resolution_time_min": 1440})
    SLAParameter.objects.get_or_create(priority=med, category=access, defaults={"response_time_min": 30, "resolution_time_min": 240})
    SLAParameter.objects.get_or_create(priority=crit, category=net, defaults={"response_time_min": 15, "resolution_time_min": 60})

    print("Создаем статьи Базы Знаний...")
    KnowledgeBaseArticle.objects.get_or_create(
        title="Что делать, если принтер печатает полосами",
        defaults={
            "content": "Выньте картридж и аккуратно встряхните его 3-4 раза по горизонтали. Если не помогло, создайте заявку.",
            "category": hw, "tags": "принтер, картридж, печать", "author": admin_user, "is_published": True, "view_count": 145, "helpful_count": 42
        }
    )
    KnowledgeBaseArticle.objects.get_or_create(
        title="Настройка VPN для Windows",
        defaults={
            "content": "Скачайте клиент OpenVPN. Запросите файл профиля у администратора. Импортируйте профиль и введите логин/пароль от компа.",
            "category": access, "tags": "vpn, удаленка, сеть", "author": eng_dict["eng_petrov"].user, "is_published": True, "view_count": 89, "helpful_count": 12
        }
    )

    # --- ЗАЯВКИ ---
    print("Создаем заявки (Tickets)...")
    
    Ticket.objects.get_or_create(
        description="Закончился картридж на 3 этаже в бухгалтерии. Принтер HP LaserJet.",
        user=client_dict["client_ivanov"],
        defaults={"category": hw, "status": Ticket.Status.OPEN}
    )

    Ticket.objects.get_or_create(
        description="Не могу зайти в 1С. Пишет Неверный пароль, хотя вчера всё работало!",
        user=client_dict["client_smirnova"],
        defaults={"category": access, "priority": high, "status": Ticket.Status.IN_PROGRESS, "assigned_engineer": eng_dict["eng_petrov"]}
    )

    Ticket.objects.get_or_create(
        description="Упал интернет во всем офисе! Срочно!",
        user=admin_user, 
        defaults={"category": net, "priority": crit, "status": Ticket.Status.WAITING, "assigned_engineer": eng_dict["eng_smirnov"]}
    )

    t4, _ = Ticket.objects.get_or_create(
        description="Сломалась мышка, не крутится колесико.",
        user=client_dict["client_popova"],
        defaults={"category": hw, "status": Ticket.Status.RESOLVED, "assigned_engineer": eng_dict["eng_volkov"]}
    )
    ResolutionResult.objects.get_or_create(
        ticket=t4,
        defaults={"resolution_type": ResolutionResult.ResolutionType.FIXED, "solution_description": "Выдана новая мышь со склада.", "is_sla_met": True}
    )

    print("Построение tsvector для статей БЗ...")
    try:
        from core.kb.search import refresh_all_search_vectors

        indexed = refresh_all_search_vectors()
        print(f"Обновлено search_vector для статей: {indexed}")
    except Exception as e:
        print(f"Предупреждение: не удалось построить search_vector: {e}")

    print("\n✅ Готово! База успешно заполнена массивом данных.")
    print("--- ДОСТУПЫ ---")
    print("Пароли для всех клиентов: client123")
    print("Пароли для всех инженеров: eng123")
    print("Пароль админа: admin123")

if __name__ == '__main__':
    seed()
    