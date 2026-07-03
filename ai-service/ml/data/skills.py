"""
Canonical skills dictionary used for extraction and (later) gap analysis.

Each entry maps a canonical skill name to the aliases/spellings that should be
recognized in resume text. Matching is case-insensitive and word-boundary aware.
Keeping this centralized means the resume parser and the Phase-4 gap analyzer
share one source of truth.
"""

# canonical -> list of aliases (the canonical name is always matched too)
SKILL_ALIASES = {
    # Languages
    'Python': ['python'],
    'JavaScript': ['javascript', 'js', 'es6'],
    'TypeScript': ['typescript', 'ts'],
    'Java': ['java'],
    'C++': ['c++', 'cpp'],
    'C': [r'\bc\b'],
    'C#': ['c#', 'csharp'],
    'Go': ['golang', r'\bgo\b'],
    'Rust': ['rust'],
    'PHP': ['php'],
    'Ruby': ['ruby'],
    'Swift': ['swift'],
    'Kotlin': ['kotlin'],
    'R': [r'\br\b'],
    'SQL': ['sql'],
    'HTML': ['html', 'html5'],
    'CSS': ['css', 'css3'],
    # Frontend
    'React': ['react', 'react.js', 'reactjs'],
    'Next.js': ['next.js', 'nextjs'],
    'Vue': ['vue', 'vue.js', 'vuejs'],
    'Angular': ['angular'],
    'Redux': ['redux'],
    'Tailwind CSS': ['tailwind'],
    'Bootstrap': ['bootstrap'],
    'jQuery': ['jquery'],
    'Sass': ['sass', 'scss'],
    # Backend
    'Node.js': ['node.js', 'nodejs', 'node'],
    'Express': ['express', 'express.js', 'expressjs'],
    'Django': ['django'],
    'Flask': ['flask'],
    'FastAPI': ['fastapi'],
    'Spring Boot': ['spring boot', 'spring'],
    'GraphQL': ['graphql'],
    'REST APIs': ['rest api', 'rest apis', 'restful', 'rest'],
    # Databases
    'MongoDB': ['mongodb', 'mongo'],
    'PostgreSQL': ['postgresql', 'postgres'],
    'MySQL': ['mysql'],
    'Redis': ['redis'],
    'SQLite': ['sqlite'],
    'Firebase': ['firebase'],
    'Oracle': ['oracle'],
    # DevOps / Cloud
    'Docker': ['docker'],
    'Kubernetes': ['kubernetes', 'k8s'],
    'AWS': ['aws', 'amazon web services'],
    'Azure': ['azure'],
    'GCP': ['gcp', 'google cloud'],
    'CI/CD': ['ci/cd', 'cicd'],
    'Jenkins': ['jenkins'],
    'Terraform': ['terraform'],
    'Linux': ['linux', 'unix'],
    'Nginx': ['nginx'],
    # Data / ML
    'Pandas': ['pandas'],
    'NumPy': ['numpy'],
    'scikit-learn': ['scikit-learn', 'sklearn', 'scikit learn'],
    'TensorFlow': ['tensorflow'],
    'PyTorch': ['pytorch'],
    'Machine Learning': ['machine learning', r'\bml\b'],
    'Deep Learning': ['deep learning'],
    'Data Analysis': ['data analysis', 'data analytics'],
    'Matplotlib': ['matplotlib'],
    'Power BI': ['power bi', 'powerbi'],
    'Tableau': ['tableau'],
    'Excel': ['excel'],
    'NLP': ['nlp', 'natural language processing'],
    # Tools / Concepts
    'Git': ['git'],
    'GitHub': ['github'],
    'GitLab': ['gitlab'],
    'Data Structures': ['data structures', 'dsa'],
    'Algorithms': ['algorithms'],
    'OOP': ['oop', 'object oriented', 'object-oriented'],
    'Agile': ['agile', 'scrum'],
    'Jira': ['jira'],
    'Figma': ['figma'],
    'Postman': ['postman'],
    'Microservices': ['microservices'],
    'System Design': ['system design'],
    'WebSockets': ['websocket', 'websockets', 'socket.io'],
}

# Flat set of all canonical skill names.
ALL_SKILLS = list(SKILL_ALIASES.keys())
