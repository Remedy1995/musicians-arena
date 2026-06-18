from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    permission_classes = []
    authentication_classes = []

    @extend_schema(
        tags=["Common"],
        summary="Health check",
        responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
    )
    def get(self, request):
        return Response({"status": "ok", "service": "musicians-arena-api"})
