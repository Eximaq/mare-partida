# Default rework migration after PR307

PR307 was merged and deployed. The visual failure was not deployment: normal saves contain starter weapon0/2/4 + coat6 and light/black appearance, while the exact provider requires a complete compatible family. Rejection fell through to legacy art.

The owner explicitly requested the rework base without equipment when the combination is unavailable. Normal world and preview now use that base instead of legacy. Exact complete rework families still take priority. No save, equipment, stats or source PNG is changed. The final world draw remains105/374 of native pixels. Base fallback uses unarmed attacks; equipment, clothing and accessories may be invisible. If appearance cannot be represented, the authored original base is used. Diagnostics expose `defaultHD.last.unrepresentedSlots`, `appearanceAdapted`, and action mapping. This is not certification of equipment coverage.

No substitute weapon/traje composite or historical weapon source is used. Initial asynchronous loading may briefly show no character rather than legacy. Zoan and Visual Completo retain their separate rendering paths.

Verification: native raster regression covers both genders, three starter weapons, four directions and idle/walk/attack (72 cases) while proving save identity unchanged. Actual UI starter/reload/mobile browser regression is included in CI with artifacts. Local Chromium cannot launch because this execution sandbox denies socket()/ptrace; no local in-game screenshot claim is made.
