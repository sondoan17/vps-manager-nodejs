#!/usr/bin/env bash
# socket-pattern.sh — shared Docker-socket match pattern for Gate-5 guards.
# Sourced (not executed) by check-no-docker-socket.sh and its fidelity tests
# so the detection pattern cannot drift between guard and tests.
# shellcheck disable=SC2034
SOCKET_PATTERN='docker[.]sock|/var/run/docker|/run/docker[.]sock'
