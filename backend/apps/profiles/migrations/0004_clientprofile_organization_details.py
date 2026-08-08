from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("profiles", "0003_userprofile_profile_image"),
    ]

    operations = [
        migrations.AddField(
            model_name="clientprofile",
            name="location",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="clientprofile",
            name="description",
            field=models.TextField(blank=True),
        ),
    ]
