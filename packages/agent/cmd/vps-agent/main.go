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
	"github.com/vps-manager/agent/internal/metrics"
	"github.com/vps-manager/agent/internal/push"
	"github.com/vps-manager/agent/internal/run"
)

func main() {
	configPath := flag.String("config", "", "path to config file")
	once := flag.Bool("once", false, "collect and push metrics once then exit")
	flag.Parse()

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
	pushClient := push.NewClient(cfg)

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
