from django.conf import settings
from django.http import HttpResponse
from django.utils.html import escape
from rest_framework import serializers
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from categories.models import Category
from stories.models import published_stories
from .models import SiteSettings


# ---------------------------------------------------------------
# SEO = "Search Engine Optimisation": helping Google & co. find and
# show the site properly. Three parts:
#
#   /sitemap.xml  - a list of every public page, for search engines
#   /robots.txt   - which pages search engines may look at
#   the SEO page  - site title/description + stories with problems
# ---------------------------------------------------------------

# Pages that always exist (the rest come from the database).
STATIC_PAGES = ['/', '/leaderboard', '/challenges', '/bundles', '/about', '/contact', '/guide']


def sitemap_urls():
    site = settings.SITE_URL
    urls = [(f'{site}{path}', None) for path in STATIC_PAGES]
    urls += [(f'{site}/category/{slug}', None) for slug in Category.objects.values_list('slug', flat=True)]
    # (url, last changed) - search engines use the date to decide
    # what to look at again.
    urls += [
        (f'{site}/stories/{story.id}', story.updated_at)
        for story in published_stories().only('id', 'updated_at')
    ]
    return urls


# GET /sitemap.xml  (not under /api/ - search engines expect it at the top)
def sitemap_xml(request):
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url, changed in sitemap_urls():
        lines.append('  <url>')
        # escape(): a "&" in a URL would break the XML.
        lines.append(f'    <loc>{escape(url)}</loc>')
        if changed:
            lines.append(f'    <lastmod>{changed.date().isoformat()}</lastmod>')
        lines.append('  </url>')
    lines.append('</urlset>')
    return HttpResponse('\n'.join(lines), content_type='application/xml')


# GET /robots.txt
def robots_txt(request):
    site = SiteSettings.load()
    if site.allow_indexing:
        # Everything public is fine; the private areas are not.
        rules = ['User-agent: *', 'Disallow: /dashboard', 'Disallow: /settings', 'Disallow: /messages', 'Allow: /']
    else:
        rules = ['User-agent: *', 'Disallow: /']
    rules += ['', f'Sitemap: {settings.SITE_URL}/sitemap.xml']
    return HttpResponse('\n'.join(rules) + '\n', content_type='text/plain')


# ---------------------------------------------------------------
# Story problems that hurt how they show up in search results.
# Returns a list of short sentences (empty = fine).
# ---------------------------------------------------------------
def story_problems(story, title_counts):
    problems = []
    if len(story.title) < 10:
        problems.append('Title is very short (under 10 characters)')
    if len(story.title) > 60:
        problems.append('Title is long - Google cuts it off after about 60 characters')
    if title_counts[story.title.lower()] > 1:
        problems.append('Another story has the same title')
    if not story.excerpt:
        problems.append('No excerpt (used as the description in search results)')
    if not story.cover_image and not story.cover_image_url:
        problems.append('No cover image (shared links look empty)')
    if story.category_id is None:
        problems.append('No category')
    if len(story.body.split()) < 150:
        problems.append('Very short (under 150 words)')
    return problems


class SeoSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = ['site_title', 'site_description', 'allow_indexing']


# GET   /api/dashboard/seo/  -> { settings, sitemap_count, issues: [...] }
# PATCH /api/dashboard/seo/  { site_title, site_description, allow_indexing }
class AdminSeoView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        stories = list(published_stories().select_related('author'))

        # How often each title is used (lower-case, so "Fog" = "fog").
        title_counts = {}
        for story in stories:
            key = story.title.lower()
            title_counts[key] = title_counts.get(key, 0) + 1

        issues = []
        for story in stories:
            problems = story_problems(story, title_counts)
            if problems:
                issues.append({'id': story.id, 'title': story.title, 'author': story.author.username, 'problems': problems})
        # Most problems first.
        issues.sort(key=lambda item: -len(item['problems']))

        return Response({
            'settings': SeoSettingsSerializer(SiteSettings.load()).data,
            'sitemap_count': len(sitemap_urls()),
            'story_count': len(stories),
            'issues': issues,
            # The admin page links to these to check them.
            'sitemap_url': request.build_absolute_uri('/sitemap.xml'),
            'robots_url': request.build_absolute_uri('/robots.txt'),
        })

    def patch(self, request):
        serializer = SeoSettingsSerializer(SiteSettings.load(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

