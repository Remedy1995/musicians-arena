import uuid

from django.db import migrations, models


def seed_capabilities(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    UserCapability = apps.get_model("accounts", "UserCapability")

    for user in User.objects.exclude(role="admin").iterator():
        capability = "talent" if user.role == "talent" else "organizer"
        UserCapability.objects.get_or_create(user_id=user.id, capability=capability)


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserCapability",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("capability", models.CharField(choices=[("talent", "Talent"), ("organizer", "Organizer")], max_length=24)),
                ("user", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="capability_assignments", to="accounts.user")),
            ],
            options={
                "constraints": [models.UniqueConstraint(fields=("user", "capability"), name="unique_user_capability")],
                "indexes": [models.Index(fields=["user", "capability"], name="accounts_us_user_id_04a62c_idx")],
            },
        ),
        migrations.RunPython(seed_capabilities, migrations.RunPython.noop),
    ]
