import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { DuplicateWarningModal } from './DuplicateWarningModal';

describe('DuplicateWarningModal', () => {
  it('renders the month name in the body', () => {
    render(<DuplicateWarningModal monthName="March 2024" onReplace={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/march 2024/i)).toBeInTheDocument();
  });

  it('renders Cancel and Replace buttons', () => {
    render(<DuplicateWarningModal monthName="March 2024" onReplace={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /replace/i })).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<DuplicateWarningModal monthName="March 2024" onReplace={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onReplace when Replace is clicked', async () => {
    const onReplace = vi.fn();
    render(<DuplicateWarningModal monthName="March 2024" onReplace={onReplace} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /replace/i }));
    expect(onReplace).toHaveBeenCalledOnce();
  });

  it('has role="dialog" and aria-modal="true" for accessibility', () => {
    render(<DuplicateWarningModal monthName="March 2024" onReplace={vi.fn()} onCancel={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('Cancel button has autoFocus (safe default action)', () => {
    render(<DuplicateWarningModal monthName="March 2024" onReplace={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus();
  });
});
