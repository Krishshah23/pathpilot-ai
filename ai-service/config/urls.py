from django.urls import include, path

# Admin is intentionally omitted — this service is a headless ML API called by
# the Node backend only.
urlpatterns = [
    path('api/', include('ml.urls')),
]
