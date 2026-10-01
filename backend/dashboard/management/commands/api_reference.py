import inspect
import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.urls import URLPattern, URLResolver, get_resolver


# ---------------------------------------------------------------
# python manage.py api_reference
#
# Writes docs/API-reference.md: EVERY address of the API, made from
# the code itself, so it's never out of date. Run it again after
# adding or changing a view.
#
# For each address it finds:
#   - the methods (GET, POST...) - the methods the view class has
#   - who may use it - from the view's permission_classes
#   - what it does - the # comment block written right above the
#     view class (inspect.getcomments reads it from the source file)
#
# The hand-written guide (how to log in, CSRF, errors, examples) is
# docs/API.md - this file is only the full list.
# ---------------------------------------------------------------

# permission class name -> who, in plain words
WHO = {
    'AllowAny': 'anyone',
    'IsAuthenticated': 'logged in',
    'IsAdminUser': 'admin',
    'IsAuthenticatedOrReadOnly': 'anyone reads, logged in writes',
}

METHODS = ['get', 'post', 'put', 'patch', 'delete']

# Django app -> the heading it gets in the file (and the order).
SECTIONS = {
    'accounts': 'Accounts: log in, profiles, settings, follows, notifications',
    'stories': 'Stories: reading, writing, comments, lists, series...',
    'categories': 'Categories',
    'payments': 'Payments: Pro and candles (tips)',
    'messaging': 'Private messages',
    'forums': 'Forums',
    'sitecontent': 'Site content: prompts, challenges, polls, villains...',
    'mailings': 'Emails and newsletters',
    'support': 'Help tickets',
    'contact': 'Contact form',
    'moderation': 'Reports, appeals, warnings',
    'slides': 'Homepage slideshow',
    'dashboard': 'Admin Dashboard (admins only)',
}


# Walk the whole URL tree (config/urls.py and every include()),
# giving back ('api/stories/<int:pk>/', the view) for each address.
def every_address(patterns, prefix=''):
    for pattern in patterns:
        if isinstance(pattern, URLResolver):
            yield from every_address(pattern.url_patterns, prefix + str(pattern.pattern))
        elif isinstance(pattern, URLPattern):
            yield prefix + str(pattern.pattern), pattern.callback


# The comment block above the class, as one clean paragraph.
# "# ----" lines are dropped; only the first ~400 characters are kept.
def describe(view_class):
    comments = inspect.getcomments(view_class) or ''
    lines = []
    for line in comments.splitlines():
        text = line.lstrip('#').strip()
        if not text or set(text) <= set('-='):
            continue
        lines.append(text)
    words = ' '.join(lines)
    return words if len(words) <= 400 else words[:397].rsplit(' ', 1)[0] + '...'


# ---------------------------------------------------------------
# The React side: frontend/src/api/*.js has one function per call,
# with a comment above it. We read those too, so every address can
# say WHICH function uses it (handy to copy into another project) -
# and the comment is the description when the Django view has none.
#
#   // Anyone can read them. [ { id, author, body, created_at }, ... ]
#   export function getLastWords() {
#       return getJSON('/api/last-words/')
#   }
#
# '/api/stories/${id}/' and Django's '/api/stories/{pk}/' must match,
# so both are turned into the same shape: every {..} / ${..} -> {}.
# ---------------------------------------------------------------
FUNCTION_RE = re.compile(r'((?:^//.*\n)*)^export (?:async )?function (\w+)\(.*?\n}', re.MULTILINE | re.DOTALL)
API_PATH_RE = re.compile(r"""['`](/api/[^'`?]*)""")


def same_shape(path):
    return re.sub(r'\$?\{[^}]*\}', '{}', path)


def react_functions():
    found = {}   # same_shape(path) -> [(function name, comment), ...]
    api_folder = Path(settings.BASE_DIR).parent / 'frontend' / 'src' / 'api'
    for js_file in sorted(api_folder.glob('*.js')):
        source = js_file.read_text(encoding='utf-8')
        for match in FUNCTION_RE.finditer(source):
            comment = ' '.join(line.lstrip('/').strip() for line in match.group(1).splitlines()).strip()
            for path in set(API_PATH_RE.findall(match.group(0))):
                found.setdefault(same_shape(path), []).append((match.group(2), comment))
    return found


# Last try: DRF's ready-made "generic" views always work the same
# way, so we can say what they do from the class they're built on.
def generic_description(view_class):
    serializer = getattr(view_class, 'serializer_class', None)
    fields = ''
    if serializer is not None and hasattr(serializer, 'Meta') and isinstance(getattr(serializer.Meta, 'fields', None), (list, tuple)):
        fields = ' Fields: ' + ', '.join(serializer.Meta.fields) + '.'
    names = [base.__name__ for base in view_class.__mro__]
    if 'ListCreateAPIView' in names:
        return 'GET = the list; POST = add a new one.' + fields
    if 'RetrieveUpdateDestroyAPIView' in names:
        return 'One item: GET = read it, PATCH = change some fields, PUT = replace it, DELETE = remove it.' + fields
    if 'DestroyAPIView' in names:
        return 'DELETE = remove this one.'
    return ''


def who_may(view_class):
    permissions = getattr(view_class, 'permission_classes', None)
    if not permissions:
        return 'anyone'
    return ', '.join(WHO.get(p.__name__, p.__name__) for p in permissions)


class Command(BaseCommand):
    help = 'Write docs/API-reference.md - every API address, from the code.'

    def handle(self, *args, **options):
        rows = {}   # app -> list of rows
        react = react_functions()
        for path, callback in every_address(get_resolver().url_patterns):
            # Only the API (not /admin/, /media/, the sitemap...).
            if not path.startswith('api/'):
                continue
            # DRF views have .cls - the class the view came from.
            view_class = getattr(callback, 'cls', None)
            if view_class is None:
                continue
            app = view_class.__module__.split('.')[0]
            methods = [m.upper() for m in METHODS if hasattr(view_class, m)]
            # Django's <int:pk> -> {pk}, easier to read in a table.
            nice_path = '/' + re.sub(r'<(?:\w+:)?(\w+)>', r'{\1}', path)

            # The React functions that call this address, and the best
            # description: Django's comment first, React's if there's none.
            callers = react.get(same_shape(nice_path), [])
            what = describe(view_class)
            if not what:
                what = ' '.join(comment for _, comment in callers if comment)[:400]
            if not what:
                what = generic_description(view_class)
            rows.setdefault(app, []).append({
                'path': nice_path,
                'methods': ' '.join(methods),
                'who': who_may(view_class),
                'view': f'{view_class.__module__}.{view_class.__name__}',
                'react': ', '.join(sorted({f'`{name}()`' for name, _ in callers})) or '-',
                'what': what.replace('|', '\\|'),
            })

        out = [
            '# API reference (every address)',
            '',
            'Made by `python manage.py api_reference` from the code - **do not edit by hand**,',
            'run the command again instead. How to USE the API (logging in, CSRF, errors,',
            'examples) is in [API.md](API.md).',
            '',
            '`{pk}`, `{username}`... = a value you put in the address, e.g. `/api/stories/5/`.',
            '"Who" comes from each view\'s `permission_classes`; some views check more inside',
            '(e.g. "only your own story") - see the description.',
            '',
        ]
        total = 0
        ordered_apps = list(SECTIONS) + sorted(set(rows) - set(SECTIONS))
        for app in ordered_apps:
            if app not in rows:
                continue
            out += [f'## {SECTIONS.get(app, app)}', '', '| Address | Methods | Who | React function | What it does |', '| --- | --- | --- | --- | --- |']
            for row in sorted(rows[app], key=lambda r: r['path']):
                what = row['what'] or f"(no comment yet - see `{row['view']}`)"
                out.append(f"| `{row['path']}` | {row['methods']} | {row['who']} | {row['react']} | {what} |")
                total += 1
            out.append('')

        target = Path(settings.BASE_DIR).parent / 'docs' / 'API-reference.md'
        target.parent.mkdir(exist_ok=True)
        target.write_text('\n'.join(out), encoding='utf-8')
        self.stdout.write(f'Wrote {total} addresses to {target}')
