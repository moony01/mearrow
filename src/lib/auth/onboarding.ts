export interface OnboardingProfileState {
  onboarding_completed?: boolean | null;
}

interface AuthenticatedRedirectInput {
  profile: OnboardingProfileState | null | undefined;
  returnTo?: string | null;
}

/**
 * The persisted profile is the authority for onboarding completion.
 * Both the regular submit and the optional-group skip path persist this marker.
 */
export function hasCompletedOnboarding(
  profile: OnboardingProfileState | null | undefined,
): boolean {
  return profile?.onboarding_completed === true;
}

/**
 * Only completed profiles may continue to a requested post-auth destination.
 * New, missing, or incomplete profiles must finish onboarding first.
 */
export function getAuthenticatedRedirect({
  profile,
  returnTo,
}: AuthenticatedRedirectInput): string {
  if (!hasCompletedOnboarding(profile)) {
    return '/onboarding';
  }

  return returnTo || '/';
}
