import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePostSocial, { type ProfilePostSocialLabels } from './ProfilePostSocial';

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
  useAuth: vi.fn(),
  listComments: vi.fn(),
  createComment: vi.fn(),
  deleteComment: vi.fn(),
  toggleLike: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: mocks.useAuth,
}));

vi.mock('@/lib/auth/development-test-mode', () => ({
  DEVELOPMENT_TEST_USER_ID: '00000000-0000-0000-0000-000000000013',
  isDevelopmentTestModeEnabled: () => false,
}));

vi.mock('@/lib/api/profile-social', () => ({
  listProfilePostComments: mocks.listComments,
  createProfilePostComment: mocks.createComment,
  deleteProfilePostComment: mocks.deleteComment,
  toggleProfilePostLike: mocks.toggleLike,
}));

const labels: ProfilePostSocialLabels = {
  like: 'Like',
  liked: 'Unlike',
  comments: 'Comments',
  commentPanel: 'Post comments',
  commentPlaceholder: 'Write a comment',
  commentSubmit: 'Post',
  commentSubmitting: 'Posting…',
  commentDelete: 'Delete comment',
  commentEmpty: 'Be the first to comment.',
  commentLoading: 'Loading comments…',
  commentError: 'Could not load comments.',
  commentSubmitError: 'Could not post the comment.',
  commentDeleteError: 'Could not delete the comment.',
  loginRequired: 'Only signed-in members can interact.',
  signupRequired: 'Sign up to like or comment.',
  retry: 'Try again',
};

describe('ProfilePostSocial anonymous interactions', () => {
  beforeEach(() => {
    mocks.routerPush.mockReset();
    mocks.useAuth.mockReset();
    mocks.listComments.mockReset();
    mocks.createComment.mockReset();
    mocks.deleteComment.mockReset();
    mocks.toggleLike.mockReset();
    mocks.useAuth.mockReturnValue({ user: null, isAuthenticated: false });
    mocks.listComments.mockResolvedValue([]);
  });

  it('routes anonymous like attempts to the signup page', () => {
    render(<ProfilePostSocial postId="post-1" locale="ja" labels={labels} />);

    fireEvent.click(screen.getByRole('button', { name: /Sign up to like or comment.*Like/ }));

    expect(mocks.routerPush).toHaveBeenCalledWith('/signup');
    expect(mocks.toggleLike).not.toHaveBeenCalled();
  });

  it('keeps public comments readable and exposes a signup CTA', async () => {
    const { container } = render(
      <ProfilePostSocial postId="post-1" locale="de" labels={labels} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Comments (0)' }));

    const signupLink = await screen.findByRole('link', { name: labels.signupRequired });
    expect(signupLink.getAttribute('href')).toBe('/signup');
    await waitFor(() => expect(mocks.listComments).toHaveBeenCalledWith('post-1'));
    expect(container.querySelector('[aria-label="Post comments"]')).not.toBeNull();
  });

  it('routes a reachable anonymous comment submit to signup', async () => {
    const { container } = render(
      <ProfilePostSocial postId="post-1" locale="en" labels={labels} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Comments (0)' }));
    await screen.findByRole('link', { name: labels.signupRequired });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    expect(mocks.routerPush).toHaveBeenCalledWith('/signup');
    expect(mocks.createComment).not.toHaveBeenCalled();
  });
});
