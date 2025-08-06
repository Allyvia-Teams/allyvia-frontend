from drf_yasg import openapi
from rest_framework import status
from rest_framework.response import Response


PARAM_ROLE_HEADER = [
	openapi.Parameter(
		'X-Role-ID',
		openapi.IN_HEADER,
		description="Role ID of the user in the company",
		type=openapi.TYPE_STRING,
		format=openapi.FORMAT_UUID,
		required=True
	),
]


def check_role_is_missing(request):
	# Check if role header is present
	if not hasattr(request, 'current_role') or not request.current_role:
		return Response(
			{"error": "X-Role-ID header is required"},
			status=status.HTTP_400_BAD_REQUEST
		)
	return None
