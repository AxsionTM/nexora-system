from django.contrib import admin

admin.site.site_header = "NEXORA"
admin.site.site_title = "NEXORA"
admin.site.index_title = "Панель управления"
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.core.urls")),
    path("api/auth/", include("apps.users.urls")),
    path("api/", include("apps.business.urls")),
]
