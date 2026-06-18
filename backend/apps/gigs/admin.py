from django.contrib import admin

from apps.gigs.models import Gig, GigInterest, GigTalentCategory


admin.site.register(Gig)
admin.site.register(GigTalentCategory)
admin.site.register(GigInterest)
