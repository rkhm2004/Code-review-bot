// CS4 security helper.
// No credentials are embedded in source code. Authentication must be provided
// by the deployment environment or GitHub token configuration.
export function hasConfiguredAuthentication(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}
