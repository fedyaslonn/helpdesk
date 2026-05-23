from django.core.management.base import BaseCommand

from core.kb.elasticsearch_client import reindex_all_kb_articles


class Command(BaseCommand):
    help = "Переиндексирует все статьи базы знаний в Elasticsearch"

    def handle(self, *args, **options):
        count = reindex_all_kb_articles()
        self.stdout.write(self.style.SUCCESS(f"Проиндексировано статей: {count}"))
