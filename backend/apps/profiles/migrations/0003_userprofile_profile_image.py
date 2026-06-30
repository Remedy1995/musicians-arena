import apps.profiles.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0002_alter_talentmedia_options_talentmedia_file_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="profile_image",
            field=models.FileField(blank=True, upload_to=apps.profiles.models.user_profile_image_upload_to),
        ),
    ]
