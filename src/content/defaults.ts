import { contentSchema, defaultOpportunities, type Content } from './schema';
const projectBase = {
  image: '',
  githubUrl: '',
  liveUrl: '',
  caseStudyUrl: '',
  status: 'published' as const,
  context: '',
  year: '',
  featured: false,
  workflow: [],
  outcomes: [],
};
const groups: [string, string[]][] = [
  ['Programming', ['Java', 'Python', 'SQL', 'PL/SQL', 'JavaScript', 'OOP', 'DBMS']],
  [
    'Backend & frontend',
    [
      'Spring Boot',
      'FastAPI',
      'REST APIs',
      'JPA',
      'Hibernate',
      'API design',
      'Node.js',
      'React',
      'HTML',
      'CSS',
    ],
  ],
  [
    'Data engineering',
    [
      'Databricks',
      'PySpark',
      'Spark SQL',
      'Delta Lake',
      'ETL / ELT',
      'Medallion Architecture',
      'Data cleaning',
      'Data transformation',
    ],
  ],
  [
    'Databases & analytics',
    [
      'PostgreSQL',
      'SQL joins',
      'CTEs',
      'Window functions',
      'Data modeling',
      'Fact & dimension tables',
      'KPI development',
      'Power BI',
      'Excel',
    ],
  ],
  [
    'AI & machine learning',
    [
      'PyTorch',
      'Scikit-learn',
      'TensorFlow',
      'Transformers',
      'LLMs',
      'RAG',
      'Prompt engineering',
      'Fine-tuning',
      'Model evaluation',
      'TF-IDF',
      'FAISS',
      'Pinecone',
      'Sentence Transformers',
      'Semantic similarity',
      'Text classification',
    ],
  ],
  [
    'Cloud & tools',
    [
      'AWS S3',
      'AWS RDS',
      'AWS EC2',
      'AWS Cognito',
      'Docker',
      'Git',
      'GitHub',
      'Postman',
      'VS Code',
      'Firebase',
      'Cursor',
      'Codex',
      'Copilot',
      'Claude',
    ],
  ],
];
export const defaults: Content = contentSchema.parse({
  profile: {
    name: 'Rahul Reji R.',
    headline: 'Software, with intention.',
    introduction:
      'A Computer Science and Business Systems graduate building projects with Java, Python and SQL across backend engineering, data and applied AI.',
    about:
      'I turn complex information into useful software. My projects span e-commerce analytics, AI-assisted complaint workflows and retrieval systems for insurance documents.\n\nWorking with Java, Python and SQL, I focus on how data moves through a system: from ingestion and validation to dependable APIs and clear, useful outputs. My research explores multi-stage attack detection in AI agents.',
    location: 'Chennai, Tamil Nadu, India',
    email: '',
    phone: '',
    opportunities: defaultOpportunities,
    githubUrl: '',
    linkedinUrl: '',
    image: '/assets/rahul-portrait.webp',
    education: [
      {
        id: 'srm',
        school: 'SRM Institute of Science and Technology',
        degree: 'B.Tech. Computer Science and Business Systems',
        period: '2022–2026',
        detail: 'CGPA 8.6 / 10 · Chennai',
      },
      {
        id: 'chinmaya',
        school: 'Chinmaya Vidyalaya Senior Secondary School',
        degree: 'Higher Secondary (CBSE)',
        period: '2021–2022',
        detail: 'Chennai',
      },
    ],
  },
  projects: [
    {
      ...projectBase,
      id: 'soho-suite',
      slug: 'soho-suite',
      title: 'Soho Suite',
      subtitle: 'E-commerce analytics for small businesses',
      category: 'Data engineering',
      visual: 'data',
      featured: true,
      order: 0,
      year: '2026–Present',
      liveUrl: 'https://soho-suite.pages.dev/',
      description:
        'E-commerce analytics for sales, customers and products, with over 1.5 million rows processed through a Bronze–Silver–Gold workflow. The Spring Boot backend is in development.',
      overview:
        'Soho Suite combines e-commerce data processing, KPI datasets and application services to help small businesses understand sales, customers, products and operational trends.',
      problem:
        'Customer, order, payment, product, seller, review and geographical datasets need consistent schemas and meaningful relationships before they can support business analysis.',
      approach:
        'Separate raw ingestion, data cleaning and analytics-ready outputs with a Medallion Architecture. Model the relationships between datasets, then prepare KPIs for revenue, orders, Average Order Value and regional trends.',
      implementation:
        'The Databricks workflow uses PySpark and Spark SQL with Delta Lake. Processing includes schema validation, datatype correction, null handling, deduplication, joins and aggregations. Java, Spring Boot and PostgreSQL backend functionality is in development, using controller, service and repository layers.',
      technologies: [
        'Databricks',
        'PySpark',
        'Spark SQL',
        'Delta Lake',
        'Java',
        'Spring Boot',
        'PostgreSQL',
      ],
      workflow: ['Raw datasets', 'Bronze', 'Silver', 'Gold', 'Business KPIs'],
      outcomes: [
        {
          value: '1.5M+',
          label: 'Rows processed',
          context: 'Across interconnected e-commerce datasets, as reported in the supplied résumé.',
        },
        {
          value: 'Bronze → Silver → Gold',
          label: 'Data workflow',
          context: 'Separate raw, cleaned and analytics-ready layers.',
        },
      ],
    },
    {
      ...projectBase,
      id: 'campusvoice',
      slug: 'campusvoice',
      title: 'CampusVoice',
      subtitle: 'AI-assisted student complaint management',
      category: 'Applied AI',
      visual: 'classification',
      featured: true,
      order: 1,
      year: '2026',
      description:
        'Classifies and routes student complaints across 14 categories using RoBERTa, structured metadata and semantic duplicate detection.',
      overview:
        'CampusVoice uses complaint text and structured information to support automated classification, routing and duplicate detection across 14 complaint categories.',
      problem:
        'Complaint handling needs to account for both what a student says and contextual signals such as urgency, deadlines and attachments. Duplicate submissions also complicate review.',
      approach:
        'Combine 768-dimensional text embeddings with 40 metadata features. Evaluate a RoBERTa classifier and use sentence-transformer embeddings, with TF-IDF fallback, for semantic duplicate detection.',
      implementation:
        'FastAPI supports submission, routing and administrative workflows. AWS RDS stores structured data, Amazon S3 stores attachments and Amazon Cognito handles authentication in the project. The supplied résumé also describes Docker containerization.',
      technologies: ['Python', 'RoBERTa', 'FastAPI', 'Sentence Transformers', 'AWS', 'Docker'],
      workflow: ['Complaint + metadata', 'RoBERTa', '14 categories', 'Routing'],
      outcomes: [
        {
          value: '90.01%',
          label: 'Classification accuracy',
          context: 'Latest résumé-reported evaluation; macro F1: 90.31%.',
        },
        {
          value: '7,710',
          label: 'Complaint records',
          context: 'Across 14 categories in the described dataset.',
        },
        {
          value: '100%',
          label: 'Precision@1',
          context: 'Duplicate detection evaluation on 40 mined duplicate pairs.',
        },
      ],
    },
    {
      ...projectBase,
      id: 'claimwise',
      slug: 'claimwise',
      title: 'Claimwise',
      subtitle: 'LLM-powered insurance document retrieval',
      category: 'AI systems',
      visual: 'retrieval',
      featured: true,
      order: 2,
      context: 'HackRx 6.0 project',
      description:
        'Searches insurance policy documents through a dual-LLM retrieval pipeline, with semantic vector search, automated ingestion and pluggable providers behind FastAPI.',
      overview:
        'Claimwise brings semantic retrieval and LLM generation together for insurance document queries. The supplied résumé describes this project in the context of HackRx 6.0, Bajaj Finserv.',
      problem:
        'Insurance policy corpora need scalable document ingestion and relevant retrieval. Switching LLM providers should not require replacing the entire application.',
      approach:
        'Automate chunking, embedding generation and index updates. Retrieve relevant material with FAISS and Pinecone, and use a provider-independent backend to support different language models.',
      implementation:
        'A FastAPI backend offers pluggable LLM providers, retrieval-quality scoring and A/B experimentation support. A React frontend presents the product. The workflow scales retrieval across multi-provider corpora.',
      technologies: ['Python', 'FastAPI', 'React', 'LLMs', 'RAG', 'FAISS', 'Pinecone'],
      workflow: ['Policy documents', 'Embeddings', 'Vector retrieval', 'Dual LLM', 'Answer'],
      outcomes: [
        {
          value: '+35%',
          label: 'Retrieval accuracy',
          context: 'Improvement reported in the résumé; evaluation baseline not supplied.',
        },
        {
          value: '−40%',
          label: 'Query response time',
          context: 'Reduction reported in the résumé; evaluation baseline not supplied.',
        },
        {
          value: '<2 hours',
          label: 'Provider migration',
          context: 'Résumé-reported migration time with a pluggable backend.',
        },
      ],
    },
  ],
  skills: groups.map(([category, items], index) => ({
    id: `group-${index}`,
    category,
    items: items.map((name, i) => ({ id: `skill-${index}-${i}`, name })),
  })),
  research: [
    {
      id: 'chronosguard',
      title:
        'ChronosGuard: Hidden Markov State Approach for Multi-Stage Attack Detection in AI Agents',
      description:
        'Detecting adversarial behavior across multi-turn AI-agent conversations by combining transformer classification with temporal threat-state modeling.',
      date: '2025',
      publication: 'Conference research',
      status: 'published',
      order: 0,
      link: '',
      technologies: [
        'ModernBERT',
        'Hidden Semi-Markov Model',
        'AI agent security',
        'Sequence modeling',
      ],
      details:
        'Fine-tuned ModernBERT (149M parameters) on 8,000 multi-turn AI-agent conversation samples for four-class adversarial threat-state classification. A Hidden Semi-Markov Model improves conversation-level attack detection from 98.33% to 98.50% and recall from 97.62% to 97.88%. Per-turn accuracy is 92.68%, with 0.92 macro F1. Results are reported in the supplied résumé; a conference name and publication URL were not supplied.',
      outcomes: [
        {
          value: '98.50%',
          label: 'Conversation-level detection',
          context: 'Résumé-reported evaluation, up from 98.33%.',
        },
        {
          value: '92.68%',
          label: 'Per-turn accuracy',
          context: 'Résumé-reported evaluation; macro F1: 0.92.',
        },
      ],
    },
  ],
  settings: {
    seoTitle: 'Rahul Reji R. | Software, data & applied AI',
    seoDescription:
      'Explore Rahul Reji R.’s work in backend engineering, data-driven products and applied AI, including Soho Suite, CampusVoice and Claimwise.',
    siteUrl: '',
    resumeUrl: '',
    contactHeading: 'Good software starts with a conversation.',
    contactIntro:
      'Explore the work, get in touch, or start a conversation about software, data and applied AI.',
    footerNote: 'Thoughtful software. Practical engineering.',
  },
});
export const newProject = (): import('./schema').Project => ({
  ...projectBase,
  id: crypto.randomUUID(),
  slug: `project-${crypto.randomUUID().slice(0, 8)}`,
  title: 'Untitled project',
  subtitle: '',
  description: 'Add a concise project description.',
  overview: '',
  problem: '',
  approach: '',
  implementation: '',
  category: 'Software',
  visual: 'generic',
  technologies: [],
  status: 'draft',
  order: 100,
  workflow: [],
  outcomes: [],
});
export const newResearch = (): import('./schema').Research => ({
  id: crypto.randomUUID(),
  title: 'Untitled research',
  description: '',
  date: '',
  publication: '',
  details: '',
  technologies: [],
  link: '',
  status: 'draft',
  order: 100,
  outcomes: [],
});
