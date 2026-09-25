//go:build linux

package state

import (
	"fmt"
	"os"
	"syscall"
)

// checkFileOwnershipWithUID fails closed when the state file owner differs from
// the expected UID. Provisioning requires both files to be owned by the
// executing UID (0600); root provisioning of an existing root-owned identity
// remains supported because the executor is uid 0 there.
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

// provisionIdentityOwnerUID defaults to the executing UID so nonroot initial
// provisioning succeeds when both files are owned by the caller (0600).
// Root callers pass the service UID via ProvisionOptions.RuntimeOwnerUID for
// existing split-owner installs; the identity default stays uid 0 there.
func provisionIdentityOwnerUID() int { return os.Geteuid() }
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
