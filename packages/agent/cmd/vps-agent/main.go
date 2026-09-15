package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/vps-manager/agent/internal/config"
	"github.com/vps-manager/agent/internal/geo"
	"github.com/vps-manager/agent/internal/metrics"
	"github.com/vps-manager/agent/internal/push"
	"github.com/vps-manager/agent/internal/run"
	"github.com/vps-manager/agent/internal/version"
	"path/filepath"
)

func main() {
	configPath := flag.String("config", "", "path to config file")
	stateFlag := flag.String("state", "", "path to persisted state file")
	once := flag.Bool("once", false, "collect and push metrics once then exit")
	showVersion := flag.Bool("version", false, "print agent version and exit")
	flag.Parse()

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
	})

	runner := run.New(cfg, collector, pushClient)

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
