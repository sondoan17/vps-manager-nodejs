package commands

import (
	"strings"
	"testing"
	"time"
)

func validCommand() *Command {
	return &Command{
		CommandID:       "cmd_abc123",
		AgentInstanceID: "testinstance000000000000000001",
		VpsID:           "vps_1",
		Action:          ActionStart,
		ContainerKey:    "containerkey000000000000000001",
		DeadlineNano:    futureNano(1 * time.Hour),
		TimeoutSeconds:  10,
	}
}

func futureNano(d time.Duration) string {
	return itoaNano(time.Now().Add(d).UnixNano())
}

func itoaNano(n int64) string {
	if n <= 0 {
		return "0"
	}
	var b [32]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}

func TestValidateAction_Allowlist(t *testing.T) {
	for _, a := range []string{ActionStart, ActionStop, ActionRestart} {
		if err := ValidateAction(a); err != nil {
			t.Errorf("ValidateAction(%q) = %v, want nil", a, err)
		}
	}
	for _, a := range []string{"", "pause", "rm", "START", "Stop", "exec", "logs", "start "} {
		if err := ValidateAction(a); err == nil {
			t.Errorf("ValidateAction(%q) = nil, want error (fail closed)", a)
		}
	}
}

func TestValidateCommand_Bounds(t *testing.T) {
	if err := ValidateCommand(validCommand()); err != nil {
		t.Fatalf("ValidateCommand(valid) = %v", err)
	}
	cases := map[string]func(*Command){
		"bad commandId charset":  func(c *Command) { c.CommandID = "cmd/bad" },
		"empty commandId":        func(c *Command) { c.CommandID = "" },
		"oversize commandId":     func(c *Command) { c.CommandID = strings.Repeat("a", MaxCommandIDLen+1) },
		"bad instance":           func(c *Command) { c.AgentInstanceID = "not valid!" },
		"oversize instance":      func(c *Command) { c.AgentInstanceID = strings.Repeat("a", MaxInstanceIDLen+1) },
		"unsupported action":     func(c *Command) { c.Action = "pause" },
		"empty action":           func(c *Command) { c.Action = "" },
		"bad containerKey":       func(c *Command) { c.ContainerKey = "key with spaces" },
		"leading-zero deadline":  func(c *Command) { c.DeadlineNano = "01" },
		"empty deadline":         func(c *Command) { c.DeadlineNano = "" },
		"negative deadline":      func(c *Command) { c.DeadlineNano = "-1" },
		"timeout zero":           func(c *Command) { c.TimeoutSeconds = 0 },
		"timeout oversize":       func(c *Command) { c.TimeoutSeconds = MaxCommandTimeoutSeconds + 1 },
		"bad vpsId":              func(c *Command) { c.VpsID = "vps/bad" },
	}
	for name, mut := range cases {
		c := validCommand()
		mut(c)
		if err := ValidateCommand(c); err == nil {
			t.Errorf("%s: ValidateCommand = nil, want error", name)
		}
	}
	if err := ValidateCommand(nil); err == nil {
		t.Error("ValidateCommand(nil) = nil, want error")
	}
}

func TestValidateResult_UncertainRequiresExecuted(t *testing.T) {
	ok := &Result{CommandID: "cmd_1", AgentInstanceID: "inst_1", Status: StatusSucceeded, Executed: true}
	if err := ValidateResult(ok); err != nil {
		t.Errorf("ValidateResult(succeeded) = %v", err)
	}
	unc := &Result{CommandID: "cmd_1", AgentInstanceID: "inst_1", Status: StatusUncertain, Executed: false}
	if err := ValidateResult(unc); err == nil {
		t.Error("ValidateResult(uncertain, !executed) = nil, want error")
	}
	unc.Executed = true
	if err := ValidateResult(unc); err != nil {
		t.Errorf("ValidateResult(uncertain, executed) = %v", err)
	}
	bad := &Result{CommandID: "cmd_1", AgentInstanceID: "inst_1", Status: "done", Executed: true}
	if err := ValidateResult(bad); err == nil {
		t.Error("ValidateResult(unknown status) = nil, want error")
	}
	badCode := &Result{CommandID: "cmd_1", AgentInstanceID: "inst_1", Status: StatusFailed, Executed: true, ErrorCode: "bogus_code"}
	if err := ValidateResult(badCode); err == nil {
		t.Error("ValidateResult(unapproved error code) = nil, want error")
	}
	oversize := &Result{CommandID: "cmd_1", AgentInstanceID: "inst_1", Status: StatusFailed, Executed: true, OutputPreview: strings.Repeat("x", MaxPreviewBytes+1)}
	if err := ValidateResult(oversize); err == nil {
		t.Error("ValidateResult(oversize preview) = nil, want error")
	}
	invalidUTF8 := &Result{CommandID: "cmd_1", AgentInstanceID: "inst_1", Status: StatusFailed, Executed: true, OutputPreview: string([]byte{0xff, 0xfe})}
	if err := ValidateResult(invalidUTF8); err == nil {
		t.Error("ValidateResult(invalid UTF-8 preview) = nil, want error")
	}
}

func TestValidateReceipt_DeadlineAndTerminal(t *testing.T) {
	r := &Receipt{
		CommandID: "cmd_1", AgentInstanceID: "inst_1",
		Action: ActionStop, ContainerKey: "key_1",
		DeadlineNano: futureNano(time.Hour), TimeoutSeconds: 10,
		State: ReceiptClaimed,
	}
	if err := ValidateReceipt(r); err != nil {
		t.Fatalf("ValidateReceipt(claimed) = %v", err)
	}
	r.State = ReceiptUncertain
	if err := ValidateReceipt(r); err == nil {
		t.Error("ValidateReceipt(uncertain, !executed) = nil, want error")
	}
	r.Executed = true
	if err := ValidateReceipt(r); err != nil {
		t.Errorf("ValidateReceipt(uncertain, executed) = %v", err)
	}
	r.DeadlineNano = "01"
	if err := ValidateReceipt(r); err == nil {
		t.Error("ValidateReceipt(non-canonical deadline) = nil, want error")
	}
}
