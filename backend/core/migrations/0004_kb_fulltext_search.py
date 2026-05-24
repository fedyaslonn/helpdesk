from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.db import migrations


def populate_search_vectors(apps, schema_editor):
    from core.kb.search import refresh_all_search_vectors

    refresh_all_search_vectors()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_ticket_priority"),
    ]

    operations = [
        migrations.AddField(
            model_name="knowledgebasearticle",
            name="search_vector",
            field=SearchVectorField(editable=False, null=True),
        ),
        migrations.AddIndex(
            model_name="knowledgebasearticle",
            index=GinIndex(fields=["search_vector"], name="kb_article_search_gin"),
        ),
        migrations.RunPython(populate_search_vectors, migrations.RunPython.noop),
    ]
