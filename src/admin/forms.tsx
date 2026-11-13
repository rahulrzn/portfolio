import { useEffect, useState, type ReactNode } from 'react';
import {
  Controller,
  useForm,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { ContentImage } from '../components/ContentImage';
import { imageStore } from '../content/images';
import { useAdmin } from './workspace';

export function useEditor<T extends FieldValues>(schema: z.ZodType<T>, defaults: T) {
  const form = useForm<T>({
    defaultValues: structuredClone(defaults) as import('react-hook-form').DefaultValues<T>,
    resolver: zodResolver(schema as never),
    mode: 'onSubmit',
  });
  const { setDirty } = useAdmin();
  const dirty = form.formState.isDirty;
  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);
  return form;
}
type FieldProps<T extends FieldValues> = {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  type?: 'text' | 'url' | 'email' | 'tel' | 'number' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  hint?: string;
  required?: boolean;
  wide?: boolean;
};
function readableError(message: string) {
  const maximum = message.match(/<=(\d+) characters/);
  return maximum ? `Use ${maximum[1]} characters or fewer.` : message;
}
export function NestedText<T extends FieldValues>({
  form,
  name,
  label,
  value,
  onChange,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const error = form.getFieldState(name, form.formState).error;
  const id = `admin-field-${name}`;
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <small id={`${id}-error`} className="admin-field-error" role="alert">
          {readableError(error.message ?? 'Check this field.')}
        </small>
      ) : null}
    </div>
  );
}
export function Field<T extends FieldValues>({
  form,
  name,
  label,
  type = 'text',
  options = [],
  hint,
  required,
  wide,
}: FieldProps<T>) {
  const id = `admin-field-${name}`;
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <div className={`admin-field ${wide ? 'admin-wide' : ''}`}>
          <label htmlFor={id} data-required={required || undefined}>
            {label}
          </label>
          {type === 'textarea' ? (
            <textarea
              {...field}
              value={field.value ?? ''}
              id={id}
              rows={5}
              aria-invalid={!!fieldState.error}
              aria-describedby={fieldState.error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            />
          ) : type === 'select' ? (
            <select {...field} value={field.value ?? ''} id={id} aria-invalid={!!fieldState.error}>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              {...field}
              value={field.value ?? ''}
              onChange={(event) =>
                field.onChange(
                  type === 'number'
                    ? event.target.value === ''
                      ? ''
                      : Number(event.target.value)
                    : event.target.value,
                )
              }
              id={id}
              type={type}
              min={type === 'number' ? 0 : undefined}
              max={type === 'number' ? 10000 : undefined}
              aria-invalid={!!fieldState.error}
              aria-describedby={fieldState.error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            />
          )}
          {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
          {fieldState.error ? (
            <small className="admin-field-error" id={`${id}-error`} role="alert">
              {readableError(fieldState.error.message ?? 'Check this field.')}
            </small>
          ) : null}
        </div>
      )}
    />
  );
}
export function Checkbox<T extends FieldValues>({
  form,
  name,
  label,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={!!field.value}
            onChange={(event) => field.onChange(event.target.checked)}
            onBlur={field.onBlur}
            ref={field.ref}
          />
          {label}
        </label>
      )}
    />
  );
}
export function ImageField<T extends FieldValues>({
  form,
  name,
  alt,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  alt: string;
}) {
  const { notify } = useAdmin();
  const [uploading, setUploading] = useState(false);
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <div className="admin-image-field">
          <div className="admin-image-preview">
            <ContentImage
              reference={field.value ?? ''}
              alt={alt}
              fallback={<span>No image selected</span>}
            />
          </div>
          <div>
            <label htmlFor="admin-image-upload">Upload image</label>
            <input
              id="admin-image-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                setUploading(true);
                try {
                  field.onChange(await imageStore.put(file));
                  notify('Image added to this form. Save draft to keep the change.');
                } catch (error) {
                  notify(error instanceof Error ? error.message : 'Image upload failed.', true);
                } finally {
                  setUploading(false);
                }
              }}
            />
            <small>PNG, JPEG or WebP. Up to 3 MB; 64–5000 pixels.</small>
            {uploading ? <p role="status">Checking and storing image…</p> : null}
            {field.value ? (
              <button
                className="button small secondary"
                type="button"
                onClick={() => field.onChange('')}
              >
                Remove image
              </button>
            ) : null}
          </div>
        </div>
      )}
    />
  );
}
export function StringList<T extends FieldValues>({
  form,
  name,
  label,
  max = 40,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  max?: number;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        const values: string[] = field.value ?? [];
        return (
          <fieldset className="admin-list">
            <legend>{label}</legend>
            {values.map((value, index) => (
              <div className="admin-inline" key={index}>
                <NestedText
                  form={form}
                  name={`${name}.${index}` as Path<T>}
                  label={`${label} ${index + 1}`}
                  value={value}
                  onChange={(text) =>
                    field.onChange(values.map((item, i) => (i === index ? text : item)))
                  }
                />
                <button
                  type="button"
                  className="button small secondary"
                  aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
                  onClick={() => field.onChange(values.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button small secondary"
              disabled={values.length >= max}
              onClick={() => field.onChange([...values, ''])}
            >
              Add {label.toLowerCase()}
            </button>
            {fieldState.error?.message ? (
              <p className="admin-field-error" role="alert">
                {fieldState.error.message}
              </p>
            ) : null}
          </fieldset>
        );
      }}
    />
  );
}
type Outcome = { value: string; label: string; context: string };
export function OutcomeList<T extends FieldValues>({
  form,
  name,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
}) {
  const { confirm } = useAdmin();
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        const values: Outcome[] = field.value ?? [];
        return (
          <fieldset className="admin-list">
            <legend>Outcomes</legend>
            <p className="muted">
              Use measured results and explain their source or evaluation context.
            </p>
            {values.map((outcome, index) => (
              <div className="admin-subsection" key={index}>
                <div className="admin-form-grid">
                  {(['value', 'label', 'context'] as const).map((key) => (
                    <NestedText
                      key={key}
                      form={form}
                      name={`${name}.${index}.${key}` as Path<T>}
                      label={`${key === 'value' ? 'Result' : key === 'label' ? 'Result label' : 'Evaluation context'} ${index + 1}`}
                      value={outcome[key]}
                      onChange={(text) =>
                        field.onChange(
                          values.map((item, i) => (i === index ? { ...item, [key]: text } : item)),
                        )
                      }
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="button small secondary"
                  onClick={async () => {
                    if (
                      await confirm({
                        title: 'Remove outcome?',
                        message:
                          'This removes the outcome from this form. Save draft to keep the change.',
                        action: 'Remove outcome',
                        destructive: true,
                      })
                    )
                      field.onChange(values.filter((_, i) => i !== index));
                  }}
                >
                  Remove outcome {index + 1}
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button small secondary"
              disabled={values.length >= 12}
              onClick={() => field.onChange([...values, { value: '', label: '', context: '' }])}
            >
              Add outcome
            </button>
            {fieldState.error?.message ? (
              <p role="alert" className="admin-field-error">
                {fieldState.error.message}
              </p>
            ) : null}
          </fieldset>
        );
      }}
    />
  );
}
export function EditorForm<T extends FieldValues>({
  form,
  onSave,
  onCancel,
  children,
}: {
  form: UseFormReturn<T>;
  onSave: (value: T) => void;
  onCancel?: () => void;
  children: ReactNode;
}) {
  const { confirm, notify, setDirty } = useAdmin();
  return (
    <form
      className="admin-editor"
      noValidate
      onSubmit={form.handleSubmit(
        (value) => {
          try {
            onSave(value);
            form.reset(value);
            setDirty(false);
            notify('Draft saved. Preview before publishing.');
          } catch (error) {
            notify(error instanceof Error ? error.message : 'Draft could not be saved.', true);
          }
        },
        () => notify('Check the highlighted fields before saving.', true),
      )}
    >
      {children}
      <div className="admin-savebar">
        <span>{form.formState.isDirty ? 'Unsaved form changes' : 'Form matches saved draft'}</span>
        <div className="admin-actions">
          <button
            type="button"
            className="button secondary"
            onClick={async () => {
              if (
                !form.formState.isDirty ||
                (await confirm({
                  title: 'Revert unsaved changes?',
                  message: 'Discard unsaved text and return to the last saved draft?',
                  action: 'Discard changes',
                  cancel: 'Keep editing',
                  destructive: true,
                }))
              ) {
                form.reset();
                setDirty(false);
              }
            }}
          >
            Revert to saved
          </button>
          {onCancel ? (
            <button
              type="button"
              className="button secondary"
              onClick={async () => {
                if (
                  !form.formState.isDirty ||
                  (await confirm({
                    title: 'Discard unsaved changes?',
                    message:
                      'This form contains unsaved changes. Discard them and close the editor?',
                    action: 'Discard changes',
                    cancel: 'Keep editing',
                    destructive: true,
                  }))
                ) {
                  setDirty(false);
                  onCancel();
                }
              }}
            >
              Cancel editing
            </button>
          ) : null}
          <button className="button" type="submit">
            Save draft
          </button>
        </div>
      </div>
    </form>
  );
}
