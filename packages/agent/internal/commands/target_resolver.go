package commands

import (
 "context"
 "encoding/json"
 "fmt"
 "net/http"
 "time"
)

func resolveDaemonID(fullIDs []string, keyForID func(string) string, want string) (string, bool) {
 for _, id := range fullIDs { if isRawContainerID(id) && keyForID(id) == want { return id, true } }
 return "", false
}

// NewDockerTargetResolver returns a resolver that lists Docker's bounded
// container inventory and matches the opaque installation key locally.
func NewDockerTargetResolver(socketPath string, timeout time.Duration, keyForID func(string) string) (TargetResolver, error) {
 if keyForID == nil { return nil, fmt.Errorf("nil key derivation") }
 hc := newDefaultDockerControlHTTPClient(socketPath, timeout)
 return func(key string) (string, bool) {
  ctx, cancel := context.WithTimeout(context.Background(), timeout); defer cancel()
  req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://localhost/containers/json?all=1&size=false", nil); if err != nil { return "", false }
  resp, err := hc.Do(req); if err != nil { return "", false }; defer resp.Body.Close()
  if resp.StatusCode < 200 || resp.StatusCode >= 300 { return "", false }
  var rows []struct{ ID string `json:"Id"` }
  if err := json.NewDecoder(resp.Body).Decode(&rows); err != nil { return "", false }
  ids := make([]string, 0, len(rows)); for _, row := range rows { ids = append(ids, row.ID) }
  return resolveDaemonID(ids, keyForID, key)
 }, nil
}
