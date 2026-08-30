/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB. Originally sized to 20mb for a single complaint
      // photo (CLAUDE.md §11 max 15MB, enforced by lib/images/process.ts)
      // through validateComplaintImageAction — real headroom above 15MB for
      // multipart overhead, so a file right at the app-level limit still
      // reaches that code's own graceful rejection instead of tripping
      // Next's hard transport limit first (confirmed by reproducing exactly
      // that: a 16MB test file against a 16mb config threw an uncaught "Body
      // exceeded" 413 before lib/images/process.ts ever ran).
      //
      // Step 5c's submitComplaintAction sends up to MAX_PHOTOS (5) files in
      // one request — worst case 5 x 15MB = 75MB — so this is raised to
      // 100mb, keeping the same ~1.3x headroom ratio over the true worst case.
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
