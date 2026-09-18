//go:build !linux

package state

import "os"

// checkFileOwnership is a no-op where UID ownership is unsupported (Windows).
// Permission checks still apply via checkFilePermissions; owner tests skip.
func provisionIdentityOwnerUID() int { return -1 }
func provisionRuntimeOwnerUID() int { return -1 }

func checkFileOwnershipWithUID(_ os.FileInfo, _ *int) error { return nil }
func checkFileOwnership(_ string, _ os.FileInfo) error      { return nil }
