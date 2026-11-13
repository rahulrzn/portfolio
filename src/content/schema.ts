import { z } from 'zod';
const text = (max: number) => z.string().trim().max(max);
const required = (max: number) => text(max).min(1, 'This field is required.');
export const opportunitiesSchema = z
  .object({
    visible: z.boolean().default(true),
    heading: required(160),
    summary: text(1500),
    flexibility: text(1000),
    careerInterests: z.array(required(140)).max(12),
    preferredLocations: z.array(required(80)).max(8),
    employmentTypes: z.array(required(120)).max(8),
  })
  .strict();
export type Opportunities = z.infer<typeof opportunitiesSchema>;
export const defaultOpportunities: Opportunities = {
  visible: true,
  heading: 'Open to Opportunities',
  summary:
    'Open to full-time positions, graduate hiring programs and remote opportunities across India in software development, backend and full-stack engineering, data engineering and analytics.',
  flexibility:
    'I’m also open to suitable entry-level opportunities across the IT and technology industry, including other technical roles that match my skills. I’m flexible about the role and keen to explore technology domains where I can learn, contribute and grow professionally.',
  careerInterests: [
    'Graduate Software Engineer / Associate Software Engineer',
    'Backend Developer (Java, Spring Boot)',
    'Full Stack Developer',
    'Software Engineering',
    'Data Engineering and Analytics',
  ],
  preferredLocations: ['Bangalore', 'Kerala', 'Chennai'],
  employmentTypes: [
    'Full-time positions',
    'Graduate hiring programs',
    'Remote opportunities across India',
  ],
};
export const phoneNumber = z
  .string()
  .max(40, 'Use 40 characters or fewer for the phone number.')
  .trim()
  .refine((value) => {
    if (!value) return true;
    const digits = value.replace(/[^0-9]/g, '');
    return /^\+?[0-9 ().-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
  }, 'Use 7–15 digits, with an optional leading +. Spaces, parentheses, dots and hyphens are allowed.')
  .default('');
export const webUrl = z
  .string()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return (
        ['http:', 'https:'].includes(url.protocol) &&
        !!url.hostname &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, 'Enter a full http:// or https:// URL without credentials.');
export const imageReference = z
  .string()
  .max(2000)
  .refine(
    (value) =>
      !value ||
      /^image:[a-zA-Z0-9-]{8,80}$/.test(value) ||
      value === '/assets/rahul-portrait.webp' ||
      (value.startsWith('https://') && webUrl.safeParse(value).success),
    'Select a supported image.',
  );
const id = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9-]+$/);
const technologies = z.array(required(60)).max(40);
const outcome = z
  .object({ value: required(80), label: required(180), context: text(400) })
  .strict();
export const profileSchema = z
  .object({
    name: required(100),
    headline: required(180),
    introduction: text(1000),
    about: text(4000),
    location: text(150),
    email: z.union([z.literal(''), z.email().max(254)]),
    phone: phoneNumber,
    opportunities: opportunitiesSchema.default(() => structuredClone(defaultOpportunities)),
    githubUrl: webUrl,
    linkedinUrl: webUrl,
    image: imageReference,
    education: z
      .array(
        z
          .object({
            id,
            school: required(200),
            degree: required(200),
            period: text(80),
            detail: text(200),
          })
          .strict(),
      )
      .max(10),
  })
  .strict();
export const projectSchema = z
  .object({
    id,
    slug: required(80).regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Use lowercase words separated by hyphens.',
    ),
    title: required(150),
    subtitle: text(250),
    description: required(600),
    overview: text(4000),
    problem: text(3000),
    approach: text(3000),
    implementation: text(5000),
    category: required(80),
    technologies,
    image: imageReference,
    visual: z.enum(['data', 'classification', 'retrieval', 'generic']),
    githubUrl: webUrl,
    liveUrl: webUrl,
    caseStudyUrl: webUrl,
    featured: z.boolean(),
    order: z.number().int().min(0).max(10000),
    status: z.enum(['draft', 'published']),
    year: text(80),
    context: text(180),
    workflow: z.array(required(100)).max(10),
    outcomes: z.array(outcome).max(12),
  })
  .strict();
export const skillGroupSchema = z
  .object({
    id,
    category: required(100),
    items: z.array(z.object({ id, name: required(80) }).strict()).max(80),
  })
  .strict();
export const researchSchema = z
  .object({
    id,
    title: required(250),
    description: text(1500),
    date: text(80),
    publication: text(180),
    details: text(5000),
    technologies,
    link: webUrl,
    status: z.enum(['draft', 'published']),
    order: z.number().int().min(0).max(10000),
    outcomes: z.array(outcome).max(12),
  })
  .strict();
export const settingsSchema = z
  .object({
    seoTitle: required(120),
    seoDescription: required(320),
    siteUrl: webUrl,
    resumeUrl: webUrl,
    contactHeading: required(160),
    contactIntro: text(700),
    footerNote: text(250),
  })
  .strict();
export const contentSchema = z
  .object({
    profile: profileSchema,
    projects: z.array(projectSchema).max(60),
    skills: z.array(skillGroupSchema).max(20),
    research: z.array(researchSchema).max(60),
    settings: settingsSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    const check = (values: string[], path: string) => {
      if (new Set(values).size !== values.length)
        ctx.addIssue({ code: 'custom', message: `Each ${path} must be unique.`, path: [path] });
    };
    check(
      data.projects.map((p) => p.slug),
      'project slug',
    );
    check(
      [...data.projects, ...data.skills, ...data.research, ...data.profile.education].map(
        (p) => p.id,
      ),
      'ID',
    );
    check(
      data.skills.flatMap((group) => group.items.map((item) => item.id)),
      'skill ID',
    );
  });
export type Content = z.infer<typeof contentSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Project = z.infer<typeof projectSchema>;
export type SkillGroup = z.infer<typeof skillGroupSchema>;
export type Research = z.infer<typeof researchSchema>;
export type SiteSettings = z.infer<typeof settingsSchema>;
export const envelopeSchema = z
  .object({
    version: z.literal(1),
    revision: z.number().int().nonnegative(),
    updatedAt: z.string(),
    draft: contentSchema,
    published: contentSchema,
    activity: z.array(z.object({ id, label: text(200), at: z.string() }).strict()).max(30),
  })
  .strict();
export type Envelope = z.infer<typeof envelopeSchema>;
export function validationMessage(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join(' › ') || 'Content'}: ${issue.message}`)
    .join(' ');
}
