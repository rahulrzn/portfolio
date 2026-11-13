import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import ProfilePage from './ProfilePage';
import { AdminTools } from './workspace';
import { getRepository } from '../content/repository';

it('validates contact details and stages editable opportunities before explicit publication', async () => {
  render(
    <AdminTools>
      <ProfilePage />
    </AdminTools>,
  );
  const input = screen.getByLabelText('Phone number');
  expect(input).toHaveAttribute('type', 'tel');
  expect(screen.getByText(/full https:\/\/github.com/)).toBeVisible();
  expect(screen.getByText(/full https:\/\/www.linkedin.com\/in/)).toBeVisible();
  fireEvent.change(input, { target: { value: '+1;123456789' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
  expect(getRepository().read().draft.profile.phone).toBe('');
  fireEvent.change(input, { target: { value: '+91 98765 43210' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() => expect(getRepository().read().draft.profile.phone).toBe('+91 98765 43210'));
  expect(getRepository().read().published.profile.phone).toBe('');
  const availability = screen.getByLabelText('Show the Open to Opportunities section');
  expect(availability).toBeChecked();
  fireEvent.click(availability);
  fireEvent.change(screen.getByLabelText('Opportunities heading'), {
    target: { value: 'Future career opportunities' },
  });
  fireEvent.change(screen.getByLabelText('Preferred location 1'), { target: { value: 'Chennai' } });
  fireEvent.change(screen.getByLabelText('Preferred location 3'), {
    target: { value: 'Bangalore' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() =>
    expect(getRepository().read().draft.profile.opportunities.visible).toBe(false),
  );
  expect(getRepository().read().draft.profile.opportunities.preferredLocations).toEqual([
    'Chennai',
    'Kerala',
    'Bangalore',
  ]);
  expect(getRepository().read().published.profile.opportunities.visible).toBe(true);
  getRepository().publish();
  expect(getRepository().read().published.profile.opportunities).toMatchObject({
    visible: false,
    heading: 'Future career opportunities',
    preferredLocations: ['Chennai', 'Kerala', 'Bangalore'],
  });
});
