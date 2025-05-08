from django.db import models

# Create your models here.

class TestExample(models.Model):
    content =  models.CharField(max_length=128)
    date_created = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'test_example'

    def __str__(self):
        return self.content
