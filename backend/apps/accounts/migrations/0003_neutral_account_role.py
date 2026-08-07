from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_usercapability"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("account", "Account"),
                    ("client", "Client"),
                    ("talent", "Talent"),
                    ("admin", "Admin"),
                ],
                default="account",
                max_length=20,
            ),
        ),
    ]
