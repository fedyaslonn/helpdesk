from django.core.management.base import BaseCommand

from core.kb.search import refresh_all_search_vectors


class Command(BaseCommand):
    help = "Пересобирает tsvector для всех статей базы знаний (PostgreSQL FTS)"

    def handle(self, *args, **options):
        count = refresh_all_search_vectors()
        self.stdout.write(self.style.SUCCESS(f"Обновлено search_vector для статей: {count}"))
