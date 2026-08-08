from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("gigs", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="giginterest",
            name="initiated_by",
            field=models.CharField(
                choices=[("talent", "Talent"), ("organizer", "Organizer")],
                default="talent",
                max_length=16,
            ),
        ),
        migrations.AlterField(
            model_name="giginterest",
            name="status",
            field=models.CharField(
                choices=[
                    ("interested", "Interested"),
                    ("shortlisted", "Shortlisted"),
                    ("invited", "Invited"),
                    ("invite_accepted", "Invitation Accepted"),
                    ("declined", "Declined"),
                ],
                default="interested",
                max_length=20,
            ),
        ),
    ]
