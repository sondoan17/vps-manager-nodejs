package state

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

const (
	IdentityVersion    = 1
	deliveryMACDomain  = "vps-manager/docker/delivery/v1"
	deliveryKeyDomain  = "vps-manager/docker/delivery-mac/v1"
	containerKeyDomain = "vps-manager/docker/container/v1"
)

// IdentityMaterial is immutable installation identity. Its fields are copied on construction.
type IdentityMaterial struct {
	Version         int    `json:"version"`
	InstallationKey string `json:"installationKey"`
}

// RuntimeKeys contains secrets derived from the installation key and is never mutable by Store.
type RuntimeKeys struct {
	Version        int    `json:"version"`
	DeliveryMACKey string `json:"deliveryMacKey"`
	// ContainerHMACKey is a narrowly scoped capability: the service can compute
	// the contract HMAC for container IDs, while the raw installation identity
	// remains root-only in IdentityMaterial. It must equal the installation key;
	// a derived fixed key cannot reproduce HMAC(K, variable message).
	ContainerHMACKey string `json:"containerHMACKey"`
	AgentInstanceID  string `json:"agentInstanceId"`
}

// DeliveryState is the mutable, authenticated delivery record.
type DeliveryState struct {
	Version   int           `json:"version"`
	Watermark Watermark     `json:"watermark"`
	Pending   *PendingBatch `json:"pending"`
	Sequence  uint64        `json:"sequence"`
	MAC       string        `json:"mac"`
}

type ProvisionOptions struct {
	IdentityOwnerUID *int
	RuntimeOwnerUID  *int
}
type LoadOptions struct{ RuntimeOwnerUID *int }

// Provision is idempotent and upgrade-safe: an existing valid matching pair is
// accepted; a partial pair is completed without rotating the existing identity.
func Provision(identityPath, runtimeKeysPath string, opts ProvisionOptions) error {
	identityUID := provisionIdentityOwnerUID()
	if opts.IdentityOwnerUID != nil { identityUID = *opts.IdentityOwnerUID }
	runtimeUID := provisionRuntimeOwnerUID()
	if opts.RuntimeOwnerUID != nil { runtimeUID = *opts.RuntimeOwnerUID }
	// Existing files are never repaired: validate exact mode and ownership first.
	if err := validateProvisionFile(identityPath, identityUID); err != nil && !os.IsNotExist(err) { return err }
	if err := validateProvisionFile(runtimeKeysPath, runtimeUID); err != nil && !os.IsNotExist(err) { return err }
	var installation [32]byte
	if raw, err := os.ReadFile(identityPath); err == nil {
		var im IdentityMaterial
		if err := decodeStrict(raw, &im); err != nil || im.Version != IdentityVersion {
			return fmt.Errorf("state: invalid identity: fail closed")
		}
		b, err := base64.RawURLEncoding.DecodeString(im.InstallationKey)
		if err != nil || len(b) != 32 {
			return fmt.Errorf("state: invalid identity key: fail closed")
		}
		copy(installation[:], b)
	} else if !os.IsNotExist(err) {
		return err
	} else if _, err := rand.Read(installation[:]); err != nil {
		return err
	}
	ik := base64.RawURLEncoding.EncodeToString(installation[:])
	rk := RuntimeKeys{Version: IdentityVersion, DeliveryMACKey: b64(hmacBytes(installation[:], deliveryKeyDomain)), ContainerHMACKey: ik, AgentInstanceID: deriveAgentInstanceID(installation[:])}
	ib, _ := json.Marshal(IdentityMaterial{IdentityVersion, ik})
	rb, _ := json.Marshal(rk)
	if _, err := publishExclusive(identityPath, ib, 0600); err != nil {
		return err
	}
	if _, err := publishExclusive(runtimeKeysPath, rb, 0600); err != nil {
		return err
	}
	if err := validateProvisionFile(identityPath, identityUID); err != nil { return err }
	if err := validateProvisionFile(runtimeKeysPath, runtimeUID); err != nil { return err }
	return validateProvisionPair(identityPath, runtimeKeysPath)
}

func validateProvisionFile(path string, uid int) error {
	fi, err := os.Stat(path)
	if err != nil { return err }
	if !fi.Mode().IsRegular() || fi.Mode().Perm() != 0600 {
		return fmt.Errorf("state: insecure provision file: fail closed")
	}
	if uid >= 0 {
		expected := uid
		if err := checkFileOwnershipWithUID(fi, &expected); err != nil { return err }
	}
	return nil
}

func createBlob(path string, data []byte, mode os.FileMode) error {
	if err := ensureParentDir(filepath.Dir(path)); err != nil {
		return err
	}
	f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, mode)
	if err != nil {
		return fmt.Errorf("state: create %s: %w", path, err)
	}
	defer f.Close()
	if err = f.Chmod(mode); err != nil {
		return err
	}
	if _, err = f.Write(data); err != nil {
		return err
	}
	return f.Sync()
}
func b64(b []byte) string          { return base64.RawURLEncoding.EncodeToString(b) }
func mustDecode32(s string) []byte { b, _ := base64.RawURLEncoding.DecodeString(s); return b }
func validateProvisionPair(identityPath, runtimePath string) error {
	ib, err := os.ReadFile(identityPath)
	if err != nil {
		return err
	}
	var im IdentityMaterial
	if err = decodeStrict(ib, &im); err != nil || im.Version != IdentityVersion {
		return fmt.Errorf("state: invalid identity: fail closed")
	}
	key, err := base64.RawURLEncoding.DecodeString(im.InstallationKey)
	if err != nil || len(key) != 32 {
		return fmt.Errorf("state: invalid identity key: fail closed")
	}
	rb, err := os.ReadFile(runtimePath)
	if err != nil {
		return err
	}
	var rk RuntimeKeys
	if err = decodeStrict(rb, &rk); err != nil || rk.Version != IdentityVersion {
		return fmt.Errorf("state: invalid runtime keys: fail closed")
	}
	ck, err := base64.RawURLEncoding.DecodeString(rk.ContainerHMACKey)
	if err != nil || len(ck) != 32 || !hmac.Equal(ck, key) || rk.AgentInstanceID != deriveAgentInstanceID(key) {
		return fmt.Errorf("state: runtime keys do not match identity: fail closed")
	}
	return nil
}
func hmacBytes(key []byte, domain string) []byte {
	m := hmac.New(sha256.New, key)
	m.Write([]byte(domain))
	return m.Sum(nil)
}

// LoadStore loads separate runtime keys and authenticated mutable delivery state.
func LoadStore(runtimeKeysPath, deliveryPath string) (*Store, error) {
	return loadStoreOptions(runtimeKeysPath, deliveryPath, LoadOptions{})
}
func LoadStoreWithOptions(runtimeKeysPath, deliveryPath string, opts LoadOptions) (*Store, error) {
	return loadStoreOptions(runtimeKeysPath, deliveryPath, opts)
}
func loadStoreOptions(rp, dp string, opts LoadOptions) (*Store, error) {
	rb, err := readStrictBlob(rp)
	if err != nil {
		return nil, err
	}
	var rk RuntimeKeys
	if err = decodeStrict(rb, &rk); err != nil {
		return nil, fmt.Errorf("state: runtime keys: %w", err)
	}
	mac, err := base64.RawURLEncoding.DecodeString(rk.DeliveryMACKey)
	if err != nil || len(mac) != 32 {
		return nil, fmt.Errorf("state: invalid runtime delivery key")
	}
	if fi, e := os.Stat(rp); e != nil {
		return nil, e
	} else if e = checkFilePermissions(fi); e != nil {
		return nil, e
	} else if e = checkFileOwnershipWithUID(fi, opts.RuntimeOwnerUID); e != nil {
		return nil, e
	}
	if fi, e := os.Stat(dp); e == nil {
		if e = checkFilePermissions(fi); e != nil {
			return nil, e
		}
		if e = checkFileOwnershipWithUID(fi, opts.RuntimeOwnerUID); e != nil {
			return nil, e
		}
	} else if !os.IsNotExist(e) {
		return nil, e
	}
	raw, err := os.ReadFile(dp)
	if os.IsNotExist(err) {
		st := DeliveryState{Version: IdentityVersion, Watermark: Watermark{BoundaryDigests: []string{}}, Sequence: 1}
		if err = writeDelivery(dp, st, mac); err != nil {
			return nil, err
		}
		raw, _ = os.ReadFile(dp)
	}
	if err != nil {
		return nil, err
	}
	var ds DeliveryState
	if err = decodeStrict(raw, &ds); err != nil {
		return nil, err
	}
	if ds.Version != IdentityVersion {
		return nil, fmt.Errorf("state: delivery version")
	}
	if !hmac.Equal([]byte(ds.MAC), []byte(deliveryMAC(ds, mac))) {
		return nil, fmt.Errorf("state: delivery MAC mismatch: fail closed")
	}
	delivery := [32]byte{}
	copy(delivery[:], mac)
	if rk.Version != IdentityVersion || rk.AgentInstanceID == "" {
		return nil, fmt.Errorf("state: invalid runtime identity")
	}
	containerBytes, e := base64.RawURLEncoding.DecodeString(rk.ContainerHMACKey)
	if e != nil || len(containerBytes) != 32 {
		return nil, fmt.Errorf("state: invalid container key")
	}
	if rk.AgentInstanceID != deriveAgentInstanceID(containerBytes) {
		return nil, fmt.Errorf("state: invalid runtime identity")
	}
	container := [32]byte{}
	copy(container[:], containerBytes)
	return &Store{path: dp, deliveryKeyPath: rp, deliveryKey: delivery, containerKey: container, instanceID: rk.AgentInstanceID, watermark: ds.Watermark, pending: ds.Pending, sequence: ds.Sequence, v2: true}, nil
}
func decodeStrict(b []byte, v any) error {
	d := json.NewDecoder(bytes.NewReader(b))
	d.DisallowUnknownFields()
	if err := d.Decode(v); err != nil {
		return err
	}
	var extra any
	if err := d.Decode(&extra); err != io.EOF {
		return fmt.Errorf("state: trailing data")
	}
	return nil
}

func readStrictBlob(path string) ([]byte, error) {
	b, e := os.ReadFile(path)
	if e != nil {
		return nil, e
	}
	d := json.NewDecoder(bytes.NewReader(b))
	var v any
	if e = d.Decode(&v); e != nil {
		return nil, e
	}
	if e = d.Decode(&struct{}{}); e != io.EOF {
		return nil, fmt.Errorf("state: trailing data")
	}
	return b, nil
}
func deliveryMAC(ds DeliveryState, key []byte) string {
	ds.MAC = ""
	b, _ := json.Marshal(ds)
	m := hmac.New(sha256.New, key)
	m.Write([]byte(deliveryMACDomain))
	m.Write([]byte{0})
	m.Write(b)
	return hex.EncodeToString(m.Sum(nil))
}
func writeDelivery(path string, ds DeliveryState, key []byte) error {
	ds.MAC = deliveryMAC(ds, key)
	b, _ := json.Marshal(ds)
	return createBlob(path, b, 0600)
}
