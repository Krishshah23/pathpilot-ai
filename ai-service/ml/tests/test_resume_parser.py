"""
Regression test for project segmentation in resume parser.
Run this from the `ai-service` folder.
"""
from ml.services.resume_parser import parse_resume
import sys

sample = """
Projects
Project One
python, flask
- developed a feature that handles auth
continued description line that wrapped
- improved latency by 30%
Project Two
js | react
- built interactive UI
"""

res = parse_resume(sample)
projects = res.get('projects', [])
print('Parsed projects:', projects)

# Expect at least two projects
if len(projects) < 2:
    print('ERROR: Expected at least 2 projects, got', len(projects))
    sys.exit(2)

# The first project's description should include the wrapped continuation line
first_desc = projects[0].get('description', '')
if 'continued description line' not in first_desc:
    print('ERROR: Wrapped line not merged into first project description')
    sys.exit(3)

print('Project segmentation test passed')
sys.exit(0)
