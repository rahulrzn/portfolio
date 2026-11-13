import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowUpRight, Copy, MapPin, Check } from 'lucide-react';
import { useContent } from '../content/context';
import { ProfileLinks } from '../components/ProfileLinks';
import { Seo } from '../components/Seo';
import { PageHeading } from '../components/PageHeading';
const formSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(100),
  email: z.email('Enter a valid email address.').max(254),
  subject: z.string().trim().min(3, 'Enter a subject with at least 3 characters.').max(150),
  message: z.string().trim().min(10, 'Write a message with at least 10 characters.').max(4000),
});
type Values = z.infer<typeof formSchema>;
export default function Contact() {
  const { profile, settings } = useContent();
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(formSchema) });
  async function submit(data: Values) {
    if (!profile.email) {
      setNotice(
        'No contact email has been provided yet. You can copy your message; nothing has been sent.',
      );
      return;
    }
    const body = `From: ${data.name} <${data.email}>\n\n${data.message}`;
    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(body)}`;
    setNotice(
      'Your email draft is ready in your email client. Review and send it there; delivery has not been confirmed.',
    );
  }
  return (
    <div className="container page-content contact-page">
      <Seo title="Contact" />
      <PageHeading title="Let’s connect">{settings.contactIntro}</PageHeading>
      <div className="contact-grid">
        <aside>
          <h2>{settings.contactHeading}</h2>
          <p>For conversations about backend systems, data engineering and applied AI.</p>
          <div className="contact-information">
            <span>
              <MapPin size={18} />
              {profile.location}
            </span>
            {!profile.email ? (
              <p className="muted">Contact email will be available here when provided.</p>
            ) : null}
            <ProfileLinks showContactValues />
          </div>
          <p className="contact-note">
            This form prepares a draft in your email client. It does not send or store messages.
          </p>
        </aside>
        <form className="contact-form" onSubmit={handleSubmit(submit)} noValidate>
          <div className="form-row">
            {(['name', 'email'] as const).map((key) => (
              <label className="field" key={key}>
                <span id={`${key}-label`}>{key === 'name' ? 'Name' : 'Email'}</span>
                <input
                  {...register(key)}
                  type={key === 'email' ? 'email' : 'text'}
                  autoComplete={key}
                  aria-labelledby={`${key}-label`}
                  aria-invalid={!!errors[key]}
                  aria-describedby={errors[key] ? `${key}-error` : undefined}
                  placeholder={key === 'name' ? 'Your name' : 'you@example.com'}
                />
                {errors[key] ? (
                  <span id={`${key}-error`} className="field-error" role="alert">
                    {errors[key]?.message}
                  </span>
                ) : null}
              </label>
            ))}
          </div>
          <label className="field">
            <span id="subject-label">Subject</span>
            <input
              {...register('subject')}
              placeholder="What’s on your mind?"
              aria-labelledby="subject-label"
              aria-invalid={!!errors.subject}
              aria-describedby={errors.subject ? 'subject-error' : undefined}
            />
            {errors.subject ? (
              <span id="subject-error" className="field-error" role="alert">
                {errors.subject.message}
              </span>
            ) : null}
          </label>
          <label className="field">
            <span id="message-label">Message</span>
            <textarea
              {...register('message')}
              rows={6}
              placeholder="Tell me a little about your idea…"
              aria-labelledby="message-label"
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? 'message-error' : undefined}
            />
            {errors.message ? (
              <span id="message-error" className="field-error" role="alert">
                {errors.message.message}
              </span>
            ) : null}
          </label>
          <div className="contact-form-actions">
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Preparing…' : 'Prepare email'} <ArrowUpRight size={17} />
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={handleSubmit(async (data) => {
                const text = `${data.subject}\n\nFrom: ${data.name} <${data.email}>\n\n${data.message}`;
                try {
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  setNotice('Message copied. Nothing has been sent.');
                } catch {
                  setNotice(
                    'Clipboard access is unavailable. Select and copy the message from the form.',
                  );
                }
              })}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />} Copy message
            </button>
          </div>
          {notice ? (
            <p className="form-notice" role="status">
              {notice}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
