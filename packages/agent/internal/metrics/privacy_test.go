package metrics

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"
)

func assertJSONHasNoForbiddenKeys(t *testing.T, raw []byte, forbidden ...string) {
	t.Helper()
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		t.Fatalf("decode serialized JSON: %v", err)
	}
	blocked := make(map[string]struct{}, len(forbidden))
	for _, key := range forbidden {
		blocked[key] = struct{}{}
	}
	var walk func(any, string)
	walk = func(v any, path string) {
		switch x := v.(type) {
		case map[string]any:
			for key, child := range x {
				if _, ok := blocked[key]; ok {
					t.Errorf("forbidden JSON key %q at %s", key, path)
				}
				walk(child, path+"."+key)
			}
		case []any:
			for i, child := range x {
				walk(child, fmt.Sprintf("%s[%d]", path, i))
			}
		}
	}
	walk(value, "$")
}

func assertJSONOmitsValues(t *testing.T, raw []byte, values ...string) {
	t.Helper()
	text := string(raw)
	for _, value := range values {
		if strings.Contains(text, value) {
			t.Errorf("serialized JSON contains forbidden value %q", value)
		}
	}
}
