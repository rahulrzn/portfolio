# Verified portfolio content

All three supplied one-page PDFs were inspected via decoded PDF content streams. They contain no `/Subtype /Image` objects. Extracted private text lives under `.reference-inspection/` and must not ship in the build or Git repository.

The Open to Opportunities content comes from the user's explicit instructions: graduate/associate software engineering, Java/Spring Boot backend, full-stack, software engineering, data engineering and analytics; preferred locations Bangalore, Kerala, then Chennai; full-time, graduate programs and remote opportunities across India; flexible suitable entry-level IT/technology roles matching their skills. No new employment experience or achievement is claimed. Email, telephone, GitHub and LinkedIn remain empty defaults for the user to configure in Admin → Profile.

## Identity and contact

Name: **Rahul Reji R.**, from the user's project brief. All PDFs say `Name`; none supplies an actual email or phone. `email@gmail.com`, `+91 phone`, `https://github.com/`, `https://www.linkedin.com/in/`, `mailto:` and `https://www` are template values and are excluded. Location: Chennai, Tamil Nadu, India, from the PDFs.

The user later supplied `reference/Linkedin DP.png`. The actual portrait is optimized as `public/assets/rahul-portrait.webp` without identity changes. No public resume reference supplied; reference PDFs remain private. A clean generated resume uses the same verified published content.

## Education

- SRM Institute of Science and Technology, Chennai. B.Tech. Computer Science and Business Systems. 2022–2026. CGPA 8.6/10. PDF 1 additionally names Vadapalani.
- Chinmaya Vidyalaya Senior Secondary School, Chennai. Higher Secondary (CBSE). 2021–2022.

## Technical direction

Computer Science and Business Systems graduate with project experience in Java, Spring Boot, Python and SQL; interests in reliable software, data-driven applications, backend systems, AI/ML and NLP. No employment or internship record is supplied; do not create an experience section implying one.

## Projects

### Soho Suite

Title: E-Commerce Analytics Platform for Small Businesses.
Date: 2026; PDF 2 says 2026–Present. Describe backend functionality as in development.
Live URL: **https://soho-suite.pages.dev/** from the hyperlink annotation in `rahul 3.pdf`.
Repository and case-study URLs: absent.
Description: E-commerce data processing and KPI reporting for sales, customers, products and operational trends.
Implementation: Databricks, PySpark, Spark SQL, Delta Lake; Bronze–Silver–Gold Medallion Architecture; schema validation, datatype correction, null handling, deduplication, joins and aggregations; interconnected customer, order, payment, product, seller, review and geographical data; analytical datasets for revenue, orders, AOV, customer behavior, product performance and regional trends. Java, Spring Boot and PostgreSQL backend using controller-service-repository layers is in development.
Resume-reported outcome: over **1.5 million rows** processed. No fabricated business-impact or usage claims.

### CampusVoice

Title: AI-Assisted Student Complaint Management Platform. Date: 2026 in PDFs 2 and 3.
Description: Complaint text and structured metadata for automated classification and duplicate detection.
Implementation: FastAPI REST workflows; AWS RDS for structured data, S3 for attachments, Cognito for authentication; RoBERTa classification; 768-dimensional text embeddings combined with 40 metadata features; sentence-transformer duplicate detection with TF-IDF fallback; Docker listed in PDF 1.
Resume-reported outcomes: 7,710 complaint records across 14 categories. PDFs 2 and 3 describe the latest evaluation as **90.01% accuracy, 90.31% macro F1**. Duplicate detection: **100% Precision@1 on 40 mined duplicate pairs**.
Earlier PDF 1 results: 89.36% accuracy and 89.74% macro F1. Do not mix evaluations or suggest broader production accuracy. Present the latest metrics with their stated evaluation context.
All external project URLs absent.

### Claimwise

Title: LLM-Powered Insurance Document Retrieval System.
Context: HackRx 6.0, Bajaj Finserv, supplied in PDF 1. This describes the project context, not employment or affiliation.
Description: Dual-LLM retrieval-augmented generation over insurance policy documents.
Implementation: semantic vector search over FAISS and Pinecone; automated chunking, embeddings and index updates; multi-provider corpora; LLM-agnostic FastAPI backend with pluggable providers, retrieval quality scoring and A/B experimentation; React frontend.
Resume-reported outcomes: 35% improved retrieval accuracy, 40% reduced query response time, provider migration under 2 hours. No baseline or independent verification provided; label as resume-reported evaluation outcomes. Avoid repeating “zero onboarding time” as an absolute guarantee; describe automated ingestion.
No date or external URL supplied.

## Research

**ChronosGuard: Hidden Markov State Approach for Multi-Stage Attack Detection in AI Agents**. Publication type: Conference; year 2025. No conference name, exact date, authors, DOI or URL supplied.
ModernBERT, 149M parameters, fine-tuned on 8,000 multi-turn AI-agent conversation samples; four threat states; Hidden Semi-Markov Model. Resume-reported conversation-level detection improves 98.33% → 98.50%, recall 97.62% → 97.88%; 92.68% per-turn accuracy, 0.92 macro F1. Distinguish per-turn from conversation-level measurements.

## Skills across all supplied resumes

Programming: Java, Python, SQL, PL/SQL, JavaScript.
Backend: Spring Boot, FastAPI, REST APIs, JPA, Hibernate, API design, Node.js.
Frontend: React, HTML, CSS.
Databases and analytics: PostgreSQL, SQL joins, CTEs, window functions, data modeling, fact/dimension tables, KPI development, Power BI, Excel.
Data engineering: Databricks, PySpark, Spark SQL, Delta Lake, Delta Tables, ETL/ELT, Medallion Architecture, data cleaning/transformation.
AI/ML: PyTorch, Scikit-learn, TensorFlow, Transformers, LLMs, RAG, prompt engineering, fine-tuning, model evaluation, TF-IDF, FAISS, Pinecone, sentence transformers, semantic similarity, text classification.
Cloud and tools: AWS S3/RDS/EC2/Cognito, Docker, Git, GitHub, Postman, VS Code, Firebase, Cursor, Codex, Copilot, Claude.
Core concepts: OOP, DBMS.
No proficiency percentages, years of experience or invented certifications.
