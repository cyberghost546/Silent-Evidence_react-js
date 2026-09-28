import re

from docx import Document
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


# ---------------------------------------------------------------
# IMPORT A STORY FROM WORD (.docx) - the "Import from Word" button on
# the Write page.
#
#   POST /api/stories/import-docx/   (a file called "file")
#     -> { title, body }   - NOT saved; the Write page fills its form,
#                            and the writer checks it and publishes.
#
# Word's styles become the site's own marks (utils/storyFormat.js):
#   Title / Heading 1   -> the story's title (the first one), else "## "
#   Heading 2 / 3       -> "## " / "### "
#   List Bullet         -> "- "        List Number -> "1. "
#   bold / italic runs  -> **bold** / *italic*
# Pictures, tables and colours are left out - stories are text here.
# ---------------------------------------------------------------
MAX_BYTES = 5 * 1024 * 1024


def run_text(run):
    # One "run" = a piece of text with the same look. Keep the spaces
    # OUTSIDE the marks: "** word**" wouldn't count as bold.
    text = run.text
    if not text.strip():
        return text
    lead = text[:len(text) - len(text.lstrip())]
    trail = text[len(text.rstrip()):]
    core = text.strip()
    if run.bold and run.italic:
        core = f'***{core}***'
    elif run.bold:
        core = f'**{core}**'
    elif run.italic:
        core = f'*{core}*'
    return lead + core + trail


def docx_to_story(file):
    # -> (title, body)
    document = Document(file)
    title = ''
    lines = []
    for paragraph in document.paragraphs:
        style = (paragraph.style.name if paragraph.style is not None else '').lower()
        plain = paragraph.text.strip()
        if not plain:
            continue
        if style in ('title', 'heading 1') and not title:
            title = plain
            continue
        if style.startswith('heading'):
            level = re.search(r'\d+', style)
            prefix = '### ' if level and int(level.group()) >= 3 else '## '
            lines.append(prefix + plain)
            continue
        text = ''.join(run_text(run) for run in paragraph.runs).strip()
        if 'list bullet' in style:
            lines.append('- ' + text)
        elif 'list number' in style:
            lines.append('1. ' + text)
        else:
            lines.append(text)

    # Paragraphs are separated by a blank line - but list items stay
    # together (one line each), so they form one list.
    body = ''
    for line in lines:
        is_item = line.startswith(('- ', '1. '))
        previous_item = body.rstrip('\n').split('\n')[-1].startswith(('- ', '1. ')) if body else False
        body += ('\n' if is_item and previous_item else '\n\n' if body else '') + line
    return title[:200], body.strip()


class ImportDocxView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Choose a Word file (.docx).'}, status=400)
        if not file.name.lower().endswith('.docx'):
            return Response({'detail': 'Only .docx files (Word 2007 and newer). In Word: File -> Save As -> Word Document.'}, status=400)
        if file.size > MAX_BYTES:
            return Response({'detail': 'The file must be smaller than 5 MB.'}, status=400)
        try:
            title, body = docx_to_story(file)
        except Exception:
            # A broken or disguised file: python-docx can't read it.
            return Response({'detail': 'That file could not be read as a Word document.'}, status=400)
        if not body:
            return Response({'detail': 'No text found in that file.'}, status=400)
        return Response({'title': title, 'body': body})
