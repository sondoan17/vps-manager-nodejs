package state

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// publishExclusive writes blob to a create-exclusive temp file (O_CREATE|O_EXCL,
// mode 0600, fsync), then publishes with no-replace semantics. It returns
// true when this caller won. When another creator won (destination already
// exists), the temp file is discarded and (false, nil) is returned so the
// caller validates/reads the winner.
func publishExclusive(finalPath string, blob []byte, perm os.FileMode) (bool, error) {
	dir := filepath.Dir(finalPath)
	tmp, err := uniqueTempPath(finalPath)
	if err != nil {
		return false, err
	}
	f, err := os.OpenFile(tmp, os.O_CREATE|os.O_EXCL|os.O_WRONLY, perm)
	if err != nil {
		return false, fmt.Errorf("state: create temp: %w", err)
	}
	// Ensure exact mode regardless of umask (no-op on Windows).
	_ = f.Chmod(perm)
	if _, err := f.Write(blob); err != nil {
		_ = f.Close()
		_ = os.Remove(tmp)
		return false, fmt.Errorf("state: write temp: %w", err)
	}
	if err := f.Sync(); err != nil {
		_ = f.Close()
		_ = os.Remove(tmp)
		return false, fmt.Errorf("state: sync temp: %w", err)
	}
	if err := f.Close(); err != nil {
		_ = os.Remove(tmp)
		return false, fmt.Errorf("state: close temp: %w", err)
	}
	if err := linkNoReplace(tmp, finalPath); err != nil {
		_ = os.Remove(tmp)
		if isAlreadyExists(err) {
			return false, nil
		}
		return false, fmt.Errorf("state: publish: %w", err)
	}
	// Link succeeded: tmp and final share the inode; drop the tmp name.
	_ = os.Remove(tmp)
	if err := fsyncDir(dir); err != nil {
		return true, fmt.Errorf("state: sync parent dir: %w", err)
	}
	return true, nil
}

// atomicReplace rewrites path via a same-directory temp file + rename,
// preserving owner/mode, with file + parent-dir fsync. No temp residue remains.
func atomicReplace(path string, next persistedState) error {
	fi, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("state: stat for replace: %w", err)
	}
	preserveMode := fi.Mode().Perm()
	dir := filepath.Dir(path)
	tmp, err := uniqueTempPath(path)
	if err != nil {
		return err
	}
	blob, err := json.Marshal(next)
	if err != nil {
		return fmt.Errorf("state: encode: %w", err)
	}
	f, err := os.OpenFile(tmp, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return fmt.Errorf("state: create temp: %w", err)
	}
	// Preserve owner/mode: temp is created by the same owner; chmod to the
	// existing mode (validated fail-closed to have no group/other bits).
	if runtime.GOOS != "windows" {
		if err := f.Chmod(preserveMode); err != nil {
			_ = f.Close()
			_ = os.Remove(tmp)
			return fmt.Errorf("state: chmod temp: %w", err)
		}
	}
	if _, err := f.Write(blob); err != nil {
		_ = f.Close()
		_ = os.Remove(tmp)
		return fmt.Errorf("state: write temp: %w", err)
	}
	if err := f.Sync(); err != nil {
		_ = f.Close()
		_ = os.Remove(tmp)
		return fmt.Errorf("state: sync temp: %w", err)
	}
	if err := f.Close(); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("state: close temp: %w", err)
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("state: rename: %w", err)
	}
	// Sync the new file content and the parent directory.
	if fh, err := os.Open(path); err == nil {
		_ = fh.Sync()
		_ = fh.Close()
	}
	if err := fsyncDir(dir); err != nil {
		return fmt.Errorf("state: sync parent dir: %w", err)
	}
	return nil
}

func atomicReplaceDelivery(path string, next DeliveryState, key []byte) error {
	fi, err := os.Stat(path)
	if err != nil {
		return err
	}
	blob, err := json.Marshal(next)
	if err != nil {
		return err
	}
	var parsed DeliveryState
	if err := json.Unmarshal(blob, &parsed); err != nil {
		return err
	}
	parsed.MAC = deliveryMAC(parsed, key)
	blob, err = json.Marshal(parsed)
	if err != nil {
		return err
	}
	tmp, err := uniqueTempPath(path)
	if err != nil {
		return err
	}
	f, err := os.OpenFile(tmp, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	if err = f.Chmod(fi.Mode().Perm()); err == nil {
		_, err = f.Write(blob)
	}
	if err == nil {
		err = f.Sync()
	}
	closeErr := f.Close()
	if err == nil {
		err = closeErr
	}
	if err != nil {
		_ = os.Remove(tmp)
		return err
	}
	if err = os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	return fsyncDir(filepath.Dir(path))
}

func uniqueTempPath(finalPath string) (string, error) {
	var rnd [8]byte
	if _, err := rand.Read(rnd[:]); err != nil {
		return "", fmt.Errorf("state: random temp suffix: %w", err)
	}
	return fmt.Sprintf("%s.tmp.%d.%s", finalPath, os.Getpid(), hex.EncodeToString(rnd[:])), nil
}

// linkNoReplace hard-links tmp to final, failing when final exists.
func linkNoReplace(tmp, final string) error {
	return os.Link(tmp, final)
}

func isAlreadyExists(err error) bool {
	if err == nil {
		return false
	}
	if os.IsExist(err) {
		return true
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "already exists") ||
		strings.Contains(msg, "file exists") ||
		strings.Contains(msg, "eexist")
}

// fsyncDir flushes a directory entry. On Windows directory sync is not
// supported by Go reliably, so it is best-effort there; strict elsewhere.
func fsyncDir(dir string) error {
	f, err := os.Open(dir)
	if err != nil {
		return err
	}
	defer func() { _ = f.Close() }()
	if err := f.Sync(); err != nil {
		if runtime.GOOS == "windows" {
			return nil
		}
		return err
	}
	return nil
}
