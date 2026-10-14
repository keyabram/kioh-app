export type MentorSocialPlatform = "linkedin" | "website" | "github" | "x";

const PLATFORM_HOSTS: Record<MentorSocialPlatform, string[]> = {
  linkedin: ["linkedin.com"],
  website: [],
  github: ["github.com"],
  x: ["x.com", "twitter.com"],
};

export function normalizeMentorSocialUrl(
  value: string,
  platform: MentorSocialPlatform
): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return null;

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    const allowedHosts = PLATFORM_HOSTS[platform];
    const hostAllowed =
      platform === "website" ||
      allowedHosts.some(
        (host) => hostname === host || hostname.endsWith(`.${host}`)
      );
    if (
      url.protocol !== "https:" ||
      !hostname ||
      !hostAllowed ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function getMentorSocialUrlError(
  value: string,
  platform: MentorSocialPlatform,
  required = false
): string {
  if (!value.trim()) {
    return required ? "A LinkedIn profile URL is required." : "";
  }
  if (!normalizeMentorSocialUrl(value, platform)) {
    const guidance: Record<MentorSocialPlatform, string> = {
      linkedin: "Enter a valid LinkedIn URL, such as linkedin.com/in/yourname.",
      website: "Enter a valid website URL using HTTPS.",
      github: "Enter a valid GitHub URL, such as github.com/yourname.",
      x: "Enter a valid X or Twitter URL, such as x.com/yourname.",
    };
    return guidance[platform];
  }
  return "";
}
