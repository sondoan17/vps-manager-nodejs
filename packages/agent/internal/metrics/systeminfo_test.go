package metrics

import (
	"testing"
)

// ---------------------------------------------------------------------------
// ParseOSRelease
// ---------------------------------------------------------------------------

const fixtureOSRelease = `NAME="Ubuntu"
VERSION="24.04 LTS (Noble Numbat)"
ID=ubuntu
ID_LIKE=debian
PRETTY_NAME="Ubuntu 24.04 LTS"
VERSION_ID="24.04"
VERSION_CODENAME=noble
UBUNTU_CODENAME=noble
`

func TestParseOSRelease(t *testing.T) {
	info := ParseOSRelease(fixtureOSRelease)
	if info == nil {
		t.Fatal("expected non-nil OSInfo")
	}
	if info.Family != "ubuntu" {
		t.Errorf("Family = %q, want %q", info.Family, "ubuntu")
	}
	if info.Name != "Ubuntu" {
		t.Errorf("Name = %q, want %q", info.Name, "Ubuntu")
	}
	if info.Version != "24.04" {
		t.Errorf("Version = %q, want %q", info.Version, "24.04")
	}
	if info.PrettyName != "Ubuntu 24.04 LTS" {
		t.Errorf("PrettyName = %q, want %q", info.PrettyName, "Ubuntu 24.04 LTS")
	}
}

func TestParseOSRelease_VersionFallback(t *testing.T) {
	// When VERSION_ID is missing, VERSION should be used instead.
	input := `NAME="Debian"
VERSION="12 (bookworm)"
ID=debian
PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"
`
	info := ParseOSRelease(input)
	if info == nil {
		t.Fatal("expected non-nil OSInfo")
	}
	if info.Version != "12 (bookworm)" {
		t.Errorf("Version = %q, want %q", info.Version, "12 (bookworm)")
	}
}

func TestParseOSRelease_VersionPreferID(t *testing.T) {
	// VERSION_ID takes precedence over VERSION when both are present.
	input := `NAME="Fedora"
VERSION="40 (Workstation Edition)"
ID=fedora
VERSION_ID=40
PRETTY_NAME="Fedora 40 (Workstation Edition)"
`
	info := ParseOSRelease(input)
	if info == nil {
		t.Fatal("expected non-nil OSInfo")
	}
	if info.Version != "40" {
		t.Errorf("Version = %q, want %q", info.Version, "40")
	}
}

func TestParseOSRelease_Empty(t *testing.T) {
	info := ParseOSRelease("")
	if info != nil {
		t.Errorf("expected nil for empty input, got %+v", info)
	}
}

func TestParseOSRelease_CommentsAndBlanks(t *testing.T) {
	input := `
# This is a comment
# Another comment

ID=alpine
NAME="Alpine Linux"
`
	info := ParseOSRelease(input)
	if info == nil {
		t.Fatal("expected non-nil OSInfo")
	}
	if info.Family != "alpine" {
		t.Errorf("Family = %q, want %q", info.Family, "alpine")
	}
	if info.Name != "Alpine Linux" {
		t.Errorf("Name = %q, want %q", info.Name, "Alpine Linux")
	}
}

func TestParseOSRelease_UnquotedValue(t *testing.T) {
	input := `ID=arch
NAME="Arch Linux"
PRETTY_NAME="Arch Linux"
`
	info := ParseOSRelease(input)
	if info == nil {
		t.Fatal("expected non-nil OSInfo")
	}
	if info.Family != "arch" {
		t.Errorf("Family = %q, want %q", info.Family, "arch")
	}
}

// ---------------------------------------------------------------------------
// ParseCPUInfo
// ---------------------------------------------------------------------------

const fixtureCPUInfo = `processor       : 0
vendor_id       : GenuineIntel
cpu family      : 6
model           : 158
model name      : Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz
stepping        : 10
microcode       : 0xde
cpu MHz         : 3696.000
cache size      : 12288 KB
physical id     : 0
siblings        : 1
core id         : 0
cpu cores       : 1
apicid          : 0
initial apicid  : 0
fpu             : yes
fpu_exception   : yes
cpuid level     : 13
wp              : yes

processor       : 1
vendor_id       : GenuineIntel
cpu family      : 6
model           : 158
model name      : Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz
stepping        : 10
microcode       : 0xde
cpu MHz         : 3696.000
cache size      : 12288 KB
physical id     : 1
siblings        : 1
core id         : 1
cpu cores       : 1
apicid          : 1
initial apicid  : 1
fpu             : yes
fpu_exception   : yes
cpuid level     : 13
wp              : yes
`

func TestParseCPUInfo(t *testing.T) {
	info := ParseCPUInfo(fixtureCPUInfo)
	if info == nil {
		t.Fatal("expected non-nil CPUInfo")
	}
	if info.Cores != 2 {
		t.Errorf("Cores = %d, want %d", info.Cores, 2)
	}
	if info.Model != "Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz" {
		t.Errorf("Model = %q, want %q", info.Model, "Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz")
	}
}

func TestParseCPUInfo_NoModelName(t *testing.T) {
	input := `processor       : 0
vendor_id       : GenuineIntel
cpu family      : 6
model           : 158
stepping        : 10

processor       : 1
vendor_id       : GenuineIntel
cpu family      : 6
model           : 158
stepping        : 10
`
	info := ParseCPUInfo(input)
	if info == nil {
		t.Fatal("expected non-nil CPUInfo")
	}
	if info.Cores != 2 {
		t.Errorf("Cores = %d, want %d", info.Cores, 2)
	}
	if info.Model != "" {
		t.Errorf("Model = %q, want empty", info.Model)
	}
}

func TestParseCPUInfo_Empty(t *testing.T) {
	info := ParseCPUInfo("")
	if info != nil {
		t.Errorf("expected nil for empty input, got %+v", info)
	}
}

func TestParseCPUInfo_NoProcessorLine(t *testing.T) {
	input := `model name      : ARMv8 Processor rev 4 (v8l)
BogoMIPS        : 100.00
`
	info := ParseCPUInfo(input)
	if info == nil {
		t.Fatal("expected non-nil CPUInfo when model name is present")
	}
	if info.Model != "ARMv8 Processor rev 4 (v8l)" {
		t.Errorf("Model = %q, want %q", info.Model, "ARMv8 Processor rev 4 (v8l)")
	}
	// Cores should default to 0 (will be filled by runtime.NumCPU fallback in collectSystemInfo)
	if info.Cores != 0 {
		t.Errorf("Cores = %d, want 0 (no processor lines)", info.Cores)
	}
}

// ---------------------------------------------------------------------------
// ReadMountInfo
// ---------------------------------------------------------------------------

const fixtureMounts = `sysfs /sys sysfs rw,nosuid,nodev,noexec,relatime 0 0
proc /proc proc rw,nosuid,nodev,noexec,relatime 0 0
udev /dev devtmpfs rw,nosuid,relatime 0 0
devpts /dev/pts devpts rw,nosuid,noexec,relatime 0 0
ext4 / ext4 rw,relatime 0 0
`

func TestReadMountInfo(t *testing.T) {
	fsType := ReadMountInfo(fixtureMounts)
	if fsType != "ext4" {
		t.Errorf("FsType = %q, want %q", fsType, "ext4")
	}
}

func TestReadMountInfo_NoRoot(t *testing.T) {
	input := `proc /proc proc rw 0 0
sysfs /sys sysfs rw 0 0
`
	fsType := ReadMountInfo(input)
	if fsType != "" {
		t.Errorf("FsType = %q, want empty", fsType)
	}
}

func TestReadMountInfo_Empty(t *testing.T) {
	fsType := ReadMountInfo("")
	if fsType != "" {
		t.Errorf("FsType = %q, want empty", fsType)
	}
}

func TestReadMountInfo_XFSRoot(t *testing.T) {
	input := `xfs / xfs rw,relatime 0 0
`
	fsType := ReadMountInfo(input)
	if fsType != "xfs" {
		t.Errorf("FsType = %q, want %q", fsType, "xfs")
	}
}

// ---------------------------------------------------------------------------
// SystemMetrics.System field (compilation check)
// ---------------------------------------------------------------------------

func TestSystemMetrics_HasSystemField(t *testing.T) {
	m := &SystemMetrics{
		CPU: 10.0,
		System: &SystemInfo{
			OS: &OSInfo{Family: "linux", Name: "TestOS"},
			Kernel: &KernelInfo{
				Release: "6.0.0",
				Arch:    "amd64",
			},
		},
	}
	if m.System == nil {
		t.Fatal("System field should be populated")
	}
	if m.System.OS.Family != "linux" {
		t.Errorf("OS.Family = %q, want %q", m.System.OS.Family, "linux")
	}
}

// ---------------------------------------------------------------------------
// collectSystemInfo compilation check (actual reading depends on platform)
// ---------------------------------------------------------------------------

func TestCollectSystemInfo_Compiles(t *testing.T) {
	// This just checks the function exists and returns the right type.
	// On non-Linux it returns nil; on Linux it reads real files.
	si := collectSystemInfo()
	t.Logf("collectSystemInfo() returned: %+v", si)
}
