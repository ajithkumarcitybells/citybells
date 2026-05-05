import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// We'll dynamically mock useAuth per test

describe('Admin menu visibility', () => {
  beforeEach(() => {
    // reset module registry so mocks can be re-applied
    vi.resetModules();
  });

  it('shows Taxi Pricing link for admin users', async () => {
    vi.resetModules();
    vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ user: { isAdmin: true, name: 'Admin' } }) }));
    const { AdminLayout } = await import('../index');
    render(<AdminLayout><div>child</div></AdminLayout>);
    const el = screen.getByTestId('admin-nav-taxi-pricing');
    expect(el).toBeInTheDocument();
  });

  it('hides Taxi Pricing link for non-admin users', async () => {
    vi.resetModules();
    vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ user: { isAdmin: false, name: 'User' } }) }));
    const { AdminLayout } = await import('../index');
    render(<AdminLayout><div>child</div></AdminLayout>);
    const el = screen.queryByTestId('admin-nav-taxi-pricing');
    expect(el).toBeNull();
  });
});
