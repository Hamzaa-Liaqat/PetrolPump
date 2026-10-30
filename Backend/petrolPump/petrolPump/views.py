from django.db import connection
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request):
    """Frontend ko batata hai ke server aur database zinda hain. Koi tafseel/raaz nahi deta."""
    try:
        connection.ensure_connection()
        database = 'ok'
    except Exception:
        database = 'error'
    return Response({'status': 'ok', 'database': database})