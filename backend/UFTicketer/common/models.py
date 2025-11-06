from django.db import models

# Create your models here.
class Users(models.Model):
    name = models.CharField(max_length=100)
    gender = models.CharField(max_length=20, blank=True, null=True)
    email = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    status = models.CharField(max_length=100, blank=True, null=True)
    introduction = models.CharField(max_length=1000, blank=True, null=True)
    picture = models.JSONField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'users'


class Offers(models.Model):
    item = models.CharField(max_length=100, blank=True, null=True)
    seller = models.ForeignKey('Users', models.DO_NOTHING, blank=True, null=True)
    buyer = models.ForeignKey('Users', models.DO_NOTHING, related_name='offers_buyer_set', blank=True, null=True)
    description = models.CharField(max_length=1000, blank=True, null=True)
    image_path = models.JSONField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    genre = models.CharField(max_length=50, blank=True, null=True)
    date = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'offers'
