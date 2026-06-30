//go:build !linux

package metrics

func collectDisk() (float64, error) {
	return 0, ErrUnsupported
}
