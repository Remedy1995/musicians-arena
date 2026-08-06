from django.urls import path

from apps.accounts.views import AddCapabilityView, LoginView, MeView, RegisterView


urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("me/", MeView.as_view(), name="me"),
    path("capabilities/", AddCapabilityView.as_view(), name="add-capability"),
]
