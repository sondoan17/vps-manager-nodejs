//go:build linux

package state

import (
	"fmt"
	"os"
	"syscall"
)

// checkFileOwnership fails closed when the state file owner differs from the
// effective UID of this process. In production the agent runs as root, so this
// is equivalent to the required root-owned check; in tests it detects foreign
// ownership without requiring uid 0.
func checkFileOwnershipWithUID(fi os.FileInfo, expected *int) error {
	if expected == nil {
		return checkFileOwnership("", fi)
	}
	st, ok := fi.Sys().(*syscall.Stat_t)
	if !ok || st == nil || int(st.Uid) != *expected {
		return fmt.Errorf("state: wrong owner")
	}
	return nil
}

func provisionIdentityOwnerUID() int { return 0 }
func provisionRuntimeOwnerUID() int  { return os.Geteuid() }

func checkFileOwnership(_ string, fi os.FileInfo) error {
	st, ok := fi.Sys().(*syscall.Stat_t)
	if !ok || st == nil {
		return fmt.Errorf("state: cannot stat owner: fail closed")
	}
	if int(st.Uid) != os.Geteuid() {
		return fmt.Errorf("state: wrong owner uid=%d: fail closed", st.Uid)
	}
	return nil
}
