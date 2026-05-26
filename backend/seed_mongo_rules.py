from datetime import datetime
# Подтягиваем не только upsert_rule, но и _collection для поиска существующих записей
from core.ai.mongo_rules import upsert_rule, _collection

def seed_mongo_rules():
    print("Начинаем загрузку правил авто-классификации в MongoDB...")

    rules_data = [
        # --- КРИТИЧЕСКИЕ ---
        {"phrase": "упал сервер", "priority_name": "Критический", "resolution_minutes": 60, "weight": 1000, "enabled": True},
        {"phrase": "нет интернета", "priority_name": "Критический", "resolution_minutes": 60, "weight": 900, "enabled": True},
        {"phrase": "массовый сбой", "priority_name": "Критический", "resolution_minutes": 60, "weight": 900, "enabled": True},

        # --- ВЫСОКИЙ ---
        {"phrase": "не могу войти", "priority_name": "Высокий", "resolution_minutes": 240, "weight": 800, "enabled": True},
        {"phrase": "ошибка 1с", "priority_name": "Высокий", "resolution_minutes": 240, "weight": 750, "enabled": True},
        {"phrase": "забыл пароль", "priority_name": "Высокий", "resolution_minutes": 240, "weight": 700, "enabled": True},

        # --- СРЕДНИЙ ---
        {"phrase": "синий экран", "priority_name": "Средний", "resolution_minutes": 480, "weight": 500, "enabled": True},
        {"phrase": "не печатает", "priority_name": "Средний", "resolution_minutes": 480, "weight": 400, "enabled": True},
        {"phrase": "выдать доступ", "priority_name": "Средний", "resolution_minutes": 480, "weight": 350, "enabled": True},

        # --- НИЗКИЙ ---
        {"phrase": "картридж", "priority_name": "Низкий", "resolution_minutes": 1440, "weight": 100, "enabled": True},
        {"phrase": "мышка", "priority_name": "Низкий", "resolution_minutes": 1440, "weight": 50, "enabled": True},
        {"phrase": "клавиатура", "priority_name": "Низкий", "resolution_minutes": 1440, "weight": 50, "enabled": True},
        {"phrase": "инструкция", "priority_name": "Низкий", "resolution_minutes": 1440, "weight": 10, "enabled": True}
    ]

    inserted_count = 0
    updated_count = 0
    now = datetime.utcnow()
    
    # Получаем доступ к коллекции MongoDB
    coll = _collection()

    for rule in rules_data:
        rule["created_at"] = now
        
        # 🔥 НАСТОЯЩИЙ UPSERT: Ищем правило по фразе
        existing_rule = coll.find_one({"phrase": rule["phrase"]})
        
        if existing_rule:
            # Если нашли, подкидываем _id, чтобы upsert_rule сделал обновление
            rule["_id"] = existing_rule["_id"]
            action = "Обновлено"
        else:
            action = "Создано"

        try:
            result = upsert_rule(rule)
            print(f"✅ {action}: '{result['phrase']}' (Вес: {result['weight']})")
            
            if action == "Создано":
                inserted_count += 1
            else:
                updated_count += 1
                
        except Exception as e:
            print(f"❌ Ошибка при обработке '{rule['phrase']}': {e}")

    print(f"\nГотово! Создано новых: {inserted_count}, Обновлено существующих: {updated_count}.")

if __name__ == "__main__":
    seed_mongo_rules()
    