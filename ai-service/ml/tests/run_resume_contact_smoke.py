from ml.services.resume_parser import parse_resume

text = '''
John Doe
Email: john@example.com
Phone: +91 99999 88888
LinkedIn: https://www.linkedin.com/in/johndoe
GitHub: github.com/johndoe
'''

res = parse_resume(text, links=['https://www.linkedin.com/in/johndoe', 'https://github.com/johndoe'])
print('contact:', res['contact'])

# Test label-only
text2 = 'Jane Doe\nLinkedIn\nGitHub\nEmail: jane@example.com'
res2 = parse_resume(text2, links=[])
print('contact2:', res2['contact'])
