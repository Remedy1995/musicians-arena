from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import AuthResponseSerializer, LoginSerializer, RegisterSerializer, UserSummarySerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AuthResponseSerializer.from_user(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(tags=["Auth"], summary="Log in", request=LoginSerializer, responses=AuthResponseSerializer)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(AuthResponseSerializer.from_user(serializer.validated_data["user"]))


class MeView(APIView):
    @extend_schema(tags=["Auth"], summary="Get current authenticated user", responses=UserSummarySerializer)
    def get(self, request):
        return Response(AuthResponseSerializer.from_user(request.user)["user"])
