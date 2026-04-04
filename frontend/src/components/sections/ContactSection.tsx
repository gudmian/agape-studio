import { useState } from 'react';
import type { FormEvent } from 'react';
import { useReveal } from '../../hooks/useReveal';
import { Button } from '../ui/Button';
import { useSiteContent } from '../../content/siteContentContext';
import type { ContactFormData } from '../../types';
import styles from './ContactSection.module.css';

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

const INITIAL_FORM: ContactFormData = {
  name: '',
  phone: '',
  email: '',
  message: '',
};

export function ContactSection() {
  const { contact } = useSiteContent();
  const sectionRef = useReveal();
  const [form, setForm] = useState<ContactFormData>(INITIAL_FORM);
  const [status, setStatus] = useState<FormStatus>('idle');
  const descriptionLines = contact.description.split('\n');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Server error');
      setStatus('success');
      setForm(INITIAL_FORM);
    } catch {
      setStatus('error');
    }
  };

  return (
    <section
      id="contact"
      className={styles.section}
      ref={sectionRef as React.RefObject<HTMLElement>}
    >
      <div className={styles.inner}>
        {/* Левая информационная колонка */}
        <div className={`${styles.info} reveal`}>
          <span className="eyebrow" style={{ color: 'var(--color-text-muted)' }}>
            {contact.eyebrow}
          </span>
          <h2 className={styles.title}>{contact.title}</h2>
          <p className={styles.description}>
            {descriptionLines.map((line, i) => (
              <span key={i}>
                {line}
                {i < descriptionLines.length - 1 && <br />}
              </span>
            ))}
          </p>
        </div>

        {/* Карточка с формой */}
        <div className={`${styles.formCard} reveal reveal-delay-2`}>
          <h3 className={styles.formTitle}>Оставьте заявку</h3>

          {status === 'success' ? (
            <div className={styles.successMessage}>
              <p className={styles.successTitle}>Заявка отправлена!</p>
              <p className={styles.successText}>
                Свяжемся с вами в течение 24 часов для обсуждения проекта.
              </p>
              <Button
                variant="ghost"
                size="md"
                onClick={() => setStatus('idle')}
                style={{ marginTop: 16 }}
              >
                ОТПРАВИТЬ ЕЩЁ
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="name">Имя</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className={styles.input}
                    placeholder={contact.form.namePlaceholder}
                    value={form.name}
                    onChange={handleChange}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="phone">Телефон</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className={styles.input}
                    placeholder={contact.form.phonePlaceholder}
                    value={form.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={styles.input}
                  placeholder={contact.form.emailPlaceholder}
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="message">Сообщение</label>
                <textarea
                  id="message"
                  name="message"
                  className={`${styles.input} ${styles.textarea}`}
                  placeholder={contact.form.messagePlaceholder}
                  value={form.message}
                  onChange={handleChange}
                  rows={4}
                />
              </div>

              {status === 'error' && (
                <p className={styles.errorText}>
                  Ошибка отправки. Пожалуйста, попробуйте ещё раз.
                </p>
              )}

              <div className={styles.formFooter}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className={styles.submitBtn}
                  disabled={status === 'sending'}
                >
                  {status === 'sending' ? 'ОТПРАВЛЯЕМ...' : contact.form.submitLabel}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
