package version

// Value is injected at build time with -ldflags. Development builds use the
// repository's package version fallback.
var Value = "dev"

// String returns the effective agent version.
func String() string {
	if Value == "" {
		return "dev"
	}
	return Value
}
