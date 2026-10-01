"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

from dashboard.seo_views import sitemap_xml, robots_txt

urlpatterns = [
    path('admin/', admin.site.urls),
    # For search engines - at the top level, where they look for them.
    path('sitemap.xml', sitemap_xml),
    path('robots.txt', robots_txt),
    path('api/', include('categories.urls')),
    path('api/', include('slides.urls')),
    path('api/accounts/', include('accounts.urls')),
    path('api/', include('dashboard.urls')),
    path('api/', include('stories.urls')),
    path('api/', include('contact.urls')),
    path('api/messages/', include('messaging.urls')),
    path('api/', include('moderation.urls')),
    path('api/', include('sitecontent.urls')),
    path('api/', include('support.urls')),
    path('api/', include('mailings.urls')),
    path('api/', include('forums.urls')),
    path('api/', include('payments.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# static() above only works while DEBUG is on. On the live site the
# uploaded pictures are sent by this instead (see SERVE_MEDIA in
# settings.py).
if not settings.DEBUG and settings.SERVE_MEDIA:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    ]
