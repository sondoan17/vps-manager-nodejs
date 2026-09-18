package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/vps-manager/agent/internal/config"
	"github.com/vps-manager/agent/internal/geo"
	"github.com/vps-manager/agent/internal/metrics"
	"github.com/vps-manager/agent/internal/push"
	"github.com/vps-manager/agent/internal/run"
	"github.com/vps-manager/agent/internal/state"
	"github.com/vps-manager/agent/internal/version"
	"path/filepath"
)

func main() {
	configPath := flag.String("config", "", "path to config file")
	stateFlag := flag.String("state", "", "path to persisted state file")
	once := flag.Bool("once", false, "collect and push metrics once then exit")
	showVersion := flag.Bool("version", false, "print agent version and exit")
	provision := flag.Bool("provision-docker-state", false, "provision Docker identity and runtime keys, then exit")
	identityPath := flag.String("docker-identity-path", "", "Docker identity output path")
	runtimeKeysPath := flag.String("docker-runtime-keys-path", "", "Docker runtime keys output path")
	runtimeOwnerUID := flag.String("docker-runtime-owner-uid", "", "expected runtime keys owner UID (nonnegative integer)")
	flag.Parse()

	if *provision {
		if os.Geteuid() != 0 || *identityPath == "" || *runtimeKeysPath == "" || *runtimeOwnerUID == "" {
			fmt.Fprintln(os.Stderr, "provisioning requires root, explicit identity/runtime-key paths, and a runtime owner UID")
			os.Exit(1)
		}
		uid, err := strconv.ParseUint(*runtimeOwnerUID, 10, 0)
		if err != nil {
			fmt.Fprintln(os.Stderr, "runtime owner UID must be a nonnegative integer")
			os.Exit(1)
		}
		runtimeUID := int(uid)
		if err := state.Provision(*identityPath, *runtimeKeysPath, state.ProvisionOptions{RuntimeOwnerUID: &runtimeUID}); err != nil {
			log.Fatalf("docker state provisioning failed: %v", err)
		}
		return
	}

	if *showVersion {
		fmt.Println(version.String())
		return
	}

	if *configPath == "" {
		fmt.Fprintf(os.Stderr, "Usage: vps-agent -config <path> [-once]\n")
		os.Exit(1)
	}

	log.SetFlags(log.LstdFlags | log.Lshortfile)

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	log.Printf("starting agent: %s", cfg)

	collector := metrics.NewCollector()
	statePath := cfg.StatePath
	if *stateFlag != "" {
		statePath = *stateFlag
	}
	if statePath == "" {
		if home, e := os.UserHomeDir(); e == nil {
			statePath = filepath.Join(home, ".vps-manager-agent", "state.json")
		} else {
			statePath = "/var/lib/vps-manager-agent/state.json"
		}
	}
	detector := geo.New(statePath)
	detector.Start()
	pushClient := push.NewClient(cfg)

	// Docker v2 reads only the provisioned runtime keys and its authenticated
	// mutable delivery record. The immutable identity file is never read here.
	base := filepath.Dir(statePath)
	runtimeKeysFile := filepath.Join(base, "runtime-keys.json")
	deliveryPath := filepath.Join(base, "delivery-state.json")
	var runner *run.Runner
	if st, e := state.LoadStore(runtimeKeysFile, deliveryPath); e != nil {
		log.Printf("docker v2 state unavailable; continuing with host/v1 metrics: %v", e)
		runner = run.New(cfg, collector, pushClient)
	} else {
		collector.SetDockerV2ContainerKeyFunc(st.ContainerKey)
		collector.SetDockerV2FinalizeHook(run.FinalizeDockerV2(st))
		collector.SetDockerV2EventInputProvider(func() (metrics.DockerV2EventInput, bool) {
			if st.GetPending() != nil {
				return metrics.DockerV2EventInput{}, false
			}
			return metrics.DockerV2EventInput{SinceNano: fmt.Sprint(st.GetWatermark().TimeNano), UntilNano: fmt.Sprint(time.Now().Add(-time.Second).UnixNano()), AgentInstanceID: st.InstanceID(), FromDigests: st.GetWatermark().BoundaryDigests}, true
		})
		collector.SetDockerV2StorageEnabled(true)
		runner = run.NewWithState(cfg, collector, pushClient, st)
	}
	pushClient.SetLocationProvider(func() *metrics.Location {
		l := detector.Location()
		if l == nil {
			return nil
		}
		return &metrics.Location{City: l.City, Country: l.Country, DetectedAt: l.DetectedAt}
	})

	// Wire server response config callback so dashboard toggle updates the
	// collector's Docker metrics state on every successful push.
	pushClient.SetConfigHandler(func(cfg *push.ConfigResponse) {
		collector.SetDockerMetricsEnabled(cfg.DockerMetricsEnabled)
		// Docker v2 is independently fail-closed and only follows the
		// canonical capability advertisement (schema >= 2 plus all required
		// history/events/storage flags).
		pushClient.SetDockerV2FromConfig(cfg)
		collector.SetDockerV2Enabled(pushClient.IsDockerV2Enabled())
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle SIGINT/SIGTERM for graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigCh
		log.Printf("received signal %v, shutting down...", sig)
		cancel()
	}()

	if *once {
		log.Println("mode: once")
		if err := runner.RunOnce(ctx); err != nil {
			log.Fatalf("run failed: %v", err)
		}
		log.Println("completed successfully")
		return
	}

	log.Println("mode: loop")
	if err := runner.RunLoop(ctx); err != nil && err != context.Canceled {
		log.Fatalf("run loop failed: %v", err)
	}
	log.Println("agent stopped")
}
