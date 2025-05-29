from django.contrib import admin

from .models import TestExample

# Register your models here.


@admin.register(TestExample)
class TestExampleAdmin(admin.ModelAdmin):
    list_display = ["content", "date_created"]
    ordering = ["date_created"]
    search_fields = ["content"]
